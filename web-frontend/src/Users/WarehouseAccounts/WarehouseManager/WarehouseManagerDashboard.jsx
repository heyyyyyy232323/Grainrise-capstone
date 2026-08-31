import { useNavigate } from "react-router-dom";
import {
  Warehouse,
  Users,
  ClipboardList,
  Package,
  TrendingUp,
  ArrowRight,
  Building2,
  CalendarDays,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import KPICard from "../../../Components/Graphs/KPICard";

const kpiMetrics = [
  {
    title: "ACTIVE BRANCHES",
    value: "12",
    trend: "Across Central Luzon",
    tone: "success",
    icon: <Building2 size={18} strokeWidth={2.2} />,
  },
  {
    title: "TOTAL EMPLOYEES",
    value: "284",
    trend: "Assigned across all branches",
    tone: "neutral",
    icon: <Users size={18} strokeWidth={2.2} />,
  },
  {
    title: "PENDING ORDER APPROVALS",
    value: "6 Orders",
    trend: "Requires manager sign-off",
    tone: "warning",
    icon: <ClipboardList size={18} strokeWidth={2.2} />,
  },
  {
    title: "WAREHOUSE CAPACITY",
    value: "84.2%",
    trend: "142,500 kg stored",
    tone: "success",
    icon: <Package size={18} strokeWidth={2.2} />,
  },
];

const RECENT_BRANCH_ACTIVITIES = [
  { branch: "Warehouse Distribution A", manager: "Carlos Mendoza", employees: 28, capacity: "88%", pendingOrders: 2 },
  { branch: "Warehouse Distribution B", manager: "Elena Bautista", employees: 22, capacity: "76%", pendingOrders: 1 },
  { branch: "Warehouse Distribution C", manager: "Arman Santos", employees: 19, capacity: "91%", pendingOrders: 3 },
  { branch: "Warehouse Distribution D", manager: "Grace Tan", employees: 31, capacity: "82%", pendingOrders: 0 },
];

export default function WarehouseManagerDashboard() {
  const navigate = useNavigate();
  const now = new Date();
  const formattedDate = now.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <Breadcrumbs items={[{ label: "Main" }, { label: "Dashboard" }]} />
          <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-slate-900">
            Warehouse Manager Dashboard
          </h2>
          <p className="text-sm text-slate-500">
            Centralized monitoring of warehouse branches, staff allocations, and supplier order approvals.
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

      {/* ── Quick Actions ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => navigate("/warehouse-manager/branches")}
          className="flex items-center justify-between p-5 bg-[#0B5D1E] hover:bg-[#094d19] text-white rounded-2xl shadow-sm transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Warehouse size={24} />
            </div>
            <div className="text-left">
              <p className="font-bold text-base">Branch &amp; Employee Management</p>
              <p className="text-xs text-white/80">Manage registered facilities and employee roles</p>
            </div>
          </div>
          <ArrowRight size={20} className="group-hover:translate-x-1.5 transition-transform" />
        </button>

        <button
          onClick={() => navigate("/warehouse-manager/order-approval")}
          className="flex items-center justify-between p-5 bg-white hover:border-emerald-400 border border-slate-200 text-gray-800 rounded-2xl shadow-sm transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <ClipboardList size={24} />
            </div>
            <div className="text-left">
              <p className="font-bold text-base">Review Supplier Orders</p>
              <p className="text-xs text-gray-500">Approve incoming stock replenishment batches</p>
            </div>
          </div>
          <ArrowRight size={20} className="text-gray-400 group-hover:translate-x-1.5 group-hover:text-emerald-700 transition-all" />
        </button>
      </div>

      {/* ── Branch Overview Table ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Branch Performance Snapshot</h3>
            <p className="text-xs text-gray-500">Facility utilization and pending requests</p>
          </div>
          <button
            onClick={() => navigate("/warehouse-manager/branches")}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
          >
            View All Branches <ArrowRight size={13} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 text-left">Branch Name</th>
                <th className="px-5 py-3 text-left">Branch Lead</th>
                <th className="px-5 py-3 text-center">Staff Count</th>
                <th className="px-5 py-3 text-center">Storage Capacity</th>
                <th className="px-5 py-3 text-center">Pending Approvals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {RECENT_BRANCH_ACTIVITIES.map((b, idx) => (
                <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-gray-900">{b.branch}</td>
                  <td className="px-5 py-3.5 text-gray-600">{b.manager}</td>
                  <td className="px-5 py-3.5 text-center font-medium text-gray-700">{b.employees}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="font-bold text-emerald-700">{b.capacity}</span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {b.pendingOrders > 0 ? (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                        {b.pendingOrders} pending
                      </span>
                    ) : (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500">
                        Up to date
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
