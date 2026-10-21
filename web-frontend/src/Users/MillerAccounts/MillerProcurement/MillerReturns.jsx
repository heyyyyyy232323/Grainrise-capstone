import { useState, useEffect, useMemo, useCallback } from "react";
import { Search } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";
import ToastNotification from "../../../Components/Modals/Toast";
import useMillerReturns from "../../../Components/hooks/MillerProcurement/useMillerReturns";
import ReturnDetailsModal from "../../../Components/Modals/MillerProcurement/ReturnDetailsModal";

const SORT_OPTIONS = [
  { value: "batch_asc", label: "Batch A–Z" },
  { value: "batch_desc", label: "Batch Z–A" },
  { value: "oldest", label: "Oldest First" },
  { value: "newest", label: "Newest First" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "returned", label: "Returned" },
];

const ITEMS_PER_PAGE = 10;

const MillerReturns = () => {
  const {
    fetchReturns,
    fetchReturnDetail,
    fetchSuppliers,
    markAsReturned,
    loading,
    actionLoading,
  } = useMillerReturns();

  const [returnsList, setReturnsList] = useState([]);
  const [suppliersList, setSuppliersList] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [sortBy, setSortBy] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Fetch dynamic suppliers list on mount
  useEffect(() => {
    let isMounted = true;
    fetchSuppliers()
      .then((data) => {
        if (isMounted) setSuppliersList(data);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [fetchSuppliers]);

  // Load returns
  const loadReturns = useCallback(async () => {
    try {
      const data = await fetchReturns({
        status: statusFilter,
        supplierId: supplierFilter,
        sortBy: sortBy || undefined,
      });
      setReturnsList(data);
    } catch {
      // Error handled in hook
    }
  }, [fetchReturns, statusFilter, supplierFilter, sortBy]);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  // Filter returns case-insensitively across batch, supplier, variant/product, and references
  // Default table ordering: Pending-first, then newest created
  const filteredReturns = useMemo(() => {
    const term = search.trim().toLowerCase();

    let list = returnsList.filter((item) => {
      if (!term) return true;
      const batchNo = String(item.batch_no || "").toLowerCase();
      const supplier = String(item.supplier || "").toLowerCase();
      const product = String(item.product_name || item.variant || "").toLowerCase();
      const returnRef = String(item.return_reference_no || "").toLowerCase();
      const receivingRef = String(item.receiving_reference_no || "").toLowerCase();

      return (
        batchNo.includes(term) ||
        supplier.includes(term) ||
        product.includes(term) ||
        returnRef.includes(term) ||
        receivingRef.includes(term)
      );
    });

    if (sortBy === "batch_asc") {
      list.sort((a, b) => String(a.batch_no || "").localeCompare(String(b.batch_no || "")));
    } else if (sortBy === "batch_desc") {
      list.sort((a, b) => String(b.batch_no || "").localeCompare(String(a.batch_no || "")));
    } else if (sortBy === "oldest") {
      list.sort((a, b) => {
        const timeA = a.raw_created_at ? new Date(a.raw_created_at).getTime() : 0;
        const timeB = b.raw_created_at ? new Date(b.raw_created_at).getTime() : 0;
        return timeA - timeB || (a.id || 0) - (b.id || 0);
      });
    } else if (sortBy === "newest") {
      list.sort((a, b) => {
        const timeA = a.raw_created_at ? new Date(a.raw_created_at).getTime() : 0;
        const timeB = b.raw_created_at ? new Date(b.raw_created_at).getTime() : 0;
        return timeB - timeA || (b.id || 0) - (a.id || 0);
      });
    } else {
      // Default table ordering: Pending first, then newest created
      list.sort((a, b) => {
        const aPending = a.status === "pending" ? 0 : 1;
        const bPending = b.status === "pending" ? 0 : 1;
        if (aPending !== bPending) return aPending - bPending;
        const timeA = a.raw_created_at ? new Date(a.raw_created_at).getTime() : 0;
        const timeB = b.raw_created_at ? new Date(b.raw_created_at).getTime() : 0;
        return timeB - timeA || (b.id || 0) - (a.id || 0);
      });
    }

    return list;
  }, [returnsList, search, sortBy]);

  // Reset pagination on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, supplierFilter, sortBy]);

  // Supplier dropdown options
  const supplierOptions = useMemo(() => {
    const base = [{ value: "all", label: "All Suppliers" }];
    const items = suppliersList.map((s) => ({
      value: String(s.id),
      label: s.name,
    }));
    return [...base, ...items];
  }, [suppliersList]);

  // Pagination calculation
  const totalItems = filteredReturns.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const currentSafePage = Math.min(currentPage, totalPages);

  const paginatedReturns = useMemo(() => {
    const startIndex = (currentSafePage - 1) * ITEMS_PER_PAGE;
    return filteredReturns.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredReturns, currentSafePage]);

  const startEntry = totalItems === 0 ? 0 : (currentSafePage - 1) * ITEMS_PER_PAGE + 1;
  const endEntry = Math.min(currentSafePage * ITEMS_PER_PAGE, totalItems);

  // Open Details Modal
  const handleOpenDetails = async (row) => {
    setSelectedDetail(row);
    setIsDetailsOpen(true);
    setDetailLoading(true);
    try {
      const fullDetail = await fetchReturnDetail(row.id || row.return_id);
      if (fullDetail) {
        setSelectedDetail(fullDetail);
      }
    } catch (err) {
      setToast({
        type: "error",
        title: "Failed to Load Details",
        message: err.message || "Could not retrieve full return details.",
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setSelectedDetail(null);
  };

  // Confirm Mark as Returned
  const handleConfirmMarkAsReturned = async () => {
    if (!selectedDetail) return;
    const returnId = selectedDetail.return_id || selectedDetail.id;

    try {
      await markAsReturned(returnId);
      setIsDetailsOpen(false);
      setSelectedDetail(null);
      setToast({
        type: "success",
        title: "Return Processed",
        message: `Return ${selectedDetail.return_reference_no || `#${returnId}`} has been successfully marked as returned.`,
      });
      // Refresh list
      await loadReturns();
    } catch (err) {
      setToast({
        type: "error",
        title: "Status Update Failed",
        message: err.message || "Failed to mark return as returned. Please try again.",
      });
    }
  };

  // Table Columns
  const columns = [
    {
      key: "batchNo",
      label: "Batch No.",
      render: (row) => (
        <span className="text-[13px] font-medium text-slate-700">
          {row.batch_no || "—"}
        </span>
      ),
    },
    {
      key: "supplier",
      label: "Supplier",
      render: (row) => (
        <span className="text-[13px] font-medium text-slate-700">
          {row.supplier || "—"}
        </span>
      ),
    },
    {
      key: "qty",
      label: "Quantity",
      render: (row) => (
        <span className="text-[13px] font-medium text-slate-700">
          {row.quantity || `${row.quantity_kg} kg`}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const isPending =
          String(row.status || "").toLowerCase().trim() === "pending";
        return (
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              isPending
                ? "bg-amber-100 text-amber-700 border border-amber-200"
                : "bg-emerald-100 text-emerald-700 border border-emerald-200"
            }`}
          >
            {row.status_label || (isPending ? "Pending" : "Returned")}
          </span>
        );
      },
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
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700 cursor-pointer"
          >
            View Details
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Operations", path: "/miller-procurement/returns" },
          { label: "Returns" },
        ]}
      />

      <div className="mt-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Returns</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage defective or rejected goods returned to suppliers.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-center">
        <div className="relative flex-1 max-w-md w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search batch no., supplier, or return ref."
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <SortByDropdown
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={STATUS_OPTIONS}
            placeholder="Status"
          />
          <SortByDropdown
            value={supplierFilter}
            onChange={(val) => setSupplierFilter(val)}
            options={supplierOptions}
            placeholder="Supplier"
          />
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
        sections={[{ rows: paginatedReturns }]}
        currentPage={currentSafePage}
        totalPages={totalPages}
        onPageChange={(page) => setCurrentPage(page)}
        footerLabel={`Showing ${startEntry}-${endEntry} of ${totalItems} return records`}
        isEmpty={!loading && filteredReturns.length === 0}
        emptyStateTitle="No returns found"
        emptyStateDescription="No returned or rejected goods records were found matching your criteria."
      />

      {/* View Details Modal */}
      <ReturnDetailsModal
        isOpen={isDetailsOpen}
        onClose={handleCloseDetails}
        detail={selectedDetail}
        isLoading={detailLoading}
        onMarkAsReturned={handleConfirmMarkAsReturned}
        isSubmitting={actionLoading}
      />

      {/* Toast Notification */}
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

export default MillerReturns;
