#property copyright "Pro Trading System"
#property version "1.00"
#property description "Advanced Risk Management Library"

#ifndef PRO_RISK_MGMT_MQH
#define PRO_RISK_MGMT_MQH

#include <Config.mqh>

class CRiskManager {
private:
    double m_balance;
    double m_equity;
    double m_initialBalance;
    double m_dailyProfit;
    double m_dailyLoss;
    datetime m_lastTradeDate;
    
public:
    CRiskManager() {
        m_balance = AccountInfoDouble(ACCOUNT_BALANCE);
        m_initialBalance = m_balance;
        m_dailyProfit = 0;
        m_dailyLoss = 0;
        m_lastTradeDate = 0;
    }
    
    void Update() {
        m_balance = AccountInfoDouble(ACCOUNT_BALANCE);
        m_equity = AccountInfoDouble(ACCOUNT_EQUITY);
        
        datetime today = StringToTime(TimeToString(TimeCurrent(), TIME_DATE));
        if(m_lastTradeDate != today) {
            m_dailyProfit = 0;
            m_dailyLoss = 0;
            m_lastTradeDate = today;
        }
    }
    
    double CalculateLotSize(string symbol, double riskPercent, double slPoints) {
        double tickValue = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
        double tickSize = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);
        double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
        
        if(tickValue == 0 || tickSize == 0 || point == 0) return 0;
        
        double riskAmount = m_balance * riskPercent / 100.0;
        double lotSize = (riskAmount / slPoints) * (point / tickSize) * tickValue;
        
        double minLot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
        double maxLot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
        double lotStep = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
        
        lotSize = MathFloor(lotSize / lotStep) * lotStep;
        return MathMax(minLot, MathMin(maxLot, lotSize));
    }
    
    double GetATRBasedSL(string symbol, ENUM_TIMEFRAMES timeframe, double atrMultiplier) {
        double atr[];
        int hATR = iATR(symbol, timeframe, 14);
        if(hATR == INVALID_HANDLE || CopyBuffer(hATR, 0, 0, 1, atr) <= 0) {
            IndicatorRelease(hATR);
            return 0;
        }
        IndicatorRelease(hATR);
        return atr[0] * atrMultiplier;
    }
    
    bool IsRiskAllowed(double riskPercent) {
        if(m_balance <= 0) return false;
        double riskAmount = m_balance * riskPercent / 100.0;
        
        double maxDailyLoss = m_initialBalance * 0.05;
        if(m_dailyLoss >= maxDailyLoss) {
            if(UseDebug) Print("Daily loss limit reached: ", m_dailyLoss, " / ", maxDailyLoss);
            return false;
        }
        
        double maxDrawdown = m_initialBalance * 0.20;
        if(m_initialBalance - m_balance > maxDrawdown) {
            if(UseDebug) Print("Max drawdown reached");
            return false;
        }
        
        return true;
    }
    
    void RecordTrade(double profit) {
        if(profit > 0) m_dailyProfit += profit;
        else m_dailyLoss += MathAbs(profit);
    }
    
    bool CheckDailyLimits() {
        double maxDailyProfit = m_initialBalance * 0.10;
        if(m_dailyProfit >= maxDailyProfit) {
            if(UseDebug) Print("Daily profit target reached");
            return false;
        }
        return true;
    }
    
    double GetBalance() { return m_balance; }
    double GetEquity() { return m_equity; }
    double GetDailyProfit() { return m_dailyProfit; }
    double GetDailyLoss() { return m_dailyLoss; }
    double GetFloatingProfit() { return m_equity - m_balance; }
};

class CTrailingManager {
private:
    double m_trailingStart;
    double m_trailingDistance;
    double m_breakevenLevel;
    double m_partialLevel;
    double m_partialPercent;
    bool m_useTrailing;
    bool m_useBreakeven;
    bool m_usePartial;
    
public:
    CTrailingManager() {
        m_trailingStart = TrailStartProfit;
        m_trailingDistance = TrailDistance;
        m_breakevenLevel = BreakevenProfit;
        m_partialLevel = PartialCloseLevel;
        m_partialPercent = PartialClosePercent;
        m_useTrailing = UseTrailingStop;
        m_useBreakeven = UseBreakeven;
        m_usePartial = UsePartialClose;
    }
    
    void Update(string symbol, double &orderPrice, double &orderSL, ENUM_POSITION_TYPE posType) {
        if(!m_useTrailing && !m_useBreakeven) return;
        
        double currentPrice = SymbolInfoDouble(symbol, SYMBOL_BID);
        double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
        double profitPoints = 0;
        
        if(posType == POSITION_TYPE_BUY) {
            profitPoints = (currentPrice - openPrice) / SymbolInfoDouble(symbol, SYMBOL_POINT);
        } else {
            profitPoints = (openPrice - currentPrice) / SymbolInfoDouble(symbol, SYMBOL_POINT);
        }
        
        if(m_usePartial && profitPoints >= m_partialLevel * 10) {
            TryPartialClose(symbol, posType, openPrice);
        }
        
        if(m_useBreakeven && profitPoints >= m_breakevenLevel * 10) {
            double newSL = openPrice + (SymbolInfoDouble(symbol, SYMBOL_POINT) * 10);
            if(posType == POSITION_TYPE_SELL) newSL = openPrice - (SymbolInfoDouble(symbol, SYMBOL_POINT) * 10);
            
            if(posType == POSITION_TYPE_BUY && newSL > orderSL) {
                orderSL = newSL;
                ModifyPosition(orderSL);
            }
            else if(posType == POSITION_TYPE_SELL && newSL < orderSL) {
                orderSL = newSL;
                ModifyPosition(orderSL);
            }
        }
        
        if(m_useTrailing && profitPoints >= m_trailingStart * 10) {
            double trailingSL = 0;
            if(posType == POSITION_TYPE_BUY) {
                trailingSL = currentPrice - (m_trailingDistance * SymbolInfoDouble(symbol, SYMBOL_POINT) * 10);
                if(trailingSL > orderSL) {
                    orderSL = trailingSL;
                    ModifyPosition(orderSL);
                }
            } else {
                trailingSL = currentPrice + (m_trailingDistance * SymbolInfoDouble(symbol, SYMBOL_POINT) * 10);
                if(trailingSL < orderSL) {
                    orderSL = trailingSL;
                    ModifyPosition(orderSL);
                }
            }
        }
    }
    
private:
    void ModifyPosition(double newSL) {
        if(!PositionSelect(_Symbol)) return;
        
        double volume = PositionGetDouble(POSITION_VOLUME);
        ENUM_POSITION_TYPE type = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
        
        if(type == POSITION_TYPE_BUY) {
            if(!Trade.PositionModify(_Symbol, 0, newSL)) {
                if(UseDebug) Print("Failed to modify buy position SL");
            }
        } else {
            if(!Trade.PositionModify(_Symbol, 0, newSL)) {
                if(UseDebug) Print("Failed to modify sell position SL");
            }
        }
    }
    
    void TryPartialClose(string symbol, ENUM_POSITION_TYPE posType, double openPrice) {
        if(!PositionSelect(symbol)) return;
        
        double volume = PositionGetDouble(POSITION_VOLUME);
        if(volume <= SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN) * 2) return;
        
        double closeVolume = volume * m_partialPercent / 100.0;
        closeVolume = MathFloor(closeVolume / SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP)) 
                      * SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
        
        if(!Trade.PositionClosePartial(symbol, closeVolume)) {
            if(UseDebug) Print("Failed to partial close position");
        }
    }
};

class CTradeValidator {
public:
    static bool ValidateTrade(string symbol, int maxSpread, double minVolatility, double maxVolatility) {
        if(!IsValidSpread(symbol, maxSpread)) return false;
        if(!IsValidVolatility(symbol, minVolatility, maxVolatility)) return false;
        if(!IsValidTradingHours()) return false;
        return true;
    }
    
    static bool IsValidSpread(string symbol, int maxSpread) {
        double spread = SymbolInfoInteger(symbol, SYMBOL_SPREAD);
        return spread <= maxSpread;
    }
    
    static bool IsValidVolatility(string symbol, double minATR, double maxATR) {
        double atr[];
        int hATR = iATR(symbol, PERIOD_CURRENT, 14);
        if(hATR == INVALID_HANDLE || CopyBuffer(hATR, 0, 0, 1, atr) <= 0) {
            IndicatorRelease(hATR);
            return true;
        }
        IndicatorRelease(hATR);
        
        double currentATR = atr[0] / SymbolInfoDouble(symbol, SYMBOL_POINT);
        return currentATR >= minATR && currentATR <= maxATR;
    }
    
    static bool IsValidTradingHours() {
        if(!UseTimeFilter) return true;
        
        MqlDateTime dt;
        TimeCurrent(dt);
        
        int currentHour = dt.hour;
        return currentHour >= StartHour && currentHour <= EndHour;
    }
    
    static bool IsNewsTime() {
        if(!UseNewsFilter) return true;
        MqlDateTime dt;
        TimeCurrent(dt);
        int hour = dt.hour;
        
        if(hour >= 12 && hour <= 13) return false;
        if(hour >= 8 && hour <= 9) return false;
        return true;
    }
};

#endif