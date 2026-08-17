import { useMemo, useState } from "react";
import POSProductCard from "../../Components/Minor-Components/POSProductCard";
import POSCartCard from "../../Components/Minor-Components/POSCartCard";
import PaginationControls from "../../Components/Minor-Components/PaginationControls";
import SearchFilter from "../../Components/Minor-Components/SearchFilter";
import SortByDropdown from "../../Components/Minor-Components/SortByDropdown";
import CustomGreenButton from "../../Components/Minor-Components/CustomGreenButton";
import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import { ChevronDown } from "lucide-react";

// ---------------------------------------------------------------------------
// Sample retailer inventory data (replace with real API call later)
// ---------------------------------------------------------------------------
const sampleProducts = Array.from({ length: 18 }, (_, i) => ({
  id: `rp-${i + 1}`,
  name: [
    "Dinorado Rice",
    "Sinandomeng Rice",
    "Jasmine Rice",
    "Brown Rice",
    "Malagkit Rice",
    "Quinoa Blend",
  ][i % 6],
  sku: `RT-${String(i + 1).padStart(3, "0")}`,
  price: [1500, 1350, 1800, 1650, 2000, 2200][i % 6],
  unitLabel: "Per Sack",
  stockAvailable: Math.max(0, 300 - i * 12),
}));

const stockFilterOptions = [
  { value: "all", label: "All" },
  { value: "in-stock", label: "In Stock" },
  { value: "low-stock", label: "Low Stock" },
];

const paymentMethods = ["Cash on Delivery", "GCash", "Bank Transfer", "Credit Card"];

const PRODUCTS_PER_PAGE = 9;
const LOW_STOCK_THRESHOLD = 50;

// ---------------------------------------------------------------------------
export default function RetailerPointOfSale() {
  // product list state
  const [products] = useState(sampleProducts);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);

  // cart state
  const [cartItems, setCartItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0]);
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const [cash, setCash] = useState(0);
  const [transactionDone, setTransactionDone] = useState(false);

  // filtering & pagination
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !(`${p.name} ${p.sku}`.toLowerCase().includes(q))) return false;
      if (filter === "in-stock") return p.stockAvailable > 0;
      if (filter === "low-stock")
        return p.stockAvailable > 0 && p.stockAvailable < LOW_STOCK_THRESHOLD;
      return true;
    });
  }, [products, query, filter]);

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

  const totalPages = Math.max(Math.ceil(filtered.length / PRODUCTS_PER_PAGE), 1);
  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * PRODUCTS_PER_PAGE;
    return filtered.slice(start, start + PRODUCTS_PER_PAGE);
  }, [filtered, safePage]);

  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PRODUCTS_PER_PAGE + 1;
  const rangeEnd = Math.min(safePage * PRODUCTS_PER_PAGE, filtered.length);

  // handlers
  const handleSearchChange = (value) => {
    setQuery(value);
    setPage(1);
  };

  const handleFilterChange = (value) => {
    setFilter(value);
    setPage(1);
  };

  const togglePillFilter = (value) => {
    setFilter((prev) => (prev === value ? "all" : value));
    setPage(1);
  };

  const handleAddToCart = (product) => {
    setTransactionDone(false);
    setCartItems((prev) => {
      const idx = prev.findIndex((it) => it.productId === product.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
        return copy;
      }
      return [
        ...prev,
        {
          id: `ci-${product.id}`,
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
        },
      ];
    });
  };

  const handleQuantityChange = (cartId, qty) => {
    setCartItems((prev) =>
      prev
        .map((it) => (it.id === cartId ? { ...it, quantity: qty } : it))
        .filter((it) => it.quantity > 0)
    );
  };

  const handleRemove = (cartId) =>
    setCartItems((prev) => prev.filter((it) => it.id !== cartId));

  const handleCompleteTransaction = () => {
    if (cartItems.length === 0) return;
    setTransactionDone(true);
    setCartItems([]);
    setCash(0);
  };

  // derived totals
  const itemCount = useMemo(() => cartItems.reduce((s, it) => s + it.quantity, 0), [cartItems]);
  const subtotal = useMemo(
    () => cartItems.reduce((s, it) => s + it.price * it.quantity, 0),
    [cartItems]
  );
  const total = subtotal;
  const change = Math.max(0, cash - total);

  return (
    <div className="w-full">
      {/* Breadcrumb */}
      <Breadcrumbs
        items={[
          { label: "Retailer", path: "/retailer/dashboard" },
          { label: "Point of Sale" },
        ]}
      />

      {/* Page header */}
      <div className="mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Point of Sale</h1>
        <p className="text-sm text-slate-500 mt-1">
          Browse available inventory products and process walk-in retailer transactions efficiently.
        </p>
      </div>

      {/* Success banner */}
      {transactionDone && (
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
          <span className="text-emerald-700 font-semibold text-sm">
            Transaction completed successfully!
          </span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Products Panel */}
        <div className="flex-1 min-w-0">
          {/* Search + filter row */}
          <div className="flex gap-3 mb-4 items-center">
            <div className="flex-1">
              <SearchFilter
                onSearch={handleSearchChange}
                placeholder="Search product code, variant, or product name"
              />
            </div>
            <SortByDropdown
              value={filter}
              onChange={handleFilterChange}
              options={stockFilterOptions}
            />
          </div>

          {/* Stock pill filters */}
          <div className="flex gap-3 mb-5 flex-wrap">
            <button
              type="button"
              onClick={() => togglePillFilter("in-stock")}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                filter === "in-stock"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              {inStockCount} Products In Stock
            </button>
            <button
              type="button"
              onClick={() => togglePillFilter("low-stock")}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                filter === "low-stock"
                  ? "bg-amber-500 text-white"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              {lowStockCount} Low Stock Products
            </button>
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {paginated.map((p) => (
              <POSProductCard
                key={p.id}
                name={p.name}
                sku={p.sku}
                price={p.price}
                unitLabel={p.unitLabel}
                stockAvailable={p.stockAvailable}
                onAddToCart={() => handleAddToCart(p)}
              />
            ))}
          </div>

          {/* Empty state */}
          {paginated.length === 0 && (
            <div className="mt-8 flex flex-col items-center gap-2 text-slate-400">
              <span className="text-4xl">No products match your search.</span>
            </div>
          )}

          {/* Pagination */}
          {paginated.length > 0 && (
            <div className="mt-6">
              <PaginationControls
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={setPage}
                pageLabel={`Showing ${rangeStart}-${rangeEnd} of ${filtered.length} products`}
              />
            </div>
          )}
        </div>

        {/* Cart / Checkout Sidebar */}
        <aside className="w-full lg:w-[400px] lg:sticky lg:top-20 self-start">
          <div className="flex max-h-[calc(100vh-6rem)] flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Cart header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Current Sale</h3>
              <span className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-bold text-white">
                Items: {itemCount}
              </span>
            </div>

            {/* Cart item list */}
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-slate-400">
                  <p className="text-sm">No items in cart</p>
                </div>
              ) : (
                cartItems.map((it) => (
                  <POSCartCard
                    key={it.id}
                    name={it.name}
                    price={it.price}
                    quantity={it.quantity}
                    onQuantityChange={(qty) => handleQuantityChange(it.id, qty)}
                    onRemove={() => handleRemove(it.id)}
                  />
                ))
              )}
            </div>

            {/* Totals + payment */}
            <div className="border-t border-slate-100 px-4 py-4 space-y-3">
              {/* Subtotal */}
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>P{subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-slate-900">Total</span>
                <span className="text-base font-bold text-slate-900">
                  P{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Payment method selector */}
              <div className="relative">
                <button
                  type="button"
                  id="payment-method-btn"
                  onClick={() => setShowPaymentDropdown((v) => !v)}
                  className="flex w-full items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-left hover:border-emerald-400 transition"
                >
                  <div>
                    <p className="text-xs text-slate-500">Payment Method</p>
                    <p className="text-sm font-bold text-slate-900">{paymentMethod}</p>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform ${showPaymentDropdown ? "rotate-180" : ""}`}
                  />
                </button>

                {showPaymentDropdown && (
                  <ul className="absolute bottom-full left-0 right-0 mb-1 z-20 rounded-md border border-slate-200 bg-white shadow-lg overflow-hidden">
                    {paymentMethods.map((m) => (
                      <li key={m}>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentMethod(m);
                            setShowPaymentDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm transition hover:bg-emerald-50 ${
                            m === paymentMethod
                              ? "font-semibold text-emerald-700 bg-emerald-50"
                              : "text-slate-700"
                          }`}
                        >
                          {m}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Amount paid input */}
              <div>
                <label className="text-xs text-slate-500">Amount Paid</label>
                <div className="mt-1 flex items-center rounded-md border border-slate-200 px-3 py-2 focus-within:border-emerald-500 transition">
                  <span className="mr-1 text-slate-500 text-sm">P</span>
                  <input
                    id="amount-paid-input"
                    type="number"
                    min="0"
                    value={cash}
                    onChange={(e) => setCash(Number(e.target.value))}
                    className="w-full text-right outline-none text-slate-700 text-sm bg-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Change */}
              <div className="flex items-center justify-between rounded-md bg-emerald-50 px-3 py-3">
                <span className="text-base font-bold text-slate-900">Change</span>
                <span className="text-base font-bold text-emerald-700">
                  P{change.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  id="clear-cart-btn"
                  onClick={() => {
                    setCartItems([]);
                    setCash(0);
                    setTransactionDone(false);
                  }}
                  className="flex-1 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                  Clear Cart
                </button>
                <CustomGreenButton
                  text="Complete Transaction"
                  onClick={handleCompleteTransaction}
                  className="flex-1 !rounded-md"
                />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
