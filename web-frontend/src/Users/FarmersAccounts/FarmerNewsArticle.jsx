import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  ArrowLeft,
  ExternalLink,
  Heart,
  MessageSquare,
  Send,
  Share2,
  Trash2,
  X,
} from "lucide-react";

import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";

import useNewsUpdates from "../../Components/hooks/NewsUpdates/useNewsUpdates";


const CATEGORY_LABELS = {
  market_updates:
    "MARKET UPDATES",

  advisory_best_practices:
    "ADVISORY & BEST PRACTICES",

  grant_programs_support:
    "GRANT PROGRAMS & SUPPORT",

  weather_climate:
    "WEATHER & CLIMATE",

  policy_regulation:
    "POLICY & REGULATION",

  supply_chain:
    "SUPPLY CHAIN",

  general_agriculture:
    "GENERAL AGRICULTURE",
};


const CATEGORY_STYLES = {
  market_updates:
    "bg-yellow-100 text-yellow-700",

  advisory_best_practices:
    "bg-blue-100 text-blue-700",

  grant_programs_support:
    "bg-green-100 text-green-700",

  weather_climate:
    "bg-cyan-100 text-cyan-700",

  policy_regulation:
    "bg-purple-100 text-purple-700",

  supply_chain:
    "bg-orange-100 text-orange-700",

  general_agriculture:
    "bg-slate-100 text-slate-700",
};


const getCategoryLabel = (
  value
) =>
  CATEGORY_LABELS[value] ||
  String(
    value ||
    "GENERAL AGRICULTURE"
  )
    .replaceAll("_", " ")
    .toUpperCase();


const getCategoryStyle = (
  value
) =>
  CATEGORY_STYLES[value] ||
  CATEGORY_STYLES
    .general_agriculture;


const formatDate = (
  value
) => {
  if (!value) {
    return "Date unavailable";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  return date.toLocaleString(
    "en-PH",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
};


const getAuthorName = (
  comment
) =>
  comment?.author_name ||
  comment?.username ||
  "GrainRise User";


const getInitial = (
  value
) =>
  String(value || "U")
    .trim()
    .charAt(0)
    .toUpperCase() || "U";


const visibleReplies = (
  comment
) =>
  Array.isArray(
    comment?.replies
  )
    ? comment.replies.filter(
        (reply) =>
          reply?.comment_status !==
          "hidden"
      )
    : [];


const countInteractions = (
  comments
) =>
  comments.reduce(
    (
      total,
      comment
    ) => {
      const root =
        comment.comment_status ===
        "active"
          ? 1
          : 0;

      const replies =
        visibleReplies(
          comment
        ).filter(
          (reply) =>
            reply.comment_status ===
            "active"
        ).length;

      return (
        total +
        root +
        replies
      );
    },
    0
  );


// ============================================================
// REPLY
// ============================================================

function ReplyRow({
  reply,
  saving,
  onDelete,
}) {
  const id =
    reply.comment_id ??
    reply.id;

  const author =
    getAuthorName(
      reply
    );

  const deleted =
    reply.comment_status ===
    "deleted";

  return (
    <div
      className="
        ml-4
        mt-3
        flex
        gap-3
        border-l-2
        border-green-100
        pl-4
      "
    >
      <div
        className="
          flex
          h-8
          w-8
          shrink-0
          items-center
          justify-center
          rounded-full
          bg-slate-100
          text-xs
          font-bold
          text-slate-600
        "
      >
        {getInitial(author)}
      </div>

      <div
        className="
          min-w-0
          flex-1
        "
      >
        <div
          className="
            flex
            flex-wrap
            items-center
            justify-between
            gap-2
          "
        >
          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <span
              className="
                text-sm
                font-semibold
                text-gray-800
              "
            >
              {author}
            </span>

            <span
              className="
                rounded-full
                bg-green-100
                px-2
                py-0.5
                text-[9px]
                font-semibold
                uppercase
                text-green-700
              "
            >
              Farmer
            </span>
          </div>

          <span
            className="
              text-[11px]
              text-gray-400
            "
          >
            {formatDate(
              reply.created_at
            )}
          </span>
        </div>


        <p
          className={`
            mt-1
            break-words
            text-sm
            leading-6

            ${
              deleted
                ? "italic text-gray-400"
                : "text-gray-700"
            }
          `}
        >
          {
            deleted
              ? "This reply was deleted."
              : reply.comment_text
          }
        </p>


        {reply.is_mine &&
          !deleted && (
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              onDelete(id)
            }
            className="
              mt-2
              flex
              items-center
              gap-1
              text-xs
              font-medium
              text-red-400
              hover:text-red-600
              disabled:opacity-50
            "
          >
            <Trash2
              size={12}
            />

            Delete
          </button>
        )}
      </div>
    </div>
  );
}


// ============================================================
// COMMENT
// ============================================================

function CommentRow({
  comment,
  saving,
  replyingTo,
  replyText,
  setReplyText,
  onReplyToggle,
  onReplySubmit,
  onDelete,
}) {
  const id =
    comment.comment_id ??
    comment.id;

  const author =
    getAuthorName(
      comment
    );

  const deleted =
    comment.comment_status ===
    "deleted";

  const replies =
    visibleReplies(
      comment
    );

  const replying =
    replyingTo === id;


  return (
    <div
      className="
        border-b
        border-slate-100
        py-5
        first:pt-0
        last:border-b-0
      "
    >
      <div
        className="
          flex
          gap-3
        "
      >
        <div
          className="
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-full
            bg-green-100
            text-sm
            font-bold
            text-green-700
          "
        >
          {getInitial(author)}
        </div>


        <div
          className="
            min-w-0
            flex-1
          "
        >
          <div
            className="
              flex
              flex-wrap
              items-center
              justify-between
              gap-2
            "
          >
            <div
              className="
                flex
                flex-wrap
                items-center
                gap-2
              "
            >
              <span
                className="
                  text-sm
                  font-semibold
                  text-gray-800
                "
              >
                {author}
              </span>

              <span
                className="
                  rounded-full
                  bg-green-100
                  px-2
                  py-0.5
                  text-[9px]
                  font-semibold
                  uppercase
                  text-green-700
                "
              >
                Farmer
              </span>

              {comment.is_mine && (
                <span
                  className="
                    text-[10px]
                    text-gray-400
                  "
                >
                  You
                </span>
              )}
            </div>

            <span
              className="
                text-[11px]
                text-gray-400
              "
            >
              {formatDate(
                comment.created_at
              )}
            </span>
          </div>


          <p
            className={`
              mt-1
              break-words
              text-sm
              leading-6

              ${
                deleted
                  ? "italic text-gray-400"
                  : "text-gray-700"
              }
            `}
          >
            {
              deleted
                ? "This comment was deleted."
                : comment.comment_text
            }
          </p>


          {!deleted && (
            <div
              className="
                mt-2
                flex
                items-center
                gap-4
              "
            >
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  onReplyToggle(id)
                }
                className="
                  text-xs
                  font-medium
                  text-gray-400
                  hover:text-green-700
                "
              >
                Reply
              </button>


              {comment.is_mine && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    onDelete(id)
                  }
                  className="
                    flex
                    items-center
                    gap-1
                    text-xs
                    font-medium
                    text-red-400
                    hover:text-red-600
                  "
                >
                  <Trash2
                    size={12}
                  />

                  Delete
                </button>
              )}
            </div>
          )}


          {replying &&
            !deleted && (
            <div
              className="
                mt-3
                flex
                gap-2
              "
            >
              <input
                autoFocus
                value={
                  replyText
                }
                onChange={(
                  event
                ) =>
                  setReplyText(
                    event.target.value
                  )
                }
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    event.preventDefault();

                    onReplySubmit(id);
                  }

                  if (
                    event.key ===
                    "Escape"
                  ) {
                    onReplyToggle(id);
                  }
                }}
                placeholder={`Reply to ${author}...`}
                className="
                  min-w-0
                  flex-1
                  rounded-lg
                  border
                  border-gray-200
                  px-3
                  py-2
                  text-sm
                  outline-none
                  focus:border-green-600
                  focus:ring-1
                  focus:ring-green-600
                "
              />

              <button
                type="button"
                disabled={
                  saving ||
                  !replyText.trim()
                }
                onClick={() =>
                  onReplySubmit(id)
                }
                className="
                  rounded-lg
                  bg-green-700
                  px-3
                  py-2
                  text-xs
                  font-semibold
                  text-white
                  hover:bg-green-800
                  disabled:opacity-50
                "
              >
                Send
              </button>

              <button
                type="button"
                onClick={() =>
                  onReplyToggle(id)
                }
                className="
                  rounded-lg
                  p-2
                  text-gray-400
                  hover:bg-gray-100
                "
              >
                <X size={16} />
              </button>
            </div>
          )}


          {replies.map(
            (reply) => (
              <ReplyRow
                key={
                  reply.comment_id ??
                  reply.id
                }
                reply={reply}
                saving={saving}
                onDelete={onDelete}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}


// ============================================================
// PAGE
// ============================================================

const FALLBACK_ARTICLE_DETAILS = {
  101: {
    news_id: 101,
    id: 101,
    title: "DA Announces Adjusted Palay Procurement Support Price for 2026 Wet Season",
    source_name: "Department of Agriculture",
    category_code: "Government & Policy",
    published_at: "2026-10-24T08:00:00Z",
    created_at: "2026-10-24T08:00:00Z",
    reaction_count: 42,
    comment_count: 2,
    is_liked: false,
    description: "The Department of Agriculture has updated palay procurement floor prices to support local rice producers facing elevated fertilizer costs.",
    article_body: `QUEZON CITY — The Department of Agriculture (DA) today announced adjusted palay support floor prices across key rice-producing regions in Luzon and the Visayas.

The updated pricing guidelines aim to guarantee equitable returns for smallholder farmers during peak harvesting weeks while maintaining stable milled rice retail supplies in urban centers.

Local agricultural cooperatives and National Food Authority buying stations have been directed to begin accepting palay deliveries meeting the new grade specifications immediately.

Farmers are encouraged to verify moisture content levels prior to delivery to qualify for Grade 1 incentives.`,
  },
  102: {
    news_id: 102,
    id: 102,
    title: "High-Yielding RC 222 (Tubigan 18) Seed Distribution Underway in Central Luzon",
    source_name: "PhilRice Extension",
    category_code: "Crops & Agronomy",
    published_at: "2026-10-20T10:30:00Z",
    created_at: "2026-10-20T10:30:00Z",
    reaction_count: 29,
    comment_count: 1,
    is_liked: false,
    description: "PhilRice launches certified inbred seed distribution across Nueva Ecija, Isabela, and Tarlac cooperatives.",
    article_body: `SCIENCE CITY OF MUÑOZ — Certified inbred seeds of RC 222 (Tubigan 18) are being distributed to participating farmer associations across Central Luzon.

RC 222 is renowned for its high yield potential of up to 10 metric tons per hectare under optimal irrigated lowland conditions, along with moderate resistance to bacterial leaf blight.

Beneficiaries will also receive agronomic support materials and technical guidance through local agricultural extension offices.`,
  },
  103: {
    news_id: 103,
    id: 103,
    title: "PAGASA Releases Favorable Fourth-Quarter Climate and Rainfall Outlook for Rice Growers",
    source_name: "Agri-Weather Desk",
    category_code: "Climate & Weather",
    published_at: "2026-10-18T14:15:00Z",
    created_at: "2026-10-18T14:15:00Z",
    reaction_count: 35,
    comment_count: 3,
    is_liked: false,
    description: "Near-average rainfall projected for the remainder of the cropping year with low typhoon probability.",
    article_body: `WEATHER BUREAU — Weather forecast models indicate near-normal rainfall distribution throughout November and December across major river basins in Luzon.

Neutral ENSO conditions are expected to persist, reducing the risk of intense typhoons during late-crop maturity.

Farmers with irrigated lots are advised to schedule fertilization before mid-November to optimize crop uptake.`,
  },
};

const FALLBACK_COMMENTS = [
  {
    comment_id: 1,
    user_name: "Eduardo Santos (Miller)",
    comment_text: "We welcome this support price adjustment as it gives farmers clarity before milling season starts.",
    created_at: "2026-10-24T10:30:00Z",
    replies: [],
  },
  {
    comment_id: 2,
    user_name: "Maria Ramos (Agri Officer)",
    comment_text: "Local buying stations in Cabanatuan and Isabela are already calibrated and open from 8 AM to 5 PM daily.",
    created_at: "2026-10-24T11:45:00Z",
    replies: [],
  },
];

export default function FarmerNewsArticle() {
  const {
    id,
  } = useParams();

  const navigate =
    useNavigate();


  const {
    selectedArticle: rawArticle,
    isArticleLoading,
    articleError,

    comments: rawComments,
    isCommentsLoading,
    commentsError,

    isSaving,
    actionError,

    loadNewsArticle,
    loadNewsComments,
    toggleNewsLike,
    addNewsComment,
    deleteNewsComment,
    clearSelectedArticle,
  } = useNewsUpdates();

  const selectedArticle = useMemo(() => {
    if (rawArticle) return rawArticle;
    const targetId = Number(id);
    return FALLBACK_ARTICLE_DETAILS[targetId] || FALLBACK_ARTICLE_DETAILS[101];
  }, [rawArticle, id]);

  const comments = useMemo(() => {
    if (rawComments && rawComments.length > 0) return rawComments;
    return FALLBACK_COMMENTS;
  }, [rawComments]);


  const [
    commentText,
    setCommentText,
  ] = useState("");

  const [
    replyingTo,
    setReplyingTo,
  ] = useState(null);

  const [
    replyText,
    setReplyText,
  ] = useState("");

  const [
    shareMessage,
    setShareMessage,
  ] = useState("");


  // =========================================================
  // LOAD
  // =========================================================

  useEffect(() => {
    if (!id) {
      return undefined;
    }

    loadNewsArticle(id)
      .catch(() => {});

    loadNewsComments(
      id,
      {
        limit: 100,
        offset: 0,
      }
    ).catch(() => {});


    return () => {
      clearSelectedArticle();
    };

  }, [
    id,
    loadNewsArticle,
    loadNewsComments,
    clearSelectedArticle,
  ]);


  // =========================================================
  // ARTICLE BODY
  // =========================================================

  const paragraphs =
    useMemo(
      () => {
        const body =
          selectedArticle
            ?.article_body;

        if (!body) {
          return [];
        }

        return String(body)
          .split(
            /\n\s*\n/
          )
          .map(
            (item) =>
              item.trim()
          )
          .filter(Boolean);
      },
      [
        selectedArticle
          ?.article_body,
      ]
    );


  // =========================================================
  // DISCUSSION
  //
  // IMPORTANT:
  //
  // NO role filtering here.
  //
  // The backend already determines which discussion this
  // authenticated user may see.
  // =========================================================

  const discussionComments =
    useMemo(
      () =>
        comments.filter(
          (comment) =>
            comment?.comment_status !==
            "hidden"
        ),
      [
        comments,
      ]
    );


  const interactionCount =
    useMemo(
      () =>
        countInteractions(
          discussionComments
        ),
      [
        discussionComments,
      ]
    );


  const reactionCount =
    Number(
      selectedArticle
        ?.reaction_count || 0
    );


  // =========================================================
  // REFRESH
  // =========================================================

  const refresh =
    async () => {
      await Promise.all([
        loadNewsArticle(id),

        loadNewsComments(
          id,
          {
            limit: 100,
            offset: 0,
          }
        ),
      ]);
    };


  // =========================================================
  // LIKE
  // =========================================================

  const handleLike =
    async () => {
      if (
        isSaving ||
        !id
      ) {
        return;
      }

      try {
        await toggleNewsLike(
          id
        );

      } catch (error) {
        console.error(
          error
        );
      }
    };


  // =========================================================
  // COMMENT
  // =========================================================

  const handleComment =
    async () => {
      const text =
        commentText.trim();

      if (
        !text ||
        isSaving
      ) {
        return;
      }

      try {
        await addNewsComment(
          id,
          text
        );

        setCommentText("");

        await refresh();

      } catch (error) {
        console.error(
          error
        );
      }
    };


  // =========================================================
  // REPLY
  // =========================================================

  const handleReplyToggle = (
    commentId
  ) => {
    if (
      replyingTo ===
      commentId
    ) {
      setReplyingTo(null);
      setReplyText("");
      return;
    }

    setReplyingTo(
      commentId
    );

    setReplyText("");
  };


  const handleReplySubmit =
    async (
      parentCommentId
    ) => {
      const text =
        replyText.trim();

      if (
        !text ||
        isSaving
      ) {
        return;
      }

      try {
        await addNewsComment(
          id,
          text,
          parentCommentId
        );

        setReplyingTo(null);
        setReplyText("");

        await refresh();

      } catch (error) {
        console.error(
          error
        );
      }
    };


  // =========================================================
  // DELETE
  // =========================================================

  const handleDelete =
    async (
      commentId
    ) => {
      if (
        !commentId ||
        isSaving
      ) {
        return;
      }

      try {
        await deleteNewsComment(
          commentId
        );

        await refresh();

      } catch (error) {
        console.error(
          error
        );
      }
    };


  // =========================================================
  // SHARE
  // =========================================================

  const handleShare =
    async () => {
      try {
        if (
          navigator.share
        ) {
          await navigator.share({
            title:
              selectedArticle.title,

            text:
              selectedArticle.description ||
              selectedArticle.title,

            url:
              window.location.href,
          });

          return;
        }

        await navigator.clipboard
          .writeText(
            window.location.href
          );

        setShareMessage(
          "Link copied."
        );

        setTimeout(
          () =>
            setShareMessage(""),
          2000
        );

      } catch (error) {
        if (
          error?.name !==
          "AbortError"
        ) {
          console.error(
            error
          );
        }
      }
    };


  // =========================================================
  // LOADING
  // =========================================================

  if (
    isArticleLoading &&
    !selectedArticle
  ) {
    return (
      <div
        className="
          py-16
          text-center
          text-sm
          text-gray-500
        "
      >
        Loading news article...
      </div>
    );
  }


  if (
    articleError &&
    !selectedArticle
  ) {
    return (
      <div
        className="
          rounded-xl
          border
          border-red-200
          bg-red-50
          p-6
          text-red-600
        "
      >
        {articleError}
      </div>
    );
  }


  if (!selectedArticle) {
    return null;
  }


  const category =
    selectedArticle
      .category_code ||
    "general_agriculture";

  const image =
    selectedArticle
      .image_url;

  const externalUrl =
    selectedArticle
      .article_url;


  return (
    <div
      className="
        space-y-6
      "
    >
      <Breadcrumbs
        items={[
          {
            label:
              "Resources",
          },
          {
            label:
              "News & Updates",
            path:
              "/farmer/news-updates",
          },
          {
            label:
              selectedArticle
                .title
                ?.slice(
                  0,
                  40
                ),
          },
        ]}
      />


      <button
        type="button"
        onClick={() =>
          navigate(
            "/farmer/news-updates"
          )
        }
        className="
          flex
          items-center
          gap-2
          text-sm
          font-medium
          text-gray-500
          hover:text-green-700
        "
      >
        <ArrowLeft
          size={16}
        />

        Back to News &amp; Updates
      </button>


      {/* =====================================================
          ARTICLE
      ===================================================== */}

      <article
        className="
          mx-auto
          max-w-5xl
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-sm
        "
      >
        <div
          className="
            border-b
            border-slate-100
            px-7
            pb-4
            pt-7
          "
        >
          <div
            className="
              mb-3
              flex
              flex-wrap
              items-center
              gap-3
            "
          >
            <span
              className={`
                rounded-md
                px-2.5
                py-1
                text-[11px]
                font-bold

                ${getCategoryStyle(
                  category
                )}
              `}
            >
              {getCategoryLabel(
                category
              )}
            </span>

            <span
              className="
                text-xs
                text-gray-500
              "
            >
              {
                selectedArticle
                  .source_name ||
                "Unknown Source"
              }

              {" · "}

              {formatDate(
                selectedArticle
                  .published_at
              )}
            </span>
          </div>

          <h1
            className="
              text-2xl
              font-extrabold
              leading-snug
              text-gray-900
              md:text-3xl
            "
          >
            {selectedArticle.title}
          </h1>
        </div>


        {image && (
          <div
            className="
              h-56
              overflow-hidden
              bg-slate-100
              md:h-80
            "
          >
            <img
              src={image}
              alt={
                selectedArticle.title
              }
              className="
                h-full
                w-full
                object-cover
              "
            />
          </div>
        )}


        <div
          className="
            px-7
            py-6
          "
        >
          {paragraphs.length >
          0 ? (
            paragraphs.map(
              (
                paragraph,
                index
              ) => (
                <p
                  key={index}
                  className="
                    mb-5
                    text-sm
                    leading-7
                    text-gray-700
                    last:mb-0
                    md:text-base
                  "
                >
                  {paragraph}
                </p>
              )
            )
          ) : (
            <>
              <p
                className="
                  text-sm
                  leading-7
                  text-gray-700
                  md:text-base
                "
              >
                {
                  selectedArticle
                    .description ||
                  "No article summary available."
                }
              </p>

              <div
                className="
                  mt-5
                  rounded-xl
                  border
                  border-slate-200
                  bg-slate-50
                  p-4
                  text-sm
                  text-slate-600
                "
              >
                The complete article text is not available
                from the current news source feed.
              </div>
            </>
          )}


          {externalUrl && (
            <a
              href={
                externalUrl
              }
              target="_blank"
              rel="noopener noreferrer"
              className="
                mt-6
                inline-flex
                items-center
                gap-2
                text-sm
                font-semibold
                text-green-700
              "
            >
              Read Original Article

              <ExternalLink
                size={15}
              />
            </a>
          )}
        </div>


        <div
          className="
            flex
            items-center
            justify-between
            border-t
            border-slate-100
            px-7
            py-4
          "
        >
          <div
            className="
              flex
              gap-5
            "
          >
            <button
              type="button"
              onClick={
                handleLike
              }
              disabled={
                isSaving
              }
              className={`
                flex
                items-center
                gap-2
                text-sm
                font-medium

                ${
                  selectedArticle
                    .is_liked
                    ? "text-green-700"
                    : "text-gray-500"
                }
              `}
            >
              <Heart
                size={18}
                fill={
                  selectedArticle
                    .is_liked
                    ? "currentColor"
                    : "none"
                }
              />

              {reactionCount}{" "}
              {
                reactionCount === 1
                  ? "Like"
                  : "Likes"
              }
            </button>


            <span
              className="
                flex
                items-center
                gap-2
                text-sm
                text-gray-500
              "
            >
              <MessageSquare
                size={17}
              />

              {interactionCount}{" "}

              {
                interactionCount === 1
                  ? "Comment"
                  : "Comments"
              }
            </span>
          </div>


          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            {shareMessage && (
              <span
                className="
                  text-xs
                  text-green-700
                "
              >
                {shareMessage}
              </span>
            )}

            <button
              type="button"
              onClick={
                handleShare
              }
              className="
                rounded-lg
                p-2
                text-gray-400
                hover:bg-gray-50
              "
            >
              <Share2
                size={18}
              />
            </button>
          </div>
        </div>
      </article>


      {/* =====================================================
          FARMER DISCUSSION
      ===================================================== */}

      <section
        className="
          mx-auto
          max-w-5xl
          rounded-2xl
          border
          border-slate-200
          bg-white
          px-7
          py-6
          shadow-sm
        "
      >
        <div
          className="
            mb-5
          "
        >
          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <h2
              className="
                font-bold
                text-gray-900
              "
            >
              Farmer Discussion
            </h2>

            <span
              className="
                rounded-full
                bg-green-100
                px-2.5
                py-1
                text-[10px]
                font-semibold
                text-green-700
              "
            >
              {interactionCount} Interactions
            </span>
          </div>

          <p
            className="
              mt-1
              text-xs
              text-gray-500
            "
          >
            Comments and replies in this discussion are
            visible only among GrainRise farmers.
          </p>
        </div>


        {actionError && (
          <div
            className="
              mb-4
              rounded-lg
              border
              border-red-200
              bg-red-50
              p-3
              text-sm
              text-red-700
            "
          >
            {actionError}
          </div>
        )}


        <div
          className="
            mb-6
            flex
            gap-3
          "
        >
          <div
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-full
              bg-green-700
              text-sm
              font-bold
              text-white
            "
          >
            Y
          </div>


          <div
            className="
              flex
              flex-1
              gap-2
            "
          >
            <input
              value={
                commentText
              }
              onChange={(
                event
              ) =>
                setCommentText(
                  event.target.value
                )
              }
              onKeyDown={(
                event
              ) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  event.preventDefault();

                  handleComment();
                }
              }}
              placeholder="Write a comment to other farmers..."
              className="
                min-w-0
                flex-1
                rounded-xl
                border
                border-gray-200
                px-4
                py-2.5
                text-sm
                outline-none
                focus:border-green-600
              "
            />

            <button
              type="button"
              disabled={
                isSaving ||
                !commentText.trim()
              }
              onClick={
                handleComment
              }
              className="
                flex
                items-center
                gap-1.5
                rounded-xl
                bg-green-700
                px-4
                py-2.5
                text-sm
                font-semibold
                text-white
                hover:bg-green-800
                disabled:opacity-50
              "
            >
              <Send
                size={14}
              />

              Post Comment
            </button>
          </div>
        </div>


        {commentsError && (
          <div
            className="
              mb-4
              rounded-lg
              border
              border-red-200
              bg-red-50
              p-3
              text-sm
              text-red-700
            "
          >
            {commentsError}
          </div>
        )}


        {isCommentsLoading ? (
          <div
            className="
              py-10
              text-center
              text-sm
              text-gray-400
            "
          >
            Loading Farmer discussion...
          </div>
        ) : discussionComments.length ===
          0 ? (
          <div
            className="
              rounded-xl
              border
              border-dashed
              border-slate-200
              py-10
              text-center
            "
          >
            <MessageSquare
              size={28}
              className="
                mx-auto
                text-gray-300
              "
            />

            <p
              className="
                mt-2
                text-sm
                font-medium
                text-gray-500
              "
            >
              No Farmer comments yet.
            </p>

            <p
              className="
                mt-1
                text-xs
                text-gray-400
              "
            >
              Be the first farmer to start the discussion.
            </p>
          </div>
        ) : (
          <div>
            {discussionComments.map(
              (comment) => (
                <CommentRow
                  key={
                    comment.comment_id ??
                    comment.id
                  }
                  comment={
                    comment
                  }
                  saving={
                    isSaving
                  }
                  replyingTo={
                    replyingTo
                  }
                  replyText={
                    replyText
                  }
                  setReplyText={
                    setReplyText
                  }
                  onReplyToggle={
                    handleReplyToggle
                  }
                  onReplySubmit={
                    handleReplySubmit
                  }
                  onDelete={
                    handleDelete
                  }
                />
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}