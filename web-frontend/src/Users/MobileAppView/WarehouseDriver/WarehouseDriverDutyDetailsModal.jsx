import React from "react";
import { X, MapPin, Phone, Calendar, Package, AlertCircle, CheckCircle2, Navigation } from "lucide-react";

export default function WarehouseDriverDutyDetailsModal({
  duty,
  isOpen,
  onClose,
  onStartTracking,
  onMarkDelivered,
}) {
  if (!isOpen || !duty) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Handle / Drag Indicator for mobile */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
              Duty Details
            </span>
            <h2 className="text-base font-black text-slate-900 mt-1">
              {duty.batchNo}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Retailer Card */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Retailer Store</p>
                <p className="text-sm font-extrabold text-slate-900">{duty.retailer}</p>
              </div>
              {duty.contact && (
                <a
                  href={`tel:${duty.contact}`}
                  className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs hover:bg-emerald-700 transition-colors"
                >
                  <Phone size={14} />
                </a>
              )}
            </div>

            <div className="flex items-start gap-1.5 text-slate-600 pt-1">
              <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
              <span>{duty.retailerAddress || "Commercial Hub, San Fernando, Pampanga"}</span>
            </div>
          </div>

          {/* Commodity Details */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[10px] uppercase font-bold text-slate-400">Commodity</p>
              <p className="text-xs font-bold text-slate-900 mt-0.5">{duty.commodity || "Brown Rice"}</p>
              <p className="text-[11px] text-slate-500">{duty.variety || "Standard Grain"}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[10px] uppercase font-bold text-slate-400">Quantity / Load</p>
              <p className="text-xs font-bold text-slate-900 mt-0.5">{duty.quantity || "10 kg"}</p>
              <p className="text-[11px] text-slate-500">{duty.bagCount || "1 Bag"}</p>
            </div>
          </div>

          {/* Schedule & Payment Status */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400" />
                Scheduled Date:
              </span>
              <span className="font-bold text-slate-900">{duty.schedule || duty.deliverySchedule}</span>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
              <span className="text-slate-500">Payment Terms:</span>
              <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md text-[11px]">
                {duty.paymentType || duty.paymentStatus || "COD (Cash on Delivery)"}
              </span>
            </div>
          </div>

          {/* Special Delivery Instructions */}
          {duty.instructions && (
            <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl p-3 flex items-start gap-2 text-amber-900">
              <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[11px]">Delivery Note:</p>
                <p className="text-[11px] mt-0.5 leading-relaxed text-amber-800">{duty.instructions}</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2">
          {onStartTracking && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartTracking(duty);
              }}
              className="w-full flex items-center justify-center gap-2 bg-[#0d5921] hover:bg-[#0b4b1c] active:scale-[0.98] text-white py-3 rounded-xl text-sm font-bold shadow-xs transition-all cursor-pointer"
            >
              <Navigation size={15} className="fill-white rotate-45" />
              <span>Launch Live GPS Navigation</span>
            </button>
          )}

          {onMarkDelivered && (
            <button
              type="button"
              onClick={() => {
                onMarkDelivered(duty);
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <CheckCircle2 size={14} />
              <span>Confirm Unload & Complete Delivery</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-slate-500 font-bold text-xs hover:text-slate-800 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
