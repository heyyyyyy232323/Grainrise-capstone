import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Megaphone, Newspaper } from "lucide-react";
import { resolveMediaUrl } from "./RichArticleContent";

// In-memory cache to prevent repeated API calls for previously shared articles
const articleMetaCache = new Map();

/**
 * Resolves the authenticated route for opening the article inside GrainRise
 * based on the recipient's current route prefix or logged-in account role.
 */
export function getAuthenticatedArticleRoute(itemType, slugOrId) {
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  let prefix = "";

  if (path.startsWith("/miller-manager")) {
    prefix = "/miller-manager";
  } else if (path.startsWith("/miller-branch-manager")) {
    prefix = "/miller-branch-manager";
  } else if (path.startsWith("/warehouse-manager")) {
    prefix = "/warehouse-manager";
  } else if (path.startsWith("/branch-manager")) {
    prefix = "/branch-manager";
  } else if (path.startsWith("/retailer")) {
    prefix = "/retailer";
  } else {
    // Fallback based on stored user profile
    try {
      const user = JSON.parse(localStorage.getItem("grainrise_user") || "{}");
      const role = String(user.user_role || user.role || "").toLowerCase();
      if (role === "retailer") prefix = "/retailer";
      else if (role === "warehouse_manager") prefix = "/warehouse-manager";
      else if (role.includes("branch")) prefix = "/miller-branch-manager";
      else prefix = "/miller-manager";
    } catch {
      prefix = "/miller-manager";
    }
  }

  const query = itemType === "announcement" ? "?type=announcement" : "";
  return `${prefix}/news-updates/${encodeURIComponent(slugOrId)}${query}`;
}

/**
 * Parses message content and attachment to detect GrainRise articles.
 */
export function parseArticleFromMessage(content = "", attachment = null) {
  let articleData = null;

  // 1. Check attachment if provided
  if (attachment) {
    if (typeof attachment === "object" && attachment.type === "article") {
      articleData = {
        itemType: attachment.item_type || attachment.type || "news",
        slugOrId: attachment.slug || attachment.id,
        title: attachment.title || "",
        category: attachment.category || attachment.cat || "",
        imageUrl: attachment.image_url || attachment.img || "",
      };
    } else if (typeof attachment === "string") {
      try {
        const parsed = JSON.parse(attachment);
        if (parsed && (parsed.type === "article" || parsed.t === "article")) {
          articleData = {
            itemType: parsed.item_type || parsed.type || "news",
            slugOrId: parsed.slug || parsed.id,
            title: parsed.title || "",
            category: parsed.category || parsed.cat || "",
            imageUrl: parsed.image_url || parsed.img || "",
          };
        }
      } catch {
        // Not a JSON attachment
      }
    }
  }

  // 2. Check for public article link in message_content
  const rawText = String(content || "");
  const linkRegex = /(?:https?:\/\/[^\s\/]+(?::\d+)?)?\/public\/(news|announcements)\/([a-zA-Z0-9_\-\.\%]+)/i;
  const match = rawText.match(linkRegex);

  if (match) {
    const rawType = match[1].toLowerCase();
    const itemType = rawType === "announcements" ? "announcement" : "news";
    const slugOrId = decodeURIComponent(match[2]);

    // Check if title is embedded like: Check out this article: "Title"
    let titleFromText = "";
    const titleMatch = rawText.match(/Check out this article:\s*"([^"\n]+)"/i);
    if (titleMatch) {
      titleFromText = titleMatch[1].trim();
    }

    if (!articleData) {
      articleData = {
        itemType,
        slugOrId,
        title: titleFromText,
        category: "",
        imageUrl: "",
      };
    } else {
      if (!articleData.title && titleFromText) articleData.title = titleFromText;
      if (!articleData.slugOrId) articleData.slugOrId = slugOrId;
      if (!articleData.itemType) articleData.itemType = itemType;
    }

    // Clean remaining accompanying text (strip link and default wrapper)
    let introText = rawText
      .replace(match[0], "")
      .replace(/Check out this article:\s*"?[^"\n]*"?\s*/gi, "")
      .trim();

    return {
      hasArticle: true,
      article: articleData,
      introText,
    };
  }

  if (articleData && articleData.slugOrId) {
    let introText = rawText.replace(/Check out this article:\s*"?[^"\n]*"?\s*/gi, "").trim();
    return {
      hasArticle: true,
      article: articleData,
      introText,
    };
  }

  return {
    hasArticle: false,
    article: null,
    introText: rawText,
  };
}

/**
 * Article Attachment Card component
 */
export default function ArticleAttachmentCard({
  article,
  isMine = false,
  onClick,
}) {
  const navigate = useNavigate();
  const [details, setDetails] = useState({
    title: article?.title || "",
    category: article?.category || "",
    imageUrl: article?.imageUrl || "",
    slugOrId: article?.slugOrId || "",
    itemType: article?.itemType || "news",
  });
  const [imgError, setImgError] = useState(false);

  const itemType = details.itemType || "news";
  const slugOrId = details.slugOrId || article?.slugOrId;
  const isAnnouncement = itemType === "announcement";

  // Fetch missing metadata (like thumbnail, category, or real title) from public article API
  useEffect(() => {
    if (!slugOrId) return;

    const cacheKey = `${itemType}-${slugOrId}`;
    if (articleMetaCache.has(cacheKey)) {
      const cached = articleMetaCache.get(cacheKey);
      setDetails((prev) => ({
        ...prev,
        ...cached,
      }));
      return;
    }

    // If metadata is already complete, cache and return
    if (details.title && details.category && details.imageUrl) {
      articleMetaCache.set(cacheKey, details);
      return;
    }

    let isMounted = true;
    const fetchMetadata = async () => {
      try {
        const endpoint =
          itemType === "announcement"
            ? `/api/admin/announcements/public/${encodeURIComponent(slugOrId)}/`
            : `/api/news/public/${encodeURIComponent(slugOrId)}/`;

        const res = await fetch(endpoint, {
          headers: { Accept: "application/json" },
        });

        if (!res.ok) return;
        const resJson = await res.json();
        const data = resJson?.data?.article || resJson?.data || {};

        const enriched = {
          title: data.title || details.title || "GrainRise Article",
          category:
            data.category ||
            (isAnnouncement ? "Announcement from the admin" : "General Agriculture"),
          imageUrl: data.image_url || details.imageUrl || "",
          slugOrId: data.slug || data.news_id || data.announcement_id || slugOrId,
          itemType,
        };

        articleMetaCache.set(cacheKey, enriched);

        if (isMounted) {
          setDetails((prev) => ({
            ...prev,
            ...enriched,
          }));
        }
      } catch (err) {
        // Fallback to existing details if fetch fails
        console.debug("Could not fetch article attachment details:", err);
      }
    };

    fetchMetadata();

    return () => {
      isMounted = false;
    };
  }, [slugOrId, itemType, details.title, details.category, details.imageUrl, isAnnouncement]);

  const handleCardClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
      return;
    }
    const targetRoute = getAuthenticatedArticleRoute(itemType, slugOrId);
    navigate(targetRoute);
  };

  const resolvedImg = resolveMediaUrl(details.imageUrl);

  return (
    <div
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick(e);
        }
      }}
      className={`mt-2 block w-full text-left rounded-xl overflow-hidden border transition-all cursor-pointer group select-none shadow-sm ${
        isMine
          ? "bg-white text-slate-800 border-emerald-600/30 hover:border-emerald-500 hover:shadow-md"
          : "bg-white text-slate-800 border-slate-200 hover:border-emerald-500 hover:shadow-md"
      }`}
    >
      <div className="flex flex-col sm:flex-row items-stretch">
        {/* Thumbnail Preview */}
        <div className="w-full sm:w-28 h-28 sm:h-auto min-h-[90px] bg-slate-100 shrink-0 relative overflow-hidden flex items-center justify-center border-b sm:border-b-0 sm:border-r border-slate-100">
          {resolvedImg && !imgError ? (
            <img
              src={resolvedImg}
              alt={details.title || "Article thumbnail"}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className={`w-full h-full flex flex-col items-center justify-center p-3 text-center ${
                isAnnouncement
                  ? "bg-amber-50 text-amber-700"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center mb-1 shadow-2xs ${
                  isAnnouncement ? "bg-amber-100" : "bg-emerald-100"
                }`}
              >
                {isAnnouncement ? <Megaphone size={18} /> : <Newspaper size={18} />}
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider opacity-75">
                {isAnnouncement ? "Notice" : "News"}
              </span>
            </div>
          )}
        </div>

        {/* Card Content */}
        <div className="p-3.5 flex flex-col justify-between flex-1 min-w-0">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span
                className={`text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  isAnnouncement
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                } truncate max-w-[200px]`}
              >
                {details.category || (isAnnouncement ? "Announcement" : "Agriculture News")}
              </span>
            </div>

            <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-[#0B5D1E] transition-colors">
              {details.title || "View Attached Article"}
            </h4>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#0B5D1E] group-hover:text-emerald-800 flex items-center gap-1">
              <span>View Article</span>
              <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </span>
            <span className="text-[9px] text-slate-400 font-medium tracking-wide">
              GrainRise Verified
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Convenience component that renders a chat bubble's content, replacing
 * any shared article link with an Article Attachment Card.
 */
export function ArticleMessageContent({
  content = "",
  attachment = null,
  isMine = false,
  className = "",
}) {
  const { hasArticle, article, introText } = parseArticleFromMessage(
    content,
    attachment
  );

  if (!hasArticle) {
    return (
      <p className={`whitespace-pre-wrap break-words ${className}`}>
        {content}
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {introText ? (
        <p className={`whitespace-pre-wrap break-words ${className}`}>
          {introText}
        </p>
      ) : null}
      <ArticleAttachmentCard article={article} isMine={isMine} />
    </div>
  );
}

