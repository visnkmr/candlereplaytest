"use client";

import { useState, useEffect, useMemo } from "react";
import { YearlyComparisonChart } from "@/components/yearly-comparison-chart";

interface HistoricalData {
  year: number;
  data: Array<{
    timestamp: number;
    close: number;
  }>;
}

export default function YearlyComparisonPage() {
  const [symbol, setSymbol] = useState<string>("HDFCBANK.NS");
  const [yearsToCompare, setYearsToCompare] = useState<number>(4); // Show 5 years total (current + 4 previous)
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [useLocalData, setUseLocalData] = useState<boolean>(true);

  const currentYear = new Date().getFullYear();

  // Load local HDFC Bank data for testing
  const loadLocalData = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching local data...');
      const response = await fetch('/data/hdfcbank-5year-data.json');
      console.log('Response status:', response.status);
      const rawData = await response.json();
      console.log('Loaded data:', rawData.length, 'years');

      // Transform data to only include timestamp and close (actual prices)
      const transformedData = rawData.map((yearData: any) => ({
        year: yearData.year,
        data: yearData.data.map((item: any) => ({
          timestamp: item.timestamp,
          close: item.close
        }))
      }));

      setHistoricalData(transformedData as HistoricalData[]);
      setSymbol("HDFCBANK.NS");
      setYearsToCompare(4);
      setError("");
    } catch (err) {
      setError("Failed to load local test data.");
      console.error("Error loading local data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate parameters for each year
  const yahooParams = useMemo(() => {
    const params: Array<{ year: number; period1: number; period2: number }> = [];
    const now = Math.floor(Date.now() / 1000);

    for (let i = 0; i <= yearsToCompare; i++) {
      const year = currentYear - i;
      // Start of year
      const startDate = Math.floor(new Date(year, 0, 1).getTime() / 1000);
      // End of year (or current time if it's the current year)
      const endDate = i === 0 ? now : Math.floor(new Date(year, 11, 31, 23, 59, 59).getTime() / 1000);

      params.push({ year, period1: startDate, period2: endDate });
    }

    return params;
  }, [symbol, yearsToCompare, currentYear]);

  const fetchHistoricalData = async () => {
    setIsLoading(true);
    setError("");

    try {
      const results: HistoricalData[] = [];

      for (const { year, period1, period2 } of yahooParams) {
        const apiUrl = `/api/yahoo-finance?symbol=${symbol}&period1=${period1}&period2=${period2}&interval=1d`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
          throw new Error(`Failed to fetch data for ${year}`);
        }

        const data = await response.json();

        if (data.chart?.result?.[0]) {
          const result = data.chart.result[0];
          const timestamps = result.timestamp;
          const closes = result.indicators.quote[0].close;

          // Filter out null values and get valid data points
          const validData = timestamps
            .map((timestamp: number, index: number) => {
              const close = closes[index];
              return close !== null ? { timestamp, close } : null;
            })
            .filter(Boolean);

          if (validData.length > 0) {
            // Keep actual prices
            const priceData = validData.map((item: any) => ({
              timestamp: item.timestamp,
              close: item.close
            }));

            results.push({
              year,
              data: priceData
            });
          }
        }
      }

      setHistoricalData(results);
    } catch (err) {
      setError("Failed to fetch historical data. Please check the symbol and try again.");
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    console.log('Loading initial data...');
    loadLocalData();
  }, []);

  // Handle data loading based on mode
  useEffect(() => {
    if (!useLocalData && symbol && symbol !== "HDFCBANK.NS") {
      fetchHistoricalData();
    }
  }, [symbol, yearsToCompare, yahooParams, useLocalData]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Yearly Price Comparison</h1>
          <p className="text-gray-600">Compare stock price trends across years on the same percentage scale</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={useLocalData}
                onChange={(e) => setUseLocalData(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Use Local HDFC Bank Test Data</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Uncheck to fetch live data from Yahoo Finance API
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g., AAPL, MSFT"
                disabled={useLocalData}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Years to Compare</label>
              <select
                value={yearsToCompare}
                onChange={(e) => setYearsToCompare(parseInt(e.target.value))}
                disabled={useLocalData}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="1">Last 1 year</option>
                <option value="2">Last 2 years</option>
                <option value="3">Last 3 years</option>
                <option value="4">Last 4 years</option>
                <option value="5">Last 5 years</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={useLocalData ? loadLocalData : fetchHistoricalData}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? "Loading..." : useLocalData ? "Load Test Data" : "Refresh Data"}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-2 bg-red-100 border border-red-400 text-red-700 rounded mb-4">
              {error}
            </div>
          )}

          <div className="text-sm text-gray-600">
            <p><strong>How it works:</strong></p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Shows actual stock prices for each year</li>
              <li>All years are aligned by calendar date for comparison</li>
              <li>Compare price trends and levels across different years for the same time period</li>
              <li><strong>Test Mode:</strong> Uses pre-fetched HDFC Bank data for reliable testing</li>
              <li><strong>Live Mode:</strong> Fetches real-time data from Yahoo Finance</li>
            </ul>
          </div>
        </div>

        {historicalData.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <YearlyComparisonChart data={historicalData} />
          </div>
        )}

        {historicalData.length === 0 && !isLoading && !error && (
          <div className="bg-white rounded-lg shadow-lg p-6 text-center text-gray-500">
            Enter a stock symbol to view the yearly comparison chart
          </div>
        )}
      </div>
    </div>
  );
}