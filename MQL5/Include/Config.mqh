#property copyright "Pro Trading System"
#property version "1.00"
#property strict

enum ENUM_STRATEGY {
    STRATEGY_TREND_FOLLOWING,
    STRATEGY_MEAN_REVERSION,
    STRATEGY_BREAKOUT,
    STRATEGY_MULTI
};

enum ENUM_SIGNAL {
    SIGNAL_NONE,
    SIGNAL_BUY,
    SIGNAL_SELL,
    SIGNAL_CLOSE_BUY,
    SIGNAL_CLOSE_SELL
};

enum ENUM_TRADE_DIRECTION {
    TRADE_BOTH,
    TRADE_BUY_ONLY,
    TRADE_SELL_ONLY
};

struct SignalData {
    ENUM_SIGNAL signal;
    double confidence;
    double atr;
    double spread;
    datetime timestamp;
};

struct TradeSettings {
    double riskPercent;
    double minLot;
    double maxLot;
    int maxSpread;
    int slippage;
    int magicNumber;
    ENUM_TRADE_DIRECTION direction;
};

struct MarketData {
    double bid;
    double ask;
    double spread;
    long volume;
    datetime time;
};

input_group("=== STRATEGY SETTINGS ===");
input ENUM_STRATEGY Strategy = STRATEGY_MULTI;
input ENUM_TRADE_DIRECTION TradeDirection = TRADE_BOTH;
input int LookbackBars = 100;

input_group("=== TREND FOLLOWING ===");
input int FastEMA_Period = 8;
input int SlowEMA_Period = 21;
input int MACD_Fast = 12;
input int MACD_Slow = 26;
input int MACD_Signal = 9;

input_group("=== MEAN REVERSION ===");
input int RSI_Period = 14;
input double RSI_Overbought = 70.0;
input double RSI_Oversold = 30.0;
input int Stochastic_K = 14;
input int Stochastic_D = 3;
input int Stochastic_Slow = 3;

input_group("=== RISK MANAGEMENT ===");
input double RiskPercent = 2.0;
input double MinLot = 0.01;
input double MaxLot = 1.0;
input double RiskRewardRatio = 2.0;
input bool UseATRforSL = true;
input double ATR_Multiplier = 2.0;
input int MaxSpread = 30;
input int Slippage = 3;
input int MaxTradesPerDay = 5;
input int MaxOpenTrades = 3;

input_group("=== TRADE MANAGEMENT ===");
input bool UseTrailingStop = true;
input double TrailStartProfit = 2.0;
input double TrailDistance = 1.5;
input bool UseBreakeven = true;
input double BreakevenProfit = 1.5;
input bool UsePartialClose = true;
input double PartialCloseLevel = 2.0;
input double PartialClosePercent = 50.0;

input_group("=== FILTERS ===");
input bool UseTimeFilter = true;
input int StartHour = 8;
input int EndHour = 20;
input bool UseNewsFilter = false;
input bool UseVolatilityFilter = true;
input double MaxVolatilityATR = 5.0;

input_group("=== OTHER ===");
input int MagicNumber = 20240409;
input bool ShowPanel = true;
input bool UseDebug = false;