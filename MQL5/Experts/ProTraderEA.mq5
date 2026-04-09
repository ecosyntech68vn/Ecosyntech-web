#property copyright "Pro Trading System"
#property version "1.00"
#property description "Multi-Strategy Trading EA for Gold/Forex"
#property expertAdvisor "ProTraderEA"

#include <Config.mqh>
#include <Indicators.mqh>
#include <RiskManager.mqh>
#include <OrderManager.mqh>

CIndicatorManager Ind;
CRiskManager Risk;
COrderManager Trade;
CTrailingManager Trailing;
CTradeLogger Logger;

int OnInit() {
    Print("=== ProTraderEA v1.00 initialized ===");
    Print("Strategy: ", EnumToString(Strategy));
    Print("Risk per trade: ", RiskPercent, "%");
    
    if(!Ind.Initialize(_Symbol, PERIOD_CURRENT)) {
        Print("ERROR: Failed to initialize indicators");
        return INIT_FAILED;
    }
    
    if(!Ind.UpdateData(100)) {
        Print("ERROR: Failed to update indicator data");
        return INIT_FAILED;
    }
    
    return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) {
    Print("=== ProTraderEA deinitialized: ", reason, " ===");
    Ind.ReleaseAll();
}

void OnTick() {
    if(!Ind.UpdateData(100)) return;
    
    Risk.Update();
    Trade.UpdateDailyCount();
    
    if(UseDebug) {
        Print("Balance: ", DoubleToString(Risk.GetBalance(), 2),
              " | Equity: ", DoubleToString(Risk.GetEquity(), 2),
              " | Open Trades: ", Trade.GetOpenTradesCount());
    }
    
    ManageOpenPositions();
    
    if(!Trade.CanOpenTrade()) return;
    
    if(!Risk.CheckDailyLimits()) {
        Print("Daily profit target reached, no new trades");
        return;
    }
    
    if(!Risk.IsRiskAllowed(RiskPercent)) {
        Print("Risk not allowed, skipping trade");
        return;
    }
    
    SignalData signal = GenerateSignal();
    
    if(signal.signal != SIGNAL_NONE && signal.confidence >= 60.0) {
        ExecuteTrade(signal);
    }
}

SignalData GenerateSignal() {
    SignalData signal;
    signal.signal = SIGNAL_NONE;
    signal.confidence = 0;
    signal.atr = Ind.GetATR(0);
    signal.spread = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
    signal.timestamp = TimeCurrent();
    
    if(!CTradeValidator::ValidateTrade(_Symbol, MaxSpread, 10, MaxVolatilityATR * 10)) {
        Logger.LogSignal("NONE", 0, "Validation failed");
        return signal;
    }
    
    int trendSignal = DetectTrendSignal();
    int meanRevSignal = DetectMeanRevSignal();
    int breakoutSignal = DetectBreakoutSignal();
    
    int buyVotes = 0;
    int sellVotes = 0;
    
    if(trendSignal > 0) buyVotes += 2;
    if(trendSignal < 0) sellVotes += 2;
    if(meanRevSignal > 0) buyVotes += 1;
    if(meanRevSignal < 0) sellVotes += 1;
    if(breakoutSignal > 0) buyVotes += 1;
    if(breakoutSignal < 0) sellVotes += 1;
    
    if(Strategy == STRATEGY_TREND_FOLLOWING) {
        signal.signal = trendSignal > 0 ? SIGNAL_BUY : (trendSignal < 0 ? SIGNAL_SELL : SIGNAL_NONE);
        signal.confidence = MathAbs(trendSignal) * 50;
    }
    else if(Strategy == STRATEGY_MEAN_REVERSION) {
        signal.signal = meanRevSignal > 0 ? SIGNAL_BUY : (meanRevSignal < 0 ? SIGNAL_SELL : SIGNAL_NONE);
        signal.confidence = MathAbs(meanRevSignal) * 50;
    }
    else if(Strategy == STRATEGY_BREAKOUT) {
        signal.signal = breakoutSignal > 0 ? SIGNAL_BUY : (breakoutSignal < 0 ? SIGNAL_SELL : SIGNAL_NONE);
        signal.confidence = MathAbs(breakoutSignal) * 50;
    }
    else {
        int totalVotes = buyVotes + sellVotes;
        if(totalVotes > 0) {
            if(buyVotes > sellVotes) {
                signal.signal = SIGNAL_BUY;
                signal.confidence = (buyVotes * 100) / totalVotes;
            }
            else if(sellVotes > buyVotes) {
                signal.signal = SIGNAL_SELL;
                signal.confidence = (sellVotes * 100) / totalVotes;
            }
        }
    }
    
    if(UseDebug) {
        string signalName = signal.signal == SIGNAL_BUY ? "BUY" : (signal.signal == SIGNAL_SELL ? "SELL" : "NONE");
        Logger.LogSignal(signalName, signal.confidence, "Multi-strategy");
    }
    
    return signal;
}

int DetectTrendSignal() {
    bool emaCross = (Ind.GetEMAFast(0) > Ind.GetEMASlow(0)) && (Ind.GetEMAFast(1) <= Ind.GetEMASlow(1));
    bool macdCross = Ind.GetMACDMain(0) > Ind.GetMACDSignal(0) && Ind.GetMACDMain(1) <= Ind.GetMACDSignal(1);
    bool trendUp = Ind.IsTrendUp() && Ind.IsStrongTrend();
    
    if(emaCross && macdCross && trendUp) return 2;
    if(emaCross && trendUp) return 1;
    if(emaCross && macdCross) return 1;
    
    bool emaCrossDown = (Ind.GetEMAFast(0) < Ind.GetEMASlow(0)) && (Ind.GetEMAFast(1) >= Ind.GetEMASlow(1));
    bool macdCrossDown = Ind.GetMACDMain(0) < Ind.GetMACDSignal(0) && Ind.GetMACDMain(1) >= Ind.GetMACDSignal(1);
    bool trendDown = Ind.IsTrendDown() && Ind.IsStrongTrend();
    
    if(emaCrossDown && macdCrossDown && trendDown) return -2;
    if(emaCrossDown && trendDown) return -1;
    if(emaCrossDown && macdCrossDown) return -1;
    
    return 0;
}

int DetectMeanRevSignal() {
    int signal = 0;
    
    if(Ind.IsRSIOversold()) signal += 1;
    else if(Ind.IsRSIOverbought()) signal -= 1;
    
    if(Ind.IsStochOversold()) signal += 1;
    else if(Ind.IsStochOverbought()) signal -= 1;
    
    if(!Ind.IsStrongTrend()) {
        if(signal > 0) return signal;
        if(signal < 0) return signal;
    }
    
    return signal;
}

int DetectBreakoutSignal() {
    double high[], low[], close[];
    double atr = Ind.GetATR(0);
    
    int hHigh = iHigh(_Symbol, PERIOD_CURRENT, 0);
    int hLow = iLow(_Symbol, PERIOD_CURRENT, 0);
    int hClose = iClose(_Symbol, PERIOD_CURRENT, 0);
    
    if(hHigh == INVALID_HANDLE || hLow == INVALID_HANDLE || hClose == INVALID_HANDLE) {
        return 0;
    }
    
    CopyBuffer(hHigh, 0, 0, 20, high);
    CopyBuffer(hLow, 0, 0, 20, low);
    CopyBuffer(hClose, 0, 0, 20, close);
    
    IndicatorRelease(hHigh);
    IndicatorRelease(hLow);
    IndicatorRelease(hClose);
    
    double lastHigh = high[0];
    double lastLow = low[0];
    double prevHigh = high[1];
    double prevLow = low[1];
    double currentClose = close[0];
    
    if(currentClose > lastHigh && currentClose > prevHigh) {
        if(Ind.IsStrongTrend()) return 2;
        return 1;
    }
    
    if(currentClose < lastLow && currentClose < prevLow) {
        if(Ind.IsStrongTrend()) return -2;
        return -1;
    }
    
    return 0;
}

void ExecuteTrade(SignalData &signal) {
    if(TradeDirection == TRADE_BUY_ONLY && signal.signal != SIGNAL_BUY) return;
    if(TradeDirection == TRADE_SELL_ONLY && signal.signal != SIGNAL_SELL) return;
    
    double slPoints = 0;
    double tpPoints = 0;
    double atr = Ind.GetATR(0);
    
    if(UseATRforSL) {
        slPoints = atr * ATR_Multiplier / SymbolInfoDouble(_Symbol, SYMBOL_POINT);
    } else {
        slPoints = 100;
    }
    
    tpPoints = slPoints * RiskRewardRatio;
    
    double lotSize = Risk.CalculateLotSize(_Symbol, RiskPercent, slPoints);
    if(lotSize <= 0) {
        Print("Invalid lot size calculated");
        return;
    }
    
    double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
    double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
    double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
    
    double sl = 0;
    double tp = 0;
    ENUM_ORDER_TYPE orderType;
    
    if(signal.signal == SIGNAL_BUY) {
        orderType = ORDER_TYPE_BUY;
        sl = ask - (slPoints * point);
        tp = ask + (tpPoints * point);
    } else {
        orderType = ORDER_TYPE_SELL;
        sl = bid + (slPoints * point);
        tp = bid - (tpPoints * point);
    }
    
    if(Trade.OpenTrade(_Symbol, orderType, lotSize, sl, tp, "ProTrader")) {
        Logger.LogTrade(
            signal.signal == SIGNAL_BUY ? "BUY" : "SELL",
            signal.signal == SIGNAL_BUY ? ask : bid,
            lotSize, sl, tp
        );
    }
}

void ManageOpenPositions() {
    for(int i = 0; i < PositionsTotal(); i++) {
        if(PositionSelectByTicket(PositionGetTicket(i))) {
            if(PositionGetInteger(POSITION_MAGIC) == MagicNumber) {
                if(PositionGetString(POSITION_SYMBOL) == _Symbol) {
                    ENUM_POSITION_TYPE posType = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
                    double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
                    double currentSL = PositionGetDouble(POSITION_SL);
                    
                    Trailing.Update(_Symbol, openPrice, currentSL, posType);
                }
            }
        }
    }
}