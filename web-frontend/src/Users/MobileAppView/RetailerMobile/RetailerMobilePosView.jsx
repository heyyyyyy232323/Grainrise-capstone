import React, { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  Package,
  ShoppingBag,
  ArrowRight,
  Plus,
  Minus,
  Trash2,
  X,
  CreditCard,
  Banknote,
  QrCode,
  RotateCcw,
} from "lucide-react";
import RetailerMobileCheckoutView from "./RetailerMobileCheckoutView";
import riceSackImg from "../../../assets/rice-sack-pos.jpg";
import riceeImg from "../../../assets/ricee.jpg";

export default function RetailerMobilePosView({ onCompleteSale }) {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [cashTendered, setCashTendered] = useState("");
  const [saleCompleted, setSaleCompleted] = useState(false);


  // Cart state with initial items matching Figma preview (₱12,000 total)
  const [cart, setCart] = useState([
    {
      id: "p1",
      code: "WR 001",
      name: "Dinorado Rice",
      grade: "50kg Premium Grade",
      price: 1500,
      qty: 4,
      unit: "Sack",
    },
    {
      id: "p2",
      code: "WR 002",
      name: "Sinandomeng Rice",
      grade: "50kg Special Grade",
      price: 1500,
      qty: 4,
      unit: "Sack",
    },
  ]);

  // Product catalog matching Figma design (all Dinorado Rice items)
  const allProducts = Array.from({ length: 15 }, (_, i) => ({
    id: `p${i + 1}`,
    code: "WR 001",
    name: "Dinorado Rice",
    grade: "50kg Premium Grade",
    price: 1500,
    unit: "Sack",
    availableSacks: 300,
    image: riceSackImg,
    category: "Premium",
    inStock: true,
  }));


  const categories = ["All", "Premium", "Commercial", "Specialty"];

  // Filter products by search code/name and category
  const filteredProducts = allProducts.filter((p) => {
    if (selectedCategory !== "All" && p.category !== selectedCategory) return false;
    if (
      searchQuery &&
      !p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !p.code.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !p.grade.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const displayedProducts = filteredProducts.slice(0, visibleCount);

  // Cart operations
  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          code: product.code,
          name: product.name,
          grade: product.grade,
          price: product.price,
          qty: 1,
          unit: product.unit,
        },
      ];
    });
  };

  const updateCartQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.qty + delta;
            return nextQty > 0 ? { ...item, qty: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const totalCartCount = cart.reduce((sum, i) => sum + i.qty, 0);
  const totalCartAmount = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  // Cart summary text for floating bar (e.g. "Dinorado (2), Sina...")
  const cartSummaryText = cart
    .map((item) => `${item.name.replace(" Rice", "")} (${item.qty})`)
    .join(", ");

  const handleCheckoutSubmit = () => {
    setSaleCompleted(true);
    setTimeout(() => {
      setSaleCompleted(false);
      setShowCheckoutModal(false);
      const saleTotal = totalCartAmount;
      setCart([]);
      if (onCompleteSale) onCompleteSale(saleTotal);
    }, 1600);
  };

  if (isCheckingOut) {
    return (
      <RetailerMobileCheckoutView
        onBack={() => setIsCheckingOut(false)}
        onComplete={(amt) => {
          if (onCompleteSale) onCompleteSale(amt);
          setIsCheckingOut(false);
        }}
        onCancel={() => setIsCheckingOut(false)}
      />
    );
  }

  return (
    <div className="space-y-4 pb-28 select-none">
      {/* ── 1. Page Title ────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Point of Sale
        </h1>
      </div>


      {/* ── 2. Search & Filter Bar (Figma Exact) ─────────────────────── */}
      <div className="flex items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search product code....."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2.5 bg-white border border-gray-200/90 rounded-2xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#0d6928] shadow-2xs transition-colors"
          />
        </div>

        {/* Filter Dropdown Pill */}
        <div className="relative">
          <button
            onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-white border border-gray-200/90 rounded-2xl text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs transition-colors cursor-pointer"
          >
            <SlidersHorizontal size={14} className="text-gray-500" />
            <span>{selectedCategory}</span>
            <span className="text-gray-400 text-[10px]">▼</span>
          </button>

          {isFilterDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-36 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-30">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setSelectedCategory(c);
                    setIsFilterDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs transition-colors cursor-pointer ${
                    selectedCategory === c
                      ? "text-[#0d6928] font-bold bg-emerald-50"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Stock Status Counters (Figma Exact) ───────────────────── */}
      <div className="flex items-center gap-6 text-xs font-bold pt-1">
        <div className="flex items-center gap-1.5 text-[#0d6928]">
          <span className="w-4 h-4 rounded-full bg-[#10b981] text-white flex items-center justify-center text-[10px]">
            ✓
          </span>
          <span>9 In Stock</span>
        </div>

        <div className="flex items-center gap-1.5 text-[#c88d10]">
          <span className="text-xs">⚠</span>
          <span>0 Low Stock</span>
        </div>
      </div>

      {/* ── 4. Product Cards List (Figma Exact) ──────────────────────── */}
      <div className="space-y-3 pt-1">
        {displayedProducts.map((prod) => (
          <div
            key={prod.id}
            className="bg-white rounded-2xl border border-gray-100/90 p-3.5 shadow-2xs hover:border-emerald-200 transition-all"
          >
            {/* Top row: Image & Details */}
            <div className="flex items-start gap-3.5">
              {/* Rice Sack Image Thumbnail */}
              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-xl overflow-hidden bg-stone-100 border border-stone-200/60 shrink-0">
                <img
                  src={prod.image}
                  alt={prod.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%23d1d5db'%3E%3Crect width='100' height='100' rx='12' fill='%23f3f4f6'/%3E%3Ctext x='50' y='55' font-size='12' text-anchor='middle' fill='%239ca3af'%3ERice Sack%3C/text%3E%3C/svg%3E";
                  }}
                />
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                {/* Name & Code */}
                <div className="flex items-start justify-between gap-1">
                  <h3 className="text-sm font-bold text-[#0d6928] tracking-tight truncate">
                    {prod.name}
                  </h3>
                  <span className="text-[10px] font-bold text-gray-400 uppercase shrink-0">
                    {prod.code}
                  </span>
                </div>

                {/* Subtitle / Grade */}
                <p className="text-xs font-medium text-gray-600 mt-0.5">
                  {prod.grade}
                </p>

                {/* Price */}
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-sm font-black text-gray-900">
                    ₱{prod.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] font-medium text-gray-400">
                    / {prod.unit}
                  </span>
                </div>

                {/* Sacks Available */}
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium mt-1">
                  <span className="text-gray-400">📦</span>
                  <span>{prod.availableSacks} sacks available</span>
                </div>
              </div>
            </div>

            {/* Bottom Button: "+ Add to Cart" (Figma Exact) */}
            <div className="mt-3 pt-1">
              <button
                onClick={() => addToCart(prod)}
                className="w-full py-2 bg-white hover:bg-emerald-50/80 active:scale-[0.99] border border-[#0d6928] text-[#0d6928] font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>+</span>
                <span>Add to Cart</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── 5. Pagination / Load More Section (Figma Exact) ───────────── */}
      <div className="pt-2 text-center space-y-2">
        <p className="text-xs font-medium text-gray-500">
          Showing {displayedProducts.length} of {filteredProducts.length} products
        </p>

        {visibleCount < filteredProducts.length && (
          <button
            onClick={() => setVisibleCount((prev) => prev + 5)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-[#0d6928] transition-colors cursor-pointer py-1"
          >
            <RotateCcw size={13} strokeWidth={2.4} />
            <span>Load More Products</span>
          </button>
        )}
      </div>

      {/* ── 6. Floating Current Sale / Cart Summary Bar (Figma Exact) ── */}
      {cart.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-4 flex justify-center pointer-events-none">
          <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200/90 p-3 shadow-xl pointer-events-auto flex items-center justify-between gap-3 animate-slideUp">
            {/* Bag Icon with Item Count */}
            <div className="relative w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShoppingBag size={18} strokeWidth={2.2} />
              <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-black ring-2 ring-white">
                {totalCartCount}
              </span>
            </div>

            {/* Middle: Title & Summary */}
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-extrabold text-gray-900 leading-tight">
                Current Sale
              </h4>
              <p className="text-[11px] text-gray-500 truncate mt-0.5">
                {cartSummaryText}
              </p>
            </div>

            {/* Right: Total Amount & Checkout Button */}
            <div className="text-right shrink-0">
              <span className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-tight">
                Total
              </span>
              <span className="text-xs font-black text-[#0d6928]">
                ₱{totalCartAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              <button
                onClick={() => setIsCheckingOut(true)}
                className="block text-[11px] font-bold text-gray-700 hover:text-[#0d6928] transition-colors cursor-pointer mt-0.5"
              >
                Checkout &rarr;
              </button>

            </div>
          </div>
        </div>
      )}

      {/* ── 7. Checkout / Payment Modal ───────────────────────────────── */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md p-5 shadow-2xl border border-gray-100 max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#0d6928] flex items-center justify-center">
                  <ShoppingBag size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">
                    POS Cashier Checkout
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    {totalCartCount} sacks in order
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="my-3 space-y-2 divide-y divide-gray-50 max-h-48 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="pt-2 flex items-center justify-between text-xs"
                >
                  <div>
                    <h4 className="font-bold text-gray-900">{item.name}</h4>
                    <p className="text-[11px] text-gray-500">
                      ₱{item.price.toLocaleString()} × {item.qty} {item.unit}s = ₱
                      {(item.price * item.qty).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateCartQty(item.id, -1)}
                      className="w-6 h-6 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center font-bold hover:bg-gray-200 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-bold w-6 text-center text-xs">
                      {item.qty}
                    </span>
                    <button
                      onClick={() => updateCartQty(item.id, 1)}
                      className="w-6 h-6 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center font-bold hover:bg-gray-200 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Summary */}
            <div className="bg-gray-50 rounded-xl p-3 my-3 space-y-1 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({totalCartCount} sacks):</span>
                <span>₱{totalCartAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>VAT (Inclusive):</span>
                <span>₱0.00</span>
              </div>
              <div className="flex justify-between font-black text-sm text-gray-900 pt-1.5 border-t border-gray-200">
                <span>Total Amount Due:</span>
                <span className="text-[#0d6928]">
                  ₱{totalCartAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5 my-3">
              <label className="text-[11px] font-bold text-gray-700 uppercase">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "Cash", icon: Banknote },
                  { id: "GCash", icon: QrCode },
                  { id: "Card", icon: CreditCard },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        paymentMethod === m.id
                          ? "border-[#0d6928] bg-emerald-50/80 text-[#0d6928]"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Icon size={16} />
                      <span>{m.id}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cash Input */}
            {paymentMethod === "Cash" && (
              <div className="my-3">
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Cash Tendered (₱)
                </label>
                <input
                  type="number"
                  placeholder={`Min ₱${totalCartAmount.toLocaleString()}`}
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-bold focus:outline-none focus:border-[#0d6928]"
                />
                {Number(cashTendered) >= totalCartAmount && (
                  <p className="text-xs font-bold text-emerald-700 mt-1">
                    Change: ₱
                    {(Number(cashTendered) - totalCartAmount).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {saleCompleted ? (
              <div className="w-full py-3 bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 animate-pulse">
                <CheckCircle2 size={16} />
                <span>Transaction Completed Successfully!</span>
              </div>
            ) : (
              <button
                onClick={handleCheckoutSubmit}
                disabled={cart.length === 0}
                className="w-full py-3 bg-[#0d5921] hover:bg-emerald-900 active:scale-98 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Complete Sale (₱{totalCartAmount.toLocaleString()})</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
