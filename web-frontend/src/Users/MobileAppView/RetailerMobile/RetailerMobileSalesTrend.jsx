import React, { useState } from "react";
import { ChevronDown, ArrowRight } from "lucide-react";

export default function RetailerMobileSalesTrend({
  salesData,
  onViewHistoryClick,
}) {
  const [selectedRange, setSelectedRange] = useState("Last 7 Days");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const ranges = ["Today", "Last 7 Days", "Last 30 Days", "This Month"];

  // Exact coordinates matching the Figma curve
  const points = [
    { day: "Mon", cx: 32, cy: 118 },
    { day: "Tue", cx: 82, cy: 98 },
    { day: "Wed", cx: 135, cy: 110 },
    { day: "Thu", cx: 188, cy: 94 },
    { day: "Fri", cx: 242, cy: 80 },
    { day: "Sat", cx: 295, cy: 82 },
    { day: "Sun", cx: 345, cy: 42, isCurrent: true },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100/90 p-4 shadow-2xs">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h2 className="text-base font-bold text-gray-900 tracking-tight">Sales Trend</h2>
          <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">
            Track your retail sales performance<br className="sm:hidden" /> overtime.
          </p>
        </div>

        {/* Range Selector Pill */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-600 bg-gray-50/80 hover:bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200/80 transition-colors cursor-pointer"
          >
            <span>{selectedRange}</span>
            <ChevronDown size={12} className="text-gray-400" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
              {ranges.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setSelectedRange(r);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs ${
                    selectedRange === r
                      ? "text-[#0d6928] font-bold bg-emerald-50"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SVG Line & Area Chart */}
      <div className="relative w-full h-44 my-2">
        <svg
          viewBox="0 0 375 160"
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="figmaSalesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#15803d" stopOpacity="0.22" />
              <stop offset="60%" stopColor="#15803d" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#15803d" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area Path */}
          <path
            d="M 32 118 C 55 105, 65 98, 82 98 C 105 98, 115 110, 135 110 C 160 110, 170 94, 188 94 C 215 94, 225 80, 242 80 C 265 80, 275 82, 295 82 C 320 82, 330 50, 345 42 L 345 138 L 32 138 Z"
            fill="url(#figmaSalesGrad)"
          />

          {/* Bottom baseline */}
          <line x1="20" y1="138" x2="355" y2="138" stroke="#f1f5f9" strokeWidth="1" />

          {/* Main Trend Line */}
          <path
            d="M 32 118 C 55 105, 65 98, 82 98 C 105 98, 115 110, 135 110 C 160 110, 170 94, 188 94 C 215 94, 225 80, 242 80 C 265 80, 275 82, 295 82 C 320 82, 330 50, 345 42"
            fill="none"
            stroke="#0d5921"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Nodes */}
          {points.map((pt, i) => (
            <g key={i}>
              <circle
                cx={pt.cx}
                cy={pt.cy}
                r="3.5"
                fill={pt.isCurrent ? "#0d5921" : "#ffffff"}
                stroke="#0d5921"
                strokeWidth="2.2"
              />
              <text
                x={pt.cx}
                y="152"
                textAnchor="middle"
                className={`text-[10.5px] ${
                  pt.isCurrent
                    ? "fill-[#0d5921] font-black font-sans"
                    : "fill-gray-400 font-medium font-sans"
                }`}
              >
                {pt.day}
              </text>
            </g>
          ))}

          {/* Sunday Tooltip Badge matching Figma */}
          <g transform="translate(290, 8)">
            <rect
              width="68"
              height="22"
              rx="6"
              fill="#0d5921"
            />
            <text
              x="34"
              y="15"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="10"
              fontWeight="bold"
            >
              ₱67,500 ▾
            </text>
          </g>
        </svg>
      </div>

      {/* Bottom Link */}
      <div className="flex justify-end pt-3 mt-1 border-t border-gray-100/70">
        <button
          onClick={onViewHistoryClick}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0d5921] hover:text-emerald-900 transition-colors cursor-pointer"
        >
          <span>View Sales History</span>
          <ArrowRight size={13} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
