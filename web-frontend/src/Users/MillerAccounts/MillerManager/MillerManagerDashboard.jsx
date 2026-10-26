import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  ClipboardList,
  Users,
  Wallet,
  CalendarDays,
  ShoppingCart,
  FileText,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import KPICard from "../../../Components/Graphs/KPICard";
import RevenueExpenseTrendChart from "../../../Components/Graphs/RevenueExpenseTrendChart";
import DistributionCard from "../../../Components/Graphs/PieChartCard";
import PendingReviewsCard from "../../../Components/Graphs/PendingReviewsCard";
import RecentActivityCard from "../../../Components/Graphs/RecentActivityCard";
import useApi from "../../../Components/hooks/useApi";

// ─── Status and Badge Styles ──────────────────────────────────────────────────
const STATUS_STYLES = {
  Optimal: "bg-emerald-100 text-emerald-700",
  Good: "bg-emerald-50 text-emerald-600",
  "Needs Review": "bg-amber-100 text-amber-700",
  "No Data": "bg-slate-100 text-slate-600",
};

const TYPE_BADGE_STYLES = {
  "Order Approval": "bg-amber-100 text-amber-700",
  "Inbound Order": "bg-amber-100 text-amber-700",
};

function StarRating({ rating }) {
  if (rating === null || rating === undefined) {
    return <span className="text-xs text-slate-400 font-medium">No reviews yet</span>;
  }
  const fullStars = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-1 text-amber-500">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i}>{i < fullStars ? "★" : "☆"}</span>
      ))}
      <span className="ml-1 text-xs font-semibold text-slate-500">
        ({Number(rating).toFixed(1)})
      </span>
    </span>
  );
}

export default function MillerManagerDashboard() {
  const navigate = useNavigate();
  const { request } = useApi();

  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const res = await request("/miller/dashboard/", { method: "GET" });
      if (res && res.data) {
        setDashboardData(res.data);
      } else if (res && res.kpis) {
        setDashboardData(res);
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load Miller Manager Dashboard:", err);
      setError(err?.message || "Failed to load dashboard data. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [request]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formattedDate = lastUpdated.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = lastUpdated.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  // Loading State
  if (isLoading && !dashboardData) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <Breadcrumbs items={[{ label: "Main" }, { label: "Dashboard" }]} />
            <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold tracking-tight text-slate-900">
              Dashboard
            </h2>
            <p className="text-sm text-slate-500">Loading live data...</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24">
          <RefreshCw size={36} className="animate-spin text-[#0B5D1E] mb-3" />
          <p className="text-sm font-medium text-slate-600">Loading Miller Manager Dashboard...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error && !dashboardData) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <Breadcrumbs items={[{ label: "Main" }, { label: "Dashboard" }]} />
            <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold tracking-tight text-slate-900">
              Dashboard
            </h2>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-red-200 bg-red-50/50 p-6 text-center">
          <AlertCircle size={40} className="text-red-500 mb-3" />
          <h3 className="text-base font-bold text-red-800">Failed to load dashboard data</h3>
          <p className="mt-1 text-sm text-red-600 max-w-md">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 rounded-xl bg-[#0B5D1E] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#094d19] transition cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Map Data
  const kpis = dashboardData?.kpis || {};
  const kpiMetrics = [
    {
      title: "ACTIVE BRANCHES",
      value: kpis.active_branches?.value ?? "0",
      trend: kpis.active_branches?.trend ?? "Registered active branches",
      tone: kpis.active_branches?.tone ?? "neutral",
      icon: <Building2 size={18} strokeWidth={2.2} />,
      onClick: () => navigate("/miller-manager/branches"),
    },
    {
      title: "PENDING ORDER APPROVALS",
      value: kpis.pending_order_approvals?.value ?? "0",
      trend: kpis.pending_order_approvals?.trend ?? "Orders requiring your review",
      tone: kpis.pending_order_approvals?.tone ?? "neutral",
      icon: <ClipboardList size={18} strokeWidth={2.2} />,
      onClick: () => navigate("/miller-manager/order-approval"),
    },
    {
      title: "ACTIVE SUPPLIERS",
      value: kpis.active_suppliers?.value ?? "0",
      trend: kpis.active_suppliers?.trend ?? "Currently active procurement suppliers",
      tone: kpis.active_suppliers?.tone ?? "neutral",
      icon: <Users size={18} strokeWidth={2.2} />,
      onClick: () => navigate("/miller-manager/suppliers"),
    },
    {
      title: "SALES THIS MONTH",
      value: kpis.sales_this_month?.value ?? "₱0.00",
      trend: kpis.sales_this_month?.trend ?? "Complete in-store + online sales",
      tone: kpis.sales_this_month?.tone ?? "success",
      icon: <Wallet size={18} strokeWidth={2.2} />,
      onClick: () => navigate("/miller-manager/sales-history"),
    },
  ];

  const salesVsExpenses = dashboardData?.sales_vs_expenses;
  const salesVsExpensesSeries = salesVsExpenses?.has_data ? (salesVsExpenses.series || []) : [];

  const orderPipeline = dashboardData?.order_pipeline;
  const orderPipelineItems = orderPipeline?.items || [];
  const orderPipelineTotalLabel = orderPipeline?.totalLabel || "0 Active Orders";

  const branchPerformance = dashboardData?.branch_performance || [];
  const fleetStatus = dashboardData?.fleet_status || [];
  const pendingActions = dashboardData?.pending_actions || [];

  const recentOrderActivity = (dashboardData?.recent_order_activity || []).map((act) => ({
    ...act,
    icon: act.order_type === "online" ? ShoppingCart : FileText,
  }));

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
            Last Updated: Today · {formattedTime}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh Dashboard Data"
          >
            <RefreshCw
              size={15}
              className={`text-slate-500 ${isRefreshing ? "animate-spin text-[#0B5D1E]" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 shadow-sm">
            <CalendarDays size={16} className="text-slate-500" />
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* ── KPI Row ──────────────────────────────────────────────────────── */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {kpiMetrics.map((metric) => (
          <KPICard key={metric.title} {...metric} />
        ))}
      </div>

      {/* ── Sales vs Expenses Chart + Order Pipeline ─────────────────────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueExpenseTrendChart
            title="Sales vs Expenses"
            series={salesVsExpensesSeries}
            height={260}
            valueFormatter={(v) => {
              if (typeof v !== "number") return String(v || "");
              if (v >= 1000000) return `₱${(v / 1000000).toFixed(1)}M`;
              if (v >= 1000) return `₱${(v / 1000).toFixed(1)}K`;
              return `₱${v.toLocaleString("en-PH")}`;
            }}
            axisFormatter={(v) => {
              if (v === 0) return "0";
              if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
              if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
              return String(Math.round(v));
            }}
          />
        </div>
        <DistributionCard
          title="Order Pipeline"
          totalLabel={orderPipelineTotalLabel}
          items={orderPipelineItems}
        />
      </div>

      {/* ── Branch Performance Overview + Fleet Status ───────────────────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-lg">Branch Performance Overview</h3>
            <button
              onClick={() => navigate("/miller-manager/performance")}
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
                {branchPerformance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                      No branch performance data available.
                    </td>
                  </tr>
                ) : (
                  branchPerformance.map((b) => (
                    <tr key={b.branch_id || b.branch} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-gray-900">{b.branch}</td>
                      <td className="px-5 py-3.5"><StarRating rating={b.rating} /></td>
                      <td className="px-5 py-3.5 text-gray-700">{b.sales}</td>
                      <td className="px-5 py-3.5 text-gray-700">{b.fulfillment}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            STATUS_STYLES[b.status] || STATUS_STYLES["No Data"]
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <PendingReviewsCard
          title="Fleet Status"
          items={fleetStatus}
          onViewAll={() => navigate("/miller-manager/vehicle-management")}
          viewAllLabel="View Vehicles"
          emptyMessage="No vehicles registered."
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
              {pendingActions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                    No pending order approvals requiring review.
                  </td>
                </tr>
              ) : (
                pendingActions.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          TYPE_BADGE_STYLES[item.type] || "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-700">{item.reference}</td>
                    <td className="px-5 py-3.5 text-gray-700">{item.submittedBy}</td>
                    <td className="px-5 py-3.5 text-gray-500">{item.date}</td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => navigate("/miller-manager/order-approval")}
                        className="rounded-lg bg-[#0B5D1E] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#094d19] transition-colors cursor-pointer"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Recent Order Activity ────────────────────────────────────────── */}
      <RecentActivityCard
        title="Recent Order Activity"
        items={recentOrderActivity}
        emptyMessage="No recent order activity recorded."
      />
    </div>
  );
}
