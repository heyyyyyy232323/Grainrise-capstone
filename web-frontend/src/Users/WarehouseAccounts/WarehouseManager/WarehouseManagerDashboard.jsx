import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  ClipboardList,
  FileText,
  Wallet,
  CalendarDays,
  ShoppingCart,
  ArrowRight,
  ChevronRight,
  Star,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import KPICard from "../../../Components/Graphs/KPICard";
import RevenueExpenseTrendChart from "../../../Components/Graphs/RevenueExpenseTrendChart";
import DistributionCard from "../../../Components/Graphs/PieChartCard";

// ── KPI Row Data ────────────────────────────────────────────────────────────
const kpiMetrics = [
  {
    title: "ACTIVE BRANCHES",
    value: "6",
    trend: "Registered active branches",
    tone: "success",
    icon: <Building2 size={18} strokeWidth={2.2} />,
  },
  {
    title: "PENDING ORDER APPROVALS",
    value: "12",
    trend: "Order requiring your review",
    tone: "warning",
    icon: <ClipboardList size={18} strokeWidth={2.2} />,
  },
  {
    title: "ACTIVE CONTRACTS",
    value: "18",
    trend: "Currently active procurement",
    tone: "neutral",
    icon: <FileText size={18} strokeWidth={2.2} />,
  },
  {
    title: "SALES THIS MONTH",
    value: "₱1.91M",
    trend: "Complete in-store + online sales",
    tone: "success",
    icon: <Wallet size={18} strokeWidth={2.2} />,
  },
];

// ── Sales & Procurement Trend Chart Data ─────────────────────────────────────
const trendMonths = [
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
];

const salesValues = [
  40000,
  180000,
  350000,
  280000,
  600000,
  520000,
  750000,
  820000,
  700000,
  950000,
  1150000,
  1300000,
];

const procurementValues = [
  10000,
  60000,
  160000,
  110000,
  320000,
  260000,
  420000,
  460000,
  360000,
  480000,
  620000,
  850000,
];

const salesProcurementSeries = [
  {
    key: "sales",
    label: "Sales",
    lineColor: "#0B5D1E",
    fillColor: "rgba(11, 93, 30, 0.08)",
    strokeWidth: 2.2,
    data: trendMonths.map((label, i) => ({ label, value: salesValues[i] })),
  },
  {
    key: "procurement",
    label: "Procurement",
    lineColor: "#E0AC1C",
    fillColor: "transparent",
    strokeWidth: 2.2,
    dashed: true,
    strokeDasharray: "5,5",
    data: trendMonths.map((label, i) => ({ label, value: procurementValues[i] })),
  },
];

// ── Order Pipeline Donut Chart Data ──────────────────────────────────────────
const orderPipelineItems = [
  { label: "Approved", value: 45, color: "#0B7A2A" },
  { label: "Requested", value: 25, color: "#E0AC1C" },
  { label: "Processing", value: 20, color: "#2563EB" },
  { label: "In transit", value: 10, color: "#7C3AED" },
];

// ── Branch Performance Overview ──────────────────────────────────────────────
const BRANCH_PERFORMANCE = [
  {
    branch: "Warehouse A (Main)",
    rating: 4.9,
    stars: 5,
    sales: "₱4.2M",
    fulfillment: "98.5%",
    status: "Optimal",
  },
  {
    branch: "Warehouse B (South)",
    rating: 4.2,
    stars: 4,
    sales: "₱2.8M",
    fulfillment: "92.0%",
    status: "Good",
  },
  {
    branch: "Warehouse C (East)",
    rating: 3.8,
    stars: 3,
    sales: "₱1.5M",
    fulfillment: "85.5%",
    status: "Needs Review",
  },
  {
    branch: "North Caloocan Hub",
    rating: 4.5,
    stars: 5,
    sales: "₱3.1M",
    fulfillment: "96.2%",
    status: "Optimal",
  },
];

const STATUS_BADGE_STYLES = {
  Optimal: "bg-emerald-100 text-emerald-700",
  Good: "bg-emerald-50 text-emerald-600 border border-emerald-200/50",
  "Needs Review": "bg-amber-100 text-amber-700",
};

function StarRating({ rating, count = 5 }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;

  return (
    <div className="inline-flex items-center gap-1">
      <div className="flex items-center gap-0.5 text-amber-400">
        {[...Array(count)].map((_, i) => (
          <Star
            key={i}
            size={13}
            className={
              i < fullStars || (i === fullStars && hasHalf)
                ? "fill-amber-400 text-amber-400"
                : "text-slate-200"
            }
          />
        ))}
      </div>
      <span className="text-xs font-semibold text-slate-500">({rating})</span>
    </div>
  );
}

// ── Recent Messages ──────────────────────────────────────────────────────────
const RECENT_MESSAGES = [
  {
    id: "msg-1",
    name: "ABC Rice Mill",
    avatar: "AR",
    avatarBg: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    message: "Updated po... Miller's requirements.",
    time: "10:42 AM",
    unread: "2 unread",
  },
  {
    id: "msg-2",
    name: "Golden Harvest Milling",
    avatar: "GH",
    avatarBg: "bg-blue-100 text-blue-700 border border-blue-200",
    message: "Delivery schedule has been updated.",
    time: "Yesterday",
    unread: "2 unread",
  },
  {
    id: "msg-3",
    name: "Delta Agro Co.",
    avatar: "DA",
    avatarBg: "bg-purple-100 text-purple-700 border border-purple-200",
    message: "Payment confirmation has been ...",
    time: "Dec 23",
    unread: "1 unread",
  },
];

// ── Pending Actions ──────────────────────────────────────────────────────────
const PENDING_ACTIONS = [
  {
    id: "act-1",
    type: "Order Approval",
    reference: "ORD-9921 - 50 Sacks Jasmine Rice",
    submittedBy: "Warehouse A",
    date: "2 hours ago",
    action: "Review",
    actionType: "primary",
  },
  {
    id: "act-2",
    type: "Farmer Application",
    reference: "APP-045 - Juan Dela Cruz (Tarlac)",
    submittedBy: "Warehouse A",
    date: "Yesterday",
    action: "Review",
    actionType: "primary",
  },
  {
    id: "act-3",
    type: "Order Approval",
    reference: "ORD-9921 - 50 Sacks Jasmine Rice",
    submittedBy: "Warehouse A",
    date: "Yesterday",
    action: "Review",
    actionType: "primary",
  },
  {
    id: "act-4",
    type: "Contract Issue",
    reference: "CON-089 - Quality Dispute",
    submittedBy: "Quality Control",
    date: "Sep 1, 2026",
    action: "View",
    actionType: "secondary",
  },
  {
    id: "act-5",
    type: "Farmer Application",
    reference: "APP-045 - Juan Dela Cruz (Tarlac)",
    submittedBy: "Warehouse A",
    date: "Aug 31, 2026",
    action: "Review",
    actionType: "primary",
  },
];

const TYPE_PILL_STYLES = {
  "Order Approval": "bg-amber-50 text-amber-700 border border-amber-200/80",
  "Farmer Application": "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
  "Contract Issue": "bg-red-50 text-red-600 border border-red-200/80",
};

// ── Recent Order Activity ────────────────────────────────────────────────────
const RECENT_ACTIVITIES = [
  {
    id: "act-log-1",
    title: "Order Approved: ORD-9919 approved by Logistics Team.",
    date: "Sept 01, 2026",
    time: "11:20 AM",
  },
  {
    id: "act-log-2",
    title: "Order Approved: ORD-9919 approved by Logistics Team.",
    date: "Sept 01, 2026",
    time: "11:20 AM",
  },
  {
    id: "act-log-3",
    title: "Order Approved: ORD-9919 approved by Logistics Team.",
    date: "Sept 01, 2026",
    time: "11:20 AM",
  },
];

export default function WarehouseManagerDashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Breadcrumbs items={[{ label: "Main" }, { label: "Dashboard" }]} />
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Last Updated: Today . 10:42 AM
          </p>
        </div>

        <div className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
          <CalendarDays size={16} className="text-slate-500" />
          <span>July 19, 2026</span>
        </div>
      </div>

      {/* ── KPI Row (4 Cards) ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiMetrics.map((metric) => (
          <KPICard key={metric.title} {...metric} />
        ))}
      </div>

      {/* ── Sales & Procurement Trend + Order Pipeline ─────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueExpenseTrendChart
            title="Sales & Procurement Trend"
            series={salesProcurementSeries}
            height={270}
            maxValue={1600000}
            valueFormatter={(v) => `₱${(v / 1000000).toFixed(1)}M`}
            axisFormatter={(v) => (v === 0 ? "0" : `${(v / 1000000).toFixed(1)}M`)}
          />
        </div>

        <div className="lg:col-span-1">
          <DistributionCard
            title="Order Pipeline"
            totalLabel="30 Active Orders"
            items={orderPipelineItems}
          />
        </div>
      </div>

      {/* ── Branch Performance Overview + Recent Messages ──────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Branch Performance Overview Table */}
        <div className="lg:col-span-2 flex flex-col justify-between rounded-2xl border border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.06)] overflow-hidden">
          <div>
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                Branch Performance Overview
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#EAF5ED] text-xs font-semibold text-slate-700">
                    <th className="px-5 py-3.5">Branch</th>
                    <th className="px-5 py-3.5">Rating</th>
                    <th className="px-5 py-3.5">Sales (YTD)</th>
                    <th className="px-5 py-3.5">Fulfillment Rate</th>
                    <th className="px-5 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {BRANCH_PERFORMANCE.map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="px-5 py-4 font-semibold text-slate-900 whitespace-nowrap">
                        {item.branch}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <StarRating rating={item.rating} />
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-700 whitespace-nowrap">
                        {item.sales}
                      </td>
                      <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                        {item.fulfillment}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            STATUS_BADGE_STYLES[item.status] || "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t border-slate-100 py-3.5 text-center">
            <button
              onClick={() => navigate("/warehouse-manager/performance")}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-900 hover:underline cursor-pointer transition-colors"
            >
              <span>View Performance Monitoring</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Recent Messages Card */}
        <div className="lg:col-span-1 flex flex-col justify-between rounded-2xl border border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.06)] overflow-hidden">
          <div>
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                Recent Messages
              </h3>
            </div>

            <div className="divide-y divide-slate-100">
              {RECENT_MESSAGES.map((msg) => (
                <div
                  key={msg.id}
                  className="p-4 sm:p-5 flex items-start gap-3.5 hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <div
                    className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-bold text-xs ${msg.avatarBg}`}
                  >
                    {msg.avatar}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                        {msg.name}
                      </h4>
                      <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                        {msg.time}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 truncate">
                      {msg.message}
                    </p>

                    <div>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        {msg.unread}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 py-3.5 text-center">
            <button
              onClick={() => navigate("/warehouse-manager/contacts")}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-900 hover:underline cursor-pointer transition-colors"
            >
              <span>View Contacts</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Pending Actions ────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.06)] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Pending Actions</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-[#EAF5ED] text-xs font-semibold text-slate-700">
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Reference/Details</th>
                <th className="px-5 py-3.5">Submitted By</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5 text-right sm:text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {PENDING_ACTIONS.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/70 transition-colors"
                >
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        TYPE_PILL_STYLES[item.type] || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {item.type}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-800 whitespace-nowrap">
                    {item.reference}
                  </td>
                  <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                    {item.submittedBy}
                  </td>
                  <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                    {item.date}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-right sm:text-left">
                    {item.actionType === "primary" ? (
                      <button
                        onClick={() => navigate("/warehouse-manager/order-approval")}
                        className="rounded-full bg-[#0B5D1E] hover:bg-[#094d19] px-5 py-1 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
                      >
                        {item.action}
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate("/warehouse-manager/order-approval")}
                        className="rounded-full border border-slate-300 bg-white hover:bg-slate-50 px-5 py-1 text-xs font-semibold text-slate-700 shadow-xs transition-colors cursor-pointer"
                      >
                        {item.action}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Recent Order Activity ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-900">
            Recent Order Activity
          </h3>
        </div>

        <div className="space-y-0">
          {RECENT_ACTIVITIES.map((act, index) => (
            <div key={act.id} className="relative flex items-start gap-4">
              {/* Timeline Icon and Vertical Line */}
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0B5D1E] text-white shadow-xs z-10">
                  <ShoppingCart size={14} strokeWidth={2.2} />
                </div>
                {index < RECENT_ACTIVITIES.length - 1 && (
                  <div className="w-0.5 h-10 bg-[#0B5D1E]/40" />
                )}
              </div>

              {/* Activity Info */}
              <div className="flex-1 pb-4 pt-1 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    {act.title}
                  </h4>
                  <p className="text-xs text-slate-400">{act.date}</p>
                </div>
                <span className="text-xs font-semibold text-[#0B5D1E] whitespace-nowrap">
                  {act.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
