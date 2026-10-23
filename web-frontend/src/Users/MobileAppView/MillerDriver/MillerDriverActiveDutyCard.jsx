import React from "react";
import { Store, Calendar, Send } from "lucide-react";

export default function MillerDriverActiveDutyCard({
  activeDuty,
  onContinueTracking,
  onViewDutyDetails,
}) {
  if (!activeDuty) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 border-t-4 border-t-[#0d5921] p-4 shadow-2xs space-y-3.5">
      {/* Top Banner Row: CURRENT ACTIVE DUTY pill & Live GPS */}
      <div className="flex items-center justify-between">
        <div className="bg-[#eef8f1] border border-emerald-200/70 text-[#0d5921] rounded-full px-2.5 py-1 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-wider">
            CURRENT ACTIVE DUTY
          </span>
        </div>

        <span className="text-xs font-bold text-[#0d5921]">Live GPS</span>
      </div>

      {/* Batch Number */}
      <h3 className="text-sm font-black text-slate-900 tracking-tight">
        {activeDuty.batchNo}
      </h3>

      {/* Retailer Info */}
      <div className="flex items-center gap-1.5 text-xs text-slate-600">
        <Store size={14} className="text-slate-400 shrink-0" />
        <span>Retailer:</span>
        <span className="font-bold text-slate-900">{activeDuty.retailer}</span>
      </div>

      {/* Commodity & Quantity Box */}
      <div className="bg-[#f8fafc] border border-slate-200/70 rounded-2xl p-3.5 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              COMMODITY
            </span>
            <p className="text-xs font-black text-slate-900 mt-0.5">
              {activeDuty.commodity}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              QUANTITY
            </span>
            <p className="text-xs font-black text-slate-900 mt-0.5">
              {activeDuty.quantity}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-1 border-t border-slate-100">
          <Calendar size={13} className="text-slate-400" />
          <span>Delivery Schedule:</span>
          <span className="font-bold text-slate-900">
            {activeDuty.deliverySchedule || "Apr 22, 2026"}
          </span>
        </div>
      </div>

      {/* Action Buttons Stack */}
      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={onContinueTracking}
          className="w-full bg-[#0d5921] hover:bg-[#0a461a] active:scale-[0.99] text-white text-xs font-bold py-3 px-3 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
        >
          <Send size={14} className="rotate-45" strokeWidth={2.4} />
          <span>Continue Tracking</span>
        </button>

        <button
          type="button"
          onClick={onViewDutyDetails}
          className="w-full bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-700 text-xs font-bold py-2.5 px-3 rounded-xl border border-slate-200 transition-all cursor-pointer text-center"
        >
          <span>View Duty Details</span>
        </button>
      </div>
    </div>
  );
}
