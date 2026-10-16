import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Loader2,
  Upload,
  Camera,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import useApi from "../../hooks/useApi";

function DetailRow({ label, value, isAmount = false, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-xs sm:text-sm">
      <span className="text-slate-500 font-medium shrink-0">{label}:</span>
      {children ? (
        <div className="text-right">{children}</div>
      ) : (
        <span
          className={`text-right break-words max-w-[60%] ${
            isAmount
              ? "font-bold text-[#0B5D1E] text-sm sm:text-base"
              : "font-normal text-slate-800"
          }`}
        >
          {value || "—"}
        </span>
      )}
    </div>
  );
}

// Clean error message helper
function cleanErrorMessage(err, fallback = "An error occurred while processing the payment.") {
  if (!err) return fallback;
  const msg = err?.message || err?.detail || (typeof err === "string" ? err : "");
  if (!msg || typeof msg !== "string") return fallback;
  if (/<[a-z][\s\S]*>/i.test(msg)) {
    if (msg.includes("403") || msg.includes("CSRF")) {
      return "Authentication error or session expired. Please sign in again.";
    }
    return fallback;
  }
  return msg;
}

// Compress and resize image using canvas before OCR to speed up client processing
async function compressImageForOcr(file, maxDimension = 1200) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else resolve(file);
        },
        "image/jpeg",
        0.85
      );
    };
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

// Extract payment reference number from recognized OCR text
function extractReferenceNumber(text) {
  if (!text) return "";
  const cleanedText = text.replace(/\r\n/g, "\n");

  // Priority 1: Labelled reference patterns (e.g. "Ref No. 1234 567 890", "Reference No: ...")
  const labelledPatterns = [
    /(?:ref(?:erence)?\.?\s*(?:no\.?|num(?:ber)?|id|code)?|trace\s*(?:no\.?|num)?|trans(?:action)?\s*(?:no\.?|id|code)?)[:\s#]*([A-Z0-9\s-]{6,30})/i,
    /(?:approval\s*code|auth\s*(?:code|no))[:\s#]*([A-Z0-9\s-]{6,25})/i,
  ];

  for (const pattern of labelledPatterns) {
    const match = cleanedText.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim().split("\n")[0].trim();
      const sanitized = candidate.replace(/[^A-Za-z0-9\s-]/g, "").trim();
      if (sanitized.length >= 6 && !/^(amount|payment|total|date|time|gcash|bank)$/i.test(sanitized)) {
        return sanitized;
      }
    }
  }

  // Priority 2: Standard GCash reference sequence (e.g. 13-digit sequence: 0021 548 123456)
  const gcashMatch = cleanedText.match(/\b([0-9]{4}[\s-]?[0-9]{3,4}[\s-]?[0-9]{4,6})\b/);
  if (gcashMatch && gcashMatch[1]) {
    return gcashMatch[1].trim();
  }

  // Priority 3: Long numeric/alphanumeric sequence (10-24 characters)
  const genericMatch = cleanedText.match(/\b([A-Z0-9]{10,24})\b/i);
  if (genericMatch && genericMatch[1]) {
    return genericMatch[1].trim();
  }

  return "";
}

export default function ExpensePayNowModal({
  isOpen,
  onClose,
  expense,
  onSuccess,
}) {
  const { request } = useApi();

  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState(null);

  // OCR state
  const [isScanningOcr, setIsScanningOcr] = useState(false);
  const [ocrStatusText, setOcrStatusText] = useState("");
  const [ocrSuccess, setOcrSuccess] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  // Clean up object URL when modal unmounts or receiptFile changes
  useEffect(() => {
    return () => {
      if (receiptPreviewUrl) {
        URL.revokeObjectURL(receiptPreviewUrl);
      }
    };
  }, [receiptPreviewUrl]);

  if (!isOpen || !expense) return null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage("");
    setReceiptFile(file);
    if (receiptPreviewUrl) {
      URL.revokeObjectURL(receiptPreviewUrl);
    }
    const preview = URL.createObjectURL(file);
    setReceiptPreviewUrl(preview);

    await processOcr(file);
  };

  const processOcr = async (file) => {
    setIsScanningOcr(true);
    setOcrStatusText("Preparing receipt image...");
    setOcrSuccess(false);
    setErrorMessage("");

    let worker = null;
    try {
      const compressedBlob = await compressImageForOcr(file, 1200);
      setOcrStatusText("Scanning receipt to capture reference number...");

      const { createWorker } = await import("tesseract.js");
      worker = await createWorker("eng");

      const ret = await worker.recognize(compressedBlob);
      const text = ret?.data?.text || "";

      const extractedRef = extractReferenceNumber(text);
      if (extractedRef) {
        setPaymentReference(extractedRef);
        setOcrSuccess(true);
        setOcrStatusText("Reference number captured! You can verify or edit below.");
      } else {
        setOcrStatusText("Could not detect reference automatically. Please enter it manually below.");
      }
    } catch (err) {
      console.error("Client OCR error:", err);
      setOcrStatusText("OCR scan unavailable or failed. Please type reference manually below.");
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch {
          // ignore
        }
      }
      setIsScanningOcr(false);
    }
  };

  const handleClearReceipt = () => {
    setReceiptFile(null);
    if (receiptPreviewUrl) {
      URL.revokeObjectURL(receiptPreviewUrl);
      setReceiptPreviewUrl(null);
    }
    setOcrSuccess(false);
    setOcrStatusText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const isFormValid = () => {
    if (!paymentMethod) return false;
    if (paymentMethod === "Cash") return true;
    if (["Bank", "GCash"].includes(paymentMethod)) {
      return Boolean(paymentReference.trim());
    }
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!paymentMethod) {
      setErrorMessage("Please select a payment method.");
      return;
    }

    if (["Bank", "GCash"].includes(paymentMethod) && !paymentReference.trim()) {
      setErrorMessage(`Payment Reference Number is required for ${paymentMethod} payments.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("expenses_id", String(expense.expenses_id || expense.id));
      formData.append("payment_method", paymentMethod);
      if (paymentMethod !== "Cash") {
        formData.append("payment_reference", paymentReference.trim());
      }
      if (receiptFile) {
        formData.append("receipt_file", receiptFile);
      }

      const res = await request("/miller-employees/finance/expenses/pay/", {
        method: "POST",
        body: formData,
        throwOnError: true,
      });

      if (res && res.success && res.data) {
        onSuccess(res.data);
      } else {
        setErrorMessage(cleanErrorMessage(res, "Failed to record payment. Please try again."));
      }
    } catch (err) {
      console.error("Expense payment error:", err);
      setErrorMessage(cleanErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header — Flat Procurement visual match */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {expense.setting_reference_no || "Expense Payment"}
            </h2>
            <p className="text-xs text-slate-500 font-medium">Expense Disbursement Details</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close details"
            title="Close details"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body — Flat rows with thin horizontal dividers */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)] space-y-3">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ── SECTION 1 — EXPENSE DETAILS ── */}
          <div className="space-y-1">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              Expense Details
            </div>

            <DetailRow label="Setting Reference No." value={expense.setting_reference_no} />
            <DetailRow label="Set By" value={expense.set_by || "Miller Manager"} />
            <DetailRow label="Expense Type" value={expense.expense_type} />

            {/* Description — large bordered multiline area */}
            <div className="py-1.5 text-xs sm:text-sm">
              <span className="text-slate-500 font-medium block mb-1">Description:</span>
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                {expense.description || "—"}
              </div>
            </div>

            <DetailRow label="Deadline">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="font-normal text-slate-800">
                  {expense.deadline_formatted || expense.deadline}
                </span>
                {expense.deadline_badge === "overdue" && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                    Overdue
                  </span>
                )}
                {expense.deadline_badge === "near_deadline" && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                    Near Deadline
                  </span>
                )}
              </div>
            </DetailRow>

            <DetailRow label="Price" value={expense.price} isAmount={true} />
          </div>

          {/* Thin Horizontal Divider */}
          <div className="border-t border-slate-100 pt-2" />

          {/* ── SECTION 2 — PAYMENT DETAILS ── */}
          <div className="space-y-2">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              Payment Details
            </div>

            {/* Payment Method Dropdown */}
            <div className="flex items-center justify-between gap-3 py-1.5 text-xs sm:text-sm">
              <span className="text-slate-500 font-medium shrink-0">
                Payment Method: <span className="text-rose-500">*</span>
              </span>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value);
                  setErrorMessage("");
                }}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-normal text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer"
              >
                <option value="">Select Payment Method</option>
                <option value="Cash">Cash</option>
                <option value="Bank">Bank</option>
                <option value="GCash">GCash</option>
              </select>
            </div>

            {/* CASH Specific Notice */}
            {paymentMethod === "Cash" && (
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/50 text-xs text-emerald-900 space-y-1 mt-2">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-[#0B5D1E]" />
                  <span>Cash Payment Selected</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11.5px]">
                  Payment Reference Number will be automatically generated upon payment confirmation (Format:{" "}
                  <span className="font-mono font-semibold text-emerald-800">BIZ-MMDDYYYY-HHMM-PAYER</span>).
                  No receipt upload or manual reference required.
                </p>
              </div>
            )}

            {/* BANK / GCASH Specific Inputs */}
            {["Bank", "GCash"].includes(paymentMethod) && (
              <div className="space-y-3 pt-2">
                {/* Upload or Capture Payment Receipt */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                      Upload or Capture Payment Receipt
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Take a photo or upload a screenshot to automatically capture the payment reference number.
                    </p>
                  </div>

                  {/* Hidden file inputs */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {/* Two Clear Options: Take Photo & Upload File */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 hover:border-emerald-500 bg-slate-50/70 hover:bg-emerald-50/30 rounded-xl text-xs font-semibold text-slate-700 hover:text-emerald-800 transition cursor-pointer"
                    >
                      <Camera size={15} className="text-[#0B5D1E]" />
                      <span>Take Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 hover:border-emerald-500 bg-slate-50/70 hover:bg-emerald-50/30 rounded-xl text-xs font-semibold text-slate-700 hover:text-emerald-800 transition cursor-pointer"
                    >
                      <Upload size={15} className="text-[#0B5D1E]" />
                      <span>Upload File</span>
                    </button>
                  </div>

                  {/* Uploaded receipt preview chip */}
                  {receiptFile && (
                    <div className="flex items-center justify-between p-2 mt-2 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {receiptPreviewUrl && (
                          <img
                            src={receiptPreviewUrl}
                            alt="Receipt preview"
                            className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">
                            {receiptFile.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {(receiptFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearReceipt}
                        className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 rounded cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {/* OCR Status indicators */}
                  {isScanningOcr && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium pt-1 animate-pulse">
                      <Loader2 size={13} className="animate-spin text-[#0B5D1E]" />
                      <span>Scanning receipt to capture reference number...</span>
                    </div>
                  )}

                  {!isScanningOcr && ocrStatusText && (
                    <div
                      className={`flex items-center gap-1.5 text-xs font-medium pt-1 ${
                        ocrSuccess ? "text-emerald-700" : "text-slate-500"
                      }`}
                    >
                      {ocrSuccess ? (
                        <CheckCircle2 size={13} className="text-[#0B5D1E] shrink-0" />
                      ) : (
                        <AlertCircle size={13} className="text-slate-400 shrink-0" />
                      )}
                      <span>{ocrStatusText}</span>
                    </div>
                  )}
                </div>

                {/* Payment Reference Number Field */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <label className="block text-xs sm:text-sm font-bold text-slate-800">
                    Payment Reference Number <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Automatically filled when a receipt is scanned. You can also enter or edit the reference number manually.
                  </p>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => {
                      setPaymentReference(e.target.value);
                      setErrorMessage("");
                    }}
                    placeholder={`Enter ${paymentMethod} reference number`}
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none transition"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer: Centered Green Action Button */}
        <div className="px-6 py-3.5 border-t border-slate-100 shrink-0 bg-white flex justify-center">
          <button
            type="button"
            disabled={isSubmitting || !isFormValid()}
            onClick={handleSubmit}
            className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-[#018311] hover:bg-[#016b0f] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" />
                <span>Processing Payment...</span>
              </>
            ) : (
              <span>Pay Now</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

