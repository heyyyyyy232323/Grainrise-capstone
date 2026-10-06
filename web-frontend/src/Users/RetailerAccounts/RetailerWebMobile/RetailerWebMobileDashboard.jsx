import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CreditCard,
  Package,
  Store,
  Truck,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Bell,
  Search,
  LogOut,
  ChevronRight,
  ShoppingBag,
  X,
  BarChart3,
  Receipt,
} from "lucide-react";
import Logo from "../../../assets/Logo.png";

// ── Mock data ──────────────────────────────────────────────────────────────────
const KPI = [
  { label: "Today's Sales", value: "₱48,250", delta: "+12.4%", ok: true, icon: TrendingUp, bg: "bg-emerald-50", fg: "text-emerald-600" },
  { label: "Active Orders", value: "20", delta: "+3 new", ok: true, icon: Truck, bg: "bg-sky-50", fg: "text-sky-600" },
  { label: "Low Stock", value: "4", delta: "Needs restock", ok: false, icon: AlertTriangle, bg: "bg-amber-50", fg: "text-amber-600" },
  { label: "Monthly Revenue", value: "₱2.4M", delta: "+8.2%", ok: true, icon: BarChart3, bg: "bg-purple-50", fg: "text-purple-600" },
];

const RECENT_ORDERS = [
  { id: "WR-2026-021", product: "Sinandomeng Special", qty: "500 kg", status: "Preparing", statusType: "preparing" },
  { id: "WR-2026-019", product: "Jasmine Fragrant", qty: "300 kg", status: "In Transit", statusType: "in-transit" },
  { id: "WR-2026-017", product: "Dinorado Premium", qty: "250 kg", status: "Processing", statusType: "processing" },
];

const STOCK_ALERTS = [
  { name: "Dinorado Premium", stock: "0 kg", status: "Out of Stock", isOut: true },
  { name: "Brown Rice Health", stock: "150 kg", status: "Low Stock", isOut: false },
  { name: "Sinandomeng S.", stock: "100 kg", status: "Low Stock", isOut: false },
];

const RECENT_SALES = [
  { id: "POS-0831", variant: "Dinorado Premium", qty: "25 kg", amount: "₱1,375", time: "11:45 AM" },
  { id: "POS-0830", variant: "Sinandomeng", qty: "50 kg", amount: "₱2,400", time: "11:20 AM" },
  { id: "POS-0829", variant: "Jasmine Fragrant", qty: "25 kg", amount: "₱1,625", time: "10:58 AM" },
];

const statusBadge = (type) => {
  switch (type) {
    case "preparing": return "bg-amber-100 text-amber-700";
    case "in-transit": return "bg-sky-100 text-sky-700";
    case "processing": return "bg-indigo-100 text-indigo-700";
    default: return "bg-gray-100 text-gray-600";
  }
};

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/retailer/web-mobile" },
  { id: "pos", label: "Point of Sale", icon: CreditCard, path: "/retailer/point-of-sale" },
  { id: "orders", label: "Orders", icon: Truck, path: "/retailer/order-tracking" },
  { id: "inventory", label: "Inventory", icon: Package, path: "/retailer/inventory" },
  { id: "marketplace", label: "Marketplace", icon: Store, path: "/retailer/warehouse-marketplace" },
];

// ── Main Component ─────────────────────────────────────────────────────────────
export default function RetailerWebMobileDashboard() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState("dashboard");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-[#f5f7fa] font-sans text-gray-900 antialiased max-w-md mx-auto relative flex flex-col">

      {/* ── Top App Bar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between">
        <img src={Logo} alt="GrainRise" className="h-7 w-auto object-contain" />

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSearch(true)}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition cursor-pointer"
          >
            <Search size={17} className="text-gray-600" />
          </button>

          <button
            onClick={() => setShowNotifications(true)}
            className="relative w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition cursor-pointer"
          >
            <Bell size={17} className="text-gray-600" />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500" />
          </button>

          <button
            onClick={() => navigate("/retailer/dashboard")}
            className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg cursor-pointer transition"
          >
            Desktop View
          </button>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 px-4 py-4 space-y-5 pb-24">

        {/* Greeting */}
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Good morning, KA 👋</h1>
          <p className="text-xs text-gray-500 mt-0.5">Here's your store overview for today.</p>
        </div>

        {/* ── KPI Cards 2×2 ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {KPI.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-gray-500">{m.label}</p>
                  <span className={`w-7 h-7 rounded-lg ${m.bg} ${m.fg} flex items-center justify-center`}>
                    <Icon size={14} />
                  </span>
                </div>
                <p className="text-xl font-black text-gray-900 leading-tight">{m.value}</p>
                <p className={`text-[10px] font-bold ${m.ok ? "text-emerald-600" : "text-amber-600"}`}>{m.delta}</p>
              </div>
            );
          })}
        </div>

        {/* ── Quick Actions Row ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/retailer/point-of-sale")}
            className="flex items-center gap-3 p-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl shadow-sm transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <CreditCard size={16} />
            </div>
            <div className="text-left min-w-0">
              <p className="font-bold text-xs leading-tight">Open POS</p>
              <p className="text-[10px] text-emerald-100">New in-store sale</p>
            </div>
          </button>

          <button
            onClick={() => navigate("/retailer/warehouse-marketplace")}
            className="flex items-center gap-3 p-3.5 bg-white border border-gray-200 hover:border-emerald-300 text-gray-800 rounded-2xl shadow-sm transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Store size={16} />
            </div>
            <div className="text-left min-w-0">
              <p className="font-bold text-xs leading-tight">Marketplace</p>
              <p className="text-[10px] text-gray-500">Order wholesale</p>
            </div>
          </button>
        </div>

        {/* ── Active Orders ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
              <Truck size={15} className="text-sky-600" /> Active Orders
            </h2>
            <button
              onClick={() => navigate("/retailer/order-tracking")}
              className="text-[11px] font-bold text-emerald-700 flex items-center gap-0.5 cursor-pointer"
            >
              See all <ChevronRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {RECENT_ORDERS.map((ord) => (
              <div key={ord.id} className="px-4 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">{ord.product}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{ord.id} · {ord.qty}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-bold px-2.5 py-0.5 rounded-full ml-3 ${statusBadge(ord.statusType)}`}>
                  {ord.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Stock Alerts ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-600" /> Stock Alerts
            </h2>
            <button
              onClick={() => navigate("/retailer/inventory")}
              className="text-[11px] font-bold text-emerald-700 flex items-center gap-0.5 cursor-pointer"
            >
              Manage <ChevronRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {STOCK_ALERTS.map((item) => (
              <div key={item.name} className="px-4 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">{item.name}</p>
                  <p className="text-[10px] text-gray-400">Current stock: {item.stock}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-bold px-2.5 py-0.5 rounded-full ml-3 ${item.isOut ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
          <div className="px-4 pb-4 pt-2">
            <button
              onClick={() => navigate("/retailer/warehouse-marketplace")}
              className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              Order Wholesale Stock <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* ── Recent Transactions ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
              <Receipt size={15} className="text-emerald-700" /> Recent Sales
            </h2>
            <button
              onClick={() => navigate("/retailer/sales-history")}
              className="text-[11px] font-bold text-emerald-700 flex items-center gap-0.5 cursor-pointer"
            >
              Full history <ChevronRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {RECENT_SALES.map((s) => (
              <div key={s.id} className="px-4 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">{s.variant}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{s.id} · {s.qty} · {s.time}</p>
                </div>
                <span className="shrink-0 text-xs font-black text-gray-900 ml-3">{s.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ── Bottom Navigation ────────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200/80 px-2 py-1.5 shadow-lg z-30">
        <div className="grid grid-cols-5 gap-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveNav(item.id);
                  navigate(item.path);
                }}
                className="relative flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer active:scale-95"
              >
                {isActive && (
                  <span className="absolute -top-1.5 w-6 h-1 rounded-full bg-emerald-700" />
                )}
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={isActive ? "text-emerald-700" : "text-gray-400"}
                />
                <span className={`text-[9.5px] mt-0.5 tracking-tight truncate ${isActive ? "font-bold text-emerald-700" : "font-medium text-gray-500"}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Notifications Modal ──────────────────────────────────────────────── */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end">
          <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <Bell size={16} className="text-emerald-700" /> Notifications
              </h3>
              <button onClick={() => setShowNotifications(false)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer">
                <X size={14} />
              </button>
            </div>
            <div className="space-y-2.5">
              <div className="p-3 bg-amber-50 border border-amber-200/60 rounded-xl">
                <span className="text-[10px] font-bold text-amber-800 uppercase">Fulfillment Update</span>
                <p className="text-xs font-bold text-gray-900 mt-0.5">WR-2026-021 Preparing for Delivery</p>
                <p className="text-[11px] text-gray-500">Warehouse ABC packed 500 kg Sinandomeng</p>
              </div>
              <div className="p-3 bg-sky-50 border border-sky-200/60 rounded-xl">
                <span className="text-[10px] font-bold text-sky-800 uppercase">In Transit</span>
                <p className="text-xs font-bold text-gray-900 mt-0.5">WR-2026-019 is now In Transit</p>
                <p className="text-[11px] text-gray-500">Jasmine Fragrant Rice en route to your store</p>
              </div>
            </div>
            <button
              onClick={() => setShowNotifications(false)}
              className="w-full py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Mark All as Read
            </button>
          </div>
        </div>
      )}

      {/* ── Search Modal ─────────────────────────────────────────────────────── */}
      {showSearch && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-start pt-10 px-4">
          <div className="bg-white rounded-2xl w-full max-w-md mx-auto p-4 space-y-3 shadow-xl">
            <div className="flex items-center gap-2">
              <Search size={15} className="text-emerald-700 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Search orders, inventory, products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 text-xs text-gray-900 placeholder-gray-400 outline-none"
              />
              <button
                onClick={() => { setShowSearch(false); setSearchQuery(""); }}
                className="text-xs font-bold text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                Cancel
              </button>
            </div>
            <div className="pt-1 space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quick Links</p>
              {[
                { label: "My Inventory", path: "/retailer/inventory" },
                { label: "Order Tracking", path: "/retailer/order-tracking" },
                { label: "Point of Sale", path: "/retailer/point-of-sale" },
                { label: "Warehouse Marketplace", path: "/retailer/warehouse-marketplace" },
              ].map((s) => (
                <button
                  key={s.path}
                  onClick={() => { navigate(s.path); setShowSearch(false); }}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-gray-100 text-xs font-medium text-gray-800 transition cursor-pointer flex items-center gap-2"
                >
                  <ChevronRight size={12} className="text-gray-400" /> {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
