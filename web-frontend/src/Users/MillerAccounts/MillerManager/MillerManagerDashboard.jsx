import { useNavigate } from "react-router-dom";
import {
  Warehouse,
  Users,
  ClipboardList,
  Package,
  ArrowRight,
  Building2,
  CalendarDays,
  FileText,
  Receipt,
  TrendingUp,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import KPICard from "../../../Components/Graphs/KPICard";

const kpiMetrics = [
  {
    title: "ACTIVE BRANCHES",
    value: "12",
    trend: "Milling & Distribution Facilities",
    tone: "success",
    icon: <Building2 size={18} strokeWidth={2.2} />,
  },
  {
    title: "ACTIVE CONTRACTS",
    value: "48",
    trend: "Farmer & Supplier agreements",
    tone: "neutral",
    icon: <FileText size={18} strokeWidth={2.2} />,
  },
  {
    title: "PENDING ORDER APPROVALS",
    value: "8 Orders",
    trend: "Requires manager approval",
    tone: "warning",
    icon: <ClipboardList size={18} strokeWidth={2.2} />,
  },
  {
    title: "TOTAL MILL CAPACITY",
    value: "87.5%",
    trend: "450,000 kg palay processed",
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

export default function MillerManagerDashboard() {
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
          <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold tracking-tight text-slate-900">
            Miller Manager Dashboard
          </h2>
          <p className="text-sm text-slate-500">
            Centralized monitoring of milling facilities, branch management, contracts, and order operations.
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => navigate("/miller-manager/branches")}
          className="flex items-center justify-between p-5 bg-[#0B5D1E] hover:bg-[#094d19] text-white rounded-2xl shadow-sm transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Warehouse size={24} />
            </div>
            <div className="text-left">
              <p className="font-bold text-base">Branch Management</p>
              <p className="text-xs text-white/80">Manage registered branches &amp; facilities</p>
            </div>
          </div>
          <ArrowRight size={20} className="group-hover:translate-x-1.5 transition-transform" />
        </button>

        <button
          onClick={() => navigate("/miller-manager/contracts")}
          className="flex items-center justify-between p-5 bg-white hover:border-emerald-400 border border-slate-200 text-gray-800 rounded-2xl shadow-sm transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <FileText size={24} />
            </div>
            <div className="text-left">
              <p className="font-bold text-base">Farmer Contracts</p>
              <p className="text-xs text-gray-500">Review binding supply contracts</p>
            </div>
          </div>
          <ArrowRight size={20} className="text-gray-400 group-hover:translate-x-1.5 group-hover:text-blue-700 transition-all" />
        </button>

        <button
          onClick={() => navigate("/miller-manager/order-approval")}
          className="flex items-center justify-between p-5 bg-white hover:border-emerald-400 border border-slate-200 text-gray-800 rounded-2xl shadow-sm transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <ClipboardList size={24} />
            </div>
            <div className="text-left">
              <p className="font-bold text-base">Order Approvals</p>
              <p className="text-xs text-gray-500">Approve incoming milling batches</p>
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
            onClick={() => navigate("/miller-manager/branches")}
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
