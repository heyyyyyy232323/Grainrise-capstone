import { useCallback, useState } from "react";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

const token = () =>
  sessionStorage.getItem("grainrise_token") ||
  localStorage.getItem("grainrise_token") ||
  localStorage.getItem("access_token") ||
  "";

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || data.message || `Request failed (HTTP ${response.status}).`);
  }
  return data;
};

const mapProduct = (p) => ({
  id: p.product_id || p.farmer_product_id || p.id,
  productId: p.product_id || p.farmer_product_id || p.id,
  name: p.product_name || p.productName || p.name || "Unnamed product",
  sku: p.product_code || p.sku || p.code || "",
  price: Number(p.price_per_kg ?? p.selling_price_per_kg ?? p.price ?? 0),
  unitLabel: p.unit_label || p.unit || "Per kg",
  stockAvailable: Number(
    p.available_stock_quantity_kg ?? p.stock_available ?? p.available_kg ?? p.quantity ?? 0
  ),
  stockUnit: p.stock_unit || "kg",
  image: p.image || p.image_url || "",
  category: p.category || p.product_type || "",
});

export default function useFarmerPointOfSale() {
  const [products, setProducts] = useState([]);
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  // The Farmer POS contract currently exposes no payment-account endpoint.
  // Keep Cash as the only advertised method until the API returns methods.
  const [paymentMethods, setPaymentMethods] = useState(["Cash"]);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState("");

  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    setError("");
    try {
      const data = await request("/api/farmer/pos/products/");
      const mapped = (Array.isArray(data.products) ? data.products : []).map(mapProduct);
      setProducts(mapped);
      setPaymentAccounts(Array.isArray(data.payment_accounts) ? data.payment_accounts : []);
      if (Array.isArray(data.payment_methods) && data.payment_methods.length) {
        setPaymentMethods(data.payment_methods.map((m) => (typeof m === "string" ? m : m.label || m.name)));
      }
      return mapped;
    } catch (err) {
      setError(err.message || "Unable to load Farmer POS products.");
      return [];
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  const checkout = useCallback(async (payload) => {
    setIsCheckingOut(true);
    setError("");
    try {
      const data = await request("/api/farmer/pos/checkout/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const transaction = data.receipt || data.transaction || data;
      setLastTransaction(transaction);
      return { success: true, data: transaction };
    } catch (err) {
      setError(err.message || "Unable to complete transaction.");
      return { success: false, error: err.message };
    } finally {
      setIsCheckingOut(false);
    }
  }, []);

  return {
    products, paymentAccounts, paymentMethods, lastTransaction,
    isLoadingProducts, isCheckingOut, error, loadProducts, checkout,
    clearError: () => setError(""),
    clearLastTransaction: () => setLastTransaction(null),
  };
}
