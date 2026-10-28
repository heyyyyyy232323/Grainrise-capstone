import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Calendar,
  ChevronDown,
  ChevronUp,
  X,
  Truck,
  UserCheck,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import useApi from "../../../Components/hooks/useApi";
import useToast from "../../../Components/hooks/useToast";
import Toast from "../../../Components/Minor-Components/Toast";

// ─── Status & Sort Dropdown Options ───────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "changed", label: "Changed" },
];

const SORT_OPTIONS = [
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc", label: "Oldest First" },
  { value: "model-asc", label: "Model (A-Z)" },
  { value: "model-desc", label: "Model (Z-A)" },
  { value: "plate-asc", label: "Plate Number (A-Z)" },
  { value: "plate-desc", label: "Plate Number (Z-A)" },
  { value: "driver-asc", label: "Driver (A-Z)" },
  { value: "driver-desc", label: "Driver (Z-A)" },
];

const vehicleStatusStyleMap = {
  active: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  inactive: "bg-slate-100 text-slate-700 border border-slate-200",
  "for maintenance": "bg-amber-100 text-amber-700 border border-amber-200",
  maintenance: "bg-amber-100 text-amber-700 border border-amber-200",
};

const getVehicleStatusLabel = (status) => {
  if (!status) return "Active";
  const key = String(status).toLowerCase();
  if (key === "for maintenance" || key === "maintenance") return "For Maintenance";
  return key.charAt(0).toUpperCase() + key.slice(1);
};

// ─── Photo URL Resolver ───────────────────────────────────────────────────────
const resolvePhotoUrl = (photoPath) => {
  if (!photoPath) return null;
  const path = String(photoPath).trim();
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("//") ||
    path.startsWith("data:") ||
    path.startsWith("blob:")
  ) {
    return path;
  }
  let clean = path.replace(/^\/+/, "");
  while (clean.startsWith("media/")) {
    clean = clean.slice(6);
  }
  const backendBase = (
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
  ).replace(/\/$/, "");
  return `${backendBase}/media/${clean}`;
};

// ─── Format Capacity for Display ──────────────────────────────────────────────
const formatCapacityDisplay = (val) => {
  if (!val && val !== 0) return "—";
  const clean = String(val).replace(/[^0-9.]/g, "");
  if (!clean) return String(val);
  const num = parseFloat(clean);
  if (isNaN(num)) return String(val);
  return `${num.toLocaleString()} kg`;
};

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

// ─── Custom Filter Dropdown ───────────────────────────────────────────────────
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
        <span>{displayLabel}</span>
        {isOpen ? (
          <ChevronUp size={16} className="text-slate-500" />
        ) : (
          <ChevronDown size={16} className="text-slate-500" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 bg-white border border-gray-100 rounded-2xl shadow-xl p-1.5 z-30 w-52 animate-in fade-in zoom-in-95 duration-100">
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WarehouseAssignedHistory() {
  const { request } = useApi();
  const { toasts, showToast, removeToast } = useToast();

  // Data & Loading States
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Filters
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [page, setPage] = useState(1);

  // Date Range Filter States
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [tempDateRange, setTempDateRange] = useState({ startDate: "", endDate: "" });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateRef = useRef(null);

  // View Details Modal States
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [viewImageError, setViewImageError] = useState(false);

  // Click outside listener for date picker
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dateRef.current && !dateRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Assigned History from Backend (on mount and on manual refresh)
  const fetchAssignedHistory = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await request("/warehouse/logistics/assigned-history/");

      if (res && res.success) {
        const mapped = (res.assignments || []).map((item) => ({
          ...item,
          id: item.assigned_id,
          assignedOn: item.assigned_on_formatted || item.assigned_on,
        }));
        setAssignments(mapped);
      } else {
        throw new Error(res?.message || "Failed to load vehicle assignment history.");
      }
    } catch (err) {
      console.error("Error fetching vehicle assignment history:", err);
      setFetchError(err.message || "Failed to load vehicle assignment history.");
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    fetchAssignedHistory();
  }, [fetchAssignedHistory]);

  // Date picker handlers with Start / End Date validation
  const handleStartDateChange = (val) => {
    setTempDateRange((prev) => {
      const next = { ...prev, startDate: val };
      if (next.endDate && next.endDate < val) {
        next.endDate = "";
      }
      return next;
    });
  };

  const handleEndDateChange = (val) => {
    if (tempDateRange.startDate && val < tempDateRange.startDate) {
      showToast("End Date cannot be earlier than Start Date.", "error");
      return;
    }
    setTempDateRange((prev) => ({ ...prev, endDate: val }));
  };

  const handleDateApply = () => {
    if (!tempDateRange.startDate && tempDateRange.endDate) {
      showToast("Please specify a Start Date.", "error");
      return;
    }
    if (
      tempDateRange.startDate &&
      tempDateRange.endDate &&
      tempDateRange.startDate > tempDateRange.endDate
    ) {
      showToast("End Date cannot be earlier than Start Date.", "error");
      return;
    }
    setDateRange({ ...tempDateRange });
    setShowDatePicker(false);
    setPage(1);
  };

  const handleDateReset = () => {
    setTempDateRange({ startDate: "", endDate: "" });
    setDateRange({ startDate: "", endDate: "" });
    setShowDatePicker(false);
    setPage(1);
  };

  // View Details Modal Open / Close
  const handleOpenViewDetails = (row) => {
    setSelectedRecord(row);
    setViewImageError(false);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedRecord(null);
    setViewImageError(false);
  };

  // Table Columns Definition
  const columns = [
    { key: "model", label: "Model" },
    { key: "driver", label: "Assigned Driver" },
    {
      key: "status",
      label: "Status",
      renderCell: (row) => {
        const isAct = String(row.status || row.assignment_status).toLowerCase() === "active";
        return (
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
              isAct
                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                : "bg-amber-100 text-amber-800 border border-amber-200"
            }`}
          >
            {row.status || row.assignment_status || "Active"}
          </span>
        );
      },
    },
    { key: "assignedOn", label: "Assigned On" },
    {
      key: "action",
      label: "Action",
      headerClassName: "text-center",
      cellClassName: "!text-center !pr-3",
    },
  ];

  // Blazingly fast in-memory filtering & sorting
  const filteredAssignments = useMemo(() => {
    const q = query.trim().toLowerCase();

    let result = assignments.filter((item) => {
      const matchesQuery =
        q === "" ||
        [item.model, item.plate_number, item.driver, item.driver_name]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "all" ||
        String(item.status || item.assignment_status || "").toLowerCase() === statusFilter.toLowerCase();

      const itemDate = item.isoDate || (item.created_at ? item.created_at.slice(0, 10) : "");
      const matchesStart = !dateRange.startDate || itemDate >= dateRange.startDate;
      const matchesEnd = !dateRange.endDate || itemDate <= dateRange.endDate;

      return matchesQuery && matchesStatus && matchesStart && matchesEnd;
    });

    result.sort((a, b) => {
      if (sortBy === "model-asc") {
        return (a.model || "").localeCompare(b.model || "");
      }
      if (sortBy === "model-desc") {
        return (b.model || "").localeCompare(a.model || "");
      }
      if (sortBy === "plate-asc") {
        return (a.plate_number || "").localeCompare(b.plate_number || "");
      }
      if (sortBy === "plate-desc") {
        return (b.plate_number || "").localeCompare(a.plate_number || "");
      }
      if (sortBy === "driver-asc") {
        return (a.driver || a.driver_name || "").localeCompare(b.driver || b.driver_name || "");
      }
      if (sortBy === "driver-desc") {
        return (b.driver || b.driver_name || "").localeCompare(a.driver || a.driver_name || "");
      }
      if (sortBy === "date-asc") {
        return (a.id || 0) - (b.id || 0);
      }
      // date-desc default
      return (b.id || 0) - (a.id || 0);
    });

    return result;
  }, [assignments, query, statusFilter, dateRange, sortBy]);

  // Client Pagination on Filtered Results
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginated = filteredAssignments.slice(startIndex, startIndex + itemsPerPage);
  const sections = useMemo(() => [{ rows: paginated }], [paginated]);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Records", path: "/warehouse-logistics/dashboard" },
          { label: "Assigned History" },
        ]}
      />

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Assigned History</h1>
        <p className="text-sm text-slate-500 mt-1">
          View all vehicle assignment history and driver allocations.
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
            placeholder="Search model, plate no., or driver"
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

        {/* 3. Status Filter Dropdown */}
        <CustomDropdown
          label="All Statuses"
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        />

        {/* 4. Sort Dropdown */}
        <CustomDropdown
          label="Sort By"
          options={SORT_OPTIONS}
          value={sortBy}
          onChange={(v) => {
            setSortBy(v);
            setPage(1);
          }}
        />

        {/* 5. Refresh Button */}
        <button
          type="button"
          onClick={fetchAssignedHistory}
          disabled={loading}
          className="flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-gray-50 transition cursor-pointer h-[38px]"
          title="Refresh assignments"
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
            onClick={fetchAssignedHistory}
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
        emptyStateTitle={loading ? "Loading vehicle assignments..." : "No records found"}
        emptyStateDescription={
          loading
            ? "Fetching vehicle assignment history from server..."
            : "No vehicle assignment records match the selected filters or search criteria."
        }
        footerLabel={`Showing ${
          filteredAssignments.length === 0 ? 0 : startIndex + 1
        }-${Math.min(startIndex + itemsPerPage, filteredAssignments.length)} of ${
          filteredAssignments.length
        } records`}
      />

      {/* ── View Details Modal ────────────────────────────────────────────── */}
      {isViewModalOpen && selectedRecord && (
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="relative w-full max-w-md sm:max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {selectedRecord.plate_number || selectedRecord.model || "Vehicle Details"}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">Delivery Vehicle Details</p>
                </div>
                {/* Top X button only — No bottom close button */}
                <button
                  type="button"
                  onClick={handleCloseViewModal}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  aria-label="Close details"
                  title="Close details"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-90px)] space-y-4">
                {/* Vehicle Photo or Fallback Placeholder */}
                <div className="flex flex-col items-center justify-center py-2">
                  <div className="w-32 h-32 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center shadow-xs">
                    {resolvePhotoUrl(selectedRecord.photo || selectedRecord.photo_url) &&
                    !viewImageError ? (
                      <img
                        src={resolvePhotoUrl(selectedRecord.photo || selectedRecord.photo_url)}
                        alt={selectedRecord.plate_number || "Vehicle"}
                        className="h-full w-full object-cover"
                        onError={() => setViewImageError(true)}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-300">
                        <Truck size={36} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1.5">
                          No Photo
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vehicle Specifications */}
                <div className="space-y-1">
                  <ModalDetailRow label="Plate Number" value={selectedRecord.plate_number} />
                  <ModalDetailRow label="Type" value={selectedRecord.type} />
                  <ModalDetailRow label="Model" value={selectedRecord.model} />
                  <ModalDetailRow
                    label="Number of Wheels"
                    value={`${selectedRecord.number_of_wheels || 4} Wheels`}
                  />
                  <ModalDetailRow
                    label="Capacity"
                    value={
                      selectedRecord.capacity_formatted ||
                      formatCapacityDisplay(selectedRecord.capacity)
                    }
                  />
                  <ModalDetailRow
                    label="Vehicle Status"
                    value={getVehicleStatusLabel(selectedRecord.vehicle_status)}
                    isBadge={true}
                    badgeStyle={
                      vehicleStatusStyleMap[selectedRecord.vehicle_status?.toLowerCase()] ||
                      "bg-gray-100 text-gray-700 border border-gray-200"
                    }
                  />

                  {/* Inactive Reason (if inactive) */}
                  {selectedRecord.vehicle_status === "inactive" &&
                    selectedRecord.inactive_reason && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 mt-2 space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Inactive Reason:
                        </span>
                        <p className="text-xs sm:text-sm text-slate-800 break-words font-medium">
                          {selectedRecord.inactive_reason}
                        </p>
                      </div>
                    )}

                  {/* Maintenance Reason (if maintenance) */}
                  {(selectedRecord.vehicle_status === "for maintenance" ||
                    selectedRecord.vehicle_status === "maintenance") &&
                    selectedRecord.maintenance_reason && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 mt-2 space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                          Maintenance Reason:
                        </span>
                        <p className="text-xs sm:text-sm text-amber-900 break-words font-medium">
                          {selectedRecord.maintenance_reason}
                        </p>
                      </div>
                    )}
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100 pt-2" />

                {/* Driver & Assignment Details */}
                <div className="space-y-1">
                  <ModalDetailRow label="Assigned Driver">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-right">
                      <UserCheck size={14} className="text-emerald-600 shrink-0" />
                      <span>
                        {selectedRecord.driver || selectedRecord.driver_name || "N/A"}
                      </span>
                    </div>
                  </ModalDetailRow>

                  <ModalDetailRow
                    label="Assignment Status"
                    value={selectedRecord.status || selectedRecord.assignment_status || "Active"}
                    isBadge={true}
                    badgeStyle={
                      String(
                        selectedRecord.status || selectedRecord.assignment_status
                      ).toLowerCase() === "active"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    }
                  />

                  <ModalDetailRow
                    label="Assigned On"
                    value={
                      selectedRecord.assigned_on_formatted ||
                      selectedRecord.assigned_on ||
                      selectedRecord.assignedOn ||
                      "—"
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