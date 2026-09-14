import { useMemo, useState } from "react";
import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import riceSackImg from "../../assets/graintablee.jpg";
import {
  Search,
  ChevronDown,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  ShoppingBag,
} from "lucide-react";

// ============================================================
// SAMPLE PRODUCTS (15 items matching the design)
// ============================================================
const initialSampleProducts = Array.from({ length: 15 }, (_, i) => ({
  id: `farmer-prod-${i + 1}`,
  name: "Dinorado Rice",
  sku: "WH-001",
  price: 1500,
  unitLabel: "Per Sack",
  stockAvailable: 300,
  stockUnit: "sacks",
  image: riceSackImg,
}));

const stockFilterOptions = [
  { value: "all", label: "All" },
  { value: "in-stock", label: "In Stock" },
  { value: "low-stock", label: "Low Stock" },
];

const paymentMethods = [
  "Cash on Delivery",
  "Cash",
  "GCash",
  "Bank Transfer",
  "Credit Card",
];

const PRODUCTS_PER_PAGE = 9;
const LOW_STOCK_THRESHOLD = 50;

export default function FarmerPointOfSale() {
  // Product & Filter State
  const [products] = useState(initialSampleProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Cart State (Pre-populated with 4 items of qty 2 to exactly mirror the reference image)
  const [cartItems, setCartItems] = useState([
    {
      id: "cart-item-1",
      productId: "farmer-prod-1",
      name: "Dinorado Rice",
      price: 1500,
      unitLabel: "Per Sack",
      quantity: 2,
    },
    {
      id: "cart-item-2",
      productId: "farmer-prod-2",
      name: "Dinorado Rice",
      price: 1500,
      unitLabel: "Per Sack",
      quantity: 2,
    },
    {
      id: "cart-item-3",
      productId: "farmer-prod-3",
      name: "Dinorado Rice",
      price: 1500,
      unitLabel: "Per Sack",
      quantity: 2,
    },
    {
      id: "cart-item-4",
      productId: "farmer-prod-4",
      name: "Dinorado Rice",
      price: 1500,
      unitLabel: "Per Sack",
      quantity: 2,
    },
  ]);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState("Cash on Delivery");
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const [amountPaidInput, setAmountPaidInput] = useState("12000");
  const [transactionSuccess, setTransactionSuccess] = useState(false);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !`${p.name} ${p.sku}`.toLowerCase().includes(q)) return false;
      if (stockFilter === "in-stock") return p.stockAvailable > 0;
      if (stockFilter === "low-stock")
        return p.stockAvailable > 0 && p.stockAvailable < LOW_STOCK_THRESHOLD;
      return true;
    });
  }, [products, searchQuery, stockFilter]);

  const inStockCount = useMemo(
    () => products.filter((p) => p.stockAvailable > 0).length,
    [products]
  );
  const lowStockCount = useMemo(
    () =>
      products.filter(
        (p) => p.stockAvailable > 0 && p.stockAvailable < LOW_STOCK_THRESHOLD
      ).length,
    [products]
  );

  const totalPages = Math.max(
    Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE),
    1
  );
  const safePage = Math.min(currentPage, totalPages);

  const paginatedProducts = useMemo(() => {
    const start = (safePage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [filteredProducts, safePage]);

  const rangeStart =
    filteredProducts.length === 0 ? 0 : (safePage - 1) * PRODUCTS_PER_PAGE + 1;
  const rangeEnd = Math.min(
    safePage * PRODUCTS_PER_PAGE,
    filteredProducts.length
  );

  // Cart Calculations
  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );
  const total = subtotal;
  const numericAmountPaid = parseFloat(amountPaidInput) || 0;
  const change = Math.max(0, numericAmountPaid - total);

  // Handlers
  const handleAddToCart = (product) => {
    setTransactionSuccess(false);
    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.productId === product.id
      );
      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      }
      return [
        ...prev,
        {
          id: `cart-item-${Date.now()}-${product.id}`,
          productId: product.id,
          name: product.name,
          price: product.price,
          unitLabel: product.unitLabel || "Per Sack",
          quantity: 1,
        },
      ];
    });
  };

  const handleUpdateQuantity = (cartItemId, newQty) => {
    if (newQty <= 0) {
      handleRemoveItem(cartItemId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === cartItemId ? { ...item, quantity: newQty } : item
      )
    );
  };

  const handleRemoveItem = (cartItemId) => {
    setCartItems((prev) => prev.filter((item) => item.id !== cartItemId));
  };

  const handleClearCart = () => {
    setCartItems([]);
    setAmountPaidInput("");
    setTransactionSuccess(false);
  };

  const handleCompleteTransaction = () => {
    if (cartItems.length === 0) return;
    setTransactionSuccess(true);
    setTimeout(() => {
      setCartItems([]);
      setAmountPaidInput("");
    }, 1500);
  };

  return (
    <div className="w-full space-y-4 pb-12">
      {/* Breadcrumb */}
      <Breadcrumbs
        items={[
          { label: "Farmer", path: "/farmer/dashboard" },
          { label: "Point of Sale" },
        ]}
      />

      {/* Page Header */}
      <div className="mb-2">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Point of Sale
        </h1>
        <p className="text-xs md:text-sm text-gray-500 mt-0.5">
          Browse available warehouse products and process walk-in retailer transactions efficiently.
        </p>
      </div>

      {/* Success Notification */}
      {transactionSuccess && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 animate-in fade-in duration-300 shadow-sm">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Transaction Completed Successfully!</p>
            <p className="text-xs text-emerald-700">Inventory stock updated and receipt recorded.</p>
          </div>
        </div>
      )}

      {/* Main Layout: Products Grid (Left) + Current Sale Drawer (Right) */}
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* =========================================================
            LEFT COLUMN: Products Area
        ========================================================== */}
        <div className="flex-1 w-full min-w-0">
          {/* Search & Filter Row */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search product code, variant, or product name"
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-xs md:text-sm outline-none transition focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
              />
            </div>

            {/* Dropdown Filter */}
            <div className="relative shrink-0">
              <select
                value={stockFilter}
                onChange={(e) => {
                  setStockFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-4 pr-9 text-xs md:text-sm font-medium text-gray-700 outline-none transition hover:border-gray-300 focus:border-emerald-600 cursor-pointer shadow-xs"
              >
                {stockFilterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>

          {/* Stock Count Pill Badges */}
          <div className="flex flex-wrap items-center gap-2.5 mb-5">
            <button
              type="button"
              onClick={() => {
                setStockFilter((prev) => (prev === "in-stock" ? "all" : "in-stock"));
                setCurrentPage(1);
              }}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold transition border ${
                stockFilter === "in-stock"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              8 Products In Stock
            </button>
            <button
              type="button"
              onClick={() => {
                setStockFilter((prev) => (prev === "low-stock" ? "all" : "low-stock"));
                setCurrentPage(1);
              }}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold transition border ${
                stockFilter === "low-stock"
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
              }`}
            >
              0 Low Stock Products
            </button>
          </div>

          {/* 3x3 Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {paginatedProducts.map((product) => (
              <div
                key={product.id}
                className="group flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition duration-200"
              >
                {/* Product Image */}
                <div className="relative h-40 w-full overflow-hidden bg-gray-100">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Product Info */}
                <div className="p-4 flex flex-col flex-1 justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-emerald-800 leading-tight">
                        {product.name}
                      </h3>
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 border border-emerald-100">
                        {product.sku}
                      </span>
                    </div>

                    <div className="mt-2">
                      <span className="text-lg font-bold text-gray-900">
                        ₱{product.price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </span>
                      <p className="text-[11px] text-gray-400 mt-0.5">{product.unitLabel}</p>
                    </div>

                    <p className="mt-2 text-xs text-gray-600">
                      Stock Available:{" "}
                      <span className="font-bold text-emerald-700">
                        {product.stockAvailable} {product.stockUnit}
                      </span>
                    </p>
                  </div>

                  {/* Add to Cart Button */}
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleAddToCart(product)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#04783c] px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#036331] active:scale-95 transition"
                    >
                      <Plus size={13} strokeWidth={2.5} />
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {paginatedProducts.length === 0 && (
            <div className="mt-12 flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-gray-200 bg-white text-gray-400">
              <ShoppingBag size={40} className="mb-2 text-gray-300" />
              <p className="text-sm font-medium">No products match your search or filter.</p>
            </div>
          )}

          {/* Pagination Controls */}
          {filteredProducts.length > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 pt-2">
              <p>
                Showing {rangeStart}-{rangeEnd} of {filteredProducts.length} products
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pg) => (
                  <button
                    key={pg}
                    type="button"
                    onClick={() => setCurrentPage(pg)}
                    className={`h-8 w-8 rounded-lg text-xs font-semibold transition ${
                      safePage === pg
                        ? "bg-[#04783c] text-white"
                        : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {pg}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================
            RIGHT COLUMN: Current Sale Cart Panel
        ========================================================== */}
        <aside className="w-full xl:w-[410px] shrink-0 sticky top-4">
          <div className="flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {/* Cart Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Current Sale</h3>
              <span className="rounded-full bg-[#04783c] px-3 py-0.5 text-xs font-bold text-white">
                Order #1
              </span>
            </div>

            {/* Cart Items List */}
            <div className="p-4 space-y-3 max-h-[440px] overflow-y-auto">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <ShoppingBag size={36} className="mb-2 text-gray-300" />
                  <p className="text-xs font-medium">Cart is currently empty</p>
                </div>
              ) : (
                cartItems.map((item) => {
                  const lineTotal = item.price * item.quantity;
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-emerald-500 bg-white p-3.5 shadow-xs transition hover:shadow-sm"
                    >
                      {/* Item Title & Delete */}
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold text-emerald-800 leading-tight">
                          {item.name}
                        </h4>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-rose-500 hover:text-rose-700 transition p-0.5"
                          title="Remove item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Unit Price */}
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        ₱{item.price.toLocaleString("en-PH", { minimumFractionDigits: 2 })} / {item.unitLabel}
                      </p>

                      {/* Quantity Selector & Line Total */}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                            className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                          >
                            <Minus size={11} strokeWidth={2.5} />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-gray-900">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                          >
                            <Plus size={11} strokeWidth={2.5} />
                          </button>
                        </div>

                        <span className="text-sm font-bold text-gray-900">
                          ₱{lineTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Totals & Checkout Form */}
            <div className="border-t border-gray-100 p-5 space-y-3.5 bg-white">
              {/* Subtotal */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Subtotal</span>
                <span>₱{subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900">Total</span>
                <span className="text-base font-bold text-gray-900">
                  ₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Payment Method Selector */}
              <div className="relative">
                <label className="block text-[11px] text-gray-500 mb-1">
                  Payment Method
                </label>
                <button
                  type="button"
                  onClick={() => setShowPaymentDropdown((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-3.5 py-2.5 text-left text-xs font-bold text-gray-900 hover:border-emerald-600 transition shadow-xs"
                >
                  <span>{paymentMethod}</span>
                  <ChevronDown
                    size={15}
                    className={`text-gray-400 transition-transform ${
                      showPaymentDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showPaymentDropdown && (
                  <div className="absolute bottom-full left-0 right-0 mb-1 z-20 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden py-1">
                    {paymentMethods.map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(method);
                          setShowPaymentDropdown(false);
                        }}
                        className={`w-full px-3.5 py-2 text-left text-xs font-medium transition hover:bg-emerald-50 ${
                          method === paymentMethod
                            ? "text-emerald-700 bg-emerald-50 font-bold"
                            : "text-gray-700"
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Amount Paid Field */}
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">
                  Amount Paid
                </label>
                <div className="relative flex items-center rounded-xl border border-gray-200 px-3.5 py-2.5 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 shadow-xs">
                  <span className="text-xs font-bold text-gray-400 mr-1">₱</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amountPaidInput}
                    onChange={(e) => setAmountPaidInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-right text-xs font-bold text-gray-900 outline-none bg-transparent"
                  />
                </div>
              </div>

              {/* Change Box */}
              <div className="flex items-center justify-between rounded-xl bg-[#eaf7ee] px-4 py-3 border border-emerald-100">
                <span className="text-xs font-bold text-emerald-900">Change</span>
                <span className="text-sm font-bold text-emerald-700">
                  ₱{change.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="flex-1 rounded-full border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition shadow-xs text-center"
                >
                  Clear Cart
                </button>
                <button
                  type="button"
                  onClick={handleCompleteTransaction}
                  disabled={cartItems.length === 0}
                  className="flex-1 rounded-full bg-[#04783c] hover:bg-[#036331] text-white py-2.5 text-xs font-semibold transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed text-center"
                >
                  Complete Transaction
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}