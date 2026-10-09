import React from "react";

export default function RetailerMobilePendingActions({
  actions = [],
  onActionClick,
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900 tracking-tight">Pending Actions</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Items that may require immediate review.
          </p>
        </div>
        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/70 shrink-0">
          4 Attention Items
        </span>
      </div>

      {/* Cards List */}
      <div className="space-y-2.5">
        {actions.map((act) => (
          <div
            key={act.id}
            className="p-3 rounded-lg border border-gray-100 bg-white shadow-xs hover:border-gray-200 transition-all"
          >
            {/* Top row: Type badge & timestamp */}
            <div className="flex items-center justify-between mb-1.5">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${act.badgeClass}`}>
                {act.badge}
              </span>
              <span className="text-[10.5px] font-medium text-gray-400">{act.time}</span>
            </div>

            {/* Reference and details */}
            <div className="text-xs font-bold text-gray-900 tracking-tight">{act.ref}</div>
            <div className="text-[11px] text-gray-600 mt-0.5">{act.details}</div>

            {/* Bottom row: Status dot + Action button */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100/80">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                <span className={`w-1.5 h-1.5 rounded-full ${act.statusDot}`} />
                <span className={act.statusText}>{act.status}</span>
              </div>

              {act.btnVariant === "primary-outline" ? (
                <button
                  onClick={() => onActionClick && onActionClick(act)}
                  className="px-3.5 py-1 text-xs font-bold text-[#00580C] bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-300/80 transition-colors cursor-pointer active:scale-95"
                >
                  {act.actionText}
                </button>
              ) : (
                <button
                  onClick={() => onActionClick && onActionClick(act)}
                  className="px-3.5 py-1 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors cursor-pointer active:scale-95"
                >
                  {act.actionText}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
