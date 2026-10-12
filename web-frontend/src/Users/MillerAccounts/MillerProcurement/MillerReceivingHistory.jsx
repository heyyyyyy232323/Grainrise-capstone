import { useState, useEffect, useMemo, useCallback } from "react";
import { Search } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";
import DateRangePicker from "../../../Components/Minor-Components/DateRangePicker";
import ToastNotification from "../../../Components/Modals/Toast";
import useReceivingHistory from "../../../Components/hooks/MillerProcurement/useReceivingHistory";
import ReceivingHistoryDetailsModal from "../../../Components/Modals/MillerProcurement/ReceivingHistoryDetailsModal";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "batch_asc", label: "Batch A–Z" },
  { value: "batch_desc", label: "Batch Z–A" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "partially_received", label: "Partially Received" },
  { value: "received", label: "Received" },
];

const ITEMS_PER_PAGE = 10;

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
    }

    if (!groups[label]) {
      groups[label] = [];
      order.push(label);
    }
    groups[label].push(row);
  });

  return order.map((label) => ({
    label,
    rows: groups[label],
  }));
}

const MillerReceivingHistory = () => {
  const {
    fetchReceivingHistory,
    fetchReceivingDetail,
    fetchSuppliers,
    loading,
  } = useReceivingHistory({ isManager: false });

  const [records, setRecords] = useState([]);
  const [suppliersList, setSuppliersList] = useState([]);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
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

  // Load receiving records from backend
  const loadHistory = useCallback(async () => {
    try {
      const data = await fetchReceivingHistory({
        search,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        supplierId: supplierFilter,
        status: statusFilter,
        sortBy,
      });
      setRecords(data);
    } catch {
      // Handled in hook
    }
  }, [fetchReceivingHistory, search, dateRange, supplierFilter, statusFilter, sortBy]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Reset pagination on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, dateRange, statusFilter, supplierFilter, sortBy]);

  // Supplier dropdown options
  const supplierOptions = useMemo(() => {
    const base = [{ value: "all", label: "All Suppliers" }];
    const items = suppliersList.map((s) => ({
      value: String(s.id),
      label: s.name,
    }));
    return [...base, ...items];
  }, [suppliersList]);

  // Filter case-insensitively across search parameters
  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();

    return records.filter((item) => {
      if (!term) return true;
      const batchNo = String(item.batch_no || "").toLowerCase();
      const supplier = String(item.supplier || "").toLowerCase();
      const variant = String(item.variant || item.product_name || "").toLowerCase();
      const refNo = String(item.receiving_reference_no || "").toLowerCase();
      const receiver = String(item.received_by || "").toLowerCase();

      return (
        batchNo.includes(term) ||
        supplier.includes(term) ||
        variant.includes(term) ||
        refNo.includes(term) ||
        receiver.includes(term)
      );
    });
  }, [records, search]);

  // Pagination calculation
  const totalItems = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const currentSafePage = Math.min(currentPage, totalPages);

  const paginatedRecords = useMemo(() => {
    const startIndex = (currentSafePage - 1) * ITEMS_PER_PAGE;
    return filteredRecords.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredRecords, currentSafePage]);

  // Group paginated records by receiving date with date dividers
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

  // Table Columns (Date Received removed; replaced with date divider headers)
  const columns = [
    { key: "batchNo", label: "Batch No.", render: (row) => row.batch_no || "—" },
    { key: "supplier", label: "Supplier", render: (row) => row.supplier || "—" },
    { key: "variant", label: "Variant", render: (row) => row.variant || row.product_name || "—" },
    { key: "qty", label: "Received Qty (kg)", render: (row) => row.total_received || "—" },
    { key: "receivedBy", label: "Received By", render: (row) => row.received_by || "—" },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const isPartial =
          String(row.order_status || row.status || "")
            .toLowerCase()
            .includes("partial");
        return (
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              isPartial
                ? "bg-amber-100 text-amber-700 border border-amber-200"
                : "bg-emerald-100 text-emerald-700 border border-emerald-200"
            }`}
          >
            {row.order_status_label || row.status || (isPartial ? "Partially Received" : "Received")}
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
          { label: "Operations", path: "/miller-procurement/receiving-history" },
          { label: "Receiving History" },
        ]}
      />

      <div className="mt-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Receiving History</h1>
        <p className="text-sm text-gray-500 mt-1">
          Log of all received deliveries and related goods receipts.
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
            placeholder="Search batch no., supplier, or product"
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
          <DateRangePicker
            onDateChange={({ startDate, endDate }) => {
              setDateRange({ startDate, endDate });
            }}
          />
          <SortByDropdown
            value={supplierFilter}
            onChange={(val) => setSupplierFilter(val)}
            options={supplierOptions}
            placeholder="Supplier"
          />
          <SortByDropdown
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={STATUS_OPTIONS}
            placeholder="Status"
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
        sections={groupedSections}
        currentPage={currentSafePage}
        totalPages={totalPages}
        onPageChange={(page) => setCurrentPage(page)}
        footerLabel={`Showing ${startEntry}-${endEntry} of ${totalItems} receiving records`}
        isEmpty={!loading && filteredRecords.length === 0}
        emptyStateTitle="No receiving history found"
        emptyStateDescription="No delivery receiving records match your selected filters."
      />

      {/* View Details Modal */}
      <ReceivingHistoryDetailsModal
        isOpen={isDetailsOpen}
        onClose={handleCloseDetails}
        detail={selectedDetail}
        isLoading={detailLoading}
      />

      {/* Toast Alert */}
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
