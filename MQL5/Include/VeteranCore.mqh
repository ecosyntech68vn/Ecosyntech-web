//+==================================================================+
//|     VETERAN TRADER SYSTEM v3.0 - 15 Years Experience            |
//|     Build: 2024 | Philosophy: Simple, Robust, Adaptable          |
//|     Author: 15-Year Professional Trader                         |
//|     Multi-Symbol Support: GBPUSD, GBPUSDc, XAUUSD, EURUSD...     |
//+==================================================================+

#ifndef VETERAN_CORE_MQH
#define VETERAN_CORE_MQH

//+------------------------------------------------------------------+
//| CORE PHILOSOPHY                                                  |
//+------------------------------------------------------------------+
//| 1. KISS - Keep It Simple Stupid                                 |
//| 2. Market adapts, system must adapt                             |
//| 3. Risk first, profit second                                    |
//| 4. No over-optimization                                         |
//| 5. Trade quality over quantity                                   |
//+------------------------------------------------------------------+

enum VETERAN_PHASE {
    PHASE_INIT,
    PHASE_NORMAL,
    PHASE_CAUTION,
    PHASE_RECOVERY,
    PHASE_STOP
};

enum VETERAN_SESSION {
    SESSION_ASIA,
    SESSION_LONDON,
    SESSION_NY,
    SESSION_DEAD
};

enum TRADE_QUALITY {
    QUALITY_LOW,
    QUALITY_MEDIUM,
    QUALITY_HIGH,
    QUALITY_EXCELLENT
};

struct VetConfig {
    string symbol;
    ENUM_TIMEFRAMES mainTF;
    ENUM_TIMEFRAMES trendTF;
    double baseRisk;
    double maxDailyRisk;
    double maxDrawdown;
    int maxTradesPerDay;
    int maxConcurrent;
    bool useSuffix;  // Enable for GBPUSDc, EURUSDc, etc.
};

struct MarketContext {
    VETERAN_PHASE phase;
    VETERAN_SESSION session;
    int trend;
    double volatility;
    double momentum;
    double atrValue;
    double support;
    double resistance;
    bool isChoppy;
    datetime lastUpdate;
};

struct TradeSetup {
    TRADE_QUALITY quality;
    ENUM_ORDER_TYPE type;
    double entry;
    double sl;
    double tp;
    double riskReward;
    double confidence;
    string reason;
    int confluenceCount;
};

struct DailyStats {
    int tradesOpened;
    int tradesClosed;
    int wins;
    int losses;
    double profit;
    double maxRiskUsed;
    datetime lastTrade;
    bool hitDailyLimit;
    bool hitLossLimit;
};

class CVeteranCore {
private:
    VetConfig m_config;
    MarketContext m_market;
    DailyStats m_daily;
    
    double m_initialBalance;
    double m_currentBalance;
    double m_peakBalance;
    double m_equity;
    double m_drawdown;
    
    datetime m_sessionStart;
    int m_consecutiveLoss;
    int m_totalTrades;
    double m_totalProfit;
    
    bool m_isActive;
    VETERAN_PHASE m_systemPhase;
    
public:
    CVeteranCore() {
        InitializeDefaults();
    }
    
    void Initialize(VetConfig &config) {
        m_config = config;
        m_initialBalance = AccountInfoDouble(ACCOUNT_BALANCE);
        m_currentBalance = m_initialBalance;
        m_peakBalance = m_initialBalance;
        m_equity = m_initialBalance;
        m_drawdown = 0;
        
        m_sessionStart = TimeCurrent();
        m_isActive = true;
        m_systemPhase = PHASE_NORMAL;
        
        ResetDailyStats();
        
        Print("=== VETERAN TRADER SYSTEM v3.0 ===");
        Print("Balance: ", m_initialBalance);
        Print("Max DD: ", m_config.maxDrawdown, "%");
        Print("Risk/Trade: ", m_config.baseRisk, "%");
    }
    
    bool CanTrade() {
        if(!m_isActive) return false;
        if(m_systemPhase == PHASE_STOP) return false;
        if(m_daily.hitDailyLimit) return false;
        if(m_daily.hitLossLimit) return false;
        if(m_drawdown >= m_config.maxDrawdown) {
            m_systemPhase = PHASE_STOP;
            Print("SYSTEM STOP: Max drawdown reached");
            return false;
        }
        
        if(m_consecutiveLoss >= 4) {
            m_systemPhase = PHASE_CAUTION;
            Print("CAUTION: 4 consecutive losses");
        }
        
        return true;
    }
    
    bool ShouldReduceRisk() {
        if(m_systemPhase == PHASE_CAUTION) return true;
        if(m_systemPhase == PHASE_RECOVERY) return true;
        if(m_consecutiveLoss >= 2) return true;
        if(m_drawdown > m_config.maxDrawdown * 0.5) return true;
        return false;
    }
    
    double GetCurrentRiskPercent() {
        if(m_systemPhase == PHASE_CAUTION) return m_config.baseRisk * 0.5;
        if(m_systemPhase == PHASE_RECOVERY) return m_config.baseRisk * 0.75;
        if(m_consecutiveLoss >= 3) return m_config.baseRisk * 0.5;
        return m_config.baseRisk;
    }
    
    void UpdateMarket(string symbol) {
        m_market.session = DetectSession();
        m_market.trend = DetectTrend(symbol, m_config.trendTF);
        m_market.volatility = GetVolatility(symbol, m_config.mainTF);
        m_market.atrValue = GetATR(symbol, m_config.mainTF);
        m_market.momentum = GetMomentum(symbol, m_config.mainTF);
        m_market.isChoppy = IsMarketChoppy(symbol);
        
        UpdateLevels(symbol);
        UpdateSystemPhase();
        
        m_market.lastUpdate = TimeCurrent();
    }
    
    TradeSetup Analyze(string symbol) {
        TradeSetup setup;
        setup.quality = QUALITY_LOW;
        setup.confidence = 0;
        
        if(!CanTrade()) return setup;
        if(!PassBasicFilters(symbol)) return setup;
        
        bool buySignal = false;
        bool sellSignal = false;
        int confluence = 0;
        string reason = "";
        
        // Trend following with pullback
        if(m_market.trend > 0) {
            double current = SymbolInfoDouble(symbol, SYMBOL_BID);
            double pullback = m_market.support + (m_market.resistance - m_market.support) * 0.2;
            
            if(current <= pullback + (m_market.atrValue * 0.5)) {
                buySignal = true;
                confluence++;
                reason = "Trend+Pullback";
            }
        }
        else if(m_market.trend < 0) {
            double current = SymbolInfoDouble(symbol, SYMBOL_ASK);
            double pullback = m_market.resistance - (m_market.resistance - m_market.support) * 0.2;
            
            if(current >= pullback - (m_market.atrValue * 0.5)) {
                sellSignal = true;
                confluence++;
                reason = "Trend+Pullback";
            }
        }
        
        // Add confluence factors
        if(m_market.momentum > 60) { confluence++; reason += "+Mom"; }
        if(m_market.momentum < 40) { confluence++; reason += "+Mom"; }
        if(!m_market.isChoppy) { confluence++; reason += "+Clarity"; }
        if(m_market.session == SESSION_LONDON || m_market.session == SESSION_NY) { 
            confluence++; reason += "+Session"; 
        }
        
        if(confluence >= 3) {
            setup.confluenceCount = confluence;
            
            double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
            double slDistance = m_market.atrValue * 1.5;
            
            if(slDistance < point * 50) slDistance = point * 50;
            
            if(buySignal) {
                setup.type = ORDER_TYPE_BUY;
                setup.entry = SymbolInfoDouble(symbol, SYMBOL_ASK);
                setup.sl = m_market.support - (point * 20);
                setup.tp = setup.entry + (slDistance * 2);
                setup.riskReward = 2.0;
            }
            else if(sellSignal) {
                setup.type = ORDER_TYPE_SELL;
                setup.entry = SymbolInfoDouble(symbol, SYMBOL_BID);
                setup.sl = m_market.resistance + (point * 20);
                setup.tp = setup.entry - (slDistance * 2);
                setup.riskReward = 2.0;
            }
            
            // Quality assessment
            if(confluence >= 4 && setup.riskReward >= 2.5) {
                setup.quality = QUALITY_EXCELLENT;
                setup.confidence = 90;
            }
            else if(confluence >= 3 && setup.riskReward >= 2.0) {
                setup.quality = QUALITY_HIGH;
                setup.confidence = 75;
            }
            else {
                setup.quality = QUALITY_MEDIUM;
                setup.confidence = 60;
            }
            
            setup.reason = reason;
        }
        
        return setup;
    }
    
    double CalculateLot(string symbol, double slDistance) {
        double riskAmount = m_equity * GetCurrentRiskPercent() / 100.0;
        
        double tickValue = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
        double tickSize = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);
        double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
        
        if(tickValue <= 0 || tickSize <= 0 || point <= 0) return 0.01;
        
        double lot = (riskAmount / slDistance) * (point / tickSize) * tickValue;
        
        double minLot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
        double maxLot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
        double lotStep = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
        
        lot = MathFloor(lot / lotStep) * lotStep;
        return MathMax(minLot, MathMin(maxLot, lot));
    }
    
    void OnTradeClosed(double profit, bool isWin) {
        m_totalTrades++;
        m_totalProfit += profit;
        
        m_daily.tradesClosed++;
        m_daily.profit += profit;
        
        if(profit > 0) {
            m_daily.wins++;
            m_consecutiveLoss = 0;
            
            if(m_systemPhase == PHASE_CAUTION) {
                m_systemPhase = PHASE_NORMAL;
                Print("Recovered to Normal Phase");
            }
        }
        else {
            m_daily.losses++;
            m_consecutiveLoss++;
            
            if(m_consecutiveLoss >= 3) {
                m_systemPhase = PHASE_CAUTION;
                Print("Warning: ", m_consecutiveLoss, " consecutive losses");
            }
        }
        
        m_currentBalance += profit;
        if(m_currentBalance > m_peakBalance) m_peakBalance = m_currentBalance;
        
        m_equity = AccountInfoDouble(ACCOUNT_EQUITY);
        m_drawdown = (m_peakBalance - m_equity) / m_peakBalance * 100;
        
        CheckDailyLimits();
    }
    
    void ResetDailyStats() {
        datetime today = StringToTime(TimeToString(TimeCurrent(), TIME_DATE));
        if(m_sessionStart != today) {
            m_daily.tradesOpened = 0;
            m_daily.tradesClosed = 0;
            m_daily.wins = 0;
            m_daily.losses = 0;
            m_daily.profit = 0;
            m_daily.hitDailyLimit = false;
            m_daily.hitLossLimit = false;
            m_sessionStart = today;
        }
    }
    
    void GetSystemStatus(string &status) {
        string phaseStr = "NORMAL";
        if(m_systemPhase == PHASE_CAUTION) phaseStr = "CAUTION";
        else if(m_systemPhase == PHASE_RECOVERY) phaseStr = "RECOVERY";
        else if(m_systemPhase == PHASE_STOP) phaseStr = "STOP";
        
        status = "Phase:" + phaseStr + 
                 " | DD:" + DoubleToString(m_drawdown, 1) + 
                 "% | ConLoss:" + m_consecutiveLoss +
                 " | Daily:" + m_daily.tradesOpened + "/" + m_config.maxTradesPerDay;
    }
    
    MarketContext GetMarket() { return m_market; }
    double GetBalance() { return m_currentBalance; }
    double GetEquity() { return m_equity; }
    double GetDrawdown() { return m_drawdown; }
    DailyStats GetDaily() { return m_daily; }
    
private:
    void InitializeDefaults() {
        m_config.symbol = _Symbol;
        m_config.mainTF = PERIOD_H1;
        m_config.trendTF = PERIOD_D1;
        m_config.baseRisk = 2.0;
        m_config.maxDailyRisk = 6.0;
        m_config.maxDrawdown = 20.0;
        m_config.maxTradesPerDay = 3;
        m_config.maxConcurrent = 2;
    }
    
    VETERAN_SESSION DetectSession() {
        MqlDateTime dt;
        TimeCurrent(dt);
        int hour = dt.hour;
        
        if(hour >= 0 && hour < 7) return SESSION_ASIA;
        if(hour >= 7 && hour < 12) return SESSION_LONDON;
        if(hour >= 12 && hour < 17) return SESSION_NY;
        if(hour >= 17 && hour < 21) return SESSION_NY;
        return SESSION_DEAD;
    }
    
    int DetectTrend(string symbol, ENUM_TIMEFRAMES tf) {
        double ema20[], ema50[];
        
        int hEMA20 = iMA(symbol, tf, 20, 0, MODE_EMA, PRICE_CLOSE);
        int hEMA50 = iMA(symbol, tf, 50, 0, MODE_EMA, PRICE_CLOSE);
        
        if(hEMA20 == INVALID_HANDLE || hEMA50 == INVALID_HANDLE) return 0;
        
        CopyBuffer(hEMA20, 0, 0, 2, ema20);
        CopyBuffer(hEMA50, 0, 0, 2, ema50);
        
        IndicatorRelease(hEMA20);
        IndicatorRelease(hEMA50);
        
        if(ema20[0] > ema50[0] && ema20[1] > ema50[1]) return 1;
        if(ema20[0] < ema50[0] && ema20[1] < ema50[1]) return -1;
        return 0;
    }
    
    double GetVolatility(string symbol, ENUM_TIMEFRAMES tf) {
        double atr[];
        int hATR = iATR(symbol, tf, 14);
        if(hATR == INVALID_HANDLE) return 0;
        
        CopyBuffer(hATR, 0, 0, 1, atr);
        IndicatorRelease(hATR);
        
        return atr[0] / SymbolInfoDouble(symbol, SYMBOL_POINT);
    }
    
    double GetATR(string symbol, ENUM_TIMEFRAMES tf) {
        double atr[];
        int hATR = iATR(symbol, tf, 14);
        if(hATR == INVALID_HANDLE) return 0;
        
        CopyBuffer(hATR, 0, 0, 1, atr);
        IndicatorRelease(hATR);
        
        return atr[0];
    }
    
    double GetMomentum(string symbol, ENUM_TIMEFRAMES tf) {
        double rsi[];
        int hRSI = iRSI(symbol, tf, 14, PRICE_CLOSE);
        if(hRSI == INVALID_HANDLE) return 50;
        
        CopyBuffer(hRSI, 0, 0, 1, rsi);
        IndicatorRelease(hRSI);
        
        return rsi[0];
    }
    
    bool IsMarketChoppy(string symbol) {
        double atr[], emaATR[];
        
        int hATR = iATR(symbol, PERIOD_H1, 14);
        int hEMA = iMA(symbol, PERIOD_H1, 20, 0, MODE_EMA, PRICE_CLOSE);
        
        if(hATR == INVALID_HANDLE || hEMA == INVALID_HANDLE) return true;
        
        CopyBuffer(hATR, 0, 0, 5, atr);
        
        double avgRange = 0;
        for(int i = 0; i < 5; i++) avgRange += atr[i];
        avgRange /= 5;
        
        double close[];
        CopyClose(symbol, PERIOD_H1, 0, 10, close);
        
        double volatility = 0;
        for(int i = 1; i < 10; i++) {
            volatility += MathAbs(close[i] - close[i-1]);
        }
        
        IndicatorRelease(hATR);
        IndicatorRelease(hEMA);
        
        return (volatility / 9) < (avgRange * 0.5);
    }
    
    void UpdateLevels(string symbol) {
        double high[], low[];
        
        int hHigh = iHighest(symbol, PERIOD_H1, MODE_HIGH, 50, 1);
        int hLow = iLowest(symbol, PERIOD_H1, MODE_LOW, 50, 1);
        
        if(hHigh >= 0) CopyHigh(symbol, PERIOD_H1, 0, 50, high);
        if(hLow >= 0) CopyLow(symbol, PERIOD_H1, 0, 50, low);
        
        m_market.support = low[0];
        m_market.resistance = high[0];
        
        for(int i = 1; i < 50; i++) {
            if(low[i] < m_market.support) m_market.support = low[i];
            if(high[i] > m_market.resistance) m_market.resistance = high[i];
        }
    }
    
    bool PassBasicFilters(string symbol) {
        int spread = (int)SymbolInfoInteger(symbol, SYMBOL_SPREAD);
        if(spread > 30) return false;
        
        if(m_market.volatility < 50) return false;
        if(m_market.volatility > 500) return false;
        
        MqlDateTime dt;
        TimeCurrent(dt);
        
        if(dt.hour < 7 || dt.hour >= 22) return false;
        
        if(dt.day_of_week == 0 || dt.day_of_week == 6) return false;
        
        return true;
    }
    
    void UpdateSystemPhase() {
        if(m_systemPhase == PHASE_STOP) return;
        
        if(m_drawdown > m_config.maxDrawdown * 0.7) {
            m_systemPhase = PHASE_RECOVERY;
        }
        else if(m_consecutiveLoss >= 4) {
            m_systemPhase = PHASE_CAUTION;
        }
        else {
            m_systemPhase = PHASE_NORMAL;
        }
    }
    
    void CheckDailyLimits() {
        double riskUsed = 0;
        
        if(m_daily.tradesClosed > 0) {
            double winRate = (double)m_daily.wins / m_daily.tradesClosed;
            if(winRate < 0.3 && m_daily.tradesClosed >= 3) {
                m_daily.hitLossLimit = true;
                Print("DAILY LOSS LIMIT HIT");
            }
        }
        
        if(m_daily.tradesOpened >= m_config.maxTradesPerDay) {
            m_daily.hitDailyLimit = true;
        }
    }
};

#endif