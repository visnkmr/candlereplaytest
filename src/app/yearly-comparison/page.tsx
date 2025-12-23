"use client";

import { useState, useEffect, useMemo } from "react";
import { D3YearlyComparisonChart, TooltipMode, YAxisMode } from "@/components/d3-yearly-comparison-chart";

interface HistoricalData {
  year: number;
  data: Array<{
    timestamp: number;
    close: number;
  }>;
}

const TOOLTIP_OPTIONS: { mode: TooltipMode; label: string }[] = [
  { mode: 'synced', label: 'Synced (Full)' },
  { mode: 'synced-minimal', label: 'Synced (Clean)' },
  { mode: 'simple', label: 'Single Year' }
];

export default function YearlyComparisonPage() {
  const [symbol, setSymbol] = useState<string>("HDFCBANK.NS");
  const [yearsToCompare, setYearsToCompare] = useState<number>(4);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [useLocalData, setUseLocalData] = useState<boolean>(true);

  // Chart options
  const [tooltipMode, setTooltipMode] = useState<TooltipMode>('synced');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [yAxisMode, setYAxisMode] = useState<YAxisMode>('percentage');

  const currentYear = new Date().getFullYear();

  // Load persistence
  useEffect(() => {
    const savedTooltipMode = localStorage.getItem('stockTooltipMode') as TooltipMode | null;
    const savedShowGrid = localStorage.getItem('stockShowGrid');
    const savedYAxisMode = localStorage.getItem('stockYAxisMode') as YAxisMode | null;

    if (savedTooltipMode) setTooltipMode(savedTooltipMode);
    if (savedShowGrid !== null) setShowGrid(savedShowGrid === 'true');
    if (savedYAxisMode) setYAxisMode(savedYAxisMode);
  }, []);

  // Save persistence
  useEffect(() => {
    localStorage.setItem('stockTooltipMode', tooltipMode);
    localStorage.setItem('stockShowGrid', String(showGrid));
    localStorage.setItem('stockYAxisMode', yAxisMode);
  }, [tooltipMode, showGrid, yAxisMode]);

  const loadLocalData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/data/hdfcbank-5year-data.json');
      const rawData = await response.json();
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
    } finally {
      setIsLoading(false);
    }
  };

  const yahooParams = useMemo(() => {
    const params: Array<{ year: number; period1: number; period2: number }> = [];
    const now = Math.floor(Date.now() / 1000);
    for (let i = 0; i <= yearsToCompare; i++) {
      const year = currentYear - i;
      const startDate = Math.floor(new Date(year, 0, 1).getTime() / 1000);
      const endDate = i === 0 ? now : Math.floor(new Date(year, 11, 31, 23, 59, 59).getTime() / 1000);
      params.push({ year, period1: startDate, period2: endDate });
    }
    return params;
  }, [yearsToCompare, currentYear]);

  const fetchHistoricalData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const results: HistoricalData[] = [];
      for (const { year, period1, period2 } of yahooParams) {
        const apiUrl = `/api/yahoo-finance?symbol=${symbol}&period1=${period1}&period2=${period2}&interval=1d`;
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`Failed to fetch ${year}`);
        const data = await response.json();
        if (data.chart?.result?.[0]) {
          const result = data.chart.result[0];
          const validData = result.timestamp
            .map((t: number, i: number) => ({ timestamp: t, close: result.indicators.quote[0].close[i] }))
            .filter((d: any) => d.close !== null);
          if (validData.length > 0) results.push({ year, data: validData });
        }
      }
      setHistoricalData(results);
    } catch (err) {
      setError("Failed to fetch historical data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadLocalData(); }, []);

  useEffect(() => {
    if (!useLocalData && symbol && symbol !== "HDFCBANK.NS") {
      fetchHistoricalData();
    }
  }, [symbol, useLocalData, yearsToCompare]);

  const cycleTooltip = () => {
    const currentIndex = TOOLTIP_OPTIONS.findIndex(opt => opt.mode === tooltipMode);
    const nextIndex = (currentIndex + 1) % TOOLTIP_OPTIONS.length;
    setTooltipMode(TOOLTIP_OPTIONS[nextIndex].mode);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-end gap-4 text-slate-800">
          <div>
            <h1 className="text-3xl font-black mb-1 font-serif tracking-tight">Price Comparison</h1>
            <p className="text-gray-500 text-sm font-medium">Analyze stock trends across different years</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-white rounded-xl p-1 border border-gray-200 shadow-sm gap-1">
              <button onClick={cycleTooltip} className="px-3 py-2 text-xs font-black rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200">
                Tooltip: {TOOLTIP_OPTIONS.find(opt => opt.mode === tooltipMode)?.label.split(' ')[1] || 'Sync'}
              </button>
              <button onClick={() => setShowGrid(!showGrid)} className={`px-3 py-2 text-xs font-black rounded-lg transition-all border ${showGrid ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                Grid: {showGrid ? 'On' : 'Off'}
              </button>
              <button onClick={() => setYAxisMode(yAxisMode === 'percentage' ? 'price' : 'percentage')} className="px-3 py-2 text-xs font-black rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200">
                Axis: {yAxisMode === 'percentage' ? '%' : '₹'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="flex flex-col gap-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Symbol</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                disabled={useLocalData}
                className="bg-white border-2 border-gray-200 rounded-lg px-3 py-2 text-sm font-bold focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Years</label>
              <select
                value={yearsToCompare}
                onChange={(e) => setYearsToCompare(parseInt(e.target.value))}
                disabled={useLocalData}
                className="bg-white border-2 border-gray-200 rounded-lg px-3 py-2 text-sm font-bold focus:border-blue-500 outline-none"
              >
                {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>{y + 1} Years Total</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-2 justify-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useLocalData}
                  onChange={(e) => setUseLocalData(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-black text-gray-600">Local Test Mode</span>
              </label>
              <button
                onClick={useLocalData ? loadLocalData : fetchHistoricalData}
                disabled={isLoading}
                className="mt-2 w-full py-2 bg-slate-900 text-white rounded-xl text-sm font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:bg-gray-400"
              >
                {isLoading ? "FETCHING..." : "RELOAD DATA"}
              </button>
            </div>
          </div>

          {error && <div className="p-4 bg-red-50 border-2 border-red-100 text-red-600 rounded-xl text-sm font-black mb-6">{error}</div>}

          {historicalData.length > 0 && (
            <div className="mt-8 border-t border-gray-100 pt-8">
              <D3YearlyComparisonChart
                data={historicalData}
                symbol={symbol}
                tooltipMode={tooltipMode}
                showGrid={showGrid}
                yAxisMode={yAxisMode}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}