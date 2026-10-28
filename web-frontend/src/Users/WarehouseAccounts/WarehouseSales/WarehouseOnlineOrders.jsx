import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Calendar,
  ChevronDown,
  X,
  ShoppingCart,
  Check,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import Toast from "../../../Components/Modals/Toast";
import useToast from "../../../Components/hooks/useToast";
import useApi from "../../../Components/hooks/useApi";

// ─── Constants ───────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "date-desc",   label: "Newest First" },
  { value: "date-asc",    label: "Oldest First" },
  { value: "qty-desc",    label: "Quantity High to Low" },
  { value: "qty-asc",     label: "Quantity Low to High" },
  { value: "amount-desc", label: "Total Price High to Low" },
  { value: "amount-asc",  label: "Total Price Low to High" },
];

const COLUMNS = [
  { key: "batchNo",      label: "Batch No.",       width: "18%" },
  { key: "retailerName", label: "Retailer Name",   width: "20%" },
  { key: "variant",      label: "Variant",         width: "18%" },
  { key: "productCode",  label: "Product Code",    width: "18%" },
  { key: "totalPrice",   label: "Total Price",     width: "14%" },
  { key: "action",       label: "Action",          width: "12%", headerClassName: "text-center", cellClassName: "text-center" },
];

const ITEMS_PER_PAGE = 10;

// ─── Modal Detail Row Sub-Component ──────────────────────────────────────────
function ModalDetailRow({ label, value, isBadge = false, badgeStyle = "", children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-xs sm:text-sm border-b border-slate-100 last:border-b-0">
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
          {value || "—"}
        </span>
      )}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

const WarehouseOnlineOrders = () => {
  const { request } = useApi();
  const { toasts, showToast, removeToast } = useToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [tempDateRange, setTempDateRange] = useState({ startDate: "", endDate: "" });
  const [dateError, setDateError] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [currentPage, setCurrentPage] = useState(1);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSortDrop, setShowSortDrop] = useState(false);

  // Modal states
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const dateRef = useRef(null);
  const sortRef = useRef(null);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dateRef.current && !dateRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setShowSortDrop(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch orders from backend
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await request("/warehouse/sales/online-orders/");
      const fetchedOrders = Array.isArray(payload?.orders) ? payload.orders : [];
      // Filter strictly for "Ordered" records
      const orderedOnly = fetchedOrders.filter(
        (o) => String(o.status || "").trim().toLowerCase() === "ordered"
      );
      setOrders(orderedOnly);
      setPendingCount(payload?.pending_count ?? orderedOnly.length);
    } catch (err) {
      console.error("Failed to load warehouse online orders:", err);
      setError(err?.message || "Failed to load online orders.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Date picker handlers with strict To >= From validation
  const handleStartDateChange = (val) => {
    setTempDateRange((prev) => {
      const next = { ...prev, startDate: val };
      if (next.startDate && next.endDate && next.endDate < next.startDate) {
        setDateError("End date must not precede start date.");
      } else {
        setDateError("");
      }
      return next;
    });
  };

  const handleEndDateChange = (val) => {
    setTempDateRange((prev) => {
      const next = { ...prev, endDate: val };
      if (next.startDate && next.endDate && next.endDate < next.startDate) {
        setDateError("End date must not precede start date.");
      } else {
        setDateError("");
      }
      return next;
    });
  };

  const handleDateApply = () => {
    if (tempDateRange.startDate && tempDateRange.endDate && tempDateRange.endDate < tempDateRange.startDate) {
      setDateError("End date must not precede start date.");
      return;
    }
    setDateError("");
    setDateRange(tempDateRange);
    setCurrentPage(1);
    setShowDatePicker(false);
  };

  const handleDateReset = () => {
    setTempDateRange({ startDate: "", endDate: "" });
    setDateRange({ startDate: "", endDate: "" });
    setDateError("");
    setCurrentPage(1);
    setShowDatePicker(false);
  };

  // Filter and sort rows
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const { startDate, endDate } = dateRange;

    return orders
      .filter((row) => {
        // Enforce strictly status === 'ordered'
        if (String(row.status || "").trim().toLowerCase() !== "ordered") {
          return false;
        }

        // Search filter
        if (q) {
          const match =
            (row.batchNo && String(row.batchNo).toLowerCase().includes(q)) ||
            (row.retailerName && String(row.retailerName).toLowerCase().includes(q)) ||
            (row.buyerName && String(row.buyerName).toLowerCase().includes(q)) ||
            (row.variant && String(row.variant).toLowerCase().includes(q)) ||
            (row.productName && String(row.productName).toLowerCase().includes(q)) ||
            (row.productCode && String(row.productCode).toLowerCase().includes(q)) ||
            (row.buyerType && String(row.buyerType).toLowerCase().includes(q));
          if (!match) return false;
        }

        // Date Range filter (To must not precede From)
        if (startDate || endDate) {
          const rowDate = row.orderDate || (row.createdAt ? row.createdAt.split("T")[0] : "");
          if (rowDate) {
            if (startDate && rowDate < startDate) return false;
            if (endDate && rowDate > endDate) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "date-desc") {
          return (b.sortTimestamp || 0) - (a.sortTimestamp || 0);
        }
        if (sortBy === "date-asc") {
          return (a.sortTimestamp || 0) - (b.sortTimestamp || 0);
        }
        if (sortBy === "qty-desc") {
          return (b.orderedQuantity || 0) - (a.orderedQuantity || 0);
        }
        if (sortBy === "qty-asc") {
          return (a.orderedQuantity || 0) - (b.orderedQuantity || 0);
        }
        if (sortBy === "amount-desc") {
          return (b.totalPriceNum || 0) - (a.totalPriceNum || 0);
        }
        if (sortBy === "amount-asc") {
          return (a.totalPriceNum || 0) - (b.totalPriceNum || 0);
        }
        return 0;
      });
  }, [orders, searchQuery, dateRange, sortBy]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const sections = useMemo(() => {
    if (paginatedRows.length === 0) return [];
    return [{ rows: paginatedRows }];
  }, [paginatedRows]);

  // Open Details Modal
  const handleOpenModal = useCallback((row) => {
    setSelectedOrder(row);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    if (actionLoading) return;
    setIsModalOpen(false);
    setSelectedOrder(null);
  }, [actionLoading]);

  // Approve Order
  const handleApprove = async () => {
    if (!selectedOrder) return;

    if (selectedOrder.stockQuantity < selectedOrder.orderedQuantity) {
      showToast({
        type: "error",
        title: "Insufficient Stock",
        message: `Available stock is ${selectedOrder.stockQuantityFormatted}, but order requires ${selectedOrder.orderedQuantityFormatted}.`,
      });
      return;
    }

    const orderIdToApprove = selectedOrder.orderId || selectedOrder.onlineOrderId;
    const batchNoToApprove = selectedOrder.batchNo;

    setActionLoading(true);
    try {
      const resp = await request(
        `/warehouse/sales/online-orders/${orderIdToApprove}/approve/`,
        { method: "POST" }
      );
      showToast({
        type: "success",
        title: "Order Approved",
        message: resp?.message || `Order ${batchNoToApprove} has been forwarded to logistics.`,
      });
      // Immediately remove approved order from table
      setOrders((prev) => prev.filter((o) => (o.orderId || o.onlineOrderId) !== orderIdToApprove));
      setPendingCount((prev) => Math.max(0, prev - 1));
      handleCloseModal();
      fetchOrders();
    } catch (err) {
      console.error("Failed to approve order:", err);
      showToast({
        type: "error",
        title: "Approval Failed",
        message: err?.message || "Could not approve the order.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Decline Order Modal Handlers
  const handleOpenDeclineModal = () => {
    setDeclineReason("");
    // When Decline is clicked, hide View Details modal and show only Decline Reason modal
    setIsModalOpen(false);
    setIsDeclineModalOpen(true);
  };

  const handleCancelDecline = () => {
    if (actionLoading) return;
    // Cancel restores View Details for the same selected order
    setIsDeclineModalOpen(false);
    setIsModalOpen(true);
    setDeclineReason("");
  };

  const handleConfirmDecline = async () => {
    if (!selectedOrder) return;
    const cleanReason = declineReason.trim();
    if (!cleanReason) {
      showToast({
        type: "error",
        title: "Reason Required",
        message: "Please enter a reason for declining this order.",
      });
      return;
    }

    const orderIdToDecline = selectedOrder.orderId || selectedOrder.onlineOrderId;
    const batchNoToDecline = selectedOrder.batchNo;

    setActionLoading(true);
    try {
      const resp = await request(
        `/warehouse/sales/online-orders/${orderIdToDecline}/decline/`,
        {
          method: "POST",
          body: { reason: cleanReason },
        }
      );
      showToast({
        type: "info",
        title: "Order Declined",
        message: resp?.message || `Order ${batchNoToDecline} has been declined.`,
      });
      // Successful decline must close both modals and immediately remove from table
      setOrders((prev) => prev.filter((o) => (o.orderId || o.onlineOrderId) !== orderIdToDecline));
      setPendingCount((prev) => Math.max(0, prev - 1));
      setIsDeclineModalOpen(false);
      setIsModalOpen(false);
      setSelectedOrder(null);
      setDeclineReason("");
      fetchOrders();
    } catch (err) {
      console.error("Failed to decline order:", err);
      showToast({
        type: "error",
        title: "Decline Failed",
        message: err?.message || "Could not decline the order.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Toast Notifications */}
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs
          items={[
            { label: "Orders", path: "/warehouse-sales/dashboard" },
            { label: "Online Orders" },
          ]}
        />
        <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-extrabold tracking-[-0.03em] text-slate-900">
          Online Orders
        </h1>
        <p className="text-sm text-slate-500">
          Review and process pending retailer online orders.
        </p>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-center justify-between">
        {/* Left: Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search retailer, batch number, product code, or variant"
              className="block w-full pl-10 pr-9 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white placeholder-gray-400 text-gray-700"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
            {/* Date Range Dropdown with Strict Validation */}
            <div className="relative w-full sm:w-auto" ref={dateRef}>
              <button
                type="button"
                onClick={() => {
                  setShowDatePicker((prev) => !prev);
                  setShowSortDrop(false);
                }}
                className={`flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors cursor-pointer ${
                  dateRange.startDate ? "border-emerald-500 text-emerald-700 bg-emerald-50/40" : ""
                }`}
              >
                <span>
                  {dateRange.startDate
                    ? `${dateRange.startDate} - ${dateRange.endDate || "..."}`
                    : "Date Range"}
                </span>
                <Calendar
                  size={16}
                  className={dateRange.startDate ? "text-emerald-600" : "text-gray-500"}
                />
              </button>

              {showDatePicker && (
                <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-20 w-64">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Start Date (From)
                      </label>
                      <input
                        type="date"
                        max={tempDateRange.endDate || undefined}
                        value={tempDateRange.startDate}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        End Date (To)
                      </label>
                      <input
                        type="date"
                        min={tempDateRange.startDate || undefined}
                        value={tempDateRange.endDate}
                        onChange={(e) => handleEndDateChange(e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    {dateError && (
                      <p className="text-[11px] text-rose-600 font-medium">
                        {dateError}
                      </p>
                    )}

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
                        disabled={Boolean(dateError)}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-[#0B5D1E] hover:bg-[#084b18] rounded transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sort By Dropdown */}
            <div className="relative w-full sm:w-auto" ref={sortRef}>
              <button
                type="button"
                onClick={() => {
                  setShowSortDrop((prev) => !prev);
                  setShowDatePicker(false);
                }}
                className="flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors cursor-pointer"
              >
                <span>{SORT_OPTIONS.find((o) => o.value === sortBy)?.label || "Sort By"}</span>
                <ChevronDown
                  size={16}
                  className={`text-gray-500 transition-transform duration-200 ${
                    showSortDrop ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showSortDrop && (
                <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-20 min-w-[190px]">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSortBy(opt.value);
                        setShowSortDrop(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        sortBy === opt.value
                          ? "bg-[#EAF7E8] text-[#0B5D1E] font-bold"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Pending badge */}
        {pendingCount > 0 && (
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-300 px-4 py-2 text-xs font-semibold text-amber-700 shadow-sm ml-auto whitespace-nowrap">
            <ShoppingCart size={15} className="shrink-0" />
            Pending Orders ({pendingCount})
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchOrders}
            className="flex items-center gap-1 font-bold underline hover:text-rose-900 cursor-pointer"
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* ── Orders Table (Using SectionedTableCard Minor Component) ───────────── */}
      <SectionedTableCard
        columns={COLUMNS}
        sections={sections}
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onViewDetails={handleOpenModal}
        viewDetailsLabel="View Details"
        emptyStateTitle={loading ? "Loading orders..." : "No orders found"}
        emptyStateDescription={
          loading
            ? "Please wait while we fetch the latest online customer orders."
            : "No online customer orders match the selected filters or search query."
        }
        footerLabel={`Showing orders — Page ${safePage} of ${totalPages}`}
      />

      {/* ── View Details Modal (Matching Miller Order Approval Modal UI) ─────── */}
      {isModalOpen && !isDeclineModalOpen && selectedOrder &&
        createPortal(
          <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div
              className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with Title and Top-right X only; NO footer close */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {selectedOrder.batchNo}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">Online Order Details</p>
                </div>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={actionLoading}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  aria-label="Close details"
                  title="Close details"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body: Required Details */}
              <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)] space-y-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-1">
                  {/* 1. Buyer name */}
                  <ModalDetailRow label="Retailer Name" value={selectedOrder.buyerName || selectedOrder.retailerName} />

                  {/* 2. Buyer Type badge in its own row */}
                  <ModalDetailRow label="Buyer Type">
                    <span className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase bg-blue-100 text-blue-700 border border-blue-200">
                      {selectedOrder.buyerType || "Retailer"}
                    </span>
                  </ModalDetailRow>

                  {/* 3. Product */}
                  <ModalDetailRow label="Product" value={selectedOrder.productName || selectedOrder.variant} />

                  {/* 4. Product Code in its own row */}
                  <ModalDetailRow label="Product Code">
                    <span className="font-mono text-xs font-semibold text-slate-700">
                      {selectedOrder.productCode || "—"}
                    </span>
                  </ModalDetailRow>

                  {/* 5. Ordered Quantity (kg) */}
                  <ModalDetailRow
                    label="Ordered Quantity"
                    value={selectedOrder.orderedQuantityFormatted}
                  />

                  {/* 6. Expected Arrival Date */}
                  <ModalDetailRow
                    label="Expected Arrival Date"
                    value={selectedOrder.expectedArrivalDateFormatted}
                  />

                  {/* 7. warehouse_products.unit_cost */}
                  <ModalDetailRow
                    label="Unit Cost"
                    value={selectedOrder.unitCostFormatted}
                  />

                  {/* 8. Fare Fee */}
                  <ModalDetailRow
                    label="Fare Fee"
                    value={selectedOrder.fareFeeFormatted}
                  />

                  {/* 9. Total */}
                  <ModalDetailRow label="Total">
                    <span className="text-base font-extrabold text-[#0B5D1E]">
                      {selectedOrder.totalPriceFormatted || selectedOrder.totalPrice}
                    </span>
                  </ModalDetailRow>
                </div>

                {/* Inventory Availability Snapshot */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">
                      Available Stock in Inventory:
                    </span>
                    <span
                      className={`font-bold ${
                        selectedOrder.stockQuantity < selectedOrder.orderedQuantity
                          ? "text-rose-600"
                          : "text-emerald-700"
                      }`}
                    >
                      {selectedOrder.stockQuantityFormatted}
                    </span>
                  </div>
                  {selectedOrder.stockQuantity < selectedOrder.orderedQuantity && (
                    <p className="text-[11px] text-rose-600 font-medium bg-rose-50 border border-rose-200 rounded-lg p-2 flex items-center gap-1.5">
                      <AlertCircle size={14} className="shrink-0" />
                      Insufficient inventory to fulfill this order (requires{" "}
                      {selectedOrder.orderedQuantityFormatted}).
                    </p>
                  )}
                </div>
              </div>

              {/* Modal Footer (Top-right X only; no footer Close) */}
              {selectedOrder.status?.toLowerCase() === "ordered" ? (
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                  {/* Decline button: gray, left */}
                  <button
                    type="button"
                    onClick={handleOpenDeclineModal}
                    disabled={actionLoading}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <XCircle size={14} />
                    <span>Decline</span>
                  </button>

                  {/* Approve button: green, right */}
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={
                      actionLoading ||
                      selectedOrder.stockQuantity < selectedOrder.orderedQuantity
                    }
                    className="px-5 py-2 text-xs font-semibold text-white bg-[#0B5D1E] hover:bg-[#084b18] rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    <span>Approve</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 shrink-0">
                  <span className="text-xs text-slate-500 font-medium">Order Status:</span>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${
                      selectedOrder.status?.toLowerCase() === "forwarded to logistics"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : selectedOrder.status?.toLowerCase() === "declined"
                        ? "bg-rose-100 text-rose-700 border border-rose-200"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* ── Declining Reason Modal Overlay ─────────────────────────────────── */}
      {isDeclineModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9995] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <h3 className="font-bold text-gray-900 text-base">Declining Reason</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Please specify why this order request is being declined.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Enter reason for declining this online order..."
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCancelDecline}
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDecline}
                  disabled={actionLoading || !declineReason.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <XCircle size={14} />
                  )}
                  Confirm Decline
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default WarehouseOnlineOrders;