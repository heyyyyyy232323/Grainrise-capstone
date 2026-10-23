import { useNavigate } from "react-router-dom";
import {
  Building2,
  ClipboardList,
  FileText,
  Wallet,
  CalendarDays,
  ShoppingCart,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import KPICard from "../../../Components/Graphs/KPICard";
import RevenueExpenseTrendChart from "../../../Components/Graphs/RevenueExpenseTrendChart";
import DistributionCard from "../../../Components/Graphs/PieChartCard";
import PendingReviewsCard from "../../../Components/Graphs/PendingReviewsCard";
import RecentActivityCard from "../../../Components/Graphs/RecentActivityCard";

// ── KPI Row ──────────────────────────────────────────────────────────────
const kpiMetrics = [
  {
    title: "ACTIVE BRANCHES",
    value: "6",
    trend: "Registered active branches",
    tone: "neutral",
    icon: <Building2 size={18} strokeWidth={2.2} />,
  },
  {
    title: "PENDING ORDER APPROVALS",
    value: "12",
    trend: "+4 today · Order requiring your review",
    tone: "warning",
    icon: <ClipboardList size={18} strokeWidth={2.2} />,
  },
  {
    title: "ACTIVE CONTRACTS",
    value: "18",
    trend: "3 nearing fulfillment · Currently active procurement",
    tone: "neutral",
    icon: <FileText size={18} strokeWidth={2.2} />,
  },
  {
    title: "SALES THIS MONTH",
    value: "\u20B11.91M",
    trend: "Complete in-store + online sales",
    tone: "success",
    icon: <Wallet size={18} strokeWidth={2.2} />,
  },
];

// ── Sales & Procurement Trend ───────────────────────────────────────────
const trendMonths = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
const salesValues = [40000, 220000, 180000, 480000, 470000, 700000, 780000, 850000, 780000, 680000, 1000000, 1180000];
const procurementValues = [10000, 150000, 120000, 280000, 300000, 350000, 400000, 380000, 450000, 420000, 600000, 700000];

const salesProcurementSeries = [
  {
    key: "sales",
    label: "Sales",
    lineColor: "#0B5D1E",
    fillColor: "rgba(11, 93, 30, 0.10)",
    data: trendMonths.map((label, i) => ({ label, value: salesValues[i] })),
  },
  {
    key: "procurement",
    label: "Procurement",
    lineColor: "#E0AC1C",
    fillColor: "rgba(224, 172, 28, 0.10)",
    strokeWidth: 1.4,
    data: trendMonths.map((label, i) => ({ label, value: procurementValues[i] })),
  },
];

// ── Order Pipeline ───────────────────────────────────────────────────────
const orderPipelineItems = [
  { label: "Approved", value: 45, color: "#0B7A2A" },
  { label: "Requested", value: 25, color: "#E0AC1C" },
  { label: "Processing", value: 20, color: "#2563EB" },
  { label: "In transit", value: 10, color: "#7C3AED" },
];

// ── Branch Performance Overview ─────────────────────────────────────────
const BRANCH_PERFORMANCE = [
  { branch: "Warehouse A (Main)", rating: 4.9, sales: "\u20B14.2M", fulfillment: "98.5%", status: "Optimal" },
  { branch: "Warehouse B (South)", rating: 4.2, sales: "\u20B12.8M", fulfillment: "92.0%", status: "Good" },
  { branch: "Warehouse C (East)", rating: 3.8, sales: "\u20B11.5M", fulfillment: "85.5%", status: "Needs Review" },
  { branch: "North Caloocan Hub", rating: 4.5, sales: "\u20B13.1M", fulfillment: "96.2%", status: "Optimal" },
];

const STATUS_STYLES = {
  Optimal: "bg-emerald-100 text-emerald-700",
  Good: "bg-emerald-50 text-emerald-600",
  "Needs Review": "bg-amber-100 text-amber-700",
};

function StarRating({ rating }) {
  const fullStars = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-1 text-amber-500">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i}>{i < fullStars ? "\u2605" : "\u2606"}</span>
      ))}
      <span className="ml-1 text-xs font-semibold text-slate-500">({rating})</span>
    </span>
  );
}

// ── Upcoming Deadlines ───────────────────────────────────────────────────
const upcomingDeadlines = [
  {
    id: "POST-2026-0019",
    name: "POST-2026-0019",
    initials: "PO",
    category: "Bidding Offer Closes",
    date: "Today, 5:00 PM",
    color: "#0B5D1E",
    detailsLabel: "ENDING SOON",
  },
  {
    id: "CON-2026-0034",
    name: "CON-2026-0034",
    initials: "CO",
    category: "Contract Delivery Target",
    date: "Tomorrow",
    color: "#E0AC1C",
    detailsLabel: "UPCOMING",
  },
  {
    id: "INV-2026-0901",
    name: "INV-2026-0901",
    initials: "IN",
    category: "Monthly Inventory Audit",
    date: "Sep 5, 2026",
    color: "#2563EB",
    detailsLabel: null,
  },
  {
    id: "PAY-2026-088",
    name: "PAY-2026-088",
    initials: "PA",
    category: "Supplier Payment Due",
    date: "Sep 7, 2026",
    color: "#7C3AED",
    detailsLabel: null,
  },
];

// ── Pending Actions ──────────────────────────────────────────────────────
const PENDING_ACTIONS = [
  { type: "Order Approval", reference: "ORD-9921 - 50 Sacks Jasmine Rice", submittedBy: "Warehouse A", date: "2 hours ago", action: "Review" },
  { type: "Farmer Application", reference: "APP-045 - Juan Dela Cruz (Tarlac)", submittedBy: "Warehouse A", date: "Yesterday", action: "Review" },
  { type: "Order Approval", reference: "ORD-9921 - 50 Sacks Jasmine Rice", submittedBy: "Warehouse A", date: "Yesterday", action: "Review" },
  { type: "Contract Issue", reference: "CON-089 - Quality Dispute", submittedBy: "Quality Control", date: "Sep 1, 2026", action: "View" },
  { type: "Farmer Application", reference: "APP-045 - Juan Dela Cruz (Tarlac)", submittedBy: "Warehouse A", date: "Aug 31, 2026", action: "Review" },
];

const TYPE_BADGE_STYLES = {
  "Order Approval": "bg-amber-100 text-amber-700",
  "Farmer Application": "bg-emerald-100 text-emerald-700",
  "Contract Issue": "bg-red-100 text-red-700",
};

// ── Recent Order Activity ────────────────────────────────────────────────
const recentOrderActivity = [
  {
    id: 1,
    title: "Order Approved: ORD-9919 approved by Logistics Team.",
    description: "Sept 01, 2026",
    time: "11:20 AM",
    icon: ShoppingCart,
    color: "#0B7A2A",
  },
  {
    id: 2,
    title: "Order Approved: ORD-9919 approved by Logistics Team.",
    description: "Sept 01, 2026",
    time: "11:20 AM",
    icon: ShoppingCart,
    color: "#0B7A2A",
  },
  {
    id: 3,
    title: "Order Approved: ORD-9919 approved by Logistics Team.",
    description: "Sept 01, 2026",
    time: "11:20 AM",
    icon: ShoppingCart,
    color: "#0B7A2A",
  },
];

export default function MillerBranchManagerDashboard() {
  const navigate = useNavigate();
  const now = new Date();
  const formattedDate = now.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <Breadcrumbs items={[{ label: "Main" }, { label: "Dashboard" }]} />
          <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold tracking-tight text-slate-900">
            Dashboard
          </h2>
          <p className="text-sm text-slate-500">
            Last Updated: Today . {formattedTime}
          </p>
        </div>

        <div className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm">
          <CalendarDays size={16} className="text-slate-500" />
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* ── KPI Row ──────────────────────────────────────────────────────── */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {kpiMetrics.map((metric) => (
          <KPICard key={metric.title} {...metric} />
        ))}
      </div>

      {/* ── Sales & Procurement Trend + Order Pipeline ──────────────────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueExpenseTrendChart
            title="Sales & Procurement Trend"
            series={salesProcurementSeries}
            height={260}
            valueFormatter={(v) => `\u20B1${(v / 1000000).toFixed(1)}M`}
            axisFormatter={(v) => (v === 0 ? "0" : `${(v / 1000000).toFixed(1)}M`)}
          />
        </div>
        <DistributionCard
          title="Order Pipeline"
          totalLabel="30 Active Orders"
          items={orderPipelineItems}
        />
      </div>

      {/* ── Branch Performance Overview + Upcoming Deadlines ────────────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-lg">Branch Performance Overview</h3>
            <button
              onClick={() => navigate("/miller-branch-manager/performance")}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
            >
              View Performance Monitoring →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-left">Branch</th>
                  <th className="px-5 py-3 text-left">Rating</th>
                  <th className="px-5 py-3 text-left">Sales (YTD)</th>
                  <th className="px-5 py-3 text-left">Fulfillment Rate</th>
                  <th className="px-5 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {BRANCH_PERFORMANCE.map((b, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-gray-900">{b.branch}</td>
                    <td className="px-5 py-3.5"><StarRating rating={b.rating} /></td>
                    <td className="px-5 py-3.5 text-gray-700">{b.sales}</td>
                    <td className="px-5 py-3.5 text-gray-700">{b.fulfillment}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${STATUS_STYLES[b.status]}`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <PendingReviewsCard
          title="Upcoming Deadlines"
          items={upcomingDeadlines}
          onViewAll={() => navigate("/miller-branch-manager/suppliers")}
          viewAllLabel="View Suppliers"
        />
      </div>

      {/* ── Pending Actions ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-900 text-lg">Pending Actions</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-emerald-50/60 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 text-left">Type</th>
                <th className="px-5 py-3 text-left">Reference/Details</th>
                <th className="px-5 py-3 text-left">Submitted By</th>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {PENDING_ACTIONS.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${TYPE_BADGE_STYLES[item.type]}`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-700">{item.reference}</td>
                  <td className="px-5 py-3.5 text-gray-700">{item.submittedBy}</td>
                  <td className="px-5 py-3.5 text-gray-500">{item.date}</td>
                  <td className="px-5 py-3.5">
                    {item.action === "Review" ? (
                      <button className="rounded-lg bg-[#0B5D1E] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#094d19] transition-colors cursor-pointer">
                        Review
                      </button>
                    ) : (
                      <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-gray-700 hover:border-slate-400 transition-colors cursor-pointer">
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Recent Order Activity ────────────────────────────────────────── */}
      <RecentActivityCard title="Recent Order Activity" items={recentOrderActivity} />
    </div>
  );
}