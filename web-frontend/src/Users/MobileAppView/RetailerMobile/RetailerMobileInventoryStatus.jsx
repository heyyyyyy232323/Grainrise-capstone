import React from "react";
import { ArrowRight } from "lucide-react";

export default function RetailerMobileInventoryStatus({
  inventoryData,
  onViewInventoryClick,
}) {
  const data = inventoryData || {
    totalProducts: 56,
    inStock: { count: 42, percentage: "75%" },
    lowStock: { count: 9, percentage: "16%" },
    outOfStock: { count: 5, percentage: "9%" },
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-xs">
      {/* Title */}
      <h2 className="text-sm font-bold text-gray-900 tracking-tight">Inventory Status</h2>
      <p className="text-[11px] text-gray-500 mt-0.5 mb-3">
        Current availability of your retail products.
      </p>

      {/* Donut Chart and Legend in a clean row */}
      <div className="flex items-center justify-between gap-4 py-2">
        {/* Donut */}
        <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full rotate-[-90deg]" viewBox="0 0 120 120">
            {/* Background ring */}
            <circle
              cx="60"
              cy="60"
              r="46"
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth="12"
            />
            {/* In Stock (75% -> 217 of 289) */}
            <circle
              cx="60"
              cy="60"
              r="46"
              fill="transparent"
              stroke="#16a34a"
              strokeWidth="12"
              strokeDasharray="217 289"
              strokeDashoffset="0"
            />
            {/* Low Stock (16% -> 46 of 289) */}
            <circle
              cx="60"
              cy="60"
              r="46"
              fill="transparent"
              stroke="#f59e0b"
              strokeWidth="12"
              strokeDasharray="46 289"
              strokeDashoffset="-217"
            />
            {/* Out of Stock (9% -> 26 of 289) */}
            <circle
              cx="60"
              cy="60"
              r="46"
              fill="transparent"
              stroke="#ef4444"
              strokeWidth="12"
              strokeDasharray="26 289"
              strokeDashoffset="-263"
            />
          </svg>

          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-black text-gray-900 leading-none">
              {data.totalProducts}
            </span>
            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tight mt-0.5">
              TOTAL PRODUCTS
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#16a34a]" />
              <span className="text-gray-600 font-medium text-[11.5px]">In Stock</span>
            </div>
            <span className="font-bold text-gray-900 text-[11.5px]">
              {data.inStock.count} <span className="text-gray-400 font-normal">({data.inStock.percentage})</span>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
              <span className="text-gray-600 font-medium text-[11.5px]">Low Stock</span>
            </div>
            <span className="font-bold text-gray-900 text-[11.5px]">
              {data.lowStock.count} <span className="text-gray-400 font-normal">({data.lowStock.percentage})</span>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
              <span className="text-gray-600 font-medium text-[11.5px]">Out of Stock</span>
            </div>
            <span className="font-bold text-gray-900 text-[11.5px]">
              {data.outOfStock.count} <span className="text-gray-400 font-normal">({data.outOfStock.percentage})</span>
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Link */}
      <div className="flex justify-end pt-2 mt-2 border-t border-gray-50">
        <button
          onClick={onViewInventoryClick}
          className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#00580C] hover:text-emerald-800 transition-colors cursor-pointer"
        >
          <span>View Inventory</span>
          <ArrowRight size={13} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
