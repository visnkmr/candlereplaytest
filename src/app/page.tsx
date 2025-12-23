"use client";

import { useState, useEffect, useMemo } from "react";
import { D3CandlestickChart } from "@/components/d3-candlestick-chart";
import { D3RSIGraph } from "@/components/d3-rsi-graph";
import { LightweightCandlestickChart } from "@/components/lightweight-candlestick-chart";
import { LightweightRSIGraph } from "@/components/lightweight-rsi-graph";
import { CandlestickData, ExampleData, parseExampleData, parseYahooFinanceData, YahooFinanceResponse } from "@/data/candlestick-data";

// Local storage keys
const STORAGE_KEYS = {
  JSON_DATA: 'candlestick_json_data',
  PARSED_DATA: 'candlestick_parsed_data',
  REPLAY_DATA: 'candlestick_replay_data',
  REPLAY_INDEX: 'candlestick_replay_index',
  IS_REPLAYING: 'candlestick_is_replaying',
  IS_PAUSED: 'candlestick_is_paused',
  TRANSACTIONS: 'candlestick_transactions',
  CURRENT_POSITION: 'candlestick_current_position',
  QUANTITY: 'candlestick_quantity',
  SYMBOL: 'candlestick_symbol',
  INTERVAL: 'candlestick_interval',
  TIME_PERIOD: 'candlestick_time_period'
};

// Utility functions for localStorage
const saveToLocalStorage = (key: string, data: unknown) => {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);
    console.log(`💾 Saved to localStorage (${key})`);
  } catch (error) {
    console.error(`❌ Error saving to localStorage (${key}):`, error);
  }
};

const loadFromLocalStorage = <T = unknown>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    if (item) {
      const parsed = JSON.parse(item);
      console.log(`📥 Loaded from localStorage (${key})`);
      return parsed;
    }
    console.log(`📭 No data found in localStorage (${key}), using default`);
    return defaultValue;
  } catch (error) {
    console.error(`❌ Error loading from localStorage (${key}):`, error);
    return defaultValue;
  }
};

const clearLocalStorage = () => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('🗑️ Cleared all localStorage data');
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
};

// Debug function to check localStorage contents (can be called from browser console)
const debugLocalStorage = () => {
  console.log('🔍 Debugging localStorage contents:');
  Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
    const item = localStorage.getItem(key);
    console.log(`${name}:`, item ? '✅ Data exists' : '❌ No data');
  });
};

// Make debug function available globally
if (typeof window !== 'undefined') {
  (window as any).debugCandlestickStorage = debugLocalStorage;
  (window as any).clearCandlestickStorage = clearLocalStorage;
}

export default function Home() {
  const [jsonData, setJsonData] = useState<string>();
  const [parsedData, setParsedData] = useState<CandlestickData[]>([]);
  const [error, setError] = useState<string>("");
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [replayData, setReplayData] = useState<CandlestickData[]>([]);
  const [replayIndex, setReplayIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [transactions, setTransactions] = useState<Array<{
    type: 'buy' | 'sell';
    price: number;
    quantity: number;
    timestamp: number;
    index: number;
  }>>([]);
  const [currentPosition, setCurrentPosition] = useState<{
    quantity: number;
    avgPrice: number;
  }>({ quantity: 0, avgPrice: 0 });
  const [symbol, setSymbol] = useState<string>("");
  const [interval, setInterval] = useState<string>("1m");
  const [timePeriod, setTimePeriod] = useState<string>("1d");
  const [isRestored, setIsRestored] = useState<boolean>(false);

  // NEW D3 GRAPH OPTIONS
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [tooltipMode, setTooltipMode] = useState<'synced' | 'simple'>('synced');
  const [graphEngine, setGraphEngine] = useState<'d3' | 'lightweight'>('d3');

  const yahooUrl = useMemo(() => {
    // Calculate date range based on time period
    // End date should be exactly 24 hours after start date for accurate replay
    let daysAgo = 1; // default to 1 day

    switch (timePeriod) {
      case "1d":
        daysAgo = 1;
        break;
      case "2d":
        daysAgo = 2;
        break;
      case "3d":
        daysAgo = 3;
        break;
      case "4d":
        daysAgo = 4;
        break;
      case "5d":
        daysAgo = 5;
        break;
      case "6d":
        daysAgo = 6;
        break;
      case "7d":
        daysAgo = 7;
        break;
      default:
        daysAgo = 1;
    }

    // Calculate start date (daysAgo days ago from now)
    // eslint-disable-next-line react-hooks/purity
    const endDate = Math.floor(Date.now() / 1000);
    const startDate = endDate - (daysAgo * 24 * 60 * 60);

    // Set end date to exactly 24 hours after start date for accurate replay
    const accurateEndDate = startDate + (24 * 60 * 60);

    return `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startDate}&period2=${accurateEndDate}&interval=${interval}&includePrePost=true&events=div%7Csplit%7Cearn&lang=en-US&region=US&source=cosaic`;
  }, [symbol, interval, timePeriod]);

  // Save state to localStorage on changes (only after restoration is complete)
  useEffect(() => {
    if (isRestored) {
      saveToLocalStorage(STORAGE_KEYS.JSON_DATA, jsonData);
    }
  }, [jsonData, isRestored]);

  useEffect(() => {
    if (isRestored) {
      saveToLocalStorage(STORAGE_KEYS.PARSED_DATA, parsedData);
    }
  }, [parsedData, isRestored]);

  useEffect(() => {
    if (isRestored) {
      saveToLocalStorage(STORAGE_KEYS.REPLAY_DATA, replayData);
    }
  }, [replayData, isRestored]);

  useEffect(() => {
    if (isRestored) {
      saveToLocalStorage(STORAGE_KEYS.REPLAY_INDEX, replayIndex);
    }
  }, [replayIndex, isRestored]);

  useEffect(() => {
    if (isRestored) {
      saveToLocalStorage(STORAGE_KEYS.IS_REPLAYING, isReplaying);
    }
  }, [isReplaying, isRestored]);

  useEffect(() => {
    if (isRestored) {
      saveToLocalStorage(STORAGE_KEYS.IS_PAUSED, isPaused);
    }
  }, [isPaused, isRestored]);

  useEffect(() => {
    if (isRestored) {
      saveToLocalStorage(STORAGE_KEYS.TRANSACTIONS, transactions);
    }
  }, [transactions, isRestored]);

  useEffect(() => {
    if (isRestored) {
      saveToLocalStorage(STORAGE_KEYS.CURRENT_POSITION, currentPosition);
    }
  }, [currentPosition, isRestored]);

  useEffect(() => {
    if (isRestored) {
      saveToLocalStorage(STORAGE_KEYS.QUANTITY, quantity);
    }
  }, [quantity, isRestored]);

  useEffect(() => {
    if (isRestored) {
      saveToLocalStorage(STORAGE_KEYS.SYMBOL, symbol);
    }
  }, [symbol, isRestored]);

  useEffect(() => {
    if (isRestored) {
      saveToLocalStorage(STORAGE_KEYS.INTERVAL, interval);
    }
  }, [interval, isRestored]);

  useEffect(() => {
    if (isRestored) {
      saveToLocalStorage(STORAGE_KEYS.TIME_PERIOD, timePeriod);
    }
  }, [timePeriod, isRestored]);

  // Restore state from localStorage on mount
  useEffect(() => {
    console.log('🔄 Restoring state from localStorage...');

    // Check if localStorage is available
    if (typeof window === 'undefined' || !window.localStorage) {
      console.log('❌ localStorage not available');
      setIsRestored(true);
      return;
    }

    try {
      const savedJsonData = loadFromLocalStorage<string | undefined>(STORAGE_KEYS.JSON_DATA, undefined);
      const savedParsedData = loadFromLocalStorage<CandlestickData[]>(STORAGE_KEYS.PARSED_DATA, []);
      const savedReplayData = loadFromLocalStorage<CandlestickData[]>(STORAGE_KEYS.REPLAY_DATA, []);
      const savedReplayIndex = loadFromLocalStorage<number>(STORAGE_KEYS.REPLAY_INDEX, 0);
      const savedIsReplaying = loadFromLocalStorage<boolean>(STORAGE_KEYS.IS_REPLAYING, false);
      const savedIsPaused = loadFromLocalStorage<boolean>(STORAGE_KEYS.IS_PAUSED, false);
      const savedTransactions = loadFromLocalStorage<Array<{
        type: 'buy' | 'sell';
        price: number;
        quantity: number;
        timestamp: number;
        index: number;
      }>>(STORAGE_KEYS.TRANSACTIONS, []);
      const savedCurrentPosition = loadFromLocalStorage<{ quantity: number; avgPrice: number }>(STORAGE_KEYS.CURRENT_POSITION, { quantity: 0, avgPrice: 0 });
      const savedQuantity = loadFromLocalStorage<number>(STORAGE_KEYS.QUANTITY, 1);
      const savedSymbol = loadFromLocalStorage<string>(STORAGE_KEYS.SYMBOL, "");
      const savedInterval = loadFromLocalStorage<string>(STORAGE_KEYS.INTERVAL, "1m");
      const savedTimePeriod = loadFromLocalStorage<string>(STORAGE_KEYS.TIME_PERIOD, "1d");

      console.log('📊 Loaded data:', {
        savedJsonData: !!savedJsonData,
        savedParsedDataLength: savedParsedData.length,
        savedReplayDataLength: savedReplayData.length,
        savedReplayIndex,
        savedIsReplaying,
        savedIsPaused,
        savedTransactionsLength: savedTransactions.length,
        savedCurrentPosition,
        savedQuantity,
        savedSymbol,
        savedInterval,
        savedTimePeriod
      });

      // Restore state with proper checks
      if (savedJsonData) {
        console.log('📝 Restoring JSON data');
        setJsonData(savedJsonData);
      }
      if (savedParsedData && savedParsedData.length > 0) {
        console.log('📈 Restoring parsed data:', savedParsedData.length, 'candles');
        setParsedData(savedParsedData);
      }
      if (savedReplayData && savedReplayData.length > 0) {
        console.log('🎬 Restoring replay data:', savedReplayData.length, 'candles');
        setReplayData(savedReplayData);
      }
      if (savedReplayIndex > 0) {
        console.log('⏩ Restoring replay index:', savedReplayIndex);
        setReplayIndex(savedReplayIndex);
      }
      if (savedIsReplaying) {
        console.log('▶️ Restoring replay state: playing');
        setIsReplaying(savedIsReplaying);
      }
      if (savedIsPaused) {
        console.log('⏸️ Restoring pause state');
        setIsPaused(savedIsPaused);
      }
      if (savedTransactions && savedTransactions.length > 0) {
        console.log('💰 Restoring transactions:', savedTransactions.length);
        setTransactions(savedTransactions);
      }
      if (savedCurrentPosition && (savedCurrentPosition.quantity > 0 || savedCurrentPosition.avgPrice > 0)) {
        console.log('📊 Restoring position:', savedCurrentPosition);
        setCurrentPosition(savedCurrentPosition);
      }
      if (savedQuantity && savedQuantity !== 1) {
        console.log('🔢 Restoring quantity:', savedQuantity);
        setQuantity(savedQuantity);
      }
      if (savedSymbol) {
        console.log('🏷️ Restoring symbol:', savedSymbol);
        setSymbol(savedSymbol);
      }
      if (savedInterval && savedInterval !== "1m") {
        console.log('⏱️ Restoring interval:', savedInterval);
        setInterval(savedInterval);
      }
      if (savedTimePeriod && savedTimePeriod !== "1d") {
        console.log('📅 Restoring time period:', savedTimePeriod);
        setTimePeriod(savedTimePeriod);
      }

      console.log('✅ State restoration complete');
    } catch (error) {
      console.error('❌ Error restoring state from localStorage:', error);
    } finally {
      setIsRestored(true);
    }
  }, []);

  // Parse initial data on mount
  // useEffect(() => {
  //   try {
  //     const parsed = JSON.parse({}) as ExampleData;
  //     const candlestickData = parseExampleData(parsed);
  //     setParsedData(candlestickData);
  //   } catch (err) {
  //     setError("Invalid JSON format. Please check your input.");
  //   }
  // }, []);

  // Handle replay animation
  useEffect(() => {
    if (isReplaying && !isPaused && replayIndex < replayData.length) {
      const timer = setTimeout(() => {
        setReplayIndex(prev => prev + 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isReplaying && replayIndex >= replayData.length) {
      setIsReplaying(false);
      setIsPaused(false);
    }
  }, [isReplaying, isPaused, replayIndex, replayData.length]);

  const handleFetchData = async () => {
    if (!symbol || !interval || !timePeriod) {
      setError("Please enter a symbol, select interval and time period.");
      return;
    }

    setIsRestored(false); // Temporarily disable saving while fetching

    try {
      // Calculate date range
      let daysAgo = 1;
      switch (timePeriod) {
        case "1d": daysAgo = 1; break;
        case "2d": daysAgo = 2; break;
        case "3d": daysAgo = 3; break;
        case "4d": daysAgo = 4; break;
        case "5d": daysAgo = 5; break;
        case "6d": daysAgo = 6; break;
        case "7d": daysAgo = 7; break;
        default: daysAgo = 1;
      }

      const endDate = Math.floor(Date.now() / 1000);
      const startDate = endDate - (daysAgo * 24 * 60 * 60);
      const accurateEndDate = startDate + (24 * 60 * 60);

      const apiUrl = `/api/yahoo-finance?symbol=${symbol}&period1=${startDate}&period2=${accurateEndDate}&interval=${interval}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`);
      }

      const data = await response.json();

      if (data.chart?.result?.[0]) {
        const yahooData = data as YahooFinanceResponse;
        const candlestickData = parseYahooFinanceData(yahooData);
        setParsedData(candlestickData);
        setJsonData(JSON.stringify(data, null, 2)); // Also populate the JSON textarea
        setError("");
      } else {
        setError("No data found for the specified symbol and time period.");
      }
    } catch (err) {
      setError("Failed to fetch data from Yahoo Finance. Please try again.");
      console.error("Error fetching data:", err);
    } finally {
      setIsRestored(true);
    }
  };

  const handleParseJson = () => {
    try {
      const parsed = jsonData && JSON.parse(jsonData);

      // Check if it's Yahoo Finance data or ExampleData
      if (parsed.chart && parsed.chart.result) {
        // It's Yahoo Finance data
        const yahooData = parsed as YahooFinanceResponse;
        const candlestickData = parseYahooFinanceData(yahooData);
        setParsedData(candlestickData);
        setError("");
      } else {
        // It's ExampleData
        const exampleData = parsed as ExampleData;
        const candlestickData = parseExampleData(exampleData);
        setParsedData(candlestickData);
        setError("");
      }
    } catch {
      setError("Invalid JSON format. Please check your input.");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(yahooUrl).then(() => {
      setError("URL copied to clipboard! Paste it in browser and copy the JSON response.");
    }).catch(() => {
      setError("Failed to copy URL. Please copy it manually.");
    });
  };

  const convertToCSV = (data: CandlestickData[]) => {
    const headers = ["timestamp", "open", "high", "low", "close", "volume"];
    const csvContent = [
      headers.join(","),
      ...data.map(row =>
        [row.timestamp, row.open, row.high, row.low, row.close, row.volume].join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "candlestick-data.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const startReplay = () => {
    setReplayData(parsedData);
    setReplayIndex(0);
    setIsReplaying(true);
  };

  const stopReplay = () => {
    setIsReplaying(false);
    setIsPaused(false);
    setReplayIndex(0);
    setReplayData([]);
  };

  const pauseReplay = () => {
    setIsPaused(true);
  };

  const resumeReplay = () => {
    setIsPaused(false);
  };

  const resetReplay = () => {
    setReplayIndex(0);
    setIsPaused(false);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = parseInt(e.target.value);
    setReplayIndex(newIndex);
  };

  const handleBuy = () => {
    const currentCandle = currentDisplayData[currentDisplayData.length - 1];
    if (!currentCandle) return;

    const newTransaction = {
      type: 'buy' as const,
      price: currentCandle.close,
      quantity,
      timestamp: currentCandle.timestamp,
      index: currentDisplayData.length - 1
    };

    setTransactions(prev => [...prev, newTransaction]);

    setCurrentPosition(prev => {
      const totalQuantity = prev.quantity + quantity;
      const totalCost = (prev.quantity * prev.avgPrice) + (quantity * currentCandle.close);
      return {
        quantity: totalQuantity,
        avgPrice: totalCost / totalQuantity
      };
    });
  };

  const handleSell = () => {
    const currentCandle = currentDisplayData[currentDisplayData.length - 1];
    if (!currentCandle || currentPosition.quantity === 0) return;

    const sellQuantity = Math.min(quantity, currentPosition.quantity);
    const newTransaction = {
      type: 'sell' as const,
      price: currentCandle.close,
      quantity: sellQuantity,
      timestamp: currentCandle.timestamp,
      index: currentDisplayData.length - 1
    };

    setTransactions(prev => [...prev, newTransaction]);

    setCurrentPosition(prev => ({
      quantity: prev.quantity - sellQuantity,
      avgPrice: prev.avgPrice
    }));
  };

  const handleSellAll = () => {
    const currentCandle = currentDisplayData[currentDisplayData.length - 1];
    if (!currentCandle || currentPosition.quantity === 0) return;

    const newTransaction = {
      type: 'sell' as const,
      price: currentCandle.close,
      quantity: currentPosition.quantity,
      timestamp: currentCandle.timestamp,
      index: currentDisplayData.length - 1
    };

    setTransactions(prev => [...prev, newTransaction]);

    setCurrentPosition({ quantity: 0, avgPrice: 0 });
  };

  const calculatePnL = () => {
    if (currentPosition.quantity === 0) return 0;
    const currentPrice = currentDisplayData[currentDisplayData.length - 1]?.close || 0;
    const currentValue = currentPosition.quantity * currentPrice;
    const costBasis = currentPosition.quantity * currentPosition.avgPrice;
    return currentValue - costBasis;
  };

  const calculateTotalInvested = () => {
    return transactions
      .filter(tx => tx.type === 'buy')
      .reduce((total, tx) => total + (tx.price * tx.quantity), 0);
  };

  const currentDisplayData = isReplaying ? replayData.slice(0, replayIndex + 1) : parsedData;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <nav className="flex justify-between items-center mb-4">
            <div className="flex space-x-6">
              <a href="/" className="text-blue-600 font-medium hover:text-blue-800">Candlestick Chart</a>
              <a href="/yearly-comparison" className="text-gray-600 hover:text-blue-600">Yearly Comparison</a>
            </div>
          </nav>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Candlestick Chart</h1>
          <p className="text-gray-600">Interactive candlestick chart with JSON input</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Yahoo Finance Data</h2>
            {isRestored && (
              <div className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                ✅ Data Restored
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="e.g., HDFCBANK.NS, AAPL"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Interval</label>
              <select
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="1m">1 Minute</option>
                <option value="5m">5 Minutes</option>
                <option value="15m">15 Minutes</option>
                <option value="30m">30 Minutes</option>
                <option value="1h">1 Hour</option>
                <option value="1d">1 Day</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
              <select
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="1d">Last Day</option>
                <option value="2d">Last 2 Days</option>
                <option value="3d">Last 3 Days</option>
                <option value="4d">Last 4 Days</option>
                <option value="5d">Last 5 Days</option>
                <option value="6d">Last 6 Days</option>
                <option value="7d">Last 7 Days</option>
              </select>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-medium text-blue-900 mb-2">Yahoo Finance API URL</h3>
            <div className="bg-white border border-blue-300 rounded p-3 mb-3">
              <code className="text-sm text-blue-800 break-all">{yahooUrl}</code>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                📋 Copy URL
              </button>
              <button
                onClick={() => window.open(yahooUrl, '_blank')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                🔗 Open in Browser
              </button>
            </div>
            <div className="mt-3 text-sm text-blue-800">
              <p><strong>Option 1 - Direct Fetch:</strong></p>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Enter symbol, select interval and time period above</li>
                <li>Click &quot;Fetch Data&quot; button</li>
                <li>Data will be loaded automatically</li>
              </ol>
              <p className="mt-3"><strong>Option 2 - Manual JSON:</strong></p>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Click &quot;Copy URL&quot; or copy the URL above</li>
                <li>Paste the URL in your browser address bar</li>
                <li>Copy the entire JSON response from the page</li>
                <li>Paste the JSON in the textarea below</li>
                <li>Click &quot;Parse & Display&quot; to view the chart</li>
              </ol>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">JSON Response</h3>
            <textarea
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              placeholder="Paste the JSON response from Yahoo Finance API here..."
              className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {error && (
              <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
            <div className="mt-4 flex gap-4">
              <button
                onClick={handleFetchData}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Fetch Data
              </button>
              <button
                onClick={handleParseJson}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Parse & Display
              </button>
              <button
                onClick={() => convertToCSV(parsedData)}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                Download as CSV
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to clear all saved data? This will reset everything including transactions and replay progress.')) {
                    clearLocalStorage();
                    window.location.reload();
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                🗑️ Clear All Data
              </button>
              <button
                onClick={() => {
                  debugLocalStorage();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                🔍 Debug Storage
              </button>
              <button
                onClick={() => {
                  // Add sample data for testing
                  const sampleData = {
                    [STORAGE_KEYS.JSON_DATA]: '{"chart":{"result":[{"meta":{"symbol":"AAPL"},"timestamp":[1609459200,1609459260,1609459320],"indicators":{"quote":[{"close":[130,131,132]},{"high":[132,133,134]},{"low":[129,130,131]},{"open":[130,131,132]},{"volume":[1000,1100,1200]}]}}]}}',
                    [STORAGE_KEYS.PARSED_DATA]: [
                      { timestamp: 1609459200, open: 130, high: 132, low: 129, close: 130, volume: 1000 },
                      { timestamp: 1609459260, open: 131, high: 133, low: 130, close: 131, volume: 1100 },
                      { timestamp: 1609459320, open: 132, high: 134, low: 131, close: 132, volume: 1200 }
                    ],
                    [STORAGE_KEYS.REPLAY_DATA]: [
                      { timestamp: 1609459200, open: 130, high: 132, low: 129, close: 130, volume: 1000 },
                      { timestamp: 1609459260, open: 131, high: 133, low: 130, close: 131, volume: 1100 },
                      { timestamp: 1609459320, open: 132, high: 134, low: 131, close: 132, volume: 1200 }
                    ],
                    [STORAGE_KEYS.REPLAY_INDEX]: 2,
                    [STORAGE_KEYS.IS_REPLAYING]: true,
                    [STORAGE_KEYS.IS_PAUSED]: true,
                    [STORAGE_KEYS.TRANSACTIONS]: [
                      { type: 'buy', price: 130, quantity: 10, timestamp: 1609459200, index: 0 },
                      { type: 'sell', price: 131, quantity: 5, timestamp: 1609459260, index: 1 }
                    ],
                    [STORAGE_KEYS.CURRENT_POSITION]: { quantity: 5, avgPrice: 130 },
                    [STORAGE_KEYS.QUANTITY]: 3,
                    [STORAGE_KEYS.SYMBOL]: 'AAPL',
                    [STORAGE_KEYS.INTERVAL]: '5m',
                    [STORAGE_KEYS.TIME_PERIOD]: '2d'
                  };

                  Object.entries(sampleData).forEach(([key, value]) => {
                    localStorage.setItem(key, JSON.stringify(value));
                  });

                  alert('Sample data added! Reload the page to test restoration.');
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                🧪 Add Sample Data
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Trading Controls</h2>
          <div className="flex items-center gap-4 mb-4">
            <label className="text-sm font-medium text-gray-700">Quantity:</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleBuy}
              disabled={currentDisplayData.length === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              📈 Buy
            </button>
            <button
              onClick={handleSell}
              disabled={currentDisplayData.length === 0 || currentPosition.quantity === 0}
              className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              📉 Sell
            </button>
            <button
              onClick={handleSellAll}
              disabled={currentDisplayData.length === 0 || currentPosition.quantity === 0}
              className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              💰 Sell All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded p-3">
              <h3 className="text-sm font-medium text-gray-700">Position</h3>
              <p className="text-lg font-semibold">{currentPosition.quantity} shares @ ${currentPosition.avgPrice.toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <h3 className="text-sm font-medium text-gray-700">Total Invested</h3>
              <p className="text-lg font-semibold text-blue-600">
                ${calculateTotalInvested().toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <h3 className="text-sm font-medium text-gray-700">P&L</h3>
              <p className={`text-lg font-semibold ${calculatePnL() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${calculatePnL().toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <h3 className="text-sm font-medium text-gray-700">Transactions</h3>
              <p className="text-lg font-semibold">{transactions.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Replay Controls</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (!isReplaying) {
                  startReplay();
                } else {
                  resetReplay();
                }
              }}
              disabled={parsedData.length === 0}
              className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              ⏮️
            </button>
            {!isReplaying ? (
              <button
                onClick={startReplay}
                disabled={parsedData.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                ▶️ Play
              </button>
            ) : (
              !isPaused ? (
                <button
                  onClick={pauseReplay}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                >
                  ⏸️ Pause
                </button>
              ) : (
                <button
                  onClick={resumeReplay}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  ▶️ Play
                </button>
              )
            )}
            <button
              onClick={() => {
                if (isReplaying) {
                  setReplayIndex(replayData.length - 1);
                }
              }}
              disabled={!isReplaying}
              className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              ⏭️
            </button>
            <div className="flex-1 flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {isReplaying ? replayIndex + 1 : parsedData.length}
              </span>
              <input
                type="range"
                min="0"
                max={isReplaying ? replayData.length - 1 : parsedData.length - 1}
                value={isReplaying ? replayIndex : parsedData.length - 1}
                onChange={isReplaying ? handleProgressChange : undefined}
                disabled={!isReplaying}
                className="flex-1 disabled:opacity-50"
              />
              <span className="text-sm text-gray-600">
                {isReplaying ? replayData.length : parsedData.length}
              </span>
            </div>
            {isReplaying && (
              <button
                onClick={stopReplay}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                ⏹️ Stop
              </button>
            )}
          </div>
          {isReplaying && (
            <div className="mt-4 p-3 bg-purple-100 border border-purple-400 text-purple-700 rounded">
              Replay Progress: {replayIndex + 1} / {replayData.length} candles
              {isPaused && <span className="ml-2 font-semibold">(PAUSED)</span>}
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 mb-8 overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Market Analysis</h2>
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
              <button
                onClick={() => setGraphEngine(graphEngine === 'd3' ? 'lightweight' : 'd3')}
                className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all border ${graphEngine === 'd3' ? 'bg-white text-blue-600 shadow-sm border-white' : 'bg-white text-violet-600 shadow-sm border-white'}`}
              >
                ENGINE: {graphEngine.toUpperCase()}
              </button>
              {graphEngine === 'd3' && (
                <>
                  <button
                    onClick={() => setShowGrid(!showGrid)}
                    className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all border ${showGrid ? 'bg-white text-blue-600 shadow-sm border-white' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
                  >
                    GRID: {showGrid ? 'ON' : 'OFF'}
                  </button>
                  <button
                    onClick={() => setTooltipMode(tooltipMode === 'synced' ? 'simple' : 'synced')}
                    className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all border ${tooltipMode === 'synced' ? 'bg-white text-blue-600 shadow-sm border-white' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
                  >
                    TOOLTIP: {tooltipMode.toUpperCase()}
                  </button>
                </>
              )}
            </div>
          </div>

          {graphEngine === 'd3' ? (
            <>
              <D3CandlestickChart data={currentDisplayData} transactions={transactions} showGrid={showGrid} tooltipMode={tooltipMode} />
              <D3RSIGraph data={currentDisplayData} showGrid={showGrid} />
            </>
          ) : (
            <>
              <LightweightCandlestickChart data={currentDisplayData} transactions={transactions} />
              <LightweightRSIGraph data={currentDisplayData} />
            </>
          )}
        </div>

        {currentDisplayData.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Latest Price</h3>
              <p className="text-2xl font-bold text-green-600">
                ${currentDisplayData[currentDisplayData.length - 1]?.close || 'N/A'}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-2">24h High</h3>
              <p className="text-2xl font-bold text-gray-900">
                ${currentDisplayData.length > 0 ? Math.max(...currentDisplayData.map(d => d.high || 0)) : 'N/A'}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-2">24h Low</h3>
              <p className="text-2xl font-bold text-gray-900">
                ${currentDisplayData.length > 0 ? Math.min(...currentDisplayData.map(d => d.low || Infinity)) : 'N/A'}
              </p>
            </div>
          </div>
        )}

        {transactions.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Transaction History</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candle</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((tx, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tx.type === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                          {tx.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${tx.price.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{tx.quantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${(tx.price * tx.quantity).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{tx.index + 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
