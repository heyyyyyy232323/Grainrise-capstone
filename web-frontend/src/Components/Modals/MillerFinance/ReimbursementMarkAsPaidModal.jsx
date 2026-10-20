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
import ReimbursementReceiptModal, {
  buildReimbursementReceiptSnapshot,
} from "./ReimbursementReceiptModal";

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
  return "GRA";
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
    computeInitials(payerInfo?.payer_name, "FN");

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

export default function ReimbursementMarkAsPaidModal({
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

  const [latestPayoutAttempt, setLatestPayoutAttempt] = useState(initialAttempt);
  const [receiptSnapshot, setReceiptSnapshot] = useState(null);

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
  const activeReimbIdRef = useRef(
    reimbursement?.reimbursement_id || reimbursement?.id || null
  );
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

  const selectedAccountObj = useMemo(
    () =>
      employeeAccounts.find(
        (a) => String(a.credentials_id) === String(selectedCredentialId)
      ) || null,
    [employeeAccounts, selectedCredentialId]
  );

  const completeWithReceipt = useCallback(
    (payload, overrideAttempt = null, overrideCashRef = null) => {
      if (completedReceiptLockRef.current) return;
      completedReceiptLockRef.current = true;

      const snapshot = buildReimbursementReceiptSnapshot({
        reimbursement,
        resultData: payload,
        payerInfo,
        selectedMethod: paymentMethod,
        selectedAccountObj,
        latestPayoutAttempt: overrideAttempt || latestPayoutAttempt,
        cashReference: overrideCashRef || cashReference,
      });

      if (onSuccessRef.current) {
        onSuccessRef.current({
          ...payload,
          receipt_snapshot: snapshot,
        });
      } else {
        setReceiptSnapshot(snapshot);
      }
    },
    [
      reimbursement,
      payerInfo,
      paymentMethod,
      selectedAccountObj,
      latestPayoutAttempt,
      cashReference,
    ]
  );

  // Only reset modal state when switching to a DIFFERENT reimbursement_id;
  // NEVER reset state on parent re-renders or background polling for the same reimbursement.
  useEffect(() => {
    const currentId = reimbursement?.reimbursement_id || reimbursement?.id || null;
    if (!currentId) return;

    if (activeReimbIdRef.current !== currentId) {
      activeReimbIdRef.current = currentId;
      loadedAccountsKeyRef.current = "";
      submitLockRef.current = false;
      completedReceiptLockRef.current = false;
      setReceiptSnapshot(null);
      setEvidenceLoadError(false);
      setErrorMessage("");

      const existingAttempt = reimbursement?.latest_payout_attempt || null;
      setLatestPayoutAttempt(existingAttempt);
      setCashReference(generateFrontendCashReference(reimbursement, payerInfo));

      if (existingAttempt?.method && ["GCash", "Bank"].includes(existingAttempt.method)) {
        setPaymentMethod(existingAttempt.method);
      } else {
        setPaymentMethod("");
      }

      if (existingAttempt?.employee_credentials_id) {
        setSelectedCredentialId(String(existingAttempt.employee_credentials_id));
      } else {
        setSelectedCredentialId("");
      }

      setStatusBanner(
        existingAttempt?.is_succeeded
          ? { type: "success", text: SUCCESS_USER_MESSAGE }
          : existingAttempt?.is_pending
          ? { type: "info", text: PENDING_USER_MESSAGE }
          : null
      );
    } else if (reimbursement?.latest_payout_attempt) {
      // Same reimbursement: merge newer attempt non-destructively without resetting form
      const incoming = reimbursement.latest_payout_attempt;
      setLatestPayoutAttempt((prev) => {
        if (!prev) return incoming;
        if (
          Number(incoming.payout_attempt_id || 0) >=
          Number(prev.payout_attempt_id || 0)
        ) {
          if (
            prev.payout_attempt_id === incoming.payout_attempt_id &&
            prev.payout_status === incoming.payout_status &&
            prev.processor_reference === incoming.processor_reference &&
            prev.xendit_payout_id === incoming.xendit_payout_id &&
            prev.failure_reason === incoming.failure_reason
          ) {
            return prev;
          }
          return incoming;
        }
        return prev;
      });
      if (incoming.method && ["GCash", "Bank"].includes(incoming.method)) {
        setPaymentMethod((prev) => prev || incoming.method);
      }
      if (incoming.employee_credentials_id) {
        setSelectedCredentialId((prev) => prev || String(incoming.employee_credentials_id));
      }
      if (incoming.is_succeeded) {
        setStatusBanner((prev) =>
          prev?.type === "success"
            ? prev
            : { type: "success", text: SUCCESS_USER_MESSAGE }
        );
      } else if (incoming.is_pending) {
        setStatusBanner((prev) =>
          prev?.text === PENDING_USER_MESSAGE
            ? prev
            : { type: "info", text: PENDING_USER_MESSAGE }
        );
      }
    }
  }, [reimbursement, payerInfo]);

  useEffect(() => {
    return () => {
      if (receiptPreviewUrl) {
        URL.revokeObjectURL(receiptPreviewUrl);
      }
    };
  }, [receiptPreviewUrl]);

  // Fallback detail fetch only when recovering from an error state
  const fetchLatestReimbursementDetail = useCallback(async () => {
    if (!reimbursement?.reimbursement_id) return;
    try {
      const res = await request(
        `/miller-employees/finance/reimbursements/${reimbursement.reimbursement_id}/?_t=${Date.now()}`,
        { method: "GET" }
      );
      const freshReimb = res?.reimbursement || res?.data || null;
      if (res && res.success && freshReimb) {
        if (onUpdateReimbursementRef.current) {
          onUpdateReimbursementRef.current({
            ...freshReimb,
            _selectedAccountObj: selectedAccountObj,
            _selectedMethod: paymentMethod,
          });
        }
        const freshAttempt = freshReimb.latest_payout_attempt || null;
        if (freshAttempt) {
          setLatestPayoutAttempt((prev) => {
            if (
              prev &&
              prev.payout_attempt_id === freshAttempt.payout_attempt_id &&
              prev.payout_status === freshAttempt.payout_status &&
              prev.processor_reference === freshAttempt.processor_reference &&
              prev.xendit_payout_id === freshAttempt.xendit_payout_id
            ) {
              return prev;
            }
            return freshAttempt;
          });
          if (freshAttempt.method && ["GCash", "Bank"].includes(freshAttempt.method)) {
            setPaymentMethod((prev) => prev || freshAttempt.method);
          }
          if (freshAttempt.employee_credentials_id) {
            setSelectedCredentialId(
              (prev) => prev || String(freshAttempt.employee_credentials_id)
            );
          }
          if (freshAttempt.is_pending) {
            setStatusBanner((prev) =>
              prev?.text === PENDING_USER_MESSAGE
                ? prev
                : { type: "info", text: PENDING_USER_MESSAGE }
            );
          }
        }
        const isDone =
          String(freshReimb.status || "").toLowerCase() === "paid" ||
          Boolean(freshAttempt?.is_succeeded) ||
          String(freshAttempt?.payout_status || "").toUpperCase() === "SUCCEEDED";
        if (isDone) {
          completeWithReceipt(
            {
              reimbursement: freshReimb,
              is_sandbox: freshAttempt?.is_sandbox,
              payout_status: freshAttempt?.payout_status,
              xendit_payout_id: freshAttempt?.xendit_payout_id,
              processor_reference: freshAttempt?.processor_reference,
            },
            freshAttempt
          );
        }
      }
    } catch {
      // Ignore background refresh error
    }
  }, [
    reimbursement?.reimbursement_id,
    request,
    completeWithReceipt,
    selectedAccountObj,
    paymentMethod,
  ]);

  // Fetch ONLY the requesting employee's active registered payment accounts when GCash or Bank is selected
  const fetchRequesterAccounts = useCallback(
    async (methodName) => {
      const reimbId = reimbursement?.reimbursement_id;
      if (!reimbId || !["GCash", "Bank"].includes(methodName)) {
        setEmployeeAccounts([]);
        setSelectedCredentialId("");
        loadedAccountsKeyRef.current = "";
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
          `/miller-employees/finance/reimbursements/${reimbId}/employee-accounts/?type=${typeParam}`,
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
        console.error("Failed to fetch employee payment accounts:", err);
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

  const handleReconcileStatus = useCallback(
    async (opts = {}) => {
      const silent = Boolean(opts && opts.silent === true);
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
          `/miller-employees/finance/reimbursements/${reimbursement.reimbursement_id}/reconcile/`,
          {
            method: "POST",
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
            setLatestPayoutAttempt((prev) => {
              if (
                prev &&
                prev.payout_attempt_id === attempt.payout_attempt_id &&
                prev.payout_status === attempt.payout_status &&
                prev.processor_reference === attempt.processor_reference &&
                prev.xendit_payout_id === attempt.xendit_payout_id &&
                prev.failure_reason === attempt.failure_reason
              ) {
                return prev;
              }
              return attempt;
            });
            if (attempt.method && ["GCash", "Bank"].includes(attempt.method)) {
              setPaymentMethod((prev) => prev || attempt.method);
            }
            if (attempt.employee_credentials_id) {
              setSelectedCredentialId(
                (prev) => prev || String(attempt.employee_credentials_id)
              );
            }
          }

          const pStat = String(
            attempt?.payout_status || res.data.payout_status || ""
          ).toUpperCase();

          const isCompleted =
            String(updatedReimb?.status || "").toLowerCase() === "paid" ||
            Boolean(attempt?.is_succeeded) ||
            pStat === "SUCCEEDED";

          if (isCompleted) {
            completeWithReceipt(res.data, attempt);
            return;
          }

          if (attempt?.is_failed) {
            setStatusBanner({
              type: "error",
              text: attempt.failure_reason || `Payout failed (${pStat}).`,
            });
          } else if (attempt?.is_pending) {
            setStatusBanner((prev) =>
              prev?.text === PENDING_USER_MESSAGE
                ? prev
                : { type: "info", text: PENDING_USER_MESSAGE }
            );
          }
        }
      } catch (err) {
        if (!silent) {
          setErrorMessage(cleanErrorMessage(err, "Failed to reconcile Xendit payout status."));
        }
      } finally {
        reconcileInFlightRef.current = false;
        if (!silent) {
          setIsReconciling(false);
        }
      }
    },
    [
      reimbursement?.reimbursement_id,
      isSubmitting,
      request,
      completeWithReceipt,
      selectedAccountObj,
      paymentMethod,
    ]
  );

  // Sequentially poll Xendit reconciliation only after each in-flight check finishes
  // to avoid overlapping timers or redundant backend load.
  useEffect(() => {
    if (
      !isOpen ||
      !hasPendingPayout ||
      hasSucceededPayout ||
      !reimbursement?.reimbursement_id
    ) {
      return;
    }

    let cancelled = false;
    let pollTimer = null;

    const scheduleNextPoll = (delayMs = 2500) => {
      if (cancelled) return;
      if (pollTimer) clearTimeout(pollTimer);
      pollTimer = setTimeout(async () => {
        if (cancelled) return;
        if (typeof document !== "undefined" && document.hidden) {
          scheduleNextPoll(3500);
          return;
        }
        await handleReconcileStatus({ silent: true });
        if (!cancelled && !completedReceiptLockRef.current) {
          scheduleNextPoll(2500);
        }
      }, delayMs);
    };

    const handleVisibilityOrFocus = () => {
      if (cancelled || completedReceiptLockRef.current) return;
      if (typeof document !== "undefined" && !document.hidden) {
        scheduleNextPoll(150);
      }
    };

    scheduleNextPoll(2000);

    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleVisibilityOrFocus);
      document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    }

    return () => {
      cancelled = true;
      if (pollTimer) {
        clearTimeout(pollTimer);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleVisibilityOrFocus);
        document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      }
    };
  }, [
    isOpen,
    hasPendingPayout,
    hasSucceededPayout,
    reimbursement?.reimbursement_id,
    handleReconcileStatus,
  ]);

  const resolvedEvidenceUrl = useMemo(
    () => resolveMediaUrl(reimbursement?.photo_evidence),
    [reimbursement?.photo_evidence]
  );

  if (isOpen && receiptSnapshot) {
    return (
      <ReimbursementReceiptModal
        isOpen={true}
        onClose={onClose}
        receipt={receiptSnapshot}
      />
    );
  }

  if (!isOpen || !reimbursement) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage("");
    setReceiptFile(file);
    if (receiptPreviewUrl) {
      URL.revokeObjectURL(receiptPreviewUrl);
    }
    setReceiptPreviewUrl(URL.createObjectURL(file));
  };

  const handleClearReceipt = () => {
    setReceiptFile(null);
    if (receiptPreviewUrl) {
      URL.revokeObjectURL(receiptPreviewUrl);
      setReceiptPreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const isFormValid = () => {
    if (isSubmitting || isReconciling || submitLockRef.current) return false;
    if (hasPendingPayout || hasSucceededPayout) return false;
    if (!paymentMethod) return false;
    if (paymentMethod === "Cash") {
      return Boolean(cashReference.trim());
    }
    if (["GCash", "Bank"].includes(paymentMethod)) {
      return Boolean(selectedCredentialId) && !isLoadingAccounts && employeeAccounts.length > 0;
    }
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid() || submitLockRef.current) return;

    submitLockRef.current = true;
    setIsSubmitting(true);
    setErrorMessage("");
    setStatusBanner(null);

    try {
      const formData = new FormData();
      formData.append(
        "reimbursement_id",
        String(reimbursement.reimbursement_id || reimbursement.id)
      );
      formData.append("payment_method", paymentMethod);

      let submittedCashRef = cashReference;
      if (paymentMethod === "Cash") {
        const freshCashRef =
          cashReference.trim() || generateFrontendCashReference(reimbursement, payerInfo);
        submittedCashRef = freshCashRef;
        setCashReference(freshCashRef);
        formData.append("payment_reference", freshCashRef);
      } else {
        formData.append("employee_credentials_id", String(selectedCredentialId));
      }

      if (receiptFile) {
        formData.append("receipt_file", receiptFile);
      }

      const res = await request("/miller-employees/finance/reimbursements/pay/", {
        method: "POST",
        body: formData,
        throwOnError: true,
      });

      if (res && res.success && res.data) {
        const payload = res.data;
        const updatedReimb = payload.reimbursement;
        const latestAttempt = updatedReimb?.latest_payout_attempt || null;

        if (latestAttempt) {
          setLatestPayoutAttempt(latestAttempt);
          if (latestAttempt.method && ["GCash", "Bank"].includes(latestAttempt.method)) {
            setPaymentMethod(latestAttempt.method);
          }
          if (latestAttempt.employee_credentials_id) {
            setSelectedCredentialId(String(latestAttempt.employee_credentials_id));
          }
        }

        if (updatedReimb && onUpdateReimbursementRef.current) {
          onUpdateReimbursementRef.current({
            ...updatedReimb,
            _selectedAccountObj: selectedAccountObj,
            _selectedMethod: paymentMethod,
          });
        }

        if (payload.payment_flow === "CASH") {
          completeWithReceipt(
            payload,
            null,
            payload.payment_reference_no || submittedCashRef
          );
          return;
        }

        const isXenditSucceeded =
          String(updatedReimb?.status || "").toLowerCase() === "paid" ||
          Boolean(latestAttempt?.is_succeeded) ||
          String(payload.payout_status || latestAttempt?.payout_status || "").toUpperCase() ===
            "SUCCEEDED";

        // Transition directly to Reimbursement Payment Receipt Modal when Xendit returns SUCCEEDED
        if (isXenditSucceeded) {
          completeWithReceipt(payload, latestAttempt);
          return;
        }

        // Immediately transition to Xendit Payout Tracking view with professional English confirmation wait message
        setStatusBanner({
          type: "info",
          text: PENDING_USER_MESSAGE,
        });
      } else {
        setErrorMessage(cleanErrorMessage(res, "Failed to process reimbursement payment."));
      }
    } catch (err) {
      console.error("Reimbursement payment error:", err);
      if (err?.data?.latest_payout_attempt) {
        setLatestPayoutAttempt(err.data.latest_payout_attempt);
      } else {
        await fetchLatestReimbursementDetail();
      }
      setErrorMessage(cleanErrorMessage(err));
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header: Request Reference No. */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {reimbursement.request_reference_no || `REIMB-${reimbursement.id}`}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Request Reference No.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close modal"
            title="Close modal"
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

          {statusBanner && (
            <div
              className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs sm:text-sm ${
                statusBanner.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : statusBanner.type === "error"
                  ? "bg-rose-50 border-rose-200 text-rose-700"
                  : "bg-sky-50 border-sky-200 text-sky-800"
              }`}
            >
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
              <span>{statusBanner.text}</span>
            </div>
          )}

          {/* ── SECTION 1 — REIMBURSEMENT REQUEST DETAILS ── */}
          <div className="space-y-1">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              Reimbursement Request Details
            </div>

            <DetailRow
              label="Requested By"
              value={reimbursement.requester_name || reimbursement.requester}
            />
            <DetailRow
              label="Type"
              value={reimbursement.types || reimbursement.category}
            />
            <DetailRow label="Title" value={reimbursement.title || "—"} />

            {/* Description */}
            <div className="py-1.5 text-xs sm:text-sm">
              <span className="text-slate-500 font-medium block mb-1">
                Description:
              </span>
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                {reimbursement.description || "—"}
              </div>
            </div>

            <DetailRow
              label="Price"
              value={reimbursement.price || reimbursement.cost}
              isAmount={true}
            />
            <DetailRow
              label="Requested Date"
              value={reimbursement.requested_date || reimbursement.date}
            />

            {/* Centered Photo Evidence */}
            <div className="py-2 text-xs sm:text-sm">
              <span className="text-slate-500 font-medium block mb-2">
                Photo Evidence:
              </span>
              <div className="w-full flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                {resolvedEvidenceUrl && !evidenceLoadError ? (
                  <img
                    src={resolvedEvidenceUrl}
                    alt={reimbursement.title || "Reimbursement photo evidence"}
                    className="max-h-48 w-auto object-contain rounded-lg border border-slate-200 bg-white mx-auto"
                    onError={() => setEvidenceLoadError(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-5 text-slate-400">
                    <ImageIcon size={28} className="mb-1.5 text-slate-300" />
                    <span className="text-xs font-medium text-slate-400">
                      No photo evidence attached
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-2" />

          {/* ── EXISTING PAYOUT TRACKING STATUS PANEL (IF ANY) ── */}
          {latestPayoutAttempt && (
            <div
              className={`p-3.5 rounded-xl border space-y-2 text-xs ${
                latestPayoutAttempt.is_succeeded
                  ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                  : latestPayoutAttempt.is_failed
                  ? "bg-rose-50/80 border-rose-200 text-rose-900"
                  : "bg-amber-50/80 border-amber-200 text-amber-900"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold flex items-center gap-1.5 flex-wrap">
                  <ShieldCheck size={15} />
                  <span>Xendit Payout Tracking</span>
                  {latestPayoutAttempt.is_sandbox && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100/90 text-amber-800 border border-amber-300/70">
                      Test Mode
                    </span>
                  )}
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/80 border border-current">
                  {latestPayoutAttempt.payout_status}
                </span>
              </div>

              <div className="space-y-1 text-[11.5px]">
                <div className="flex justify-between gap-2">
                  <span className="opacity-75">Xendit Payout ID:</span>
                  <span className="font-mono font-semibold">
                    {latestPayoutAttempt.xendit_payout_id || "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="opacity-75">Processor / Provider Ref:</span>
                  <span className="font-mono font-semibold">
                    {latestPayoutAttempt.processor_reference ||
                      latestPayoutAttempt.xendit_payout_id ||
                      latestPayoutAttempt.reference_id}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="opacity-75">Merchant Reference ID:</span>
                  <span className="font-mono">{latestPayoutAttempt.reference_id}</span>
                </div>
                {latestPayoutAttempt.account_label && (
                  <div className="flex justify-between gap-2">
                    <span className="opacity-75">Recipient Account:</span>
                    <span className="font-medium text-right">
                      {latestPayoutAttempt.account_label}
                    </span>
                  </div>
                )}
                {latestPayoutAttempt.failure_reason && (
                  <div className="pt-1 text-rose-700 font-medium">
                    Failure Reason: {latestPayoutAttempt.failure_reason}
                  </div>
                )}
                {latestPayoutAttempt.is_pending && (
                  <p className="pt-1 text-[11px] text-amber-900 leading-relaxed font-medium">
                    {PENDING_USER_MESSAGE}
                  </p>
                )}
                {latestPayoutAttempt.is_succeeded && (
                  <p className="pt-1 text-[11px] text-emerald-800 leading-relaxed font-medium">
                    {SUCCESS_USER_MESSAGE}
                  </p>
                )}
              </div>

              {latestPayoutAttempt.xendit_payout_id && !latestPayoutAttempt.is_succeeded && (
                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    disabled={isReconciling || isSubmitting}
                    onClick={() => handleReconcileStatus({ silent: false })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw
                      size={13}
                      className={isReconciling ? "animate-spin" : ""}
                    />
                    <span>
                      {isReconciling ? "Checking Xendit..." : "Reconcile Status"}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

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
                disabled={hasPendingPayout || hasSucceededPayout || isSubmitting}
                onChange={(e) => {
                  const nextMethod = e.target.value;
                  setPaymentMethod(nextMethod);
                  setErrorMessage("");
                  if (nextMethod === "Cash") {
                    setCashReference(
                      generateFrontendCashReference(reimbursement, payerInfo)
                    );
                  }
                }}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-normal text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer disabled:opacity-60"
              >
                <option value="">Select Payment Method</option>
                <option value="Cash">Cash</option>
                <option value="GCash">GCash</option>
                <option value="Bank">Bank</option>
              </select>
            </div>

            {/* ── CASH PAYMENT FLOW ── */}
            {paymentMethod === "Cash" && (
              <div className="space-y-3 pt-1">
                <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/50 text-xs text-emerald-900 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-[#0B5D1E]" />
                    <span>Cash Payment Selected</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11.5px]">
                    Generated Payment Reference No. (Format:{" "}
                    <span className="font-mono font-semibold text-emerald-800">
                      BUSINESS3-REQUESTER_INITIALS-PAYER_INITIALS-MMDDYYYY-HHMM
                    </span>
                    ):
                  </p>
                  <div className="px-3 py-2 rounded-lg bg-white border border-emerald-200 font-mono font-bold text-xs sm:text-sm text-emerald-900">
                    {cashReference}
                  </div>
                </div>
              </div>
            )}

            {/* ── GCASH / BANK XENDIT SANDBOX PAYOUT FLOW ── */}
            {["GCash", "Bank"].includes(paymentMethod) && (
              <div className="space-y-3 pt-1">
                {/* Requester Registered Payment Account Dropdown */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                  <label className="block text-xs sm:text-sm font-bold text-slate-800">
                    Requester&apos;s Registered {paymentMethod} Account{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Showing only active registered {paymentMethod} accounts belonging to{" "}
                    <span className="font-semibold text-slate-700">
                      {reimbursement.requester_name || reimbursement.requester}
                    </span>
                    .
                  </p>

                  {isLoadingAccounts ? (
                    <div className="flex items-center gap-2 py-2 text-xs text-slate-500">
                      <Loader2 size={14} className="animate-spin text-[#0B5D1E]" />
                      <span>Loading employee&apos;s active {paymentMethod} accounts...</span>
                    </div>
                  ) : employeeAccounts.length === 0 ? (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                      <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                      <span>
                        No active registered {paymentMethod} account found for{" "}
                        <strong>
                          {reimbursement.requester_name || reimbursement.requester}
                        </strong>
                        . Ask the employee to register an active {paymentMethod} account or select Cash.
                      </span>
                    </div>
                  ) : (
                    <select
                      value={selectedCredentialId}
                      disabled={hasPendingPayout || hasSucceededPayout || isSubmitting}
                      onChange={(e) => {
                        setSelectedCredentialId(e.target.value);
                        setErrorMessage("");
                      }}
                      className="w-full px-3 py-2 bg-slate-50/60 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer"
                    >
                      {employeeAccounts.map((acc) => (
                        <option key={acc.credentials_id} value={String(acc.credentials_id)}>
                          {acc.display_label}
                          {acc.is_default ? " [Default]" : ""}
                        </option>
                      ))}
                    </select>
                  )}

                  {selectedAccountObj && (
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11.5px] text-slate-700 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Channel:</span>
                        <span className="font-semibold">
                          {selectedAccountObj.type === "gcash"
                            ? "GCash (PH_GCASH)"
                            : selectedAccountObj.bank_name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Account Holder:</span>
                        <span className="font-semibold">{selectedAccountObj.account_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Account Number:</span>
                        <span className="font-mono font-semibold">
                          {selectedAccountObj.account_number_masked}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Payout Amount (Minor Units):</span>
                        <span className="font-mono font-semibold text-[#0B5D1E]">
                          {reimbursement.price} ({reimbursement.amount_centavos} centavos)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Optional Receipt Photo Upload (Available for Cash, GCash, or Bank) */}
            {paymentMethod && (
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2 mt-2">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                    Receipt Photo <span className="text-slate-400 font-normal">(Optional)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Optionally attach a disbursement proof or signed acknowledgement photo.
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
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 shrink-0 bg-white flex justify-center">
          <button
            type="button"
            disabled={!isFormValid()}
            onClick={handleSubmit}
            className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-[#018311] hover:bg-[#016b0f] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" />
                <span>Processing Payment...</span>
              </>
            ) : hasPendingPayout ? (
              <span>Payout Pending Confirmation</span>
            ) : hasSucceededPayout ? (
              <span>Payment Confirmed</span>
            ) : hasFailedPayout && ["GCash", "Bank"].includes(paymentMethod) ? (
              <span>Retry Xendit Payout</span>
            ) : (
              <span>Mark as Paid</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

