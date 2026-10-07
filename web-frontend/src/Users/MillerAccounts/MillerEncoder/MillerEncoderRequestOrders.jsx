import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Info,
  BarChart3,
  TrendingUp,
  BookOpen,
  UploadCloud,
  X,
  Image as ImageIcon,
  CloudRain,
  Thermometer,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import Dropdown from "../../../Components/Minor-Components/Dropdown";
import CustomTextbox from "../../../Components/Minor-Components/CustomTextbox";
import CustomGreenButton from "../../../Components/Minor-Components/CustomGreenButton";
import RichTextEditor from "../../../Components/Minor-Components/RichTextEditor";
import Toast from "../../../Components/Modals/Toast";
import useRequestOrders from "../../../Components/hooks/MillerEncoder/useRequestOrders";

// ─── Date Helpers ─────────────────────────────────────────────────────────────
const getTodayDateString = () => {
  const d = new Date();
  return d.toISOString().split("T")[0];
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

const formatDisplayExpiryDate = (dateStr) => {
  if (!dateStr) return null;
  if (typeof dateStr === "string" && /[a-zA-Z]/.test(dateStr)) {
    return dateStr;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

const getMonthComparisonLabels = () => {
  const now = new Date();
  const currentMonth = now.toLocaleString("en-US", { month: "long", year: "numeric" });
  const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonth = nextDate.toLocaleString("en-US", { month: "long", year: "numeric" });
  return { currentMonth, nextMonth };
};

// ─── Media Resolver ───────────────────────────────────────────────────────────
const getBaseServerUrl = () => {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/$/, "");
  if (!envUrl) return "";
  return envUrl.replace(/\/api$/, "");
};

const resolveProductImageUrl = (imagePath) => {
  if (!imagePath || typeof imagePath !== "string") return null;
  const trimmed = imagePath.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  const base = getBaseServerUrl();
  let cleanPath = trimmed.replace(/^\/+/, "");
  while (cleanPath.startsWith("media/")) {
    cleanPath = cleanPath.slice(6);
  }
  const mediaPath = `/media/${cleanPath}`;
  return base ? `${base}${mediaPath}` : mediaPath;
};

// ─── Client Batch Number Preview Helper ───────────────────────────────────────
const computeBatchPreview = (productName, businessName) => {
  const cleanP = (productName || "").replace(/[^a-zA-Z]/g, "").toUpperCase();
  const ppp = (cleanP.slice(0, 3) || "RCE").padEnd(3, "X");

  const cleanB = (businessName || "GrainRise").replace(/[^a-zA-Z]/g, "").toUpperCase();
  const bb = (cleanB.slice(0, 2) || "GR").padEnd(2, "X");

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");

  return `${ppp} - ${bb} - ${yyyy}${mm}${dd} - ${hh}${min}`;
};

// ─── Section wrapper card ─────────────────────────────────────────────────────
function FormSection({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
      <h2 className="mb-6 text-[15px] font-extrabold uppercase tracking-[0.06em] text-slate-800">
        {title}
      </h2>
      {children}
    </div>
  );
}

// ─── Right Panel Card ─────────────────────────────────────────────────────────
function SideCard({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.06)] ${className}`}>
      {children}
    </div>
  );
}

function EmptyChartState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
      <Icon size={28} className="text-slate-300" strokeWidth={1.5} />
      <p className="max-w-[220px] text-xs leading-relaxed text-slate-400">{message}</p>
    </div>
  );
}

// ─── Historical Demand Sparkbar ───────────────────────────────────────────────
function HistoricalDemandBar({ data }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <EmptyChartState
        icon={BarChart3}
        message="No historical sales recorded for this product in the last 12 months."
      />
    );
  }

  const maxVal = Math.max(...data.map((d) => d.total_sold), 1);

  return (
    <div className="relative mt-4">
      {hoveredIndex !== null && data[hoveredIndex] && (
        <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-md bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-white shadow-md z-10 whitespace-nowrap">
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
  );
}

// ─── Sales This Month vs Forecasted Demand for Next Month Line Graph ───────────
function DemandComparisonLineChart({ currentActual = 0, recommendedQty = null }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const { currentMonth, nextMonth } = useMemo(() => getMonthComparisonLabels(), []);

  if (recommendedQty == null && !currentActual) {
    return (
      <EmptyChartState
        icon={TrendingUp}
        message="Select an eligible product to view current sales and projected demand."
      />
    );
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
    <div className="mt-3 space-y-2">
      {/* Metric comparison bar */}
      <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 block">{currentMonth} (Actual)</span>
          <span className="text-base font-extrabold text-emerald-600 tracking-tight">
            {actualVal.toLocaleString()} kg
          </span>
        </div>
        <div className="text-right">
          <span className="text-[11px] font-semibold text-slate-400 block">{nextMonth} (Forecast)</span>
          <span className="text-base font-extrabold text-amber-600 tracking-tight">
            {recommendedQty != null ? `${forecastVal.toLocaleString()} kg` : "—"}
          </span>
        </div>
      </div>

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
          <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-md bg-slate-800 px-2.5 py-1 text-[10px] font-semibold text-white shadow-md z-10 whitespace-nowrap">
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

// ─── CDS Climate Graphs ───────────────────────────────────────────────────────
function CDSClimateForecastCards({ climateData }) {
  if (!climateData || !Array.isArray(climateData.months) || climateData.months.length === 0) {
    return (
      <SideCard>
        <h3 className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
          Copernicus CDS Climate Forecast (3 Months)
        </h3>
        <EmptyChartState
          icon={CloudRain}
          message="Climate forecast will appear here after selecting an eligible product."
        />
      </SideCard>
    );
  }

  const months = climateData.months.slice(0, 3);
  const maxRainfall = Math.max(...months.map((m) => Number(m.total_precipitation_mm || 0)), 1);

  return (
    <SideCard className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div>
          <h3 className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-700">
            Copernicus CDS Climate Forecast
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {climateData.location || "Central Luzon"} • Upcoming 3 Months
          </p>
        </div>
        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700 uppercase tracking-wider">
          Copernicus CDS
        </span>
      </div>

      {/* Graph 1: Monthly Rainfall */}
      <div>
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
            <CloudRain size={13} className="text-blue-500" />
            Monthly Rainfall
          </span>
          <span className="text-[10px] text-slate-400">Total mm</span>
        </div>

        <div className="flex items-end gap-2 h-20 pt-2 border-b border-slate-100 pb-1">
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
        <div className="flex items-center justify-between text-xs mb-2">
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
                <span className="mt-0.5 text-sm font-extrabold text-orange-700">
                  {temp.toFixed(1)}°C
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </SideCard>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function MillerEncoderRequestOrders() {
  const {
    fetchEligibleProducts,
    fetchDemandForecast,
    submitRequestOrder,
    loading: submitLoading,
    forecastLoading,
  } = useRequestOrders();

  // Master product data
  const [eligibleProducts, setEligibleProducts] = useState([]);
  const [branchInfo, setBranchInfo] = useState({ business_name: "GrainRise" });
  const [pageLoading, setPageLoading] = useState(true);

  // Form selections
  const [selectedVariant, setSelectedVariant] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productImage, setProductImage] = useState(null);
  const [imageError, setImageError] = useState(false);

  // Quantities & Dates
  const [stockQty, setStockQty] = useState("");
  const [orderQty, setOrderQty] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [requiredDate, setRequiredDate] = useState("");
  const [notes, setNotes] = useState("");

  // Replacement Attachment (optional)
  const [replacementFile, setReplacementFile] = useState(null);
  const [replacementPreview, setReplacementPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Demand Forecast State (Cached in page state, avoids duplicate calls)
  const [forecastData, setForecastData] = useState(null);
  const [forecastError, setForecastError] = useState(null);
  const lastRequestedKeyRef = useRef("");

  // UI Toast
  const [toast, setToast] = useState(null);

  // 1. Initial Load of Eligible Products
  const loadProducts = useCallback(async () => {
    setPageLoading(true);
    try {
      const { products, branchInfo: bInfo } = await fetchEligibleProducts();
      setEligibleProducts(products);
      if (bInfo) setBranchInfo(bInfo);
    } catch (err) {
      setToast({
        type: "error",
        title: "Load Error",
        message: err?.message || "Failed to retrieve eligible products for supply request.",
      });
    } finally {
      setPageLoading(false);
    }
  }, [fetchEligibleProducts]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (replacementPreview) URL.revokeObjectURL(replacementPreview);
    };
  }, [replacementPreview]);

  // 2. Build Product Variant Options (Grouped by product_name)
  const productVariantOptions = useMemo(() => {
    const uniqueNames = Array.from(new Set(eligibleProducts.map((p) => p.product_name)));
    return uniqueNames.map((name) => {
      // Find count of low/no stock sources
      const matches = eligibleProducts.filter((p) => p.product_name === name);
      const conditionTag = matches[0]?.eligibility_reason || "Eligible";
      return {
        label: `${name} (${conditionTag})`,
        value: name,
      };
    });
  }, [eligibleProducts]);

  // 3. Filtered Suppliers for the Selected Product Variant
  const availableSuppliers = useMemo(() => {
    if (!selectedVariant) return [];
    const matching = eligibleProducts.filter((p) => p.product_name === selectedVariant);
    return matching.map((item) => ({
      label: item.supplier_display_name || `Supplier #${item.farmer_contact_id}`,
      value: item.farmer_contact_id,
      productId: item.product_id,
      item,
    }));
  }, [eligibleProducts, selectedVariant]);

  const supplierDropdownOptions = useMemo(() => {
    return availableSuppliers.map((s) => ({
      label: s.label,
      value: s.value,
    }));
  }, [availableSuppliers]);

  // 4. Handle Product Variant Selection
  const handleVariantChange = (variantName) => {
    setSelectedVariant(variantName);
    setImageError(false);
    // Invalidate stale forecast immediately on selection change
    setForecastData(null);
    lastRequestedKeyRef.current = "";
    setForecastError(null);

    const matches = eligibleProducts.filter((p) => p.product_name === variantName);
    if (matches.length === 1) {
      // Single eligible supplier -> Auto-select
      const only = matches[0];
      setSelectedSupplier(only.farmer_contact_id);
      setSelectedProductId(only.product_id);
      setSelectedProduct(only);
      setProductImage(only.product_image);
      setStockQty(String(only.stock_quantity ?? "0"));
    } else {
      // Multiple suppliers exist for this name -> clear supplier so user selects source
      setSelectedSupplier("");
      setSelectedProductId(null);
      setSelectedProduct(null);
      setProductImage(null);
      setStockQty("");
    }
  };

  // 5. Handle Supplier Selection
  const handleSupplierChange = (supplierId) => {
    setSelectedSupplier(supplierId);
    setImageError(false);
    // Invalidate stale forecast immediately on supplier change
    setForecastData(null);
    lastRequestedKeyRef.current = "";
    setForecastError(null);

    const match = eligibleProducts.find(
      (p) => p.product_name === selectedVariant && p.farmer_contact_id === Number(supplierId)
    );

    if (match) {
      setSelectedProductId(match.product_id);
      setSelectedProduct(match);
      setProductImage(match.product_image);
      setStockQty(String(match.stock_quantity ?? "0"));
    } else {
      setSelectedProductId(null);
      setSelectedProduct(null);
      setProductImage(null);
      setStockQty("");
    }
  };

  // 6. Trigger Demand Forecasting Pipeline on Exact Product/Supplier Resolution
  const triggerForecast = useCallback(
    async (prodId, suppId) => {
      if (!prodId) return;
      const forecastKey = `${prodId}_${suppId}`;
      if (lastRequestedKeyRef.current === forecastKey && forecastData) {
        return; // Already fetched for this exact product/source
      }

      lastRequestedKeyRef.current = forecastKey;
      setForecastError(null);
      setForecastData(null); // Invalidate any previous forecast during loading

      try {
        const data = await fetchDemandForecast(prodId, suppId);
        setForecastData({
          ...data,
          targetProductId: prodId,
          targetSupplierId: suppId,
        });
      } catch (err) {
        setForecastError(err?.message || "Failed to generate demand forecast.");
        setForecastData(null);
      }
    },
    [fetchDemandForecast, forecastData]
  );

  useEffect(() => {
    if (selectedProductId) {
      triggerForecast(selectedProductId, selectedSupplier);
    } else {
      setForecastData(null);
      lastRequestedKeyRef.current = "";
    }
  }, [selectedProductId, selectedSupplier, triggerForecast]);

  // 7. Computed Batch Number Preview
  const batchNumberPreview = useMemo(() => {
    if (forecastData?.batch_number_preview) {
      return forecastData.batch_number_preview;
    }
    return computeBatchPreview(selectedVariant, branchInfo.business_name);
  }, [forecastData, selectedVariant, branchInfo.business_name]);

  // 8. Replacement Attachment Handling
  const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const handleReplacementSelect = (file) => {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setToast({
        type: "error",
        title: "Invalid File",
        message: "Only PNG, JPG, and WEBP image files are accepted.",
      });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setToast({
        type: "error",
        title: "File Too Large",
        message: "Maximum allowed file size is 10MB.",
      });
      return;
    }

    if (replacementPreview) URL.revokeObjectURL(replacementPreview);
    const objectUrl = URL.createObjectURL(file);
    setReplacementFile(file);
    setReplacementPreview(objectUrl);
    setImageError(false);
  };

  const handleRestoreOriginal = () => {
    if (replacementPreview) URL.revokeObjectURL(replacementPreview);
    setReplacementFile(null);
    setReplacementPreview(null);
    setImageError(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const handleRemoveReplacement = handleRestoreOriginal;

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleReplacementSelect(e.dataTransfer.files[0]);
    }
  };

  // 9. Active Product Image Preview Resolution
  const activeImageUrl = useMemo(() => {
    if (replacementPreview) return replacementPreview;
    return resolveProductImageUrl(productImage);
  }, [replacementPreview, productImage]);

  // 10. Forecast Values for Display & Completeness Validation
  const recommendedQty = forecastData?.forecast?.recommended_quantity ?? null;
  const historicalData = forecastData?.historical_demand ?? null;
  const currentActual = forecastData?.current_month_sales?.total_actual_sales ?? 0;
  const trajectory = forecastData?.forecast?.forecast_series?.current_month_trajectory ?? null;
  const cdsClimate = forecastData?.cds_climate ?? null;
  const forecastExplanation = forecastData?.forecast?.explanation ?? null;

  const isForecastValid = useMemo(() => {
    if (forecastLoading) return false;
    if (forecastError) return false;
    if (!forecastData || !forecastData.forecast) return false;

    // Must match the exact active selected product variant + supplier
    if (forecastData.targetProductId !== selectedProductId) return false;
    if (String(forecastData.targetSupplierId) !== String(selectedSupplier)) return false;

    const f = forecastData.forecast;
    const recQty = Number(f.recommended_quantity);
    if (!recQty || isNaN(recQty) || recQty <= 0) return false;
    if (f.baseline_forecast_quantity === undefined || f.baseline_forecast_quantity === null) return false;
    if (!f.forecast_series) return false;
    if (!f.explanation || !String(f.explanation).trim()) return false;

    return true;
  }, [forecastLoading, forecastError, forecastData, selectedProductId, selectedSupplier]);

  // 11. Form Validation and Final Submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedProductId || !selectedSupplier) {
      setToast({
        type: "error",
        title: "Selection Required",
        message: "Please select an eligible product variant and supplier.",
      });
      return;
    }

    const orderNum = Number(orderQty);
    if (!orderQty || isNaN(orderNum) || orderNum <= 0) {
      setToast({
        type: "error",
        title: "Invalid Order Quantity",
        message: "Please enter an order quantity greater than 0 kg.",
      });
      return;
    }

    const todayStr = getTodayDateString();
    const minArrival = getDaysFromToday(3);
    if (!arrivalDate || arrivalDate < minArrival) {
      setToast({
        type: "error",
        title: "Invalid Arrival Date",
        message: `Target Arrival Date must be at least 3 days from today (${minArrival} or later).`,
      });
      return;
    }

    const minRequired = getDaysAfter(arrivalDate, 4);
    if (!requiredDate || requiredDate < minRequired) {
      setToast({
        type: "error",
        title: "Invalid Required By Date",
        message: `Required By Date must be at least 4 days after Target Arrival Date (${minRequired} or later).`,
      });
      return;
    }

    if (forecastLoading) {
      setToast({
        type: "error",
        title: "Forecasting In Progress",
        message: "Please wait for demand forecasting to complete before submitting.",
      });
      return;
    }

    if (!isForecastValid || !forecastData || !forecastData.forecast) {
      setToast({
        type: "error",
        title: "Forecast Required",
        message: "Demand forecasting must be completed before submitting this request.",
      });
      return;
    }

    try {
      const res = await submitRequestOrder({
        productId: selectedProductId,
        supplierId: selectedSupplier,
        orderQuantity: orderNum,
        stockQuantity: Number(stockQty) || 0,
        targetArrivalDate: arrivalDate,
        requiredByDate: requiredDate,
        notes: notes || null,
        replacementFile: replacementFile || null,
        forecastData: {
          ...forecastData.forecast,
          product_id: selectedProductId,
          supplier_id: selectedSupplier,
          climate_snapshot: forecastData.forecast.climate_snapshot || forecastData.cds_climate,
          cds_climate: forecastData.cds_climate,
        },
      });

      const batchNo = res?.batch_no || batchNumberPreview;
      setToast({
        type: "success",
        title: "Supply Request Submitted",
        message: `Order request for ${selectedVariant} (${orderNum.toLocaleString()} kg) submitted successfully with batch ${batchNo}.`,
      });

      // Reset form fields
      setSelectedVariant("");
      setSelectedSupplier("");
      setSelectedProductId(null);
      setSelectedProduct(null);
      setProductImage(null);
      setStockQty("");
      setOrderQty("");
      setArrivalDate("");
      setRequiredDate("");
      setNotes("");
      handleRemoveReplacement();
      setForecastData(null);
      lastRequestedKeyRef.current = "";

      // Refresh eligible products
      loadProducts();
    } catch (err) {
      setToast({
        type: "error",
        title: "Submission Failed",
        message: err?.message || "Failed to submit request order. Please try again.",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Management" }, { label: "Request Orders" }]} />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-extrabold tracking-[-0.03em] text-slate-900">
              New Request
            </h1>
            <p className="text-sm text-slate-500">
              Create a new supply request for the selected product variant and supplier.
            </p>
          </div>
          {branchInfo.business_name && (
            <div className="flex items-center gap-2 self-start sm:self-auto rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <span>{branchInfo.business_name}</span>
              {branchInfo.municipality && (
                <span className="text-emerald-600">({branchInfo.municipality}, {branchInfo.province})</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Two-column layout ────────────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">

        {/* ── LEFT: Form panels ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Product Details */}
          <FormSection title="Product Details">
            {pageLoading ? (
              <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                <Loader2 size={18} className="animate-spin text-emerald-600" />
                <span className="text-xs">Loading eligible products…</span>
              </div>
            ) : productVariantOptions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-center text-xs text-amber-800 space-y-1">
                <p className="font-bold">No eligible products for reordering</p>
                <p className="text-amber-700/80">
                  Products are only selectable when out of stock (0 kg), low stock (&lt;200 kg), near expiry (&le;45 days), or expired. Healthy stock is currently not selectable.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Dropdown
                    label="Product Variant *"
                    placeholder="Select Variant"
                    options={productVariantOptions}
                    value={selectedVariant}
                    onChange={handleVariantChange}
                  />
                  <Dropdown
                    label="Select Supplier *"
                    placeholder={
                      !selectedVariant
                        ? "Select product first"
                        : supplierDropdownOptions.length === 0
                        ? "No eligible suppliers"
                        : "Select Supplier"
                    }
                    options={supplierDropdownOptions}
                    value={selectedSupplier}
                    onChange={handleSupplierChange}
                    disabled={!selectedVariant || supplierDropdownOptions.length === 0}
                  />
                </div>

                {/* Compact Horizontal Metadata Row */}
                {selectedProduct && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-slate-600 pt-1">
                    {/* 1. Current Stock */}
                    <span className="font-bold text-slate-900">
                      {Number(selectedProduct.stock_quantity ?? 0).toLocaleString()} kg
                    </span>

                    <span className="text-slate-300 select-none">·</span>

                    {/* 2. Stock condition */}
                    <span className="text-slate-700">
                      {selectedProduct.stock_condition || selectedProduct.eligibility_reason || "Low Stock"}
                    </span>

                    {/* 3. Expiry date */}
                    {(selectedProduct.expiry_date_display || selectedProduct.expiry_date) && (
                      <>
                        <span className="text-slate-300 select-none">·</span>
                        <span className="text-slate-600">
                          Expiry: {selectedProduct.expiry_date_display || formatDisplayExpiryDate(selectedProduct.expiry_date)}
                        </span>
                      </>
                    )}

                    {/* 4. Expiry status badge */}
                    {selectedProduct.expiry_status === "Expired" && (
                      <>
                        <span className="text-slate-300 select-none">·</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                          Expired
                        </span>
                      </>
                    )}
                    {selectedProduct.expiry_status === "Near Expiry" && (
                      <>
                        <span className="text-slate-300 select-none">·</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Near Expiry
                        </span>
                      </>
                    )}
                  </div>
                )}

                <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Info size={13} strokeWidth={2} className="shrink-0 text-emerald-500" />
                  Selecting a product and supplier automatically initiates AI and Copernicus CDS demand forecasting.
                </p>
              </div>
            )}
          </FormSection>

          {/* Order Setup */}
          <FormSection title="Order Setup">
            <div className="grid gap-4 sm:grid-cols-2">
              <CustomTextbox
                label="Batch Number (auto-generated)"
                value={batchNumberPreview}
                readOnly
                disabled
                className="bg-slate-50 text-slate-400 cursor-not-allowed"
                placeholder="PPP - BB - YYYYMMDD - HHMM"
              />
              <CustomTextbox
                label="Order Quantity (kg) *"
                type="number"
                placeholder="Enter quantity to order"
                value={orderQty}
                onChange={(e) => setOrderQty(e.target.value)}
                min="0.01"
                step="any"
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Specify the requested procurement quantity in kilograms. Must be greater than 0.
            </p>
          </FormSection>

          {/* Target Dates */}
          <FormSection title="Target Dates">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <CustomTextbox
                  label="Target Arrival Date *"
                  type="date"
                  min={getDaysFromToday(3)}
                  value={arrivalDate}
                  onChange={(e) => setArrivalDate(e.target.value)}
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  At least 3 days from today ({getDaysFromToday(3)}).
                </p>
              </div>
              <div>
                <CustomTextbox
                  label="Required By Date *"
                  type="date"
                  min={arrivalDate ? getDaysAfter(arrivalDate, 4) : getDaysFromToday(7)}
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  At least 4 days after Target Arrival Date.
                </p>
              </div>
            </div>
          </FormSection>

          {/* Attachments */}
          <FormSection title="ATTACHMENT">
            <p className="mb-3 text-xs text-slate-500">
              Displays current stock product photo. You may optionally upload a replacement photo for this inbound order request without modifying the original product image.
            </p>

            {/* ONE Single Unified Upload & Preview Box */}
            <div
              onDrop={onDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              className={`relative flex flex-col items-center justify-center gap-3.5 rounded-2xl border-2 border-dashed p-6 text-center transition ${
                dragging
                  ? "border-emerald-400 bg-emerald-50/70"
                  : "border-slate-200 bg-slate-50/60 hover:border-emerald-300 hover:bg-slate-50"
              }`}
            >
              {/* CURRENT IMAGE / REPLACEMENT PREVIEW INSIDE THE SAME BOX */}
              <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs flex items-center justify-center">
                {activeImageUrl && !imageError ? (
                  <img
                    src={activeImageUrl}
                    alt={selectedVariant || "Product preview"}
                    onError={() => setImageError(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 select-none py-4">
                    <ImageIcon size={32} className="text-slate-300 mb-1" />
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider">
                      IMG
                    </span>
                  </div>
                )}

                {replacementFile ? (
                  <span className="absolute bottom-1.5 left-1.5 rounded-md bg-amber-500/95 px-2 py-0.5 text-[9px] font-bold text-white shadow-xs">
                    Replacement
                  </span>
                ) : selectedProduct ? (
                  <span className="absolute bottom-1.5 left-1.5 rounded-md bg-slate-900/60 px-2 py-0.5 text-[9px] font-bold text-white shadow-xs">
                    Original
                  </span>
                ) : null}
              </div>

              {/* Instructions inside the SAME box */}
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-slate-700">
                  Drag/drop replacement or click to browse
                </p>
                <p className="text-[11px] text-slate-400">
                  PNG, JPG, JPEG, WEBP · Max 10MB
                </p>
              </div>

              {/* Controls inside the SAME box */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleReplacementSelect(e.target.files[0]);
                    }
                  }}
                />
                <CustomGreenButton
                  text={replacementFile ? "Change Replacement" : "Browse Photo"}
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-1.5 text-xs shadow-xs"
                />

                {replacementFile && (
                  <button
                    type="button"
                    onClick={handleRestoreOriginal}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100 hover:text-rose-700 cursor-pointer shadow-xs"
                  >
                    <RefreshCw size={12} />
                    Restore Original
                  </button>
                )}
              </div>

              {/* Active replacement file details if selected */}
              {replacementFile && (
                <div className="mt-1 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 text-[11px] text-emerald-800">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span className="font-medium truncate max-w-[200px] sm:max-w-xs">{replacementFile.name}</span>
                  <span className="text-slate-400 text-[10px]">
                    ({(replacementFile.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
              )}
            </div>
          </FormSection>

          {/* Notes */}
          <FormSection title="Notes">
            <div className="w-full">
              <label className="mb-2 block text-xs font-medium text-slate-700">
                Additional Instructions for Supplier (Optional)
              </label>
              <RichTextEditor
                onChange={(html) => setNotes(html)}
                placeholder="Add special packaging, delivery, or quality instructions for the supplier…"
                maxLength={500}
                minHeight={120}
              />
            </div>
          </FormSection>

          {/* Submit Button */}
          <CustomGreenButton
            type="submit"
            text={
              submitLoading
                ? "Submitting Request…"
                : forecastLoading
                ? "Forecasting in progress…"
                : forecastError && selectedProductId && selectedSupplier
                ? "Forecast Failed (Retry Required)"
                : "Submit Order Request"
            }
            disabled={
              submitLoading ||
              forecastLoading ||
              !selectedProductId ||
              !selectedSupplier ||
              !orderQty ||
              Number(orderQty) <= 0 ||
              !arrivalDate ||
              !requiredDate ||
              !isForecastValid
            }
            className="w-full py-3.5 text-base font-bold rounded-2xl disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          />
        </div>

        {/* ── RIGHT: Demand Intelligence Panel ──────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Recommended Quantity */}
          <div className="rounded-2xl bg-[#0B5D1E] p-5 text-white shadow-[0_8px_24px_rgba(11,93,30,0.25)] relative overflow-hidden">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/70">
                Recommended Quantity for the Upcoming Month
              </h3>
              {forecastLoading && (
                <Loader2 size={16} className="animate-spin text-white/80" />
              )}
            </div>

            <p className="mt-3 text-[2.25rem] font-extrabold leading-none tracking-tight">
              {forecastLoading ? (
                <span className="text-xl font-normal text-white/70">Analyzing market…</span>
              ) : recommendedQty != null ? (
                `${recommendedQty.toLocaleString()} kg`
              ) : (
                "— kg"
              )}
            </p>

            <p className="mt-2 text-[11px] leading-relaxed text-white/70">
              Synthesized by GrainRise AI from historical sales, inventory condition, 3-month Copernicus CDS climate forecast, regional competition, and Philippine rice importation data.
            </p>

            {forecastError && (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-red-900/40 p-2 text-xs text-rose-200">
                <span>{forecastError}</span>
                <button
                  type="button"
                  onClick={() => triggerForecast(selectedProductId, selectedSupplier)}
                  className="ml-2 flex items-center gap-1 font-bold underline hover:text-white"
                >
                  <RefreshCw size={12} /> Retry
                </button>
              </div>
            )}
          </div>

          {/* Historical Demand */}
          <SideCard>
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                Historical Demand (Last 12 Months)
              </h3>
              {historicalData && historicalData.length > 0 && (
                <span className="text-[10px] text-slate-400 font-medium">
                  {historicalData.length} active {historicalData.length === 1 ? "month" : "months"}
                </span>
              )}
            </div>
            {forecastLoading ? (
              <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                <Loader2 size={16} className="animate-spin text-emerald-600" />
                <span className="text-xs">Loading sales history…</span>
              </div>
            ) : (
              <HistoricalDemandBar data={historicalData} />
            )}
          </SideCard>

          {/* Sales This Month vs Forecasted Demand for Next Month */}
          <SideCard>
            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
              SALES THIS MONTH VS FORECASTED DEMAND FOR NEXT MONTH
            </h3>
            {forecastLoading ? (
              <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                <Loader2 size={16} className="animate-spin text-emerald-600" />
                <span className="text-xs">Projecting demand…</span>
              </div>
            ) : (
              <DemandComparisonLineChart
                currentActual={currentActual}
                recommendedQty={recommendedQty}
              />
            )}
          </SideCard>

          {/* Copernicus CDS Climate Forecast Graphs (Rainfall & Temperature) */}
          {forecastLoading ? (
            <SideCard>
              <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                <Loader2 size={16} className="animate-spin text-blue-600" />
                <span className="text-xs">Fetching Copernicus CDS seasonal forecast…</span>
              </div>
            </SideCard>
          ) : (
            <CDSClimateForecastCards climateData={cdsClimate} />
          )}

          {/* Forecast Guide (Auto-display, removed Load More) */}
          <SideCard className="border-amber-100 bg-amber-50/70">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-200 text-amber-800">
                <BookOpen size={16} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-amber-900">
                  Forecast Guide
                </h3>
                {forecastLoading ? (
                  <div className="flex items-center gap-2 py-3 text-xs text-amber-800">
                    <Loader2 size={14} className="animate-spin text-amber-700" />
                    <span>Generating market intelligence breakdown…</span>
                  </div>
                ) : forecastExplanation ? (
                  <div className="mt-2 space-y-2.5 text-[11px] leading-relaxed text-amber-900/90">
                    {forecastExplanation.split("\n\n").map((para, pIdx) => (
                      <p key={pIdx}>{para}</p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1.5 text-[11px] leading-relaxed text-amber-800/80">
                    Select an eligible product variant and supplier to generate the detailed Forecast Guide explaining sales patterns, Copernicus CDS climate effects, local competition, and Philippine rice importation pressures.
                  </p>
                )}
              </div>
            </div>
          </SideCard>
        </div>
      </div>

      {/* Figma Toast Notification */}
      {toast && (
        <Toast
          isOpen={Boolean(toast)}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          duration={toast.duration || 4500}
          onClose={() => setToast(null)}
        />
      )}
    </form>
  );
}
