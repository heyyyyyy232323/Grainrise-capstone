import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  ShoppingBag,
  AlertTriangle,
  Truck,
  CreditCard,
  Package,
  ArrowRight,
  Store,
  CalendarDays,
} from "lucide-react";
import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import KPICard from "../../Components/Graphs/KPICard";

const kpiMetrics = [
  {
    title: "TODAY'S REVENUE",
    value: "₱48,500",
    trend: "+12.4% vs yesterday",
    tone: "success",
    icon: <TrendingUp size={18} strokeWidth={2.2} />,
  },
  {
    title: "TOTAL ORDERS SOLD",
    value: "32",
    trend: "Completed POS transactions",
    tone: "neutral",
    icon: <ShoppingBag size={18} strokeWidth={2.2} />,
  },
  {
    title: "LOW STOCK ALERTS",
    value: "3 Variants",
    trend: "Requires warehouse restock",
    tone: "warning",
    icon: <AlertTriangle size={18} strokeWidth={2.2} />,
  },
  {
    title: "PENDING DELIVERIES",
    value: "2 Shipments",
    trend: "Estimated arrival today",
    tone: "success",
    icon: <Truck size={18} strokeWidth={2.2} />,
  },
];

const RECENT_SALES = [
  { id: "REC-0104", time: "02:15 PM", variant: "Dinorado (50kg)", qty: "4 sacks", amount: "₱10,600", method: "Cash" },
  { id: "REC-0103", time: "01:40 PM", variant: "Sinandomeng (25kg)", qty: "6 sacks", amount: "₱7,500", method: "Card" },
  { id: "REC-0102", time: "11:20 AM", variant: "Jasmine Rice (50kg)", qty: "2 sacks", amount: "₱4,400", method: "Cash" },
  { id: "REC-0101", time: "09:50 AM", variant: "RC222 Tubigan (50kg)", qty: "10 sacks", amount: "₱18,000", method: "Cash" },
];

const LOW_STOCK_ITEMS = [
  { name: "Dinorado Rice (Premium)", stock: "100 kg", minStock: "500 kg", status: "Low Stock" },
  { name: "Milagrosa Fragrant", stock: "0 kg", minStock: "300 kg", status: "Out of Stock" },
  { name: "Sinandomeng Special (25kg)", stock: "150 kg", minStock: "400 kg", status: "Low Stock" },
];

export default function RetailerDashboard() {
  const navigate = useNavigate();
  const now = new Date();
  const formattedDate = now.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <Breadcrumbs items={[{ label: "Main" }, { label: "Dashboard" }]} />
          <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-slate-900">
            Retailer Dashboard
          </h2>
          <p className="text-sm text-slate-500">
            Monitor store sales performance, warehouse deliveries, and inventory status.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm">
          <CalendarDays size={16} className="text-slate-500" />
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* ── KPI Row ──────────────────────────────────────────────────────────── */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {kpiMetrics.map((metric) => (
          <KPICard key={metric.title} {...metric} />
        ))}
      </div>

      {/* ── Quick Actions Row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => navigate("/retailer/point-of-sale")}
          className="flex items-center justify-between p-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl shadow-sm transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <CreditCard size={20} />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm">Open Point of Sale</p>
              <p className="text-xs text-emerald-100">Process new store order</p>
            </div>
          </div>
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => navigate("/retailer/warehouse-marketplace")}
          className="flex items-center justify-between p-4 bg-white hover:border-emerald-400 border border-slate-200 text-gray-800 rounded-2xl shadow-sm transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Store size={20} />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm">Warehouse Marketplace</p>
              <p className="text-xs text-gray-500">Order wholesale rice stock</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-gray-400 group-hover:translate-x-1 group-hover:text-emerald-700 transition-all" />
        </button>

        <button
          onClick={() => navigate("/retailer/inventory")}
          className="flex items-center justify-between p-4 bg-white hover:border-emerald-400 border border-slate-200 text-gray-800 rounded-2xl shadow-sm transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Package size={20} />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm">Manage Inventory</p>
              <p className="text-xs text-gray-500">View stocks & batch expiries</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-gray-400 group-hover:translate-x-1 group-hover:text-emerald-700 transition-all" />
        </button>
      </div>

      {/* ── Main Two Column Section ─────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Recent Transactions Table (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Today's Transactions</h3>
              <p className="text-xs text-gray-500">Recent customer checkouts</p>
            </div>
            <button
              onClick={() => navigate("/retailer/sales-history")}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              View Full History <ArrowRight size={13} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Receipt No</th>
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">Rice Variant</th>
                  <th className="px-4 py-3 text-left">Qty</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {RECENT_SALES.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-emerald-700">{row.id}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{row.time}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.variant}</td>
                    <td className="px-4 py-3 text-gray-600">{row.qty}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{row.amount}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block text-[11px] font-semibold bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                        {row.method}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Warning (1 col) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-lg">Stock Alerts</h3>
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
              Attention
            </span>
          </div>
          <p className="text-xs text-gray-500">Items nearing replenishment threshold:</p>

          <div className="space-y-3">
            {LOW_STOCK_ITEMS.map((item, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1.5">
                <div className="flex justify-between items-start">
                  <p className="font-semibold text-sm text-gray-900">{item.name}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    item.status === "Out of Stock" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {item.status}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Current: <strong className="text-gray-800">{item.stock}</strong></span>
                  <span>Threshold: {item.minStock}</span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate("/retailer/warehouse-marketplace")}
            className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            Order Wholesale Stock <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
