#property copyright "Pro Trading System"
#property version "1.00"
#property description "Advanced Trading Indicators Library"

#ifndef PRO_INDICATORS_MQH
#define PRO_INDICATORS_MQH

#include <Object.mqh>

class CIndicatorManager {
private:
    int m_handle_ema_fast;
    int m_handle_ema_slow;
    int m_handle_rsi;
    int m_handle_macd;
    int m_handle_stoch;
    int m_handle_atr;
    int m_handle_adx;
    
    double m_ema_fast[];
    double m_ema_slow[];
    double m_rsi[];
    double m_macd_main[];
    double m_macd_signal[];
    double m_stoch_main[];
    double m_stoch_signal[];
    double m_atr[];
    double m_adx[];
    
    string m_symbol;
    ENUM_TIMEFRAMES m_timeframe;
    
public:
    CIndicatorManager() {
        m_handle_ema_fast = INVALID_HANDLE;
        m_handle_ema_slow = INVALID_HANDLE;
        m_handle_rsi = INVALID_HANDLE;
        m_handle_macd = INVALID_HANDLE;
        m_handle_stoch = INVALID_HANDLE;
        m_handle_atr = INVALID_HANDLE;
        m_handle_adx = INVALID_HANDLE;
    }
    
    ~CIndicatorManager() {
        ReleaseAll();
    }
    
    bool Initialize(string symbol, ENUM_TIMEFRAMES timeframe) {
        m_symbol = symbol;
        m_timeframe = timeframe;
        return InitIndicators();
    }
    
    void ReleaseAll() {
        if(m_handle_ema_fast != INVALID_HANDLE) IndicatorRelease(m_handle_ema_fast);
        if(m_handle_ema_slow != INVALID_HANDLE) IndicatorRelease(m_handle_ema_slow);
        if(m_handle_rsi != INVALID_HANDLE) IndicatorRelease(m_handle_rsi);
        if(m_handle_macd != INVALID_HANDLE) IndicatorRelease(m_handle_macd);
        if(m_handle_stoch != INVALID_HANDLE) IndicatorRelease(m_handle_stoch);
        if(m_handle_atr != INVALID_HANDLE) IndicatorRelease(m_handle_atr);
        if(m_handle_adx != INVALID_HANDLE) IndicatorRelease(m_handle_adx);
    }
    
private:
    bool InitIndicators() {
        m_handle_ema_fast = iMA(m_symbol, m_timeframe, 8, 0, MODE_EMA, PRICE_CLOSE);
        m_handle_ema_slow = iMA(m_symbol, m_timeframe, 21, 0, MODE_EMA, PRICE_CLOSE);
        m_handle_rsi = iRSI(m_symbol, m_timeframe, 14, PRICE_CLOSE);
        m_handle_macd = iMACD(m_symbol, m_timeframe, 12, 26, 9, PRICE_CLOSE);
        m_handle_stoch = iStochastic(m_symbol, m_timeframe, 14, 3, 3, MODE_SMA, STO_LOWHIGH);
        m_handle_atr = iATR(m_symbol, m_timeframe, 14);
        m_handle_adx = iADX(m_symbol, m_timeframe, 14);
        
        if(m_handle_ema_fast == INVALID_HANDLE || m_handle_ema_slow == INVALID_HANDLE ||
           m_handle_rsi == INVALID_HANDLE || m_handle_macd == INVALID_HANDLE ||
           m_handle_stoch == INVALID_HANDLE || m_handle_atr == INVALID_HANDLE) {
            return false;
        }
        return true;
    }
    
public:
    bool UpdateData(int count = 100) {
        if(!CopyBuffer(m_handle_ema_fast, 0, 0, count, m_ema_fast)) return false;
        if(!CopyBuffer(m_handle_ema_slow, 0, 0, count, m_ema_slow)) return false;
        if(!CopyBuffer(m_handle_rsi, 0, 0, count, m_rsi)) return false;
        if(!CopyBuffer(m_handle_macd, 0, 0, 2, m_macd_main)) return false;
        if(!CopyBuffer(m_handle_macd, 1, 0, 2, m_macd_signal)) return false;
        if(!CopyBuffer(m_handle_stoch, 0, 0, 2, m_stoch_main)) return false;
        if(!CopyBuffer(m_handle_stoch, 1, 0, 2, m_stoch_signal)) return false;
        if(!CopyBuffer(m_handle_atr, 0, 0, count, m_atr)) return false;
        if(!CopyBuffer(m_handle_adx, 0, 0, count, m_adx)) return false;
        return true;
    }
    
    double GetEMAFast(int index = 0) { return m_ema_fast[index]; }
    double GetEMASlow(int index = 0) { return m_ema_slow[index]; }
    double GetRSI(int index = 0) { return m_rsi[index]; }
    double GetMACDMain(int index = 0) { return m_macd_main[index]; }
    double GetMACDSignal(int index = 0) { return m_macd_signal[index]; }
    double GetStochMain(int index = 0) { return m_stoch_main[index]; }
    double GetStochSignal(int index = 0) { return m_stoch_signal[index]; }
    double GetATR(int index = 0) { return m_atr[index]; }
    double GetADX(int index = 0) { return m_adx[index]; }
    
    bool IsTrendUp() { return m_ema_fast[0] > m_ema_slow[0]; }
    bool IsTrendDown() { return m_ema_fast[0] < m_ema_slow[0]; }
    bool IsRSIOverbought() { return m_rsi[0] > 70; }
    bool IsRSIOversold() { return m_rsi[0] < 30; }
    bool IsMACD bullish() { return m_macd_main[0] > m_macd_signal[0]; }
    bool IsMACD bearish() { return m_macd_main[0] < m_macd_signal[0]; }
    bool IsStochOverbought() { return m_stoch_main[0] > 80; }
    bool IsStochOversold() { return m_stoch_main[0] < 20; }
    bool IsStrongTrend() { return m_adx[0] > 25; }
};

class CTrendDetector {
public:
    static int Detect(string symbol, ENUM_TIMEFRAMES timeframe, int lookback = 100) {
        double ema8[], ema21[];
        int hEMA8 = iMA(symbol, timeframe, 8, 0, MODE_EMA, PRICE_CLOSE);
        int hEMA21 = iMA(symbol, timeframe, 21, 0, MODE_EMA, PRICE_CLOSE);
        
        if(hEMA8 == INVALID_HANDLE || hEMA21 == INVALID_HANDLE) return 0;
        
        CopyBuffer(hEMA8, 0, 0, lookback, ema8);
        CopyBuffer(hEMA21, 0, 0, lookback, ema21);
        
        IndicatorRelease(hEMA8);
        IndicatorRelease(hEMA21);
        
        if(ema8[0] > ema21[0] && ema8[1] > ema21[1]) return 1;
        if(ema8[0] < ema21[0] && ema8[1] < ema21[1]) return -1;
        return 0;
    }
};

class CVolatilityChecker {
public:
    static bool IsVolatilitySuitable(string symbol, ENUM_TIMEFRAMES timeframe, double maxATR) {
        double atr[];
        int hATR = iATR(symbol, timeframe, 14);
        if(hATR == INVALID_HANDLE) return true;
        
        CopyBuffer(hATR, 0, 0, 1, atr);
        IndicatorRelease(hATR);
        
        return atr[0] <= maxATR;
    }
};

#endif