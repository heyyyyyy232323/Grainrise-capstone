import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

export default function MillerFinancePaymentHistory() {
  const navigate = useNavigate();
  const { request } = useApi();

  const [activeTab, setActiveTab] = useState("payables");
  const [query, setQuery] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [sortBy, setSortBy] = useState("date-desc");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [expenseTypeFilter, setExpenseTypeFilter] = useState("");
  const [reimbursementCategoryFilter, setReimbursementCategoryFilter] = useState("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await request("/miller-employees/finance/payment-history/", {
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
      setError(err?.message || "Failed to load finance payment history.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const rawRows = useMemo(() => {
    if (activeTab === "payables") {
      return payablesData.map((item) => ({
        ...item,
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const { startDate, endDate } = dateRange;

    let result = rawRows.filter((row) => {
      // Tab-specific dropdown filter
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

      // Validated Date Range filter (startDate <= row._dateIso <= endDate)
      if (startDate || endDate) {
        if (startDate && endDate && endDate < startDate) {
          return true;
        }
        const rowDate = row._dateIso;
        if (!rowDate) return false;
        if (startDate && rowDate < startDate) return false;
        if (endDate && rowDate > endDate) return false;
      }

      // Search filter
      if (!q) return true;
      if (activeTab === "payables") {
        return [
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
    rawRows,
    activeTab,
    query,
    dateRange,
    sortBy,
    supplierFilter,
    expenseTypeFilter,
    reimbursementCategoryFilter,
  ]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);
  const sections = [{ rows: paginated }];

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
            business_name: raw.business_name,
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

  const columns = useMemo(() => {
    if (activeTab === "payables") {
      return [
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

  const handleDateChange = ({ startDate, endDate }) => {
    if (startDate && endDate && endDate < startDate) {
      return;
    }
    setDateRange({ startDate: startDate || "", endDate: endDate || "" });
    setPage(1);
  };

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Finance", path: "/miller-finance/dashboard" },
          { label: "Payment History" },
        ]}
      />

      <div className="mb-5">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Payment History
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

      {/* Search + Filters + Generate Financial Reports */}
      <div className="mt-4 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <div className="w-full max-w-xs sm:w-72">
            <SearchFilter
              value={query}
              onSearch={(v) => {
                setQuery(v);
                setPage(1);
              }}
              placeholder={
                activeTab === "expenses"
                  ? "Search expense type, description"
                  : activeTab === "payables"
                  ? "Search batch ID, supplier, product"
                  : "Search category, description, recipient"
              }
            />
          </div>

          <DateRangePicker onDateChange={handleDateChange} />

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
          onClick={() => navigate("/miller-finance/payment-history/report")}
          className="inline-flex items-center gap-2 bg-[#018311] hover:bg-[#016b0f] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
        >
          📄 Generate Financial Reports
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyMessage={
          loading
            ? "Loading payment records..."
            : "No paid records found matching your filters."
        }
        footerLabel={`Showing ${
          filtered.length === 0 ? 0 : startIndex + 1
        }-${Math.min(startIndex + itemsPerPage, filtered.length)} of ${
          filtered.length
        } payment records`}
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
