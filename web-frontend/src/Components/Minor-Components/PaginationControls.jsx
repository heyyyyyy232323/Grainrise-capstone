import { ChevronLeft, ChevronRight } from "lucide-react";

const buildPageItems = (currentPage, totalPages) => {
  const items = [];
  const pushPage = (page) => {
    if (page >= 1 && page <= totalPages && !items.includes(page)) {
      items.push(page);
    }
  };

  pushPage(1);
  if (currentPage > 3) items.push("ellipsis-left");
  if (currentPage > 2) pushPage(currentPage - 1);
  if (currentPage !== 1 && currentPage !== totalPages) pushPage(currentPage);
  if (currentPage < totalPages - 1) pushPage(currentPage + 1);
  if (currentPage < totalPages - 2) items.push("ellipsis-right");
  if (totalPages > 1) pushPage(totalPages);

  return items;
};

export default function PaginationControls({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  pageLabel,
  className = "",
}) {
  const safeCurrent = Math.min(Math.max(currentPage, 1), Math.max(totalPages, 1));
  const safeTotal = Math.max(totalPages, 1);
  const pageItems = buildPageItems(safeCurrent, safeTotal);

  return (
    <div
      className={`dark-readable-pagination flex flex-col gap-3 border-t border-slate-200 bg-[#F3F5FF] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${className}`}
    >
      <p className="text-sm text-slate-500">{pageLabel}</p>

      <div className="flex items-center gap-1.5 self-end sm:self-auto">
        <button
          type="button"
          disabled={safeCurrent <= 1}
          onClick={() => onPageChange?.(safeCurrent - 1)}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={14} />
          Previous
        </button>

        {pageItems.map((item) => {
          if (typeof item === "string") {
            return (
              <span key={item} className="px-1.5 text-sm font-semibold text-slate-400">
                ...
              </span>
            );
          }

          const active = item === safeCurrent;

          return (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange?.(item)}
              className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2.5 text-xs font-semibold transition ${
                active
                  ? "border-[#018311] bg-[#018311] text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
              }`}
            >
              {item}
            </button>
          );
        })}

        <button
          type="button"
          disabled={safeCurrent >= safeTotal}
          onClick={() => onPageChange?.(safeCurrent + 1)}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}