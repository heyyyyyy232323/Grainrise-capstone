import React from "react";

export default function WarehouseDriverLoadUtilization({
  loadData,
}) {
  const current = loadData?.currentLoadKg ?? 840.0;
  const maxLimit = loadData?.maxLimitKg ?? 10000.0;
  const percent = loadData?.percentAssigned ?? 8.4;
  const assigned = loadData?.assignedLoadKg ?? 840.0;
  const remaining = loadData?.remainingCapacityKg ?? 9160.0;
  const delivered = loadData?.deliveredLoadKg ?? 0.0;

  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
      {/* Title & Fraction */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
            Load Utilization
          </h3>
        </div>

        <div className="text-xs">
          <span className="font-extrabold text-slate-900">
            {current.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-slate-400 font-medium">
            {" "}/ {maxLimit.toLocaleString("en-US")} kg
          </span>
        </div>
      </div>

      {/* Subtext */}
      <p className="text-[11px] text-amber-700 font-semibold">
        Driver assignment limit: {maxLimit.toLocaleString("en-US")} kg &bull; {percent}% Assigned
      </p>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-amber-500 h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(percent, 4))}%` }}
        />
      </div>

      {/* 3 Metric Sub-Cards */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {/* Assigned */}
        <div className="bg-slate-50/80 rounded-xl p-2.5 text-center border border-slate-100">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            ASSIGNED
          </p>
          <p className="text-xs font-black text-slate-900 mt-1">
            {assigned.toLocaleString("en-US", { minimumFractionDigits: 2 })} kg
          </p>
        </div>

        {/* Remaining (highlighted green) */}
        <div className="bg-[#eef8f1] rounded-xl p-2.5 text-center border border-emerald-200/60">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
            REMAINING
          </p>
          <p className="text-xs font-black text-emerald-800 mt-1">
            {remaining.toLocaleString("en-US", { minimumFractionDigits: 2 })} kg
          </p>
        </div>

        {/* Delivered */}
        <div className="bg-slate-50/80 rounded-xl p-2.5 text-center border border-slate-100">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            DELIVERED
          </p>
          <p className="text-xs font-black text-slate-900 mt-1">
            {delivered.toLocaleString("en-US", { minimumFractionDigits: 2 })} kg
          </p>
        </div>
      </div>
    </section>
  );
}
