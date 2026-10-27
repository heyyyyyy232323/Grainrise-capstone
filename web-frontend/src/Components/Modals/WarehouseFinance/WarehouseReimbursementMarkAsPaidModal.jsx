import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Loader2,
  Upload,
  Camera,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
  ShieldCheck,
} from "lucide-react";
import useApi from "../../hooks/useApi";
import { buildReimbursementReceiptSnapshot } from "./WarehouseReimbursementReceiptModal";

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

function cleanErrorMessage(err, fallback = "An error occurred while processing the reimbursement payment.") {
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

function resolveMediaUrl(raw) {
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
}

function computeInitials(name, fallback = "XX") {
  const words = String(name || "")
    .trim()
    .split(/[^A-Za-z]+/)
    .filter(Boolean);
  if (words.length > 0) {
    return words
      .map((w) => w[0].toUpperCase())
      .join("")
      .slice(0, 4);
  }
  return fallback;
}

function computeBusinessPrefix3(businessName) {
  const clean = String(businessName || "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
  if (clean.length >= 3) return clean.slice(0, 3);
  if (clean.length > 0) return clean.padEnd(3, "X");
  return "WHS";
}

function generateFrontendCashReference(reimbursement, payerInfo) {
  const biz3 =
    reimbursement?.business_prefix3 ||
    payerInfo?.business_prefix3 ||
    computeBusinessPrefix3(reimbursement?.business_name || payerInfo?.business_name);
  const reqInit =
    reimbursement?.requester_initials ||
    computeInitials(reimbursement?.requester_name || reimbursement?.requester, "RQ");
  const payInit =
    payerInfo?.payer_initials ||
    computeInitials(payerInfo?.payer_name, "WF");

  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const yyyy = String(now.getFullYear());
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");

  return `${biz3}-${reqInit}-${payInit}-${mm}${dd}${yyyy}-${hh}${min}`;
}

const PENDING_USER_MESSAGE =
  "Your payment is being processed. Please wait for confirmation.";
const SUCCESS_USER_MESSAGE =
  "Payment confirmed! Your Xendit payout has been completed.";

export default function WarehouseReimbursementMarkAsPaidModal({
  isOpen,
  onClose,
  reimbursement,
  payerInfo,
  onSuccess,
  onRefreshList,
  onUpdateReimbursement,
}) {
  const { request } = useApi();

  const initialAttempt = reimbursement?.latest_payout_attempt || null;
  const initialMethod =
    initialAttempt?.method && ["GCash", "Bank"].includes(initialAttempt.method)
      ? initialAttempt.method
      : "";
  const initialCredId = initialAttempt?.employee_credentials_id
    ? String(initialAttempt.employee_credentials_id)
    : "";

  const [paymentMethod, setPaymentMethod] = useState(initialMethod);
  const [cashReference, setCashReference] = useState(() =>
    generateFrontendCashReference(reimbursement, payerInfo)
  );
  const [employeeAccounts, setEmployeeAccounts] = useState([]);
  const [selectedCredentialId, setSelectedCredentialId] = useState(initialCredId);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState(null);
  const [evidenceLoadError, setEvidenceLoadError] = useState(false);

  // Live camera stream state
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [latestPayoutAttempt, setLatestPayoutAttempt] = useState(initialAttempt);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusBanner, setStatusBanner] = useState(() =>
    initialAttempt?.is_succeeded
      ? { type: "success", text: SUCCESS_USER_MESSAGE }
      : initialAttempt?.is_pending
      ? { type: "info", text: PENDING_USER_MESSAGE }
      : null
  );

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const loadedAccountsKeyRef = useRef("");
  const submitLockRef = useRef(false);
  const reconcileInFlightRef = useRef(false);
  const completedReceiptLockRef = useRef(false);

  const onRefreshListRef = useRef(onRefreshList);
  const onSuccessRef = useRef(onSuccess);
  const onUpdateReimbursementRef = useRef(onUpdateReimbursement);

  useEffect(() => {
    onRefreshListRef.current = onRefreshList;
  }, [onRefreshList]);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    onUpdateReimbursementRef.current = onUpdateReimbursement;
  }, [onUpdateReimbursement]);

  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsLiveCameraOpen(false);
  };

  const startLiveCamera = async () => {
    setErrorMessage("");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
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
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch (err) {
      console.warn("Live camera access failed:", err);
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
      (blob) => {
        if (!blob) return;
        const capturedFile = new File([blob], `warehouse_reimb_camera_${Date.now()}.jpg`, {
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
      },
      "image/jpeg",
      0.9
    );
  };

  // Sync state on modal open
  useEffect(() => {
    if (isOpen && reimbursement) {
      submitLockRef.current = false;
      completedReceiptLockRef.current = false;
      stopLiveCamera();

      const attempt = reimbursement.latest_payout_attempt || null;
      setLatestPayoutAttempt(attempt);

      if (attempt?.method && ["GCash", "Bank"].includes(attempt.method)) {
        setPaymentMethod(attempt.method);
      } else if (!attempt) {
        setPaymentMethod("");
      }

      if (attempt?.employee_credentials_id) {
        setSelectedCredentialId(String(attempt.employee_credentials_id));
      }

      setCashReference(generateFrontendCashReference(reimbursement, payerInfo));
      setErrorMessage("");

      if (attempt?.is_succeeded) {
        setStatusBanner({ type: "success", text: SUCCESS_USER_MESSAGE });
      } else if (attempt?.is_pending) {
        setStatusBanner({ type: "info", text: PENDING_USER_MESSAGE });
      } else {
        setStatusBanner(null);
      }

      setReceiptFile(null);
      if (receiptPreviewUrl) {
        URL.revokeObjectURL(receiptPreviewUrl);
        setReceiptPreviewUrl(null);
      }
      setEvidenceLoadError(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, reimbursement?.reimbursement_id]);

  useEffect(() => {
    return () => {
      stopLiveCamera();
      if (receiptPreviewUrl) {
        URL.revokeObjectURL(receiptPreviewUrl);
      }
    };
  }, [receiptPreviewUrl]);

  // Method switch handler with auto-clear
  const handleMethodChange = (newMethod) => {
    setPaymentMethod(newMethod);
    setErrorMessage("");
    stopLiveCamera();
    if (receiptPreviewUrl) {
      URL.revokeObjectURL(receiptPreviewUrl);
      setReceiptPreviewUrl(null);
    }
    setReceiptFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";

    if (newMethod === "Cash") {
      setCashReference(generateFrontendCashReference(reimbursement, payerInfo));
      setEmployeeAccounts([]);
      setSelectedCredentialId("");
      loadedAccountsKeyRef.current = "";
    }
  };

  // Fetch employee accounts for GCash/Bank
  const fetchRequesterAccounts = useCallback(
    async (methodName) => {
      const reimbId = reimbursement?.reimbursement_id;
      if (!reimbId || !["GCash", "Bank"].includes(methodName)) {
        setEmployeeAccounts([]);
        setSelectedCredentialId("");
        return;
      }

      const cacheKey = `${reimbId}:${methodName}`;
      const alreadyLoaded = loadedAccountsKeyRef.current === cacheKey;
      if (!alreadyLoaded) {
        setIsLoadingAccounts(true);
      }

      try {
        const typeParam = methodName.toLowerCase();
        const res = await request(
          `/warehouse/finance/reimbursements/${reimbId}/employee-accounts/?type=${typeParam}`,
          { method: "GET" }
        );

        if (res && res.success && Array.isArray(res.accounts)) {
          loadedAccountsKeyRef.current = cacheKey;
          setEmployeeAccounts(res.accounts);
          if (res.accounts.length > 0) {
            setSelectedCredentialId((prev) => {
              if (
                prev &&
                res.accounts.some((a) => String(a.credentials_id) === String(prev))
              ) {
                return prev;
              }
              const defaultAcc =
                res.accounts.find((a) => a.is_default) || res.accounts[0];
              return String(defaultAcc.credentials_id);
            });
          } else {
            setSelectedCredentialId("");
          }
        } else if (!alreadyLoaded) {
          setEmployeeAccounts([]);
          setSelectedCredentialId("");
        }
      } catch (err) {
        console.error("Failed to fetch warehouse employee payment accounts:", err);
        if (!alreadyLoaded) {
          setEmployeeAccounts([]);
          setSelectedCredentialId("");
          setErrorMessage(
            cleanErrorMessage(err, "Unable to load employee payment accounts.")
          );
        }
      } finally {
        setIsLoadingAccounts(false);
      }
    },
    [reimbursement?.reimbursement_id, request]
  );

  useEffect(() => {
    if (isOpen && ["GCash", "Bank"].includes(paymentMethod)) {
      fetchRequesterAccounts(paymentMethod);
    } else if (!paymentMethod || paymentMethod === "Cash") {
      setEmployeeAccounts([]);
      setSelectedCredentialId("");
      loadedAccountsKeyRef.current = "";
    }
  }, [isOpen, paymentMethod, fetchRequesterAccounts]);

  const hasPendingPayout = Boolean(latestPayoutAttempt?.is_pending);
  const hasSucceededPayout = Boolean(latestPayoutAttempt?.is_succeeded);
  const hasFailedPayout = Boolean(latestPayoutAttempt?.is_failed);

  const selectedAccountObj = useMemo(() => {
    if (!selectedCredentialId || !Array.isArray(employeeAccounts)) return null;
    return (
      employeeAccounts.find(
        (acc) => String(acc.credentials_id) === String(selectedCredentialId)
      ) || null
    );
  }, [selectedCredentialId, employeeAccounts]);

  const resolvedEvidenceUrl = useMemo(
    () => resolveMediaUrl(reimbursement?.photo_evidence),
    [reimbursement?.photo_evidence]
  );

  // Reconcile status with Xendit or simulate sandbox success
  const handleReconcileStatus = useCallback(
    async (opts = {}) => {
      const silent = Boolean(opts && opts.silent === true);
      const simulateSandbox = Boolean(opts && opts.simulate_sandbox === true);

      if (!reimbursement?.reimbursement_id) return;
      if (
        reconcileInFlightRef.current ||
        isSubmitting ||
        submitLockRef.current ||
        completedReceiptLockRef.current
      ) {
        return;
      }
      reconcileInFlightRef.current = true;
      if (!silent) {
        setIsReconciling(true);
        setErrorMessage("");
      }

      try {
        const res = await request(
          `/warehouse/finance/reimbursements/${reimbursement.reimbursement_id}/reconcile/`,
          {
            method: "POST",
            body: JSON.stringify({ simulate_sandbox: simulateSandbox }),
            throwOnError: true,
          }
        );

        if (res && res.success && res.data) {
          const updatedReimb = res.data.reimbursement;
          const attempt = updatedReimb?.latest_payout_attempt || null;

          if (updatedReimb && onUpdateReimbursementRef.current) {
            onUpdateReimbursementRef.current({
              ...updatedReimb,
              _selectedAccountObj: selectedAccountObj,
              _selectedMethod: paymentMethod,
            });
          }

          if (attempt) {
            setLatestPayoutAttempt(attempt);
            if (attempt.is_succeeded) {
              setStatusBanner({ type: "success", text: SUCCESS_USER_MESSAGE });
              if (onRefreshListRef.current) onRefreshListRef.current();

              if (!completedReceiptLockRef.current) {
                completedReceiptLockRef.current = true;
                const snapshot = buildReimbursementReceiptSnapshot({
                  reimbursement: updatedReimb,
                  resultData: res.data,
                  payerInfo,
                  selectedMethod: paymentMethod,
                  selectedAccountObj,
                  latestPayoutAttempt: attempt,
                });
                if (onSuccessRef.current) {
                  onSuccessRef.current(snapshot);
                }
              }
            } else if (attempt.is_pending) {
              setStatusBanner({ type: "info", text: PENDING_USER_MESSAGE });
            } else if (attempt.is_failed) {
              setStatusBanner(null);
              setErrorMessage(
                attempt.failure_reason
                  ? `Payout failed: ${attempt.failure_reason}`
                  : "Payout failed. You may retry or choose another payment method."
              );
            }
          }
        }
      } catch (err) {
        console.error("Reconciliation error:", err);
        if (!silent) {
          setErrorMessage(
            cleanErrorMessage(err, "Failed to reconcile payout status with Xendit.")
          );
        }
      } finally {
        reconcileInFlightRef.current = false;
        if (!silent) {
          setIsReconciling(false);
        }
      }
    },
    [reimbursement?.reimbursement_id, request, isSubmitting, selectedAccountObj, paymentMethod, payerInfo]
  );

  // Submission handler
  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (
      isSubmitting ||
      submitLockRef.current ||
      hasPendingPayout ||
      hasSucceededPayout ||
      completedReceiptLockRef.current
    ) {
      return;
    }

    setErrorMessage("");

    if (!paymentMethod) {
      setErrorMessage("Please select a payment method.");
      return;
    }

    if (paymentMethod === "Cash" && !cashReference.trim()) {
      setErrorMessage("Cash payment reference cannot be empty.");
      return;
    }

    if (["GCash", "Bank"].includes(paymentMethod)) {
      if (!selectedCredentialId) {
        setErrorMessage(
          `Please select a registered ${paymentMethod} account for ${
            reimbursement?.requester_name || "the employee"
          }.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    submitLockRef.current = true;

    try {
      const formData = new FormData();
      formData.append(
        "reimbursement_id",
        String(reimbursement?.reimbursement_id || reimbursement?.id)
      );
      formData.append("payment_method", paymentMethod);

      if (paymentMethod === "Cash") {
        formData.append("payment_reference", cashReference.trim());
      } else {
        formData.append(
          "employee_credentials_id",
          String(selectedCredentialId)
        );
      }

      if (receiptFile) {
        formData.append("receipt_file", receiptFile);
      }

      const res = await request("/warehouse/finance/reimbursements/pay/", {
        method: "POST",
        body: formData,
        throwOnError: true,
      });

      if (res && res.success && res.data) {
        const resData = res.data;
        const updatedReimb = resData.reimbursement;
        const attempt = updatedReimb?.latest_payout_attempt || null;

        if (paymentMethod === "Cash") {
          completedReceiptLockRef.current = true;
          const snapshot = buildReimbursementReceiptSnapshot({
            reimbursement: updatedReimb,
            resultData: resData,
            payerInfo,
            selectedMethod: "Cash",
            cashReference: resData.payment_reference_no || cashReference,
          });

          if (onSuccessRef.current) {
            onSuccessRef.current(snapshot);
          }
          if (onRefreshListRef.current) {
            onRefreshListRef.current();
          }
          return;
        }

        // Online Payout (GCash / Bank)
        setLatestPayoutAttempt(attempt);

        if (onUpdateReimbursementRef.current && updatedReimb) {
          onUpdateReimbursementRef.current({
            ...updatedReimb,
            _selectedAccountObj: selectedAccountObj,
            _selectedMethod: paymentMethod,
          });
        }

        if (attempt?.is_succeeded) {
          setStatusBanner({ type: "success", text: SUCCESS_USER_MESSAGE });
          completedReceiptLockRef.current = true;
          const snapshot = buildReimbursementReceiptSnapshot({
            reimbursement: updatedReimb,
            resultData: resData,
            payerInfo,
            selectedMethod: paymentMethod,
            selectedAccountObj,
            latestPayoutAttempt: attempt,
          });

          if (onSuccessRef.current) {
            onSuccessRef.current(snapshot);
          }
          if (onRefreshListRef.current) {
            onRefreshListRef.current();
          }
        } else if (attempt?.is_pending) {
          setStatusBanner({ type: "info", text: PENDING_USER_MESSAGE });
          if (onRefreshListRef.current) {
            onRefreshListRef.current();
          }
        } else if (attempt?.is_failed) {
          setStatusBanner(null);
          setErrorMessage(
            attempt.failure_reason
              ? `Payout failed: ${attempt.failure_reason}`
              : "Payout failed. Please try again or switch method."
          );
        }
      } else {
        setErrorMessage(
          cleanErrorMessage(
            res,
            "Failed to process reimbursement payment. Please try again."
          )
        );
      }
    } catch (err) {
      console.error("Submit payment error:", err);
      setErrorMessage(
        cleanErrorMessage(
          err,
          "Failed to process reimbursement payment. Please verify inputs and try again."
        )
      );
    } finally {
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  };

  if (!isOpen || !reimbursement) return null;

  const isFormDisabled = isSubmitting || hasPendingPayout || hasSucceededPayout;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          stopLiveCamera();
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Mark as Paid
            </h3>
            <p className="text-[11.5px] text-slate-500 mt-0.5">
              Disburse reimbursement request for{" "}
              <span className="font-semibold text-slate-700">
                {reimbursement.requester_name || reimbursement.requester}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              stopLiveCamera();
              onClose();
            }}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Status Banner */}
          {statusBanner && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                statusBanner.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-amber-50 border-amber-200 text-amber-900"
              }`}
            >
              {statusBanner.type === "success" ? (
                <CheckCircle2 size={16} className="text-[#0B5D1E] shrink-0 mt-0.5" />
              ) : (
                <Loader2 size={16} className="text-amber-600 shrink-0 mt-0.5 animate-spin" />
              )}
              <div className="flex-1">
                <p className="font-semibold leading-tight">{statusBanner.text}</p>
                {hasPendingPayout && (
                  <p className="text-[11px] mt-1 text-amber-700">
                    Xendit Payout ID:{" "}
                    <span className="font-mono font-bold">
                      {latestPayoutAttempt?.xendit_payout_id || latestPayoutAttempt?.reference_id}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Request Details Card */}
          <div className="bg-slate-50/80 rounded-xl border border-slate-200/70 p-3.5 space-y-1 divide-y divide-slate-100">
            <DetailRow
              label="Request Reference No."
              value={reimbursement.request_reference_no || `REIMB-${reimbursement.reimbursement_id}`}
            />
            <DetailRow label="Requester" value={reimbursement.requester_name || reimbursement.requester} />
            <DetailRow label="Position" value={reimbursement.requester_position || "Warehouse Staff"} />
            <DetailRow label="Category" value={reimbursement.category || reimbursement.types} />
            <DetailRow label="Title" value={reimbursement.title} />
            {reimbursement.description && (
              <DetailRow label="Description" value={reimbursement.description} />
            )}
            <DetailRow
              label="Requested Amount"
              value={reimbursement.price || reimbursement.cost}
              isAmount
            />
          </div>

          {/* Requester Evidence Photo if provided */}
          {resolvedEvidenceUrl && !evidenceLoadError && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <ImageIcon size={14} className="text-[#0B5D1E]" />
                <span>Requester Receipt / Evidence Photo</span>
              </div>
              <div className="relative rounded-lg overflow-hidden border border-slate-200 max-h-44 bg-black/5">
                <img
                  src={resolvedEvidenceUrl}
                  alt="Requester Evidence"
                  onError={() => setEvidenceLoadError(true)}
                  className="w-full h-full object-contain max-h-44"
                />
              </div>
            </div>
          )}

          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Payment Method <span className="text-rose-500">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => handleMethodChange(e.target.value)}
              disabled={isFormDisabled}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">Select Payment Method</option>
              <option value="Cash">Cash (Manual Disbursement)</option>
              <option value="GCash">GCash (Xendit Payout)</option>
              <option value="Bank">Bank Transfer (Xendit Payout)</option>
            </select>
          </div>

          {/* CASH FLOW */}
          {paymentMethod === "Cash" && (
            <div className="space-y-3 pt-1">
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/50 text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-[#0B5D1E]" />
                  <span>Cash Payment Selected</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11.5px]">
                  Payment Reference Number will be recorded automatically:{" "}
                  <span className="font-mono font-semibold text-emerald-800">
                    {cashReference}
                  </span>
                </p>
              </div>

              {/* Optional Cash Receipt Photo */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    Optional Cash Disbursement Receipt / Voucher
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Attach signed voucher or physical cash payout acknowledgment.
                  </p>
                </div>

                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setReceiptFile(f);
                      if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
                      setReceiptPreviewUrl(URL.createObjectURL(f));
                    }
                  }}
                  className="hidden"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setReceiptFile(f);
                      if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
                      setReceiptPreviewUrl(URL.createObjectURL(f));
                    }
                  }}
                  className="hidden"
                />

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={startLiveCamera}
                    disabled={isFormDisabled}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 hover:border-emerald-500 bg-slate-50/70 hover:bg-emerald-50/30 rounded-xl text-xs font-semibold text-slate-700 hover:text-emerald-800 transition cursor-pointer disabled:opacity-50"
                  >
                    <Camera size={14} className="text-[#0B5D1E]" />
                    <span>Take Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopLiveCamera();
                      fileInputRef.current?.click();
                    }}
                    disabled={isFormDisabled}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 hover:border-emerald-500 bg-slate-50/70 hover:bg-emerald-50/30 rounded-xl text-xs font-semibold text-slate-700 hover:text-emerald-800 transition cursor-pointer disabled:opacity-50"
                  >
                    <Upload size={14} className="text-[#0B5D1E]" />
                    <span>Upload File</span>
                  </button>
                </div>

                {/* Live Camera Viewfinder */}
                {isLiveCameraOpen && (
                  <div className="relative mt-2 rounded-xl overflow-hidden border-2 border-emerald-500 bg-black flex flex-col items-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full max-h-52 object-contain"
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

                {receiptFile && (
                  <div className="flex items-center justify-between p-2 mt-2 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {receiptPreviewUrl && (
                        <img
                          src={receiptPreviewUrl}
                          alt="Receipt Preview"
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
                      onClick={() => {
                        setReceiptFile(null);
                        if (receiptPreviewUrl) {
                          URL.revokeObjectURL(receiptPreviewUrl);
                          setReceiptPreviewUrl(null);
                        }
                        if (fileInputRef.current) fileInputRef.current.value = "";
                        if (cameraInputRef.current) cameraInputRef.current.value = "";
                      }}
                      className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ONLINE PAYOUT FLOW (GCash / Bank) */}
          {["GCash", "Bank"].includes(paymentMethod) && (
            <div className="space-y-3 pt-1">
              <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <ShieldCheck size={14} className="text-[#0B5D1E]" />
                    <span>Xendit {paymentMethod} Payout</span>
                  </div>
                  {payerInfo?.xendit_mode === "test" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Sandbox QA Ready
                    </span>
                  )}
                </div>
                <p className="text-[11.5px] text-slate-600 leading-relaxed">
                  Direct transfer from Warehouse funds to the requester’s registered {paymentMethod} account.
                </p>
              </div>

              {/* Requester Accounts Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Select {reimbursement.requester_name || "Employee"}’s {paymentMethod} Account <span className="text-rose-500">*</span>
                </label>
                {isLoadingAccounts ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                    <Loader2 size={13} className="animate-spin text-[#0B5D1E]" />
                    <span>Loading registered accounts...</span>
                  </div>
                ) : employeeAccounts.length > 0 ? (
                  <select
                    value={selectedCredentialId}
                    onChange={(e) => setSelectedCredentialId(e.target.value)}
                    disabled={isFormDisabled}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    {employeeAccounts.map((acc) => (
                      <option key={acc.credentials_id} value={acc.credentials_id}>
                        {acc.display_label} {acc.is_default ? "★ Default" : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-amber-50/80 border border-amber-200/80 text-amber-800 rounded-xl text-xs space-y-1">
                    <p className="font-semibold">No registered {paymentMethod} accounts found.</p>
                    <p className="text-[11px] text-amber-700">
                      The employee has not added an active {paymentMethod} account in their profile.
                      Please select another method or disburse via Cash.
                    </p>
                  </div>
                )}
              </div>

              {/* Status Tracking Controls if Payout Attempt Exists */}
              {latestPayoutAttempt && (
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Payout Status:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                        hasSucceededPayout
                          ? "bg-emerald-100 text-emerald-800"
                          : hasPendingPayout
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {latestPayoutAttempt.payout_status || "PENDING"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleReconcileStatus()}
                      disabled={isReconciling}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw size={12} className={isReconciling ? "animate-spin" : ""} />
                      <span>{isReconciling ? "Checking..." : "Recheck Status"}</span>
                    </button>

                    {payerInfo?.xendit_mode === "test" && hasPendingPayout && (
                      <button
                        type="button"
                        onClick={() => handleReconcileStatus({ simulate_sandbox: true })}
                        disabled={isReconciling}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 size={12} />
                        <span>Simulate Success (QA)</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => {
                stopLiveCamera();
                onClose();
              }}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            {!hasSucceededPayout && (
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  hasPendingPayout ||
                  !paymentMethod ||
                  (["GCash", "Bank"].includes(paymentMethod) && !selectedCredentialId)
                }
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#016b0f]"
                style={{ backgroundColor: "#018311" }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : hasPendingPayout ? (
                  <span>Payout In Progress</span>
                ) : (
                  <span>Confirm Payment</span>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
