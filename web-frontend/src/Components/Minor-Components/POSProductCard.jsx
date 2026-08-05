import { Plus } from "lucide-react";
import CustomGreenButton from "./CustomGreenButton";

export default function ProductCard({
  image,
  name,
  sku,
  price,
  unitLabel = "Per Sack",
  stockAvailable,
  stockUnit = "sacks",
  onAddToCart,
  currency = "₱",
  className = "",
}) {
  const formattedPrice = typeof price === "number" ? price.toLocaleString("en-PH", { minimumFractionDigits: 2 }) : price;

  return (
    <article
      className={`w-full max-w-[340px] overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.06)] ${className}`}
    >
      <div className="h-[150px] w-full overflow-hidden bg-slate-100">
        {image ? (
          <img src={image} alt={name} className="h-full w-full object-cover" />
        ) : null}
      </div>

      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-bold leading-tight text-emerald-700">{name}</h3>
          {sku ? (
            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-600">
              {sku}
            </span>
          ) : null}
        </div>

        <div className="mt-2">
          <span className="text-[19px] font-extrabold text-slate-900">
            {currency}
            {formattedPrice}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-slate-400">{unitLabel}</p>

        {stockAvailable !== undefined && (
          <p className="mt-2.5 text-[12px] text-slate-600">
            Stock Available: <span className="font-bold text-emerald-700">{stockAvailable} {stockUnit}</span>
          </p>
        )}

        <div className="mt-3.5 flex justify-end">
          <CustomGreenButton
            onClick={onAddToCart}
            className="!rounded-full !px-3.5 !py-1.5 !text-[12px] shadow-[0_4px_10px_rgba(4,120,60,0.3)]"
            text={
              <span className="flex items-center gap-1.5">
                <Plus size={13} strokeWidth={2.5} />
                Add to Cart
              </span>
            }
          />
        </div>
      </div>
    </article>
  );
}