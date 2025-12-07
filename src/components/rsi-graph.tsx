"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, CrosshairMode, LineSeries } from "lightweight-charts";
import { CandlestickData } from "@/data/candlestick-data";

interface RSIGraphProps {
  data: CandlestickData[];
}

export function RSIGraph({ data }: RSIGraphProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 200,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#374151",
        attributionLogo: false
      },
      grid: {
        vertLines: { color: "#f3f4f6" },
        horzLines: { color: "#f3f4f6" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: "#e5e7eb",
        textColor: "#374151",
      },
      timeScale: {
        borderColor: "#e5e7eb",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const rsiSeries = chart.addSeries(LineSeries, {
      color: "#8b5cf6",
      lineWidth: 2,
      title: "RSI",
    });

    // Add overbought/oversold lines
    const overboughtSeries = chart.addSeries(LineSeries, {
      color: "#ef4444",
      lineWidth: 1,
      lineStyle: 2, // dashed
      title: "Overbought (70)",
    });

    const oversoldSeries = chart.addSeries(LineSeries, {
      color: "#10b981",
      lineWidth: 1,
      lineStyle: 2, // dashed
      title: "Oversold (30)",
    });

    chartRef.current = chart;
    seriesRef.current = { rsiSeries, overboughtSeries, oversoldSeries };

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      const rsiData = data
        .filter(d => d.rsi !== undefined)
        .map(item => ({
          time: item.timestamp as any,
          value: item.rsi!
        }));

      const overboughtData = data.map(item => ({
        time: item.timestamp as any,
        value: 70
      }));

      const oversoldData = data.map(item => ({
        time: item.timestamp as any,
        value: 30
      }));

      seriesRef.current.rsiSeries.setData(rsiData);
      seriesRef.current.overboughtSeries.setData(overboughtData);
      seriesRef.current.oversoldSeries.setData(oversoldData);
    }
  }, [data]);

  return (
    <div className="w-full p-4">
      <div className="mb-2">
        <h3 className="text-lg font-semibold text-gray-900">RSI (14)</h3>
        <div className="flex gap-4 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-red-500"></div> Overbought (70)
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-green-500"></div> Oversold (30)
          </span>
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}