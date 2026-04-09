#property copyright "Personal Trading Assistant"
#property version "1.00"
#property description "Complete Trading Assistant with Daily Routine"

#include <TradingMethod.mqh>

CTradingPlan Planner;
CConfluenceChecker Confluence;
CPositionSizer PositionSizer;
CTradeJournal Journal;

string g_symbol = "";
double g_balance = 0;
double g_riskPercent = 2.0;
datetime g_lastPlanTime = 0;

int OnInit() {
    g_symbol = _Symbol;
    g_balance = AccountInfoDouble(ACCOUNT_BALANCE);
    
    Print("=== Personal Trading Assistant v1.0 ===");
    Print("Starting daily routine for: ", g_symbol);
    Print("Account Balance: ", DoubleToString(g_balance, 2));
    
    CreateDailyPlan();
    
    return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) {
    Journal.ExportToFile("Trading_Journal_" + TimeToString(TimeCurrent(), TIME_DATE) + ".txt");
    Print("Journal exported");
}

void OnTick() {
    if(TimeCurrent() - g_lastPlanTime >= 14400) {
        CreateDailyPlan();
        g_lastPlanTime = TimeCurrent();
    }
    
    CheckForTradeOpportunity();
    ManageOpenPositions();
}

void CreateDailyPlan() {
    Journal.AddEntry("=== Creating Daily Plan ===");
    
    TradingPlan plan = Planner.CreateDailyPlan(g_symbol);
    
    string sessionName = "ASIA";
    if(plan.session == SESSION_LONDON) sessionName = "LONDON";
    else if(plan.session == SESSION_OVERLAP) sessionName = "OVERLAP";
    else if(plan.session == SESSION_NEWYORK) sessionName = "NEWYORK";
    
    string phaseName = plan.phase == PHASE_TRENDING ? "TRENDING" : "RANGING";
    string trendName = plan.trendDirection > 0 ? "UP" : (plan.trendDirection < 0 ? "DOWN" : "FLAT");
    
    Journal.AddEntry("Session: " + sessionName);
    Journal.AddEntry("Phase: " + phaseName);
    Journal.AddEntry("Trend: " + trendName + " (Strength: " + DoubleToString(plan.trendStrength, 1) + ")");
    Journal.AddEntry("Volatility: " + DoubleToString(plan.volatility, 0) + " points");
    Journal.AddEntry("Support: " + DoubleToString(plan.support, 5));
    Journal.AddEntry("Resistance: " + DoubleToString(plan.resistance, 5));
    
    Print("Daily Plan Created: ", sessionName, " | ", phaseName, " | ", trendName);
}

void CheckForTradeOpportunity() {
    if(HasOpenPosition()) return;
    
    double current = SymbolInfoDouble(g_symbol, SYMBOL_BID);
    
    TradingPlan plan = Planner.CreateDailyPlan(g_symbol);
    
    CONFLUENCE_LEVEL confluence = Confluence.Check(g_symbol);
    
    int trendDirection = 0;
    double ema8[], ema21[];
    int hEMA8 = iMA(g_symbol, PERIOD_H1, 8, 0, MODE_EMA, PRICE_CLOSE);
    int hEMA21 = iMA(g_symbol, PERIOD_H1, 21, 0, MODE_EMA, PRICE_CLOSE);
    
    if(hEMA8 != INVALID_HANDLE && hEMA21 != INVALID_HANDLE) {
        CopyBuffer(hEMA8, 0, 0, 2, ema8);
        CopyBuffer(hEMA21, 0, 0, 2, ema21);
        
        if(ema8[0] > ema21[0]) trendDirection = 1;
        else if(ema8[0] < ema21[0]) trendDirection = -1;
        
        IndicatorRelease(hEMA8);
        IndicatorRelease(hEMA21);
    }
    
    bool buySignal = false;
    bool sellSignal = false;
    string reason = "";
    
    if(trendDirection > 0) {
        double support = plan.support;
        if(current <= support + (SymbolInfoDouble(g_symbol, SYMBOL_POINT) * 50)) {
            buySignal = true;
            reason = "Trend Pullback to Support";
        }
    }
    else if(trendDirection < 0) {
        double resistance = plan.resistance;
        if(current >= resistance - (SymbolInfoDouble(g_symbol, SYMBOL_POINT) * 50)) {
            sellSignal = true;
            reason = "Trend Pullback to Resistance";
        }
    }
    
    if(confluence == CONFLUENCE_STRONG) {
        if(buySignal || sellSignal) {
            ExecuteTrade(buySignal, reason);
        }
    }
    else if(confluence == CONFLUENCE_MODERATE) {
        if((buySignal || sellSignal) && plan.trendStrength > 25) {
            ExecuteTrade(buySignal, reason);
        }
    }
}

void ExecuteTrade(bool isBuy, string reason) {
    double point = SymbolInfoDouble(g_symbol, SYMBOL_POINT);
    double current = isBuy ? SymbolInfoDouble(g_symbol, SYMBOL_ASK) : SymbolInfoDouble(g_symbol, SYMBOL_BID);
    
    double slDistance = 100 * point;
    double tpDistance = slDistance * 2.0;
    
    double sl = isBuy ? (current - slDistance) : (current + slDistance);
    double tp = isBuy ? (current + tpDistance) : (current - tpDistance);
    
    double lot = PositionSizer.CalculateLot(g_symbol, g_balance, g_riskPercent, slDistance / point);
    
    ENUM_ORDER_TYPE orderType = isBuy ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
    
    MqlTradeRequest request = {};
    MqlTradeResult result = {};
    
    request.action = TRADE_ACTION_DEAL;
    request.symbol = g_symbol;
    request.volume = lot;
    request.type = orderType;
    request.price = current;
    request.sl = sl;
    request.tp = tp;
    request.deviation = 3;
    request.comment = reason;
    request.type_filling = ORDER_FILLING_FOK;
    
    if(OrderSend(request, result)) {
        Journal.AddEntry("TRADE EXECUTED: " + (isBuy ? "BUY" : "SELL") + " | " + reason);
        Journal.AddEntry("Entry: " + DoubleToString(current, 5) + " | SL: " + DoubleToString(sl, 5) + " | TP: " + DoubleToString(tp, 5));
        Journal.AddEntry("Lot: " + DoubleToString(lot, 2) + " | RR: 1:2");
        
        Print("Trade executed: ", isBuy ? "BUY" : "SELL", " ", reason);
    }
}

bool HasOpenPosition() {
    for(int i = 0; i < PositionsTotal(); i++) {
        if(PositionSelectByTicket(PositionGetTicket(i))) {
            if(PositionGetString(POSITION_SYMBOL) == g_symbol) {
                return true;
            }
        }
    }
    return false;
}

void ManageOpenPositions() {
    for(int i = 0; i < PositionsTotal(); i++) {
        if(!PositionSelectByTicket(PositionGetTicket(i))) continue;
        if(PositionGetString(POSITION_SYMBOL) != g_symbol) continue;
        
        double profit = PositionGetDouble(POSITION_PROFIT);
        double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
        double currentSL = PositionGetDouble(POSITION_SL);
        ENUM_POSITION_TYPE posType = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
        
        double point = SymbolInfoDouble(g_symbol, SYMBOL_POINT);
        double profitPoints = profit / (PositionGetDouble(POSITION_VOLUME) * SymbolInfoDouble(g_symbol, SYMBOL_CONTRACT_SIZE)) * point;
        
        if(profitPoints >= 2.0 * 10 * point) {
            double newSL = openPrice + (posType == POSITION_TYPE_BUY ? point * 15 : -point * 15);
            
            if((posType == POSITION_TYPE_BUY && newSL > currentSL) ||
               (posType == POSITION_TYPE_SELL && newSL < currentSL)) {
                MqlTradeRequest request = {};
                MqlTradeResult result = {};
                
                request.action = TRADE_ACTION_SLTP;
                request.position = PositionGetTicket(i);
                request.sl = newSL;
                
                OrderSend(request, result);
            }
        }
        
        if(profitPoints >= 3.0 * 10 * point) {
            double closeVolume = PositionGetDouble(POSITION_VOLUME) * 0.5;
            
            MqlTradeRequest request = {};
            MqlTradeResult result = {};
            
            request.action = TRADE_ACTION_DEAL;
            request.position = PositionGetTicket(i);
            request.symbol = g_symbol;
            request.volume = closeVolume;
            request.type = posType == POSITION_TYPE_BUY ? ORDER_TYPE_SELL : ORDER_TYPE_BUY;
            request.price = posType == POSITION_TYPE_BUY ? 
                           SymbolInfoDouble(g_symbol, SYMBOL_BID) : 
                           SymbolInfoDouble(g_symbol, SYMBOL_ASK);
            request.deviation = 3;
            
            OrderSend(request, result);
            
            Journal.AddEntry("Partial close at +3R");
        }
    }
}