import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, X, CheckCircle2, Clock, AlertCircle } from "lucide-react";
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
  requested: "bg-amber-100/80 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  processing: "bg-blue-100 text-blue-700",
  "in transit": "bg-purple-100 text-purple-700",
  declined: "bg-rose-100 text-rose-700",
};

const MOCK_ORDERS = [
  { id: "ord-1", variant: "Dinorado", batch: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "requested", qty: "5,000 kg", orderDate: "Apr 20, 2026", price: "₱245,000.00" },
  { id: "ord-2", variant: "Dinorado", batch: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "requested", qty: "5,000 kg", orderDate: "Apr 20, 2026", price: "₱245,000.00" },
  { id: "ord-3", variant: "Dinorado", batch: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "approved", qty: "6,500 kg", orderDate: "Apr 19, 2026", price: "₱318,500.00" },
  { id: "ord-4", variant: "Dinorado", batch: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "approved", qty: "6,500 kg", orderDate: "Apr 19, 2026", price: "₱318,500.00" },
  { id: "ord-5", variant: "Dinorado", batch: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "processing", qty: "8,000 kg", orderDate: "Apr 18, 2026", price: "₱392,000.00" },
  { id: "ord-6", variant: "Dinorado", batch: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "processing", qty: "8,000 kg", orderDate: "Apr 18, 2026", price: "₱392,000.00" },
  { id: "ord-7", variant: "Dinorado", batch: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "in transit", qty: "10,000 kg", orderDate: "Apr 17, 2026", price: "₱490,000.00" },
  { id: "ord-8", variant: "Dinorado", batch: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "in transit", qty: "10,000 kg", orderDate: "Apr 17, 2026", price: "₱490,000.00" },
  { id: "ord-9", variant: "Dinorado", batch: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "declined", qty: "4,000 kg", orderDate: "Apr 16, 2026", price: "₱196,000.00" },
  { id: "ord-10", variant: "Dinorado", batch: "Batch 2026 - 001", supplier: "ABC Rice Trading", status: "declined", qty: "4,000 kg", orderDate: "Apr 16, 2026", price: "₱196,000.00" },
  ...Array.from({ length: 16 }, (_, i) => ({
    id: `ord-${i + 11}`,
    variant: "Dinorado",
    batch: `Batch 2026 - 00${(i % 5) + 1}`,
    supplier: "ABC Rice Trading",
    status: ["requested", "approved", "processing", "in transit", "declined"][i % 5],
    qty: "5,000 kg",
    orderDate: "Apr 15, 2026",
    price: "₱245,000.00",
  })),
];

export default function MillerOrderApproval() {
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const columns = [
    { key: "variant", label: "Variant", width: "22%" },
    { key: "batch", label: "Batch No.", width: "22%" },
    { key: "supplier", label: "Supplier", width: "24%" },
    {
      key: "status",
      label: "Status",
      width: "18%",
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
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-[#0B5D1E] hover:bg-emerald-50/30 hover:text-[#0B5D1E] cursor-pointer"
        >
          View Details
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
      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const itemsPerPage = 10;
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);
  const tableSections = useMemo(() => [{ rows: paginated }], [paginated]);

  const handleUpdateStatus = (id, newStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o)));
    setSelectedOrder(null);
  };

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Header ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Management" }, { label: "Order Approval" }]} />
        <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold tracking-tight text-slate-900">
          Order Approval
        </h2>
        <p className="text-sm text-slate-500">
          Review and approve supplier orders.
        </p>
      </div>

      {/* ── Filter Controls ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Search variant, batch number, supplier"
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-[#0B5D1E] outline-none bg-white placeholder-gray-400 text-gray-700"
            />
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="appearance-none pl-4 pr-8 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-white text-gray-700 focus:ring-1 focus:ring-[#0B5D1E] outline-none cursor-pointer"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-600 text-xs font-bold self-start sm:self-auto">
          <span>+ {orders.length} orders</span>
        </div>
      </div>

      {/* ── SectionedTableCard ──────────────────────────────────────────────── */}
      <SectionedTableCard
        columns={columns}
        sections={tableSections}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        footerLabel={`Showing 1-10 of ${totalCount} orders`}
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

              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Grain Variety</span>
                  <span className="font-bold">{selectedOrder.variant}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Supplier Name</span>
                  <span className="font-bold">{selectedOrder.supplier}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Order Quantity</span>
                  <span className="font-bold">{selectedOrder.qty}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Total Price</span>
                  <span className="font-bold text-emerald-700">{selectedOrder.price}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Current Status</span>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full font-semibold capitalize text-[11px] ${
                      statusStyleMap[selectedOrder.status] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                {selectedOrder.status === "requested" && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedOrder.id, "declined")}
                      className="flex-1 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      Decline Order
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedOrder.id, "approved")}
                      className="flex-1 py-2 bg-[#0B5D1E] hover:bg-[#094d19] text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      Approve Order
                    </button>
                  </>
                )}
                {selectedOrder.status !== "requested" && (
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="w-full py-2 bg-[#0B5D1E] hover:bg-[#094d19] text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
