#property copyright "Smart Money EA Pro"
#property version "2.00"
#property description "Smart Money Concepts - Liquidity, Order Blocks, FVG"

#ifndef SMC_ENGINE_MQH
#define SMC_ENGINE_MQH

#include <SMC_Config.mqh>

class CMarketStructure {
private:
    MarketStructure m_market;
    LiquidityZone m_liquidityZones[];
    int m_liquidityCount;
    OrderBlock m_orderBlocks[];
    int m_obCount;
    FVG m_fvgs[];
    int m_fvgCount;
    
    string m_symbol;
    ENUM_TIMEFRAMES m_tf;
    ENUM_TIMEFRAMES m_tfHigher;
    
public:
    CMarketStructure() {
        m_symbol = _Symbol;
        m_tf = PERIOD_H1;
        m_tfHigher = PERIOD_D1;
        m_liquidityCount = 0;
        m_obCount = 0;
        m_fvgCount = 0;
        ArrayResize(m_liquidityZones, 10);
        ArrayResize(m_orderBlocks, 20);
        ArrayResize(m_fvgs, 20);
    }
    
    void Update() {
        DetectSwingPoints();
        DetectMarketPhase();
        DetectLiquidityZones();
        DetectOrderBlocks();
        DetectFVG();
    }
    
private:
    void DetectSwingPoints() {
        double high[], low[], close[];
        int handle;
        
        if(UseMultiTimeframe && m_tfHigher > m_tf) {
            handle = iHighest(m_symbol, m_tfHigher, MODE_HIGH, SwingStrength * 4, 1);
            if(handle != -1) {
                m_market.lastHigh = high[0];
                m_market.lastHighTime = iTime(m_symbol, m_tfHigher, 0);
            }
            handle = iLowest(m_symbol, m_tfHigher, MODE_LOW, SwingStrength * 4, 1);
            if(handle != -1) {
                m_market.lastLow = low[0];
                m_market.lastLowTime = iTime(m_symbol, m_tfHigher, 0);
            }
        }
        
        int count = 200;
        handle = iHighest(m_symbol, m_tf, MODE_HIGH, SwingStrength, 0);
        if(handle >= 0) CopyHigh(m_symbol, m_tf, 0, count, high);
        
        handle = iLowest(m_symbol, m_tf, MODE_LOW, SwingStrength, 0);
        if(handle >= 0) CopyLow(m_symbol, m_tf, 0, count, low);
        
        double currentHigh = high[0];
        double currentLow = low[0];
        
        for(int i = 1; i < MathMin(5, count); i++) {
            if(high[i] > currentHigh) currentHigh = high[i];
            if(low[i] < currentLow) currentLow = low[i];
        }
        
        if(currentHigh > m_market.swingHigh) {
            m_market.swingHigh = currentHigh;
            m_market.lastHighTime = iTime(m_symbol, m_tf, iHighest(m_symbol, m_tf, MODE_HIGH, SwingStrength, 0));
        }
        if(currentLow < m_market.swingLow || m_market.swingLow == 0) {
            m_market.swingLow = currentLow;
            m_market.lastLowTime = iTime(m_symbol, m_tf, iLowest(m_symbol, m_tf, MODE_LOW, SwingStrength, 0));
        }
        
        m_market.lastHigh = currentHigh;
        m_market.lastLow = currentLow;
        
        double range = m_market.swingHigh - m_market.swingLow;
        double currentRange = (SymbolInfoDouble(m_symbol, SYMBOL_BID) - m_market.swingLow) / range;
        
        m_market.isConsolidating = (currentRange < ConsolidationThreshold || 
                                    currentRange > (1 - ConsolidationThreshold));
    }
    
    void DetectMarketPhase() {
        double atr[], ema20[], ema50[];
        int hATR = iATR(m_symbol, m_tf, ATR_Period);
        int hEMA20 = iMA(m_symbol, m_tf, 20, 0, MODE_EMA, PRICE_CLOSE);
        int hEMA50 = iMA(m_symbol, m_tf, 50, 0, MODE_EMA, PRICE_CLOSE);
        
        if(hATR == INVALID_HANDLE || hEMA20 == INVALID_HANDLE || hEMA50 == INVALID_HANDLE) {
            m_market.phase = PHASE_RANGING;
            return;
        }
        
        CopyBuffer(hATR, 0, 0, 1, atr);
        CopyBuffer(hEMA20, 0, 0, 2, ema20);
        CopyBuffer(hEMA50, 0, 0, 2, ema50);
        
        m_market.volatility = atr[0] / SymbolInfoDouble(m_symbol, SYMBOL_POINT);
        
        double emaSlope = (ema20[0] - ema20[1]) / SymbolInfoDouble(m_symbol, SYMBOL_POINT);
        
        if(MathAbs(emaSlope) > 5) {
            m_market.phase = PHASE_TRENDING;
            m_market.trendDirection = emaSlope > 0 ? 1 : -1;
        } else if(atr[0] < SymbolInfoDouble(m_symbol, SYMBOL_POINT) * 200) {
            m_market.phase = PHASE_RANGING;
            m_market.trendDirection = 0;
        } else {
            m_market.phase = PHASE_VOLATILE;
            m_market.trendDirection = 0;
        }
        
        IndicatorRelease(hATR);
        IndicatorRelease(hEMA20);
        IndicatorRelease(hEMA50);
    }
    
    void DetectLiquidityZones() {
        double high[], close[];
        int count = LiquidityLookback;
        
        int hHigh = iHighest(m_symbol, m_tf, MODE_HIGH, count, 1);
        if(hHigh >= 0) CopyHigh(m_symbol, m_tf, 0, count, high);
        
        double pivotHigh = high[0];
        for(int i = 1; i < count; i++) {
            if(high[i] > pivotHigh) pivotHigh = high[i];
        }
        
        double currentPrice = SymbolInfoDouble(m_symbol, SYMBOL_BID);
        double swingRange = m_market.swingHigh - m_market.swingLow;
        
        if(pivotHigh > m_market.swingHigh * 0.99) {
            if(m_liquidityCount < 10) {
                m_liquidityZones[m_liquidityCount].price = pivotHigh;
                m_liquidityZones[m_liquidityCount].strength = 3;
                m_liquidityZones[m_liquidityCount].created = TimeCurrent();
                m_liquidityZones[m_liquidityCount].isActive = true;
                m_liquidityCount++;
            }
        }
        
        double pivotLow = low[0];
        for(int i = 1; i < count; i++) {
            if(low[i] < pivotLow) pivotLow = low[i];
        }
        
        if(pivotLow < m_market.swingLow * 1.01) {
            if(m_liquidityCount < 10) {
                m_liquidityZones[m_liquidityCount].price = pivotLow;
                m_liquidityZones[m_liquidityCount].strength = 3;
                m_liquidityZones[m_liquidityCount].created = TimeCurrent();
                m_liquidityZones[m_liquidityCount].isActive = true;
                m_liquidityCount++;
            }
        }
    }
    
    void DetectOrderBlocks() {
        double close[], open[], high[], low[];
        int count = 100;
        
        CopyClose(m_symbol, m_tf, 0, count, close);
        CopyOpen(m_symbol, m_tf, 0, count, open);
        CopyHigh(m_symbol, m_tf, 0, count, high);
        CopyLow(m_symbol, m_tf, 0, count, low);
        
        for(int i = 2; i < count - 2; i++) {
            double body = MathAbs(close[i] - open[i]);
            double range = high[i] - low[i];
            
            if(body / range > 0.6) {
                ENUM_ORDER_BLOCK_TYPE obType = (close[i] > open[i]) ? OB_BULLISH : OB_BEARISH;
                double obRange = range * OB_FibLevel;
                
                bool isNewOB = true;
                for(int j = 0; j < m_obCount; j++) {
                    if(MathAbs(m_orderBlocks[j].low - low[i]) < SymbolInfoDouble(m_symbol, SYMBOL_POINT) * 20) {
                        isNewOB = false;
                        break;
                    }
                }
                
                if(isNewOB && m_obCount < 20) {
                    m_orderBlocks[m_obCount].type = obType;
                    m_orderBlocks[m_obCount].high = high[i];
                    m_orderBlocks[m_obCount].low = low[i];
                    m_orderBlocks[m_obCount].range = obRange;
                    m_orderBlocks[m_obCount].strength = 1;
                    m_orderBlocks[m_obCount].created = iTime(m_symbol, m_tf, i);
                    m_orderBlocks[m_obCount].isActive = true;
                    m_orderBlocks[m_obCount].triggered = false;
                    m_obCount++;
                }
            }
        }
    }
    
    void DetectFVG() {
        if(!UseFVG) return;
        
        double high[], low[];
        int count = 20;
        
        CopyHigh(m_symbol, m_tf, 0, count, high);
        CopyLow(m_symbol, m_tf, 0, count, low);
        
        for(int i = FVG_Backtrack; i < count - FVG_Backtrack; i++) {
            double prevLow = low[i - 1];
            double prevHigh = high[i - 1];
            double currLow = low[i];
            double currHigh = high[i];
            
            if(prevHigh < currLow) {
                double fvgLow = prevHigh;
                double fvgHigh = currLow;
                
                bool isNewFVG = true;
                for(int j = 0; j < m_fvgCount; j++) {
                    if(MathAbs(m_fvgs[j].low - fvgLow) < SymbolInfoDouble(m_symbol, SYMBOL_POINT) * 10) {
                        isNewFVG = false;
                        break;
                    }
                }
                
                if(isNewFVG && m_fvgCount < 20) {
                    m_fvgs[m_fvgCount].low = fvgLow;
                    m_fvgs[m_fvgCount].high = fvgHigh;
                    m_fvgs[m_fvgCount].barsAge = i;
                    m_fvgs[m_fvgCount].isActive = true;
                    m_fvgs[m_fvgCount].bias = OB_BULLISH;
                    m_fvgCount++;
                }
            }
            else if(prevLow > currHigh) {
                double fvgLow = currHigh;
                double fvgHigh = prevLow;
                
                bool isNewFVG = true;
                for(int j = 0; j < m_fvgCount; j++) {
                    if(MathAbs(m_fvgs[j].high - fvgHigh) < SymbolInfoDouble(m_symbol, SYMBOL_POINT) * 10) {
                        isNewFVG = false;
                        break;
                    }
                }
                
                if(isNewFVG && m_fvgCount < 20) {
                    m_fvgs[m_fvgCount].low = fvgLow;
                    m_fvgs[m_fvgCount].high = fvgHigh;
                    m_fvgs[m_fvgCount].barsAge = i;
                    m_fvgs[m_fvgCount].isActive = true;
                    m_fvgs[m_fvgCount].bias = OB_BEARISH;
                    m_fvgCount++;
                }
            }
        }
    }
    
public:
    bool FindBuyEntry(double &entry, double &sl, double &tp, double &confidence) {
        if(m_market.phase == PHASE_RANGING) {
            return FindRangeBuyEntry(entry, sl, tp, confidence);
        }
        
        double currentPrice = SymbolInfoDouble(m_symbol, SYMBOL_BID);
        
        for(int i = 0; i < m_obCount; i++) {
            if(m_orderBlocks[i].type == OB_BEARISH && m_orderBlocks[i].isActive) {
                if(currentPrice <= m_orderBlocks[i].high && currentPrice >= m_orderBlocks[i].low) {
                    double range = m_orderBlocks[i].high - m_orderBlocks[i].low;
                    entry = currentPrice + (SymbolInfoDouble(m_symbol, SYMBOL_POINT) * 10);
                    sl = m_orderBlocks[i].low - (range * 0.5);
                    tp = entry + (entry - sl) * RiskRewardMin;
                    confidence = 70 + m_orderBlocks[i].strength * 5;
                    
                    if(m_market.trendDirection > 0) confidence += 15;
                    
                    return true;
                }
            }
        }
        
        if(UseFVG) {
            for(int i = 0; i < m_fvgCount; i++) {
                if(m_fvgs[i].bias == OB_BEARISH && m_fvgs[i].isActive) {
                    if(m_fvgs[i].barsAge <= 3) {
                        entry = m_fvgs[i].high + (SymbolInfoDouble(m_symbol, SYMBOL_POINT) * FVG_EntryOffset);
                        sl = m_fvgs[i].low;
                        tp = entry + (entry - sl) * RiskRewardMin;
                        confidence = 75;
                        
                        if(m_market.trendDirection > 0) confidence += 10;
                        
                        m_fvgs[i].isActive = false;
                        return true;
                    }
                }
            }
        }
        
        if(m_market.trendDirection > 0 && m_market.lastLow > 0) {
            entry = currentPrice;
            sl = m_market.lastLow - (SymbolInfoDouble(m_symbol, SYMBOL_POINT) * 50);
            tp = entry + (entry - sl) * RiskRewardMin;
            confidence = 60;
            return true;
        }
        
        return false;
    }
    
    bool FindSellEntry(double &entry, double &sl, double &tp, double &confidence) {
        if(m_market.phase == PHASE_RANGING) {
            return FindRangeSellEntry(entry, sl, tp, confidence);
        }
        
        double currentPrice = SymbolInfoDouble(m_symbol, SYMBOL_ASK);
        
        for(int i = 0; i < m_obCount; i++) {
            if(m_orderBlocks[i].type == OB_BULLISH && m_orderBlocks[i].isActive) {
                if(currentPrice >= m_orderBlocks[i].low && currentPrice <= m_orderBlocks[i].high) {
                    double range = m_orderBlocks[i].high - m_orderBlocks[i].low;
                    entry = currentPrice - (SymbolInfoDouble(m_symbol, SYMBOL_POINT) * 10);
                    sl = m_orderBlocks[i].high + (range * 0.5);
                    tp = entry - (sl - entry) * RiskRewardMin;
                    confidence = 70 + m_orderBlocks[i].strength * 5;
                    
                    if(m_market.trendDirection < 0) confidence += 15;
                    
                    return true;
                }
            }
        }
        
        if(UseFVG) {
            for(int i = 0; i < m_fvgCount; i++) {
                if(m_fvgs[i].bias == OB_BULLISH && m_fvgs[i].isActive) {
                    if(m_fvgs[i].barsAge <= 3) {
                        entry = m_fvgs[i].low - (SymbolInfoDouble(m_symbol, SYMBOL_POINT) * FVG_EntryOffset);
                        sl = m_fvgs[i].high;
                        tp = entry - (sl - entry) * RiskRewardMin;
                        confidence = 75;
                        
                        if(m_market.trendDirection < 0) confidence += 10;
                        
                        m_fvgs[i].isActive = false;
                        return true;
                    }
                }
            }
        }
        
        if(m_market.trendDirection < 0 && m_market.lastHigh > 0) {
            entry = currentPrice;
            sl = m_market.lastHigh + (SymbolInfoDouble(m_symbol, SYMBOL_POINT) * 50);
            tp = entry - (sl - entry) * RiskRewardMin;
            confidence = 60;
            return true;
        }
        
        return false;
    }
    
private:
    bool FindRangeBuyEntry(double &entry, double &sl, double &tp, double &confidence) {
        if(m_market.swingHigh == 0 || m_market.swingLow == 0) return false;
        
        double range = m_market.swingHigh - m_market.swingLow;
        double currentPrice = SymbolInfoDouble(m_symbol, SYMBOL_BID);
        
        double supportZone = m_market.swingLow + (range * 0.2);
        
        if(currentPrice <= supportZone + (range * 0.05)) {
            entry = currentPrice;
            sl = m_market.swingLow - (SymbolInfoDouble(m_symbol, SYMBOL_POINT) * 20);
            tp = m_market.swingLow + (range * 0.6);
            confidence = 55;
            return true;
        }
        
        return false;
    }
    
    bool FindRangeSellEntry(double &entry, double &sl, double &tp, double &confidence) {
        if(m_market.swingHigh == 0 || m_market.swingLow == 0) return false;
        
        double range = m_market.swingHigh - m_market.swingLow;
        double currentPrice = SymbolInfoDouble(m_symbol, SYMBOL_ASK);
        
        double resistanceZone = m_market.swingHigh - (range * 0.2);
        
        if(currentPrice >= resistanceZone - (range * 0.05)) {
            entry = currentPrice;
            sl = m_market.swingHigh + (SymbolInfoDouble(m_symbol, SYMBOL_POINT) * 20);
            tp = m_market.swingHigh - (range * 0.6);
            confidence = 55;
            return true;
        }
        
        return false;
    }
    
public:
    MarketStructure GetMarketStructure() { return m_market; }
    ENUM_MARKET_PHASE GetPhase() { return m_market.phase; }
    int GetTrendDirection() { return m_market.trendDirection; }
    double GetVolatility() { return m_market.volatility; }
    bool IsConsolidating() { return m_market.isConsolidating; }
    
    void LogStatus() {
        if(!UseDebug) return;
        
        string phaseStr = "RANGING";
        if(m_market.phase == PHASE_TRENDING) phaseStr = "TRENDING";
        else if(m_market.phase == PHASE_VOLATILE) phaseStr = "VOLATILE";
        
        string trendStr = m_market.trendDirection > 0 ? "UP" : (m_market.trendDirection < 0 ? "DOWN" : "FLAT");
        
        Print("SMC Status: Phase=", phaseStr, " Trend=", trendStr, 
              " Vol=", DoubleToString(m_market.volatility, 0),
              " OB_Count=", m_obCount, " FVG_Count=", m_fvgCount);
    }
};

#endif