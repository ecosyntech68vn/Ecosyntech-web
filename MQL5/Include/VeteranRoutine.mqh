//+==================================================================+
//|     VETERAN DAILY ROUTINE - 15 Years Experience                 |
//|     Focus: Preparation, Execution, Review                       |
//+==================================================================+

#ifndef VETERAN_ROUTINE_MQH
#define VETERAN_ROUTINE_MQH

#include <VeteranCore.mqh>

class CVeteranDailyRoutine {
private:
    string m_symbol;
    datetime m_lastAnalysis;
    bool m_dailyPlanCreated;
    
    string m_marketNotes;
    string m_levels[5];
    string m_confluenceNotes;
    
    bool m_hasValidSetup;
    ENUM_ORDER_TYPE m_pendingType;
    double m_pendingEntry;
    double m_pendingSL;
    double m_pendingTP;
    string m_pendingReason;
    
public:
    CVeteranDailyRoutine() {
        m_symbol = _Symbol;
        m_lastAnalysis = 0;
        m_dailyPlanCreated = false;
        m_hasValidSetup = false;
    }
    
    void RunMorningRoutine() {
        datetime today = StringToTime(TimeToString(TimeCurrent(), TIME_DATE));
        
        if(m_lastAnalysis < today) {
            Print("\n=== MORNING ROUTINE ===");
            AnalyzeMarket();
            IdentifyLevels();
            CheckConfluence();
            CreateTradingPlan();
            m_lastAnalysis = today;
        }
    }
    
    void AnalyzeMarket() {
        Print("\n--- Market Analysis ---");
        
        // D1 Trend
        double ema20D1[], ema50D1[];
        int hEMA20D1 = iMA(m_symbol, PERIOD_D1, 20, 0, MODE_EMA, PRICE_CLOSE);
        int hEMA50D1 = iMA(m_symbol, PERIOD_D1, 50, 0, MODE_EMA, PRICE_CLOSE);
        
        if(hEMA20D1 != INVALID_HANDLE && hEMA50D1 != INVALID_HANDLE) {
            CopyBuffer(hEMA20D1, 0, 0, 2, ema20D1);
            CopyBuffer(hEMA50D1, 0, 0, 2, ema50D1);
            
            string d1Trend = ema20D1[0] > ema50D1[0] ? "BULLISH" : "BEARISH";
            Print("D1 Trend: ", d1Trend);
            
            IndicatorRelease(hEMA20D1);
            IndicatorRelease(hEMA50D1);
        }
        
        // H1 Setup
        double ema20H1[], ema50H1[];
        int hEMA20H1 = iMA(m_symbol, PERIOD_H1, 20, 0, MODE_EMA, PRICE_CLOSE);
        int hEMA50H1 = iMA(m_symbol, PERIOD_H1, 50, 0, MODE_EMA, PRICE_CLOSE);
        
        if(hEMA20H1 != INVALID_HANDLE && hEMA50H1 != INVALID_HANDLE) {
            CopyBuffer(hEMA20H1, 0, 0, 2, ema20H1);
            CopyBuffer(hEMA50H1, 0, 0, 2, ema50H1);
            
            string h1Trend = ema20H1[0] > ema50H1[0] ? "BULLISH" : "BEARISH";
            Print("H1 Trend: ", h1Trend);
            
            IndicatorRelease(hEMA20H1);
            IndicatorRelease(hEMA50H1);
        }
        
        MqlDateTime dt;
        TimeCurrent(dt);
        
        string session = "ASIA";
        if(dt.hour >= 7 && dt.hour < 12) session = "LONDON";
        else if(dt.hour >= 12 && dt.hour < 17) session = "OVERLAP";
        else if(dt.hour >= 17 && dt.hour < 21) session = "NEW YORK";
        
        Print("Session: ", session);
        Print("Hour: ", dt.hour, ":", dt.min);
        
        // Volatility
        double atr[];
        int hATR = iATR(m_symbol, PERIOD_H1, 14);
        if(hATR != INVALID_HANDLE) {
            CopyBuffer(hATR, 0, 0, 1, atr);
            double atrPoints = atr[0] / SymbolInfoDouble(m_symbol, SYMBOL_POINT);
            Print("ATR: ", DoubleToString(atrPoints, 0), " points");
            IndicatorRelease(hATR);
        }
        
        // RSI
        double rsi[];
        int hRSI = iRSI(m_symbol, PERIOD_H1, 14, PRICE_CLOSE);
        if(hRSI != INVALID_HANDLE) {
            CopyBuffer(hRSI, 0, 0, 1, rsi);
            Print("RSI: ", DoubleToString(rsi[0], 1));
            IndicatorRelease(hRSI);
        }
    }
    
    void IdentifyLevels() {
        Print("\n--- Key Levels ---");
        
        double high[], low[];
        int count = 50;
        
        CopyHigh(m_symbol, PERIOD_H1, 0, count, high);
        CopyLow(m_symbol, PERIOD_H1, 0, count, low);
        
        double swingHigh = high[0];
        double swingLow = low[0];
        
        for(int i = 1; i < count; i++) {
            if(high[i] > swingHigh) swingHigh = high[i];
            if(low[i] < swingLow) swingLow = low[i];
        }
        
        double current = SymbolInfoDouble(m_symbol, SYMBOL_BID);
        double range = swingHigh - swingLow;
        
        Print("Swing High: ", DoubleToString(swingHigh, 5));
        Print("Swing Low: ", DoubleToString(swingLow, 5));
        Print("Current: ", DoubleToString(current, 5));
        Print("Range: ", DoubleToString(range / SymbolInfoDouble(m_symbol, SYMBOL_POINT), 0), " pips");
        
        // Calculate key levels
        double r1 = swingHigh - range * 0.236;
        double r2 = swingHigh - range * 0.382;
        double s1 = swingLow + range * 0.236;
        s2 = swingLow + range * 0.382;
        
        Print("R1: ", DoubleToString(r1, 5));
        Print("R2: ", DoubleToString(r2, 5));
        Print("S1: ", DoubleToString(s1, 5));
        
        double s2 = swingLow + range * 0.382;
        Print("S2: ", DoubleToString(s2, 5));
    }
    
    void CheckConfluence() {
        Print("\n--- Confluence Check ---");
        
        int score = 0;
        
        // Trend
        double ema8[], ema21[];
        int hEMA8 = iMA(m_symbol, PERIOD_H1, 8, 0, MODE_EMA, PRICE_CLOSE);
        int hEMA21 = iMA(m_symbol, PERIOD_H1, 21, 0, MODE_EMA, PRICE_CLOSE);
        
        if(hEMA8 != INVALID_HANDLE && hEMA21 != INVALID_HANDLE) {
            CopyBuffer(hEMA8, 0, 0, 2, ema8);
            CopyBuffer(hEMA21, 0, 0, 2, ema21);
            
            if(ema8[0] > ema21[0]) { score++; Print("+ Trend: Bullish EMA"); }
            else if(ema8[0] < ema21[0]) { score++; Print("+ Trend: Bearish EMA"); }
            
            IndicatorRelease(hEMA8);
            IndicatorRelease(hEMA21);
        }
        
        // RSI
        double rsi[];
        int hRSI = iRSI(m_symbol, PERIOD_H1, 14, PRICE_CLOSE);
        if(hRSI != INVALID_HANDLE) {
            CopyBuffer(hRSI, 0, 0, 1, rsi);
            
            if(rsi[0] < 35) { score++; Print("+ RSI: Oversold"); }
            else if(rsi[0] > 65) { score++; Print("+ RSI: Overbought"); }
            
            IndicatorRelease(hRSI);
        }
        
        // ADX
        double adx[];
        int hADX = iADX(m_symbol, PERIOD_H1, 14);
        if(hADX != INVALID_HANDLE) {
            CopyBuffer(hADX, 0, 0, 1, adx);
            
            if(adx[0] > 25) { score++; Print("+ ADX: Strong Trend"); }
            
            IndicatorRelease(hADX);
        }
        
        // Stochastic
        double stoch[];
        int hStoch = iStochastic(m_symbol, PERIOD_H1, 14, 3, 3, MODE_SMA, STO_LOWHIGH);
        if(hStoch != INVALID_HANDLE) {
            CopyBuffer(hStoch, 0, 0, 1, stoch);
            
            if(stoch[0] < 20) { score++; Print("+ Stoch: Oversold"); }
            else if(stoch[0] > 80) { score++; Print("+ Stoch: Overbought"); }
            
            IndicatorRelease(hStoch);
        }
        
        Print("Confluence Score: ", score, "/4");
        
        if(score >= 3) m_hasValidSetup = true;
        else m_hasValidSetup = false;
    }
    
    void CreateTradingPlan() {
        Print("\n--- Trading Plan ---");
        
        if(m_hasValidSetup) {
            Print("READY TO TRADE - Waiting for entry");
            
            double ema8[], ema21[];
            int hEMA8 = iMA(m_symbol, PERIOD_H1, 8, 0, MODE_EMA, PRICE_CLOSE);
            int hEMA21 = iMA(m_symbol, PERIOD_H1, 21, 0, MODE_EMA, PRICE_CLOSE);
            
            if(hEMA8 != INVALID_HANDLE && hEMA21 != INVALID_HANDLE) {
                CopyBuffer(hEMA8, 0, 0, 2, ema8);
                CopyBuffer(hEMA21, 0, 0, 2, ema21);
                
                if(ema8[0] > ema21[0]) {
                    m_pendingType = ORDER_TYPE_BUY;
                    Print("Plan: BUY on pullback to support");
                }
                else if(ema8[0] < ema21[0]) {
                    m_pendingType = ORDER_TYPE_SELL;
                    Print("Plan: SELL on pullback to resistance");
                }
                
                IndicatorRelease(hEMA8);
                IndicatorRelease(hEMA21);
            }
        }
        else {
            Print("NO SETUP - Wait for confluence");
        }
        
        m_dailyPlanCreated = true;
    }
    
    bool HasValidSetup() { return m_hasValidSetup; }
    ENUM_ORDER_TYPE GetPendingType() { return m_pendingType; }
};

class CVeteranJournal {
private:
    string m_entries[];
    int m_count;
    datetime m_lastEntryDate;
    
public:
    CVeteranJournal() {
        m_count = 0;
        m_lastEntryDate = 0;
    }
    
    void Log(string message) {
        string entry = TimeToString(TimeCurrent(), TIME_DATETIME) + " | " + message;
        
        if(m_count < 10000) {
            m_entries[m_count] = entry;
            m_count++;
        }
        
        Print(entry);
    }
    
    void LogTrade(string action, double entry, double sl, double tp, 
                  double lot, double profit, string reason) {
        string entryStr = StringFormat(
            "%s | %s | Entry: %.5f | SL: %.5f | TP: %.5f | Lot: %.2f | P/L: %.2f | %s",
            TimeToString(TimeCurrent(), TIME_DATETIME),
            action,
            entry, sl, tp, lot, profit,
            reason
        );
        
        if(m_count < 10000) {
            m_entries[m_count] = entryStr;
            m_count++;
        }
        
        Print(entryStr);
    }
    
    void LogResult(bool isWin, double profit) {
        string result = isWin ? "WIN" : "LOSS";
        string entry = StringFormat(
            "%s | RESULT: %s | P/L: %.2f",
            TimeToString(TimeCurrent(), TIME_DATETIME),
            result, profit
        );
        
        if(m_count < 10000) {
            m_entries[m_count] = entry;
            m_count++;
        }
        
        Print(entry);
    }
    
    void ExportDaily() {
        datetime today = StringToTime(TimeToString(TimeCurrent(), TIME_DATE));
        
        if(m_lastEntryDate != today) {
            string filename = "Journal_" + TimeToString(today, TIME_DATE) + ".txt";
            
            int handle = FileOpen("MQL5/Files/" + filename, FILE_WRITE | FILE_TXT);
            
            if(handle != INVALID_HANDLE) {
                for(int i = 0; i < m_count; i++) {
                    FileWrite(handle, m_entries[i]);
                }
                FileClose(handle);
                
                Print("Journal exported: ", filename);
            }
            
            m_count = 0;
            m_lastEntryDate = today;
        }
    }
    
    void PrintSummary() {
        Print("\n=== JOURNAL SUMMARY ===");
        Print("Total Entries: ", m_count);
        Print("=======================\n");
    }
};

#endif