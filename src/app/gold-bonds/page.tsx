"use client";

import { useState } from "react";
import { YearlyComparisonChart } from "@/components/yearly-comparison-chart";

interface HistoricalData {
  year: number;
  data: Array<{
    timestamp: number;
    close: number;
  }>;
}

const GOLD_BONDS = [
  "SGBFEB27", // Example bond with data
  "SGBMAY28",
  "SGBMAY29I",
  "SGBAPR28I",
  "SGBMR29XII",
  "SGBJUN28",
  "SGBSEP29VI",
  "SGBNV29VII",
  "SGBJAN30IX",
  "SGBAUG29V",
  "SGBD29VIII",
  "SGBJUL29IV",
  "SGBJUL28IV",
  "SGBJUN29II",
  "SGBJU29III",
  "SGBFEB29XI",
  "SGBJAN29IX",
  "SGBOC28VII",
  "SGBJUN30",
  "SGBJAN29X",
  "SGBMAR30X",
  "SGBSEP28VI",
  "SGBN28VIII",
  "SGBAUG30",
  "SGBAUG28V",
  "SGBDE30III",
  "SGBMAR31IV",
  "SGBSEP31II",
  "SGBJUN31I",
  "SGBDE31III",
  "SGBFEB32IV"
];

export default function GoldBondsPage() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [yearsToCompare, setYearsToCompare] = useState<number>(4);

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
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sovereign Gold Bonds</h1>
          <p className="text-gray-600">Click on a bond to view its yearly price comparison chart</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Years to Compare</label>
            <select
              value={yearsToCompare}
              onChange={(e) => setYearsToCompare(parseInt(e.target.value))}
              className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1">Last 1 year</option>
              <option value="2">Last 2 years</option>
              <option value="3">Last 3 years</option>
              <option value="4">Last 4 years</option>
              <option value="5">Last 5 years</option>
            </select>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {GOLD_BONDS.map((bond) => (
              <button
                key={bond}
                onClick={() => handleBondClick(bond)}
                disabled={isLoading}
                className={`p-4 border rounded-lg text-center transition-colors ${
                  selectedSymbol === bond
                    ? "bg-blue-100 border-blue-500 text-blue-700"
                    : "bg-gray-50 border-gray-300 hover:bg-gray-100 text-gray-700"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {bond}
              </button>
            ))}
          </div>

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

        {historicalData.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <YearlyComparisonChart data={historicalData} />
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