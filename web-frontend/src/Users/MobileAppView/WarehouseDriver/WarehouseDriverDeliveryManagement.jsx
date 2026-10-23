import React from "react";
import { ArrowRight } from "lucide-react";

export default function WarehouseDriverDeliveryManagement({
  duties = [],
  onSelectDuty,
  onViewAllDuties,
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3.5">
      {/* Section Header */}
      <div>
        <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
          Delivery Management
        </h3>
        <p className="text-xs text-slate-400 font-medium">
          Latest assigned duties queue
        </p>
      </div>

      {/* List of Batch Cards */}
      <div className="space-y-3">
        {duties.slice(0, 3).map((duty) => (
          <div
            key={duty.id || duty.batchNo}
            className="bg-white rounded-xl border border-slate-200/80 p-3.5 hover:border-slate-300 transition-all shadow-2xs space-y-2"
          >
            {/* Row 1: Batch number & Assigned status pill */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold text-slate-900">
                {duty.batchNo}
              </span>
              <span className="bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5 rounded-full text-[11px] font-bold">
                {duty.status || "Assigned"}
              </span>
            </div>

            {/* Row 2: Retailer name & Commodity • weight */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 truncate max-w-[55%]">
                <span className="text-slate-400 font-normal">Retailer: </span>
                <strong className="text-slate-900 font-semibold">{duty.retailer}</strong>
              </span>
              <span className="text-slate-600 font-medium shrink-0">
                {duty.commodity} &bull; {duty.quantity}
              </span>
            </div>

            {/* Row 3: Schedule & View Details link */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
              <span className="text-slate-400 text-[11px]">
                Schedule: <span className="text-slate-600 font-medium">{duty.schedule}</span>
              </span>

              <button
                type="button"
                onClick={() => onSelectDuty && onSelectDuty(duty)}
                className="text-emerald-700 hover:text-emerald-800 font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>View Details</span>
                <ArrowRight size={13} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Link */}
      <div className="pt-1 text-center">
        <button
          type="button"
          onClick={onViewAllDuties}
          className="text-emerald-800 hover:text-emerald-900 font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer py-1 transition-all hover:underline"
        >
          <span>View All Assigned Duties</span>
          <ArrowRight size={14} strokeWidth={2.5} />
        </button>
      </div>
    </section>
  );
}
