"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface HistoricalData {
  year: number;
  data: Array<{
    timestamp: number;
    close: number;
  }>;
}

export type TooltipMode = 'synced' | 'synced-minimal' | 'simple';
export type YAxisMode = 'percentage' | 'price';

interface D3YearlyComparisonChartProps {
  data: HistoricalData[];
  symbol?: string;
  tooltipMode?: TooltipMode;
  showGrid?: boolean;
  yAxisMode?: YAxisMode;
}

const YEAR_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // green
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
];

export function D3YearlyComparisonChart({
  data,
  symbol,
  tooltipMode = 'synced',
  showGrid = true,
  yAxisMode = 'percentage'
}: D3YearlyComparisonChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 40, right: 100, bottom: 60, left: 80 };
    const width = 900 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const g = svg
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Prepare data
    const allData = data.flatMap((yearData) => {
      const initialPrice = yearData.data[0]?.close || 0;
      const sortedYearData = [...yearData.data].sort((a, b) => a.timestamp - b.timestamp);

      return sortedYearData.map((item, index) => {
        const itemDate = new Date(item.timestamp * 1000);
        const startOfYear = new Date(itemDate.getFullYear(), 0, 1);
        const dayOfYear = Math.floor((itemDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
        const normalizedDate = new Date(2024, 0, dayOfYear + 1);
        const percentageChangeFromStart = initialPrice ? ((item.close / initialPrice) - 1) * 100 : 0;

        let dailyChange = 0;
        if (index > 0) {
          const prevClose = sortedYearData[index - 1].close;
          dailyChange = prevClose ? ((item.close / prevClose) - 1) * 100 : 0;
        }

        return {
          year: yearData.year,
          time: normalizedDate,
          value: yAxisMode === 'percentage' ? percentageChangeFromStart : item.close,
          percentageValue: percentageChangeFromStart, // Always keep % for tooltip
          dailyChange: dailyChange,
          actualPrice: item.close,
          originalDate: itemDate
        };
      });
    });

    if (allData.length === 0) return;

    // Scales
    const x = d3.scaleTime()
      .domain(d3.extent(allData, d => d.time) as [Date, Date])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain(d3.extent(allData, d => d.value) as [number, number])
      .nice()
      .range([height, 0]);

    // Grid lines (Conditional)
    if (showGrid) {
      g.append("g")
        .attr("class", "grid")
        .attr("stroke", "#f1f5f9")
        .attr("stroke-opacity", 1)
        .call(d3.axisLeft(y).tickSize(-width).tickFormat(() => ""));
    }

    // Axes
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat("%b") as any))
      .attr("font-weight", "600")
      .attr("color", "#64748b");

    g.append("g")
      .call(d3.axisLeft(y).tickFormat(d => yAxisMode === 'percentage' ? `${(d as number).toFixed(1)}%` : `₹${(d as number).toLocaleString('en-IN')}`))
      .attr("font-weight", "600")
      .attr("color", "#64748b");

    const line = d3.line<any>()
      .x(d => x(d.time))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    const grouped = d3.group(allData, d => d.year);
    const years = Array.from(grouped.keys()).sort((a, b) => b - a);

    // Draw Lines
    years.forEach((year, index) => {
      const color = YEAR_COLORS[index % YEAR_COLORS.length];
      const values = grouped.get(year)!;

      g.append("path")
        .datum(values)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 3)
        .attr("stroke-linecap", "round")
        .attr("d", line);

      // Legend Label at end of line
      const lastPoint = values[values.length - 1];
      g.append("text")
        .attr("x", x(lastPoint.time) + 5)
        .attr("y", y(lastPoint.value))
        .attr("dy", "0.35em")
        .attr("fill", color)
        .attr("font-size", "10px")
        .attr("font-weight", "bold")
        .text(year);
    });

    // Interaction Elements
    const focusLine = g.append("line")
      .attr("y1", 0).attr("y2", height)
      .attr("stroke", "#94a3b8").attr("stroke-width", 1).attr("stroke-dasharray", "4,4")
      .style("visibility", "hidden");

    const focusCircles = g.selectAll(".focus-circle")
      .data(years)
      .enter().append("circle")
      .attr("r", 5).attr("stroke", "white").attr("stroke-width", 2)
      .attr("fill", (d, i) => YEAR_COLORS[i % YEAR_COLORS.length])
      .style("visibility", "hidden");

    // Tooltip
    const tooltip = d3.select(tooltipRef.current)
      .style("position", "fixed").style("visibility", "hidden")
      .style("background", "rgba(255, 255, 255, 0.98)")
      .style("border", "1px solid #e2e8f0").style("border-radius", "12px")
      .style("padding", "16px").style("z-index", "1000")
      .style("pointer-events", "none")
      .style("box-shadow", "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)");

    svg.on("mousemove", function (event) {
      const [mouseX, mouseY] = d3.pointer(event, this);
      const xPos = mouseX - margin.left;
      const yPos = mouseY - margin.top;

      if (xPos < 0 || xPos > width) return hideTooltip();

      const xDate = x.invert(xPos);
      const bisect = d3.bisector((d: any) => d.time).left;

      const points: any[] = [];
      grouped.forEach((values, year) => {
        const idx = bisect(values, xDate);
        const d0 = values[idx - 1], d1 = values[idx];
        let d = d1;
        if (d0 && d1) d = (xDate.getTime() - d0.time.getTime() > d1.time.getTime() - xDate.getTime()) ? d1 : d0;
        else if (d0) d = d0;
        if (d) points.push({ ...d, color: YEAR_COLORS[years.indexOf(year) % YEAR_COLORS.length] });
      });

      if (points.length === 0) return hideTooltip();

      const isSynced = tooltipMode === 'synced' || tooltipMode === 'synced-minimal';

      if (isSynced) {
        focusLine.style("visibility", "visible").attr("x1", x(points[0].time)).attr("x2", x(points[0].time));
        focusCircles.style("visibility", "visible")
          .attr("cx", d => { const p = points.find(cp => cp.year === d); return p ? x(p.time) : 0; })
          .attr("cy", d => { const p = points.find(cp => cp.year === d); return p ? y(p.value) : 0; })
          .style("opacity", d => points.find(cp => cp.year === d) ? 1 : 0);

        tooltip.style("visibility", "visible")
          .html(`
            <div class="font-black text-gray-800 border-b border-slate-100 mb-3 pb-2 flex justify-between gap-4">
              <span>${points[0].time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              <span class="text-slate-400 font-medium">${tooltipMode === 'synced' ? 'Detailed' : 'Clean'} Compare</span>
            </div>
            <div class="space-y-3 min-w-[220px]">
              ${points.sort((a, b) => b.year - a.year).map(p => `
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full mt-1" style="background-color: ${p.color}"></div>
                    <div class="flex flex-col">
                      <span class="font-bold text-gray-700 text-sm leading-tight">${p.year}</span>
                    </div>
                  </div>
                  <div class="flex flex-col items-end gap-0.5">
                    <span class="font-mono text-gray-900 text-sm font-bold leading-none">₹${p.actualPrice.toLocaleString('en-IN')}</span>
                    <div class="flex items-center gap-1.5">
                      <span class="text-[11px] font-black ${p.percentageValue >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
                        ${p.percentageValue >= 0 ? '+' : ''}${p.percentageValue.toFixed(2)}%
                      </span>
                      ${tooltipMode === 'synced' ? `<span class="text-[9px] text-slate-400 font-medium">(${p.dailyChange >= 0 ? '+' : ''}${p.dailyChange.toFixed(2)}%)</span>` : ''}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          `)
          .style("left", (event.clientX + 20) + "px")
          .style("top", (event.clientY - 40) + "px");
      }
      else {
        let closest = points[0];
        let minDist = Infinity;
        points.forEach(p => {
          const dist = Math.abs(y(p.value) - yPos);
          if (dist < minDist) { minDist = dist; closest = p; }
        });

        focusLine.style("visibility", "hidden");
        focusCircles.style("visibility", "visible")
          .attr("cx", x(closest.time))
          .attr("cy", y(closest.value))
          .style("opacity", d => d === closest.year ? 1 : 0);

        tooltip.style("visibility", "visible")
          .html(`
            <div class="flex items-center gap-3 mb-3">
              <div class="w-3 h-3 rounded-full" style="background-color: ${closest.color}"></div>
              <span class="font-black text-lg text-gray-800">${closest.year} Data</span>
            </div>
            <div class="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
              <div class="flex justify-between gap-8 text-sm items-center">
                <span class="text-slate-400 font-bold uppercase text-[9px] tracking-widest">Date</span>
                <span class="text-slate-900 font-bold">${closest.originalDate.toLocaleDateString()}</span>
              </div>
              <div class="flex justify-between gap-8 text-sm items-center">
                <span class="text-slate-400 font-bold uppercase text-[9px] tracking-widest">Price</span>
                <span class="text-slate-900 font-black">₹${closest.actualPrice.toLocaleString('en-IN')}</span>
              </div>
              <div class="flex justify-between gap-8 text-sm items-center">
                <span class="text-slate-400 font-bold uppercase text-[9px] tracking-widest">YTD Perf</span>
                <span class="font-black ${closest.percentageValue >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
                  ${closest.percentageValue >= 0 ? '+' : ''}${closest.percentageValue.toFixed(2)}%
                </span>
              </div>
            </div>
          `)
          .style("left", (event.clientX + 20) + "px")
          .style("top", (event.clientY - 40) + "px");
      }
    });

    const hideTooltip = () => {
      tooltip.style("visibility", "hidden");
      focusLine.style("visibility", "hidden");
      focusCircles.style("visibility", "hidden");
    };

    svg.on("mouseleave", hideTooltip);

  }, [data, tooltipMode, showGrid, yAxisMode]);

  return (
    <div className="w-full relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">
            {symbol ? `${symbol}` : 'Bond Performance'}
          </h3>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">
            {yAxisMode === 'percentage' ? 'Year-to-Date Percentage Comparison' : 'Bond Price Comparison Across Years'}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200">
        <div className="min-w-[900px] bg-white rounded-xl">
          <svg ref={svgRef} className="cursor-crosshair w-full h-auto"></svg>
        </div>
      </div>

      <div ref={tooltipRef}></div>

      <div className="mt-6 flex flex-wrap items-center gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Scale:</span>
        </div>
        <p className="text-xs text-slate-400 font-medium">
          {yAxisMode === 'percentage'
            ? 'All years are aligned by calendar date and start at 0% (relative tracking).'
            : 'Chart shows absolute price movement over time (non-normalized).'}
        </p>
      </div>
    </div>
  );
}