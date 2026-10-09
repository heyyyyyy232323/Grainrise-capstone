import React from "react";
import { Clock, AlertTriangle, Truck, RotateCcw } from "lucide-react";

export default function RetailerMobileKPICards({ metrics = [], onCardClick }) {
  const getIcon = (type) => {
    switch (type) {
      case "peso":
        return (
          <span className="w-6.5 h-6.5 rounded-full bg-[#e8fbf3] text-[#10b981] flex items-center justify-center text-[12px] font-black shrink-0">
            ₱
          </span>
        );
      case "alert":
        return (
          <span className="w-6.5 h-6.5 rounded-full bg-[#fef5eb] text-[#f59e0b] flex items-center justify-center shrink-0">
            <Clock size={13} strokeWidth={2.4} />
          </span>
        );
      case "truck":
        return (
          <span className="w-6.5 h-6.5 rounded-full bg-[#e6f8fa] text-[#00acc1] flex items-center justify-center shrink-0">
            <Truck size={13} strokeWidth={2.4} />
          </span>
        );
      case "rotate":
        return (
          <span className="w-6.5 h-6.5 rounded-full bg-[#fdedee] text-[#f87171] flex items-center justify-center shrink-0">
            <RotateCcw size={13} strokeWidth={2.4} />
          </span>
        );
      default:
        return null;
    }
  };

  const getFooterIcon = (id) => {
    if (id === "sales-today") return <span className="text-[#10b981] font-bold text-xs">↗</span>;
    if (id === "low-stock") return <span className="text-[#f59e0b] text-xs">⚠</span>;
    if (id === "active-orders") return <Clock size={11} className="text-[#00acc1]" strokeWidth={2.2} />;
    return <Clock size={11} className="text-[#f87171]" strokeWidth={2.2} />;
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {metrics.map((item) => (
        <div
          key={item.id}
          onClick={() => onCardClick && onCardClick(item)}
          className="bg-white rounded-2xl border border-gray-100/90 p-3.5 shadow-2xs flex flex-col justify-between hover:border-emerald-200 active:scale-[0.98] transition-all cursor-pointer select-none min-h-[106px]"
        >
          {/* Top row: Title + Icon Badge */}
          <div className="flex items-start justify-between gap-1">
            <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">
              {item.title}
            </span>
            {getIcon(item.iconType)}
          </div>

          {/* Value */}
          <div className="text-2xl font-black text-gray-900 tracking-tight my-0.5">
            {item.value}
          </div>

          {/* Subtext with Icon */}
          <div className="flex items-center gap-1.5 text-[10.5px] text-gray-500 font-medium leading-tight">
            {getFooterIcon(item.id)}
            <span className="truncate">{item.subtext}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
