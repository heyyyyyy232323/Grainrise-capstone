import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ChevronDown,
  FileText,
  CreditCard,
  X,
  Receipt,
  AlertCircle,
  Loader2,
  Package,
  Image as ImageIcon,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import useApi from "../../../Components/hooks/useApi";
import ToastNotification from "../../../Components/Modals/Toast";
import GoodsReceiptReceiptModal from "../../../Components/Modals/MillerProcurement/GoodsReceiptReceiptModal";

const SORT_OPTIONS = [
  { value: "request_date_newest", label: "Request Date: Newest → Oldest" },
  { value: "request_date_oldest", label: "Request Date: Oldest → Newest" },
  { value: "batch_asc", label: "Batch: A → Z" },
  { value: "batch_desc", label: "Batch: Z → A" },
  { value: "amount_high", label: "Amount: High → Low" },
  { value: "amount_low", label: "Amount: Low → High" },
  { value: "paid_date_newest", label: "Paid Date: Newest → Oldest" },
  { value: "paid_date_oldest", label: "Paid Date: Oldest → Newest" },
];

const ITEMS_PER_PAGE = 10;

function ModalDetailRow({ label, value, isAmount = false, isBadge = false, badgeStyle = "" }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-xs sm:text-sm">
      <span className="text-slate-500 font-medium shrink-0">{label}:</span>
      {isBadge ? (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeStyle}`}>
          {value || "—"}
        </span>
      ) : (
        <span
          className={`text-right break-words max-w-[60%] ${
            isAmount
              ? "font-extrabold text-[#0B5D1E] text-sm sm:text-base"
              : "font-normal text-slate-800"
          }`}
        >
          {value || "—"}
        </span>
      )}
    </div>
  );
}

const MillerPaymentHistory = () => {
  const navigate = useNavigate();
  const { request } = useApi();

  const [records, setRecords] = useState([]);
  const [kpi, setKpi] = useState({
    requested_total: 0,
    requested_total_formatted: "₱ 0.00",
    requested_count: 0,
    paid_total: 0,
    paid_total_formatted: "₱ 0.00",
    paid_count: 0,
  });
  const [suppliersList, setSuppliersList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'requested' | 'paid'
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [sortBy, setSortBy] = useState("request_date_newest");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [imageError, setImageError] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isDetailsModalOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isDetailsModalOpen]);

  // Product photo resolved URL
  const resolvedPhotoUrl = useMemo(() => {
    if (!selectedDetail?.product_photo) return null;
    const path = String(selectedDetail.product_photo).trim();
    if (
      path.startsWith("http://") ||
      path.startsWith("https://") ||
      path.startsWith("//") ||
      path.startsWith("data:")
    ) {
      return path;
    }
    const clean = path.replace(/^\/?(media\/)?/, "");
    const backendBase = (
      import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
    ).replace(/\/$/, "");
    return `${backendBase}/media/${clean}`;
  }, [selectedDetail?.product_photo]);

  // Receipt Modal State (Unstacked)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  // Fetch Payment History List
  const fetchPaymentHistory = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search.trim()) queryParams.append("search", search.trim());
      if (statusFilter !== "all") queryParams.append("status", statusFilter);
      if (supplierFilter !== "all") queryParams.append("supplier", supplierFilter);
      if (sortBy) queryParams.append("sort_by", sortBy);

      const qs = queryParams.toString();
      const url = `/miller-employees/procurement/payment-history/${qs ? `?${qs}` : ""}`;

      const res = await request(url, {
        method: "GET",
        throwOnError: true,
      });

      const data = res?.data ?? res;
      setRecords(Array.isArray(data) ? data : []);

      if (res?.kpi) {
        setKpi(res.kpi);
      }
      if (Array.isArray(res?.suppliers)) {
        setSuppliersList(res.suppliers);
      }
    } catch (err) {
      console.error("Failed to load payment history:", err);
      setToast({
        type: "error",
        message: err?.message || "Failed to load payment history.",
      });
    } finally {
      setLoading(false);
    }
  }, [request, search, statusFilter, supplierFilter, sortBy]);

  useEffect(() => {
    fetchPaymentHistory();
  }, [fetchPaymentHistory]);

  // Open Details Modal
  const handleOpenDetails = useCallback(
    async (row) => {
      setSelectedDetail(row);
      setImageError(false);
      setIsDetailsModalOpen(true);
      setDetailLoading(true);
      setDetailError(null);

      try {
        const receivingId = row.receiving_id || row.id;
        const res = await request(
          `/miller-employees/procurement/payment-history/${receivingId}/`,
          {
            method: "GET",
            throwOnError: true,
          }
        );
        const detail = res?.data || res;
        if (detail && typeof detail === "object") {
          setSelectedDetail(detail);
        }
      } catch (err) {
        console.warn("Failed to load detailed payment record:", err);
        setDetailError("Could not refresh record details from server.");
      } finally {
        setDetailLoading(false);
      }
    },
    [request]
  );

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedDetail(null);
    setDetailError(null);
  };

  // Get Receipt: Temporarily close View Details and open Receipt modal (No stacking)
  const handleGetReceipt = () => {
    setIsDetailsModalOpen(false);
    setIsReceiptModalOpen(true);
  };

  // Close Receipt: Return back to View Details modal (No stacking)
  const handleCloseReceiptModal = () => {
    setIsReceiptModalOpen(false);
    setIsDetailsModalOpen(true);
  };

  // KPI card click filter handler
  const handleKpiCardClick = (targetStatus) => {
    setCurrentPage(1);
    setStatusFilter((prev) => (prev === targetStatus ? "all" : targetStatus));
  };

  // Client-side pagination over fetched records
  const totalRecords = records.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / ITEMS_PER_PAGE));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return records.slice(start, start + ITEMS_PER_PAGE);
  }, [records, currentPage]);

  // Columns definition matching existing UI
  const columns = useMemo(
    () => [
      {
        key: "batch_no",
        label: "Batch No.",
        render: (row) => (
          <span className="font-normal text-slate-800">{row.batch_no || "—"}</span>
        ),
      },
      {
        key: "supplier",
        label: "Supplier",
        render: (row) => (
          <span className="font-normal text-slate-700">{row.supplier || "—"}</span>
        ),
      },
      {
        key: "total",
        label: "Total Amount",
        render: (row) => (
          <span className="font-normal text-slate-800">
            {row.total_amount || `₱ ${Number(row.total_price || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        render: (row) => {
          const isPaid = row.is_paid || String(row.status || "").toLowerCase() === "paid";
          return (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isPaid
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "bg-amber-100 text-amber-800 border border-amber-200"
              }`}
            >
              {isPaid ? "Paid" : "Requested"}
            </span>
          );
        },
      },
      {
        key: "date",
        label: "Requested Date",
        render: (row) => (
          <span className="font-normal text-slate-600 text-xs">
            {row.requested_at_formatted || row.requested_date || row.received_date || "—"}
          </span>
        ),
      },
      {
        key: "action",
        label: "Action",
        cellClassName: "text-center",
        render: (row) => (
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => handleOpenDetails(row)}
              className="rounded-lg border border-gray-300 px-3.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 hover:border-gray-400 cursor-pointer"
            >
              View Details
            </button>
          </div>
        ),
      },
    ],
    [handleOpenDetails]
  );

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Payment", path: "/miller-procurement/payment-history" },
          { label: "Payment History" },
        ]}
      />

      {/* Page Title & Generate Report Header Button */}
      <div className="mt-4 mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            Payment History
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            View all supplier payment requests and completed payment transactions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/miller-procurement/payment-history/report")}
          className="flex items-center gap-2 rounded-xl bg-[#0B5D1E] hover:bg-[#084b18] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white transition cursor-pointer shadow-xs whitespace-nowrap self-start sm:self-auto"
        >
          <FileText size={16} />
          <span>Generate Report</span>
        </button>
      </div>

      {/* KPI Cards (Click to filter table) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Card 1: REQUESTED TO PAY */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleKpiCardClick("requested")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleKpiCardClick("requested");
          }}
          className={`flex-1 rounded-[14px] border p-5 transition-all duration-200 cursor-pointer shadow-[0_6px_18px_rgba(15,23,42,0.06)] ${
            statusFilter === "requested"
              ? "border-amber-400 bg-amber-50/40 ring-2 ring-amber-400"
              : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-amber-300"
          }`}
          title="Click to filter requested records"
        >
          <div className="flex justify-between items-start">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              REQUESTED TO PAY
            </p>
            <CreditCard size={18} className="text-amber-500" />
          </div>
          <div className="mt-3 text-[clamp(1.9rem,3vw,2.4rem)] font-extrabold leading-none tracking-[-0.02em] text-slate-900">
            {kpi.requested_total_formatted || "₱ 0.00"}
          </div>
          <p className="mt-2 text-[12px] font-semibold text-amber-600 flex items-center gap-1.5">
            <span>{kpi.requested_count} pending payment requests</span>
            {statusFilter === "requested" && (
              <span className="text-[11px] font-normal text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                Active Filter
              </span>
            )}
          </p>
        </div>

        {/* Card 2: TOTAL PAID */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleKpiCardClick("paid")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleKpiCardClick("paid");
          }}
          className={`flex-1 rounded-[14px] border p-5 transition-all duration-200 cursor-pointer shadow-[0_6px_18px_rgba(15,23,42,0.06)] ${
            statusFilter === "paid"
              ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500"
              : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-emerald-300"
          }`}
          title="Click to filter paid records"
        >
          <div className="flex justify-between items-start">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              TOTAL PAID
            </p>
            <CreditCard size={18} className="text-[#0B5D1E]" />
          </div>
          <div className="mt-3 text-[clamp(1.9rem,3vw,2.4rem)] font-extrabold leading-none tracking-[-0.02em] text-slate-900">
            {kpi.paid_total_formatted || "₱ 0.00"}
          </div>
          <p className="mt-2 text-[12px] font-semibold text-[#0B5D1E] flex items-center gap-1.5">
            <span>{kpi.paid_count} completed supplier payments</span>
            {statusFilter === "paid" && (
              <span className="text-[11px] font-normal text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                Active Filter
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Functional Case-insensitive Search */}
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search batch, supplier, reference no."
              className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-white placeholder-gray-400 text-gray-700 h-[38px]"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Supplier Filter Dropdown */}
          <div className="relative w-full sm:w-auto">
            <select
              value={supplierFilter}
              onChange={(e) => {
                setSupplierFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none border border-gray-200 bg-white pl-3 pr-8 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto transition-colors cursor-pointer h-[38px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Suppliers</option>
              {suppliersList.map((sup) => (
                <option key={sup.id || sup.name} value={sup.id || sup.name}>
                  {sup.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
          </div>

          {/* Status Select Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none border border-gray-200 bg-white pl-3 pr-8 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto transition-colors cursor-pointer h-[38px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Status</option>
              <option value="requested">Requested to Pay</option>
              <option value="paid">Paid</option>
            </select>
            <ChevronDown
              size={16}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
          </div>

          {/* Sort By Dropdown */}
          <div className="relative w-full sm:w-auto">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none border border-gray-200 bg-white pl-3 pr-8 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto transition-colors cursor-pointer h-[38px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {SORT_OPTIONS.map((opt) => (
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
        </div>

        {/* Total Count Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-full text-xs font-semibold text-gray-700 self-start sm:self-center h-[38px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          <span>{totalRecords} records</span>
        </div>
      </div>

      {/* Table Card */}
      {loading ? (
        <div className="w-full rounded-[14px] border border-slate-200 bg-white p-12 text-center shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
          <div className="flex justify-center items-center gap-2 text-slate-500 text-sm">
            <Loader2 className="animate-spin text-emerald-700" size={20} />
            <span>Loading payment records...</span>
          </div>
        </div>
      ) : (
        <SectionedTableCard
          columns={columns}
          sections={[{ rows: paginatedRows }]}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
          footerLabel={
            totalRecords === 0
              ? "Showing 0 records"
              : `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(
                  currentPage * ITEMS_PER_PAGE,
                  totalRecords
                )} of ${totalRecords} records`
          }
          emptyStateTitle="No payment records found"
          emptyStateDescription="No payment requests or completed payments match your selected criteria."
        />
      )}

      {/* ── View Details Modal (Matching MillerOrderApproval.jsx, X exit only) ── */}
      {isDetailsModalOpen && selectedDetail &&
        createPortal(
          <div
            className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            onClick={handleCloseDetailsModal}
          >
            <div
              className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {selectedDetail.batch_no || "Payment Details"}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">Payment Reference Details</p>
                </div>

                {/* Top-right X button (single exit control) */}
                <button
                  type="button"
                  onClick={handleCloseDetailsModal}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  aria-label="Close details"
                  title="Close details"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-75px)] space-y-4">
                {detailLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Loader2 size={28} className="animate-spin text-emerald-600 mb-2" />
                    <p className="text-xs font-medium text-slate-600">Loading details...</p>
                  </div>
                ) : (
                  <>
                    {detailError && (
                      <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
                        <AlertCircle size={16} className="text-amber-600 shrink-0" />
                        <span>{detailError}</span>
                      </div>
                    )}

                    {/* ── SECTION 1 — INBOUND ORDER DETAILS ─────────────────── */}
                    <div className="space-y-1">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                        Inbound Order Details
                      </div>

                      <ModalDetailRow
                        label="Product Variant"
                        value={selectedDetail.variant || selectedDetail.product_name || "—"}
                      />
                      <ModalDetailRow label="Supplier" value={selectedDetail.supplier || "—"} />

                      {/* Product Photo */}
                      <div className="flex items-center justify-between gap-3 py-1.5 text-xs sm:text-sm">
                        <span className="text-slate-500 font-medium shrink-0">
                          Product Photo:
                        </span>
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center">
                          {resolvedPhotoUrl && !imageError ? (
                            <img
                              src={resolvedPhotoUrl}
                              alt={selectedDetail.variant || selectedDetail.product_name || "Product photo"}
                              className="h-full w-full object-cover"
                              onError={() => setImageError(true)}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-300">
                              <ImageIcon size={18} />
                              <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400">
                                IMG
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <ModalDetailRow
                        label="Original Order Quantity"
                        value={
                          selectedDetail.original_order_quantity ||
                          `${selectedDetail.ordered_quantity || 0} kg`
                        }
                      />
                    </div>

                  {/* Divider */}
                  <div className="border-t border-slate-100 pt-2" />

                  {/* ── SECTION 2 — RECEIVING DETAILS ─────────────────────── */}
                  <div className="space-y-1">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                      Receiving Details
                    </div>

                    <ModalDetailRow
                      label="Receiving Reference No."
                      value={selectedDetail.receiving_reference_no || selectedDetail.reference_no || "—"}
                    />
                    <ModalDetailRow
                      label="Total Received"
                      value={selectedDetail.total_received || "—"}
                    />
                    <ModalDetailRow
                      label="Good (Quantity to Pay)"
                      value={selectedDetail.received_good || "—"}
                    />
                    <ModalDetailRow
                      label="Price / kg"
                      value={selectedDetail.price_per_kg || "—"}
                    />
                    <ModalDetailRow
                      label="Payable Amount"
                      value={selectedDetail.payable || selectedDetail.total_amount || "—"}
                      isAmount={true}
                    />
                    <ModalDetailRow
                      label="Received By"
                      value={selectedDetail.received_by || "Warehouse Staff"}
                    />
                  </div>

                  {/* ── SECTION 3 — PAYMENT DETAILS (Paid only) ───────────── */}
                  {(selectedDetail.is_paid ||
                    String(selectedDetail.status || "").toLowerCase() === "paid") && (
                    <>
                      <div className="border-t border-slate-100 pt-2" />
                      <div className="space-y-1">
                        <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                          Payment Details
                        </div>

                        <ModalDetailRow
                          label="Payment Status"
                          value="Paid"
                          isBadge={true}
                          badgeStyle="bg-emerald-100 text-emerald-800 border border-emerald-200"
                        />
                        <ModalDetailRow
                          label="Requested At"
                          value={selectedDetail.requested_at_formatted || selectedDetail.requested_date || "—"}
                        />
                        <ModalDetailRow
                          label="Paid At"
                          value={selectedDetail.paid_at_formatted || selectedDetail.paid_date || "—"}
                        />
                        <ModalDetailRow
                          label="Paid By"
                          value={selectedDetail.paid_by || "—"}
                        />
                        <ModalDetailRow
                          label="Payment Method"
                          value={selectedDetail.payment_method || "—"}
                        />
                        <ModalDetailRow
                          label="Payment Reference"
                          value={selectedDetail.payment_reference || selectedDetail.payment_reference_id || "—"}
                        />
                      </div>
                    </>
                  )}

                  {/* Centered green Get Receipt button */}
                  <div className="pt-4 pb-1 border-t border-slate-100 flex justify-center">
                    <button
                      type="button"
                      onClick={handleGetReceipt}
                      className="px-6 py-2.5 bg-[#0B5D1E] hover:bg-[#084b18] text-white rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                    >
                      <Receipt size={16} />
                      <span>Get Receipt</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Official Goods & Payment Receipt Modal (Never stacked) ────────── */}
      {isReceiptModalOpen && selectedDetail && (
        <GoodsReceiptReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={handleCloseReceiptModal}
          receipt={selectedDetail}
        />
      )}

      {/* Toast notifications */}
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

export default MillerPaymentHistory;
