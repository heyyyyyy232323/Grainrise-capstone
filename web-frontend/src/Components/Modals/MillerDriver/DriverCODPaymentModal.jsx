import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Banknote,
  Smartphone,
  Building2,
  Camera,
  RotateCcw,
  Check,
  X,
  AlertCircle,
  ScanText,
  Loader2,
} from "lucide-react";
import Tesseract from "tesseract.js";

const PAYMENT_METHODS = [
  { id: "Cash", label: "Cash", icon: Banknote },
  { id: "GCash", label: "GCash", icon: Smartphone },
  { id: "Bank", label: "Bank Transfer", icon: Building2 },
];

export default function DriverCODPaymentModal({
  isOpen,
  onClose,
  totalAmountDue,
  codOrders = [],
  onProceedToReceipt,
  isLoading = false,
}) {
  const [method, setMethod] = useState("Cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [validationError, setValidationError] = useState("");

  // GCash / Bank Camera State
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedReceipt, setCapturedReceipt] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [extractedRef, setExtractedRef] = useState("");

  const numDue = Number(totalAmountDue || 0);
  const numPaid = parseFloat(amountPaid) || 0;
  const change = Math.max(0, numPaid - numDue);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError("");
    setCapturedReceipt(null);
    setExtractedRef("");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported on this device.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      setCameraError(err.message || "Failed to access camera.");
      setCameraActive(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setMethod("Cash");
      setAmountPaid("");
      setValidationError("");
      setCapturedReceipt(null);
      setExtractedRef("");
    } else {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      setAmountPaid(numDue ? String(numDue) : "");
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen, numDue, stopCamera]);

  useEffect(() => {
    if (isOpen && (method === "GCash" || method === "Bank") && !capturedReceipt) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [isOpen, method, capturedReceipt, startCamera, stopCamera]);

  const runOcr = async (dataUrl) => {
    setIsOcrProcessing(true);
    try {
      const result = await Tesseract.recognize(dataUrl, "eng");
      const text = result?.data?.text || "";

      // Regex matching reference number patterns
      const refMatch =
        text.match(/(?:ref(?:erence)?(?:\s+no\.?)?[:\s]*)([A-Za-z0-9\-]{6,25})/i) ||
        text.match(/\b([0-9]{9,16})\b/);

      if (refMatch && refMatch[1]) {
        setExtractedRef(refMatch[1].trim());
      } else {
        // Fallback or leave blank for driver verification
        setExtractedRef("");
      }
    } catch {
      // OCR fail silently
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const handleCaptureReceipt = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedReceipt(dataUrl);
    stopCamera();
    runOcr(dataUrl);
  };

  const handleRetakeReceipt = () => {
    setCapturedReceipt(null);
    setExtractedRef("");
    startCamera();
  };

  const handleConfirm = () => {
    setValidationError("");

    if (method === "Cash") {
      if (numPaid < numDue) {
        setValidationError(`Amount paid cannot be less than ₱${numDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`);
        return;
      }
      onProceedToReceipt({
        payment_method: "Cash",
        amount_paid: numPaid,
        change_amount: change,
        total_amount_due: numDue,
        receipt_photo: null,
        external_payment_reference_no: null,
      });
    } else {
      if (!capturedReceipt) {
        setValidationError("Please capture the customer's payment receipt.");
        return;
      }
      if (!extractedRef.trim()) {
        setValidationError("Please enter or verify the external payment reference number.");
        return;
      }
      onProceedToReceipt({
        payment_method: method,
        amount_paid: numDue,
        change_amount: 0,
        total_amount_due: numDue,
        receipt_photo: capturedReceipt,
        external_payment_reference_no: extractedRef.trim(),
      });
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">Cash on Delivery (COD)</h3>
            <p className="text-xs text-gray-500">Collect payment for Retailer orders</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Total Amount Card */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200/60 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                Total Amount Due (COD)
              </span>
              <span className="text-2xl font-black text-emerald-900">
                ₱{numDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {codOrders.length > 0 && (
              <p className="text-[11px] text-emerald-700 font-medium">
                Combined collection for {codOrders.length} Cash on Delivery {codOrders.length === 1 ? "order" : "orders"} (Prepaid online orders excluded)
              </p>
            )}
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((pm) => {
                const Icon = pm.icon;
                const isSelected = method === pm.id;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => {
                      setMethod(pm.id);
                      setValidationError("");
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#0B5D1E] text-white border-[#0B5D1E] shadow-sm"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <Icon size={18} />
                    <span>{pm.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Method Content */}
          {method === "Cash" ? (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Amount Paid (₱)
                </label>
                <input
                  type="number"
                  step="any"
                  value={amountPaid}
                  onChange={(e) => {
                    setAmountPaid(e.target.value);
                    setValidationError("");
                  }}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-base font-bold text-gray-900 focus:ring-2 focus:ring-[#0B5D1E] focus:border-[#0B5D1E] outline-none"
                />
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between text-xs font-bold text-gray-700">
                <span>Change:</span>
                <span className={`text-base font-extrabold ${change > 0 ? "text-emerald-700" : "text-gray-900"}`}>
                  ₱{change.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <label className="block text-xs font-semibold text-gray-700">
                Capture Customer's {method} Receipt
              </label>

              <div className="w-full aspect-4/3 bg-black rounded-xl overflow-hidden relative flex items-center justify-center border border-gray-200 shadow-inner">
                {capturedReceipt ? (
                  <img
                    src={capturedReceipt}
                    alt="Receipt Proof"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
                  />
                )}

                {!capturedReceipt && !cameraActive && !cameraError && (
                  <div className="text-white text-xs flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Opening camera...
                  </div>
                )}

                {cameraError && (
                  <div className="p-4 text-center max-w-xs space-y-2">
                    <AlertCircle size={28} className="text-rose-500 mx-auto" />
                    <p className="text-xs text-rose-200">{cameraError}</p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-3 py-1.5 bg-white/20 text-white rounded-lg text-xs font-semibold hover:bg-white/30"
                    >
                      Retry Camera
                    </button>
                  </div>
                )}
              </div>

              {!capturedReceipt ? (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleCaptureReceipt}
                    disabled={!cameraActive}
                    className="w-14 h-14 rounded-full bg-[#0B5D1E] hover:bg-emerald-800 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 disabled:opacity-40 cursor-pointer border-4 border-emerald-100"
                  >
                    <Camera size={22} />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleRetakeReceipt}
                      className="text-xs text-gray-600 font-semibold hover:text-gray-900 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw size={13} />
                      Retake Receipt Photo
                    </button>
                    {isOcrProcessing && (
                      <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                        <Loader2 size={12} className="animate-spin" />
                        Scanning reference...
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                      <ScanText size={14} className="text-[#0B5D1E]" />
                      External Payment Reference No.
                    </label>
                    <input
                      type="text"
                      value={extractedRef}
                      onChange={(e) => setExtractedRef(e.target.value)}
                      placeholder="e.g. 1029384756"
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-[#0B5D1E] focus:border-[#0B5D1E] outline-none"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Verify or manually correct the scanned reference number from the customer's receipt.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{validationError}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#0B5D1E] hover:bg-emerald-800 transition-colors shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Processing...
              </>
            ) : method === "Cash" ? (
              "OK"
            ) : (
              "Confirm & Generate Receipt"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
