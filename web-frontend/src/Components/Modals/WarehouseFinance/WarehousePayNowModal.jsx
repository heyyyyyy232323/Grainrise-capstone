import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Loader2,
  Upload,
  Camera,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  ExternalLink,
  RefreshCw,
  Sparkles,
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

function extractReferenceNumber(text) {
  if (!text) return "";
  const cleanedText = text.replace(/\r\n/g, "\n");

  // Priority 1: Multi-column GCash receipt layout where digits wrap across lines:
  // e.g. "Ref No. 6046 482 ... Oct 24, 2026 \n 839954 ... PM" -> "6046 482 839954"
  const gcashSplitMatch = cleanedText.match(
    /ref(?:erence)?\.?\s*(?:no\.?|num(?:ber)?)?[:\s]*(\d{4})\s*(\d{3})[\s\S]*?\n\s*(\d{5,6})\b/i
  );
  if (gcashSplitMatch) {
    return `${gcashSplitMatch[1]} ${gcashSplitMatch[2]} ${gcashSplitMatch[3]}`;
  }

  // Priority 2: Standard single-line GCash 13-digit sequence (4 digits + 3 digits + 6 digits)
  const gcashMatch = cleanedText.match(/\b([0-9]{4}[\s-]?[0-9]{3,4}[\s-]?[0-9]{4,6})\b/);
  if (gcashMatch && gcashMatch[1]) {
    return gcashMatch[1].trim();
  }

  // Priority 3: Labelled reference patterns (e.g. "Ref No. 1234 567 890", "Trace No: ...")
  const labelledPatterns = [
    /(?:ref(?:erence)?\.?\s*(?:no\.?|num(?:ber)?|id|code)?|trace\s*(?:no\.?|num)?|trans(?:action)?\s*(?:no\.?|id|code)?)[:\s#]*([A-Z0-9\s-]{6,30})/i,
    /(?:approval\s*code|auth\s*(?:code|no))[:\s#]*([A-Z0-9\s-]{6,25})/i,
  ];

  for (const pattern of labelledPatterns) {
    const match = cleanedText.match(pattern);
    if (match && match[1]) {
      let candidate = match[1].trim().split("\n")[0].trim();
      // Remove trailing date/time keywords that may bleed in from adjacent columns (e.g. Oct24, Date)
      candidate = candidate.replace(
        /\s+(?:date|time|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\w\s,.:-]*$/i,
        ""
      );
      const sanitized = candidate.replace(/[^A-Za-z0-9\s-]/g, "").trim();
      if (
        sanitized.length >= 6 &&
        !/^(amount|payment|total|date|time|gcash|bank)$/i.test(sanitized)
      ) {
        return sanitized;
      }
    }
  }

  // Priority 4: Generic long alphanumeric sequence (10-24 characters)
  const genericMatch = cleanedText.match(/\b([A-Z0-9]{10,24})\b/i);
  if (genericMatch && genericMatch[1]) {
    return genericMatch[1].trim();
  }

  return "";
}

export default function WarehousePayNowModal({
  isOpen,
  onClose,
  payable,
  onSuccess,
}) {
  const { request } = useApi();

  const [paymentMethod, setPaymentMethod] = useState("");
  const [bankChannel, setBankChannel] = useState("PH_BDO");
  const [paymentReference, setPaymentReference] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState(null);

  // Product photo error state
  const [imageLoadError, setImageLoadError] = useState(false);

  // OCR state
  const [isScanningOcr, setIsScanningOcr] = useState(false);
  const [ocrStatusText, setOcrStatusText] = useState("");
  const [ocrSuccess, setOcrSuccess] = useState(false);

  // Xendit online payment session state
  const [activeXenditSession, setActiveXenditSession] = useState(null);
  const [isInitiatingXendit, setIsInitiatingXendit] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const isRegisteredMiller = payable?.supplier_type === "registered_miller";

  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    setImageLoadError(false);
    setPaymentMethod("");
    setPaymentReference("");
    setReceiptFile(null);
    setReceiptPreviewUrl(null);
    setErrorMessage("");

    if (payable?.latest_xendit_attempt) {
      setActiveXenditSession(payable.latest_xendit_attempt);
      setPaymentMethod("GCash");
    } else {
      setActiveXenditSession(null);
    }
  }, [payable?.receiving_id, payable?.id]);

  useEffect(() => {
    return () => {
      if (receiptPreviewUrl) {
        URL.revokeObjectURL(receiptPreviewUrl);
      }
    };
  }, [receiptPreviewUrl]);

  const resolvedPhotoUrl = useMemo(() => {
    const raw = payable?.product_photo || payable?.receiving_proof_photo || "";
    if (!raw) return null;
    const trimmed = String(raw).trim();
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
    const clean = trimmed.replace(/^\/?(media\/)?/, "");
    const backendBase = (
      import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
    ).replace(/\/$/, "");
    return `${backendBase}/media/${clean}`;
  }, [payable?.product_photo, payable?.receiving_proof_photo]);

  if (!isOpen || !payable) return null;

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
      setOcrStatusText("OCR scan unavailable. Please type reference manually below.");
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

  // Initiate Xendit Payment Session for Registered Millers
  const handleInitiateXendit = async () => {
    setIsInitiatingXendit(true);
    setErrorMessage("");
    try {
      const res = await request("/warehouse/finance/payables/xendit/initiate/", {
        method: "POST",
        body: JSON.stringify({
          receiving_id: payable.receiving_id || payable.id,
          payment_method: paymentMethod,
          bank_channel: bankChannel,
        }),
      });

      if (res && res.success) {
        setActiveXenditSession(res);
      } else {
        setErrorMessage(cleanErrorMessage(res, "Failed to initiate online payment session."));
      }
    } catch (err) {
      console.error("Initiate Xendit error:", err);
      setErrorMessage(cleanErrorMessage(err, "Failed to initiate online payment."));
    } finally {
      setIsInitiatingXendit(false);
    }
  };

  // Reconcile status with Xendit or simulate sandbox success
  const handleReconcileXendit = async (simulateSandbox = false) => {
    setIsReconciling(true);
    setErrorMessage("");
    try {
      const res = await request("/warehouse/finance/payables/xendit/reconcile/", {
        method: "POST",
        body: JSON.stringify({
          receiving_id: payable.receiving_id || payable.id,
          simulate_sandbox_success: simulateSandbox,
        }),
      });

      if (res && res.success) {
        if (res.is_paid && res.data) {
          onSuccess(res.data);
        } else {
          setErrorMessage(res.message || "Payment is still pending confirmation.");
        }
      } else {
        setErrorMessage(cleanErrorMessage(res, "Payment reconciliation failed."));
      }
    } catch (err) {
      console.error("Reconcile error:", err);
      setErrorMessage(cleanErrorMessage(err, "Failed to reconcile payment status."));
    } finally {
      setIsReconciling(false);
    }
  };

  // Cancel pending attempt
  const handleCancelAttempt = async () => {
    try {
      await request("/warehouse/finance/payables/xendit/cancel/", {
        method: "POST",
        body: JSON.stringify({
          receiving_id: payable.receiving_id || payable.id,
        }),
      });
      setActiveXenditSession(null);
    } catch (err) {
      console.error("Cancel attempt error:", err);
    }
  };

  const isFormValid = () => {
    if (!paymentMethod) return false;
    if (paymentMethod === "Cash") return true;

    // For Registered Miller: GCash/Bank uses Xendit payment sessions
    if (isRegisteredMiller && ["Bank", "GCash"].includes(paymentMethod)) {
      return Boolean(activeXenditSession);
    }

    // For External Supplier: Requires manual reference number
    if (!isRegisteredMiller && ["Bank", "GCash"].includes(paymentMethod)) {
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

    // If registered miller with active Xendit session, trigger reconciliation check
    if (isRegisteredMiller && ["Bank", "GCash"].includes(paymentMethod)) {
      await handleReconcileXendit(false);
      return;
    }

    if (!isRegisteredMiller && ["Bank", "GCash"].includes(paymentMethod) && !paymentReference.trim()) {
      setErrorMessage(`Payment Reference Number is required for ${paymentMethod} payments.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("receiving_id", String(payable.receiving_id || payable.id));
      formData.append("supplier_type", payable.supplier_type || (isRegisteredMiller ? "registered_miller" : "external_supplier"));
      formData.append("payment_method", paymentMethod);

      if (paymentMethod !== "Cash") {
        formData.append("payment_reference", paymentReference.trim());
      }
      if (receiptFile) {
        formData.append("receipt_file", receiptFile);
      }

      const res = await request("/warehouse/finance/payables/pay/", {
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
      console.error("Payment recording error:", err);
      setErrorMessage(cleanErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {payable.batch_no || payable.batchNo || "Payment Details"}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-500 font-medium">Payment Reference Details</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isRegisteredMiller
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-700 border border-slate-200"
                }`}
              >
                {isRegisteredMiller ? "Registered Miller" : "External Supplier"}
              </span>
            </div>
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

        {/* Modal Body */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)] space-y-3">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ── SECTION 1 — INBOUND ORDER DETAILS ─────────────────── */}
          <div className="space-y-1">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              Inbound Order Details
            </div>

            <DetailRow label="Variant" value={payable.variant || payable.product_name} />
            <DetailRow label="Supplier">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="font-semibold text-slate-800">{payable.supplier}</span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    isRegisteredMiller
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {isRegisteredMiller ? "Registered" : "External"}
                </span>
              </div>
            </DetailRow>

            {/* Product Photo Row */}
            <div className="flex items-center justify-between gap-3 py-1.5 text-xs sm:text-sm">
              <span className="text-slate-500 font-medium shrink-0">Product Photo:</span>
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center">
                {resolvedPhotoUrl && !imageLoadError ? (
                  <img
                    src={resolvedPhotoUrl}
                    alt={payable.variant || "Product photo"}
                    className="h-full w-full object-cover"
                    onError={() => setImageLoadError(true)}
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

            <DetailRow
              label="Original Order Quantity"
              value={payable.original_order_quantity}
            />
          </div>

          <div className="border-t border-slate-100 pt-2" />

          {/* ── SECTION 2 — RECEIVING DETAILS ─────────────────────── */}
          <div className="space-y-1">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              Receiving Details
            </div>

            <DetailRow
              label="Receiving Reference No."
              value={payable.receiving_reference_no || payable.reference_no}
            />
            <DetailRow label="Total Received" value={payable.total_received || payable.stockQty} />
            <DetailRow label="Good" value={payable.received_good || payable.stockQty} />
            <DetailRow label="Price / kg" value={payable.price_per_kg || payable.unitPrice} />
            <DetailRow
              label="Payable"
              value={payable.payable || payable.total}
              isAmount={true}
            />
            <DetailRow label="Received By" value={payable.received_by || "Warehouse Staff"} />
          </div>

          <div className="border-t border-slate-100 pt-2" />

          {/* ── SECTION 3 — PAYMENT DETAILS ───────────────────────── */}
          <div className="space-y-2">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              Payment Details
            </div>

            <DetailRow
              label="Requested By"
              value={payable.requestedBy || payable.requested_by || "Procurement Staff"}
            />

            {/* Payment Method Selector */}
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
                <option value="GCash">GCash</option>
                <option value="Bank">Bank Transfer</option>
              </select>
            </div>

            {/* CASH Payment Notice */}
            {paymentMethod === "Cash" && (
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/50 text-xs text-emerald-900 space-y-1 mt-2">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-[#0B5D1E]" />
                  <span>Cash Payment Selected</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11.5px]">
                  Payment Reference Number will be automatically generated upon payment confirmation (Format:{" "}
                  <span className="font-mono font-semibold text-emerald-800">INITIALS-BIZ-MMDDYYYY-HHMM</span>).
                  No receipt upload or manual reference required.
                </p>
              </div>
            )}

            {/* REGISTERED MILLER: XENDIT PAYMENT SESSIONS */}
            {isRegisteredMiller && ["Bank", "GCash"].includes(paymentMethod) && (
              <div className="space-y-3 pt-2">
                <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                      Xendit Online Payment Session ({paymentMethod})
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Sandbox QA Ready
                    </span>
                  </div>
                  <p className="text-[11.5px] text-slate-600 leading-relaxed">
                    Charges money-in directly from the Warehouse via authenticated Xendit Payment Session.
                    Real-time payment verification prevents duplicate charges.
                  </p>

                  {!activeXenditSession ? (
                    <div className="pt-1">
                      <button
                        type="button"
                        disabled={isInitiatingXendit}
                        onClick={handleInitiateXendit}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#018311] hover:bg-[#016b0f] text-white text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        {isInitiatingXendit ? (
                          <>
                            <Loader2 size={14} className="animate-spin text-white" />
                            <span>Creating Xendit Payment Session...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} />
                            <span>Initiate {paymentMethod} Payment Session</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2.5 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">Active Payment Session:</span>
                        <span className="text-[11px] font-mono font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {activeXenditSession.payment_status || "PENDING"}
                        </span>
                      </div>

                      <div className="text-xs space-y-1">
                        <div className="flex justify-between text-slate-500">
                          <span>Reference:</span>
                          <span className="font-mono text-slate-700 font-semibold">{activeXenditSession.reference_id}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Amount:</span>
                          <span className="font-bold text-emerald-700">₱ {Number(activeXenditSession.amount || payable.total_raw || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {activeXenditSession.payment_link_url && (
                          <a
                            href={activeXenditSession.payment_link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                          >
                            <span>Open Payment Gateway</span>
                            <ExternalLink size={12} />
                          </a>
                        )}

                        <button
                          type="button"
                          disabled={isReconciling}
                          onClick={() => handleReconcileXendit(false)}
                          className="flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                        >
                          <RefreshCw size={12} className={isReconciling ? "animate-spin" : ""} />
                          <span>Check Status</span>
                        </button>
                      </div>

                      {/* QA Sandbox Simulator Button */}
                      <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">Sandbox Testing Tool:</span>
                        <button
                          type="button"
                          disabled={isReconciling}
                          onClick={() => handleReconcileXendit(true)}
                          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <CheckCircle2 size={12} />
                          <span>Simulate Success (Sandbox)</span>
                        </button>
                      </div>

                      <div className="text-right">
                        <button
                          type="button"
                          onClick={handleCancelAttempt}
                          className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                        >
                          Cancel this attempt
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* EXTERNAL SUPPLIER: MANUAL GCASH / BANK PROOF WITH OCR */}
            {!isRegisteredMiller && ["Bank", "GCash"].includes(paymentMethod) && (
              <div className="space-y-3 pt-2">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                      Upload or Capture Payment Receipt
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Take a photo or upload a screenshot to automatically capture the payment reference number.
                    </p>
                  </div>

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

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <label className="block text-xs sm:text-sm font-bold text-slate-800">
                    Payment Reference Number <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Captured from scanned receipt or entered manually.
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

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 shrink-0 bg-white flex justify-center">
          <button
            type="button"
            disabled={isSubmitting || !isFormValid() || isInitiatingXendit || isReconciling}
            onClick={handleSubmit}
            className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-[#018311] hover:bg-[#016b0f] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            {isSubmitting || isReconciling ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" />
                <span>Processing Payment...</span>
              </>
            ) : isRegisteredMiller && ["Bank", "GCash"].includes(paymentMethod) && activeXenditSession ? (
              <span>Confirm & Reconcile Payment</span>
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
