import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Eye } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";
import ToastNotification from "../../../Components/Modals/Toast";
import useGoodsReceipt from "../../../Components/hooks/MillerProcurement/useGoodsReceipt";
import GoodsReceiptViewDetailsModal from "../../../Components/Modals/MillerProcurement/GoodsReceiptViewDetailsModal";
import GoodsReceiptReceiptModal from "../../../Components/Modals/MillerProcurement/GoodsReceiptReceiptModal";

const SORT_OPTIONS = [
  { value: "oldest", label: "Oldest → Newest" },
  { value: "newest", label: "Newest → Oldest" },
  { value: "batch_asc", label: "Batch A–Z" },
  { value: "batch_desc", label: "Batch Z–A" },
];

const ITEMS_PER_PAGE = 10;

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
  const [sortBy, setSortBy] = useState("oldest");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State: "details" | "receipt" | null (strictly unstacked)
  const [activeModal, setActiveModal] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Load pending goods receipts
  const loadReceipts = useCallback(async () => {
    try {
      const data = await fetchGoodsReceipts({
        sortBy,
      });
      setReceipts(data);
    } catch {
      // Error handled by hook
    }
  }, [fetchGoodsReceipts, sortBy]);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  // Filter records case-insensitively, ignoring leading/trailing spaces
  // Matches: batch, supplier, product/variant, or receiving reference
  const filteredReceipts = useMemo(() => {
    const term = search.trim().toLowerCase();

    let result = receipts.filter((r) => {
      if (!term) return true;
      const batchNo = String(r.batch_no || "").toLowerCase();
      const supplier = String(r.supplier || "").toLowerCase();
      const variant = String(r.variant || "").toLowerCase();
      const refNo = String(r.receiving_reference_no || r.reference_no || "").toLowerCase();

      return (
        batchNo.includes(term) ||
        supplier.includes(term) ||
        variant.includes(term) ||
        refNo.includes(term)
      );
    });

    // Keep sorting functional across filtered records
    result.sort((a, b) => {
      if (sortBy === "batch_asc") {
        return String(a.batch_no || "").localeCompare(String(b.batch_no || ""));
      }
      if (sortBy === "batch_desc") {
        return String(b.batch_no || "").localeCompare(String(a.batch_no || ""));
      }
      if (sortBy === "newest") {
        const dateA = a.received_at ? new Date(a.received_at).getTime() : 0;
        const dateB = b.received_at ? new Date(b.received_at).getTime() : 0;
        return dateB - dateA || (b.id || 0) - (a.id || 0);
      }
      // default: oldest
      const dateA = a.received_at ? new Date(a.received_at).getTime() : 0;
      const dateB = b.received_at ? new Date(b.received_at).getTime() : 0;
      return dateA - dateB || (a.id || 0) - (b.id || 0);
    });

    return result;
  }, [receipts, search, sortBy]);

  // Reset to first page on search or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortBy]);

  // Open Details Modal
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

  // Close Details Modal (X clicked)
  const handleCloseDetails = () => {
    setActiveModal(null);
    setSelectedDetail(null);
    // Refresh table in case a request was completed
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
      // Seamlessly replace View Details modal with Receipt modal (never stack)
      setActiveModal("receipt");

      setToast({
        type: "success",
        title: "Payment Requested",
        message: `Goods receipt generated successfully for reference ${
          receiptData.receiving_reference_no || receiptData.reference_no || ""
        }.`,
      });

      // Refresh list to remove pending item from table
      loadReceipts();
    } catch (err) {
      setToast({
        type: "error",
        title: "Payment Request Failed",
        message: err.message || "Failed to process request to pay.",
      });
    }
  };

  // Close Receipt Modal (X clicked) -> Closes everything and returns directly to Goods Receipt page
  const handleCloseReceipt = () => {
    setActiveModal(null);
    setSelectedDetail(null);
    loadReceipts();
  };

  // Switch to Receipt Modal from View Details Modal (if already requested)
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

  // Table Columns (Status column removed, View action replaces Generate)
  const columns = [
    { key: "batch_no", label: "Batch No." },
    { key: "supplier", label: "Supplier" },
    { key: "variant", label: "Variant" },
    {
      key: "qty",
      label: "Stock Qty (kg)",
      render: (row) => row.formatted_total_received || row.formatted_received_good || "—",
    },
    {
      key: "price",
      label: "Unit Price",
      render: (row) => row.formatted_unit_price || "—",
    },
    {
      key: "total",
      label: "Total Amount",
      render: (row) => (
        <span className="font-semibold text-slate-900">
          {row.formatted_total_price || "—"}
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
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 cursor-pointer"
          >
            View
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Operations", path: "/miller-procurement/goods-receipt" },
          { label: "Goods Receipt" },
        ]}
      />

      <div className="mt-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Goods Receipt</h1>
        <p className="text-sm text-gray-500 mt-1">
          Verify received deliveries and generate payment requests.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-center justify-start">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search batch no., supplier, or product"
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
          />
        </div>

        <div className="w-full sm:w-auto">
          {/* Status filter removed as required; Sort By dropdown only */}
          <SortByDropdown
            value={sortBy}
            onChange={(val) => setSortBy(val)}
            options={SORT_OPTIONS}
            placeholder="Sort By"
          />
        </div>
      </div>

      <SectionedTableCard
        columns={columns}
        sections={[{ rows: paginatedReceipts }]}
        currentPage={currentSafePage}
        totalPages={totalPages}
        onPageChange={(page) => setCurrentPage(page)}
        footerLabel={`Showing ${startEntry}-${endEntry} of ${totalItems} pending receipts`}
        isEmpty={!loading && filteredReceipts.length === 0}
        emptyStateTitle="No pending goods receipts found"
        emptyStateDescription="All verified deliveries have either been requested for payment or no new deliveries are awaiting receipt generation."
      />

      {/* View Details Modal (Compact Order Approval-style, X exit only) */}
      <GoodsReceiptViewDetailsModal
        isOpen={activeModal === "details"}
        onClose={handleCloseDetails}
        detail={selectedDetail}
        isLoading={detailLoading}
        onRequestToPay={handleConfirmRequestToPay}
        isSubmitting={actionLoading}
        onViewReceipt={handleViewReceipt}
      />

      {/* Receipt Modal (Unstacked, replaces View Details on request to pay) */}
      <GoodsReceiptReceiptModal
        isOpen={activeModal === "receipt"}
        onClose={handleCloseReceipt}
        receipt={selectedDetail}
      />

      {/* Toast Notification */}
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
