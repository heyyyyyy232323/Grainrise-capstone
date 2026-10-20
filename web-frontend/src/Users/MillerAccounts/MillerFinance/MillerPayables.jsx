import { useMemo, useState, useEffect, useCallback } from "react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import Dropdown from "../../../Components/Minor-Components/Dropdown";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import useApi from "../../../Components/hooks/useApi";
import ToastNotification from "../../../Components/Modals/Toast";
import PayNowModal from "../../../Components/Modals/MillerFinance/PayNowModal";
import GoodsReceiptReceiptModal from "../../../Components/Modals/MillerProcurement/GoodsReceiptReceiptModal";

const SORT_OPTIONS = [
  { value: "batch-asc", label: "Batch No. (A-Z)" },
  { value: "batch-desc", label: "Batch No. (Z-A)" },
  { value: "supplier-asc", label: "Supplier (A-Z)" },
  { value: "supplier-desc", label: "Supplier (Z-A)" },
  { value: "variant-asc", label: "Variant (A-Z)" },
  { value: "variant-desc", label: "Variant (Z-A)" },
  { value: "total-desc", label: "Total (High to Low)" },
  { value: "total-asc", label: "Total (Low to High)" },
];

export default function MillerPayables() {
  const { request } = useApi();

  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [supplier, setSupplier] = useState("");
  const [sortBy, setSortBy] = useState("batch-asc");
  const [page, setPage] = useState(1);

  // Strict modal management: exactly one modal at a time ('pay_now' | 'receipt' | null)
  const [activeModal, setActiveModal] = useState(null);
  const [selectedPayable, setSelectedPayable] = useState(null);
  const [receiptData, setReceiptData] = useState(null);

  // Toast feedback
  const [toast, setToast] = useState(null);

  // Fetch real request_to_pay records from backend
  const fetchPayables = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await request("/miller-employees/finance/payables/", {
        method: "GET",
      });
      if (res && res.success && res.data) {
        setRecords(res.data.records || []);
      }
    } catch (err) {
      console.error("Failed to load payables:", err);
      const msg = err?.message || err?.detail || "";
      const cleanMsg =
        typeof msg === "string" && msg.trim() && !/<[a-z][\s\S]*>/i.test(msg)
          ? msg
          : "Failed to load payables records. Please refresh the page.";
      setToast({
        type: "error",
        message: cleanMsg,
      });
    } finally {
      setIsLoading(false);
    }
  }, [request]);

  useEffect(() => {
    fetchPayables();
  }, [fetchPayables]);

  // Dynamically populate supplier dropdown from actual available suppliers
  const supplierOptions = useMemo(() => {
    const names = Array.from(
      new Set(records.map((r) => r.supplier).filter(Boolean))
    ).sort();
    return [
      { label: "All Suppliers", value: "" },
      ...names.map((name) => ({ label: name, value: name })),
    ];
  }, [records]);

  // Combined client-side filtering and sorting
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = records.filter((r) => {
      if (
        q &&
        !(
          `${r.batchNo || ""} ${r.batch_no || ""} ${r.supplier || ""} ${r.variant || ""} ${r.reference_no || ""} ${r.receiving_reference_no || ""}`
            .toLowerCase()
            .includes(q)
        )
      ) {
        return false;
      }
      if (supplier && supplier !== "") {
        return r.supplier === supplier;
      }
      return true;
    });

    if (sortBy === "batch-asc") {
      result.sort((a, b) =>
        String(a.batchNo || "").localeCompare(String(b.batchNo || ""))
      );
    } else if (sortBy === "batch-desc") {
      result.sort((a, b) =>
        String(b.batchNo || "").localeCompare(String(a.batchNo || ""))
      );
    } else if (sortBy === "supplier-asc") {
      result.sort((a, b) =>
        String(a.supplier || "").localeCompare(String(b.supplier || ""))
      );
    } else if (sortBy === "supplier-desc") {
      result.sort((a, b) =>
        String(b.supplier || "").localeCompare(String(a.supplier || ""))
      );
    } else if (sortBy === "variant-asc") {
      result.sort((a, b) =>
        String(a.variant || "").localeCompare(String(b.variant || ""))
      );
    } else if (sortBy === "variant-desc") {
      result.sort((a, b) =>
        String(b.variant || "").localeCompare(String(a.variant || ""))
      );
    } else if (sortBy === "total-desc") {
      result.sort(
        (a, b) => (Number(b.total_raw) || 0) - (Number(a.total_raw) || 0)
      );
    } else if (sortBy === "total-asc") {
      result.sort(
        (a, b) => (Number(a.total_raw) || 0) - (Number(b.total_raw) || 0)
      );
    }
    return result;
  }, [records, query, supplier, sortBy]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (page - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);
  const sections = useMemo(() => [{ rows: paginated }], [paginated]);

  // Modal handlers
  const handleOpenPayNow = (row) => {
    setSelectedPayable(row);
    setReceiptData(null);
    setActiveModal("pay_now");
  };

  const handleClosePayNow = () => {
    setActiveModal(null);
    setSelectedPayable(null);
  };

  const handlePaymentSuccess = (receipt) => {
    // 1. Close and unmount Pay Now modal FIRST
    setActiveModal(null);
    setSelectedPayable(null);

    // 2. Refresh Payables table so paid record immediately disappears from list
    fetchPayables();

    // 3. Open Receipt Modal with returned receipt
    setReceiptData(receipt);
    setActiveModal("receipt");
  };

  const handleCloseReceiptModal = () => {
    // Closes completely and returns directly to Payables Table
    setActiveModal(null);
    setReceiptData(null);
    setSelectedPayable(null);
  };

  const columns = [
    { key: "batchNo", label: "Batch No." },
    { key: "supplier", label: "Supplier" },
    { key: "variant", label: "Variant" },
    { key: "stockQty", label: "Stock Qty (KG)" },
    { key: "unitPrice", label: "Unit Price" },
    { key: "total", label: "Total" },
    { key: "requestedBy", label: "Requested By" },
    {
      key: "action",
      label: "Action",
      headerClassName: "text-center",
      cellClassName: "!text-center !pr-3",
      render: (row) => (
        <button
          type="button"
          onClick={() => handleOpenPayNow(row)}
          className="inline-flex items-center justify-center px-3 py-1 h-7 rounded-lg text-white text-xs font-semibold hover:bg-[#016b0f] transition cursor-pointer"
          style={{ backgroundColor: "#018311", minWidth: 72 }}
        >
          Pay Now
        </button>
      ),
    },
  ];

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Finance", path: "/miller-finance/dashboard" },
          { label: "Payables" },
        ]}
      />

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Payables</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review goods receipts requested for payment by procurement staff.
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
              placeholder="Search batch no., supplier, product"
            />
          </div>

          <div className="w-full sm:w-40">
            <Dropdown
              options={supplierOptions}
              value={supplier}
              onChange={(v) => {
                setSupplier(v);
                setPage(1);
              }}
              placeholder="Supplier"
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
          {filtered.length} for payment
        </div>
      </div>

      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        footerLabel={`Showing ${filtered.length > 0 ? startIndex + 1 : 0}-${Math.min(
          startIndex + itemsPerPage,
          filtered.length
        )} of ${filtered.length} payable requests`}
      />

      {/* ── Strict Modal Flow: One Modal At A Time ───────────────────────── */}

      {/* 1. Pay Now Modal */}
      {activeModal === "pay_now" && selectedPayable && (
        <PayNowModal
          isOpen={activeModal === "pay_now"}
          onClose={handleClosePayNow}
          payable={selectedPayable}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* 2. Official Goods & Payment Receipt Modal */}
      {activeModal === "receipt" && receiptData && (
        <GoodsReceiptReceiptModal
          isOpen={activeModal === "receipt"}
          onClose={handleCloseReceiptModal}
          receipt={receiptData}
        />
      )}

      {/* Toast notifications */}
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
