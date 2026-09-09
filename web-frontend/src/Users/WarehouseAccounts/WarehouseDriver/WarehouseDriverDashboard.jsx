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
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            {/* Card header bar */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-emerald-100 bg-[#EBF7EE]">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-emerald-800">
                CURRENT ACTIVE DUTY
              </p>
            </div>

            <div className="p-5 space-y-4">
              {/* Batch + retailer */}
              <div>
                <p className="font-extrabold text-slate-900 text-[16px] tracking-tight">
                  {ACTIVE_DUTY.batchNo}
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                  <MapPin size={13} className="text-slate-400 shrink-0" />
                  <span>Retailer: <strong className="text-slate-700 font-semibold">{ACTIVE_DUTY.retailer}</strong></span>
                </div>
              </div>

              {/* Detail box */}
              <div className="rounded-xl bg-[#F5F7FA] p-4">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      COMMODITY
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {ACTIVE_DUTY.commodity}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      QUANTITY
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {ACTIVE_DUTY.quantity}
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
                      {ACTIVE_DUTY.deliverySchedule}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="p-5 pt-0 flex gap-2.5">
            <button
              onClick={() => navigate("/warehouse-driver/my-duties")}
              className="flex-1 rounded-lg bg-[#0B5D1E] hover:bg-[#094d19] text-white text-xs font-bold py-2.5 uppercase tracking-wide transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              CONTINUE TRACKING
            </button>
            <button
              onClick={() => navigate("/warehouse-driver/my-duties")}
              className="flex-1 rounded-lg border border-slate-300 bg-white hover:border-slate-400 text-slate-700 text-xs font-bold py-2.5 uppercase tracking-wide transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              VIEW DUTY DETAILS
            </button>
          </div>
        </div>

        {/* ── Load Utilization ───────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-600">
              LOAD UTILIZATION
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Based on active and assigned duties, Driver assignment limit: {ACTIVE_DUTY.maxLoad}
            </p>
          </div>

          {/* Big number */}
          <div className="flex items-end gap-2">
            <p className="text-[2.75rem] font-extrabold tracking-[-0.03em] leading-none text-slate-900">
              {ACTIVE_DUTY.assignedLoad}
            </p>
            <p className="text-sm font-medium text-slate-400 mb-1">/ {ACTIVE_DUTY.maxLoad}</p>
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
                {ACTIVE_DUTY.percentAssigned}% ASSIGNED
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
              <p className="text-sm font-bold text-slate-800">
                {ACTIVE_DUTY.assignedLoadFull}
              </p>
            </div>

            {/* Remaining Capacity — highlighted green */}
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-3 space-y-1">
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                <Truck size={11} className="text-emerald-700" />
                REMAINING CAPACITY
              </div>
              <p className="text-sm font-bold text-emerald-700">
                {ACTIVE_DUTY.remainingCapacity}
              </p>
            </div>

            {/* Delivered Load */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <CheckCircle2 size={11} className="text-slate-400" />
                DELIVERED LOAD
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
            <thead className="bg-[#EBF7EE] border-b border-emerald-100">
              <tr>
                <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                  Batch No.
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                  Retailer
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
              {DELIVERIES.map((d, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5 text-xs font-semibold text-slate-800">
                    {d.batchNo}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">
                    {d.retailer}
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-xs font-medium text-slate-800">{d.commodity}</p>
                    <p className="text-[11px] text-slate-400">{d.variety}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-semibold text-amber-500">
                      {d.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">
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
