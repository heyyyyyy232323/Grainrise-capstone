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

export default function MillerDriverOnlinePaymentAccounts() {
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
    actionType: null, // 'reveal' | 'edit_authorize' | 'archive_authorize' | 'restore'
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
      const res = await request("/miller/payment-accounts/security/status/", {
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
      console.error("Failed to check security status:", err);
    } finally {
      setIsCheckingSecurity(false);
    }
  }, [request]);

  useEffect(() => {
    checkSecurityStatus();
  }, [checkSecurityStatus]);

  // ─────────────────────────────────────────────────────────────
  // 2. FETCH DRIVER PAYMENT ACCOUNTS
  // ─────────────────────────────────────────────────────────────
  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await request("/miller/payment-accounts/my-accounts/", {
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
      console.error("Failed to load payment accounts:", err);
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
  // 3. FILTERING & SORTING
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
      `/miller/payment-accounts/my-accounts/${accId}/archive/`,
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
      return { success: true };
    } else {
      return {
        success: false,
        message: res?.message || "Failed to archive payment account.",
      };
    }
  };

  const handleRestorePrompt = (account) => {
    setSelectedAccount(account);
    setPasswordModalConfig({
      title: "Authorize Account Restore",
      description: "Enter your payment security password to restore this archived account.",
      confirmText: "Restore Account",
      actionType: "restore",
      targetAccount: account,
    });
    setActiveModal("password_prompt");
  };

  const handleClosePasswordModal = () => {
    setActiveModal("view");
  };

  // Generic handler executing authorized actions after password prompt
  const handleExecutePasswordAction = async (password) => {
    const { actionType, targetAccount } = passwordModalConfig;
    const accId = targetAccount?.credentials_id || targetAccount?.id;

    if (actionType === "reveal") {
      const res = await request(
        `/miller/payment-accounts/my-accounts/${accId}/reveal/`,
        {
          method: "POST",
          body: { password },
        }
      );
      if (res && res.success) {
        setRevealedAccountNumbers((prev) => ({
          ...prev,
          [accId]: res.account_number,
        }));
        showToast({
          type: "success",
          title: "Account Number Revealed",
          message: "Unmasked account number is now visible.",
        });
        setActiveModal("view");
        return { success: true };
      }
      return res;
    }

    if (actionType === "edit_authorize") {
      const res = await request("/miller/payment-accounts/security/authorize-action/", {
        method: "POST",
        body: {
          password,
          action: "edit_employee_account",
          account_id: accId,
        },
      });
      if (res && res.success) {
        setActionAuthTokens((prev) => ({
          ...prev,
          [`edit_${accId}`]: res.auth_token,
        }));
        setActiveModal("edit");
        return { success: true };
      }
      return res;
    }

    if (actionType === "archive_authorize") {
      const res = await request("/miller/payment-accounts/security/authorize-action/", {
        method: "POST",
        body: {
          password,
          action: "archive_employee_account",
          account_id: accId,
        },
      });
      if (res && res.success) {
        setActionAuthTokens((prev) => ({
          ...prev,
          [`archive_${accId}`]: res.auth_token,
        }));
        setActiveModal("archive");
        return { success: true };
      }
      return res;
    }

    if (actionType === "restore") {
      const res = await request(
        `/miller/payment-accounts/my-accounts/${accId}/restore/`,
        {
          method: "POST",
          body: { password },
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
        return { success: true };
      }
      return res;
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 5. TABLE COLUMNS DEFINITION
  // ─────────────────────────────────────────────────────────────
  const columns = [
    {
      key: "account_name",
      label: "Account Name",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-slate-700">
            {row.account_name || "—"}
          </span>
          {row.is_default && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              Default
            </span>
          )}
        </div>
      ),
    },
    {
      key: "account_type",
      label: "Type",
      render: (row) => {
        const accType = (row.account_type || row.type || "bank").toLowerCase();
        return (
          <div className="flex items-center gap-1.5 capitalize text-[13px] font-medium text-slate-700">
            {accType === "gcash" ? (
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
            )}
            <span>{row.type_display || (accType === "gcash" ? "GCash" : "Bank")}</span>
            {row.bank_name && row.bank_name !== "—" && (
              <span className="text-[11px] text-gray-400">({row.bank_name})</span>
            )}
          </div>
        );
      },
    },
    {
      key: "account_number",
      label: "Account Number",
      render: (row) => {
        const accId = row.credentials_id || row.id;
        const revealed = revealedAccountNumbers[accId];
        return (
          <span className="text-[13px] font-mono text-slate-600">
            {revealed || row.account_number_masked || "—"}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Account Status",
      render: (row) => {
        const isArchived = row.status === "archived";
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
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
            {row.status || "Active"}
          </span>
        );
      },
    },
    {
      key: "verification_status",
      label: "Verification Status",
      render: (row) => {
        const norm = (row.verification_status || "").toLowerCase();
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
            {row.verification_status || "Unverified"}
          </span>
        );
      },
    },
    {
      key: "action",
      label: "Action",
      align: "center",
    },
  ];

  const sections = useMemo(
    () => [{ rows: paginatedAccounts }],
    [paginatedAccounts]
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: "Dashboard", path: "/miller-driver/dashboard" },
          { label: "Online Payment Accounts" },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Online Payment Accounts
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Manage your authorized payout credentials and online payment destinations.
          </p>
        </div>
      </div>

      {/* Tabs & Actions Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <Tabs
          tabs={[
            {
              id: "driver",
              label: `Driver Online Payment Accounts (${accounts.length})`,
            },
          ]}
          activeTab="driver"
          onTabChange={() => {}}
        />

        <div className="flex shrink-0 items-center gap-2 sm:pt-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 border border-gray-200 rounded-full text-xs font-semibold text-gray-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span>{accounts.length} accounts</span>
          </div>
          <button
            type="button"
            onClick={handleOpenAddAccount}
            className="flex items-center justify-center gap-1.5 bg-[#0B5D1E] hover:bg-[#084b18] text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap shadow-xs"
          >
            <Plus size={16} /> Add Account
          </button>
        </div>
      </div>

      {/* Filter Bar & Sectioned Table Card */}
      <div className="space-y-4">
        {/* Filter Bar */}
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-2.5 w-full">
          {/* Search */}
          <div className="w-full sm:w-auto flex-1 min-w-[200px]">
            <SearchFilter
              value={search}
              onChange={(v) => {
                setSearch(v);
                setCurrentPage(1);
              }}
              placeholder="Search account name, number, bank..."
            />
          </div>

          {/* Account Status Filter */}
          <div className="w-full sm:w-auto shrink-0 min-w-[120px]">
            <Dropdown
              options={ACCOUNT_STATUS_OPTIONS}
              value={selectedStatus}
              onChange={(v) => {
                setSelectedStatus(v);
                setCurrentPage(1);
              }}
              placeholder="Status"
            />
          </div>

          {/* Account Type Filter */}
          <div className="w-full sm:w-auto shrink-0 min-w-[120px]">
            <Dropdown
              options={ACCOUNT_TYPE_OPTIONS}
              value={selectedType}
              onChange={(v) => {
                setSelectedType(v);
                setCurrentPage(1);
              }}
              placeholder="Type"
            />
          </div>

          {/* Verification Status Filter */}
          <div className="w-full sm:w-auto shrink-0 min-w-[140px]">
            <Dropdown
              options={VERIFICATION_STATUS_OPTIONS}
              value={selectedVerification}
              onChange={(v) => {
                setSelectedVerification(v);
                setCurrentPage(1);
              }}
              placeholder="Verification"
            />
          </div>

          {/* Sort By Dropdown */}
          <div className="w-full sm:w-auto shrink-0 min-w-[170px]">
            <SortByDropdown
              options={SORT_OPTIONS}
              value={sortBy}
              onChange={(v) => {
                setSortBy(v);
                setCurrentPage(1);
              }}
              placeholder="Sort By"
            />
          </div>
        </div>

        {/* Sectioned Table Card */}
        <SectionedTableCard
          columns={columns}
          sections={sections}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onViewDetails={handleViewAccount}
          viewDetailsLabel="View Details"
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
          title="Driver Identity Screening"
          endpoint="/miller/payment-accounts/my-accounts/create/"
          onAccountCreated={handleAccountCreated}
          onVerifyOnly={
            verifyingAccount
              ? async () => {
                  const accId = verifyingAccount.credentials_id || verifyingAccount.id;
                  const res = await request(
                    `/miller/payment-accounts/my-accounts/${accId}/verify/`,
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
// SUB-MODAL 1: ADD PAYMENT ACCOUNT MODAL
// Exact UI/UX styled after AddBranchAccountModal with "Proceed to Verification"
// ─────────────────────────────────────────────────────────────
function AddPaymentAccountModal({ isOpen, onClose, userInfo, onProceedToVerification }) {
  const { request } = useApi();

  const [accountType, setAccountType] = useState("bank"); // 'bank' | 'gcash'
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

  // Real-time check when complete account number is entered
  useEffect(() => {
    let isMounted = true;
    const cleanNum =
      accountType === "gcash"
        ? accountNumber.replace(/\D/g, "")
        : accountNumber.replace(/[\s\-\.]/g, "");

    const effectiveBankName =
      accountType === "bank"
        ? bankName === "Other Bank"
          ? customBankName.trim()
          : bankName
        : null;

    const isComplete =
      accountType === "gcash"
        ? cleanNum.length === 11 && cleanNum.startsWith("09")
        : cleanNum.length >= 6 && Boolean(effectiveBankName);

    if (!isComplete) {
      setIsDuplicate(false);
      setErrorMessage((prev) =>
        prev === "This payment account is already registered in GRAINRISE." ? "" : prev
      );
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await request("/miller/payment-accounts/branches/check-duplicate/", {
          method: "POST",
          body: {
            account_type: accountType,
            account_number: cleanNum,
            bank_name: effectiveBankName,
          },
        });

        if (!isMounted) return;

        if (res && res.is_duplicate) {
          setIsDuplicate(true);
          setErrorMessage("This payment account is already registered in GRAINRISE.");
        } else {
          setIsDuplicate(false);
          setErrorMessage((prev) =>
            prev === "This payment account is already registered in GRAINRISE." ? "" : prev
          );
        }
      } catch (err) {
        console.error("Duplicate check error:", err);
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [accountType, accountNumber, bankName, customBankName, request]);

  if (!isOpen) return null;

  const handleClear = () => {
    setAccountName("");
    setAccountNumber("");
    setCustomBankName("");
    setIsDefault(false);
    setErrorMessage("");
    setIsDuplicate(false);
  };

  const handleProceed = async (e) => {
    e?.preventDefault();
    setErrorMessage("");

    if (!accountName.trim()) {
      setErrorMessage("Please enter the registered account holder name.");
      return;
    }

    if (accountName.trim().length > 60) {
      setErrorMessage("Account Name cannot exceed 60 characters.");
      return;
    }

    if (!accountNumber.trim()) {
      setErrorMessage("Please enter the account or mobile number.");
      return;
    }

    const cleanNum =
      accountType === "gcash"
        ? accountNumber.replace(/\D/g, "")
        : accountNumber.replace(/[\s\-\.]/g, "");

    if (accountType === "gcash") {
      if (!/^09\d{9}$/.test(cleanNum)) {
        setErrorMessage("GCash number must be exactly 11 numeric digits starting with 09 (e.g. 09171234567).");
        return;
      }
    } else {
      if (cleanNum.length < 6 || cleanNum.length > 30) {
        setErrorMessage("Bank account number must be between 6 and 30 characters.");
        return;
      }
      if (!bankName) {
        setErrorMessage("Please select or enter the bank name.");
        return;
      }
      if (bankName === "Other Bank" && !customBankName.trim()) {
        setErrorMessage("Please specify the bank name.");
        return;
      }
    }

    const effectiveBankName =
      accountType === "bank"
        ? bankName === "Other Bank"
          ? customBankName.trim()
          : bankName
        : null;

    // Check duplicate once more before proceeding to screening
    setIsCheckingDuplicate(true);
    try {
      const checkRes = await request("/miller/payment-accounts/branches/check-duplicate/", {
        method: "POST",
        body: {
          account_type: accountType,
          account_number: cleanNum,
          bank_name: effectiveBankName,
        },
      });

      if (checkRes && checkRes.is_duplicate) {
        setIsDuplicate(true);
        setErrorMessage("This payment account is already registered in GRAINRISE.");
        setIsCheckingDuplicate(false);
        return;
      }
    } catch (err) {
      console.error("Duplicate check failed:", err);
    } finally {
      setIsCheckingDuplicate(false);
    }

    const payload = {
      type: accountType,
      account_type: accountType,
      platform_name: accountType === "gcash" ? "GCash" : effectiveBankName,
      bank_name: effectiveBankName,
      account_name: accountName.trim(),
      account_number: cleanNum,
      card_type: accountType === "bank" ? cardType : null,
      is_default: isDefault,
    };

    onProceedToVerification(payload);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CreditCard size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Add Payment Account
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleProceed} className="p-6 space-y-4 overflow-y-auto">
          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-xs">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Account Type Selector (GCash / Bank) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Account Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAccountType("bank")}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition cursor-pointer ${
                  accountType === "bank"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                <CreditCard size={16} />
                <span>Bank Account</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAccountType("gcash");
                  setAccountNumber((prev) => prev.replace(/\D/g, "").slice(0, 11));
                  setErrorMessage("");
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition cursor-pointer ${
                  accountType === "gcash"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                <Smartphone size={16} />
                <span>GCash</span>
              </button>
            </div>
          </div>

          {/* Bank-specific Fields */}
          {accountType === "bank" && (
            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bank Name <span className="text-rose-500">*</span>
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Specify Bank Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customBankName}
                    maxLength={100}
                    onChange={(e) => setCustomBankName(e.target.value.slice(0, 100))}
                    placeholder="Enter official bank name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account / Card Type
                </label>
                <select
                  value={cardType}
                  onChange={(e) => setCardType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                >
                  {CARD_TYPES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Account Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Account Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={accountName}
              maxLength={60}
              onChange={(e) => {
                setAccountName(e.target.value.slice(0, 60));
                setErrorMessage("");
              }}
              placeholder="e.g. Juan Dela Cruz"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            />
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {accountType === "gcash" ? "GCash Mobile Number" : "Account Number"}{" "}
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={accountNumber}
              maxLength={accountType === "gcash" ? 11 : 30}
              inputMode={accountType === "gcash" ? "numeric" : "text"}
              onChange={(e) => {
                let val = e.target.value;
                if (accountType === "gcash") {
                  val = val.replace(/\D/g, "").slice(0, 11);
                }
                setAccountNumber(val);
                setErrorMessage("");
              }}
              placeholder={accountType === "gcash" ? "09171234567" : "Enter bank account number"}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition font-mono ${
                isDuplicate ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
              }`}
            />
          </div>

          {/* Set as Primary Default Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="set_default"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
            />
            <label htmlFor="set_default" className="text-xs font-medium text-slate-700 cursor-pointer">
              Set as primary/default payout account
            </label>
          </div>

          {/* Verification Notice Banner */}
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong>Identity Screening Required:</strong> Next, you'll complete a quick Government ID OCR scan and browser face liveness check to verify this account.
            </span>
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              Clear
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isCheckingDuplicate || isDuplicate}
                className="px-6 py-2 rounded-xl bg-[#0B5D1E] hover:bg-[#084b18] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                {isCheckingDuplicate ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <>
                    <span>Proceed to Verification</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────
// SUB-MODAL 2: VIEW PAYMENT ACCOUNT MODAL
// Exact UI/UX styled after ViewBranchAccountModal with "Verify Account" action
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
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  if (!isOpen || !account) return null;

  const isArchived = account.status === "archived";
  const isVerified = (account.verification_status || "").toLowerCase() === "verified";
  const displayAccountNumber =
    revealedAccountNumber || account.account_number_masked || account.account_number;
  const isRevealed = Boolean(revealedAccountNumber);
  const accType = (account.account_type || account.type || "bank").toLowerCase();

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              {accType === "gcash" ? <Smartphone size={20} /> : <CreditCard size={20} />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {account.account_name || "Payment Account Details"}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {accType === "gcash" ? "GCash" : (account.bank_name || "Bank")} • Online Payment Account
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Unverified Action Banner */}
          {!isVerified && !isArchived && (
            <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start sm:items-center gap-2.5 text-amber-900">
                <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                <span>
                  <strong>Unverified Account:</strong> Complete identity screening with Government ID and face verification to enable verified payouts.
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenVerify}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-[#0B5D1E] hover:bg-[#084b18] text-white font-bold rounded-lg shrink-0 transition shadow-xs cursor-pointer"
              >
                <ShieldCheck size={14} />
                <span>Verify Now</span>
              </button>
            </div>
          )}

          {/* Status Header Strip */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Status:</span>
              <StatusBadge status={account.status} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Verification:</span>
              <VerificationBadge status={account.verification_status} />
            </div>
          </div>

          {/* Details Card */}
          <div className="p-4 rounded-xl border border-slate-200/80 bg-white space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Account Information
            </h3>

            <ModalDetailRow label="Account Name" value={account.account_name} />
            <ModalDetailRow
              label="Account Type"
              value={accType === "gcash" ? "GCash Mobile Wallet" : "Bank Account"}
            />
            {accType === "bank" && (
              <ModalDetailRow label="Bank Name" value={account.bank_name || "Bank"} />
            )}
            <ModalDetailRow label="Primary / Default" value={account.is_default ? "Yes" : "No"} />

            {/* Account Number with Reveal/Hide */}
            <ModalDetailRow label="Account Number">
              <div className="flex items-center gap-2 justify-end">
                <span className="font-mono text-xs sm:text-sm font-semibold text-slate-800">
                  {displayAccountNumber}
                </span>
                {isRevealed ? (
                  <button
                    type="button"
                    onClick={onHideAccountNumber}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    title="Hide account number"
                  >
                    <EyeOff size={15} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onRequestReveal}
                    className="p-1 rounded-md text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition cursor-pointer"
                    title="Reveal account number"
                  >
                    <Eye size={15} />
                  </button>
                )}
              </div>
            </ModalDetailRow>

            <ModalDetailRow label="Created At" value={account.created_at || "—"} />

            {account.archive_reason && (
              <ModalDetailRow label="Archive Reason" value={account.archive_reason} />
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            {!isArchived ? (
              <button
                type="button"
                onClick={onOpenArchive}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
              >
                <Archive size={14} />
                <span>Archive</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenRestore}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border border-emerald-200 transition cursor-pointer"
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
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 transition cursor-pointer shadow-xs"
              >
                <Edit2 size={14} />
                <span>Edit Account</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition cursor-pointer"
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
// Exact UI/UX styled after EditBranchAccountModal
// ─────────────────────────────────────────────────────────────
function EditPaymentAccountModal({ isOpen, onClose, account, onSuccess }) {
  const { request } = useApi();

  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [customBankName, setCustomBankName] = useState("");
  const [cardType, setCardType] = useState("Debit Card");
  const [isDefault, setIsDefault] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const accType = (account?.account_type || account?.type || "bank").toLowerCase();

  useEffect(() => {
    if (isOpen && account) {
      setAccountName(account.account_name || "");
      setAccountNumber("");
      const isKnownBank = PHILIPPINE_BANKS.includes(account.bank_name);
      if (account.bank_name) {
        if (isKnownBank) {
          setBankName(account.bank_name);
          setCustomBankName("");
        } else {
          setBankName("Other Bank");
          setCustomBankName(account.bank_name);
        }
      } else {
        setBankName(PHILIPPINE_BANKS[0]);
        setCustomBankName("");
      }
      setCardType(account.card_type || "Debit Card");
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
    e?.preventDefault();
    setErrorMessage("");

    if (!accountName.trim()) {
      setErrorMessage("Please enter the registered account holder name.");
      return;
    }

    const effectiveBankName =
      accType === "bank"
        ? bankName === "Other Bank"
          ? customBankName.trim()
          : bankName
        : null;

    let cleanNum = "";
    if (accountNumber.trim()) {
      cleanNum =
        accType === "gcash"
          ? accountNumber.replace(/\D/g, "")
          : accountNumber.replace(/[\s\-\.]/g, "");

      if (accType === "gcash" && !/^09\d{9}$/.test(cleanNum)) {
        setErrorMessage("GCash number must be exactly 11 digits starting with 09.");
        return;
      }
      if (accType === "bank" && (cleanNum.length < 6 || cleanNum.length > 30)) {
        setErrorMessage("Bank account number must be between 6 and 30 characters.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const accId = account.credentials_id || account.id;
      const res = await request(
        `/miller/payment-accounts/my-accounts/${accId}/update/`,
        {
          method: "PUT",
          body: {
            type: accType,
            platform_name: accType === "gcash" ? "GCash" : effectiveBankName,
            bank_name: effectiveBankName,
            account_name: accountName.trim(),
            account_number: cleanNum,
            is_default: isDefault,
          },
        }
      );

      if (res && (res.success || res.ok)) {
        onSuccess();
      } else {
        setErrorMessage(res?.message || "Failed to update payment account.");
      }
    } catch (err) {
      console.error("Update account error:", err);
      setErrorMessage("An unexpected error occurred while updating the account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Edit2 size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Edit Payment Account
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-xs">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Account Type (Read-only badge) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Account Type
            </label>
            <div className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-2 capitalize">
              {accType === "gcash" ? <Smartphone size={16} /> : <CreditCard size={16} />}
              <span>{accType === "gcash" ? "GCash" : "Bank Account"}</span>
            </div>
          </div>

          {/* Bank Fields */}
          {accType === "bank" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bank Name <span className="text-rose-500">*</span>
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Specify Bank Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customBankName}
                    maxLength={100}
                    onChange={(e) => setCustomBankName(e.target.value.slice(0, 100))}
                    placeholder="Enter official bank name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                  />
                </div>
              )}
            </div>
          )}

          {/* Account Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Account Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={accountName}
              maxLength={60}
              onChange={(e) => {
                setAccountName(e.target.value.slice(0, 60));
                setErrorMessage("");
              }}
              placeholder="e.g. Juan Dela Cruz"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            />
          </div>

          {/* Account Number (Leave empty to keep unchanged) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Account Number{" "}
              <span className="text-[11px] text-slate-400 font-normal">
                (Leave blank to keep current: {account.account_number_masked})
              </span>
            </label>
            <input
              type="text"
              value={accountNumber}
              maxLength={accType === "gcash" ? 11 : 30}
              inputMode={accType === "gcash" ? "numeric" : "text"}
              onChange={(e) => {
                let val = e.target.value;
                if (accType === "gcash") {
                  val = val.replace(/\D/g, "").slice(0, 11);
                }
                setAccountNumber(val);
                setErrorMessage("");
              }}
              placeholder={accType === "gcash" ? "Enter new 11-digit number" : "Enter new account number"}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition font-mono"
            />
          </div>

          {/* Set as Default Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="edit_set_default"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
            />
            <label htmlFor="edit_set_default" className="text-xs font-medium text-slate-700 cursor-pointer">
              Set as primary/default payout account
            </label>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 rounded-xl bg-[#0B5D1E] hover:bg-[#084b18] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
