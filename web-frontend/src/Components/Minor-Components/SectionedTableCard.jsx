import { Fragment } from "react";
import PaginationControls from "./PaginationControls";

const defaultStatusStyles = {
  approved: "bg-emerald-100 text-emerald-700",
  requested: "bg-amber-100 text-amber-700",
  received: "bg-blue-100 text-blue-700",
  transit: "bg-orange-100 text-orange-700",
  "in transit": "bg-orange-100 text-orange-700",
  "ready to receive": "bg-emerald-100 text-emerald-700",
  active: "bg-emerald-100 text-emerald-700",
  verified: "bg-emerald-100 text-emerald-700",
  paid: "bg-emerald-100 text-emerald-700",
  assigned: "bg-blue-100 text-blue-700",
  declined: "bg-rose-100 text-rose-700",
  pending: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
  delivered: "bg-emerald-100 text-emerald-700",
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

function LoadingState({ message = "Loading records..." }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
        <svg
          className="h-7 w-7 text-[#0B5D1E] animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
      <h4 className="text-[15px] font-bold text-slate-900">{message}</h4>
      <p className="mt-1 text-xs text-slate-400">Please wait while the data is being retrieved.</p>
    </div>
  );
}

export default function SectionedTableCard({
  title,
  columns = [],
  sections = [],
  className = "",
  tableClassName = "",
  footerLabel,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onViewDetails,
  onRowClick,
  rowClassName,
  viewDetailsLabel = "View Details",
  emptyStateTitle,
  emptyStateDescription,
  loading = false,
  isLoading = false,
  loadingMessage = "Loading records...",
}) {
  const isCurrentlyLoading = Boolean(loading || isLoading);
  const totalRows = sections.reduce((count, section) => count + (section.rows?.length || 0), 0);
  const isEmpty = totalRows === 0;

  return (
    <article className={`dark-readable-table w-full overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.06)] ${className}`}>
      {title ? (
        <header className="border-b border-slate-200 px-4 py-2.5 sm:px-5">
          <h3 className="text-[18px] font-bold leading-tight tracking-[-0.02em] text-slate-900 sm:text-[20px]">
            {title}
          </h3>
        </header>
      ) : null}

      {isCurrentlyLoading ? (
        <LoadingState message={loadingMessage} />
      ) : isEmpty ? (
        <EmptyState title={emptyStateTitle} description={emptyStateDescription} />
      ) : (
        <div className="overflow-x-auto overflow-y-auto max-h-72 sm:max-h-96 md:max-h-none -mx-4 md:mx-0">
          <div className="px-4 md:px-0">
            <table className={`w-full border-collapse text-[13px] ${tableClassName || "table-auto"}`}>
              {tableClassName?.includes("table-fixed") && (
                <colgroup>
                  {columns.map((col) => (
                    <col key={col.key} style={col.width ? { width: col.width } : undefined} />
                  ))}
                </colgroup>
              )}
            <thead>
              <tr className="bg-[#EDEDED] text-left text-[11px] font-bold tracking-[0.03em] text-slate-600">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`whitespace-nowrap px-3 py-3 align-middle first:pl-4 last:pr-4 sm:px-4 ${
                      column.key === "action" || column.key === "ACTION" ? "text-center" : ""
                    } ${column.headerClassName || ""}`}
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
                        className={
                          section.className ||
                          section.headerClassName ||
                          "bg-[#F0FDF4] border-y border-emerald-100/70 px-4 py-1.5 text-center text-[12px] font-semibold text-emerald-700"
                        }
                      >
                        {section.label}
                      </td>
                    </tr>
                  ) : null}

                  {(section.rows || []).map((row, rowIndex) => (
                    <tr
                      key={row.id || `${section.label || "row"}-${rowIndex}`}
                      onClick={() => onRowClick?.(row)}
                      className={`border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70 ${
                        onRowClick ? "cursor-pointer" : ""
                      } ${typeof rowClassName === "function" ? rowClassName(row) : rowClassName || ""}`}
                    >
                      {columns.map((column) => {
                        const cellProps =
                          typeof column.getCellProps === "function"
                            ? column.getCellProps(row, rowIndex, section)
                            : null;

                        if (cellProps?.skip) {
                          return null;
                        }

                        const cellClass = `${column.cellClassName || ""} ${cellProps?.className || ""}`;
                        const rowSpan = cellProps?.rowSpan;

                        if (typeof column.renderCell === "function") {
                          return (
                            <td
                              key={column.key}
                              rowSpan={rowSpan}
                              className={`px-3 py-3 align-middle text-[13px] font-medium text-slate-700 first:pl-4 last:pr-4 sm:px-4 ${cellClass}`}
                            >
                              {column.renderCell(row, rowIndex, section)}
                            </td>
                          );
                        }

                        if (typeof column.render === "function") {
                          return (
                            <td
                              key={column.key}
                              rowSpan={rowSpan}
                              className={`px-3 py-3 align-middle text-[13px] font-medium text-slate-700 first:pl-4 last:pr-4 sm:px-4 ${cellClass}`}
                            >
                              {column.render(row, rowIndex, section)}
                            </td>
                          );
                        }

                        const cellValue = row[column.key];

                        if (column.key === "status") {
                          return (
                            <td
                              key={column.key}
                              rowSpan={rowSpan}
                              className={`whitespace-nowrap px-3 py-3 align-middle first:pl-4 last:pr-4 sm:px-4 ${cellClass}`}
                              style={column.width ? { width: column.width } : undefined}
                            >
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClassName(cellValue)}`}>
                                {cellValue}
                              </span>
                            </td>
                          );
                        }

                        if (column.key === "action") {
                          return (
                            <td
                              key={column.key}
                              rowSpan={rowSpan}
                              className={`whitespace-nowrap px-3 py-3 align-middle first:pl-4 last:pr-4 sm:px-4 ${column.cellClassName || "text-center"} ${cellProps?.className || ""}`}
                              style={column.width ? { width: column.width } : undefined}
                            >
                              <button
                                type="button"
                                onClick={() => onViewDetails?.(row)}
                                className="rounded-md border border-slate-300 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 cursor-pointer"
                              >
                                {row.actionLabel || viewDetailsLabel}
                              </button>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={column.key}
                            rowSpan={rowSpan}
                            className={`whitespace-nowrap overflow-hidden text-ellipsis px-3 py-4 text-[13px] font-medium text-slate-700 first:pl-4 last:pr-4 sm:px-4 ${cellClass}`}
                            style={column.width ? { width: column.width } : undefined}
                          >
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