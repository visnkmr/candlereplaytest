"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, CrosshairMode, LineSeries } from "lightweight-charts";

interface HistoricalData {
  year: number;
  data: Array<{
    timestamp: number;
    close: number;
    percentage: number;
  }>;
}

interface YearlyComparisonChartProps {
  data: HistoricalData[];
}

const YEAR_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // green
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
];

export function YearlyComparisonChart({ data }: YearlyComparisonChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRefs = useRef<any[]>([]);
  const pricesRef = useRef<Record<number, Record<number, number>>>({});

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
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

    chartRef.current = chart;
    seriesRefs.current = [];

    // Add series for each year
    data.forEach((yearData, index) => {
      const color = YEAR_COLORS[index % YEAR_COLORS.length];
      const series = chart.addSeries(LineSeries, {
        color,
        lineWidth: 2,
        title: `${yearData.year}`,
        priceFormat: {
          type: 'custom',
          formatter: (price: number) => `${price > 0 ? '+' : ''}${price.toFixed(2)}%`,
        },
      });
      seriesRefs.current.push(series);
    });

    // Create tooltip element
    const container = chartContainerRef.current;
    const toolTip = document.createElement('div');
    toolTip.style.width = '200px';
    toolTip.style.height = 'auto';
    toolTip.style.position = 'absolute';
    toolTip.style.display = 'none';
    toolTip.style.padding = '10px';
    toolTip.style.boxSizing = 'border-box';
    toolTip.style.fontSize = '12px';
    toolTip.style.textAlign = 'left';
    toolTip.style.zIndex = '1000';
    toolTip.style.top = '12px';
    toolTip.style.left = '12px';
    toolTip.style.pointerEvents = 'none';
    toolTip.style.border = '1px solid #e5e7eb';
    toolTip.style.borderRadius = '6px';
    toolTip.style.background = 'rgba(255, 255, 255, 0.95)';
    toolTip.style.color = '#1f2937';
    toolTip.style.backdropFilter = 'blur(4px)';
    toolTip.style.boxShadow = '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)';
    container.appendChild(toolTip);

    // Subscribe to crosshair move events to show markers on all series and update tooltip
    chart.subscribeCrosshairMove((param: any) => {
      if (!param.time || !param.seriesPrices || param.point === undefined || param.point.x < 0 || param.point.y < 0) {
        // Clear markers and hide tooltip when mouse leaves
        seriesRefs.current.forEach(series => {
          if (series) series.setMarkers([]);
        });
        toolTip.style.display = 'none';
        return;
      }

      toolTip.style.display = 'block';
      let tooltipHtml = `<div style="font-weight: 700; margin-bottom: 6px; border-bottom: 1px solid #f3f4f6; padding-bottom: 4px;">Performance</div>`;

      const time = param.time as number;
      const pricesAtTime = pricesRef.current[time] || {};

      // Create markers for each series at the current crosshair time
      seriesRefs.current.forEach((series, index) => {
        if (series && data[index]) {
          const percentageChange = param.seriesPrices.get(series);
          const actualPrice = pricesAtTime[data[index].year];

          if (percentageChange !== undefined && actualPrice !== undefined) {
            const color = YEAR_COLORS[index % YEAR_COLORS.length];
            const marker = {
              time: param.time,
              position: 'inBar' as const,
              color: color,
              shape: 'circle' as const,
              size: 0.8,
            };
            series.setMarkers([marker]);

            tooltipHtml += `
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                <div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${color};"></div>
                <span style="color: #4b5563;">${data[index].year}:</span>
                <span style="font-weight: 600; margin-left: auto;">₹${actualPrice.toFixed(2)}</span>
                <span style="font-weight: 500; font-size: 10px; color: ${percentageChange >= 0 ? '#10b981' : '#ef4444'}; min-width: 45px; text-align: right;">
                  ${percentageChange >= 0 ? '+' : ''}${percentageChange.toFixed(2)}%
                </span>
              </div>
            `;
          } else {
            series.setMarkers([]);
          }
        }
      });

      toolTip.innerHTML = tooltipHtml;

      // Position tooltip
      const toolTipWidth = 200;
      const toolTipHeight = 150;
      const toolTipMargin = 15;

      let left = param.point.x + toolTipMargin;
      if (left > container.clientWidth - toolTipWidth) {
        left = param.point.x - toolTipMargin - toolTipWidth;
      }

      let top = param.point.y + toolTipMargin;
      if (top > container.clientHeight - toolTipHeight) {
        top = param.point.y - toolTipMargin - toolTipHeight;
      }

      toolTip.style.left = left + 'px';
      toolTip.style.top = top + 'px';
    });

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
      if (container.contains(toolTip)) {
        container.removeChild(toolTip);
      }
    };
  }, [data.length]);

  useEffect(() => {
    if (seriesRefs.current.length > 0 && data.length > 0) {
      // Clear existing data and prices map
      seriesRefs.current.forEach(series => {
        if (series) series.setData([]);
      });
      pricesRef.current = {};

      // Set new data for each series
      data.forEach((yearData, index) => {
        const series = seriesRefs.current[index];
        if (series && yearData.data.length > 0) {
          // Find the first value to use as 0% baseline
          const initialPrice = yearData.data[0].close;
          const currentYearVal = yearData.year;

          // Normalize all timestamps to start from January 1st of a common year (2024)
          const chartData = yearData.data.map(item => {
            const itemDate = new Date(item.timestamp * 1000);
            const baseYear = itemDate.getFullYear();
            const dayOfYear = Math.floor((itemDate.getTime() - new Date(baseYear, 0, 0).getTime()) / (1000 * 60 * 60 * 24));

            // Create a timestamp for the same day in 2024
            const normalizedDate = new Date(2024, 0, dayOfYear + 1); // +1 because dayOfYear is 0-based
            const time = Math.floor(normalizedDate.getTime() / 1000);

            // Store actual price for tooltip
            if (!pricesRef.current[time]) {
              pricesRef.current[time] = {};
            }
            pricesRef.current[time][currentYearVal] = item.close;

            // Calculate percentage change
            const percentageChange = ((item.close / initialPrice) - 1) * 100;

            return {
              time: time as any,
              value: percentageChange
            };
          });

          series.setData(chartData);
        }
      });

      // Fit content to show all data
      if (chartRef.current) {
        setTimeout(() => {
          chartRef.current.timeScale().fitContent();
        }, 100);
      }
    }
  }, [data]);

  return (
    <div className="w-full p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Yearly Performance Comparison (%)</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          {data.map((yearData, index) => (
            <span key={yearData.year} className="flex items-center gap-2">
              <div
                className="w-4 h-1 rounded"
                style={{ backgroundColor: YEAR_COLORS[index % YEAR_COLORS.length] }}
              ></div>
              {yearData.year}
            </span>
          ))}
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full relative" />
      <div className="mt-2 text-sm text-gray-600">
        <p><strong>Note:</strong> All years are aligned by calendar date and start at 0% to compare relative performance trends. The tooltip shows both the actual price and the percentage change from the start of the year.</p>
      </div>
    </div>
  );
}