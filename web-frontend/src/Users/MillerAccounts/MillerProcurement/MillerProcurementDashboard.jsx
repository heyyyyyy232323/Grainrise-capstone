import { Truck, Package, CornerUpLeft, CreditCard, CalendarDays } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import DateDisplay from "../../../Components/Minor-Components/DateDisplay";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

// ── KPI Card (Figma-style: label / big number / caption link) ──────────────
const ProcurementKPICard = ({ label, value, caption, captionColor = "#1a7a3a", icon: Icon, iconBg = "#e8f5ee", iconColor = "#0B7A2A" }) => (
  <div className="flex-1 min-w-0 rounded-[14px] border border-slate-200 bg-white p-4 shadow-[0_6px_18px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 transition-transform duration-200">
    <div className="flex items-start justify-between gap-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: iconBg }}>
        <Icon size={16} strokeWidth={2.2} style={{ color: iconColor }} />
      </div>
    </div>
    <div className="mt-2 text-[clamp(1.5rem,2.5vw,2rem)] font-extrabold leading-none tracking-[-0.02em] text-slate-900">
      {value}
    </div>
    {caption && (
      <p className="mt-1.5 text-[11px] font-semibold" style={{ color: captionColor }}>
        {caption}
      </p>
    )}
  </div>
);

// ── Inline two-column summary card (Supplier Performance / Returns Summary) ─
const SummaryCard = ({ title, columns, onView, viewLabel = "View" }) => (
  <div className="flex-1 min-w-0 rounded-[14px] border border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
    <div className="px-4 pt-3 pb-1 border-b border-slate-100">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
    </div>
    <div className="flex divide-x divide-slate-100 px-4 py-2.5">
      {columns.map((col, i) => (
        <div key={i} className="flex-1 px-2.5 first:pl-0 last:pr-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-400">{col.label}</p>
          <p className="mt-0.5 text-[13px] font-bold text-slate-800">{col.value}</p>
        </div>
      ))}
    </div>
    <div className="border-t border-dashed border-slate-200 px-4 py-1.5 text-center">
      <button
        type="button"
        className="text-[11px] font-semibold text-[#1a7a3a] hover:underline cursor-pointer"
        onClick={onView}
      >
        {viewLabel}
      </button>
    </div>
  </div>
);

// ── Activity item row ────────────────────────────────────────────────────────
const ActivityItem = ({ title, description, time }) => (
  <div className="flex items-start justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
    <div className="min-w-0">
      <p className="text-[12px] font-bold text-slate-800 leading-tight">{title}</p>
      {description && (
        <p className="mt-0.5 text-[10px] text-slate-500 leading-snug">{description}</p>
      )}
    </div>
    {time && (
      <span className="whitespace-nowrap text-[10px] font-semibold text-emerald-700 pt-0.5">{time}</span>
    )}
  </div>
);

// ── Date group header with calendar icon ─────────────────────────────────────
const ActivityGroup = ({ date, items }) => (
  <div className="mb-1">
    <div className="flex items-center gap-2 py-1.5">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0B7A2A]">
        <CalendarDays size={13} strokeWidth={2.2} className="text-white" />
      </div>
      <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-500">{date}</span>
    </div>
    <div className="ml-8">
      {items.map((item, i) => (
        <ActivityItem key={i} {...item} />
      ))}
    </div>
  </div>
);

// ── Custom Title Wrapper for SectionedTableCard ──────────────────────────────
const SmallCardHeader = ({ title }) => (
  <span className="text-sm md:text-base font-bold text-gray-900 block px-1 py-0.5">
    {title}
  </span>
);

// ── Main Dashboard ────────────────────────────────────────────────────────────
const MillerProcurementDashboard = () => {
  const lastUpdatedTime = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  // KPI data
  const kpis = [
    { label: "Suppliers", value: "2", caption: "Registered Suppliers", icon: Truck, iconBg: "#e8f5ee", iconColor: "#0B7A2A" },
    { label: "Receiving Orders", value: "13", caption: "Incoming Orders", icon: Package, iconBg: "#e8f5ee", iconColor: "#0B7A2A" },
    { label: "Returns", value: "26", caption: "Open Return Cases", icon: CornerUpLeft, iconBg: "#fff8e1", iconColor: "#d4a017", captionColor: "#d4a017" },
    { label: "Pending Payables", value: "1", caption: "Payment Requests", icon: CreditCard, iconBg: "#fff3e0", iconColor: "#e67e22", captionColor: "#e67e22" },
  ];

  // Receiving Orders preview table
  const receivingOrdersColumns = [
    { key: "batchNo", label: "Batch No." },
    { key: "supplier", label: "Supplier" },
    { key: "eta", label: "ETA" },
    { key: "status", label: "Status" },
  ];
  const receivingOrdersRows = [
    { id: 1, batchNo: "BATCH 2026 - 001", supplier: "Supplier A", eta: "9:30 AM", status: "In Transit" },
    { id: 2, batchNo: "BATCH 2026 - 001", supplier: "Supplier A", eta: "9:30 AM", status: "In Transit" },
    { id: 3, batchNo: "BATCH 2026 - 001", supplier: "Supplier A", eta: "9:30 AM", status: "In Transit" },
    { id: 4, batchNo: "BATCH 2026 - 001", supplier: "Supplier A", eta: "9:30 AM", status: "In Transit" },
    { id: 5, batchNo: "BATCH 2026 - 001", supplier: "Supplier A", eta: "9:30 AM", status: "In Transit" },
  ];

  // Pending Payables preview table
  const pendingPayablesColumns = [
    { key: "batchNo", label: "Batch No." },
    { key: "supplier", label: "Supplier" },
    { key: "amount", label: "Amount" },
    { key: "status", label: "Status" },
  ];
  const pendingPayablesRows = [
    { id: 1, batchNo: "BATCH 2026 - 001", supplier: "Supplier A", amount: "₱500", status: "Pending" },
    { id: 2, batchNo: "BATCH 2026 - 001", supplier: "Supplier A", amount: "₱500", status: "Pending" },
    { id: 3, batchNo: "BATCH 2026 - 001", supplier: "Supplier A", amount: "₱500", status: "Pending" },
    { id: 4, batchNo: "BATCH 2026 - 001", supplier: "Supplier A", amount: "₱500", status: "Pending" },
    { id: 5, batchNo: "BATCH 2026 - 001", supplier: "Supplier A", amount: "₱500", status: "Pending" },
  ];

  // Supplier Performance summary
  const supplierPerfColumns = [
    { label: "Top Suppliers", value: "Retailer A" },
    { label: "Deliveries", value: "156 ↑12%" },
    { label: "Acceptance", value: "98.5%" },
  ];

  // Returns Summary
  const returnsSummaryColumns = [
    { label: "Pending", value: "5 Batch(es)" },
    { label: "Deliveries", value: "BATCH 2026 - 001" },
    { label: "Acceptance", value: "Damaged Pack" },
  ];

  // Recent Procurement Activity
  const activityGroups = [
    {
      date: "Today",
      items: [
        { title: "Batch received from Supplier A", description: "Quality inspection cleared for Batch 2026 - 001. 250 units logged.", time: "10:05 AM" },
        { title: "Batch received from Supplier A", description: "Quality inspection cleared for Batch 2026 - 001. 250 units logged.", time: "10:05 AM" },
      ],
    },
    {
      date: "Yesterday",
      items: [
        { title: "Batch received from Supplier A", description: "Quality inspection cleared for Batch 2026 - 001. 250 units logged.", time: "10:05 AM" },
        { title: "Batch received from Supplier A", description: "Quality inspection cleared for Batch 2026 - 001. 250 units logged.", time: "10:05 AM" },
      ],
    },
  ];

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Main", path: "/miller-procurement/dashboard" },
          { label: "Dashboard" },
        ]}
      />

      {/* Page Header - Reduced Font Sizes */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-500 mt-0.5">Last Updated: Today, {lastUpdatedTime}</p>
        </div>
        <DateDisplay />
      </div>

      {/* KPI Row */}
      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        {kpis.map((kpi) => (
          <ProcurementKPICard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Preview Tables with Compact Card Headers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        <SectionedTableCard
          title={<SmallCardHeader title="Receiving Orders Preview" />}
          columns={receivingOrdersColumns}
          sections={[{ rows: receivingOrdersRows }]}
          footerLabel="View All"
        />
        <SectionedTableCard
          title={<SmallCardHeader title="Pending Payables Preview" />}
          columns={pendingPayablesColumns}
          sections={[{ rows: pendingPayablesRows }]}
          footerLabel="View All"
        />
      </div>

      {/* Supplier Performance + Returns Summary */}
      <div className="flex flex-col lg:flex-row gap-5 mt-5">
        <SummaryCard
          title="Supplier Performance"
          columns={supplierPerfColumns}
          viewLabel="View Suppliers"
        />
        <SummaryCard
          title="Returns Summary"
          columns={returnsSummaryColumns}
          viewLabel="View Returns"
        />
      </div>

      {/* Recent Procurement Activity */}
      <div className="mt-5 w-full rounded-[14px] border border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
        <div className="border-b border-slate-200 px-4 py-2.5">
          <h3 className="text-sm md:text-base font-bold text-slate-900">Recent Procurement Activity</h3>
        </div>
        <div className="px-4 py-3">
          {activityGroups.map((group, i) => (
            <ActivityGroup key={i} date={group.date} items={group.items} />
          ))}
        </div>
      </div>
    </>
  );
};

export default MillerProcurementDashboard;

