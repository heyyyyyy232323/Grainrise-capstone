import React from "react";
import {
  X,
  MapPin,
  Phone,
  Calendar,
  Package,
  AlertCircle,
  CheckCircle2,
  Navigation,
} from "lucide-react";

export default function MillerDriverDutyDetailsModal({
  duty,
  isOpen,
  onClose,
  onStartTracking,
}) {
  if (!isOpen || !duty) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
              {duty.status || "Assigned"}
            </span>
            <h3 className="text-base font-black text-slate-900 mt-1">
              {duty.batchNo}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-3 text-xs">
          {/* Retailer Info */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 space-y-2">
            <div className="font-extrabold text-slate-900 text-sm">
              {duty.retailer}
            </div>

            <div className="flex items-start gap-2 text-slate-600">
              <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                {duty.retailerAddress || duty.location || "Central Market Hub, Sampaloc, Manila"}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
              <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                <Phone size={13} className="text-slate-400" />
                <span>{duty.retailerContact || duty.contact || "+63 917 888 9900"}</span>
              </div>
              <a
                href={`tel:${duty.retailerContact || duty.contact || "+639178889900"}`}
                className="text-[11px] font-bold text-[#0d5921] hover:underline"
              >
                Call
              </a>
            </div>
          </div>

          {/* Commodity & Load */}
          <div className="grid grid-cols-2 gap-2">
            <div className="border border-slate-200/80 rounded-2xl p-3 bg-white">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Commodity
              </span>
              <p className="font-black text-slate-900 mt-0.5">
                {duty.commodity || "Dinorado Rice"}
              </p>
              <p className="text-[10px] text-slate-500">
                {duty.variety || "Premium Milled"}
              </p>
            </div>

            <div className="border border-slate-200/80 rounded-2xl p-3 bg-white">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Quantity
              </span>
              <p className="font-black text-slate-900 mt-0.5">
                {duty.quantity || "10 kg"}
              </p>
              <p className="text-[10px] text-slate-500">
                {duty.bagCount || "1 sack"}
              </p>
            </div>
          </div>

          {/* Schedule & Payment */}
          <div className="border border-slate-200/80 rounded-2xl p-3 bg-white space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Delivery Schedule:</span>
              <span className="font-bold text-slate-800">
                {duty.deliverySchedule || duty.schedule || duty.time || "Today, 10:00 AM"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Payment Mode:</span>
              <span className="font-bold text-emerald-800">
                {duty.paymentType || duty.paymentMethod || "Online Payment"}
              </span>
            </div>
          </div>

          {/* Unloading Note */}
          {duty.instructions && (
            <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-3 space-y-1">
              <span className="text-[10px] font-bold text-amber-800 uppercase flex items-center gap-1">
                <AlertCircle size={12} />
                Unloading Instructions
              </span>
              <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                {duty.instructions}
              </p>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onStartTracking) onStartTracking(duty);
            }}
            className="w-full py-3 rounded-xl bg-[#0d5921] hover:bg-[#0a461a] active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Navigation size={14} />
            <span>Start Live Tracking</span>
          </button>
        </div>
      </div>
    </div>
  );
}
