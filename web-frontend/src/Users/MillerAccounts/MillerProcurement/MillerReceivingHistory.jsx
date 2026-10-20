import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, ChevronDown } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import ToastNotification from "../../../Components/Modals/Toast";
import useReceivingHistory from "../../../Components/hooks/MillerProcurement/useReceivingHistory";
import ReceivingHistoryDetailsModal from "../../../Components/Modals/MillerProcurement/ReceivingHistoryDetailsModal";

const ITEMS_PER_PAGE = 10;

const SORT_OPTIONS = [
  { value: "newest", label: "Sort By" },
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "batch_asc", label: "Batch No. (A-Z)" },
  { value: "batch_desc", label: "Batch No. (Z-A)" },
];

const QC_STATUS_OPTIONS = [
  { value: "all", label: "QC Status" },
  { value: "Passed", label: "Passed" },
  { value: "Partial", label: "Partial" },
  { value: "Failed", label: "Failed" },
];

// Helper to determine QC status (Passed, Partial, Failed)
const determineQcStatus = (row) => {
  if (row.qc_status) {
    const s = String(row.qc_status).trim().toLowerCase();
    if (s.includes("part")) return "Partial";
    if (s.includes("fail") || s.includes("reject")) return "Failed";
    if (s.includes("pass")) return "Passed";
    return row.qc_status;
  }

  const orderStatus = String(row.order_status || row.status || "").toLowerCase();
  const good = parseFloat(String(row.received_good || "0").replace(/,/g, "")) || 0;
  const bad = parseFloat(String(row.received_bad || "0").replace(/,/g, "")) || 0;

  if (orderStatus.includes("fail") || (bad > 0 && good === 0)) {
    return "Failed";
  }
  if (orderStatus.includes("partial") || (bad > 0 && good > 0)) {
    return "Partial";
  }
  return "Passed";
};

// Formats quantity to e.g. "20,000 kg"
const formatQuantityKg = (row) => {
  if (row.total_received_formatted) {
    return row.total_received_formatted;
  }
  const raw = row.total_received ?? row.total_received_kg ?? row.ordered_quantity;
  if (raw === null || raw === undefined || raw === "") return "—";

  const num = parseFloat(String(raw).replace(/,/g, ""));
  if (isNaN(num)) return `${raw} kg`;
  return `${num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kg`;
};

// Formats date into "Month Day, Year" or "Today" / "Yesterday"
function groupRowsByReceivingDate(rows) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const groups = {};
  const order = [];

  rows.forEach((row) => {
    const rawDate =
      row.raw_received_date ||
      (row.raw_received_at ? row.raw_received_at.split("T")[0].split(" ")[0] : "");

    let label = row.received_date_formatted || rawDate;

    if (rawDate === todayStr) {
      label = "Today";
    } else if (rawDate === yesterdayStr) {
      label = "Yesterday";
    } else if (rawDate) {
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          label = d.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          });
        }
      } catch {}
    }

    if (!groups[label]) {
      groups[label] = [];
      order.push(label);
    }
    groups[label].push(row);
  });

  return order.map((label) => ({
    label,
    className: "bg-[#F0FDF4] border-y border-emerald-100/70 px-4 py-1.5 text-center text-xs font-semibold text-emerald-700",
    rows: groups[label],
  }));
}

const MillerReceivingHistory = () => {
  const {
    fetchReceivingHistory,
    fetchReceivingDetail,
    loading,
  } = useReceivingHistory({ isManager: false });

  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [qcStatusFilter, setQcStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Load receiving records from backend
  const loadHistory = useCallback(async () => {
    try {
      const data = await fetchReceivingHistory({
        search,
        sortBy,
      });
      setRecords(data);
    } catch {
      // Handled in hook
    }
  }, [fetchReceivingHistory, search, sortBy]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Reset pagination on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, qcStatusFilter, sortBy]);

  // Filter case-insensitively across search parameters and QC status
  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();

    return records.filter((item) => {
      // QC Status Filter
      if (qcStatusFilter && qcStatusFilter !== "all") {
        const itemQc = determineQcStatus(item);
        if (itemQc.toLowerCase() !== qcStatusFilter.toLowerCase()) {
          return false;
        }
      }

      if (!term) return true;

      const batchNo = String(item.batch_no || "").toLowerCase();
      const supplier = String(item.supplier || "").toLowerCase();
      const variant = String(item.variant || item.product_name || "").toLowerCase();
      const refNo = String(item.receiving_reference_no || "").toLowerCase();

      return (
        batchNo.includes(term) ||
        supplier.includes(term) ||
        variant.includes(term) ||
        refNo.includes(term)
      );
    });
  }, [records, search, qcStatusFilter]);

  // Pagination calculation
  const totalItems = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const currentSafePage = Math.min(currentPage, totalPages);

  const paginatedRecords = useMemo(() => {
    const startIndex = (currentSafePage - 1) * ITEMS_PER_PAGE;
    return filteredRecords.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredRecords, currentSafePage]);

  // Group paginated records by receiving date with light-green date divider headers
  const groupedSections = useMemo(() => {
    return groupRowsByReceivingDate(paginatedRecords);
  }, [paginatedRecords]);

  const startEntry = totalItems === 0 ? 0 : (currentSafePage - 1) * ITEMS_PER_PAGE + 1;
  const endEntry = Math.min(currentSafePage * ITEMS_PER_PAGE, totalItems);

  // Open Details Modal
  const handleOpenDetails = async (row) => {
    setSelectedDetail(row);
    setIsDetailsOpen(true);
    setDetailLoading(true);
    try {
      const fullDetail = await fetchReceivingDetail(row.id || row.receiving_id);
      if (fullDetail) {
        setSelectedDetail(fullDetail);
      }
    } catch (err) {
      setToast({
        type: "error",
        title: "Failed to Load Details",
        message: err.message || "Could not retrieve full receiving details.",
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setSelectedDetail(null);
  };

  // Table Columns matching the Figma design exactly:
  // Batch No. | Supplier | Variant | Received Qty (kg) | QC Status | Action
  const columns = [
    {
      key: "batchNo",
      label: "Batch No.",
      width: "22%",
      render: (row) => (
        <span className="text-[13px] font-normal text-slate-800">
          {row.batch_no || "Batch 2026 - 001"}
        </span>
      ),
    },
    {
      key: "supplier",
      label: "Supplier",
      width: "20%",
      render: (row) => (
        <span className="text-[13px] font-normal text-slate-800">
          {row.supplier || "Supplier A"}
        </span>
      ),
    },
    {
      key: "variant",
      label: "Variant",
      width: "18%",
      render: (row) => (
        <span className="text-[13px] font-normal text-slate-800">
          {row.variant || row.product_name || "Dinorado"}
        </span>
      ),
    },
    {
      key: "qty",
      label: "Received Qty (kg)",
      width: "18%",
      render: (row) => (
        <span className="text-[13px] font-normal text-slate-800">
          {formatQuantityKg(row)}
        </span>
      ),
    },
    {
      key: "qcStatus",
      label: "QC Status",
      width: "12%",
      cellClassName: "text-center",
      render: (row) => {
        const qc = determineQcStatus(row);
        let badgeStyle = "bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]"; // Passed
        if (qc === "Partial") {
          badgeStyle = "bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]";
        } else if (qc === "Failed") {
          badgeStyle = "bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]";
        }

        return (
          <div className="flex justify-center">
            <span
              className={`inline-flex items-center justify-center min-w-[68px] px-3 py-0.5 rounded-full text-xs font-medium ${badgeStyle}`}
            >
              {qc}
            </span>
          </div>
        );
      },
    },
    {
      key: "action",
      label: "Action",
      width: "10%",
      cellClassName: "text-center",
      render: (row) => (
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => handleOpenDetails(row)}
            className="rounded-full border border-slate-300 bg-white px-3.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 cursor-pointer shadow-none"
          >
            View Details
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      {/* ── Breadcrumbs ─────────────────────────────────────────── */}
      <Breadcrumbs
        items={[
          { label: "Operations" },
          { label: "Receiving History" },
        ]}
      />

      {/* ── Title & Subtitle ────────────────────────────────────── */}
      <div className="mt-2 mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Receiving History
        </h1>
        <p className="mt-1 text-xs text-gray-500 font-normal">
          Complete history of received deliveries after quality inspection.
        </p>
      </div>

      {/* ── Filter and Search Bar ───────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        {/* Search Input */}
        <div className="relative w-full max-w-sm">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search batch no., supplier, or product"
            className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-xs text-gray-700 placeholder-gray-400 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* QC Status Filter */}
        <div className="relative">
          <select
            value={qcStatusFilter}
            onChange={(e) => setQcStatusFilter(e.target.value)}
            className="h-9 appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-xs font-medium text-gray-700 outline-none transition hover:bg-gray-50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            {QC_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500"
          />
        </div>

        {/* Sort By Filter */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-9 appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-xs font-medium text-gray-700 outline-none transition hover:bg-gray-50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            {SORT_OPTIONS.map((opt, idx) => (
              <option key={`${opt.value}-${idx}`} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500"
          />
        </div>
      </div>

      {/* ── Sectioned Table Card ─────────────────────────────────── */}
      <SectionedTableCard
        columns={columns}
        sections={groupedSections}
        currentPage={currentSafePage}
        totalPages={totalPages}
        onPageChange={(page) => setCurrentPage(page)}
        footerLabel={`Showing ${startEntry}–${endEntry} of ${totalItems} receiving records`}
        isEmpty={!loading && filteredRecords.length === 0}
        emptyStateTitle="No receiving records found"
        emptyStateDescription="No delivery receiving records match your selected search or QC filter."
      />

      {/* ── View Details Modal ───────────────────────────────────── */}
      <ReceivingHistoryDetailsModal
        isOpen={isDetailsOpen}
        onClose={handleCloseDetails}
        detail={selectedDetail}
        isLoading={detailLoading}
      />

      {/* ── Toast Alert ─────────────────────────────────────────── */}
      {toast && (
        <ToastNotification
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

export default MillerReceivingHistory;
