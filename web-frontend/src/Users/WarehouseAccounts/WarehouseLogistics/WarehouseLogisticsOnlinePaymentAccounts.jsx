import { useState, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  CreditCard,
  Plus,
  ShieldCheck,
  Eye,
  EyeOff,
  Edit2,
  Archive,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Lock,
  X,
  Loader2,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import Dropdown from "../../../Components/Minor-Components/Dropdown";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import Tabs from "../../../Components/Minor-Components/Tabs";
import Toast from "../../../Components/Modals/Toast";
import useToast from "../../../Components/hooks/useToast";
import useApi from "../../../Components/hooks/useApi";

// Modals
import PaymentSecuritySetupModal from "../../../Components/Modals/MillerManager/PaymentAccounts/PaymentSecuritySetupModal";
import PaymentSecurityPasswordModal from "../../../Components/Modals/MillerManager/PaymentAccounts/PaymentSecurityPasswordModal";
import PaymentSecurityForgotModal from "../../../Components/Modals/MillerManager/PaymentAccounts/PaymentSecurityForgotModal";
import ArchiveReasonModal from "../../../Components/Modals/MillerManager/PaymentAccounts/ArchiveReasonModal";
import FaceScreeningModal from "../../../Components/Modals/MillerManager/PaymentAccounts/FaceScreeningModal";

const SORT_OPTIONS = [
  { value: "name_asc", label: "Account Name (A–Z)" },
  { value: "name_desc", label: "Account Name (Z–A)" },
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
];

const ACCOUNT_STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const ACCOUNT_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "bank", label: "Bank Account" },
  { value: "gcash", label: "GCash" },
];

const VERIFICATION_STATUS_OPTIONS = [
  { value: "all", label: "All Verifications" },
  { value: "unverified", label: "Unverified" },
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "failed", label: "Failed" },
];

const PHILIPPINE_BANKS = [
  "BDO Unibank",
  "Bank of the Philippine Islands (BPI)",
  "Metrobank",
  "Land Bank of the Philippines",
  "Philippine National Bank (PNB)",
  "Security Bank",
  "UnionBank of the Philippines",
  "RCBC",
  "China Banking Corporation (China Bank)",
  "EastWest Bank",
  "Asia United Bank (AUB)",
  "Development Bank of the Philippines (DBP)",
  "Other Bank",
];

const CARD_TYPES = [
  "Debit Card",
  "Savings Account",
  "Checking Account",
];

function ModalDetailRow({ label, value, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-xs sm:text-sm">
      <span className="text-slate-500 font-medium shrink-0">{label}:</span>
      {children ? (
        <div className="text-right">{children}</div>
      ) : (
        <span className="font-semibold text-slate-800 text-right break-words max-w-[65%]">
          {value || "—"}
        </span>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const isArchived = status === "archived";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${
        isArchived
          ? "bg-slate-100 text-slate-600 border border-slate-200"
          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isArchived ? "bg-slate-400" : "bg-emerald-600"
        }`}
      />
      {status || "Active"}
    </span>
  );
}

function VerificationBadge({ status }) {
  const norm = (status || "").toLowerCase();
  let style = "bg-slate-100 text-slate-600 border-slate-200";
  if (norm === "verified") {
    style = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (norm === "pending") {
    style = "bg-amber-50 text-amber-700 border-amber-200";
  } else if (norm === "failed") {
    style = "bg-rose-50 text-rose-700 border-rose-200";
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize border ${style}`}
    >
      {status || "Unverified"}
    </span>
  );
}

export default function WarehouseLogisticsOnlinePaymentAccounts() {
  const { request } = useApi();
  const { toasts, showToast, removeToast } = useToast();

  // Security status & User Info
  const [hasSecurityPassword, setHasSecurityPassword] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [isCheckingSecurity, setIsCheckingSecurity] = useState(true);

  // Accounts Data
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedVerification, setSelectedVerification] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Revealed account numbers (id -> unmasked number)
  const [revealedAccountNumbers, setRevealedAccountNumbers] = useState({});

  // Active Modals: 'setup' | 'forgot' | 'password_prompt' | 'add' | 'face_screening' | 'view' | 'edit' | 'archive' | null
  const [activeModal, setActiveModal] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [pendingAddPayload, setPendingAddPayload] = useState(null);
  const [verifyingAccount, setVerifyingAccount] = useState(null);

  // Config for generic PaymentSecurityPasswordModal
  const [passwordModalConfig, setPasswordModalConfig] = useState({
    title: "Payment Security Authorization",
    description: "Enter your 12+ character payment security password to proceed.",
    confirmText: "Authorize",
    actionType: null,
    targetAccount: null,
  });

  // Action tokens (for edit / archive)
  const [actionAuthTokens, setActionAuthTokens] = useState({});

  // ─────────────────────────────────────────────────────────────
  // 1. INITIAL SECURITY CHECK & USER INFO
  // ─────────────────────────────────────────────────────────────
  const checkSecurityStatus = useCallback(async () => {
    setIsCheckingSecurity(true);
    try {
      const res = await request("/warehouse/payment-accounts/security/status/", {
        method: "GET",
      });
      if (res && (res.success || res.ok)) {
        const payload = res.data || res;
        const hasPwd = payload.has_security_password ?? res.has_security_password ?? false;
        const userObj = res.user || payload.user || {
          masked_email: payload.masked_email || res.masked_email || "",
          full_name: payload.full_name || res.full_name || "",
          first_name: payload.first_name || res.first_name || "",
          last_name: payload.last_name || res.last_name || "",
        };
        setHasSecurityPassword(Boolean(hasPwd));
        setUserInfo(userObj);
        if (!hasPwd) {
          setActiveModal("setup");
        }
      }
    } catch (err) {
      console.error("Failed to check warehouse security status:", err);
    } finally {
      setIsCheckingSecurity(false);
    }
  }, [request]);

  useEffect(() => {
    checkSecurityStatus();
  }, [checkSecurityStatus]);

  // ─────────────────────────────────────────────────────────────
  // 2. FETCH EMPLOYEE PAYMENT ACCOUNTS
  // ─────────────────────────────────────────────────────────────
  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await request("/warehouse/payment-accounts/my-accounts/", {
        method: "GET",
      });
      if (res && (res.success || res.ok)) {
        const rawList = res.accounts || res.data?.accounts || res.data || [];
        const validAccounts = Array.isArray(rawList)
          ? rawList.filter(
              (item) => item && (item.credentials_id || item.id || item.account_name)
            )
          : [];
        setAccounts(validAccounts);
      } else {
        setAccounts([]);
      }
    } catch (err) {
      console.error("Failed to load warehouse payment accounts:", err);
      setAccounts([]);
      showToast({
        type: "error",
        title: "Load Failed",
        message: "Failed to load payment accounts.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [request, showToast]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // ─────────────────────────────────────────────────────────────
  // 3. FILTERING & SORTING (Instant 0ms in-memory)
  // ─────────────────────────────────────────────────────────────
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      // Search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const nameMatch = (acc.account_name || "").toLowerCase().includes(q);
        const bankMatch = (acc.bank_name || "").toLowerCase().includes(q);
        const platMatch = (acc.platform_name || "").toLowerCase().includes(q);
        const numMatch = (acc.account_number_masked || acc.account_number || "").toLowerCase().includes(q);
        if (!nameMatch && !bankMatch && !platMatch && !numMatch) return false;
      }
      // Status
      if (selectedStatus !== "all") {
        if ((acc.status || "active").toLowerCase() !== selectedStatus.toLowerCase()) return false;
      }
      // Type
      if (selectedType !== "all") {
        if ((acc.type || acc.account_type || "").toLowerCase() !== selectedType.toLowerCase()) return false;
      }
      // Verification
      if (selectedVerification !== "all") {
        if ((acc.verification_status || "unverified").toLowerCase() !== selectedVerification.toLowerCase()) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === "name_asc") {
        return (a.account_name || "").localeCompare(b.account_name || "");
      }
      if (sortBy === "name_desc") {
        return (b.account_name || "").localeCompare(a.account_name || "");
      }
      if (sortBy === "newest") {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      if (sortBy === "oldest") {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }
      return 0;
    });
  }, [accounts, search, selectedStatus, selectedType, selectedVerification, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / itemsPerPage));
  const paginatedAccounts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAccounts.slice(start, start + itemsPerPage);
  }, [filteredAccounts, currentPage, itemsPerPage]);

  // ─────────────────────────────────────────────────────────────
  // 4. MODALS ORCHESTRATION & HANDLERS
  // ─────────────────────────────────────────────────────────────
  const handleCloseAllModals = () => {
    setActiveModal(null);
    setSelectedAccount(null);
    setPendingAddPayload(null);
    setVerifyingAccount(null);
  };

  const handleSetupSuccess = () => {
    setHasSecurityPassword(true);
    setActiveModal(null);
    showToast({
      type: "success",
      title: "Security Setup Complete",
      message: "Payment Security Password has been successfully established.",
    });
    checkSecurityStatus();
  };

  const handleOpenForgotPassword = () => {
    setActiveModal("forgot");
  };

  const handleForgotSuccess = () => {
    showToast({
      type: "success",
      title: "Password Reset",
      message: "Your payment security password has been reset.",
    });
    if (passwordModalConfig?.actionType) {
      setActiveModal("password_prompt");
    } else {
      setActiveModal(null);
    }
    checkSecurityStatus();
  };

  const handleOpenAddAccount = () => {
    setActiveModal("add");
  };

  // Transition from Add Form to Face Screening
  const handleProceedToScreening = (payload) => {
    setPendingAddPayload(payload);
    setVerifyingAccount(null);
    setActiveModal("face_screening");
  };

  const handleAccountCreated = () => {
    showToast({
      type: "success",
      title: "Account Added & Verified",
      message: "Your online payment account has been verified and saved successfully.",
    });
    loadAccounts();
    setActiveModal(null);
    setPendingAddPayload(null);
  };

  const handleViewAccount = (account) => {
    setSelectedAccount(account);
    setActiveModal("view");
  };

  // Trigger Identity Screening for an existing unverified account from View Modal
  const handleStartVerifyExisting = (account) => {
    const accType = (account.account_type || account.type || (account.bank_name && account.bank_name !== "—" ? "bank" : "gcash")).toLowerCase();
    setVerifyingAccount(account);
    setPendingAddPayload({
      account_name: account.account_name,
      type: accType,
      account_type: accType,
      bank_name: account.bank_name,
      card_type: account.card_type || "Debit Card",
      account_number: account.account_number_masked || account.account_number,
    });
    setActiveModal("face_screening");
  };

  const handleRequestReveal = (account) => {
    setSelectedAccount(account);
    setPasswordModalConfig({
      title: "Authorize Account Reveal",
      description: "Enter your payment security password to reveal the full account number.",
      confirmText: "Reveal Account Number",
      actionType: "reveal",
      targetAccount: account,
    });
    setActiveModal("password_prompt");
  };

  const handleEditAccountPrompt = (account) => {
    setSelectedAccount(account);
    setPasswordModalConfig({
      title: "Authorize Account Edit",
      description: "Enter your payment security password to authorize editing this account.",
      confirmText: "Continue to Edit",
      actionType: "edit_authorize",
      targetAccount: account,
    });
    setActiveModal("password_prompt");
  };

  const handleEditSaveSuccess = () => {
    showToast({
      type: "success",
      title: "Account Updated",
      message: "Payment account details updated successfully.",
    });
    loadAccounts();
    setActiveModal(null);
    setSelectedAccount(null);
  };

  const handleArchivePrompt = (account) => {
    setSelectedAccount(account);
    setPasswordModalConfig({
      title: "Authorize Account Archive",
      description: "Enter your payment security password to authorize archiving this account.",
      confirmText: "Continue to Archive",
      actionType: "archive_authorize",
      targetAccount: account,
    });
    setActiveModal("password_prompt");
  };

  const handleConfirmArchive = async ({ reason }) => {
    const accId = selectedAccount?.credentials_id || selectedAccount?.id;
    const res = await request(
      `/warehouse/payment-accounts/my-accounts/${accId}/archive/`,
      {
        method: "POST",
        body: { archive_reason: reason },
      }
    );

    if (res && res.success) {
      showToast({
        type: "success",
        title: "Account Archived",
        message: "Payment account has been archived.",
      });
      loadAccounts();
      setActiveModal(null);
      setSelectedAccount(null);
    } else {
      showToast({
        type: "error",
        title: "Archive Failed",
        message: res?.message || "Failed to archive account.",
      });
    }
  };

  const handleRestorePrompt = (account) => {
    setSelectedAccount(account);
    setPasswordModalConfig({
      title: "Authorize Account Restore",
      description: "Enter your payment security password to restore this payment account.",
      confirmText: "Restore Account",
      actionType: "restore",
      targetAccount: account,
    });
    setActiveModal("password_prompt");
  };

  const handleConfirmRestore = async () => {
    const accId = selectedAccount?.credentials_id || selectedAccount?.id;
    const res = await request(
      `/warehouse/payment-accounts/my-accounts/${accId}/restore/`,
      {
        method: "POST",
      }
    );

    if (res && res.success) {
      showToast({
        type: "success",
        title: "Account Restored",
        message: "Payment account has been restored to active status.",
      });
      loadAccounts();
      setActiveModal(null);
      setSelectedAccount(null);
    } else {
      showToast({
        type: "error",
        title: "Restore Failed",
        message: res?.message || "Failed to restore account.",
      });
    }
  };

  // Reusable Password Modal Submit Handler
  const handleExecutePasswordAction = async (enteredPassword) => {
    const { actionType, targetAccount } = passwordModalConfig;
    const targetId = targetAccount?.credentials_id || targetAccount?.id;

    if (actionType === "reveal") {
      const res = await request(
        `/warehouse/payment-accounts/my-accounts/${targetId}/reveal/`,
        {
          method: "POST",
          body: { password: enteredPassword },
        }
      );

      if (res && (res.success || res.ok) && res.account_number) {
        setRevealedAccountNumbers((prev) => ({
          ...prev,
          [targetId]: res.account_number,
        }));
        setActiveModal("view");
        return { success: true };
      } else {
        return {
          success: false,
          message: res?.message || "Invalid security password.",
        };
      }
    }

    if (actionType === "edit_authorize") {
      const res = await request("/warehouse/payment-accounts/security/authorize-action/", {
        method: "POST",
        body: {
          password: enteredPassword,
          action: "edit",
          account_id: targetId,
        },
      });

      if (res && res.success && res.action_token) {
        setActionAuthTokens((prev) => ({
          ...prev,
          [`edit_${targetId}`]: res.action_token,
        }));
        setActiveModal("edit");
        return { success: true };
      } else {
        return {
          success: false,
          message: res?.message || "Invalid security password.",
        };
      }
    }

    if (actionType === "archive_authorize") {
      const res = await request("/warehouse/payment-accounts/security/authorize-action/", {
        method: "POST",
        body: {
          password: enteredPassword,
          action: "archive",
          account_id: targetId,
        },
      });

      if (res && res.success && res.action_token) {
        setActionAuthTokens((prev) => ({
          ...prev,
          [`archive_${targetId}`]: res.action_token,
        }));
        setActiveModal("archive");
        return { success: true };
      } else {
        return {
          success: false,
          message: res?.message || "Invalid security password.",
        };
      }
    }

    if (actionType === "restore") {
      const res = await request(
        `/warehouse/payment-accounts/my-accounts/${targetId}/reveal/`,
        {
          method: "POST",
          body: { password: enteredPassword },
        }
      );

      if (res && (res.success || res.ok)) {
        await handleConfirmRestore();
        return { success: true };
      } else {
        return {
          success: false,
          message: res?.message || "Invalid security password.",
        };
      }
    }

    return { success: false, message: "Unknown action." };
  };

  const handleClosePasswordModal = () => {
    setActiveModal(null);
  };

  // ─────────────────────────────────────────────────────────────
  // 5. TABLE CONFIGURATION
  // ─────────────────────────────────────────────────────────────
  const columns = [
    {
      key: "account_name",
      label: "Account Name",
      width: "25%",
      renderCell: (row) => (
        <div className="flex items-center gap-2">
          <div className="font-semibold text-slate-800">{row.account_name}</div>
          {row.is_default && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Default
            </span>
          )}
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      width: "18%",
      renderCell: (row) => {
        const isGcash = (row.type || row.account_type || "").toLowerCase() === "gcash";
        return (
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-lg shrink-0 ${
                isGcash ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {isGcash ? <Smartphone size={15} /> : <CreditCard size={15} />}
            </div>
            <div className="min-w-0">
              <div className="font-medium text-slate-800 capitalize text-xs sm:text-sm">
                {isGcash ? "GCash" : row.bank_name || "Bank Account"}
              </div>
              {!isGcash && row.card_type && (
                <div className="text-[11px] text-slate-400 font-medium">
                  {row.card_type}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "account_number",
      label: "Account Number",
      width: "22%",
      renderCell: (row) => {
        const accId = row.credentials_id || row.id;
        const isRevealed = Boolean(revealedAccountNumbers[accId]);
        const displayVal = isRevealed
          ? revealedAccountNumbers[accId]
          : row.account_number_masked || row.account_number;

        return (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs sm:text-sm text-slate-800 font-semibold tracking-wider">
              {displayVal || "—"}
            </span>
            {isRevealed ? (
              <button
                type="button"
                onClick={() => {
                  setRevealedAccountNumbers((prev) => {
                    const next = { ...prev };
                    delete next[accId];
                    return next;
                  });
                }}
                className="text-slate-400 hover:text-slate-600 transition p-1 rounded"
                title="Hide number"
              >
                <EyeOff size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleRequestReveal(row)}
                className="text-slate-400 hover:text-emerald-700 transition p-1 rounded"
                title="Show number"
              >
                <Eye size={14} />
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      label: "Account Status",
      width: "15%",
      renderCell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "verification_status",
      label: "Verification Status",
      width: "15%",
      renderCell: (row) => <VerificationBadge status={row.verification_status} />,
    },
    {
      key: "action",
      label: "Action",
      width: "10%",
      headerClassName: "text-center",
      cellClassName: "text-center",
    },
  ];

  const sections = useMemo(
    () => [{ rows: paginatedAccounts }],
    [paginatedAccounts]
  );

  return (
    <div className="space-y-6">
      {/* ── Global Floating Toasts ─────────────────────────────────────────── */}
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* ── Breadcrumbs & Page Header ────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs
          items={[
            { label: "Logistics", path: "/warehouse-logistics/dashboard" },
            { label: "Online Payment Accounts" },
          ]}
        />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-bold tracking-[-0.03em] text-slate-900">
              Online Payment Accounts
            </h2>
            <p className="text-sm text-slate-500">
              Manage your verified disbursement accounts and secure payment transaction credentials.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenAddAccount}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0B5D1E] hover:bg-[#084b18] text-white font-semibold text-xs sm:text-sm shadow-xs transition cursor-pointer"
            >
              <Plus size={16} />
              <span>Add Account</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Tab & Account Counter ────────────────────────────────────────────── */}
      <div className="border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="pb-3 text-sm font-bold text-[#0B5D1E] border-b-2 border-[#0B5D1E] flex items-center gap-2 cursor-pointer"
          >
            <CreditCard size={16} />
            <span>Employee Online Payment Accounts</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800">
              {accounts.length}
            </span>
          </button>
        </div>
      </div>

      {/* ── Search & Filter Controls Row ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[240px] flex-1">
          <SearchFilter
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder="Search by Account Name, Number, or Bank..."
          />
        </div>

        <Dropdown
          label="Status"
          options={ACCOUNT_STATUS_OPTIONS}
          value={selectedStatus}
          onChange={(val) => {
            setSelectedStatus(val);
            setCurrentPage(1);
          }}
        />

        <Dropdown
          label="Type"
          options={ACCOUNT_TYPE_OPTIONS}
          value={selectedType}
          onChange={(val) => {
            setSelectedType(val);
            setCurrentPage(1);
          }}
        />

        <Dropdown
          label="Verification"
          options={VERIFICATION_STATUS_OPTIONS}
          value={selectedVerification}
          onChange={(val) => {
            setSelectedVerification(val);
            setCurrentPage(1);
          }}
        />

        <SortByDropdown
          options={SORT_OPTIONS}
          value={sortBy}
          onChange={(val) => {
            setSortBy(val);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* ── Table Card ───────────────────────────────────────────────────────── */}
      <div>
        <SectionedTableCard
          columns={columns}
          sections={sections}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onViewDetails={handleViewAccount}
          viewDetailsLabel="View Details"
          emptyStateTitle={isLoading ? "Loading payment accounts..." : "No payment accounts found"}
          emptyStateDescription={
            isLoading
              ? "Fetching your registered payment accounts..."
              : "No online payment accounts match the selected filters or search query."
          }
          footerLabel={
            filteredAccounts.length > 0
              ? `Showing ${(currentPage - 1) * itemsPerPage + 1}–${Math.min(
                  currentPage * itemsPerPage,
                  filteredAccounts.length
                )} of ${filteredAccounts.length} accounts`
              : "Showing 0 accounts"
          }
        />
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODALS ORCHESTRATION */}
      {/* ───────────────────────────────────────────────────────────── */}

      {/* 1. First-time Security Setup Modal */}
      {activeModal === "setup" && (
        <PaymentSecuritySetupModal
          isOpen={true}
          onClose={() => {
            if (hasSecurityPassword) {
              handleCloseAllModals();
            }
          }}
          userInfo={userInfo}
          apiBase="/warehouse/payment-accounts"
          onSetupSuccess={handleSetupSuccess}
        />
      )}

      {/* 2. Forgot Password Modal */}
      {activeModal === "forgot" && (
        <PaymentSecurityForgotModal
          isOpen={true}
          onClose={() => {
            if (passwordModalConfig?.actionType) {
              setActiveModal("password_prompt");
            } else {
              handleCloseAllModals();
            }
          }}
          userInfo={userInfo}
          apiBase="/warehouse/payment-accounts"
          onResetSuccess={handleForgotSuccess}
        />
      )}

      {/* 3. Reusable Security Password Prompt Modal */}
      {activeModal === "password_prompt" && (
        <PaymentSecurityPasswordModal
          isOpen={true}
          onClose={handleClosePasswordModal}
          title={passwordModalConfig.title}
          description={passwordModalConfig.description}
          confirmText={passwordModalConfig.confirmText}
          onAuthorize={handleExecutePasswordAction}
          onForgotPassword={handleOpenForgotPassword}
        />
      )}

      {/* 4. Add Payment Account Modal */}
      {activeModal === "add" && (
        <AddPaymentAccountModal
          isOpen={true}
          onClose={handleCloseAllModals}
          userInfo={userInfo}
          onProceedToVerification={handleProceedToScreening}
        />
      )}

      {/* 5. Face Screening & ID Verification Modal */}
      {activeModal === "face_screening" && pendingAddPayload && (
        <FaceScreeningModal
          isOpen={true}
          onClose={handleCloseAllModals}
          accountData={pendingAddPayload}
          userInfo={userInfo}
          title="Employee Identity Screening"
          endpoint="/warehouse/payment-accounts/my-accounts/create/"
          onAccountCreated={handleAccountCreated}
          onVerifyOnly={
            verifyingAccount
              ? async () => {
                  const accId = verifyingAccount.credentials_id || verifyingAccount.id;
                  const res = await request(
                    `/warehouse/payment-accounts/my-accounts/${accId}/verify/`,
                    {
                      method: "POST",
                    }
                  );
                  if (res && (res.success || res.ok)) {
                    showToast({
                      type: "success",
                      title: "Account Verified",
                      message: "Payment account has been successfully verified.",
                    });
                    loadAccounts();
                    setActiveModal(null);
                    setVerifyingAccount(null);
                    setPendingAddPayload(null);
                  } else {
                    showToast({
                      type: "error",
                      title: "Verification Failed",
                      message: res?.message || "Failed to verify account.",
                    });
                  }
                }
              : null
          }
        />
      )}

      {/* 6. View Account Details Modal */}
      {activeModal === "view" && selectedAccount && (
        <ViewPaymentAccountModal
          isOpen={true}
          onClose={handleCloseAllModals}
          account={selectedAccount}
          revealedAccountNumber={
            revealedAccountNumbers[selectedAccount.credentials_id || selectedAccount.id]
          }
          onRequestReveal={() => handleRequestReveal(selectedAccount)}
          onHideAccountNumber={() => {
            const accId = selectedAccount.credentials_id || selectedAccount.id;
            setRevealedAccountNumbers((prev) => {
              const updated = { ...prev };
              delete updated[accId];
              return updated;
            });
          }}
          onOpenVerify={() => handleStartVerifyExisting(selectedAccount)}
          onOpenEdit={() => handleEditAccountPrompt(selectedAccount)}
          onOpenArchive={() => handleArchivePrompt(selectedAccount)}
          onOpenRestore={() => handleRestorePrompt(selectedAccount)}
        />
      )}

      {/* 7. Edit Account Details Modal */}
      {activeModal === "edit" && selectedAccount && (
        <EditPaymentAccountModal
          isOpen={true}
          onClose={() => setActiveModal("view")}
          account={selectedAccount}
          onSuccess={handleEditSaveSuccess}
        />
      )}

      {/* 8. Archive Reason Modal */}
      {activeModal === "archive" && selectedAccount && (
        <ArchiveReasonModal
          isOpen={true}
          onClose={() => setActiveModal("view")}
          account={selectedAccount}
          accountType="employee"
          authToken={actionAuthTokens[`archive_${selectedAccount.credentials_id || selectedAccount.id}`]}
          onConfirmArchive={handleConfirmArchive}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GCASH AUTO-PREFIX HELPER
// ─────────────────────────────────────────────────────────────
const formatGCashNumber = (val) => {
  if (!val) return "09";
  let digits = val.replace(/\D/g, "");
  if (digits.startsWith("639")) {
    digits = "09" + digits.slice(3);
  } else if (digits.startsWith("9")) {
    digits = "09" + digits.slice(1);
  } else if (!digits.startsWith("09")) {
    digits = "09" + digits.replace(/^0+/, "");
  }
  if (digits.length < 2) {
    digits = "09";
  }
  return digits.slice(0, 11);
};

// ─────────────────────────────────────────────────────────────
// SUB-MODAL 1: ADD PAYMENT ACCOUNT MODAL
// ─────────────────────────────────────────────────────────────
function AddPaymentAccountModal({ isOpen, onClose, userInfo, onProceedToVerification }) {
  const { request } = useApi();

  const [accountType, setAccountType] = useState("bank");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState(PHILIPPINE_BANKS[0]);
  const [customBankName, setCustomBankName] = useState("");
  const [cardType, setCardType] = useState("Debit Card");
  const [isDefault, setIsDefault] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAccountType("bank");
      setAccountName(userInfo?.full_name || "");
      setAccountNumber("");
      setBankName(PHILIPPINE_BANKS[0]);
      setCustomBankName("");
      setCardType("Debit Card");
      setIsDefault(false);
      setErrorMessage("");
      setIsDuplicate(false);
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen, userInfo]);

  if (!isOpen) return null;

  const handleAccountNumberBlur = async () => {
    if (!accountNumber.trim()) return;
    setIsCheckingDuplicate(true);
    setIsDuplicate(false);
    try {
      const res = await request("/warehouse/payment-accounts/branches/check-duplicate/", {
        method: "POST",
        body: { account_number: accountNumber.trim() },
      });
      if (res && res.is_duplicate) {
        setIsDuplicate(true);
        setErrorMessage("An active payment account with this number already exists.");
      } else {
        setIsDuplicate(false);
      }
    } catch {
      // ignore
    } finally {
      setIsCheckingDuplicate(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!accountName.trim()) {
      setErrorMessage("Account name is required.");
      return;
    }
    if (!accountNumber.trim()) {
      setErrorMessage("Account number is required.");
      return;
    }

    const cleanNum = accountNumber.replace(/\D/g, "");
    if (accountType === "gcash") {
      if (cleanNum.length !== 11 || !cleanNum.startsWith("09")) {
        setErrorMessage("GCash number must be an 11-digit mobile number starting with 09.");
        return;
      }
    } else {
      if (cleanNum.length < 10 || cleanNum.length > 16) {
        setErrorMessage("Bank account number must be between 10 and 16 digits.");
        return;
      }
    }

    // Duplicate check before proceeding
    setIsCheckingDuplicate(true);
    try {
      const checkRes = await request("/warehouse/payment-accounts/branches/check-duplicate/", {
        method: "POST",
        body: { account_number: accountNumber.trim() },
      });
      if (checkRes && checkRes.is_duplicate) {
        setErrorMessage("An active payment account with this number already exists.");
        setIsDuplicate(true);
        setIsCheckingDuplicate(false);
        return;
      }
    } catch {
      // proceed
    } finally {
      setIsCheckingDuplicate(false);
    }

    const resolvedBankName =
      accountType === "gcash"
        ? "GCash"
        : bankName === "Other Bank"
        ? customBankName.trim() || "Other Bank"
        : bankName;

    const payload = {
      account_name: accountName.trim(),
      type: accountType,
      account_type: accountType,
      platform_name: accountType === "gcash" ? "GCash" : resolvedBankName,
      bank_name: resolvedBankName,
      card_type: accountType === "bank" ? cardType : null,
      account_number: cleanNum,
      is_default: isDefault,
    };

    onProceedToVerification(payload);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-slate-50/50">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Add Online Payment Account
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Register a verified disbursement account for allowances and reimbursements.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-5 overflow-y-auto space-y-4 flex-1">
            {errorMessage && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <AlertCircle size={16} className="shrink-0 text-rose-500 mt-0.5" />
                <div className="flex-1 font-medium">{errorMessage}</div>
              </div>
            )}

            {/* Account Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Account Type <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAccountType("bank");
                    if (accountNumber === "09") setAccountNumber("");
                    setErrorMessage("");
                  }}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-semibold text-xs transition cursor-pointer ${
                    accountType === "bank"
                      ? "border-[#0B5D1E] bg-emerald-50/50 text-[#0B5D1E]"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <CreditCard size={16} />
                  <span>Bank Account</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAccountType("gcash");
                    setAccountNumber((prev) => formatGCashNumber(prev));
                    setErrorMessage("");
                  }}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-semibold text-xs transition cursor-pointer ${
                    accountType === "gcash"
                      ? "border-[#0B5D1E] bg-emerald-50/50 text-[#0B5D1E]"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Smartphone size={16} />
                  <span>GCash</span>
                </button>
              </div>
            </div>

            {/* Account Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Account Holder Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => {
                  setAccountName(e.target.value);
                  setErrorMessage("");
                }}
                placeholder="Full name as printed on card or ID"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-800"
              />
            </div>

            {/* Bank Fields (Conditional) */}
            {accountType === "bank" && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Bank Name <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-800"
                  >
                    {PHILIPPINE_BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                {bankName === "Other Bank" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Specify Bank Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customBankName}
                      onChange={(e) => setCustomBankName(e.target.value)}
                      placeholder="Enter bank name"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-800"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Card / Account Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={cardType}
                    onChange={(e) => setCardType(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-800"
                  >
                    {CARD_TYPES.map((ct) => (
                      <option key={ct} value={ct}>
                        {ct}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Account Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {accountType === "gcash" ? "GCash Mobile Number" : "Bank Account Number"}{" "}
                <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={accountNumber}
                  maxLength={accountType === "gcash" ? 11 : 16}
                  inputMode="numeric"
                  onChange={(e) => {
                    const raw = e.target.value;
                    setErrorMessage("");
                    setIsDuplicate(false);
                    if (accountType === "gcash") {
                      setAccountNumber(formatGCashNumber(raw));
                    } else {
                      setAccountNumber(raw.replace(/\D/g, "").slice(0, 16));
                    }
                  }}
                  onFocus={() => {
                    if (accountType === "gcash" && (!accountNumber || !accountNumber.startsWith("09"))) {
                      setAccountNumber("09");
                    }
                  }}
                  onBlur={handleAccountNumberBlur}
                  placeholder={
                    accountType === "gcash"
                      ? "09XXXXXXXXX (11 digits)"
                      : "Enter 10 to 16-digit account number"
                  }
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 font-mono font-medium text-slate-800 ${
                    isDuplicate
                      ? "border-rose-400 focus:ring-rose-500"
                      : "border-slate-200 focus:ring-emerald-500"
                  }`}
                />
                {isCheckingDuplicate && (
                  <Loader2
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin"
                  />
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                <span>
                  {accountType === "gcash"
                    ? "Standard Philippine mobile format starting with 09."
                    : "Numbers only without hyphens or spaces."}
                </span>
                <span className="font-mono">
                  {(accountNumber || "").length}/{accountType === "gcash" ? 11 : 16}
                </span>
              </div>
            </div>

            {/* Set as Default */}
            <div className="pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded text-[#0B5D1E] focus:ring-emerald-500 h-4 w-4"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Set as primary default account for payouts
                </span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-200/70 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isCheckingDuplicate}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#0B5D1E] hover:bg-[#084b18] rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <span>Proceed to Verification</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────
// SUB-MODAL 2: VIEW PAYMENT ACCOUNT MODAL
// ─────────────────────────────────────────────────────────────
function ViewPaymentAccountModal({
  isOpen,
  onClose,
  account,
  revealedAccountNumber,
  onRequestReveal,
  onHideAccountNumber,
  onOpenVerify,
  onOpenEdit,
  onOpenArchive,
  onOpenRestore,
}) {
  if (!isOpen || !account) return null;

  const isGcash = (account.type || account.account_type || "").toLowerCase() === "gcash";
  const isArchived = (account.status || "active").toLowerCase() === "archived";
  const isVerified = (account.verification_status || "unverified").toLowerCase() === "verified";
  const accNumberDisplay = revealedAccountNumber || account.account_number_masked || account.account_number;

  return createPortal(
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-slate-50/50">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Payment Account Details
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Registered Employee Disbursement Account
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto space-y-4 flex-1">
          {/* Card Snapshot Header */}
          <div className="p-4 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/50 flex items-center gap-3.5">
            <div
              className={`p-3 rounded-xl shrink-0 ${
                isGcash ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-[#0B5D1E]"
              }`}
            >
              {isGcash ? <Smartphone size={24} /> : <CreditCard size={24} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm sm:text-base truncate">
                  {account.account_name}
                </span>
                {account.is_default && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Primary
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                {isGcash ? "GCash E-Wallet" : account.bank_name || "Bank Account"}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <StatusBadge status={account.status} />
              <VerificationBadge status={account.verification_status} />
            </div>
          </div>

          {/* Details Table */}
          <div className="space-y-1">
            <ModalDetailRow label="Account Type" value={isGcash ? "GCash" : "Bank Account"} />
            {!isGcash && (
              <ModalDetailRow label="Bank Name" value={account.bank_name || "—"} />
            )}
            {!isGcash && account.card_type && (
              <ModalDetailRow label="Card / Account Type" value={account.card_type} />
            )}
            <ModalDetailRow label="Account Number">
              <div className="flex items-center gap-2 font-mono text-xs sm:text-sm font-bold text-slate-800">
                <span>{accNumberDisplay || "—"}</span>
                {revealedAccountNumber ? (
                  <button
                    type="button"
                    onClick={onHideAccountNumber}
                    className="text-slate-400 hover:text-slate-600 transition p-1 rounded cursor-pointer"
                    title="Hide number"
                  >
                    <EyeOff size={14} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onRequestReveal}
                    className="text-slate-400 hover:text-emerald-700 transition p-1 rounded cursor-pointer"
                    title="Reveal number"
                  >
                    <Eye size={14} />
                  </button>
                )}
              </div>
            </ModalDetailRow>

            {account.archive_reason && isArchived && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 mt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Archive Reason:
                </span>
                <p className="text-xs text-slate-700 font-medium mt-0.5 break-words">
                  {account.archive_reason}
                </p>
              </div>
            )}
          </div>

          {/* Verification Callout if not verified */}
          {!isVerified && !isArchived && (
            <div className="flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-amber-50/70 text-xs">
              <div className="flex items-center gap-2 text-amber-800 font-medium">
                <ShieldAlert size={16} className="text-amber-600 shrink-0" />
                <span>Account requires biometric identity verification.</span>
              </div>
              <button
                type="button"
                onClick={onOpenVerify}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs transition cursor-pointer shrink-0"
              >
                Verify Now
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            {!isArchived ? (
              <button
                type="button"
                onClick={onOpenArchive}
                className="px-3.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Archive size={14} />
                <span>Archive</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenRestore}
                className="px-3.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Restore</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isArchived && (
              <button
                type="button"
                onClick={onOpenEdit}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Edit2 size={14} />
                <span>Edit Account</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────
// SUB-MODAL 3: EDIT PAYMENT ACCOUNT MODAL
// ─────────────────────────────────────────────────────────────
function EditPaymentAccountModal({ isOpen, onClose, account, onSuccess }) {
  const { request } = useApi();

  const [accountType, setAccountType] = useState("bank");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState(PHILIPPINE_BANKS[0]);
  const [customBankName, setCustomBankName] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && account) {
      const isGcash = (account.type || account.account_type || "").toLowerCase() === "gcash";
      setAccountType(isGcash ? "gcash" : "bank");
      setAccountName(account.account_name || "");
      setAccountNumber("");
      const resolvedBank = account.bank_name || PHILIPPINE_BANKS[0];
      if (PHILIPPINE_BANKS.includes(resolvedBank)) {
        setBankName(resolvedBank);
        setCustomBankName("");
      } else {
        setBankName("Other Bank");
        setCustomBankName(resolvedBank);
      }
      setIsDefault(Boolean(account.is_default));
      setErrorMessage("");
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen, account]);

  if (!isOpen || !account) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!accountName.trim()) {
      setErrorMessage("Account name is required.");
      return;
    }

    let cleanNum = "";
    if (accountNumber.trim()) {
      cleanNum = accountNumber.replace(/\D/g, "");
      if (accountType === "gcash") {
        if (cleanNum.length !== 11 || !cleanNum.startsWith("09")) {
          setErrorMessage("GCash number must be an 11-digit mobile number starting with 09.");
          return;
        }
      } else {
        if (cleanNum.length < 10 || cleanNum.length > 16) {
          setErrorMessage("Bank account number must be between 10 and 16 digits.");
          return;
        }
      }
    }

    setIsSaving(true);
    const resolvedBankName =
      accountType === "gcash"
        ? "GCash"
        : bankName === "Other Bank"
        ? customBankName.trim() || "Other Bank"
        : bankName;

    const accId = account.credentials_id || account.id;
    try {
      const res = await request(
        `/warehouse/payment-accounts/my-accounts/${accId}/update/`,
        {
          method: "PUT",
          body: {
            account_name: accountName.trim(),
            type: accountType,
            platform_name: accountType === "gcash" ? "GCash" : resolvedBankName,
            bank_name: resolvedBankName,
            account_number: cleanNum,
            is_default: isDefault,
          },
        }
      );

      if (res && res.success) {
        onSuccess();
      } else {
        setErrorMessage(res?.message || "Failed to update account.");
      }
    } catch (err) {
      setErrorMessage(err?.message || "An error occurred while updating the account.");
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-slate-50/50">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Edit Payment Account
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Update registered account information.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-5 overflow-y-auto space-y-4 flex-1">
            {errorMessage && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <AlertCircle size={16} className="shrink-0 text-rose-500 mt-0.5" />
                <div className="flex-1 font-medium">{errorMessage}</div>
              </div>
            )}

            {/* Account Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Account Holder Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => {
                  setAccountName(e.target.value);
                  setErrorMessage("");
                }}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-800"
              />
            </div>

            {/* Bank Fields */}
            {accountType === "bank" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Bank Name <span className="text-rose-500">*</span>
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-800"
                >
                  {PHILIPPINE_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Account Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                New Account Number (Leave blank to keep existing)
              </label>
              <input
                type="text"
                value={accountNumber}
                maxLength={accountType === "gcash" ? 11 : 16}
                inputMode="numeric"
                onChange={(e) => {
                  const val = e.target.value;
                  setErrorMessage("");
                  if (accountType === "gcash") {
                    if (!val) {
                      setAccountNumber("");
                    } else {
                      setAccountNumber(formatGCashNumber(val));
                    }
                  } else {
                    setAccountNumber(val.replace(/\D/g, "").slice(0, 16));
                  }
                }}
                onFocus={() => {
                  if (accountType === "gcash" && !accountNumber) {
                    setAccountNumber("09");
                  }
                }}
                placeholder={account.account_number_masked || "Keep existing number"}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-medium text-slate-800"
              />
              {accountType === "gcash" && accountNumber && (
                <p className="text-right text-[11px] text-slate-400 mt-1 font-mono">
                  {accountNumber.length}/11
                </p>
              )}
            </div>

            {/* Default Switch */}
            <div className="pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded text-[#0B5D1E] focus:ring-emerald-500 h-4 w-4"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Set as primary default account
                </span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-200/70 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#0B5D1E] hover:bg-[#084b18] rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
