import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Building2,
  Users,
  CreditCard,
  Plus,
  Eye,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import Dropdown from "../../../Components/Minor-Components/Dropdown";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import Toast from "../../../Components/Minor-Components/Toast";
import useToast from "../../../Components/hooks/useToast";
import useApi from "../../../Components/hooks/useApi";

// Modals
import PaymentSecuritySetupModal from "../../../Components/Modals/MillerManager/PaymentAccounts/PaymentSecuritySetupModal";
import PaymentSecurityPasswordModal from "../../../Components/Modals/MillerManager/PaymentAccounts/PaymentSecurityPasswordModal";
import PaymentSecurityForgotModal from "../../../Components/Modals/MillerManager/PaymentAccounts/PaymentSecurityForgotModal";
import ArchiveReasonModal from "../../../Components/Modals/MillerManager/PaymentAccounts/ArchiveReasonModal";
import AddBranchAccountModal from "../../../Components/Modals/MillerManager/PaymentAccounts/AddBranchAccountModal";
import FaceScreeningModal from "../../../Components/Modals/MillerManager/PaymentAccounts/FaceScreeningModal";
import ViewBranchAccountModal from "../../../Components/Modals/MillerManager/PaymentAccounts/ViewBranchAccountModal";
import EditBranchAccountModal from "../../../Components/Modals/MillerManager/PaymentAccounts/EditBranchAccountModal";
import ViewEmployeeAccountModal, { formatPosition } from "../../../Components/Modals/MillerManager/PaymentAccounts/ViewEmployeeAccountModal";

export const VALID_EMPLOYEE_POSITIONS = [
  { value: "encoder", label: "Encoder" },
  { value: "procurement", label: "Procurement" },
  { value: "finance", label: "Finance" },
  { value: "seller", label: "Seller" },
  { value: "fulfillment_logistics_coordinator", label: "Fulfillment Logistics Coordinator" },
  { value: "driver", label: "Driver" },
  { value: "branch_manager", label: "Branch Manager" },
];

const SORT_OPTIONS = [
  { value: "name_asc", label: "Account Name (A–Z)" },
  { value: "name_desc", label: "Account Name (Z–A)" },
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
];

const EMPLOYEE_SORT_OPTIONS = [
  { value: "name_asc", label: "Account Name (A–Z)" },
  { value: "name_desc", label: "Account Name (Z–A)" },
  { value: "emp_asc", label: "Employee Name (A–Z)" },
  { value: "emp_desc", label: "Employee Name (Z–A)" },
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

export default function MillerOnlinePaymentAccounts() {
  const { request } = useApi();
  const { toasts, showToast, removeToast } = useToast();

  const [activeTab, setActiveTab] = useState("branch"); // 'branch' | 'employee'

  // Security status & User Info
  const [hasSecurityPassword, setHasSecurityPassword] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [isCheckingSecurity, setIsCheckingSecurity] = useState(true);

  // Common Data
  const [branches, setBranches] = useState([]);
  const [employeePositions, setEmployeePositions] = useState([]);

  // Tab 1: Branch Accounts
  const [branchAccounts, setBranchAccounts] = useState([]);
  const [isBranchLoading, setIsBranchLoading] = useState(false);
  const [branchSearch, setBranchSearch] = useState("");
  const [branchSelectedBranch, setBranchSelectedBranch] = useState("all");
  const [branchSelectedStatus, setBranchSelectedStatus] = useState("all");
  const [branchSelectedType, setBranchSelectedType] = useState("all");
  const [branchSelectedVerification, setBranchSelectedVerification] = useState("all");
  const [branchSortBy, setBranchSortBy] = useState("name_asc");
  const [branchCurrentPage, setBranchCurrentPage] = useState(1);

  // Tab 2: Employee Accounts
  const [employeeAccounts, setEmployeeAccounts] = useState([]);
  const [isEmployeeLoading, setIsEmployeeLoading] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeSelectedBranch, setEmployeeSelectedBranch] = useState("all");
  const [employeeSelectedPosition, setEmployeeSelectedPosition] = useState("all");
  const [employeeSelectedStatus, setEmployeeSelectedStatus] = useState("all");
  const [employeeSelectedType, setEmployeeSelectedType] = useState("all");
  const [employeeSelectedVerification, setEmployeeSelectedVerification] = useState("all");
  const [employeeSortBy, setEmployeeSortBy] = useState("name_asc");
  const [employeeCurrentPage, setEmployeeCurrentPage] = useState(1);

  const itemsPerPage = 10;

  // Modals state machine (strictly unstacked)
  // 'setup' | 'forgot' | 'password_prompt' | 'add_branch' | 'face_screening' |
  // 'view_branch' | 'edit_branch' | 'archive_branch' | 'view_employee' | 'archive_employee' | null
  const [activeModal, setActiveModal] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [pendingAddPayload, setPendingAddPayload] = useState(null);
  const [revealedAccountNumbers, setRevealedAccountNumbers] = useState({});
  const [actionAuthTokens, setActionAuthTokens] = useState({});

  // Config for generic PaymentSecurityPasswordModal
  const [passwordModalConfig, setPasswordModalConfig] = useState({
    title: "Payment Security Authorization",
    description: "Enter your 12+ character payment security password to proceed.",
    confirmText: "Authorize",
    actionType: null, // 'reveal_branch' | 'reveal_employee' | 'restore_branch' | 'restore_employee'
    targetAccount: null,
  });

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
          middle_initial: payload.middle_initial || res.middle_initial || "",
          last_name: payload.last_name || res.last_name || "",
          suffix: payload.suffix || res.suffix || "",
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
  // 2. LOAD METADATA (BRANCHES & EMPLOYEE POSITIONS)
  // ─────────────────────────────────────────────────────────────
  const loadBranches = useCallback(async () => {
    try {
      const res = await request("/miller/payment-accounts/branches/authorized/", {
        method: "GET",
      });
      if (res && res.success && res.data) {
        const branchList = Array.isArray(res.data) ? res.data : [];
        setBranches(branchList);
      }
    } catch (err) {
      console.error("Failed to load branches:", err);
    }
  }, [request]);

  const loadEmployeePositions = useCallback(async () => {
    try {
      const res = await request("/miller/payment-accounts/employee-positions/", {
        method: "GET",
      });
      if (res && res.success && res.data) {
        const posList = Array.isArray(res.data) ? res.data : [];
        setEmployeePositions(posList);
      }
    } catch (err) {
      console.error("Failed to load employee positions:", err);
    }
  }, [request]);

  useEffect(() => {
    loadBranches();
    loadEmployeePositions();
  }, [loadBranches, loadEmployeePositions]);

  // ─────────────────────────────────────────────────────────────
  // 3. LOAD BRANCH ACCOUNTS
  // ─────────────────────────────────────────────────────────────
  const loadBranchAccounts = useCallback(async () => {
    setIsBranchLoading(true);
    try {
      const params = new URLSearchParams();
      if (branchSearch.trim()) params.append("search", branchSearch.trim());
      if (branchSelectedBranch && branchSelectedBranch !== "all") {
        params.append("branch", branchSelectedBranch);
      }
      if (branchSelectedStatus && branchSelectedStatus !== "all") {
        params.append("status", branchSelectedStatus);
      }
      if (branchSelectedType && branchSelectedType !== "all") {
        params.append("type", branchSelectedType);
      }
      if (branchSelectedVerification && branchSelectedVerification !== "all") {
        params.append("verification_status", branchSelectedVerification);
      }
      if (branchSortBy) params.append("sort_by", branchSortBy);

      const res = await request(`/miller/payment-accounts/branches/?${params.toString()}`, {
        method: "GET",
      });
      if (res && res.success) {
        const rawList = Array.isArray(res.data) ? res.data : [];
        // Ensure only valid payment account records are displayed, filtering out any accidental non-account metadata
        const validAccounts = rawList.filter(
          (item) => item && (item.credentials_id || item.account_name || item.account_number_masked)
        );
        setBranchAccounts(validAccounts);
      } else {
        setBranchAccounts([]);
      }
    } catch (err) {
      console.error("Failed to load branch accounts:", err);
      setBranchAccounts([]);
      showToast({
        type: "error",
        title: "Load Failed",
        message: "Failed to load branch payment accounts.",
      });
    } finally {
      setIsBranchLoading(false);
    }
  }, [
    request,
    branchSearch,
    branchSelectedBranch,
    branchSelectedStatus,
    branchSelectedType,
    branchSelectedVerification,
    branchSortBy,
    showToast,
  ]);

  // ─────────────────────────────────────────────────────────────
  // 4. LOAD EMPLOYEE ACCOUNTS
  // ─────────────────────────────────────────────────────────────
  const loadEmployeeAccounts = useCallback(async () => {
    setIsEmployeeLoading(true);
    try {
      const params = new URLSearchParams();
      if (employeeSearch.trim()) params.append("search", employeeSearch.trim());
      if (employeeSelectedBranch && employeeSelectedBranch !== "all") {
        params.append("branch", employeeSelectedBranch);
      }
      if (employeeSelectedPosition && employeeSelectedPosition !== "all") {
        params.append("position", employeeSelectedPosition);
        params.append("employee_type", employeeSelectedPosition);
      }
      if (employeeSelectedStatus && employeeSelectedStatus !== "all") {
        params.append("status", employeeSelectedStatus);
      }
      if (employeeSelectedType && employeeSelectedType !== "all") {
        params.append("type", employeeSelectedType);
      }
      if (employeeSelectedVerification && employeeSelectedVerification !== "all") {
        params.append("verification_status", employeeSelectedVerification);
      }
      if (employeeSortBy) params.append("sort_by", employeeSortBy);

      const res = await request(`/miller/payment-accounts/employees/?${params.toString()}`, {
        method: "GET",
      });
      if (res && res.success) {
        const rawList = Array.isArray(res.data) ? res.data : [];
        // Ensure only valid employee payment account records are displayed
        const validAccounts = rawList.filter(
          (item) => item && (item.credentials_id || item.account_name || item.employee_name)
        );
        setEmployeeAccounts(validAccounts);
      } else {
        setEmployeeAccounts([]);
      }
    } catch (err) {
      console.error("Failed to load employee accounts:", err);
      setEmployeeAccounts([]);
      showToast({
        type: "error",
        title: "Load Failed",
        message: "Failed to load employee payment accounts.",
      });
    } finally {
      setIsEmployeeLoading(false);
    }
  }, [
    request,
    employeeSearch,
    employeeSelectedBranch,
    employeeSelectedPosition,
    employeeSelectedStatus,
    employeeSelectedType,
    employeeSelectedVerification,
    employeeSortBy,
    showToast,
  ]);

  useEffect(() => {
    loadBranchAccounts();
  }, [loadBranchAccounts]);

  useEffect(() => {
    loadEmployeeAccounts();
  }, [loadEmployeeAccounts]);

  // ─────────────────────────────────────────────────────────────
  // MODAL NAVIGATION HANDLERS (STRICTLY UNSTACKED)
  // ─────────────────────────────────────────────────────────────
  const handleCloseAllModals = () => {
    setActiveModal(null);
    setSelectedAccount(null);
    setPendingAddPayload(null);
  };

  // Setup Success
  const handleSetupSuccess = () => {
    setHasSecurityPassword(true);
    setActiveModal(null);
    showToast({
      type: "success",
      title: "Security Setup Complete",
      message: "Payment Security Password has been successfully established.",
    });
  };

  // Open Forgot Password
  const handleOpenForgotPassword = () => {
    setActiveModal("forgot");
  };

  // Forgot Password Success
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
  };

  // ── BRANCH ACCOUNT ACTIONS ──
  const handleOpenAddBranch = () => {
    setActiveModal("add_branch");
  };

  const handleProceedToScreening = (payload) => {
    setPendingAddPayload(payload);
    setActiveModal("face_screening");
  };

  const handleAccountCreated = (newAccount) => {
    showToast({
      type: "success",
      title: "Account Added",
      message: "Branch payment account has been saved successfully.",
    });
    loadBranchAccounts();
    setActiveModal(null);
  };

  const handleViewBranchAccount = (account) => {
    setSelectedAccount(account);
    setActiveModal("view_branch");
  };

  const handleEditBranchAccount = (account) => {
    setSelectedAccount(account);
    setPasswordModalConfig({
      title: "Authorize Account Edit",
      description: "Enter your payment security password to authorize editing this branch account.",
      confirmText: "Continue to Edit",
      actionType: "edit_branch_authorize",
      targetAccount: account,
    });
    setActiveModal("password_prompt");
  };

  const handleBranchSaveSuccess = (updated) => {
    showToast({
      type: "success",
      title: "Account Updated",
      message: "Branch payment account details updated successfully.",
    });
    loadBranchAccounts();
    setSelectedAccount(updated);
    setActiveModal("view_branch");
  };

  const handleArchiveBranchPrompt = (account) => {
    setSelectedAccount(account);
    setPasswordModalConfig({
      title: "Authorize Account Archive",
      description: "Enter your payment security password to authorize archiving this branch account.",
      confirmText: "Continue to Archive",
      actionType: "archive_branch_authorize",
      targetAccount: account,
    });
    setActiveModal("password_prompt");
  };

  const handleConfirmArchiveBranch = async ({ reason, auth_token }) => {
    const res = await request(
      `/miller/payment-accounts/branches/${selectedAccount.id}/archive/`,
      {
        method: "POST",
        body: { archive_reason: reason, auth_token },
      }
    );

    if (res && res.success) {
      showToast({
        type: "success",
        title: "Account Archived",
        message: "Branch payment account has been archived.",
      });
      loadBranchAccounts();
      setActiveModal(null);
      setSelectedAccount(null);
      return { success: true };
    }
    return res;
  };

  const handleRestoreBranchPrompt = (account) => {
    setSelectedAccount(account);
    setPasswordModalConfig({
      title: "Restore Payment Account",
      description: "Enter your payment security password to restore this branch account.",
      confirmText: "Restore Account",
      actionType: "restore_branch",
      targetAccount: account,
    });
    setActiveModal("password_prompt");
  };

  const handleRequestRevealBranch = (account) => {
    setSelectedAccount(account);
    setPasswordModalConfig({
      title: "Reveal Account Number",
      description: "Enter your payment security password to reveal the full account number.",
      confirmText: "Reveal Number",
      actionType: "reveal_branch",
      targetAccount: account,
    });
    setActiveModal("password_prompt");
  };

  // ── EMPLOYEE ACCOUNT ACTIONS ──
  const handleViewEmployeeAccount = (account) => {
    setSelectedAccount(account);
    setActiveModal("view_employee");
  };

  const handleArchiveEmployeePrompt = (account) => {
    setSelectedAccount(account);
    setPasswordModalConfig({
      title: "Authorize Employee Account Archive",
      description: "Enter your payment security password to authorize archiving this employee account.",
      confirmText: "Continue to Archive",
      actionType: "archive_employee_authorize",
      targetAccount: account,
    });
    setActiveModal("password_prompt");
  };

  const handleConfirmArchiveEmployee = async ({ reason, auth_token }) => {
    const res = await request(
      `/miller/payment-accounts/employees/${selectedAccount.id}/archive/`,
      {
        method: "POST",
        body: { archive_reason: reason, auth_token },
      }
    );

    if (res && res.success) {
      showToast({
        type: "success",
        title: "Employee Account Archived",
        message: "Employee payment account has been archived.",
      });
      loadEmployeeAccounts();
      setActiveModal(null);
      setSelectedAccount(null);
      return { success: true };
    }
    return res;
  };

  const handleRestoreEmployeePrompt = (account) => {
    setSelectedAccount(account);
    setPasswordModalConfig({
      title: "Restore Employee Account",
      description: "Enter your payment security password to restore this employee account.",
      confirmText: "Restore Account",
      actionType: "restore_employee",
      targetAccount: account,
    });
    setActiveModal("password_prompt");
  };

  const handleRequestRevealEmployee = (account) => {
    setSelectedAccount(account);
    setPasswordModalConfig({
      title: "Reveal Employee Account Number",
      description: "Enter your payment security password to reveal the full account number.",
      confirmText: "Reveal Number",
      actionType: "reveal_employee",
      targetAccount: account,
    });
    setActiveModal("password_prompt");
  };

  const handleClosePasswordModal = () => {
    if (
      selectedAccount &&
      [
        "reveal_branch",
        "edit_branch_authorize",
        "archive_branch_authorize",
        "restore_branch",
      ].includes(passwordModalConfig.actionType)
    ) {
      setActiveModal("view_branch");
    } else if (
      selectedAccount &&
      [
        "reveal_employee",
        "archive_employee_authorize",
        "restore_employee",
      ].includes(passwordModalConfig.actionType)
    ) {
      setActiveModal("view_employee");
    } else {
      handleCloseAllModals();
    }
  };

  // ── GENERIC PASSWORD PROMPT EXECUTION ──
  const handleExecutePasswordAction = async (password) => {
    const { actionType, targetAccount } = passwordModalConfig;
    if (!targetAccount) return;

    if (actionType === "reveal_branch") {
      const res = await request(
        `/miller/payment-accounts/branches/${targetAccount.id}/reveal/`,
        {
          method: "POST",
          body: { password },
        }
      );
      if (res && res.success) {
        const revealed = res.account_number || res?.data?.account_number;
        setRevealedAccountNumbers((prev) => ({
          ...prev,
          [`branch_${targetAccount.id}`]: revealed,
        }));
        setActiveModal("view_branch");
        return { success: true };
      }
      return res;
    }

    if (actionType === "reveal_employee") {
      const res = await request(
        `/miller/payment-accounts/employees/${targetAccount.id}/reveal/`,
        {
          method: "POST",
          body: { password },
        }
      );
      if (res && res.success) {
        const revealed = res.account_number || res?.data?.account_number;
        setRevealedAccountNumbers((prev) => ({
          ...prev,
          [`emp_${targetAccount.id}`]: revealed,
        }));
        setActiveModal("view_employee");
        return { success: true };
      }
      return res;
    }

    if (actionType === "edit_branch_authorize") {
      const res = await request("/miller/payment-accounts/security/authorize-action/", {
        method: "POST",
        body: {
          password,
          action: "edit_branch_account",
          account_id: targetAccount.id,
        },
      });
      if (res && res.success && res.auth_token) {
        setActionAuthTokens((prev) => ({
          ...prev,
          [`edit_branch_${targetAccount.id}`]: res.auth_token,
        }));
        setActiveModal("edit_branch");
        return { success: true };
      }
      return res;
    }

    if (actionType === "archive_branch_authorize") {
      const res = await request("/miller/payment-accounts/security/authorize-action/", {
        method: "POST",
        body: {
          password,
          action: "archive_branch_account",
          account_id: targetAccount.id,
        },
      });
      if (res && res.success && res.auth_token) {
        setActionAuthTokens((prev) => ({
          ...prev,
          [`archive_branch_${targetAccount.id}`]: res.auth_token,
        }));
        setActiveModal("archive_branch");
        return { success: true };
      }
      return res;
    }

    if (actionType === "archive_employee_authorize") {
      const res = await request("/miller/payment-accounts/security/authorize-action/", {
        method: "POST",
        body: {
          password,
          action: "archive_employee_account",
          account_id: targetAccount.id,
        },
      });
      if (res && res.success && res.auth_token) {
        setActionAuthTokens((prev) => ({
          ...prev,
          [`archive_employee_${targetAccount.id}`]: res.auth_token,
        }));
        setActiveModal("archive_employee");
        return { success: true };
      }
      return res;
    }

    if (actionType === "restore_branch") {
      const res = await request(
        `/miller/payment-accounts/branches/${targetAccount.id}/restore/`,
        {
          method: "POST",
          body: { password },
        }
      );
      if (res && res.success) {
        showToast({
          type: "success",
          title: "Account Restored",
          message: "Branch payment account has been restored to active status.",
        });
        loadBranchAccounts();
        const updated = res.data
          ? { ...targetAccount, ...res.data, status: "active", is_archived: false }
          : { ...targetAccount, status: "active", is_archived: false };
        setSelectedAccount(updated);
        setActiveModal("view_branch");
        return { success: true };
      }
      return res;
    }

    if (actionType === "restore_employee") {
      const res = await request(
        `/miller/payment-accounts/employees/${targetAccount.id}/restore/`,
        {
          method: "POST",
          body: { password },
        }
      );
      if (res && res.success) {
        showToast({
          type: "success",
          title: "Employee Account Restored",
          message: "Employee payment account has been restored to active status.",
        });
        loadEmployeeAccounts();
        const updated = res.data
          ? { ...targetAccount, ...res.data, status: "active", is_archived: false }
          : { ...targetAccount, status: "active", is_archived: false };
        setSelectedAccount(updated);
        setActiveModal("view_employee");
        return { success: true };
      }
      return res;
    }
  };

  // ─────────────────────────────────────────────────────────────
  // OPTIONS BUILDERS
  // ─────────────────────────────────────────────────────────────
  const branchDropdownOptions = useMemo(() => {
    return [
      { value: "all", label: "All Branches" },
      ...branches.map((b) => ({
        value: String(b.id ?? b.supplier_profile_id),
        label: b.branch_name ?? b.business_name ?? `Branch #${b.supplier_profile_id}`,
      })),
    ];
  }, [branches]);

  const positionDropdownOptions = useMemo(() => {
    const list = [
      { value: "all", label: "All Positions" },
      ...VALID_EMPLOYEE_POSITIONS,
    ];
    if (Array.isArray(employeePositions) && employeePositions.length > 0) {
      const existing = new Set(VALID_EMPLOYEE_POSITIONS.map((p) => p.value.toLowerCase()));
      employeePositions.forEach((pos) => {
        if (pos) {
          const val = String(pos).trim().toLowerCase();
          if (!existing.has(val)) {
            existing.add(val);
            list.push({ value: val, label: formatPosition(pos) });
          }
        }
      });
    }
    return list;
  }, [employeePositions]);

  // ─────────────────────────────────────────────────────────────
  // PAGINATED DATA
  // ─────────────────────────────────────────────────────────────
  const paginatedBranchAccounts = useMemo(() => {
    const start = (branchCurrentPage - 1) * itemsPerPage;
    return branchAccounts.slice(start, start + itemsPerPage);
  }, [branchAccounts, branchCurrentPage]);

  const branchTotalPages = Math.ceil(branchAccounts.length / itemsPerPage) || 1;

  const sortedEmployeeAccounts = useMemo(() => {
    const list = [...employeeAccounts];
    if (employeeSortBy === "name_asc") {
      list.sort((a, b) => (a.account_name || "").localeCompare(b.account_name || ""));
    } else if (employeeSortBy === "name_desc") {
      list.sort((a, b) => (b.account_name || "").localeCompare(a.account_name || ""));
    } else if (employeeSortBy === "emp_asc") {
      list.sort((a, b) => (a.employee_name || "").localeCompare(b.employee_name || ""));
    } else if (employeeSortBy === "emp_desc") {
      list.sort((a, b) => (b.employee_name || "").localeCompare(a.employee_name || ""));
    }
    return list;
  }, [employeeAccounts, employeeSortBy]);

  const paginatedEmployeeAccounts = useMemo(() => {
    const start = (employeeCurrentPage - 1) * itemsPerPage;
    return sortedEmployeeAccounts.slice(start, start + itemsPerPage);
  }, [sortedEmployeeAccounts, employeeCurrentPage]);

  const employeeTotalPages = Math.ceil(employeeAccounts.length / itemsPerPage) || 1;

  // ─────────────────────────────────────────────────────────────
  // TABLE COLUMNS CONFIG
  // ─────────────────────────────────────────────────────────────
  const branchColumns = [
    {
      key: "branch_name",
      label: "Branch",
      render: (row) => (
        <div>
          <span className="font-semibold text-gray-900 block">
            {row.branch_name || row.branch || "—"}
          </span>
          {row.branch_code && (
            <span className="text-[11px] text-gray-400 font-mono">{row.branch_code}</span>
          )}
        </div>
      ),
    },
    {
      key: "account_name",
      label: "Account Name",
      render: (row) => (
        <span className="font-medium text-gray-900">{row.account_name || "—"}</span>
      ),
    },
    {
      key: "account_type",
      label: "Type",
      render: (row) => {
        const accType = (row.account_type || row.type || "bank").toLowerCase();
        return (
          <div className="flex items-center gap-1.5 capitalize text-xs text-gray-700">
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
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${style}`}
          >
            {row.verification_status || "Unverified"}
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "Action",
      align: "center",
      render: (row) => (
        <button
          type="button"
          onClick={() => handleViewBranchAccount(row)}
          className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 transition inline-flex items-center gap-1 text-xs cursor-pointer font-medium"
        >
          <Eye size={15} />
          <span>View</span>
        </button>
      ),
    },
  ];

  const employeeColumns = [
    {
      key: "branch_name",
      label: "Branch",
      render: (row) => (
        <span className="font-semibold text-gray-900">{row.branch_name || "—"}</span>
      ),
    },
    {
      key: "employee_name",
      label: "Employee",
      render: (row) => (
        <span className="font-semibold text-gray-900">{row.employee_name || "—"}</span>
      ),
    },
    {
      key: "employee_position",
      label: "Employee Type",
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-xs">
          {formatPosition(row.employee_position) || "Staff"}
        </span>
      ),
    },
    {
      key: "account_name",
      label: "Account Name",
      render: (row) => (
        <span className="font-medium text-gray-900">{row.account_name || "—"}</span>
      ),
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
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${style}`}
          >
            {row.verification_status || "Unverified"}
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "Action",
      align: "center",
      render: (row) => (
        <button
          type="button"
          onClick={() => handleViewEmployeeAccount(row)}
          className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 transition inline-flex items-center gap-1 text-xs cursor-pointer font-medium"
        >
          <Eye size={15} />
          <span>View</span>
        </button>
      ),
    },
  ];

  const branchSections = useMemo(
    () => [{ rows: paginatedBranchAccounts }],
    [paginatedBranchAccounts]
  );

  const employeeSections = useMemo(
    () => [{ rows: paginatedEmployeeAccounts }],
    [paginatedEmployeeAccounts]
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: "Dashboard", path: "/miller-manager" },
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
            Manage official branch payment destinations and authorized employee payout credentials.
          </p>
        </div>
      </div>

      {/* Segmented Tabs & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200">
        <div className="flex items-center gap-6 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("branch")}
            className={`flex items-center gap-2 pb-3 transition relative cursor-pointer ${
              activeTab === "branch"
                ? "text-gray-900 border-b-2 border-emerald-700 font-bold"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <Building2 size={16} />
            <span>Branch Online Payment Accounts</span>
            <span className="text-xs text-gray-400">({branchAccounts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("employee")}
            className={`flex items-center gap-2 pb-3 transition relative cursor-pointer ${
              activeTab === "employee"
                ? "text-gray-900 border-b-2 border-emerald-700 font-bold"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <Users size={16} />
            <span>Employee Online Payment Accounts</span>
            <span className="text-xs text-gray-400">({employeeAccounts.length})</span>
          </button>
        </div>

        {activeTab === "branch" && (
          <div className="pb-2.5 flex items-center gap-2 shrink-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 border border-gray-200 rounded-full text-xs font-semibold text-gray-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span>{branchAccounts.length} accounts</span>
            </div>
            <button
              type="button"
              onClick={handleOpenAddBranch}
              className="flex items-center justify-center gap-1.5 bg-[#0B5D1E] hover:bg-[#084b18] text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap shadow-xs"
            >
              <Plus size={16} /> Add Account
            </button>
          </div>
        )}
        {activeTab === "employee" && (
          <div className="pb-2.5 flex items-center gap-2 shrink-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 border border-gray-200 rounded-full text-xs font-semibold text-gray-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span>{employeeAccounts.length} accounts</span>
            </div>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: BRANCH ONLINE PAYMENT ACCOUNTS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "branch" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-2.5 w-full">
            {/* Search */}
            <div className="w-full sm:w-auto flex-1 min-w-[200px]">
              <SearchFilter
                value={branchSearch}
                onChange={(v) => {
                  setBranchSearch(v);
                  setBranchCurrentPage(1);
                }}
                placeholder="Search branch, name, number..."
              />
            </div>

            {/* Branch Filter */}
            <div className="w-full sm:w-auto shrink-0 min-w-[140px]">
              <Dropdown
                options={branchDropdownOptions}
                value={branchSelectedBranch}
                onChange={(v) => {
                  setBranchSelectedBranch(v);
                  setBranchCurrentPage(1);
                }}
                placeholder="Branch"
              />
            </div>

            {/* Account Status Filter */}
            <div className="w-full sm:w-auto shrink-0 min-w-[120px]">
              <Dropdown
                options={ACCOUNT_STATUS_OPTIONS}
                value={branchSelectedStatus}
                onChange={(v) => {
                  setBranchSelectedStatus(v);
                  setBranchCurrentPage(1);
                }}
                placeholder="Status"
              />
            </div>

            {/* Account Type Filter */}
            <div className="w-full sm:w-auto shrink-0 min-w-[120px]">
              <Dropdown
                options={ACCOUNT_TYPE_OPTIONS}
                value={branchSelectedType}
                onChange={(v) => {
                  setBranchSelectedType(v);
                  setBranchCurrentPage(1);
                }}
                placeholder="Type"
              />
            </div>

            {/* Verification Status Filter */}
            <div className="w-full sm:w-auto shrink-0 min-w-[140px]">
              <Dropdown
                options={VERIFICATION_STATUS_OPTIONS}
                value={branchSelectedVerification}
                onChange={(v) => {
                  setBranchSelectedVerification(v);
                  setBranchCurrentPage(1);
                }}
                placeholder="Verification"
              />
            </div>

            {/* Sort By Dropdown */}
            <div className="w-full sm:w-auto shrink-0 min-w-[170px]">
              <SortByDropdown
                options={SORT_OPTIONS}
                value={branchSortBy}
                onChange={(v) => {
                  setBranchSortBy(v);
                  setBranchCurrentPage(1);
                }}
                placeholder="Sort By"
              />
            </div>
          </div>

          {/* Table Card */}
          <SectionedTableCard
            columns={branchColumns}
            sections={branchSections}
            currentPage={branchCurrentPage}
            totalPages={branchTotalPages}
            onPageChange={setBranchCurrentPage}
            footerLabel={
              branchAccounts.length > 0
                ? `Showing ${(branchCurrentPage - 1) * itemsPerPage + 1}–${Math.min(
                    branchCurrentPage * itemsPerPage,
                    branchAccounts.length
                  )} of ${branchAccounts.length} branch accounts`
                : "Showing 0 branch accounts"
            }
          />
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: EMPLOYEE ONLINE PAYMENT ACCOUNTS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "employee" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-2.5 w-full">
            {/* Search */}
            <div className="w-full sm:w-auto flex-1 min-w-[180px]">
              <SearchFilter
                value={employeeSearch}
                onChange={(v) => {
                  setEmployeeSearch(v);
                  setEmployeeCurrentPage(1);
                }}
                placeholder="Search employee, name, number..."
              />
            </div>

            {/* Branch Filter */}
            <div className="w-full sm:w-auto shrink-0 min-w-[130px]">
              <Dropdown
                options={branchDropdownOptions}
                value={employeeSelectedBranch}
                onChange={(v) => {
                  setEmployeeSelectedBranch(v);
                  setEmployeeCurrentPage(1);
                }}
                placeholder="Branch"
              />
            </div>

            {/* Position Filter */}
            <div className="w-full sm:w-auto shrink-0 min-w-[130px]">
              <Dropdown
                options={positionDropdownOptions}
                value={employeeSelectedPosition}
                onChange={(v) => {
                  setEmployeeSelectedPosition(v);
                  setEmployeeCurrentPage(1);
                }}
                placeholder="Position"
              />
            </div>

            {/* Account Status Filter */}
            <div className="w-full sm:w-auto shrink-0 min-w-[110px]">
              <Dropdown
                options={ACCOUNT_STATUS_OPTIONS}
                value={employeeSelectedStatus}
                onChange={(v) => {
                  setEmployeeSelectedStatus(v);
                  setEmployeeCurrentPage(1);
                }}
                placeholder="Status"
              />
            </div>

            {/* Account Type Filter */}
            <div className="w-full sm:w-auto shrink-0 min-w-[110px]">
              <Dropdown
                options={ACCOUNT_TYPE_OPTIONS}
                value={employeeSelectedType}
                onChange={(v) => {
                  setEmployeeSelectedType(v);
                  setEmployeeCurrentPage(1);
                }}
                placeholder="Type"
              />
            </div>

            {/* Verification Status Filter */}
            <div className="w-full sm:w-auto shrink-0 min-w-[130px]">
              <Dropdown
                options={VERIFICATION_STATUS_OPTIONS}
                value={employeeSelectedVerification}
                onChange={(v) => {
                  setEmployeeSelectedVerification(v);
                  setEmployeeCurrentPage(1);
                }}
                placeholder="Verification"
              />
            </div>

            {/* Sort By Dropdown */}
            <div className="w-full sm:w-auto shrink-0 min-w-[170px] sm:min-w-[185px]">
              <SortByDropdown
                options={EMPLOYEE_SORT_OPTIONS}
                value={employeeSortBy}
                onChange={(v) => {
                  setEmployeeSortBy(v);
                  setEmployeeCurrentPage(1);
                }}
                placeholder="Sort By"
              />
            </div>
          </div>

          {/* Table Card */}
          <SectionedTableCard
            columns={employeeColumns}
            sections={employeeSections}
            currentPage={employeeCurrentPage}
            totalPages={employeeTotalPages}
            onPageChange={setEmployeeCurrentPage}
            footerLabel={
              employeeAccounts.length > 0
                ? `Showing ${(employeeCurrentPage - 1) * itemsPerPage + 1}–${Math.min(
                    employeeCurrentPage * itemsPerPage,
                    employeeAccounts.length
                  )} of ${employeeAccounts.length} employee accounts`
                : "Showing 0 employee accounts"
            }
          />
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODALS ORCHESTRATION (STRICTLY UNSTACKED) */}
      {/* ───────────────────────────────────────────────────────────── */}

      {/* 1. First-time Security Setup Modal */}
      {activeModal === "setup" && (
        <PaymentSecuritySetupModal
          isOpen={true}
          onClose={() => {
            // Cannot dismiss setup modal if user has never configured security password
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

      {/* 4. Add Branch Account Modal */}
      {activeModal === "add_branch" && (
        <AddBranchAccountModal
          isOpen={true}
          onClose={handleCloseAllModals}
          branches={branches}
          onProceedToVerification={handleProceedToScreening}
        />
      )}

      {/* 5. Face Screening & ID OCR Modal */}
      {activeModal === "face_screening" && pendingAddPayload && (
        <FaceScreeningModal
          isOpen={true}
          onClose={handleCloseAllModals}
          accountData={pendingAddPayload}
          userInfo={userInfo}
          onAccountCreated={handleAccountCreated}
        />
      )}

      {/* 6. View Branch Account Modal */}
      {activeModal === "view_branch" && selectedAccount && (
        <ViewBranchAccountModal
          isOpen={true}
          onClose={handleCloseAllModals}
          account={selectedAccount}
          onRequestReveal={handleRequestRevealBranch}
          onOpenEdit={handleEditBranchAccount}
          onOpenArchive={handleArchiveBranchPrompt}
          onOpenRestore={handleRestoreBranchPrompt}
          revealedAccountNumber={
            revealedAccountNumbers[`branch_${selectedAccount.id}`]
          }
          onHideAccountNumber={() => {
            setRevealedAccountNumbers((prev) => {
              const updated = { ...prev };
              delete updated[`branch_${selectedAccount.id}`];
              return updated;
            });
          }}
        />
      )}

      {/* 7. Edit Branch Account Modal */}
      {activeModal === "edit_branch" && selectedAccount && (
        <EditBranchAccountModal
          isOpen={true}
          onClose={() => setActiveModal("view_branch")}
          account={selectedAccount}
          authToken={selectedAccount ? actionAuthTokens[`edit_branch_${selectedAccount.id}`] : null}
          onSaveSuccess={handleBranchSaveSuccess}
        />
      )}

      {/* 8. Archive Reason Modal (Branch) */}
      {activeModal === "archive_branch" && selectedAccount && (
        <ArchiveReasonModal
          isOpen={true}
          onClose={() => setActiveModal("view_branch")}
          account={selectedAccount}
          accountType="branch"
          authToken={selectedAccount ? actionAuthTokens[`archive_branch_${selectedAccount.id}`] : null}
          onConfirmArchive={handleConfirmArchiveBranch}
        />
      )}

      {/* 9. View Employee Account Modal */}
      {activeModal === "view_employee" && selectedAccount && (
        <ViewEmployeeAccountModal
          isOpen={true}
          onClose={handleCloseAllModals}
          account={selectedAccount}
          onRequestReveal={handleRequestRevealEmployee}
          onOpenArchive={handleArchiveEmployeePrompt}
          onOpenRestore={handleRestoreEmployeePrompt}
          revealedAccountNumber={
            revealedAccountNumbers[`emp_${selectedAccount.id}`]
          }
          onHideAccountNumber={() => {
            setRevealedAccountNumbers((prev) => {
              const updated = { ...prev };
              delete updated[`emp_${selectedAccount.id}`];
              return updated;
            });
          }}
        />
      )}

      {/* 10. Archive Reason Modal (Employee) */}
      {activeModal === "archive_employee" && selectedAccount && (
        <ArchiveReasonModal
          isOpen={true}
          onClose={() => setActiveModal("view_employee")}
          account={selectedAccount}
          accountType="employee"
          authToken={selectedAccount ? actionAuthTokens[`archive_employee_${selectedAccount.id}`] : null}
          onConfirmArchive={handleConfirmArchiveEmployee}
        />
      )}
    </div>
  );
}

