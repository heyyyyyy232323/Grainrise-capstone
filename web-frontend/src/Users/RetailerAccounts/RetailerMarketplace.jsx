import { useState } from "react";
import { Search, ShoppingCart, Warehouse, Filter, CheckCircle2, ChevronRight, Plus, Minus } from "lucide-react";
import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";

const MARKETPLACE_PRODUCTS = [
  { id: 1, name: "Dinorado Rice (Premium Milled)", warehouse: "Central Bulacan Regional Warehouse", pricePerKg: 48, minOrder: 500, stock: 12000, grade: "Grade A", harvestDate: "July 2026" },
  { id: 2, name: "Sinandomeng Special White Rice", warehouse: "Isabela Grain Terminal Hub", pricePerKg: 42, minOrder: 400, stock: 18500, grade: "Special", harvestDate: "June 2026" },
  { id: 3, name: "Jasmine Long Grain Fragrant", warehouse: "Nueva Ecija Rice Processing Complex", pricePerKg: 52, minOrder: 300, stock: 9500, grade: "Premium", harvestDate: "July 2026" },
  { id: 4, name: "NSIC Rc222 (Tubigan 18)", warehouse: "Central Bulacan Regional Warehouse", pricePerKg: 38, minOrder: 600, stock: 25000, grade: "Standard", harvestDate: "August 2026" },
  { id: 5, name: "Milagrosa Fragrant Rice", warehouse: "Tarlac Logistics Depot", pricePerKg: 55, minOrder: 250, stock: 7000, grade: "Special", harvestDate: "July 2026" },
  { id: 6, name: "Well-Milled Local White Rice (25kg Bag)", warehouse: "Pampanga Warehouse #2", pricePerKg: 40, minOrder: 500, stock: 15000, grade: "Standard", harvestDate: "August 2026" },
];

export default function RetailerMarketplace() {
  const [search, setSearch] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [cart, setCart] = useState([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderedSuccess, setOrderedSuccess] = useState(false);

  const filtered = MARKETPLACE_PRODUCTS.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedWarehouse !== "all" && p.warehouse !== selectedWarehouse) return false;
    return true;
  });

  const addToCart = (product) => {
    setCart((prev) => {
      const exists = prev.find((i) => i.id === product.id);
      if (exists) return prev.map((i) => i.id === product.id ? { ...i, qtyKg: i.qtyKg + 50 } : i);
      return [...prev, { ...product, qtyKg: product.minOrder }];
    });
  };

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((i) => i.id === id ? { ...i, qtyKg: Math.max(i.minOrder, i.qtyKg + delta) } : i)
        .filter((i) => i.qtyKg > 0)
    );
  };

  const totalCost = cart.reduce((sum, item) => sum + item.qtyKg * item.pricePerKg, 0);

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <Breadcrumbs items={[{ label: "Inventory" }, { label: "Warehouse Marketplace" }]} />
          <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-slate-900">
            Warehouse Marketplace
          </h2>
          <p className="text-sm text-slate-500">
            Procure wholesale bulk milled rice directly from verified regional storage warehouses.
          </p>
        </div>

        {cart.length > 0 && (
          <button
            onClick={() => setShowOrderModal(true)}
            className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer self-start"
          >
            <ShoppingCart size={16} /> View Purchase Order ({cart.length}) · ₱{totalCost.toLocaleString()}
          </button>
        )}
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rice varieties, grades, or packaging..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 outline-none bg-white placeholder-gray-400 text-gray-700"
          />
        </div>

        <select
          value={selectedWarehouse}
          onChange={(e) => setSelectedWarehouse(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 outline-none min-w-[220px]"
        >
          <option value="all">All Regional Warehouses</option>
          <option value="Central Bulacan Regional Warehouse">Central Bulacan Warehouse</option>
          <option value="Isabela Grain Terminal Hub">Isabela Grain Terminal Hub</option>
          <option value="Nueva Ecija Rice Processing Complex">Nueva Ecija Complex</option>
          <option value="Tarlac Logistics Depot">Tarlac Logistics Depot</option>
        </select>
      </div>

      {/* ── Product Catalog Grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((product) => {
          const inCart = cart.find((i) => i.id === product.id);

          return (
            <div
              key={product.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-md">
                    {product.grade}
                  </span>
                  <span className="text-xs text-gray-400">Harvest: {product.harvestDate}</span>
                </div>

                <h3 className="font-bold text-gray-900 text-base leading-snug mb-1">
                  {product.name}
                </h3>

                <p className="text-xs text-gray-500 flex items-center gap-1 mb-4">
                  <Warehouse size={13} className="text-gray-400 shrink-0" /> {product.warehouse}
                </p>

                <div className="bg-gray-50 p-3 rounded-xl space-y-1 text-xs text-gray-600 mb-4">
                  <div className="flex justify-between">
                    <span>Wholesale Price:</span>
                    <strong className="text-emerald-700 text-sm font-bold">₱{product.pricePerKg} / kg</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Min. Order Quantity:</span>
                    <span className="font-semibold text-gray-800">{product.minOrder} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Available Warehouse Stock:</span>
                    <span className="font-semibold text-gray-800">{product.stock.toLocaleString()} kg</span>
                  </div>
                </div>
              </div>

              {inCart ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-2">
                  <span className="text-xs font-bold text-emerald-800 ml-2">
                    {inCart.qtyKg} kg (₱{(inCart.qtyKg * inCart.pricePerKg).toLocaleString()})
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(product.id, -50)}
                      className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50"
                    >
                      <Minus size={13} />
                    </button>
                    <button
                      onClick={() => updateQty(product.id, 50)}
                      className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center hover:bg-emerald-800"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => addToCart(product)}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShoppingCart size={14} /> Add to Wholesale Order
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Order Checkout Modal ────────────────────────────────────────────── */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <h3 className="font-bold text-gray-900 text-lg">Confirm Wholesale Purchase Order</h3>
            <p className="text-xs text-gray-500">Review ordered items and delivery dispatch details:</p>

            <div className="max-h-60 overflow-y-auto space-y-2 divide-y divide-gray-100 pr-1">
              {cart.map((item) => (
                <div key={item.id} className="pt-2 first:pt-0 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.warehouse} · {item.qtyKg} kg @ ₱{item.pricePerKg}/kg</p>
                  </div>
                  <span className="font-bold text-gray-900">
                    ₱{(item.qtyKg * item.pricePerKg).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-base text-gray-900">
              <span>Total Estimated Amount:</span>
              <span className="text-emerald-700">₱{totalCost.toLocaleString()}</span>
            </div>

            {orderedSuccess ? (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 size={16} /> Purchase order placed! Forwarded to warehouse logistics dispatch.
              </div>
            ) : null}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowOrderModal(false); setOrderedSuccess(false); }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setOrderedSuccess(true);
                  setTimeout(() => {
                    setCart([]);
                    setShowOrderModal(false);
                    setOrderedSuccess(false);
                  }, 1500);
                }}
                className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition"
              >
                Submit Purchase Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
