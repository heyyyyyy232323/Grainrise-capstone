import React from "react";
import { Truck, CheckSquare, CreditCard, MessageSquare } from "lucide-react";

export default function MillerDriverKPICards({ metrics, onCardClick }) {
  const cards = [
    {
      key: "active",
      label: "ACTIVE",
      value: metrics?.active?.value ?? 1,
      subtext: "Deliveries in progress",
      subtextColor: "text-emerald-800",
      icon: <Truck size={17} className="text-[#16a34a]" strokeWidth={2.4} />,
      targetTab: "duties",
    },
    {
      key: "assigned",
      label: "ASSIGNED",
      value: metrics?.assigned?.value ?? 7,
      subtext: "Ready for dispatch",
      subtextColor: "text-slate-400",
      icon: <CheckSquare size={17} className="text-[#16a34a]" strokeWidth={2.4} />,
      targetTab: "duties",
    },
    {
      key: "pending",
      label: "PENDING",
      value: metrics?.pending?.value ?? 1,
      subtext: "Payment follow-up",
      subtextColor: "text-amber-700",
      icon: <CreditCard size={17} className="text-amber-500" strokeWidth={2.4} />,
      targetTab: "payments",
    },
    {
      key: "unread",
      label: "UNREAD",
      value: metrics?.unread?.value ?? 0,
      subtext: "No unread chats",
      subtextColor: "text-slate-400",
      icon: <MessageSquare size={17} className="text-purple-500" strokeWidth={2.4} />,
      targetTab: "messages",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {cards.map((c) => (
        <div
          key={c.key}
          onClick={() => onCardClick && onCardClick(c.targetTab)}
          className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-xs active:scale-[0.99] transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] font-black uppercase tracking-wider ${
                c.key === "pending" ? "text-amber-700" : "text-slate-400"
              }`}
            >
              {c.label}
            </span>
            <div className="shrink-0">{c.icon}</div>
          </div>

          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              {c.value}
            </div>
            <p className={`text-[11px] font-medium truncate mt-1.5 ${c.subtextColor}`}>
              {c.subtext}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
