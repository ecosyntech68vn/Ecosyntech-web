#property copyright "Smart Money EA Pro"
#property version "2.00"
#property description "Institutional Grade Trading System"
#property expertAdvisor "SMC_ProTrader"

#include <SMC_Config.mqh>
#include <SMC_Engine.mqh>
#include <SMC_Risk.mqh>

CMarketStructure SMC;
CSMC_RiskManager Risk;
CSMC_TradeManager Trade;

int OnInit() {
    Print("=== SMC ProTrader v2.00 initialized ===");
    Print("Symbol: ", _Symbol, " | Timeframe: H1");
    Print("Risk: ", RiskPercent, "% | Max Drawdown: ", MaxDrawdownPercent, "%");
    
    return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) {
    Print("=== SMC ProTrader terminated ===");
}

void OnTick() {
    static datetime lastUpdate = 0;
    if(TimeCurrent() - lastUpdate >= 3600) {
        SMC.Update();
        SMC.LogStatus();
        lastUpdate = TimeCurrent();
    } else {
        SMC.Update();
    }
    
    Risk.Update();
    
    if(UseDebug) {
        Print("Balance: ", DoubleToString(Risk.GetBalance(), 2),
              " | Equity: ", DoubleToString(Risk.GetEquity(), 2),
              " | Drawdown: ", DoubleToString(Risk.GetDrawdown(), 1), "%",
              " | Trades: ", Risk.GetTradesToday());
    }
    
    Trade.ManageTrades();
    
    if(!Risk.CanTrade()) {
        if(UseDebug) Print("Risk check failed - skipping");
        return;
    }
    
    if(!Trade.CanOpenPosition()) {
        if(UseDebug) Print("Position limit reached");
        return;
    }
    
    if(!CTradeFilters::PassAllFilters()) {
        return;
    }
    
    if(SMC.GetPhase() == PHASE_VOLATILE) {
        if(UseDebug) Print("Market too volatile - waiting");
        return;
    }
    
    ExecuteTrade();
}

void ExecuteTrade() {
    double entry = 0, sl = 0, tp = 0;
    double confidence = 0;
    ENUM_ORDER_TYPE orderType = ORDER_TYPE_BUY;
    bool hasPosition = Trade.HasPosition();
    
    if(SMC.GetTrendDirection() > 0) {
        if(SMC.FindBuyEntry(entry, sl, tp, confidence)) {
            if(!hasPosition || Trade.HasPosition(POSITION_TYPE_SELL)) {
                orderType = ORDER_TYPE_BUY;
            } else {
                return;
            }
        } else {
            return;
        }
    }
    else if(SMC.GetTrendDirection() < 0) {
        if(SMC.FindSellEntry(entry, sl, tp, confidence)) {
            if(!hasPosition || Trade.HasPosition(POSITION_TYPE_BUY)) {
                orderType = ORDER_TYPE_SELL;
            } else {
                return;
            }
        } else {
            return;
        }
    }
    else {
        if(SMC.GetPhase() == PHASE_RANGING) {
            if(SMC.FindBuyEntry(entry, sl, tp, confidence)) {
                if(!hasPosition || Trade.HasPosition(POSITION_TYPE_SELL)) {
                    orderType = ORDER_TYPE_BUY;
                } else {
                    return;
                }
            }
            else if(SMC.FindSellEntry(entry, sl, tp, confidence)) {
                if(!hasPosition || Trade.HasPosition(POSITION_TYPE_BUY)) {
                    orderType = ORDER_TYPE_SELL;
                } else {
                    return;
                }
            }
        }
    }
    
    if(confidence < 60) {
        if(UseDebug) Print("Low confidence: ", confidence);
        return;
    }
    
    double slDistance = MathAbs(entry - sl) / SymbolInfoDouble(_Symbol, SYMBOL_POINT);
    if(slDistance < 100) {
        if(UseDebug) Print("SL too tight: ", slDistance);
        return;
    }
    
    double lot = Risk.CalculateLot(slDistance);
    
    double price = (orderType == ORDER_TYPE_BUY) ? 
                   SymbolInfoDouble(_Symbol, SYMBOL_ASK) : 
                   SymbolInfoDouble(_Symbol, SYMBOL_BID);
    
    if(Trade.OpenPosition(_Symbol, orderType, lot, price, sl, tp, "SMC_Pro")) {
        Risk.RecordTrade(true);
        
        if(UseDebug) {
            string dir = orderType == ORDER_TYPE_BUY ? "BUY" : "SELL";
            Print("=== TRADE OPENED ===");
            Print("Direction: ", dir);
            Print("Entry: ", DoubleToString(price, 5));
            Print("SL: ", DoubleToString(sl, 5));
            Print("TP: ", DoubleToString(tp, 5));
            Print("Lot: ", DoubleToString(lot, 2));
            Print("Confidence: ", DoubleToString(confidence, 0), "%");
            Print("RR Ratio: ", DoubleToString((tp - entry) / (entry - sl), 2));
        }
    }
}

void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result) {
    if(trans.type == TRADE_TRANSACTION_DEAL_ADD) {
        if(trans.magic == MagicNumber) {
            if(trans.volume > 0) {
                if(trans.sl > 0 || trans.tp > 0) {
                    Risk.RecordTrade(true);
                }
            }
        }
    }
}

void OnTrade() {
    for(int i = PositionsTotal() - 1; i >= 0; i--) {
        if(PositionSelectByTicket(PositionGetTicket(i))) {
            if(PositionGetInteger(POSITION_MAGIC) == MagicNumber) {
                if(PositionGetString(POSITION_SYMBOL) == _Symbol) {
                    double profit = PositionGetDouble(POSITION_PROFIT);
                    if(profit != 0) {
                        Risk.RecordProfit(profit);
                        Risk.RecordTrade(profit > 0);
                        
                        if(UseDebug) {
                            Print("Position closed: P/L = ", DoubleToString(profit, 2));
                        }
                    }
                }
            }
        }
    }
}