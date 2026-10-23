import React from "react";
import { ArrowRight } from "lucide-react";

export default function MillerDriverDeliveryManagement({
  duties = [],
  onSelectDuty,
  onViewAllDuties,
}) {
  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div>
        <h2 className="text-sm font-black text-slate-900 tracking-tight">
          Delivery Management
        </h2>
        <p className="text-[11px] text-slate-400 font-medium">
          Latest assigned duties queue
        </p>
      </div>

      {/* Queue Cards */}
      <div className="space-y-2.5">
        {duties.slice(0, 3).map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectDuty && onSelectDuty(item)}
            className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-2xs hover:shadow-xs active:scale-[0.99] transition-all cursor-pointer space-y-2"
          >
            {/* Top Line: Batch & Assigned Badge */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 tracking-tight">
                {item.batchNo}
              </span>
              <span className="bg-[#fffbeb] border border-amber-200/70 text-[#b45309] font-bold text-[10px] px-2.5 py-0.5 rounded-full">
                {item.status}
              </span>
            </div>

            {/* Line 2: Retailer & Commodity */}
            <div className="flex items-center justify-between text-xs">
              <div className="text-slate-500">
                <span>Retailer: </span>
                <span className="font-bold text-slate-900">{item.retailer}</span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {item.commodity} &bull; {item.quantity}
              </span>
            </div>

            {/* Line 3: Schedule & View Details Link */}
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
              <div className="text-slate-400">
                <span>Schedule: </span>
                <span className="text-slate-600 font-medium">{item.schedule}</span>
              </div>

              <span className="text-xs font-bold text-[#0d5921] hover:underline flex items-center gap-0.5">
                <span>View Details</span>
                <span>&rarr;</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer CTA: View All Assigned Duties */}
      <div className="pt-1 text-center">
        <button
          type="button"
          onClick={onViewAllDuties}
          className="text-xs font-bold text-[#0d5921] hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <span>View All Assigned Duties</span>
          <span>&rarr;</span>
        </button>
      </div>
    </div>
  );
}
