#property copyright "Smart Money EA Pro"
#property version "2.00"
#property description "Institutional Trading System with Smart Money Concepts"

#ifndef SMC_CONFIG_MQH
#define SMC_CONFIG_MQH

enum ENUM_MARKET_PHASE {
    PHASE_TRENDING,
    PHASE_RANGING,
    PHASE_VOLATILE
};

enum ENUM_ORDER_BLOCK_TYPE {
    OB_BULLISH,
    OB_BEARISH
};

struct SMCConfig {
    int lookbackBars;
    int minOBsize;
    double fibLevel;
    int liquidityLookback;
    double consolidationThreshold;
    int fvgMinBars;
};

struct MarketStructure {
    ENUM_MARKET_PHASE phase;
    int trendDirection;
    double swingHigh;
    double swingLow;
    double lastHigh;
    double lastLow;
    datetime lastHighTime;
    datetime lastLowTime;
    bool isConsolidating;
    double volatility;
};

struct LiquidityZone {
    double price;
    int strength;
    datetime created;
    bool isActive;
};

struct OrderBlock {
    ENUM_ORDER_BLOCK_TYPE type;
    double high;
    double low;
    double range;
    int strength;
    datetime created;
    bool isActive;
    bool triggered;
};

struct FVG {
    double high;
    double low;
    int barsAge;
    bool isActive;
    ENUM_ORDER_BLOCK_TYPE bias;
};

struct TradeSignal {
    bool isValid;
    ENUM_ORDER_TYPE orderType;
    double entryPrice;
    double stopLoss;
    double takeProfit;
    double confidence;
    string reason;
};

input_group("=== SMC CORE SETTINGS ===");
input int Timeframe_H1 = 60;
input int Timeframe_D1 = 1440;
input bool UseMultiTimeframe = true;

input_group("=== LIQUIDITY DETECTION ===");
input int LiquidityLookback = 50;
input bool DetectHighsLows = true;
input bool DetectTrendlineBreaks = false;
input double LiquidityStrengthMin = 2;

input_group("=== ORDER BLOCK SETTINGS ===");
input int OB_Lookback = 5;
input double OB_MinSize = 50;
input double OB_FibLevel = 0.618;
input int OB_Expiration = 10;

input_group("=== FVG (Fair Value Gap) ===");
input int FVG_Backtrack = 2;
input bool UseFVG = true;
input double FVG_EntryOffset = 0.5;

input_group("=== MARKET STRUCTURE ===");
input int SwingStrength = 5;
input int ATR_Period = 14;
input double ConsolidationThreshold = 0.3;
input bool DetectMarketPhase = true;

input_group("=== RISK MANAGEMENT ===");
input double RiskPercent = 2.0;
input double MinLot = 0.01;
input double MaxLot = 1.0;
input double MaxRiskPerDay = 6.0;
input double MaxDrawdownPercent = 20.0;
input bool UseSmartLotSizing = true;

input_group("=== TRADE MANAGEMENT ===");
input bool UseATR_SL = true;
input double ATR_SL_Multiplier = 2.0;
input double RiskRewardMin = 2.0;
input double RiskRewardMax = 4.0;
input bool UseTrailing = true;
input double TrailActivation = 2.0;
input double TrailDistance = 1.5;
input bool UsePartialClose = true;
input double PartialLevel = 3.0;
input double PartialPercent = 50.0;

input_group("=== FILTERS ===");
input int MaxSpread = 25;
input int MinATR = 100;
input bool UseTimeFilter = true;
input int StartHour = 7;
input int EndHour = 22;
input bool UseNewsFilter = true;

input_group("=== FILTERS NEWS ===");
input bool BlockHighImpact = true;

input_group("=== OTHER ===");
input int MagicNumber = 2024002;
input bool UseDebug = false;
input bool ShowInfoPanel = true;

#endif