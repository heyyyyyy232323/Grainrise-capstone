import React from "react";
import { Search, Bell } from "lucide-react";
import logoImg from "../../../assets/Logo.png";

export default function RetailerMobileHeader({
  onSearchClick,
  onNotificationClick,
  onProfileClick,
  unreadCount = 2,
  userInitials = "KA",
}) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b-2 border-[#0091ff] px-4 py-2.5 flex items-center justify-between shadow-2xs">
      {/* Brand Logo from Assets */}
      <div className="flex items-center">
        <img
          src={logoImg}
          alt="GrainRise"
          className="h-8 w-auto object-contain"
        />
      </div>

      {/* Action Icons & Profile */}
      <div className="flex items-center gap-3">
        {/* Search button */}
        <button
          onClick={onSearchClick}
          aria-label="Search"
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
        >
          <Search size={19} strokeWidth={2} />
        </button>

        {/* Notifications with Unread Dot */}
        <button
          onClick={onNotificationClick}
          aria-label="Notifications"
          className="relative w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
        >
          <Bell size={19} strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#f43f5e] ring-2 ring-white" />
          )}
        </button>

        {/* Profile Avatar Badge */}
        <button
          onClick={onProfileClick}
          aria-label="User profile"
          className="w-8 h-8 rounded-full bg-[#0d5921] text-white flex items-center justify-center text-xs font-black shadow-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
        >
          {userInitials}
        </button>
      </div>
    </header>
  );
}
