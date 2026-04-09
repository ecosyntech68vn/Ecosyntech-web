#property copyright "Smart Money EA Pro"
#property version "2.00"
#property description "Advanced Risk Management for SMC EA"

#ifndef SMC_RISK_MQH
#define SMC_RISK_MQH

#include <SMC_Config.mqh>

class CSMC_RiskManager {
private:
    double m_initialBalance;
    double m_currentBalance;
    double m_equity;
    double m_dailyPL;
    datetime m_lastReset;
    int m_tradesToday;
    double m_consecutiveLoss;
    double m_maxConsecutiveLoss;
    
public:
    CSMC_RiskManager() {
        m_initialBalance = AccountInfoDouble(ACCOUNT_BALANCE);
        m_currentBalance = m_initialBalance;
        m_dailyPL = 0;
        m_lastReset = StringToTime(TimeToString(TimeCurrent(), TIME_DATE));
        m_tradesToday = 0;
        m_consecutiveLoss = 0;
        m_maxConsecutiveLoss = 0;
    }
    
    void Update() {
        m_currentBalance = AccountInfoDouble(ACCOUNT_BALANCE);
        m_equity = AccountInfoDouble(ACCOUNT_EQUITY);
        
        datetime today = StringToTime(TimeToString(TimeCurrent(), TIME_DATE));
        if(m_lastReset != today) {
            m_dailyPL = 0;
            m_tradesToday = 0;
            m_lastReset = today;
        }
    }
    
    double CalculateLot(double slDistance) {
        if(slDistance <= 0) return MinLot;
        
        double balance = m_equity > 0 ? m_equity : m_currentBalance;
        double riskAmount = balance * RiskPercent / 100.0;
        
        double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
        double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
        double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
        
        if(tickValue <= 0 || tickSize <= 0 || point <= 0) return MinLot;
        
        double lot = (riskAmount / slDistance) * (point / tickSize) * tickValue;
        
        double minLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
        double maxLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
        double lotStep = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
        
        lot = MathFloor(lot / lotStep) * lotStep;
        return MathMax(MinLot, MathMin(MaxLot, lot));
    }
    
    double CalculateATR_SL(string symbol) {
        double atr[];
        int hATR = iATR(symbol, PERIOD_H1, ATR_Period);
        if(hATR == INVALID_HANDLE || CopyBuffer(hATR, 0, 0, 1, atr) <= 0) {
            IndicatorRelease(hATR);
            return 0;
        }
        IndicatorRelease(hATR);
        return atr[0] * ATR_SL_Multiplier;
    }
    
    bool CanTrade() {
        if(m_tradesToday >= (int)(MaxRiskPerDay / RiskPercent)) {
            if(UseDebug) Print("Max daily trades reached");
            return false;
        }
        
        if(m_currentBalance < m_initialBalance * (1 - MaxDrawdownPercent / 100)) {
            if(UseDebug) Print("Max drawdown reached");
            return false;
        }
        
        double dailyLoss = (m_initialBalance - m_currentBalance);
        if(dailyLoss > m_initialBalance * 0.05) {
            if(UseDebug) Print("Daily loss limit reached");
            return false;
        }
        
        return true;
    }
    
    void RecordTrade(bool isWin) {
        m_tradesToday++;
        
        if(isWin) {
            m_consecutiveLoss = 0;
        } else {
            m_consecutiveLoss++;
            if(m_consecutiveLoss > m_maxConsecutiveLoss) {
                m_maxConsecutiveLoss = m_consecutiveLoss;
            }
            
            if(m_consecutiveLoss >= 3) {
                if(UseDebug) Print("Consecutive loss warning: ", m_consecutiveLoss);
            }
        }
    }
    
    void RecordProfit(double profit) {
        m_dailyPL += profit;
        if(profit > 0) {
            m_currentBalance += profit;
        }
    }
    
    double GetBalance() { return m_currentBalance; }
    double GetEquity() { return m_equity; }
    double GetDailyPL() { return m_dailyPL; }
    int GetTradesToday() { return m_tradesToday; }
    int GetConsecutiveLoss() { return (int)m_consecutiveLoss; }
    double GetDrawdown() { return (m_initialBalance - m_currentBalance) / m_initialBalance * 100; }
};

class CSMC_TradeManager {
private:
    int m_magic;
    int m_maxPositions;
    bool m_hedgingEnabled;
    
public:
    CSMC_TradeManager() {
        m_magic = MagicNumber;
        m_maxPositions = 3;
        m_hedgingEnabled = false;
    }
    
    bool CanOpenPosition() {
        int currentPositions = GetPositionCount();
        if(currentPositions >= m_maxPositions) {
            if(UseDebug) Print("Max positions reached: ", currentPositions);
            return false;
        }
        return true;
    }
    
    int GetPositionCount() {
        int count = 0;
        for(int i = 0; i < PositionsTotal(); i++) {
            if(PositionSelectByTicket(PositionGetTicket(i))) {
                if(PositionGetInteger(POSITION_MAGIC) == m_magic) {
                    if(PositionGetString(POSITION_SYMBOL) == _Symbol) {
                        count++;
                    }
                }
            }
        }
        return count;
    }
    
    bool HasPosition(ENUM_POSITION_TYPE type = POSITION_TYPE_INVALID) {
        for(int i = 0; i < PositionsTotal(); i++) {
            if(PositionSelectByTicket(PositionGetTicket(i))) {
                if(PositionGetInteger(POSITION_MAGIC) == m_magic) {
                    if(PositionGetString(POSITION_SYMBOL) == _Symbol) {
                        if(type == POSITION_TYPE_INVALID || 
                           PositionGetInteger(POSITION_TYPE) == type) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
    
    bool OpenPosition(string symbol, ENUM_ORDER_TYPE orderType, double lot, 
                      double price, double sl, double tp, string comment = "") {
        MqlTradeRequest request = {};
        MqlTradeResult result = {};
        
        request.action = TRADE_ACTION_DEAL;
        request.symbol = symbol;
        request.volume = lot;
        request.type = orderType;
        request.price = price;
        request.sl = sl;
        request.tp = tp;
        request.deviation = 3;
        request.magic = m_magic;
        request.comment = comment;
        request.type_filling = ORDER_FILLING_FOK;
        
        if(!OrderSend(request, result)) {
            if(UseDebug) Print("OrderSend failed: ", result.retcode);
            return false;
        }
        
        if(result.retcode != TRADE_RETCODE_DONE && result.retcode != TRADE_RETCODE_PLACED) {
            if(UseDebug) Print("Trade rejected: ", result.retcode);
            return false;
        }
        
        if(UseDebug) {
            string dir = orderType == ORDER_TYPE_BUY ? "BUY" : "SELL";
            Print("Opened ", dir, " Lot=", lot, " Price=", price, " SL=", sl, " TP=", tp);
        }
        
        return true;
    }
    
    void ManageTrades() {
        if(!UseTrailing && !UsePartialClose) return;
        
        for(int i = 0; i < PositionsTotal(); i++) {
            if(!PositionSelectByTicket(PositionGetTicket(i))) continue;
            if(PositionGetInteger(POSITION_MAGIC) != m_magic) continue;
            if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
            
            ENUM_POSITION_TYPE posType = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
            double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
            double currentSL = PositionGetDouble(POSITION_SL);
            double currentTP = PositionGetDouble(POSITION_TP);
            double profit = PositionGetDouble(POSITION_PROFIT);
            double volume = PositionGetDouble(POSITION_VOLUME);
            
            double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
            double profitPoints = (profit / (volume * SymbolInfoDouble(_Symbol, SYMBOL_CONTRACT_SIZE))) / point;
            
            if(UsePartialClose && profitPoints >= PartialLevel * 10) {
                double closeVolume = volume * PartialPercent / 100.0;
                closeVolume = MathFloor(closeVolume / SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP)) 
                              * SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
                
                if(closeVolume >= SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN)) {
                    ClosePartial(PositionGetTicket(i), closeVolume);
                }
            }
            
            if(UseTrailing && profitPoints >= TrailActivation * 10) {
                double trailDistance = TrailDistance * point * 10;
                
                double newSL = 0;
                if(posType == POSITION_TYPE_BUY) {
                    double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
                    newSL = bid - trailDistance;
                    
                    if(currentSL == 0 || newSL > currentSL) {
                        ModifySL(PositionGetTicket(i), newSL, currentTP);
                    }
                } else {
                    double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
                    newSL = ask + trailDistance;
                    
                    if(currentSL == 0 || newSL < currentSL) {
                        ModifySL(PositionGetTicket(i), newSL, currentTP);
                    }
                }
            }
        }
    }
    
private:
    bool ClosePartial(ulong ticket, double volume) {
        if(!PositionSelectByTicket(ticket)) return false;
        
        MqlTradeRequest request = {};
        MqlTradeResult result = {};
        
        request.action = TRADE_ACTION_DEAL;
        request.position = ticket;
        request.symbol = PositionGetString(POSITION_SYMBOL);
        request.volume = volume;
        request.type = PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY ? 
                       ORDER_TYPE_SELL : ORDER_TYPE_BUY;
        request.price = PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY ?
                       SymbolInfoDouble(_Symbol, SYMBOL_BID) : 
                       SymbolInfoDouble(_Symbol, SYMBOL_ASK);
        request.deviation = 3;
        request.magic = m_magic;
        
        if(OrderSend(request, result)) {
            if(UseDebug) Print("Partial close successful");
            return true;
        }
        return false;
    }
    
    bool ModifySL(ulong ticket, double newSL, double newTP) {
        MqlTradeRequest request = {};
        MqlTradeResult result = {};
        
        request.action = TRADE_ACTION_SLTP;
        request.position = ticket;
        request.sl = newSL;
        request.tp = newTP;
        
        if(OrderSend(request, result)) {
            return result.retcode == TRADE_RETCODE_DONE;
        }
        return false;
    }
};

class CTradeFilters {
public:
    static bool PassAllFilters() {
        if(!ValidateSpread()) return false;
        if(!ValidateTime()) return false;
        if(!ValidateATR()) return false;
        if(UseNewsFilter && !ValidateNews()) return false;
        return true;
    }
    
    static bool ValidateSpread() {
        int spread = (int)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
        return spread <= MaxSpread;
    }
    
    static bool ValidateTime() {
        if(!UseTimeFilter) return true;
        
        MqlDateTime dt;
        TimeCurrent(dt);
        
        if(dt.hour < StartHour || dt.hour >= EndHour) return false;
        
        return true;
    }
    
    static bool ValidateATR() {
        double atr[];
        int hATR = iATR(_Symbol, PERIOD_H1, ATR_Period);
        if(hATR == INVALID_HANDLE || CopyBuffer(hATR, 0, 0, 1, atr) <= 0) {
            IndicatorRelease(hATR);
            return true;
        }
        IndicatorRelease(hATR);
        
        double atrPoints = atr[0] / SymbolInfoDouble(_Symbol, SYMBOL_POINT);
        return atrPoints >= MinATR;
    }
    
    static bool ValidateNews() {
        if(!BlockHighImpact) return true;
        
        MqlDateTime dt;
        TimeCurrent(dt);
        
        int hour = dt.hour;
        int minute = dt.min;
        
        if((hour == 13 && minute >= 30) || (hour == 14)) return false;
        if(hour == 8 && minute >= 30) return false;
        if(hour == 12 && minute >= 45) return false;
        
        return true;
    }
};

#endif