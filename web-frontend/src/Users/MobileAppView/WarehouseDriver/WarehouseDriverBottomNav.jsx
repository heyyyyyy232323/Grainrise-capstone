import React from "react";
import { LayoutGrid, Truck, MessageSquare, CreditCard, MoreHorizontal } from "lucide-react";

export default function WarehouseDriverBottomNav({
  activeTab = "dashboard",
  onTabChange,
  unreadMessagesCount = 0,
  pendingPaymentsCount = 1,
}) {
  const tabs = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutGrid,
    },
    {
      id: "duties",
      label: "Duties",
      icon: Truck,
      badge: null,
    },
    {
      id: "messages",
      label: "Messages",
      icon: MessageSquare,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : null,
    },
    {
      id: "payments",
      label: "Payments",
      icon: CreditCard,
      badge: null,
    },
    {
      id: "more",
      label: "More",
      icon: MoreHorizontal,
    },
  ];

  return (
    <nav className="sticky bottom-0 z-30 bg-white border-t border-slate-200/90 px-2 py-1.5 shadow-lg">
      <div className="grid grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange && onTabChange(tab.id)}
              className="relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer active:scale-95"
            >
              {/* Active top green bar indicator matching Figma */}
              {isActive && (
                <span className="absolute -top-1.5 w-7 h-1 rounded-full bg-[#00580C]" />
              )}

              <div className="relative">
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={isActive ? "text-[#00580C]" : "text-slate-400"}
                />
                {tab.badge && !isActive && (
                  <span className="absolute -top-1 -right-2 bg-amber-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[10px] tracking-tight mt-1 truncate max-w-full ${
                  isActive ? "font-bold text-[#00580C]" : "font-medium text-slate-500"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
