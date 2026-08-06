import { Fragment } from "react";
import PaginationControls from "./PaginationControls";

const defaultStatusStyles = {
  approved: "bg-emerald-100 text-emerald-700",
  requested: "bg-amber-100 text-amber-700",
  received: "bg-blue-100 text-blue-700",
  transit: "bg-orange-100 text-orange-700",
  "in transit": "bg-orange-100 text-orange-700",
  declined: "bg-rose-100 text-rose-700",
  pending: "bg-slate-100 text-slate-700",
};

const getStatusClassName = (status) => {
  if (!status) return defaultStatusStyles.pending;
  const key = String(status).trim().toLowerCase();
  return defaultStatusStyles[key] || defaultStatusStyles.pending;
};

const defaultRenderValue = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  return value;
};

function EmptyState({ title = "No records found", description = "No matching records were found. Try adjusting your search or filters, or check back later when new data becomes available." }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-7 w-7 text-emerald-500"
        >
          <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11" />
          <path d="M16 15a2 2 0 0 0 2 2h4v-3a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2Z" />
          <path d="M3 9h18" />
        </svg>
      </div>
      <h4 className="text-[16px] font-bold text-slate-900 sm:text-[17px]">{title}</h4>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-slate-400 sm:text-[13.5px]">
        {description}
      </p>
    </div>
  );
}

export default function SectionedTableCard({
  title,
  columns = [],
  sections = [],
  className = "",
  footerLabel,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onViewDetails,
  viewDetailsLabel = "View Details",
  emptyStateTitle,
  emptyStateDescription,
}) {
  const totalRows = sections.reduce((count, section) => count + (section.rows?.length || 0), 0);
  const isEmpty = totalRows === 0;

  return (
    <article className={`w-full overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.06)] ${className}`}>
      {title ? (
        <header className="border-b border-slate-200 px-4 py-2.5 sm:px-5">
          <h3 className="text-[18px] font-bold leading-tight tracking-[-0.02em] text-slate-900 sm:text-[20px]">
            {title}
          </h3>
        </header>
      ) : null}

      {isEmpty ? (
        <EmptyState title={emptyStateTitle} description={emptyStateDescription} />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-[#EDEDED] text-left text-[11px] font-extrabold uppercase tracking-[0.03em] text-slate-600 sm:text-[12px]">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`whitespace-nowrap px-3 py-3 align-middle first:pl-4 last:pr-4 sm:px-4 ${column.headerClassName || ""}`}
                    style={column.width ? { width: column.width } : undefined}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {sections.map((section, sectionIndex) => (
                <Fragment key={section.label || section.id || `section-${sectionIndex}`}>
                  {section.label ? (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="bg-[#EAF7E8] px-4 py-2 text-center text-[12px] font-semibold text-emerald-700 sm:text-[13px]"
                      >
                        {section.label}
                      </td>
                    </tr>
                  ) : null}

                  {(section.rows || []).map((row, rowIndex) => (
                    <tr key={row.id || `${section.label || "row"}-${rowIndex}`} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                      {columns.map((column) => {
                        if (typeof column.render === "function") {
                          return (
                            <td key={column.key} className={`px-3 py-3 align-middle sm:px-4 ${column.cellClassName || ""}`}>
                              {column.render(row)}
                            </td>
                          );
                        }

                        const cellValue = row[column.key];

                        if (column.key === "status") {
                          return (
                            <td key={column.key} className={`whitespace-nowrap px-3 py-3 align-middle sm:px-4 ${column.cellClassName || ""}`}>
                              <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold capitalize ${getStatusClassName(cellValue)}`}>
                                {cellValue}
                              </span>
                            </td>
                          );
                        }

                        if (column.key === "action") {
                          return (
                            <td key={column.key} className={`whitespace-nowrap px-3 py-3 pr-4 text-right align-middle sm:px-4 ${column.cellClassName || ""}`}>
                              <button
                                type="button"
                                onClick={() => onViewDetails?.(row)}
                                className="rounded-full border border-slate-300 px-3 py-1.5 text-[10px] font-semibold text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700 sm:text-[11px]"
                              >
                                {row.actionLabel || viewDetailsLabel}
                              </button>
                            </td>
                          );
                        }

                        return (
                          <td key={column.key} className={`whitespace-nowrap px-3 py-3 text-[12px] text-slate-700 sm:px-4 sm:text-[13px] ${column.cellClassName || ""}`}>
                            {defaultRenderValue(cellValue)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isEmpty && onPageChange ? (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          pageLabel={footerLabel || `Showing ${totalRows} item${totalRows === 1 ? "" : "s"}`}
        />
      ) : !isEmpty && footerLabel ? (
        <div className="border-t border-slate-200 bg-[#F3F5FF] px-4 py-3 text-sm text-slate-500 sm:px-5">
          {footerLabel}
        </div>
      ) : null}
    </article>
  );
}