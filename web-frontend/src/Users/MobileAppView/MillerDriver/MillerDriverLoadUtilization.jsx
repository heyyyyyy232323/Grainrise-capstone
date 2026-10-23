import React from "react";

export default function MillerDriverLoadUtilization({ loadData }) {
  const percentAssigned = loadData?.percentAssigned ?? 8.4;
  const assignedKg = (loadData?.assignedLoadKg ?? 840).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const deliveredKg = (loadData?.deliveredLoadKg ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const remainingKg = (loadData?.remainingCapacityKg ?? 9160).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
      {/* Header Row: Amber Dot, Load Utilization, and 840.00 / 10,000 kg */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shrink-0" />
          <h3 className="text-xs font-bold text-slate-900">
            Load Utilization
          </h3>
        </div>

        <div className="text-xs font-bold text-slate-800">
          <span>840.00</span>
          <span className="text-slate-400 font-medium"> / 10,000 kg</span>
        </div>
      </div>

      {/* Subtitle Line */}
      <p className="text-[11px] text-slate-500 font-medium -mt-1">
        Driver assignment limit: 10,000 kg &bull;{" "}
        <span className="text-amber-600 font-bold">{percentAssigned}% Assigned</span>
      </p>

      {/* Progress Bar */}
      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(5, percentAssigned))}%` }}
        />
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
        {/* ASSIGNED */}
        <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-2.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            ASSIGNED
          </div>
          <div className="text-xs font-black text-slate-800 mt-1">
            {assignedKg} kg
          </div>
        </div>

        {/* REMAINING (Mint Pill Card) */}
        <div className="bg-[#eef8f1] border border-emerald-200/70 rounded-xl p-2.5">
          <div className="text-[10px] font-black text-[#0d5921] uppercase tracking-wider">
            REMAINING
          </div>
          <div className="text-xs font-black text-[#0d5921] mt-1">
            {remainingKg} kg
          </div>
        </div>

        {/* DELIVERED */}
        <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-2.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            DELIVERED
          </div>
          <div className="text-xs font-black text-slate-800 mt-1">
            {deliveredKg} kg
          </div>
        </div>
      </div>
    </div>
  );
}
