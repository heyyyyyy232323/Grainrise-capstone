import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Calendar,
  ChevronDown,
  ChevronUp,
  X,
  UserCheck,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import useApi from "../../../Components/hooks/useApi";
import useToast from "../../../Components/hooks/useToast";
import Toast from "../../../Components/Minor-Components/Toast";

// ─── Filter & Sort Configurations ──────────────────────────────────────────

const BUYER_TYPE_OPTIONS = [
  { value: "all", label: "All Buyers" },
  { value: "retailer", label: "Retailer" },
  { value: "warehouse", label: "Warehouse" },
];

const SORT_OPTIONS = [
  { value: "variant-asc", label: "Variant (A-Z)" },
  { value: "variant-desc", label: "Variant (Z-A)" },
  { value: "customer-asc", label: "Customer Name (A-Z)" },
  { value: "customer-desc", label: "Customer Name (Z-A)" },
  { value: "delivered-desc", label: "Delivered Qty (Highest)" },
  { value: "delivered-asc", label: "Delivered Qty (Lowest)" },
  { value: "passed-desc", label: "Passed QC (Highest)" },
  { value: "passed-asc", label: "Passed QC (Lowest)" },
  { value: "failed-desc", label: "Failed QC (Highest)" },
  { value: "failed-asc", label: "Failed QC (Lowest)" },
  { value: "cost-desc", label: "Cost (Highest)" },
  { value: "cost-asc", label: "Cost (Lowest)" },
  { value: "branch-asc", label: "Branch Name (A-Z)" },
  { value: "branch-desc", label: "Branch Name (Z-A)" },
];

// ─── Modal Detail Row Sub-Component ───────────────────────────────────────────
function ModalDetailRow({ label, value, isBadge = false, badgeStyle = "", children }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-xs sm:text-sm">
      <span className="text-slate-500 font-medium shrink-0 pt-0.5">{label}:</span>
      {children ? (
        <div className="text-right flex-1 flex justify-end">{children}</div>
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

// ─── Custom Dropdown ──────────────────────────────────────────────────────────
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
        <span className="truncate max-w-[150px]">{displayLabel}</span>
        {isOpen ? (
          <ChevronUp size={16} className="text-slate-500 shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-slate-500 shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 bg-white border border-gray-100 rounded-2xl shadow-xl p-1.5 z-30 w-56 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
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
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer truncate ${
                    isSelected
                      ? "bg-[#EAF5ED] text-[#0B5D1E] font-semibold"
                      : "text-slate-700 hover:bg-gray-50"
                  }`}
                  title={opt.label}
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MillerFulfillmentHistory() {
  const { request } = useApi();
  const { toasts, removeToast } = useToast();

  // Data & Loading States
  const [branches, setBranches] = useState([]);
  const [records, setRecords] = useState([]);
  const [variantsList, setVariantsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Filters & Pagination
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [query, setQuery] = useState("");
  const [variantFilter, setVariantFilter] = useState("all");
  const [buyerTypeFilter, setBuyerTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("variant-asc");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [tempDateRange, setTempDateRange] = useState({ startDate: "", endDate: "" });
  const [page, setPage] = useState(1);

  // Date Range Picker Dropdown
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateRef = useRef(null);

  // View Details Modal State
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Outside click listener for Date Range Picker
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dateRef.current && !dateRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. Fetch Manager Branches on Mount
  const fetchBranches = useCallback(async () => {
    try {
      const res = await request("/miller/branches/", { method: "GET" });
      const branchList = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.branches)
        ? res.branches
        : [];
      if (branchList.length > 0) {
        setBranches(branchList);
      }
    } catch (err) {
      console.warn("Could not fetch branches from /miller/branches/:", err);
    }
  }, [request]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // 2. Fetch Variants for Filter
  const fetchVariants = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedBranch && selectedBranch !== "all") {
        params.append("branch_id", selectedBranch);
      }
      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await request(`/miller/fulfillment-history/variants/${qs}`, { method: "GET" });
      const list = Array.isArray(res?.variants)
        ? res.variants
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [];
      if (list.length > 0) {
        setVariantsList(list);
      }
    } catch (err) {
      console.warn("Could not fetch fulfillment variants:", err);
    }
  }, [request, selectedBranch]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  // 3. Fetch Fulfillment History from Backend
  const fetchFulfillmentHistory = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (selectedBranch && selectedBranch !== "all") {
        params.append("branch_id", selectedBranch);
      }
      if (query.trim()) params.append("search", query.trim());
      if (variantFilter && variantFilter !== "all") params.append("variant", variantFilter);
      if (buyerTypeFilter && buyerTypeFilter !== "all") params.append("buyer_type", buyerTypeFilter);
      if (sortBy) params.append("sort", sortBy);
      if (dateRange.startDate) params.append("start_date", dateRange.startDate);
      if (dateRange.endDate) params.append("end_date", dateRange.endDate);

      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await request(`/miller/fulfillment-history/${qs}`, { method: "GET" });

      if (res && (res.success || Array.isArray(res.fulfillments) || Array.isArray(res.data) || Array.isArray(res))) {
        setRecords(res.fulfillments || res.data || (Array.isArray(res) ? res : []));
      } else {
        throw new Error(res?.message || res?.error || "Failed to load fulfillment history.");
      }
    } catch (err) {
      console.error("Error fetching fulfillment history:", err);
      setFetchError(err.message || "Failed to load fulfillment history.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [request, selectedBranch, query, variantFilter, buyerTypeFilter, sortBy, dateRange]);

  useEffect(() => {
    fetchFulfillmentHistory();
  }, [fetchFulfillmentHistory]);

  // Date Range Picker Handlers with Start/End Validation
  const handleStartDateChange = (val) => {
    setTempDateRange((prev) => {
      const next = { ...prev, startDate: val };
      if (next.endDate && val > next.endDate) {
        next.endDate = "";
      }
      return next;
    });
  };

  const handleEndDateChange = (val) => {
    setTempDateRange((prev) => ({ ...prev, endDate: val }));
  };

  const handleDateApply = () => {
    if (
      tempDateRange.startDate &&
      tempDateRange.endDate &&
      tempDateRange.startDate > tempDateRange.endDate
    ) {
      return;
    }
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

  // Open / Close View Details Modal
  const handleOpenViewDetails = (row) => {
    setSelectedRecord(row);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedRecord(null);
  };

  // Branch Options for Dropdown (Listing ALL branches owned by Manager)
  const branchOptions = useMemo(() => {
    const opts = [{ value: "all", label: "All Branches" }];
    branches.forEach((b) => {
      const bId = String(b.id || b.supplier_profile_id);
      const bName = b.business_name || b.name || `Branch #${bId}`;
      opts.push({ value: bId, label: bName });
    });
    return opts;
  }, [branches]);

  // Variant Dropdown Options
  const variantOptions = useMemo(() => {
    const opts = [{ value: "all", label: "All Variants" }];
    const unique = new Set(variantsList);
    unique.forEach((v) => {
      opts.push({ value: v, label: v });
    });
    return opts;
  }, [variantsList]);

  // Table Columns Definition: Branch Name as FIRST column
  const columns = [
    {
      key: "branch",
      label: "Branch Name",
      width: "16%",
      renderCell: (row) => row.branch || row.branch_name || row.branchName || "—",
    },
    {
      key: "variant",
      label: "Variant",
      width: "16%",
      renderCell: (row) => row.variant || row.product_name || "—",
    },
    {
      key: "customer",
      label: "Customer Name",
      width: "20%",
      renderCell: (row) =>
        row.customer ||
        row.customer_name ||
        row.customerName ||
        row.buyer_name ||
        "—",
    },
    {
      key: "delivered",
      label: "Delivered (kg)",
      width: "14%",
      renderCell: (row) => row.delivered || row.total_received_formatted || "0 kg",
    },
    {
      key: "passed",
      label: "Passed QC (kg)",
      width: "14%",
      renderCell: (row) => row.passed || row.received_good_formatted || "0 kg",
    },
    {
      key: "failed",
      label: "Failed QC (kg)",
      width: "14%",
      renderCell: (row) => row.failed || row.received_bad_formatted || "0 kg",
    },
    {
      key: "action",
      label: "Action",
      width: "10%",
      headerClassName: "text-center",
      cellClassName: "!text-center",
    },
  ];

  // Client Pagination
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(records.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginated = records.slice(startIndex, startIndex + itemsPerPage);
  const sections = useMemo(() => [{ rows: paginated }], [paginated]);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "History" },
          { label: "Fulfillment History" },
        ]}
      />

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Fulfillment History
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          View completed fulfillment and delivery records.
        </p>
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
            placeholder="Search order no., batch no., product, or customer"
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
                    onChange={(e) => handleStartDateChange(e.target.value)}
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
                    onChange={(e) => handleEndDateChange(e.target.value)}
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

        {/* 3. Branch Filter Dropdown (Listing ALL branches owned by Manager) */}
        <CustomDropdown
          label="All Branches"
          options={branchOptions}
          value={selectedBranch}
          onChange={(b) => {
            setSelectedBranch(b);
            setPage(1);
          }}
        />

        {/* 4. Variants Filter Dropdown */}
        <CustomDropdown
          label="All Variants"
          options={variantOptions}
          value={variantFilter}
          onChange={(v) => {
            setVariantFilter(v);
            setPage(1);
          }}
        />

        {/* 5. Buyer Type Filter Dropdown */}
        <CustomDropdown
          label="All Buyers"
          options={BUYER_TYPE_OPTIONS}
          value={buyerTypeFilter}
          onChange={(v) => {
            setBuyerTypeFilter(v);
            setPage(1);
          }}
        />

        {/* 6. Sort Dropdown */}
        <CustomDropdown
          label="Sort By"
          options={SORT_OPTIONS}
          value={sortBy}
          onChange={(v) => {
            setSortBy(v);
            setPage(1);
          }}
        />

        {/* 7. Refresh Button */}
        <button
          type="button"
          onClick={fetchFulfillmentHistory}
          disabled={loading}
          className="flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-gray-50 transition cursor-pointer h-[38px]"
          title="Refresh fulfillment records"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-emerald-600" : ""} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Error Banner */}
      {fetchError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={fetchFulfillmentHistory}
            className="flex items-center gap-1 font-bold underline hover:text-rose-900 cursor-pointer"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* Table Card */}
      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={setPage}
        onViewDetails={handleOpenViewDetails}
        viewDetailsLabel="View Details"
        emptyStateTitle={loading ? "Loading fulfillment records..." : "No fulfillment records found"}
        emptyStateDescription={
          loading
            ? "Fetching fulfillment and receiving history from server..."
            : "There are no receiving or fulfillment history records for your branches yet. Completed deliveries confirmed by buyers will appear here."
        }
        footerLabel={`Showing ${
          records.length === 0 ? 0 : startIndex + 1
        }-${Math.min(startIndex + itemsPerPage, records.length)} of ${
          records.length
        } fulfillment records`}
      />

      {/* ── View Details Modal (Matching FLC UI) ──────────────────────────── */}
      {isViewModalOpen && selectedRecord && (
        createPortal(
          <div
            className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header: Receiving Reference No. as Title, Top-right X only, NO backdrop dismissal */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {selectedRecord.receiving_reference_no || selectedRecord.reference_no}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">Order Fulfillment Details</p>
                </div>

                <button
                  type="button"
                  onClick={handleCloseViewModal}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  aria-label="Close modal"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-90px)] space-y-4">
                {/* ── SECTION 1 — ONLINE ORDERS INFORMATION ───────────────────── */}
                <div className="space-y-1">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                    <span>Online Orders Information</span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        selectedRecord.customer_type === "Warehouse"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {selectedRecord.customer_type}
                    </span>
                  </div>

                  <ModalDetailRow
                    label="Branch"
                    value={selectedRecord.branch_name || selectedRecord.branch}
                  />
                  <ModalDetailRow label="Batch No." value={selectedRecord.batch_no} />
                  <ModalDetailRow label="Customer Name" value={selectedRecord.customer_name} />
                  <ModalDetailRow label="Customer Type" value={selectedRecord.customer_type} />
                  <ModalDetailRow
                    label="Variant"
                    value={selectedRecord.variant || selectedRecord.product_name}
                  />
                  <ModalDetailRow
                    label="Ordered Quantity"
                    value={selectedRecord.ordered_quantity_formatted}
                  />
                  <ModalDetailRow
                    label="Unit Cost"
                    value={selectedRecord.unit_cost_formatted}
                  />
                  <ModalDetailRow label="Total">
                    <span className="text-base font-extrabold text-[#0B5D1E]">
                      {selectedRecord.total_price_formatted}
                    </span>
                  </ModalDetailRow>
                  <ModalDetailRow
                    label="Expected Arrival Date"
                    value={selectedRecord.expected_arrival_date_formatted}
                  />
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100 pt-2" />

                {/* ── SECTION 2 — DELIVERY ASSIGNEE INFORMATION ───────────────── */}
                <div className="space-y-1">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                    Delivery Assignee Information
                  </div>

                  <ModalDetailRow label="Assigned Driver">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-right">
                      <UserCheck size={14} className="text-emerald-600 shrink-0" />
                      <span>{selectedRecord.assigned_driver || "Unassigned"}</span>
                    </div>
                  </ModalDetailRow>
                  <ModalDetailRow
                    label="Assigned Vehicle Model"
                    value={selectedRecord.assigned_vehicle_model || selectedRecord.vehicle_model}
                  />
                  <ModalDetailRow
                    label="Plate Number"
                    value={selectedRecord.plate_number}
                  />
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100 pt-2" />

                {/* ── SECTION 3 — RECEIVING INFORMATION ───────────────────────── */}
                <div className="space-y-1">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                    Receiving Information
                  </div>

                  <ModalDetailRow
                    label="Total Received"
                    value={selectedRecord.total_received_formatted || selectedRecord.delivered}
                  />
                  <ModalDetailRow
                    label="Good"
                    value={selectedRecord.received_good_formatted || selectedRecord.passed}
                  />
                  <ModalDetailRow
                    label="Bad"
                    value={selectedRecord.received_bad_formatted || selectedRecord.failed}
                  />
                  <ModalDetailRow
                    label="Quantity to Pay"
                    value={selectedRecord.quantity_to_pay_formatted || selectedRecord.passed}
                  />
                  <ModalDetailRow
                    label="Status"
                    value={selectedRecord.status}
                    isBadge={true}
                    badgeStyle={
                      String(selectedRecord.status).toLowerCase() === "paid"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    }
                  />
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      )}

      {/* Toast Notifications */}
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}