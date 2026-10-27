import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import Dropdown from "../../../Components/Minor-Components/Dropdown";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import ToastNotification from "../../../Components/Modals/Toast";
import useApi from "../../../Components/hooks/useApi";
import WarehouseReimbursementMarkAsPaidModal from "../../../Components/Modals/WarehouseFinance/WarehouseReimbursementMarkAsPaidModal";
import WarehouseReimbursementReceiptModal, {
  buildReimbursementReceiptSnapshot,
} from "../../../Components/Modals/WarehouseFinance/WarehouseReimbursementReceiptModal";

const PRESET_CATEGORIES = [
  "Transportation & Travel",
  "Meals & Allowances",
  "Emergency",
  "Equipment & Repair",
  "Communication",
  "Logistics",
  "Office & Operating Supplies",
  "Others",
];

const SORT_OPTIONS = [
  { value: "cost-desc", label: "Highest–Lowest Price" },
  { value: "cost-asc", label: "Lowest–Highest Price" },
  { value: "category-asc", label: "Category (A-Z)" },
  { value: "category-desc", label: "Category (Z-A)" },
  { value: "requester-asc", label: "Requester (A-Z)" },
  { value: "requester-desc", label: "Requester (Z-A)" },
];

function isPendingDisplayEligible(item) {
  if (!item) return false;
  const st = String(item.status || "requested").trim().toLowerCase();
  if (st !== "requested") return false;
  if (item.paid_date || item.paid_by) return false;
  const attempt = item.latest_payout_attempt;
  if (
    attempt &&
    (attempt.is_succeeded ||
      String(attempt.payout_status || "").trim().toUpperCase() === "SUCCEEDED")
  ) {
    return false;
  }
  return true;
}

export default function WarehouseReimburse() {
  const location = useLocation();
  const isManager = location.pathname.startsWith("/warehouse-manager");
  const { request } = useApi();

  const [reimbursements, setReimbursements] = useState([]);
  const [backendCategories, setBackendCategories] = useState([]);
  const [payerInfo, setPayerInfo] = useState(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sortBy, setSortBy] = useState("category-asc");
  const [page, setPage] = useState(1);

  const [selectedReimbursement, setSelectedReimbursement] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // FIFO queue of receipt snapshots; shows ONLY ONE receipt at a time (receiptQueue[0])
  const [receiptQueue, setReceiptQueue] = useState([]);
  // IDs of reimbursements with active pending Xendit payouts being watched
  const [watchedPendingIds, setWatchedPendingIds] = useState([]);
  const [toast, setToast] = useState(null);

  const isFetchingRef = useRef(false);
  const bgReconcileInFlightRef = useRef(false);
  const payerInfoRef = useRef(null);

  // Persistent map of reimbursement_id -> full reimbursement + account snapshot
  const watchedSnapshotsRef = useRef(new Map());
  // Deduplication set so the same completed payout never enqueues twice
  const enqueuedReceiptKeysRef = useRef(new Set());

  useEffect(() => {
    if (payerInfo) {
      payerInfoRef.current = payerInfo;
    }
  }, [payerInfo]);

  const registerWatchedSnapshot = useCallback((item) => {
    if (!item) return;
    const rId = Number(item.reimbursement_id || item.id);
    if (!rId) return;

    const existing = watchedSnapshotsRef.current.get(rId) || {};
    const merged = {
      ...existing,
      ...item,
      _selectedAccountObj:
        item._selectedAccountObj || existing._selectedAccountObj || null,
      _selectedMethod:
        item._selectedMethod ||
        item.latest_payout_attempt?.method ||
        existing._selectedMethod ||
        null,
    };
    watchedSnapshotsRef.current.set(rId, merged);
  }, []);

  const enqueueReceiptSnapshot = useCallback((snapshot) => {
    if (!snapshot) return;
    const key = String(
      snapshot.reimbursement_id ||
        snapshot.id ||
        snapshot.payment_reference_no ||
        ""
    ).trim();

    if (key) {
      if (enqueuedReceiptKeysRef.current.has(key)) {
        return;
      }
      enqueuedReceiptKeysRef.current.add(key);
    }

    const rId = Number(snapshot.reimbursement_id || snapshot.id);
    if (rId) {
      setWatchedPendingIds((prev) => prev.filter((id) => id !== rId));
      setReimbursements((prev) =>
        prev.filter((item) => Number(item.reimbursement_id || item.id) !== rId)
      );
      setSelectedReimbursement((prev) => {
        if (!prev) return null;
        if (Number(prev.reimbursement_id || prev.id) === rId) {
          setIsModalOpen(false);
          return null;
        }
        return prev;
      });
    }

    setReceiptQueue((prev) => [...prev, snapshot]);
  }, []);

  const handleUpdateReimbursement = useCallback(
    (updatedReimb) => {
      if (!updatedReimb) return;
      const targetId = Number(updatedReimb.reimbursement_id || updatedReimb.id);
      if (!targetId) return;

      registerWatchedSnapshot(updatedReimb);

      setReimbursements((prev) =>
        prev.map((item) =>
          Number(item.reimbursement_id || item.id) === targetId
            ? { ...item, ...updatedReimb }
            : item
        )
      );

      setSelectedReimbursement((prev) => {
        if (!prev) return prev;
        if (Number(prev.reimbursement_id || prev.id) !== targetId) return prev;
        return { ...prev, ...updatedReimb };
      });
    },
    [registerWatchedSnapshot]
  );

  const fetchReimbursements = useCallback(
    async ({ silent = false } = {}) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.append("search", query.trim());
        if (category && category !== "") params.append("category", category);
        if (sortBy) params.append("sort_by", sortBy);
        params.append("_t", String(Date.now()));

        const res = await request(
          `/warehouse/finance/reimbursements/?${params.toString()}`,
          { method: "GET" }
        );

        if (res && res.success && Array.isArray(res.data)) {
          const resolvedPayerInfo = res.payer_info || payerInfoRef.current;
          if (res.payer_info) {
            payerInfoRef.current = res.payer_info;
            setPayerInfo((prev) => prev || res.payer_info);
          }

          if (Array.isArray(res.newly_succeeded) && res.newly_succeeded.length > 0) {
            for (const succReimb of res.newly_succeeded) {
              const sId = Number(succReimb?.reimbursement_id || succReimb?.id);
              const cached = sId ? watchedSnapshotsRef.current.get(sId) : null;
              const mergedReimb = cached ? { ...cached, ...succReimb } : succReimb;
              const attempt = mergedReimb?.latest_payout_attempt || null;
              const snapshot = buildReimbursementReceiptSnapshot({
                reimbursement: mergedReimb,
                resultData: {
                  reimbursement: mergedReimb,
                  is_sandbox: attempt?.is_sandbox,
                  xendit_environment: attempt?.xendit_environment,
                  payout_status: attempt?.payout_status || "SUCCEEDED",
                  xendit_payout_id: attempt?.xendit_payout_id,
                  processor_reference: attempt?.processor_reference,
                },
                payerInfo: resolvedPayerInfo,
                selectedMethod: cached?._selectedMethod || attempt?.method,
                selectedAccountObj: cached?._selectedAccountObj || null,
                latestPayoutAttempt: attempt,
              });
              enqueueReceiptSnapshot(snapshot);
            }
          }

          const pendingOnly = res.data.filter(isPendingDisplayEligible);

          pendingOnly.forEach((item) => {
            const itemId = Number(item.reimbursement_id || item.id);
            if (!itemId) return;
            const prevSnap = watchedSnapshotsRef.current.get(itemId) || {};
            watchedSnapshotsRef.current.set(itemId, { ...prevSnap, ...item });
          });

          const discoveredPendingIds = pendingOnly
            .filter((r) => Boolean(r?.latest_payout_attempt?.is_pending))
            .map((r) => Number(r.reimbursement_id || r.id))
            .filter(Boolean);

          if (discoveredPendingIds.length > 0) {
            setWatchedPendingIds((prev) => {
              const next = new Set(prev);
              discoveredPendingIds.forEach((id) => next.add(id));
              return next.size === prev.length ? prev : Array.from(next);
            });
          }

          setReimbursements(pendingOnly);

          if (Array.isArray(res.categories)) {
            setBackendCategories((prev) =>
              prev.length === res.categories.length &&
              prev.every((v, i) => v === res.categories[i])
                ? prev
                : res.categories
            );
          }
        }
      } catch (err) {
        if (!silent) {
          console.error("Failed to load reimbursements:", err);
          const msg = err?.message || err?.detail || "";
          const cleanMsg =
            typeof msg === "string" && msg.trim() && !/<[a-z][\s\S]*>/i.test(msg)
              ? msg
              : "Failed to load reimbursement records. Please refresh the page.";
          setToast({
            type: "error",
            message: cleanMsg,
          });
        }
      } finally {
        isFetchingRef.current = false;
      }
    },
    [request, query, category, sortBy, enqueueReceiptSnapshot]
  );

  useEffect(() => {
    fetchReimbursements();
  }, [fetchReimbursements]);

  // Combine watchedPendingIds with any pending payouts visible in table
  const allPendingPayoutIds = useMemo(() => {
    const idSet = new Set(watchedPendingIds);
    reimbursements.forEach((r) => {
      if (r?.latest_payout_attempt?.is_pending) {
        const id = Number(r.reimbursement_id || r.id);
        if (id) idSet.add(id);
      }
    });
    return Array.from(idSet);
  }, [watchedPendingIds, reimbursements]);

  const openModalReimbId = useMemo(
    () =>
      isModalOpen && selectedReimbursement
        ? Number(selectedReimbursement.reimbursement_id || selectedReimbursement.id)
        : null,
    [isModalOpen, selectedReimbursement]
  );

  // Background polling for watched pending payouts
  useEffect(() => {
    const idsToPollInBg = allPendingPayoutIds.filter(
      (id) => id && id !== openModalReimbId
    );
    if (idsToPollInBg.length === 0) return;

    let cancelled = false;
    let pollTimer = null;

    const scheduleNextPoll = (delayMs = 2500) => {
      if (cancelled) return;
      if (pollTimer) clearTimeout(pollTimer);
      pollTimer = setTimeout(reconcilePendingInBackground, delayMs);
    };

    const reconcilePendingInBackground = async () => {
      if (cancelled || bgReconcileInFlightRef.current) return;
      if (typeof document !== "undefined" && document.hidden) {
        scheduleNextPoll(3500);
        return;
      }

      bgReconcileInFlightRef.current = true;
      try {
        for (const rId of idsToPollInBg) {
          if (cancelled) break;
          try {
            const res = await request(
              `/warehouse/finance/reimbursements/${rId}/reconcile/`,
              { method: "POST" }
            );
            if (res && res.success && res.data) {
              const updatedReimb = res.data.reimbursement;
              const attempt = updatedReimb?.latest_payout_attempt || null;
              const pStat = String(
                attempt?.payout_status || res.data.payout_status || ""
              ).toUpperCase();
              const isDone =
                String(updatedReimb?.status || "").toLowerCase() === "paid" ||
                Boolean(attempt?.is_succeeded) ||
                pStat === "SUCCEEDED";

              const cached = watchedSnapshotsRef.current.get(Number(rId)) || {};
              const mergedReimb = updatedReimb
                ? { ...cached, ...updatedReimb }
                : cached;

              if (isDone) {
                const snapshot = buildReimbursementReceiptSnapshot({
                  reimbursement: mergedReimb,
                  resultData: res.data,
                  payerInfo: payerInfoRef.current || payerInfo,
                  selectedMethod: cached?._selectedMethod || attempt?.method,
                  selectedAccountObj: cached?._selectedAccountObj || null,
                  latestPayoutAttempt: attempt,
                });
                enqueueReceiptSnapshot(snapshot);
              } else if (updatedReimb) {
                handleUpdateReimbursement(mergedReimb);
              }
            }
          } catch {
            // Ignore transient background poll errors
          }
        }
      } finally {
        bgReconcileInFlightRef.current = false;
        if (!cancelled) {
          scheduleNextPoll(2500);
        }
      }
    };

    scheduleNextPoll(2000);

    return () => {
      cancelled = true;
      if (pollTimer) {
        clearTimeout(pollTimer);
      }
    };
  }, [
    allPendingPayoutIds,
    openModalReimbId,
    request,
    payerInfo,
    handleUpdateReimbursement,
    enqueueReceiptSnapshot,
  ]);

  const categoryOptions = useMemo(() => {
    const combined = [...PRESET_CATEGORIES];
    backendCategories.forEach((c) => {
      if (c && !combined.includes(c)) combined.push(c);
    });
    reimbursements.forEach((r) => {
      if (r.category && !combined.includes(r.category)) combined.push(r.category);
    });

    return [
      { label: "All Categories", value: "" },
      ...combined.map((c) => ({ label: c, value: c })),
    ];
  }, [backendCategories, reimbursements]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = reimbursements.filter((r) => {
      if (!isPendingDisplayEligible(r)) return false;
      if (
        q &&
        !`${r.request_reference_no || ""} ${r.category || ""} ${r.title || ""} ${r.description || ""} ${r.requester || ""} ${r.cost || ""} ${r.date || ""}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      if (category && category !== "") return r.category === category;
      return true;
    });

    result = [...result];
    if (sortBy === "category-asc") {
      result.sort((a, b) => (a.category || "").localeCompare(b.category || ""));
    } else if (sortBy === "category-desc") {
      result.sort((a, b) => (b.category || "").localeCompare(a.category || ""));
    } else if (sortBy === "requester-asc") {
      result.sort((a, b) => (a.requester || "").localeCompare(b.requester || ""));
    } else if (sortBy === "requester-desc") {
      result.sort((a, b) => (b.requester || "").localeCompare(a.requester || ""));
    } else if (sortBy === "cost-desc") {
      result.sort(
        (a, b) =>
          (Number(b.price_raw) || parseFloat(String(b.cost).replace(/[^\d.]/g, "")) || 0) -
          (Number(a.price_raw) || parseFloat(String(a.cost).replace(/[^\d.]/g, "")) || 0)
      );
    } else if (sortBy === "cost-asc") {
      result.sort(
        (a, b) =>
          (Number(a.price_raw) || parseFloat(String(a.cost).replace(/[^\d.]/g, "")) || 0) -
          (Number(b.price_raw) || parseFloat(String(b.cost).replace(/[^\d.]/g, "")) || 0)
      );
    }
    return result;
  }, [reimbursements, query, category, sortBy]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const startIndex = (safePage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);
  const sections = useMemo(() => [{ rows: paginated }], [paginated]);

  const handleOpenMarkAsPaid = (row) => {
    const targetId = Number(row?.reimbursement_id || row?.id);
    const liveRow =
      reimbursements.find(
        (item) => Number(item.reimbursement_id || item.id) === targetId
      ) ||
      watchedSnapshotsRef.current.get(targetId) ||
      row;
    registerWatchedSnapshot(liveRow);
    setSelectedReimbursement(liveRow);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedReimbursement(null);
  };

  const handlePaymentSuccess = useCallback(
    (resultData) => {
      const completedId = Number(
        resultData?.reimbursement?.reimbursement_id ||
          resultData?.reimbursement?.id ||
          selectedReimbursement?.reimbursement_id ||
          selectedReimbursement?.id ||
          resultData?.receipt_snapshot?.reimbursement_id ||
          0
      );
      const cached = completedId
        ? watchedSnapshotsRef.current.get(completedId)
        : null;
      const baseReimb =
        resultData?.reimbursement || cached || selectedReimbursement;

      const snapshot =
        resultData?.receipt_snapshot ||
        buildReimbursementReceiptSnapshot({
          reimbursement: baseReimb,
          resultData,
          payerInfo: payerInfoRef.current || payerInfo,
          selectedMethod: cached?._selectedMethod,
          selectedAccountObj: cached?._selectedAccountObj,
        });

      setIsModalOpen(false);
      setSelectedReimbursement(null);
      enqueueReceiptSnapshot(snapshot);

      fetchReimbursements({ silent: true });
    },
    [selectedReimbursement, payerInfo, enqueueReceiptSnapshot, fetchReimbursements]
  );

  const handleCloseReceiptModal = useCallback(() => {
    setReceiptQueue((prev) => prev.slice(1));
    fetchReimbursements({ silent: true });
  }, [fetchReimbursements]);

  const activeReceipt = receiptQueue.length > 0 ? receiptQueue[0] : null;

  const columns = [
    {
      key: "category",
      label: "Expense Category",
      render: (row) => (
        <div>
          <div className="inline-flex items-center gap-2">
            <span className="inline-block rounded-full bg-sky-100 text-sky-700 px-3 py-1 text-xs font-semibold">
              {row.category}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-1">{row.date}</div>
        </div>
      ),
    },
    { key: "description", label: "Description" },
    { key: "cost", label: "Cost" },
    { key: "requester", label: "Requested By" },
    {
      key: "action",
      label: "Action",
      headerClassName: "text-center",
      cellClassName: "!text-center !pr-3",
      render: (row) => {
        const isPendingAttempt = Boolean(row.latest_payout_attempt?.is_pending);
        return (
          <button
            type="button"
            onClick={() => handleOpenMarkAsPaid(row)}
            className={`inline-flex items-center justify-center px-3 py-1 h-7 rounded-lg text-white text-xs font-semibold transition cursor-pointer ${
              isPendingAttempt ? "hover:bg-amber-700" : "hover:bg-[#016b0f]"
            }`}
            style={{
              backgroundColor: isPendingAttempt ? "#d97706" : "#018311",
              minWidth: 88,
            }}
          >
            {isPendingAttempt ? "Payout Pending" : "Mark as Paid"}
          </button>
        );
      },
    },
  ];

  return (
    <div>
      {toast && (
        <ToastNotification
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <Breadcrumbs
        items={
          isManager
            ? [
                { label: "Management", path: "/warehouse-manager/dashboard" },
                { label: "Reimburse" },
              ]
            : [
                { label: "Finance", path: "/warehouse-finance/dashboard" },
                { label: "Reimburse" },
              ]
        }
      />

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Reimburse</h1>
        <p className="text-sm text-slate-500 mt-1">
          Pending expense requests awaiting payment approval.
        </p>
      </div>

      <div className="mt-4 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <div className="w-full max-w-xs sm:w-72">
            <SearchFilter
              onSearch={(v) => {
                setQuery(v);
                setPage(1);
              }}
              placeholder="Search description or category"
            />
          </div>

          <div className="w-full sm:w-60">
            <Dropdown
              options={categoryOptions}
              value={category}
              onChange={(v) => {
                setCategory(v);
                setPage(1);
              }}
              placeholder="All Categories"
            />
          </div>

          <SortByDropdown
            options={SORT_OPTIONS}
            value={sortBy}
            onChange={(v) => {
              setSortBy(v);
              setPage(1);
            }}
          />
        </div>

        <div className="inline-block px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-sm font-semibold border border-amber-200">
          {filtered.length} pending
        </div>
      </div>

      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={setPage}
        footerLabel={
          filtered.length > 0
            ? `Showing ${startIndex + 1}-${Math.min(
                startIndex + itemsPerPage,
                filtered.length
              )} of ${filtered.length} reimbursement requests`
            : "Showing 0 of 0 reimbursement requests"
        }
      />

      {/* 1. Mark As Paid Modal */}
      {isModalOpen && selectedReimbursement && (
        <WarehouseReimbursementMarkAsPaidModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          reimbursement={selectedReimbursement}
          payerInfo={payerInfo}
          onSuccess={handlePaymentSuccess}
          onRefreshList={() => fetchReimbursements({ silent: true })}
          onUpdateReimbursement={handleUpdateReimbursement}
        />
      )}

      {/* 2. Receipt Modal (Queue Driven, Shows 1 at a Time) */}
      {activeReceipt && (
        <WarehouseReimbursementReceiptModal
          isOpen={Boolean(activeReceipt)}
          receiptData={activeReceipt}
          onClose={handleCloseReceiptModal}
        />
      )}
    </div>
  );
}