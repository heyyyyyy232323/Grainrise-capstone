import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import DateRangePicker from "../../../Components/Minor-Components/DateRangePicker";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import useOrderHistory from "../../../Components/hooks/MillerEncoder/useOrderHistory";

// ─── Media Resolver ───────────────────────────────────────────────────────────
const getBaseServerUrl = () => {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/$/, "");
  if (!envUrl) return "";
  return envUrl.replace(/\/api$/, "");
};

const resolveProductImageUrl = (imagePath) => {
  if (!imagePath || typeof imagePath !== "string") return null;
  const trimmed = imagePath.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  const base = getBaseServerUrl();
  let cleanPath = trimmed.replace(/^\/+/, "");
  while (cleanPath.startsWith("media/")) {
    cleanPath = cleanPath.slice(6);
  }
  const mediaPath = `/media/${cleanPath}`;
  return base ? `${base}${mediaPath}` : mediaPath;
};

// ─── Status Class Resolver ────────────────────────────────────────────────────
const statusStyles = {
  approved: "bg-emerald-100 text-emerald-700",
  requested: "bg-amber-100 text-amber-700",
  received: "bg-blue-100 text-blue-700",
  transit: "bg-orange-100 text-orange-700",
  "in transit": "bg-orange-100 text-orange-700",
  "ready to receive": "bg-emerald-100 text-emerald-700",
  active: "bg-emerald-100 text-emerald-700",
  verified: "bg-emerald-100 text-emerald-700",
  paid: "bg-emerald-100 text-emerald-700",
  assigned: "bg-blue-100 text-blue-700",
  declined: "bg-rose-100 text-rose-700",
  pending: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
  delivered: "bg-emerald-100 text-emerald-700",
  "in process": "bg-slate-100 text-slate-600",
};

const getStatusBadgeClass = (status) => {
  if (!status) return statusStyles["in process"];
  const key = String(status).trim().toLowerCase();
  return statusStyles[key] || "bg-slate-100 text-slate-600";
};

// ─── Table Configuration ──────────────────────────────────────────────────────
const COLUMNS = [
  {
    key: "batchId",
    label: "Batch ID",
    render: (row) => (
      <span className="text-[13px] font-medium text-slate-700">{row.batchId || "—"}</span>
    ),
  },
  {
    key: "variant",
    label: "Variant",
    render: (row) => (
      <span className="text-[13px] font-medium text-slate-700">{row.variant || "—"}</span>
    ),
  },
  {
    key: "stockQty",
    label: "Stock Qty (kg)",
    render: (row) => (
      <span className="text-[13px] font-medium text-slate-700">{row.stockQty || "—"}</span>
    ),
  },
  {
    key: "supplier",
    label: "Supplier",
    render: (row) => (
      <span className="text-[13px] font-medium text-slate-700">{row.supplier || "—"}</span>
    ),
  },
  { key: "status",      label: "Status" },
  {
    key: "action",
    label: "Action",
    width: "14%",
    headerClassName: "text-center",
    cellClassName: "text-center",
  },
];

const SORT_OPTIONS = [
  { value: "date-desc",   label: "Order Date (Newest First)" },
  { value: "date-asc",    label: "Order Date (Oldest First)" },
  { value: "variant-asc", label: "Variant (A-Z)" },
  { value: "variant-desc",label: "Variant (Z-A)" },
  { value: "qty-desc",    label: "Stock Quantity (High to Low)" },
  { value: "qty-asc",     label: "Stock Quantity (Low to High)" },
];

const ROWS_PER_PAGE = 10;

// ─── Section Header Helpers ───────────────────────────────────────────────────
const formatSectionLabel = (dateStr) => {
  if (!dateStr) return "Other Orders";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const d = new Date(dateStr + "T00:00:00");
  const toDay = (dt) => dt.toISOString().slice(0, 10);

  if (dateStr === toDay(today))     return "Today";
  if (dateStr === toDay(yesterday)) return "Yesterday";

  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

const groupByDate = (rows) => {
  const map = new Map();
  rows.forEach((row) => {
    const key = row.date || (row.created_at ? row.created_at.slice(0, 10) : "undated");
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  });
  // Sort dates descending (newest first)
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, sectionRows]) => ({
      label: formatSectionLabel(date),
      rows: sectionRows,
    }));
};

const applyFilters = (rows, { search, dateRange, sortBy }) => {
  let result = [...rows];

  // Search
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter(
      (r) =>
        (r.batchId && r.batchId.toLowerCase().includes(q)) ||
        (r.variant && r.variant.toLowerCase().includes(q)) ||
        (r.supplier && r.supplier.toLowerCase().includes(q))
    );
  }

  // Date range
  if (dateRange.startDate) {
    result = result.filter((r) => r.date >= dateRange.startDate);
  }
  if (dateRange.endDate) {
    result = result.filter((r) => r.date <= dateRange.endDate);
  }

  // Sort
  if (sortBy === "variant-asc") {
    result.sort((a, b) => (a.variant || "").localeCompare(b.variant || ""));
  } else if (sortBy === "variant-desc") {
    result.sort((a, b) => (b.variant || "").localeCompare(a.variant || ""));
  } else if (sortBy === "qty-desc") {
    result.sort((a, b) => (Number(b.ordered_quantity) || 0) - (Number(a.ordered_quantity) || 0));
  } else if (sortBy === "qty-asc") {
    result.sort((a, b) => (Number(a.ordered_quantity) || 0) - (Number(b.ordered_quantity) || 0));
  } else if (sortBy === "date-asc") {
    result.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  } else {
    // Default newest first
    result.sort((a, b) => (b.created_at || b.date || "").localeCompare(a.created_at || a.date || ""));
  }

  return result;
};

// ─── Modal Detail Row Sub-Component ───────────────────────────────────────────
function ModalDetailRow({ label, value, isBadge = false, badgeStyle = "", children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-xs sm:text-sm">
      <span className="text-slate-500 font-medium shrink-0">{label}:</span>
      {children ? (
        <div className="text-right">{children}</div>
      ) : isBadge ? (
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${badgeStyle}`}
        >
          {value}
        </span>
      ) : (
        <span className="font-semibold text-slate-800 text-right break-words max-w-[60%]">
          {value}
        </span>
      )}
    </div>
  );
}

export default function MillerEncoderOrderHistory() {
  const { fetchOrderHistory, fetchOrderDetail, loading, detailLoading, error, detailError } =
    useOrderHistory();

  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [sortBy, setSortBy] = useState("date-desc");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrderSummary, setSelectedOrderSummary] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);

  // ─── Fetch Order History on Mount ──────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    try {
      const data = await fetchOrderHistory();
      setOrders(data);
    } catch {
      // Handled in hook
    }
  }, [fetchOrderHistory]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // ─── Handle Filters & Pagination ───────────────────────────────────────────
  const handleSearch = (v) => {
    setSearch(v);
    setCurrentPage(1);
  };
  const handleDate = (v) => {
    setDateRange(v);
    setCurrentPage(1);
  };
  const handleSort = (v) => {
    setSortBy(v);
    setCurrentPage(1);
  };

  const filtered = useMemo(
    () => applyFilters(orders, { search, dateRange, sortBy }),
    [orders, search, dateRange, sortBy]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const pageSlice = filtered.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );
  const sections = groupByDate(pageSlice);

  const footerLabel =
    filtered.length > 0
      ? `Showing ${(currentPage - 1) * ROWS_PER_PAGE + 1}–${Math.min(
          currentPage * ROWS_PER_PAGE,
          filtered.length
        )} of ${filtered.length} records`
      : "Showing 0 records";

  // ─── View Details Modal Actions ────────────────────────────────────────────
  const handleViewDetails = async (row) => {
    const orderId = row.inbound_order_id || row.id;
    setSelectedOrderSummary(row);
    setOrderDetail(null);
    setIsModalOpen(true);

    try {
      const detail = await fetchOrderDetail(orderId);
      setOrderDetail(detail);
    } catch {
      // Handled by hook error state
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrderSummary(null);
    setOrderDetail(null);
  };

  const handleRetryDetail = async () => {
    const orderId = selectedOrderSummary?.inbound_order_id || selectedOrderSummary?.id;
    if (!orderId) return;
    try {
      const detail = await fetchOrderDetail(orderId);
      setOrderDetail(detail);
    } catch {
      // Handled by hook
    }
  };

  const resolvedPhotoUrl = useMemo(() => {
    return resolveProductImageUrl(orderDetail?.product_photo);
  }, [orderDetail?.product_photo]);

  return (
    <div className="space-y-5">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs
          items={[
            { label: "Management" },
            { label: "Order History" },
          ]}
        />
        <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-extrabold tracking-[-0.03em] text-slate-900">
          Order History
        </h1>
        <p className="text-sm text-slate-500">Review warehouse transaction history.</p>
      </div>

      {/* ── Error Banner if List Fetch Fails ─────────────────────────────────── */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadOrders}
            className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition cursor-pointer"
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <SearchFilter
            onSearch={handleSearch}
            placeholder="Search batch ID, variant, or supplier"
          />
        </div>
        <DateRangePicker onDateChange={handleDate} />
        <SortByDropdown value={sortBy} onChange={handleSort} options={SORT_OPTIONS} />
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      {loading && orders.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
          <Loader2 size={32} className="animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading order history...</p>
          <p className="text-xs text-slate-400 mt-1">Retrieving warehouse orders from database.</p>
        </div>
      ) : (
        <SectionedTableCard
          columns={COLUMNS}
          sections={sections}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          footerLabel={footerLabel}
          onViewDetails={handleViewDetails}
          viewDetailsLabel="View Details"
          emptyStateTitle="No orders found"
          emptyStateDescription="No matching orders were found. Try adjusting your search or date filters."
        />
      )}

      {/* ── Centered Details Modal Overlay (NO inline card, close ONLY via X) ─── */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div
              className="relative w-full max-w-md sm:max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {orderDetail?.batch_no || selectedOrderSummary?.batchId || "Order"}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">Order Details</p>
                </div>

                {/* X Button: Only way to close */}
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  aria-label="Close details"
                  title="Close details"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-75px)] space-y-4">
                {detailLoading && !orderDetail ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Loader2 size={32} className="animate-spin text-emerald-600 mb-2" />
                    <p className="text-sm font-medium text-slate-600">
                      Loading order details...
                    </p>
                  </div>
                ) : detailError ? (
                  <div className="py-6">
                    <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                      <AlertCircle size={20} className="shrink-0 text-rose-500" />
                      <div className="flex-1">
                        <p className="font-semibold">Failed to load order details</p>
                        <p className="text-xs text-rose-600">{detailError}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRetryDetail}
                        className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition cursor-pointer"
                      >
                        <RefreshCw size={13} /> Retry
                      </button>
                    </div>
                  </div>
                ) : orderDetail ? (
                  <>
                    {/* ── SECTION 1 — INBOUND ORDER DETAILS ─────────────────── */}
                    <div className="space-y-1">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                        Inbound Order Details
                      </div>

                      <ModalDetailRow
                        label="Product Variant"
                        value={orderDetail.variant || "In Process"}
                      />

                      <ModalDetailRow
                        label="Supplier"
                        value={orderDetail.supplier_name || "In Process"}
                      />

                      {/* Product Photo */}
                      <div className="flex items-center justify-between gap-3 py-1.5 text-xs sm:text-sm">
                        <span className="text-slate-500 font-medium shrink-0">
                          Product Photo:
                        </span>
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center">
                          {resolvedPhotoUrl ? (
                            <img
                              src={resolvedPhotoUrl}
                              alt={orderDetail.variant || "Product photo"}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
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

                      {/* Product Description */}
                      <div className="flex items-start justify-between gap-3 py-1.5 text-xs sm:text-sm">
                        <span className="text-slate-500 font-medium shrink-0">
                          Product Description:
                        </span>
                        <span className="font-medium text-slate-700 text-right text-xs max-w-[60%] break-words">
                          {orderDetail.product_description ? (
                            orderDetail.product_description
                          ) : (
                            <span className="italic text-slate-400">
                              No description provided
                            </span>
                          )}
                        </span>
                      </div>

                      <ModalDetailRow
                        label="Order Quantity"
                        value={orderDetail.ordered_quantity_formatted || "In Process"}
                      />

                      <ModalDetailRow
                        label="Expected Arrival Date"
                        value={
                          orderDetail.expected_arrival_date_formatted || "In Process"
                        }
                      />

                      <ModalDetailRow
                        label="Created Date"
                        value={orderDetail.created_at_formatted || "In Process"}
                      />

                      <ModalDetailRow
                        label="Last Updated"
                        value={orderDetail.updated_at_formatted || "In Process"}
                      />

                      <ModalDetailRow
                        label="Procurement Status"
                        value={
                          orderDetail.procurement_status ||
                          orderDetail.status ||
                          "In Process"
                        }
                        isBadge={true}
                        badgeStyle={getStatusBadgeClass(
                          orderDetail.procurement_status || orderDetail.status
                        )}
                      />
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-100 pt-3" />

                    {/* ── SECTION 2 — DATE REQUIREMENTS ─────────────────────── */}
                    <div className="space-y-1">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                        Date Requirements
                      </div>

                      <ModalDetailRow
                        label="Target Arrival Date"
                        value={
                          orderDetail.date_requirements?.target_arrival_date_formatted ||
                          "In Process"
                        }
                      />

                      <ModalDetailRow
                        label="Required By Date"
                        value={
                          orderDetail.date_requirements?.required_by_date_formatted ||
                          "In Process"
                        }
                      />

                      <ModalDetailRow
                        label="Set By"
                        value={orderDetail.date_requirements?.set_by || "In Process"}
                      />

                      <ModalDetailRow
                        label="Adjusted By"
                        value={
                          orderDetail.date_requirements?.adjusted_by || "Not Adjusted"
                        }
                      />
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-100 pt-3" />

                    {/* ── SECTION 3 — PROCUREMENT RECEIVING ─────────────────── */}
                    <div className="space-y-1">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                        Procurement Receiving
                      </div>

                      <ModalDetailRow
                        label="Product Code"
                        value={
                          orderDetail.procurement_receiving?.product_code ||
                          "In Process"
                        }
                      />

                      <ModalDetailRow
                        label="Receiving Reference No."
                        value={
                          orderDetail.procurement_receiving?.receiving_reference_no ||
                          "In Process"
                        }
                      />

                      <ModalDetailRow
                        label="Total Received"
                        value={
                          orderDetail.procurement_receiving?.total_received ||
                          "In Process"
                        }
                      />

                      <ModalDetailRow
                        label="Received Good"
                        value={
                          orderDetail.procurement_receiving?.received_good ||
                          "In Process"
                        }
                      />

                      <ModalDetailRow
                        label="Received Bad"
                        value={
                          orderDetail.procurement_receiving?.received_bad ||
                          "In Process"
                        }
                      />

                      <ModalDetailRow
                        label="Price per kg"
                        value={
                          orderDetail.procurement_receiving?.price_per_kg ||
                          "In Process"
                        }
                      />

                      <ModalDetailRow
                        label="Total Price"
                        value={
                          orderDetail.procurement_receiving?.total_price ||
                          "In Process"
                        }
                      />

                      <ModalDetailRow
                        label="Payment Status"
                        value={
                          orderDetail.procurement_receiving?.payment_status ||
                          "In Process"
                        }
                        isBadge={true}
                        badgeStyle={
                          orderDetail.procurement_receiving?.payment_status ===
                          "In Process"
                            ? "bg-slate-100 text-slate-600 border border-slate-200"
                            : getStatusBadgeClass(
                                orderDetail.procurement_receiving?.payment_status
                              )
                        }
                      />
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
