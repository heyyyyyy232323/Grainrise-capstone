import React, { useState, useEffect } from "react";
import { X, Navigation, Phone, MessageSquare, AlertTriangle, ShieldCheck, MapPin, CheckCircle2 } from "lucide-react";

export default function WarehouseDriverLiveTrackingModal({
  duty,
  isOpen,
  onClose,
  onArrived,
}) {
  const [speed, setSpeed] = useState(48);
  const [distanceKm, setDistanceKm] = useState(24.5);
  const [etaMins, setEtaMins] = useState(48);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setSpeed(Math.floor(42 + Math.random() * 12));
    }, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen || !duty) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-slate-900 w-full max-w-md h-full sm:h-[92vh] sm:rounded-3xl overflow-hidden flex flex-col text-white shadow-2xl relative">
        {/* Top Navigation HUD Banner (Android Turn-by-Turn GPS style) */}
        <div className="bg-[#0d5921] px-4 py-3 flex items-center justify-between shadow-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Navigation size={22} className="rotate-45 fill-white" />
            </div>
            <div>
              <p className="text-[11px] text-emerald-200 font-semibold uppercase tracking-wider">
                In 800m &bull; Keep Right
              </p>
              <h2 className="text-sm font-black text-white leading-tight">
                Exit 65 toward San Fernando / Dolores
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Simulated Map Container with Graphic Routes */}
        <div className="relative flex-1 bg-[#1e293b] overflow-hidden flex flex-col items-center justify-center">
          {/* Map Grid Pattern */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)`,
              backgroundSize: "32px 32px",
            }}
          />

          {/* Simulated Highway Curves */}
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M 50 400 Q 120 300 200 220 T 320 80"
              fill="none"
              stroke="#334155"
              strokeWidth="24"
              strokeLinecap="round"
            />
            {/* Active GPS Route in Vibrant Green */}
            <path
              d="M 50 400 Q 120 300 200 220 T 320 80"
              fill="none"
              stroke="#10b981"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="12 6"
              className="animate-pulse"
            />
          </svg>

          {/* Animated Driver Truck Marker */}
          <div className="absolute left-[38%] top-[55%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-emerald-500/30 animate-ping absolute inset-0" />
              <div className="w-12 h-12 rounded-full bg-[#0d5921] border-2 border-white flex items-center justify-center shadow-lg relative">
                <Navigation size={22} className="text-white fill-white rotate-45" />
              </div>
            </div>
            <span className="mt-1 bg-slate-900/90 text-[10px] font-bold text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/40">
              NDG-4209 (You)
            </span>
          </div>

          {/* Destination Pin Marker */}
          <div className="absolute right-[22%] top-[18%] flex flex-col items-center z-10">
            <div className="w-9 h-9 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center shadow-lg animate-bounce">
              <MapPin size={18} className="text-white fill-white" />
            </div>
            <span className="mt-1 bg-slate-900/90 text-[10px] font-bold text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/40 truncate max-w-[120px]">
              {duty.retailer}
            </span>
          </div>

          {/* Speedometer Badge Floating on Map */}
          <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md border border-slate-700/80 rounded-2xl p-2.5 text-center shadow-lg">
            <span className="text-2xl font-black text-white leading-none block">
              {speed}
            </span>
            <span className="text-[9px] uppercase font-bold text-slate-400">KM / H</span>
          </div>

          {/* GPS Signal Status Badge */}
          <div className="absolute top-4 right-4 bg-emerald-950/80 border border-emerald-600/50 text-emerald-300 rounded-full px-2.5 py-1 text-[10px] font-bold flex items-center gap-1.5 shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>GPS Locked &bull; Precision 3m</span>
          </div>
        </div>

        {/* Bottom Destination HUD Card */}
        <div className="bg-slate-900 border-t border-slate-800 p-4 space-y-3">
          {/* Trip Stats Row */}
          <div className="grid grid-cols-3 gap-2 bg-slate-800/80 rounded-2xl p-2.5 border border-slate-700/60 text-center">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">ETA</p>
              <p className="text-sm font-black text-emerald-400 mt-0.5">11:30 AM</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Time Left</p>
              <p className="text-sm font-black text-white mt-0.5">{etaMins} mins</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Distance</p>
              <p className="text-sm font-black text-white mt-0.5">{distanceKm} km</p>
            </div>
          </div>

          {/* Destination Details & Shortcuts */}
          <div className="flex items-center justify-between">
            <div className="truncate max-w-[70%]">
              <p className="text-xs font-bold text-white truncate">
                {duty.retailer} &bull; {duty.batchNo}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {duty.retailerAddress || "Greenfields Market Mall, Bay 2"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`tel:${duty.retailerContact || "+639178421092"}`}
                className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-md transition-colors"
                title="Call Retailer"
              >
                <Phone size={16} />
              </a>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                title="Minimize Map"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Mark as Arrived CTA */}
          <button
            type="button"
            onClick={() => {
              if (onArrived) onArrived(duty);
              onClose();
            }}
            className="w-full py-3 bg-[#0d5921] hover:bg-[#0b4b1c] active:scale-[0.98] text-white rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <CheckCircle2 size={16} />
            <span>Mark as Arrived at Drop-off Bay</span>
          </button>
        </div>
      </div>
    </div>
  );
}
