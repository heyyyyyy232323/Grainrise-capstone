import { Trash2, Minus, Plus } from "lucide-react";

export default function CartItemCard({
  name,
  price,
  unitLabel = "Per Sack",
  quantity = 1,
  onQuantityChange,
  onRemove,
  currency = "₱",
  className = "",
}) {
  const formattedPrice = typeof price === "number" ? price.toLocaleString("en-PH", { minimumFractionDigits: 2 }) : price;
  const total = typeof price === "number" ? price * quantity : null;
  const formattedTotal = typeof total === "number" ? total.toLocaleString("en-PH", { minimumFractionDigits: 2 }) : "-";

  const decrement = () => onQuantityChange?.(Math.max(quantity - 1, 0));
  const increment = () => onQuantityChange?.(quantity + 1);

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

      <p className="mt-1 text-[11px] text-slate-500">
        {currency}
        {formattedPrice} / {unitLabel}
      </p>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={decrement}
            aria-label="Decrease quantity"
            className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-600 transition hover:bg-slate-200"
          >
            <Minus size={12} />
          </button>

          <span className="min-w-[16px] text-center text-[12px] font-semibold text-slate-900">
            {quantity}
          </span>

          <button
            type="button"
            onClick={increment}
            aria-label="Increase quantity"
            className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-600 transition hover:bg-slate-200"
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