import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, ClipboardList, CheckCircle2, XCircle, Clock, X, Check, Eye, ChevronDown, Calendar } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

export const MOCK_ORDERS = [
  { id: "ORD-001", variant: "Dinorado", batchNo: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "Requested", qty: "10,000 kg", totalAmount: "₱450,000", date: "Aug 29, 2026", isoDate: "2026-08-29", grade: "Premium", bay: "Bay A-3" },
  { id: "ORD-002", variant: "Dinorado", batchNo: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "Requested", qty: "12,500 kg", totalAmount: "₱562,500", date: "Aug 29, 2026", isoDate: "2026-08-29", grade: "Premium", bay: "Bay A-4" },
  { id: "ORD-003", variant: "Dinorado", batchNo: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "Approved", qty: "8,000 kg", totalAmount: "₱360,000", date: "Aug 28, 2026", isoDate: "2026-08-28", grade: "Premium", bay: "Bay B-1" },
  { id: "ORD-004", variant: "Dinorado", batchNo: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "Approved", qty: "15,000 kg", totalAmount: "₱675,000", date: "Aug 28, 2026", isoDate: "2026-08-28", grade: "Premium", bay: "Bay B-2" },
  { id: "ORD-005", variant: "Dinorado", batchNo: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "Processing", qty: "6,500 kg", totalAmount: "₱292,500", date: "Aug 27, 2026", isoDate: "2026-08-27", grade: "Special", bay: "Bay C-1" },
  { id: "ORD-006", variant: "Dinorado", batchNo: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "Processing", qty: "9,000 kg", totalAmount: "₱405,000", date: "Aug 27, 2026", isoDate: "2026-08-27", grade: "Special", bay: "Bay C-2" },
  { id: "ORD-007", variant: "Dinorado", batchNo: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "In Transit", qty: "20,000 kg", totalAmount: "₱900,000", date: "Aug 26, 2026", isoDate: "2026-08-26", grade: "Standard", bay: "Bay D-1" },
  { id: "ORD-008", variant: "Dinorado", batchNo: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "In Transit", qty: "14,000 kg", totalAmount: "₱630,000", date: "Aug 26, 2026", isoDate: "2026-08-26", grade: "Standard", bay: "Bay D-2" },
  { id: "ORD-009", variant: "Dinorado", batchNo: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "Declined", qty: "5,000 kg", totalAmount: "₱225,000", date: "Aug 25, 2026", isoDate: "2026-08-25", grade: "Undergrade", bay: "—" },
  { id: "ORD-010", variant: "Dinorado", batchNo: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "Declined", qty: "7,500 kg", totalAmount: "₱337,500", date: "Aug 25, 2026", isoDate: "2026-08-25", grade: "Undergrade", bay: "—" },
  { id: "ORD-011", variant: "Sinandomeng", batchNo: "Batch 2026 - 002", supplier: "Isabela Grain Traders", status: "Requested", qty: "18,000 kg", totalAmount: "₱756,000", date: "Aug 29, 2026", isoDate: "2026-08-29", grade: "Special", bay: "Bay A-1" },
  { id: "ORD-012", variant: "Jasmine Rice", batchNo: "Batch 2026 - 003", supplier: "Nueva Ecija Millers", status: "Approved", qty: "11,000 kg", totalAmount: "₱572,000", date: "Aug 28, 2026", isoDate: "2026-08-28", grade: "Premium", bay: "Bay B-3" },
];

const STATUS_PILL_STYLES = {
  Requested: "bg-amber-100 text-amber-700 border border-amber-200",
  Approved: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  Processing: "bg-sky-100 text-sky-700 border border-sky-200",
  "In Transit": "bg-purple-100 text-purple-700 border border-purple-200",
  Declined: "bg-rose-100 text-rose-700 border border-rose-200",
};

/* ── Table Column Configurations ───────────────────────────────────────────────── */
const TABLE_COLUMNS = [
  { key: "variant", label: "Variant", width: "20%" },
  { key: "batchNo", label: "Batch No.", width: "20%" },
  { key: "supplier", label: "Supplier", width: "25%" },
  { key: "status", label: "Status", width: "20%", headerClassName: "text-center", cellClassName: "text-center" },
  { key: "action", label: "Action", width: "15%", headerClassName: "text-center", cellClassName: "text-center" },
];

export default function OrderApproval() {
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("Status");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [tempDateRange, setTempDateRange] = useState({ startDate: "", endDate: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateRef = useRef(null);

  // Popover dismissal handling
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dateRef.current && !dateRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDateApply = () => {
    setDateRange(tempDateRange);
    setCurrentPage(1);
    setShowDatePicker(false);
  };

  const handleDateReset = () => {
    setTempDateRange({ startDate: "", endDate: "" });
    setDateRange({ startDate: "", endDate: "" });
    setCurrentPage(1);
    setShowDatePicker(false);
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // Format and filter sectioned data for SectionedTableCard
  const filteredSections = useMemo(() => {
    const list = orders.filter((o) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchV = o.variant.toLowerCase().includes(q);
        const matchB = o.batchNo.toLowerCase().includes(q);
        const matchS = o.supplier.toLowerCase().includes(q);
        if (!matchV && !matchB && !matchS) return false;
      }
      if (selectedStatus !== "Status" && selectedStatus !== "All Statuses") {
        if (o.status !== selectedStatus) return false;
      }

      // Date Range Filter
      if (dateRange.startDate && o.isoDate < dateRange.startDate) return false;
      if (dateRange.endDate && o.isoDate > dateRange.endDate) return false;

      return true;
    });

    const formattedRows = list.map((row) => ({
      ...row,
      variant: row.variant,
      batchNo: row.batchNo,
      supplier: row.supplier,
      status: row.status,
      action: (
        <button
          type="button"
          onClick={() => setSelectedOrder(row)}
          className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 transition inline-flex items-center gap-1 text-xs cursor-pointer"
          title="View Details"
        >
          <Eye size={15} />
          <span>View</span>
        </button>
      ),
    }));

    return [{ rows: formattedRows }];
  }, [orders, search, selectedStatus, dateRange]);

  const rawCount = filteredSections[0]?.rows.length || 0;
  const TOTAL_PAGES = Math.max(1, Math.ceil(rawCount / 10));

  const handleUpdateStatus = (id, newStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
    );
    if (selectedOrder && selectedOrder.id === id) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
    showToast(`Order #${id} marked as "${newStatus}".`);
  };

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Header ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Management" }, { label: "Order Approval" }]} />
        <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-bold tracking-[-0.03em] text-slate-900">
          Order Approval
        </h2>
        <p className="text-sm text-slate-500">
          Review and approve supplier orders.
        </p>
      </div>

      {/* ── Filter Controls (Search + Status + Date Range) ────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-2 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Bar */}
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Search variant, batch number, supplier"
              className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-white placeholder-gray-400 text-gray-700 h-[38px]"
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(""); setCurrentPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Status Select Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              className="appearance-none border border-gray-200 bg-white pl-3 pr-8 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto transition-colors cursor-pointer h-[38px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="Status">Status</option>
              <option value="All Statuses">All Statuses</option>
              <option value="Requested">Requested</option>
              <option value="Approved">Approved</option>
              <option value="Processing">Processing</option>
              <option value="In Transit">In Transit</option>
              <option value="Declined">Declined</option>
            </select>
            <ChevronDown
              size={16}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
          </div>

          {/* Date Range Picker Dropdown */}
          <div className="relative w-full sm:w-auto" ref={dateRef}>
            <button
              type="button"
              onClick={() => setShowDatePicker((prev) => !prev)}
              className={`flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors cursor-pointer h-[38px] ${
                dateRange.startDate ? "border-emerald-500 text-emerald-700 bg-emerald-50/40" : ""
              }`}
            >
              <span>
                {dateRange.startDate
                  ? `${dateRange.startDate} - ${dateRange.endDate || "..."}`
                  : "Date Range"}
              </span>
              <Calendar size={16} className={dateRange.startDate ? "text-emerald-600" : "text-gray-500"} />
            </button>

            {showDatePicker && (
              <div className="absolute top-full mt-2 left-0 sm:left-auto sm:right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-20 w-64">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={tempDateRange.startDate}
                      onChange={(e) =>
                        setTempDateRange((prev) => ({ ...prev, startDate: e.target.value }))
                      }
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={tempDateRange.endDate}
                      onChange={(e) =>
                        setTempDateRange((prev) => ({ ...prev, endDate: e.target.value }))
                      }
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleDateReset}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={handleDateApply}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-[#0B5D1E] hover:bg-[#084b18] rounded transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Total Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-full text-xs font-semibold text-gray-700 self-start sm:self-center h-[38px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          <span>{rawCount} orders</span>
        </div>
      </div>

      {/* ── Toast Alert ────────────────────────────────────────────────────── */}
      {toastMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={16} /> {toastMsg}
        </div>
      )}

      {/* ── Shared SectionedTableCard Component ─────────────────────────────── */}
      <SectionedTableCard
        columns={TABLE_COLUMNS}
        sections={filteredSections}
        currentPage={currentPage}
        totalPages={TOTAL_PAGES}
        onPageChange={setCurrentPage}
        footerLabel={`Showing order records — Page ${currentPage} of ${TOTAL_PAGES}`}
      />

      {/* ── Order Review & Approval Modal (Portaled to document.body) ────────── */}
      {selectedOrder &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <ClipboardList size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Order Review &amp; Approval</h3>
                    <p className="text-xs text-gray-500">Order ID: {selectedOrder.id}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2.5 bg-gray-50 p-4 rounded-xl text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Rice Variant:</span>
                  <span className="font-bold text-gray-900">{selectedOrder.variant} ({selectedOrder.grade})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Batch Number:</span>
                  <span className="font-mono text-gray-800">{selectedOrder.batchNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Supplier Name:</span>
                  <span className="font-semibold text-gray-900">{selectedOrder.supplier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Order Quantity:</span>
                  <span className="font-bold text-gray-900">{selectedOrder.qty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Purchase Value:</span>
                  <span className="font-extrabold text-emerald-700 text-sm">{selectedOrder.totalAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Assigned Storage Bay:</span>
                  <span className="font-semibold text-gray-800">{selectedOrder.bay}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Current Status:</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold ${STATUS_PILL_STYLES[selectedOrder.status]}`}>
                    {selectedOrder.status}
                  </span>
                </div>
              </div>

              {/* Status action buttons */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-gray-600">Update Order Status:</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedOrder.id, "Approved")}
                    className="py-2 px-3 bg-[#0B5D1E] hover:bg-[#094d19] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Check size={14} /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedOrder.id, "Processing")}
                    className="py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Clock size={14} /> Processing
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedOrder.id, "Declined")}
                    className="py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <XCircle size={14} /> Decline
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-full py-2.5 border border-gray-200 text-gray-600 font-semibold text-xs rounded-xl hover:bg-gray-50 transition cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}