import {
  useEffect,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  ExternalLink,
  Heart,
  MessageCircle,
  ShieldAlert,
  X,
} from "lucide-react";


const formatLabel = (
  value
) => {
  const text =
    String(
      value || ""
    )
      .trim()
      .replace(
        /_/g,
        " "
      );

  if (!text) {
    return "—";
  }

  return text.replace(
    /\b\w/g,
    (char) =>
      char.toUpperCase()
  );
};


const formatDateTime = (
  value
) => {
  if (!value) {
    return "—";
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

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(date);
};


const Badge = ({
  children,
  status,
}) => {
  let classes =
    "border-gray-200 bg-gray-50 text-gray-600";

  if (status === "active") {
    classes =
      "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    status === "archived" ||
    status === "hidden"
  ) {
    classes =
      "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "deleted") {
    classes =
      "border-red-200 bg-red-50 text-red-600";
  }

  return (
    <span
      className={`
        inline-flex
        rounded-full
        border
        px-2.5
        py-1
        text-[10px]
        font-semibold
        ${classes}
      `}
    >
      {children}
    </span>
  );
};


const CommentCard = ({
  comment,
  onModerate,
  onPenalty,
  isReply = false,
}) => {
  const status =
    comment?.comment_status ||
    "active";

  return (
    <div
      className={`
        rounded-xl
        border
        border-gray-200
        bg-white
        p-4

        ${
          isReply
            ? "ml-8 mt-3"
            : ""
        }
      `}
    >
      <div
        className="
          flex
          items-start
          justify-between
          gap-3
        "
      >
        <div>
          <p
            className="
              text-sm
              font-bold
              text-gray-900
            "
          >
            {
              comment?.author_name ||
              "Unknown User"
            }
          </p>

          <p
            className="
              mt-1
              text-xs
              text-gray-400
            "
          >
            {formatLabel(
              comment?.author_role
            )}

            {" • "}

            {formatDateTime(
              comment?.created_at
            )}
          </p>
        </div>

        <Badge status={status}>
          {formatLabel(status)}
        </Badge>
      </div>


      <p
        className="
          mt-3
          whitespace-pre-wrap
          text-sm
          leading-6
          text-gray-600
        "
      >
        {
          comment?.comment_text ||
          "—"
        }
      </p>


      <div
        className="
          mt-4
          flex
          flex-wrap
          gap-2
        "
      >
        {status === "active" && (
          <button
            type="button"
            onClick={() =>
              onModerate?.(
                comment,
                "hide"
              )
            }
            className="
              rounded-lg
              border
              border-amber-300
              px-3
              py-1.5
              text-xs
              font-semibold
              text-amber-700
              hover:bg-amber-50
            "
          >
            Hide
          </button>
        )}


        {status === "hidden" && (
          <button
            type="button"
            onClick={() =>
              onModerate?.(
                comment,
                "restore"
              )
            }
            className="
              rounded-lg
              border
              border-emerald-300
              px-3
              py-1.5
              text-xs
              font-semibold
              text-emerald-700
              hover:bg-emerald-50
            "
          >
            Restore
          </button>
        )}


        {status !== "deleted" && (
          <button
            type="button"
            onClick={() =>
              onModerate?.(
                comment,
                "delete"
              )
            }
            className="
              rounded-lg
              border
              border-red-300
              px-3
              py-1.5
              text-xs
              font-semibold
              text-red-600
              hover:bg-red-50
            "
          >
            Delete
          </button>
        )}


        <button
          type="button"
          disabled={
            comment?.user_status !==
            "active"
          }
          onClick={() =>
            onPenalty?.(
              comment
            )
          }
          className="
            inline-flex
            items-center
            gap-1.5
            rounded-lg
            border
            border-gray-300
            px-3
            py-1.5
            text-xs
            font-semibold
            text-gray-700
            hover:bg-gray-50
            disabled:cursor-not-allowed
            disabled:opacity-40
          "
        >
          <ShieldAlert
            size={13}
          />

          Penalize User
        </button>
      </div>


      {Array.isArray(
        comment?.replies
      ) &&
        comment.replies.map(
          (reply) => (
            <CommentCard
              key={
                reply.comment_id
              }
              comment={reply}
              onModerate={onModerate}
              onPenalty={onPenalty}
              isReply
            />
          )
        )}
    </div>
  );
};


const AdminNewsDetailsModal = ({
  open,
  data,
  loading,
  error,
  onClose,
  onArchive,
  onRestore,
  onDelete,
  onModerateComment,
  onPenalty,
}) => {

  const [
    activeTab,
    setActiveTab,
  ] = useState(
    "article"
  );


  useEffect(() => {
    if (!open) {
      return;
    }

    setActiveTab(
      "article"
    );

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };

  }, [
    open,
    data?.article?.news_id,
  ]);


  if (!open) {
    return null;
  }


  const article =
    data?.article ||
    null;

  const audiences =
    Array.isArray(
      data?.audiences
    )
      ? data.audiences
      : [];

  const reactions =
    Array.isArray(
      data?.reactions
    )
      ? data.reactions
      : [];

  const comments =
    Array.isArray(
      data?.comments
    )
      ? data.comments
      : [];


  return createPortal(
    <div
      className="
        fixed
        inset-0
        z-[9999]
        flex
        items-center
        justify-center
        bg-black/50
        p-4
      "
    >
      <div
        className="
          flex
          h-[88vh]
          w-full
          max-w-5xl
          flex-col
          overflow-hidden
          rounded-2xl
          bg-white
          shadow-2xl
        "
      >
        {/* HEADER */}

        <div
          className="
            flex
            shrink-0
            items-center
            justify-between
            border-b
            border-gray-200
            bg-white
            px-6
            py-4
          "
        >
          <div>
            <h2
              className="
                text-lg
                font-bold
                text-gray-900
              "
            >
              News Details
            </h2>

            <p
              className="
                mt-0.5
                text-xs
                text-gray-500
              "
            >
              Article, reactions, and comment moderation
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              rounded-lg
              p-2
              text-gray-400
              hover:bg-gray-100
              hover:text-gray-700
            "
          >
            <X size={19} />
          </button>
        </div>


        {/* TABS */}

        <div
          className="
            shrink-0
            border-b
            border-gray-200
            bg-white
            px-6
          "
        >
          <div
            className="
              flex
              gap-7
              overflow-x-auto
            "
          >
            {[
              {
                value: "article",
                label: "Article",
              },
              {
                value: "reactions",
                label:
                  `Reactions (${reactions.length})`,
              },
              {
                value: "comments",
                label:
                  `Comments (${article?.comment_count || 0})`,
              },
            ].map(
              (tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      tab.value
                    )
                  }
                  className={`
                    whitespace-nowrap
                    border-b-2
                    py-3
                    text-sm
                    font-semibold

                    ${
                      activeTab ===
                      tab.value
                        ? "border-[#08511f] text-[#08511f]"
                        : "border-transparent text-gray-500"
                    }
                  `}
                >
                  {tab.label}
                </button>
              )
            )}
          </div>
        </div>


        {/* ONLY MODAL BODY SCROLLS */}

        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            overscroll-contain
            bg-gray-50
            px-6
            py-5
          "
        >
          {loading ? (
            <div
              className="
                flex
                h-full
                min-h-[300px]
                items-center
                justify-center
              "
            >
              <div
                className="
                  h-9
                  w-9
                  animate-spin
                  rounded-full
                  border-4
                  border-gray-200
                  border-t-[#08511f]
                "
              />
            </div>
          ) : error ? (
            <div
              className="
                rounded-xl
                border
                border-red-200
                bg-red-50
                p-4
                text-sm
                text-red-600
              "
            >
              {error}
            </div>
          ) : !article ? (
            <div
              className="
                py-12
                text-center
                text-sm
                text-gray-500
              "
            >
              Article information is unavailable.
            </div>
          ) : (
            <>
              {/* ARTICLE */}

              {activeTab ===
                "article" && (
                <div
                  className="
                    overflow-hidden
                    rounded-2xl
                    border
                    border-gray-200
                    bg-white
                  "
                >
                  {article.image_url && (
                    <img
                      src={
                        article.image_url
                      }
                      alt={
                        article.title ||
                        "News"
                      }
                      className="
                        max-h-[320px]
                        w-full
                        object-cover
                      "
                    />
                  )}

                  <div className="p-6">
                    <div
                      className="
                        flex
                        flex-wrap
                        gap-2
                      "
                    >
                      <Badge>
                        {formatLabel(
                          article.category_code
                        )}
                      </Badge>

                      <Badge
                        status={
                          article.status
                        }
                      >
                        {formatLabel(
                          article.status
                        )}
                      </Badge>
                    </div>


                    <h3
                      className="
                        mt-4
                        text-xl
                        font-bold
                        leading-8
                        text-gray-900
                      "
                    >
                      {article.title}
                    </h3>


                    <p
                      className="
                        mt-2
                        text-xs
                        text-gray-500
                      "
                    >
                      {
                        article.source_name ||
                        "Unknown Source"
                      }

                      {" • "}

                      {formatDateTime(
                        article.published_at
                      )}
                    </p>


                    {audiences.length >
                      0 && (
                      <div
                        className="
                          mt-4
                          flex
                          flex-wrap
                          gap-2
                        "
                      >
                        {audiences.map(
                          (audience) => (
                            <Badge
                              key={
                                audience
                              }
                            >
                              {formatLabel(
                                audience
                              )}
                            </Badge>
                          )
                        )}
                      </div>
                    )}


                    {article.description && (
                      <p
                        className="
                          mt-5
                          text-sm
                          font-medium
                          leading-7
                          text-gray-700
                        "
                      >
                        {
                          article.description
                        }
                      </p>
                    )}


                    <p
                      className="
                        mt-5
                        whitespace-pre-wrap
                        text-sm
                        leading-7
                        text-gray-600
                      "
                    >
                      {
                        article.article_body ||
                        "Full article body is not stored by the current news provider."
                      }
                    </p>


                    {article.article_url && (
                      <a
                        href={
                          article.article_url
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="
                          mt-5
                          inline-flex
                          items-center
                          gap-2
                          text-sm
                          font-semibold
                          text-[#08511f]
                          hover:underline
                        "
                      >
                        Read Original Article

                        <ExternalLink
                          size={15}
                        />
                      </a>
                    )}


                    <div
                      className="
                        mt-6
                        flex
                        flex-wrap
                        gap-3
                        border-t
                        border-gray-100
                        pt-5
                      "
                    >
                      {article.status ===
                      "active" ? (
                        <button
                          type="button"
                          onClick={() =>
                            onArchive?.(
                              article
                            )
                          }
                          className="
                            rounded-lg
                            bg-orange-500
                            px-4
                            py-2
                            text-sm
                            font-semibold
                            text-white
                            hover:bg-orange-600
                          "
                        >
                          Archive
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            onRestore?.(
                              article
                            )
                          }
                          className="
                            rounded-lg
                            bg-[#08511f]
                            px-4
                            py-2
                            text-sm
                            font-semibold
                            text-white
                            hover:bg-[#063d18]
                          "
                        >
                          Restore
                        </button>
                      )}


                      <button
                        type="button"
                        onClick={() =>
                          onDelete?.(
                            article
                          )
                        }
                        className="
                          rounded-lg
                          bg-red-600
                          px-4
                          py-2
                          text-sm
                          font-semibold
                          text-white
                          hover:bg-red-700
                        "
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}


              {/* REACTIONS */}

              {activeTab ===
                "reactions" && (
                <div
                  className="
                    space-y-3
                  "
                >
                  {reactions.length ===
                  0 ? (
                    <div
                      className="
                        rounded-xl
                        border
                        border-dashed
                        border-gray-300
                        bg-white
                        p-10
                        text-center
                        text-sm
                        text-gray-500
                      "
                    >
                      No reactions yet.
                    </div>
                  ) : (
                    reactions.map(
                      (reaction) => (
                        <div
                          key={
                            reaction.reaction_id
                          }
                          className="
                            flex
                            items-center
                            justify-between
                            rounded-xl
                            border
                            border-gray-200
                            bg-white
                            p-4
                          "
                        >
                          <div>
                            <p
                              className="
                                text-sm
                                font-bold
                                text-gray-900
                              "
                            >
                              {
                                reaction.user_name
                              }
                            </p>

                            <p
                              className="
                                mt-1
                                text-xs
                                text-gray-500
                              "
                            >
                              {formatLabel(
                                reaction.user_role
                              )}

                              {" • "}

                              {formatDateTime(
                                reaction.created_at
                              )}
                            </p>
                          </div>

                          <Heart
                            size={18}
                            className="
                              fill-red-500
                              text-red-500
                            "
                          />
                        </div>
                      )
                    )
                  )}
                </div>
              )}


              {/* COMMENTS */}

              {activeTab ===
                "comments" && (
                <div
                  className="
                    space-y-4
                  "
                >
                  {comments.length ===
                  0 ? (
                    <div
                      className="
                        rounded-xl
                        border
                        border-dashed
                        border-gray-300
                        bg-white
                        p-10
                        text-center
                        text-sm
                        text-gray-500
                      "
                    >
                      <MessageCircle
                        size={28}
                        className="
                          mx-auto
                          mb-2
                          text-gray-300
                        "
                      />

                      No comments yet.
                    </div>
                  ) : (
                    comments.map(
                      (comment) => (
                        <CommentCard
                          key={
                            comment.comment_id
                          }
                          comment={comment}
                          onModerate={
                            onModerateComment
                          }
                          onPenalty={
                            onPenalty
                          }
                        />
                      )
                    )
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};


export default AdminNewsDetailsModal;