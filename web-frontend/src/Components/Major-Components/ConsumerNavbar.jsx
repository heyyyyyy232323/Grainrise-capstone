import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Heart,
  ShoppingCart,
  Bell,
  ChevronDown,
  CircleUserRound,
  LogOut,
} from "lucide-react";
import Logo from "../../assets/Logo.png";

export const CONSUMER_NAV_LINKS = [
  { label: "Home", path: "/consumer/home" },
  { label: "Marketplace", path: "/consumer/marketplace" },
  { label: "Retailers Nearby", path: "/consumer/retailers-nearby" },
  { label: "Orders", path: "/consumer/orders" },
  { label: "Promotions & Rewards", path: "/consumer/promotions" },
  { label: "Market Prices", path: "/consumer/market-prices" },
];

export default function ConsumerNavbar({
  activePath,
  cartCount = 3,
  wishlistCount = 12,
  onWishlistClick,
  onCartClick,
  onNotificationsClick,
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = activePath || location.pathname;

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 flex items-center justify-between h-14 sm:h-16">
        {/* Left: Logo & Nav Links together */}
        <div className="flex items-center gap-4 lg:gap-6">
          {/* Logo */}
          <div
            className="flex items-center gap-2 shrink-0 cursor-pointer select-none"
            onClick={() => navigate("/consumer/home")}
          >
            <img src={Logo} alt="GrainRise" className="h-7 sm:h-8 w-auto object-contain" />
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1 sm:gap-1.5">
            {CONSUMER_NAV_LINKS.map((link) => {
              const isActive =
                currentPath === link.path ||
                (link.path === "/consumer/marketplace" &&
                  currentPath === "/consumermarketplace");
              return (
                <button
                  key={link.label}
                  onClick={() => navigate(link.path)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer select-none ${
                    isActive
                      ? "bg-[#00580C] text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Actions (Wishlist, Cart, Bell) & User Profile */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Wishlist */}
          <button
            id="consumer-nav-wishlist"
            onClick={
              onWishlistClick ||
              (() => navigate("/consumer/wishlist"))
            }
            className="relative p-1.5 sm:p-2 rounded-full hover:bg-gray-100 text-[#00580C] transition cursor-pointer"
            title="Wishlist"
          >
            <Heart size={19} className="text-[#00580C]" />
            {wishlistCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#00580C] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {wishlistCount}
              </span>
            )}
          </button>

          {/* Cart */}
          <button
            id="consumer-nav-cart"
            onClick={
              onCartClick ||
              (() => navigate("/consumer/marketplace"))
            }
            className="relative p-1.5 sm:p-2 rounded-full hover:bg-gray-100 text-gray-700 transition cursor-pointer"
            title="Cart"
          >
            <ShoppingCart size={19} className="text-gray-700" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#00580C] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          </button>

          {/* Notifications */}
          <button
            id="consumer-nav-notifications"
            onClick={onNotificationsClick || (() => {})}
            className="relative p-1.5 sm:p-2 rounded-full hover:bg-gray-100 text-gray-700 transition cursor-pointer"
            title="Notifications"
          >
            <Bell size={19} className="text-gray-700" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-400 border-2 border-white rounded-full" />
          </button>

          {/* Profile User Info */}
          <div className="relative pl-1 sm:pl-2">
            <button
              id="consumer-nav-profile"
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-2 py-1 text-left transition cursor-pointer select-none"
            >
              {/* User Avatar Circle */}
              <div className="w-8 h-8 rounded-full bg-[#00580C] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                K
              </div>

              {/* User Details */}
              <div className="hidden sm:block leading-tight">
                <p className="text-xs font-bold text-gray-900">
                  Kerbie Hector Abanid
                </p>
                <p className="text-[10px] text-gray-400 font-normal">
                  Abanid1@gmail.com
                </p>
              </div>

              <ChevronDown size={13} className="text-gray-400 hidden sm:block ml-0.5" />
            </button>

            {/* Dropdown Menu */}
            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-50 animate-in fade-in duration-150">
                <div className="px-4 py-2 border-b border-gray-100 sm:hidden">
                  <p className="text-xs font-bold text-gray-900">
                    Kerbie Hector Abanid
                  </p>
                  <p className="text-[10px] text-gray-400">
                    Abanid1@gmail.com
                  </p>
                </div>
                <button
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer text-left font-medium"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/consumer/account-settings");
                  }}
                >
                  <CircleUserRound size={15} /> Account Settings
                </button>
                <hr className="my-1 border-gray-100" />
                <button
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 cursor-pointer text-left font-medium"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/login");
                  }}
                >
                  <LogOut size={15} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
