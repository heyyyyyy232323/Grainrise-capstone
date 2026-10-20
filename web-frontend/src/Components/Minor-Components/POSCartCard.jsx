import { useState, useEffect } from "react";
import { Trash2, Minus, Plus } from "lucide-react";

export default function CartItemCard({
  name,
  price,
  unitLabel = "Per Sack",
  quantity = 1,
  maxQuantity,
  rawQuantity,
  onQuantityChange,
  onRawQuantityChange,
  onRemove,
  currency = "₱",
  className = "",
}) {
  const [inputValue, setInputValue] = useState(
    rawQuantity !== undefined ? String(rawQuantity) : String(quantity)
  );

  useEffect(() => {
    if (rawQuantity !== undefined) {
      setInputValue(String(rawQuantity));
    } else {
      setInputValue(String(quantity));
    }
  }, [quantity, rawQuantity]);

  const numericQty =
    typeof quantity === "number" && Number.isFinite(quantity) && quantity > 0
      ? quantity
      : 0;
  const formattedPrice =
    typeof price === "number"
      ? price.toLocaleString("en-PH", { minimumFractionDigits: 2 })
      : price;
  const total = typeof price === "number" ? price * numericQty : null;
  const formattedTotal =
    typeof total === "number"
      ? total.toLocaleString("en-PH", { minimumFractionDigits: 2 })
      : "-";

  const hasMax = typeof maxQuantity === "number" && Number.isFinite(maxQuantity) && maxQuantity >= 1;

  const decrement = () => {
    const next = Math.max(numericQty - 1, 0);
    setInputValue(String(Math.max(next, 1)));
    onRawQuantityChange?.(String(Math.max(next, 1)));
    onQuantityChange?.(next);
  };

  const increment = () => {
    const candidate = numericQty + 1;
    const next = hasMax ? Math.min(candidate, maxQuantity) : candidate;
    setInputValue(String(next));
    onRawQuantityChange?.(String(next));
    onQuantityChange?.(next);
  };

  const handleInputChange = (e) => {
    const raw = e.target.value;
    // Allow digits only when typing (keep raw if user clears field temporarily)
    if (raw === "") {
      setInputValue("");
      onRawQuantityChange?.("");
      return;
    }

    // Reject non-numeric characters immediately unless user is testing validation
    if (!/^\d+$/.test(raw)) {
      return;
    }

    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      setInputValue(raw);
      onRawQuantityChange?.(raw);
      return;
    }

    if (parsed === 0) {
      setInputValue("0");
      onRawQuantityChange?.("0");
      return;
    }

    const clamped = hasMax ? Math.min(parsed, maxQuantity) : parsed;
    const nextStr = String(clamped);
    setInputValue(nextStr);
    onRawQuantityChange?.(nextStr);
    onQuantityChange?.(clamped);
  };

  const handleInputBlur = () => {
    const trimmed = String(inputValue).trim();
    if (!/^\d+$/.test(trimmed)) {
      const fallback = Math.max(1, hasMax ? Math.min(numericQty || 1, maxQuantity) : numericQty || 1);
      setInputValue(String(fallback));
      onRawQuantityChange?.(String(fallback));
      onQuantityChange?.(fallback);
      return;
    }
    const parsed = parseInt(trimmed, 10);
    if (parsed < 1) {
      // If parent tracks rawQuantity for checkout validation, keep "0", otherwise normalize to 1
      if (onRawQuantityChange) {
        return;
      }
      setInputValue("1");
      onQuantityChange?.(1);
      return;
    }
    const clamped = hasMax ? Math.min(parsed, maxQuantity) : parsed;
    setInputValue(String(clamped));
    onRawQuantityChange?.(String(clamped));
    if (clamped !== numericQty) {
      onQuantityChange?.(clamped);
    }
  };

  const handleKeyDown = (e) => {
    if (["-", "+", ".", "e", "E"].includes(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <article
      className={`w-full max-w-[400px] rounded-[12px] border border-emerald-600 bg-white px-4 py-3 ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[14px] font-bold leading-tight text-emerald-700">{name}</h3>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove item"
          className="shrink-0 text-rose-500 transition hover:text-rose-600"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-[11px] text-slate-500">
          {currency}
          {formattedPrice} / {unitLabel}
        </p>
        {hasMax && (
          <span className="text-[10px] font-medium text-slate-400">
            Max: {maxQuantity} {maxQuantity === 1 ? "sack" : "sacks"}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={decrement}
            aria-label="Decrease quantity"
            className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600 transition hover:bg-slate-200"
          >
            <Minus size={12} />
          </button>

          <input
            type="text"
            inputMode="numeric"
            aria-label={`Quantity for ${name}`}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            className="h-7 w-14 rounded-md border border-slate-200 bg-white px-1.5 text-center text-[12px] font-semibold text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />

          <button
            type="button"
            onClick={increment}
            disabled={hasMax && numericQty >= maxQuantity}
            aria-label="Increase quantity"
            className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={12} />
          </button>
        </div>

        <span className="text-[15px] font-extrabold text-slate-900">
          {currency}
          {formattedTotal}
        </span>
      </div>
    </article>
  );
}