import { useCallback, useRef, useState } from "react";
import {
  Info,
  BarChart3,
  TrendingUp,
  BookOpen,
  UploadCloud,
  X,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import Dropdown from "../../../Components/Minor-Components/Dropdown";
import CustomTextbox from "../../../Components/Minor-Components/CustomTextbox";
import CustomGreenButton from "../../../Components/Minor-Components/CustomGreenButton";
import RichTextEditor from "../../../Components/Minor-Components/RichTextEditor";
import Toast from "../../../Components/Modals/Toast";

// ─── Static Option Data ────────────────────────────────────────────────────────
const PRODUCT_VARIANTS = [
  { label: "Dinorado (WR-001)", value: "WR-001" },
  { label: "Sinandomeng (WR-002)", value: "WR-002" },
  { label: "Milagrosa (WR-003)", value: "WR-003" },
  { label: "NSIC Rc222 (WR-004)", value: "WR-004" },
];

const SUPPLIERS = [
  { label: "Supplier A", value: "supplier-a" },
  { label: "Supplier B", value: "supplier-b" },
  { label: "Supplier C", value: "supplier-c" },
];

// Fake historical demand per variant (last 12 months)
const HISTORICAL_DEMAND = {
  "WR-001": [420, 380, 450, 510, 490, 530, 560, 480, 520, 610, 590, 640],
  "WR-002": [300, 270, 310, 360, 340, 380, 400, 330, 370, 430, 410, 460],
  "WR-003": [200, 180, 210, 250, 240, 270, 290, 230, 260, 310, 290, 340],
  "WR-004": [150, 130, 160, 190, 180, 200, 220, 170, 190, 240, 220, 260],
};

const MONTHS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];

// Generate a batch number
const generateBatchNumber = () => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `BATCH-${yy}${mm}${dd}-${rand}`;
};

// ─── Mini Sparkbar chart ───────────────────────────────────────────────────────
function SparkBar({ data, months }) {
  const max = Math.max(...data, 1);
  return (
    <div className="mt-4 flex items-end gap-1 h-20">
      {data.map((val, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t-sm bg-emerald-500 opacity-80 transition-all"
            style={{ height: `${(val / max) * 72}px`, minHeight: 4 }}
          />
          <span className="text-[9px] text-slate-400">{months[i]}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Section wrapper card ─────────────────────────────────────────────────────
function FormSection({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
      <h2 className="mb-4 text-[13px] font-extrabold uppercase tracking-[0.07em] text-slate-800">
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
      <Icon size={32} className="text-slate-300" strokeWidth={1.5} />
      <p className="max-w-[180px] text-xs leading-relaxed text-slate-400">{message}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function WarehouseEncoderNewRequest() {
  const batchNumber = useState(generateBatchNumber)[0];

  const [variant,      setVariant]      = useState("");
  const [supplier,     setSupplier]     = useState("");
  const [stockQty,     setStockQty]     = useState("");
  const [arrivalDate,  setArrivalDate]  = useState("");
  const [requiredDate, setRequiredDate] = useState("");
  const [notes,        setNotes]        = useState("");
  const [files,        setFiles]        = useState([]);
  const [dragging,     setDragging]     = useState(false);
  const fileInputRef = useRef(null);

  // Recommended qty logic (simple: avg of last 12 months × 1.1 safety factor)
  const recommendedQty = (() => {
    if (!variant) return null;
    const hist = HISTORICAL_DEMAND[variant];
    if (!hist) return null;
    const avg = hist.reduce((s, v) => s + v, 0) / hist.length;
    return Math.round(avg * 1.1);
  })();

  const historicalData   = variant ? HISTORICAL_DEMAND[variant] : null;
  const currentForecast  = recommendedQty ? Math.round(recommendedQty * 0.9) : null;

  // File handling
  const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "application/x-rar-compressed", "application/vnd.rar"];
  const MAX_SIZE = 10 * 1024 * 1024;

  const addFiles = useCallback((incoming) => {
    const valid = [...incoming].filter(
      (f) => (ACCEPTED.includes(f.type) || f.name.endsWith(".rar")) && f.size <= MAX_SIZE
    );
    setFiles((prev) => [...prev, ...valid].slice(0, 5));
  }, []);

  const onFileInput  = (e) => addFiles(e.target.files);
  const onDrop       = (e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); };
  const onDragOver   = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave  = () => setDragging(false);
  const removeFile   = (i) => setFiles((prev) => prev.filter((_, idx) => idx !== i));
  const [toast, setToast] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!variant || !stockQty) {
      setToast({
        type: "error",
        title: "Save Failed",
        message: "Unable to submit supply request.\nPlease select a variant and specify the quantity.",
        actionLabel: "Retry",
        actionType: "button",
        onAction: () => setToast(null),
      });
      return;
    }

    const selectedVariantObj = PRODUCT_VARIANTS.find((p) => p.value === variant);
    const variantName = selectedVariantObj?.label || "Rice Product";

    setToast({
      type: "success",
      title: "Success",
      message: `Supply request for ${variantName} (${stockQty} kg) has been submitted successfully.`,
    });

    // Reset optional fields
    setStockQty("");
    setNotes("");
    setFiles([]);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Management" }, { label: "Request Orders" }]} />
        <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-extrabold tracking-[-0.03em] text-slate-900">
          New Request
        </h1>
        <p className="text-sm text-slate-500">
          Create a new supply request for the selected product variant and supplier.
        </p>
      </div>

      {/* ── Two-column layout ────────────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">

        {/* ── LEFT: Form panels ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Product Details */}
          <FormSection title="Product Details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Dropdown
                label="Product Variant"
                placeholder="Select Variant"
                options={PRODUCT_VARIANTS}
                value={variant}
                onChange={setVariant}
              />
              <Dropdown
                label="Select Supplier"
                placeholder="Select Supplier"
                options={SUPPLIERS}
                value={supplier}
                onChange={setSupplier}
              />
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
              <Info size={13} strokeWidth={2} className="shrink-0 text-emerald-500" />
              Selecting a supplier automatically updates demand forecasting.
            </p>
          </FormSection>

          {/* Order Setup */}
          <FormSection title="Order Setup">
            <div className="grid gap-4 sm:grid-cols-2">
              <CustomTextbox
                label="Batch Number (auto-generated)"
                value={batchNumber}
                readOnly
                disabled
                className="bg-slate-50 text-slate-400 cursor-not-allowed"
                placeholder="BATCH-XXXXXXXX-XXXX"
              />
              <CustomTextbox
                label="Stock Quantity (kg)"
                type="number"
                placeholder="Enter Quantity"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                min="1"
              />
            </div>
          </FormSection>

          {/* Target Dates */}
          <FormSection title="Target Dates">
            <div className="grid gap-4 sm:grid-cols-2">
              <CustomTextbox
                label="Target Arrival Date"
                type="date"
                value={arrivalDate}
                onChange={(e) => setArrivalDate(e.target.value)}
              />
              <CustomTextbox
                label="Required By Date"
                type="date"
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
              />
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
              <Info size={13} strokeWidth={2} className="shrink-0 text-emerald-500" />
              Dates must be at least 3 days from today.
            </p>
          </FormSection>

          {/* Attachments */}
          <FormSection title="Attachments">
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-10 transition ${
                dragging
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50/40"
              }`}
            >
              <UploadCloud size={36} className="text-slate-300" strokeWidth={1.5} />
              <p className="text-sm font-medium text-slate-500">
                Drag and drop files here, or{" "}
                <span className="font-bold text-emerald-600">click to select</span>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.rar"
                multiple
                className="hidden"
                onChange={onFileInput}
              />
              <CustomGreenButton text="Upload" type="button" className="mt-1 px-6 py-2 text-sm" />
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
                  >
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      className="ml-2 shrink-0 text-slate-400 hover:text-rose-500 transition"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-3 text-[11px] text-slate-400">
              Accepted: PNG, JPG, JPEG, WEBP, RAR · Max: <strong>10MB</strong>
            </p>
          </FormSection>

          {/* Notes */}
          <FormSection title="Notes">
            <div className="w-full">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Additional Notes
              </label>
              <RichTextEditor
                onChange={(html) => setNotes(html)}
                placeholder="Add additional instructions for the supplier…"
                maxLength={500}
                minHeight={150}
              />
            </div>
          </FormSection>

          {/* Submit */}
          <CustomGreenButton
            type="submit"
            text="Submit Order Request"
            className="w-full py-3.5 text-base font-bold rounded-2xl"
          />
        </div>

        {/* ── RIGHT: Info panel ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Recommended Quantity */}
          <div className="rounded-2xl bg-[#0B5D1E] p-5 text-white shadow-[0_8px_24px_rgba(11,93,30,0.25)]">
            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-white/70">
              Recommended Quantity
            </h3>
            <p className="mt-3 text-[2.25rem] font-extrabold leading-none tracking-tight">
              {recommendedQty != null ? `${recommendedQty.toLocaleString()} kg` : "— kg"}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-white/60">
              Calculated using historical demand and inventory formula.
            </p>
          </div>

          {/* Historical Demand */}
          <SideCard>
            <h3 className="text-[12px] font-extrabold uppercase tracking-[0.07em] text-slate-700">
              Historical Demand (Last 12 Months)
            </h3>
            {historicalData ? (
              <SparkBar data={historicalData} months={MONTHS} />
            ) : (
              <EmptyChartState
                icon={BarChart3}
                message="Select a product variant and supplier to view historical demands."
              />
            )}
          </SideCard>

          {/* Current Month Forecast */}
          <SideCard>
            <h3 className="text-[12px] font-extrabold uppercase tracking-[0.07em] text-slate-700">
              Current Month Forecast
            </h3>
            {currentForecast ? (
              <div className="mt-3 space-y-1">
                <p className="text-[1.5rem] font-extrabold tracking-tight text-slate-800">
                  {currentForecast.toLocaleString()} kg
                </p>
                <p className="text-[11px] text-slate-400">Projected demand for this month.</p>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.min((currentForecast / (recommendedQty || 1)) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  {Math.round((currentForecast / (recommendedQty || 1)) * 100)}% of recommended
                </p>
              </div>
            ) : (
              <EmptyChartState
                icon={TrendingUp}
                message="Forecast data will appear here after selection."
              />
            )}
          </SideCard>

          {/* Forecast Guide */}
          <SideCard className="border-amber-100 bg-amber-50">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-200">
                <BookOpen size={16} className="text-amber-700" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-[12px] font-extrabold uppercase tracking-[0.07em] text-amber-700">
                  Forecast Guide
                </h3>
                <p className="mt-1.5 text-[11px] leading-relaxed text-amber-700/80">
                  Learn how our predictive engine calculates suggested stock levels based on seasonal trends and market data.
                </p>
                <button
                  type="button"
                  className="mt-3 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[11px] font-bold text-amber-700 transition hover:bg-amber-100"
                >
                  Load More
                </button>
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
          actionLabel={toast.actionLabel}
          actionType={toast.actionType}
          onAction={toast.onAction}
          duration={toast.duration || 4000}
          onClose={() => setToast(null)}
        />
      )}
    </form>
  );
}