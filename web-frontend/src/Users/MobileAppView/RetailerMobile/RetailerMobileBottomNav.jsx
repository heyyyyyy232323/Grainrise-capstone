import React from "react";
import { LayoutGrid, CreditCard, Truck, Package, MoreHorizontal } from "lucide-react";

export default function RetailerMobileBottomNav({
  activeTab = "dashboard",
  onTabChange,
}) {
  const tabs = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutGrid,
    },
    {
      id: "pos",
      label: "Point of Sale",
      icon: CreditCard,
    },
    {
      id: "orders",
      label: "Orders",
      icon: Truck,
    },
    {
      id: "inventory",
      label: "Inventory",
      icon: Package,
    },
    {
      id: "more",
      label: "More",
      icon: MoreHorizontal,
    },
  ];

  return (
    <nav className="sticky bottom-0 z-30 bg-white border-t border-gray-200/80 px-2 py-1.5 shadow-lg">
      <div className="grid grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange && onTabChange(tab.id)}
              className="relative flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-all cursor-pointer active:scale-95"
            >
              {/* Active top green bar indicator matching Figma */}
              {isActive && (
                <span className="absolute -top-1.5 w-6 h-1 rounded-full bg-[#00580C]" />
              )}

              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 1.8}
                className={isActive ? "text-[#00580C]" : "text-gray-400"}
              />

              <span
                className={`text-[10px] tracking-tight mt-1 truncate max-w-full ${
                  isActive ? "font-bold text-[#00580C]" : "font-medium text-gray-500"
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
