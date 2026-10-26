import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  ChevronDown,
  X,
  ImageIcon,
  Loader2,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import DateRangePicker from "../../../Components/Minor-Components/DateRangePicker";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import useApi from "../../../Components/hooks/useApi";
import useToast from "../../../Components/hooks/useToast";
import Toast from "../../../Components/Minor-Components/Toast";

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "" },
  { label: "Requested",    value: "requested" },
  { label: "Paid",         value: "paid" },
];

const SORT_OPTIONS = [
  { label: "Sort By",      value: "" },
  { label: "Newest First", value: "newest" },
  { label: "Oldest First", value: "oldest" },
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
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://127.0.0.1:8000"
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
  const displayLabel = selectedOption && selectedOption.value !== "" ? selectedOption.label : label;
  const isSelected = value && value !== "" && value !== "all";

  return (
    <div className="relative w-full sm:w-auto" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors cursor-pointer h-[38px] ${
          isSelected ? "border-emerald-500 text-emerald-700 bg-emerald-50/40" : ""
        }`}
      >
        <span>{displayLabel}</span>
        <ChevronDown
          size={16}
          className={`text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 sm:left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-20 min-w-[160px] animate-in fade-in zoom-in-95 duration-100">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                value === opt.value
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

function groupByDate(rows) {
  if (!rows || rows.length === 0) return [];
  const buckets = {};
  rows.forEach((r) => {
    const rawDate = r.requested_date_iso || r.isoDate || r.requested_date || r.expense_date_iso;
    const d = rawDate ? new Date(rawDate) : new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yest = new Date(today);
    yest.setDate(today.getDate() - 1);
    const dMid = new Date(d);
    dMid.setHours(0, 0, 0, 0);

    let label;
    if (dMid.getTime() === today.getTime()) label = "Today";
    else if (dMid.getTime() === yest.getTime()) label = "Yesterday";
    else {
      label = d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
    if (!buckets[label]) buckets[label] = [];
    buckets[label].push(r);
  });
  return Object.entries(buckets).map(([label, dateRows]) => ({
    label,
    className:
      "bg-[#F0FDF4] border-y border-emerald-100/70 px-4 py-1.5 text-center text-[12px] font-semibold text-emerald-700",
    rows: dateRows,
  }));
}

export default function MillerDriverReimbursementHistory() {
  const { request } = useApi();
  const { toasts, showToast, removeToast } = useToast();

  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [page, setPage] = useState(1);

  // View Details Modal State
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [photoError, setPhotoError] = useState(false);
  const [receiptError, setReceiptError] = useState(false);

  // Fetch Driver Reimbursement History
  const fetchReimbursementHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await request("/miller-employees/driver/reimbursements/history/");
      if (response && response.data) {
        setRecords(response.data);
      } else {
        setRecords([]);
      }
    } catch (err) {
      console.error("Failed to load driver reimbursement history:", err);
      showToast({
        type: "error",
        title: "Load Error",
        message: err.message || "Failed to load reimbursement history from server.",
      });
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [request, showToast]);

  useEffect(() => {
    fetchReimbursementHistory();
  }, [fetchReimbursementHistory]);

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

  const handleDateChange = (range) => {
    if (range.startDate && range.endDate && range.startDate > range.endDate) {
      showToast({
        type: "error",
        title: "Invalid Date Range",
        message: "Start date cannot be after end date.",
      });
      return;
    }
    setDateRange(range);
    setPage(1);
  };

  const handleOpenViewModal = (row) => {
    setSelectedRecord(row);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedRecord(null);
  };

  // Client-side filtering & sorting on actual database records
  const filtered = useMemo(() => {
    if (!Array.isArray(records)) return [];
    const q = query.trim().toLowerCase();

    let result = records.filter((r) => {
      // 1. Search Bar: Search by category, description (plain text), requester, payer, or reference number
      const plainDesc = stripHtml(r.description);
      const searchable = `${r.types || ""} ${r.category || ""} ${plainDesc} ${r.title || ""} ${r.requested_by_name || ""} ${r.requester || ""} ${r.paid_by_name || ""} ${r.paidBy || ""} ${r.request_reference_no || ""}`.toLowerCase();
      const matchesQuery = q === "" || searchable.includes(q);

      // 2. Status Filter: All, Requested, Paid (database values: requested, paid)
      const rStatus = String(r.status_raw || r.status).toLowerCase();
      const matchesStatus =
        !status || rStatus === status.toLowerCase();

      // 3. Date Range: Filter using requested_date
      const dateToCheck = r.isoDate || (r.requested_date_iso ? r.requested_date_iso.slice(0, 10) : "");
      const matchesStart = !dateRange.startDate || (dateToCheck && dateToCheck >= dateRange.startDate);
      const matchesEnd = !dateRange.endDate || (dateToCheck && dateToCheck <= dateRange.endDate);

      return matchesQuery && matchesStatus && matchesStart && matchesEnd;
    });

    // 4. Sorting: Newest First (default) / Oldest First using requested_date
    if (sort === "oldest") {
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
  }, [records, query, status, dateRange, sort]);

  const ITEMS = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS));
  const start = (page - 1) * ITEMS;
  const paginated = filtered.slice(start, start + ITEMS);
  const sections = useMemo(() => groupByDate(paginated), [paginated]);

const getCategoryBadgeClass = (category) => {
  const cat = String(category || "").toLowerCase();
  if (cat.includes("transport") || cat.includes("travel")) {
    return "bg-sky-100 text-sky-700 border border-sky-200";
  }
  if (cat.includes("meal") || cat.includes("allowance") || cat.includes("food")) {
    return "bg-amber-100 text-amber-700 border border-amber-200";
  }
  if (cat.includes("emergency")) {
    return "bg-rose-100 text-rose-700 border border-rose-200";
  }
  if (cat.includes("equipment") || cat.includes("repair")) {
    return "bg-purple-100 text-purple-700 border border-purple-200";
  }
  if (cat.includes("communication")) {
    return "bg-indigo-100 text-indigo-700 border border-indigo-200";
  }
  if (cat.includes("logistic")) {
    return "bg-emerald-100 text-emerald-700 border border-emerald-200";
  }
  if (cat.includes("suppl")) {
    return "bg-teal-100 text-teal-700 border border-teal-200";
  }
  return "bg-slate-100 text-slate-700 border border-slate-200";
};

  const columns = [
    {
      key: "category",
      label: "Expense Category",
      width: "30%",
      renderCell: (r) => {
        const catName = r.types || r.category || "Expense";
        const badgeClass = getCategoryBadgeClass(catName);
        return (
          <div>
            <span
              className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold ${badgeClass}`}
            >
              {catName}
            </span>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              {r.expense_date || r.expenseDate || "N/A"}
            </p>
          </div>
        );
      },
    },
    {
      key: "amount",
      label: "Amount",
      width: "20%",
      renderCell: (r) => (
        <span className="font-bold text-gray-900 text-xs">
          {r.price || r.amount || "₱0.00"}
        </span>
      ),
    },
    {
      key: "paidBy",
      label: "Paid By",
      width: "20%",
      renderCell: (r) => (
        <span className="text-xs font-semibold text-gray-700">
          {r.paid_by_name || r.paidBy || "N/A"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: "15%",
      headerClassName: "text-center",
      cellClassName: "text-center",
      renderCell: (r) => {
        const isPaid = String(r.status_raw || r.status).toLowerCase() === "paid";
        return (
          <span
            className={`inline-block px-3 py-0.5 rounded-full text-[10px] font-bold ${
              isPaid
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {isPaid ? "Paid" : "Requested"}
          </span>
        );
      },
    },
    {
      key: "action",
      label: "Action",
      width: "15%",
      headerClassName: "text-center",
      cellClassName: "text-center",
      renderCell: (r) => (
        <button
          type="button"
          onClick={() => handleOpenViewModal(r)}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-medium text-gray-700 transition hover:bg-slate-50 cursor-pointer"
        >
          View Details
        </button>
      ),
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
      {/* ── Breadcrumbs & Title ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "History" }, { label: "Reimbursement History" }]} />
        <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold tracking-tight text-slate-900">
          Reimbursement History
        </h2>
        <p className="text-sm text-slate-500">
          Review your submitted driver and delivery reimbursement requests.
        </p>
      </div>

      {/* ── Toolbar Layout (Search + Filter Selectors) ────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search category, description, or reference no..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#0B5D1E] focus:border-[#0B5D1E] outline-none bg-white placeholder-gray-400 text-gray-700 h-[38px]"
          />
        </div>

        <DateRangePicker onDateChange={handleDateChange} />

        <CustomDropdown
          label="All Statuses"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={STATUS_OPTIONS}
        />

        <CustomDropdown
          label="Sort By"
          value={sort}
          onChange={(v) => {
            setSort(v);
            setPage(1);
          }}
          options={SORT_OPTIONS}
        />
      </div>

      {/* ── Reimbursement History Table ────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 shadow-xs">
          <Loader2 size={32} className="text-emerald-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-600">Loading reimbursement history...</p>
        </div>
      ) : (
        <SectionedTableCard
          columns={columns}
          sections={sections}
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          footerLabel={`Showing ${filtered.length > 0 ? start + 1 : 0}–${Math.min(
            start + paginated.length,
            filtered.length
          )} of ${filtered.length} reimbursement records`}
          emptyStateTitle="No Reimbursement Records Found"
          emptyStateDescription="You haven't submitted any reimbursement requests yet, or no records match your filter criteria."
        />
      )}

      {/* ── View Details Modal ─────────────────────────────────────────────── */}
      {isViewModalOpen && selectedRecord && (
        createPortal(
          <div
            className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header: request_reference_no, Top-right X only, NO bottom close, NO backdrop dismiss */}
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

                  {/* Description — clean bordered multiline box with formatted rich text */}
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

                  <ModalDetailRow label="Types (Expense Category)">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold ${getCategoryBadgeClass(
                        selectedRecord.types || selectedRecord.category
                      )}`}
                    >
                      {selectedRecord.types || selectedRecord.category || "Expense"}
                    </span>
                  </ModalDetailRow>
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

                  {/* Photo Evidence (centered image, preserve proportions, no stretching) */}
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

                  {/* Receipt Photo (centered image, same presentation as Photo Evidence) */}
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