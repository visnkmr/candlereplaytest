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

interface D3YearlyComparisonChartProps {
  data: HistoricalData[];
  symbol?: string;
}

const YEAR_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // green
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
];

export function D3YearlyComparisonChart({ data, symbol }: D3YearlyComparisonChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous

    const margin = { top: 20, right: 80, bottom: 50, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const g = svg
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Prepare data
    const allData = data.flatMap((yearData) => {
      const initialPrice = yearData.data[0]?.close || 0;
      return yearData.data.map((item) => {
        const itemDate = new Date(item.timestamp * 1000);
        const startOfYear = new Date(itemDate.getFullYear(), 0, 1);
        const dayOfYear = Math.floor((itemDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
        const normalizedDate = new Date(2024, 0, dayOfYear + 1);
        const percentageChange = initialPrice ? ((item.close / initialPrice) - 1) * 100 : 0;
        return {
          year: yearData.year,
          time: normalizedDate,
          value: percentageChange,
          actualPrice: item.close,
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

    // Axes
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5));

    g.append("g")
      .call(d3.axisLeft(y).tickFormat(d => `${(d as number).toFixed(1)}%`));

    // Lines
    const line = d3.line<{ time: Date; value: number }>()
      .x(d => x(d.time))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    const grouped = d3.group(allData, d => d.year);
    const yearList = Array.from(grouped.keys()).sort((a, b) => b - a);

    Array.from(grouped.entries()).forEach(([year, values], index) => {
      const color = YEAR_COLORS[index % YEAR_COLORS.length];
      g.append("path")
        .datum(values)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("d", line);
    });

    // Vertical line for mouse position
    const focusLine = g.append("line")
      .attr("class", "focus-line")
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "#94a3b8")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,4")
      .style("visibility", "hidden");

    // Focus circles for each line
    const focusCircles = g.selectAll(".focus-circle")
      .data(Array.from(grouped.keys()))
      .enter()
      .append("circle")
      .attr("class", "focus-circle")
      .attr("r", 4)
      .attr("fill", (d, i) => YEAR_COLORS[i % YEAR_COLORS.length])
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .style("visibility", "hidden");

    // Legend
    const legend = g.selectAll(".legend")
      .data(Array.from(grouped.keys()))
      .enter().append("g")
      .attr("class", "legend")
      .attr("transform", (d, i) => `translate(0,${i * 20})`);

    legend.append("rect")
      .attr("x", width + 10)
      .attr("width", 18)
      .attr("height", 18)
      .style("fill", (d, i) => YEAR_COLORS[i % YEAR_COLORS.length]);

    legend.append("text")
      .attr("x", width + 35)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "start")
      .text(d => d);

    // Tooltip
    const tooltip = d3.select(tooltipRef.current)
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "rgba(255, 255, 255, 0.95)")
      .style("border", "1px solid #e5e7eb")
      .style("border-radius", "8px")
      .style("padding", "12px")
      .style("font-size", "12px")
      .style("z-index", "1000")
      .style("pointer-events", "none")
      .style("box-shadow", "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)");

    svg.on("mousemove", function (event) {
      const [mouseX] = d3.pointer(event, this);
      const xPos = mouseX - margin.left;

      if (xPos < 0 || xPos > width) {
        hideTooltip();
        return;
      }

      const xDate = x.invert(xPos);
      const bisect = d3.bisector((d: any) => d.time).left;

      const closestPoints: any[] = [];

      grouped.forEach((values, year) => {
        const sortedValues = values.slice().sort((a, b) => a.time.getTime() - b.time.getTime());
        const idx = bisect(sortedValues, xDate);
        const d0 = sortedValues[idx - 1];
        const d1 = sortedValues[idx];
        let d = d1;
        if (d0 && d1) {
          d = xDate.getTime() - d0.time.getTime() > d1.time.getTime() - xDate.getTime() ? d1 : d0;
        } else if (d0) {
          d = d0;
        }
        if (d) {
          closestPoints.push({ ...d, color: YEAR_COLORS[Array.from(grouped.keys()).indexOf(year) % YEAR_COLORS.length] });
        }
      });

      if (closestPoints.length > 0) {
        const primaryPoint = closestPoints[0];

        focusLine
          .style("visibility", "visible")
          .attr("x1", x(primaryPoint.time))
          .attr("x2", x(primaryPoint.time));

        focusCircles
          .style("visibility", "visible")
          .attr("cx", d => {
            const p = closestPoints.find(cp => cp.year === d);
            return p ? x(p.time) : 0;
          })
          .attr("cy", d => {
            const p = closestPoints.find(cp => cp.year === d);
            return p ? y(p.value) : 0;
          })
          .style("visibility", d => closestPoints.find(cp => cp.year === d) ? "visible" : "hidden");

        const sortedPoints = closestPoints.sort((a, b) => b.year - a.year);

        tooltip
          .style("visibility", "visible")
          .html(`
            <div class="font-bold border-b mb-2 pb-1 border-gray-200 text-gray-700">
              ${primaryPoint.time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <div class="space-y-1.5 min-w-[180px]">
              ${sortedPoints.map(p => `
                <div class="flex items-center gap-4 justify-between">
                  <div class="flex items-center gap-2">
                    <div class="w-1.5 h-1.5 rounded-full" style="background-color: ${p.color}"></div>
                    <span class="font-semibold text-gray-600">${p.year}</span>
                  </div>
                  <div class="flex items-baseline gap-2">
                    <span class="text-xs font-medium ${p.value >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
                      ${p.value >= 0 ? '▲' : '▼'} ${Math.abs(p.value).toFixed(2)}%
                    </span>
                    <span class="text-gray-900 font-mono text-[11px]">₹${p.actualPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          `)
          .style("left", (event.clientX + 20) + "px")
          .style("top", (event.clientY - 40) + "px")
          .style("position", "fixed");
      }
    });

    const hideTooltip = () => {
      tooltip.style("visibility", "hidden");
      focusLine.style("visibility", "hidden");
      focusCircles.style("visibility", "hidden");
    };

    svg.on("mouseleave", hideTooltip);

  }, [data]);

  return (
    <div className="w-full p-4 relative overflow-x-auto">
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        {symbol ? `${symbol}: ` : ''}Yearly Performance Comparison (%)
      </h3>
      <div className="min-w-[850px]">
        <svg ref={svgRef} className="cursor-crosshair"></svg>
      </div>
      <div ref={tooltipRef}></div>
      <div className="mt-2 text-sm text-gray-600">
        <p><strong>Note:</strong> All years are aligned by calendar date and start at 0% to compare relative performance trends. Hover over the chart for details.</p>
      </div>
    </div>
  );
}