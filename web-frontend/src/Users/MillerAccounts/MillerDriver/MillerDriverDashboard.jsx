import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck,
  ClipboardList,
  CreditCard,
  MessageSquare,
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  Store,
  Warehouse,
  RefreshCw,
  AlertCircle,
  Loader2,
  ChevronRight,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import useApi from "../../../Components/hooks/useApi";

export default function MillerDriverDashboard() {
  const navigate = useNavigate();
  const { request } = useApi();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState("");

  const now = new Date();
  const formattedDate = now.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const fetchDashboardData = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const res = await request("/miller-employees/driver/dashboard/");
        if (res && res.success && res.data) {
          setDashboardData(res.data);
          const updateTime = new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          });
          setLastUpdatedTime(updateTime);
        } else {
          throw new Error(res?.message || "Failed to load dashboard data.");
        }
      } catch (err) {
        console.error("Error fetching driver dashboard data:", err);
        setError(err.message || "Failed to connect to server.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [request]
  );

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const kpis = dashboardData?.kpis;
  const activeDuty = dashboardData?.current_active_duty;
  const loadUtil = dashboardData?.load_utilization;
  const deliveries = dashboardData?.deliveries || [];

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-0.5">
          <Breadcrumbs items={[{ label: "Main" }, { label: "Dashboard" }]} />
          <h2 className="text-[2rem] font-extrabold tracking-[-0.02em] text-slate-900 leading-tight">
            Dashboard
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Last Updated: Today , {lastUpdatedTime || "Just now"}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => fetchDashboardData(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            title="Refresh Dashboard"
          >
            <RefreshCw
              size={13}
              className={`text-slate-500 ${refreshing ? "animate-spin text-[#0B5D1E]" : ""}`}
            />
            <span>Refresh</span>
          </button>

          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm">
            <CalendarDays size={14} className="text-slate-400" />
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => fetchDashboardData(true)}
            className="ml-auto underline font-medium cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── KPI Row (Matching Miller Logistics Dashboard Cards) ───────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Duties */}
        <button
          type="button"
          onClick={() => {
            if (kpis?.most_recent_active_group_key) {
              navigate(
                `/miller-driver/live-tracking?group=${encodeURIComponent(
                  kpis.most_recent_active_group_key
                )}`
              );
            } else {
              navigate("/miller-driver/my-duties");
            }
          }}
          className="bg-white rounded-[14px] border border-gray-200 p-5 shadow-sm hover:border-[#0B5D1E] hover:shadow-md transition-all cursor-pointer block group text-left w-full"
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[11px] font-bold text-gray-500 tracking-wider uppercase group-hover:text-[#0B5D1E] transition-colors">
              Active Duties
            </h3>
            <div className="p-1 rounded-md bg-emerald-50 text-emerald-700 group-hover:bg-[#0B5D1E] group-hover:text-white transition-colors">
              <Truck size={18} />
            </div>
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-4">
            {loading ? "—" : (kpis?.active_duties ?? 0)}
          </p>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md w-fit">
              Deliveries currently in progress.
            </span>
            <ChevronRight
              size={15}
              className="text-gray-400 group-hover:text-[#0B5D1E] group-hover:translate-x-0.5 transition-all"
            />
          </div>
        </button>

        {/* Card 2: Assigned Duties */}
        <button
          type="button"
          onClick={() => navigate("/miller-driver/my-duties")}
          className="bg-white rounded-[14px] border border-gray-200 p-5 shadow-sm hover:border-emerald-700 hover:shadow-md transition-all cursor-pointer block group text-left w-full"
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[11px] font-bold text-gray-500 tracking-wider uppercase group-hover:text-emerald-700 transition-colors">
              Assigned Duties
            </h3>
            <div className="p-1 rounded-md bg-emerald-50 text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white transition-colors">
              <ClipboardList size={18} />
            </div>
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-4">
            {loading ? "—" : (kpis?.assigned_duties ?? 0)}
          </p>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md w-fit">
              Duties ready for handling and dispatch
            </span>
            <ChevronRight
              size={15}
              className="text-gray-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all"
            />
          </div>
        </button>

        {/* Card 3: Pending Payments */}
        <button
          type="button"
          onClick={() => navigate("/miller-driver/payment-submission")}
          className="bg-white rounded-[14px] border border-gray-200 p-5 shadow-sm hover:border-amber-600 hover:shadow-md transition-all cursor-pointer block group text-left w-full"
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[11px] font-bold text-gray-500 tracking-wider uppercase group-hover:text-amber-700 transition-colors">
              Pending Payments
            </h3>
            <div className="p-1 rounded-md bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <CreditCard size={18} />
            </div>
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-4">
            {loading ? "—" : (kpis?.pending_payments ?? 0)}
          </p>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md w-fit">
              Payment submissions awaiting follow-up
            </span>
            <ChevronRight
              size={15}
              className="text-gray-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all"
            />
          </div>
        </button>

        {/* Card 4: Unread Messages */}
        <button
          type="button"
          onClick={() => navigate("/miller-driver/messages")}
          className="bg-white rounded-[14px] border border-gray-200 p-5 shadow-sm hover:border-blue-600 hover:shadow-md transition-all cursor-pointer block group text-left w-full"
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[11px] font-bold text-gray-500 tracking-wider uppercase group-hover:text-blue-700 transition-colors">
              Unread Messages
            </h3>
            <div className="p-1 rounded-md bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <MessageSquare size={18} />
            </div>
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-4">
            {loading ? "—" : (kpis?.unread_messages ?? 0)}
          </p>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-md w-fit">
              New buyer messages awaiting response
            </span>
            <ChevronRight
              size={15}
              className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all"
            />
          </div>
        </button>
      </div>

      {/* ── Middle Row: Current Active Duty + Load Utilization ─────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Current Active Duty ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            {/* Card header bar */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-emerald-100 bg-[#EBF7EE]">
              <span
                className={`inline-flex h-2.5 w-2.5 rounded-full ${
                  activeDuty?.exists ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                }`}
              />
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-emerald-800">
                CURRENT ACTIVE DUTY
              </p>
            </div>

            {loading ? (
              <div className="p-8 text-center flex flex-col items-center justify-center space-y-2">
                <Loader2 size={24} className="animate-spin text-emerald-600" />
                <p className="text-xs text-slate-400">Loading active delivery...</p>
              </div>
            ) : activeDuty?.exists ? (
              <div className="p-5 space-y-4">
                {/* Batch + Buyer */}
                <div>
                  <p className="font-extrabold text-slate-900 text-[16px] tracking-tight">
                    {activeDuty.batch_no}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                    {activeDuty.customer_type === "Warehouse" ? (
                      <Warehouse size={13} className="text-slate-400 shrink-0" />
                    ) : (
                      <Store size={13} className="text-slate-400 shrink-0" />
                    )}
                    <span>
                      {activeDuty.customer_type}:{" "}
                      <strong className="text-slate-700 font-semibold">
                        {activeDuty.retailer || activeDuty.customer_name}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Detail box */}
                <div className="rounded-xl bg-[#F5F7FA] p-4">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        COMMODITY
                      </p>
                      <p className="text-sm font-bold text-slate-800 truncate" title={activeDuty.commodity}>
                        {activeDuty.commodity}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        QUANTITY
                      </p>
                      <p className="text-sm font-bold text-slate-800">
                        {activeDuty.quantity}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-0.5 pt-2 border-t border-slate-200/60">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      DELIVERY SCHEDULE
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <CalendarDays size={13} className="text-slate-500" />
                      <p className="text-sm font-semibold text-slate-800">
                        {activeDuty.delivery_schedule}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center flex flex-col items-center justify-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
                  <Truck size={24} />
                </div>
                <p className="text-sm font-bold text-slate-800">No Active Duties</p>
                <p className="text-xs text-slate-400 max-w-xs">
                  You do not have any deliveries in transit right now. Check your assigned duties to begin dispatching.
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="p-5 pt-0 flex gap-2.5">
            {activeDuty?.exists ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/miller-driver/live-tracking?group=${encodeURIComponent(
                        activeDuty.buyer_group_key
                      )}`
                    )
                  }
                  className="flex-1 rounded-lg bg-[#0B5D1E] hover:bg-[#094d19] text-white text-xs font-bold py-2.5 uppercase tracking-wide transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  CONTINUE TRACKING
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/miller-driver/my-duties")}
                  className="flex-1 rounded-lg border border-slate-300 bg-white hover:border-slate-400 text-slate-700 text-xs font-bold py-2.5 uppercase tracking-wide transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  VIEW DUTY DETAILS
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/miller-driver/my-duties")}
                className="w-full rounded-lg bg-[#0B5D1E] hover:bg-[#094d19] text-white text-xs font-bold py-2.5 uppercase tracking-wide transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                VIEW MY DUTIES
              </button>
            )}
          </div>
        </div>

        {/* ── Load Utilization ───────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-600">
                LOAD UTILIZATION
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {loadUtil?.has_vehicle
                  ? `Based on active and assigned duties, Driver assignment limit: ${loadUtil.max_load}`
                  : "No vehicle currently assigned to your account"}
              </p>
            </div>

            {loading ? (
              <div className="py-6 text-center flex flex-col items-center justify-center space-y-2">
                <Loader2 size={24} className="animate-spin text-emerald-600" />
                <p className="text-xs text-slate-400">Loading utilization...</p>
              </div>
            ) : loadUtil?.has_vehicle ? (
              <>
                {/* Big number */}
                <div className="flex items-end gap-2">
                  <p className="text-[2.75rem] font-extrabold tracking-[-0.03em] leading-none text-slate-900">
                    {loadUtil.assigned_load}
                  </p>
                  <p className="text-sm font-medium text-slate-400 mb-1">
                    / {loadUtil.max_load}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        loadUtil.percent_assigned > 90
                          ? "bg-rose-500"
                          : loadUtil.percent_assigned > 70
                          ? "bg-amber-400"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, loadUtil.percent_assigned))}%` }}
                    />
                  </div>
                  <div className="flex justify-end">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        loadUtil.percent_assigned > 90
                          ? "text-rose-600"
                          : loadUtil.percent_assigned > 70
                          ? "text-amber-500"
                          : "text-emerald-600"
                      }`}
                    >
                      {loadUtil.percent_assigned}% ASSIGNED
                    </span>
                  </div>
                </div>

                {/* 3 stat boxes */}
                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  {/* Assigned Load */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <ClipboardList size={11} className="text-slate-400" />
                      ASSIGNED LOAD
                    </div>
                    <p className="text-sm font-bold text-slate-800 truncate" title={loadUtil.assigned_load_full}>
                      {loadUtil.assigned_load_full}
                    </p>
                  </div>

                  {/* Remaining Capacity — highlighted green */}
                  <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-3 space-y-1">
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      <Truck size={11} className="text-emerald-700" />
                      REMAINING CAPACITY
                    </div>
                    <p className="text-sm font-bold text-emerald-700 truncate" title={loadUtil.remaining_capacity}>
                      {loadUtil.remaining_capacity}
                    </p>
                  </div>

                  {/* Delivered Load */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <CheckCircle2 size={11} className="text-slate-400" />
                      DELIVERED LOAD
                    </div>
                    <p className="text-sm font-bold text-slate-800 truncate" title={loadUtil.delivered_load}>
                      {loadUtil.delivered_load}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center space-y-1.5">
                <Truck size={28} className="text-slate-400 mx-auto" />
                <p className="text-base font-bold text-slate-800">No Assigned Vehicle</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  You currently have no active vehicle assignment. Please contact your logistics coordinator to assign a vehicle.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Delivery Management Table ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">
            Delivery Management
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            Active Assignments Preview
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#EBF7EE] border-b border-emerald-100">
              <tr>
                <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                  Batch No.
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                  Buyer / Customer
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                  Commodity Details
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                  Schedule
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-xs text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin text-emerald-600" />
                      <span>Loading deliveries...</span>
                    </div>
                  </td>
                </tr>
              ) : deliveries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-xs text-slate-400">
                    No active delivery duties assigned at the moment.
                  </td>
                </tr>
              ) : (
                deliveries.map((d, idx) => {
                  const isTransit = String(d.status).toLowerCase() === "in transit";
                  return (
                    <tr key={d.online_order_id || idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 text-xs font-semibold text-slate-800">
                        {d.batch_no}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          {d.customer_type === "Warehouse" ? (
                            <Warehouse size={13} className="text-purple-600 shrink-0" />
                          ) : (
                            <Store size={13} className="text-blue-600 shrink-0" />
                          )}
                          <span className="font-medium text-slate-700">{d.retailer || d.customer_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-xs font-medium text-slate-800">{d.commodity}</p>
                        <p className="text-[11px] text-slate-400">{d.variety}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                            isTransit
                              ? "bg-blue-100 text-blue-700 border border-blue-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600">
                        {d.schedule}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="flex items-center justify-center gap-1.5 py-3 border-t border-slate-100 bg-slate-50/40">
          <button
            type="button"
            onClick={() => navigate("/miller-driver/my-duties")}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
          >
            View All Duties
            <ChevronDown size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
