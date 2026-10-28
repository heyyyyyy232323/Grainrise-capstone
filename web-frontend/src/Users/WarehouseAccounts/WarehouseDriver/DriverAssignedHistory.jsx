import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Calendar,
  ChevronDown,
  ChevronUp,
  X,
  Truck,
  AlertCircle,
  RefreshCw,
  ImageIcon,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import Tabs from "../../../Components/Minor-Components/Tabs";
import useToast from "../../../Components/hooks/useToast";
import Toast from "../../../Components/Minor-Components/Toast";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const getAuthToken = () => {
  return (
    localStorage.getItem("grainrise_token") ||
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("grainrise_token") ||
    ""
  );
};

// ─── TABS DEFINITION ──────────────────────────────────────────────────────────
const TABS = [
  { id: "fulfillment", label: "Fulfillment History" },
  { id: "vehicle", label: "Vehicle Assignee History" },
];

// ─── FULFILLMENT TAB CONFIGURATIONS ───────────────────────────────────────────
const BUYER_TYPE_OPTIONS = [
  { value: "retailer", label: "Retailer" },
];

const FULFILLMENT_SORT_OPTIONS = [
  { value: "variant-asc", label: "Variant (A-Z)" },
  { value: "variant-desc", label: "Variant (Z-A)" },
  { value: "customer-asc", label: "Customer Name (A-Z)" },
  { value: "customer-desc", label: "Customer Name (Z-A)" },
  { value: "delivered-desc", label: "Delivered Qty (Highest)" },
  { value: "delivered-asc", label: "Delivered Qty (Lowest)" },
  { value: "passed-desc", label: "Passed QC (Highest)" },
  { value: "passed-asc", label: "Passed QC (Lowest)" },
  { value: "failed-desc", label: "Failed QC (Highest)" },
  { value: "failed-asc", label: "Failed QC (Lowest)" },
  { value: "cost-desc", label: "Cost (Highest)" },
  { value: "cost-asc", label: "Cost (Lowest)" },
];

// ─── VEHICLE ASSIGNEE TAB CONFIGURATIONS ───────────────────────────────────────
const VEHICLE_STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "changed", label: "Changed" },
];

const VEHICLE_SORT_OPTIONS = [
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc", label: "Oldest First" },
  { value: "model-asc", label: "Model (A-Z)" },
  { value: "model-desc", label: "Model (Z-A)" },
  { value: "plate-asc", label: "Plate Number (A-Z)" },
  { value: "plate-desc", label: "Plate Number (Z-A)" },
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
  return `${API_BASE}/media/${clean}`;
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
          {value || "—"}
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
        <span className="truncate max-w-[160px]">{displayLabel}</span>
        {isOpen ? (
          <ChevronUp size={16} className="text-slate-500 shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-slate-500 shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 bg-white border border-gray-100 rounded-2xl shadow-xl p-1.5 z-30 w-52 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
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
export default function DriverAssignedHistory() {
  const { toasts, showToast, removeToast } = useToast();

  const [activeTab, setActiveTab] = useState("fulfillment");

  // ═════════════════════════════════════════════════════════════════════════════
  // TAB 1: FULFILLMENT HISTORY STATES
  // ═════════════════════════════════════════════════════════════════════════════
  const [fulfillmentRecords, setFulfillmentRecords] = useState([]);
  const [fulfillmentVariants, setFulfillmentVariants] = useState([]);
  const [fulfillmentLoading, setFulfillmentLoading] = useState(false);
  const [fulfillmentError, setFulfillmentError] = useState(null);

  const [fulfillmentQuery, setFulfillmentQuery] = useState("");
  const [variantFilter, setVariantFilter] = useState("all");
  const [buyerTypeFilter, setBuyerTypeFilter] = useState("retailer");
  const [fulfillmentSort, setFulfillmentSort] = useState("variant-asc");
  const [fulfillmentDateRange, setFulfillmentDateRange] = useState({ startDate: "", endDate: "" });
  const [fulfillmentTempDateRange, setFulfillmentTempDateRange] = useState({ startDate: "", endDate: "" });
  const [showFulfillmentDatePicker, setShowFulfillmentDatePicker] = useState(false);
  const fulfillmentDateRef = useRef(null);

  const [fulfillmentPage, setFulfillmentPage] = useState(1);
  const [isFulfillmentModalOpen, setIsFulfillmentModalOpen] = useState(false);
  const [selectedFulfillment, setSelectedFulfillment] = useState(null);

  // ═════════════════════════════════════════════════════════════════════════════
  // TAB 2: VEHICLE ASSIGNEE HISTORY STATES
  // ═════════════════════════════════════════════════════════════════════════════
  const [vehicleAssignments, setVehicleAssignments] = useState([]);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [vehicleError, setVehicleError] = useState(null);

  const [vehicleQuery, setVehicleQuery] = useState("");
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState("all");
  const [vehicleSort, setVehicleSort] = useState("date-desc");
  const [vehicleDateRange, setVehicleDateRange] = useState({ startDate: "", endDate: "" });
  const [vehicleTempDateRange, setVehicleTempDateRange] = useState({ startDate: "", endDate: "" });
  const [showVehicleDatePicker, setShowVehicleDatePicker] = useState(false);
  const vehicleDateRef = useRef(null);

  const [vehiclePage, setVehiclePage] = useState(1);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehicleImageError, setVehicleImageError] = useState(false);

  // ═════════════════════════════════════════════════════════════════════════════
  // OUTSIDE CLICK LISTENERS FOR DATE PICKERS
  // ═════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (fulfillmentDateRef.current && !fulfillmentDateRef.current.contains(e.target)) {
        setShowFulfillmentDatePicker(false);
      }
      if (vehicleDateRef.current && !vehicleDateRef.current.contains(e.target)) {
        setShowVehicleDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lock body scroll when either detail modal is open
  useEffect(() => {
    if (isFulfillmentModalOpen || isVehicleModalOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isFulfillmentModalOpen, isVehicleModalOpen]);

  // ═════════════════════════════════════════════════════════════════════════════
  // FETCH FULFILLMENT VARIANTS & RECORDS
  // ═════════════════════════════════════════════════════════════════════════════
  const fetchFulfillmentVariants = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      const res = await fetch(`${API_BASE}/api/warehouse-employees/driver/fulfillment-history/variants/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          setFulfillmentVariants(data.variants || []);
        }
      }
    } catch (err) {
      console.warn("Could not fetch warehouse driver fulfillment variants:", err);
    }
  }, []);

  useEffect(() => {
    fetchFulfillmentVariants();
  }, [fetchFulfillmentVariants]);

  const fetchFulfillmentHistory = useCallback(async () => {
    setFulfillmentLoading(true);
    setFulfillmentError(null);
    try {
      const token = getAuthToken();
      const params = new URLSearchParams();
      if (fulfillmentQuery.trim()) params.append("search", fulfillmentQuery.trim());
      if (variantFilter && variantFilter !== "all") params.append("variant", variantFilter);
      if (buyerTypeFilter && buyerTypeFilter !== "all") params.append("buyer_type", buyerTypeFilter);
      if (fulfillmentSort) params.append("sort", fulfillmentSort);
      if (fulfillmentDateRange.startDate) params.append("start_date", fulfillmentDateRange.startDate);
      if (fulfillmentDateRange.endDate) params.append("end_date", fulfillmentDateRange.endDate);

      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`${API_BASE}/api/warehouse-employees/driver/fulfillment-history/${qs}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFulfillmentRecords(data.fulfillments || []);
      } else {
        throw new Error(data?.message || "Failed to load fulfillment history.");
      }
    } catch (err) {
      console.error("Error fetching warehouse driver fulfillment history:", err);
      setFulfillmentError(err.message || "Failed to load fulfillment history.");
      setFulfillmentRecords([]);
    } finally {
      setFulfillmentLoading(false);
    }
  }, [fulfillmentQuery, variantFilter, buyerTypeFilter, fulfillmentSort, fulfillmentDateRange]);

  useEffect(() => {
    if (activeTab === "fulfillment") {
      fetchFulfillmentHistory();
    }
  }, [activeTab, fetchFulfillmentHistory]);

  // ═════════════════════════════════════════════════════════════════════════════
  // FETCH VEHICLE ASSIGNEE HISTORY
  // ═════════════════════════════════════════════════════════════════════════════
  const fetchVehicleAssignedHistory = useCallback(async () => {
    setVehicleLoading(true);
    setVehicleError(null);
    try {
      const token = getAuthToken();
      const params = new URLSearchParams();
      if (vehicleQuery.trim()) params.append("search", vehicleQuery.trim());
      if (vehicleStatusFilter && vehicleStatusFilter !== "all") params.append("status", vehicleStatusFilter);
      if (vehicleSort) params.append("sort", vehicleSort);
      if (vehicleDateRange.startDate) params.append("start_date", vehicleDateRange.startDate);
      if (vehicleDateRange.endDate) params.append("end_date", vehicleDateRange.endDate);

      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`${API_BASE}/api/warehouse-employees/driver/vehicle-assigned-history/${qs}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const mapped = (data.assignments || []).map((item) => ({
          ...item,
          id: item.assigned_id,
          assignedOn: item.assigned_on_formatted || item.assigned_on,
        }));
        setVehicleAssignments(mapped);
      } else {
        throw new Error(data?.message || "Failed to load vehicle assignment history.");
      }
    } catch (err) {
      console.error("Error fetching warehouse driver vehicle assignment history:", err);
      setVehicleError(err.message || "Failed to load vehicle assignment history.");
      setVehicleAssignments([]);
    } finally {
      setVehicleLoading(false);
    }
  }, [vehicleQuery, vehicleStatusFilter, vehicleSort, vehicleDateRange]);

  useEffect(() => {
    if (activeTab === "vehicle") {
      fetchVehicleAssignedHistory();
    }
  }, [activeTab, fetchVehicleAssignedHistory]);

  // ═════════════════════════════════════════════════════════════════════════════
  // DATE RANGE HANDLERS
  // ═════════════════════════════════════════════════════════════════════════════
  const handleFulfillmentStartDateChange = (val) => {
    setFulfillmentTempDateRange((prev) => {
      const next = { ...prev, startDate: val };
      if (val && prev.endDate && prev.endDate < val) next.endDate = val;
      return next;
    });
  };

  const handleFulfillmentEndDateChange = (val) => {
    setFulfillmentTempDateRange((prev) => ({ ...prev, endDate: val }));
  };

  const handleFulfillmentDateApply = () => {
    if (
      fulfillmentTempDateRange.startDate &&
      fulfillmentTempDateRange.endDate &&
      fulfillmentTempDateRange.endDate < fulfillmentTempDateRange.startDate
    ) {
      showToast({
        title: "Invalid Range",
        message: "End date cannot be earlier than start date.",
        type: "warning",
      });
      return;
    }
    setFulfillmentDateRange({ ...fulfillmentTempDateRange });
    setFulfillmentPage(1);
    setShowFulfillmentDatePicker(false);
  };

  const handleFulfillmentDateReset = () => {
    const empty = { startDate: "", endDate: "" };
    setFulfillmentTempDateRange(empty);
    setFulfillmentDateRange(empty);
    setFulfillmentPage(1);
    setShowFulfillmentDatePicker(false);
  };

  const handleVehicleStartDateChange = (val) => {
    setVehicleTempDateRange((prev) => {
      const next = { ...prev, startDate: val };
      if (val && prev.endDate && prev.endDate < val) next.endDate = val;
      return next;
    });
  };

  const handleVehicleEndDateChange = (val) => {
    setVehicleTempDateRange((prev) => ({ ...prev, endDate: val }));
  };

  const handleVehicleDateApply = () => {
    if (
      vehicleTempDateRange.startDate &&
      vehicleTempDateRange.endDate &&
      vehicleTempDateRange.endDate < vehicleTempDateRange.startDate
    ) {
      showToast({
        title: "Invalid Range",
        message: "End date cannot be earlier than start date.",
        type: "warning",
      });
      return;
    }
    setVehicleDateRange({ ...vehicleTempDateRange });
    setVehiclePage(1);
    setShowVehicleDatePicker(false);
  };

  const handleVehicleDateReset = () => {
    const empty = { startDate: "", endDate: "" };
    setVehicleTempDateRange(empty);
    setVehicleDateRange(empty);
    setVehiclePage(1);
    setShowVehicleDatePicker(false);
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // MODAL HANDLERS
  // ═════════════════════════════════════════════════════════════════════════════
  const handleOpenFulfillmentDetails = (row) => {
    setSelectedFulfillment(row);
    setIsFulfillmentModalOpen(true);
  };

  const handleCloseFulfillmentModal = () => {
    setIsFulfillmentModalOpen(false);
    setSelectedFulfillment(null);
  };

  const handleOpenVehicleDetails = (row) => {
    setSelectedVehicle(row);
    setVehicleImageError(false);
    setIsVehicleModalOpen(true);
  };

  const handleCloseVehicleModal = () => {
    setIsVehicleModalOpen(false);
    setSelectedVehicle(null);
    setVehicleImageError(false);
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // FULFILLMENT TAB COLUMNS & PAGINATION
  // ═════════════════════════════════════════════════════════════════════════════
  const variantOptions = useMemo(() => {
    const opts = [{ value: "all", label: "All Variants" }];
    const unique = new Set(fulfillmentVariants);
    unique.forEach((v) => {
      opts.push({ value: v, label: v });
    });
    return opts;
  }, [fulfillmentVariants]);

  const fulfillmentColumns = [
    { key: "variant", label: "Variant", width: "18%" },
    { key: "customer", label: "Customer Name", width: "22%" },
    { key: "delivered", label: "Delivered (kg)", width: "16%" },
    { key: "passed", label: "Passed QC (kg)", width: "16%" },
    { key: "failed", label: "Failed QC (kg)", width: "16%" },
    {
      key: "action",
      label: "Action",
      width: "12%",
      headerClassName: "text-center",
      cellClassName: "!text-center",
    },
  ];

  const itemsPerPage = 10;

  const fulfillmentTotalPages = Math.max(1, Math.ceil(fulfillmentRecords.length / itemsPerPage));
  const fulfillmentSafePage = Math.min(fulfillmentPage, fulfillmentTotalPages);
  const fulfillmentStart = (fulfillmentSafePage - 1) * itemsPerPage;
  const fulfillmentPaginated = fulfillmentRecords.slice(fulfillmentStart, fulfillmentStart + itemsPerPage);
  const fulfillmentSections = useMemo(() => [{ rows: fulfillmentPaginated }], [fulfillmentPaginated]);

  // ═════════════════════════════════════════════════════════════════════════════
  // VEHICLE ASSIGNEE TAB COLUMNS & PAGINATION
  // Note: Assigned Driver column removed per instruction
  // ═════════════════════════════════════════════════════════════════════════════
  const vehicleColumns = [
    { key: "model", label: "Model" },
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

  const vehicleTotalPages = Math.max(1, Math.ceil(vehicleAssignments.length / itemsPerPage));
  const vehicleSafePage = Math.min(vehiclePage, vehicleTotalPages);
  const vehicleStart = (vehicleSafePage - 1) * itemsPerPage;
  const vehiclePaginated = vehicleAssignments.slice(vehicleStart, vehicleStart + itemsPerPage);
  const vehicleSections = useMemo(() => [{ rows: vehiclePaginated }], [vehiclePaginated]);

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Header ────────────────────────────────────────────── */}
      <Breadcrumbs
        items={[
          { label: "Records", path: "/warehouse-driver/assigned-history" },
          { label: "Assigned History" },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Assigned History
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            View completed fulfillment records and vehicle assignment history.
          </p>
        </div>
      </div>

      {/* ── Segmentation Tabs ──────────────────────────────────────────────── */}
      <Tabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(t) => {
          setActiveTab(t);
        }}
      />

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: FULFILLMENT HISTORY                                              */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "fulfillment" && (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {/* 1. Search Filter */}
            <div className="relative min-w-[220px] max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={fulfillmentQuery}
                onChange={(e) => {
                  setFulfillmentQuery(e.target.value);
                  setFulfillmentPage(1);
                }}
                placeholder="Search order no., batch no., product, or customer"
                className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-white placeholder-gray-400 text-gray-700 h-[38px]"
              />
              {fulfillmentQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setFulfillmentQuery("");
                    setFulfillmentPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* 2. Date Range Picker */}
            <div className="relative w-full sm:w-auto" ref={fulfillmentDateRef}>
              <button
                type="button"
                onClick={() => setShowFulfillmentDatePicker((prev) => !prev)}
                className={`flex items-center gap-2 border border-gray-200 bg-white px-3.5 py-2 rounded-xl text-sm font-medium text-slate-800 hover:bg-gray-50 w-full sm:w-auto justify-between transition-colors cursor-pointer h-[38px] ${
                  fulfillmentDateRange.startDate ? "border-emerald-500 text-emerald-700 bg-emerald-50/40" : ""
                }`}
              >
                <span>
                  {fulfillmentDateRange.startDate
                    ? `${fulfillmentDateRange.startDate} - ${fulfillmentDateRange.endDate || "..."}`
                    : "Date Range"}
                </span>
                <Calendar
                  size={16}
                  className={fulfillmentDateRange.startDate ? "text-emerald-600" : "text-gray-500"}
                />
              </button>

              {showFulfillmentDatePicker && (
                <div className="absolute top-full mt-2 left-0 sm:left-auto bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-20 w-64">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={fulfillmentTempDateRange.startDate}
                        onChange={(e) => handleFulfillmentStartDateChange(e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        min={fulfillmentTempDateRange.startDate || undefined}
                        value={fulfillmentTempDateRange.endDate}
                        onChange={(e) => handleFulfillmentEndDateChange(e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleFulfillmentDateReset}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors cursor-pointer"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={handleFulfillmentDateApply}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-[#0B5D1E] hover:bg-[#084b18] rounded transition-colors cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Variant Filter */}
            <CustomDropdown
              label="All Variants"
              options={variantOptions}
              value={variantFilter}
              onChange={(v) => {
                setVariantFilter(v);
                setFulfillmentPage(1);
              }}
            />

            {/* 4. Buyer Type Filter (Retailer Only for Warehouse) */}
            <CustomDropdown
              label="Retailer"
              options={BUYER_TYPE_OPTIONS}
              value={buyerTypeFilter}
              onChange={(v) => {
                setBuyerTypeFilter(v);
                setFulfillmentPage(1);
              }}
            />

            {/* 5. Sort By */}
            <CustomDropdown
              label="Sort By"
              options={FULFILLMENT_SORT_OPTIONS}
              value={fulfillmentSort}
              onChange={(v) => {
                setFulfillmentSort(v);
                setFulfillmentPage(1);
              }}
            />

            {/* 6. Refresh Button */}
            <button
              type="button"
              onClick={fetchFulfillmentHistory}
              disabled={fulfillmentLoading}
              className="p-2 border border-gray-200 bg-white rounded-xl text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer h-[38px] w-[38px] flex items-center justify-center shrink-0"
              title="Refresh Fulfillment History"
            >
              <RefreshCw size={16} className={fulfillmentLoading ? "animate-spin text-[#0B5D1E]" : ""} />
            </button>
          </div>

          {/* Error Banner */}
          {fulfillmentError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertCircle size={16} className="shrink-0" />
              <span>{fulfillmentError}</span>
              <button
                type="button"
                onClick={fetchFulfillmentHistory}
                className="ml-auto underline font-medium cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Table Card */}
          <SectionedTableCard
            columns={fulfillmentColumns}
            sections={fulfillmentSections}
            currentPage={fulfillmentSafePage}
            totalPages={fulfillmentTotalPages}
            onPageChange={setFulfillmentPage}
            onViewDetails={handleOpenFulfillmentDetails}
            viewDetailsLabel="View Details"
            emptyStateTitle={fulfillmentLoading ? "Loading fulfillment records..." : "No fulfillment records found"}
            emptyStateDescription={
              fulfillmentLoading
                ? "Fetching fulfillment and receiving history from server..."
                : "There are no receiving or fulfillment history records for your assigned deliveries yet."
            }
            footerLabel={`Showing ${
              fulfillmentRecords.length === 0 ? 0 : fulfillmentStart + 1
            }-${Math.min(fulfillmentStart + itemsPerPage, fulfillmentRecords.length)} of ${
              fulfillmentRecords.length
            } fulfillment records`}
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: VEHICLE ASSIGNEE HISTORY                                         */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "vehicle" && (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {/* 1. Search Filter */}
            <div className="relative min-w-[220px] max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={vehicleQuery}
                onChange={(e) => {
                  setVehicleQuery(e.target.value);
                  setVehiclePage(1);
                }}
                placeholder="Search model, plate no., or type"
                className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-white placeholder-gray-400 text-gray-700 h-[38px]"
              />
              {vehicleQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setVehicleQuery("");
                    setVehiclePage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* 2. Date Range Picker */}
            <div className="relative w-full sm:w-auto" ref={vehicleDateRef}>
              <button
                type="button"
                onClick={() => setShowVehicleDatePicker((prev) => !prev)}
                className={`flex items-center gap-2 border border-gray-200 bg-white px-3.5 py-2 rounded-xl text-sm font-medium text-slate-800 hover:bg-gray-50 w-full sm:w-auto justify-between transition-colors cursor-pointer h-[38px] ${
                  vehicleDateRange.startDate ? "border-emerald-500 text-emerald-700 bg-emerald-50/40" : ""
                }`}
              >
                <span>
                  {vehicleDateRange.startDate
                    ? `${vehicleDateRange.startDate} - ${vehicleDateRange.endDate || "..."}`
                    : "Date Range"}
                </span>
                <Calendar
                  size={16}
                  className={vehicleDateRange.startDate ? "text-emerald-600" : "text-gray-500"}
                />
              </button>

              {showVehicleDatePicker && (
                <div className="absolute top-full mt-2 left-0 sm:left-auto bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-20 w-64">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={vehicleTempDateRange.startDate}
                        onChange={(e) => handleVehicleStartDateChange(e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        min={vehicleTempDateRange.startDate || undefined}
                        value={vehicleTempDateRange.endDate}
                        onChange={(e) => handleVehicleEndDateChange(e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleVehicleDateReset}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors cursor-pointer"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={handleVehicleDateApply}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-[#0B5D1E] hover:bg-[#084b18] rounded transition-colors cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Status Filter */}
            <CustomDropdown
              label="All Statuses"
              options={VEHICLE_STATUS_OPTIONS}
              value={vehicleStatusFilter}
              onChange={(v) => {
                setVehicleStatusFilter(v);
                setVehiclePage(1);
              }}
            />

            {/* 4. Sort By */}
            <CustomDropdown
              label="Sort By"
              options={VEHICLE_SORT_OPTIONS}
              value={vehicleSort}
              onChange={(v) => {
                setVehicleSort(v);
                setVehiclePage(1);
              }}
            />

            {/* 5. Refresh Button */}
            <button
              type="button"
              onClick={fetchVehicleAssignedHistory}
              disabled={vehicleLoading}
              className="p-2 border border-gray-200 bg-white rounded-xl text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer h-[38px] w-[38px] flex items-center justify-center shrink-0"
              title="Refresh Vehicle Assignment History"
            >
              <RefreshCw size={16} className={vehicleLoading ? "animate-spin text-[#0B5D1E]" : ""} />
            </button>
          </div>

          {/* Error Banner */}
          {vehicleError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertCircle size={16} className="shrink-0" />
              <span>{vehicleError}</span>
              <button
                type="button"
                onClick={fetchVehicleAssignedHistory}
                className="ml-auto underline font-medium cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Table Card (No Assigned Driver column per instruction) */}
          <SectionedTableCard
            columns={vehicleColumns}
            sections={vehicleSections}
            currentPage={vehicleSafePage}
            totalPages={vehicleTotalPages}
            onPageChange={setVehiclePage}
            onViewDetails={handleOpenVehicleDetails}
            viewDetailsLabel="View Details"
            emptyStateTitle={vehicleLoading ? "Loading vehicle assignments..." : "No records found"}
            emptyStateDescription={
              vehicleLoading
                ? "Fetching vehicle assignment history from server..."
                : "No vehicle assignment records match the selected filters or search criteria."
            }
            footerLabel={`Showing ${
              vehicleAssignments.length === 0 ? 0 : vehicleStart + 1
            }-${Math.min(vehicleStart + itemsPerPage, vehicleAssignments.length)} of ${
              vehicleAssignments.length
            } records`}
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* FULFILLMENT HISTORY VIEW DETAILS MODAL                                   */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {isFulfillmentModalOpen && selectedFulfillment && (
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200"
              onClick={(e) => e.stopPropagation()} // Disable backdrop dismissal
            >
              {/* Header: Receiving Reference No. as Title, Top-right X only, NO backdrop dismissal */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {selectedFulfillment.receiving_reference_no || selectedFulfillment.reference_no}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">Order Fulfillment Details</p>
                </div>

                <button
                  type="button"
                  onClick={handleCloseFulfillmentModal}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  aria-label="Close modal"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-90px)] space-y-4">
                {/* ── SECTION 1 — ONLINE ORDERS INFORMATION ───────────────────── */}
                <div className="space-y-1">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                    <span>Online Orders Information</span>
                    <span className="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase bg-blue-100 text-blue-700">
                      {selectedFulfillment.customer_type || "Retailer"}
                    </span>
                  </div>

                  <ModalDetailRow label="Batch No." value={selectedFulfillment.batch_no} />
                  <ModalDetailRow label="Customer Name" value={selectedFulfillment.customer_name || selectedFulfillment.customer} />
                  <ModalDetailRow label="Customer Type" value={selectedFulfillment.customer_type || "Retailer"} />
                  <ModalDetailRow
                    label="Variant"
                    value={selectedFulfillment.variant || selectedFulfillment.product_name}
                  />
                  <ModalDetailRow
                    label="Ordered Quantity"
                    value={selectedFulfillment.ordered_quantity_formatted}
                  />
                  <ModalDetailRow
                    label="Unit Cost"
                    value={selectedFulfillment.unit_cost_formatted}
                  />
                  <ModalDetailRow label="Total">
                    <span className="text-base font-extrabold text-[#0B5D1E]">
                      {selectedFulfillment.total_price_formatted}
                    </span>
                  </ModalDetailRow>
                  <ModalDetailRow
                    label="Expected Arrival Date"
                    value={selectedFulfillment.expected_arrival_date_formatted || selectedFulfillment.expected_arrival_date}
                  />
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100 pt-2" />

                {/* ── SECTION 2 — DELIVERY INFORMATION ────────────────────────── */}
                <div className="space-y-1">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                    Delivery Information
                  </div>

                  <ModalDetailRow
                    label="Assigned Vehicle Model"
                    value={selectedFulfillment.assigned_vehicle_model || selectedFulfillment.vehicle_model}
                  />
                  <ModalDetailRow
                    label="Plate Number"
                    value={selectedFulfillment.plate_number}
                  />
                  <ModalDetailRow
                    label="Delivery Details"
                    value={selectedFulfillment.delivery_details || "Designated Delivery Destination"}
                  />
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100 pt-2" />

                {/* ── SECTION 3 — RECEIVING INFORMATION ───────────────────────── */}
                <div className="space-y-1">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                    Receiving Information
                  </div>

                  <ModalDetailRow
                    label="Receiving Reference No."
                    value={selectedFulfillment.receiving_reference_no || selectedFulfillment.reference_no}
                  />
                  <ModalDetailRow
                    label="Total Received"
                    value={selectedFulfillment.total_received_formatted || selectedFulfillment.delivered}
                  />
                  <ModalDetailRow
                    label="Good Quantity"
                    value={selectedFulfillment.received_good_formatted || selectedFulfillment.passed}
                  />
                  <ModalDetailRow
                    label="Bad Quantity"
                    value={selectedFulfillment.received_bad_formatted || selectedFulfillment.failed}
                  />
                  <ModalDetailRow
                    label="Payable Amount"
                    value={selectedFulfillment.payable_amount_formatted || selectedFulfillment.payables_formatted}
                  />
                  <ModalDetailRow
                    label="Payment Status"
                    value={selectedFulfillment.payment_status || selectedFulfillment.status}
                    isBadge={true}
                    badgeStyle={
                      String(selectedFulfillment.payment_status || selectedFulfillment.status).toLowerCase() === "paid"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    }
                  />
                  <ModalDetailRow
                    label="Receiving Date"
                    value={selectedFulfillment.receiving_date || selectedFulfillment.received_at_formatted || "—"}
                  />

                  {/* Receiving Proof (when available) */}
                  {(selectedFulfillment.receiving_proof || selectedFulfillment.proof_url || selectedFulfillment.proof) && (
                    <div className="mt-3 pt-2">
                      <span className="text-slate-500 font-medium text-xs sm:text-sm block mb-1.5">
                        Receiving Proof:
                      </span>
                      <div className="rounded-xl overflow-hidden border border-slate-200 max-h-48 bg-slate-50 flex items-center justify-center">
                        <img
                          src={resolvePhotoUrl(
                            selectedFulfillment.receiving_proof ||
                              selectedFulfillment.proof_url ||
                              selectedFulfillment.proof
                          )}
                          alt="Receiving Proof"
                          className="w-full h-full object-contain max-h-48"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* VEHICLE ASSIGNEE VIEW DETAILS MODAL                                     */}
      {/* Note: Assigned Driver field removed per instruction                     */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {isVehicleModalOpen && selectedVehicle && (
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="relative w-full max-w-md sm:max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200"
              onClick={(e) => e.stopPropagation()} // Disable backdrop dismissal
            >
              {/* Header: Title + Top-Right X only */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {selectedVehicle.plate_number || selectedVehicle.model || "Vehicle Details"}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">Delivery Vehicle Details</p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseVehicleModal}
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
                    {resolvePhotoUrl(selectedVehicle.photo || selectedVehicle.photo_url) &&
                    !vehicleImageError ? (
                      <img
                        src={resolvePhotoUrl(selectedVehicle.photo || selectedVehicle.photo_url)}
                        alt={selectedVehicle.plate_number || "Vehicle"}
                        className="h-full w-full object-cover"
                        onError={() => setVehicleImageError(true)}
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
                  <ModalDetailRow label="Plate Number" value={selectedVehicle.plate_number} />
                  <ModalDetailRow label="Type" value={selectedVehicle.type} />
                  <ModalDetailRow label="Model" value={selectedVehicle.model} />
                  <ModalDetailRow
                    label="Number of Wheels"
                    value={`${selectedVehicle.number_of_wheels || 4} Wheels`}
                  />
                  <ModalDetailRow
                    label="Capacity"
                    value={
                      selectedVehicle.capacity_formatted ||
                      formatCapacityDisplay(selectedVehicle.capacity)
                    }
                  />
                  <ModalDetailRow
                    label="Vehicle Status"
                    value={getVehicleStatusLabel(selectedVehicle.vehicle_status)}
                    isBadge={true}
                    badgeStyle={
                      vehicleStatusStyleMap[selectedVehicle.vehicle_status?.toLowerCase()] ||
                      "bg-gray-100 text-gray-700 border border-gray-200"
                    }
                  />

                  {/* Inactive Reason (if inactive) */}
                  {selectedVehicle.vehicle_status === "inactive" &&
                    selectedVehicle.inactive_reason && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 mt-2 space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Inactive Reason:
                        </span>
                        <p className="text-xs sm:text-sm text-slate-800 break-words font-medium">
                          {selectedVehicle.inactive_reason}
                        </p>
                      </div>
                    )}

                  {/* Maintenance Reason (if maintenance) */}
                  {(selectedVehicle.vehicle_status === "for maintenance" ||
                    selectedVehicle.vehicle_status === "maintenance") &&
                    selectedVehicle.maintenance_reason && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 mt-2 space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                          Maintenance Reason:
                        </span>
                        <p className="text-xs sm:text-sm text-amber-900 break-words font-medium">
                          {selectedVehicle.maintenance_reason}
                        </p>
                      </div>
                    )}
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100 pt-2" />

                {/* Assignment Details (No Assigned Driver displayed) */}
                <div className="space-y-1">
                  <ModalDetailRow
                    label="Assignment Status"
                    value={selectedVehicle.status || selectedVehicle.assignment_status || "Active"}
                    isBadge={true}
                    badgeStyle={
                      String(
                        selectedVehicle.status || selectedVehicle.assignment_status
                      ).toLowerCase() === "active"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    }
                  />

                  <ModalDetailRow
                    label="Assigned On"
                    value={
                      selectedVehicle.assigned_on_formatted ||
                      selectedVehicle.assigned_on ||
                      selectedVehicle.assignedOn ||
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
