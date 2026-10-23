import React from "react";
import { Search, Bell } from "lucide-react";
import logoImg from "../../../assets/Logo.png";

export default function WarehouseDriverHeader({
  onSearchClick,
  onNotificationClick,
  onProfileClick,
  unreadNotifications = 1,
  userInitials = "KA",
}) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200/90 px-4 py-2.5 flex items-center justify-between shadow-2xs">
      {/* Brand Logo */}
      <div className="flex items-center">
        <img
          src={logoImg}
          alt="GrainRise"
          className="h-8 w-auto object-contain"
        />
      </div>

      {/* Action Icons & Driver Profile */}
      <div className="flex items-center gap-2.5">
        {/* Search button */}
        <button
          onClick={onSearchClick}
          aria-label="Search duties"
          type="button"
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
        >
          <Search size={19} strokeWidth={2} />
        </button>

        {/* Notifications with Unread Dot */}
        <button
          onClick={onNotificationClick}
          aria-label="Notifications"
          type="button"
          className="relative w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
        >
          <Bell size={19} strokeWidth={2} />
          {unreadNotifications > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#f43f5e] ring-2 ring-white" />
          )}
        </button>

        {/* Driver Profile Avatar */}
        <button
          onClick={onProfileClick}
          aria-label="Driver profile"
          type="button"
          className="w-8 h-8 rounded-full bg-[#0d5921] text-white flex items-center justify-center text-xs font-black shadow-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
        >
          {userInitials}
        </button>
      </div>
    </header>
  );
}
