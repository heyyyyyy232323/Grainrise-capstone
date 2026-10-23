import React from "react";
import { Store, Calendar, Navigation, Radio } from "lucide-react";

export default function WarehouseDriverActiveDutyCard({
  activeDuty,
  onContinueTracking,
  onViewDutyDetails,
}) {
  if (!activeDuty) return null;

  return (
    <article className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* Top green accent border */}
      <div className="h-1.5 w-full bg-[#0d5921]" />

      <div className="p-4 space-y-3.5">
        {/* Header: Badge & Live GPS */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 bg-[#e6f4ea] text-[#0d5921] px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0d5921] animate-ping inline-block" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#0d5921] -ml-2.5 inline-block" />
            CURRENT ACTIVE DUTY
          </span>

          <div className="flex items-center gap-1 text-emerald-700 text-xs font-bold">
            <Radio size={14} className="text-emerald-600 animate-pulse" />
            <span>Live GPS</span>
          </div>
        </div>

        {/* Batch Number */}
        <div>
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
            {activeDuty.batchNo}
          </h3>
        </div>

        {/* Retailer Info */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Store size={14} className="text-slate-400 shrink-0" />
          <span>
            <span className="text-slate-400 font-normal">Retailer: </span>
            <span className="text-slate-900 font-semibold">{activeDuty.retailer}</span>
          </span>
        </div>

        {/* Inner Details Box (Commodity, Quantity, Schedule) */}
        <div className="bg-[#f8faf9] rounded-xl p-3 border border-slate-100/90 space-y-2.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                COMMODITY
              </p>
              <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                {activeDuty.commodity}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                QUANTITY
              </p>
              <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                {activeDuty.quantity}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/50 text-[11px] text-slate-500 font-medium">
            <Calendar size={13} className="text-slate-400 shrink-0" />
            <span>Delivery Schedule: <strong className="text-slate-700 font-semibold">{activeDuty.deliverySchedule}</strong></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={onContinueTracking}
            className="w-full flex items-center justify-center gap-2 bg-[#0d5921] hover:bg-[#0b4b1c] active:scale-[0.98] text-white py-3 px-4 rounded-xl text-sm font-bold shadow-xs transition-all cursor-pointer"
          >
            <Navigation size={15} className="fill-white rotate-45" />
            <span>Continue Tracking</span>
          </button>

          <button
            type="button"
            onClick={onViewDutyDetails}
            className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-800 border border-slate-200 py-2.5 px-4 rounded-xl text-sm font-bold shadow-2xs transition-all cursor-pointer"
          >
            <span>View Duty Details</span>
          </button>
        </div>
      </div>
    </article>
  );
}
