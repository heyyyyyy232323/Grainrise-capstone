import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  UserPlus,
  Truck,
  RotateCcw,
  Receipt,
  ChevronRight,
  RefreshCw,
  Loader2,
  AlertCircle,
  Package,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import useApi from "../../../Components/hooks/useApi";

const MillerLogisticsDashboard = () => {
  const navigate = useNavigate();
  const { request } = useApi();

  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const [currentDateStr, setCurrentDateStr] = useState("");
  const [error, setError] = useState("");

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
        const res = await request("/miller-employees/logistics/dashboard/", {
          method: "GET",
          throwOnError: true,
        });

        if (res?.success && res?.data) {
          setDashboardData(res.data);
          setLastUpdated(`Today ${formatNowTime()}`);
          setCurrentDateStr(formatDateDisplay());
        } else {
          setError(res?.error || "Failed to load dashboard data.");
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
        <div className="flex items-center gap-3 self-start">
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
          to="/miller-logistics/delivery-management"
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
          to="/miller-logistics/vehicle-assignee-management"
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
          to="/miller-logistics/product-returns"
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
              className="text-gray-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all"
            />
          </div>
        </Link>

        {/* Card 4: Pending Reimbursements */}
        <Link
          to="/miller-logistics/reimbursement-history"
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
              className="text-gray-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all"
            />
          </div>
        </Link>
      </div>

      {/* Middle Section: Charts and Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Load Utilization */}
        <div className="bg-white rounded-[14px] border border-gray-200 p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Load Utilization</h3>
            <Link
              to="/miller-logistics/delivery-management"
              className="text-xs font-semibold text-[#0B5D1E] hover:underline"
            >
              Assign Deliveries
            </Link>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="animate-spin mb-2" size={24} />
              <p className="text-xs">Loading driver capacities...</p>
            </div>
          ) : driversList.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-gray-500 bg-gray-50 rounded-xl my-auto">
              <Truck size={32} className="text-gray-400 mb-2" />
              <p className="text-sm font-semibold text-gray-700">No Active Drivers</p>
              <p className="text-xs text-gray-400 mt-1">
                No active driver profiles registered for this branch.
              </p>
            </div>
          ) : (
            <div className="space-y-6 flex-1">
              {driversList.map((driver) => {
                const isFull = driver.status_label === "Full";
                const isLimited = driver.status_label === "Limited Capacity";
                const isNoVehicle = driver.status_label === "No Vehicle";

                const barColor = isFull
                  ? "bg-rose-600"
                  : isLimited
                  ? "bg-amber-500"
                  : isNoVehicle
                  ? "bg-gray-300"
                  : "bg-[#0B5D1E]";

                const textColor = isFull
                  ? "text-rose-600"
                  : isLimited
                  ? "text-amber-600"
                  : isNoVehicle
                  ? "text-gray-400"
                  : "text-emerald-700";

                return (
                  <div key={driver.driver_id}>
                    <div className="flex justify-between text-sm font-semibold mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900">{driver.driver_name}</span>
                        {driver.plate_number && (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
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
                        className={`h-full ${barColor} rounded-full transition-all duration-500`}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, driver.utilization_percentage || 0)
                          )}%`,
                        }}
                      ></div>
                    </div>

                    <div className={`flex justify-between text-[11px] font-bold mt-2 ${textColor}`}>
                      <span>{driver.status_label}</span>
                      <span className="text-gray-400">
                        {driver.utilization_percentage || 0}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                  className="absolute inset-0 rounded-full shadow-inner transition-all duration-700"
                  style={conicGradientStyle}
                ></div>
                <div className="absolute inset-[18%] bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
                  <span className="text-xl font-extrabold text-gray-900">
                    {statusBreakdown.total}
                  </span>
                  <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mt-0.5">
                    Total
                  </span>
                </div>
              </div>

              {/* Legend Grid */}
              <div className="flex-1 grid grid-cols-2 gap-3 w-full">
                {/* Pending */}
                <div className="border border-gray-100 rounded-xl p-3 flex items-center justify-between shadow-sm bg-white">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-400 flex-none"></div>
                    <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider truncate">
                      Pending
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-gray-900 block">
                      {statusBreakdown.pending.percentage}%
                    </span>
                    <span className="text-[10px] text-gray-400">
                      ({statusBreakdown.pending.count})
                    </span>
                  </div>
                </div>

                {/* Forwarded */}
                <div className="border border-gray-100 rounded-xl p-3 flex items-center justify-between shadow-sm bg-white">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-none"></div>
                    <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider truncate">
                      Forwarded
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-gray-900 block">
                      {statusBreakdown.forwarded.percentage}%
                    </span>
                    <span className="text-[10px] text-gray-400">
                      ({statusBreakdown.forwarded.count})
                    </span>
                  </div>
                </div>

                {/* Assigned */}
                <div className="border border-gray-100 rounded-xl p-3 flex items-center justify-between shadow-sm bg-white">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#0B5D1E] flex-none"></div>
                    <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider truncate">
                      Assigned
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-gray-900 block">
                      {statusBreakdown.assigned.percentage}%
                    </span>
                    <span className="text-[10px] text-gray-400">
                      ({statusBreakdown.assigned.count})
                    </span>
                  </div>
                </div>

                {/* Completed */}
                <div className="border border-gray-100 rounded-xl p-3 flex items-center justify-between shadow-sm bg-white">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#39A04B] flex-none"></div>
                    <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider truncate">
                      Completed
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-gray-900 block">
                      {statusBreakdown.completed.percentage}%
                    </span>
                    <span className="text-[10px] text-gray-400">
                      ({statusBreakdown.completed.count})
                    </span>
                  </div>
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
                className="h-full bg-[#0B5D1E] rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, driverAssignment.percentage))}%`,
                }}
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
            <span className="text-xs font-semibold text-gray-400">
              Orders Awaiting Driver
            </span>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#EAF7E8] text-[10px] font-extrabold uppercase tracking-wider text-[#0B5D1E]">
                  <th className="px-5 py-3 whitespace-nowrap">Batch No.</th>
                  <th className="px-5 py-3 whitespace-nowrap">Buyer</th>
                  <th className="px-5 py-3 whitespace-nowrap">Variant</th>
                  <th className="px-5 py-3 whitespace-nowrap">Qty (kg)</th>
                  <th className="px-5 py-3 whitespace-nowrap">Target Arrival</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-xs text-gray-400">
                      <Loader2 className="animate-spin inline-block mr-2" size={16} />
                      Loading delivery orders...
                    </td>
                  </tr>
                ) : deliveryOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-xs text-gray-400">
                      No orders currently forwarded to logistics.
                    </td>
                  </tr>
                ) : (
                  deliveryOrders.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
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
              to="/miller-logistics/delivery-management"
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
            <span className="text-xs font-semibold text-rose-600">Pending Issues</span>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#EAF7E8] text-[10px] font-extrabold uppercase tracking-wider text-[#0B5D1E]">
                  <th className="px-5 py-3 whitespace-nowrap">Variant</th>
                  <th className="px-5 py-3 whitespace-nowrap">Order / Ref No.</th>
                  <th className="px-5 py-3 whitespace-nowrap">Buyer</th>
                  <th className="px-5 py-3 whitespace-nowrap">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-xs text-gray-400">
                      <Loader2 className="animate-spin inline-block mr-2" size={16} />
                      Loading return issues...
                    </td>
                  </tr>
                ) : productReturns.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-xs text-gray-400">
                      No pending return issues found.
                    </td>
                  </tr>
                ) : (
                  productReturns.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
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
              to="/miller-logistics/product-returns"
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

export default MillerLogisticsDashboard;
