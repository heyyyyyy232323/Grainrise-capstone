import React from "react";
import { ArrowRight, ChevronRight } from "lucide-react";

export default function RetailerMobileActiveOrders({
  orders = [],
  onOrderClick,
  onViewAllClick,
}) {
  const getBadgeStyle = (statusType) => {
    switch (statusType) {
      case "preparing":
        return "bg-amber-50 text-amber-800 border-amber-200/80";
      case "in-transit":
        return "bg-blue-50 text-blue-800 border-blue-200/80";
      case "processing":
        return "bg-purple-50 text-purple-800 border-purple-200/80";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getDotColor = (statusType) => {
    switch (statusType) {
      case "preparing":
        return "bg-amber-500";
      case "in-transit":
        return "bg-blue-500";
      case "processing":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900 tracking-tight">Active Orders</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Latest warehouse fulfillment orders.
          </p>
        </div>
        <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
          3 of 7 shown
        </span>
      </div>

      {/* List */}
      <div className="space-y-2.5">
        {orders.map((ord) => (
          <div
            key={ord.id}
            onClick={() => onOrderClick && onOrderClick(ord)}
            className="p-3 rounded-lg border border-gray-100/90 bg-gray-50/50 hover:bg-emerald-50/30 hover:border-emerald-200 transition-all cursor-pointer select-none"
          >
            {/* Top row: Order number & Status badge */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="font-bold text-xs text-gray-900 tracking-tight">
                {ord.orderNo}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full border ${getBadgeStyle(
                  ord.statusType
                )}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${getDotColor(ord.statusType)}`} />
                {ord.status}
              </span>
            </div>

            {/* Middle row: Warehouse and item details */}
            <div className="text-[11.5px] text-gray-600 space-y-0.5">
              <div>
                <span className="text-gray-400">Warehouse: </span>
                <span className="font-medium text-gray-800">{ord.warehouse}</span>
              </div>
              <div>
                <span className="text-gray-400">Item: </span>
                <span className="font-medium text-gray-800">{ord.item}</span>
              </div>
            </div>

            {/* Bottom row: Price and link */}
            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-200/50">
              <span className="text-xs font-black text-gray-900">{ord.price}</span>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#00580C] hover:underline">
                <span>View Details</span>
                <ChevronRight size={12} strokeWidth={2.5} />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Link */}
      <div className="flex justify-end pt-3 mt-2 border-t border-gray-50">
        <button
          onClick={onViewAllClick}
          className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#00580C] hover:text-emerald-800 transition-colors cursor-pointer"
        >
          <span>View Order Tracking</span>
          <ArrowRight size={13} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
