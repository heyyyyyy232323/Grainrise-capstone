import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  UserPlus,
  Truck,
  RotateCcw,
  Receipt,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  ChevronDown,
  Layers,
  Warehouse,
  PieChart,
  Package,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import useApi from "../../../Components/hooks/useApi";

const WarehouseLogisticsDashboard = () => {
  const { request } = useApi();

  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const [currentDateStr, setCurrentDateStr] = useState("");
  const [error, setError] = useState("");
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportDropdownRef = useRef(null);

  const formatNowTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDateDisplay = () => {
    const now = new Date();
    return now.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const loadDashboard = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError("");

      try {
        const res = await request("/warehouse/logistics/dashboard/", {
          method: "GET",
          throwOnError: true,
        });

        if (res?.success && res?.data) {
          setDashboardData(res.data);
          setLastUpdated(`Today ${formatNowTime()}`);
          setCurrentDateStr(formatDateDisplay());
        } else {
          setError(res?.message || "Failed to load warehouse logistics dashboard data.");
        }
      } catch (err) {
        const msg =
          err?.data?.error ||
          err?.data?.message ||
          err?.message ||
          "Unable to load dashboard data.";
        setError(msg);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [request]
  );

  useEffect(() => {
    loadDashboard(false);
    setCurrentDateStr(formatDateDisplay());
  }, [loadDashboard]);

  // Handle outside click for export menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Derived values
  const kpis = dashboardData?.kpis || {
    orders_awaiting_assignment: 0,
    unassigned_vehicles: 0,
    pending_returns: 0,
    pending_reimbursements: 0,
  };

  const driverAssignment = dashboardData?.driver_assignment || {
    orders_awaiting: 0,
    orders_assigned: 0,
    total_orders: 0,
    percentage: 0,
    summary: "No forwarded orders awaiting driver assignment.",
  };

  const statusBreakdown = dashboardData?.order_status_breakdown || {
    total: 0,
    pending: { count: 0, percentage: 0 },
    forwarded: { count: 0, percentage: 0 },
    assigned: { count: 0, percentage: 0 },
    completed: { count: 0, percentage: 0 },
  };

  const driversList = dashboardData?.load_utilization || [];
  const deliveryOrders = dashboardData?.delivery_orders || [];
  const productReturns = dashboardData?.product_returns || [];

  // Conic gradient calculation for Order Status Breakdown
  const conicGradientStyle = useMemo(() => {
    const total = statusBreakdown.total || 0;
    if (total === 0) {
      return { background: "conic-gradient(#E5E7EB 0% 100%)" };
    }

    const assignedPct = statusBreakdown.assigned?.percentage || 0;
    const forwardedPct = statusBreakdown.forwarded?.percentage || 0;
    const completedPct = statusBreakdown.completed?.percentage || 0;

    const stop1 = assignedPct;
    const stop2 = stop1 + forwardedPct;
    const stop3 = stop2 + completedPct;

    return {
      background: `conic-gradient(#0B5D1E 0% ${stop1}%, #E1AA24 ${stop1}% ${stop2}%, #39A04B ${stop2}% ${stop3}%, #9CA3AF ${stop3}% 100%)`,
    };
  }, [statusBreakdown]);

  // Export to CSV matching Farmer Dashboard pattern
  const exportToCsv = (section = "all") => {
    const rows = [];
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `grainrise-warehouse-flc-dashboard-${section}-${dateStr}.csv`;

    const escapeField = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    // Header Metadata
    rows.push(["GRAINRISE WAREHOUSE LOGISTICS (FLC) DASHBOARD REPORT"]);
    rows.push(["Generated At", new Date().toLocaleString()]);
    rows.push([]);

    // 1. KPI Summary
    if (section === "kpi" || section === "all") {
      rows.push(["KEY PERFORMANCE INDICATORS (KPIS)"]);
      rows.push(["Metric", "Value", "Description"]);
      rows.push(["Orders Awaiting Assignment", kpis.orders_awaiting_assignment, "Forwarded orders awaiting driver assignment"]);
      rows.push(["Unassigned Vehicles", kpis.unassigned_vehicles, "Branch-designated vehicles without active driver assignment"]);
      rows.push(["Pending Return Issues", kpis.pending_returns, "Pending online order return requests"]);
      rows.push(["Pending Reimbursements", kpis.pending_reimbursements, "Reimbursement requests awaiting review/processing"]);
      rows.push(["Driver Assignment Progress", `${driverAssignment.percentage}%`, driverAssignment.summary]);
      rows.push([]);
    }

    // 2. Load Utilization
    if (section === "utilization" || section === "all") {
      rows.push(["DRIVER LOAD UTILIZATION"]);
      rows.push(["Driver Name", "Plate Number", "Vehicle Model", "Pending Load (kg)", "Max Capacity (kg)", "Remaining Capacity (kg)", "Utilization (%)", "Status"]);
      if (driversList.length === 0) {
        rows.push(["No active drivers or vehicles assigned to this branch."]);
      } else {
        driversList.forEach((d) => {
          rows.push([
            d.driver_name,
            d.plate_number || "—",
            d.model || "—",
            d.pending_load_kg,
            d.max_capacity_kg,
            d.remaining_capacity_kg,
            `${d.utilization_percentage}%`,
            d.status_label,
          ]);
        });
      }
      rows.push([]);
    }

    // 3. Order Status Breakdown
    if (section === "status_breakdown" || section === "all") {
      rows.push(["ORDER STATUS BREAKDOWN"]);
      rows.push(["Status Category", "Order Count", "Percentage"]);
      rows.push(["Pending", statusBreakdown.pending?.count || 0, `${statusBreakdown.pending?.percentage || 0}%`]);
      rows.push(["Forwarded to Logistics", statusBreakdown.forwarded?.count || 0, `${statusBreakdown.forwarded?.percentage || 0}%`]);
      rows.push(["Assigned to Driver", statusBreakdown.assigned?.count || 0, `${statusBreakdown.assigned?.percentage || 0}%`]);
      rows.push(["Completed / Delivered", statusBreakdown.completed?.count || 0, `${statusBreakdown.completed?.percentage || 0}%`]);
      rows.push(["Total Orders", statusBreakdown.total || 0, "100%"]);
      rows.push([]);
    }

    // 4. Delivery Management Records
    if (section === "deliveries" || section === "all") {
      rows.push(["DELIVERY MANAGEMENT (FORWARDED ORDERS)"]);
      rows.push(["Batch No.", "Retailer Buyer", "Variant", "Quantity (kg)", "Target Arrival Date"]);
      if (deliveryOrders.length === 0) {
        rows.push(["No orders currently forwarded to logistics."]);
      } else {
        deliveryOrders.forEach((o) => {
          rows.push([
            o.batch_no,
            o.retailer,
            o.variant,
            o.qty,
            o.arrival,
          ]);
        });
      }
      rows.push([]);
    }

    // 5. Product Returns Records
    if (section === "returns" || section === "all") {
      rows.push(["PRODUCT RETURN ISSUES (PENDING)"]);
      rows.push(["Return Reference", "Order No.", "Product Variant", "Retailer Buyer", "Quantity"]);
      if (productReturns.length === 0) {
        rows.push(["No pending product returns."]);
      } else {
        productReturns.forEach((r) => {
          rows.push([
            r.return_reference_no,
            r.order_no,
            r.variant,
            r.buyer,
            r.qty,
          ]);
        });
      }
      rows.push([]);
    }

    const csvContent = "\uFEFF" + rows.map((r) => r.map(escapeField).join(",")).join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <Breadcrumbs items={[{ label: "Main" }, { label: "Dashboard" }]} />
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Last Updated: {lastUpdated || "Loading..."}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start flex-wrap">
          {/* CSV Export Dropdown matching Farmer Dashboard pattern */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              type="button"
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-100 active:scale-95 cursor-pointer"
              title="Export dashboard data to CSV"
            >
              <FileSpreadsheet size={14} className="text-emerald-700" />
              <span>Export CSV</span>
              <ChevronDown size={12} className="text-emerald-700" />
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 z-50 mt-1.5 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Select Dataset
                </div>
                <button
                  type="button"
                  onClick={() => exportToCsv("all")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition cursor-pointer text-left"
                >
                  <Layers size={13} /> All Dashboard Data
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => exportToCsv("kpi")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition cursor-pointer text-left"
                >
                  <Warehouse size={13} /> KPI Summary
                </button>
                <button
                  type="button"
                  onClick={() => exportToCsv("utilization")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition cursor-pointer text-left"
                >
                  <Truck size={13} /> Load Utilization
                </button>
                <button
                  type="button"
                  onClick={() => exportToCsv("status_breakdown")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition cursor-pointer text-left"
                >
                  <PieChart size={13} /> Status Breakdown
                </button>
                <button
                  type="button"
                  onClick={() => exportToCsv("deliveries")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition cursor-pointer text-left"
                >
                  <Package size={13} /> Forwarded Deliveries
                </button>
                <button
                  type="button"
                  onClick={() => exportToCsv("returns")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition cursor-pointer text-left"
                >
                  <RotateCcw size={13} /> Pending Returns
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => loadDashboard(true)}
            disabled={isRefreshing || isLoading}
            className="inline-flex items-center gap-2 bg-white border border-gray-200 px-3.5 py-2 rounded-lg text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-60"
            title="Refresh Dashboard Data"
          >
            <RefreshCw
              size={15}
              className={`text-gray-600 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <div className="inline-flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 shadow-sm">
            <Calendar size={16} className="text-gray-500" />
            {currentDateStr || "Today"}
          </div>
        </div>
      </div>

      {/* Error alert if any */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          <AlertCircle size={18} className="flex-none" />
          <p className="flex-1 font-medium">{error}</p>
          <button
            onClick={() => loadDashboard(true)}
            className="underline font-bold hover:text-rose-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Orders Awaiting Assignment */}
        <Link
          to="/warehouse-logistics/delivery-management"
          className="bg-white rounded-[14px] border border-gray-200 p-5 shadow-sm hover:border-[#0B5D1E] hover:shadow-md transition-all cursor-pointer block group"
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[11px] font-bold text-gray-500 tracking-wider uppercase group-hover:text-[#0B5D1E] transition-colors">
              Orders Awaiting Assignment
            </h3>
            <div className="p-1 rounded-md bg-emerald-50 text-emerald-700 group-hover:bg-[#0B5D1E] group-hover:text-white transition-colors">
              <UserPlus size={18} />
            </div>
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-4">
            {isLoading ? "—" : kpis.orders_awaiting_assignment}
          </p>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md w-fit">
              Orders awaiting driver assignment
            </span>
            <ChevronRight
              size={15}
              className="text-gray-400 group-hover:text-[#0B5D1E] group-hover:translate-x-0.5 transition-all"
            />
          </div>
        </Link>

        {/* Card 2: Unassigned Vehicles */}
        <Link
          to="/warehouse-logistics/vehicle-assignee-management"
          className="bg-white rounded-[14px] border border-gray-200 p-5 shadow-sm hover:border-emerald-700 hover:shadow-md transition-all cursor-pointer block group"
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[11px] font-bold text-gray-500 tracking-wider uppercase group-hover:text-emerald-700 transition-colors">
              Unassigned Vehicles
            </h3>
            <div className="p-1 rounded-md bg-emerald-50 text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white transition-colors">
              <Truck size={18} />
            </div>
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-4">
            {isLoading ? "—" : kpis.unassigned_vehicles}
          </p>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md w-fit">
              Vehicles awaiting driver assignment
            </span>
            <ChevronRight
              size={15}
              className="text-gray-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all"
            />
          </div>
        </Link>

        {/* Card 3: Pending Return Issues */}
        <Link
          to="/warehouse-logistics/product-returns"
          className="bg-white rounded-[14px] border border-gray-200 p-5 shadow-sm hover:border-rose-600 hover:shadow-md transition-all cursor-pointer block group"
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[11px] font-bold text-gray-500 tracking-wider uppercase group-hover:text-rose-700 transition-colors">
              Pending Return Issues
            </h3>
            <div className="p-1 rounded-md bg-rose-50 text-rose-700 group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <RotateCcw size={18} />
            </div>
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-4">
            {isLoading ? "—" : kpis.pending_returns}
          </p>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-1 rounded-md w-fit">
              Return issues awaiting review
            </span>
            <ChevronRight
              size={15}
              className="text-gray-400 group-hover:text-rose-700 group-hover:translate-x-0.5 transition-all"
            />
          </div>
        </Link>

        {/* Card 4: Pending Reimbursements */}
        <Link
          to="/warehouse-logistics/reimbursement-history"
          className="bg-white rounded-[14px] border border-gray-200 p-5 shadow-sm hover:border-amber-600 hover:shadow-md transition-all cursor-pointer block group"
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[11px] font-bold text-gray-500 tracking-wider uppercase group-hover:text-amber-700 transition-colors">
              Pending Reimbursements
            </h3>
            <div className="p-1 rounded-md bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Receipt size={18} />
            </div>
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-4">
            {isLoading ? "—" : kpis.pending_reimbursements}
          </p>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md w-fit">
              Logistics related handling required
            </span>
            <ChevronRight
              size={15}
              className="text-gray-400 group-hover:text-amber-700 group-hover:translate-x-0.5 transition-all"
            />
          </div>
        </Link>
      </div>

      {/* Middle Section: Charts and Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Load Utilization */}
        <div className="bg-white rounded-[14px] border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Load Utilization</h3>
            <span className="text-xs font-semibold text-gray-500">
              {driversList.length} Active {driversList.length === 1 ? "Driver" : "Drivers"}
            </span>
          </div>

          <div className="space-y-6">
            {driversList.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400 font-medium">
                No active drivers or vehicles assigned to this branch.
              </div>
            ) : (
              driversList.map((driver, idx) => {
                const pct = driver.utilization_percentage || 0;
                let barColor = "bg-emerald-600";
                let badgeClass = "text-emerald-700";

                if (driver.status_label === "Full") {
                  barColor = "bg-rose-600";
                  badgeClass = "text-rose-600";
                } else if (driver.status_label === "Limited Capacity") {
                  barColor = "bg-amber-500";
                  badgeClass = "text-amber-600";
                } else if (driver.status_label === "No Vehicle") {
                  barColor = "bg-gray-300";
                  badgeClass = "text-gray-400";
                }

                return (
                  <div key={driver.driver_id || idx}>
                    <div className="flex justify-between text-sm font-semibold mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900">{driver.driver_name}</span>
                        {driver.plate_number && (
                          <span className="text-[11px] font-normal text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            {driver.plate_number}
                          </span>
                        )}
                      </div>
                      <span className="text-gray-500">
                        <span className="text-gray-900 font-bold">
                          {Number(driver.pending_load_kg || 0).toLocaleString()}
                        </span>{" "}
                        / {Number(driver.max_capacity_kg || 0).toLocaleString()} kg
                      </span>
                    </div>

                    <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all duration-300`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between text-[11px] font-bold mt-2">
                      <span className={badgeClass}>{driver.status_label}</span>
                      <span className="text-gray-400">{pct}%</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side Cards */}
        <div className="space-y-6 flex flex-col">
          {/* Order Status Breakdown */}
          <div className="bg-white rounded-[14px] border border-gray-200 p-6 shadow-sm flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Order Status Breakdown</h3>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-8 h-full pb-4">
              {/* Donut Chart */}
              <div className="relative w-36 h-36 flex-none">
                <div
                  className="absolute inset-0 rounded-full transition-all duration-500"
                  style={conicGradientStyle}
                ></div>
                <div className="absolute inset-[18%] bg-white rounded-full flex flex-col items-center justify-center">
                  <span className="text-lg font-extrabold text-gray-900">
                    {statusBreakdown.total > 0 ? "100%" : "0%"}
                  </span>
                  <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mt-0.5">
                    Total ({statusBreakdown.total})
                  </span>
                </div>
              </div>

              {/* Legend Grid */}
              <div className="flex-1 grid grid-cols-2 gap-3 w-full">
                {/* Pending */}
                <div className="border border-gray-100 rounded-xl p-3 flex items-center justify-between shadow-sm bg-white">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                    <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                      Pending
                    </span>
                  </div>
                  <span className="text-xs font-bold text-gray-900">
                    {statusBreakdown.pending?.percentage || 0}%
                  </span>
                </div>

                {/* Forwarded */}
                <div className="border border-gray-100 rounded-xl p-3 flex items-center justify-between shadow-sm bg-white">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#E1AA24]"></div>
                    <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                      Forwarded
                    </span>
                  </div>
                  <span className="text-xs font-bold text-gray-900">
                    {statusBreakdown.forwarded?.percentage || 0}%
                  </span>
                </div>

                {/* Assigned */}
                <div className="border border-gray-100 rounded-xl p-3 flex items-center justify-between shadow-sm bg-white">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#0B5D1E]"></div>
                    <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                      Assigned
                    </span>
                  </div>
                  <span className="text-xs font-bold text-gray-900">
                    {statusBreakdown.assigned?.percentage || 0}%
                  </span>
                </div>

                {/* Completed */}
                <div className="border border-gray-100 rounded-xl p-3 flex items-center justify-between shadow-sm bg-white">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#39A04B]"></div>
                    <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                      Completed
                    </span>
                  </div>
                  <span className="text-xs font-bold text-gray-900">
                    {statusBreakdown.completed?.percentage || 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Driver Assignment Status */}
          <div className="bg-white rounded-[14px] border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Driver Assignment Status</h3>
            <div className="flex justify-end text-sm font-extrabold text-gray-900 mb-2">
              {driverAssignment.percentage}%
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0B5D1E] rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, driverAssignment.percentage)}%` }}
              ></div>
            </div>
            <p className="text-center text-xs text-gray-500 mt-3 font-medium">
              {driverAssignment.summary}
            </p>
          </div>
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Delivery Management Table */}
        <div className="bg-white rounded-[14px] border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Delivery Management</h3>
            <span className="text-xs text-gray-500 font-medium">Top Forwarded Orders</span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#EAF7E8] text-[10px] font-extrabold uppercase tracking-wider text-[#0B5D1E]">
                  <th className="px-5 py-3 whitespace-nowrap">Batch No.</th>
                  <th className="px-5 py-3 whitespace-nowrap">Retailer</th>
                  <th className="px-5 py-3 whitespace-nowrap">Variant</th>
                  <th className="px-5 py-3 whitespace-nowrap">Qty (kg)</th>
                  <th className="px-5 py-3 whitespace-nowrap">Target Arrival</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deliveryOrders.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-5 py-8 text-center text-sm text-gray-500">
                      No forwarded orders awaiting delivery assignment.
                    </td>
                  </tr>
                ) : (
                  deliveryOrders.map((row, idx) => (
                    <tr key={row.online_order_id || idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 text-[13px] font-semibold text-gray-700 whitespace-nowrap">
                        {row.batch_no}
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-gray-600 whitespace-nowrap">
                        {row.retailer}
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-gray-600 whitespace-nowrap">
                        {row.variant}
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-gray-600 whitespace-nowrap">
                        {row.qty}
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-gray-600 whitespace-nowrap">
                        {row.arrival}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-center mt-auto">
            <Link
              to="/warehouse-logistics/delivery-management"
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#0B5D1E] hover:text-emerald-800 uppercase tracking-wider transition-colors"
            >
              View Delivery Management <ChevronRight size={14} strokeWidth={3} />
            </Link>
          </div>
        </div>

        {/* Product Return Issues Table */}
        <div className="bg-white rounded-[14px] border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Product Return Issues</h3>
            <span className="text-xs text-gray-500 font-medium">Pending Returns</span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#EAF7E8] text-[10px] font-extrabold uppercase tracking-wider text-[#0B5D1E]">
                  <th className="px-5 py-3 whitespace-nowrap">Variant</th>
                  <th className="px-5 py-3 whitespace-nowrap">Order No.</th>
                  <th className="px-5 py-3 whitespace-nowrap">Retailer</th>
                  <th className="px-5 py-3 whitespace-nowrap">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {productReturns.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-5 py-8 text-center text-sm text-gray-500">
                      No pending product return issues.
                    </td>
                  </tr>
                ) : (
                  productReturns.map((row, idx) => (
                    <tr key={row.return_id || idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 text-[13px] text-gray-600 whitespace-nowrap">
                        {row.variant}
                      </td>
                      <td className="px-5 py-3.5 text-[13px] font-semibold text-gray-700 whitespace-nowrap">
                        {row.order_no}
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-gray-600 whitespace-nowrap">
                        {row.buyer}
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-gray-600 whitespace-nowrap">
                        {row.qty}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-center mt-auto">
            <Link
              to="/warehouse-logistics/product-returns"
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#0B5D1E] hover:text-emerald-800 uppercase tracking-wider transition-colors"
            >
              View Product Return Issues <ChevronRight size={14} strokeWidth={3} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseLogisticsDashboard;
