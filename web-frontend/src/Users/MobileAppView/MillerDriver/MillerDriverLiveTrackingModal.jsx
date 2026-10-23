import React, { useState, useEffect } from "react";
import {
  X,
  Navigation,
  Phone,
  MessageSquare,
  AlertTriangle,
  ShieldCheck,
  MapPin,
  CheckCircle2,
} from "lucide-react";

export default function MillerDriverLiveTrackingModal({
  duty,
  isOpen,
  onClose,
  onDeliveredSuccess,
}) {
  const [etaRemaining, setEtaRemaining] = useState(48);
  const [currentSpeed, setCurrentSpeed] = useState(54);
  const [trafficStatus, setTrafficStatus] = useState("Moderate Flow");

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setCurrentSpeed(Math.floor(48 + Math.random() * 12));
    }, 4000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen || !duty) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                Live Milling GPS
              </span>
              <h3 className="text-sm font-black text-white">{duty.batchNo}</h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mock GPS Map Visual */}
        <div className="relative h-48 bg-slate-800 overflow-hidden flex items-center justify-center">
          {/* Grid Road Pattern */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Route Line Simulation */}
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M 50 150 Q 150 80 220 120 T 320 50"
              fill="none"
              stroke="#10b981"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="6 4"
            />
          </svg>

          {/* Truck Pulse Marker */}
          <div className="absolute left-[180px] top-[95px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="w-9 h-9 rounded-full bg-[#0d5921] border-2 border-white shadow-lg flex items-center justify-center text-white animate-bounce">
              <Navigation size={16} className="rotate-45" />
            </div>
            <span className="bg-slate-900/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full mt-1 border border-white/20">
              {currentSpeed} km/h
            </span>
          </div>

          {/* Destination Pin */}
          <div className="absolute right-[40px] top-[40px] flex flex-col items-center">
            <div className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg">
              <MapPin size={14} />
            </div>
            <span className="text-[9px] font-bold text-white bg-slate-900/80 px-1.5 py-0.5 rounded mt-0.5">
              Retailer Hub
            </span>
          </div>

          {/* Floating Speedometer Chip */}
          <div className="absolute bottom-2 left-2 bg-slate-900/85 backdrop-blur-xs text-white px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5 border border-white/10">
            <ShieldCheck size={12} className="text-emerald-400" />
            <span>Optimal Route: NLEX Southbound</span>
          </div>
        </div>

        {/* Navigation Stats & Info */}
        <div className="p-4 space-y-3.5 flex-1 overflow-y-auto text-xs">
          {/* Quick ETA Bar */}
          <div className="bg-[#eef8f1] rounded-2xl p-3 border border-emerald-200/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-[#0d5921]">
                Estimated Arrival
              </span>
              <p className="text-base font-black text-slate-900 mt-0.5">
                {duty.estimatedArrival || "11:30 AM (48 mins)"}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold block">
                Distance
              </span>
              <span className="text-xs font-black text-slate-800">
                {duty.distanceRemainingKm || 24.5} km
              </span>
            </div>
          </div>

          {/* Retailer Destination Card */}
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 space-y-1.5">
            <div className="font-extrabold text-slate-900 text-xs">
              {duty.retailer}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {duty.retailerAddress || duty.location || "Central Market Hub, Sampaloc, Manila"}
            </p>
            <div className="flex items-center gap-3 pt-1 border-t border-slate-200/60 text-[11px]">
              <span className="text-slate-400">Contact:</span>
              <span className="font-bold text-slate-800">
                {duty.retailerContact || duty.contact || "+63 928 551 8490"}
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => {
                if (onDeliveredSuccess) onDeliveredSuccess(duty);
                onClose();
              }}
              className="w-full py-3 rounded-xl bg-[#0d5921] hover:bg-[#0a461a] active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <CheckCircle2 size={16} />
              <span>Mark Batch as Delivered</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer text-center"
            >
              Minimize Tracking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
