import React from "react";
import { ArrowRight } from "lucide-react";

export default function RetailerMobileStockAttention({
  items = [],
  onFindStockClick,
  onBrowseMarketplaceClick,
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-xs">
      {/* Header */}
      <h2 className="text-sm font-bold text-gray-900 tracking-tight">Stock Attention</h2>
      <p className="text-[11px] text-gray-500 mt-0.5 mb-3">
        Products that may need to be replenished soon.
      </p>

      {/* Item List */}
      <div className="divide-y divide-gray-100">
        {items.map((it) => (
          <div key={it.id} className="py-2.5 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-bold text-gray-900 truncate">{it.name}</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">{it.stock}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  it.statusType === "low"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {it.status}
              </span>
              <button
                onClick={() => onFindStockClick && onFindStockClick(it)}
                className="text-[11px] font-bold text-[#00580C] hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <span>Find Stock</span>
                <span>&rarr;</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Full width Marketplace Button */}
      <div className="mt-3.5 pt-1">
        <button
          onClick={onBrowseMarketplaceClick}
          className="w-full py-2.5 px-4 bg-emerald-50/70 hover:bg-emerald-100/70 text-[#00580C] font-bold text-xs rounded-xl border border-emerald-200/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Browse Warehouse Marketplace</span>
          <ArrowRight size={13} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
