import { useCallback, useState } from "react";
import useApi from "../useApi";

// Contract history is intentionally kept separate from POS history.  The
// contract API predates this hook, so its existing data contract is preserved.
const SAMPLE_CONTRACT_HISTORY = [
  {
    transaction_id: 201, contract_id: 301, contract_code: "CTR-2026-088",
    transaction_code: "PAY-CTR-088", contract_date: "2026-09-01",
    transaction_date: "2026-10-20", buyer_name: "Golden Grains Rice Mill",
    product_type: "Dry Palay (14% MC)", product_grade: "Grade 1",
    contracted_quantity_kg: 12000, quantity_sold_kg: 8000,
    agreed_price_per_kg: 23.5, amount: 188000, payment_method: "Direct Bank Payout",
    transaction_status: "partially_paid", transaction_type: "Contract Milestone",
  },
  {
    transaction_id: 202, contract_id: 302, contract_code: "CTR-2026-042",
    transaction_code: "PAY-CTR-042", contract_date: "2026-06-01",
    transaction_date: "2026-09-28", buyer_name: "Plaridel Grain Logistics Mill",
    product_type: "Clean & Dry Palay", product_grade: "Premium Aromatic",
    contracted_quantity_kg: 9000, quantity_sold_kg: 9000,
    agreed_price_per_kg: 25, amount: 225000, payment_method: "Check / Bank Deposit",
    transaction_status: "completed", transaction_type: "Contract Final Settlement",
  },
];

const emptyPagination = { page: 1, limit: 10, total: 0, total_pages: 1 };

const listFrom = (payload) => {
  if (Array.isArray(payload)) return payload;
  return payload?.transactions || payload?.sales || payload?.results || payload?.data || [];
};

const paginationFrom = (payload, fallbackPage, fallbackLimit, count) => {
  const p = payload?.pagination || payload?.meta || payload || {};
  const total = Number(p.total ?? p.count ?? count);
  return {
    page: Number(p.page ?? p.current_page ?? fallbackPage),
    limit: Number(p.limit ?? p.page_size ?? p.per_page ?? fallbackLimit),
    total: Number.isFinite(total) ? total : count,
    total_pages: Number(p.total_pages ?? p.num_pages ?? Math.max(1, Math.ceil(total / fallbackLimit))),
  };
};

export default function useFarmerTransactionHistory() {
  const { request } = useApi();
  const [posTransactions, setPosTransactions] = useState([]);
  const [posPagination, setPosPagination] = useState(emptyPagination);
  const [posSummary, setPosSummary] = useState({});
  const [contractHistory, setContractHistory] = useState(SAMPLE_CONTRACT_HISTORY);
  const [contractPagination, setContractPagination] = useState({
    page: 1, limit: 10, total: SAMPLE_CONTRACT_HISTORY.length, total_pages: 1,
  });
  const [selectedContract, setSelectedContract] = useState(null);
  const [isLoadingPos, setIsLoadingPos] = useState(false);
  const [isLoadingContracts, setIsLoadingContracts] = useState(false);
  const [isLoadingContractDetails, setIsLoadingContractDetails] = useState(false);
  const [error, setError] = useState("");

  const loadPosTransactions = useCallback(async (filters = {}) => {
    setIsLoadingPos(true);
    setError("");
    try {
      const params = new URLSearchParams();
      const names = {
        search: "search", startDate: "start_date", endDate: "end_date",
        paymentMethod: "payment_method", sortBy: "sort", page: "page", pageSize: "page_size",
      };
      Object.entries(names).forEach(([key, name]) => {
        if (filters[key] !== undefined && filters[key] !== "") params.set(name, filters[key]);
      });
      const payload = await request(`/farmer/transaction-history/pos/?${params.toString()}`, { throwOnError: true });
      const rows = listFrom(payload);
      setPosTransactions(rows);
      setPosPagination(paginationFrom(payload, filters.page || 1, filters.pageSize || 10, rows.length));
      setPosSummary(payload?.summary || {});
      return rows;
    } catch (err) {
      setPosTransactions([]);
      setPosPagination({ ...emptyPagination, page: filters.page || 1 });
      setError(err?.message || "Unable to load POS transaction history.");
      throw err;
    } finally {
      setIsLoadingPos(false);
    }
  }, [request]);

  const loadContractHistory = useCallback(async () => {
    setIsLoadingContracts(false);
    setContractHistory(SAMPLE_CONTRACT_HISTORY);
    setContractPagination({ page: 1, limit: 10, total: SAMPLE_CONTRACT_HISTORY.length, total_pages: 1 });
    return SAMPLE_CONTRACT_HISTORY;
  }, []);

  const loadContractDetails = useCallback(async (id) => {
    setIsLoadingContractDetails(true);
    const found = contractHistory.find((item) =>
      Number(item.contract_id) === Number(id) || Number(item.transaction_id) === Number(id)
    ) || null;
    setSelectedContract(found);
    setIsLoadingContractDetails(false);
    return found;
  }, [contractHistory]);

  return {
    posTransactions, posPagination, posSummary, contractHistory, contractPagination,
    selectedContract, isLoadingPos, isLoadingPosSummary: false, isLoadingContracts,
    isLoadingContractDetails, error, loadPosTransactions, loadPosSummary: async () => ({}),
    loadContractHistory, loadContractDetails, clearSelectedContract: () => setSelectedContract(null),
    clearError: () => setError(""),
  };
}
