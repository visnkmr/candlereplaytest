"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { CandlestickData } from "@/data/candlestick-data";

interface D3RSIGraphProps {
    data: CandlestickData[];
    showGrid?: boolean;
}

export function D3RSIGraph({ data, showGrid = true }: D3RSIGraphProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!svgRef.current || !data.length) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const margin = { top: 20, right: 80, bottom: 40, left: 20 };
        const width = 1000 - margin.left - margin.right;
        const height = 180 - margin.top - margin.bottom;

        const g = svg
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Prepare data
        const rsiPoints = data.filter(d => d.rsi !== undefined).map(d => ({
            timestamp: d.timestamp,
            value: d.rsi!
        }));

        if (rsiPoints.length === 0) return;

        // Scales
        const x = d3.scaleBand()
            .domain(data.map(d => d.timestamp.toString()))
            .range([0, width])
            .padding(0.3);

        const xTime = d3.scaleTime()
            .domain([new Date(data[0].timestamp * 1000), new Date(data[data.length - 1].timestamp * 1000)])
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([0, 100])
            .range([height, 0]);

        // Grid (Conditional)
        if (showGrid) {
            g.append("g")
                .attr("class", "grid")
                .attr("stroke", "#f1f5f9")
                .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(() => ""));
        }

        // Axes
        const xAxis = d3.axisBottom(xTime).ticks(10);
        const yAxis = d3.axisRight(y).ticks(5);

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

        // Levels
        const levels = [30, 70];
        levels.forEach(level => {
            g.append("line")
                .attr("x1", 0).attr("x2", width).attr("y1", y(level)).attr("y2", y(level))
                .attr("stroke", level === 70 ? "#ef4444" : "#10b981")
                .attr("stroke-width", 1)
                .attr("stroke-dasharray", "4,4")
                .attr("opacity", 0.6);

            g.append("text")
                .attr("x", width + 5)
                .attr("y", y(level))
                .attr("dy", "0.3em")
                .attr("font-size", "10px")
                .attr("font-weight", "bold")
                .attr("fill", level === 70 ? "#ef4444" : "#10b981")
                .text(level);
        });

        // Area between levels
        g.insert("rect", ":first-child")
            .attr("x", 0).attr("y", y(70))
            .attr("width", width).attr("height", y(30) - y(70))
            .attr("fill", "#8b5cf6")
            .attr("opacity", 0.03);

        const line = d3.line<any>()
            .x(d => x(d.timestamp.toString())! + x.bandwidth() / 2)
            .y(d => y(d.value))
            .curve(d3.curveMonotoneX);

        g.append("path")
            .datum(rsiPoints)
            .attr("fill", "none")
            .attr("stroke", "#8b5cf6")
            .attr("stroke-width", 2.5)
            .attr("stroke-linejoin", "round")
            .attr("d", line);

        // Interaction Elements
        const crosshairX = g.append("line").attr("stroke", "#94a3b8").attr("stroke-width", 1).attr("stroke-dasharray", "4,4").style("visibility", "hidden");
        const crosshairY = g.append("line").attr("stroke", "#94a3b8").attr("stroke-width", 1).attr("stroke-dasharray", "4,4").style("visibility", "hidden");

        svg.on("mousemove", function (event) {
            const [mouseX, mouseY] = d3.pointer(event, this);
            const xPos = mouseX - margin.left;
            const yPos = mouseY - margin.top;

            if (xPos < 0 || xPos > width || yPos < 0 || yPos > height) return hideTooltip();

            const bandwidth = x.step();
            const index = Math.floor(xPos / bandwidth);
            const d = data[index];
            if (!d) return hideTooltip();

            const centerX = x(d.timestamp.toString())! + x.bandwidth() / 2;

            crosshairX.style("visibility", "visible").attr("x1", centerX).attr("x2", centerX).attr("y1", 0).attr("y2", height);
            crosshairY.style("visibility", "visible").attr("y1", yPos).attr("y2", yPos).attr("x1", 0).attr("x2", width);

            // Simple sync signal for Candlestick
            if ((window as any).syncCandleCrosshair) {
                (window as any).syncCandleCrosshair(d.timestamp);
            }
        });

        const hideTooltip = () => {
            crosshairX.style("visibility", "hidden");
            crosshairY.style("visibility", "hidden");
            if ((window as any).hideCandleCrosshair) (window as any).hideCandleCrosshair();
        };

        svg.on("mouseleave", hideTooltip);

        // Global listener for crosshair sync from Candlestick
        (window as any).syncD3Crosshair = (timestamp: number) => {
            const d = data.find(item => item.timestamp === timestamp);
            if (d) {
                const centerX = x(d.timestamp.toString())! + x.bandwidth() / 2;
                crosshairX.style("visibility", "visible").attr("x1", centerX).attr("x2", centerX).attr("y1", 0).attr("y2", height);
            }
        };

    }, [data, showGrid]);

    return (
        <div className="w-full relative bg-white rounded-2xl p-4 mt-2 border-t border-slate-50">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-slate-800 tracking-widest uppercase">RSI Index (14)</h3>
                <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full border border-rose-200 bg-rose-500"></div>
                        <span className="text-[10px] font-black text-slate-400">70</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full border border-emerald-200 bg-emerald-500"></div>
                        <span className="text-[10px] font-black text-slate-400">30</span>
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto">
                <svg ref={svgRef} className="cursor-none w-full h-auto min-w-[800px]"></svg>
            </div>
        </div>
    );
}
