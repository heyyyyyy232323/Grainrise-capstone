import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Calendar,
  ChevronDown,
  ChevronUp,
  X,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import Toast from "../../../Components/Minor-Components/Toast";
import useToast from "../../../Components/hooks/useToast";
import useApi from "../../../Components/hooks/useApi";

// ─── Filter & Sort Configurations ──────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "variant-asc", label: "Variant (A-Z)" },
  { value: "variant-desc", label: "Variant (Z-A)" },
  { value: "batch-asc", label: "Batch No. (A-Z)" },
  { value: "batch-desc", label: "Batch No. (Z-A)" },
  { value: "qty-desc", label: "Quantity (Highest)" },
  { value: "qty-asc", label: "Quantity (Lowest)" },
  { value: "cost-desc", label: "Total Return Cost (Highest)" },
  { value: "cost-asc", label: "Total Return Cost (Lowest)" },
];

// ─── Custom Dropdown ────────────────────────────────────────────────────────

function CustomDropdown({ label, options, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : label;

  return (
    <div className="relative w-full sm:w-auto" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 border border-gray-200 bg-white px-3.5 py-2 rounded-xl text-sm font-medium text-slate-800 hover:bg-gray-50 transition-colors cursor-pointer h-[38px] justify-between w-full sm:w-auto min-w-[140px]"
      >
        <span>{displayLabel}</span>
        {isOpen ? (
          <ChevronUp size={16} className="text-slate-500" />
        ) : (
          <ChevronDown size={16} className="text-slate-500" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 bg-white border border-gray-100 rounded-2xl shadow-xl p-1.5 z-30 w-56 animate-in fade-in zoom-in-95 duration-100">
          <div className="space-y-0.5">
            {options.map((opt) => {
              const isSelected = value === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#EAF5ED] text-[#0B5D1E] font-semibold"
                      : "text-slate-700 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modal Detail Row Sub-Component ─────────────────────────────────────────

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
        <span className="font-semibold text-slate-800 text-right break-words max-w-[65%]">
          {value || "—"}
        </span>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function MillerProductReturns() {
  const { request } = useApi();
  const { toasts, showToast, removeToast } = useToast();

  const notify = useCallback(
    (message, type = "info", title = "") => {
      const defaultTitle =
        type === "success"
          ? "Success"
          : type === "error"
          ? "Error"
          : type === "warning"
          ? "Warning"
          : "Notification";
      showToast({
        type,
        title: title || defaultTitle,
        message: typeof message === "string" ? message : (message?.message || JSON.stringify(message)),
      });
    },
    [showToast]
  );

  // Data states
  const [returns, setReturns] = useState([]);
  const [variantsList, setVariantsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search states
  const [query, setQuery] = useState("");
  const [variantFilter, setVariantFilter] = useState("all");
  const [sortBy, setSortBy] = useState("variant-asc");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [tempDateRange, setTempDateRange] = useState({ startDate: "", endDate: "" });
  const [page, setPage] = useState(1);

  // Date range dropdown ref & visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateRef = useRef(null);

  // Modal states
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showPhotoPreview, setShowPhotoPreview] = useState(null);

  // Click outside for date picker
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dateRef.current && !dateRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Return Variants for Dropdown
  const fetchVariants = useCallback(async () => {
    try {
      const res = await request("/miller-employees/logistics/product-returns/variants/", {
        method: "GET",
      });
      if (res && res.success && Array.isArray(res.variants)) {
        setVariantsList(res.variants);
      }
    } catch {
      // Keep existing variants if fetch fails
    }
  }, [request]);

  // Fetch Returns from Backend
  const fetchReturns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await request("/miller-employees/logistics/product-returns/", {
        method: "GET",
      });
      if (res && res.success) {
        setReturns(res.returns || []);
      } else {
        setError(res?.message || "Failed to load product returns.");
      }
    } catch (err) {
      setError(err?.message || "Failed to connect to server.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    fetchReturns();
    fetchVariants();
  }, [fetchReturns, fetchVariants]);

  // Date filter handlers
  const handleDateApply = () => {
    setDateRange(tempDateRange);
    setPage(1);
    setShowDatePicker(false);
  };

  const handleDateReset = () => {
    setTempDateRange({ startDate: "", endDate: "" });
    setDateRange({ startDate: "", endDate: "" });
    setPage(1);
    setShowDatePicker(false);
  };

  // Build variant dropdown options
  const variantOptions = useMemo(() => {
    const base = [{ value: "all", label: "All Variants" }];
    const uniqueFromData = Array.from(
      new Set([
        ...variantsList,
        ...returns.map((r) => r.variant || r.product_name).filter(Boolean),
      ])
    ).sort();

    uniqueFromData.forEach((v) => {
      base.push({ value: v.toLowerCase(), label: v });
    });
    return base;
  }, [variantsList, returns]);

  // Filtered & Sorted Returns
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    let result = returns.filter((r) => {
      const matchesQuery =
        q === "" ||
        [
          r.return_reference_no,
          r.receiving_reference_no,
          r.batch_no,
          r.orderNo,
          r.variant,
          r.product_name,
          r.buyer,
          r.buyer_name,
        ]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(q));

      const matchesVariant =
        variantFilter === "all" ||
        String(r.variant || r.product_name || "").toLowerCase() === variantFilter.toLowerCase();

      const itemDate = r.isoDate || (r.created_at ? r.created_at.slice(0, 10) : "");
      const matchesStart = !dateRange.startDate || itemDate >= dateRange.startDate;
      const matchesEnd = !dateRange.endDate || itemDate <= dateRange.endDate;

      return matchesQuery && matchesVariant && matchesStart && matchesEnd;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "variant-asc") {
        return (a.variant || a.product_name || "").localeCompare(b.variant || b.product_name || "");
      }
      if (sortBy === "variant-desc") {
        return (b.variant || b.product_name || "").localeCompare(a.variant || a.product_name || "");
      }
      if (sortBy === "batch-asc") {
        return (a.batch_no || a.orderNo || "").localeCompare(b.batch_no || b.orderNo || "");
      }
      if (sortBy === "batch-desc") {
        return (b.batch_no || b.orderNo || "").localeCompare(a.batch_no || a.orderNo || "");
      }
      if (sortBy === "qty-desc") {
        return (b.numericQty || b.quantity || 0) - (a.numericQty || a.quantity || 0);
      }
      if (sortBy === "qty-asc") {
        return (a.numericQty || a.quantity || 0) - (b.numericQty || b.quantity || 0);
      }
      if (sortBy === "cost-desc") {
        return (b.total_return_cost || 0) - (a.total_return_cost || 0);
      }
      if (sortBy === "cost-asc") {
        return (a.total_return_cost || 0) - (b.total_return_cost || 0);
      }
      return 0;
    });

    return result;
  }, [returns, query, variantFilter, dateRange, sortBy]);

  // Pagination calculations
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (page - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  // Table Columns (Retailer renamed to Buyer per specification)
  const columns = [
    { key: "variant", label: "Variant", width: "22%" },
    { key: "orderNo", label: "Order No.", width: "28%" },
    { key: "buyer", label: "Buyer", width: "22%" },
    { key: "qty", label: "Quantity", width: "16%" },
    {
      key: "action",
      label: "Action",
      width: "12%",
      headerClassName: "text-center",
      cellClassName: "!text-center",
    },
  ];

  const sections = useMemo(() => [{ rows: paginated }], [paginated]);

  // ─── Approve Action ─────────────────────────────────────────────────────────

  const handleApprove = async () => {
    if (!selectedReturn) return;

    if (selectedReturn.available_stock < selectedReturn.quantity) {
      notify(
        `Insufficient original product stock. Only ${selectedReturn.available_stock_formatted} available for replacement.`,
        "error"
      );
      return;
    }

    setActionLoading(true);
    try {
      const res = await request(
        `/miller-employees/logistics/product-returns/${selectedReturn.return_id}/process/`,
        {
          method: "POST",
          body: { action: "approve" },
        }
      );

      if (res && res.success) {
        notify(
          res.message || "Product return approved successfully and forwarded to logistics.",
          "success"
        );
        setSelectedReturn(null);
        await fetchReturns();
      } else {
        notify(res?.message || res?.error || "Failed to approve product return.", "error");
      }
    } catch (err) {
      notify(err?.message || "An error occurred while approving return.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Reject Action ──────────────────────────────────────────────────────────

  const handleOpenRejectionModal = () => {
    setRejectionReason("");
    setIsRejectionModalOpen(true);
  };

  const handleCancelRejection = () => {
    setIsRejectionModalOpen(false);
    setRejectionReason("");
  };

  const handleConfirmReject = async () => {
    if (!selectedReturn) return;

    if (!rejectionReason.trim()) {
      notify("Rejection reason is required.", "error");
      return;
    }

    setActionLoading(true);
    try {
      const res = await request(
        `/miller-employees/logistics/product-returns/${selectedReturn.return_id}/process/`,
        {
          method: "POST",
          body: {
            action: "reject",
            rejection_reason: rejectionReason.trim(),
          },
        }
      );

      if (res && res.success) {
        notify(
          res.message || "Product return rejected successfully.",
          "success"
        );
        setIsRejectionModalOpen(false);
        setSelectedReturn(null);
        setRejectionReason("");
        await fetchReturns();
      } else {
        notify(res?.message || res?.error || "Failed to reject product return.", "error");
      }
    } catch (err) {
      notify(err?.message || "An error occurred while rejecting return.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Toast toasts={toasts} removeToast={removeToast} />

      <Breadcrumbs
        items={[
          { label: "Delivery Operations", path: "/miller-logistics/delivery-management" },
          { label: "Product Returns" },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Product Return Issues
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review product return requests and reported issues from buyers.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            fetchReturns();
            fetchVariants();
          }}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer shadow-xs disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Filter Toolbar ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* 1. Search Filter */}
        <div className="relative min-w-[220px] max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search return ref., batch no., product, or buyer"
            className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-white placeholder-gray-400 text-gray-700 h-[38px]"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* 2. Date Range Picker */}
        <div className="relative w-full sm:w-auto" ref={dateRef}>
          <button
            type="button"
            onClick={() => setShowDatePicker((prev) => !prev)}
            className={`flex items-center gap-2 border border-gray-200 bg-white px-3.5 py-2 rounded-xl text-sm font-medium text-slate-800 hover:bg-gray-50 w-full sm:w-auto justify-between transition-colors cursor-pointer h-[38px] ${
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
            <div className="absolute top-full mt-2 left-0 sm:left-auto bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-20 w-64">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={tempDateRange.startDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setTempDateRange((prev) => ({
                        startDate: newStart,
                        endDate: prev.endDate && prev.endDate < newStart ? "" : prev.endDate,
                      }));
                    }}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    min={tempDateRange.startDate || undefined}
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

        {/* 3. Variants Dropdown */}
        <CustomDropdown
          label="All Variants"
          options={variantOptions}
          value={variantFilter}
          onChange={(v) => {
            setVariantFilter(v);
            setPage(1);
          }}
        />

        {/* 4. Sort Dropdown */}
        <CustomDropdown
          label="Sort By"
          options={SORT_OPTIONS}
          value={sortBy}
          onChange={(v) => {
            setSortBy(v);
            setPage(1);
          }}
        />
      </div>

      {/* ── Table Card ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <Loader2 size={28} className="animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading product returns...</p>
          <p className="text-xs text-slate-400 mt-1">Retrieving pending requests from database</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
          <AlertCircle size={28} className="text-rose-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-rose-800">Failed to load product returns</p>
          <p className="text-xs text-rose-600 mt-1">{error}</p>
          <button
            type="button"
            onClick={fetchReturns}
            className="mt-3 px-4 py-1.5 text-xs font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-lg transition cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : (
        <SectionedTableCard
          columns={columns}
          sections={sections}
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onViewDetails={(row) => setSelectedReturn(row)}
          footerLabel={`Showing ${filtered.length === 0 ? 0 : startIndex + 1}-${Math.min(
            startIndex + itemsPerPage,
            filtered.length
          )} of ${filtered.length} return requests`}
        />
      )}

      {/* ── View Details Modal (Matching Sales Order Approval UI) ───────────── */}
      {selectedReturn && !isRejectionModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div
              className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header: Return Reference No., Top-Right X only */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Return Request
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {selectedReturn.return_reference_no}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReturn(null)}
                  className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-100 transition cursor-pointer"
                  title="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-4 overflow-y-auto max-h-[calc(88vh-140px)] space-y-4">
                {/* ── SECTION 1 — BUYER INFORMATION ─────────────────────────── */}
                <div className="space-y-1">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                    <span>Buyer Information</span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        selectedReturn.buyer_type === "Warehouse"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {selectedReturn.buyer_type}
                    </span>
                  </div>

                  <ModalDetailRow label="Buyer Name" value={selectedReturn.buyer_name} />
                  <ModalDetailRow label="Buyer Type" value={selectedReturn.buyer_type} />
                  <ModalDetailRow label="Contact Number" value={selectedReturn.contact_number} />
                  <ModalDetailRow label="Address" value={selectedReturn.delivery_address} />
                </div>

                <div className="border-t border-slate-100 pt-2" />

                {/* ── SECTION 2 — ORDER INFORMATION ─────────────────────────── */}
                <div className="space-y-1">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                    Order Information
                  </div>

                  <ModalDetailRow label="Batch Number" value={selectedReturn.batch_no} />
                  <ModalDetailRow label="Product Variant" value={selectedReturn.variant} />
                  <ModalDetailRow label="Product Code" value={selectedReturn.product_code} />
                  <ModalDetailRow
                    label="Quantity"
                    value={selectedReturn.ordered_quantity_formatted}
                  />
                  <ModalDetailRow
                    label="Unit Cost"
                    value={selectedReturn.unit_cost_formatted}
                  />
                  <ModalDetailRow
                    label="Fare Fee"
                    value={selectedReturn.fare_fee_formatted}
                  />
                  <ModalDetailRow label="Total Price">
                    <span className="text-base font-extrabold text-[#0B5D1E]">
                      {selectedReturn.total_price_formatted}
                    </span>
                  </ModalDetailRow>
                  <ModalDetailRow
                    label="Payment Method"
                    value={selectedReturn.payment_method?.toUpperCase()}
                  />
                  <ModalDetailRow
                    label="Payment Status"
                    value={selectedReturn.payment_status}
                    isBadge={true}
                    badgeStyle={
                      selectedReturn.payment_status?.toLowerCase() === "verified" ||
                      selectedReturn.payment_status?.toLowerCase() === "paid"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }
                  />
                </div>

                <div className="border-t border-slate-100 pt-2" />

                {/* ── SECTION 3 — DELIVERY INFORMATION ──────────────────────── */}
                <div className="space-y-1">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                    Delivery Information
                  </div>

                  <ModalDetailRow
                    label="Assigned Driver"
                    value={selectedReturn.driver_display || selectedReturn.driver_name}
                  />
                  <ModalDetailRow
                    label="Receiving Reference No."
                    value={selectedReturn.receiving_reference_no}
                  />
                </div>

                <div className="border-t border-slate-100 pt-2" />

                {/* ── SECTION 4 — RETURNS INFORMATION ───────────────────────── */}
                <div className="space-y-2">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                    Returns Information
                  </div>

                  <ModalDetailRow
                    label="Return Reference No."
                    value={selectedReturn.return_reference_no}
                  />
                  <ModalDetailRow label="Return Quantity">
                    <span className="font-bold text-rose-600">
                      {selectedReturn.quantity_formatted}
                    </span>
                  </ModalDetailRow>
                  <ModalDetailRow label="Total Return Cost">
                    <span className="font-bold text-slate-900">
                      {selectedReturn.total_return_cost_formatted}
                    </span>
                  </ModalDetailRow>
                  <ModalDetailRow label="Available Original Stock">
                    <span
                      className={`font-semibold ${
                        selectedReturn.available_stock < selectedReturn.quantity
                          ? "text-rose-600"
                          : "text-emerald-700"
                      }`}
                    >
                      {selectedReturn.available_stock_formatted}
                    </span>
                  </ModalDetailRow>

                  <div className="pt-1">
                    <div className="text-xs font-medium text-slate-500 mb-1">Reason:</div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {selectedReturn.reason || "No reason specified."}
                    </div>
                  </div>

                  {/* Photo Evidence */}
                  <div className="pt-1">
                    <div className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-slate-400" />
                      <span>Photo Evidence:</span>
                    </div>
                    {selectedReturn.proof ? (
                      <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-h-48 flex items-center justify-center">
                        <img
                          src={selectedReturn.proof}
                          alt="Return proof"
                          className="max-h-48 w-auto object-contain cursor-pointer transition-transform duration-200 group-hover:scale-105"
                          onClick={() => setShowPhotoPreview(selectedReturn.proof)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPhotoPreview(selectedReturn.proof)}
                          className="absolute bottom-2 right-2 rounded-lg bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-xs opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        >
                          View Full Image
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg border border-dashed border-slate-200 text-center text-xs text-slate-400">
                        No photo evidence attached.
                      </div>
                    )}
                  </div>

                  {/* Insufficient Stock Warning */}
                  {selectedReturn.available_stock < selectedReturn.quantity && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-start gap-2 mt-2">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <span>
                        <strong>Insufficient Inventory:</strong> Only{" "}
                        {selectedReturn.available_stock_formatted} available in stock, but return
                        replacement requires {selectedReturn.quantity_formatted}. Approval is
                        blocked until inventory is replenished.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer: Reject (Gray, Left), Approve (Green, Right) */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                <button
                  type="button"
                  onClick={handleOpenRejectionModal}
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <XCircle size={14} />
                  Reject
                </button>

                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={
                    actionLoading || selectedReturn.available_stock < selectedReturn.quantity
                  }
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#0B5D1E] hover:bg-[#084b18] rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    selectedReturn.available_stock < selectedReturn.quantity
                      ? "Cannot approve: insufficient original product stock"
                      : "Approve return request"
                  }
                >
                  {actionLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  Approve
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── Rejection Reason Modal (Strictly unstacked, non-overlapping) ──────── */}
      {selectedReturn && isRejectionModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <h3 className="font-bold text-gray-900 text-base">Rejection Reason</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Specify why return request{" "}
                  <span className="font-semibold text-slate-700">
                    {selectedReturn.return_reference_no}
                  </span>{" "}
                  is being rejected.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Reason for rejection *:
                </label>
                <textarea
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter rejection reason (required)..."
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancelRejection}
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <XCircle size={14} />
                  )}
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── Photo Evidence Fullscreen Lightbox ──────────────────────────────── */}
      {showPhotoPreview &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-pointer"
            onClick={() => setShowPhotoPreview(null)}
          >
            <div
              className="relative max-w-3xl max-h-[90vh] bg-transparent"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={showPhotoPreview}
                alt="Return Photo Proof"
                className="max-h-[85vh] w-auto rounded-xl object-contain shadow-2xl"
              />
              <button
                type="button"
                onClick={() => setShowPhotoPreview(null)}
                className="absolute -top-3 -right-3 rounded-full bg-white text-slate-800 p-1.5 shadow-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}