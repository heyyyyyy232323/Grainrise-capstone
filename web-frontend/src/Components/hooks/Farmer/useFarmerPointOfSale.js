import { useCallback, useState } from "react";

const SAMPLE_POS_PRODUCTS = [
  {
    product_id: 1,
    product_code: "RC222-25KG",
    product_name: "RC 222 (Tubigan 18)",
    rice_variety: "RC 222",
    product_grade: "Grade 1",
    product_type: "Well-Milled Rice",
    price_per_kg: 50.0,
    price_per_sack: 1250.0,
    sack_weight_kg: 25,
    available_sacks: 80,
    status: "in_stock",
  },
  {
    product_id: 2,
    product_code: "RC160-25KG",
    product_name: "NSIC Rc 160",
    rice_variety: "NSIC Rc 160",
    product_grade: "Grade 2",
    product_type: "Well-Milled Rice",
    price_per_kg: 48.0,
    price_per_sack: 1200.0,
    sack_weight_kg: 25,
    available_sacks: 120,
    status: "in_stock",
  },
  {
    product_id: 3,
    product_code: "ANG-25KG",
    product_name: "Angelica Special",
    rice_variety: "Angelica Special",
    product_grade: "Premium Aromatic",
    product_type: "Premium Rice",
    price_per_kg: 56.0,
    price_per_sack: 1400.0,
    sack_weight_kg: 25,
    available_sacks: 25,
    status: "in_stock",
  },
];

const useFarmerPointOfSale = () => {
  const [products, setProducts] = useState(SAMPLE_POS_PRODUCTS);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState("");

  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(false);
    return products;
  }, [products]);

  const checkout = useCallback(async (payload) => {
    setIsCheckingOut(true);
    const txn = {
      transaction_id: Date.now(),
      transaction_code: `TXN-${Date.now().toString().slice(-6)}`,
      total_amount: payload.total_amount || 1250,
      payment_method: payload.payment_method || "Cash",
      items: payload.items || [],
      created_at: new Date().toISOString(),
    };
    setLastTransaction(txn);
    setIsCheckingOut(false);
    return { success: true, data: txn };
  }, []);

  const clearError = useCallback(() => setError(""), []);
  const clearLastTransaction = useCallback(() => setLastTransaction(null), []);

  return {
    products,
    lastTransaction,
    isLoadingProducts,
    isCheckingOut,
    error,
    loadProducts,
    checkout,
    clearError,
    clearLastTransaction,
  };
};

export default useFarmerPointOfSale;
