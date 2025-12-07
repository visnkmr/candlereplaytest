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
  const seriesRef = useRef<any>(null);

  // Sync with RSI chart
  useEffect(() => {
    if (chartRef.current) {
      const syncCharts = () => {
        const rsiChart = (window as any).rsiChart;
        if (rsiChart && chartRef.current) {
          // Sync time scale
          const timeScale = chartRef.current.timeScale();
          const rsiTimeScale = rsiChart.timeScale();
          
          // Get visible range from candlestick chart
          const visibleRange = timeScale.getVisibleLogicalRange();
          if (visibleRange) {
            rsiTimeScale.setVisibleLogicalRange(visibleRange);
          }
        }
      };

      // Set up crosshair sync
      chartRef.current.subscribeCrosshairMove((param: any) => {
        const rsiChart = (window as any).rsiChart;
        if (rsiChart && param.time) {
          rsiChart.crosshairMove(param);
        }
      });

      // Listen for RSI chart changes
      const rsiChart = (window as any).rsiChart;
      if (rsiChart) {
        rsiChart.timeScale().subscribeVisibleLogicalRangeChange(() => {
          syncCharts();
        });
        
        rsiChart.subscribeCrosshairMove((param: any) => {
          if (chartRef.current && param.time) {
            chartRef.current.crosshairMove(param);
          }
        });
      }

      // Initial sync
      syncCharts();
    }
  }, []);

  // Expose chart instance for syncing
  useEffect(() => {
    if (chartRef.current) {
      (window as any).candlestickChart = chartRef.current;
    }
    return () => {
      delete (window as any).candlestickChart;
    };
  }, []);

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

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

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
      const candlestickData = data.map(item => ({
        time: item.timestamp as any,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      }));
      
      seriesRef.current.setData(candlestickData);
    }
  }, [data]);

  return (
    <div className="w-full p-4">
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}