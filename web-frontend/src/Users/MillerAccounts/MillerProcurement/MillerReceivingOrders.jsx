import { useState, useEffect, useMemo, useCallback } from "react";
import { Search } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import DateRangePicker from "../../../Components/Minor-Components/DateRangePicker";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";
import ToastNotification from "../../../Components/Modals/Toast";
import MarkAsReceivedModal from "../../../Components/Modals/MillerProcurement/MarkAsReceivedModal";
import useReceivingOrders from "../../../Components/hooks/MillerProcurement/useReceivingOrders";

const SORT_OPTIONS = [
  { value: "date-asc", label: "Expected Arrival (Earliest First)" },
  { value: "date-desc", label: "Expected Arrival (Latest First)" },
  { value: "qty-desc", label: "Remaining Qty (High to Low)" },
  { value: "qty-asc", label: "Remaining Qty (Low to High)" },
  { value: "variant-asc", label: "Variant (A-Z)" },
  { value: "variant-desc", label: "Variant (Z-A)" },
];

const ITEMS_PER_PAGE = 10;

const MillerReceivingOrders = () => {
  const { fetchReceivingOrders, receiveOrder, loading, actionLoading } =
    useReceivingOrders();

  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [sortBy, setSortBy] = useState("date-asc");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal & Toast States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [toast, setToast] = useState(null);

  // Load orders from API
  const loadOrders = useCallback(async () => {
    try {
      const data = await fetchReceivingOrders({
        search,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        sortBy,
      });
      setOrders(data);
    } catch {
      // Error handled by hook
    }
  }, [fetchReceivingOrders, search, dateRange, sortBy]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Reset to first page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, dateRange, sortBy]);

  // Modal Actions
  const handleOpenReceiveModal = (orderRow) => {
    setSelectedOrder(orderRow);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  const handleSubmitReceiving = async (orderId, formData) => {
    const result = await receiveOrder(orderId, formData);
    setIsModalOpen(false);
    setSelectedOrder(null);
    setToast({
      type: "success",
      title: "Delivery Received",
      message: `Receiving recorded successfully under Ref: ${result?.data?.receiving_reference_no || "N/A"}.`,
    });
    // Refresh table data
    await loadOrders();
  };

  // Pagination slicing
  const totalItems = orders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const currentSafePage = Math.min(currentPage, totalPages);

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentSafePage - 1) * ITEMS_PER_PAGE;
    return orders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [orders, currentSafePage]);

  const startEntry = totalItems === 0 ? 0 : (currentSafePage - 1) * ITEMS_PER_PAGE + 1;
  const endEntry = Math.min(currentSafePage * ITEMS_PER_PAGE, totalItems);

  // Table Columns
  const columns = [
    { key: "batchNo", label: "Batch No." },
    { key: "supplier", label: "Supplier" },
    { key: "variant", label: "Variant" },
    { key: "qty", label: "Qty (kg)" },
    { key: "eta", label: "Expected Arrival" },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const isPartiallyReceived =
          String(row.raw_status || "").toLowerCase().includes("partial") ||
          String(row.status || "").toLowerCase().includes("partial");
        return (
          <span
            className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold capitalize ${
              isPartiallyReceived
                ? "bg-amber-100 text-amber-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {row.status}
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
            onClick={() => handleOpenReceiveModal(row)}
            className="rounded-lg bg-[#1a7a3a] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#125c2a] sm:px-4 cursor-pointer"
          >
            Mark as Received
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Operations", path: "/miller-procurement/receiving-orders" },
          { label: "Receiving Orders" },
        ]}
      />

      <div className="mt-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Receiving Orders</h1>
        <p className="text-sm text-gray-500 mt-1">
          View and manage incoming supplier deliveries awaiting miller receiving.
        </p>
      </div>

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

        <div className="flex gap-2 w-full sm:w-auto">
          <DateRangePicker
            onDateChange={({ startDate, endDate }) => {
              setDateRange({ startDate, endDate });
            }}
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
        sections={[{ rows: paginatedOrders }]}
        currentPage={currentSafePage}
        totalPages={totalPages}
        onPageChange={(page) => setCurrentPage(page)}
        footerLabel={`Showing ${startEntry}-${endEntry} of ${totalItems} receiving orders`}
        isEmpty={!loading && orders.length === 0}
        emptyStateTitle="No receiving orders found"
        emptyStateDescription="No incoming deliveries are currently waiting for receiving. When farmers dispatch deliveries, they will appear here."
      />

      {/* Mark As Received Modal */}
      <MarkAsReceivedModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        order={selectedOrder}
        onSubmit={handleSubmitReceiving}
        isSubmitting={actionLoading}
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

export default MillerReceivingOrders;
