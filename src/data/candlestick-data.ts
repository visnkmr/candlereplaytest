export interface CandlestickData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
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

export const exampleData: ExampleData = {
  "timestamp": [1704067200, 1704067260, 1704067320],
  "indicators": {
    "quote": [
      {
        "low": [150.25, 150.30, 150.28],
        "volume": [1000000, 1200000, 950000],
        "high": [150.35, 150.40, 150.38],
        "close": [150.30, 150.35, 150.32],
        "open": [150.28, 150.32, 150.30]
      }
    ]
  }
}

export function parseExampleData(data: ExampleData): CandlestickData[] {
  const quote = data.indicators.quote[0];
  
  return data.timestamp.map((timestamp, index) => ({
    timestamp,
    open: quote.open[index],
    high: quote.high[index],
    low: quote.low[index],
    close: quote.close[index],
    volume: quote.volume[index]
  }));
}

export const sampleCandlestickData: CandlestickData[] = parseExampleData(exampleData);