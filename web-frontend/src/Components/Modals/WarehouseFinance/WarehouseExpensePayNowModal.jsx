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

  // Priority 1: Multi-column GCash receipt layout where digits wrap across lines
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

export default function WarehouseExpensePayNowModal({
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

  // Live camera state
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // File input refs
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsLiveCameraOpen(false);
    setCameraError("");
  };

  const startLiveCamera = async () => {
    setCameraError("");
    setErrorMessage("");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // Fallback to native input if getUserMedia not supported
      cameraInputRef.current?.click();
      return;
    }

    try {
      stopLiveCamera();
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setIsLiveCameraOpen(true);
      // Wait for next tick so video element mounts
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch (err) {
      console.warn("Live camera access failed:", err);
      // Fallback to file picker if camera permission denied or unavailable
      cameraInputRef.current?.click();
    }
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        const capturedFile = new File([blob], `expense_camera_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        stopLiveCamera();

        if (receiptPreviewUrl) {
          URL.revokeObjectURL(receiptPreviewUrl);
        }
        const preview = URL.createObjectURL(capturedFile);
        setReceiptFile(capturedFile);
        setReceiptPreviewUrl(preview);
        setErrorMessage("");

        await performOcr(capturedFile);
      },
      "image/jpeg",
      0.9
    );
  };

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      stopLiveCamera();
      if (receiptPreviewUrl) {
        URL.revokeObjectURL(receiptPreviewUrl);
      }
    };
  }, [receiptPreviewUrl]);

  // Reset state whenever modal closes or a different expense opens
  useEffect(() => {
    stopLiveCamera();
    setPaymentMethod("");
    setPaymentReference("");
    setReceiptFile(null);
    if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
    setReceiptPreviewUrl(null);
    setIsScanningOcr(false);
    setOcrStatusText("");
    setOcrSuccess(false);
    setIsSubmitting(false);
    setErrorMessage("");
  }, [expense?.expenses_id, expense?.id, isOpen]);

  if (!isOpen || !expense) return null;

  // Auto-generate cash reference format preview: WH-MMDDYYYY-HHMM-WF
  const cashReferencePreview = (() => {
    const biz = String(expense.branch_name || "GrainRise Warehouse").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const prefix = biz.length >= 2 ? biz.slice(0, 2) : "WH";
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${prefix}-${mm}${dd}${yyyy}-${hh}${min}-WF`;
  })();

  const handleMethodChange = (e) => {
    const method = e.target.value;
    setPaymentMethod(method);
    setErrorMessage("");
    setOcrSuccess(false);
    setOcrStatusText("");

    // ALWAYS remove any previously uploaded or captured photo when switching payment method
    stopLiveCamera();
    if (receiptPreviewUrl) {
      URL.revokeObjectURL(receiptPreviewUrl);
    }
    setReceiptFile(null);
    setReceiptPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";

    if (method === "Cash") {
      setPaymentReference(cashReferencePreview);
    } else {
      setPaymentReference("");
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please upload a valid image file (JPG, PNG, WebP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("File size exceeds 10MB limit.");
      return;
    }

    if (receiptPreviewUrl) {
      URL.revokeObjectURL(receiptPreviewUrl);
    }
    const preview = URL.createObjectURL(file);
    setReceiptFile(file);
    setReceiptPreviewUrl(preview);
    setErrorMessage("");

    await performOcr(file);
  };

  const performOcr = async (file) => {
    setIsScanningOcr(true);
    setOcrStatusText("Optimizing image...");
    setOcrSuccess(false);

    try {
      const compressed = await compressImageForOcr(file, 1200);

      setOcrStatusText("Reading receipt text...");
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");

      const ret = await worker.recognize(compressed);
      const text = ret?.data?.text || "";
      await worker.terminate();

      const extractedRef = extractReferenceNumber(text);
      if (extractedRef) {
        setPaymentReference(extractedRef);
        setOcrSuccess(true);
        setOcrStatusText(`Reference detected: ${extractedRef}`);
      } else {
        setOcrStatusText("No reference found. Please enter manually below.");
      }
    } catch (err) {
      console.warn("Client OCR could not detect reference:", err);
      setOcrStatusText("Auto-detection unavailable. Please enter reference manually.");
    } finally {
      setIsScanningOcr(false);
    }
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

      const res = await request("/warehouse/finance/expenses/pay/", {
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
      console.error("Warehouse expense payment error:", err);
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
        {/* Modal Header */}
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

        {/* Modal Body */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)] space-y-3">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-500" />
              <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Read-Only Expense Details */}
          <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1">
            <DetailRow label="Setting Reference No." value={expense.setting_reference_no} />
            <DetailRow label="Set By" value={expense.set_by || "Warehouse Manager"} />
            <DetailRow label="Type">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-white text-slate-700 border border-slate-200">
                {expense.expense_type}
              </span>
            </DetailRow>
            <DetailRow label="Description" value={expense.description} />
            <DetailRow label="Deadline" value={expense.deadline_formatted || expense.deadline} />
            <DetailRow label="Price" value={expense.price} isAmount />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Payment Method <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={handleMethodChange}
                disabled={isSubmitting}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
              >
                <option value="">Select Payment Method</option>
                <option value="Cash">Cash</option>
                <option value="GCash">GCash</option>
                <option value="Bank">Bank</option>
              </select>
            </div>

            {/* Cash Info */}
            {paymentMethod === "Cash" && (
              <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/50 space-y-1">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Cash Disbursement
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  A unique payment reference number formatted as{" "}
                  <code className="px-1.5 py-0.5 rounded bg-white font-mono text-[11px] text-emerald-900 border border-emerald-200">
                    {cashReferencePreview}
                  </code>{" "}
                  will be recorded automatically.
                </p>
              </div>
            )}

            {/* GCash / Bank: Proof & Reference */}
            {["Bank", "GCash"].includes(paymentMethod) && (
              <div className="space-y-3 pt-1">
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
                      onClick={startLiveCamera}
                      disabled={isScanningOcr || isSubmitting}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 hover:border-emerald-500 bg-slate-50/70 hover:bg-emerald-50/30 rounded-xl text-xs font-semibold text-slate-700 hover:text-emerald-800 transition cursor-pointer disabled:opacity-50"
                    >
                      <Camera size={15} className="text-[#0B5D1E]" />
                      <span>Take Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        stopLiveCamera();
                        fileInputRef.current?.click();
                      }}
                      disabled={isScanningOcr || isSubmitting}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 hover:border-emerald-500 bg-slate-50/70 hover:bg-emerald-50/30 rounded-xl text-xs font-semibold text-slate-700 hover:text-emerald-800 transition cursor-pointer disabled:opacity-50"
                    >
                      <Upload size={15} className="text-[#0B5D1E]" />
                      <span>Upload File</span>
                    </button>
                  </div>

                  {/* Live Camera Viewfinder */}
                  {isLiveCameraOpen && (
                    <div className="relative mt-2 rounded-xl overflow-hidden border border-emerald-500/50 bg-black flex flex-col items-center">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full max-h-56 object-contain"
                      />
                      <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-3 px-3">
                        <button
                          type="button"
                          onClick={handleCapturePhoto}
                          className="px-4 py-1.5 rounded-lg bg-[#018311] hover:bg-[#016b0f] text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Camera size={14} />
                          <span>Snap Photo</span>
                        </button>
                        <button
                          type="button"
                          onClick={stopLiveCamera}
                          className="px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white text-xs font-medium backdrop-blur-xs transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* OCR feedback state */}
                  {isScanningOcr && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-medium animate-pulse">
                      <Loader2 size={14} className="animate-spin text-[#0B5D1E]" />
                      <span>{ocrStatusText || "Scanning receipt..."}</span>
                    </div>
                  )}

                  {!isScanningOcr && ocrStatusText && (
                    <div
                      className={`flex items-center gap-1.5 p-2 rounded-lg text-xs font-medium ${
                        ocrSuccess
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-slate-50 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {ocrSuccess ? (
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle size={14} className="text-slate-400 shrink-0" />
                      )}
                      <span>{ocrStatusText}</span>
                    </div>
                  )}

                  {/* Image preview */}
                  {receiptPreviewUrl && (
                    <div className="relative mt-2 rounded-xl overflow-hidden border border-slate-200 max-h-48 bg-slate-100 flex items-center justify-center">
                      <img
                        src={receiptPreviewUrl}
                        alt="Receipt Preview"
                        className="max-h-48 w-auto object-contain"
                      />
                    </div>
                  )}
                </div>

                {/* Reference Number Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Reference Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Enter or verify reference number"
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 text-xs sm:text-sm font-mono border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Auto-captured from receipt or enter manually (e.g. GCash ref, bank trace #).
                  </p>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid() || isSubmitting}
            className="flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            style={{ backgroundColor: "#018311" }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin text-white" />
                <span>Recording Payment...</span>
              </>
            ) : (
              <span>Confirm Payment</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
