import React, { useState } from "react";
import {
  ChevronLeft,
  Trash2,
  CheckCircle2,
  ChevronDown,
  Coins,
  Receipt,
  RotateCcw,
  Sparkles,
} from "lucide-react";

export default function RetailerMobileCheckoutView({
  onBack,
  onComplete,
  onCancel,
}) {
  // Checkout order items matching Figma design exactly (8 sacks total, ₱12,000.00)
  const [items, setItems] = useState([
    {
      id: "i1",
      name: "Dinorado Rice",
      code: "WR-001",
      grade: "50kg Premium Grade",
      unitPrice: 1500,
      qty: 2,
    },
    {
      id: "i2",
      name: "Sinandomeng Special",
      code: "WR-002",
      grade: "50kg Regular White",
      unitPrice: 1350,
      qty: 2,
    },
    {
      id: "i3",
      name: "Jasmine Fragrant Rice",
      code: "WR-003",
      grade: "50kg Aromatic Long Grain",
      unitPrice: 1650,
      qty: 2,
    },
    {
      id: "i4",
      name: "Dinorado Brown Rice",
      code: "WR-004",
      grade: "50kg Whole Grain",
      unitPrice: 1500,
      qty: 2,
    },
  ]);

  const [paymentMethod, setPaymentMethod] = useState("Cash on Delivery (Walk-in COD)");
  const [isMethodDropdownOpen, setIsMethodDropdownOpen] = useState(false);
  const [amountReceived, setAmountReceived] = useState("12000.00");
  const [isCompleted, setIsCompleted] = useState(false);

  const paymentMethods = [
    "Cash on Delivery (Walk-in COD)",
    "GCash QR Payment",
    "Bank Transfer (BDO / BPI)",
    "Credit / Debit Card",
  ];

  // Quantity stepper
  const updateQty = (id, delta) => {
    setItems((prev) =>
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

  const removeItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const totalSacks = items.reduce((sum, item) => sum + item.qty, 0);
  const totalAmountDue = items.reduce(
    (sum, item) => sum + item.unitPrice * item.qty,
    0
  );

  const numReceived = parseFloat(amountReceived) || 0;
  const changeToReturn = Math.max(0, numReceived - totalAmountDue);

  const handleCompleteTransaction = () => {
    setIsCompleted(true);
    setTimeout(() => {
      setIsCompleted(false);
      if (onComplete) onComplete(totalAmountDue);
    }, 1500);
  };

  return (
    <div className="space-y-4 pb-36 select-none animate-fadeIn">
      {/* ── 1. Top Header Row (Back Button + Title) ─────────────────── */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={onBack}
          aria-label="Back to POS"
          className="w-9 h-9 rounded-xl bg-white border border-gray-200/90 flex items-center justify-center text-gray-700 hover:bg-gray-50 active:scale-95 shadow-2xs transition-all cursor-pointer"
        >
          <ChevronLeft size={18} strokeWidth={2.4} />
        </button>
        <h1 className="text-xl font-black text-gray-900 tracking-tight">
          Checkout
        </h1>
      </div>

      {/* ── 2. ORDER SUMMARY Card (Figma Exact) ─────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100/90 p-4 shadow-2xs space-y-4">
        {/* Card Header */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-black text-gray-800 uppercase tracking-wider">
              ORDER SUMMARY
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              {items.length} items
            </span>
          </div>
          <span className="text-xs font-bold text-[#0d6928]">
            {totalSacks} sacks total
          </span>
        </div>

        {/* Items List */}
        <div className="divide-y divide-gray-100/80">
          {items.map((item) => (
            <div key={item.id} className="py-3 first:pt-0 last:pb-0 space-y-2">
              {/* Item Header: Name, Code & Delete */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-xs font-bold text-gray-900 tracking-tight">
                    {item.name}
                  </h3>
                  <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    {item.code}
                  </span>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  aria-label="Remove item"
                  className="text-gray-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                >
                  <Trash2 size={13} strokeWidth={2} />
                </button>
              </div>

              {/* Item Details: Grade & Unit Price */}
              <p className="text-[11px] text-gray-500 font-medium">
                {item.grade} • ₱
                {item.unitPrice.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}{" "}
                / sack
              </p>

              {/* Stepper Pill & Item Total */}
              <div className="flex items-center justify-between pt-1">
                {/* Stepper */}
                <div className="inline-flex items-center gap-3 bg-gray-50/90 border border-gray-200/80 px-2.5 py-1 rounded-lg text-xs font-bold text-gray-700">
                  <button
                    onClick={() => updateQty(item.id, -1)}
                    className="text-gray-500 hover:text-gray-900 cursor-pointer px-1"
                  >
                    -
                  </button>
                  <span className="w-3 text-center">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.id, 1)}
                    className="text-gray-500 hover:text-gray-900 cursor-pointer px-1"
                  >
                    +
                  </button>
                </div>

                {/* Total */}
                <span className="text-xs font-black text-gray-900">
                  ₱
                  {(item.unitPrice * item.qty).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. Order Totals Card (Figma Exact) ───────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100/90 p-4 shadow-2xs space-y-2.5 text-xs font-medium">
        <div className="flex items-center justify-between text-gray-600">
          <span>Subtotal ({totalSacks} sacks)</span>
          <span className="font-bold text-gray-900">
            ₱
            {totalAmountDue.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>

        <div className="flex items-center justify-between text-gray-600">
          <span>Warehouse Handling Fee</span>
          <span className="font-bold text-[#10b981]">Free</span>
        </div>

        <div className="flex items-center justify-between text-gray-600">
          <span>VAT / Taxes (Inclusive)</span>
          <span className="font-bold text-gray-900">₱0.00</span>
        </div>

        <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-100">
          <span className="text-sm font-black text-gray-900">
            Total Amount Due
          </span>
          <span className="text-lg font-black text-gray-900 tracking-tight">
            ₱
            {totalAmountDue.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>

      {/* ── 4. PAYMENT DETAILS Card (Figma Exact) ────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100/90 p-4 shadow-2xs space-y-3.5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black text-gray-800 uppercase tracking-wider">
            PAYMENT DETAILS
          </h2>
          <span className="text-gray-400">🛍</span>
        </div>

        {/* Payment Method Selector */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
            PAYMENT METHOD
          </label>
          <div className="relative">
            <button
              onClick={() => setIsMethodDropdownOpen(!isMethodDropdownOpen)}
              className="w-full p-2.5 bg-white border border-gray-200/90 rounded-xl text-xs font-bold text-gray-800 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <span>{paymentMethod}</span>
              <ChevronDown size={14} className="text-gray-400" />
            </button>

            {isMethodDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-30">
                {paymentMethods.map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setPaymentMethod(m);
                      setIsMethodDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs transition-colors cursor-pointer ${
                      paymentMethod === m
                        ? "text-[#0d6928] font-bold bg-emerald-50"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Amount Received */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              AMOUNT RECEIVED
            </label>
            <span className="text-[10px] text-gray-400 font-medium">
              PHP currency
            </span>
          </div>

          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-xs font-black text-gray-400">
              ₱
            </span>
            <input
              type="text"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-gray-200/90 rounded-xl text-sm font-black text-gray-900 focus:outline-none focus:border-[#0d6928]"
            />
          </div>
        </div>

        {/* Quick Amount Pills (Exact Figma Match) */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setAmountReceived(`${totalAmountDue}.00`)}
            className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer text-center ${
              amountReceived === `${totalAmountDue}.00` ||
              numReceived === totalAmountDue
                ? "bg-slate-100 text-slate-800 border-slate-300"
                : "bg-gray-50/80 text-gray-600 border-gray-200 hover:bg-gray-100"
            }`}
          >
            Exact (₱12k)
          </button>

          <button
            onClick={() => setAmountReceived("15000.00")}
            className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer text-center ${
              amountReceived === "15000.00"
                ? "bg-slate-100 text-slate-800 border-slate-300"
                : "bg-gray-50/80 text-gray-600 border-gray-200 hover:bg-gray-100"
            }`}
          >
            ₱15,000.00
          </button>

          <button
            onClick={() => setAmountReceived("20000.00")}
            className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer text-center ${
              amountReceived === "20000.00"
                ? "bg-slate-100 text-slate-800 border-slate-300"
                : "bg-gray-50/80 text-gray-600 border-gray-200 hover:bg-gray-100"
            }`}
          >
            ₱20,000.00
          </button>
        </div>

        {/* Change Box (Exact Figma Match) */}
        <div className="bg-[#eefbf4] border border-[#c3f0d5] rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm">
              💵
            </div>
            <div>
              <span className="block text-[10px] font-black text-[#0d6928] uppercase tracking-wider">
                CHANGE TO RETURN
              </span>
              <span className="text-[10.5px] text-gray-500 font-medium">
                {numReceived >= totalAmountDue
                  ? "Tender balanced"
                  : "Insufficient cash"}
              </span>
            </div>
          </div>

          <span className="text-sm font-black text-[#0d6928]">
            ₱
            {changeToReturn.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>

      {/* ── 5. Bottom Floating / Sticky Complete Bar (Figma Exact) ──── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200/90 p-4 shadow-xl flex justify-center">
        <div className="w-full max-w-md space-y-2.5">
          {/* Summary line */}
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-tight">
                TOTAL PAYABLE
              </span>
              <span className="text-base font-black text-gray-900 tracking-tight">
                ₱
                {totalAmountDue.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>

            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
              Cash on Delivery
            </span>
          </div>

          {/* Complete Transaction Button */}
          {isCompleted ? (
            <div className="w-full py-3 bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 animate-pulse">
              <CheckCircle2 size={16} />
              <span>Transaction Completed Successfully!</span>
            </div>
          ) : (
            <button
              onClick={handleCompleteTransaction}
              disabled={items.length === 0 || numReceived < totalAmountDue}
              className={`w-full py-3 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
                items.length > 0 && numReceived >= totalAmountDue
                  ? "bg-[#0d5921] hover:bg-emerald-900 text-white active:scale-[0.99]"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              <CheckCircle2 size={15} />
              <span>Complete Transaction</span>
            </button>
          )}

          {/* Clear Cart & Cancel Link */}
          <div className="text-center pt-0.5">
            <button
              onClick={onCancel || onBack}
              className="text-[11.5px] font-medium text-gray-500 hover:text-rose-600 transition-colors cursor-pointer"
            >
              Clear Cart & Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
