import {
  useCallback,
  useState,
} from "react";

import useApi from "../useApi";


// ============================================================
// HELPERS
// ============================================================

const normalizePayloadData = (
  payload
) => {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload
  ) {
    return payload.data;
  }

  return payload;
};


const normalizeAnnouncementList = (
  payload
) => {
  const data =
    normalizePayloadData(
      payload
    );


  const announcements =
    Array.isArray(data)
      ? data
      : (
          data?.results ||
          data?.items ||
          data?.announcements ||
          []
        );


  return {
    announcements:
      Array.isArray(
        announcements
      )
        ? announcements
        : [],

    pagination: {
      total:
        Number(
          data?.total ??
          data?.count ??
          announcements?.length ??
          0
        ),

      page:
        Number(
          data?.page ??
          1
        ),

      page_size:
        Number(
          data?.page_size ??
          12
        ),

      total_pages:
        Number(
          data?.total_pages ??
          1
        ),
    },
  };
};


const buildAdminQuery = ({
  search = "",
  audience = "",
  status = "",
  page = 1,
  page_size = 12,
} = {}) => {

  const params =
    new URLSearchParams();


  const cleanSearch =
    String(
      search || ""
    ).trim();


  const cleanAudience =
    String(
      audience || ""
    ).trim();


  const cleanStatus =
    String(
      status || ""
    ).trim();


  if (cleanSearch) {
    params.set(
      "search",
      cleanSearch
    );
  }


  if (cleanAudience) {
    params.set(
      "audience",
      cleanAudience
    );
  }


  if (cleanStatus) {
    params.set(
      "status",
      cleanStatus
    );
  }


  params.set(
    "page",
    String(
      Math.max(
        Number(page) || 1,
        1
      )
    )
  );


  params.set(
    "page_size",
    String(
      Math.max(
        Number(page_size) || 12,
        1
      )
    )
  );


  return params.toString();
};


// ============================================================
// HOOK
// ============================================================

export default function useAnnouncementAdmin() {

  const {
    request,
  } = useApi();


  // =========================================================
  // LIST
  // =========================================================

  const [
    adminAnnouncements,
    setAdminAnnouncements,
  ] = useState([]);


  const [
    announcementPagination,
    setAnnouncementPagination,
  ] = useState({
    total: 0,
    page: 1,
    page_size: 12,
    total_pages: 1,
  });


  const [
    isAnnouncementsLoading,
    setIsAnnouncementsLoading,
  ] = useState(false);


  const [
    announcementsError,
    setAnnouncementsError,
  ] = useState("");


  // =========================================================
  // DETAIL
  // =========================================================

  const [
    adminAnnouncementDetail,
    setAdminAnnouncementDetail,
  ] = useState(null);


  const [
    isDetailLoading,
    setIsDetailLoading,
  ] = useState(false);


  const [
    detailError,
    setDetailError,
  ] = useState("");


  // =========================================================
  // COUNTS
  // =========================================================

  const [
    announcementCounts,
    setAnnouncementCounts,
  ] = useState({
    all: 0,
    active: 0,
    draft: 0,
    archived: 0,
  });


  const [
    isCountsLoading,
    setIsCountsLoading,
  ] = useState(false);


  // =========================================================
  // ACTION
  // =========================================================

  const [
    isActionLoading,
    setIsActionLoading,
  ] = useState(false);


  const [
    actionError,
    setActionError,
  ] = useState("");


  // =========================================================
  // LOAD ANNOUNCEMENTS
  // =========================================================

  const loadAdminAnnouncements =
    useCallback(
      async ({
        search = "",
        audience = "",
        status = "",
        page = 1,
        page_size = 12,
      } = {}) => {

        setIsAnnouncementsLoading(
          true
        );

        setAnnouncementsError("");


        try {

          const query =
            buildAdminQuery({
              search,
              audience,
              status,
              page,
              page_size,
            });


          const response =
            await request(
              `/admin/announcements/?${query}`,
              {
                method:
                  "GET",

                throwOnError:
                  true,
              }
            );


          const normalized =
            normalizeAnnouncementList(
              response
            );


          setAdminAnnouncements(
            normalized
              .announcements
          );


          setAnnouncementPagination(
            normalized
              .pagination
          );


          return normalized;

        } catch (error) {

          setAdminAnnouncements(
            []
          );


          setAnnouncementsError(
            error?.message ||
            "Unable to load announcements."
          );


          throw error;

        } finally {

          setIsAnnouncementsLoading(
            false
          );

        }

      },
      [
        request,
      ]
    );


  // =========================================================
  // LOAD COUNTS
  // =========================================================

  const loadAnnouncementCounts =
    useCallback(
      async () => {

        setIsCountsLoading(
          true
        );


        try {

          const response =
            await request(
              "/admin/announcements/counts/",
              {
                method:
                  "GET",

                throwOnError:
                  true,
              }
            );


          const data =
            normalizePayloadData(
              response
            ) || {};


          const counts = {
            all:
              Number(
                data?.all ??
                data?.total ??
                0
              ),

            active:
              Number(
                data?.active ??
                0
              ),

            draft:
              Number(
                data?.draft ??
                0
              ),

            archived:
              Number(
                data?.archived ??
                0
              ),
          };


          setAnnouncementCounts(
            counts
          );


          return counts;

        } finally {

          setIsCountsLoading(
            false
          );

        }

      },
      [
        request,
      ]
    );


  // =========================================================
  // LOAD DETAIL
  // =========================================================

  const loadAdminAnnouncementDetail =
    useCallback(
      async (
        announcementId
      ) => {

        if (!announcementId) {
          throw new Error(
            "Invalid announcement ID."
          );
        }


        setIsDetailLoading(
          true
        );

        setDetailError("");


        try {

          const response =
            await request(
              `/admin/announcements/${encodeURIComponent(
                announcementId
              )}/`,
              {
                method:
                  "GET",

                throwOnError:
                  true,
              }
            );


          const data =
            normalizePayloadData(
              response
            );


          setAdminAnnouncementDetail(
            data
          );


          return data;

        } catch (error) {

          setDetailError(
            error?.message ||
            "Unable to load announcement details."
          );


          throw error;

        } finally {

          setIsDetailLoading(
            false
          );

        }

      },
      [
        request,
      ]
    );


  const clearAdminAnnouncementDetail =
    useCallback(
      () => {

        setAdminAnnouncementDetail(
          null
        );

        setDetailError("");

      },
      []
    );


  // =========================================================
  // ARCHIVE / RESTORE
  //
  // Existing GrainRise routes are preserved.
  // =========================================================

  const updateAdminAnnouncementStatus =
    useCallback(
      async ({
        announcementId,
        status,
        reason = "",
      }) => {

        if (!announcementId) {
          throw new Error(
            "Invalid announcement ID."
          );
        }


        const normalizedStatus =
          String(
            status || ""
          )
            .trim()
            .toLowerCase();


        if (
          ![
            "active",
            "archived",
          ].includes(
            normalizedStatus
          )
        ) {
          throw new Error(
            "Invalid announcement status."
          );
        }


        setIsActionLoading(
          true
        );

        setActionError("");


        try {

          const endpoint =
            normalizedStatus ===
            "archived"
              ? `/admin/announcements/${encodeURIComponent(
                  announcementId
                )}/archive/`
              : `/admin/announcements/${encodeURIComponent(
                  announcementId
                )}/reactivate/`;


          const response =
            await request(
              endpoint,
              {
                method:
                  "POST",

                body: {
                  reason:
                    String(
                      reason || ""
                    ).trim(),
                },

                throwOnError:
                  true,
              }
            );


          return (
            normalizePayloadData(
              response
            ) || {}
          );

        } catch (error) {

          setActionError(
            error?.message ||
            "Unable to update announcement status."
          );


          throw error;

        } finally {

          setIsActionLoading(
            false
          );

        }

      },
      [
        request,
      ]
    );


  // =========================================================
  // DELETE ANNOUNCEMENT
  //
  // Backend moderation endpoint will be prepared next.
  // =========================================================

  const deleteAdminAnnouncement =
    useCallback(
      async ({
        announcementId,
        reason = "",
      }) => {

        if (!announcementId) {
          throw new Error(
            "Invalid announcement ID."
          );
        }


        const cleanReason =
          String(
            reason || ""
          ).trim();


        if (!cleanReason) {
          throw new Error(
            "Reason for deletion is required."
          );
        }


        setIsActionLoading(
          true
        );

        setActionError("");


        try {

          const response =
            await request(
              `/admin/announcements/${encodeURIComponent(
                announcementId
              )}/delete/`,
              {
                method:
                  "DELETE",

                body: {
                  reason:
                    cleanReason,
                },

                throwOnError:
                  true,
              }
            );


          return (
            normalizePayloadData(
              response
            ) || {}
          );

        } catch (error) {

          setActionError(
            error?.message ||
            "Unable to delete announcement."
          );


          throw error;

        } finally {

          setIsActionLoading(
            false
          );

        }

      },
      [
        request,
      ]
    );


  // =========================================================
  // COMMENT MODERATION
  //
  // Same behavior as Manage News:
  //
  // hide
  // restore
  // delete
  // =========================================================

  const moderateAdminComment =
    useCallback(
      async ({
        commentId,
        action,
        reason = "",
      }) => {

        if (!commentId) {
          throw new Error(
            "Invalid announcement comment ID."
          );
        }


        const normalizedAction =
          String(
            action || ""
          )
            .trim()
            .toLowerCase();


        if (
          ![
            "hide",
            "restore",
            "delete",
          ].includes(
            normalizedAction
          )
        ) {
          throw new Error(
            "Invalid comment moderation action."
          );
        }


        const cleanReason =
          String(
            reason || ""
          ).trim();


        if (
          normalizedAction !==
            "restore" &&
          !cleanReason
        ) {
          throw new Error(
            "Reason is required for this moderation action."
          );
        }


        setIsActionLoading(
          true
        );

        setActionError("");


        try {

          const response =
            await request(
              `/admin/announcements/comments/${encodeURIComponent(
                commentId
              )}/moderate/`,
              {
                method:
                  "PATCH",

                body: {
                  action:
                    normalizedAction,

                  reason:
                    cleanReason,
                },

                throwOnError:
                  true,
              }
            );


          return (
            normalizePayloadData(
              response
            ) || {}
          );

        } catch (error) {

          setActionError(
            error?.message ||
            "Unable to moderate announcement comment."
          );


          throw error;

        } finally {

          setIsActionLoading(
            false
          );

        }

      },
      [
        request,
      ]
    );


  // =========================================================
  // PENALIZE COMMENTER
  //
  // Same behavior as Manage News:
  // - reason required
  // - backend deactivates user
  // - stays inside Announcements
  // =========================================================

  const penalizeAdminCommenter =
    useCallback(
      async ({
        commentId,
        reason,
      }) => {

        if (!commentId) {
          throw new Error(
            "Invalid announcement comment ID."
          );
        }


        const cleanReason =
          String(
            reason || ""
          ).trim();


        if (!cleanReason) {
          throw new Error(
            "Reason for penalty is required."
          );
        }


        setIsActionLoading(
          true
        );

        setActionError("");


        try {

          const response =
            await request(
              `/admin/announcements/comments/${encodeURIComponent(
                commentId
              )}/penalize/`,
              {
                method:
                  "POST",

                body: {
                  reason:
                    cleanReason,
                },

                throwOnError:
                  true,
              }
            );


          return (
            normalizePayloadData(
              response
            ) || {}
          );

        } catch (error) {

          setActionError(
            error?.message ||
            "Unable to penalize this user."
          );


          throw error;

        } finally {
          setIsActionLoading(
            false
          );
        }
      },
      [
        request,
      ]
    );


  // =========================================================
  // REPLY MODERATION
  // =========================================================

  const moderateAdminReply =
    useCallback(
      async ({
        replyId,
        action,
        reason = "",
      }) => {
        if (!replyId) {
          throw new Error(
            "Invalid announcement reply ID."
          );
        }

        const normalizedAction =
          String(
            action || ""
          ).trim().toLowerCase();

        if (
          ![
            "hide",
            "restore",
            "delete",
          ].includes(
            normalizedAction
          )
        ) {
          throw new Error(
            "Reply moderation action must be hide, restore, or delete."
          );
        }

        const cleanReason =
          String(
            reason || ""
          ).trim();

        if (
          normalizedAction !==
            "restore" &&
          !cleanReason
        ) {
          throw new Error(
            "Reason is required for this moderation action."
          );
        }

        setIsActionLoading(true);
        setActionError("");

        try {
          const response =
            await request(
              `/admin/announcements/replies/${encodeURIComponent(
                replyId
              )}/moderate/`,
              {
                method: "PATCH",
                body: {
                  action: normalizedAction,
                  reason: cleanReason,
                },
                throwOnError: true,
              }
            );

          return (
            normalizePayloadData(response) || {}
          );
        } catch (error) {
          setActionError(
            error?.message ||
            "Unable to moderate announcement reply."
          );
          throw error;
        } finally {
          setIsActionLoading(false);
        }
      },
      [request]
    );


  // =========================================================
  // PENALIZE REPLY AUTHOR
  // =========================================================

  const penalizeAdminReplyAuthor =
    useCallback(
      async ({
        replyId,
        reason,
      }) => {
        if (!replyId) {
          throw new Error(
            "Invalid announcement reply ID."
          );
        }

        const cleanReason =
          String(
            reason || ""
          ).trim();

        if (!cleanReason) {
          throw new Error(
            "Reason for penalty is required."
          );
        }

        setIsActionLoading(true);
        setActionError("");

        try {
          const response =
            await request(
              `/admin/announcements/replies/${encodeURIComponent(
                replyId
              )}/penalize/`,
              {
                method: "POST",
                body: {
                  reason: cleanReason,
                },
                throwOnError: true,
              }
            );

          return (
            normalizePayloadData(response) || {}
          );
        } catch (error) {
          setActionError(
            error?.message ||
            "Unable to penalize this user."
          );
          throw error;
        } finally {
          setIsActionLoading(false);
        }
      },
      [request]
    );


  // =========================================================
  // DRAFTS
  // =========================================================

  const loadAdminDrafts =
    useCallback(
      async ({ search = "" } = {}) => {
        const params = new URLSearchParams();
        const cleanSearch = String(search || "").trim();
        if (cleanSearch) {
          params.set("search", cleanSearch);
        }

        const query = params.toString() ? `?${params.toString()}` : "";
        const response = await request(
          `/admin/announcements/drafts/${query}`,
          {
            method: "GET",
            throwOnError: true,
          }
        );

        const data = normalizePayloadData(response);
        return Array.isArray(data) ? data : data?.results || [];
      },
      [request]
    );


  // =========================================================
  // SAVE DRAFT
  // =========================================================

  const saveAdminDraft =
    useCallback(
      async ({
        announcementId = null,
        title,
        audience,
        content,
        imageUrl = "",
      }) => {
        setIsActionLoading(true);
        setActionError("");

        const path = announcementId
          ? `/admin/announcements/${encodeURIComponent(announcementId)}/save-draft/`
          : "/admin/announcements/save-draft/";

        try {
          const response = await request(path, {
            method: "POST",
            body: {
              title: title || "",
              audience: audience || "",
              content: content || "",
              image_url: imageUrl || "",
            },
            throwOnError: true,
          });

          return normalizePayloadData(response) || {};
        } catch (error) {
          setActionError(error?.message || "Unable to save announcement draft.");
          throw error;
        } finally {
          setIsActionLoading(false);
        }
      },
      [request]
    );


  // =========================================================
  // PUBLISH ANNOUNCEMENT
  // =========================================================

  const publishAdminAnnouncement =
    useCallback(
      async ({
        announcementId = null,
        title,
        audience,
        content,
        imageUrl = "",
      }) => {
        setIsActionLoading(true);
        setActionError("");

        const path = announcementId
          ? `/admin/announcements/${encodeURIComponent(announcementId)}/publish/`
          : "/admin/announcements/publish/";

        try {
          const response = await request(path, {
            method: "POST",
            body: {
              title,
              audience,
              content,
              image_url: imageUrl || "",
            },
            throwOnError: true,
          });

          return normalizePayloadData(response) || {};
        } catch (error) {
          setActionError(error?.message || "Unable to publish announcement.");
          throw error;
        } finally {
          setIsActionLoading(false);
        }
      },
      [request]
    );


  // =========================================================
  // RETURN
  // =========================================================

  return {

    // List
    adminAnnouncements,
    announcementPagination,
    isAnnouncementsLoading,
    announcementsError,
    loadAdminAnnouncements,

    // Counts
    announcementCounts,
    isCountsLoading,
    loadAnnouncementCounts,

    // Detail
    adminAnnouncementDetail,
    isDetailLoading,
    detailError,
    loadAdminAnnouncementDetail,
    clearAdminAnnouncementDetail,

    // Actions
    isActionLoading,
    actionError,

    updateAdminAnnouncementStatus,
    deleteAdminAnnouncement,
    moderateAdminComment,
    penalizeAdminCommenter,
    moderateAdminReply,
    penalizeAdminReplyAuthor,

    // Drafts / Publishing
    loadAdminDrafts,
    saveAdminDraft,
    publishAdminAnnouncement,
  };
}