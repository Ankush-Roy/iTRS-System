"use client";

import React from "react";

export function SimpleChart({ data, title, type = "bar" }) {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map((item) => item.count));

  if (type === "bar") {
    return (
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="text-sm font-medium w-20 text-gray-600">
                {item.date || item.label}
              </span>
              <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                <div
                  className="bg-blue-500 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${(item.count / maxValue) * 100}%` }}
                />
              </div>
              <span className="text-sm font-bold text-gray-800 w-8">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "pie") {
    const total = data.reduce((sum, item) => sum + item.count, 0);
    let cumulativePercentage = 0;

    return (
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="flex items-center gap-4">
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 42 42" className="w-32 h-32 transform -rotate-90">
              <circle
                cx="21"
                cy="21"
                r="15.915"
                fill="transparent"
                stroke="#e5e7eb"
                strokeWidth="3"
              />
              {data.map((item, index) => {
                const percentage = (item.count / total) * 100;
                const strokeDasharray = `${percentage} ${100 - percentage}`;
                const strokeDashoffset = 100 - cumulativePercentage;
                const color =
                  index === 0 ? "#3b82f6" : index === 1 ? "#10b981" : "#f59e0b";
                cumulativePercentage += percentage;

                return (
                  <circle
                    key={index}
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="transparent"
                    stroke={color}
                    strokeWidth="3"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={-strokeDashoffset}
                    className="transition-all duration-500"
                  />
                );
              })}
            </svg>
          </div>
          <div className="space-y-2">
            {data.map((item, index) => {
              const percentage = ((item.count / total) * 100).toFixed(1);
              const color =
                index === 0
                  ? "bg-blue-500"
                  : index === 1
                  ? "bg-green-500"
                  : "bg-yellow-500";

              return (
                <div key={index} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${color}`} />
                  <span className="text-sm font-medium">
                    {item.label}: {item.count} ({percentage}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export function TicketTrendChart({ dailyStats }) {
  if (!dailyStats || dailyStats.length === 0) return null;

  const maxCount = Math.max(...dailyStats.map((stat) => stat.count));
  const chartHeight = 200;
  const chartWidth = 400;
  const pointWidth = chartWidth / Math.max(dailyStats.length - 1, 1);

  const points = dailyStats.map((stat, index) => ({
    x: index * pointWidth,
    y: chartHeight - (stat.count / maxCount) * chartHeight,
  }));

  const pathData = points.reduce((path, point, index) => {
    return (
      path +
      (index === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`)
    );
  }, "");

  return (
    <div className="bg-white p-4 rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">Ticket Trend (Last 7 Days)</h3>
      <div className="relative">
        <svg width={chartWidth} height={chartHeight} className="border rounded">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <line
              key={ratio}
              x1="0"
              y1={chartHeight * ratio}
              x2={chartWidth}
              y2={chartHeight * ratio}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}

          {/* Trend line */}
          <path
            d={pathData}
            stroke="#3b82f6"
            strokeWidth="2"
            fill="none"
            className="drop-shadow-sm"
          />

          {/* Data points */}
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#3b82f6"
              className="drop-shadow-sm"
            />
          ))}
        </svg>

        {/* X-axis labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-600">
          {dailyStats.map((stat, index) => (
            <span key={index} className="transform -rotate-45 origin-left">
              {new Date(stat.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
