import { useMemo, useState } from "react";
import {
  CalendarDays,
  Package,
  BadgeDollarSign,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Inbox,
  History,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import KPICard from "../../../Components/Graphs/KPICard";
import DistributionCard from "../../../Components/Graphs/PieChartCard";
import CategoryBarCard from "../../../Components/Graphs/BarGraphsCard";
import RecentActivityCard from "../../../Components/Graphs/RecentActivityCard";
import PendingReviewsCard from "../../../Components/Graphs/PendingReviewsCard";

// ─── Static KPI data ──────────────────────────────────────────────────────────
const kpiMetrics = [
  {
    title: "Product Variants",
    value: "500",
    footer: "Registered warehouse products",
    tone: "neutral",
    icon: <Package size={18} strokeWidth={2.2} />,
  },
  {
    title: "Inventory Value",
    value: "₱24.8M",
    footer: "Total warehouse inventory value",
    tone: "success",
    icon: <BadgeDollarSign size={18} strokeWidth={2.2} />,
  },
  {
    title: "Low Stock Products",
    value: "42",
    footer: "Products requiring restocking",
    tone: "warning",
    icon: <AlertTriangle size={18} strokeWidth={2.2} />,
  },
  {
    title: "Out of Stock",
    value: "5",
    footer: "Products with zero available inventory",
    tone: "danger",
    variant: "solid",
    icon: <XCircle size={18} strokeWidth={2.2} />,
  },
];

// ─── Inventory Status (donut) ──────────────────────────────────────────────────
const inventoryStatusItems = [
  { label: "In Stock", value: 50, color: "#0F9D2A" },
  { label: "Low Stock", value: 23, color: "#E0AC1C" },
  { label: "Out of Stock", value: 17, color: "#E25E3E" },
];

// ─── Inventory Overview bar chart data ────────────────────────────────────────
const inventoryOverviewItems = [
  { label: "Brand A", value: 72 },
  { label: "Brand B", value: 58 },
  { label: "Brand C", value: 45 },
  { label: "Brand D", value: 30 },
];

// ─── Low Stock Distributions bar chart data ───────────────────────────────────
const lowStockItems = [
  { label: "Brand A", value: 18 },
  { label: "Brand B", value: 12 },
  { label: "Brand C", value: 8 },
  { label: "Brand D", value: 4 },
];

// ─── Recent Inventory Activity ────────────────────────────────────────────────
const recentActivityItems = [
  {
    id: "act-1",
    title: "Inventory Received",
    description: "Batch 2026-001 (Dorado 50kg) accepted from Supplier A",
    time: "5 mins ago",
    color: "#0B7A2A",
    icon: Inbox,
  },
  {
    id: "act-2",
    title: "Inventory Received",
    description: "Batch 2026-001 (Dorado 50kg) accepted from Supplier A",
    time: "5 mins ago",
    color: "#0B7A2A",
    icon: Inbox,
  },
  {
    id: "act-3",
    title: "Inventory Received",
    description: "Batch 2026-001 (Dorado 50kg) accepted from Supplier A",
    time: "5 mins ago",
    color: "#0B7A2A",
    icon: Inbox,
  },
];

// ─── Pending Order Requests ───────────────────────────────────────────────────
const pendingOrderItems = [
  {
    id: "req-1",
    name: "Supplier A",
    category: "Bulk Wholesale",
    initials: "M",
    date: "OCT 24",
    color: "#0B7A2A",
    detailsLabel: "Details",
  },
  {
    id: "req-2",
    name: "Supplier A",
    category: "Bulk Wholesale",
    initials: "M",
    date: "OCT 24",
    color: "#0B7A2A",
    detailsLabel: "Details",
  },
  {
    id: "req-3",
    name: "Supplier A",
    category: "Bulk Wholesale",
    initials: "M",
    date: "OCT 24",
    color: "#0B7A2A",
    detailsLabel: "Details",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const now = new Date();
const formattedDate = now.toLocaleDateString("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});
const formattedTime = now.toLocaleTimeString("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export default function WarehouseEncoderDashboard() {
  const [pendingCount] = useState(pendingOrderItems.length);

  return (
    <div className="space-y-5">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <Breadcrumbs items={[{ label: "Main" }, { label: "Dashboard" }]} />
          <h1 className="text-[clamp(2rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-slate-900">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Last Updated: Today · {formattedTime}
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

      {/* ── Charts Row ───────────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Inventory Status donut */}
        <DistributionCard
          title="Inventory Status"
          totalLabel="Current Inventory Status"
          items={inventoryStatusItems}
          donutSize={160}
          holeSize={60}
        />

        {/* Inventory Overview bar chart */}
        <CategoryBarCard
          title="Inventory Overview"
          items={inventoryOverviewItems}
          seriesLabel="2026"
          barColor="#0F9D2A"
          height={160}
          showLegend={true}
        />

        {/* Low Stock Distributions bar chart */}
        <CategoryBarCard
          title="Low Stock Distributions"
          items={lowStockItems}
          seriesLabel="2026"
          barColor="#E0AC1C"
          height={160}
          showLegend={true}
        />
      </div>

      {/* ── Activity + Pending Row ────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Inventory Activity */}
        <div className="flex flex-col gap-3">
          <RecentActivityCard
            title="Recent Inventory Activity"
            items={recentActivityItems}
            showConnector={true}
          />
          {/* View History CTA */}
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
          >
            <History size={14} strokeWidth={2.5} />
            View History
            <ArrowRight size={13} strokeWidth={2.5} />
          </button>
        </div>

        {/* Pending Order Requests */}
        <div className="flex flex-col gap-3">
          <PendingReviewsCard
            title="Pending Order Requests"
            items={pendingOrderItems}
            viewAllLabel="View Requests →"
            onViewAll={() => {}}
          />
          {/* Badge showing count */}
          <div className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50 px-4 py-2.5 text-sm">
            <span className="font-semibold text-amber-700">
              {pendingCount} awaiting approval
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[12px] font-bold text-emerald-700 transition hover:text-emerald-800"
            >
              View Requests
              <ArrowRight size={13} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}