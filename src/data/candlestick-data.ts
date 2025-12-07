export interface CandlestickData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  rsi?: number;
}

export interface ExampleData {
  timestamp: number[];
  indicators: {
    quote: Array<{
      low: number[];
      volume: number[];
      high: number[];
      close: number[];
      open: number[];
    }>;
  };
}

export interface YahooFinanceResponse {
  chart: {
    result: Array<{
      meta: {
        currency: string;
        symbol: string;
        exchangeName: string;
        fullExchangeName: string;
        instrumentType: string;
        firstTradeDate: number;
        regularMarketTime: number;
        hasPrePostMarketData: boolean;
        gmtoffset: number;
        timezone: string;
        exchangeTimezoneName: string;
        regularMarketPrice: number;
        fiftyTwoWeekHigh: number;
        fiftyTwoWeekLow: number;
        regularMarketDayHigh: number;
        regularMarketDayLow: number;
        regularMarketVolume: number;
        longName: string;
        shortName: string;
        chartPreviousClose: number;
        previousClose: number;
        scale: number;
        priceHint: number;
        currentTradingPeriod: any;
        tradingPeriods: any;
        dataGranularity: string;
        range: string;
        validRanges: string[];
      };
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: number[];
          high: number[];
          low: number[];
          close: number[];
          volume: number[];
        }>;
      };
    }>;
    error: any;
  };
}

// export const exampleData: ExampleData = {
//   "timestamp": [1704067200, 1704067260, 1704067320],
//   "indicators": {
//     "quote": [
//       {
//         "low": [150.25, 150.30, 150.28],
//         "volume": [1000000, 1200000, 950000],
//         "high": [150.35, 150.40, 150.38],
//         "close": [150.30, 150.35, 150.32],
//         "open": [150.28, 150.32, 150.30]
//       }
//     ]
//   }
// }

export function calculateRSI(prices: number[], period: number = 14): number[] {
  if (prices.length < period + 1) return [];
  
  const rsi: number[] = [];
  let gains = 0;
  let losses = 0;
  
  // Calculate initial gains and losses
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  // Calculate RSI for the rest
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    
    const rs = avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + rs)));
  }
  
  return rsi;
}

export function parseExampleData(data: ExampleData): CandlestickData[] {
  const quote = data.indicators.quote[0];
  
  const candlestickData: CandlestickData[] = data.timestamp.map((timestamp, index) => ({
    timestamp,
    open: quote.open[index],
    high: quote.high[index],
    low: quote.low[index],
    close: quote.close[index],
    volume: quote.volume[index]
  }));
  
  // Calculate RSI
  const closingPrices = candlestickData.map(d => d.close);
  const rsiValues = calculateRSI(closingPrices);
  
  // Add RSI values to candlestick data (skip first 14 values as RSI needs that many)
  rsiValues.forEach((rsi, index) => {
    if (candlestickData[index + 14]) {
      candlestickData[index + 14].rsi = rsi;
    }
  });
  
  return candlestickData;
}

export function parseYahooFinanceData(response: YahooFinanceResponse): CandlestickData[] {
  if (!response.chart.result || response.chart.result.length === 0) {
    return [];
  }
  
  const result = response.chart.result[0];
  const quote = result.indicators.quote[0];
  
  const candlestickData: CandlestickData[] = result.timestamp.map((timestamp, index) => ({
    timestamp,
    open: quote.open[index],
    high: quote.high[index],
    low: quote.low[index],
    close: quote.close[index],
    volume: quote.volume[index]
  }));
  
  // Calculate RSI
  const closingPrices = candlestickData.map(d => d.close);
  const rsiValues = calculateRSI(closingPrices);
  
  // Add RSI values to candlestick data (skip first 14 values as RSI needs that many)
  rsiValues.forEach((rsi, index) => {
    if (candlestickData[index + 14]) {
      candlestickData[index + 14].rsi = rsi;
    }
  });
  
  return candlestickData;
}

// export const sampleCandlestickData: CandlestickData[] = {};