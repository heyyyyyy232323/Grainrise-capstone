import React from "react";
import { Check, RefreshCw, Truck, Package, ArrowRight } from "lucide-react";

export default function RetailerMobileRecentActivity({
  activities = [],
  onViewHistoryClick,
}) {
  const getIcon = (type) => {
    switch (type) {
      case "check":
        return <Check size={12} strokeWidth={3} className="text-white" />;
      case "refresh":
        return <RefreshCw size={11} strokeWidth={2.5} className="text-white" />;
      case "truck":
        return <Truck size={11} strokeWidth={2.5} className="text-white" />;
      case "package":
        return <Package size={11} strokeWidth={2.5} className="text-white" />;
      default:
        return <Check size={12} strokeWidth={3} className="text-white" />;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-900 tracking-tight">Recent Activity</h2>
        <button
          onClick={onViewHistoryClick}
          className="inline-flex items-center gap-0.5 text-[11.5px] font-bold text-[#00580C] hover:text-emerald-800 transition-colors cursor-pointer"
        >
          <span>View History</span>
          <ArrowRight size={13} strokeWidth={2.5} />
        </button>
      </div>

      {/* Timeline items */}
      <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-gray-100">
        {activities.map((act) => (
          <div key={act.id} className="relative flex items-start justify-between gap-3">
            {/* Timeline node icon */}
            <div
              className={`absolute -left-5 top-0.5 w-4.5 h-4.5 rounded-full ${act.iconBg} flex items-center justify-center ring-2 ring-white shadow-xs`}
            >
              {getIcon(act.iconType)}
            </div>

            {/* Description */}
            <div className="pl-2 flex-1 min-w-0">
              <h3 className="text-xs font-bold text-gray-900 leading-none">{act.title}</h3>
              {act.badge ? (
                <p className="text-[11px] text-gray-600 mt-1 leading-snug">
                  {act.descPrefix}{" "}
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${act.badgeClass}`}>
                    {act.badge}
                  </span>
                </p>
              ) : (
                <p className="text-[11px] text-gray-600 mt-1 leading-snug">
                  {act.desc}
                </p>
              )}
            </div>

            {/* Timestamp */}
            <span className="text-[10.5px] font-medium text-gray-400 shrink-0 mt-0.5">
              {act.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
