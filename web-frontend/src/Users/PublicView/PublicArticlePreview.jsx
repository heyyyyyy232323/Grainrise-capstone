import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import {
  Heart,
  Share2,
  MessageSquare,
  Home,
  LogIn,
  ArrowLeft,
  Megaphone,
  Newspaper,
} from "lucide-react";
import ShareArticleModal from "../../Components/Modals/NewsUpdates/ShareArticleModal";
import RichArticleContent, {
  resolveMediaUrl,
} from "../../Components/Minor-Components/RichArticleContent";
import grainriseLogo from "../../assets/Logo.png";
import useApi from "../../Components/hooks/useApi";

export default function PublicArticlePreview() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { request } = useApi();

  const isAnnouncement = location.pathname.includes("/public/announcements");
  const itemType = isAnnouncement ? "announcement" : "news";

  const [article, setArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchPublicArticle = async () => {
      setIsLoading(true);
      setError(null);
      setImageError(false);
      try {
        const endpoint = isAnnouncement
          ? `/announcements/public/${id}/`
          : `/news/public/${id}/`;

        const res = await request(endpoint, {
          method: "GET",
        });

        if (res && res.data) {
          const data = res.data.article || res.data || {};
          const articleSlug = data.slug || id;
          if (data.slug && id !== data.slug && /^\d+$/.test(String(id))) {
            window.history.replaceState(
              null,
              "",
              `/public/${isAnnouncement ? "announcements" : "news"}/${data.slug}`
            );
          }
          setArticle({
            id: data.news_id || data.announcement_id || id,
            slug: articleSlug,
            item_type: itemType,
            title: data.title || "Untitled Article",
            description: data.description || "",
            content: data.article_body || data.content || data.description || "",
            image_url: data.image_url || "",
            category:
              data.category ||
              (isAnnouncement
                ? "Announcement from the admin"
                : "General Agriculture"),
            category_code:
              data.category_code ||
              (isAnnouncement ? "announcement_admin" : "general_agriculture"),
            source: data.source_name || "GrainRise",
            date:
              data.published_at || data.date_published || data.created_at || "",
            likes: data.reaction_count || 0,
            comments: data.comment_count || 0,
          });
        } else {
          throw new Error(res?.error || "Article could not be loaded or is unavailable.");
        }
      } catch (err) {
        setError(err?.message || "Failed to load public article.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPublicArticle();
  }, [id, isAnnouncement, itemType, request]);

  const handleLikeClick = () => {
    const token =
      localStorage.getItem("grainrise_token") ||
      localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
      return;
    }
    alert("To interact with this article, please view it from your GrainRise dashboard.");
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* ── Top Header ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
        <div className="w-full max-w-[94vw] lg:max-w-[1100px] mx-auto px-3 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src={grainriseLogo}
              alt="GrainRise Logo"
              className="h-8 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <span className="text-xl font-black tracking-tight text-slate-900 group-hover:text-emerald-700 transition">
              Grain<span className="text-emerald-600">Rise</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <Home size={14} />
              <span>Home</span>
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#08511f] text-xs font-bold text-white hover:bg-[#063f18] transition shadow-xs"
            >
              <LogIn size={14} />
              <span>Sign In</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Article Container ────────────────────────────── */}
      <main className="flex-1 w-full max-w-[94vw] lg:max-w-[1100px] mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10">
        {isLoading ? (
          <div className="p-16 text-center space-y-3">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-r-transparent" />
            <p className="text-sm font-semibold text-slate-500">Loading article...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Article Unavailable</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">{error}</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
            >
              <ArrowLeft size={14} />
              <span>Back to GrainRise</span>
            </Link>
          </div>
        ) : article ? (
          <article className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            {/* Header / Meta */}
            <div className="p-6 sm:p-10 lg:p-12 border-b border-slate-100 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {article.category}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {article.source} &nbsp;·&nbsp; {formatDate(article.date)}
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {article.title}
              </h1>
            </div>

            {/* Featured Image or Placeholder */}
            {(() => {
              const resolvedImageUrl = resolveMediaUrl(article.image_url);
              if (resolvedImageUrl && !imageError) {
                return (
                  <div className="w-full bg-slate-950/5 flex items-center justify-center border-b border-slate-100 overflow-hidden py-3 sm:py-6 px-4">
                    <img
                      src={resolvedImageUrl}
                      alt={article.title}
                      className="max-h-[560px] w-auto max-w-full h-auto object-contain rounded-2xl shadow-xs"
                      onError={() => setImageError(true)}
                    />
                  </div>
                );
              }
              return (
                <div className="w-full py-8 sm:py-14 bg-gradient-to-br from-amber-50/60 via-slate-50 to-emerald-50/30 border-b border-slate-100 flex flex-col items-center justify-center text-center px-4 select-none">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-2xs ${
                    isAnnouncement ? "bg-amber-100/90 text-amber-800 border border-amber-200" : "bg-emerald-100/90 text-emerald-800 border border-emerald-200"
                  }`}>
                    {isAnnouncement ? <Megaphone size={26} /> : <Newspaper size={26} />}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {isAnnouncement ? "Official GrainRise Announcement" : "GrainRise Agriculture News"}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    Verified public supply chain release
                  </span>
                </div>
              );
            })()}

            {/* Body */}
            <div className="p-6 sm:p-10 lg:p-12">
              <RichArticleContent content={article.content || article.description} />
            </div>

            {/* Action Bar */}
            <div className="px-6 sm:px-10 lg:px-12 py-5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button
                  type="button"
                  onClick={handleLikeClick}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-700 transition cursor-pointer"
                  title="Click to like (requires sign in)"
                >
                  <Heart size={18} />
                  <span>{article.likes} Likes</span>
                </button>

                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <MessageSquare size={18} />
                  <span>{article.comments} Comments</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsShareOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer shadow-2xs"
              >
                <Share2 size={15} />
                <span>Share</span>
              </button>
            </div>

            {/* Public Outsider Notice */}
            <div className="p-6 sm:p-8 lg:p-10 bg-emerald-50/50 border-t border-emerald-100/60 text-center space-y-2">
              <h4 className="text-sm font-bold text-emerald-950">
                Want to join the conversation?
              </h4>
              <p className="text-xs text-emerald-800 max-w-md mx-auto">
                Sign in with your verified GrainRise account to like, comment, and collaborate with Philippine grain supply chain stakeholders.
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#08511f] text-white rounded-xl text-xs font-bold hover:bg-[#063f18] transition shadow-xs"
                >
                  <LogIn size={13} />
                  <span>Sign In to Comment</span>
                </Link>
              </div>
            </div>
          </article>
        ) : null}
      </main>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} GrainRise Platform. All rights reserved.
      </footer>

      {/* Share Modal */}
      {article && (
        <ShareArticleModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          article={article}
        />
      )}
    </div>
  );
}
