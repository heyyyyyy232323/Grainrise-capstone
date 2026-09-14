import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  FileCheck2,
  FileText,
  Gavel,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  UserRound,
} from "lucide-react";

import useMillerContractMessages from "../../../Components/hooks/Miller/useMillerContractMessages";


// ============================================================
// HELPERS
// ============================================================

function threadKey(
  thread
) {
  if (!thread) {
    return "";
  }

  return [
    thread.farmer_user_id,
    thread.reference_type,
    thread.reference_id,
  ].join(":");
}


function titleCase(
  value
) {
  return String(
    value || ""
  )
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (
        character
      ) =>
        character.toUpperCase()
    );
}


function getInitials(
  name
) {
  const words =
    String(
      name || "Farmer"
    )
      .trim()
      .split(/\s+/)
      .filter(Boolean);


  if (!words.length) {
    return "F";
  }


  if (
    words.length === 1
  ) {
    return words[0]
      .slice(
        0,
        1
      )
      .toUpperCase();
  }


  return (
    words[0][0]
    + words[
      words.length - 1
    ][0]
  ).toUpperCase();
}


function formatTimestamp(
  value
) {
  if (!value) {
    return "";
  }


  const parsed =
    new Date(
      value
    );


  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return String(
      value
    );
  }


  const today =
    new Date();


  const sameDay =
    parsed.getFullYear()
      === today.getFullYear()
    && parsed.getMonth()
      === today.getMonth()
    && parsed.getDate()
      === today.getDate();


  if (sameDay) {
    return new Intl.DateTimeFormat(
      "en-PH",
      {
        hour:
          "numeric",

        minute:
          "2-digit",
      }
    ).format(
      parsed
    );
  }


  return new Intl.DateTimeFormat(
    "en-PH",
    {
      month:
        "short",

      day:
        "numeric",
    }
  ).format(
    parsed
  );
}


function formatFullTimestamp(
  value
) {
  if (!value) {
    return "";
  }


  const parsed =
    new Date(
      value
    );


  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return String(
      value
    );
  }


  return new Intl.DateTimeFormat(
    "en-PH",
    {
      year:
        "numeric",

      month:
        "short",

      day:
        "numeric",

      hour:
        "numeric",

      minute:
        "2-digit",
    }
  ).format(
    parsed
  );
}


function referenceLabel(
  referenceType
) {
  const value =
    String(
      referenceType || ""
    ).toLowerCase();


  if (
    value === "application"
  ) {
    return "Posting Application";
  }


  if (
    value === "bidding_offer"
  ) {
    return "Bidding Offer";
  }


  if (
    value === "contract"
  ) {
    return "Current Contract";
  }


  if (
    value === "bidding"
  ) {
    return "Farmer Bidding";
  }


  if (
    value === "posting"
  ) {
    return "Procurement Posting";
  }


  return titleCase(
    value
  ) || "Reference";
}


function referenceStyles(
  referenceType
) {
  const value =
    String(
      referenceType || ""
    ).toLowerCase();


  if (
    value === "contract"
  ) {
    return (
      "bg-blue-50 text-blue-700 "
      + "border-blue-100"
    );
  }


  if (
    value === "application"
  ) {
    return (
      "bg-emerald-50 text-emerald-700 "
      + "border-emerald-100"
    );
  }


  if (
    value === "bidding_offer"
    || value === "bidding"
  ) {
    return (
      "bg-amber-50 text-amber-700 "
      + "border-amber-100"
    );
  }


  return (
    "bg-slate-50 text-slate-600 "
    + "border-slate-200"
  );
}


function ReferenceIcon({
  type,
  size = 15,
}) {
  if (
    type === "contract"
  ) {
    return (
      <FileCheck2
        size={size}
      />
    );
  }


  if (
    type === "application"
    || type === "posting"
  ) {
    return (
      <FileText
        size={size}
      />
    );
  }


  if (
    type === "bidding_offer"
    || type === "bidding"
  ) {
    return (
      <Gavel
        size={size}
      />
    );
  }


  return (
    <MessageCircle
      size={size}
    />
  );
}


// ============================================================
// THREAD ITEM
// ============================================================

function ThreadItem({
  thread,
  selected,
  onSelect,
}) {
  const unread =
    Number(
      thread.unread_count
      || 0
    );


  return (
    <button
      type="button"
      onClick={
        onSelect
      }
      className={`
        flex
        w-full
        items-start
        gap-3
        border-b
        border-slate-100
        p-4
        text-left
        transition

        ${
          selected
            ? "bg-emerald-50/70"
            : "bg-white hover:bg-slate-50"
        }
      `}
    >
      <div
        className={`
          flex
          h-10
          w-10
          shrink-0
          items-center
          justify-center
          rounded-full
          text-xs
          font-bold

          ${
            selected
              ? "bg-[#0B5D1E] text-white"
              : "bg-slate-100 text-slate-600"
          }
        `}
      >
        {getInitials(
          thread.farmer_name
        )}
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
            items-start
            justify-between
            gap-2
          "
        >
          <h4
            className="
              truncate
              text-sm
              font-semibold
              text-slate-900
            "
          >
            {thread.farmer_name
              || "Farmer"}
          </h4>


          <span
            className="
              shrink-0
              text-[10px]
              text-slate-400
            "
          >
            {formatTimestamp(
              thread.latest_message_at
            )}
          </span>
        </div>


        <p
          className="
            mt-0.5
            truncate
            text-xs
            text-slate-500
          "
        >
          {thread.farm_name
            || "Registered Farm"}
        </p>


        <div
          className="
            mt-2
            flex
            min-w-0
            items-center
            gap-1.5
          "
        >
          <span
            className={`
              inline-flex
              shrink-0
              items-center
              gap-1
              rounded-md
              border
              px-1.5
              py-0.5
              text-[9px]
              font-semibold

              ${referenceStyles(
                thread.reference_type
              )}
            `}
          >
            <ReferenceIcon
              type={
                thread.reference_type
              }
              size={10}
            />

            {referenceLabel(
              thread.reference_type
            )}
          </span>


          <span
            className="
              truncate
              text-[10px]
              font-medium
              text-slate-400
            "
          >
            {thread.reference_code
              || `#${thread.reference_id}`}
          </span>
        </div>


        <div
          className="
            mt-2
            flex
            items-center
            gap-2
          "
        >
          <p
            className={`
              min-w-0
              flex-1
              truncate
              text-xs

              ${
                unread > 0
                ? "font-semibold text-slate-700"
                : "font-normal text-slate-500"
              }
            `}
          >
            {thread.sender_type
              === "miller"
              ? "You: "
              : ""}

            {thread.latest_message
              || "No messages yet."}
          </p>


          {unread > 0
            && !selected && (
            <span
              className="
                flex
                h-5
                min-w-5
                shrink-0
                items-center
                justify-center
                rounded-full
                bg-[#0B5D1E]
                px-1.5
                text-[9px]
                font-bold
                text-white
              "
            >
              {unread > 99
                ? "99+"
                : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}


// ============================================================
// MAIN
// ============================================================

export default function MessagesTab({
  initialConversation = null,
}) {
  const {
    threads,
    activeThread,

    messages,

    isThreadsLoading,
    isMessagesLoading,
    isSending,

    threadsError,
    messagesError,
    sendError,

    loadThreads,
    selectThread,
    sendMessage,
    refreshActiveThread,

    clearSendError,
  } = useMillerContractMessages();


  const [
    search,
    setSearch,
  ] = useState("");


  const [
    inputMessage,
    setInputMessage,
  ] = useState("");


  const threadEndRef =
    useRef(null);


  const textareaRef =
    useRef(null);


  const openedTargetRef =
    useRef("");


  // ==========================================================
  // LOAD THREADS
  // ==========================================================

  useEffect(
    () => {
      const timer =
        window.setTimeout(
          () => {
            loadThreads(
              search
            ).catch(
              () => {}
            );
          },
          250
        );


      return () => {
        window.clearTimeout(
          timer
        );
      };
    },
    [
      search,
      loadThreads,
    ]
  );


  // ==========================================================
  // OPEN REQUESTED CONVERSATION
  // ==========================================================

  useEffect(
    () => {
      if (
        !initialConversation?.farmer_user_id
        || !initialConversation?.reference_type
        || !initialConversation?.reference_id
      ) {
        return;
      }


      const targetKey = [
        initialConversation.farmer_user_id,
        initialConversation.reference_type,
        initialConversation.reference_id,
      ].join(":");


      if (
        openedTargetRef.current ===
        targetKey
      ) {
        return;
      }


      openedTargetRef.current =
        targetKey;

      clearSendError();

      setInputMessage(
        ""
      );


      selectThread({
        farmer_user_id:
          initialConversation.farmer_user_id,

        farmer_name:
          initialConversation.farmer_name
          || "Farmer",

        farm_name:
          initialConversation.farm_name
          || "Registered Farm",

        reference_type:
          initialConversation.reference_type,

        reference_id:
          initialConversation.reference_id,

        reference_code:
          initialConversation.reference_code
          || null,

        unread_count:
          0,
      }).catch(
        () => {}
      );
    },
    [
      initialConversation,
      selectThread,
      clearSendError,
    ]
  );


  // ==========================================================
  // SCROLL TO LATEST
  // ==========================================================

  useEffect(
    () => {
      if (
        !activeThread
        || isMessagesLoading
      ) {
        return;
      }


      window.setTimeout(
        () => {
          threadEndRef.current
            ?.scrollIntoView({
              behavior:
                "smooth",

              block:
                "end",
            });
        },
        30
      );
    },
    [
      activeThread,
      messages,
      isMessagesLoading,
    ]
  );


  // ==========================================================
  // SELECT
  // ==========================================================

  const handleSelectThread =
    async (
      thread
    ) => {
      clearSendError();

      setInputMessage(
        ""
      );


      try {
        await selectThread(
          thread
        );

      } catch {
        // Hook exposes the visible error.
      }
    };


  // ==========================================================
  // SEND
  // ==========================================================

  const handleSend =
    async (
      event
    ) => {
      event?.preventDefault?.();


      const message =
        inputMessage.trim();


      if (
        !message
        || isSending
      ) {
        return;
      }


      try {
        await sendMessage(
          message
        );


        setInputMessage(
          ""
        );


        textareaRef.current
          ?.focus();

      } catch {
        // Error displayed by hook.
      }
    };


  const handleMessageKeyDown =
    (
      event
    ) => {
      if (
        event.key === "Enter"
        && !event.shiftKey
      ) {
        event.preventDefault();

        handleSend(
          event
        );
      }
    };


  // ==========================================================
  // ACTIVE THREAD INFO
  // ==========================================================

  const selectedReferenceLabel =
    useMemo(
      () =>
        activeThread
          ? referenceLabel(
              activeThread.reference_type
            )
          : "",
      [
        activeThread,
      ]
    );


  const activeKey =
    threadKey(
      activeThread
    );


  return (
    <div
      className="
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
          flex
          min-h-[680px]
          flex-col
          lg:h-[680px]
          lg:flex-row
        "
      >

        {/* ==================================================
            LEFT - CONVERSATION LIST
        ================================================== */}

        <aside
          className="
            flex
            max-h-[330px]
            w-full
            flex-col
            border-b
            border-slate-200
            bg-white
            lg:max-h-none
            lg:w-[360px]
            lg:shrink-0
            lg:border-b-0
            lg:border-r
          "
        >
          {/* SEARCH */}

          <div
            className="
              border-b
              border-slate-100
              p-4
            "
          >
            <div
              className="
                flex
                items-center
                gap-2
              "
            >
              <div
                className="
                  relative
                  min-w-0
                  flex-1
                "
              >
                <Search
                  size={15}
                  className="
                    absolute
                    left-3
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                  "
                />

                <input
                  type="text"
                  value={
                    search
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setSearch(
                        event.target.value
                      )
                  }
                  placeholder="Search Farmer or reference"
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    py-2.5
                    pl-9
                    pr-3
                    text-xs
                    font-normal
                    text-slate-700
                    outline-none
                    transition
                    placeholder:text-slate-400
                    focus:border-[#0B5D1E]
                    focus:ring-1
                    focus:ring-[#0B5D1E]
                  "
                />
              </div>


              <button
                type="button"
                onClick={
                  () =>
                    loadThreads(
                      search
                    ).catch(
                      () => {}
                    )
                }
                disabled={
                  isThreadsLoading
                }
                title="Refresh conversations"
                className="
                  flex
                  h-[38px]
                  w-[38px]
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  text-slate-500
                  transition
                  hover:bg-slate-50
                  hover:text-[#0B5D1E]
                  disabled:opacity-50
                "
              >
                <RefreshCw
                  size={15}
                  className={
                    isThreadsLoading
                      ? "animate-spin"
                      : ""
                  }
                />
              </button>
            </div>
          </div>


          {/* THREAD LIST */}

          <div
            className="
              flex-1
              overflow-y-auto
            "
          >
            {isThreadsLoading
              && threads.length === 0 ? (
              <div
                className="
                  flex
                  h-full
                  min-h-48
                  items-center
                  justify-center
                "
              >
                <div
                  className="
                    text-center
                  "
                >
                  <Loader2
                    size={23}
                    className="
                      mx-auto
                      animate-spin
                      text-[#0B5D1E]
                    "
                  />

                  <p
                    className="
                      mt-2
                      text-xs
                      text-slate-500
                    "
                  >
                    Loading conversations...
                  </p>
                </div>
              </div>

            ) : threadsError ? (
              <div
                className="
                  p-4
                "
              >
                <div
                  className="
                    rounded-xl
                    border
                    border-red-200
                    bg-red-50
                    px-3
                    py-3
                    text-xs
                    leading-5
                    text-red-700
                  "
                >
                  {threadsError}
                </div>
              </div>

            ) : threads.length === 0 ? (
              <div
                className="
                  flex
                  min-h-52
                  flex-col
                  items-center
                  justify-center
                  px-6
                  text-center
                "
              >
                <div
                  className="
                    flex
                    h-11
                    w-11
                    items-center
                    justify-center
                    rounded-full
                    bg-slate-100
                    text-slate-400
                  "
                >
                  <MessageCircle
                    size={20}
                  />
                </div>

                <p
                  className="
                    mt-3
                    text-sm
                    font-semibold
                    text-slate-600
                  "
                >
                  No conversations found
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    leading-5
                    text-slate-400
                  "
                >
                  Farmer messages related to applications, bidding offers, and contracts will appear here.
                </p>
              </div>

            ) : (
              threads.map(
                (
                  thread
                ) => (
                  <ThreadItem
                    key={
                      threadKey(
                        thread
                      )
                    }
                    thread={
                      thread
                    }
                    selected={
                      threadKey(
                        thread
                      ) === activeKey
                    }
                    onSelect={
                      () =>
                        handleSelectThread(
                          thread
                        )
                    }
                  />
                )
              )
            )}
          </div>
        </aside>


        {/* ==================================================
            RIGHT - CHAT
        ================================================== */}

        <main
          className="
            flex
            min-h-[500px]
            min-w-0
            flex-1
            flex-col
            bg-slate-50/50
          "
        >
          {!activeThread ? (

            /* EMPTY CONVERSATION */

            <div
              className="
                flex
                flex-1
                items-center
                justify-center
                p-8
              "
            >
              <div
                className="
                  max-w-md
                  text-center
                "
              >
                <div
                  className="
                    mx-auto
                    flex
                    h-14
                    w-14
                    items-center
                    justify-center
                    rounded-full
                    bg-emerald-50
                    text-[#0B5D1E]
                  "
                >
                  <MessageCircle
                    size={25}
                  />
                </div>


                <h3
                  className="
                    mt-4
                    text-base
                    font-bold
                    text-slate-800
                  "
                >
                  Select a conversation
                </h3>


                <p
                  className="
                    mt-2
                    text-sm
                    leading-6
                    text-slate-500
                  "
                >
                  Choose a Farmer conversation from the left to review and continue your transaction-related discussion.
                </p>
              </div>
            </div>

          ) : (
            <>
              {/* ==============================================
                  HEADER
              ============================================== */}

              <div
                className="
                  flex
                  flex-wrap
                  items-center
                  justify-between
                  gap-3
                  border-b
                  border-slate-200
                  bg-white
                  px-5
                  py-4
                "
              >
                <div
                  className="
                    flex
                    min-w-0
                    items-center
                    gap-3
                  "
                >
                  <div
                    className="
                      flex
                      h-10
                      w-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      bg-[#0B5D1E]
                      text-xs
                      font-bold
                      text-white
                    "
                  >
                    {getInitials(
                      activeThread.farmer_name
                    )}
                  </div>


                  <div
                    className="
                      min-w-0
                    "
                  >
                    <h3
                      className="
                        truncate
                        text-sm
                        font-bold
                        text-slate-900
                      "
                    >
                      {activeThread.farmer_name
                        || "Farmer"}
                    </h3>


                    <p
                      className="
                        mt-0.5
                        truncate
                        text-xs
                        text-slate-500
                      "
                    >
                      {activeThread.farm_name
                        || "Registered Farm"}
                    </p>
                  </div>
                </div>


                <button
                  type="button"
                  onClick={
                    () =>
                      refreshActiveThread()
                        .catch(
                          () => {}
                        )
                  }
                  disabled={
                    isMessagesLoading
                  }
                  className="
                    inline-flex
                    items-center
                    gap-1.5
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-3
                    py-2
                    text-xs
                    font-normal
                    text-slate-600
                    transition
                    hover:bg-slate-50
                    disabled:opacity-50
                  "
                >
                  <RefreshCw
                    size={13}
                    className={
                      isMessagesLoading
                        ? "animate-spin"
                        : ""
                    }
                  />

                  Refresh
                </button>
              </div>


              {/* ==============================================
                  TRANSACTION REFERENCE
              ============================================== */}

              <div
                className="
                  border-b
                  border-slate-200
                  bg-white
                  px-5
                  py-3
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
                    className={`
                      inline-flex
                      items-center
                      gap-1.5
                      rounded-lg
                      border
                      px-2.5
                      py-1
                      text-[10px]
                      font-semibold

                      ${referenceStyles(
                        activeThread.reference_type
                      )}
                    `}
                  >
                    <ReferenceIcon
                      type={
                        activeThread.reference_type
                      }
                      size={12}
                    />

                    {selectedReferenceLabel}
                  </span>


                  <span
                    className="
                      text-xs
                      font-semibold
                      text-slate-700
                    "
                  >
                    {activeThread.reference_code
                      || `Reference #${activeThread.reference_id}`}
                  </span>
                </div>


                <p
                  className="
                    mt-1.5
                    text-[11px]
                    text-slate-400
                  "
                >
                  This conversation is linked to this GrainRise transaction reference.
                </p>
              </div>


              {/* ==============================================
                  CHAT MESSAGES
              ============================================== */}

              <div
                className="
                  flex-1
                  overflow-y-auto
                  p-4
                  sm:p-6
                "
              >
                {isMessagesLoading ? (
                  <div
                    className="
                      flex
                      h-full
                      min-h-64
                      items-center
                      justify-center
                    "
                  >
                    <div
                      className="
                        text-center
                      "
                    >
                      <Loader2
                        size={25}
                        className="
                          mx-auto
                          animate-spin
                          text-[#0B5D1E]
                        "
                      />

                      <p
                        className="
                          mt-3
                          text-xs
                          text-slate-500
                        "
                      >
                        Loading conversation...
                      </p>
                    </div>
                  </div>

                ) : messagesError ? (
                  <div
                    className="
                      mx-auto
                      max-w-lg
                      rounded-xl
                      border
                      border-red-200
                      bg-red-50
                      px-4
                      py-3
                      text-center
                      text-sm
                      text-red-700
                    "
                  >
                    {messagesError}
                  </div>

                ) : messages.length === 0 ? (
                  <div
                    className="
                      flex
                      h-full
                      min-h-64
                      items-center
                      justify-center
                    "
                  >
                    <div
                      className="
                        max-w-sm
                        text-center
                      "
                    >
                      <UserRound
                        size={29}
                        className="
                          mx-auto
                          text-slate-300
                        "
                      />

                      <p
                        className="
                          mt-3
                          text-sm
                          font-semibold
                          text-slate-600
                        "
                      >
                        Start the conversation
                      </p>

                      <p
                        className="
                          mt-1
                          text-xs
                          leading-5
                          text-slate-400
                        "
                      >
                        Send a message about this transaction to the Farmer.
                      </p>
                    </div>
                  </div>

                ) : (
                  <div
                    className="
                      space-y-3
                    "
                  >
                    {messages.map(
                      (
                        message
                      ) => {
                        const mine =
                          message.sender_type
                          === "miller";


                        return (
                          <div
                            key={
                              message.message_id
                            }
                            className={`
                              flex
                              w-full

                              ${
                                mine
                                  ? "justify-end"
                                  : "justify-start"
                              }
                            `}
                          >
                            <div
                              className={`
                                flex
                                max-w-[86%]
                                items-end
                                gap-2
                                sm:max-w-[72%]

                                ${
                                  mine
                                    ? "flex-row-reverse"
                                    : "flex-row"
                                }
                              `}
                            >
                              {!mine && (
                                <div
                                  className="
                                    flex
                                    h-7
                                    w-7
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-full
                                    bg-slate-200
                                    text-[9px]
                                    font-bold
                                    text-slate-600
                                  "
                                >
                                  {getInitials(
                                    activeThread.farmer_name
                                  )}
                                </div>
                              )}


                              <div>
                                <div
                                  className={`
                                    rounded-2xl
                                    px-4
                                    py-3
                                    text-sm
                                    leading-6

                                    ${
                                      mine
                                        ? `
                                          rounded-br-md
                                          bg-[#0B5D1E]
                                          text-white
                                        `
                                        : `
                                          rounded-bl-md
                                          border
                                          border-slate-200
                                          bg-white
                                          text-slate-700
                                          shadow-sm
                                        `
                                    }
                                  `}
                                >
                                  <p
                                    className="
                                      whitespace-pre-wrap
                                      break-words
                                    "
                                  >
                                    {message.message_text}
                                  </p>
                                </div>


                                <p
                                  className={`
                                    mt-1
                                    text-[10px]
                                    text-slate-400

                                    ${
                                      mine
                                        ? "text-right"
                                        : "text-left"
                                    }
                                  `}
                                  title={
                                    formatFullTimestamp(
                                      message.created_at
                                    )
                                  }
                                >
                                  {formatFullTimestamp(
                                    message.created_at
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    )}


                    <div
                      ref={
                        threadEndRef
                      }
                    />
                  </div>
                )}
              </div>


              {/* ==============================================
                  SEND ERROR
              ============================================== */}

              {sendError && (
                <div
                  className="
                    border-t
                    border-red-100
                    bg-red-50
                    px-5
                    py-2.5
                    text-xs
                    text-red-700
                  "
                >
                  {sendError}
                </div>
              )}


              {/* ==============================================
                  MESSAGE COMPOSER
              ============================================== */}

              <form
                onSubmit={
                  handleSend
                }
                className="
                  border-t
                  border-slate-200
                  bg-white
                  p-4
                "
              >
                <div
                  className="
                    flex
                    items-end
                    gap-2
                  "
                >
                  <div
                    className="
                      min-w-0
                      flex-1
                    "
                  >
                    <textarea
                      ref={
                        textareaRef
                      }
                      rows={2}
                      maxLength={5000}
                      value={
                        inputMessage
                      }
                      onChange={
                        (
                          event
                        ) => {
                          setInputMessage(
                            event.target.value
                          );

                          clearSendError();
                        }
                      }
                      onKeyDown={
                        handleMessageKeyDown
                      }
                      disabled={
                        isSending
                      }
                      placeholder="Write a message to the Farmer..."
                      className="
                        max-h-32
                        min-h-[48px]
                        w-full
                        resize-none
                        rounded-xl
                        border
                        border-slate-200
                        bg-white
                        px-4
                        py-3
                        text-sm
                        leading-5
                        text-slate-700
                        outline-none
                        transition
                        placeholder:text-slate-400
                        focus:border-[#0B5D1E]
                        focus:ring-1
                        focus:ring-[#0B5D1E]
                        disabled:bg-slate-50
                      "
                    />


                    <div
                      className="
                        mt-1
                        flex
                        justify-between
                        gap-3
                        px-1
                      "
                    >
                      <p
                        className="
                          text-[10px]
                          text-slate-400
                        "
                      >
                        Enter to send • Shift + Enter for a new line
                      </p>

                      <p
                        className={`
                          text-[10px]

                          ${
                            inputMessage.length
                            > 4800
                              ? "text-red-500"
                              : "text-slate-400"
                          }
                        `}
                      >
                        {inputMessage.length}/5000
                      </p>
                    </div>
                  </div>


                  <button
                    type="submit"
                    disabled={
                      !inputMessage.trim()
                      || isSending
                    }
                    className="
                      inline-flex
                      h-12
                      shrink-0
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      bg-[#0B5D1E]
                      px-4
                      text-sm
                      font-normal
                      text-white
                      transition
                      hover:bg-[#094d19]
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                  >
                    {isSending ? (
                      <Loader2
                        size={16}
                        className="
                          animate-spin
                        "
                      />

                    ) : (
                      <Send
                        size={16}
                      />
                    )}


                    <span
                      className="
                        hidden
                        sm:inline
                      "
                    >
                      Send
                    </span>
                  </button>
                </div>
              </form>
            </>
          )}
        </main>
      </div>
    </div>
  );
}