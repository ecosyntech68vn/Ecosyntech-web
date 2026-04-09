#property copyright "SMC Pro Backtester"
#property version "1.00"
#property description "Comprehensive Backtest Script for SMC Strategy"

#ifndef SMC_BACKTEST_MQH
#define SMC_BACKTEST_MQH

struct BacktestConfig {
    string symbol;
    ENUM_TIMEFRAMES timeframe;
    datetime startDate;
    datetime endDate;
    double initialBalance;
    double riskPercent;
    double maxDrawdown;
};

struct TradeResult {
    datetime openTime;
    datetime closeTime;
    ENUM_POSITION_TYPE type;
    double openPrice;
    double closePrice;
    double lot;
    double profit;
    double sl;
    double tp;
    int duration;
    string reason;
};

struct BacktestStats {
    int totalTrades;
    int winningTrades;
    int losingTrades;
    double totalProfit;
    double maxDrawdown;
    double maxProfit;
    double avgWin;
    double avgLoss;
    double profitFactor;
    double sharpeRatio;
    double expectancy;
    double avgHoldingTime;
};

class CSMC_Backtester {
private:
    BacktestConfig m_config;
    BacktestStats m_stats;
    TradeResult m_trades[];
    int m_tradeCount;
    
    double m_balance;
    double m_equity;
    double m_peakEquity;
    double m_drawdown;
    
    MarketStructure m_market;
    
public:
    CSMC_Backtester() {
        m_tradeCount = 0;
        m_balance = 0;
        m_equity = 0;
        m_peakEquity = 0;
        m_drawdown = 0;
        ArrayResize(m_trades, 10000);
    }
    
    void Initialize(BacktestConfig &config) {
        m_config = config;
        m_balance = config.initialBalance;
        m_equity = m_balance;
        m_peakEquity = m_balance;
        
        ResetStats();
    }
    
    void RunBacktest() {
        Print("=== Starting Backtest ===");
        Print("Symbol: ", m_config.symbol);
        Print("Period: ", TimeToString(m_config.startDate), " - ", TimeToString(m_config.endDate));
        Print("Initial Balance: ", m_config.initialBalance);
        
        datetime current = m_config.startDate;
        int barCount = 0;
        
        while(current <= m_config.endDate) {
            if(barCount % 100 == 0) {
                UpdateMarketStructure(m_config.symbol, m_config.timeframe, barCount);
            }
            
            CheckForEntry(m_config.symbol, m_config.timeframe, barCount);
            UpdateOpenPositions(m_config.symbol, barCount);
            
            current = iTime(m_config.symbol, m_config.timeframe, barCount);
            barCount++;
            
            if(barCount % 500 == 0) {
                Print("Processed ", barCount, " bars... Balance: ", m_balance);
            }
            
            if(m_drawdown >= m_config.maxDrawdown) {
                Print("WARNING: Max drawdown reached!");
                break;
            }
        }
        
        CalculateStats();
        PrintResults();
    }
    
private:
    void ResetStats() {
        m_stats.totalTrades = 0;
        m_stats.winningTrades = 0;
        m_stats.losingTrades = 0;
        m_stats.totalProfit = 0;
        m_stats.maxDrawdown = 0;
        m_stats.maxProfit = 0;
        m_stats.avgWin = 0;
        m_stats.avgLoss = 0;
        m_stats.profitFactor = 0;
        m_stats.sharpeRatio = 0;
        m_stats.expectancy = 0;
    }
    
    void UpdateMarketStructure(string symbol, ENUM_TIMEFRAMES tf, int barsAgo) {
        double high[], low[], close[];
        
        int count = 200;
        CopyHigh(symbol, tf, barsAgo, count, high);
        CopyLow(symbol, tf, barsAgo, count, low);
        CopyClose(symbol, tf, barsAgo, count, close);
        
        int swingStrength = 5;
        double swingHigh = high[0];
        double swingLow = low[0];
        
        for(int i = 1; i < MathMin(swingStrength * 2, count); i++) {
            if(high[i] > swingHigh) swingHigh = high[i];
            if(low[i] < swingLow) swingLow = low[i];
        }
        
        m_market.swingHigh = swingHigh;
        m_market.swingLow = swingLow;
        
        double ema20[], ema50[];
        int hEMA20 = iMA(symbol, tf, 20, 0, MODE_EMA, PRICE_CLOSE);
        int hEMA50 = iMA(symbol, tf, 50, 0, MODE_EMA, PRICE_CLOSE);
        
        if(hEMA20 != INVALID_HANDLE && hEMA50 != INVALID_HANDLE) {
            CopyBuffer(hEMA20, 0, barsAgo, 2, ema20);
            CopyBuffer(hEMA50, 0, barsAgo, 2, ema50);
            
            if(ema20[0] > ema50[0]) m_market.trendDirection = 1;
            else if(ema20[0] < ema50[0]) m_market.trendDirection = -1;
            else m_market.trendDirection = 0;
            
            IndicatorRelease(hEMA20);
            IndicatorRelease(hEMA50);
        }
        
        double atr[];
        int hATR = iATR(symbol, tf, 14);
        if(hATR != INVALID_HANDLE) {
            CopyBuffer(hATR, 0, barsAgo, 1, atr);
            m_market.volatility = atr[0] / SymbolInfoDouble(symbol, SYMBOL_POINT);
            IndicatorRelease(hATR);
        }
    }
    
    void CheckForEntry(string symbol, ENUM_TIMEFRAMES tf, int barsAgo) {
        if(m_tradeCount >= 10) return;
        
        double open[], high[], low[], close[];
        CopyOpen(symbol, tf, barsAgo, 5, open);
        CopyHigh(symbol, tf, barsAgo, 5, high);
        CopyLow(symbol, tf, barsAgo, 5, low);
        CopyClose(symbol, tf, barsAgo, 5, close);
        
        double currentPrice = close[0];
        double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
        
        bool buySignal = false;
        bool sellSignal = false;
        string reason = "";
        
        if(m_market.trendDirection > 0) {
            if(close[0] <= m_market.swingLow + (m_market.swingHigh - m_market.swingLow) * 0.2) {
                buySignal = true;
                reason = "Trend Buy - Pullback to Support";
            }
        }
        else if(m_market.trendDirection < 0) {
            if(close[0] >= m_market.swingHigh - (m_market.swingHigh - m_market.swingLow) * 0.2) {
                sellSignal = true;
                reason = "Trend Sell - Pullback to Resistance";
            }
        }
        else {
            double range = m_market.swingHigh - m_market.swingLow;
            if(close[0] < m_market.swingLow + range * 0.2) {
                buySignal = true;
                reason = "Range Buy - At Support";
            }
            else if(close[0] > m_market.swingHigh - range * 0.2) {
                sellSignal = true;
                reason = "Range Sell - At Resistance";
            }
        }
        
        if(buySignal || sellSignal) {
            double slDistance = (m_market.swingHigh - m_market.swingLow) * 0.5;
            if(slDistance < point * 100) slDistance = point * 100;
            
            double lot = CalculateLot(slDistance);
            double entry = currentPrice;
            double sl = buySignal ? (m_market.swingLow - point * 20) : (m_market.swingHigh + point * 20);
            double tp = buySignal ? (entry + slDistance * 2) : (entry - slDistance * 2);
            
            OpenTrade(symbol, buySignal ? ORDER_TYPE_BUY : ORDER_TYPE_SELL, 
                     lot, entry, sl, tp, barsAgo, reason);
        }
    }
    
    double CalculateLot(double slDistance) {
        if(slDistance <= 0) return 0.01;
        
        double riskAmount = m_equity * m_config.riskPercent / 100.0;
        double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
        
        double lot = (riskAmount / slDistance) * point;
        
        double minLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
        double maxLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
        double lotStep = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
        
        lot = MathFloor(lot / lotStep) * lotStep;
        return MathMax(minLot, MathMin(maxLot, lot));
    }
    
    void OpenTrade(string symbol, ENUM_ORDER_TYPE type, double lot, 
                   double entry, double sl, double tp, int barOpen, string reason) {
        if(m_balance <= 0) return;
        
        m_trades[m_tradeCount].openTime = iTime(symbol, m_config.timeframe, barOpen);
        m_trades[m_tradeCount].type = type;
        m_trades[m_tradeCount].openPrice = entry;
        m_trades[m_tradeCount].sl = sl;
        m_trades[m_tradeCount].tp = tp;
        m_trades[m_tradeCount].lot = lot;
        m_trades[m_tradeCount].reason = reason;
        
        m_balance -= lot * SymbolInfoDouble(symbol, SYMBOL_CONTRACT_SIZE) * entry * 0.1;
        
        m_tradeCount++;
    }
    
    void UpdateOpenPositions(string symbol, int currentBar) {
        for(int i = 0; i < m_tradeCount; i++) {
            if(m_trades[i].closeTime > 0) continue;
            
            double close[];
            CopyClose(symbol, m_config.timeframe, currentBar, 1, close);
            double currentPrice = close[0];
            
            bool hitSL = false;
            bool hitTP = false;
            
            if(m_trades[i].type == POSITION_TYPE_BUY) {
                if(currentPrice <= m_trades[i].sl) hitSL = true;
                if(currentPrice >= m_trades[i].tp) hitTP = true;
            }
            else {
                if(currentPrice >= m_trades[i].sl) hitSL = true;
                if(currentPrice <= m_trades[i].tp) hitTP = true;
            }
            
            if(hitSL || hitTP) {
                m_trades[i].closeTime = iTime(symbol, m_config.timeframe, currentBar);
                m_trades[i].closePrice = hitTP ? m_trades[i].tp : m_trades[i].sl;
                
                double profit = 0;
                if(m_trades[i].type == POSITION_TYPE_BUY) {
                    profit = (m_trades[i].closePrice - m_trades[i].openPrice) * m_trades[i].lot 
                            * SymbolInfoDouble(symbol, SYMBOL_CONTRACT_SIZE) / SymbolInfoDouble(symbol, SYMBOL_POINT);
                }
                else {
                    profit = (m_trades[i].openPrice - m_trades[i].closePrice) * m_trades[i].lot 
                            * SymbolInfoDouble(symbol, SYMBOL_CONTRACT_SIZE) / SymbolInfoDouble(symbol, SYMBOL_POINT);
                }
                
                m_trades[i].profit = profit;
                m_balance += m_trades[i].lot * SymbolInfoDouble(symbol, SYMBOL_CONTRACT_SIZE) * m_trades[i].openPrice * 0.1;
                m_balance += profit * SymbolInfoDouble(symbol, SYMBOL_POINT);
                
                m_equity = m_balance;
                if(m_equity > m_peakEquity) m_peakEquity = m_equity;
                
                double dd = (m_peakEquity - m_equity) / m_peakEquity * 100;
                if(dd > m_drawdown) m_drawdown = dd;
                
                m_stats.totalTrades++;
                if(profit > 0) m_stats.winningTrades++;
                else m_stats.losingTrades++;
                m_stats.totalProfit += profit;
            }
        }
    }
    
    void CalculateStats() {
        if(m_stats.totalTrades == 0) return;
        
        double totalWin = 0;
        double totalLoss = 0;
        
        for(int i = 0; i < m_tradeCount; i++) {
            if(m_trades[i].profit > 0) totalWin += m_trades[i].profit;
            else totalLoss += MathAbs(m_trades[i].profit);
        }
        
        if(m_stats.winningTrades > 0) m_stats.avgWin = totalWin / m_stats.winningTrades;
        if(m_stats.losingTrades > 0) m_stats.avgLoss = totalLoss / m_stats.losingTrades;
        
        m_stats.profitFactor = totalLoss > 0 ? totalWin / totalLoss : 0;
        
        double winRate = (double)m_stats.winningTrades / m_stats.totalTrades * 100;
        double avgRR = m_stats.avgLoss > 0 ? m_stats.avgWin / m_stats.avgLoss : 0;
        m_stats.expectancy = (winRate / 100 * avgRR) - (1 - winRate / 100);
        
        m_stats.maxProfit = m_peakEquity - m_config.initialBalance;
        m_stats.maxDrawdown = m_drawdown;
    }
    
    void PrintResults() {
        Print("\n=== BACKTEST RESULTS ===");
        Print("Total Trades: ", m_stats.totalTrades);
        Print("Winning: ", m_stats.winningTrades, " (", DoubleToString((double)m_stats.winningTrades / m_stats.totalTrades * 100, 1), "%)");
        Print("Losing: ", m_stats.losingTrades);
        Print("Total Profit: ", DoubleToString(m_stats.totalProfit, 2));
        Print("Final Balance: ", DoubleToString(m_balance, 2));
        Print("Max Drawdown: ", DoubleToString(m_stats.maxDrawdown, 2), "%");
        Print("Profit Factor: ", DoubleToString(m_stats.profitFactor, 2));
        Print("Expectancy: ", DoubleToString(m_stats.expectancy * 100, 2), "%");
        Print("Avg Win: ", DoubleToString(m_stats.avgWin, 2));
        Print("Avg Loss: ", DoubleToString(m_stats.avgLoss, 2));
        Print("========================\n");
    }
    
    BacktestStats GetStats() { return m_stats; }
    TradeResult GetTrade(int index) { return m_trades[index]; }
    int GetTradeCount() { return m_tradeCount; }
};

#endif