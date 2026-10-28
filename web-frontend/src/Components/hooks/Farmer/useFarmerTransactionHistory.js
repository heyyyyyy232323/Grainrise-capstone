import { useCallback, useState } from "react";

const SAMPLE_POS_TRANSACTIONS = [
  {
    transaction_id: 1,
    transaction_code: "TXN-2026-1001",
    transaction_date: "2026-10-25 14:30",
    buyer_name: "Aling Nena General Store",
    payment_method: "Cash",
    product_type: "Milled Rice",
    product_grade: "Premium",
    quantity_sold_kg: 250,
    amount: 12500.0,
    transaction_status: "completed",
    transaction_type: "POS Walk-in",
  },
  {
    transaction_id: 2,
    transaction_code: "TXN-2026-1002",
    transaction_date: "2026-10-24 10:15",
    buyer_name: "Mang Juan Sari-Sari",
    payment_method: "GCash",
    product_type: "Sinandomeng",
    product_grade: "Grade 1",
    quantity_sold_kg: 500,
    amount: 24500.0,
    transaction_status: "completed",
    transaction_type: "POS Walk-in",
  },
  {
    transaction_id: 3,
    transaction_code: "TXN-2026-1003",
    transaction_date: "2026-10-22 16:45",
    buyer_name: "Caballero Retail",
    payment_method: "Bank Transfer",
    product_type: "Dinorado",
    product_grade: "Special",
    quantity_sold_kg: 1000,
    amount: 52000.0,
    transaction_status: "completed",
    transaction_type: "Wholesale Walk-in",
  },
];

const SAMPLE_POS_SUMMARY = {
  completed_transactions: 12,
  product_lines_sold: 15,
  total_quantity_sold_kg: 8400,
  total_revenue: 198500,
};

const SAMPLE_CONTRACT_HISTORY = [
  {
    transaction_id: 201,
    contract_id: 301,
    contract_code: "CTR-2026-088",
    transaction_code: "PAY-CTR-088",
    contract_date: "2026-09-01",
    transaction_date: "2026-10-20",
    buyer_name: "Golden Grains Rice Mill",
    product_type: "Dry Palay (14% MC)",
    product_grade: "Grade 1",
    contracted_quantity_kg: 12000,
    quantity_sold_kg: 8000,
    agreed_price_per_kg: 23.5,
    amount: 188000.0,
    payment_method: "Direct Bank Payout",
    transaction_status: "partially_paid",
    transaction_type: "Contract Milestone",
  },
  {
    transaction_id: 202,
    contract_id: 302,
    contract_code: "CTR-2026-042",
    transaction_code: "PAY-CTR-042",
    contract_date: "2026-06-01",
    transaction_date: "2026-09-28",
    buyer_name: "Plaridel Grain Logistics Mill",
    product_type: "Clean & Dry Palay",
    product_grade: "Premium Aromatic",
    contracted_quantity_kg: 9000,
    quantity_sold_kg: 9000,
    agreed_price_per_kg: 25.0,
    amount: 225000.0,
    payment_method: "Check / Bank Deposit",
    transaction_status: "completed",
    transaction_type: "Contract Final Settlement",
  },
];

export const useFarmerTransactionHistory = () => {
  const [posTransactions, setPosTransactions] = useState(SAMPLE_POS_TRANSACTIONS);
  const [posPagination, setPosPagination] = useState({
    page: 1,
    limit: 10,
    total: SAMPLE_POS_TRANSACTIONS.length,
    total_pages: 1,
  });
  const [posSummary, setPosSummary] = useState(SAMPLE_POS_SUMMARY);

  const [contractHistory, setContractHistory] = useState(SAMPLE_CONTRACT_HISTORY);
  const [contractPagination, setContractPagination] = useState({
    page: 1,
    limit: 10,
    total: SAMPLE_CONTRACT_HISTORY.length,
    total_pages: 1,
  });
  const [selectedContract, setSelectedContract] = useState(SAMPLE_CONTRACT_HISTORY[0]);

  const [isLoadingPos, setIsLoadingPos] = useState(false);
  const [isLoadingPosSummary, setIsLoadingPosSummary] = useState(false);
  const [isLoadingContracts, setIsLoadingContracts] = useState(false);
  const [isLoadingContractDetails, setIsLoadingContractDetails] = useState(false);
  const [error, setError] = useState("");

  const loadPosTransactions = useCallback(async () => {
    setIsLoadingPos(false);
    return SAMPLE_POS_TRANSACTIONS;
  }, []);

  const loadPosSummary = useCallback(async () => {
    setIsLoadingPosSummary(false);
    return SAMPLE_POS_SUMMARY;
  }, []);

  const loadContractHistory = useCallback(async () => {
    setIsLoadingContracts(false);
    return SAMPLE_CONTRACT_HISTORY;
  }, []);

  const loadContractDetails = useCallback(
    async (contractId) => {
      setIsLoadingContractDetails(false);
      const c =
        contractHistory.find(
          (item) => Number(item.contract_id) === Number(contractId) || Number(item.transaction_id) === Number(contractId)
        ) || contractHistory[0];
      if (c) setSelectedContract(c);
      return c;
    },
    [contractHistory]
  );

  const clearSelectedContract = useCallback(() => setSelectedContract(null), []);
  const clearError = useCallback(() => setError(""), []);

  return {
    posTransactions,
    posPagination,
    posSummary,

    contractHistory,
    contractPagination,
    selectedContract,

    isLoadingPos,
    isLoadingPosSummary,
    isLoadingContracts,
    isLoadingContractDetails,

    error,

    loadPosTransactions,
    loadPosSummary,

    loadContractHistory,
    loadContractDetails,
    clearSelectedContract,

    clearError,
  };
};

export default useFarmerTransactionHistory;
