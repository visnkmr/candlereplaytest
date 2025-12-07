"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, CrosshairMode, CandlestickSeries, HistogramSeries } from "lightweight-charts";
import { CandlestickData } from "@/data/candlestick-data";

interface CandlestickChartProps {
  data: CandlestickData[];
}

export function CandlestickChart({ data }: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#374151",
        attributionLogo:false
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
        // textColor: "#374151",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries,{
      upColor: "#10b981",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      borderUpColor: "#10b981",
      wickDownColor: "#ef4444",
      wickUpColor: "#10b981",
    });

    // const volumeSeries = chart.addSeries(HistogramSeries,{
    //   color: "#3b82f6",
    //   priceFormat: {
    //     type: "volume",
    //   },
    //   priceScaleId: "volume",
    //   // scaleMargins: {
    //   //   top: 0.8,
    //   //   bottom: 0,
    //   // },
    // });

    const candlestickData = data.map(item => ({
      time: item.timestamp as any,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    const volumeData = data.map(item => ({
      time: item.timestamp as any,
      value: item.volume,
      color: item.close > item.open ? "#10b981" : "#ef4444",
    }));

    candlestickSeries.setData(candlestickData);
    // volumeSeries.setData(volumeData);

    chartRef.current = chart;

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
  }, [data]);

  return (
    <div className="w-full p-4">
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}