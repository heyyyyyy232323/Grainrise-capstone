import React from "react";
import DOMPurify from "dompurify";

// Configure DOMPurify hook to ensure all external links are secure
if (typeof DOMPurify.addHook === "function") {
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
}

/**
 * Sanitizes HTML content using DOMPurify with an allowed set of rich formatting tags.
 */
export function sanitizeArticleHtml(htmlContent) {
  if (!htmlContent) return "";
  const purify =
    typeof DOMPurify.sanitize === "function"
      ? DOMPurify
      : typeof window !== "undefined" && typeof DOMPurify === "function"
      ? DOMPurify(window)
      : DOMPurify;

  if (purify && typeof purify.sanitize === "function") {
    return purify.sanitize(htmlContent, {
      ALLOWED_TAGS: [
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "p",
        "b",
        "i",
        "strong",
        "em",
        "u",
        "s",
        "ul",
        "ol",
        "li",
        "a",
        "span",
        "blockquote",
        "hr",
        "br",
        "sub",
        "sup",
        "code",
        "pre",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
      ],
      ALLOWED_ATTR: ["href", "target", "rel", "class", "style", "title"],
    });
  }

  return String(htmlContent);
}

/**
 * Converts plain text or HTML into safe, standardized HTML paragraphs.
 * If the string contains HTML tags, it is directly sanitized.
 * If plain text, newlines are converted to paragraphs.
 */
export function formatContentToHtml(content) {
  if (!content) return "";
  const trimmed = String(content).trim();
  const hasHtml = /<[a-z][\s\S]*>/i.test(trimmed);

  if (hasHtml) {
    return sanitizeArticleHtml(trimmed);
  }

  // Plain-text with double newlines converted to <p>
  const paragraphs = trimmed
    .split(/\n{2,}/)
    .map((p) => `<p>${p.trim().replace(/\n/g, "<br/>")}</p>`)
    .join("");

  return sanitizeArticleHtml(paragraphs);
}

/**
 * Extracts a clean, plain-text excerpt without any HTML tags for listing cards.
 */
export function stripHtmlToExcerpt(content, maxLength = null) {
  if (!content) return "";
  let text = String(content)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?[^>]+(>|$)/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();

  if (maxLength && text.length > maxLength) {
    return text.slice(0, maxLength).trim() + "...";
  }
  return text;
}

/**
 * Resolves media paths or URLs to valid displayable URLs.
 * Handles relative media paths, full URLs, data URIs, and local dev environments.
 */
export function resolveMediaUrl(imagePath) {
  if (!imagePath || typeof imagePath !== "string") return null;
  const trimmed = imagePath.trim();
  if (
    !trimmed ||
    trimmed === "null" ||
    trimmed === "undefined" ||
    trimmed === "None"
  ) {
    return null;
  }

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  const envBase = (
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_API_BASE_URL) ||
    ""
  )
    .trim()
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");

  let clean = trimmed.replace(/^\/+/, "");
  if (!clean.startsWith("media/")) {
    clean = `media/${clean}`;
  }

  const mediaPath = `/${clean}`;
  return envBase ? `${envBase}${mediaPath}` : mediaPath;
}

/**
 * Converts a title to a clean, URL-friendly slug.
 */
export function slugifyTitle(title) {
  if (!title || typeof title !== "string") return "";
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * RichArticleContent Component
 * Renders sanitized rich article HTML with consistent, accessible GrainRise typography.
 */
export default function RichArticleContent({
  content,
  className = "",
  fallbackText = "No content available.",
}) {
  if (!content) {
    return (
      <p className="text-sm text-gray-400 italic py-2">{fallbackText}</p>
    );
  }

  const safeHtml = formatContentToHtml(content);

  return (
    <div
      className={`
        rich-article-content
        text-slate-700
        text-sm sm:text-base
        leading-relaxed
        space-y-4
        [&_h1]:text-2xl sm:[&_h1]:text-3xl [&_h1]:font-extrabold [&_h1]:text-slate-900 [&_h1]:tracking-tight [&_h1]:mt-8 [&_h1]:mb-3
        [&_h2]:text-xl sm:[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:tracking-tight [&_h2]:mt-7 [&_h2]:mb-2.5
        [&_h3]:text-lg sm:[&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-slate-800 [&_h3]:mt-6 [&_h3]:mb-2
        [&_h4]:text-base sm:[&_h4]:text-lg [&_h4]:font-semibold [&_h4]:text-slate-800 [&_h4]:mt-4 [&_h4]:mb-1.5
        [&_h5]:text-sm sm:[&_h5]:text-base [&_h5]:font-semibold [&_h5]:text-slate-800 [&_h5]:mt-3 [&_h5]:mb-1
        [&_p]:text-slate-700 [&_p]:leading-relaxed [&_p]:mb-4
        [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-4 [&_ul]:space-y-2 [&_ul]:text-slate-700
        [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-4 [&_ol]:space-y-2 [&_ol]:text-slate-700
        [&_li]:text-slate-700 [&_li]:leading-relaxed [&_li]:pl-1
        [&_strong]:font-bold [&_strong]:text-slate-900
        [&_b]:font-bold [&_b]:text-slate-900
        [&_em]:italic
        [&_i]:italic
        [&_u]:underline
        [&_a]:text-[#08511f] [&_a]:underline [&_a]:font-medium hover:[&_a]:text-[#063f18]
        [&_blockquote]:border-l-4 [&_blockquote]:border-emerald-600 [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_blockquote]:my-5 [&_blockquote]:bg-slate-50/50 [&_blockquote]:rounded-r-lg
        [&_hr]:my-6 [&_hr]:border-slate-200
        [&_pre]:bg-slate-900 [&_pre]:text-slate-100 [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:my-4 [&_pre]:text-xs
        [&_code]:bg-slate-100 [&_code]:text-emerald-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
        [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_table]:text-xs sm:[&_table]:text-sm
        [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:p-2.5 [&_th]:text-left [&_th]:font-bold [&_th]:text-slate-900
        [&_td]:border [&_td]:border-slate-200 [&_td]:p-2.5 [&_td]:text-slate-700
        ${className}
      `}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}

