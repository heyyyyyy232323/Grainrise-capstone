import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Loader2,
  RefreshCcw,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";

import AnnouncementTable from "../../../../Components/Major-Components/AnnouncementTable";
import Toast from "../../../../Components/Modals/Toast";

import ViewAnnouncementModal from "../../../../Components/Modals/AdminModals/ViewAnnouncementModal";
import ArchiveAnnouncementModal from "../../../../Components/Modals/AdminModals/ArchiveAnnouncementModal";
import ReactivateAnnouncementModal from "../../../../Components/Modals/AdminModals/ReactivateAnnouncementModal";

import useAnnouncementAdmin from "../../../../Components/hooks/AccountAdmin/useAnnouncementAdmin";
import useToast from "../../../../Components/hooks/useToast";


// ============================================================
// DELETE CONFIRM MODAL (NO OUTSIDE-CLICK DISMISS)
// ============================================================

const DeleteAnnouncementModal = ({
  open,
  announcement,
  loading = false,
  reason = "",
  setReason,
  onCancel,
  onConfirm,
}) => {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 size={19} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Delete Announcement
              </h2>
              <p className="mt-0.5 text-xs text-gray-400">
                This action is permanent and cannot be undone.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm text-gray-600 leading-relaxed">
            Are you sure you want to permanently delete{" "}
            <strong>"{announcement?.title || "this announcement"}"</strong>?
            All associated comments, replies, and reactions will also be removed.
          </p>

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">
              Reason for Deletion <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason?.(e.target.value)}
              rows={3}
              placeholder="Provide a required reason for permanently deleting this announcement..."
              className="w-full resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 bg-gray-50">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || !String(reason || "").trim()}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Permanently Delete"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};


// ============================================================
// COMMENT / REPLY MODERATION CONFIRM MODAL (NO OUTSIDE-CLICK DISMISS)
// ============================================================

const ModerationConfirmModal = ({
  open,
  target,
  action,
  isReply = false,
  loading = false,
  reason = "",
  setReason,
  onCancel,
  onConfirm,
}) => {
  if (!open) return null;

  const requireReason = action === "hide" || action === "delete";
  const actionTitle =
    {
      hide: "Hide",
      restore: "Restore",
      delete: "Delete",
    }[action] || "Moderate";

  const entityName = isReply ? "Reply" : "Comment";

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {actionTitle} {entityName}
            </h2>
            <p className="mt-0.5 text-xs text-gray-400">
              Confirm moderation action on user content.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm text-gray-600 leading-relaxed">
            Are you sure you want to <strong>{action}</strong> this {entityName.toLowerCase()} by{" "}
            <strong>{target?.author_name || "Unknown User"}</strong>?
          </p>

          {requireReason && (
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                Reason for Moderation <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason?.(e.target.value)}
                rows={3}
                placeholder={`Provide reason to ${action} this ${entityName.toLowerCase()}...`}
                className="w-full resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#08511f] focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 bg-gray-50">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || (requireReason && !String(reason || "").trim())}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
              action === "delete"
                ? "bg-red-600 hover:bg-red-700"
                : action === "hide"
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-[#08511f] hover:bg-[#063d18]"
            }`}
          >
            {loading ? "Processing..." : `Confirm ${actionTitle}`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};


// ============================================================
// PENALTY MODAL (NO OUTSIDE-CLICK DISMISS)
// ============================================================

const PenaltyModal = ({
  open,
  target,
  isReply = false,
  loading = false,
  reason = "",
  setReason,
  onCancel,
  onConfirm,
}) => {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Penalize User Account
              </h2>
              <p className="mt-0.5 text-xs text-gray-400">
                Deactivate account due to policy violation in announcements.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900">
                  {target?.author_name || "Unknown User"}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {target?.author_role || "User"} • ID: {target?.user_id}
                </p>
              </div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                Active Account
              </span>
            </div>
            <p className="mt-3 text-xs italic text-gray-600 line-clamp-3 bg-white p-2.5 rounded-lg border border-gray-200">
              "{target?.comment_content || target?.reply_content || target?.comment_text}"
            </p>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">
              Reason for Penalty <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason?.(e.target.value)}
              rows={3}
              placeholder="State the violation reason for deactivating this account..."
              className="w-full resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 bg-gray-50">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || !String(reason || "").trim()}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Deactivating..." : "Deactivate Account"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};


// ============================================================
// MAIN COMPONENT
// ============================================================

const AnnouncementManagement = () => {
  const {
    adminAnnouncements,
    announcementPagination,
    isAnnouncementsLoading,
    announcementsError,
    loadAdminAnnouncements,

    announcementCounts,
    isCountsLoading,
    loadAnnouncementCounts,

    adminAnnouncementDetail,
    isDetailLoading,
    detailError,
    loadAdminAnnouncementDetail,
    clearAdminAnnouncementDetail,

    isActionLoading,
    actionError,

    updateAdminAnnouncementStatus,
    deleteAdminAnnouncement,
    moderateAdminComment,
    penalizeAdminCommenter,
    moderateAdminReply,
    penalizeAdminReplyAuthor,
  } = useAnnouncementAdmin();

  const {
    toasts,
    showToast,
    removeToast,
  } = useToast();

  // Filters
  const [search, setSearch] = useState("");
  const [audience, setAudience] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal Targets
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const [archiveTarget, setArchiveTarget] = useState(null);
  const [reactivateTarget, setReactivateTarget] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");

  const [moderationTarget, setModerationTarget] = useState(null); // { item, action, isReply }
  const [moderationReason, setModerationReason] = useState("");

  const [penaltyTarget, setPenaltyTarget] = useState(null); // { item, isReply }
  const [penaltyReason, setPenaltyReason] = useState("");

  // =========================================================
  // LOAD DATA
  // =========================================================

  const fetchList = useCallback(async () => {
    try {
      await loadAdminAnnouncements({
        search,
        audience,
        status: statusFilter,
        page,
        page_size: pageSize,
      });
    } catch (err) {
      console.error("Unable to load announcements:", err);
    }
  }, [loadAdminAnnouncements, search, audience, statusFilter, page, pageSize]);

  const fetchCounts = useCallback(async () => {
    try {
      await loadAnnouncementCounts();
    } catch (err) {
      console.error("Unable to load announcement counts:", err);
    }
  }, [loadAnnouncementCounts]);

  useEffect(() => {
    fetchList();
    fetchCounts();
  }, [fetchList, fetchCounts]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [search, audience, statusFilter, pageSize]);

  // =========================================================
  // VIEW
  // =========================================================

  const handleView = useCallback(
    async (announcement) => {
      setSelectedAnnouncement(announcement);
      setShowViewModal(true);

      try {
        await loadAdminAnnouncementDetail(announcement.announcement_id);
      } catch (err) {
        showToast({
          type: "error",
          title: "Detail Load Failed",
          message: err?.message || "Unable to load announcement details.",
        });
      }
    },
    [loadAdminAnnouncementDetail, showToast]
  );

  const handleCloseView = useCallback(() => {
    setShowViewModal(false);
    setSelectedAnnouncement(null);
    clearAdminAnnouncementDetail();
  }, [clearAdminAnnouncementDetail]);

  // =========================================================
  // ARCHIVE
  // =========================================================

  const handleConfirmArchive = useCallback(async () => {
    if (!archiveTarget?.announcement_id) return;

    try {
      await updateAdminAnnouncementStatus({
        announcementId: archiveTarget.announcement_id,
        status: "archived",
      });

      setArchiveTarget(null);
      showToast({
        type: "success",
        title: "Announcement Archived",
        message: "The announcement was archived successfully.",
      });

      await fetchList();
      await fetchCounts();
    } catch (err) {
      showToast({
        type: "error",
        title: "Archive Failed",
        message: err?.message || "Unable to archive announcement.",
      });
    }
  }, [archiveTarget, updateAdminAnnouncementStatus, showToast, fetchList, fetchCounts]);

  // =========================================================
  // REACTIVATE
  // =========================================================

  const handleConfirmReactivate = useCallback(async () => {
    if (!reactivateTarget?.announcement_id) return;

    try {
      await updateAdminAnnouncementStatus({
        announcementId: reactivateTarget.announcement_id,
        status: "active",
      });

      setReactivateTarget(null);
      showToast({
        type: "success",
        title: "Announcement Reactivated",
        message: "The announcement is active again.",
      });

      await fetchList();
      await fetchCounts();
    } catch (err) {
      showToast({
        type: "error",
        title: "Reactivation Failed",
        message: err?.message || "Unable to reactivate announcement.",
      });
    }
  }, [reactivateTarget, updateAdminAnnouncementStatus, showToast, fetchList, fetchCounts]);

  // =========================================================
  // PERMANENT DELETE
  // =========================================================

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget?.announcement_id) return;

    try {
      await deleteAdminAnnouncement({
        announcementId: deleteTarget.announcement_id,
        reason: deleteReason,
      });

      setDeleteTarget(null);
      setDeleteReason("");

      showToast({
        type: "success",
        title: "Announcement Deleted",
        message: "The announcement was permanently deleted.",
      });

      await fetchList();
      await fetchCounts();
    } catch (err) {
      showToast({
        type: "error",
        title: "Delete Failed",
        message: err?.message || "Unable to delete announcement.",
      });
    }
  }, [deleteTarget, deleteReason, deleteAdminAnnouncement, showToast, fetchList, fetchCounts]);

  // =========================================================
  // COMMENT / REPLY MODERATION
  // =========================================================

  const handleOpenModeration = useCallback((item, action, isReply) => {
    setModerationTarget({ item, action, isReply });
    setModerationReason("");
  }, []);

  const handleConfirmModeration = useCallback(async () => {
    if (!moderationTarget) return;

    const { item, action, isReply } = moderationTarget;

    try {
      if (isReply) {
        await moderateAdminReply({
          replyId: item.reply_id,
          action,
          reason: moderationReason,
        });
      } else {
        await moderateAdminComment({
          commentId: item.comment_id,
          action,
          reason: moderationReason,
        });
      }

      setModerationTarget(null);
      setModerationReason("");

      showToast({
        type: "success",
        title: "Moderation Completed",
        message: `The ${isReply ? "reply" : "comment"} was updated successfully.`,
      });

      if (selectedAnnouncement?.announcement_id) {
        await loadAdminAnnouncementDetail(selectedAnnouncement.announcement_id);
      }
    } catch (err) {
      showToast({
        type: "error",
        title: "Moderation Failed",
        message: err?.message || "Unable to complete moderation action.",
      });
    }
  }, [
    moderationTarget,
    moderationReason,
    moderateAdminReply,
    moderateAdminComment,
    selectedAnnouncement,
    loadAdminAnnouncementDetail,
    showToast,
  ]);

  // =========================================================
  // PENALTY
  // =========================================================

  const handleOpenPenalty = useCallback((item, isReply) => {
    setPenaltyTarget({ item, isReply });
    setPenaltyReason("");
  }, []);

  const handleConfirmPenalty = useCallback(async () => {
    if (!penaltyTarget) return;

    const { item, isReply } = penaltyTarget;

    try {
      if (isReply) {
        await penalizeAdminReplyAuthor({
          replyId: item.reply_id,
          reason: penaltyReason,
        });
      } else {
        await penalizeAdminCommenter({
          commentId: item.comment_id,
          reason: penaltyReason,
        });
      }

      setPenaltyTarget(null);
      setPenaltyReason("");

      showToast({
        type: "success",
        title: "User Account Penalized",
        message: "The user account has been deactivated successfully.",
      });

      if (selectedAnnouncement?.announcement_id) {
        await loadAdminAnnouncementDetail(selectedAnnouncement.announcement_id);
      }
    } catch (err) {
      showToast({
        type: "error",
        title: "Penalty Failed",
        message: err?.message || "Unable to penalize user.",
      });
    }
  }, [
    penaltyTarget,
    penaltyReason,
    penalizeAdminReplyAuthor,
    penalizeAdminCommenter,
    selectedAnnouncement,
    loadAdminAnnouncementDetail,
    showToast,
  ]);

  // =========================================================
  // EDIT
  // =========================================================

  const handleEdit = useCallback((announcement) => {
    window.dispatchEvent(
      new CustomEvent("grainrise:edit-announcement", {
        detail: announcement,
      })
    );
  }, []);

  // =========================================================
  // REFRESH
  // =========================================================

  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchList(), fetchCounts()]);
  }, [fetchList, fetchCounts]);

  const totalPages = Math.max(
    1,
    Math.ceil((announcementPagination?.total || 0) / pageSize)
  );

  return (
    <div className="space-y-5">
      {/* =====================================================
          SUMMARY CARDS
      ====================================================== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                All Announcements
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {announcementCounts?.all ?? announcementCounts?.total ?? 0}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
              <FileText size={19} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Active
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">
                {announcementCounts?.active ?? 0}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Eye size={19} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Drafts
              </p>
              <p className="mt-2 text-2xl font-bold text-amber-600">
                {announcementCounts?.draft ?? 0}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <FileText size={19} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Archived
              </p>
              <p className="mt-2 text-2xl font-bold text-orange-600">
                {announcementCounts?.archived ?? 0}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <Archive size={19} />
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          CONTROLS
      ====================================================== */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {/* SEARCH */}
          <div className="relative min-w-56 flex-1 max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search announcements..."
              className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
            />
          </div>

          {/* AUDIENCE */}
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-[#08511f]"
          >
            <option value="">All Audiences</option>
            <option value="all">General (All)</option>
            <option value="miller">Miller</option>
            <option value="warehouse">Warehouse</option>
            <option value="retailer">Retailer</option>
          </select>

          {/* STATUS */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-[#08511f]"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* REFRESH */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isAnnouncementsLoading || isCountsLoading}
          className="flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCcw
            size={15}
            className={isAnnouncementsLoading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* ERROR BANNER */}
      {announcementsError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {announcementsError}
        </div>
      )}

      {/* =====================================================
          ANNOUNCEMENT TABLE
      ====================================================== */}
      <AnnouncementTable
        announcements={adminAnnouncements}
        loading={isAnnouncementsLoading}
        onView={handleView}
        onEdit={handleEdit}
        onArchive={(announcement) => setArchiveTarget(announcement)}
        onReactivate={(announcement) => setReactivateTarget(announcement)}
        onDelete={(announcement) => {
          setDeleteTarget(announcement);
          setDeleteReason("");
        }}
      />

      {/* =====================================================
          PAGINATION
      ====================================================== */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1">
        <p className="text-xs text-gray-500">
          Showing <strong>{adminAnnouncements.length}</strong> of{" "}
          <strong>{announcementPagination?.total || 0}</strong> announcement(s)
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || isAnnouncementsLoading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={16} />
            Previous
          </button>

          <span className="min-w-24 text-center text-sm text-gray-600">
            Page <strong>{page}</strong> of <strong>{totalPages}</strong>
          </span>

          <button
            type="button"
            disabled={page >= totalPages || isAnnouncementsLoading}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            className="flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
            <ChevronRight size={16} />
          </button>

          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-700"
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </div>

      {/* =====================================================
          MODALS
      ====================================================== */}

      <ViewAnnouncementModal
        open={showViewModal}
        announcement={adminAnnouncementDetail || selectedAnnouncement}
        onClose={handleCloseView}
        onEdit={handleEdit}
        onModerateComment={(comment, action) =>
          handleOpenModeration(comment, action, false)
        }
        onModerateReply={(reply, action) =>
          handleOpenModeration(reply, action, true)
        }
        onPenaltyComment={(comment) => handleOpenPenalty(comment, false)}
        onPenaltyReply={(reply) => handleOpenPenalty(reply, true)}
      />

      <ArchiveAnnouncementModal
        open={Boolean(archiveTarget)}
        announcement={archiveTarget}
        loading={isActionLoading}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={handleConfirmArchive}
      />

      <ReactivateAnnouncementModal
        open={Boolean(reactivateTarget)}
        announcement={reactivateTarget}
        loading={isActionLoading}
        onCancel={() => setReactivateTarget(null)}
        onConfirm={handleConfirmReactivate}
      />

      <DeleteAnnouncementModal
        open={Boolean(deleteTarget)}
        announcement={deleteTarget}
        loading={isActionLoading}
        reason={deleteReason}
        setReason={setDeleteReason}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteReason("");
        }}
        onConfirm={handleConfirmDelete}
      />

      <ModerationConfirmModal
        open={Boolean(moderationTarget)}
        target={moderationTarget?.item}
        action={moderationTarget?.action}
        isReply={moderationTarget?.isReply}
        loading={isActionLoading}
        reason={moderationReason}
        setReason={setModerationReason}
        onCancel={() => {
          setModerationTarget(null);
          setModerationReason("");
        }}
        onConfirm={handleConfirmModeration}
      />

      <PenaltyModal
        open={Boolean(penaltyTarget)}
        target={penaltyTarget?.item}
        isReply={penaltyTarget?.isReply}
        loading={isActionLoading}
        reason={penaltyReason}
        setReason={setPenaltyReason}
        onCancel={() => {
          setPenaltyTarget(null);
          setPenaltyReason("");
        }}
        onConfirm={handleConfirmPenalty}
      />

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default AnnouncementManagement;