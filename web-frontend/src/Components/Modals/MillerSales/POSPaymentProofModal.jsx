import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Camera,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ScanText,
  QrCode,
  ShieldCheck,
  SwitchCamera,
} from "lucide-react";
import Tesseract from "tesseract.js";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

function resolveMediaUrl(url) {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    return `${API_BASE}${trimmed}`;
  }
  return `${API_BASE}/media/${trimmed}`;
}

/**
 * Reuse the lightweight client-side image compression for OCR from Miller Finance Payables (`PayNowModal.jsx`).
 */
const compressImageForOcr = (dataUrl, maxWidth = 1000) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });

/**
 * Reuse the reference number extraction heuristics from Miller Finance Payables (`PayNowModal.jsx`).
 */
const extractReferenceNumber = (text) => {
  const cleanText = text.replace(/['"`|]/g, " ");
  const lines = cleanText.split("\n");

  const refKeywords = /(?:ref(?:erence)?|trace|trans(?:action)?|instapay|control|no\.?|id|#)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (refKeywords.test(line)) {
      const matchSameLine = line.match(
        /(?:no\.?|id|#|number|ref(?:erence)?)[\s.:]*([A-Z0-9-]{6,25})/i
      );
      if (matchSameLine && matchSameLine[1] && /\d{3,}/.test(matchSameLine[1])) {
        return matchSameLine[1].replace(/[^A-Z0-9]/gi, "").toUpperCase();
      }

      const rawNumbersSameLine = line.match(/\b(\d{4}[\s-]?\d{3,4}[\s-]?\d{3,6}|\d{8,20})\b/);
      if (rawNumbersSameLine && rawNumbersSameLine[0]) {
        return rawNumbersSameLine[0].replace(/[\s-]/g, "");
      }

      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const nextMatch = nextLine.match(/\b(\d{4}[\s-]?\d{3,4}[\s-]?\d{3,6}|[A-Z0-9]{8,20})\b/i);
        if (nextMatch && nextMatch[0] && /\d{4,}/.test(nextMatch[0])) {
          return nextMatch[0].replace(/[\s-]/g, "").toUpperCase();
        }
      }
    }
  }

  const gcashSpacedMatch = cleanText.match(/\b(\d{4}\s\d{3}\s\d{6})\b/);
  if (gcashSpacedMatch) return gcashSpacedMatch[1].replace(/\s/g, "");

  const longDigitsMatch = cleanText.match(/\b(\d{10,16})\b/);
  if (longDigitsMatch) return longDigitsMatch[1];

  const anyRefMatch = cleanText.match(/\b([A-Z0-9]{8,20})\b/);
  if (anyRefMatch && /\d{5,}/.test(anyRefMatch[1])) {
    return anyRefMatch[1].toUpperCase();
  }

  return null;
};

export default function POSPaymentProofModal({
  isOpen,
  onClose,
  paymentMethod, // "GCash" or "Bank Transfer"
  paymentAccount, // configured credential from miller_online_transaction_credentials
  totalPayable = 0,
  onCheckDuplicateReference,
  onConfirmPaymentProof,
  isSubmitting = false,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [facingMode, setFacingMode] = useState("environment");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [capturedImage, setCapturedImage] = useState(null);

  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [ocrStatus, setOcrStatus] = useState(null); // 'scanning' | 'success' | 'manual'
  const [ocrMessage, setOcrMessage] = useState("");

  const [referenceNo, setReferenceNo] = useState("");
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [duplicateError, setDuplicateError] = useState("");
  const [isConfirmedCheckbox, setIsConfirmedCheckbox] = useState(false);
  const [localError, setLocalError] = useState("");

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(
    async (requestedFacingMode = facingMode) => {
      stopCamera();
      setCameraError("");

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          "Live camera stream is not supported in this browser. Use the camera capture button below."
        );
        return;
      }

      try {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: requestedFacingMode },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setCameraReady(true);
        }
      } catch (err) {
        console.warn("Camera access error:", err);
        setCameraError(
          "Could not access live camera stream. Please grant camera permission or use the direct camera capture button below."
        );
      }
    },
    [facingMode, stopCamera]
  );

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setReferenceNo("");
      setOcrStatus(null);
      setOcrMessage("");
      setDuplicateError("");
      setIsConfirmedCheckbox(false);
      setLocalError("");
      startCamera("environment");
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  const runClientSideOcr = async (imageDataUrl) => {
    setIsProcessingOcr(true);
    setOcrStatus("scanning");
    setOcrMessage("Scanning captured receipt for reference number...");
    setLocalError("");

    let worker = null;
    try {
      const compressedDataUrl = await compressImageForOcr(imageDataUrl, 1000);
      worker = await Tesseract.createWorker("eng");
      const ret = await worker.recognize(compressedDataUrl);
      const text = ret?.data?.text || "";
      const extracted = extractReferenceNumber(text);

      if (extracted) {
        setReferenceNo(extracted);
        setOcrStatus("success");
        setOcrMessage(
          "Reference number extracted via OCR. Please verify against the customer's receipt before confirming."
        );
        if (onCheckDuplicateReference) {
          setCheckingDuplicate(true);
          try {
            const dupRes = await onCheckDuplicateReference(extracted);
            if (dupRes?.is_duplicate) {
              setDuplicateError(
                dupRes.detail ||
                  `Reference '${extracted}' has already been used for a confirmed payment.`
              );
            } else {
              setDuplicateError("");
            }
          } finally {
            setCheckingDuplicate(false);
          }
        }
      } else {
        setOcrStatus("manual");
        setOcrMessage(
          "Could not clearly detect the reference number from the photo. Please enter or verify it manually below."
        );
      }
    } catch (err) {
      console.error("POS OCR Error:", err);
      setOcrStatus("manual");
      setOcrMessage("OCR scan could not complete. Please type the reference number manually.");
    } finally {
      if (worker) {
        await worker.terminate().catch(() => {});
      }
      setIsProcessingOcr(false);
    }
  };

  const handleCaptureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 960;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    stopCamera();
    setCapturedImage(dataUrl);
    runClientSideOcr(dataUrl);
  };

  const handleFallbackCameraCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLocalError("Please capture a valid image of the payment receipt.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      stopCamera();
      setCapturedImage(dataUrl);
      runClientSideOcr(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setOcrStatus(null);
    setOcrMessage("");
    setDuplicateError("");
    setIsConfirmedCheckbox(false);
    setLocalError("");
    startCamera(facingMode);
  };

  const handleSwitchCamera = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleReferenceBlur = async () => {
    const cleaned = referenceNo.replace(/\s+/g, "").toUpperCase();
    if (cleaned !== referenceNo) {
      setReferenceNo(cleaned);
    }
    if (!cleaned || cleaned.length < 4 || !onCheckDuplicateReference) return;

    setCheckingDuplicate(true);
    try {
      const dupRes = await onCheckDuplicateReference(cleaned);
      if (dupRes?.is_duplicate) {
        setDuplicateError(
          dupRes.detail || `Reference '${cleaned}' has already been used for a confirmed payment.`
        );
      } else {
        setDuplicateError("");
      }
    } finally {
      setCheckingDuplicate(false);
    }
  };

  const handleSubmitProof = async () => {
    setLocalError("");
    if (!capturedImage) {
      setLocalError("Please capture a photo of the customer's payment receipt using the camera.");
      return;
    }
    const cleanRef = referenceNo.replace(/\s+/g, "").toUpperCase();
    if (!cleanRef || cleanRef.length < 4) {
      setLocalError("Please enter a valid non-empty transaction reference number.");
      return;
    }
    if (duplicateError) {
      setLocalError(duplicateError);
      return;
    }
    if (!isConfirmedCheckbox) {
      setLocalError(
        "Please explicitly confirm that you have verified the payment receipt and reference number."
      );
      return;
    }

    if (onCheckDuplicateReference) {
      setCheckingDuplicate(true);
      try {
        const dupRes = await onCheckDuplicateReference(cleanRef);
        if (dupRes?.is_duplicate) {
          const msg =
            dupRes.detail ||
            `Reference '${cleanRef}' has already been used for a confirmed payment.`;
          setDuplicateError(msg);
          setLocalError(msg);
          return;
        }
      } finally {
        setCheckingDuplicate(false);
      }
    }

    onConfirmPaymentProof({
      capturedImage,
      referenceNo: cleanRef,
      credentialsId: paymentAccount?.credentials_id || null,
      confirmed: true,
    });
  };

  if (!isOpen) return null;

  const qrUrl = resolveMediaUrl(paymentAccount?.qr_image_url);
  const formattedTotal = Number(totalPayable || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
      <div
        className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header — shrink-0 so it always remains visible */}
        <div className="px-5 sm:px-6 py-3.5 border-b border-slate-100 flex items-center bg-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Camera className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                {paymentMethod} Payment Proof &amp; Verification
              </h2>
              <p className="text-[11px] text-slate-500 font-medium truncate">
                Capture the customer&apos;s {paymentMethod} receipt and verify the reference number
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Modal Body — independently scrollable within max-h-[90vh] */}
        <div className="px-5 sm:px-6 py-4 overflow-y-auto flex-1 min-h-0 max-h-[calc(90vh-132px)] space-y-3.5">
          {/* Top Summary: Exact Amount Payable + Configured Merchant Account & QR */}
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 sm:grid-cols-2">
            <div className="flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Exact Amount Payable
                </span>
                <p className="mt-0.5 text-xl font-extrabold text-slate-900">
                  ₱{formattedTotal}
                </p>
              </div>

              {paymentAccount ? (
                <div className="mt-2 space-y-0.5 border-t border-emerald-200/70 pt-2 text-[11px] text-slate-700">
                  <p className="font-bold text-emerald-800">
                    {paymentAccount.provider_name || paymentMethod}
                  </p>
                  <p>
                    <span className="text-slate-500">Account Name:</span>{" "}
                    <span className="font-semibold text-slate-900">
                      {paymentAccount.account_name || "—"}
                    </span>
                  </p>
                  <p>
                    <span className="text-slate-500">Account No.:</span>{" "}
                    <span className="font-mono font-bold text-slate-900">
                      {paymentAccount.account_number || "—"}
                    </span>
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-[11px] font-medium text-amber-700">
                  No active {paymentMethod} account configured.
                </p>
              )}
            </div>

            {/* Saved Merchant QR (if uploaded by Miller Manager) */}
            <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-center">
              {qrUrl ? (
                <>
                  <img
                    src={qrUrl}
                    alt={`${paymentMethod} Merchant QR`}
                    className="h-24 w-24 rounded object-contain"
                  />
                  <span className="mt-1 text-[10px] font-medium text-slate-500">
                    Merchant Static QR — Customer enters ₱{formattedTotal}
                  </span>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-3 text-slate-400">
                  <QrCode className="mb-1 h-6 w-6 opacity-60" />
                  <span className="text-[11px] font-medium text-slate-500">
                    No QR image uploaded for this account
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Customer may pay using the account number shown
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Camera-Only Receipt Capture Section */}
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800">
                1. Capture Customer&apos;s Payment Receipt (Camera Only){" "}
                <span className="text-rose-500">*</span>
              </label>
              {!capturedImage && cameraReady && (
                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 shrink-0"
                >
                  <SwitchCamera className="h-3.5 w-3.5" />
                  Switch Camera
                </button>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {!capturedImage ? (
              <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-950">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className={`h-[180px] sm:h-[210px] w-full object-contain bg-black ${
                    cameraReady ? "block" : "hidden"
                  }`}
                />

                {!cameraReady && (
                  <div className="flex h-[175px] sm:h-[195px] flex-col items-center justify-center gap-2 px-4 text-center text-white">
                    <Camera className="h-8 w-8 text-emerald-400" />
                    <p className="text-xs font-medium text-slate-200">
                      {cameraError || "Starting camera stream..."}
                    </p>
                    <label className="mt-1 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-500">
                      <Camera className="h-4 w-4" />
                      Open Device Camera
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFallbackCameraCapture}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {cameraReady && (
                  <div className="flex items-center justify-center gap-3 bg-slate-900/90 px-4 py-2.5">
                    <button
                      type="button"
                      onClick={handleCaptureFrame}
                      className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-1.5 text-xs font-bold text-white shadow-lg transition hover:bg-emerald-500 cursor-pointer"
                    >
                      <Camera className="h-4 w-4" />
                      Capture Receipt Photo
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
                <img
                  src={capturedImage}
                  alt="Captured Payment Proof"
                  className="max-h-[180px] sm:max-h-[200px] w-full object-contain bg-black"
                />

                {isProcessingOcr && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/75 text-white backdrop-blur-[1px]">
                    <Loader2 className="mb-2 h-6 w-6 animate-spin text-emerald-400" />
                    <p className="text-xs font-semibold">
                      Extracting Reference Number via OCR...
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between bg-slate-900/95 px-3.5 py-2 text-white">
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Receipt photo captured
                  </span>
                  <button
                    type="button"
                    onClick={handleRetake}
                    disabled={isProcessingOcr || isSubmitting}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-white/25 disabled:opacity-50 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Retake Photo
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* OCR Status Banner */}
          {ocrStatus && (
            <div
              className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-[11px] ${
                ocrStatus === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : ocrStatus === "scanning"
                  ? "border-blue-200 bg-blue-50 text-blue-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              <ScanText className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">{ocrMessage}</p>
                <p className="mt-0.5 text-[10px] opacity-85">
                  Note: OCR extraction does not automatically verify payment. Always check the
                  actual receipt and confirm manually.
                </p>
              </div>
            </div>
          )}

          {/* Reference Number Input (Editable) */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-800">
              2. Transaction Reference Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setReferenceNo(val);
                  setDuplicateError("");
                  setLocalError("");
                }}
                onBlur={handleReferenceBlur}
                disabled={isProcessingOcr || isSubmitting}
                placeholder={`Enter or verify ${paymentMethod} reference number`}
                className={`w-full rounded-xl border px-3.5 py-2 font-mono text-xs sm:text-sm font-bold tracking-wide text-slate-900 focus:outline-none focus:ring-2 ${
                  duplicateError
                    ? "border-rose-400 bg-rose-50/40 focus:border-rose-500 focus:ring-rose-500/20"
                    : "border-slate-300 bg-white focus:border-emerald-600 focus:ring-emerald-600/20"
                }`}
              />
              {checkingDuplicate && (
                <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-slate-400" />
              )}
            </div>
            {duplicateError && (
              <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {duplicateError}
              </p>
            )}
          </div>

          {/* Explicit Seller Verification Checkbox */}
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 hover:bg-slate-100/70">
            <input
              type="checkbox"
              checked={isConfirmedCheckbox}
              onChange={(e) => {
                setIsConfirmedCheckbox(e.target.checked);
                setLocalError("");
              }}
              disabled={isSubmitting}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
            />
            <span className="leading-snug">
              <strong className="text-slate-900">Explicit Payment Confirmation:</strong> I confirm
              that I have inspected the customer&apos;s {paymentMethod} receipt for{" "}
              <strong className="text-emerald-700">₱{formattedTotal}</strong> and verified that the
              reference number above is accurate.
            </span>
          </label>

          {localError && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{localError}</span>
            </div>
          )}
        </div>

        {/* Modal Footer — shrink-0 so action buttons are always visible */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 shrink-0 bg-white flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmitProof}
            disabled={
              isSubmitting ||
              isProcessingOcr ||
              checkingDuplicate ||
              !capturedImage ||
              !referenceNo.trim() ||
              Boolean(duplicateError) ||
              !isConfirmedCheckbox
            }
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#018311] px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#016b0f] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Completing Sale...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                Confirm &amp; Complete Sale
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
