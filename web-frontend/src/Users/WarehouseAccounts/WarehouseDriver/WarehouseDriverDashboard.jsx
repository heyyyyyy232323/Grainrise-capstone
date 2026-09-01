import { useNavigate } from "react-router-dom";
import {
  Truck,
  ClipboardList,
  CreditCard,
  MessageSquare,
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  MapPin,
  Package,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import KPICard from "../../../Components/Graphs/KPICard";

/* ─── Static demo data ──────────────────────────────────────────────────────── */
const kpiMetrics = [
  {
    title: "ACTIVE DUTIES",
    value: "1",
    trend: "Deliveries currently in progress",
    tone: "success",
    icon: <Truck size={18} strokeWidth={2.2} />,
  },
  {
    title: "ASSIGNED DUTIES",
    value: "7",
    trend: "Duties ready for loading and dispatch",
    tone: "neutral",
    icon: <ClipboardList size={18} strokeWidth={2.2} />,
  },
  {
    title: "PENDING PAYMENTS",
    value: "1",
    trend: "Payment submissions awaiting follow-up",
    tone: "warning",
    icon: <CreditCard size={18} strokeWidth={2.2} />,
  },
  {
    title: "UNREAD MESSAGES",
    value: "0",
    trend: "New retailer messages awaiting response",
    tone: "neutral",
    icon: <MessageSquare size={18} strokeWidth={2.2} />,
  },
];

const ACTIVE_DUTY = {
  batchNo: "BATCH-20260412-4D5EB009",
  retailer: "Retailer, Rita Retailer",
  commodity: "Brown Rice",
  quantity: "10 kg",
  deliverySchedule: "Apr 22, 2026",
  assignedLoad: "840.00",
  assignedLoadFull: "840.00 kg",
  remainingCapacity: "9,160.00 kg",
  deliveredLoad: "0.00 kg",
  maxLoad: "10,000.00 kg",
  percentAssigned: 8.4,
};

const DELIVERIES = [
  { batchNo: "Batch 2026-001", retailer: "Retailer A", commodity: "Dinorado", variety: "5kg", status: "Assigned", schedule: "April 26, 2026" },
  { batchNo: "Batch 2026-001", retailer: "Retailer A", commodity: "Dinorado", variety: "5kg", status: "Assigned", schedule: "April 26, 2026" },
  { batchNo: "Batch 2026-001", retailer: "Retailer A", commodity: "Dinorado", variety: "5kg", status: "Assigned", schedule: "April 26, 2026" },
  { batchNo: "Batch 2026-001", retailer: "Retailer A", commodity: "Dinorado", variety: "5kg", status: "Assigned", schedule: "April 26, 2026" },
  { batchNo: "Batch 2026-001", retailer: "Retailer A", commodity: "Dinorado", variety: "5kg", status: "Assigned", schedule: "April 26, 2026" },
];

export default function WarehouseDriverDashboard() {
  const navigate = useNavigate();
  const now = new Date();
  const formattedDate = now.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

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
            Last Updated: Today &middot; {formattedTime}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm">
          <CalendarDays size={14} className="text-slate-400" />
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* ── KPI Row ────────────────────────────────────────────────────────── */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {kpiMetrics.map((metric) => (
          <KPICard key={metric.title} {...metric} />
        ))}
      </div>

      {/* ── Middle Row: Current Active Duty + Load Utilization ─────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* ── Current Active Duty ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Card header bar */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-500">
              Current Active Duty
            </p>
          </div>

          <div className="p-5 space-y-4">
            {/* Batch + retailer */}
            <div>
              <p className="font-extrabold text-slate-900 text-[15px] tracking-tight">
                {ACTIVE_DUTY.batchNo}
              </p>
              <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500">
                <MapPin size={11} className="text-slate-400 shrink-0" />
                <span>{ACTIVE_DUTY.retailer}</span>
              </div>
            </div>

            {/* Detail grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Commodity
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {ACTIVE_DUTY.commodity}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Quantity
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {ACTIVE_DUTY.quantity}
                </p>
              </div>
              <div className="col-span-2 space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Delivery Schedule
                </p>
                <div className="flex items-center gap-1.5">
                  <CalendarDays size={12} className="text-slate-500" />
                  <p className="text-sm font-semibold text-slate-800">
                    {ACTIVE_DUTY.deliverySchedule}
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => navigate("/warehouse-driver/my-duties")}
                className="flex-1 rounded-lg bg-[#0B5D1E] hover:bg-[#094d19] text-white text-[11px] font-bold py-2.5 uppercase tracking-wide transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Truck size={13} />
                Continue Tracking
              </button>
              <button
                onClick={() => navigate("/warehouse-driver/my-duties")}
                className="flex-1 rounded-lg border border-slate-200 bg-white hover:border-slate-300 text-slate-600 text-[11px] font-bold py-2.5 uppercase tracking-wide transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                View Duty Details
              </button>
            </div>
          </div>
        </div>

        {/* ── Load Utilization ───────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-500">
              Load Utilization
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Based on active and assigned duties. Driver assignment limit:{" "}
              {ACTIVE_DUTY.maxLoad}
            </p>
          </div>

          {/* Big number */}
          <div className="flex items-end gap-2">
            <p className="text-[3rem] font-extrabold tracking-[-0.03em] leading-none text-slate-900">
              {ACTIVE_DUTY.assignedLoad}
            </p>
            <p className="text-sm text-slate-400 mb-1">{ACTIVE_DUTY.maxLoad}</p>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-400 transition-all duration-700"
                style={{ width: `${ACTIVE_DUTY.percentAssigned}%` }}
              />
            </div>
            <div className="flex justify-end">
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                {ACTIVE_DUTY.percentAssigned}% Assigned
              </span>
            </div>
          </div>

          {/* 3 stat boxes */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {/* Assigned Load */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1.5">
              <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                <Package size={10} className="text-slate-400" />
                Assigned Load
              </div>
              <p className="text-sm font-bold text-slate-800">
                {ACTIVE_DUTY.assignedLoadFull}
              </p>
            </div>

            {/* Remaining Capacity — highlighted green */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-1.5">
              <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-600">
                <Package size={10} />
                Remaining Capacity
              </div>
              <p className="text-sm font-bold text-emerald-700">
                {ACTIVE_DUTY.remainingCapacity}
              </p>
            </div>

            {/* Delivered Load */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1.5">
              <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                <CheckCircle2 size={10} className="text-slate-400" />
                Delivered Load
              </div>
              <p className="text-sm font-bold text-slate-800">
                {ACTIVE_DUTY.deliveredLoad}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Delivery Management Table ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-base">
            Delivery Management
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#f9fafb] border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Batch No.
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Retailer
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Commodity Details
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Schedule
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {DELIVERIES.map((d, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-medium text-slate-800">
                    {d.batchNo}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-600">
                    {d.retailer}
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm text-slate-800">{d.commodity}</p>
                    <p className="text-xs text-slate-400">{d.variety}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-semibold text-amber-500">
                      {d.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-600">
                    {d.schedule}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="flex items-center justify-center gap-1.5 py-3 border-t border-slate-100 bg-slate-50/40">
          <button
            onClick={() => navigate("/warehouse-driver/my-duties")}
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
