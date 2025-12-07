"use client";

import { useState, useEffect } from "react";
import { CandlestickChart } from "@/components/candlestick-chart";
import { sampleCandlestickData, CandlestickData, ExampleData, parseExampleData, exampleData } from "@/data/candlestick-data";

export default function Home() {
  const [jsonData, setJsonData] = useState<string>(JSON.stringify(exampleData, null, 2));
  const [parsedData, setParsedData] = useState<CandlestickData[]>([]);
  const [error, setError] = useState<string>("");
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [replayData, setReplayData] = useState<CandlestickData[]>([]);
  const [replayIndex, setReplayIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Parse initial data on mount
  useEffect(() => {
    try {
      const parsed = JSON.parse(jsonData) as ExampleData;
      const candlestickData = parseExampleData(parsed);
      setParsedData(candlestickData);
    } catch (err) {
      setError("Invalid JSON format. Please check your input.");
    }
  }, []);

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

  const handleParseJson = () => {
    try {
      const parsed = JSON.parse(jsonData) as ExampleData;
      const candlestickData = parseExampleData(parsed);
      setParsedData(candlestickData);
      setError("");
    } catch (err) {
      setError("Invalid JSON format. Please check your input.");
    }
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

  const currentDisplayData = isReplaying ? replayData.slice(0, replayIndex + 1) : parsedData;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Candlestick Chart</h1>
          <p className="text-gray-600">Interactive candlestick chart with JSON input</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">JSON Input</h2>
          <textarea
            value={jsonData}
            onChange={(e) => setJsonData(e.target.value)}
            placeholder="Enter JSON data in ExampleData format..."
            className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {error && (
            <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          <div className="mt-4 flex gap-4">
            <button
              onClick={handleParseJson}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Parse & Display
            </button>
            <button
              onClick={() => convertToCSV(parsedData)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Download as CSV
            </button>
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
          </div>
          {isReplaying && (
            <div className="mt-4 p-3 bg-purple-100 border border-purple-400 text-purple-700 rounded">
              Replay Progress: {replayIndex + 1} / {replayData.length} candles
              {isPaused && <span className="ml-2 font-semibold">(PAUSED)</span>}
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <CandlestickChart data={currentDisplayData} />
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
      </div>
    </div>
  );
}
