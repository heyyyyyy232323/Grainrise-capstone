import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  ChevronDown,
  DollarSign,
  AlertTriangle,
  Truck,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  RefreshCw,
  Clock,
  PackageCheck,
  MessageSquare,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";

export default function RetailerDashboard() {
  const navigate = useNavigate();
  const [trendRange, setTrendRange] = useState("Last 7 Days");

  return (
    <div className="space-y-6 pb-12">
      {/* ── Breadcrumb & Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
            <span>Main</span>
            <span>&gt;</span>
            <span className="text-[#107E44] font-semibold">Dashboard</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Last Updated: Today &middot; 10:42 AM
          </p>
        </div>

        {/* Date Selector Pill */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-white border border-gray-200 shadow-2xs rounded-xl px-3.5 py-2 text-xs font-medium text-gray-700">
          <Calendar size={14} className="text-gray-500" />
          <span>July 15, 2026</span>
        </div>
      </div>

      {/* ── KPI Cards (4 in a row) ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales Today */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                SALES TODAY
              </p>
              <h2 className="text-2xl font-extrabold text-gray-900 mt-1">
                ₱67,500
              </h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign size={18} strokeWidth={2.5} />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[11px] text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Completed in-store sales today</span>
          </div>
        </div>

        {/* Low Stock Products */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                LOW STOCK PRODUCTS
              </p>
              <h2 className="text-2xl font-extrabold text-gray-900 mt-1">4</h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center">
              <AlertTriangle size={18} strokeWidth={2.2} />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[11px] text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>Products that may need restock</span>
          </div>
        </div>

        {/* Active Orders */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                ACTIVE ORDERS
              </p>
              <h2 className="text-2xl font-extrabold text-gray-900 mt-1">7</h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
              <Truck size={18} strokeWidth={2.2} />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[11px] text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
            <span>Warehouse orders in progress</span>
          </div>
        </div>

        {/* Open Returns & Issues */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                OPEN RETURNS &amp; ISSUES
              </p>
              <h2 className="text-2xl font-extrabold text-gray-900 mt-1">2</h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
              <RotateCcw size={18} strokeWidth={2.2} />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[11px] text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            <span>Requests awaiting resolution</span>
          </div>
        </div>
      </div>

      {/* ── Row 2: Sales Trend (Left) & Inventory Status (Right) ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Sales Trend (approx 7 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-sm md:text-base">
                  Sales Trend
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Track your retail sales performance over time.
                </p>
              </div>
              <div className="relative">
                <button className="flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition cursor-pointer">
                  <span>{trendRange}</span>
                  <ChevronDown size={13} className="text-gray-400" />
                </button>
              </div>
            </div>

            {/* Custom SVG Line Chart matching Figma */}
            <div className="mt-6 w-full h-56 relative flex items-center">
              <svg
                viewBox="0 0 650 200"
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#107E44" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#107E44" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                {[170, 130, 90, 50, 15].map((y, idx) => (
                  <line
                    key={idx}
                    x1="45"
                    y1={y}
                    x2="630"
                    y2={y}
                    stroke="#F1F5F9"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                ))}

                {/* Y-Axis Labels */}
                <text x="10" y="20" fill="#94A3B8" fontSize="10" fontWeight="500">₱10k</text>
                <text x="10" y="55" fill="#94A3B8" fontSize="10" fontWeight="500">₱8k</text>
                <text x="10" y="95" fill="#94A3B8" fontSize="10" fontWeight="500">₱6k</text>
                <text x="10" y="135" fill="#94A3B8" fontSize="10" fontWeight="500">₱4k</text>
                <text x="10" y="175" fill="#94A3B8" fontSize="10" fontWeight="500">₱0</text>

                {/* Area under curve */}
                <path
                  d="M 65 125 C 110 120, 130 90, 160 90 C 200 90, 230 110, 260 110 C 300 110, 330 65, 360 65 C 400 65, 430 75, 460 75 C 490 75, 530 40, 575 40 L 575 175 L 65 175 Z"
                  fill="url(#trendGradient)"
                />

                {/* Trend Stroke line */}
                <path
                  d="M 65 125 C 110 120, 130 90, 160 90 C 200 90, 230 110, 260 110 C 300 110, 330 65, 360 65 C 400 65, 430 75, 460 75 C 490 75, 530 40, 575 40"
                  fill="none"
                  stroke="#107E44"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Circles on data points */}
                <circle cx="65" cy="125" r="4" fill="#FFFFFF" stroke="#107E44" strokeWidth="2.5" />
                <circle cx="160" cy="90" r="4" fill="#FFFFFF" stroke="#107E44" strokeWidth="2.5" />
                <circle cx="260" cy="110" r="4" fill="#FFFFFF" stroke="#107E44" strokeWidth="2.5" />
                <circle cx="360" cy="65" r="4" fill="#FFFFFF" stroke="#107E44" strokeWidth="2.5" />
                <circle cx="460" cy="75" r="4" fill="#FFFFFF" stroke="#107E44" strokeWidth="2.5" />
                <circle cx="575" cy="40" r="4.5" fill="#107E44" stroke="#FFFFFF" strokeWidth="2" />

                {/* Tooltip on last node */}
                <g transform="translate(540, 10)">
                  <rect width="68" height="22" rx="6" fill="#0C4E2B" />
                  <text x="34" y="14" fill="#FFFFFF" fontSize="9" fontWeight="700" textAnchor="middle">
                    ₱67,500 ▾
                  </text>
                </g>

                {/* X-Axis Labels */}
                <text x="65" y="194" fill="#94A3B8" fontSize="10" fontWeight="500" textAnchor="middle">Mon</text>
                <text x="160" y="194" fill="#94A3B8" fontSize="10" fontWeight="500" textAnchor="middle">Tue</text>
                <text x="260" y="194" fill="#94A3B8" fontSize="10" fontWeight="500" textAnchor="middle">Wed</text>
                <text x="360" y="194" fill="#94A3B8" fontSize="10" fontWeight="500" textAnchor="middle">Thu</text>
                <text x="460" y="194" fill="#94A3B8" fontSize="10" fontWeight="500" textAnchor="middle">Fri</text>
                <text x="520" y="194" fill="#94A3B8" fontSize="10" fontWeight="500" textAnchor="middle">Sat</text>
                <text x="575" y="194" fill="#107E44" fontSize="10" fontWeight="700" textAnchor="middle">Sun</text>
              </svg>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-gray-50 mt-2">
            <button
              onClick={() => navigate("/retailer/sales-history")}
              className="text-xs font-semibold text-[#107E44] hover:text-[#0C4E2B] flex items-center gap-1 cursor-pointer"
            >
              View Sales History &rarr;
            </button>
          </div>
        </div>

        {/* Inventory Status Donut Chart (approx 4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-sm md:text-base">
              Inventory Status
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Current availability of your retail products.
            </p>

            {/* Donut Chart */}
            <div className="py-6 flex flex-col items-center justify-center relative">
              <svg width="150" height="150" viewBox="0 0 100 100" className="-rotate-90">
                {/* Out of stock segment (Red ~9%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#F43F5E"
                  strokeWidth="11"
                  strokeDasharray="238.76"
                  strokeDashoffset="0"
                />
                {/* Low stock segment (Amber ~16%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#F59E0B"
                  strokeWidth="11"
                  strokeDasharray="238.76"
                  strokeDashoffset="21.5"
                />
                {/* In stock segment (Emerald ~75%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#107E44"
                  strokeWidth="11"
                  strokeDasharray="238.76"
                  strokeDashoffset="60"
                />
              </svg>
              {/* Inner Center Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-gray-900 leading-tight">56</span>
                <span className="text-[9px] font-bold tracking-wider text-gray-400 uppercase">
                  TOTAL PRODUCTS
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#107E44]"></span>
                  <span className="text-gray-600">In Stock</span>
                </div>
                <span className="font-semibold text-gray-900">42 (75%)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span className="text-gray-600">Low Stock</span>
                </div>
                <span className="font-semibold text-gray-900">9 (16%)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span className="text-gray-600">Out of Stock</span>
                </div>
                <span className="font-semibold text-gray-900">5 (9%)</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-50 mt-4">
            <button
              onClick={() => navigate("/retailer/inventory")}
              className="text-xs font-semibold text-[#107E44] hover:text-[#0C4E2B] flex items-center gap-1 cursor-pointer"
            >
              View Inventory &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* ── Row 3: Active Orders (Left) & Stock Attention (Right) ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Active Orders (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-sm md:text-base">
                  Active Orders
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Latest warehouse orders that are still being fulfilled.
                </p>
              </div>
              <span className="text-xs text-gray-400 font-medium">3 of 7 shown</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[10px] font-bold text-gray-400 uppercase border-b border-gray-100">
                  <tr>
                    <th className="pb-3 font-semibold">ORDER NO.</th>
                    <th className="pb-3 font-semibold">WAREHOUSE</th>
                    <th className="pb-3 font-semibold">PRODUCT</th>
                    <th className="pb-3 font-semibold">QUANTITY</th>
                    <th className="pb-3 font-semibold">TOTAL</th>
                    <th className="pb-3 font-semibold">STATUS</th>
                    <th className="pb-3 font-semibold text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {/* Order 1 */}
                  <tr className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 font-medium text-gray-900">
                      WR-<br className="sm:hidden"/>2026-021
                    </td>
                    <td className="py-3.5 text-gray-600">Warehouse ABC</td>
                    <td className="py-3.5 font-medium text-gray-900">Dinorado</td>
                    <td className="py-3.5 text-gray-600">500 kg</td>
                    <td className="py-3.5 font-bold text-gray-900">₱21,500</td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                        Preparing for Delivery
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => navigate("/retailer/order-tracking")}
                        className="text-[#107E44] hover:underline font-semibold cursor-pointer"
                      >
                        View
                      </button>
                    </td>
                  </tr>

                  {/* Order 2 */}
                  <tr className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 font-medium text-gray-900">
                      WR-<br className="sm:hidden"/>2026-019
                    </td>
                    <td className="py-3.5 text-gray-600">North Caloocan Warehouse</td>
                    <td className="py-3.5 font-medium text-gray-900">Jasmine Rice</td>
                    <td className="py-3.5 text-gray-600">350 kg</td>
                    <td className="py-3.5 font-bold text-gray-900">₱15,820</td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                        ● In Transit
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => navigate("/retailer/order-tracking")}
                        className="text-[#107E44] hover:underline font-semibold cursor-pointer"
                      >
                        View
                      </button>
                    </td>
                  </tr>

                  {/* Order 3 */}
                  <tr className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 font-medium text-gray-900">
                      WR-<br className="sm:hidden"/>2026-017
                    </td>
                    <td className="py-3.5 text-gray-600">Warehouse XYZ</td>
                    <td className="py-3.5 font-medium text-gray-900">Sinandomeng</td>
                    <td className="py-3.5 text-gray-600">250 kg</td>
                    <td className="py-3.5 font-bold text-gray-900">₱14,500</td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200">
                        ● Processing
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => navigate("/retailer/order-tracking")}
                        className="text-[#107E44] hover:underline font-semibold cursor-pointer"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-gray-50 mt-2">
            <button
              onClick={() => navigate("/retailer/order-tracking")}
              className="text-xs font-semibold text-[#107E44] hover:text-[#0C4E2B] flex items-center gap-1 cursor-pointer"
            >
              View Order Tracking &rarr;
            </button>
          </div>
        </div>

        {/* Stock Attention (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-sm md:text-base">
              Stock Attention
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Products that may need to be replenished soon.
            </p>

            <div className="mt-4 divide-y divide-gray-50 space-y-3">
              {/* Item 1 */}
              <div className="pt-2 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-900">Dinorado Premium</p>
                  <p className="text-[11px] text-gray-400">10 kg remaining</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                    Low Stock
                  </span>
                  <button
                    onClick={() => navigate("/retailer/warehouse-marketplace")}
                    className="text-xs font-semibold text-[#107E44] hover:underline flex items-center cursor-pointer"
                  >
                    Find Stock &rarr;
                  </button>
                </div>
              </div>

              {/* Item 2 */}
              <div className="pt-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-900">Sinandomeng Special</p>
                  <p className="text-[11px] text-gray-400">5 kg remaining</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                    Low Stock
                  </span>
                  <button
                    onClick={() => navigate("/retailer/warehouse-marketplace")}
                    className="text-xs font-semibold text-[#107E44] hover:underline flex items-center cursor-pointer"
                  >
                    Find Stock &rarr;
                  </button>
                </div>
              </div>

              {/* Item 3 */}
              <div className="pt-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-900">Jasmine Fragrant Rice</p>
                  <p className="text-[11px] text-rose-500 font-medium">0 kg in warehouse</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                    Out of Stock
                  </span>
                  <button
                    onClick={() => navigate("/retailer/warehouse-marketplace")}
                    className="text-xs font-semibold text-[#107E44] hover:underline flex items-center cursor-pointer"
                  >
                    Find Stock &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <button
              onClick={() => navigate("/retailer/warehouse-marketplace")}
              className="w-full py-2 bg-emerald-50/80 hover:bg-emerald-100/80 text-[#107E44] border border-emerald-200 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              Browse Warehouse Marketplace &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* ── Row 4: Pending Actions (Full width) ───────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900 text-sm md:text-base">
              Pending Actions
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Items that may require your immediate review or follow-up.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            4 Attention Items
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[10px] font-bold text-gray-400 uppercase border-b border-gray-100">
              <tr>
                <th className="pb-3 font-semibold">TYPE</th>
                <th className="pb-3 font-semibold">REFERENCE</th>
                <th className="pb-3 font-semibold">DETAILS</th>
                <th className="pb-3 font-semibold">STATUS</th>
                <th className="pb-3 font-semibold">UPDATED</th>
                <th className="pb-3 font-semibold text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {/* Row 1 */}
              <tr className="hover:bg-gray-50/60 transition-colors">
                <td className="py-3.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    Low Stock
                  </span>
                </td>
                <td className="py-3.5 font-medium text-gray-900">WR-001</td>
                <td className="py-3.5 text-gray-700">Dinorado - 10 kg remaining</td>
                <td className="py-3.5">
                  <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Low Stock
                  </span>
                </td>
                <td className="py-3.5 text-gray-400">10 mins ago</td>
                <td className="py-3.5 text-right">
                  <button
                    onClick={() => navigate("/retailer/inventory")}
                    className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold cursor-pointer"
                  >
                    View Inventory
                  </button>
                </td>
              </tr>

              {/* Row 2 */}
              <tr className="hover:bg-gray-50/60 transition-colors">
                <td className="py-3.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    Order
                  </span>
                </td>
                <td className="py-3.5 font-medium text-gray-900">ORD-2026-0021</td>
                <td className="py-3.5 text-gray-700">Warehouse ABC - Dinorado - 500 kg</td>
                <td className="py-3.5">
                  <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Preparing for Delivery
                  </span>
                </td>
                <td className="py-3.5 text-gray-400">25 mins ago</td>
                <td className="py-3.5 text-right">
                  <button
                    onClick={() => navigate("/retailer/order-tracking")}
                    className="px-3 py-1 rounded-lg border border-emerald-300 text-[#107E44] bg-emerald-50/50 hover:bg-emerald-50 font-semibold cursor-pointer"
                  >
                    Track
                  </button>
                </td>
              </tr>

              {/* Row 3 */}
              <tr className="hover:bg-gray-50/60 transition-colors">
                <td className="py-3.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    Return Issue
                  </span>
                </td>
                <td className="py-3.5 font-medium text-gray-900">RET-2026-0015</td>
                <td className="py-3.5 text-gray-700">Damaged packaging - 100 kg</td>
                <td className="py-3.5">
                  <span className="flex items-center gap-1.5 text-rose-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    Under Review
                  </span>
                </td>
                <td className="py-3.5 text-gray-400">1 hr ago</td>
                <td className="py-3.5 text-right">
                  <button
                    onClick={() => navigate("/retailer/product-returns")}
                    className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold cursor-pointer"
                  >
                    View
                  </button>
                </td>
              </tr>

              {/* Row 4 */}
              <tr className="hover:bg-gray-50/60 transition-colors">
                <td className="py-3.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                    Message
                  </span>
                </td>
                <td className="py-3.5 font-medium text-gray-900">Warehouse ABC</td>
                <td className="py-3.5 text-gray-700">New message regarding ORD-2026-0021</td>
                <td className="py-3.5">
                  <span className="flex items-center gap-1.5 text-teal-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                    Unread
                  </span>
                </td>
                <td className="py-3.5 text-gray-400">2 hrs ago</td>
                <td className="py-3.5 text-right">
                  <button
                    onClick={() => navigate("/retailer/messages")}
                    className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold cursor-pointer"
                  >
                    Open
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Row 5: Recent Activity (Full width) ──────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900 text-sm md:text-base">
              Recent Activity
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Latest operational logs across POS, inventory, and fulfillment.
            </p>
          </div>
          <button
            onClick={() => navigate("/retailer/sales-history")}
            className="text-xs font-semibold text-[#107E44] hover:text-[#0C4E2B] flex items-center gap-1 cursor-pointer"
          >
            View Activity History &rarr;
          </button>
        </div>

        <div className="space-y-4 pt-1">
          {/* Item 1 */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#107E44] text-white flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 size={13} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">Sale Completed</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Receipt <strong className="text-gray-700">POS-2026-0184</strong> &middot; Dinorado &middot; ₱22,500
                </p>
              </div>
            </div>
            <span className="text-[11px] text-gray-400 whitespace-nowrap">5 mins ago</span>
          </div>

          {/* Item 2 */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <RefreshCw size={12} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">Inventory Updated</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Dinorado stock reduced after completed POS transaction
                </p>
              </div>
            </div>
            <span className="text-[11px] text-gray-400 whitespace-nowrap">8 mins ago</span>
          </div>

          {/* Item 3 */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Truck size={12} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">Order Status Updated</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  <strong className="text-gray-700">ORD-2026-0021</strong> is now{" "}
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    Preparing for Delivery
                  </span>
                </p>
              </div>
            </div>
            <span className="text-[11px] text-gray-400 whitespace-nowrap">32 mins ago</span>
          </div>

          {/* Item 4 */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <PackageCheck size={12} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">Purchase Received</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  500 kg Dinorado received from Warehouse ABC into local store
                </p>
              </div>
            </div>
            <span className="text-[11px] text-gray-400 whitespace-nowrap">1 hr ago</span>
          </div>

          {/* Item 5 */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <RotateCcw size={12} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">Return Resolved</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  <strong className="text-gray-700">RET-2026-0012</strong> has been marked as resolved and credited to account
                </p>
              </div>
            </div>
            <span className="text-[11px] text-gray-400 whitespace-nowrap">3 hrs ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}
