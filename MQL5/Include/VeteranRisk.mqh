//+==================================================================+
//|     VETERAN RISK MANAGEMENT - 15 Years Experience               |
//|     Key: Preservation > Growth                                  |
//+==================================================================+

#ifndef VETERAN_RISK_MQH
#define VETERAN_RISK_MQH

#include <VeteranCore.mqh>

enum RISK_STATE {
    RISK_NORMAL,
    RISK_ELEVATED,
    RISK_CRITICAL,
    RISK_LOCKED
};

class CVeteranRisk {
private:
    double m_initialBalance;
    double m_currentBalance;
    double m_peakBalance;
    double m_floatingPL;
    
    RISK_STATE m_riskState;
    int m_consecutiveWins;
    int m_consecutiveLosses;
    int m_totalWins;
    int m_totalLosses;
    
    double m_maxDrawdownPercent;
    double m_currentDrawdown;
    double m_maxRealizedDD;
    
    double m_dailyProfitTarget;
    double m_dailyLossLimit;
    double m_monthlyTarget;
    
    double m_recoveryFactor;
    bool m_recoveryMode;
    
public:
    CVeteranRisk() {
        m_initialBalance = AccountInfoDouble(ACCOUNT_BALANCE);
        m_currentBalance = m_initialBalance;
        m_peakBalance = m_initialBalance;
        m_floatingPL = 0;
        m_riskState = RISK_NORMAL;
        
        m_consecutiveWins = 0;
        m_consecutiveLosses = 0;
        m_totalWins = 0;
        m_totalLosses = 0;
        
        m_maxDrawdownPercent = 20.0;
        m_currentDrawdown = 0;
        m_maxRealizedDD = 0;
        
        m_dailyProfitTarget = m_initialBalance * 0.03;
        m_dailyLossLimit = m_initialBalance * 0.02;
        m_monthlyTarget = m_initialBalance * 0.10;
        
        m_recoveryFactor = 1.0;
        m_recoveryMode = false;
    }
    
    void Update() {
        m_currentBalance = AccountInfoDouble(ACCOUNT_BALANCE);
        m_peakBalance = MathMax(m_peakBalance, m_currentBalance);
        
        m_floatingPL = AccountInfoDouble(ACCOUNT_EQUITY) - m_currentBalance;
        
        m_currentDrawdown = (m_peakBalance - m_currentBalance) / m_peakBalance * 100;
        
        UpdateRiskState();
    }
    
    double GetAdjustedRisk(double baseRisk) {
        if(m_riskState == RISK_LOCKED) return 0;
        
        double risk = baseRisk;
        
        if(m_riskState == RISK_CRITICAL) {
            risk *= 0.25;
        }
        else if(m_riskState == RISK_ELEVATED) {
            risk *= 0.5;
        }
        
        if(m_recoveryMode) {
            risk *= m_recoveryFactor;
        }
        
        return risk;
    }
    
    double CalculateLot(string symbol, double riskPercent, double slPoints) {
        double equity = AccountInfoDouble(ACCOUNT_EQUITY);
        if(equity <= 0) return 0.01;
        
        double riskAmount = equity * riskPercent / 100.0;
        
        double tickValue = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
        double tickSize = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);
        double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
        
        if(tickValue <= 0 || tickSize <= 0 || point <= 0 || slPoints <= 0) {
            return SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
        }
        
        double lot = (riskAmount / slPoints) * (point / tickSize) * tickValue;
        
        double minLot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
        double maxLot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
        double lotStep = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
        
        lot = MathFloor(lot / lotStep) * lotStep;
        
        double maxLotByEquity = equity * 0.1 / (symbol == "XAUUSD" ? 1000 : 100000);
        lot = MathMin(lot, maxLotByEquity);
        
        return MathMax(minLot, MathMin(maxLot, lot));
    }
    
    bool IsTradeAllowed() {
        if(m_riskState == RISK_LOCKED) {
            Print("RISK LOCKED: System halted");
            return false;
        }
        
        if(m_currentDrawdown > m_maxDrawdownPercent) {
            Print("MAX DRAWDOWN EXCEEDED: ", m_currentDrawdown);
            m_riskState = RISK_LOCKED;
            return false;
        }
        
        double todayLoss = m_currentBalance - GetDayStartBalance();
        if(todayLoss > m_dailyLossLimit) {
            Print("DAILY LOSS LIMIT: Stopping today");
            m_riskState = RISK_CRITICAL;
            return false;
        }
        
        return true;
    }
    
    bool IsProfitTargetReached() {
        double todayProfit = m_currentBalance - GetDayStartBalance();
        if(todayProfit >= m_dailyProfitTarget) {
            Print("Daily profit target reached");
            return true;
        }
        return false;
    }
    
    void RecordTradeResult(double profit, bool isWin) {
        if(isWin) {
            m_consecutiveWins++;
            m_consecutiveLosses = 0;
            m_totalWins++;
            
            if(m_consecutiveWins >= 3 && m_recoveryMode) {
                m_recoveryMode = false;
                m_recoveryFactor = 1.0;
                Print("Recovery mode OFF after 3 wins");
            }
        }
        else {
            m_consecutiveLosses++;
            m_consecutiveWins = 0;
            m_totalLosses++;
            
            if(m_consecutiveLosses >= 3) {
                m_recoveryMode = true;
                m_recoveryFactor = 0.5;
                Print("Recovery mode ON - reducing risk");
            }
            
            if(m_consecutiveLosses >= 5) {
                m_riskState = RISK_CRITICAL;
                Print("CRITICAL: 5 consecutive losses");
            }
        }
    }
    
    double GetWinRate() {
        int total = m_totalWins + m_totalLosses;
        if(total == 0) return 50;
        return (double)m_totalWins / total * 100;
    }
    
    double GetAverageWin() {
        if(m_totalWins == 0) return 0;
        return (m_currentBalance - m_initialBalance + m_totalLosses * m_dailyLossLimit) / m_totalWins;
    }
    
    double GetExpectancy() {
        double winRate = GetWinRate() / 100;
        double avgWin = GetAverageWin();
        double avgLoss = m_dailyLossLimit;
        
        return (winRate * avgWin) - ((1 - winRate) * avgLoss);
    }
    
    string GetStatusReport() {
        string report = "=== RISK STATUS ===\n";
        report += "State: " + EnumToString(m_riskState) + "\n";
        report += "Drawdown: " + DoubleToString(m_currentDrawdown, 2) + "%\n";
        report += "Consecutive: W" + m_consecutiveWins + " L" + m_consecutiveLosses + "\n";
        report += "WinRate: " + DoubleToString(GetWinRate(), 1) + "%\n";
        report += "Recovery: " + (m_recoveryMode ? "ON" : "OFF") + "\n";
        report += "===============";
        return report;
    }
    
private:
    double GetDayStartBalance() {
        datetime todayStart = StringToTime(TimeToString(TimeCurrent(), TIME_DATE));
        return m_currentBalance;
    }
    
    void UpdateRiskState() {
        if(m_currentDrawdown > m_maxDrawdownPercent * 0.8) {
            m_riskState = RISK_LOCKED;
        }
        else if(m_currentDrawdown > m_maxDrawdownPercent * 0.5) {
            m_riskState = RISK_CRITICAL;
        }
        else if(m_consecutiveLosses >= 3 || m_currentDrawdown > m_maxDrawdownPercent * 0.3) {
            m_riskState = RISK_ELEVATED;
        }
        else {
            m_riskState = RISK_NORMAL;
        }
    }
};

class CVeteranTradeManager {
private:
    int m_magic;
    int m_maxPositions;
    datetime m_lastTradeTime;
    int m_tradesToday;
    datetime m_lastResetDate;
    
public:
    CVeteranTradeManager() {
        m_magic = 2024150;
        m_maxPositions = 2;
        m_lastTradeTime = 0;
        m_tradesToday = 0;
        m_lastResetDate = StringToTime(TimeToString(TimeCurrent(), TIME_DATE));
    }
    
    bool CanOpenPosition() {
        ResetDailyCount();
        
        if(m_tradesToday >= m_maxPositions) {
            Print("Max daily positions reached");
            return false;
        }
        
        if(HasOpenPosition()) {
            Print("Already have open position");
            return false;
        }
        
        if(TimeCurrent() - m_lastTradeTime < 1800) {
            Print("Waiting between trades");
            return false;
        }
        
        return true;
    }
    
    bool OpenTrade(string symbol, ENUM_ORDER_TYPE type, double lot, 
                   double price, double sl, double tp, string comment) {
        MqlTradeRequest request = {};
        MqlTradeResult result = {};
        
        request.action = TRADE_ACTION_DEAL;
        request.symbol = symbol;
        request.volume = lot;
        request.type = type;
        request.price = price;
        request.sl = sl;
        request.tp = tp;
        request.deviation = 3;
        request.magic = m_magic;
        request.comment = comment;
        request.type_filling = ORDER_FILLING_FOK;
        
        if(!OrderSend(request, result)) {
            Print("Order failed: ", result.retcode);
            return false;
        }
        
        m_lastTradeTime = TimeCurrent();
        m_tradesToday++;
        
        Print("Opened: ", type == ORDER_TYPE_BUY ? "BUY" : "SELL", 
              " Lot:", lot, " Price:", price);
        
        return true;
    }
    
    void ManageOpenPositions() {
        for(int i = PositionsTotal() - 1; i >= 0; i--) {
            if(!PositionSelectByTicket(PositionGetTicket(i))) continue;
            if(PositionGetInteger(POSITION_MAGIC) != m_magic) continue;
            if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
            
            double profit = PositionGetDouble(POSITION_PROFIT);
            double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
            double currentSL = PositionGetDouble(POSITION_SL);
            ENUM_POSITION_TYPE posType = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
            double volume = PositionGetDouble(POSITION_VOLUME);
            ulong ticket = PositionGetTicket(i);
            
            double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
            double profitPips = profit / (volume * SymbolInfoDouble(_Symbol, SYMBOL_CONTRACT_SIZE)) * point;
            
            // Breakeven at +1.5R
            if(profitPips >= point * 150 && currentSL == 0) {
                double bePrice = openPrice + (posType == POSITION_TYPE_BUY ? point * 10 : -point * 10);
                ModifyPosition(ticket, bePrice, PositionGetDouble(POSITION_TP));
            }
            
            // Trailing at +2R
            if(profitPips >= point * 200) {
                double trailDistance = point * 150;
                double newSL = 0;
                
                if(posType == POSITION_TYPE_BUY) {
                    double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
                    newSL = bid - trailDistance;
                    if(newSL > currentSL) ModifyPosition(ticket, newSL, PositionGetDouble(POSITION_TP));
                }
                else {
                    double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
                    newSL = ask + trailDistance;
                    if(newSL < currentSL || currentSL == 0) ModifyPosition(ticket, newSL, PositionGetDouble(POSITION_TP));
                }
            }
            
            // Partial close at +3R
            if(profitPips >= point * 300) {
                double closeVol = volume * 0.5;
                ClosePartial(ticket, closeVol);
            }
        }
    }
    
    double GetTotalProfit() {
        double total = 0;
        for(int i = 0; i < PositionsTotal(); i++) {
            if(PositionSelectByTicket(PositionGetTicket(i))) {
                if(PositionGetInteger(POSITION_MAGIC) == m_magic) {
                    total += PositionGetDouble(POSITION_PROFIT);
                }
            }
        }
        return total;
    }
    
private:
    void ResetDailyCount() {
        datetime today = StringToTime(TimeToString(TimeCurrent(), TIME_DATE));
        if(m_lastResetDate != today) {
            m_tradesToday = 0;
            m_lastResetDate = today;
        }
    }
    
    bool HasOpenPosition() {
        for(int i = 0; i < PositionsTotal(); i++) {
            if(PositionSelectByTicket(PositionGetTicket(i))) {
                if(PositionGetInteger(POSITION_MAGIC) == m_magic) {
                    if(PositionGetString(POSITION_SYMBOL) == _Symbol) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    bool ModifyPosition(ulong ticket, double newSL, double newTP) {
        MqlTradeRequest request = {};
        MqlTradeResult result = {};
        
        request.action = TRADE_ACTION_SLTP;
        request.position = ticket;
        request.sl = newSL;
        request.tp = newTP;
        
        return OrderSend(request, result) && (result.retcode == TRADE_RETCODE_DONE);
    }
    
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
        
        return OrderSend(request, result);
    }
};

class CVeteranFilters {
public:
    static bool PassAllFilters() {
        if(!CheckSpread()) return false;
        if(!CheckTime()) return false;
        if(!CheckVolatility()) return false;
        if(!CheckNews()) return false;
        return true;
    }
    
    static bool CheckSpread() {
        int spread = (int)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
        return spread <= 25;
    }
    
    static bool CheckTime() {
        MqlDateTime dt;
        TimeCurrent(dt);
        
        // Avoid Asia chop
        if(dt.hour >= 0 && dt.hour < 7) return false;
        
        // Avoid dead market
        if(dt.hour >= 21 && dt.hour < 23) return false;
        
        // Avoid Friday close
        if(dt.day_of_week == 5 && dt.hour >= 17) return false;
        
        return true;
    }
    
    static bool CheckVolatility() {
        double atr[];
        int hATR = iATR(_Symbol, PERIOD_H1, 14);
        if(hATR == INVALID_HANDLE) return true;
        
        CopyBuffer(hATR, 0, 0, 1, atr);
        IndicatorRelease(hATR);
        
        double atrPoints = atr[0] / SymbolInfoDouble(_Symbol, SYMBOL_POINT);
        
        return atrPoints >= 80 && atrPoints <= 400;
    }
    
    static bool CheckNews() {
        MqlDateTime dt;
        TimeCurrent(dt);
        
        int hour = dt.hour;
        
        // Major news windows - avoid 30 min before/after
        if(hour == 13 || (hour == 12 && dt.min >= 30)) return false;
        if(hour == 8 && dt.min >= 30) return false;
        
        return true;
    }
};

#endif