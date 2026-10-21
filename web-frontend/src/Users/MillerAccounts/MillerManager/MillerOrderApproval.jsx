import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  ChevronDown,
  X,
  Check,
  Calendar,
  XCircle,
  Edit3,
  Loader2,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
  Sparkles,
  TrendingUp,
  CloudRain,
  Thermometer,
  FileText,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import Toast from "../../../Components/Minor-Components/Toast";
import useToast from "../../../Components/hooks/useToast";
import useMillerOrderApproval from "../../../Components/hooks/Miller/useMillerOrderApproval";

// ─── Canonical Status Options ─────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "all", label: "Status" },
  { value: "requested", label: "Requested" },
  { value: "ordered", label: "Ordered" },
  { value: "partially_received", label: "Partially Received" },
  { value: "received", label: "Received" },
  { value: "declined", label: "Declined" },
];

const statusStyleMap = {
  requested: "bg-amber-100/80 text-amber-700 border border-amber-200",
  ordered: "bg-sky-100 text-sky-700 border border-sky-200",
  partially_received: "bg-purple-100 text-purple-700 border border-purple-200",
  received: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  declined: "bg-rose-100 text-rose-700 border border-rose-200",
};

const getStatusLabel = (status) => {
  if (status === "partially_received") return "Partially Received";
  if (!status) return "";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const getDaysFromToday = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};

const getDaysAfter = (dateStr, days) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};

const getMonthComparisonLabels = () => {
  const now = new Date();
  const currentMonth = now.toLocaleString("en-US", { month: "long", year: "numeric" });
  const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonth = nextDate.toLocaleString("en-US", { month: "long", year: "numeric" });
  return { currentMonth, nextMonth };
};

// ─── Modal Detail Row Sub-Component ───────────────────────────────────────────
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
        <span className="font-semibold text-slate-800 text-right break-words max-w-[60%]">
          {value}
        </span>
      )}
    </div>
  );
}

// ─── Historical Demand (Last 12 Months) Sparkbar ──────────────────────────────
function HistoricalDemandBar({ data }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!data || data.length === 0) {
    return null;
  }

  const maxVal = Math.max(...data.map((d) => d.total_sold), 1);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
      <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          Historical Demand (Last 12 Months)
        </span>
        <span className="text-[10px] text-slate-400 font-medium">Real Sales Only</span>
      </div>

      <div className="relative pt-3">
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 rounded-md bg-slate-800 px-2.5 py-1 text-[10px] font-semibold text-white shadow-md z-10 whitespace-nowrap">
            {data[hoveredIndex].month}: {data[hoveredIndex].total_sold.toLocaleString()} kg
          </div>
        )}
        <div className="flex items-end gap-1.5 h-24 pb-1">
          {data.map((item, i) => {
            const heightPct = Math.max(8, (item.total_sold / maxVal) * 100);
            return (
              <div
                key={item.month_key || i}
                className="group flex flex-1 flex-col items-center gap-1 cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div
                  className="w-full rounded-t-sm bg-emerald-500 transition-all duration-200 group-hover:bg-emerald-600 group-hover:opacity-100 opacity-85"
                  style={{ height: `${heightPct}%`, minHeight: 4 }}
                />
                <span className="text-[9px] text-slate-400 truncate max-w-[36px] group-hover:text-slate-700 font-medium">
                  {item.short_label || item.month.split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Sales This Month vs Forecasted Demand for Next Month Line Graph ───────────
function DemandComparisonLineChart({ currentActual = 0, recommendedQty = null }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const { currentMonth, nextMonth } = useMemo(() => getMonthComparisonLabels(), []);

  if (recommendedQty == null && !currentActual) {
    return null;
  }

  const actualVal = Number(currentActual) || 0;
  const forecastVal = recommendedQty != null ? Number(recommendedQty) : 0;
  const maxVal = Math.max(actualVal, forecastVal, 10);

  const width = 340;
  const height = 130;
  const padding = { top: 20, right: 36, bottom: 26, left: 36 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const x0 = padding.left + 24;
  const x1 = width - padding.right - 24;

  const getY = (val) => padding.top + chartH - (val / maxVal) * chartH;
  const y0 = getY(actualVal);
  const y1 = getY(forecastVal);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <span className="text-[11px] font-bold text-slate-700 tracking-tight uppercase">
          Sales This Month vs Forecasted Demand for Next Month
        </span>
        <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
          AI Trajectory
        </span>
      </div>

      {/* Metric comparison bar */}
      <div className="flex items-center justify-between text-xs pt-1">
        <div>
          <span className="text-[10px] font-semibold text-slate-400 block">{currentMonth} (Actual)</span>
          <span className="text-sm font-extrabold text-emerald-600 tracking-tight">
            {actualVal.toLocaleString()} kg
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-semibold text-slate-400 block">{nextMonth} (Forecast)</span>
          <span className="text-sm font-extrabold text-amber-600 tracking-tight">
            {recommendedQty != null ? `${forecastVal.toLocaleString()} kg` : "—"}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 pt-0.5">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-1 bg-emerald-500 rounded-full" />
          <span>Current Month Actual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 border-t-2 border-dashed border-amber-500" />
          <span>Next Month Forecast Demand</span>
        </div>
      </div>

      <div className="relative pt-1">
        {hoveredPoint && (
          <div className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded-md bg-slate-800 px-2.5 py-1 text-[10px] font-semibold text-white shadow-md z-10 whitespace-nowrap">
            {hoveredPoint.month}: {hoveredPoint.label} {hoveredPoint.val.toLocaleString()} kg
          </div>
        )}
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32 overflow-visible">
          {/* Subtle grid lines */}
          <line
            x1={padding.left}
            y1={padding.top + chartH / 2}
            x2={width - padding.right}
            y2={padding.top + chartH / 2}
            stroke="#f1f5f9"
            strokeDasharray="2,2"
          />
          <line
            x1={padding.left}
            y1={padding.top + chartH}
            x2={width - padding.right}
            y2={padding.top + chartH}
            stroke="#e2e8f0"
          />

          {/* Forecast trajectory: Dashed yellow line connecting current actual to next month forecast */}
          <line
            x1={x0}
            y1={y0}
            x2={x1}
            y2={y1}
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeDasharray="5,4"
            strokeLinecap="round"
          />

          {/* Current month solid green indicator segment */}
          <line
            x1={padding.left}
            y1={y0}
            x2={x0}
            y2={y0}
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Point 1: Current Month Actual (Solid green) */}
          <circle
            cx={x0}
            cy={y0}
            r={5}
            fill="#10b981"
            stroke="#ffffff"
            strokeWidth="2"
            className="cursor-pointer hover:r-6 transition-all"
            onMouseEnter={() =>
              setHoveredPoint({ month: currentMonth, label: "Actual Sales:", val: actualVal })
            }
            onMouseLeave={() => setHoveredPoint(null)}
          />

          {/* Point 2: Next Month Forecast (Dashed yellow dot) */}
          <circle
            cx={x1}
            cy={y1}
            r={5}
            fill="#ffffff"
            stroke="#f59e0b"
            strokeWidth="2.5"
            className="cursor-pointer hover:r-6 transition-all"
            onMouseEnter={() =>
              setHoveredPoint({ month: nextMonth, label: "Forecasted Demand:", val: forecastVal })
            }
            onMouseLeave={() => setHoveredPoint(null)}
          />

          {/* Value labels directly on SVG */}
          <text
            x={x0}
            y={Math.max(12, y0 - 8)}
            textAnchor="middle"
            className="text-[10px] fill-emerald-600 font-bold"
          >
            {actualVal.toLocaleString()} kg
          </text>

          <text
            x={x1}
            y={Math.max(12, y1 - 8)}
            textAnchor="middle"
            className="text-[10px] fill-amber-600 font-bold"
          >
            {recommendedQty != null ? `${forecastVal.toLocaleString()} kg` : "—"}
          </text>

          {/* X axis dynamic month labels */}
          <text
            x={x0}
            y={height - 6}
            textAnchor="middle"
            className="text-[10px] fill-slate-500 font-medium"
          >
            {currentMonth}
          </text>
          <text
            x={x1}
            y={height - 6}
            textAnchor="middle"
            className="text-[10px] fill-slate-500 font-medium"
          >
            {nextMonth}
          </text>
        </svg>
      </div>
    </div>
  );
}

// ─── CDS Climate Forecast (Mirroring Encoder Request Order) ───────────────────
function CDSClimateForecastCards({ climateData }) {
  if (!climateData || !Array.isArray(climateData.months) || climateData.months.length === 0) {
    return null;
  }

  const months = climateData.months.slice(0, 3);
  const maxRainfall = Math.max(...months.map((m) => Number(m.total_precipitation_mm || 0)), 1);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div>
          <h4 className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-700">
            Copernicus CDS Climate Forecast
          </h4>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {climateData.location || "Central Luzon"} • Upcoming 3 Months
          </p>
        </div>
        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700 uppercase tracking-wider">
          Copernicus CDS
        </span>
      </div>

      {/* Graph 1: Monthly Rainfall */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
            <CloudRain size={13} className="text-blue-500" />
            Monthly Rainfall
          </span>
          <span className="text-[10px] text-slate-400">Total mm</span>
        </div>

        <div className="flex items-end gap-2 h-18 pt-1 border-b border-slate-100 pb-1">
          {months.map((m, idx) => {
            const rain = Number(m.total_precipitation_mm || 0);
            const heightPct = Math.max(12, (rain / maxRainfall) * 100);
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-blue-700">
                  {Math.round(rain)}
                </span>
                <div
                  className="w-full rounded-t-sm bg-blue-500/85 hover:bg-blue-600 transition-all"
                  style={{ height: `${heightPct}%`, minHeight: 6 }}
                />
                <span className="text-[9px] font-medium text-slate-400 truncate max-w-[48px]">
                  {m.month ? m.month.split(" ")[0] : `M${idx + 1}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Graph 2: Average Monthly Temperature */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
            <Thermometer size={13} className="text-orange-500" />
            Average Monthly Temperature
          </span>
          <span className="text-[10px] text-slate-400">°C</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {months.map((m, idx) => {
            const temp = Number(m.average_temperature_c || 0);
            return (
              <div
                key={idx}
                className="flex flex-col items-center justify-center rounded-xl border border-orange-100 bg-orange-50/50 p-2 text-center"
              >
                <span className="text-[9px] font-medium text-slate-500">
                  {m.month ? m.month.split(" ")[0] : `M${idx + 1}`}
                </span>
                <span className="mt-0.5 text-xs font-extrabold text-orange-700">
                  {temp.toFixed(1)}°C
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function MillerOrderApproval() {
  const { toasts, showToast, removeToast } = useToast();

  const {
    fetchOrders,
    fetchOrderDetail,
    editOrder,
    declineOrder,
    approveOrder,
    detailLoading,
    actionLoading,
    detailError,
  } = useMillerOrderApproval();

  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [tempDateRange, setTempDateRange] = useState({ startDate: "", endDate: "" });
  const [currentPage, setCurrentPage] = useState(1);

  // View modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrderSummary, setSelectedOrderSummary] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);

  // Modal body ref for scroll-to-top on edit
  const modalBodyRef = useRef(null);

  // Edit mode state inside View modal
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({
    ordered_quantity: "",
    expected_arrival_date: "",
    target_arrival_date: "",
    required_by_date: "",
  });

  // Decline modal state (strictly unstacked)
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateRef = useRef(null);

  // ─── Load Orders ────────────────────────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    try {
      const data = await fetchOrders({
        search,
        status: statusFilter,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      setOrders(data);
    } catch (err) {
      showToast({
        type: "error",
        title: "Load Error",
        message: err?.data?.message || err?.message || "Failed to load order approvals.",
      });
    }
  }, [fetchOrders, search, statusFilter, dateRange, showToast]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Popover dismissal handling for Date Picker
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dateRef.current && !dateRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // ─── Modal Open / Close ─────────────────────────────────────────────────────
  const handleOpenModal = async (orderRow) => {
    setSelectedOrderSummary(orderRow);
    setIsModalOpen(true);
    setIsEditMode(false);
    setOrderDetail(null);

    try {
      const detail = await fetchOrderDetail(orderRow.id);
      setOrderDetail(detail);
      setEditFormData({
        ordered_quantity: detail.ordered_quantity || "",
        expected_arrival_date: detail.expected_arrival_date || "",
        target_arrival_date: detail.target_arrival_date || "",
        required_by_date: detail.required_by_date || "",
      });
    } catch (err) {
      showToast({
        type: "error",
        title: "Detail Load Error",
        message: err?.data?.message || err?.message || "Failed to load order details.",
      });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrderSummary(null);
    setOrderDetail(null);
    setIsEditMode(false);
  };

  const handleRetryDetail = async () => {
    if (!selectedOrderSummary) return;
    try {
      const detail = await fetchOrderDetail(selectedOrderSummary.id);
      setOrderDetail(detail);
      setEditFormData({
        ordered_quantity: detail.ordered_quantity || "",
        expected_arrival_date: detail.expected_arrival_date || "",
        target_arrival_date: detail.target_arrival_date || "",
        required_by_date: detail.required_by_date || "",
      });
    } catch (err) {
      showToast({
        type: "error",
        title: "Detail Load Error",
        message: err?.data?.message || err?.message || "Failed to load order details.",
      });
    }
  };

  // ─── Edit Mode Actions (Scroll to Top) ──────────────────────────────────────
  const handleStartEdit = () => {
    if (!orderDetail) return;
    setEditFormData({
      ordered_quantity: orderDetail.ordered_quantity || "",
      expected_arrival_date: orderDetail.expected_arrival_date || "",
      target_arrival_date: orderDetail.target_arrival_date || "",
      required_by_date: orderDetail.required_by_date || "",
    });
    setIsEditMode(true);

    // Scroll to the top of the modal body immediately
    setTimeout(() => {
      if (modalBodyRef.current) {
        modalBodyRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 0);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
  };

  const handleSaveEdit = async () => {
    // 1. All four fields required
    if (!editFormData.ordered_quantity || String(editFormData.ordered_quantity).trim() === "") {
      showToast({
        type: "warning",
        title: "Validation Error",
        message: "Order quantity is required.",
      });
      return;
    }

    const qty = parseFloat(editFormData.ordered_quantity);
    if (isNaN(qty) || qty <= 0) {
      showToast({
        type: "warning",
        title: "Invalid Order Quantity",
        message: "Order quantity must be greater than 0 kg.",
      });
      return;
    }

    if (!editFormData.expected_arrival_date) {
      showToast({
        type: "warning",
        title: "Validation Error",
        message: "Expected arrival date is required.",
      });
      return;
    }

    if (!editFormData.target_arrival_date) {
      showToast({
        type: "warning",
        title: "Validation Error",
        message: "Target arrival date is required.",
      });
      return;
    }

    if (!editFormData.required_by_date) {
      showToast({
        type: "warning",
        title: "Validation Error",
        message: "Required by date is required.",
      });
      return;
    }

    // 2. Date rules
    const minExpected = getDaysFromToday(3);
    if (editFormData.expected_arrival_date < minExpected) {
      showToast({
        type: "warning",
        title: "Invalid Arrival Date",
        message: `Expected Arrival Date must be at least 3 days from today (${minExpected} or later).`,
      });
      return;
    }

    const minTarget = getDaysFromToday(3);
    if (editFormData.target_arrival_date < minTarget) {
      showToast({
        type: "warning",
        title: "Invalid Target Date",
        message: `Target Arrival Date must be at least 3 days from today (${minTarget} or later).`,
      });
      return;
    }

    const minRequired = getDaysAfter(editFormData.target_arrival_date, 4);
    if (editFormData.required_by_date < minRequired) {
      showToast({
        type: "warning",
        title: "Invalid Required By Date",
        message: `Required By Date must be at least 4 days after Target Arrival Date (${minRequired} or later).`,
      });
      return;
    }

    try {
      const updated = await editOrder(orderDetail.id, editFormData);
      setOrderDetail(updated);
      setIsEditMode(false);
      showToast({
        type: "success",
        title: "Order Updated",
        message: "Order adjustments saved successfully.",
      });
      loadOrders();
    } catch (err) {
      showToast({
        type: "error",
        title: "Update Failed",
        message: err.message || "Failed to update order.",
      });
    }
  };

  // ─── Approve Action ─────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!orderDetail) return;
    try {
      await approveOrder(orderDetail.id);
      showToast({
        type: "success",
        title: "Order Approved",
        message: `Order #${orderDetail.batch_no} approved successfully.`,
      });
      const refreshed = await fetchOrderDetail(orderDetail.id);
      setOrderDetail(refreshed);
      loadOrders();
    } catch (err) {
      showToast({
        type: "error",
        title: "Approval Failed",
        message: err.message || "Failed to approve order.",
      });
    }
  };

  // ─── Decline Modal Actions (Strictly Unstacked) ─────────────────────────────
  const handleOpenDeclineModal = () => {
    setDeclineReason("");
    // 1. Hide View Details modal completely
    setIsModalOpen(false);
    // 2. Open Declining Reason modal
    setIsDeclineModalOpen(true);
  };

  const handleCancelDecline = () => {
    // Close Declining Reason modal and restore View Details modal
    setIsDeclineModalOpen(false);
    setDeclineReason("");
    setIsModalOpen(true);
  };

  const handleConfirmDecline = async () => {
    const trimmed = declineReason.trim();
    if (!trimmed) {
      showToast({
        type: "warning",
        title: "Validation Error",
        message: "Declining reason is required.",
      });
      return;
    }

    try {
      await declineOrder(orderDetail.id, trimmed);
      setIsDeclineModalOpen(false);
      setSelectedOrderSummary(null);
      setOrderDetail(null);
      // DO NOT reopen View Details modal
      showToast({
        type: "success",
        title: "Order Declined",
        message: `Order #${orderDetail.batch_no} has been declined.`,
      });
      loadOrders();
    } catch (err) {
      showToast({
        type: "error",
        title: "Decline Failed",
        message: err.message || "Failed to decline order.",
      });
    }
  };

  // ─── Table Columns ──────────────────────────────────────────────────────────
  const columns = [
    { key: "variant", label: "Variant", width: "22%" },
    { key: "batch", label: "Batch No.", width: "22%" },
    { key: "supplier", label: "Supplier", width: "24%" },
    {
      key: "status",
      label: "Status",
      width: "18%",
      headerClassName: "text-center",
      cellClassName: "text-center",
      render: (row) => (
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            statusStyleMap[row.status] || "bg-gray-100 text-gray-700"
          }`}
        >
          {getStatusLabel(row.status)}
        </span>
      ),
    },
    {
      key: "action",
      label: "Action",
      width: "14%",
      headerClassName: "text-center",
      cellClassName: "text-center",
    },
  ];

  // ─── Pagination ─────────────────────────────────────────────────────────────
  const itemsPerPage = 10;
  const totalCount = orders.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = orders.slice(startIndex, startIndex + itemsPerPage);
  const tableSections = useMemo(() => [{ rows: paginated }], [paginated]);

  // Product photo resolved URL
  const resolvedPhotoUrl = useMemo(() => {
    if (!orderDetail?.product_photo) return null;
    const path = String(orderDetail.product_photo).trim();
    if (
      path.startsWith("http://") ||
      path.startsWith("https://") ||
      path.startsWith("//") ||
      path.startsWith("data:")
    ) {
      return path;
    }
    const clean = path.replace(/^\/?(media\/)?/, "");
    const backendBase = (
      import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
    ).replace(/\/$/, "");
    return `${backendBase}/media/${clean}`;
  }, [orderDetail?.product_photo]);

  // Historical demand list
  const historicalDemandData = useMemo(() => {
    return (
      orderDetail?.historical_demand ||
      orderDetail?.forecast_support?.historical_demand ||
      []
    );
  }, [orderDetail]);

  const currentMonthActualSales = useMemo(() => {
    return (
      orderDetail?.current_month_sales ||
      orderDetail?.forecast_support?.current_month_sales ||
      0
    );
  }, [orderDetail]);

  const recommendedForecastQty = useMemo(() => {
    return (
      orderDetail?.forecast_support?.recommended_quantity ||
      orderDetail?.forecast_support?.next_month_forecast ||
      null
    );
  }, [orderDetail]);

  return (
    <div className="space-y-6">
      {/* ── Global Floating Toasts ─────────────────────────────────────────── */}
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* ── Breadcrumbs & Header ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Management" }, { label: "Order Approval" }]} />
        <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-bold tracking-[-0.03em] text-slate-900">
          Order Approval
        </h2>
        <p className="text-sm text-slate-500">
          Review and approve supplier orders.
        </p>
      </div>

      {/* ── Filter Controls (Search + Status + Date Range) ────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-2 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Bar */}
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search variant, batch number, supplier"
              className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-white placeholder-gray-400 text-gray-700 h-[38px]"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Status Select Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none border border-gray-200 bg-white pl-3 pr-8 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto transition-colors cursor-pointer h-[38px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
          </div>

          {/* Date Range Picker Dropdown */}
          <div className="relative w-full sm:w-auto" ref={dateRef}>
            <button
              type="button"
              onClick={() => setShowDatePicker((prev) => !prev)}
              className={`flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors cursor-pointer h-[38px] ${
                dateRange.startDate ? "border-emerald-500 text-emerald-700 bg-emerald-50/40" : ""
              }`}
            >
              <span>
                {dateRange.startDate
                  ? `${dateRange.startDate} - ${dateRange.endDate || "..."}`
                  : "Date Range"}
              </span>
              <Calendar size={16} className={dateRange.startDate ? "text-emerald-600" : "text-gray-500"} />
            </button>

            {showDatePicker && (
              <div className="absolute top-full mt-2 left-0 sm:left-auto sm:right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-20 w-64">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={tempDateRange.startDate}
                      onChange={(e) =>
                        setTempDateRange((prev) => ({ ...prev, startDate: e.target.value }))
                      }
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={tempDateRange.endDate}
                      onChange={(e) =>
                        setTempDateRange((prev) => ({ ...prev, endDate: e.target.value }))
                      }
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
        </div>

        {/* Total Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-full text-xs font-semibold text-gray-700 self-start sm:self-center h-[38px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          <span>{totalCount} orders</span>
        </div>
      </div>

      {/* ── SectionedTableCard ──────────────────────────────────────────────── */}
      <SectionedTableCard
        columns={columns}
        sections={tableSections}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onViewDetails={handleOpenModal}
        viewDetailsLabel="View Details"
        footerLabel={
          orders.length > 0
            ? `Showing ${(currentPage - 1) * itemsPerPage + 1}–${Math.min(
                currentPage * itemsPerPage,
                orders.length
              )} of ${orders.length} orders`
            : "Showing 0 orders"
        }
      />

      {/* ── Centered Details Modal Overlay (Follows Encoder Order History style) ── */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div
              className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {orderDetail?.batch_no || selectedOrderSummary?.batch || "Order"}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">Order Approval Details</p>
                </div>

                {/* X Button: Only way to close */}
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  aria-label="Close details"
                  title="Close details"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div
                ref={modalBodyRef}
                className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-75px)] space-y-4"
              >
                {detailLoading && !orderDetail ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Loader2 size={32} className="animate-spin text-emerald-600 mb-2" />
                    <p className="text-sm font-medium text-slate-600">
                      Loading order details...
                    </p>
                  </div>
                ) : detailError ? (
                  <div className="py-6">
                    <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                      <AlertCircle size={20} className="shrink-0 text-rose-500" />
                      <div className="flex-1">
                        <p className="font-semibold">Failed to load order details</p>
                        <p className="text-xs text-rose-600">{detailError}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRetryDetail}
                        className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition cursor-pointer"
                      >
                        <RefreshCw size={13} /> Retry
                      </button>
                    </div>
                  </div>
                ) : orderDetail ? (
                  <>
                    {/* ── SECTION 1 — INBOUND ORDER DETAILS ─────────────────── */}
                    <div className="space-y-1">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                        Inbound Order Details
                      </div>

                      <ModalDetailRow
                        label="Product Variant"
                        value={orderDetail.variant || "—"}
                      />

                      <ModalDetailRow
                        label="Supplier"
                        value={orderDetail.supplier || "—"}
                      />

                      {/* Product Photo */}
                      <div className="flex items-center justify-between gap-3 py-1.5 text-xs sm:text-sm">
                        <span className="text-slate-500 font-medium shrink-0">
                          Product Photo:
                        </span>
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center">
                          {resolvedPhotoUrl ? (
                            <img
                              src={resolvedPhotoUrl}
                              alt={orderDetail.variant || "Product photo"}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-300">
                              <ImageIcon size={18} />
                              <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400">
                                IMG
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Product Description */}
                      <div className="flex items-start justify-between gap-3 py-1.5 text-xs sm:text-sm">
                        <span className="text-slate-500 font-medium shrink-0">
                          Product Description:
                        </span>
                        <span className="font-medium text-slate-700 text-right text-xs max-w-[60%] break-words">
                          {orderDetail.product_description ? (
                            orderDetail.product_description
                          ) : (
                            <span className="italic text-slate-400">
                              No description provided
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Order Quantity */}
                      {isEditMode ? (
                        <div className="flex items-center justify-between gap-3 py-1.5 text-xs sm:text-sm">
                          <span className="text-slate-700 font-bold shrink-0">
                            Order Quantity (kg) *:
                          </span>
                          <div className="flex items-center gap-1.5 max-w-[55%]">
                            <input
                              type="number"
                              min="1"
                              step="any"
                              value={editFormData.ordered_quantity}
                              onChange={(e) =>
                                setEditFormData((prev) => ({
                                  ...prev,
                                  ordered_quantity: e.target.value,
                                }))
                              }
                              className="w-full px-2.5 py-1 text-xs border border-emerald-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white font-semibold text-slate-900 text-right"
                            />
                            <span className="text-xs font-semibold text-slate-500">kg</span>
                          </div>
                        </div>
                      ) : (
                        <ModalDetailRow
                          label="Order Quantity"
                          value={orderDetail.ordered_quantity_formatted || `${orderDetail.ordered_quantity} kg`}
                        />
                      )}

                      {/* Expected Arrival Date */}
                      {isEditMode ? (
                        <div className="flex items-center justify-between gap-3 py-1.5 text-xs sm:text-sm">
                          <span className="text-slate-700 font-bold shrink-0">
                            Expected Arrival Date *:
                          </span>
                          <div className="flex flex-col items-end">
                            <input
                              type="date"
                              min={getDaysFromToday(3)}
                              value={editFormData.expected_arrival_date}
                              onChange={(e) =>
                                setEditFormData((prev) => ({
                                  ...prev,
                                  expected_arrival_date: e.target.value,
                                }))
                              }
                              className="px-2.5 py-1 text-xs border border-emerald-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white font-semibold text-slate-900"
                            />
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              At least 3 days from today ({getDaysFromToday(3)})
                            </span>
                          </div>
                        </div>
                      ) : (
                        <ModalDetailRow
                          label="Expected Arrival Date"
                          value={orderDetail.expected_arrival_date_formatted || "—"}
                        />
                      )}

                      <ModalDetailRow
                        label="Created Date"
                        value={orderDetail.created_at_formatted || "—"}
                      />

                      <ModalDetailRow
                        label="Status"
                        value={getStatusLabel(orderDetail.status)}
                        isBadge={true}
                        badgeStyle={statusStyleMap[orderDetail.status] || "bg-gray-100 text-gray-700"}
                      />
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-100 pt-2" />

                    {/* ── SECTION 2 — DATE REQUIREMENTS ─────────────────────── */}
                    <div className="space-y-1">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                        Date Requirements
                      </div>

                      {/* Target Arrival Date */}
                      {isEditMode ? (
                        <div className="flex items-center justify-between gap-3 py-1.5 text-xs sm:text-sm">
                          <span className="text-slate-700 font-bold shrink-0">
                            Target Arrival Date *:
                          </span>
                          <div className="flex flex-col items-end">
                            <input
                              type="date"
                              min={getDaysFromToday(3)}
                              value={editFormData.target_arrival_date}
                              onChange={(e) =>
                                setEditFormData((prev) => ({
                                  ...prev,
                                  target_arrival_date: e.target.value,
                                }))
                              }
                              className="px-2.5 py-1 text-xs border border-emerald-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white font-semibold text-slate-900"
                            />
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              At least 3 days from today ({getDaysFromToday(3)})
                            </span>
                          </div>
                        </div>
                      ) : (
                        <ModalDetailRow
                          label="Target Arrival Date"
                          value={orderDetail.target_arrival_date_formatted || "—"}
                        />
                      )}

                      {/* Required By Date */}
                      {isEditMode ? (
                        <div className="flex items-center justify-between gap-3 py-1.5 text-xs sm:text-sm">
                          <span className="text-slate-700 font-bold shrink-0">
                            Required By Date *:
                          </span>
                          <div className="flex flex-col items-end">
                            <input
                              type="date"
                              min={
                                editFormData.target_arrival_date
                                  ? getDaysAfter(editFormData.target_arrival_date, 4)
                                  : getDaysFromToday(7)
                              }
                              value={editFormData.required_by_date}
                              onChange={(e) =>
                                setEditFormData((prev) => ({
                                  ...prev,
                                  required_by_date: e.target.value,
                                }))
                              }
                              className="px-2.5 py-1 text-xs border border-emerald-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white font-semibold text-slate-900"
                            />
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              {editFormData.target_arrival_date
                                ? `At least 4 days after target (${getDaysAfter(editFormData.target_arrival_date, 4)})`
                                : "At least 4 days after Target Arrival Date"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <ModalDetailRow
                          label="Required By Date"
                          value={orderDetail.required_by_date_formatted || "—"}
                        />
                      )}

                      <ModalDetailRow
                        label="Requested By"
                        value={orderDetail.requested_by || "Not Specified"}
                      />
                    </div>

                    {/* ── SECTION 3 — DECLINED DETAILS (Only if status == 'declined') ── */}
                    {orderDetail.status === "declined" && (
                      <>
                        <div className="border-t border-slate-100 pt-2" />
                        <div className="space-y-2">
                          <div className="text-[11px] font-extrabold uppercase tracking-wider text-rose-500 mb-1 flex items-center gap-1.5">
                            <XCircle size={13} /> Rejection Details
                          </div>
                          <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3 space-y-2">
                            <div className="text-xs">
                              <span className="font-bold text-rose-800">Reason for Declining:</span>
                              <p className="mt-1 text-slate-700 leading-relaxed font-medium">
                                {orderDetail.declined_reason || "No reason specified."}
                              </p>
                            </div>
                            {orderDetail.declined_at && (
                              <div className="text-[11px] text-slate-500 pt-1 border-t border-rose-200/50">
                                Declined on: <span className="font-semibold text-slate-700">{orderDetail.declined_at}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* ── SECTION 3 — PROCUREMENT RECEIVING (Only if 'partially_received' or 'received') ── */}
                    {(orderDetail.status === "partially_received" || orderDetail.status === "received") &&
                      orderDetail.procurement_receiving && (
                        <>
                          <div className="border-t border-slate-100 pt-2" />
                          <div className="space-y-2.5">
                            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                              Procurement Receiving
                            </div>

                            <ModalDetailRow
                              label="Total Received"
                              value={orderDetail.procurement_receiving.total_received || "0 kg"}
                            />

                            <ModalDetailRow
                              label="Payment Status"
                              value={orderDetail.procurement_receiving.payment_status || "Pending"}
                              isBadge={true}
                              badgeStyle={
                                orderDetail.procurement_receiving.payment_status?.toLowerCase() === "paid"
                                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-100 text-amber-700 border border-amber-200"
                              }
                            />

                            <ModalDetailRow
                              label="Paid By"
                              value={orderDetail.procurement_receiving.paid_by || "Pending"}
                            />

                            {/* Receiving Records Table (NO Product Code anywhere!) */}
                            {Array.isArray(orderDetail.procurement_receiving.records) &&
                              orderDetail.procurement_receiving.records.length > 0 && (
                                <div className="mt-3 space-y-1.5">
                                  <div className="text-[11px] font-bold text-slate-600">
                                    Receiving Records ({orderDetail.procurement_receiving.records.length}):
                                  </div>
                                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                                    <table className="w-full text-[11px] text-left">
                                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                                        <tr>
                                          <th className="px-2.5 py-1.5">Ref No.</th>
                                          <th className="px-2 py-1.5 text-right">Good</th>
                                          <th className="px-2 py-1.5 text-right">Bad</th>
                                          <th className="px-2 py-1.5">Received By</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {orderDetail.procurement_receiving.records.map((r, idx) => (
                                          <tr key={idx} className="hover:bg-slate-50/50">
                                            <td className="px-2.5 py-1.5 font-semibold text-slate-800">
                                              {r.reference_no}
                                            </td>
                                            <td className="px-2 py-1.5 text-right font-medium text-emerald-700">
                                              {r.good}
                                            </td>
                                            <td className="px-2 py-1.5 text-right font-medium text-rose-600">
                                              {r.bad}
                                            </td>
                                            <td className="px-2 py-1.5 text-slate-600 font-medium">
                                              {r.received_by}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                          </div>
                        </>
                      )}

                    {/* ── SECTION 3 — DEMAND FORECASTING SUPPORT (Only if status == 'requested') ── */}
                    {orderDetail.status === "requested" && (
                      <>
                        <div className="border-t border-slate-100 pt-2" />
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                              <Sparkles size={13} className="text-emerald-600" />
                              Demand Forecasting Support
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">Saved Snapshot</span>
                          </div>

                          {orderDetail.forecast_support ? (
                            <div className="space-y-3">
                              {/* 1. Recommended Quantity Metric Card */}
                              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 flex items-center justify-between">
                                <div>
                                  <p className="text-[11px] font-bold text-emerald-900">
                                    Recommended Order Quantity
                                  </p>
                                  <p className="text-[10px] text-emerald-700/80">
                                    Computed by AI Demand Forecasting
                                  </p>
                                </div>
                                <div className="text-base font-extrabold text-emerald-800">
                                  {orderDetail.forecast_support.recommended_quantity_formatted ||
                                    `${orderDetail.forecast_support.recommended_quantity} kg`}
                                </div>
                              </div>

                              {/* 2. Historical Demand (Last 12 Months) - Replaces Baseline Demand */}
                              {historicalDemandData.length > 0 && (
                                <HistoricalDemandBar data={historicalDemandData} />
                              )}

                              {/* 3. SALES THIS MONTH VS FORECASTED DEMAND FOR NEXT MONTH - Replaces Monthly Projections */}
                              <DemandComparisonLineChart
                                currentActual={currentMonthActualSales}
                                recommendedQty={recommendedForecastQty}
                              />

                              {/* 4. CDS Climate Forecast (Rainfall + Temperature) - Mirroring Encoder */}
                              {orderDetail.forecast_support.climate_snapshot && (
                                <CDSClimateForecastCards
                                  climateData={orderDetail.forecast_support.climate_snapshot}
                                />
                              )}

                              {/* 5. Forecast Guide & Market Insights */}
                              {orderDetail.forecast_support.explanation && (
                                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-1.5">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                    <FileText size={14} className="text-slate-500" />
                                    Forecast Guide & Market Insights
                                  </div>
                                  <div className="text-xs text-slate-600 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-line pr-1 font-normal">
                                    {orderDetail.forecast_support.explanation}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic text-center">
                              No demand forecasting snapshot recorded for this request.
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* ── BOTTOM ACTIONS (Only for 'requested' status) ────────────────── */}
                    {orderDetail.status === "requested" && (
                      <div className="border-t border-slate-100 pt-3">
                        {isEditMode ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              disabled={actionLoading}
                              className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              disabled={actionLoading}
                              className="px-4 py-2 text-xs font-semibold text-white bg-[#0B5D1E] hover:bg-[#084b18] rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                            >
                              {actionLoading ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Check size={14} />
                              )}
                              Save Changes
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={handleStartEdit}
                              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <Edit3 size={14} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={handleOpenDeclineModal}
                              className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <XCircle size={14} /> Decline
                            </button>
                            <button
                              type="button"
                              onClick={handleApprove}
                              disabled={actionLoading}
                              className="px-4 py-2 text-xs font-semibold text-white bg-[#0B5D1E] hover:bg-[#084b18] rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                            >
                              {actionLoading ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Check size={14} />
                              )}
                              Approve
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── Declining Reason Modal Overlay (Strictly unstacked, NO X button) ────── */}
      {isDeclineModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9995] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <h3 className="font-bold text-gray-900 text-base">Declining Reason</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Please specify why this order request is being declined.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Reason for declining *:
                </label>
                <textarea
                  rows={4}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Enter reason for declining this order request..."
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancelDecline}
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDecline}
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <XCircle size={14} />
                  )}
                  Confirm Decline
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}