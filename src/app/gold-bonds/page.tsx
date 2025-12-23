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

interface Bond {
  symbol: string;
  price: number;
  maturityDate: Date;
}

const monthMap: Record<string, number> = {
  'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6, 'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12,
  'J': 6, 'JU': 6, 'FE': 2, 'MA': 3, 'AP': 4, 'SE': 9, 'OC': 10, 'NO': 11, 'DE': 12, 'DC': 12, 'D': 12, 'MR': 3, 'JN': 6, 'JL': 7, 'AU': 8, 'SP': 9, 'NV': 11, 'JB': 6, 'FB': 2, 'MY': 5
};

function parseMaturityDate(symbol: string): Date {
  const afterSGB = symbol.slice(3); // Remove 'SGB'
  let month = 0;
  let yearStr = '';

  for (const [abbr, m] of Object.entries(monthMap)) {
    if (afterSGB.startsWith(abbr)) {
      month = m;
      const rest = afterSGB.slice(abbr.length);
      const match = rest.match(/\d{2}/);
      if (match) {
        yearStr = match[0];
        break;
      }
    }
  }

  const year = parseInt('20' + yearStr);
  return new Date(year, month - 1, 1);
}

const rawBonds = [
  { symbol: "SGBDEC2513", price: 2816.00 },
  { symbol: "SGBJAN26", price: 2831.00 },
  { symbol: "SGBMAY26", price: 3064.00 },
  { symbol: "SGBDEC26", price: 3069.00 },
  { symbol: "SGBOCT26", price: 3096.00 },
  { symbol: "SGBNOV26", price: 3133.00 },
  { symbol: "SGBJUN27", price: 3146.00 },
  { symbol: "SGBJAN27", price: 3164.00 },
  { symbol: "SGBFEB27", price: 3276.00 },
  { symbol: "SGBJUL27", price: 3393.00 },
  { symbol: "SGBSEP27", price: 3449.00 },
  { symbol: "SGBAUG27", price: 3449.00 },
  { symbol: "SGBOCT27", price: 3738.00 },
  { symbol: "SGBDC27VII", price: 3745.00 },
  { symbol: "SGBOCT27VI", price: 3785.00 },
  { symbol: "SGBJ28VIII", price: 3966.00 },
  { symbol: "SGBFEB28IX", price: 4020.00 },
  { symbol: "SGBMAR28X", price: 4210.00 },
  { symbol: "SGBMAY28", price: 4540.00 },
  { symbol: "SGBMAY29I", price: 4589.00 },
  { symbol: "SGBAPR28I", price: 4589.00 },
  { symbol: "SGBMR29XII", price: 4612.00 },
  { symbol: "SGBJUN28", price: 4627.00 },
  { symbol: "SGBSEP29VI", price: 4682.00 },
  { symbol: "SGBNV29VII", price: 4711.00 },
  { symbol: "SGBJAN30IX", price: 4736.00 },
  { symbol: "SGBAUG29V", price: 4740.00 },
  { symbol: "SGBD29VIII", price: 4741.00 },
  { symbol: "SGBJUL29IV", price: 4757.00 },
  { symbol: "SGBJUL28IV", price: 4802.00 },
  { symbol: "SGBJUN29II", price: 4839.00 },
  { symbol: "SGBJU29III", price: 4839.00 },
  { symbol: "SGBFEB29XI", price: 4862.00 },
  { symbol: "SGBJAN29IX", price: 4950.00 },
  { symbol: "SGBOC28VII", price: 5001.00 },
  { symbol: "SGBJUN30", price: 5041.00 },
  { symbol: "SGBJAN29X", price: 5054.00 },
  { symbol: "SGBMAR30X", price: 5059.00 },
  { symbol: "SGBSEP28VI", price: 5067.00 },
  { symbol: "SGBN28VIII", price: 5127.00 },
  { symbol: "SGBAUG30", price: 5147.00 },
  { symbol: "SGBAUG28V", price: 5284.00 },
  { symbol: "SGBDE30III", price: 5359.00 },
  { symbol: "SGBMAR31IV", price: 5561.00 },
  { symbol: "SGBSEP31II", price: 5873.00 },
  { symbol: "SGBJUN31I", price: 5876.00 },
  { symbol: "SGBDE31III", price: 6149.00 },
  { symbol: "SGBFEB32IV", price: 6213.00 }
];

const GOLD_BONDS: Bond[] = rawBonds.map(bond => ({
  ...bond,
  maturityDate: parseMaturityDate(bond.symbol)
}));

const TOOLTIP_OPTIONS: { mode: TooltipMode; label: string }[] = [
  { mode: 'synced', label: 'Synced (Full)' },
  { mode: 'synced-minimal', label: 'Synced (Clean)' },
  { mode: 'simple', label: 'Single Year' }
];

export default function GoldBondsPage() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [yearsToCompare, setYearsToCompare] = useState<number>(4);
  const [sortBy, setSortBy] = useState<'symbol' | 'price' | 'maturity'>('symbol');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [minDaysRemaining, setMinDaysRemaining] = useState<number>(0);
  const [layout, setLayout] = useState<'table' | 'cards' | 'minimal'>('table');
  const [useLocalData, setUseLocalData] = useState<boolean>(true);
  const [isSelectorExpanded, setIsSelectorExpanded] = useState<boolean>(true);
  const [tooltipMode, setTooltipMode] = useState<TooltipMode>('synced');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [yAxisMode, setYAxisMode] = useState<YAxisMode>('percentage');

  const currentDate = new Date();

  // Load persistence from localStorage
  useEffect(() => {
    const savedSymbol = localStorage.getItem('lastSelectedBond');
    const savedData = localStorage.getItem('lastHistoricalData');
    const savedLayout = localStorage.getItem('lastLayout') as 'table' | 'cards' | 'minimal' | null;
    const savedTooltipMode = localStorage.getItem('tooltipMode') as TooltipMode | null;
    const savedShowGrid = localStorage.getItem('showGrid');
    const savedYAxisMode = localStorage.getItem('yAxisMode') as YAxisMode | null;

    if (savedSymbol) setSelectedSymbol(savedSymbol);
    if (savedData) setHistoricalData(JSON.parse(savedData));
    if (savedLayout) setLayout(savedLayout);
    if (savedTooltipMode) setTooltipMode(savedTooltipMode);
    if (savedShowGrid !== null) setShowGrid(savedShowGrid === 'true');
    if (savedYAxisMode) setYAxisMode(savedYAxisMode);

    if (savedSymbol && savedData && savedLayout !== 'minimal') {
      setIsSelectorExpanded(false);
    }
  }, []);

  // Save persistence to localStorage
  useEffect(() => {
    if (selectedSymbol) localStorage.setItem('lastSelectedBond', selectedSymbol);
    if (historicalData.length > 0) localStorage.setItem('lastHistoricalData', JSON.stringify(historicalData));
    localStorage.setItem('lastLayout', layout);
    localStorage.setItem('tooltipMode', tooltipMode);
    localStorage.setItem('showGrid', String(showGrid));
    localStorage.setItem('yAxisMode', yAxisMode);
  }, [selectedSymbol, historicalData, layout, tooltipMode, showGrid, yAxisMode]);

  const sortedBonds = useMemo(() => {
    return [...GOLD_BONDS]
      .filter((bond) => {
        const remainingDays = Math.ceil((bond.maturityDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        return remainingDays >= minDaysRemaining;
      })
      .sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'price':
            comparison = a.price - b.price;
            break;
          case 'maturity':
            comparison = a.maturityDate.getTime() - b.maturityDate.getTime();
            break;
          default:
            comparison = a.symbol.localeCompare(b.symbol);
            break;
        }
        return sortOrder === 'desc' ? -comparison : comparison;
      });
  }, [sortBy, sortOrder, minDaysRemaining]);

  const handleSort = (field: 'symbol' | 'price' | 'maturity') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const currentYear = new Date().getFullYear();

  const fetchHistoricalData = async (symbol: string) => {
    setIsLoading(true);
    setError("");

    try {
      const results: HistoricalData[] = [];
      for (let i = 0; i <= yearsToCompare; i++) {
        const year = currentYear - i;
        const fromDate = `01-01-${year}`;
        const toDate = `31-12-${year}`;

        const apiUrl = `/api/nse-gold-bonds?symbol=${symbol}&fromDate=${fromDate}&toDate=${toDate}`;
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`Failed to fetch for ${year}`);

        const data = await response.json();
        if (data.data && data.data.length > 0) {
          results.push({
            year,
            data: data.data.sort((a: any, b: any) => a.timestamp - b.timestamp)
          });
        }
      }
      setHistoricalData(results);
    } catch (err) {
      setError("Failed to fetch historical data.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBondClick = (symbol: string) => {
    setSelectedSymbol(symbol);
    fetchHistoricalData(symbol);
    if (layout !== 'minimal') {
      setIsSelectorExpanded(false);
    }
  };

  const cycleTooltip = () => {
    const currentIndex = TOOLTIP_OPTIONS.findIndex(opt => opt.mode === tooltipMode);
    const nextIndex = (currentIndex + 1) % TOOLTIP_OPTIONS.length;
    setTooltipMode(TOOLTIP_OPTIONS[nextIndex].mode);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-end gap-4 text-slate-900">
          <div>
            <h1 className="text-3xl font-black mb-1 font-serif tracking-tight">Sovereign Gold Bonds</h1>
            <p className="text-gray-500 text-sm font-medium">Historical performance and maturity analysis</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-white rounded-xl p-1 border border-gray-200 shadow-sm gap-1">
              <button
                onClick={cycleTooltip}
                className="px-3 py-2 text-xs font-black rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 transition-all border border-slate-200"
              >
                Tooltip: {TOOLTIP_OPTIONS.find(opt => opt.mode === tooltipMode)?.label.split(' ')[1] || 'Sync'}
              </button>

              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`px-3 py-2 text-xs font-black rounded-lg transition-all border ${showGrid ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
              >
                Grid: {showGrid ? 'On' : 'Off'}
              </button>

              <button
                onClick={() => setYAxisMode(yAxisMode === 'percentage' ? 'price' : 'percentage')}
                className="px-3 py-2 text-xs font-black rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 transition-all border border-slate-200"
              >
                Axis: {yAxisMode === 'percentage' ? '%' : '₹'}
              </button>
            </div>

            {selectedSymbol && (
              <button
                onClick={() => setIsSelectorExpanded(!isSelectorExpanded)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-xl shadow-sm text-sm font-black text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {isSelectorExpanded ? 'Hide Selection' : 'Change Bond'}
              </button>
            )}
          </div>
        </div>

        {isSelectorExpanded && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex flex-wrap items-center justify-between gap-6 mb-8 border-b border-gray-100 pb-6">
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                  <input
                    type="checkbox"
                    id="localData"
                    checked={useLocalData}
                    onChange={(e) => setUseLocalData(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="localData" className="text-sm font-black text-gray-700 cursor-pointer">Local Debug</label>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-gray-700">Min Days:</span>
                  <input
                    type="number"
                    value={minDaysRemaining}
                    onChange={(e) => setMinDaysRemaining(parseInt(e.target.value) || 0)}
                    className="w-20 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-gray-700">Compare:</span>
                  <select
                    value={yearsToCompare}
                    onChange={(e) => setYearsToCompare(parseInt(e.target.value))}
                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>{y} Years</option>)}
                  </select>
                </div>
              </div>

              <div className="flex bg-gray-100 p-1 rounded-xl">
                {(['minimal', 'table', 'cards'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => {
                      setLayout(l);
                      if (l === 'minimal') setIsSelectorExpanded(true);
                    }}
                    className={`px-4 py-1.5 text-xs font-black rounded-lg capitalize transition-all ${layout === l ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {layout === 'minimal' ? (
              <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[300px]">
                {sortedBonds.map(bond => (
                  <button
                    key={bond.symbol}
                    onClick={() => handleBondClick(bond.symbol)}
                    className={`px-4 py-2 rounded-xl text-xs font-black border-2 transition-all flex flex-col items-center ${selectedSymbol === bond.symbol ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-50 border-gray-100 text-gray-600 hover:border-blue-300 hover:bg-white hover:text-blue-600'}`}
                  >
                    <span>{bond.symbol}</span>
                    <span className={`text-[9px] opacity-70`}>₹{(bond.price * 0.025).toFixed(0)}/yr</span>
                  </button>
                ))}
              </div>
            ) : layout === 'table' ? (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 font-sans">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-blue-600" onClick={() => handleSort('symbol')}>Symbol {sortBy === 'symbol' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                      <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-blue-600" onClick={() => handleSort('price')}>Face Value {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                      <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Interest/Yr</th>
                      <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-blue-600" onClick={() => handleSort('maturity')}>Maturity {sortBy === 'maturity' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                      <th className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {sortedBonds.map((bond) => (
                      <tr key={bond.symbol} className={`hover:bg-blue-50/50 transition-colors ${selectedSymbol === bond.symbol ? 'bg-blue-50/70' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{bond.symbol}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">₹{bond.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 font-bold">₹{(bond.price * 0.025).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{bond.maturityDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button onClick={() => handleBondClick(bond.symbol)} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${selectedSymbol === bond.symbol ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Select Bond</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sortedBonds.map((bond) => (
                  <button
                    key={bond.symbol}
                    onClick={() => handleBondClick(bond.symbol)}
                    className={`p-5 border-2 rounded-2xl text-left transition-all group ${selectedSymbol === bond.symbol ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200" : "bg-white border-gray-100 hover:border-blue-200 hover:shadow-lg"}`}
                  >
                    <div className="font-black text-xl mb-1 tracking-tight">{bond.symbol}</div>
                    <div className="flex justify-between items-center mb-1">
                      <div className={`text-xs font-bold ${selectedSymbol === bond.symbol ? 'text-blue-100' : 'text-gray-400'}`}>Face Value: ₹{bond.price.toLocaleString('en-IN')}</div>
                      <div className={`text-xs font-black ${selectedSymbol === bond.symbol ? 'text-white' : 'text-emerald-600'}`}>+ ₹{(bond.price * 0.025).toFixed(2)} Int.</div>
                    </div>
                    <div className={`text-sm font-black mt-3 flex items-center gap-1 ${selectedSymbol === bond.symbol ? 'text-white' : 'text-blue-600'}`}>
                      <span className="opacity-50 text-[10px]">MATURES</span>
                      {bond.maturityDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {historicalData.length > 0 && (
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8">
            <D3YearlyComparisonChart
              data={historicalData}
              symbol={selectedSymbol}
              tooltipMode={tooltipMode}
              showGrid={showGrid}
              yAxisMode={yAxisMode}
            />
          </div>
        )}

        {error && <div className="mt-8 p-6 bg-red-50 border-2 border-red-100 text-red-600 rounded-2xl text-sm font-black text-center shadow-sm">{error}</div>}
      </div>
    </div>
  );
}