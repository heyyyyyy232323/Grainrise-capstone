import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, X, Check, Eye, Calendar, CheckCircle2, Clock, XCircle } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const STATUS_OPTIONS = [
  { value: "all", label: "Status" },
  { value: "requested", label: "Requested" },
  { value: "approved", label: "Approved" },
  { value: "processing", label: "Processing" },
  { value: "in transit", label: "In Transit" },
  { value: "declined", label: "Declined" },
];

const statusStyleMap = {
  requested: "bg-amber-100/80 text-amber-700 border border-amber-200",
  approved: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  processing: "bg-sky-100 text-sky-700 border border-sky-200",
  "in transit": "bg-purple-100 text-purple-700 border border-purple-200",
  declined: "bg-rose-100 text-rose-700 border border-rose-200",
};

const MOCK_ORDERS = [
  { id: "ord-1", variant: "Dinorado", batch: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "requested", qty: "5,000 kg", orderDate: "Apr 20, 2026", isoDate: "2026-04-20", price: "₱245,000.00" },
  { id: "ord-2", variant: "Dinorado", batch: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "requested", qty: "5,000 kg", orderDate: "Apr 20, 2026", isoDate: "2026-04-20", price: "₱245,000.00" },
  { id: "ord-3", variant: "Dinorado", batch: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "approved", qty: "6,500 kg", orderDate: "Apr 19, 2026", isoDate: "2026-04-19", price: "₱318,500.00" },
  { id: "ord-4", variant: "Dinorado", batch: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "approved", qty: "6,500 kg", orderDate: "Apr 19, 2026", isoDate: "2026-04-19", price: "₱318,500.00" },
  { id: "ord-5", variant: "Dinorado", batch: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "processing", qty: "8,000 kg", orderDate: "Apr 18, 2026", isoDate: "2026-04-18", price: "₱392,000.00" },
  { id: "ord-6", variant: "Dinorado", batch: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "processing", qty: "8,000 kg", orderDate: "Apr 18, 2026", isoDate: "2026-04-18", price: "₱392,000.00" },
  { id: "ord-7", variant: "Dinorado", batch: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "in transit", qty: "10,000 kg", orderDate: "Apr 17, 2026", isoDate: "2026-04-17", price: "₱490,000.00" },
  { id: "ord-8", variant: "Dinorado", batch: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "in transit", qty: "10,000 kg", orderDate: "Apr 17, 2026", isoDate: "2026-04-17", price: "₱490,000.00" },
  { id: "ord-9", variant: "Dinorado", batch: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "declined", qty: "4,000 kg", orderDate: "Apr 16, 2026", isoDate: "2026-04-16", price: "₱196,000.00" },
  { id: "ord-10", variant: "Dinorado", batch: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "declined", qty: "4,000 kg", orderDate: "Apr 16, 2026", isoDate: "2026-04-16", price: "₱196,000.00" },
  ...Array.from({ length: 16 }, (_, i) => ({
    id: `ord-${i + 11}`,
    variant: "Dinorado",
    batch: `Batch 2026 - 00${(i % 5) + 1}`,
    supplier: "ABC Rice Trading",
    status: ["requested", "approved", "processing", "in transit", "declined"][i % 5],
    qty: "5,000 kg",
    orderDate: "Apr 15, 2026",
    isoDate: "2026-04-15",
    price: "₱245,000.00",
  })),
];

export default function MillerOrderApproval() {
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [tempDateRange, setTempDateRange] = useState({ startDate: "", endDate: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateRef = useRef(null);

  // Popover dismissal handling for Date Picker
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

  const columns = [
    { key: "variant", label: "Variant", width: "22%" },
    { key: "batch", label: "Batch No.", width: "22%" },
    { key: "supplier", label: "Supplier", width: "24%" },
    {
      key: "status",
      label: "Status",
      width: "18%",
      headerClassName: "text-center",
      cellClassName: "text-center",
      render: (row) => (
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize ${
            statusStyleMap[row.status] || "bg-gray-100 text-gray-700"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: "action",
      label: "Action",
      width: "14%",
      headerClassName: "text-center",
      cellClassName: "text-center",
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedOrder(row)}
          className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 transition inline-flex items-center gap-1 text-xs cursor-pointer font-medium"
          title="View Details"
        >
          <Eye size={15} />
          <span>View</span>
        </button>
      ),
    },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const matchesSearch =
        q === "" ||
        o.variant.toLowerCase().includes(q) ||
        o.batch.toLowerCase().includes(q) ||
        o.supplier.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      const matchesStart = !dateRange.startDate || o.isoDate >= dateRange.startDate;
      const matchesEnd = !dateRange.endDate || o.isoDate <= dateRange.endDate;

      return matchesSearch && matchesStatus && matchesStart && matchesEnd;
    });
  }, [orders, search, statusFilter, dateRange]);

  const itemsPerPage = 10;
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);
  const tableSections = useMemo(() => [{ rows: paginated }], [paginated]);

  const handleUpdateStatus = (id, newStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o)));
    if (selectedOrder && selectedOrder.id === id) {
      setSelectedOrder((prev) => ({ ...prev, status: newStatus }));
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Status Select Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="appearance-none border border-gray-200 bg-white pl-3 pr-8 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto transition-colors cursor-pointer h-[38px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
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
          <span>{totalCount} orders</span>
        </div>
      </div>

      {/* ── Toast Alert ────────────────────────────────────────────────────── */}
      {toastMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={16} /> {toastMsg}
        </div>
      )}

      {/* ── SectionedTableCard ──────────────────────────────────────────────── */}
      <SectionedTableCard
        columns={columns}
        sections={tableSections}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        footerLabel={`Showing 1-${paginated.length} of ${totalCount} orders`}
      />

      {/* ── View Details Modal ──────────────────────────────────────────────── */}
      {selectedOrder &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs px-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{selectedOrder.batch}</h3>
                  <p className="text-xs text-gray-500">Order Approval Details</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2.5 bg-gray-50 p-4 rounded-xl text-xs text-slate-700">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Grain Variety:</span>
                  <span className="font-bold text-slate-900">{selectedOrder.variant}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Supplier Name:</span>
                  <span className="font-semibold text-slate-900">{selectedOrder.supplier}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Order Quantity:</span>
                  <span className="font-bold text-slate-900">{selectedOrder.qty}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Total Price:</span>
                  <span className="font-extrabold text-emerald-700 text-sm">{selectedOrder.price}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Order Date:</span>
                  <span className="font-medium text-slate-800">{selectedOrder.orderDate}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Current Status:</span>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full font-bold capitalize text-[11px] ${
                      statusStyleMap[selectedOrder.status] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-gray-600">Update Order Status:</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedOrder.id, "approved")}
                    className="py-2 px-2 bg-[#0B5D1E] hover:bg-[#094d19] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Check size={14} /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedOrder.id, "processing")}
                    className="py-2 px-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Clock size={14} /> Process
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedOrder.id, "declined")}
                    className="py-2 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
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