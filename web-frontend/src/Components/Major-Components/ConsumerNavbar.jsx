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
  { label: "Orders", path: "/consumer/orders" },
  { label: "Promotions & Rewards", path: "/consumer/promotions" },
];

export default function ConsumerNavbar({
  activePath,
  cartCount = 3,
  wishlistCount = 12,
  cartItems = [],
  wishlistItems = [],
  onCartClick,
  onNotificationsClick,
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [cartPanelOpen, setCartPanelOpen] = useState(false);
  const [cartPanelTab, setCartPanelTab] = useState("cart");
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
          <div className="hidden md:flex items-center gap-2 sm:gap-2.5">
            {CONSUMER_NAV_LINKS.map((link) => {
              const isActive =
                currentPath === link.path ||
                (link.path === "/consumer/marketplace" &&
                  currentPath === "/consumermarketplace");

              if (link.label === "Marketplace") {
                const marketplaceSectionActive =
                  isActive ||
                  currentPath === "/consumer/retailers-nearby" ||
                  currentPath === "/consumer/nearby-retailers" ||
                  currentPath === "/retailers-nearby" ||
                  currentPath === "/nearby-retailers" ||
                  currentPath === "/consumer/market-prices" ||
                  currentPath === "/market-prices";

                return (
                  <div key={link.label} className="relative">
                    <div
                      className={`flex items-center rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer select-none ${
                        marketplaceSectionActive
                          ? "bg-[#00580C] text-white shadow-xs"
                          : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      <button
                        type="button"
                        aria-haspopup="menu"
                        aria-expanded={marketplaceOpen}
                        onClick={() => setMarketplaceOpen((isOpen) => !isOpen)}
                        className="px-3.5 py-1.5 font-semibold cursor-pointer"
                      >
                        {link.label}
                      </button>
                      <button
                        type="button"
                        aria-label="Open Marketplace menu"
                        aria-expanded={marketplaceOpen}
                        aria-haspopup="menu"
                        onClick={() => setMarketplaceOpen((isOpen) => !isOpen)}
                        className="pr-2.5 py-1.5 cursor-pointer"
                      >
                        <ChevronDown
                          size={13}
                          className={`transition-transform ${marketplaceOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                    </div>

                    {marketplaceOpen && (
                      <div
                        role="menu"
                        className="absolute left-0 top-full mt-2 w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-xl z-50"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setMarketplaceOpen(false);
                            navigate("/consumer/marketplace");
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                        >
                          Marketplace
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setMarketplaceOpen(false);
                            navigate("/consumer/retailers-nearby");
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                        >
                          Retailers Nearby
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setMarketplaceOpen(false);
                            navigate("/consumer/market-prices");
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                        >
                          Market Price
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

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

        {/* Right: Actions (Cart, Bell) & User Profile */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Cart */}
          <div className="relative">
            <button
              id="consumer-nav-cart"
              onClick={() => {
                setCartPanelOpen((isOpen) => !isOpen);
              }}
              className="relative p-1.5 sm:p-2 rounded-full hover:bg-gray-100 text-gray-700 transition cursor-pointer"
              title="Cart and Wishlist"
              aria-label="Open cart and wishlist"
              aria-expanded={cartPanelOpen}
            >
              <ShoppingCart size={19} className="text-gray-700" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#00580C] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            </button>

            {cartPanelOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white shadow-xl z-50 overflow-hidden">
                <div className="flex border-b border-gray-200">
                  {[
                    { key: "cart", label: "Cart", count: cartCount, icon: ShoppingCart },
                    { key: "wishlist", label: "Wishlist", count: wishlistCount, icon: Heart },
                  ].map(({ key, label, count, icon: TabIcon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCartPanelTab(key)}
                      className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-3 text-xs font-semibold transition ${
                        cartPanelTab === key
                          ? "border-b-2 border-[#00580C] text-[#00580C]"
                          : "text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <TabIcon size={14} />
                      {label}
                      <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                        {count}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="max-h-72 overflow-y-auto p-3">
                  {(cartPanelTab === "cart" ? cartItems : wishlistItems).length > 0 ? (
                    <div className="space-y-2">
                      {(cartPanelTab === "cart" ? cartItems : wishlistItems).map((item, index) => (
                        <div key={item.id || item.name || index} className="flex items-center gap-3 rounded-lg bg-gray-50 p-2.5">
                          {item.image ? (
                            <img src={item.image} alt="" className="h-10 w-10 rounded-md object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-100 text-[#00580C]">
                              {cartPanelTab === "cart" ? <ShoppingCart size={16} /> : <Heart size={16} />}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-gray-800">
                              {item.name || item.title || "Saved product"}
                            </p>
                            {item.price != null && (
                              <p className="text-[11px] text-gray-500">₱{item.price}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-gray-500">
                      {cartPanelTab === "cart"
                        ? cartCount > 0
                          ? `${cartCount} item${cartCount === 1 ? "" : "s"} in your cart.`
                          : "Your cart is empty."
                        : wishlistCount > 0
                          ? `${wishlistCount} saved item${wishlistCount === 1 ? "" : "s"}.`
                          : "Your wishlist is empty."}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

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
