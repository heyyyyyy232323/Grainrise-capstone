import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, ChevronDown } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import ToastNotification from "../../../Components/Modals/Toast";
import useGoodsReceipt from "../../../Components/hooks/MillerProcurement/useGoodsReceipt";
import GoodsReceiptViewDetailsModal from "../../../Components/Modals/MillerProcurement/GoodsReceiptViewDetailsModal";
import GoodsReceiptReceiptModal from "../../../Components/Modals/MillerProcurement/GoodsReceiptReceiptModal";

const SORT_OPTIONS = [
  { value: "newest", label: "Sort By" },
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "batch_asc", label: "Batch No. (A–Z)" },
  { value: "batch_desc", label: "Batch No. (Z–A)" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "Status" },
  { value: "verified", label: "Verified" },
  { value: "pending", label: "Pending" },
];

const ITEMS_PER_PAGE = 10;

// Format stock quantity with "kg" suffix
const formatStockQty = (row) => {
  const raw = row.formatted_total_received ?? row.formatted_received_good ?? row.total_received ?? row.stock_qty ?? 2500;
  if (raw === null || raw === undefined || raw === "") return "2,500 kg";
  const str = String(raw).trim();
  if (str.toLowerCase().endsWith("kg")) return str;
  const num = parseFloat(str.replace(/[^0-9.-]+/g, ""));
  if (isNaN(num)) return `${str} kg`;
  return `${num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kg`;
};

// Format unit price with ₱ symbol
const formatUnitPrice = (row) => {
  const raw = row.formatted_unit_price ?? row.price_per_kg ?? row.unit_price ?? 100;
  if (raw === null || raw === undefined || raw === "") return "₱100";
  const str = String(raw).trim();
  if (str.startsWith("₱")) return str;
  const num = parseFloat(str.replace(/[^0-9.-]+/g, ""));
  if (isNaN(num)) return `₱${str}`;
  return `₱${num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

// Format total amount with ₱ and compact suffix (e.g. ₱250k)
const formatTotalAmount = (row) => {
  const raw = row.total_price ?? row.total_amount ?? row.formatted_total_price ?? 250000;
  if (raw === null || raw === undefined || raw === "") return "₱250k";
  const str = String(raw).trim();
  if (str.includes("k") || str.includes("M") || str.includes("m")) {
    return str.startsWith("₱") ? str : `₱${str}`;
  }
  const num = parseFloat(str.replace(/[^0-9.-]+/g, ""));
  if (isNaN(num)) return "₱250k";
  if (num >= 1000000) {
    return `₱${(num / 1000000).toFixed(num % 1000000 === 0 ? 0 : 1)}M`;
  }
  if (num >= 1000) {
    return `₱${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 0)}k`;
  }
  return `₱${num.toLocaleString("en-US")}`;
};

const MillerGoodsReceipt = () => {
  const {
    fetchGoodsReceipts,
    fetchGoodsReceiptDetail,
    requestToPay,
    loading,
    actionLoading,
  } = useGoodsReceipt();

  const [receipts, setReceipts] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State: "details" | "receipt" | null
  const [activeModal, setActiveModal] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Load goods receipts from backend
  const loadReceipts = useCallback(async () => {
    try {
      const data = await fetchGoodsReceipts({
        sortBy,
      });
      setReceipts(data);
    } catch {
      // Handled by hook
    }
  }, [fetchGoodsReceipts, sortBy]);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  // Filter records case-insensitively across search parameters & status
  const filteredReceipts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return receipts.filter((r) => {
      // Status Filter
      if (statusFilter && statusFilter !== "all") {
        const itemStatus = String(r.status || "verified").toLowerCase();
        if (!itemStatus.includes(statusFilter.toLowerCase())) {
          return false;
        }
      }

      if (!term) return true;

      const batchNo = String(r.batch_no || "").toLowerCase();
      const supplier = String(r.supplier || "").toLowerCase();
      const variant = String(r.variant || r.product_name || "").toLowerCase();
      const refNo = String(r.receiving_reference_no || r.reference_no || "").toLowerCase();

      return (
        batchNo.includes(term) ||
        supplier.includes(term) ||
        variant.includes(term) ||
        refNo.includes(term)
      );
    });
  }, [receipts, search, statusFilter]);

  // Reset to first page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, sortBy]);

  // Open Details Modal when "Generate" is clicked
  const handleOpenDetails = async (row) => {
    setSelectedDetail(row);
    setActiveModal("details");
    setDetailLoading(true);
    try {
      const fullDetail = await fetchGoodsReceiptDetail(row.id || row.receiving_id);
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

  // Close Details Modal
  const handleCloseDetails = () => {
    setActiveModal(null);
    setSelectedDetail(null);
    loadReceipts();
  };

  // Submit Request to Pay
  const handleConfirmRequestToPay = async () => {
    if (!selectedDetail) return;
    const receivingId = selectedDetail.receiving_id || selectedDetail.id;

    try {
      const result = await requestToPay(receivingId);
      const receiptData = result?.data || selectedDetail;

      setSelectedDetail(receiptData);
      setActiveModal("receipt");

      setToast({
        type: "success",
        title: "Payment Requested",
        message: `Goods receipt generated successfully for reference ${
          receiptData.receiving_reference_no || receiptData.reference_no || ""
        }.`,
      });

      loadReceipts();
    } catch (err) {
      setToast({
        type: "error",
        title: "Payment Request Failed",
        message: err.message || "Failed to process request to pay.",
      });
    }
  };

  const handleCloseReceipt = () => {
    setActiveModal(null);
    setSelectedDetail(null);
    loadReceipts();
  };

  const handleViewReceipt = () => {
    setActiveModal("receipt");
  };

  // Pagination calculations
  const totalItems = filteredReceipts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const currentSafePage = Math.min(currentPage, totalPages);

  const paginatedReceipts = useMemo(() => {
    const startIndex = (currentSafePage - 1) * ITEMS_PER_PAGE;
    return filteredReceipts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredReceipts, currentSafePage]);

  const startEntry = totalItems === 0 ? 0 : (currentSafePage - 1) * ITEMS_PER_PAGE + 1;
  const endEntry = Math.min(currentSafePage * ITEMS_PER_PAGE, totalItems);

  // Columns matching Figma Goods Receipt design exactly:
  // Batch No. | Supplier | Variant | Stock Qty (kg) | Unit Price | Total Amount | Status | Action
  const columns = [
    {
      key: "batch_no",
      label: "Batch No.",
      width: "16%",
      render: (row) => (
        <span className="text-[13px] font-normal text-slate-800">
          {row.batch_no || "Batch 2026 - 001"}
        </span>
      ),
    },
    {
      key: "supplier",
      label: "Supplier",
      width: "16%",
      render: (row) => (
        <span className="text-[13px] font-normal text-slate-800">
          {row.supplier || "Supplier A"}
        </span>
      ),
    },
    {
      key: "variant",
      label: "Variant",
      width: "14%",
      render: (row) => (
        <span className="text-[13px] font-normal text-slate-800">
          {row.variant || row.product_name || "Dinorado"}
        </span>
      ),
    },
    {
      key: "qty",
      label: "Stock Qty (kg)",
      width: "14%",
      render: (row) => (
        <span className="text-[13px] font-normal text-slate-800">
          {formatStockQty(row)}
        </span>
      ),
    },
    {
      key: "price",
      label: "Unit Price",
      width: "12%",
      render: (row) => (
        <span className="text-[13px] font-normal text-slate-800">
          {formatUnitPrice(row)}
        </span>
      ),
    },
    {
      key: "total",
      label: "Total Amount",
      width: "12%",
      render: (row) => (
        <span className="text-[13px] font-normal text-slate-800">
          {formatTotalAmount(row)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: "8%",
      cellClassName: "text-center",
      render: (row) => (
        <div className="flex justify-center">
          <span className="inline-flex items-center justify-center min-w-[68px] px-3 py-0.5 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
            {row.status || "Verified"}
          </span>
        </div>
      ),
    },
    {
      key: "action",
      label: "Action",
      width: "8%",
      cellClassName: "text-center",
      render: (row) => (
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => handleOpenDetails(row)}
            className="rounded-full bg-[#15803D] hover:bg-[#166534] text-white px-4 py-1 text-xs font-medium shadow-none transition cursor-pointer"
          >
            Generate
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
          { label: "Goods Receipt" },
        ]}
      />

      {/* ── Title & Subtitle ────────────────────────────────────── */}
      <div className="mt-2 mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Goods Receipt
        </h1>
        <p className="mt-1 text-xs text-gray-500 font-normal">
          Verify received deliveries and generate payment requests.
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

        {/* Status Dropdown */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 appearance-none rounded-lg border border-gray-200 bg-white pl-3.5 pr-8 text-xs font-medium text-gray-700 outline-none transition hover:bg-gray-50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            {STATUS_OPTIONS.map((opt) => (
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

        {/* Sort By Dropdown */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-9 appearance-none rounded-lg border border-gray-200 bg-white pl-3.5 pr-8 text-xs font-medium text-gray-700 outline-none transition hover:bg-gray-50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
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

      {/* ── Table Card ───────────────────────────────────────────── */}
      <SectionedTableCard
        columns={columns}
        sections={[{ rows: paginatedReceipts }]}
        currentPage={currentSafePage}
        totalPages={totalPages}
        onPageChange={(page) => setCurrentPage(page)}
        footerLabel={`Showing ${startEntry}–${endEntry} of ${totalItems} verified deliveries`}
        isEmpty={!loading && filteredReceipts.length === 0}
        emptyStateTitle="No verified deliveries found"
        emptyStateDescription="All received deliveries have either been requested for payment or no new deliveries are currently awaiting receipt generation."
      />

      {/* ── View Details Modal ───────────────────────────────────── */}
      <GoodsReceiptViewDetailsModal
        isOpen={activeModal === "details"}
        onClose={handleCloseDetails}
        detail={selectedDetail}
        isLoading={detailLoading}
        onRequestToPay={handleConfirmRequestToPay}
        isSubmitting={actionLoading}
        onViewReceipt={handleViewReceipt}
      />

      {/* ── Receipt Modal ────────────────────────────────────────── */}
      <GoodsReceiptReceiptModal
        isOpen={activeModal === "receipt"}
        onClose={handleCloseReceipt}
        receipt={selectedDetail}
      />

      {/* ── Toast Notification ───────────────────────────────────── */}
      {toast && (
        <ToastNotification
          isOpen={!!toast}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

export default MillerGoodsReceipt;
