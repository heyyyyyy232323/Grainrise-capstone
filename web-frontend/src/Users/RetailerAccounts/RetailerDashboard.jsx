import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  ChevronDown,
  DollarSign,
  AlertCircle,
  Truck,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Clock,
  MessageSquare,
  Package,
} from "lucide-react";

export default function RetailerDashboard() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState("Last 7 Days");

  // Metric summaries matching Figma
  const metrics = [
    {
      title: "SALES TODAY",
      value: "₱67,500",
      subtext: "Completed in-store sales today",
      trendIcon: "↗",
      icon: <DollarSign size={18} className="text-emerald-600" />,
      bgIcon: "bg-emerald-50",
      textColor: "text-emerald-600",
    },
    {
      title: "LOW STOCK PRODUCTS",
      value: "4",
      subtext: "Products that may need restocking",
      trendIcon: "⚠",
      icon: <AlertCircle size={18} className="text-amber-500" />,
      bgIcon: "bg-amber-50",
      textColor: "text-amber-600",
    },
    {
      title: "ACTIVE ORDERS",
      value: "7",
      subtext: "Warehouse orders in progress",
      trendIcon: "⏱",
      icon: <Truck size={18} className="text-cyan-600" />,
      bgIcon: "bg-cyan-50",
      textColor: "text-cyan-600",
    },
    {
      title: "OPEN RETURNS & ISSUES",
      value: "2",
      subtext: "Requests awaiting resolution",
      trendIcon: "⟳",
      icon: <RotateCcw size={18} className="text-rose-500" />,
      bgIcon: "bg-rose-50",
      textColor: "text-rose-600",
    },
  ];

  // Active orders list matching Figma
  const activeOrders = [
    {
      orderNo: "ORD-2026-021",
      warehouse: "Warehouse ABC",
      product: "Dinorado",
      quantity: "500 kg",
      total: "₱31,500",
      status: "Preparing for Delivery",
      statusType: "preparing",
    },
    {
      orderNo: "ORD-2026-019",
      warehouse: "North Caloocan Warehouse",
      product: "Jasmine Rice",
      quantity: "300 kg",
      total: "₱18,600",
      status: "In Transit",
      statusType: "in-transit",
    },
    {
      orderNo: "ORD-2026-017",
      warehouse: "Warehouse XYZ",
      product: "Sinandomeng",
      quantity: "250 kg",
      total: "₱14,500",
      status: "Processing",
      statusType: "processing",
    },
  ];

  // Stock attention items matching Figma
  const stockAttention = [
    {
      name: "Dinorado Premium",
      stock: "18 kg remaining",
      status: "Low Stock",
      statusType: "low",
    },
    {
      name: "Sinandomeng Special",
      stock: "9 kg remaining",
      status: "Low Stock",
      statusType: "low",
    },
    {
      name: "Jasmine Fragrant Rice",
      stock: "0 kg in warehouse",
      status: "Out of Stock",
      statusType: "out",
    },
  ];

  // Pending actions items matching Figma
  const pendingActions = [
    {
      type: "Low Stock",
      typeColor: "bg-amber-100 text-amber-800",
      ref: "WR-001",
      details: "Dinorado · 18 kg remaining",
      status: "Low Stock",
      statusDot: "bg-amber-500",
      statusText: "text-amber-700",
      updated: "10 mins ago",
      actionText: "View Inventory",
      actionVariant: "default",
      actionClick: () => navigate("/retailer/inventory"),
    },
    {
      type: "Order",
      typeColor: "bg-blue-100 text-blue-800",
      ref: "ORD-2026-0021",
      details: "Warehouse ABC · Dinorado - 500 kg",
      status: "Preparing for Delivery",
      statusDot: "bg-amber-500",
      statusText: "text-amber-700",
      updated: "25 mins ago",
      actionText: "Track",
      actionVariant: "green-outline",
      actionClick: () => navigate("/retailer/order-tracking"),
    },
    {
      type: "Return Issue",
      typeColor: "bg-rose-100 text-rose-800",
      ref: "RET-2026-0015",
      details: "Damaged packaging - 100 kg",
      status: "Under Review",
      statusDot: "bg-rose-500",
      statusText: "text-rose-700",
      updated: "1 hr ago",
      actionText: "View",
      actionVariant: "default",
      actionClick: () => navigate("/retailer/product-returns"),
    },
    {
      type: "Message",
      typeColor: "bg-teal-100 text-teal-800",
      ref: "Warehouse ABC",
      details: "New message regarding ORD-2026-0021",
      status: "Unread",
      statusDot: "bg-teal-500",
      statusText: "text-teal-700",
      updated: "2 hrs ago",
      actionText: "Open",
      actionVariant: "default",
      actionClick: () => navigate("/retailer/messages"),
    },
  ];

  // Recent activity logs matching Figma
  const recentActivities = [
    {
      title: "Sale Completed",
      desc: "Receipt POS-2026-0184 · Dinorado · ₱22,500",
      time: "5 mins ago",
      icon: <CheckCircle2 size={15} className="text-white" />,
      bgIcon: "bg-emerald-600",
      lineColor: "bg-emerald-500",
    },
    {
      title: "Inventory Updated",
      desc: "Dinorado stock reduced after completed POS transaction",
      time: "8 mins ago",
      icon: <RefreshCw size={14} className="text-white" />,
      bgIcon: "bg-blue-600",
      lineColor: "bg-blue-500",
    },
    {
      title: "Order Status Updated",
      desc: (
        <span>
          ORD-2026-0021 is now{" "}
          <span className="inline-block px-2 py-0.5 text-[11px] font-semibold rounded bg-amber-100 text-amber-800">
            Preparing for Delivery
          </span>
        </span>
      ),
      time: "32 mins ago",
      icon: <Truck size={14} className="text-white" />,
      bgIcon: "bg-amber-500",
      lineColor: "bg-amber-500",
    },
    {
      title: "Purchase Received",
      desc: "500 kg Dinorado received from Warehouse ABC into local store",
      time: "1 hr ago",
      icon: <CheckCircle2 size={15} className="text-white" />,
      bgIcon: "bg-teal-600",
      lineColor: "bg-teal-500",
    },
    {
      title: "Return Resolved",
      desc: "RET-2026-0012 has been marked as resolved and credited to account",
      time: "3 hrs ago",
      icon: <CheckCircle2 size={15} className="text-white" />,
      bgIcon: "bg-purple-600",
      lineColor: "bg-purple-500",
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* ── Breadcrumbs & Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-gray-500 mb-1">
            <span>Main</span>
            <span>&gt;</span>
            <span className="text-[#00580C] font-semibold">Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Last Updated: Today . 10:42 AM
          </p>
        </div>

        {/* Date Selector Pill */}
        <div className="inline-flex items-center gap-2 self-start sm:self-center bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm">
          <Calendar size={14} className="text-gray-400" />
          <span>July 19, 2026</span>
        </div>
      </div>

      {/* ── 4 Summary Metric KPI Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, idx) => (
          <div
            key={idx}
            className="bg-white border border-gray-200/90 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">
                  {m.title}
                </span>
                <div className="text-2xl font-extrabold text-gray-900 mt-1">
                  {m.value}
                </div>
              </div>
              <div
                className={`w-8 h-8 rounded-full ${m.bgIcon} flex items-center justify-center shrink-0`}
              >
                {m.icon}
              </div>
            </div>
            <div className={`flex items-center gap-1.5 text-xs font-medium ${m.textColor} mt-3`}>
              <span>{m.trendIcon}</span>
              <span className="text-gray-600 text-[11.5px]">{m.subtext}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Sales Trend & Inventory Status (2 Columns) ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Sales Trend (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-gray-200/90 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Sales Trend</h2>
                <p className="text-xs text-gray-500">
                  Track your retail sales performance over time.
                </p>
              </div>
              <button className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                <span>{timeRange}</span>
                <ChevronDown size={14} className="text-gray-400" />
              </button>
            </div>

            {/* Custom SVG Area Line Chart */}
            <div className="relative w-full h-56 mt-2">
              <svg
                viewBox="0 0 600 200"
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16a34a" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#16a34a" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y-axis gridlines & labels */}
                <g className="text-[10px] fill-gray-400">
                  <line x1="45" y1="20" x2="590" y2="20" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3 3" />
                  <text x="35" y="24" textAnchor="end">₱80K</text>

                  <line x1="45" y1="60" x2="590" y2="60" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3 3" />
                  <text x="35" y="64" textAnchor="end">₱60K</text>

                  <line x1="45" y1="100" x2="590" y2="100" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3 3" />
                  <text x="35" y="104" textAnchor="end">₱40K</text>

                  <line x1="45" y1="140" x2="590" y2="140" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3 3" />
                  <text x="35" y="144" textAnchor="end">₱20K</text>

                  <line x1="45" y1="180" x2="590" y2="180" stroke="#e5e7eb" strokeWidth="1" />
                  <text x="35" y="184" textAnchor="end">₱0</text>
                </g>

                {/* Shaded Area Fill */}
                <path
                  d="M 60 120 C 130 90, 160 115, 230 115 C 290 115, 330 85, 390 85 C 440 85, 490 50, 560 55 L 560 180 L 60 180 Z"
                  fill="url(#salesGrad)"
                />

                {/* Green Trend Line */}
                <path
                  d="M 60 120 C 130 90, 160 115, 230 115 C 290 115, 330 85, 390 85 C 440 85, 490 50, 560 55"
                  fill="none"
                  stroke="#00580C"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Data Points on Line */}
                {[
                  { cx: 60, cy: 120, label: "Mon" },
                  { cx: 145, cy: 102, label: "Tue" },
                  { cx: 230, cy: 115, label: "Wed" },
                  { cx: 310, cy: 100, label: "Thu" },
                  { cx: 390, cy: 85, label: "Fri" },
                  { cx: 475, cy: 70, label: "Sat" },
                  { cx: 560, cy: 55, label: "Sun", isCurrent: true },
                ].map((pt, i) => (
                  <g key={i}>
                    <circle
                      cx={pt.cx}
                      cy={pt.cy}
                      r="4"
                      fill="#ffffff"
                      stroke="#00580C"
                      strokeWidth="2.5"
                    />
                    <text
                      x={pt.cx}
                      y="196"
                      textAnchor="middle"
                      className={`text-[11px] ${
                        pt.isCurrent
                          ? "fill-[#00580C] font-bold"
                          : "fill-gray-500 font-medium"
                      }`}
                    >
                      {pt.label}
                    </text>
                  </g>
                ))}

                {/* Tooltip Badge on Sunday */}
                <g transform="translate(525, 12)">
                  <rect
                    width="70"
                    height="24"
                    rx="6"
                    fill="#00580C"
                  />
                  <text
                    x="35"
                    y="16"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="bold"
                  >
                    ₱67,500 ⌄
                  </text>
                </g>
              </svg>
            </div>
          </div>

          <div className="flex justify-end pt-3 mt-3 border-t border-gray-100">
            <button
              onClick={() => navigate("/retailer/sales-history")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#00580C] hover:text-emerald-800 transition-colors cursor-pointer"
            >
              <span>View Sales History</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Right: Inventory Status (1 col) */}
        <div className="bg-white border border-gray-200/90 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Inventory Status</h2>
            <p className="text-xs text-gray-500 mb-4">
              Current availability of your retail products.
            </p>

            {/* Donut Chart */}
            <div className="relative flex items-center justify-center my-4">
              <svg width="160" height="160" viewBox="0 0 160 160" className="rotate-[-90deg]">
                {/* Background Ring */}
                <circle
                  cx="80"
                  cy="80"
                  r="62"
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth="16"
                />
                {/* In Stock Arc (75% -> 292 of 389.5) */}
                <circle
                  cx="80"
                  cy="80"
                  r="62"
                  fill="transparent"
                  stroke="#16a34a"
                  strokeWidth="16"
                  strokeDasharray="292 390"
                  strokeDashoffset="0"
                />
                {/* Low Stock Arc (16% -> 62 of 390) */}
                <circle
                  cx="80"
                  cy="80"
                  r="62"
                  fill="transparent"
                  stroke="#f59e0b"
                  strokeWidth="16"
                  strokeDasharray="62 390"
                  strokeDashoffset="-292"
                />
                {/* Out of Stock Arc (9% -> 36 of 390) */}
                <circle
                  cx="80"
                  cy="80"
                  r="62"
                  fill="transparent"
                  stroke="#ef4444"
                  strokeWidth="16"
                  strokeDasharray="36 390"
                  strokeDashoffset="-354"
                />
              </svg>

              {/* Center Donut Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-extrabold text-gray-900 tracking-tight leading-none">
                  56
                </span>
                <span className="text-[9.5px] font-bold text-gray-400 tracking-wider uppercase mt-1">
                  TOTAL PRODUCTS
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-2 mt-4 px-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <span>In Stock</span>
                </div>
                <span className="font-bold text-gray-900">42 (75%)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Low Stock</span>
                </div>
                <span className="font-bold text-gray-900">9 (16%)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Out of Stock</span>
                </div>
                <span className="font-bold text-gray-900">5 (9%)</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 mt-4 border-t border-gray-100">
            <button
              onClick={() => navigate("/retailer/inventory")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#00580C] hover:text-emerald-800 transition-colors cursor-pointer"
            >
              <span>View Inventory</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Active Orders & Stock Attention (2 Columns) ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Orders (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-gray-200/90 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Active Orders</h2>
                <p className="text-xs text-gray-500">
                  Latest warehouse orders that are still being fulfilled.
                </p>
              </div>
              <span className="text-xs text-gray-400 font-medium">3 of 7 shown</span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="pb-3 font-bold">ORDER NO.</th>
                    <th className="pb-3 font-bold">WAREHOUSE</th>
                    <th className="pb-3 font-bold">PRODUCT</th>
                    <th className="pb-3 font-bold">QUANTITY</th>
                    <th className="pb-3 font-bold">TOTAL</th>
                    <th className="pb-3 font-bold">STATUS</th>
                    <th className="pb-3 font-bold text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeOrders.map((ord, i) => (
                    <tr key={i} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3.5 font-semibold text-gray-900">
                        {ord.orderNo}
                      </td>
                      <td className="py-3.5 text-gray-600">{ord.warehouse}</td>
                      <td className="py-3.5 text-gray-800 font-medium">
                        {ord.product}
                      </td>
                      <td className="py-3.5 text-gray-600">{ord.quantity}</td>
                      <td className="py-3.5 font-bold text-gray-900">{ord.total}</td>
                      <td className="py-3.5">
                        {ord.statusType === "preparing" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {ord.status}
                          </span>
                        )}
                        {ord.statusType === "in-transit" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            {ord.status}
                          </span>
                        )}
                        {ord.statusType === "processing" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                            {ord.status}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-right">
                        <button
                          onClick={() => navigate("/retailer/order-tracking")}
                          className="text-[#00580C] hover:underline font-semibold text-xs cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end pt-3 mt-4 border-t border-gray-100">
            <button
              onClick={() => navigate("/retailer/order-tracking")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#00580C] hover:text-emerald-800 transition-colors cursor-pointer"
            >
              <span>View Order Tracking</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Right: Stock Attention (1 col) */}
        <div className="bg-white border border-gray-200/90 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Stock Attention</h2>
            <p className="text-xs text-gray-500 mb-4">
              Products that may need to be replenished soon.
            </p>

            <div className="divide-y divide-gray-100">
              {stockAttention.map((item, i) => (
                <div key={i} className="py-3.5 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-gray-900">{item.name}</h3>
                    <p className="text-[11.5px] text-gray-500 mt-0.5">{item.stock}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        item.statusType === "low"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {item.status}
                    </span>
                    <button
                      onClick={() => navigate("/retailer/warehouse-marketplace")}
                      className="text-xs font-semibold text-[#00580C] hover:underline cursor-pointer"
                    >
                      Find Stock &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-2">
            <button
              onClick={() => navigate("/retailer/warehouse-marketplace")}
              className="w-full py-2.5 px-4 bg-[#eaf7ed] hover:bg-[#dcf2e1] text-[#15803d] font-bold text-xs rounded-xl transition-colors text-center cursor-pointer"
            >
              Browse Warehouse Marketplace &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* ── Pending Actions (Full Width Card) ─────────────────────────────────── */}
      <div className="bg-white border border-gray-200/90 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Pending Actions</h2>
            <p className="text-xs text-gray-500">
              Items that may require your immediate review or follow-up.
            </p>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            4 Attention Items
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="pb-3 font-bold">TYPE</th>
                <th className="pb-3 font-bold">REFERENCE</th>
                <th className="pb-3 font-bold">DETAILS</th>
                <th className="pb-3 font-bold">STATUS</th>
                <th className="pb-3 font-bold">UPDATED</th>
                <th className="pb-3 font-bold text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pendingActions.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-3.5">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${row.typeColor}`}>
                      {row.type}
                    </span>
                  </td>
                  <td className="py-3.5 font-semibold text-gray-900">{row.ref}</td>
                  <td className="py-3.5 text-gray-600 font-medium">{row.details}</td>
                  <td className="py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${row.statusText}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${row.statusDot}`} />
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3.5 text-gray-500">{row.updated}</td>
                  <td className="py-3.5 text-right">
                    {row.actionVariant === "green-outline" ? (
                      <button
                        onClick={row.actionClick}
                        className="px-3 py-1 text-xs font-bold text-[#00580C] bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200 cursor-pointer"
                      >
                        {row.actionText}
                      </button>
                    ) : (
                      <button
                        onClick={row.actionClick}
                        className="px-3 py-1 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 cursor-pointer"
                      >
                        {row.actionText}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Recent Activity (Full Width Card) ─────────────────────────────────── */}
      <div className="bg-white border border-gray-200/90 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-gray-900">Recent Activity</h2>
            <p className="text-xs text-gray-500">
              Latest operational logs across POS, inventory, and fulfillment.
            </p>
          </div>
          <button
            onClick={() => navigate("/retailer/sales-history")}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#00580C] hover:text-emerald-800 transition-colors cursor-pointer"
          >
            <span>View Activity History</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* Timeline Log */}
        <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-gray-200">
          {recentActivities.map((act, i) => (
            <div key={i} className="relative flex items-start justify-between gap-4">
              {/* Dot Icon on Line */}
              <div
                className={`absolute -left-6 top-0.5 w-6 h-6 rounded-full ${act.bgIcon} flex items-center justify-center ring-4 ring-white shadow-xs`}
              >
                {act.icon}
              </div>

              {/* Content */}
              <div className="pl-3">
                <h3 className="text-xs font-bold text-gray-900">{act.title}</h3>
                <p className="text-xs text-gray-600 mt-0.5">{act.desc}</p>
              </div>

              {/* Time */}
              <span className="text-[11.5px] font-medium text-gray-400 shrink-0">
                {act.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
