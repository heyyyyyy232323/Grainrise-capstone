import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Upload,
  Star,
  AlertCircle,
  Loader2,
} from "lucide-react";

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const ALLOWED_PHOTO_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

function DetailRow({ label, value, isBadge = false, badgeStyle = "", children }) {
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

function PhotoUploadBox({
  label,
  file,
  previewUrl,
  error,
  onFileChange,
}) {
  return (
    <div className="flex flex-col items-center w-full">
      <div className="text-center font-medium text-slate-600 text-xs sm:text-sm mb-1.5">
        {label}
      </div>
      <div className="w-full">
        {!previewUrl ? (
          <label className={`relative flex flex-col items-center justify-center p-3.5 border-2 border-dashed rounded-xl bg-slate-50/70 hover:bg-slate-100/80 transition cursor-pointer group min-h-[105px] ${
            error ? "border-rose-300" : "border-slate-200 hover:border-emerald-500"
          }`}>
            <Upload
              size={18}
              className="text-slate-400 group-hover:text-emerald-600 transition mb-1"
            />
            <span className="text-xs font-semibold text-slate-600 group-hover:text-emerald-700 transition">
              Upload Image
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">
              JPG, PNG, or WEBP (max 15MB)
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onFileChange}
              className="hidden"
            />
          </label>
        ) : (
          <label className="relative w-full rounded-xl border border-slate-200 overflow-hidden bg-slate-900 group min-h-[110px] max-h-[140px] flex items-center justify-center cursor-pointer">
            <img
              src={previewUrl}
              alt={label}
              className="w-full h-full object-contain max-h-[140px]"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
              <Upload size={16} className="mb-0.5" />
              <span className="text-[11px] font-bold">Change Image</span>
              {file?.name && (
                <span className="text-[9px] text-slate-200 truncate max-w-[85%] mt-0.5">
                  {file.name}
                </span>
              )}
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onFileChange}
              className="hidden"
            />
          </label>
        )}
        {error && (
          <p className="text-center text-[11px] text-rose-600 font-medium mt-1">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default function MarkAsReceivedModal({
  isOpen,
  onClose,
  order,
  onSubmit,
  isSubmitting = false,
}) {
  const todayStr = useMemo(() => getTodayDateString(), []);

  // Form State
  const [totalReceived, setTotalReceived] = useState("");
  const [hasQualityIssue, setHasQualityIssue] = useState(false);
  const [receivedBad, setReceivedBad] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [farmerRating, setFarmerRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [shelfLocation, setShelfLocation] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  // Files & Previews
  const [receivingProofFile, setReceivingProofFile] = useState(null);
  const [receivingProofPreview, setReceivingProofPreview] = useState(null);
  const [photoEvidenceFile, setPhotoEvidenceFile] = useState(null);
  const [photoEvidencePreview, setPhotoEvidencePreview] = useState(null);

  // Validation & Server Error
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");

  // Reset form when modal opens with a new order
  useEffect(() => {
    if (isOpen && order) {
      setTotalReceived("");
      setHasQualityIssue(false);
      setReceivedBad("");
      setPricePerKg("");
      setFarmerRating(0);
      setHoverRating(0);
      setShelfLocation("");
      setExpiryDate("");
      setReceivingProofFile(null);
      setReceivingProofPreview(null);
      setPhotoEvidenceFile(null);
      setPhotoEvidencePreview(null);
      setErrors({});
      setServerError("");
    }
  }, [isOpen, order]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (receivingProofPreview) URL.revokeObjectURL(receivingProofPreview);
      if (photoEvidencePreview) URL.revokeObjectURL(photoEvidencePreview);
    };
  }, [receivingProofPreview, photoEvidencePreview]);

  // Quantities & Calculations
  const remainingReceivable = Number(order?.remaining_receivable) || 0;
  const numTotalReceived = parseFloat(totalReceived) || 0;
  const numReceivedBad = hasQualityIssue ? parseFloat(receivedBad) || 0 : 0;
  const numReceivedGood = Math.max(0, numTotalReceived - numReceivedBad);
  const numPricePerKg = parseFloat(pricePerKg) || 0;
  const totalPayables = numReceivedGood * numPricePerKg;

  // Real-time Validation: Total Received
  const handleTotalReceivedChange = useCallback(
    (value) => {
      setTotalReceived(value);
      const trimmed = value.trim();

      let totErr = "";
      let totNum = 0;

      if (trimmed === "") {
        totErr = "Total received quantity is required.";
      } else {
        totNum = parseFloat(trimmed);
        if (isNaN(totNum)) {
          totErr = "Must be a valid number.";
        } else if (totNum <= 0) {
          totErr = "Total received must be greater than 0 kg.";
        } else if (totNum > remainingReceivable) {
          totErr = `Cannot exceed remaining receivable (${remainingReceivable.toLocaleString()} kg).`;
        }
      }

      // Re-evaluate bad received against new total if quality toggle is ON
      let badErr = errors.receivedBad || "";
      if (hasQualityIssue) {
        const badTrimmed = receivedBad.trim();
        if (badTrimmed !== "") {
          const badNum = parseFloat(badTrimmed);
          if (!isNaN(badNum)) {
            if (badNum < 0) {
              badErr = "Rejected quantity cannot be negative.";
            } else if (!isNaN(totNum) && badNum > totNum) {
              badErr = `Rejected quantity cannot exceed total received (${totNum || 0} kg).`;
            } else {
              badErr = "";
            }
          }
        }
      }

      setErrors((prev) => ({
        ...prev,
        totalReceived: totErr,
        receivedBad: badErr,
      }));
    },
    [errors.receivedBad, hasQualityIssue, receivedBad, remainingReceivable]
  );

  // Real-time Validation: Received Bad
  const handleReceivedBadChange = useCallback(
    (value) => {
      setReceivedBad(value);
      const trimmed = value.trim();

      let badErr = "";
      if (trimmed === "") {
        badErr = "Rejected quantity is required.";
      } else {
        const badNum = parseFloat(trimmed);
        if (isNaN(badNum)) {
          badErr = "Must be a valid number.";
        } else if (badNum < 0) {
          badErr = "Rejected quantity cannot be negative.";
        } else if (badNum > numTotalReceived) {
          badErr = `Rejected quantity cannot exceed total received (${numTotalReceived || 0} kg).`;
        }
      }

      setErrors((prev) => ({
        ...prev,
        receivedBad: badErr,
      }));
    },
    [numTotalReceived]
  );

  // Quality Toggle Change
  const handleToggleQuality = useCallback((checked) => {
    setHasQualityIssue(checked);
    if (!checked) {
      setReceivedBad("");
      setPhotoEvidenceFile(null);
      setPhotoEvidencePreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setErrors((prev) => ({
        ...prev,
        receivedBad: "",
        photoEvidence: "",
      }));
    }
  }, []);

  // Real-time Validation: Shelf Location
  const handleShelfLocationChange = useCallback((value) => {
    setShelfLocation(value);
    if (!value.trim()) {
      setErrors((prev) => ({ ...prev, shelfLocation: "Shelf location is required." }));
    } else {
      setErrors((prev) => ({ ...prev, shelfLocation: "" }));
    }
  }, []);

  // Real-time Validation: Expiry Date
  const handleExpiryDateChange = useCallback(
    (value) => {
      setExpiryDate(value);
      const trimmed = value.trim();
      if (!trimmed) {
        setErrors((prev) => ({ ...prev, expiryDate: "Expiry date is required." }));
      } else if (trimmed < todayStr) {
        setErrors((prev) => ({ ...prev, expiryDate: "Expiry date must be today or a future date." }));
      } else {
        setErrors((prev) => ({ ...prev, expiryDate: "" }));
      }
    },
    [todayStr]
  );

  // Real-time Validation: Price per Kilogram
  const handlePricePerKgChange = useCallback((value) => {
    setPricePerKg(value);
    const trimmed = value.trim();
    if (!trimmed) {
      setErrors((prev) => ({ ...prev, pricePerKg: "Price per kilogram is required." }));
    } else {
      const pNum = parseFloat(trimmed);
      if (isNaN(pNum) || pNum <= 0) {
        setErrors((prev) => ({ ...prev, pricePerKg: "Price per kilogram must be greater than ₱ 0." }));
      } else {
        setErrors((prev) => ({ ...prev, pricePerKg: "" }));
      }
    }
  }, []);

  // File Upload Handlers with In-place preview
  const handleReceivingProofChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      if (!ALLOWED_PHOTO_EXTENSIONS.includes(ext)) {
        setErrors((prev) => ({
          ...prev,
          receivingProof: "Image must be JPG, PNG, or WEBP.",
        }));
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setErrors((prev) => ({
          ...prev,
          receivingProof: "File size exceeds 15MB limit.",
        }));
        return;
      }
      if (receivingProofPreview) URL.revokeObjectURL(receivingProofPreview);
      setReceivingProofFile(file);
      setReceivingProofPreview(URL.createObjectURL(file));
      setErrors((prev) => ({ ...prev, receivingProof: "" }));
    }
  };

  const handlePhotoEvidenceChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      if (!ALLOWED_PHOTO_EXTENSIONS.includes(ext)) {
        setErrors((prev) => ({
          ...prev,
          photoEvidence: "Image must be JPG, PNG, or WEBP.",
        }));
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setErrors((prev) => ({
          ...prev,
          photoEvidence: "File size exceeds 15MB limit.",
        }));
        return;
      }
      if (photoEvidencePreview) URL.revokeObjectURL(photoEvidencePreview);
      setPhotoEvidenceFile(file);
      setPhotoEvidencePreview(URL.createObjectURL(file));
      setErrors((prev) => ({ ...prev, photoEvidence: "" }));
    }
  };

  // Full Form Validation on Submit
  const validateOnSubmit = () => {
    const newErrors = {};

    if (!totalReceived || numTotalReceived <= 0) {
      newErrors.totalReceived = "Total received quantity must be greater than 0 kg.";
    } else if (numTotalReceived > remainingReceivable) {
      newErrors.totalReceived = `Cannot exceed remaining receivable (${remainingReceivable.toLocaleString()} kg).`;
    }

    if (hasQualityIssue) {
      if (receivedBad === "" || isNaN(numReceivedBad) || numReceivedBad <= 0) {
        newErrors.receivedBad = "Please enter a valid rejected quantity.";
      } else if (numReceivedBad > numTotalReceived) {
        newErrors.receivedBad = `Rejected quantity cannot exceed total received (${numTotalReceived.toLocaleString()} kg).`;
      }

      if (!photoEvidenceFile) {
        newErrors.photoEvidence = "Proof of rejected goods photo is required.";
      }
    }

    if (!receivingProofFile) {
      newErrors.receivingProof = "Proof of receiving photo is required.";
    }

    if (numReceivedGood > 0) {
      if (!shelfLocation.trim()) {
        newErrors.shelfLocation = "Shelf location is required.";
      }
      if (!expiryDate) {
        newErrors.expiryDate = "Expiry date is required.";
      } else if (expiryDate < todayStr) {
        newErrors.expiryDate = "Expiry date must be today or a future date.";
      }
    } else {
      if (expiryDate && expiryDate < todayStr) {
        newErrors.expiryDate = "Expiry date must be today or a future date.";
      }
    }

    if (!pricePerKg || numPricePerKg <= 0) {
      newErrors.pricePerKg = "Price per kilogram must be greater than ₱ 0.";
    }

    if (!farmerRating || farmerRating < 1 || farmerRating > 5) {
      newErrors.farmerRating = "Please rate the farmer from 1 to 5 stars.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirmSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    if (!validateOnSubmit()) {
      return;
    }

    const formData = new FormData();
    formData.append("total_received", totalReceived);
    formData.append("quality_checking_toggle", hasQualityIssue ? "true" : "false");
    formData.append("received_bad", hasQualityIssue ? (receivedBad || "0") : "0");
    formData.append("price_per_kg", pricePerKg);
    formData.append("farmer_rating", String(farmerRating));
    formData.append("shelf_location", shelfLocation.trim());
    formData.append("expiry_date", expiryDate);
    if (receivingProofFile) {
      formData.append("receiving_proof_photo", receivingProofFile);
    }
    if (hasQualityIssue && photoEvidenceFile) {
      formData.append("photo_evidence", photoEvidenceFile);
    }

    try {
      await onSubmit(order.inbound_order_id, formData);
    } catch (err) {
      setServerError(err?.message || "Failed to submit receiving order. Please try again.");
    }
  };

  if (!isOpen || !order) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Single Exit Control (X only) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {order.batch_no || order.batchNo || "Order Delivery"}
            </h2>
            <p className="text-xs text-slate-500 font-medium">Mark Order as Received</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Compact horizontal rows matching Order Approval */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-130px)] space-y-3">
          {/* Server Error Alert Banner */}
          {serverError && (
            <div className="flex items-center gap-2.5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <div className="flex-1">
                <span className="font-semibold">Receiving Error: </span>
                <span>{serverError}</span>
              </div>
            </div>
          )}

          {/* ── SECTION 1: INBOUND ORDER DETAILS ─────────────────────────── */}
          <div className="space-y-1">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
              Inbound Order Details
            </div>

            <DetailRow
              label="Product Variant"
              value={order.product_name || order.variant || "—"}
            />
            <DetailRow
              label="Supplier"
              value={order.supplier || "—"}
            />
            <DetailRow
              label="Expected Arrival"
              value={order.eta || order.expected_arrival_date || "—"}
            />
            <DetailRow
              label="Original Ordered"
              value={order.ordered_quantity_formatted || `${order.ordered_quantity} kg`}
            />
            <DetailRow
              label="Remaining Receivable"
              value={order.remaining_receivable_formatted || `${remainingReceivable} kg`}
              isBadge={true}
              badgeStyle="bg-emerald-100 text-emerald-800 font-bold"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 my-2" />

          {/* ── SECTION 2: DELIVERY INTAKE DETAILS ──────────────────────── */}
          <div className="space-y-1">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
              Delivery Intake Details
            </div>

            {/* Total Received (kg) */}
            <div className="flex items-center justify-between gap-3 py-1.5 text-xs sm:text-sm">
              <span className="text-slate-600 font-medium shrink-0">
                Total Received (kg) <span className="text-rose-500">*</span>:
              </span>
              <div className="flex flex-col items-end max-w-[55%] w-full">
                <div className="relative w-full">
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    max={remainingReceivable}
                    value={totalReceived}
                    onChange={(e) => handleTotalReceivedChange(e.target.value)}
                    placeholder={`Max ${remainingReceivable.toLocaleString()} kg`}
                    className={`w-full px-2.5 py-1 text-xs border rounded-lg focus:outline-none focus:ring-1 text-right font-semibold text-slate-900 bg-white pr-7 ${
                      errors.totalReceived
                        ? "border-rose-400 focus:ring-rose-500"
                        : "border-slate-200 focus:ring-emerald-500"
                    }`}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400 pointer-events-none">
                    kg
                  </span>
                </div>
                {errors.totalReceived && (
                  <span className="text-[10px] text-rose-600 font-medium mt-0.5 text-right">
                    {errors.totalReceived}
                  </span>
                )}
              </div>
            </div>

            {/* Quality Checking Toggle */}
            <div className="flex items-center justify-between gap-3 py-1.5 text-xs sm:text-sm border-t border-slate-100/80 pt-2">
              <div className="flex flex-col pr-2">
                <span className="text-xs sm:text-sm font-medium text-slate-700">
                  Did any goods fail the quality check?
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Turn this on if any paddy was defective or rejected and needs to be returned to the farmer.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={hasQualityIssue}
                  onChange={(e) => handleToggleQuality(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {/* Received Bad & Rejected Photo (Conditional on Quality Check Toggle) */}
            {hasQualityIssue && (
              <div className="space-y-2 py-2 bg-amber-50/50 -mx-2 px-2.5 rounded-xl border border-amber-200/60 my-1">
                {/* Received Bad / Rejected (kg) */}
                <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                  <span className="text-amber-900 font-medium shrink-0">
                    Received Bad / Rejected (kg) <span className="text-rose-500">*</span>:
                  </span>
                  <div className="flex flex-col items-end max-w-[55%] w-full">
                    <div className="relative w-full">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={receivedBad}
                        onChange={(e) => handleReceivedBadChange(e.target.value)}
                        placeholder="Rejected kg"
                        className={`w-full px-2.5 py-1 text-xs border rounded-lg focus:outline-none focus:ring-1 text-right font-semibold text-slate-900 bg-white pr-7 ${
                          errors.receivedBad
                            ? "border-rose-400 focus:ring-rose-500"
                            : "border-amber-300 focus:ring-amber-500"
                        }`}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400 pointer-events-none">
                        kg
                      </span>
                    </div>
                    {errors.receivedBad && (
                      <span className="text-[10px] text-rose-600 font-medium mt-0.5 text-right">
                        {errors.receivedBad}
                      </span>
                    )}
                  </div>
                </div>

                {/* Proof of Rejected Goods Photo immediately below Received Bad */}
                <div className="w-full pt-1.5 border-t border-amber-200/50">
                  <PhotoUploadBox
                    label="Proof of Rejected Goods Photo *"
                    file={photoEvidenceFile}
                    previewUrl={photoEvidencePreview}
                    error={errors.photoEvidence}
                    onFileChange={handlePhotoEvidenceChange}
                  />
                </div>
              </div>
            )}

            {/* Calculated Accepted Good Quantity */}
            <DetailRow
              label="Accepted Goods (Good kg)"
              value={`${numReceivedGood.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`}
              isBadge={true}
              badgeStyle="bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-200"
            />

            {/* Shelf Location */}
            <div className="flex items-center justify-between gap-3 py-1.5 text-xs sm:text-sm">
              <span className="text-slate-600 font-medium shrink-0">
                Shelf / Silo Location <span className="text-rose-500">*</span>:
              </span>
              <div className="flex flex-col items-end max-w-[55%] w-full">
                <input
                  type="text"
                  value={shelfLocation}
                  onChange={(e) => handleShelfLocationChange(e.target.value)}
                  placeholder="e.g. Silo 1, Bay A"
                  className={`w-full px-2.5 py-1 text-xs border rounded-lg focus:outline-none focus:ring-1 text-right font-semibold text-slate-900 bg-white ${
                    errors.shelfLocation
                      ? "border-rose-400 focus:ring-rose-500"
                      : "border-slate-200 focus:ring-emerald-500"
                  }`}
                />
                {errors.shelfLocation && (
                  <span className="text-[10px] text-rose-600 font-medium mt-0.5 text-right">
                    {errors.shelfLocation}
                  </span>
                )}
              </div>
            </div>

            {/* Expiry Date */}
            <div className="flex items-center justify-between gap-3 py-1.5 text-xs sm:text-sm">
              <span className="text-slate-600 font-medium shrink-0">
                Expiry Date <span className="text-rose-500">*</span>:
              </span>
              <div className="flex flex-col items-end max-w-[55%] w-full">
                <input
                  type="date"
                  min={todayStr}
                  value={expiryDate}
                  onChange={(e) => handleExpiryDateChange(e.target.value)}
                  className={`w-full px-2.5 py-1 text-xs border rounded-lg focus:outline-none focus:ring-1 font-semibold text-slate-900 bg-white text-right ${
                    errors.expiryDate
                      ? "border-rose-400 focus:ring-rose-500"
                      : "border-slate-200 focus:ring-emerald-500"
                  }`}
                />
                {errors.expiryDate && (
                  <span className="text-[10px] text-rose-600 font-medium mt-0.5 text-right">
                    {errors.expiryDate}
                  </span>
                )}
              </div>
            </div>

            {/* Price per Kilogram */}
            <div className="flex items-center justify-between gap-3 py-1.5 text-xs sm:text-sm">
              <span className="text-slate-600 font-medium shrink-0">
                Price per Kilogram (PHP) <span className="text-rose-500">*</span>:
              </span>
              <div className="flex flex-col items-end max-w-[55%] w-full">
                <div className="relative w-full">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                    ₱
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={pricePerKg}
                    onChange={(e) => handlePricePerKgChange(e.target.value)}
                    placeholder="0.00"
                    className={`w-full pl-6 pr-2.5 py-1 text-xs border rounded-lg focus:outline-none focus:ring-1 text-right font-semibold text-slate-900 bg-white ${
                      errors.pricePerKg
                        ? "border-rose-400 focus:ring-rose-500"
                        : "border-slate-200 focus:ring-emerald-500"
                    }`}
                  />
                </div>
                {errors.pricePerKg && (
                  <span className="text-[10px] text-rose-600 font-medium mt-0.5 text-right">
                    {errors.pricePerKg}
                  </span>
                )}
              </div>
            </div>

            {/* Total Payables */}
            <DetailRow
              label="Total Payables"
              value={`₱ ${totalPayables.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />

            {/* Farmer Rating */}
            <div className="flex items-center justify-between gap-3 py-1.5 text-xs sm:text-sm">
              <span className="text-slate-600 font-medium shrink-0">
                Farmer Rating <span className="text-rose-500">*</span>:
              </span>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => {
                        setFarmerRating(star);
                        if (errors.farmerRating) {
                          setErrors((prev) => ({ ...prev, farmerRating: "" }));
                        }
                      }}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-0.5 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star
                        size={18}
                        className={`${
                          (hoverRating || farmerRating) >= star
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-300"
                        } transition-colors`}
                      />
                    </button>
                  ))}
                  <span className="text-[11px] font-semibold text-slate-500 ml-1.5">
                    {farmerRating > 0 ? `${farmerRating}/5` : "Rate"}
                  </span>
                </div>
                {errors.farmerRating && (
                  <span className="text-[10px] text-rose-600 font-medium mt-0.5 text-right">
                    {errors.farmerRating}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 my-2" />

          {/* ── SECTION 3: PHOTO DOCUMENTATION ──────────────────────────── */}
          <div className="space-y-2">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
              Photo Documentation
            </div>

            <div className="w-full">
              {/* Proof of Receiving Photo */}
              <PhotoUploadBox
                label="Proof of Receiving Photo *"
                file={receivingProofFile}
                previewUrl={receivingProofPreview}
                error={errors.receivingProof}
                onFileChange={handleReceivingProofChange}
              />
            </div>
          </div>
        </div>

        {/* Modal Action Footer: Single Confirm Receiving Action (No duplicate Cancel) */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={handleConfirmSubmit}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-2 text-xs font-bold text-white bg-[#1a7a3a] hover:bg-[#125c2a] rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Recording Receiving...</span>
              </>
            ) : (
              <span>Confirm Receiving</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
