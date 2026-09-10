import {
  useCallback,
  useState,
} from "react";

import useApi from "../useApi";


const unwrapData = (payload) => {
  if (
    payload &&
    typeof payload === "object" &&
    payload.data !== undefined
  ) {
    return payload.data;
  }

  return payload;
};


const normalizeFeed = (payload) => {
  const data =
    unwrapData(payload) || {};

  return {
    items:
      Array.isArray(data.items)
        ? data.items
        : [],

    pagination: {
      total:
        Number(data?.pagination?.total || 0),

      limit:
        Number(data?.pagination?.limit || 20),

      offset:
        Number(data?.pagination?.offset || 0),

      returned:
        Number(data?.pagination?.returned || 0),

      has_more:
        Boolean(data?.pagination?.has_more),
    },
  };
};


const normalizeArticle = (payload) => {
  const data =
    unwrapData(payload);

  if (!data) {
    return null;
  }

  if (
    data.article &&
    typeof data.article === "object"
  ) {
    return data.article;
  }

  if (data.news_id) {
    return data;
  }

  return null;
};


const normalizeComments = (payload) => {
  const outer =
    unwrapData(payload) || {};

  /*
   * Supported response shapes:
   *
   * {
   *   data: {
   *     news_id,
   *     comments: [...]
   *   }
   * }
   *
   * {
   *   data: {
   *     comments: {
   *       news_id,
   *       comments: [...]
   *     }
   *   }
   * }
   *
   * {
   *   news_id,
   *   comments: [...]
   * }
   */

  let data = outer;

  if (
    outer.comments &&
    !Array.isArray(outer.comments) &&
    typeof outer.comments === "object"
  ) {
    data = outer.comments;
  }

  let rows =
    data?.comments;

  if (
    rows &&
    !Array.isArray(rows) &&
    Array.isArray(rows.comments)
  ) {
    rows =
      rows.comments;
  }

  return {
    news_id:
      data?.news_id || null,

    user_role:
      data?.user_role || null,

    total_root_comments:
      Number(
        data?.total_root_comments || 0
      ),

    limit:
      Number(
        data?.limit || 20
      ),

    offset:
      Number(
        data?.offset || 0
      ),

    has_more:
      Boolean(
        data?.has_more
      ),

    comments:
      Array.isArray(rows)
        ? rows
        : [],
  };
};


const buildFeedQuery = ({
  search = "",
  category = "",
  year = "",
  month = "",
  sort = "latest",
  limit = 20,
  offset = 0,
} = {}) => {
  const params =
    new URLSearchParams();

  if (String(search).trim()) {
    params.set(
      "search",
      String(search).trim()
    );
  }

  if (String(category).trim()) {
    params.set(
      "category",
      String(category).trim()
    );
  }

  if (String(year).trim()) {
    params.set(
      "year",
      String(year).trim()
    );
  }

  if (String(month).trim()) {
    params.set(
      "month",
      String(month).trim()
    );
  }

  params.set(
    "sort",
    String(sort || "latest")
  );

  params.set(
    "limit",
    String(
      Math.max(
        Number(limit) || 20,
        1
      )
    )
  );

  params.set(
    "offset",
    String(
      Math.max(
        Number(offset) || 0,
        0
      )
    )
  );

  return params.toString();
};


export default function useNewsUpdates() {
  const {
    request,
  } = useApi();


  const [
    newsItems,
    setNewsItems,
  ] = useState([]);

  const [
    feedPagination,
    setFeedPagination,
  ] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    returned: 0,
    has_more: false,
  });

  const [
    isFeedLoading,
    setIsFeedLoading,
  ] = useState(false);

  const [
    feedError,
    setFeedError,
  ] = useState("");


  const [
    selectedArticle,
    setSelectedArticle,
  ] = useState(null);

  const [
    isArticleLoading,
    setIsArticleLoading,
  ] = useState(false);

  const [
    articleError,
    setArticleError,
  ] = useState("");


  const [
    comments,
    setComments,
  ] = useState([]);

  const [
    commentsPagination,
    setCommentsPagination,
  ] = useState({
    total_root_comments: 0,
    limit: 20,
    offset: 0,
    has_more: false,
  });

  const [
    discussionRole,
    setDiscussionRole,
  ] = useState(null);

  const [
    isCommentsLoading,
    setIsCommentsLoading,
  ] = useState(false);

  const [
    commentsError,
    setCommentsError,
  ] = useState("");


  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    actionError,
    setActionError,
  ] = useState("");


  // =========================================================
  // FEED
  // =========================================================

  const loadNewsFeed =
    useCallback(
      async (filters = {}) => {
        setIsFeedLoading(true);
        setFeedError("");

        try {
          const query =
            buildFeedQuery(filters);

          const payload =
            await request(
              `/news/?${query}`,
              {
                method: "GET",
                throwOnError: true,
              }
            );

          const result =
            normalizeFeed(payload);

          setNewsItems(
            result.items
          );

          setFeedPagination(
            result.pagination
          );

          return result;

        } catch (error) {
          setFeedError(
            error?.message ||
            "Unable to load News & Updates."
          );

          setNewsItems([]);

          throw error;

        } finally {
          setIsFeedLoading(false);
        }
      },
      [request]
    );


  // =========================================================
  // ARTICLE
  // =========================================================

  const loadNewsArticle =
    useCallback(
      async (newsId) => {
        if (!newsId) {
          throw new Error(
            "Invalid news article ID."
          );
        }

        setIsArticleLoading(true);
        setArticleError("");

        try {
          const payload =
            await request(
              `/news/${encodeURIComponent(
                newsId
              )}/`,
              {
                method: "GET",
                throwOnError: true,
              }
            );

          const article =
            normalizeArticle(payload);

          if (!article) {
            throw new Error(
              "News article information is unavailable."
            );
          }

          setSelectedArticle(
            article
          );

          return article;

        } catch (error) {
          setArticleError(
            error?.message ||
            "Unable to load the news article."
          );

          setSelectedArticle(null);

          throw error;

        } finally {
          setIsArticleLoading(false);
        }
      },
      [request]
    );


  // =========================================================
  // COMMENTS
  // =========================================================

  const loadNewsComments =
    useCallback(
      async (
        newsId,
        {
          limit = 20,
          offset = 0,
        } = {}
      ) => {
        if (!newsId) {
          throw new Error(
            "Invalid news article ID."
          );
        }

        setIsCommentsLoading(true);
        setCommentsError("");

        try {
          const params =
            new URLSearchParams({
              limit:
                String(
                  Math.max(
                    Number(limit) || 20,
                    1
                  )
                ),

              offset:
                String(
                  Math.max(
                    Number(offset) || 0,
                    0
                  )
                ),
            });

          const payload =
            await request(
              `/news/${encodeURIComponent(
                newsId
              )}/comments/?${params.toString()}`,
              {
                method: "GET",
                throwOnError: true,
              }
            );

          const result =
            normalizeComments(
              payload
            );

          setComments(
            result.comments
          );

          setDiscussionRole(
            result.user_role
          );

          setCommentsPagination({
            total_root_comments:
              result.total_root_comments,

            limit:
              result.limit,

            offset:
              result.offset,

            has_more:
              result.has_more,
          });

          return result;

        } catch (error) {
          setCommentsError(
            error?.message ||
            "Unable to load news comments."
          );

          setComments([]);

          throw error;

        } finally {
          setIsCommentsLoading(false);
        }
      },
      [request]
    );


  // =========================================================
  // LIKE
  // =========================================================

  const toggleNewsLike =
    useCallback(
      async (newsId) => {
        setIsSaving(true);
        setActionError("");

        try {
          const payload =
            await request(
              `/news/${encodeURIComponent(
                newsId
              )}/reaction/`,
              {
                method: "POST",
                throwOnError: true,
              }
            );

          const result =
            unwrapData(payload) || {};

          setSelectedArticle(
            (current) => {
              if (
                !current ||
                Number(current.news_id) !==
                  Number(newsId)
              ) {
                return current;
              }

              return {
                ...current,

                is_liked:
                  Boolean(
                    result.is_liked
                  ),

                reaction_count:
                  Number(
                    result.reaction_count || 0
                  ),
              };
            }
          );

          return result;

        } catch (error) {
          setActionError(
            error?.message ||
            "Unable to update reaction."
          );

          throw error;

        } finally {
          setIsSaving(false);
        }
      },
      [request]
    );


  // =========================================================
  // ADD COMMENT / REPLY
  // =========================================================

  const addNewsComment =
    useCallback(
      async (
        newsId,
        commentText,
        parentCommentId = null
      ) => {
        const text =
          String(
            commentText || ""
          ).trim();

        if (!text) {
          throw new Error(
            "Comment cannot be empty."
          );
        }

        setIsSaving(true);
        setActionError("");

        try {
          const body = {
            comment_text: text,
          };

          if (
            parentCommentId !== null &&
            parentCommentId !== undefined
          ) {
            body.parent_comment_id =
              parentCommentId;
          }

          const payload =
            await request(
              `/news/${encodeURIComponent(
                newsId
              )}/comments/`,
              {
                method: "POST",
                body,
                throwOnError: true,
              }
            );

          return (
            unwrapData(payload) || {}
          );

        } catch (error) {
          setActionError(
            error?.message ||
            "Unable to post news comment."
          );

          throw error;

        } finally {
          setIsSaving(false);
        }
      },
      [request]
    );


  // =========================================================
  // DELETE
  // =========================================================

  const deleteNewsComment =
    useCallback(
      async (commentId) => {
        setIsSaving(true);
        setActionError("");

        try {
          const payload =
            await request(
              `/news/comments/${encodeURIComponent(
                commentId
              )}/`,
              {
                method: "DELETE",
                throwOnError: true,
              }
            );

          return (
            unwrapData(payload) || {}
          );

        } catch (error) {
          setActionError(
            error?.message ||
            "Unable to delete news comment."
          );

          throw error;

        } finally {
          setIsSaving(false);
        }
      },
      [request]
    );


  // =========================================================
  // CLEAR
  // =========================================================

  const clearSelectedArticle =
    useCallback(
      () => {
        setSelectedArticle(null);
        setArticleError("");

        setComments([]);
        setCommentsError("");
        setDiscussionRole(null);

        setCommentsPagination({
          total_root_comments: 0,
          limit: 20,
          offset: 0,
          has_more: false,
        });

        setActionError("");
      },
      []
    );


  return {
    newsItems,
    feedPagination,
    isFeedLoading,
    feedError,
    loadNewsFeed,

    selectedArticle,
    isArticleLoading,
    articleError,
    loadNewsArticle,
    clearSelectedArticle,

    comments,
    commentsPagination,
    discussionRole,
    isCommentsLoading,
    commentsError,
    loadNewsComments,

    isSaving,
    actionError,
    toggleNewsLike,
    addNewsComment,
    deleteNewsComment,
  };
}