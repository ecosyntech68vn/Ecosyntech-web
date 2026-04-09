#property copyright "Pro Trading System"
#property version "1.00"
#property description "Order Management Library"

#ifndef PRO_ORDER_MGMT_MQH
#define PRO_ORDER_MGMT_MQH

#include <Config.mqh>

class COrderManager {
private:
    int m_magicNumber;
    int m_maxTrades;
    int m_maxOpenTrades;
    int m_tradesToday;
    datetime m_lastTradeDate;
    
public:
    COrderManager() {
        m_magicNumber = MagicNumber;
        m_maxTrades = MaxTradesPerDay;
        m_maxOpenTrades = MaxOpenTrades;
        m_tradesToday = 0;
        m_lastTradeDate = 0;
    }
    
    void UpdateDailyCount() {
        datetime today = StringToTime(TimeToString(TimeCurrent(), TIME_DATE));
        if(m_lastTradeDate != today) {
            m_tradesToday = 0;
            m_lastTradeDate = today;
        }
    }
    
    bool CanOpenTrade() {
        UpdateDailyCount();
        
        if(m_tradesToday >= m_maxTrades) {
            if(UseDebug) Print("Max trades per day reached");
            return false;
        }
        
        if(GetOpenTradesCount() >= m_maxOpenTrades) {
            if(UseDebug) Print("Max open trades reached");
            return false;
        }
        
        return true;
    }
    
    int GetOpenTradesCount() {
        int count = 0;
        for(int i = 0; i < PositionsTotal(); i++) {
            if(PositionSelectByTicket(PositionGetTicket(i))) {
                if(PositionGetInteger(POSITION_MAGIC) == m_magicNumber) {
                    if(PositionGetString(POSITION_SYMBOL) == _Symbol) {
                        count++;
                    }
                }
            }
        }
        return count;
    }
    
    bool HasOpenPosition(ENUM_POSITION_TYPE type = POSITION_TYPE_INVALID) {
        for(int i = 0; i < PositionsTotal(); i++) {
            if(PositionSelectByTicket(PositionGetTicket(i))) {
                if(PositionGetInteger(POSITION_MAGIC) == m_magicNumber) {
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
    
    bool OpenTrade(string symbol, ENUM_ORDER_TYPE orderType, double lot, double sl, double tp, string comment = "") {
        MqlTradeRequest request = {};
        MqlTradeResult result = {};
        
        request.action = TRADE_ACTION_DEAL;
        request.symbol = symbol;
        request.volume = lot;
        request.type = orderType;
        request.deviation = Slippage;
        request.magic = m_magicNumber;
        request.comment = comment;
        
        double price = 0;
        if(orderType == ORDER_TYPE_BUY) {
            price = SymbolInfoDouble(symbol, SYMBOL_ASK);
            request.price = price;
            if(sl > 0) request.sl = sl;
            if(tp > 0) request.tp = tp;
        } else {
            price = SymbolInfoDouble(symbol, SYMBOL_BID);
            request.price = price;
            if(sl > 0) request.sl = sl;
            if(tp > 0) request.tp = tp;
        }
        
        if(!OrderSend(request, result)) {
            if(UseDebug) Print("OrderSend failed: ", result.retcode);
            return false;
        }
        
        if(result.retcode != TRADE_RETCODE_DONE && result.retcode != TRADE_RETCODE_PLACED) {
            if(UseDebug) Print("Trade failed with code: ", result.retcode);
            return false;
        }
        
        m_tradesToday++;
        
        if(UseDebug) {
            Print("Trade opened: ", orderType == ORDER_TYPE_BUY ? "BUY" : "SELL", 
                  " Volume: ", lot, " Price: ", price);
        }
        
        return true;
    }
    
    bool CloseAllTrades() {
        bool allClosed = true;
        
        for(int i = PositionsTotal() - 1; i >= 0; i--) {
            if(PositionSelectByTicket(PositionGetTicket(i))) {
                if(PositionGetInteger(POSITION_MAGIC) == m_magicNumber) {
                    if(PositionGetString(POSITION_SYMBOL) == _Symbol) {
                        if(!ClosePosition(PositionGetTicket(i))) {
                            allClosed = false;
                        }
                    }
                }
            }
        }
        
        return allClosed;
    }
    
    bool ClosePosition(ulong ticket) {
        if(!PositionSelectByTicket(ticket)) return false;
        
        MqlTradeRequest request = {};
        MqlTradeResult result = {};
        
        request.action = TRADE_ACTION_DEAL;
        request.position = ticket;
        request.symbol = PositionGetString(POSITION_SYMBOL);
        request.volume = PositionGetDouble(POSITION_VOLUME);
        request.type = PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY ? 
                       ORDER_TYPE_SELL : ORDER_TYPE_BUY;
        request.deviation = Slippage;
        request.magic = m_magicNumber;
        
        double price = PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY ? 
                      SymbolInfoDouble(request.symbol, SYMBOL_BID) : 
                      SymbolInfoDouble(request.symbol, SYMBOL_ASK);
        request.price = price;
        
        if(!OrderSend(request, result)) {
            if(UseDebug) Print("Close position failed");
            return false;
        }
        
        return result.retcode == TRADE_RETCODE_DONE || result.retcode == TRADE_RETCODE_PLACED;
    }
    
    bool ModifyPosition(ulong ticket, double newSL, double newTP = 0) {
        if(!PositionSelectByTicket(ticket)) return false;
        
        MqlTradeRequest request = {};
        MqlTradeResult result = {};
        
        request.action = TRADE_ACTION_SLTP;
        request.position = ticket;
        request.symbol = PositionGetString(POSITION_SYMBOL);
        request.sl = newSL;
        request.tp = newTP;
        
        if(!OrderSend(request, result)) {
            if(UseDebug) Print("Modify position failed");
            return false;
        }
        
        return result.retcode == TRADE_RETCODE_DONE || result.retcode == TRADE_RETCODE_PLACED;
    }
    
    double GetTotalProfit() {
        double profit = 0;
        for(int i = 0; i < PositionsTotal(); i++) {
            if(PositionSelectByTicket(PositionGetTicket(i))) {
                if(PositionGetInteger(POSITION_MAGIC) == m_magicNumber) {
                    if(PositionGetString(POSITION_SYMBOL) == _Symbol) {
                        profit += PositionGetDouble(POSITION_PROFIT);
                    }
                }
            }
        }
        return profit;
    }
    
    int GetTradesToday() { return m_tradesToday; }
};

class CTradeLogger {
private:
    string m_logFile;
    datetime m_sessionStart;
    
public:
    CTradeLogger() {
        m_sessionStart = TimeCurrent();
    }
    
    void Log(string message) {
        if(!UseDebug) return;
        
        string logMessage = TimeToString(TimeCurrent(), TIME_SECONDS) + " | " + message;
        Print(logMessage);
    }
    
    void LogTrade(string action, double price, double volume, double sl, double tp) {
        if(!UseDebug) return;
        
        string logMessage = StringFormat("TRADE: %s | Price: %.5f | Vol: %.2f | SL: %.5f | TP: %.5f",
            action, price, volume, sl, tp);
        Print(logMessage);
    }
    
    void LogSignal(string signal, double confidence, string reason) {
        if(!UseDebug) return;
        
        string logMessage = StringFormat("SIGNAL: %s (%.1f%%) - %s", signal, confidence, reason);
        Print(logMessage);
    }
};

#endif