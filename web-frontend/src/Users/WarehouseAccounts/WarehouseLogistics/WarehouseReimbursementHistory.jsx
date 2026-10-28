import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Calendar,
  ChevronDown,
  ChevronUp,
  X,
  ImageIcon,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import useApi from "../../../Components/hooks/useApi";
import useToast from "../../../Components/hooks/useToast";
import Toast from "../../../Components/Minor-Components/Toast";

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "requested", label: "Requested" },
  { value: "paid", label: "Paid" },
];

const SORT_OPTIONS = [
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc", label: "Oldest First" },
];

const resolveMediaUrl = (raw) => {
  if (!raw) return null;
  const trimmed = String(raw).trim();
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
  const clean = trimmed.replace(/^\/?(media\/)?/, "");
  const backendBase = (
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
  ).replace(/\/$/, "");
  return `${backendBase}/media/${clean}`;
};

const stripHtml = (html) => (html || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim();

const hasVisibleContent = (htmlString) => {
  if (!htmlString || typeof htmlString !== "string") return false;
  return stripHtml(htmlString).length > 0;
};

const sanitizeHtml = (rawHtml) => {
  if (!rawHtml || typeof rawHtml !== "string") return "";
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, "text/html");

    const ALLOWED_TAGS = new Set([
      "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "DEL",
      "P", "DIV", "SPAN", "BR", "HR",
      "H1", "H2", "H3", "H4", "H5", "H6",
      "UL", "OL", "LI",
      "A", "BLOCKQUOTE", "CODE", "PRE"
    ]);

    const ALLOWED_STYLES = new Set([
      "text-align", "font-weight", "font-style", "text-decoration", "color"
    ]);

    const cleanNode = (node) => {
      const children = Array.from(node.childNodes);
      for (const child of children) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          if (!ALLOWED_TAGS.has(child.tagName)) {
            const textNode = doc.createTextNode(child.textContent);
            child.parentNode.replaceChild(textNode, child);
          } else {
            const attrs = Array.from(child.attributes);
            for (const attr of attrs) {
              const attrName = attr.name.toLowerCase();
              if (attrName === "style") {
                const cleanStyles = [];
                const styleObj = child.style;
                for (let i = 0; i < styleObj.length; i++) {
                  const prop = styleObj[i];
                  if (ALLOWED_STYLES.has(prop)) {
                    cleanStyles.push(`${prop}: ${styleObj.getPropertyValue(prop)}`);
                  }
                }
                if (cleanStyles.length > 0) {
                  child.setAttribute("style", cleanStyles.join("; "));
                } else {
                  child.removeAttribute("style");
                }
              } else if (attrName === "href" && child.tagName === "A") {
                const href = attr.value.trim();
                if (/^(https?:|\/|mailto:)/i.test(href)) {
                  child.setAttribute("href", href);
                  child.setAttribute("target", "_blank");
                  child.setAttribute("rel", "noopener noreferrer");
                } else {
                  child.removeAttribute("href");
                }
              } else {
                child.removeAttribute(attr.name);
              }
            }
            cleanNode(child);
          }
        }
      }
    };

    cleanNode(doc.body);
    return doc.body.innerHTML;
  } catch {
    return rawHtml;
  }
};

function CustomDropdown({ label, options, value, onChange, minWidth = "min-w-[140px]" }) {
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
        className={`flex items-center gap-2 border border-gray-200 bg-white px-3.5 py-2 rounded-xl text-sm font-medium text-slate-800 hover:bg-gray-50 transition-colors cursor-pointer h-[38px] justify-between w-full sm:w-auto ${minWidth}`}
      >
        <span className="truncate max-w-[170px]">{displayLabel}</span>
        {isOpen ? (
          <ChevronUp size={16} className="text-slate-500 shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-slate-500 shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 bg-white border border-gray-100 rounded-2xl shadow-xl p-1.5 z-30 min-w-52 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
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

function ModalDetailRow({ label, value, children }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-xs sm:text-sm">
      <span className="text-slate-500 font-medium">{label}</span>
      {children ? (
        children
      ) : (
        <span className="font-semibold text-slate-800 text-right">{value || "N/A"}</span>
      )}
    </div>
  );
}

export default function WarehouseReimbursementHistory() {
  const { request } = useApi();
  const { toasts, showToast, removeToast } = useToast();

  const showToastRef = useRef(showToast);
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  const [records, setRecords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [tempDateRange, setTempDateRange] = useState({ startDate: "", endDate: "" });
  const [currentPage, setCurrentPage] = useState(1);

  // Date picker dropdown
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateRef = useRef(null);

  // View Details Modal State
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [photoError, setPhotoError] = useState(false);
  const [receiptError, setReceiptError] = useState(false);

  // Fetch Categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await request("/warehouse/logistics/reimbursements/categories/");
      if (response && response.categories) {
        setCategories(response.categories);
      }
    } catch (err) {
      console.warn("Failed to fetch reimbursement categories:", err);
    }
  }, [request]);

  // Fetch Reimbursement History
  const fetchReimbursementHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await request("/warehouse/logistics/reimbursements/history/");
      if (response && response.data) {
        setRecords(response.data);
      } else {
        setRecords([]);
      }
    } catch (err) {
      console.error("Failed to load reimbursement history:", err);
      showToastRef.current?.({
        type: "error",
        title: "Error",
        message: err.message || "Failed to load reimbursement history from server.",
      });
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [request]);

  useEffect(() => {
    fetchCategories();
    fetchReimbursementHistory();
  }, [fetchCategories, fetchReimbursementHistory]);

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dateRef.current && !dateRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isViewModalOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isViewModalOpen]);

  // Reset image errors when selectedRecord changes
  useEffect(() => {
    setPhotoError(false);
    setReceiptError(false);
  }, [selectedRecord]);

  const handleDateApply = () => {
    if (tempDateRange.startDate && tempDateRange.endDate && tempDateRange.startDate > tempDateRange.endDate) {
      showToast({
        type: "error",
        title: "Invalid Date Range",
        message: "Start date cannot be after end date.",
      });
      return;
    }
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

  const handleOpenViewModal = (row) => {
    setSelectedRecord(row);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedRecord(null);
  };

  // Build Category Dropdown Options
  const categoryOptions = useMemo(() => {
    const opts = [{ value: "all", label: "All Categories" }];
    if (Array.isArray(categories)) {
      categories.forEach((cat) => {
        opts.push({ value: cat, label: cat });
      });
    }
    return opts;
  }, [categories]);

  // Client-side filtering & sorting on live records
  const filtered = useMemo(() => {
    if (!Array.isArray(records)) return [];
    const q = query.trim().toLowerCase();
    let result = records.filter((r) => {
      const plainDesc = stripHtml(r.description);
      const searchable = `${r.types || ""} ${r.category || ""} ${plainDesc} ${r.title || ""} ${r.requested_by_name || ""} ${r.requester || ""} ${r.requestedBy || ""} ${r.request_reference_no || ""}`.toLowerCase();
      const matchesQuery = q === "" || searchable.includes(q);

      const rStatus = String(r.status_raw || r.status).toLowerCase();
      const matchesStatus =
        statusFilter === "all" || rStatus === statusFilter.toLowerCase();

      const rCategory = String(r.types || r.category || "").toLowerCase();
      const matchesCategory =
        categoryFilter === "all" || rCategory === categoryFilter.toLowerCase();

      const dateToCheck = r.isoDate || (r.requested_date_iso ? r.requested_date_iso.slice(0, 10) : "");
      const matchesStart = !dateRange.startDate || (dateToCheck && dateToCheck >= dateRange.startDate);
      const matchesEnd = !dateRange.endDate || (dateToCheck && dateToCheck <= dateRange.endDate);

      return matchesQuery && matchesStatus && matchesCategory && matchesStart && matchesEnd;
    });

    if (sortBy === "date-asc") {
      result.sort((a, b) =>
        (a.requested_date_iso || a.isoDate || "").localeCompare(
          b.requested_date_iso || b.isoDate || ""
        )
      );
    } else {
      result.sort((a, b) =>
        (b.requested_date_iso || b.isoDate || "").localeCompare(
          a.requested_date_iso || a.isoDate || ""
        )
      );
    }

    return result;
  }, [records, query, statusFilter, categoryFilter, dateRange, sortBy]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);
  const sections = useMemo(() => [{ rows: paginated }], [paginated]);

  const columns = [
    { key: "category", label: "Expense Category", width: "20%" },
    { key: "amount", label: "Amount", width: "16%" },
    { key: "requestedBy", label: "Requested By", width: "20%" },
    {
      key: "expense_date",
      label: "Expense Date",
      width: "18%",
      render: (row) => row.expense_date || row.expenseDate || "N/A",
    },
    {
      key: "status",
      label: "Status",
      width: "12%",
      render: (row) => {
        const isPaid = String(row.status_raw || row.status).toLowerCase() === "paid";
        const badgeStyles = isPaid
          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
          : "bg-amber-100 text-amber-800 border-amber-200";
        return (
          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badgeStyles}`}>
            {isPaid ? "Paid" : "Requested"}
          </span>
        );
      },
    },
    {
      key: "action",
      label: "Action",
      width: "14%",
      headerClassName: "text-center",
      cellClassName: "!text-center",
    },
  ];

  const photoEvidenceUrl = selectedRecord
    ? resolveMediaUrl(selectedRecord.photo_evidence_url || selectedRecord.photo_evidence)
    : null;
  const receiptPhotoUrl = selectedRecord
    ? resolveMediaUrl(selectedRecord.receipt_photo_url || selectedRecord.receipt_photo)
    : null;

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Page Header ───────────────────────────────────────── */}
      <Breadcrumbs
        items={[
          { label: "Finance", path: "/warehouse-logistics/reimbursement" },
          { label: "Reimbursement History" },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Reimbursement History
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            View submitted reimbursement requests and their payment status.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchReimbursementHistory}
          disabled={isLoading}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
          title="Refresh reimbursement history"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin text-emerald-600" : "text-slate-500"} />
          <span>Refresh</span>
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
              setCurrentPage(1);
            }}
            placeholder="Search category, description, requester"
            className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-white placeholder-gray-400 text-gray-700 h-[38px]"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCurrentPage(1);
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
            <Calendar size={16} className={dateRange.startDate ? "text-emerald-600" : "text-gray-500"} />
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
                    min={tempDateRange.startDate || undefined}
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

        {/* 3. Category Dropdown */}
        <CustomDropdown
          label="All Categories"
          options={categoryOptions}
          value={categoryFilter}
          onChange={(v) => {
            setCategoryFilter(v);
            setCurrentPage(1);
          }}
          minWidth="min-w-[160px]"
        />

        {/* 4. Status Dropdown (All, Requested, Paid) */}
        <CustomDropdown
          label="All Status"
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setCurrentPage(1);
          }}
          minWidth="min-w-[130px]"
        />

        {/* 5. Sort Dropdown (Newest First / Oldest First) */}
        <CustomDropdown
          label="Sort By"
          options={SORT_OPTIONS}
          value={sortBy}
          onChange={(v) => {
            setSortBy(v);
            setCurrentPage(1);
          }}
          minWidth="min-w-[140px]"
        />
      </div>

      {/* ── Table Card ────────────────────────────────────────────────── */}
      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(p) => setCurrentPage(p)}
        onViewDetails={(row) => handleOpenViewModal(row)}
        viewDetailsLabel="View Details"
        emptyStateTitle="No reimbursement records found"
        emptyStateDescription="No reimbursement requests match your active filters or search terms."
        footerLabel={`Showing ${
          filtered.length === 0 ? 0 : startIndex + 1
        }-${Math.min(startIndex + itemsPerPage, filtered.length)} of ${
          filtered.length
        } reimbursement requests`}
      />

      {/* ── View Details Modal ────────────────────────────────────────── */}
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
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {selectedRecord.request_reference_no || "Reimbursement Details"}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">Reimbursement Details</p>
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
                {/* ── SECTION 1 — REIMBURSEMENT INFORMATION ───────────────────── */}
                <div className="space-y-1">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                    <span>Reimbursement Information</span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        String(selectedRecord.status_raw || selectedRecord.status).toLowerCase() === "paid"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {String(selectedRecord.status_raw || selectedRecord.status).toLowerCase() === "paid"
                        ? "Paid"
                        : "Requested"}
                    </span>
                  </div>

                  <ModalDetailRow label="Title" value={selectedRecord.title} />

                  {/* Description */}
                  <div className="py-1.5 text-xs sm:text-sm">
                    <span className="text-slate-500 font-medium block mb-1">Description</span>
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-xs sm:text-sm leading-relaxed max-h-36 overflow-y-auto break-words space-y-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-bold [&_h3]:text-xs [&_h3]:font-semibold [&_p]:my-0.5">
                      {hasVisibleContent(selectedRecord.description) ? (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: sanitizeHtml(selectedRecord.description),
                          }}
                        />
                      ) : (
                        <span className="text-slate-400 italic">No description provided</span>
                      )}
                    </div>
                  </div>

                  <ModalDetailRow
                    label="Types (Expense Category)"
                    value={selectedRecord.types || selectedRecord.category}
                  />
                  <ModalDetailRow label="Price">
                    <span className="text-base font-extrabold text-[#0B5D1E]">
                      {selectedRecord.price || selectedRecord.amount || "₱0.00"}
                    </span>
                  </ModalDetailRow>
                  <ModalDetailRow label="Requested Date" value={selectedRecord.requested_date} />
                  <ModalDetailRow
                    label="Expense Date"
                    value={selectedRecord.expense_date || selectedRecord.expenseDate || "N/A"}
                  />

                  {/* Photo Evidence */}
                  <div className="pt-2">
                    <span className="text-slate-500 font-medium text-xs block mb-1.5">
                      Photo Evidence
                    </span>
                    {photoEvidenceUrl && !photoError ? (
                      <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 p-2 flex items-center justify-center max-h-64">
                        <img
                          src={photoEvidenceUrl}
                          alt="Photo Evidence"
                          className="max-h-60 object-contain mx-auto rounded-lg"
                          onError={() => setPhotoError(true)}
                        />
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 flex flex-col items-center justify-center text-center">
                        <ImageIcon size={22} className="text-slate-400 mb-1" />
                        <span className="text-xs font-semibold text-slate-600">
                          No Photo Evidence Attached
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Reimbursement request has no attached photo
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100 pt-2" />

                {/* ── SECTION 2 — PAYMENT INFORMATION ─────────────────────────── */}
                <div className="space-y-1">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                    Payment Information
                  </div>

                  <ModalDetailRow
                    label="Paid By"
                    value={selectedRecord.paid_by_name || "N/A"}
                  />
                  <ModalDetailRow
                    label="Date of Payment"
                    value={selectedRecord.paid_date || "N/A"}
                  />
                  <ModalDetailRow
                    label="Method"
                    value={selectedRecord.method || "N/A"}
                  />
                  <ModalDetailRow
                    label="Payment Reference No."
                    value={selectedRecord.payment_reference_no || "N/A"}
                  />

                  {/* Receipt Photo */}
                  <div className="pt-2">
                    <span className="text-slate-500 font-medium text-xs block mb-1.5">
                      Receipt Photo
                    </span>
                    {receiptPhotoUrl && !receiptError ? (
                      <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 p-2 flex items-center justify-center max-h-64">
                        <img
                          src={receiptPhotoUrl}
                          alt="Receipt Photo"
                          className="max-h-60 object-contain mx-auto rounded-lg"
                          onError={() => setReceiptError(true)}
                        />
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 flex flex-col items-center justify-center text-center">
                        <ImageIcon size={22} className="text-slate-400 mb-1" />
                        <span className="text-xs font-semibold text-slate-600">
                          No Receipt Photo Attached
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Payment details do not contain a receipt image
                        </span>
                      </div>
                    )}
                  </div>
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