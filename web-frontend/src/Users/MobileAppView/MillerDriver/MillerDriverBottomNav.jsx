import React from "react";
import {
  LayoutGrid,
  Truck,
  MessageSquare,
  Store,
  MoreHorizontal,
} from "lucide-react";

export default function MillerDriverBottomNav({
  activeTab,
  onTabChange,
  unreadMessagesCount = 0,
}) {
  const tabs = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <LayoutGrid size={20} strokeWidth={2.2} />,
    },
    {
      id: "duties",
      label: "Duties",
      icon: <Truck size={20} strokeWidth={2.2} />,
    },
    {
      id: "messages",
      label: "Messages",
      icon: <MessageSquare size={20} strokeWidth={2.2} />,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : null,
    },
    {
      id: "payments",
      label: "Payments",
      icon: <Store size={20} strokeWidth={2.2} />,
    },
    {
      id: "more",
      label: "More",
      icon: <MoreHorizontal size={20} strokeWidth={2.2} />,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/90 px-2 py-1 shadow-lg w-full">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 py-1 flex flex-col items-center justify-center gap-0.5 relative transition-all active:scale-95 cursor-pointer ${
                isActive
                  ? "text-[#0d5921] font-bold"
                  : "text-slate-400 hover:text-slate-600 font-medium"
              }`}
            >
              {/* Active Pill Indicator on top */}
              {isActive && (
                <span className="absolute -top-1 w-6 h-1 rounded-full bg-[#0d5921]" />
              )}

              <div className="relative">
                {tab.icon}
                {tab.badge && (
                  <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-[#f43f5e] text-white text-[9px] font-black flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
