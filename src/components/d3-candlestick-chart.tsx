"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { CandlestickData } from "@/data/candlestick-data";

export type TooltipMode = 'synced' | 'simple';

interface D3CandlestickChartProps {
    data: CandlestickData[];
    transactions?: Array<{
        type: 'buy' | 'sell';
        price: number;
        quantity: number;
        timestamp: number;
        index: number;
    }>;
    showGrid?: boolean;
    tooltipMode?: TooltipMode;
    height?: number;
}

export function D3CandlestickChart({
    data,
    transactions = [],
    showGrid = true,
    tooltipMode = 'synced',
    height: containerHeight = 450
}: D3CandlestickChartProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!svgRef.current || !data.length) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const margin = { top: 20, right: 80, bottom: 40, left: 20 };
        const width = 1000 - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const g = svg
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Scales
        const x = d3.scaleBand()
            .domain(data.map(d => d.timestamp.toString()))
            .range([0, width])
            .padding(0.3);

        const xTime = d3.scaleTime()
            .domain([new Date(data[0].timestamp * 1000), new Date(data[data.length - 1].timestamp * 1000)])
            .range([0, width]);

        const yMin = d3.min(data, d => d.low) || 0;
        const yMax = d3.max(data, d => d.high) || 0;
        const padding = (yMax - yMin) * 0.1;

        const y = d3.scaleLinear()
            .domain([yMin - padding, yMax + padding])
            .range([height, 0]);

        const volumeY = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.volume) || 0])
            .range([height, height - 100]);

        // Grid (Conditional)
        if (showGrid) {
            g.append("g")
                .attr("class", "grid")
                .attr("stroke", "#f1f5f9")
                .call(d3.axisLeft(y).tickSize(-width).tickFormat(() => ""));
        }

        // Axes
        const xAxis = d3.axisBottom(xTime).ticks(10);
        const yAxis = d3.axisRight(y).tickFormat(d => `₹${d.toLocaleString('en-IN')}`);

        g.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(xAxis)
            .attr("color", "#94a3b8")
            .attr("font-weight", "600");

        g.append("g")
            .attr("transform", `translate(${width},0)`)
            .call(yAxis)
            .attr("color", "#94a3b8")
            .attr("font-weight", "600");

        // Volume Bars
        g.selectAll(".volume")
            .data(data)
            .enter().append("rect")
            .attr("class", "volume")
            .attr("x", d => x(d.timestamp.toString())!)
            .attr("y", d => volumeY(d.volume))
            .attr("width", x.bandwidth())
            .attr("height", d => height - volumeY(d.volume))
            .attr("fill", d => d.close >= d.open ? "#10b98120" : "#ef444420");

        // Candlesticks (Wicks)
        g.selectAll(".wick")
            .data(data)
            .enter().append("line")
            .attr("class", "wick")
            .attr("x1", d => x(d.timestamp.toString())! + x.bandwidth() / 2)
            .attr("x2", d => x(d.timestamp.toString())! + x.bandwidth() / 2)
            .attr("y1", d => y(d.low))
            .attr("y2", d => y(d.high))
            .attr("stroke", d => d.close >= d.open ? "#10b981" : "#ef4444")
            .attr("stroke-width", 1);

        // Candlesticks (Bodies)
        g.selectAll(".candle")
            .data(data)
            .enter().append("rect")
            .attr("class", "candle")
            .attr("x", d => x(d.timestamp.toString())!)
            .attr("y", d => y(Math.max(d.open, d.close)))
            .attr("width", x.bandwidth())
            .attr("height", d => Math.abs(y(d.open) - y(d.close)) || 1)
            .attr("fill", d => d.close >= d.open ? "#10b981" : "#ef4444")
            .attr("rx", 1);

        // Transaction Markers
        transactions.forEach(tx => {
            const txX = x(tx.timestamp.toString());
            if (txX === undefined) return;

            const centerX = txX + x.bandwidth() / 2;
            const isBuy = tx.type === 'buy';
            const markerY = y(isBuy ? data.find(d => d.timestamp === tx.timestamp)?.low || tx.price : data.find(d => d.timestamp === tx.timestamp)?.high || tx.price);
            const yOffset = isBuy ? 20 : -20;

            g.append("path")
                .attr("d", d3.symbol().type(isBuy ? d3.symbolTriangle : d3.symbolTriangle).size(60)())
                .attr("transform", `translate(${centerX}, ${markerY + yOffset}) rotate(${isBuy ? 0 : 180})`)
                .attr("fill", isBuy ? "#10b981" : "#ef4444")
                .attr("stroke", "white")
                .attr("stroke-width", 1);

            g.append("text")
                .attr("x", centerX)
                .attr("y", markerY + yOffset + (isBuy ? 15 : -15))
                .attr("text-anchor", "middle")
                .attr("font-size", "10px")
                .attr("font-weight", "black")
                .attr("fill", isBuy ? "#10b981" : "#ef4444")
                .text(`${isBuy ? 'B' : 'S'}`);
        });

        // Interaction Elements
        const crosshairX = g.append("line").attr("stroke", "#94a3b8").attr("stroke-width", 1).attr("stroke-dasharray", "4,4").style("visibility", "hidden");
        const crosshairY = g.append("line").attr("stroke", "#94a3b8").attr("stroke-width", 1).attr("stroke-dasharray", "4,4").style("visibility", "hidden");

        const tooltip = d3.select(tooltipRef.current)
            .style("position", "fixed").style("visibility", "hidden")
            .style("background", "rgba(255, 255, 255, 0.98)")
            .style("border", "1px solid #e2e8f0").style("border-radius", "12px")
            .style("padding", "12px").style("z-index", "1000")
            .style("pointer-events", "none")
            .style("box-shadow", "0 20px 25px -5px rgb(0 0 0 / 0.1)");

        svg.on("mousemove", function (event) {
            const [mouseX, mouseY] = d3.pointer(event, this);
            const xPos = mouseX - margin.left;
            const yPos = mouseY - margin.top;

            if (xPos < 0 || xPos > width || yPos < 0 || yPos > height) return hideTooltip();

            // Find closest candle
            const bandwidth = x.step();
            const index = Math.floor(xPos / bandwidth);
            const d = data[index];
            if (!d) return hideTooltip();

            const centerX = x(d.timestamp.toString())! + x.bandwidth() / 2;
            const centerY = y(d.close);

            crosshairX.style("visibility", "visible").attr("x1", centerX).attr("x2", centerX).attr("y1", 0).attr("y2", height);
            crosshairY.style("visibility", "visible").attr("y1", yPos).attr("y2", yPos).attr("x1", 0).attr("x2", width);

            tooltip.style("visibility", "visible")
                .html(`
          <div class="flex flex-col gap-2 min-w-[160px]">
            <div class="flex justify-between items-center border-b pb-1.5 border-slate-100 mb-1">
              <span class="font-black text-[11px] text-slate-400 tracking-widest uppercase">Candle Details</span>
              <span class="font-mono text-[10px] font-bold text-slate-900">${new Date(d.timestamp * 1000).toLocaleTimeString()}</span>
            </div>
            <div class="grid grid-cols-2 gap-y-1.5 text-xs">
              <span class="text-slate-500 font-bold uppercase text-[9px]">Open</span>
              <span class="text-right font-mono font-black text-slate-900">₹${d.open.toLocaleString()}</span>
              
              <span class="text-slate-500 font-bold uppercase text-[9px]">High</span>
              <span class="text-right font-mono font-black text-emerald-600">₹${d.high.toLocaleString()}</span>
              
              <span class="text-slate-500 font-bold uppercase text-[9px]">Low</span>
              <span class="text-right font-mono font-black text-rose-600">₹${d.low.toLocaleString()}</span>
              
              <span class="text-slate-500 font-bold uppercase text-[9px]">Close</span>
              <span class="text-right font-mono font-black text-slate-900 underline decoration-slate-200">₹${d.close.toLocaleString()}</span>
              
              <span class="text-slate-500 font-bold uppercase text-[9px]">Vol</span>
              <span class="text-right font-mono font-medium text-slate-400">${d.volume.toLocaleString()}</span>
            </div>
            ${d.rsi !== undefined ? `
              <div class="mt-1 pt-1.5 border-t border-slate-100 flex justify-between items-center">
                <span class="text-[9px] font-black text-violet-500 tracking-widest uppercase">RSI (14)</span>
                <span class="font-black text-sm ${d.rsi >= 70 ? 'text-rose-500' : d.rsi <= 30 ? 'text-emerald-500' : 'text-slate-800'}">${d.rsi.toFixed(2)}</span>
              </div>
            ` : ''}
          </div>
        `)
                .style("left", (event.clientX + 20) + "px")
                .style("top", (event.clientY - 40) + "px");

            // Signal for RSI crosshair sync if needed
            if ((window as any).syncD3Crosshair) {
                (window as any).syncD3Crosshair(d.timestamp);
            }
        });

        const hideTooltip = () => {
            tooltip.style("visibility", "hidden");
            crosshairX.style("visibility", "hidden");
            crosshairY.style("visibility", "hidden");
            if ((window as any).hideD3Crosshair) (window as any).hideD3Crosshair();
        };

        svg.on("mouseleave", hideTooltip);

        // Global listener for crosshair sync from RSI
        (window as any).syncCandleCrosshair = (timestamp: number) => {
            const d = data.find(item => item.timestamp === timestamp);
            if (d) {
                const centerX = x(d.timestamp.toString())! + x.bandwidth() / 2;
                crosshairX.style("visibility", "visible").attr("x1", centerX).attr("x2", centerX).attr("y1", 0).attr("y2", height);
            }
        };

    }, [data, transactions, showGrid, containerHeight]);

    return (
        <div className="w-full relative bg-white rounded-2xl p-4">
            <div className="overflow-x-auto">
                <svg ref={svgRef} className="cursor-none w-full h-auto min-w-[800px]"></svg>
            </div>
            <div ref={tooltipRef}></div>
        </div>
    );
}
