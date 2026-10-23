import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeDollarSign,
  TrendingUp,
  Coins,
  ClipboardList,
  CheckCircle,
  ShoppingCart,
  Loader2,
} from "lucide-react";
import KPICard from "../../../Components/Graphs/KPICard";
import DistributionCard from "../../../Components/Graphs/PieChartCard";
import SalesTrendCard from "../../../Components/Graphs/LineGraphsCard";
import RecentActivityCard from "../../../Components/Graphs/RecentActivityCard";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import DateDisplay from "../../../Components/Minor-Components/DateDisplay";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import useApi from "../../../Components/hooks/useApi";

const RANGE_OPTIONS = [
  { label: "Week", value: "Week" },
  { label: "Month", value: "Month" },
];

const TOP_SELLING_COLUMNS = [
  {
    key: "rank",
    label: "Rank",
    width: "60px",
    render: (row) => {
      if (row.rank <= 3) {
        return (
          <div className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-800 text-white text-[11px] font-bold">
            {row.rank}
          </div>
        );
      }
      return (
        <div className="flex items-center justify-center h-5 w-5 text-gray-500 text-[11px] font-bold">
          {row.rank}
        </div>
      );
    },
  },
  { key: "product", label: "Product" },
  { key: "quantity", label: "Quantity Sold" },
];

const MillerSalesDashboard = () => {
  const navigate = useNavigate();
  const { request } = useApi();

  const [selectedTrendRange, setSelectedTrendRange] = useState("Week");
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await request("/miller-employees/sales/dashboard/");
      setDashboardData(res);
    } catch (err) {
      console.error("Failed to load sales dashboard data:", err);
      setError(err?.message || "Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const lastUpdatedTime =
    dashboardData?.last_updated ||
    new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

  const kpis = dashboardData?.kpis;

  // ─── Clickable KPI Cards with Live Data ──────────────────────────────────────
  const salesMetrics = [
    {
      title: "TODAY'S SALES",
      value: kpis?.today_sales?.value || "₱0.00",
      trend: kpis?.today_sales?.trend || "Sales recorded today",
      icon: <BadgeDollarSign size={18} strokeWidth={2.2} />,
      tone: "success",
      onClick: () => navigate("/miller-sales/sales-history"),
      ariaLabel: "Navigate to Sales History for Today's Sales",
    },
    {
      title: "SALES THIS MONTH",
      value: kpis?.month_sales?.value || "₱0.00",
      trend: kpis?.month_sales?.trend || "Accumulated monthly revenue",
      icon: <TrendingUp size={18} strokeWidth={2.2} />,
      tone: "success",
      onClick: () => navigate("/miller-sales/sales-history"),
      ariaLabel: "Navigate to Sales History for Sales This Month",
    },
    {
      title: "POTENTIAL SALES",
      value: kpis?.potential_sales?.value || "₱0.00",
      trend:
        kpis?.potential_sales?.trend ||
        "Estimated revenue from active inventory and pending sales",
      icon: <Coins size={18} strokeWidth={2.2} />,
      tone: "success",
      onClick: () => navigate("/miller-sales/point-of-sale"),
      ariaLabel: "Navigate to Point of Sale (POS) for Potential Sales",
    },
    {
      title: "PENDING ONLINE ORDERS",
      value: kpis?.pending_online_orders?.value || "0 Orders",
      trend: kpis?.pending_online_orders?.trend || "Requires seller attention",
      icon: <ClipboardList size={18} strokeWidth={2.2} />,
      tone: "warning",
      onClick: () => navigate("/miller-sales/online-orders"),
      ariaLabel: "Navigate to Online Orders for Pending Online Orders",
    },
  ];

  // ─── Dynamic Sales Trend Series by Range ─────────────────────────────────────
  const currentTrendData = useMemo(() => {
    if (selectedTrendRange === "Month") {
      return dashboardData?.sales_trend?.month || [];
    }
    return dashboardData?.sales_trend?.week || [];
  }, [selectedTrendRange, dashboardData]);

  const currentTrendMax = useMemo(() => {
    if (selectedTrendRange === "Month") {
      return dashboardData?.sales_trend?.max_month || 50000;
    }
    return dashboardData?.sales_trend?.max_week || 10000;
  }, [selectedTrendRange, dashboardData]);

  // ─── Recent Order Activities Mapping ─────────────────────────────────────────
  const recentOrderActivities = useMemo(() => {
    const list = dashboardData?.recent_activities || [];
    return list.map((item) => ({
      ...item,
      icon: item.type === "online" ? ShoppingCart : CheckCircle,
    }));
  }, [dashboardData]);

  // ─── Top Selling Products ───────────────────────────────────────────────────
  const topSellingProducts = dashboardData?.top_selling_products || [];

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Main", path: "/miller-sales/dashboard" },
          { label: "Dashboard" },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Last Updated: Today , {lastUpdatedTime}
          </p>
        </div>
        <DateDisplay />
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 mt-4">
          {error}
        </div>
      ) : null}

      {/* ── KPI Cards (Clickable) ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {salesMetrics.map((metric) => (
          <KPICard key={metric.title} {...metric} />
        ))}
      </div>

      {/* ── Charts: Sales Trend & Sales Distribution (Aligned Panels) ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 items-stretch">
        <div className="lg:col-span-2 flex flex-col">
          <SalesTrendCard
            title="Sales Trend"
            data={currentTrendData}
            selectedRange={selectedTrendRange}
            rangeOptions={RANGE_OPTIONS}
            onRangeChange={setSelectedTrendRange}
            maxValue={currentTrendMax}
            height={260}
            className="h-full flex flex-col justify-between"
            axisFormatter={(val) => {
              if (val >= 1000000) return `₱${(val / 1000000).toFixed(1)}M`;
              if (val >= 1000) return `₱${Math.round(val / 1000)}k`;
              return `₱${val}`;
            }}
            valueFormatter={(val) =>
              `₱${Number(val).toLocaleString("en-PH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`
            }
            emptyStateTitle="No sales trend data"
            emptyStateDescription="Sales trend points will be plotted as transactions occur."
          />
        </div>
        <div className="flex flex-col">
          <DistributionCard
            title="Sales Distribution"
            totalLabel="100% Revenue"
            items={dashboardData?.sales_distribution || []}
            className="h-full flex flex-col justify-between"
            emptyStateTitle="No distribution data"
            emptyStateDescription="Distribution will show once completed sales are recorded."
          />
        </div>
      </div>

      {/* ── Lower Row: Recent Activity & Top Selling Products ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 items-stretch">
        <div className="flex flex-col">
          <RecentActivityCard
            title="Recent Order Activity"
            items={recentOrderActivities}
            className="h-full flex flex-col"
          />
        </div>
        <div className="flex flex-col">
          <SectionedTableCard
            title="Top Selling Products"
            columns={TOP_SELLING_COLUMNS}
            sections={[{ rows: topSellingProducts }]}
            className="h-full flex flex-col"
            emptyStateTitle="No sales recorded yet"
            emptyStateDescription="Top selling products ranked by quantity sold (kg) will appear here."
          />
        </div>
      </div>
    </>
  );
};

export default MillerSalesDashboard;
