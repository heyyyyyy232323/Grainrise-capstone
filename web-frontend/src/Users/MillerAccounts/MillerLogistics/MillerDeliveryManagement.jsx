import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Calendar,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
  Truck,
  Building2,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  PackageCheck,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import Toast from "../../../Components/Minor-Components/Toast";
import useToast from "../../../Components/hooks/useToast";
import useApi from "../../../Components/hooks/useApi";

// ─── Filter & Sort Options ───────────────────────────────────────────────────

const BUYER_TYPE_OPTIONS = [
  { value: "all", label: "All Buyers" },
  { value: "retailer", label: "Retailers Only" },
  { value: "warehouse", label: "Warehouses Only" },
];

const SORT_OPTIONS = [
  { value: "date-asc", label: "Target Arrival (Earliest)" },
  { value: "date-desc", label: "Target Arrival (Latest)" },
  { value: "qty-desc", label: "Quantity High to Low" },
  { value: "qty-asc", label: "Quantity Low to High" },
  { value: "amount-desc", label: "Total Price High to Low" },
  { value: "amount-asc", label: "Total Price Low to High" },
  { value: "batch-asc", label: "Batch No. (A-Z)" },
  { value: "batch-desc", label: "Batch No. (Z-A)" },
];

const driverStatusStyles = {
  Available: {
    cardBorder: "border-emerald-600",
    badge: "bg-emerald-50 text-emerald-700",
    bar: "bg-emerald-600",
  },
  "Limited Capacity": {
    cardBorder: "border-amber-500",
    badge: "bg-amber-50 text-amber-700",
    bar: "bg-amber-500",
  },
  Full: {
    cardBorder: "border-rose-500",
    badge: "bg-rose-50 text-rose-700",
    bar: "bg-rose-500",
  },
  "No Vehicle": {
    cardBorder: "border-slate-300",
    badge: "bg-slate-100 text-slate-600",
    bar: "bg-slate-300",
  },
};

// ─── Custom Filter Dropdown Sub-Component ─────────────────────────────────────
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
        className="flex items-center gap-2 border border-gray-200 bg-white px-3.5 py-2 rounded-xl text-sm font-medium text-slate-800 hover:bg-gray-50 transition-colors cursor-pointer h-[38px] justify-between w-full sm:w-auto min-w-[150px]"
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

// ─── Modal Detail Row Sub-Component (Matching Order Approval) ───────────
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

// ─── Main Component ──────────────────────────────────────────────────────────
export default function MillerDeliveryManagement() {
  const { request } = useApi();
  const { toasts, showToast, removeToast } = useToast();

  // Data states
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [errorOrders, setErrorOrders] = useState(null);

  // Filter & Search states
  const [query, setQuery] = useState("");
  const [driverQuery, setDriverQuery] = useState("");
  const [buyerTypeFilter, setBuyerTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-asc");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [tempDateRange, setTempDateRange] = useState({ startDate: "", endDate: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [driverPage, setDriverPage] = useState(1);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateRef = useRef(null);

  // Modal & Assignment states
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Driver Details Modal states
  const [viewDriver, setViewDriver] = useState(null);
  const [driverDeliveries, setDriverDeliveries] = useState([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  // Close datepicker outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dateRef.current && !dateRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Delivery Orders
  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    setErrorOrders(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.append("search", query.trim());
      if (buyerTypeFilter !== "all") params.append("buyer_type", buyerTypeFilter);
      if (dateRange.startDate) params.append("start_date", dateRange.startDate);
      if (dateRange.endDate) params.append("end_date", dateRange.endDate);
      if (sortBy) params.append("sort", sortBy);

      const url = `/miller-employees/logistics/delivery-orders/${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      const res = await request(url, { method: "GET" });

      if (res && res.success) {
        setOrders(res.orders || []);
      } else {
        setErrorOrders(res?.message || "Failed to load orders.");
      }
    } catch (err) {
      setErrorOrders(err?.message || "Failed to connect to server.");
    } finally {
      setLoadingOrders(false);
    }
  }, [query, buyerTypeFilter, dateRange, sortBy, request]);

  // Fetch Drivers with Live Capacities
  const fetchDrivers = useCallback(async () => {
    setLoadingDrivers(true);
    try {
      const res = await request("/miller-employees/logistics/driver-capacities/", {
        method: "GET",
      });
      if (res && res.success) {
        setDrivers(res.drivers || []);
      }
    } catch {
      // silently retain or show toast if needed
    } finally {
      setLoadingDrivers(false);
    }
  }, [request]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  // Date Range handlers
  const handleDateApply = () => {
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

  // Columns for SectionedTableCard
  const columns = [
    { key: "batch", label: "Batch No." },
    { key: "retailer", label: "Retailer / Buyer" },
    { key: "variant", label: "Variant" },
    { key: "ordered_quantity_formatted", label: "Qty (kg)" },
    { key: "total_price_formatted", label: "Total Price" },
    { key: "expected_arrival_date_formatted", label: "Target Arrival" },
    { key: "action", label: "Action" },
  ];

  // Pagination for Orders Table
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(orders.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedOrders = useMemo(() => {
    return orders.slice(startIndex, startIndex + itemsPerPage);
  }, [orders, startIndex, itemsPerPage]);

  const tableSections = useMemo(
    () => [{ rows: paginatedOrders }],
    [paginatedOrders]
  );

  // Filter & Pagination for Driver Capacity Sidebar (4 drivers per page per spec)
  const filteredDrivers = useMemo(() => {
    const q = driverQuery.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((d) =>
      `${d.name} ${d.plate_number || ""} ${d.vehicle_model || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [drivers, driverQuery]);

  const driversPerPage = 4;
  const totalDriverPages = Math.max(1, Math.ceil(filteredDrivers.length / driversPerPage));
  const safeDriverPage = Math.min(driverPage, totalDriverPages);
  const paginatedDrivers = useMemo(() => {
    const start = (safeDriverPage - 1) * driversPerPage;
    return filteredDrivers.slice(start, start + driversPerPage);
  }, [filteredDrivers, safeDriverPage, driversPerPage]);

  // Modal open / close handlers
  const handleOpenModal = (orderRow) => {
    setSelectedOrder(orderRow);
    setSelectedDriverId("");
  };

  const handleCloseModal = () => {
    if (actionLoading) return;
    setSelectedOrder(null);
    setSelectedDriverId("");
  };

  // Find currently selected driver in modal
  const selectedDriverObj = useMemo(() => {
    if (!selectedDriverId) return null;
    return drivers.find((d) => String(d.driver_id) === String(selectedDriverId));
  }, [drivers, selectedDriverId]);

  // Validation: Driver must have active vehicle and sufficient remaining capacity
  const isConfirmEnabled = useMemo(() => {
    if (!selectedOrder || !selectedDriverObj) return false;
    if (!selectedDriverObj.has_vehicle) return false;
    if (selectedDriverObj.vehicle_status?.toLowerCase() !== "active") return false;
    return selectedDriverObj.remaining_capacity >= selectedOrder.ordered_quantity;
  }, [selectedOrder, selectedDriverObj]);

  // Driver Capacity Details modal handlers
  const handleOpenDriverModal = async (driver) => {
    setViewDriver(driver);
    setDriverDeliveries([]);
    setLoadingDeliveries(true);
    try {
      const res = await request(
        `/miller-employees/logistics/driver-capacities/${driver.driver_id}/deliveries/`,
        { method: "GET" }
      );
      if (res && res.success) {
        setDriverDeliveries(res.deliveries || []);
        if (res.driver) {
          setViewDriver((prev) => ({ ...prev, ...res.driver }));
        }
      } else {
        setDriverDeliveries([]);
      }
    } catch {
      setDriverDeliveries([]);
    } finally {
      setLoadingDeliveries(false);
    }
  };

  const handleCloseDriverModal = () => {
    setViewDriver(null);
    setDriverDeliveries([]);
  };

  // Confirm Assignment Action
  const handleConfirmAssignment = async () => {
    if (!selectedOrder || !selectedDriverId || !isConfirmEnabled || actionLoading) return;

    setActionLoading(true);
    try {
      const res = await request(
        `/miller-employees/logistics/delivery-orders/${selectedOrder.online_order_id}/assign/`,
        {
          method: "POST",
          body: JSON.stringify({ driver_id: parseInt(selectedDriverId, 10) }),
        }
      );

      if (res && res.success) {
        showToast({
          type: "success",
          title: "Assignment Successful",
          message:
            res.message ||
            `Order ${selectedOrder.batch_no} successfully assigned to driver!`,
        });
        handleCloseModal();
        await Promise.all([fetchOrders(), fetchDrivers()]);
      } else {
        showToast({
          type: "error",
          title: "Assignment Failed",
          message: res?.message || "Failed to assign driver.",
        });
      }
    } catch (err) {
      showToast({
        type: "error",
        title: "Assignment Error",
        message: err?.message || "Network error while assigning driver.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Container */}
      <Toast toasts={toasts} onRemoveToast={removeToast} />

      <Breadcrumbs
        items={[
          {
            label: "Delivery Operations",
            path: "/miller-logistics/dashboard",
          },
          { label: "Delivery Management" },
        ]}
      />

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Delivery Management
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Assign drivers and vehicles to forwarded marketplace orders.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* ── Main Orders Section ────────────────────────────────────────────── */}
        <div className="flex-1 w-full min-w-0">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 sm:p-6">
            {/* ── Toolbar Controls ─────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {/* Search Bar */}
              <div className="relative min-w-[220px] max-w-xs flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search batch, buyer, or product"
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

              {/* Date Range Picker Dropdown */}
              <div className="relative w-full sm:w-auto" ref={dateRef}>
                <button
                  type="button"
                  onClick={() => setShowDatePicker((prev) => !prev)}
                  className={`flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors cursor-pointer h-[38px] ${
                    dateRange.startDate
                      ? "border-emerald-500 text-emerald-700 bg-emerald-50/40"
                      : ""
                  }`}
                >
                  <span>
                    {dateRange.startDate
                      ? `${dateRange.startDate} - ${dateRange.endDate || "..."}`
                      : "Date Range"}
                  </span>
                  <Calendar
                    size={16}
                    className={
                      dateRange.startDate ? "text-emerald-600" : "text-gray-500"
                    }
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
                              // If current end date is earlier than new start date, clear it
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
                            setTempDateRange((prev) => ({
                              ...prev,
                              endDate: e.target.value,
                            }))
                          }
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-600 disabled:opacity-50"
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

              {/* Retailers / Warehouses Buyer Filter (Replaced Priority) */}
              <CustomDropdown
                label="Buyer Type"
                options={BUYER_TYPE_OPTIONS}
                value={buyerTypeFilter}
                onChange={(v) => {
                  setBuyerTypeFilter(v);
                  setCurrentPage(1);
                }}
              />

              {/* Sort By Dropdown (includes Quantity & Amount sorting) */}
              <CustomDropdown
                label="Sort By"
                options={SORT_OPTIONS}
                value={sortBy}
                onChange={(v) => {
                  setSortBy(v);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Error Message */}
            {errorOrders && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 flex items-center justify-between">
                <span>{errorOrders}</span>
                <button
                  type="button"
                  onClick={fetchOrders}
                  className="flex items-center gap-1 font-bold underline hover:text-rose-900 cursor-pointer"
                >
                  <RefreshCw size={13} /> Retry
                </button>
              </div>
            )}

            {/* Orders Table */}
            <SectionedTableCard
              columns={columns}
              sections={tableSections}
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              onViewDetails={handleOpenModal}
              viewDetailsLabel="View Details"
              emptyStateTitle={
                loadingOrders ? "Loading orders..." : "No orders found"
              }
              emptyStateDescription={
                loadingOrders
                  ? "Fetching forwarded delivery orders..."
                  : "No orders match the selected filters or search criteria."
              }
              footerLabel={`Showing ${
                orders.length === 0 ? 0 : startIndex + 1
              }-${Math.min(startIndex + itemsPerPage, orders.length)} of ${
                orders.length
              } orders`}
            />
          </div>
        </div>

        {/* ── Driver Capacity Sidebar ────────────────────────────────────────── */}
        <aside className="w-full lg:w-[360px] shrink-0">
          <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900">Driver Capacity</h4>
              <span className="text-xs text-slate-500 font-medium">
                {filteredDrivers.length} {filteredDrivers.length === 1 ? "Driver" : "Drivers"}
              </span>
            </div>

            <div className="relative mt-2">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={15}
              />
              <input
                type="text"
                value={driverQuery}
                onChange={(e) => {
                  setDriverQuery(e.target.value);
                  setDriverPage(1);
                }}
                placeholder="Search driver or plate..."
                className="w-full pl-9 pr-8 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 outline-none bg-white placeholder-gray-400 text-gray-700"
              />
              {driverQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setDriverQuery("");
                    setDriverPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Drivers list */}
            <div className="mt-3 space-y-2.5">
              {loadingDrivers ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <Loader2 className="animate-spin inline-block mr-1" size={14} />
                  Loading driver capacities...
                </div>
              ) : paginatedDrivers.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No active drivers found.
                </div>
              ) : (
                paginatedDrivers.map((d) => {
                  const style =
                    driverStatusStyles[d.status] ?? driverStatusStyles.Available;

                  return (
                    <div
                      key={d.id}
                      className={`rounded-xl border p-3 ${style.cardBorder} bg-white shadow-xs`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            {d.name}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Truck size={12} className="shrink-0 text-slate-400" />
                            <span>
                              {d.has_vehicle
                                ? `${d.plate_number} • ${d.vehicle_model}`
                                : "No vehicle assigned"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style.badge}`}
                          >
                            {d.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenDriverModal(d)}
                            className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
                            title="View driver capacity details"
                          >
                            View
                          </button>
                        </div>
                      </div>

                      {/* Capacity progress bar */}
                      {d.has_vehicle ? (
                        <div className="mt-2.5">
                          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`${style.bar} h-full transition-all duration-300`}
                              style={{ width: `${d.pct_used}%` }}
                            />
                          </div>
                          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                            <span>Pending Load: {d.current_load.toLocaleString()} kg</span>
                            <span>Max: {d.max.toLocaleString()} kg</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mt-0.5">
                            <span className="text-[#0B5D1E]">
                              {d.remaining_capacity.toLocaleString()} kg remaining
                            </span>
                            <span>{d.pct_used}% used</span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 text-[10px] text-slate-400 italic">
                          Assign a vehicle to this driver to enable deliveries.
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination: 4 drivers per page */}
            {totalDriverPages > 1 && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Page {safeDriverPage} of {totalDriverPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setDriverPage((p) => Math.max(1, p - 1))}
                    disabled={safeDriverPage <= 1}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    aria-label="Previous Page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDriverPage((p) => Math.min(totalDriverPages, p + 1))}
                    disabled={safeDriverPage >= totalDriverPages}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    aria-label="Next Page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ── View Details Modal (Matching Sales Order Approval UI) ──────────── */}
      {selectedOrder &&
        createPortal(
          <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div
              className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header: Batch number as title, only top-right X, NO backdrop dismissal */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {selectedOrder.batch_no}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Delivery Assignment Details
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={actionLoading}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  aria-label="Close modal"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
                {/* ── SECTION 1 — BUYER INFORMATION ─────────────────────────── */}
                <div className="space-y-1">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                    <span>Buyer Information</span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        selectedOrder.buyer_type === "Warehouse"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {selectedOrder.buyer_type}
                    </span>
                  </div>

                  <ModalDetailRow label="Buyer Name" value={selectedOrder.buyer_name} />
                  <ModalDetailRow label="Contact Number" value={selectedOrder.contact_number} />
                  <ModalDetailRow label="Delivery Address" value={selectedOrder.delivery_address} />
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100 pt-2" />

                {/* ── SECTION 2 — ORDER INFORMATION ─────────────────────────── */}
                <div className="space-y-1">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                    Order Information
                  </div>

                  <ModalDetailRow label="Product Variant" value={selectedOrder.product_name} />
                  <ModalDetailRow label="Product Code" value={selectedOrder.product_code} />
                  <ModalDetailRow
                    label="Ordered Quantity"
                    value={selectedOrder.ordered_quantity_formatted}
                  />
                  <ModalDetailRow
                    label="Expected Arrival Date"
                    value={selectedOrder.expected_arrival_date_formatted}
                  />
                  <ModalDetailRow
                    label="Unit Cost"
                    value={selectedOrder.unit_cost_formatted}
                  />
                  <ModalDetailRow
                    label="Fare Fee"
                    value={selectedOrder.fare_fee_formatted}
                  />
                  <ModalDetailRow label="Total Price">
                    <span className="text-base font-extrabold text-[#0B5D1E]">
                      {selectedOrder.total_price_formatted}
                    </span>
                  </ModalDetailRow>
                  <ModalDetailRow
                    label="Payment Method"
                    value={selectedOrder.payment_method?.toUpperCase()}
                  />
                  <ModalDetailRow
                    label="Payment Status"
                    value={selectedOrder.payment_status}
                    isBadge={true}
                    badgeStyle={
                      selectedOrder.payment_status?.toLowerCase() === "verified" ||
                      selectedOrder.payment_status?.toLowerCase() === "paid"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }
                  />
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100 pt-2" />

                {/* ── SECTION 3 — DELIVERY INFORMATION ──────────────────────── */}
                <div className="space-y-2">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                    Delivery Information
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Assign Driver & Vehicle
                    </label>
                    <select
                      value={selectedDriverId}
                      onChange={(e) => setSelectedDriverId(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="">-- Choose an active driver --</option>
                      {drivers.map((d) => {
                        const capLabel = d.has_vehicle
                          ? `${d.remaining_capacity.toLocaleString()} kg remaining (${d.plate_number} • ${d.vehicle_model})`
                          : "No Vehicle Assigned";
                        const disabled =
                          !d.has_vehicle ||
                          d.vehicle_status?.toLowerCase() !== "active" ||
                          d.remaining_capacity < selectedOrder.ordered_quantity;

                        return (
                          <option
                            key={d.id}
                            value={d.driver_id}
                            disabled={disabled}
                          >
                            {d.name} — {capLabel} {disabled ? " [Unavailable]" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                    {/* Driver & Vehicle Capacity Snapshot Preview */}
                    {selectedDriverObj && (
                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Assigned Vehicle:</span>
                          <span className="font-semibold text-slate-800">
                            {selectedDriverObj.plate_number} ({selectedDriverObj.vehicle_model})
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Max Vehicle Capacity:</span>
                          <span className="font-semibold text-slate-800">
                            {selectedDriverObj.max.toLocaleString()} kg
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Remaining Vehicle Capacity:</span>
                          <span
                            className={`font-bold ${
                              selectedDriverObj.remaining_capacity < selectedOrder.ordered_quantity
                                ? "text-rose-600"
                                : "text-emerald-700"
                            }`}
                          >
                            {selectedDriverObj.remaining_capacity.toLocaleString()} kg
                          </span>
                        </div>

                        {selectedDriverObj.remaining_capacity < selectedOrder.ordered_quantity && (
                          <div className="mt-2 rounded-lg bg-rose-50 border border-rose-200 p-2 text-[11px] text-rose-700 font-medium flex items-center gap-1.5">
                            <AlertCircle size={14} className="shrink-0" />
                            <span>
                              Insufficient capacity. This order requires{" "}
                              {selectedOrder.ordered_quantity_formatted}, but driver has only{" "}
                              {selectedDriverObj.remaining_capacity.toLocaleString()} kg available.
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                </div>
              </div>

              {/* Modal Footer: Centered green Confirm button */}
              <div className="flex items-center justify-center px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                <button
                  type="button"
                  onClick={handleConfirmAssignment}
                  disabled={!isConfirmEnabled || actionLoading}
                  className="px-8 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#0B5D1E] hover:bg-[#084b18] rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Assigning Order...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Confirm</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── DRIVER CAPACITY DETAILS MODAL ─────────────────────────────────────── */}
      {viewDriver &&
        createPortal(
          <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div
              className="relative w-full max-w-lg sm:max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header: Driver Name, only top-right X, NO backdrop dismissal */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {viewDriver.name}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Driver Capacity & Assigned Deliveries
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCloseDriverModal}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  aria-label="Close modal"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-90px)] space-y-4">
                {/* ── SECTION 1 — DRIVER & VEHICLE CAPACITY CARD ─────────────── */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                        Assigned Vehicle
                      </div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                        <Truck size={15} className="text-slate-400 shrink-0" />
                        <span>
                          {viewDriver.has_vehicle
                            ? `${viewDriver.plate_number} • ${viewDriver.vehicle_model}`
                            : "No Vehicle Assigned"}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        (driverStatusStyles[viewDriver.status] ?? driverStatusStyles.Available).badge
                      }`}
                    >
                      {viewDriver.status}
                    </span>
                  </div>

                  {/* Capacity progress bar */}
                  {viewDriver.has_vehicle ? (
                    <div>
                      <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`${
                            (driverStatusStyles[viewDriver.status] ?? driverStatusStyles.Available).bar
                          } h-full transition-all duration-300`}
                          style={{ width: `${viewDriver.pct_used}%` }}
                        />
                      </div>
                      <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-white border border-slate-200 p-2 shadow-2xs">
                          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                            Max Capacity
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                            {viewDriver.max.toLocaleString()} kg
                          </div>
                        </div>
                        <div className="rounded-lg bg-white border border-slate-200 p-2 shadow-2xs">
                          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                            Pending Load
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-amber-700 mt-0.5">
                            {viewDriver.current_load.toLocaleString()} kg
                          </div>
                        </div>
                        <div className="rounded-lg bg-white border border-slate-200 p-2 shadow-2xs">
                          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                            Remaining
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-[#0B5D1E] mt-0.5">
                            {viewDriver.remaining_capacity.toLocaleString()} kg
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic py-1">
                      No vehicle currently assigned to this driver. Assign an active vehicle to enable deliveries.
                    </div>
                  )}
                </div>

                {/* ── SECTION 2 — CURRENTLY ASSIGNED DELIVERIES TABLE ──────────── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Currently Assigned Deliveries
                    </div>
                    <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-bold">
                      {driverDeliveries.length} {driverDeliveries.length === 1 ? "Order" : "Orders"}
                    </span>
                  </div>

                  {loadingDeliveries ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      <Loader2 className="animate-spin inline-block mr-1.5" size={16} />
                      Loading assigned deliveries...
                    </div>
                  ) : driverDeliveries.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
                      <PackageCheck size={32} className="mx-auto text-slate-300 mb-2" />
                      <div className="text-xs font-bold text-slate-700">No Pending Deliveries</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        This driver currently has no assigned deliveries in progress.
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-[10px] sm:text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                            <th className="py-2.5 px-3">Batch No</th>
                            <th className="py-2.5 px-3">Product</th>
                            <th className="py-2.5 px-3 text-right">Quantity (kg)</th>
                            <th className="py-2.5 px-3">Buyer</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {driverDeliveries.map((del) => (
                            <tr
                              key={del.assignment_id || del.online_order_id}
                              className="hover:bg-slate-50/60 transition-colors"
                            >
                              <td className="py-2.5 px-3 font-semibold text-slate-800 font-mono text-[11px]">
                                <div>{del.batch_no}</div>
                                {del.is_replacement && (
                                  <span className="inline-block mt-0.5 rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-700 uppercase">
                                    Replacement
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-slate-700 font-medium">
                                {del.product_name}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                {del.quantity_formatted}
                              </td>
                              <td className="py-2.5 px-3 text-slate-700">
                                <div className="font-semibold text-slate-800">
                                  {del.buyer_name}
                                </div>
                                {del.buyer_type && (
                                  <div className="text-[10px] text-slate-400">
                                    {del.buyer_type}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}