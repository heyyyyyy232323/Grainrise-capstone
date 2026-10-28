import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import Tabs from "../../Components/Minor-Components/Tabs";
import SortByDropdown from "../../Components/Minor-Components/SortByDropdown";
import FarmerContractHistoryDetailsModal from "../../Components/Modals/FarmerContractHistoryDetailsModal";
import POSSalesReceiptModal from "../../Components/Modals/MillerSales/POSSalesReceiptModal";
import useFarmerTransactionHistory from "../../Components/hooks/Farmer/useFarmerTransactionHistory";
import { translations, useLanguagePreference } from "../../lib/translations";

const PAGE_SIZE = 10;
const money = (value) => Number(value || 0).toLocaleString("en-PH", { style: "currency", currency: "PHP" });
const dateText = (value) => (value ? new Date(value).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "2-digit" }) : "—");
const label = (value) => String(value || "—").replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

function groupTransactions(rows) {
  const groups = new Map();

  rows.forEach((row) => {
    const reference = row.reference_no || row.referenceNo || row.transaction_code || row.transaction_id || "—";
    const current = groups.get(String(reference)) || { ...row, reference_no: reference, items: [], quantity_sold_kg: 0, amount: 0 };

    if (Array.isArray(row.items)) {
      current.items.push(...row.items);
      current.quantity_sold_kg += Number(row.total_quantity_kg ?? row.quantity_sold_kg ?? row.quantity_kg ?? 0);
      current.amount += Number(row.total_amount ?? row.amount ?? 0);
      current.transaction_date = current.transaction_date || row.transaction_date || row.created_at || row.date;
      current.payment_method = current.payment_method || row.payment_method;
      groups.set(String(reference), current);
      return;
    }

    const quantity = Number(row.quantity_sold_kg ?? row.quantity_kg ?? row.quantity ?? 0);
    const amount = Number(row.total_payment ?? row.amount ?? row.total_amount ?? row.line_total ?? 0);
    current.items.push({ ...row, quantity_kg: quantity, line_total: amount });
    current.quantity_sold_kg += quantity;
    current.amount += amount;
    current.transaction_date = current.transaction_date || row.created_at || row.date;
    current.payment_method = current.payment_method || row.payment_method;
    groups.set(String(reference), current);
  });

  return [...groups.values()];
}

function State({ children, error }) {
  return (
    <div className={`flex min-h-[150px] items-center justify-center rounded-xl border border-dashed p-8 text-center ${error ? "border-red-200 bg-red-50 text-red-700" : "border-slate-300 bg-white text-slate-500"}`}>
      {children}
    </div>
  );
}

function Pager({ pagination, page, onChange, t }) {
  const totalPages = Math.max(1, Number(pagination?.total_pages || 1));

  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
      <span>
        {pagination?.total || 0} {t.transactionHistory.transactions}
      </span>
      <div className="flex items-center gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className="rounded border p-1.5 disabled:opacity-40">
          <ChevronLeft size={16} />
        </button>
        <span>
          {t.transactionHistory.page} {page} of {totalPages}
        </span>
        <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)} className="rounded border p-1.5 disabled:opacity-40">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export default function FarmerTransactionHistory() {
  const [language] = useLanguagePreference();
  const t = translations[language]?.farmer ?? translations.en.farmer;

  const SORTS = [
    { value: "date-desc", label: t.transactionHistory.newestFirst },
    { value: "date-asc", label: t.transactionHistory.oldestFirst },
    { value: "amount-desc", label: t.transactionHistory.amountHighToLow },
    { value: "amount-asc", label: t.transactionHistory.amountLowToHigh },
  ];

  const PAYMENT_METHODS = [
    { value: "", label: t.transactionHistory.allPaymentMethods },
    "Cash",
    "GCash",
    "Bank Transfer",
    "Cheque",
    "Other",
  ];

  const {
    posTransactions,
    posPagination,
    contractHistory,
    contractPagination,
    selectedContract,
    isLoadingPos,
    isLoadingContracts,
    isLoadingContractDetails,
    error,
    loadPosTransactions,
    loadContractHistory,
    loadContractDetails,
    clearSelectedContract,
    clearError,
  } = useFarmerTransactionHistory();

  const [activeTab, setActiveTab] = useState("pos");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [page, setPage] = useState(1);
  const [contractPage, setContractPage] = useState(1);
  const [receipt, setReceipt] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);

  const fetchReceipt = useCallback(async (transaction) => {
    setReceiptLoading(true);
    setReceipt({ loading: true });

    try {
      if (transaction.receipt) {
        setReceipt(transaction.receipt);
        return;
      }

      const base = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
      const token = localStorage.getItem("grainrise_token") || localStorage.getItem("access_token") || "";
      const response = await fetch(`${base}/api/farmer/pos/receipt/${encodeURIComponent(transaction.reference_no)}/`, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Receipt not found.");
      setReceipt(data.receipt || data);
    } catch (err) {
      clearError();
      setReceipt({ error: err.message });
    } finally {
      setReceiptLoading(false);
    }
  }, [clearError]);

  useEffect(() => {
    if (activeTab !== "pos") return;

    const timer = setTimeout(() => {
      loadPosTransactions({ search, startDate, endDate, paymentMethod, sortBy, page, pageSize: PAGE_SIZE }).catch(() => {});
    }, 250);

    return () => clearTimeout(timer);
  }, [activeTab, search, startDate, endDate, paymentMethod, sortBy, page, loadPosTransactions]);

  useEffect(() => {
    if (activeTab === "contracts") loadContractHistory();
  }, [activeTab, loadContractHistory]);

  const grouped = useMemo(() => groupTransactions(posTransactions), [posTransactions]);
  const contracts = useMemo(
    () => contractHistory.filter((item) => `${item.contract_code} ${item.buyer_name} ${item.transaction_code}`.toLowerCase().includes(search.toLowerCase())),
    [contractHistory, search]
  );

  const setTab = (tab) => {
    setActiveTab(tab);
    setSearch("");
    setStartDate("");
    setEndDate("");
    setPaymentMethod("");
    setSortBy("date-desc");
    setPage(1);
    setContractPage(1);
    clearError();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <Breadcrumbs items={[{ label: t.transactionHistory.business }, { label: t.transactionHistory.title }]} />
        <h1 className="mt-2 text-[clamp(2rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-slate-900">{t.transactionHistory.title}</h1>
        <p className="text-sm text-slate-500">{t.transactionHistory.subtitle}</p>
      </div>

      <Tabs tabs={[{ id: "pos", label: t.transactionHistory.posTransactions }, { id: "contracts", label: t.transactionHistory.contractHistory }]} activeTab={activeTab} onTabChange={setTab} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <label className="flex-1 text-xs font-medium text-slate-600">
          {t.transactionHistory.search}
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
              setContractPage(1);
            }}
            placeholder={t.transactionHistory.searchPlaceholder}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>

        {activeTab === "pos" && (
          <>
            <label className="text-xs font-medium text-slate-600">
              {t.transactionHistory.from}
              <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-medium text-slate-600">
              {t.transactionHistory.to}
              <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-medium text-slate-600">
              {t.transactionHistory.paymentMethod}
              <select value={paymentMethod} onChange={(e) => { setPaymentMethod(e.target.value); setPage(1); }} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm">
                {PAYMENT_METHODS.map((method) =>
                  typeof method === "string" ? (
                    <option key={method} value={method}>{method}</option>
                  ) : (
                    <option key={method.value} value={method.value}>{method.label}</option>
                  )
                )}
              </select>
            </label>
            <SortByDropdown value={sortBy} onChange={(value) => { setSortBy(value); setPage(1); }} options={SORTS} />
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={17} />{error}
          <button type="button" className="ml-auto underline" onClick={() => setTab(activeTab)}>{t.transactionHistory.retry}</button>
        </div>
      )}

      {activeTab === "pos" ? (
        <section className="w-full overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
          {isLoadingPos ? (
            <State>
              <Loader2 className="animate-spin" size={20} />
              <span className="ml-2">{t.transactionHistory.loadingPosHistory}</span>
            </State>
          ) : grouped.length === 0 ? (
            <State>
              <div>
                <p className="font-semibold text-slate-700">{t.transactionHistory.noPosTransactionsFound}</p>
                <p className="mt-1 text-sm">{t.transactionHistory.posHistoryDescription}</p>
              </div>
            </State>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] table-fixed border-collapse text-[13px]">
                  <colgroup>
                    <col className="w-[16%]" />
                    <col className="w-[15%]" />
                    <col className="w-[22%]" />
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                    <col className="w-[11%]" />
                    <col className="w-[12%]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-[#EDEDED] text-left text-[11px] font-bold tracking-[0.03em] text-slate-600">
                      <th className="whitespace-nowrap px-4 py-3">{t.transactionHistory.referenceNo}</th>
                      <th className="whitespace-nowrap px-4 py-3">{t.transactionHistory.transactionDate}</th>
                      <th className="px-4 py-3">{t.transactionHistory.products}</th>
                      <th className="whitespace-nowrap px-4 py-3 text-center">{t.transactionHistory.quantity}</th>
                      <th className="whitespace-nowrap px-4 py-3 text-center">{t.transactionHistory.payment}</th>
                      <th className="whitespace-nowrap px-4 py-3 text-right">{t.transactionHistory.totalPayment}</th>
                      <th className="whitespace-nowrap px-4 py-3 text-center">{t.transactionHistory.action}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.map((item) => (
                      <tr key={item.reference_no} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                        <td className="truncate px-4 py-3 align-middle text-[13px] font-medium text-slate-700" title={item.reference_no}>{item.reference_no}</td>
                        <td className="whitespace-nowrap px-4 py-3 align-middle text-[13px] font-medium text-slate-700">{dateText(item.transaction_date)}</td>
                        <td className="px-4 py-3 align-middle text-[13px] font-medium text-slate-700">
                          <div className="line-clamp-2" title={item.items.map((line) => line.product_name || line.product_type).filter(Boolean).join(", ")}>
                            {item.items.map((line) => line.product_name || line.product_type).filter(Boolean).join(", ") || t.transactionHistory.notAvailable}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center align-middle text-[13px] font-medium text-slate-700">
                          {Number(item.quantity_sold_kg || 0).toLocaleString("en-PH")} {t.transactionHistory.kg}
                        </td>
                        <td className="px-4 py-3 text-center align-middle text-[13px] font-medium text-slate-700">
                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                            {label(item.payment_method)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right align-middle text-[13px] font-medium text-slate-700">{money(item.amount)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-center align-middle">
                          <button type="button" onClick={() => fetchReceipt(item)} className="cursor-pointer rounded-md border border-slate-300 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700">
                            {t.transactionHistory.viewDetails}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager pagination={posPagination} page={page} onChange={setPage} t={t} />
            </>
          )}
        </section>
      ) : (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {isLoadingContracts ? (
            <State><Loader2 className="animate-spin" /></State>
          ) : contracts.length === 0 ? (
            <State>
              <div>
                <p className="font-semibold text-slate-700">{t.transactionHistory.noContractHistoryFound}</p>
                <p className="mt-1 text-sm">{t.transactionHistory.contractHistoryDescription}</p>
              </div>
            </State>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead className="bg-[#EDEDED] text-left text-[11px] font-bold tracking-[0.03em] text-slate-600">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3">{t.transactionHistory.contract}</th>
                      <th className="whitespace-nowrap px-4 py-3">{t.transactionHistory.transactionDate}</th>
                      <th className="whitespace-nowrap px-4 py-3">{t.transactionHistory.buyer}</th>
                      <th className="whitespace-nowrap px-4 py-3 text-center">{t.transactionHistory.quantity}</th>
                      <th className="whitespace-nowrap px-4 py-3 text-right">{t.transactionHistory.totalPayment}</th>
                      <th className="whitespace-nowrap px-4 py-3">{t.transactionHistory.status}</th>
                      <th className="whitespace-nowrap px-4 py-3 text-center">{t.transactionHistory.action}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map((item) => (
                      <tr key={item.transaction_id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                        <td className="px-4 py-3 align-middle text-[13px] font-medium text-slate-700">{item.contract_code}</td>
                        <td className="whitespace-nowrap px-4 py-3 align-middle text-[13px] font-medium text-slate-700">{dateText(item.transaction_date)}</td>
                        <td className="px-4 py-3 align-middle text-[13px] font-medium text-slate-700">{item.buyer_name}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-center align-middle text-[13px] font-medium text-slate-700">
                          {Number(item.quantity_sold_kg || 0).toLocaleString()} {t.transactionHistory.kg}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right align-middle text-[13px] font-medium text-slate-700">{money(item.amount)}</td>
                        <td className="px-4 py-3 align-middle text-[13px] font-medium text-slate-700">{label(item.transaction_status)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-center align-middle">
                          <button type="button" className="cursor-pointer rounded-md border border-slate-300 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700" onClick={async () => { setContractOpen(true); await loadContractDetails(item.contract_id); }}>
                            {t.transactionHistory.viewDetails}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager pagination={{ ...contractPagination, total: contracts.length, total_pages: Math.max(1, Math.ceil(contracts.length / PAGE_SIZE)) }} page={contractPage} onChange={setContractPage} t={t} />
            </>
          )}
        </section>
      )}

      <POSSalesReceiptModal isOpen={Boolean(receipt) && !receiptLoading && !receipt?.error} receiptData={receipt} onClose={() => setReceipt(null)} receiptContextLabel="GrainRise Farmer POS" />
      <FarmerContractHistoryDetailsModal open={contractOpen} contract={selectedContract} isLoading={isLoadingContractDetails} onClose={() => { setContractOpen(false); clearSelectedContract(); }} />
    </div>
  );
}
