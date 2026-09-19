import { useState } from "react";
import { Search, ChevronDown, FileText, CreditCard } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const MillerPaymentHistory = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 5;

  // Mock Data
  const columns = [
    { key: "batchNo", label: "Batch No." },
    { key: "supplier", label: "Supplier" },
    { key: "total", label: "Total Amount" },
    { key: "status", label: "Status" },
    { key: "date", label: "Requested Date" },
    {
      key: "action",
      label: "Action",
      cellClassName: "text-center",
      render: (row) => (
        <div className="flex items-center justify-center">
          <button
            type="button"
            className="rounded-lg border border-gray-300 px-4 py-1.5 text-[11px] font-bold text-gray-600 transition hover:bg-gray-50 cursor-pointer"
          >
            View Details
          </button>
        </div>
      ),
    },
  ];

  const rawRows = [
    { batchNo: "Batch 2026 - 001", supplier: "Supplier A", total: "₱420,000.00", status: "Paid", date: "Mar 29, 2026 • 12:40 AM" },
    { batchNo: "Batch 2026 - 001", supplier: "Supplier A", total: "₱420,000.00", status: "Requested", date: "Mar 29, 2026 • 12:40 AM" },
    { batchNo: "Batch 2026 - 001", supplier: "Supplier A", total: "₱420,000.00", status: "Paid", date: "Mar 29, 2026 • 12:40 AM" },
    { batchNo: "Batch 2026 - 001", supplier: "Supplier A", total: "₱420,000.00", status: "Requested", date: "Mar 29, 2026 • 12:40 AM" },
    { batchNo: "Batch 2026 - 001", supplier: "Supplier A", total: "₱420,000.00", status: "Paid", date: "Mar 29, 2026 • 12:40 AM" },
    { batchNo: "Batch 2026 - 001", supplier: "Supplier A", total: "₱420,000.00", status: "Requested", date: "Mar 29, 2026 • 12:40 AM" },
    { batchNo: "Batch 2026 - 001", supplier: "Supplier A", total: "₱420,000.00", status: "Paid", date: "Mar 29, 2026 • 12:40 AM" },
    { batchNo: "Batch 2026 - 001", supplier: "Supplier A", total: "₱420,000.00", status: "Requested", date: "Mar 29, 2026 • 12:40 AM" },
  ];

  const rows = rawRows.map((r, i) => ({ id: i, ...r }));

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Payment", path: "/miller-procurement/payment-history" },
          { label: "Payment History" },
        ]}
      />

      <div className="mt-4 mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Payment History</h1>
          <p className="text-sm text-gray-500 mt-1">
            View all supplier payment requests and completed payment transactions.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-[#1a7a3a] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#125c2a] cursor-pointer">
          <FileText size={16} />
          Generate Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Card 1 */}
        <div className="flex-1 rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_6px_18px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 transition-transform duration-200">
          <div className="flex justify-between items-start">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">REQUESTED TO PAY</p>
            <CreditCard size={18} className="text-amber-500" />
          </div>
          <div className="mt-3 text-[clamp(1.9rem,3vw,2.4rem)] font-extrabold leading-none tracking-[-0.02em] text-slate-900">
            ₱245,800.00
          </div>
          <p className="mt-2 text-[12px] font-semibold text-amber-500">Pending payment requests</p>
        </div>
        {/* Card 2 */}
        <div className="flex-1 rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_6px_18px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 transition-transform duration-200">
          <div className="flex justify-between items-start">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Total Paid</p>
            <CreditCard size={18} className="text-[#1a7a3a]" />
          </div>
          <div className="mt-3 text-[clamp(1.9rem,3vw,2.4rem)] font-extrabold leading-none tracking-[-0.02em] text-slate-900">
            ₱1,101,000.00
          </div>
          <p className="mt-2 text-[12px] font-semibold text-[#1a7a3a]">Completed supplier payments</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="w-full max-w-sm">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search batch no., supplier, or product"
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
            />
          </div>
        </div>
        
        <button className="flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
          Status
          <ChevronDown size={16} className="text-gray-500" />
        </button>
        <button className="flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
          Sort By
          <ChevronDown size={16} className="text-gray-500" />
        </button>
      </div>

      <SectionedTableCard
        columns={columns}
        sections={[{ rows }]}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page) => setCurrentPage(page)}
      />
    </>
  );
};

export default MillerPaymentHistory;

