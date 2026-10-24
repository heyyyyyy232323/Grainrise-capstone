import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  Loader2,
  Printer,
  Search,
  X,
} from "lucide-react";
import { jsPDF } from "jspdf";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import DateRangePicker from "../../../Components/Minor-Components/DateRangePicker";
import Dropdown from "../../../Components/Minor-Components/Dropdown";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";
import Tabs from "../../../Components/Minor-Components/Tabs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import useApi from "../../../Components/hooks/useApi";
import GoodsReceiptReceiptModal from "../../../Components/Modals/MillerProcurement/GoodsReceiptReceiptModal";
import FinanceExpenseReceiptModal from "../../../Components/Modals/MillerFinance/FinanceExpenseReceiptModal";
import ReimbursementReceiptModal, {
  buildReimbursementReceiptSnapshot,
} from "../../../Components/Modals/MillerFinance/ReimbursementReceiptModal";

const TABS = [
  { id: "payables", label: "Payables Payment" },
  { id: "expenses", label: "Expenses Payment" },
  { id: "reimbursements", label: "Reimbursements" },
];

const SORT_OPTIONS = [
  { value: "date-desc", label: "Newest–Oldest" },
  { value: "date-asc", label: "Oldest–Newest" },
  { value: "amount-asc", label: "Lowest–Highest Amount" },
  { value: "amount-desc", label: "Highest–Lowest Amount" },
];

const DEFAULT_EXPENSE_TYPES = [
  "Utilities",
  "Transportation",
  "Machinery Maintenance & Repair",
  "Operating Supplies",
  "Rent & Facilities",
  "Salaries & Wages",
  "Taxes & Government Fees",
  "Equipments",
  "Administrative",
  "Others",
];

const DEFAULT_REIMBURSEMENT_CATEGORIES = [
  "Transportation & Travel",
  "Meals & Allowances",
  "Emergency",
  "Equipment & Repair",
  "Communication",
  "Logistics",
  "Office & Operating Supplies",
  "Others",
];

function formatPeso(value) {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return "₱0.00";
  return `₱${num.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatQtyKg(value) {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return "0 kg";
  const formatted = Number.isInteger(num)
    ? num.toLocaleString("en-PH")
    : num.toLocaleString("en-PH", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
  return `${formatted} kg`;
}

const sanitizePdfText = (val) => {
  if (val === null || val === undefined || val === "") return "N/A";
  let s = String(val).trim();
  s = s.replace(/[₱\u20B1±\u00B1]/g, "").trim();
  return s || "N/A";
};

const formatCurrencyForPdf = (val) => {
  if (val === null || val === undefined || val === "" || val === "N/A") {
    return "PHP 0.00";
  }
  if (typeof val === "number" && !isNaN(val)) {
    return `PHP ${val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  let s = String(val).trim();
  s = s.replace(/[₱\u20B1±\u00B1]/g, "").replace(/\bPHP\b/gi, "").trim();
  const cleanNum = s.replace(/,/g, "");
  const num = Number(cleanNum);
  if (!isNaN(num) && cleanNum !== "") {
    return `PHP ${num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return s ? `PHP ${s}` : "PHP 0.00";
};

const formatPesoDisplay = (val) => {
  if (val === null || val === undefined || val === "" || val === "N/A") {
    return "N/A";
  }
  const num = Number(val);
  if (isNaN(num)) return "N/A";
  return `₱ ${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatQtyKgOrNa = (val) => {
  if (val === null || val === undefined || val === "" || val === "N/A") {
    return "N/A";
  }
  const num = Number(val);
  if (isNaN(num)) return "N/A";
  const formatted = Number.isInteger(num)
    ? num.toLocaleString("en-US")
    : num.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
  return `${formatted} kg`;
};

const valueOrNa = (val) => {
  if (val === null || val === undefined) return "N/A";
  const trimmed = String(val).trim();
  if (!trimmed || trimmed === "—" || trimmed === "-") return "N/A";
  return trimmed;
};

export default function MillerFinanceManagementHistory({ reportMode = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { request } = useApi();

  const isReportView = Boolean(
    reportMode ||
      location.pathname.endsWith("/report") ||
      location.search.includes("view=report")
  );

  // ── BRANCH FILTER STATE ───────────────────────────────────────────────────
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(
    () => location.state?.selectedBranch || "all"
  );
  const [showBranchDrop, setShowBranchDrop] = useState(false);
  const branchRef = useRef(null);

  // Close branch dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (branchRef.current && !branchRef.current.contains(e.target)) {
        setShowBranchDrop(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch ALL Manager-owned branches from /miller/branches/
  const fetchBranches = useCallback(async () => {
    try {
      const res = await request("/miller/branches/", { method: "GET" });
      const rawList = res?.data ?? (Array.isArray(res) ? res : []);
      if (Array.isArray(rawList)) {
        setBranches(rawList);
      }
    } catch (err) {
      console.error("Failed to load branches:", err);
    }
  }, [request]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // =========================================================================
  // PART 1: PAYMENT HISTORY STATE & DATA
  // =========================================================================
  const [activeTab, setActiveTab] = useState("payables");
  const [query, setQuery] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [sortBy, setSortBy] = useState("date-desc");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [expenseTypeFilter, setExpenseTypeFilter] = useState("");
  const [reimbursementCategoryFilter, setReimbursementCategoryFilter] = useState("");
  const [page, setPage] = useState(1);

  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [payablesData, setPayablesData] = useState([]);
  const [expensesData, setExpensesData] = useState([]);
  const [reimbursementsData, setReimbursementsData] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    suppliers: [],
    expense_types: DEFAULT_EXPENSE_TYPES,
    reimbursement_categories: DEFAULT_REIMBURSEMENT_CATEGORIES,
  });

  const [selectedPayableReceipt, setSelectedPayableReceipt] = useState(null);
  const [selectedExpenseReceipt, setSelectedExpenseReceipt] = useState(null);
  const [selectedReimbursementReceipt, setSelectedReimbursementReceipt] = useState(null);

  const fetchPaymentHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      setHistoryError("");
      const res = await request("/miller/finance-history/", {
        method: "GET",
        throwOnError: true,
      });
      const payload = res?.data ?? res ?? {};
      setPayablesData(Array.isArray(payload.payables) ? payload.payables : []);
      setExpensesData(Array.isArray(payload.expenses) ? payload.expenses : []);
      setReimbursementsData(
        Array.isArray(payload.reimbursements) ? payload.reimbursements : []
      );
      if (payload.filters && typeof payload.filters === "object") {
        setFilterOptions({
          suppliers: Array.isArray(payload.filters.suppliers)
            ? payload.filters.suppliers
            : [],
          expense_types:
            Array.isArray(payload.filters.expense_types) &&
            payload.filters.expense_types.length > 0
              ? payload.filters.expense_types
              : DEFAULT_EXPENSE_TYPES,
          reimbursement_categories:
            Array.isArray(payload.filters.reimbursement_categories) &&
            payload.filters.reimbursement_categories.length > 0
              ? payload.filters.reimbursement_categories
              : DEFAULT_REIMBURSEMENT_CATEGORIES,
        });
      }
    } catch (err) {
      setHistoryError(err?.message || "Failed to load finance payment history.");
    } finally {
      setHistoryLoading(false);
    }
  }, [request]);

  // =========================================================================
  // PART 2: FINANCIAL REPORT STATE & DATA
  // =========================================================================
  const [reportLoading, setReportLoading] = useState(true);
  const [reportError, setReportError] = useState("");
  const [reportPayables, setReportPayables] = useState([]);
  const [reportExpenses, setReportExpenses] = useState([]);
  const [reportReimbursements, setReportReimbursements] = useState([]);
  const [businessInfo, setBusinessInfo] = useState({
    business_name: "N/A",
    business_address: "N/A",
    business_contact: "N/A",
    business_email: "N/A",
  });

  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchReportData = useCallback(async () => {
    try {
      setReportLoading(true);
      setReportError("");
      const res = await request("/miller/finance-history/reports/", {
        method: "GET",
        throwOnError: true,
      });
      const payload = res?.data ?? res ?? {};
      setReportPayables(Array.isArray(payload.payables) ? payload.payables : []);
      setReportExpenses(Array.isArray(payload.expenses) ? payload.expenses : []);
      setReportReimbursements(
        Array.isArray(payload.reimbursements) ? payload.reimbursements : []
      );
      if (payload.business_info && typeof payload.business_info === "object") {
        setBusinessInfo(payload.business_info);
      }
    } catch (err) {
      setReportError(err?.message || "Failed to load financial report data.");
    } finally {
      setReportLoading(false);
    }
  }, [request]);

  // Fetch appropriate dataset
  useEffect(() => {
    if (isReportView) {
      fetchReportData();
    } else {
      fetchPaymentHistory();
    }
  }, [isReportView, fetchReportData, fetchPaymentHistory]);

  // =========================================================================
  // BRANCH OPTIONS COMPUTATION (ALL MANAGER-OWNED BRANCHES + EXTRA RECORD BRANCHES)
  // =========================================================================
  const branchOptions = useMemo(() => {
    const map = new Map();

    // 1. Add ALL owned branches from GET /miller/branches/
    for (const b of branches) {
      if (b && b.supplier_profile_id != null) {
        map.set(
          String(b.supplier_profile_id),
          b.business_name || b.organization_name || `Branch #${b.supplier_profile_id}`
        );
      }
    }

    // 2. Also ensure any branch present in history or report data is covered
    const allRecords = isReportView
      ? [...reportPayables, ...reportExpenses, ...reportReimbursements]
      : [...payablesData, ...expensesData, ...reimbursementsData];

    for (const item of allRecords) {
      const id = item.supplier_profile_id ?? item.supplierProfileId;
      const name = item.branch_name || item.branchName || item.business_name;
      if (id !== undefined && id !== null && name && !map.has(String(id))) {
        map.set(String(id), name);
      }
    }

    const list = Array.from(map.entries())
      .map(([id, name]) => ({ value: String(id), label: name }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [{ value: "all", label: "All Branches" }, ...list];
  }, [
    branches,
    isReportView,
    reportPayables,
    reportExpenses,
    reportReimbursements,
    payablesData,
    expensesData,
    reimbursementsData,
  ]);

  const selectedBranchLabel = useMemo(() => {
    if (selectedBranch === "all") return "All Branches";
    const found = branchOptions.find((b) => String(b.value) === String(selectedBranch));
    return found ? found.label : "All Branches";
  }, [selectedBranch, branchOptions]);

  const handleBranchSelect = (val) => {
    setSelectedBranch(val);
    setPage(1);
    setShowBranchDrop(false);
  };

  // =========================================================================
  // PAYMENT HISTORY TAB PROCESSING & FILTERING
  // =========================================================================
  const supplierOptions = useMemo(
    () => ["All Suppliers", ...(filterOptions.suppliers || [])],
    [filterOptions.suppliers]
  );
  const expenseTypeOptions = useMemo(
    () => ["All Expense Types", ...(filterOptions.expense_types || [])],
    [filterOptions.expense_types]
  );
  const reimbursementCategoryOptions = useMemo(
    () => ["All Categories", ...(filterOptions.reimbursement_categories || [])],
    [filterOptions.reimbursement_categories]
  );

  const rawHistoryRows = useMemo(() => {
    if (activeTab === "payables") {
      return payablesData.map((item) => ({
        ...item,
        branchName: item.branch_name || item.branchName || item.business_name || "N/A",
        batchNo: item.batchNo || item.batch_code || "N/A",
        supplier: item.supplier || item.supplier_name || "N/A",
        variant: item.variant || item.rice_variant || "N/A",
        stockQty: formatQtyKg(item.stockQty ?? item.good_quantity ?? 0),
        unitPrice: formatPeso(item.unitPrice ?? item.price_per_kg ?? 0),
        total: formatPeso(item.total ?? item.total_payable_amount ?? 0),
        paidAt: item.paidAt || "N/A",
        _amountValue: Number(item.total ?? item.total_payable_amount ?? 0),
        _sortTimestamp: Number(item.sort_timestamp || 0),
        _dateIso: item.date_iso || "",
        _raw: item,
      }));
    }

    if (activeTab === "expenses") {
      return expensesData.map((item) => ({
        ...item,
        branchName: item.branch_name || item.branchName || item.business_name || "N/A",
        expenseType: item.expenseType || item.expense_type || "N/A",
        description: item.description || "N/A",
        price: formatPeso(item.price_raw ?? item.price ?? 0),
        paymentDate: item.paymentDate || "N/A",
        _amountValue: Number(item.price_raw ?? item.price ?? 0),
        _sortTimestamp: Number(item.sort_timestamp || 0),
        _dateIso: item.date_iso || "",
        _raw: item,
      }));
    }

    return reimbursementsData.map((item) => ({
      ...item,
      branchName: item.branch_name || item.branchName || item.business_name || "N/A",
      category: item.category || item.types || "Miscellaneous",
      description: item.description || "N/A",
      cost: formatPeso(item.cost ?? item.price ?? 0),
      requester: item.requester || item.requested_by_name || "N/A",
      _amountValue: Number(item.cost ?? item.price ?? 0),
      _sortTimestamp: Number(item.sort_timestamp || 0),
      _dateIso: item.date_iso || "",
      _raw: item,
    }));
  }, [activeTab, payablesData, expensesData, reimbursementsData]);

  const filteredHistoryRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const { startDate: fStart, endDate: fEnd } = dateRange;

    let result = rawHistoryRows.filter((row) => {
      // 1. Branch Filter
      if (selectedBranch && selectedBranch !== "all") {
        const rowBranchId = String(
          row.supplier_profile_id ?? row.supplierProfileId ?? ""
        );
        if (rowBranchId !== String(selectedBranch)) {
          return false;
        }
      }

      // 2. Tab-specific dropdown filter
      if (activeTab === "payables" && supplierFilter) {
        if (String(row.supplier || "").toLowerCase() !== supplierFilter.toLowerCase()) {
          return false;
        }
      } else if (activeTab === "expenses" && expenseTypeFilter) {
        if (
          String(row.expenseType || "").toLowerCase() !==
          expenseTypeFilter.toLowerCase()
        ) {
          return false;
        }
      } else if (activeTab === "reimbursements" && reimbursementCategoryFilter) {
        if (
          String(row.category || "").toLowerCase() !==
          reimbursementCategoryFilter.toLowerCase()
        ) {
          return false;
        }
      }

      // 3. Validated Date Range filter
      if (fStart || fEnd) {
        if (fStart && fEnd && fEnd < fStart) {
          return true;
        }
        const rowDate = row._dateIso;
        if (!rowDate) return false;
        if (fStart && rowDate < fStart) return false;
        if (fEnd && rowDate > fEnd) return false;
      }

      // 4. Search filter
      if (!q) return true;
      if (activeTab === "payables") {
        return [
          row.branchName,
          row.batchNo,
          row.supplier,
          row.variant,
          row.stockQty,
          row.unitPrice,
          row.total,
          row.paidAt,
          row._raw?.receiving_reference_id,
          row._raw?.payment_reference_id,
        ]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(q));
      }
      if (activeTab === "expenses") {
        return [
          row.branchName,
          row.expenseType,
          row.description,
          row.price,
          row.paymentDate,
          row._raw?.setting_reference_no,
          row._raw?.payment_reference_no,
          row._raw?.paid_by_name,
        ]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(q));
      }
      return [
        row.branchName,
        row.category,
        row.description,
        row.cost,
        row.requester,
        row._raw?.title,
        row._raw?.request_reference_no,
        row._raw?.payment_reference_no,
      ]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q));
    });

    // Sorting
    result = [...result].sort((a, b) => {
      if (sortBy === "date-desc") {
        return b._sortTimestamp - a._sortTimestamp;
      }
      if (sortBy === "date-asc") {
        return a._sortTimestamp - b._sortTimestamp;
      }
      if (sortBy === "amount-asc") {
        return a._amountValue - b._amountValue;
      }
      if (sortBy === "amount-desc") {
        return b._amountValue - a._amountValue;
      }
      return 0;
    });

    return result;
  }, [
    rawHistoryRows,
    selectedBranch,
    activeTab,
    query,
    dateRange,
    sortBy,
    supplierFilter,
    expenseTypeFilter,
    reimbursementCategoryFilter,
  ]);

  const historyItemsPerPage = 10;
  const historyTotalPages = Math.max(1, Math.ceil(filteredHistoryRows.length / historyItemsPerPage));
  const safeHistoryPage = Math.min(page, historyTotalPages);
  const historyStartIndex = (safeHistoryPage - 1) * historyItemsPerPage;
  const paginatedHistoryRows = filteredHistoryRows.slice(
    historyStartIndex,
    historyStartIndex + historyItemsPerPage
  );
  const historySections = [{ rows: paginatedHistoryRows }];

  const handleOpenReceipt = useCallback(
    (row) => {
      const raw = row._raw || row;
      if (activeTab === "payables") {
        setSelectedPayableReceipt(raw);
      } else if (activeTab === "expenses") {
        setSelectedExpenseReceipt(raw);
      } else {
        const attempt = raw.latest_payout_attempt || null;
        const snapshot = buildReimbursementReceiptSnapshot({
          reimbursement: raw,
          resultData: {
            reimbursement: raw,
            latest_payout_attempt: attempt,
            payment_flow: String(raw.method || "").toUpperCase(),
            payment_reference_no: raw.payment_reference_no,
            processor_reference: raw.payment_reference_no,
            is_sandbox: Boolean(raw.is_sandbox),
            xendit_environment: raw.is_sandbox ? "test" : "live",
          },
          selectedMethod: raw.method,
          latestPayoutAttempt: attempt,
          cashReference: raw.payment_reference_no,
          payerInfo: {
            payer_name: raw.paid_by_name || raw.paid_by,
            business_name: raw.branch_name || raw.business_name,
          },
        });
        setSelectedReimbursementReceipt(snapshot);
      }
    },
    [activeTab]
  );

  const renderReceiptAction = useCallback(
    (row) => (
      <div className="flex items-center justify-center w-full">
        <button
          type="button"
          onClick={() => handleOpenReceipt(row)}
          className="rounded-lg border border-gray-300 px-3.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 hover:border-gray-400 cursor-pointer whitespace-nowrap"
        >
          Get Receipt
        </button>
      </div>
    ),
    [handleOpenReceipt]
  );

  // Table Columns with Branch Name as the FIRST COLUMN
  const historyColumns = useMemo(() => {
    if (activeTab === "payables") {
      return [
        { key: "branchName", label: "Branch Name", width: "16%" },
        { key: "batchNo", label: "Batch No." },
        { key: "supplier", label: "Supplier" },
        { key: "variant", label: "Variant" },
        { key: "stockQty", label: "Stock Qty (KG)" },
        { key: "unitPrice", label: "Unit Price" },
        { key: "total", label: "Total" },
        { key: "paidAt", label: "Paid At" },
        {
          key: "action",
          label: "Action",
          headerClassName: "text-center",
          cellClassName: "!text-center",
          render: renderReceiptAction,
        },
      ];
    }

    if (activeTab === "expenses") {
      return [
        { key: "branchName", label: "Branch Name", width: "18%" },
        { key: "expenseType", label: "Expense Type" },
        { key: "description", label: "Description" },
        { key: "price", label: "Price" },
        { key: "paymentDate", label: "Payment Date" },
        {
          key: "action",
          label: "Action",
          headerClassName: "text-center",
          cellClassName: "!text-center",
          render: renderReceiptAction,
        },
      ];
    }

    return [
      { key: "branchName", label: "Branch Name", width: "18%" },
      {
        key: "category",
        label: "Expense Category",
        render: (row) => (
          <div>
            <span className="inline-block rounded-full bg-sky-100 text-sky-700 px-3 py-1 text-xs font-semibold">
              {row.category}
            </span>
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
        cellClassName: "!text-center",
        render: renderReceiptAction,
      },
    ];
  }, [activeTab, renderReceiptAction]);

  // =========================================================================
  // FINANCIAL REPORTS PROCESSING, CALCULATION & EXPORT
  // =========================================================================
  const filterReportRow = useCallback(
    (row) => {
      // 1. Branch Filter
      if (selectedBranch && selectedBranch !== "all") {
        const rowBranchId = String(
          row.supplier_profile_id ?? row.supplierProfileId ?? ""
        );
        if (rowBranchId !== String(selectedBranch)) {
          return false;
        }
      }

      // 2. Status Filter
      const isPaid = Boolean(row.is_paid);
      if (statusFilter === "paid" && !isPaid) return false;
      if (statusFilter === "pending" && isPaid) return false;

      // 3. Date Range Filter
      if (startDate || endDate) {
        if (startDate && endDate && endDate < startDate) return true;
        const rowDate = row.date_iso || "";
        if (!rowDate) return false;
        if (startDate && rowDate < startDate) return false;
        if (endDate && rowDate > endDate) return false;
      }

      return true;
    },
    [selectedBranch, statusFilter, startDate, endDate]
  );

  const filteredReportPayables = useMemo(
    () => reportPayables.filter(filterReportRow),
    [reportPayables, filterReportRow]
  );
  const filteredReportExpenses = useMemo(
    () => reportExpenses.filter(filterReportRow),
    [reportExpenses, filterReportRow]
  );
  const filteredReportReimbursements = useMemo(
    () => reportReimbursements.filter(filterReportRow),
    [reportReimbursements, filterReportRow]
  );

  const totalReportRecordCount =
    filteredReportPayables.length +
    filteredReportExpenses.length +
    filteredReportReimbursements.length;

  // Compute Total Expenses, Pending, and Paid dynamically
  const { totalExpenses, totalPending, totalPaid } = useMemo(() => {
    let total = 0;
    let pending = 0;
    let paid = 0;

    const accumulate = (rows, amountKey) => {
      rows.forEach((row) => {
        if (row.is_sandbox) return;
        const amt = Number(row[amountKey] || 0);
        if (isNaN(amt)) return;
        total += amt;
        if (row.is_paid) {
          paid += amt;
        } else {
          pending += amt;
        }
      });
    };

    accumulate(filteredReportPayables, "total_payable_amount");
    accumulate(filteredReportExpenses, "price");
    accumulate(filteredReportReimbursements, "price");

    return {
      totalExpenses: total,
      totalPending: pending,
      totalPaid: paid,
    };
  }, [
    filteredReportPayables,
    filteredReportExpenses,
    filteredReportReimbursements,
  ]);

  const reportBusinessName = useMemo(() => {
    if (selectedBranch !== "all") {
      const bMatch = branches.find(
        (b) => String(b.supplier_profile_id) === String(selectedBranch)
      );
      if (bMatch?.business_name) return bMatch.business_name;
    }
    return valueOrNa(businessInfo.business_name);
  }, [selectedBranch, branches, businessInfo]);

  const reportHeaderLine = useMemo(() => {
    const parts = [
      valueOrNa(businessInfo.business_address),
      valueOrNa(businessInfo.business_contact),
      valueOrNa(businessInfo.business_email),
    ].filter((p) => p !== "N/A");
    return parts.length > 0 ? parts.join(" • ") : "N/A";
  }, [businessInfo]);

  const exportFilename = `${(reportBusinessName !== "N/A"
    ? reportBusinessName
    : "Miller_Manager_Finance"
  ).replace(/[^\w.-]/g, "_")}_Financial_Report`;

  // ── 1. DOWNLOAD EXCEL (.XLS HTML Workbook) with Branch Name as FIRST column ────
  const handleDownloadExcel = () => {
    const generatedDate = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Financial Report</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Calibri, Arial, sans-serif; }
          .header-title { font-size: 18pt; font-weight: bold; color: #0B5D1E; text-align: center; }
          .header-subtitle { font-size: 10pt; color: #555555; text-align: center; }
          .report-heading { font-size: 14pt; font-weight: bold; color: #1e293b; text-align: center; margin-top: 10px; }
          .section-heading { font-size: 12pt; font-weight: bold; color: #0B5D1E; text-align: center; margin-top: 18px; margin-bottom: 6px; }
          .metadata { font-size: 9pt; color: #64748b; text-align: center; font-style: italic; }
          table { border-collapse: collapse; width: 100%; margin-top: 8px; margin-bottom: 16px; }
          th { background-color: #0B5D1E; color: #ffffff; font-weight: bold; border: 1px solid #084b18; padding: 7px 6px; font-size: 9.5pt; text-align: left; }
          td { border: 1px solid #cbd5e1; padding: 6px; font-size: 9pt; color: #0f172a; vertical-align: top; white-space: normal; }
          .num { text-align: right; }
          .center { text-align: center; }
          .text-ref { mso-number-format: "\@"; word-break: break-all; white-space: normal; }
          .text-desc { word-wrap: break-word; white-space: normal; }
          .summary-box { background-color: #f8fafc; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header-title">${reportBusinessName}</div>
        <div class="header-subtitle">${reportHeaderLine}</div>
        <div class="report-heading">MILLER FINANCIAL REPORT</div>
        <div class="metadata">Generated on: ${generatedDate} ${
      selectedBranch !== "all" ? ` | Filtered: ${selectedBranchLabel}` : ""
    }</div>
        <br/>

        <div class="section-heading">PROCUREMENT PAYABLES</div>
        <table border="1">
          <thead>
            <tr>
              <th>Branch Name</th>
              <th>Batch</th>
              <th>Variant</th>
              <th>Supplier</th>
              <th>Order Qty</th>
              <th>Receiving Ref</th>
              <th>Total Received</th>
              <th>Good</th>
              <th>Price/kg</th>
              <th>Payable</th>
              <th>Received By</th>
              <th>Status</th>
              <th>Payment Method</th>
              <th>Paid Date</th>
              <th>Paid By</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (filteredReportPayables.length === 0) {
      html += `<tr><td colspan="15" class="center">N/A</td></tr>`;
    } else {
      filteredReportPayables.forEach((r) => {
        html += `
          <tr>
            <td>${valueOrNa(r.branchName || r.branch_name)}</td>
            <td>${valueOrNa(r.batch_code)}</td>
            <td>${valueOrNa(r.rice_variant)}</td>
            <td>${valueOrNa(r.supplier_name)}</td>
            <td class="num">${formatQtyKgOrNa(r.ordered_quantity)}</td>
            <td class="text-ref">${valueOrNa(r.receiving_reference_id)}</td>
            <td class="num">${formatQtyKgOrNa(r.received_quantity)}</td>
            <td class="num">${formatQtyKgOrNa(r.good_quantity)}</td>
            <td class="num">${formatPesoDisplay(r.price_per_kg)}</td>
            <td class="num" style="font-weight: bold; color: #0B5D1E;">${formatPesoDisplay(
              r.total_payable_amount
            )}</td>
            <td>${valueOrNa(r.received_by)}</td>
            <td class="center">${valueOrNa(r.status)}</td>
            <td class="center">${valueOrNa(r.payment_method)}</td>
            <td class="center">${valueOrNa(r.paid_at)}</td>
            <td>${valueOrNa(r.paid_by)}</td>
          </tr>
        `;
      });
    }

    html += `
          </tbody>
        </table>

        <div class="section-heading">EXPENSES</div>
        <table border="1">
          <thead>
            <tr>
              <th>Branch Name</th>
              <th>Setting Reference No.</th>
              <th>Set By</th>
              <th>Type</th>
              <th>Description</th>
              <th>Price</th>
              <th>Payment Method</th>
              <th>Payment Reference No.</th>
              <th>Payment Date</th>
              <th>Paid By</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (filteredReportExpenses.length === 0) {
      html += `<tr><td colspan="10" class="center">N/A</td></tr>`;
    } else {
      filteredReportExpenses.forEach((r) => {
        html += `
          <tr>
            <td>${valueOrNa(r.branchName || r.branch_name)}</td>
            <td class="text-ref">${valueOrNa(r.setting_reference_no)}</td>
            <td>${valueOrNa(r.set_by)}</td>
            <td>${valueOrNa(r.type)}</td>
            <td class="text-desc">${valueOrNa(r.description)}</td>
            <td class="num" style="font-weight: bold; color: #0B5D1E;">${formatPesoDisplay(
              r.price
            )}</td>
            <td class="center">${valueOrNa(r.payment_method)}</td>
            <td class="text-ref">${valueOrNa(r.payment_reference_no)}</td>
            <td class="center">${valueOrNa(r.payment_date)}</td>
            <td>${valueOrNa(r.paid_by)}</td>
          </tr>
        `;
      });
    }

    html += `
          </tbody>
        </table>

        <div class="section-heading">REIMBURSEMENT</div>
        <table border="1">
          <thead>
            <tr>
              <th>Branch Name</th>
              <th>Request Reference No.</th>
              <th>Requested By</th>
              <th>Category</th>
              <th>Type</th>
              <th>Description</th>
              <th>Price</th>
              <th>Payment Method</th>
              <th>Payment Reference No.</th>
              <th>Payment Date</th>
              <th>Paid By</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (filteredReportReimbursements.length === 0) {
      html += `<tr><td colspan="11" class="center">N/A</td></tr>`;
    } else {
      filteredReportReimbursements.forEach((r) => {
        html += `
          <tr>
            <td>${valueOrNa(r.branchName || r.branch_name)}</td>
            <td class="text-ref">${valueOrNa(r.request_reference_no)}</td>
            <td>${valueOrNa(r.requested_by)}</td>
            <td>${valueOrNa(r.category)}</td>
            <td>${valueOrNa(r.type)}</td>
            <td class="text-desc">${valueOrNa(r.description)}</td>
            <td class="num" style="font-weight: bold; color: #0B5D1E;">${formatPesoDisplay(
              r.price
            )}</td>
            <td class="center">${valueOrNa(r.payment_method)}</td>
            <td class="text-ref">${valueOrNa(r.payment_reference_no)}</td>
            <td class="center">${valueOrNa(r.payment_date)}</td>
            <td>${valueOrNa(r.paid_by)}</td>
          </tr>
        `;
      });
    }

    html += `
          </tbody>
        </table>

        <table border="1">
          <tbody>
            <tr class="summary-box">
              <td colspan="10" style="text-align: right; font-weight: bold;">TOTAL EXPENSES:</td>
              <td class="num" style="font-weight: bold; color: #0B5D1E;">${formatPesoDisplay(
                totalExpenses
              )}</td>
            </tr>
            <tr class="summary-box">
              <td colspan="10" style="text-align: right; vertical-align: top;">
                <b>BREAKDOWN:</b><br/>
                PENDING:<br/>
                PAID:
              </td>
              <td class="num" style="vertical-align: top;">
                &nbsp;<br/>
                ${formatPesoDisplay(totalPending)}<br/>
                ${formatPesoDisplay(totalPaid)}
              </td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\uFEFF" + html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${exportFilename}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ── 2. DOWNLOAD PDF (Landscape Multi-page jsPDF Document) with Branch Name as FIRST column ────
  const handleDownloadPdf = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
    const margin = 8;
    const usableWidth = pageWidth - margin * 2; // 281mm
    let y = 12;
    let currentPage = 1;

    const generatedDate = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const printDocumentHeader = (pageNum) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(11, 93, 30);
      doc.text(sanitizePdfText(reportBusinessName), pageWidth / 2, y, {
        align: "center",
      });
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(
        sanitizePdfText(reportHeaderLine.replace(/•/g, " | ")),
        pageWidth / 2,
        y,
        { align: "center" }
      );
      y += 5;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text("MILLER FINANCIAL REPORT", pageWidth / 2, y, {
        align: "center",
      });
      y += 4;

      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      const branchMeta =
        selectedBranch !== "all" ? `   |   Branch: ${selectedBranchLabel}` : "";
      doc.text(
        `Generated on: ${generatedDate}${branchMeta}   |   Page ${pageNum}`,
        pageWidth / 2,
        y,
        { align: "center" }
      );
      y += 3;

      doc.setDrawColor(11, 93, 30);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;
    };

    const ensureSpace = (neededMm) => {
      if (y + neededMm > pageHeight - 10) {
        doc.addPage();
        currentPage += 1;
        y = 12;
        printDocumentHeader(currentPage);
      }
    };

    const drawSectionTable = (sectionTitle, cols, rowsData, buildRowCells) => {
      ensureSpace(18);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(11, 93, 30);
      doc.text(sectionTitle, pageWidth / 2, y, { align: "center" });
      y += 3;

      const drawHeaderRow = () => {
        doc.setFillColor(11, 93, 30);
        doc.rect(margin, y, usableWidth, 6.5, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.0);
        doc.setTextColor(255, 255, 255);

        let curX = margin;
        cols.forEach((col) => {
          const textX =
            col.align === "right"
              ? curX + col.width - 1.5
              : col.align === "center"
              ? curX + col.width / 2
              : curX + 1.5;
          doc.text(col.label, textX, y + 4.3, {
            align: col.align || "left",
          });
          curX += col.width;
        });
        y += 6.5;
      };

      drawHeaderRow();
      const rowHeight = 5.5;

      if (rowsData.length === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, usableWidth, rowHeight, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.text("N/A", pageWidth / 2, y + 3.8, { align: "center" });
        y += rowHeight + 5;
        return;
      }

      rowsData.forEach((row, idx) => {
        const rowValues = buildRowCells(row);
        const baseFontSize = 5.5;
        doc.setFontSize(baseFontSize);

        const cellRenderData = rowValues.map((val, cIdx) => {
          const col = cols[cIdx];
          const maxW = Math.max(col.width - 2.5, 4);
          const rawText = sanitizePdfText(val);
          doc.setFont("helvetica", col.bold ? "bold" : "normal");
          const lines = doc.splitTextToSize(rawText, maxW);
          return { lines, col, rawText };
        });

        const maxLines = Math.max(...cellRenderData.map((c) => c.lines.length), 1);
        const lineHeight = 2.6;
        const dynamicRowHeight = Math.max(5.5, maxLines * lineHeight + 2.0);

        if (y + dynamicRowHeight > pageHeight - 10) {
          doc.addPage();
          currentPage += 1;
          y = 12;
          printDocumentHeader(currentPage);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(11, 93, 30);
          doc.text(`${sectionTitle} (Continued)`, pageWidth / 2, y, {
            align: "center",
          });
          y += 3;
          drawHeaderRow();
        }

        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, usableWidth, dynamicRowHeight, "F");
        }

        let curX = margin;
        cellRenderData.forEach(({ lines, col }) => {
          doc.setFont("helvetica", col.bold ? "bold" : "normal");
          doc.setFontSize(baseFontSize);
          if (col.highlightGreen) {
            doc.setTextColor(11, 93, 30);
          } else {
            doc.setTextColor(15, 23, 42);
          }

          const textX =
            col.align === "right"
              ? curX + col.width - 1.5
              : col.align === "center"
              ? curX + col.width / 2
              : curX + 1.5;

          lines.forEach((lineText, lineIdx) => {
            const lineY = y + 3.2 + lineIdx * lineHeight;
            doc.text(lineText, textX, lineY, {
              align: col.align || "left",
            });
          });

          curX += col.width;
        });

        y += dynamicRowHeight;
      });

      y += 5;
    };

    printDocumentHeader(currentPage);

    // Section 1: PROCUREMENT PAYABLES (281mm total) with Branch Name as FIRST column
    const payablesCols = [
      { label: "Branch Name", width: 22, align: "left" },
      { label: "Batch", width: 18, align: "left" },
      { label: "Variant", width: 15, align: "left" },
      { label: "Supplier", width: 20, align: "left" },
      { label: "Order Qty", width: 14, align: "right" },
      { label: "Receiving Ref", width: 21, align: "left" },
      { label: "Received", width: 14, align: "right" },
      { label: "Good", width: 13, align: "right" },
      { label: "Price/kg", width: 16, align: "right" },
      { label: "Payable", width: 22, align: "right", bold: true, highlightGreen: true },
      { label: "Received By", width: 20, align: "left" },
      { label: "Status", width: 13, align: "center" },
      { label: "Payment Method", width: 18, align: "center" },
      { label: "Paid Date", width: 17, align: "center" },
      { label: "Paid By", width: 38, align: "left" },
    ];

    drawSectionTable(
      "PROCUREMENT PAYABLES",
      payablesCols,
      filteredReportPayables,
      (r) => [
        valueOrNa(r.branchName || r.branch_name),
        valueOrNa(r.batch_code),
        valueOrNa(r.rice_variant),
        valueOrNa(r.supplier_name),
        formatQtyKgOrNa(r.ordered_quantity),
        valueOrNa(r.receiving_reference_id),
        formatQtyKgOrNa(r.received_quantity),
        formatQtyKgOrNa(r.good_quantity),
        r.price_per_kg !== null && r.price_per_kg !== undefined
          ? formatCurrencyForPdf(r.price_per_kg)
          : "N/A",
        formatCurrencyForPdf(r.total_payable_amount),
        valueOrNa(r.received_by),
        valueOrNa(r.status),
        valueOrNa(r.payment_method),
        valueOrNa(r.paid_at),
        valueOrNa(r.paid_by),
      ]
    );

    // Section 2: EXPENSES (281mm total) with Branch Name as FIRST column
    const expensesCols = [
      { label: "Branch Name", width: 26, align: "left" },
      { label: "Setting Reference No.", width: 32, align: "left" },
      { label: "Set By", width: 28, align: "left" },
      { label: "Type", width: 24, align: "left" },
      { label: "Description", width: 46, align: "left" },
      { label: "Price", width: 25, align: "right", bold: true, highlightGreen: true },
      { label: "Payment Method", width: 22, align: "center" },
      { label: "Payment Reference No.", width: 30, align: "left" },
      { label: "Payment Date", width: 22, align: "center" },
      { label: "Paid By", width: 26, align: "left" },
    ];

    drawSectionTable("EXPENSES", expensesCols, filteredReportExpenses, (r) => [
      valueOrNa(r.branchName || r.branch_name),
      valueOrNa(r.setting_reference_no),
      valueOrNa(r.set_by),
      valueOrNa(r.type),
      valueOrNa(r.description),
      formatCurrencyForPdf(r.price),
      valueOrNa(r.payment_method),
      valueOrNa(r.payment_reference_no),
      valueOrNa(r.payment_date),
      valueOrNa(r.paid_by),
    ]);

    // Section 3: REIMBURSEMENT (281mm total) with Branch Name as FIRST column
    const reimbursementCols = [
      { label: "Branch Name", width: 26, align: "left" },
      { label: "Request Reference No.", width: 28, align: "left" },
      { label: "Requested By", width: 25, align: "left" },
      { label: "Category", width: 22, align: "left" },
      { label: "Type", width: 24, align: "left" },
      { label: "Description", width: 38, align: "left" },
      { label: "Price", width: 23, align: "right", bold: true, highlightGreen: true },
      { label: "Payment Method", width: 21, align: "center" },
      { label: "Payment Reference No.", width: 28, align: "left" },
      { label: "Payment Date", width: 22, align: "center" },
      { label: "Paid By", width: 24, align: "left" },
    ];

    drawSectionTable(
      "REIMBURSEMENT",
      reimbursementCols,
      filteredReportReimbursements,
      (r) => [
        valueOrNa(r.branchName || r.branch_name),
        valueOrNa(r.request_reference_no),
        valueOrNa(r.requested_by),
        valueOrNa(r.category),
        valueOrNa(r.type),
        valueOrNa(r.description),
        formatCurrencyForPdf(r.price),
        valueOrNa(r.payment_method),
        valueOrNa(r.payment_reference_no),
        valueOrNa(r.payment_date),
        valueOrNa(r.paid_by),
      ]
    );

    // Bottom Summary Box
    ensureSpace(16);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, usableWidth, 14, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(11, 93, 30);
    doc.text(
      `TOTAL EXPENSES: ${formatCurrencyForPdf(totalExpenses)}`,
      pageWidth - margin - 3,
      y + 5,
      { align: "right" }
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    doc.text(
      `BREAKDOWN   —   PENDING: ${formatCurrencyForPdf(
        totalPending
      )}   |   PAID: ${formatCurrencyForPdf(totalPaid)}`,
      pageWidth - margin - 3,
      y + 10.5,
      { align: "right" }
    );

    doc.save(`${exportFilename}.pdf`);
  };

  // ── 3. PRINT (Isolated Iframe Document Print) with Branch Name as FIRST column ────
  const handlePrint = () => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();

    const generatedDate = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const payablesRowsHtml =
      filteredReportPayables.length === 0
        ? `<tr><td colspan="15" style="text-align: center; color: #64748b;">N/A</td></tr>`
        : filteredReportPayables
            .map(
              (r, idx) => `
          <tr style="background-color: ${idx % 2 === 1 ? "#f8fafc" : "#ffffff"};">
            <td>${valueOrNa(r.branchName || r.branch_name)}</td>
            <td>${valueOrNa(r.batch_code)}</td>
            <td>${valueOrNa(r.rice_variant)}</td>
            <td>${valueOrNa(r.supplier_name)}</td>
            <td style="text-align: right;">${formatQtyKgOrNa(r.ordered_quantity)}</td>
            <td class="ref-cell">${valueOrNa(r.receiving_reference_id)}</td>
            <td style="text-align: right;">${formatQtyKgOrNa(r.received_quantity)}</td>
            <td style="text-align: right;">${formatQtyKgOrNa(r.good_quantity)}</td>
            <td style="text-align: right;">${formatPesoDisplay(r.price_per_kg)}</td>
            <td style="text-align: right; font-weight: bold; color: #0B5D1E;">${formatPesoDisplay(
              r.total_payable_amount
            )}</td>
            <td>${valueOrNa(r.received_by)}</td>
            <td style="text-align: center;">${valueOrNa(r.status)}</td>
            <td style="text-align: center;">${valueOrNa(r.payment_method)}</td>
            <td style="text-align: center;">${valueOrNa(r.paid_at)}</td>
            <td>${valueOrNa(r.paid_by)}</td>
          </tr>
        `
            )
            .join("");

    const expensesRowsHtml =
      filteredReportExpenses.length === 0
        ? `<tr><td colspan="10" style="text-align: center; color: #64748b;">N/A</td></tr>`
        : filteredReportExpenses
            .map(
              (r, idx) => `
          <tr style="background-color: ${idx % 2 === 1 ? "#f8fafc" : "#ffffff"};">
            <td>${valueOrNa(r.branchName || r.branch_name)}</td>
            <td class="ref-cell">${valueOrNa(r.setting_reference_no)}</td>
            <td>${valueOrNa(r.set_by)}</td>
            <td>${valueOrNa(r.type)}</td>
            <td class="desc-cell">${valueOrNa(r.description)}</td>
            <td style="text-align: right; font-weight: bold; color: #0B5D1E;">${formatPesoDisplay(
              r.price
            )}</td>
            <td style="text-align: center;">${valueOrNa(r.payment_method)}</td>
            <td class="ref-cell">${valueOrNa(r.payment_reference_no)}</td>
            <td style="text-align: center;">${valueOrNa(r.payment_date)}</td>
            <td>${valueOrNa(r.paid_by)}</td>
          </tr>
        `
            )
            .join("");

    const reimbursementRowsHtml =
      filteredReportReimbursements.length === 0
        ? `<tr><td colspan="11" style="text-align: center; color: #64748b;">N/A</td></tr>`
        : filteredReportReimbursements
            .map(
              (r, idx) => `
          <tr style="background-color: ${idx % 2 === 1 ? "#f8fafc" : "#ffffff"};">
            <td>${valueOrNa(r.branchName || r.branch_name)}</td>
            <td class="ref-cell">${valueOrNa(r.request_reference_no)}</td>
            <td>${valueOrNa(r.requested_by)}</td>
            <td>${valueOrNa(r.category)}</td>
            <td>${valueOrNa(r.type)}</td>
            <td class="desc-cell">${valueOrNa(r.description)}</td>
            <td style="text-align: right; font-weight: bold; color: #0B5D1E;">${formatPesoDisplay(
              r.price
            )}</td>
            <td style="text-align: center;">${valueOrNa(r.payment_method)}</td>
            <td class="ref-cell">${valueOrNa(r.payment_reference_no)}</td>
            <td style="text-align: center;">${valueOrNa(r.payment_date)}</td>
            <td>${valueOrNa(r.paid_by)}</td>
          </tr>
        `
            )
            .join("");

    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${exportFilename}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; padding: 18px; color: #0f172a; line-height: 1.4; font-size: 10.5px; }
            .header { text-align: center; border-bottom: 2px solid #0B5D1E; padding-bottom: 10px; margin-bottom: 12px; }
            .header h1 { font-size: 19px; font-weight: 800; color: #0B5D1E; margin-bottom: 3px; }
            .header h2 { font-size: 11px; font-weight: 500; color: #64748b; }
            .report-title { text-align: center; font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 3px; text-transform: uppercase; }
            .metadata { text-align: center; font-size: 9.5px; color: #94a3b8; margin-bottom: 12px; font-style: italic; }
            .section-title { text-align: center; font-size: 11.5px; font-weight: 800; color: #0B5D1E; margin: 14px 0 6px; text-transform: uppercase; letter-spacing: 0.05em; }
            table { width: 100%; border-collapse: collapse; font-size: 9.5px; margin-bottom: 10px; }
            th { background-color: #0B5D1E; color: #ffffff; font-weight: bold; text-align: left; padding: 5px 4px; border: 1px solid #084b18; vertical-align: bottom; }
            td { padding: 4.5px 4px; border: 1px solid #e2e8f0; vertical-align: top; word-break: break-word; white-space: normal; }
            .ref-cell { word-break: break-all; font-family: monospace; font-size: 8.5px; white-space: normal; }
            .desc-cell { word-break: break-word; white-space: normal; }
            .summary-box { margin-top: 14px; border: 1px solid #cbd5e1; background-color: #f8fafc; padding: 10px 14px; text-align: right; }
            @page { size: landscape; margin: 10mm; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${reportBusinessName}</h1>
            <h2>${reportHeaderLine}</h2>
          </div>
          <div class="report-title">MILLER FINANCIAL REPORT</div>
          <div class="metadata">Generated on: ${generatedDate} ${
      selectedBranch !== "all" ? ` | Filtered: ${selectedBranchLabel}` : ""
    }</div>

          <div class="section-title">PROCUREMENT PAYABLES</div>
          <table>
            <thead>
              <tr>
                <th>Branch Name</th>
                <th>Batch</th>
                <th>Variant</th>
                <th>Supplier</th>
                <th style="text-align: right;">Order Qty</th>
                <th>Receiving Ref</th>
                <th style="text-align: right;">Total Received</th>
                <th style="text-align: right;">Good</th>
                <th style="text-align: right;">Price/kg</th>
                <th style="text-align: right;">Payable</th>
                <th>Received By</th>
                <th style="text-align: center;">Status</th>
                <th style="text-align: center;">Payment Method</th>
                <th style="text-align: center;">Paid Date</th>
                <th>Paid By</th>
              </tr>
            </thead>
            <tbody>${payablesRowsHtml}</tbody>
          </table>

          <div class="section-title">EXPENSES</div>
          <table>
            <thead>
              <tr>
                <th>Branch Name</th>
                <th>Setting Reference No.</th>
                <th>Set By</th>
                <th>Type</th>
                <th>Description</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: center;">Payment Method</th>
                <th>Payment Reference No.</th>
                <th style="text-align: center;">Payment Date</th>
                <th>Paid By</th>
              </tr>
            </thead>
            <tbody>${expensesRowsHtml}</tbody>
          </table>

          <div class="section-title">REIMBURSEMENT</div>
          <table>
            <thead>
              <tr>
                <th>Branch Name</th>
                <th>Request Reference No.</th>
                <th>Requested By</th>
                <th>Category</th>
                <th>Type</th>
                <th>Description</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: center;">Payment Method</th>
                <th>Payment Reference No.</th>
                <th style="text-align: center;">Payment Date</th>
                <th>Paid By</th>
              </tr>
            </thead>
            <tbody>${reimbursementRowsHtml}</tbody>
          </table>

          <div class="summary-box">
            <div style="font-size: 12px; font-weight: 800; color: #0B5D1E; margin-bottom: 6px;">
              TOTAL EXPENSES: ${formatPesoDisplay(totalExpenses)}
            </div>
            <div style="font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase;">
              BREAKDOWN:
            </div>
            <div style="font-size: 10.5px; color: #0f172a; margin-top: 2px;">
              <b>PENDING:</b> ${formatPesoDisplay(totalPending)}
            </div>
            <div style="font-size: 10.5px; color: #0f172a; margin-top: 2px;">
              <b>PAID:</b> ${formatPesoDisplay(totalPaid)}
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 300);
  };

  // =========================================================================
  // VIEW RENDERER (FINANCIAL REPORT VS. PAYMENT HISTORY)
  // =========================================================================

  if (isReportView) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: "History" },
            {
              label: "Finance Management History",
              path: "/miller-manager/finance-history",
            },
            { label: "Financial Report" },
          ]}
        />

        {/* ── Page Header Navigation & Title ─────────────────────────────────── */}
        <div className="mt-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                navigate("/miller-manager/finance-history", {
                  state: { selectedBranch },
                })
              }
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-2xs"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                Financial Report
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Document preview and official statement export.
              </p>
            </div>
          </div>
        </div>

        {/* ── Report Filters Bar (Branch Filter, Status Filter & Validated Date Range) ── */}
        <div className="flex flex-wrap items-center gap-2.5 mb-6">
          {/* Branch Filter Dropdown (Same design as Manager Sales History) */}
          <div className="relative" ref={branchRef}>
            <button
              type="button"
              onClick={() => setShowBranchDrop((prev) => !prev)}
              className={`flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 justify-center transition-colors cursor-pointer h-[38px] ${
                selectedBranch !== "all"
                  ? "border-emerald-500 text-emerald-700 bg-emerald-50/40"
                  : ""
              }`}
            >
              <span>{selectedBranchLabel}</span>
              <ChevronDown
                size={14}
                className={`text-gray-500 transition-transform duration-200 ${
                  showBranchDrop ? "rotate-180" : ""
                }`}
              />
            </button>

            {showBranchDrop && (
              <div className="absolute top-full mt-2 left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-20 min-w-[200px] max-h-60 overflow-y-auto">
                {branchOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleBranchSelect(opt.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      String(selectedBranch) === String(opt.value)
                        ? "bg-[#EAF7E8] text-[#0B5D1E] font-bold"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status Filter Dropdown */}
          <div className="relative w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none border border-gray-200 bg-white pl-3 pr-8 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer h-[38px] focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-auto"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
            <ChevronDown
              size={16}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
          </div>

          {/* Date Range: From Date <= To Date */}
          <div className="flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 h-[38px]">
            <Calendar size={15} className="text-gray-400 shrink-0" />
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs sm:text-sm text-gray-700 focus:outline-none cursor-pointer"
              title="From Date"
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs sm:text-sm text-gray-700 focus:outline-none cursor-pointer"
              title="To Date (Must be on or after From Date)"
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-gray-400 hover:text-gray-600 ml-1 cursor-pointer"
                title="Clear Date Range"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {reportError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
            {reportError}
          </div>
        )}

        {/* ── Scrollable Document Preview Sheet ──────────────────────────────── */}
        <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8">
          <div className="text-center pb-4 border-b-2 border-[#0B5D1E]">
            <h1 className="text-xl sm:text-2xl font-black text-[#0B5D1E] tracking-tight">
              {reportBusinessName}
            </h1>
            <h2 className="text-xs sm:text-sm text-slate-500 font-medium mt-1 text-center whitespace-normal">
              {reportHeaderLine}
            </h2>
            <div className="mt-2.5 inline-flex items-center px-4 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold tracking-wider uppercase">
              Miller Financial Report
            </div>
          </div>

          {reportLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 size={32} className="animate-spin text-emerald-700" />
              <p className="text-sm font-semibold text-slate-600">
                Generating financial report preview...
              </p>
            </div>
          ) : (
            <div className="space-y-8 mt-6">
              {/* ── SECTION 1: PROCUREMENT PAYABLES ────────────────────────── */}
              <div>
                <h3 className="text-center text-sm sm:text-base font-extrabold uppercase tracking-wider text-[#0B5D1E] mb-3">
                  PROCUREMENT PAYABLES
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs text-slate-700 min-w-[1350px]">
                    <thead>
                      <tr className="bg-[#EDEDED] text-[11px] font-extrabold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                        <th className="px-3.5 py-3">Branch Name</th>
                        <th className="px-3.5 py-3">Batch</th>
                        <th className="px-3.5 py-3">Variant</th>
                        <th className="px-3.5 py-3">Supplier</th>
                        <th className="px-3.5 py-3 text-right">Order Qty</th>
                        <th className="px-3.5 py-3">Receiving Ref</th>
                        <th className="px-3.5 py-3 text-right">Total Received</th>
                        <th className="px-3.5 py-3 text-right">Good</th>
                        <th className="px-3.5 py-3 text-right">Price/kg</th>
                        <th className="px-3.5 py-3 text-right">Payable</th>
                        <th className="px-3.5 py-3">Received By</th>
                        <th className="px-3.5 py-3 text-center">Status</th>
                        <th className="px-3.5 py-3 text-center">Payment Method</th>
                        <th className="px-3.5 py-3 text-center">Paid Date</th>
                        <th className="px-3.5 py-3">Paid By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-normal text-slate-800">
                      {filteredReportPayables.length === 0 ? (
                        <tr>
                          <td
                            colSpan={15}
                            className="px-3.5 py-6 text-center text-xs text-slate-400"
                          >
                            No procurement payable records match the selected filters.
                          </td>
                        </tr>
                      ) : (
                        filteredReportPayables.map((r, idx) => (
                          <tr
                            key={r.id || idx}
                            className="hover:bg-slate-50/70 transition-colors"
                          >
                            <td className="px-3.5 py-2.5 font-semibold text-slate-900 whitespace-nowrap">
                              {valueOrNa(r.branchName || r.branch_name)}
                            </td>
                            <td className="px-3.5 py-2.5 font-medium text-slate-900 whitespace-nowrap">
                              {valueOrNa(r.batch_code)}
                            </td>
                            <td className="px-3.5 py-2.5 whitespace-nowrap">
                              {valueOrNa(r.rice_variant)}
                            </td>
                            <td className="px-3.5 py-2.5 whitespace-nowrap">
                              {valueOrNa(r.supplier_name)}
                            </td>
                            <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                              {formatQtyKgOrNa(r.ordered_quantity)}
                            </td>
                            <td className="px-3.5 py-2.5 break-all whitespace-normal font-mono text-[11px] text-slate-600 min-w-[140px] max-w-[200px]">
                              {valueOrNa(r.receiving_reference_id)}
                            </td>
                            <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                              {formatQtyKgOrNa(r.received_quantity)}
                            </td>
                            <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                              {formatQtyKgOrNa(r.good_quantity)}
                            </td>
                            <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                              {formatPesoDisplay(r.price_per_kg)}
                            </td>
                            <td className="px-3.5 py-2.5 text-right whitespace-nowrap font-bold text-[#0B5D1E]">
                              {formatPesoDisplay(r.total_payable_amount)}
                            </td>
                            <td className="px-3.5 py-2.5 whitespace-nowrap">
                              {valueOrNa(r.received_by)}
                            </td>
                            <td className="px-3.5 py-2.5 text-center whitespace-nowrap text-slate-800">
                              {valueOrNa(r.status)}
                            </td>
                            <td className="px-3.5 py-2.5 text-center whitespace-nowrap text-slate-600">
                              {valueOrNa(r.payment_method)}
                            </td>
                            <td className="px-3.5 py-2.5 text-center whitespace-nowrap text-slate-600">
                              {valueOrNa(r.paid_at)}
                            </td>
                            <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600">
                              {valueOrNa(r.paid_by)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── SECTION 2: EXPENSES ────────────────────────────────────── */}
              <div>
                <h3 className="text-center text-sm sm:text-base font-extrabold uppercase tracking-wider text-[#0B5D1E] mb-3">
                  EXPENSES
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs text-slate-700 min-w-[1100px]">
                    <thead>
                      <tr className="bg-[#EDEDED] text-[11px] font-extrabold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                        <th className="px-3.5 py-3">Branch Name</th>
                        <th className="px-3.5 py-3">Setting Reference No.</th>
                        <th className="px-3.5 py-3">Set By</th>
                        <th className="px-3.5 py-3">Type</th>
                        <th className="px-3.5 py-3">Description</th>
                        <th className="px-3.5 py-3 text-right">Price</th>
                        <th className="px-3.5 py-3 text-center">Payment Method</th>
                        <th className="px-3.5 py-3">Payment Reference No.</th>
                        <th className="px-3.5 py-3 text-center">Payment Date</th>
                        <th className="px-3.5 py-3">Paid By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-normal text-slate-800">
                      {filteredReportExpenses.length === 0 ? (
                        <tr>
                          <td
                            colSpan={10}
                            className="px-3.5 py-6 text-center text-xs text-slate-400"
                          >
                            No expense records match the selected filters.
                          </td>
                        </tr>
                      ) : (
                        filteredReportExpenses.map((r, idx) => (
                          <tr
                            key={r.id || idx}
                            className="hover:bg-slate-50/70 transition-colors"
                          >
                            <td className="px-3.5 py-2.5 font-semibold text-slate-900 whitespace-nowrap">
                              {valueOrNa(r.branchName || r.branch_name)}
                            </td>
                            <td className="px-3.5 py-2.5 font-medium text-slate-900 break-all whitespace-normal font-mono text-[11px] min-w-[140px] max-w-[200px]">
                              {valueOrNa(r.setting_reference_no)}
                            </td>
                            <td className="px-3.5 py-2.5 whitespace-nowrap">
                              {valueOrNa(r.set_by)}
                            </td>
                            <td className="px-3.5 py-2.5 whitespace-nowrap">
                              {valueOrNa(r.type)}
                            </td>
                            <td className="px-3.5 py-2.5 break-words whitespace-normal min-w-[180px] max-w-[320px]">
                              {valueOrNa(r.description)}
                            </td>
                            <td className="px-3.5 py-2.5 text-right whitespace-nowrap font-bold text-[#0B5D1E]">
                              {formatPesoDisplay(r.price)}
                            </td>
                            <td className="px-3.5 py-2.5 text-center whitespace-nowrap text-slate-600">
                              {valueOrNa(r.payment_method)}
                            </td>
                            <td className="px-3.5 py-2.5 break-all whitespace-normal font-mono text-[11px] text-slate-600 min-w-[160px] max-w-[260px]">
                              {valueOrNa(r.payment_reference_no)}
                            </td>
                            <td className="px-3.5 py-2.5 text-center whitespace-nowrap text-slate-600">
                              {valueOrNa(r.payment_date)}
                            </td>
                            <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600">
                              {valueOrNa(r.paid_by)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── SECTION 3: REIMBURSEMENT ───────────────────────────────── */}
              <div>
                <h3 className="text-center text-sm sm:text-base font-extrabold uppercase tracking-wider text-[#0B5D1E] mb-3">
                  REIMBURSEMENT
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs text-slate-700 min-w-[1200px]">
                    <thead>
                      <tr className="bg-[#EDEDED] text-[11px] font-extrabold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                        <th className="px-3.5 py-3">Branch Name</th>
                        <th className="px-3.5 py-3">Request Reference No.</th>
                        <th className="px-3.5 py-3">Requested By</th>
                        <th className="px-3.5 py-3">Category</th>
                        <th className="px-3.5 py-3">Type</th>
                        <th className="px-3.5 py-3">Description</th>
                        <th className="px-3.5 py-3 text-right">Price</th>
                        <th className="px-3.5 py-3 text-center">Payment Method</th>
                        <th className="px-3.5 py-3">Payment Reference No.</th>
                        <th className="px-3.5 py-3 text-center">Payment Date</th>
                        <th className="px-3.5 py-3">Paid By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-normal text-slate-800">
                      {filteredReportReimbursements.length === 0 ? (
                        <tr>
                          <td
                            colSpan={11}
                            className="px-3.5 py-6 text-center text-xs text-slate-400"
                          >
                            No reimbursement records match the selected filters.
                          </td>
                        </tr>
                      ) : (
                        filteredReportReimbursements.map((r, idx) => (
                          <tr
                            key={r.id || idx}
                            className="hover:bg-slate-50/70 transition-colors"
                          >
                            <td className="px-3.5 py-2.5 font-semibold text-slate-900 whitespace-nowrap">
                              {valueOrNa(r.branchName || r.branch_name)}
                            </td>
                            <td className="px-3.5 py-2.5 font-medium text-slate-900 break-all whitespace-normal font-mono text-[11px] min-w-[140px] max-w-[200px]">
                              {valueOrNa(r.request_reference_no)}
                            </td>
                            <td className="px-3.5 py-2.5 whitespace-nowrap">
                              {valueOrNa(r.requested_by)}
                            </td>
                            <td className="px-3.5 py-2.5 whitespace-nowrap">
                              {valueOrNa(r.category)}
                            </td>
                            <td className="px-3.5 py-2.5 whitespace-nowrap">
                              {valueOrNa(r.type)}
                            </td>
                            <td className="px-3.5 py-2.5 break-words whitespace-normal min-w-[180px] max-w-[320px]">
                              {valueOrNa(r.description)}
                            </td>
                            <td className="px-3.5 py-2.5 text-right whitespace-nowrap font-bold text-[#0B5D1E]">
                              {formatPesoDisplay(r.price)}
                            </td>
                            <td className="px-3.5 py-2.5 text-center whitespace-nowrap text-slate-600">
                              {valueOrNa(r.payment_method)}
                            </td>
                            <td className="px-3.5 py-2.5 break-all whitespace-normal font-mono text-[11px] text-slate-600 min-w-[160px] max-w-[260px]">
                              {valueOrNa(r.payment_reference_no)}
                            </td>
                            <td className="px-3.5 py-2.5 text-center whitespace-nowrap text-slate-600">
                              {valueOrNa(r.payment_date)}
                            </td>
                            <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600">
                              {valueOrNa(r.paid_by)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── BOTTOM SUMMARY: TOTAL EXPENSES & BREAKDOWN (PENDING, PAID) ── */}
              <div className="border-t-2 border-slate-200 bg-slate-50 rounded-xl p-5 flex flex-col items-end gap-2">
                <div className="flex items-center justify-end gap-4">
                  <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700">
                    TOTAL EXPENSES:
                  </span>
                  <span className="text-base sm:text-lg font-extrabold text-[#0B5D1E] whitespace-nowrap">
                    ₱{" "}
                    {totalExpenses.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="border-t border-slate-200 pt-2.5 mt-1 flex items-start justify-end gap-6 text-xs">
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-bold text-slate-600 text-[11px] uppercase tracking-wider">
                      BREAKDOWN:
                    </span>
                    <span className="text-slate-500 font-semibold">PENDING:</span>
                    <span className="text-slate-500 font-semibold">PAID:</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className="text-transparent text-[11px] uppercase tracking-wider select-none"
                      aria-hidden="true"
                    >
                      &nbsp;
                    </span>
                    <span className="font-bold text-slate-900 whitespace-nowrap">
                      ₱{" "}
                      {totalPending.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="font-bold text-slate-900 whitespace-nowrap">
                      ₱{" "}
                      {totalPaid.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Action Buttons Below Report Preview (Excel, PDF, Print) ── */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 pb-6">
          <button
            type="button"
            onClick={handleDownloadExcel}
            disabled={reportLoading || totalReportRecordCount === 0}
            className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm transition cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet size={16} />
            <span>Download Excel</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={reportLoading || totalReportRecordCount === 0}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm transition cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown size={16} />
            <span>Download PDF</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={reportLoading || totalReportRecordCount === 0}
            className="px-4 py-2.5 rounded-xl bg-[#0B5D1E] hover:bg-[#084b18] text-white font-semibold text-xs sm:text-sm transition cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer size={16} />
            <span>Print</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: PAYMENT HISTORY (DEFAULT VIEW)
  // =========================================================================

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "History" },
          { label: "Finance Management History" },
        ]}
      />

      <div className="mb-5">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Finance Management History
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          All paid records across procurement, expenses, and reimbursements.
        </p>
      </div>

      <Tabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(t) => {
          setActiveTab(t);
          setPage(1);
          setQuery("");
        }}
      />

      {/* ── Toolbar: Search + Branch Filter + Date Range + Sort + Tab Filter + Report Action ── */}
      <div className="mt-4 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          {/* Search Bar */}
          <div className="w-full max-w-xs sm:w-72">
            <SearchFilter
              value={query}
              onSearch={(v) => {
                setQuery(v);
                setPage(1);
              }}
              placeholder={
                activeTab === "expenses"
                  ? "Search expense type, description, branch"
                  : activeTab === "payables"
                  ? "Search batch ID, supplier, product, branch"
                  : "Search category, description, recipient, branch"
              }
            />
          </div>

          {/* Branch Filter Dropdown (Same design as Manager Sales History) */}
          <div className="relative" ref={branchRef}>
            <button
              type="button"
              onClick={() => setShowBranchDrop((prev) => !prev)}
              className={`flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 justify-center transition-colors cursor-pointer h-[38px] ${
                selectedBranch !== "all"
                  ? "border-emerald-500 text-emerald-700 bg-emerald-50/40"
                  : ""
              }`}
            >
              <span>{selectedBranchLabel}</span>
              <ChevronDown
                size={14}
                className={`text-gray-500 transition-transform duration-200 ${
                  showBranchDrop ? "rotate-180" : ""
                }`}
              />
            </button>

            {showBranchDrop && (
              <div className="absolute top-full mt-2 left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-20 min-w-[200px] max-h-60 overflow-y-auto">
                {branchOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleBranchSelect(opt.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      String(selectedBranch) === String(opt.value)
                        ? "bg-[#EAF7E8] text-[#0B5D1E] font-bold"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <DateRangePicker
            onDateChange={({ startDate: s, endDate: e }) => {
              if (s && e && e < s) return;
              setDateRange({ startDate: s || "", endDate: e || "" });
              setPage(1);
            }}
          />

          <SortByDropdown
            options={SORT_OPTIONS}
            value={sortBy}
            onChange={(v) => {
              setSortBy(v);
              setPage(1);
            }}
          />

          {activeTab === "payables" && (
            <div className="w-full sm:w-48">
              <Dropdown
                options={supplierOptions}
                value={supplierFilter || "All Suppliers"}
                onChange={(val) => {
                  setSupplierFilter(val === "All Suppliers" ? "" : val);
                  setPage(1);
                }}
                placeholder="All Suppliers"
              />
            </div>
          )}

          {activeTab === "expenses" && (
            <div className="w-full sm:w-48">
              <Dropdown
                options={expenseTypeOptions}
                value={expenseTypeFilter || "All Expense Types"}
                onChange={(val) => {
                  setExpenseTypeFilter(val === "All Expense Types" ? "" : val);
                  setPage(1);
                }}
                placeholder="All Expense Types"
              />
            </div>
          )}

          {activeTab === "reimbursements" && (
            <div className="w-full sm:w-48">
              <Dropdown
                options={reimbursementCategoryOptions}
                value={reimbursementCategoryFilter || "All Categories"}
                onChange={(val) => {
                  setReimbursementCategoryFilter(val === "All Categories" ? "" : val);
                  setPage(1);
                }}
                placeholder="All Categories"
              />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            navigate("/miller-manager/finance-history/report", {
              state: { selectedBranch },
            })
          }
          className="inline-flex items-center gap-2 bg-[#0B5D1E] hover:bg-[#084b18] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer shadow-xs whitespace-nowrap h-[38px]"
        >
          <FileText size={16} />
          <span>Generate Financial Reports</span>
        </button>
      </div>

      {historyError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
          {historyError}
        </div>
      )}

      {/* ── SectionedTableCard with Branch Name as First Column ────────────────── */}
      <SectionedTableCard
        columns={historyColumns}
        sections={historySections}
        currentPage={safeHistoryPage}
        totalPages={historyTotalPages}
        onPageChange={setPage}
        emptyMessage={
          historyLoading
            ? "Loading payment records..."
            : "No paid records found matching your filters."
        }
        footerLabel={`Showing ${
          filteredHistoryRows.length === 0 ? 0 : historyStartIndex + 1
        }-${Math.min(
          historyStartIndex + historyItemsPerPage,
          filteredHistoryRows.length
        )} of ${filteredHistoryRows.length} payment records`}
      />

      {/* Payables Payment Receipt Modal */}
      <GoodsReceiptReceiptModal
        isOpen={Boolean(selectedPayableReceipt)}
        onClose={() => setSelectedPayableReceipt(null)}
        receipt={selectedPayableReceipt}
      />

      {/* Expenses Payment Receipt Modal */}
      <FinanceExpenseReceiptModal
        isOpen={Boolean(selectedExpenseReceipt)}
        onClose={() => setSelectedExpenseReceipt(null)}
        receipt={selectedExpenseReceipt}
      />

      {/* Reimbursement Payment Receipt Modal */}
      <ReimbursementReceiptModal
        isOpen={Boolean(selectedReimbursementReceipt)}
        onClose={() => setSelectedReimbursementReceipt(null)}
        receipt={selectedReimbursementReceipt}
        receiptData={selectedReimbursementReceipt}
      />
    </div>
  );
}