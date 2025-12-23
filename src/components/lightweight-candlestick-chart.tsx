"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, CrosshairMode, CandlestickSeries, createSeriesMarkers } from "lightweight-charts";
import { CandlestickData } from "@/data/candlestick-data";

interface LightweightCandlestickChartProps {
    data: CandlestickData[];
    transactions?: Array<{
        type: 'buy' | 'sell';
        price: number;
        quantity: number;
        timestamp: number;
        index: number;
    }>;
}

export function LightweightCandlestickChart({ data, transactions = [] }: LightweightCandlestickChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const seriesRef = useRef<any>(null);

    // Sync logic
    useEffect(() => {
        if (chartRef.current) {
            const syncCharts = () => {
                const rsiChart = (window as any).rsiChart;
                if (rsiChart && chartRef.current) {
                    const timeScale = chartRef.current.timeScale();
                    const rsiTimeScale = rsiChart.timeScale();
                    const visibleRange = timeScale.getVisibleLogicalRange();
                    if (visibleRange) rsiTimeScale.setVisibleLogicalRange(visibleRange);
                }
            };

            chartRef.current.subscribeCrosshairMove((param: any) => {
                const rsiChart = (window as any).rsiChart;
                if (rsiChart && param.time) rsiChart.crosshairMove(param);
            });

            const rsiChart = (window as any).rsiChart;
            if (rsiChart) {
                rsiChart.timeScale().subscribeVisibleLogicalRangeChange(syncCharts);
                rsiChart.subscribeCrosshairMove((param: any) => {
                    if (chartRef.current && param.time) chartRef.current.crosshairMove(param);
                });
            }
            syncCharts();
        }
    }, []);

    useEffect(() => {
        if (chartRef.current) (window as any).candlestickChart = chartRef.current;
        return () => { delete (window as any).candlestickChart; };
    }, []);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 400,
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: "#374151",
                attributionLogo: false
            },
            grid: {
                vertLines: { color: "#f3f4f6" },
                horzLines: { color: "#f3f4f6" },
            },
            crosshair: { mode: CrosshairMode.Normal },
            rightPriceScale: { borderColor: "#e5e7eb", textColor: "#374151" },
            timeScale: { borderColor: "#e5e7eb", timeVisible: true },
        });

        const candlestickSeries = chart.addSeries(CandlestickSeries, {
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
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
            if (chartRef.current) chartRef.current.remove();
        };
    }, []);

    useEffect(() => {
        if (seriesRef.current && data.length > 0) {
            seriesRef.current.setData(data.map(item => ({
                time: item.timestamp as any,
                open: item.open,
                high: item.high,
                low: item.low,
                close: item.close,
            })));
        }
    }, [data]);

    useEffect(() => {
        if (seriesRef.current && transactions.length > 0) {
            const markers = transactions.map(tx => ({
                time: tx.timestamp as any,
                position: tx.type === 'buy' ? 'belowBar' as const : 'aboveBar' as const,
                color: tx.type === 'buy' ? '#10b981' : '#ef4444',
                shape: tx.type === 'buy' ? 'arrowUp' as const : 'arrowDown' as const,
                text: `${tx.type === 'buy' ? 'B' : 'S'} ${tx.quantity}@${tx.price.toFixed(2)}`,
            }));
            createSeriesMarkers(seriesRef.current, markers);
        }
    }, [transactions]);

    return (
        <div className="w-full p-4 border rounded-xl bg-white">
            <div className="mb-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Lightweight Charts Engine</div>
            <div ref={chartContainerRef} className="w-full" />
        </div>
    );
}
