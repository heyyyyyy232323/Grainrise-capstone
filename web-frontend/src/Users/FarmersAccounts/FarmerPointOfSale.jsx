import { useState } from "react";
import { Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, Receipt } from "lucide-react";
import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";

const PRODUCTS = [
  { id: 1, name: "Sinandomeng Rice", grade: "Premium", unit: "50 kg sack", price: 2400, stock: 18 },
  { id: 2, name: "Dinorado Rice", grade: "Premium", unit: "50 kg sack", price: 2650, stock: 12 },
  { id: 3, name: "Jasmine Rice", grade: "Special", unit: "50 kg sack", price: 2200, stock: 25 },
  { id: 4, name: "RC222 (Tubigan)", grade: "Standard", unit: "50 kg sack", price: 1800, stock: 40 },
  { id: 5, name: "Sinandomeng Rice", grade: "Special", unit: "25 kg sack", price: 1250, stock: 30 },
  { id: 6, name: "Palay (Rough Rice)", grade: "Standard", unit: "50 kg sack", price: 950, stock: 200 },
];

export default function FarmerPointOfSale() {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [payment, setPayment] = useState("cash");
  const [showReceipt, setShowReceipt] = useState(false);

  const filtered = PRODUCTS.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.grade.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((i) => i.id === id ? { ...i, qty: i.qty + delta } : i)
        .filter((i) => i.qty > 0)
    );
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = subtotal * 0.12;
  const total = subtotal + tax;

  return (
    <div className="space-y-4">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Business" }, { label: "Point of Sale" }]} />
        <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-slate-900">
          Point of Sale
        </h2>
        <p className="text-sm text-slate-500">
          Sell rice directly to buyers — walk-in or pick-up transactions.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 h-full">
        {/* ── Product grid ─────────────────────────────────────────────── */}
        <div className="flex-1 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none"
            />
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={p.stock === 0}
                className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-green-400 hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="w-full h-20 bg-green-50 rounded-lg flex items-center justify-center mb-3">
                  <span className="text-3xl">🌾</span>
                </div>
                <p className="font-semibold text-gray-900 text-sm leading-snug">{p.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{p.grade} · {p.unit}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-green-700 font-bold text-sm">₱{p.price.toLocaleString()}</span>
                  <span className="text-[10px] text-gray-400">{p.stock} left</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Cart / Order Summary ──────────────────────────────────────── */}
        <div className="w-full lg:w-80 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-fit lg:sticky lg:top-4">
          {/* Cart header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <ShoppingCart size={18} className="text-green-700" />
            <h3 className="font-bold text-gray-900">Order Summary</h3>
            {cart.length > 0 && (
              <span className="ml-auto bg-green-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {cart.reduce((s, i) => s + i.qty, 0)}
              </span>
            )}
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3 max-h-64">
            {cart.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No items yet. Tap a product to add.</p>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800 leading-snug">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.grade} · ₱{item.price.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="w-6 h-6 rounded-md border border-gray-200 flex items-center justify-center text-gray-600 hover:border-red-300 hover:text-red-500 transition-colors"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="text-sm font-bold w-6 text-center">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      className="w-6 h-6 rounded-md border border-gray-200 flex items-center justify-center text-gray-600 hover:border-green-400 hover:text-green-700 transition-colors"
                    >
                      <Plus size={11} />
                    </button>
                    <button
                      onClick={() => setCart((p) => p.filter((i) => i.id !== item.id))}
                      className="ml-1 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals */}
          <div className="px-5 py-4 border-t border-slate-100 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>₱{subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>VAT (12%)</span>
              <span>₱{tax.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base border-t border-slate-100 pt-2 mt-1">
              <span>Total</span>
              <span className="text-green-700">₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Payment method */}
          <div className="px-5 pb-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment Method</p>
            <div className="flex gap-2">
              {[
                { key: "cash", label: "Cash", icon: <Banknote size={14} /> },
                { key: "card", label: "Card", icon: <CreditCard size={14} /> },
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setPayment(key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                    payment === key
                      ? "bg-green-700 text-white border-green-700"
                      : "border-gray-200 text-gray-600 hover:border-green-300"
                  }`}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => cart.length > 0 && setShowReceipt(true)}
              disabled={cart.length === 0}
              className="w-full py-3 bg-green-700 hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Receipt size={16} /> Charge ₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </button>
          </div>
        </div>
      </div>

      {/* ── Receipt Modal ─────────────────────────────────────────────── */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Receipt size={24} className="text-green-700" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">Transaction Complete!</h3>
              <p className="text-sm text-gray-500 mt-1">Receipt has been recorded.</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              {cart.map((i) => (
                <div key={i.id} className="flex justify-between text-sm">
                  <span className="text-gray-700">{i.name} × {i.qty}</span>
                  <span className="font-medium">₱{(i.price * i.qty).toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-green-700">
                <span>Total</span>
                <span>₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <button
              onClick={() => { setShowReceipt(false); setCart([]); }}
              className="w-full py-2.5 bg-green-700 hover:bg-green-800 text-white font-semibold rounded-xl transition-colors"
            >
              New Transaction
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
