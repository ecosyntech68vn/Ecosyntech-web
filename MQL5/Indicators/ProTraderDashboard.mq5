#property copyright "Pro Trading System"
#property version "1.00"
#property description "Multi-Indicator Dashboard for Gold/Forex"
#property indicator_chart_window
#property indicator_plots 7

#property indicator_label1 "EMA Fast"
#property indicator_label2 "EMA Slow"
#property indicator_label3 "RSI"
#property indicator_label4 "MACD"
#property indicator_label5 "Stochastic"
#property indicator_label6 "ATR"
#property indicator_label7 "Signal"

input int FastEMA_Period = 8;
input int SlowEMA_Period = 21;
input int RSI_Period = 14;
input int MACD_Fast = 12;
input int MACD_Slow = 26;
input int MACD_Signal = 9;
input int Stochastic_K = 14;
input int ATR_Period = 14;

int hEMA_Fast, hEMA_Slow, hRSI, hMACD, hStoch, hATR;

int OnInit() {
    hEMA_Fast = iMA(_Symbol, _Period, FastEMA_Period, 0, MODE_EMA, PRICE_CLOSE);
    hEMA_Slow = iMA(_Symbol, _Period, SlowEMA_Period, 0, MODE_EMA, PRICE_CLOSE);
    hRSI = iRSI(_Symbol, _Period, RSI_Period, PRICE_CLOSE);
    hMACD = iMACD(_Symbol, _Period, MACD_Fast, MACD_Slow, MACD_Signal, PRICE_CLOSE);
    hStoch = iStochastic(_Symbol, _Period, Stochastic_K, 3, 3, MODE_SMA, STO_LOWHIGH);
    hATR = iATR(_Symbol, _Period, ATR_Period);
    
    if(hEMA_Fast == INVALID_HANDLE || hEMA_Slow == INVALID_HANDLE ||
       hRSI == INVALID_HANDLE || hMACD == INVALID_HANDLE ||
       hStoch == INVALID_HANDLE || hATR == INVALID_HANDLE) {
        Print("Failed to create indicators");
        return INIT_FAILED;
    }
    
    SetIndexBuffer(0, ExtPlot1);
    SetIndexBuffer(1, ExtPlot2);
    SetIndexBuffer(2, ExtPlot3);
    SetIndexBuffer(3, ExtPlot4);
    SetIndexBuffer(4, ExtPlot5);
    SetIndexBuffer(5, ExtPlot6);
    SetIndexBuffer(6, ExtPlot7);
    
    PlotIndexSetString(0, PLOT_LABEL, "EMA Fast");
    PlotIndexSetString(1, PLOT_LABEL, "EMA Slow");
    PlotIndexSetString(2, PLOT_LABEL, "RSI");
    PlotIndexSetString(3, PLOT_LABEL, "MACD");
    PlotIndexSetString(4, PLOT_LABEL, "Stochastic");
    PlotIndexSetString(5, PLOT_LABEL, "ATR");
    PlotIndexSetString(6, PLOT_LABEL, "Signal");
    
    PlotIndexSetInteger(0, PLOT_DRAW_TYPE, DRAW_LINE);
    PlotIndexSetInteger(1, PLOT_DRAW_TYPE, DRAW_LINE);
    PlotIndexSetInteger(2, PLOT_DRAW_TYPE, DRAW_LINE);
    PlotIndexSetInteger(3, PLOT_DRAW_TYPE, DRAW_LINE);
    PlotIndexSetInteger(4, PLOT_DRAW_TYPE, DRAW_LINE);
    PlotIndexSetInteger(5, PLOT_DRAW_TYPE, DRAW_LINE);
    PlotIndexSetInteger(6, PLOT_DRAW_TYPE, DRAW_LINE);
    
    PlotIndexSetInteger(0, PLOT_LINE_WIDTH, 2);
    PlotIndexSetInteger(1, PLOT_LINE_WIDTH, 2);
    
    IndicatorSetString(INDICATOR_SHORTNAME, "ProTrader Dashboard");
    IndicatorSetInteger(INDICATOR_DIGITS, 5);
    
    return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) {
    if(hEMA_Fast != INVALID_HANDLE) IndicatorRelease(hEMA_Fast);
    if(hEMA_Slow != INVALID_HANDLE) IndicatorRelease(hEMA_Slow);
    if(hRSI != INVALID_HANDLE) IndicatorRelease(hRSI);
    if(hMACD != INVALID_HANDLE) IndicatorRelease(hMACD);
    if(hStoch != INVALID_HANDLE) IndicatorRelease(hStoch);
    if(hATR != INVALID_HANDLE) IndicatorRelease(hATR);
}

double ExtPlot1[];
double ExtPlot2[];
double ExtPlot3[];
double ExtPlot4[];
double ExtPlot5[];
double ExtPlot6[];
double ExtPlot7[];

int OnCalculate(const int rates_total,
                const int prev_calculated,
                const datetime &time[],
                const double &open[],
                const double &high[],
                const double &low[],
                const double &close[],
                const long &tick_volume[],
                const long &volume[],
                const int &spread[]) {
    
    if(prev_calculated == 0) {
        ArraySetAsSeries(ExtPlot1, true);
        ArraySetAsSeries(ExtPlot2, true);
        ArraySetAsSeries(ExtPlot3, true);
        ArraySetAsSeries(ExtPlot4, true);
        ArraySetAsSeries(ExtPlot5, true);
        ArraySetAsSeries(ExtPlot6, true);
        ArraySetAsSeries(ExtPlot7, true);
    }
    
    if(CopyBuffer(hEMA_Fast, 0, 0, rates_total, ExtPlot1) <= 0) return 0;
    if(CopyBuffer(hEMA_Slow, 0, 0, rates_total, ExtPlot2) <= 0) return 0;
    if(CopyBuffer(hRSI, 0, 0, rates_total, ExtPlot3) <= 0) return 0;
    
    double macdMain[], macdSig[];
    if(CopyBuffer(hMACD, 0, 0, rates_total, macdMain) <= 0) return 0;
    if(CopyBuffer(hMACD, 1, 0, rates_total, macdSig) <= 0) return 0;
    for(int i = 0; i < rates_total; i++) {
        ExtPlot4[i] = macdMain[i] - macdSig[i];
    }
    
    double stochK[], stochD[];
    if(CopyBuffer(hStoch, 0, 0, rates_total, stochK) <= 0) return 0;
    if(CopyBuffer(hStoch, 1, 0, rates_total, stochD) <= 0) return 0;
    for(int i = 0; i < rates_total; i++) {
        ExtPlot5[i] = stochK[i];
    }
    
    if(CopyBuffer(hATR, 0, 0, rates_total, ExtPlot6) <= 0) return 0;
    
    for(int i = 0; i < rates_total; i++) {
        double signal = 0;
        if(ExtPlot1[i] > ExtPlot2[i]) signal += 1;
        else if(ExtPlot1[i] < ExtPlot2[i]) signal -= 1;
        
        if(ExtPlot3[i] < 30) signal += 1;
        else if(ExtPlot3[i] > 70) signal -= 1;
        
        if(ExtPlot4[i] > 0) signal += 1;
        else if(ExtPlot4[i] < 0) signal -= 1;
        
        if(ExtPlot5[i] < 20) signal += 1;
        else if(ExtPlot5[i] > 80) signal -= 1;
        
        ExtPlot7[i] = signal;
    }
    
    return rates_total;
}