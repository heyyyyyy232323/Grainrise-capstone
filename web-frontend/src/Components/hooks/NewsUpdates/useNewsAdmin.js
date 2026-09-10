import {
  useCallback,
  useState,
} from "react";

import useApi from "../useApi";


const DEFAULT_PAGINATION = {
  page: 1,
  page_size: 12,
  total: 0,
  total_pages: 0,
};


const getErrorMessage = (
  error,
  fallback
) =>
  error?.message ||
  fallback;


const useNewsAdmin = () => {
  const {
    request,
  } = useApi();


  // =========================================================
  // SYNC
  // =========================================================

  const [
    syncStatus,
    setSyncStatus,
  ] = useState(null);

  const [
    isStatusLoading,
    setIsStatusLoading,
  ] = useState(false);

  const [
    statusError,
    setStatusError,
  ] = useState("");

  const [
    isFetchingLatest,
    setIsFetchingLatest,
  ] = useState(false);


  // =========================================================
  // ARTICLE LIST
  // =========================================================

  const [
    adminArticles,
    setAdminArticles,
  ] = useState([]);

  const [
    articlePagination,
    setArticlePagination,
  ] = useState(
    DEFAULT_PAGINATION
  );

  const [
    isArticlesLoading,
    setIsArticlesLoading,
  ] = useState(false);

  const [
    articlesError,
    setArticlesError,
  ] = useState("");


  // =========================================================
  // DETAIL
  // =========================================================

  const [
    adminArticleDetail,
    setAdminArticleDetail,
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
  // ACTION
  // =========================================================

  const [
    isActionLoading,
    setIsActionLoading,
  ] = useState(false);


  // =========================================================
  // LOAD SYNC STATUS
  // =========================================================

  const loadNewsSyncStatus =
    useCallback(
      async () => {
        setIsStatusLoading(true);
        setStatusError("");

        try {
          const response =
            await request(
              "/news/admin/status/",
              {
                method: "GET",
                throwOnError: true,
              }
            );

          const data =
            response?.data ||
            null;

          setSyncStatus(data);

          return data;

        } catch (error) {
          setStatusError(
            getErrorMessage(
              error,
              "Unable to load News synchronization status."
            )
          );

          throw error;

        } finally {
          setIsStatusLoading(false);
        }
      },
      [request]
    );


  // =========================================================
  // FETCH LATEST
  // =========================================================

  const fetchLatestNews =
    useCallback(
      async () => {
        if (isFetchingLatest) {
          return null;
        }

        setIsFetchingLatest(true);

        try {
          const response =
            await request(
              "/news/admin/fetch-latest/",
              {
                method: "POST",
                throwOnError: true,
              }
            );

          if (
            response
              ?.data
              ?.sync_status
          ) {
            setSyncStatus(
              response
                .data
                .sync_status
            );
          }

          return response;

        } finally {
          setIsFetchingLatest(false);
        }
      },
      [
        isFetchingLatest,
        request,
      ]
    );


  // =========================================================
  // LOAD ADMIN ARTICLES
  // =========================================================

  const loadAdminArticles =
    useCallback(
      async (
        filters = {}
      ) => {
        setIsArticlesLoading(true);
        setArticlesError("");

        try {
          const params =
            new URLSearchParams();

          const search =
            String(
              filters.search ||
              ""
            ).trim();

          const category =
            String(
              filters.category ||
              ""
            ).trim();

          const statusValue =
            String(
              filters.status ||
              ""
            ).trim();

          if (search) {
            params.set(
              "search",
              search
            );
          }

          if (category) {
            params.set(
              "category",
              category
            );
          }

          if (statusValue) {
            params.set(
              "status",
              statusValue
            );
          }

          params.set(
            "page",
            String(
              filters.page ||
              1
            )
          );

          params.set(
            "page_size",
            String(
              filters.page_size ||
              12
            )
          );

          const response =
            await request(
              `/news/admin/articles/?${params.toString()}`,
              {
                method: "GET",
                throwOnError: true,
              }
            );

          const data =
            response?.data ||
            {};

          setAdminArticles(
            Array.isArray(
              data.items
            )
              ? data.items
              : []
          );

          setArticlePagination({
            ...DEFAULT_PAGINATION,
            ...(
              data.pagination ||
              {}
            ),
          });

          return data;

        } catch (error) {
          setArticlesError(
            getErrorMessage(
              error,
              "Unable to load News articles."
            )
          );

          throw error;

        } finally {
          setIsArticlesLoading(false);
        }
      },
      [request]
    );


  // =========================================================
  // DETAIL
  // =========================================================

  const loadAdminArticleDetail =
    useCallback(
      async (
        newsId
      ) => {
        setIsDetailLoading(true);
        setDetailError("");

        try {
          const response =
            await request(
              `/news/admin/articles/${newsId}/`,
              {
                method: "GET",
                throwOnError: true,
              }
            );

          const data =
            response?.data ||
            null;

          setAdminArticleDetail(
            data
          );

          return data;

        } catch (error) {
          setDetailError(
            getErrorMessage(
              error,
              "Unable to load News article details."
            )
          );

          throw error;

        } finally {
          setIsDetailLoading(false);
        }
      },
      [request]
    );


  const clearAdminArticleDetail =
    useCallback(
      () => {
        setAdminArticleDetail(null);
        setDetailError("");
      },
      []
    );


  // =========================================================
  // ARTICLE STATUS
  // =========================================================

  const updateAdminArticleStatus =
    useCallback(
      async ({
        newsId,
        status,
        reason = "",
      }) => {
        setIsActionLoading(true);

        try {
          return await request(
            `/news/admin/articles/${newsId}/status/`,
            {
              method: "PATCH",

              body: {
                status,
                reason,
              },

              throwOnError: true,
            }
          );

        } finally {
          setIsActionLoading(false);
        }
      },
      [request]
    );


  // =========================================================
  // DELETE ARTICLE
  // =========================================================

  const deleteAdminArticle =
    useCallback(
      async ({
        newsId,
        reason,
      }) => {
        setIsActionLoading(true);

        try {
          return await request(
            `/news/admin/articles/${newsId}/delete/`,
            {
              method: "DELETE",

              body: {
                reason,
              },

              throwOnError: true,
            }
          );

        } finally {
          setIsActionLoading(false);
        }
      },
      [request]
    );


  // =========================================================
  // COMMENT MODERATION
  // =========================================================

  const moderateAdminComment =
    useCallback(
      async ({
        commentId,
        action,
        reason = "",
      }) => {
        setIsActionLoading(true);

        try {
          return await request(
            `/news/admin/comments/${commentId}/moderate/`,
            {
              method: "PATCH",

              body: {
                action,
                reason,
              },

              throwOnError: true,
            }
          );

        } finally {
          setIsActionLoading(false);
        }
      },
      [request]
    );


  // =========================================================
  // PENALIZE COMMENTER
  // =========================================================

  const penalizeAdminCommenter =
    useCallback(
      async ({
        commentId,
        reason,
      }) => {
        const cleanedReason =
          String(
            reason || ""
          ).trim();

        if (!cleanedReason) {
          throw new Error(
            "Reason for penalty is required."
          );
        }

        setIsActionLoading(true);

        try {
          return await request(
            `/news/admin/comments/${commentId}/penalize/`,
            {
              method: "POST",

              body: {
                reason:
                  cleanedReason,
              },

              throwOnError: true,
            }
          );

        } finally {
          setIsActionLoading(false);
        }
      },
      [request]
    );


  return {
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
  };
};


export default useNewsAdmin;