"use client";

import { useState, useEffect, useMemo } from "react";
import { D3YearlyComparisonChart } from "@/components/d3-yearly-comparison-chart";

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

  // Find month abbr
  for (const [abbr, m] of Object.entries(monthMap)) {
    if (afterSGB.startsWith(abbr)) {
      month = m;
      const rest = afterSGB.slice(abbr.length);
      // Find 2 digits for year
      const match = rest.match(/\d{2}/);
      if (match) {
        yearStr = match[0];
        break;
      }
    }
  }

  const year = parseInt('20' + yearStr);
  return new Date(year, month - 1, 1); // Maturity at start of month
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

export default function GoldBondsPage() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [yearsToCompare, setYearsToCompare] = useState<number>(4);
  const [sortBy, setSortBy] = useState<'symbol' | 'price' | 'maturity'>('symbol');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [minDaysRemaining, setMinDaysRemaining] = useState<number>(0);
  const [layout, setLayout] = useState<'table' | 'cards'>('table');
  const [useLocalData, setUseLocalData] = useState<boolean>(true);
  const [isSelectorExpanded, setIsSelectorExpanded] = useState<boolean>(true);

  const currentDate = new Date();

  // Load local gold bond data for testing
  const loadLocalData = async () => {
    try {
      setIsLoading(true);
      const cachedData = localStorage.getItem('goldBondData');
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        setHistoricalData(parsedData);
        setError("");
        setIsLoading(false);
        return;
      }

      // Use hardcoded test data for SGBFEB27 2022
      const results: HistoricalData[] = [{
        year: 2022,
        data: [
          { timestamp: 1640995200, close: 4601.03 },
          { timestamp: 1643673600, close: 4650 },
          { timestamp: 1646092800, close: 4700 },
          { timestamp: 1648771200, close: 4750 },
          { timestamp: 1651363200, close: 4800 },
          { timestamp: 1654041600, close: 4850 },
          { timestamp: 1656633600, close: 4900 },
          { timestamp: 1659312000, close: 4950 },
          { timestamp: 1661990400, close: 5000 },
          { timestamp: 1664582400, close: 5050 },
          { timestamp: 1667260800, close: 5100 },
          { timestamp: 1669852800, close: 5150 }
        ]
      }];

      localStorage.setItem('goldBondData', JSON.stringify(results));
      setHistoricalData(results);
      setError("");
    } catch (err) {
      setError("Failed to load local test data.");
      console.error("Error loading local data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field: 'symbol' | 'price' | 'maturity') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Load initial data
  useEffect(() => {
    if (useLocalData) {
      loadLocalData();
    }
  }, [useLocalData]);

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

        if (!response.ok) {
          throw new Error(`Failed to fetch data for ${year}`);
        }

        const data = await response.json();

        if (data.data && data.data.length > 0) {
          results.push({
            year,
            data: data.data.sort((a: { timestamp: number }, b: { timestamp: number }) => a.timestamp - b.timestamp)
          });
        }
      }

      setHistoricalData(results);
    } catch (err) {
      setError("Failed to fetch historical data. Please try again.");
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBondClick = (symbol: string) => {
    setSelectedSymbol(symbol);
    fetchHistoricalData(symbol);
    setIsSelectorExpanded(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Sovereign Gold Bonds</h1>
            <p className="text-gray-600">Click on a bond to view its yearly price comparison chart</p>
          </div>
          {selectedSymbol && (
            <button
              onClick={() => setIsSelectorExpanded(!isSelectorExpanded)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {isSelectorExpanded ? 'Collapse Selector' : 'Select Another Bond'}
            </button>
          )}
        </div>

        {isSelectorExpanded && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useLocalData}
                    onChange={(e) => setUseLocalData(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Use Local Test Data</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Uncheck to fetch live data from NSE API
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min Days Remaining</label>
                <input
                  type="number"
                  value={minDaysRemaining}
                  onChange={(e) => setMinDaysRemaining(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Years to Compare</label>
                <select
                  value={yearsToCompare}
                  onChange={(e) => setYearsToCompare(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="1">Last 1 year</option>
                  <option value="2">Last 2 years</option>
                  <option value="3">Last 3 years</option>
                  <option value="4">Last 4 years</option>
                  <option value="5">Last 5 years</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <label className="text-sm font-medium text-gray-700">Layout:</label>
                <button
                  onClick={() => setLayout('table')}
                  className={`px-3 py-1 text-sm rounded ${layout === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  Table
                </button>
                <button
                  onClick={() => setLayout('cards')}
                  className={`px-3 py-1 text-sm rounded ${layout === 'cards' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  Cards
                </button>
              </div>
            </div>

            {layout === 'table' ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th
                        className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b cursor-pointer hover:bg-gray-200"
                        onClick={() => handleSort('symbol')}
                      >
                        Symbol {sortBy === 'symbol' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b cursor-pointer hover:bg-gray-200"
                        onClick={() => handleSort('price')}
                      >
                        Face Value {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Interest/Year</th>
                      <th
                        className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b cursor-pointer hover:bg-gray-200"
                        onClick={() => handleSort('maturity')}
                      >
                        Maturity {sortBy === 'maturity' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Tenure</th>
                      <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBonds.map((bond) => {
                      const interestPerYear = (bond.price * 0.025).toFixed(2);
                      const remainingDays = Math.ceil((bond.maturityDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
                      const maturityStr = bond.maturityDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                      const tenureStr = remainingDays > 0 ? `${remainingDays} days` : 'Matured';
                      return (
                        <tr
                          key={bond.symbol}
                          className={`hover:bg-gray-50 ${selectedSymbol === bond.symbol ? 'bg-blue-50' : ''
                            }`}
                        >
                          <td className="px-4 py-2 text-sm text-gray-900 border-b">{bond.symbol}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border-b">₹{bond.price.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border-b">₹{interestPerYear}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border-b">{maturityStr}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 border-b">{tenureStr}</td>
                          <td className="px-4 py-2 text-center border-b">
                            <button
                              onClick={() => handleBondClick(bond.symbol)}
                              disabled={isLoading}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                              {isLoading ? 'Loading...' : 'Select'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedBonds.map((bond) => {
                  const interestPerYear = (bond.price * 0.025).toFixed(2);
                  const remainingDays = Math.ceil((bond.maturityDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
                  const maturityStr = bond.maturityDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                  const tenureStr = remainingDays > 0 ? `${remainingDays} days remaining` : 'Matured';
                  return (
                    <button
                      key={bond.symbol}
                      onClick={() => handleBondClick(bond.symbol)}
                      disabled={isLoading}
                      className={`p-4 border rounded-lg text-left transition-colors ${selectedSymbol === bond.symbol
                        ? "bg-blue-100 border-blue-500 text-blue-700"
                        : "bg-gray-50 border-gray-300 hover:bg-gray-100 text-gray-700"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className="font-semibold">{bond.symbol}</div>
                      <div className="text-sm">Face Value: ₹{bond.price.toFixed(2)}</div>
                      <div className="text-sm">Interest/year: ₹{interestPerYear}</div>
                      <div className="text-sm">Maturity: {maturityStr}</div>
                      <div className="text-sm">Tenure: {tenureStr}</div>
                    </button>
                  );
                })}
              </div>
            )}

            {error && (
              <div className="mt-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            {selectedSymbol && (
              <div className="mt-4 text-sm text-gray-600">
                <p><strong>Selected Bond:</strong> {selectedSymbol}</p>
              </div>
            )}
          </div>
        )}

        {historicalData.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <D3YearlyComparisonChart data={historicalData} symbol={selectedSymbol} />
          </div>
        )}

        {selectedSymbol && historicalData.length === 0 && !isLoading && !error && (
          <div className="bg-white rounded-lg shadow-lg p-6 text-center text-gray-500">
            No data available for {selectedSymbol}
          </div>
        )}
      </div>
    </div>
  );
}