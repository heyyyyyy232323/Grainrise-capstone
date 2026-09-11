import {
  useEffect,
  useState,
} from "react";

import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import Toast from "../../../Components/Minor-Components/Toast";

import AdminNewsConfirmModal from "../../../Components/Modals/NewsUpdates/AdminNewsConfirmModal";
import AdminNewsDetailsModal from "../../../Components/Modals/NewsUpdates/AdminNewsDetailsModal";
import AdminNewsPenaltyModal from "../../../Components/Modals/NewsUpdates/AdminNewsPenaltyModal";

import useToast from "../../../Components/hooks/useToast";
import useNewsAdmin from "../../../Components/hooks/NewsUpdates/useNewsAdmin";

import AdminNewsManage from "./NewsUpdates/AdminNewsManage";
import AdminNewsOverview from "./NewsUpdates/AdminNewsOverview";


const formatLabel = (
  value
) =>
  String(
    value || ""
  )
    .replace(
      /_/g,
      " "
    )
    .replace(
      /\b\w/g,
      (char) =>
        char.toUpperCase()
    );


const AdminNewsUpdates = () => {

  const {
    syncStatus,
    isStatusLoading,
    statusError,
    loadNewsSyncStatus,
    isFetchingLatest,
    fetchLatestNews,

    adminArticles,
    articlePagination,
    isArticlesLoading,
    articlesError,
    loadAdminArticles,

    adminArticleDetail,
    isDetailLoading,
    detailError,
    loadAdminArticleDetail,
    clearAdminArticleDetail,

    isActionLoading,
    updateAdminArticleStatus,
    deleteAdminArticle,
    moderateAdminComment,
    penalizeAdminCommenter,
  } =
    useNewsAdmin();


  const {
    toasts,
    showToast,
    removeToast,
  } =
    useToast();


  const [
    segment,
    setSegment,
  ] = useState(
    "overview"
  );

  const [
    selectedNewsId,
    setSelectedNewsId,
  ] = useState(null);

  const [
    confirmState,
    setConfirmState,
  ] = useState(null);

  const [
    confirmReason,
    setConfirmReason,
  ] = useState("");

  const [
    penaltyTarget,
    setPenaltyTarget,
  ] = useState(null);

  const [
    manageRefreshKey,
    setManageRefreshKey,
  ] = useState(0);


  // =========================================================
  // INITIAL STATUS
  // =========================================================

  useEffect(() => {
    loadNewsSyncStatus()
      .catch(
        () => {}
      );

  }, [
    loadNewsSyncStatus,
  ]);


  // =========================================================
  // ARTICLE DETAIL
  // =========================================================

  const openArticle =
    async (
      article
    ) => {
      setSelectedNewsId(
        article.news_id
      );

      clearAdminArticleDetail();

      await loadAdminArticleDetail(
        article.news_id
      ).catch(
        () => {}
      );
    };


  const closeArticle = () => {
    setSelectedNewsId(null);
    clearAdminArticleDetail();
  };


  const refreshSelectedArticle =
    async () => {
      if (!selectedNewsId) {
        return;
      }

      await loadAdminArticleDetail(
        selectedNewsId
      );
    };


  const refreshManageList = () => {
    setManageRefreshKey(
      (value) =>
        value + 1
    );
  };


  // =========================================================
  // CONFIRM MODAL
  // =========================================================

  const openConfirm = (
    config
  ) => {
    setConfirmReason("");
    setConfirmState(config);
  };


  const closeConfirm = () => {
    if (
      isActionLoading ||
      isFetchingLatest
    ) {
      return;
    }

    setConfirmState(null);
    setConfirmReason("");
  };


  // =========================================================
  // ARTICLE + COMMENT ACTIONS
  // =========================================================

  const runConfirmedAction =
    async () => {
      if (!confirmState) {
        return;
      }

      try {
        if (
          confirmState.kind ===
          "fetch"
        ) {
          await fetchLatestNews();
          await loadNewsSyncStatus();

          showToast({
            type: "success",
            title: "News Updated",
            message:
              "Latest available news was fetched successfully.",
            duration: 4000,
          });
        }

        else if (
          confirmState.kind ===
          "archive"
        ) {
          await updateAdminArticleStatus({
            newsId:
              confirmState.newsId,

            status:
              "archived",

            reason:
              confirmReason,
          });

          refreshManageList();
          await refreshSelectedArticle();
          await loadNewsSyncStatus();

          showToast({
            type: "success",
            title: "Article Archived",
            message:
              "The news article was archived successfully.",
            duration: 4000,
          });
        }

        else if (
          confirmState.kind ===
          "restore"
        ) {
          await updateAdminArticleStatus({
            newsId:
              confirmState.newsId,

            status:
              "active",
          });

          refreshManageList();
          await refreshSelectedArticle();
          await loadNewsSyncStatus();

          showToast({
            type: "success",
            title: "Article Restored",
            message:
              "The news article is active again.",
            duration: 4000,
          });
        }

        else if (
          confirmState.kind ===
          "deleteArticle"
        ) {
          await deleteAdminArticle({
            newsId:
              confirmState.newsId,

            reason:
              confirmReason,
          });

          closeArticle();
          refreshManageList();
          await loadNewsSyncStatus();

          showToast({
            type: "success",
            title: "Article Deleted",
            message:
              "The news article was permanently deleted.",
            duration: 4000,
          });
        }

        else if (
          confirmState.kind ===
          "comment"
        ) {
          await moderateAdminComment({
            commentId:
              confirmState.commentId,

            action:
              confirmState.action,

            reason:
              confirmReason,
          });

          refreshManageList();
          await refreshSelectedArticle();

          showToast({
            type: "success",
            title: "Comment Updated",
            message:
              "The moderation action was completed successfully.",
            duration: 4000,
          });
        }

        setConfirmState(null);
        setConfirmReason("");

      } catch (error) {
        showToast({
          type: "error",
          title: "Action Failed",
          message:
            error?.message ||
            "Unable to complete the requested action.",
          duration: 5000,
        });
      }
    };


  // =========================================================
  // PENALTY
  //
  // NO NAVIGATION.
  // =========================================================

  const openPenalty = (
    comment
  ) => {
    setPenaltyTarget({
      comment_id:
        comment.comment_id,

      user_id:
        comment.user_id,

      author_name:
        comment.author_name,

      author_role:
        comment.author_role,

      comment_text:
        comment.comment_text,

      comment_status:
        comment.comment_status,

      user_status:
        comment.user_status,
    });
  };


  const closePenalty = () => {
    if (isActionLoading) {
      return;
    }

    setPenaltyTarget(null);
  };


  const confirmPenalty =
    async (
      reason
    ) => {
      if (!penaltyTarget) {
        return;
      }

      try {
        await penalizeAdminCommenter({
          commentId:
            penaltyTarget
              .comment_id,

          reason,
        });

        setPenaltyTarget(null);

        refreshManageList();
        await refreshSelectedArticle();

        showToast({
          type: "success",
          title: "User Penalized",
          message:
            "The user's account has been deactivated and the penalty reason was recorded.",
          duration: 4500,
        });

      } catch (error) {
        showToast({
          type: "error",
          title: "Penalty Failed",
          message:
            error?.message ||
            "Unable to penalize this user.",
          duration: 5000,
        });
      }
    };


  return (
    <>
      <Toast
        toasts={toasts}
        removeToast={
          removeToast
        }
      />


      <Breadcrumbs
        items={[
          {
            label:
              "Communication",
          },
          {
            label:
              "News & Updates",
          },
        ]}
      />


      {/* HEADER */}

      <div
        className="
          mb-6
          mt-4
        "
      >
        <h1
          className="
            text-3xl
            font-bold
            text-gray-900
          "
        >
          News & Updates
        </h1>

        <p
          className="
            mt-1
            text-sm
            text-gray-500
          "
        >
          Manage centralized GrainRise news,
          synchronization, reactions, and comments.
        </p>
      </div>


      {/* SEGMENTATION */}

      <div
        className="
          mb-6
          border-b
          border-gray-200
        "
      >
        <div
          className="
            flex
            gap-7
          "
        >
          <button
            type="button"
            onClick={() =>
              setSegment(
                "overview"
              )
            }
            className={`
              border-b-2
              pb-3
              text-sm
              font-semibold

              ${
                segment ===
                "overview"
                  ? "border-[#08511f] text-[#08511f]"
                  : "border-transparent text-gray-500"
              }
            `}
          >
            Overview & Sync
          </button>

          <button
            type="button"
            onClick={() =>
              setSegment(
                "manage"
              )
            }
            className={`
              border-b-2
              pb-3
              text-sm
              font-semibold

              ${
                segment ===
                "manage"
                  ? "border-[#08511f] text-[#08511f]"
                  : "border-transparent text-gray-500"
              }
            `}
          >
            Manage News
          </button>
        </div>
      </div>


      {/* CONTENT */}

      {segment ===
        "overview" ? (
        <AdminNewsOverview
          syncStatus={
            syncStatus
          }
          isLoading={
            isStatusLoading
          }
          error={
            statusError
          }
          onFetch={() =>
            openConfirm({
              kind: "fetch",

              title:
                "Fetch Latest News",

              message:
                (
                  "This action contacts NewsData and may consume " +
                  "API credits. Do you want to continue?"
                ),
            })
          }
        />
      ) : (
        <AdminNewsManage
          articles={
            adminArticles
          }
          pagination={
            articlePagination
          }
          loading={
            isArticlesLoading
          }
          error={
            articlesError
          }
          loadArticles={
            loadAdminArticles
          }
          onView={
            openArticle
          }
          refreshKey={
            manageRefreshKey
          }
        />
      )}


      {/* ARTICLE DETAILS */}

      <AdminNewsDetailsModal
        open={
          Boolean(
            selectedNewsId
          )
        }
        data={
          adminArticleDetail
        }
        loading={
          isDetailLoading
        }
        error={
          detailError
        }
        onClose={
          closeArticle
        }

        onArchive={(article) =>
          openConfirm({
            kind:
              "archive",

            newsId:
              article.news_id,

            title:
              "Archive News Article",

            message:
              (
                "This article will stop appearing in user News feeds. " +
                "It will remain stored in GrainRise."
              ),

            requireReason:
              true,
          })
        }

        onRestore={(article) =>
          openConfirm({
            kind:
              "restore",

            newsId:
              article.news_id,

            title:
              "Restore News Article",

            message:
              "This article will become available to its assigned audiences again.",
          })
        }

        onDelete={(article) =>
          openConfirm({
            kind:
              "deleteArticle",

            newsId:
              article.news_id,

            title:
              "Delete News Article",

            message:
              (
                "This permanently deletes the article together with " +
                "its reactions, comments, and replies."
              ),

            requireReason:
              true,

            destructive:
              true,
          })
        }

        onModerateComment={(
          comment,
          action
        ) =>
          openConfirm({
            kind:
              "comment",

            commentId:
              comment.comment_id,

            action,

            title:
              `${formatLabel(
                action
              )} Comment`,

            message:
              (
                action === "delete"
                  ? "The comment text will be replaced with [deleted]."
                  : action === "hide"
                    ? "The comment will be hidden from the News discussion."
                    : "The hidden comment will become visible again."
              ),

            requireReason:
              action !== "restore",

            destructive:
              action === "delete",
          })
        }

        onPenalty={
          openPenalty
        }
      />


      {/* GENERAL CONFIRM */}

      <AdminNewsConfirmModal
        open={
          Boolean(
            confirmState
          )
        }
        title={
          confirmState?.title ||
          "Confirm Action"
        }
        message={
          confirmState?.message ||
          ""
        }
        confirmLabel={
          confirmState?.kind ===
          "fetch"
            ? "Fetch Latest"
            : confirmState?.kind ===
              "deleteArticle"
              ? "Delete"
              : confirmState?.kind ===
                "archive"
                ? "Archive"
                : confirmState?.kind ===
                  "restore"
                  ? "Restore"
                  : confirmState?.action ===
                    "delete"
                    ? "Delete"
                    : "Confirm"
        }
        reason={
          confirmReason
        }
        setReason={
          setConfirmReason
        }
        requireReason={
          Boolean(
            confirmState
              ?.requireReason
          )
        }
        destructive={
          Boolean(
            confirmState
              ?.destructive
          )
        }
        loading={
          isActionLoading ||
          isFetchingLatest
        }
        onClose={
          closeConfirm
        }
        onConfirm={
          runConfirmedAction
        }
      />


      {/* PENALTY */}

      <AdminNewsPenaltyModal
        open={
          Boolean(
            penaltyTarget
          )
        }
        target={
          penaltyTarget
        }
        loading={
          isActionLoading
        }
        onClose={
          closePenalty
        }
        onConfirm={
          confirmPenalty
        }
      />
    </>
  );
};


export default AdminNewsUpdates;