import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Edit2, Loader2, Plus, Search, ShieldAlert } from "lucide-react";

import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import PaginationControls from "../../../Components/Minor-Components/PaginationControls";
import Toast from "../../../Components/Modals/Toast";

import AddProfanityModal from "../../../Components/Modals/AdminModals/AddProfanityModal";
import EditProfanityModal from "../../../Components/Modals/AdminModals/EditProfanityModal";

import useProfanityManagement from "../../../Components/hooks/AccountAdmin/useProfanityManagement";
import useToast from "../../../Components/hooks/useToast";

const ITEMS_PER_PAGE = 10;

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-PH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

export default function ProfanityManagement() {
  const { toasts, showToast, removeToast } = useToast();

  const {
    words,
    supportedStatuses,
    isLoading,
    error,
    fetchProfanityWords,
    addProfanityWord,
    updateProfanityWord,
    deleteProfanityWord,
  } = useProfanityManagement();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState(null);

  // Initial load & refresh on filter change
  const loadData = useCallback(async () => {
    try {
      await fetchProfanityWords({
        search: searchQuery,
        status: statusFilter,
      });
    } catch (err) {
      // Handled by hook error state
    }
  }, [fetchProfanityWords, searchQuery, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset page when filters change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(words.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedWords = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return words.slice(start, start + ITEMS_PER_PAGE);
  }, [words, safeCurrentPage]);

  // Add word action
  const handleSaveNewWord = async ({ prohibited_text }) => {
    try {
      await addProfanityWord({ prohibited_text, status: "active" });
      setIsAddModalOpen(false);
      showToast({
        type: "success",
        title: "Word Added",
        message: `"${prohibited_text}" was added to prohibited words.`,
      });
      await loadData();
    } catch (err) {
      showToast({
        type: "error",
        title: "Save Failed",
        message: err?.message || "Unable to save prohibited word.",
      });
      throw err;
    }
  };

  // Edit word action
  const handleUpdateWord = async ({ profanityId, prohibited_text, status }) => {
    try {
      await updateProfanityWord(profanityId, { prohibited_text, status });
      setEditingWord(null);
      showToast({
        type: "success",
        title: "Word Updated",
        message: `Prohibited word "${prohibited_text}" was updated successfully.`,
      });
      await loadData();
    } catch (err) {
      showToast({
        type: "error",
        title: "Update Failed",
        message: err?.message || "Unable to update prohibited word.",
      });
      throw err;
    }
  };

  // Delete word action
  const handleDeleteWord = async (profanityId) => {
    try {
      await deleteProfanityWord(profanityId);
      setEditingWord(null);
      showToast({
        type: "success",
        title: "Word Deleted",
        message: "The prohibited word has been permanently removed.",
      });
      await loadData();
    } catch (err) {
      showToast({
        type: "error",
        title: "Delete Failed",
        message: err?.message || "Unable to delete prohibited word.",
      });
      throw err;
    }
  };

  return (
    <>
      {/* Toast notifications */}
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: "Management", path: "/admin/dashboard" },
          { label: "Profanity Management" },
        ]}
      />

      {/* Page Header */}
      <div className="mb-6 mt-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <span>Profanity Management</span>
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage prohibited words and moderation status for system-wide communications.
        </p>
      </div>

      {/* Controls Row: Search + Status Filter + Add Word Button */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search Bar */}
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search prohibited words..."
              className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 outline-none transition hover:bg-gray-50 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
          >
            <option value="">All Status</option>
            {supportedStatuses.map((st) => (
              <option key={st} value={st}>
                {st.charAt(0).toUpperCase() + st.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Add Word Button (Matching Add Supplier styling) */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-1.5 bg-[#0B5D1E] hover:bg-[#084b18] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap h-[38px]"
          >
            <Plus size={16} />
            <span>Add Word</span>
          </button>
        </div>
      </div>

      {/* Error alert if any */}
      {error && !isLoading && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-700">
            Unable to load prohibited words.
          </p>
          <p className="mt-0.5 text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Table Card */}
      <div className="dark-readable-table w-full overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
        {isLoading ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
            <Loader2 size={26} className="animate-spin text-[#08511f]" />
            <p className="mt-3 text-[13px] font-semibold text-slate-700">
              Loading prohibited words...
            </p>
          </div>
        ) : words.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 mb-2">
              <ShieldAlert size={22} />
            </div>
            <p className="text-sm font-semibold text-gray-800">
              No prohibited words found
            </p>
            <p className="mt-1 text-xs text-gray-500 max-w-sm">
              {searchQuery || statusFilter
                ? "No prohibited words match your filter criteria. Try adjusting your search query or status filter."
                : "No prohibited words have been defined yet. Click 'Add Word' to add the first word."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead className="bg-[#EDEDED]">
                  <tr>
                    <th className="px-4 py-3 text-left text-[11px] font-bold tracking-[0.03em] text-slate-600 uppercase">
                      WORD
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold tracking-[0.03em] text-slate-600 uppercase">
                      STATUS
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold tracking-[0.03em] text-slate-600 uppercase">
                      LAST UPDATED AT
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-bold tracking-[0.03em] text-slate-600 uppercase">
                      ACTION
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedWords.map((row) => {
                    const isActive =
                      String(row.status).toLowerCase() === "active";

                    return (
                      <tr
                        key={row.profanity_id}
                        className="transition hover:bg-slate-50/80"
                      >
                        {/* WORD - Normal font weight */}
                        <td className="px-4 py-3.5 text-sm font-normal text-slate-700">
                          {row.prohibited_text}
                        </td>

                        {/* STATUS */}
                        <td className="px-4 py-3.5 font-normal">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                              isActive
                                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border border-rose-200 bg-rose-50 text-rose-700"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>

                        {/* LAST UPDATED AT - Normal font weight */}
                        <td className="px-4 py-3.5 text-xs font-normal text-slate-500">
                          {formatDate(row.updated_at)}
                        </td>

                        {/* ACTION - View Details style with Edit label and pencil icon */}
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setEditingWord(row)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 hover:bg-slate-50 cursor-pointer"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {words.length > ITEMS_PER_PAGE && (
              <PaginationControls
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
                pageLabel={`Showing ${(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(
                  safeCurrentPage * ITEMS_PER_PAGE,
                  words.length
                )} of ${words.length} prohibited words`}
              />
            )}
          </>
        )}
      </div>

      {/* Add Prohibited Word Modal */}
      <AddProfanityModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveNewWord}
      />

      {/* Edit Prohibited Word Modal */}
      <EditProfanityModal
        open={Boolean(editingWord)}
        wordRecord={editingWord}
        supportedStatuses={supportedStatuses}
        onClose={() => setEditingWord(null)}
        onSave={handleUpdateWord}
        onDelete={handleDeleteWord}
      />
    </>
  );
}
