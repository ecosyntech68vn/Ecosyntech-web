#property copyright "SMC Backtest Runner"
#property version "1.00"
#property script_show_inputs

#include <SMC_Backtest.mqh>

input_group("=== BACKTEST CONFIGURATION ===");
input string Symbol = "GBPUSD";
input ENUM_TIMEFRAMES Timeframe = PERIOD_H1;
input datetime StartDate = D'2023.01.01';
input datetime EndDate = D'2025.01.01';
input double InitialBalance = 10000;

input_group("=== STRATEGY PARAMETERS ===");
input double RiskPercent = 2.0;
input double MaxDrawdown = 20.0;
input int MaxDailyTrades = 3;
input double ATR_SL_Multiplier = 2.0;
input double RiskRewardRatio = 2.0;

input_group("=== FILTERS ===");
input int MaxSpread = 25;
input int MinATR = 100;
input bool UseTimeFilter = true;
input int StartHour = 7;
input int EndHour = 22;

void OnStart() {
    BacktestConfig config;
    config.symbol = Symbol;
    config.timeframe = Timeframe;
    config.startDate = StartDate;
    config.endDate = EndDate;
    config.initialBalance = InitialBalance;
    config.riskPercent = RiskPercent;
    config.maxDrawdown = MaxDrawdown;
    
    CSMC_Backtester backtester;
    backtester.Initialize(config);
    backtester.RunBacktest();
    
    BacktestStats stats = backtester.GetStats();
    
    Print("\n=== SUMMARY ===");
    Print("Period: ", TimeToString(StartDate), " to ", TimeToString(EndDate));
    Print("Symbol: ", Symbol, " ", EnumToString(Timeframe));
    Print("Initial: ", InitialBalance);
    Print("Final: ", InitialBalance + stats.totalProfit);
    Print("Return: ", DoubleToString(stats.totalProfit / InitialBalance * 100, 2), "%");
    Print("Win Rate: ", DoubleToString((double)stats.winningTrades / stats.totalTrades * 100, 1), "%");
    Print("Profit Factor: ", DoubleToString(stats.profitFactor, 2));
    Print("Max Drawdown: ", DoubleToString(stats.maxDrawdown, 2), "%");
    
    string filename = "SMC_Backtest_" + Symbol + "_" + TimeToString(StartDate, TIME_DATE) + ".csv";
    ExportTradesToCSV(backtester, filename);
}

void ExportTradesToCSV(CSMC_Backtester &bt, string filename) {
    int handle = FileOpen(filename, FILE_WRITE | FILE_CSV, ',');
    if(handle != INVALID_HANDLE) {
        FileWrite(handle, "Open Time,Close Time,Type,Open Price,Close Price,Lot,Profit,SL,TP,Reason");
        
        for(int i = 0; i < bt.GetTradeCount(); i++) {
            TradeResult t = bt.GetTrade(i);
            if(t.closeTime > 0) {
                string type = t.type == POSITION_TYPE_BUY ? "BUY" : "SELL";
                FileWrite(handle, 
                    TimeToString(t.openTime), 
                    TimeToString(t.closeTime),
                    type,
                    DoubleToString(t.openPrice, 5),
                    DoubleToString(t.closePrice, 5),
                    DoubleToString(t.lot, 2),
                    DoubleToString(t.profit, 2),
                    DoubleToString(t.sl, 5),
                    DoubleToString(t.tp, 5),
                    t.reason
                );
            }
        }
        
        FileClose(handle);
        Print("Results exported to: ", filename);
    }
}