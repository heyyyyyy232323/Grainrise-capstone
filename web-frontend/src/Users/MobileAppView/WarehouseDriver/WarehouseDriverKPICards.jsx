import React from "react";
import { Truck, CheckSquare, CreditCard, MessageSquare } from "lucide-react";

export default function WarehouseDriverKPICards({
  metrics,
  onCardClick,
}) {
  const cards = [
    {
      id: "active",
      label: metrics?.active?.label || "ACTIVE",
      value: metrics?.active?.value ?? 1,
      subtext: metrics?.active?.subtext || "Deliveries in progress",
      labelColor: "text-slate-500",
      subtextColor: "text-emerald-600 font-medium",
      icon: <Truck size={20} strokeWidth={2.2} className="text-emerald-600" />,
      targetTab: "duties",
    },
    {
      id: "assigned",
      label: metrics?.assigned?.label || "ASSIGNED",
      value: metrics?.assigned?.value ?? 7,
      subtext: metrics?.assigned?.subtext || "Ready for dispatch",
      labelColor: "text-slate-500",
      subtextColor: "text-slate-400 font-medium",
      icon: <CheckSquare size={19} strokeWidth={2.2} className="text-emerald-600" />,
      targetTab: "duties",
    },
    {
      id: "pending",
      label: metrics?.pending?.label || "PENDING",
      value: metrics?.pending?.value ?? 1,
      subtext: metrics?.pending?.subtext || "Payment follow-up",
      labelColor: "text-[#b45309] font-bold",
      subtextColor: "text-[#b45309] font-medium",
      icon: <CreditCard size={19} strokeWidth={2.2} className="text-amber-500" />,
      targetTab: "payments",
    },
    {
      id: "unread",
      label: metrics?.unread?.label || "UNREAD",
      value: metrics?.unread?.value ?? 0,
      subtext: metrics?.unread?.subtext || "No unread chats",
      labelColor: "text-slate-500",
      subtextColor: "text-slate-400 font-medium",
      icon: <MessageSquare size={19} strokeWidth={2.2} className="text-purple-500" />,
      targetTab: "messages",
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-3" aria-label="Key Performance Indicators">
      {cards.map((card) => (
        <div
          key={card.id}
          onClick={() => onCardClick && onCardClick(card.targetTab, card.id)}
          className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs hover:shadow-xs transition-all active:scale-[0.98] cursor-pointer flex flex-col justify-between"
        >
          {/* Top row: Label & Icon */}
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] tracking-wider uppercase font-bold ${card.labelColor}`}
            >
              {card.label}
            </span>
            <div className="flex items-center justify-center">
              {card.icon}
            </div>
          </div>

          {/* Value */}
          <div className="mt-2 mb-1">
            <span className="text-[28px] font-black text-slate-900 leading-none">
              {card.value}
            </span>
          </div>

          {/* Subtext */}
          <p className={`text-[11px] truncate ${card.subtextColor}`}>
            {card.subtext}
          </p>
        </div>
      ))}
    </section>
  );
}
