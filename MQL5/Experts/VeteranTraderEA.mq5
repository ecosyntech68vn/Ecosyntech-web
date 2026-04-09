//+==================================================================+
//|     VETERAN TRADER EA v3.0                                        |
//|     Philosophy: 15 Years of Trading Wisdom                        |
//|     Key: Simple, Robust, Patient, Adaptable                      |
//|                                                                  |
//|     Author: Professional Trader (15 Years)                        |
//|     Build: 2024 | For: Gold/Forex (Multi-Symbol)                  |
//|     Supports: GBPUSD, GBPUSDc, XAUUSD, EURUSD, etc.              |
//+==================================================================+

#property copyright "Veteran Trader"
#property version "3.00"
#property description "15-Year Experience Trading System - Multi-Symbol"
#property expertAdvisor "VeteranTraderEA"

// Input Parameters for Multi-Symbol Support
input_group("=== SYMBOL SETTINGS ===");
input string TradingSymbol = "GBPUSD";  // Symbol to trade (e.g., GBPUSD, GBPUSDc, XAUUSD)
input bool AutoDetectSymbol = true;      // Auto-detect from chart

input_group("=== TIMEFRAME ===");
input ENUM_TIMEFRAMES MainTimeframe = PERIOD_H1;  // Entry timeframe
input ENUM_TIMEFRAMES TrendTimeframe = PERIOD_D1;  // Trend timeframe

input_group("=== RISK MANAGEMENT ===");
input double RiskPercent = 2.0;         // Risk per trade (%)
input double MaxDailyRisk = 6.0;        // Max daily risk (%)
input double MaxDrawdown = 20.0;        // Max drawdown (%)
input int MaxTradesPerDay = 3;          // Max trades per day
input int MaxConcurrent = 2;           // Max concurrent positions

input_group("=== TRADE SETTINGS ===");
input int MinSLDistance = 50;           // Minimum SL distance (points)
input double MinRiskReward = 2.0;       // Minimum risk:reward ratio
input bool UseATRforSL = true;          // Use ATR for SL calculation
input double ATR_SL_Multiplier = 1.5;   // ATR multiplier for SL

input_group("=== FILTERS ===");
input int MaxSpread = 25;               // Max spread (points)
input int MinATR = 80;                  // Min ATR (points)
input int MaxATR = 400;                 // Max ATR (points)
input bool UseTimeFilter = true;        // Use trading hours filter
input int StartHour = 7;                // Start trading hour
input int EndHour = 22;                 // End trading hour

input_group("=== TRAILING & EXIT ===");
input bool UseTrailing = true;          // Use trailing stop
input double TrailStart = 2.0;          // Start trailing at this R
input double TrailDistance = 1.5;       // Trail distance in R
input bool UsePartialClose = true;      // Use partial close
input double PartialLevel = 3.0;        // Partial close level (R)
input double PartialPercent = 50.0;     // Percentage to close

input_group("=== OTHER ===");
input int MagicNumber = 2024150;        // Magic number
input bool UseDebug = false;            // Debug output

#include <VeteranCore.mqh>
#include <VeteranRisk.mqh>

VetConfig Config;
CVeteranCore Core;
CVeteranRisk Risk;
CVeteranTradeManager Trade;

string g_symbol;
bool g_initialized = false;

int OnInit() {
    Print("=========================================");
    Print(" VETERAN TRADER SYSTEM v3.0");
    Print(" 15 Years of Trading Experience");
    Print(" Multi-Symbol Support Enabled");
    Print("=========================================");
    
    // Determine symbol to trade
    if(AutoDetectSymbol) {
        g_symbol = _Symbol;
        Print("Using chart symbol: ", g_symbol);
    } else {
        g_symbol = TradingSymbol;
        Print("Using specified symbol: ", g_symbol);
    }
    
    // Validate symbol
    if(!ValidateSymbol(g_symbol)) {
        Print("WARNING: Symbol ", g_symbol, " not found, using default");
        g_symbol = _Symbol;
    }
    
    // Initialize config
    Config.symbol = g_symbol;
    Config.mainTF = MainTimeframe;
    Config.trendTF = TrendTimeframe;
    Config.baseRisk = RiskPercent;
    Config.maxDailyRisk = MaxDailyRisk;
    Config.maxDrawdown = MaxDrawdown;
    Config.maxTradesPerDay = MaxTradesPerDay;
    Config.maxConcurrent = MaxConcurrent;
    Config.useSuffix = StringFind(g_symbol, "c") > 0;
    
    // Initialize core system
    Core.Initialize(Config);
    
    // Print system info
    Print("System Configuration:");
    Print("  Symbol: ", g_symbol);
    Print("  Main TF: ", EnumToString(MainTimeframe));
    Print("  Trend TF: ", EnumToString(TrendTimeframe));
    Print("  Risk: ", RiskPercent, "%");
    Print("  Max DD: ", MaxDrawdown, "%");
    Print("  Magic: ", MagicNumber);
    
    // Check if symbol is tradeable
    if(SymbolInfoInteger(g_symbol, SYMBOL_TRADE_MODE) != SYMBOL_TRADE_MODE_FULL) {
        Print("WARNING: Symbol may not be fully tradeable");
    }
    
    g_initialized = true;
    
    return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) {
    Print("=== System Halted ===");
    string report = Risk.GetStatusReport();
    Print(report);
}

void OnTick() {
    // Skip if not initialized
    if(!g_initialized) return;
    
    // Skip if symbol not available
    if(!SymbolInfoInteger(g_symbol, SYMBOL_SELECT)) return;
    
    // Update market context
    Core.UpdateMarket(g_symbol);
    Risk.Update();
    
    // Daily reset
    Core.ResetDailyStats();
    
    // Manage open positions
    Trade.ManageOpenPositions();
    
    // Check system status
    if(!Core.CanTrade()) {
        if(UseDebug) {
            string status;
            Core.GetSystemStatus(status);
            Print("Cannot Trade: ", status);
        }
        return;
    }
    
    if(!Risk.IsTradeAllowed()) {
        if(UseDebug) Print("Risk check failed");
        return;
    }
    
    if(Risk.IsProfitTargetReached()) {
        if(UseDebug) Print("Daily target reached - no new trades");
        return;
    }
    
    // Check filters
    if(!CheckFilters()) {
        return;
    }
    
    // Analyze for setup
    TradeSetup setup = Core.Analyze(g_symbol);
    
    if(setup.quality >= QUALITY_HIGH) {
        ExecuteTrade(setup);
    }
}

bool CheckFilters() {
    // Spread check
    int spread = (int)SymbolInfoInteger(g_symbol, SYMBOL_SPREAD);
    if(spread > MaxSpread) {
        if(UseDebug) Print("Spread too high: ", spread);
        return false;
    }
    
    // ATR check
    double atr[];
    int hATR = iATR(g_symbol, MainTimeframe, 14);
    if(hATR != INVALID_HANDLE) {
        CopyBuffer(hATR, 0, 0, 1, atr);
        IndicatorRelease(hATR);
        
        double atrPoints = atr[0] / SymbolInfoDouble(g_symbol, SYMBOL_POINT);
        
        if(atrPoints < MinATR) {
            if(UseDebug) Print("ATR too low: ", atrPoints);
            return false;
        }
        if(atrPoints > MaxATR) {
            if(UseDebug) Print("ATR too high: ", atrPoints);
            return false;
        }
    }
    
    // Time filter
    if(UseTimeFilter) {
        MqlDateTime dt;
        TimeCurrent(dt);
        
        if(dt.hour < StartHour || dt.hour >= EndHour) {
            if(UseDebug) Print("Outside trading hours");
            return false;
        }
        
        // Avoid weekends
        if(dt.day_of_week == 0 || dt.day_of_week == 6) {
            return false;
        }
        
        // Avoid Friday close
        if(dt.day_of_week == 5 && dt.hour >= 17) {
            return false;
        }
    }
    
    return true;
}

void ExecuteTrade(TradeSetup &setup) {
    if(!Trade.CanOpenPosition()) {
        if(UseDebug) Print("Cannot open position");
        return;
    }
    
    double point = SymbolInfoDouble(g_symbol, SYMBOL_POINT);
    double slDistance = MathAbs(setup.entry - setup.sl) / point;
    
    if(slDistance < MinSLDistance) {
        if(UseDebug) Print("SL too tight: ", slDistance);
        return;
    }
    
    double riskPercent = Risk.GetAdjustedRisk(Config.baseRisk);
    double lot = Risk.CalculateLot(g_symbol, riskPercent, slDistance);
    
    if(lot <= 0) {
        Print("Invalid lot size");
        return;
    }
    
    double sl = setup.sl;
    double tp = setup.tp;
    
    bool success = Trade.OpenTrade(
        g_symbol,
        setup.type,
        lot,
        setup.entry,
        sl,
        tp,
        setup.reason
    );
    
    if(success) {
        Print("=== TRADE EXECUTED ===");
        Print("Symbol: ", g_symbol);
        Print("Type: ", setup.type == ORDER_TYPE_BUY ? "BUY" : "SELL");
        Print("Quality: ", EnumToString(setup.quality));
        Print("Entry: ", DoubleToString(setup.entry, 5));
        Print("SL: ", DoubleToString(sl, 5));
        Print("TP: ", DoubleToString(tp, 5));
        Print("Lot: ", DoubleToString(lot, 2));
        Print("RR: 1:", DoubleToString(setup.riskReward, 1));
        Print("Reason: ", setup.reason);
    }
}

bool ValidateSymbol(string symbol) {
    // Check if symbol exists and is selectable
    if(!SymbolSelect(symbol, true)) {
        return false;
    }
    
    // Check if symbol has valid price data
    double bid = SymbolInfoDouble(symbol, SYMBOL_BID);
    double ask = SymbolInfoDouble(symbol, SYMBOL_ASK);
    
    if(bid <= 0 || ask <= 0) {
        return false;
    }
    
    // Check if symbol is tradeable
    if(SymbolInfoInteger(symbol, SYMBOL_TRADE_MODE) == SYMBOL_TRADE_MODE_DISABLED) {
        return false;
    }
    
    return true;
}

void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest &request,
                        const MqlTradeResult &result) {
    if(trans.type == TRADE_TRANSACTION_DEAL_ADD) {
        if(trans.volume > 0 && trans.symbol == g_symbol) {
            Print("Position opened: ", trans.volume);
        }
    }
    
    if(trans.type == TRADE_TRANSACTION_DEAL_REMOVE) {
        if(trans.symbol == g_symbol) {
            double profit = trans.profit;
            bool isWin = profit > 0;
            
            Risk.RecordTradeResult(profit, isWin);
            Core.OnTradeClosed(profit, isWin);
            
            Print("Position closed: P/L = ", DoubleToString(profit, 2));
        }
    }
}

//+------------------------------------------------------------------+
//| END OF VETERAN TRADER EA                                        |
//+------------------------------------------------------------------+