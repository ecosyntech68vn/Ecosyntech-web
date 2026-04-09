#property copyright "Pro Trading Method"
#property version "1.00"
#property description "Complete Personal Trading Methodology"

#ifndef PRO_TRADING_METHOD_MQH
#define PRO_TRADING_METHOD_MQH

enum ENUM_SESSION {
    SESSION_ASIA,
    SESSION_LONDON,
    SESSION_NEWYORK,
    SESSION_OVERLAP
};

enum ENUM_CONFLUENCE_LEVEL {
    CONFLUENCE_NONE,
    CONFLUENCE_WEAK,
    CONFLUENCE_MODERATE,
    CONFLUENCE_STRONG
};

struct TradingPlan {
    ENUM_SESSION session;
    ENUM_MARKET_PHASE phase;
    int trendDirection;
    double trendStrength;
    double volatility;
    LiquidityZone liquidity;
    double support;
    double resistance;
    double entryZone;
    double stopLoss;
    double takeProfit;
    double riskReward;
    double confidence;
};

class CTradingPlan {
private:
    TradingPlan m_plan;
    
public:
    TradingPlan CreateDailyPlan(string symbol) {
        TradingPlan plan;
        
        plan.session = DetectSession();
        plan.phase = DetectMarketPhase(symbol);
        plan.trendDirection = DetectTrend(symbol);
        plan.trendStrength = CalculateTrendStrength(symbol);
        plan.volatility = GetVolatility(symbol);
        
        plan.support = FindSupport(symbol);
        plan.resistance = FindResistance(symbol);
        
        plan.entryZone = 0;
        plan.stopLoss = 0;
        plan.takeProfit = 0;
        plan.riskReward = 0;
        plan.confidence = 0;
        
        m_plan = plan;
        return plan;
    }
    
    bool GenerateTradeSetup(ENUM_ORDER_TYPE &orderType, double &entry, 
                          double &sl, double &tp, double &confidence) {
        if(m_plan.confidence < 70) return false;
        
        if(m_plan.trendDirection > 0) {
            orderType = ORDER_TYPE_BUY;
            entry = m_plan.entryZone;
            sl = m_plan.stopLoss;
            tp = m_plan.takeProfit;
            confidence = m_plan.confidence;
            return true;
        }
        else if(m_plan.trendDirection < 0) {
            orderType = ORDER_TYPE_SELL;
            entry = m_plan.entryZone;
            sl = m_plan.stopLoss;
            tp = m_plan.takeProfit;
            confidence = m_plan.confidence;
            return true;
        }
        
        return false;
    }
    
private:
    ENUM_SESSION DetectSession() {
        MqlDateTime dt;
        TimeCurrent(dt);
        
        if(dt.hour >= 0 && dt.hour < 7) return SESSION_ASIA;
        if(dt.hour >= 7 && dt.hour < 12) return SESSION_LONDON;
        if(dt.hour >= 12 && dt.hour < 17) return SESSION_OVERLAP;
        if(dt.hour >= 17 && dt.hour < 21) return SESSION_NEWYORK;
        return SESSION_ASIA;
    }
    
    ENUM_MARKET_PHASE DetectMarketPhase(string symbol) {
        double ema20[], ema50[];
        int hEMA20 = iMA(symbol, PERIOD_H1, 20, 0, MODE_EMA, PRICE_CLOSE);
        int hEMA50 = iMA(symbol, PERIOD_H1, 50, 0, MODE_EMA, PRICE_CLOSE);
        
        if(hEMA20 == INVALID_HANDLE || hEMA50 == INVALID_HANDLE) return PHASE_RANGING;
        
        CopyBuffer(hEMA20, 0, 0, 2, ema20);
        CopyBuffer(hEMA50, 0, 0, 2, ema50);
        
        IndicatorRelease(hEMA20);
        IndicatorRelease(hEMA50);
        
        double slope = (ema20[0] - ema20[1]) / SymbolInfoDouble(symbol, SYMBOL_POINT);
        
        if(MathAbs(slope) > 3) return PHASE_TRENDING;
        return PHASE_RANGING;
    }
    
    int DetectTrend(string symbol) {
        double ema8[], ema21[];
        int hEMA8 = iMA(symbol, PERIOD_H1, 8, 0, MODE_EMA, PRICE_CLOSE);
        int hEMA21 = iMA(symbol, PERIOD_H1, 21, 0, MODE_EMA, PRICE_CLOSE);
        
        if(hEMA8 == INVALID_HANDLE || hEMA21 == INVALID_HANDLE) return 0;
        
        CopyBuffer(hEMA8, 0, 0, 2, ema8);
        CopyBuffer(hEMA21, 0, 0, 2, ema21);
        
        IndicatorRelease(hEMA8);
        IndicatorRelease(hEMA21);
        
        if(ema8[0] > ema21[0] && ema8[1] > ema21[1]) return 1;
        if(ema8[0] < ema21[0] && ema8[1] < ema21[1]) return -1;
        return 0;
    }
    
    double CalculateTrendStrength(string symbol) {
        double adx[];
        int hADX = iADX(symbol, PERIOD_H1, 14);
        
        if(hADX == INVALID_HANDLE) return 0;
        
        CopyBuffer(hADX, 0, 0, 1, adx);
        IndicatorRelease(hADX);
        
        return adx[0];
    }
    
    double GetVolatility(string symbol) {
        double atr[];
        int hATR = iATR(symbol, PERIOD_H1, 14);
        
        if(hATR == INVALID_HANDLE) return 0;
        
        CopyBuffer(hATR, 0, 0, 1, atr);
        IndicatorRelease(hATR);
        
        return atr[0] / SymbolInfoDouble(symbol, SYMBOL_POINT);
    }
    
    double FindSupport(string symbol) {
        double low[];
        int count = 50;
        CopyLow(symbol, PERIOD_H1, 0, count, low);
        
        double swingLow = low[0];
        for(int i = 1; i < count; i++) {
            if(low[i] < swingLow) swingLow = low[i];
        }
        
        double current = SymbolInfoDouble(symbol, SYMBOL_BID);
        if(current - swingLow < (m_plan.volatility * 20)) {
            return swingLow;
        }
        
        return current - (m_plan.volatility * 30);
    }
    
    double FindResistance(string symbol) {
        double high[];
        int count = 50;
        CopyHigh(symbol, PERIOD_H1, 0, count, high);
        
        double swingHigh = high[0];
        for(int i = 1; i < count; i++) {
            if(high[i] > swingHigh) swingHigh = high[i];
        }
        
        double current = SymbolInfoDouble(symbol, SYMBOL_ASK);
        if(swingHigh - current < (m_plan.volatility * 20)) {
            return swingHigh;
        }
        
        return current + (m_plan.volatility * 30);
    }
};

class CConfluenceChecker {
public:
    static CONFLUENCE_LEVEL Check(string symbol) {
        int score = 0;
        
        double ema8[], ema21[];
        int hEMA8 = iMA(symbol, PERIOD_H1, 8, 0, MODE_EMA, PRICE_CLOSE);
        int hEMA21 = iMA(symbol, PERIOD_H1, 21, 0, MODE_EMA, PRICE_CLOSE);
        
        if(hEMA8 != INVALID_HANDLE && hEMA21 != INVALID_HANDLE) {
            CopyBuffer(hEMA8, 0, 0, 2, ema8);
            CopyBuffer(hEMA21, 0, 0, 2, ema21);
            
            if(ema8[0] > ema21[0]) score += 2;
            else if(ema8[0] < ema21[0]) score -= 2;
            
            IndicatorRelease(hEMA8);
            IndicatorRelease(hEMA21);
        }
        
        double rsi[];
        int hRSI = iRSI(symbol, PERIOD_H1, 14, PRICE_CLOSE);
        if(hRSI != INVALID_HANDLE) {
            CopyBuffer(hRSI, 0, 0, 1, rsi);
            
            if(rsi[0] < 35) score += 1;
            else if(rsi[0] > 65) score -= 1;
            
            IndicatorRelease(hRSI);
        }
        
        double adx[];
        int hADX = iADX(symbol, PERIOD_H1, 14);
        if(hADX != INVALID_HANDLE) {
            CopyBuffer(hADX, 0, 0, 1, adx);
            
            if(adx[0] > 25) score += 1;
            
            IndicatorRelease(hADX);
        }
        
        if(score >= 3) return CONFLUENCE_STRONG;
        if(score >= 1) return CONFLUENCE_MODERATE;
        if(score >= -1) return CONFLUENCE_WEAK;
        return CONFLUENCE_NONE;
    }
};

class CPositionSizer {
public:
    static double CalculateLot(string symbol, double accountBalance, 
                               double riskPercent, double slDistance) {
        if(slDistance <= 0) return 0.01;
        
        double riskAmount = accountBalance * riskPercent / 100.0;
        
        double tickValue = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
        double tickSize = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);
        double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
        
        if(tickValue <= 0 || tickSize <= 0 || point <= 0) return 0.01;
        
        double lot = (riskAmount / slDistance) * (point / tickSize) * tickValue;
        
        double minLot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
        double maxLot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
        double lotStep = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
        
        lot = MathFloor(lot / lotStep) * lotStep;
        
        double maxRisk = accountBalance * 0.05;
        double maxLotByRisk = (maxRisk / slDistance) * (point / tickSize) * tickValue;
        maxLotByRisk = MathFloor(maxLotByRisk / lotStep) * lotStep;
        
        return MathMax(minLot, MathMin(maxLot, MathMin(lot, maxLotByRisk)));
    }
};

class CTradeJournal {
private:
    string m_entries[];
    int m_count;
    
public:
    void AddEntry(string entry) {
        if(m_count < 1000) {
            m_entries[m_count] = TimeToString(TimeCurrent()) + " | " + entry;
            m_count++;
        }
    }
    
    void PrintAll() {
        for(int i = 0; i < m_count; i++) {
            Print(m_entries[i]);
        }
    }
    
    void ExportToFile(string filename) {
        int handle = FileOpen(filename, FILE_WRITE | FILE_TXT);
        if(handle != INVALID_HANDLE) {
            for(int i = 0; i < m_count; i++) {
                FileWrite(handle, m_entries[i]);
            }
            FileClose(handle);
        }
    }
};

#endif