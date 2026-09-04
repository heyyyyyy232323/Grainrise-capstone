import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Loader2,
  MessageCircle,
  Search,
  Send,
} from "lucide-react";

import useFarmerContracts
  from "../../Components/hooks/Farmer/useFarmerContracts";

import ProfanityBlockModal
  from "../../Components/Modals/ProfanityBlockModal";


// ============================================================
// HELPERS
// ============================================================

function formatReferenceType(value) {
  const labels = {
    posting: "Posting / Opportunity",
    application: "Posting Application",
    bidding: "Open Bidding",
    bidding_offer: "Bidding Offer",
    contract: "Current Contract",
  };

  return (
    labels[value]
    || value
    || "Reference"
  );
}


function formatDateTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
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
}


function formatMessageTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toLocaleTimeString(
    "en-PH",
    {
      hour: "numeric",
      minute: "2-digit",
    }
  );
}


function formatMessageDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const today = new Date();

  const yesterday = new Date();
  yesterday.setDate(
    today.getDate() - 1
  );

  const sameDate = (
    first,
    second
  ) => (
    first.getFullYear()
      === second.getFullYear()
    &&
    first.getMonth()
      === second.getMonth()
    &&
    first.getDate()
      === second.getDate()
  );


  if (
    sameDate(
      date,
      today
    )
  ) {
    return "Today";
  }


  if (
    sameDate(
      date,
      yesterday
    )
  ) {
    return "Yesterday";
  }


  return date.toLocaleDateString(
    "en-PH",
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  );
}


function getThreadName(thread) {
  return (
    thread?.miller_business_name
    || thread?.business_name
    || thread?.miller_name
    || "Miller"
  );
}


function getThreadSecondaryName(thread) {
  const businessName = (
    thread?.miller_business_name
    || thread?.business_name
    || ""
  );

  const millerName = (
    thread?.miller_name
    || ""
  );

  if (
    businessName
    && millerName
    && businessName !== millerName
  ) {
    return millerName;
  }

  return (
    thread?.miller_organization_name
    || thread?.organization_name
    || ""
  );
}


// ============================================================
// COMPONENT
// ============================================================

export default function FarmerContractsMessages() {
  const {
    messageThreads,
    messages,

    selectedMessageThread,

    isLoadingMessages,
    isSaving,

    error,

    profanityBlock,

    loadMessageThreads,
    selectMessageThread,
    sendMessage,

    clearProfanityBlock,
  } = useFarmerContracts();


  const [
    search,
    setSearch,
  ] = useState("");


  const [
    messageText,
    setMessageText,
  ] = useState("");


  const messagesEndRef = useRef(
    null
  );


  // ==========================================================
  // LOAD THREADS
  // ==========================================================

  useEffect(
    () => {
      loadMessageThreads();
    },
    [
      loadMessageThreads,
    ]
  );


  // ==========================================================
  // AUTO SELECT FIRST THREAD
  // ==========================================================

  useEffect(
    () => {
      if (
        selectedMessageThread
        || messageThreads.length === 0
      ) {
        return;
      }


      selectMessageThread(
        messageThreads[0]
      );
    },
    [
      messageThreads,
      selectedMessageThread,
      selectMessageThread,
    ]
  );


  // ==========================================================
  // SCROLL TO NEWEST MESSAGE
  // ==========================================================

  useEffect(
    () => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    },
    [
      messages,
    ]
  );


  // ==========================================================
  // FILTER THREADS
  // ==========================================================

  const filteredThreads = useMemo(
    () => {
      const keyword = (
        search
        .trim()
        .toLowerCase()
      );


      if (!keyword) {
        return messageThreads;
      }


      return messageThreads.filter(
        (thread) => {
          const searchable = [
            thread.miller_name,
            thread.miller_business_name,
            thread.business_name,
            thread.miller_organization_name,
            thread.organization_name,
            thread.reference_code,
            thread.reference_type,
            thread.latest_message,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();


          return searchable.includes(
            keyword
          );
        }
      );
    },
    [
      messageThreads,
      search,
    ]
  );


  // ==========================================================
  // SELECT THREAD
  // ==========================================================

  const handleSelectThread = async (
    thread
  ) => {
    if (!thread) {
      return;
    }


    const isSameThread = (
      selectedMessageThread
      &&
      Number(
        selectedMessageThread
          .supplier_profile_id
      )
        ===
      Number(
        thread.supplier_profile_id
      )
      &&
      selectedMessageThread
        .reference_type
        ===
      thread.reference_type
      &&
      Number(
        selectedMessageThread
          .reference_id
      )
        ===
      Number(
        thread.reference_id
      )
    );


    if (isSameThread) {
      return;
    }


    setMessageText("");


    await selectMessageThread(
      thread
    );
  };


  // ==========================================================
  // SEND
  // ==========================================================

  const handleSend = async () => {
    const cleanedMessage = (
      messageText.trim()
    );


    if (
      !cleanedMessage
      || !selectedMessageThread
      || isSaving
    ) {
      return;
    }


    const result = await sendMessage({
      supplierProfileId:
        selectedMessageThread
          .supplier_profile_id,

      referenceType:
        selectedMessageThread
          .reference_type,

      referenceId:
        selectedMessageThread
          .reference_id,

      messageText:
        cleanedMessage,
    });


    // ========================================================
    // PROFANITY
    //
    // DO NOT clear message.
    // User must be able to edit the attempted text.
    // ========================================================

    if (
      result?.code ===
      "PROFANITY_DETECTED"
    ) {
      return;
    }


    if (
      result?.success !== false
      && result
    ) {
      setMessageText("");
    }
  };


  // ==========================================================
  // ENTER TO SEND
  // SHIFT + ENTER = NEW LINE
  // ==========================================================

  const handleMessageKeyDown = (
    event
  ) => {
    if (
      event.key === "Enter"
      && !event.shiftKey
    ) {
      event.preventDefault();

      handleSend();
    }
  };


  // ==========================================================
  // DATE SEPARATORS
  // ==========================================================

  const renderedMessages = useMemo(
    () => {
      let previousDate = "";


      return messages.map(
        (message) => {
          const currentDate = (
            message.created_at
              ? new Date(
                  message.created_at
                ).toDateString()
              : ""
          );


          const showDateSeparator = (
            currentDate
            &&
            currentDate !== previousDate
          );


          previousDate = (
            currentDate
          );


          return {
            ...message,
            showDateSeparator,
          };
        }
      );
    },
    [
      messages,
    ]
  );


  const selectedName = (
    getThreadName(
      selectedMessageThread
    )
  );


  const selectedSecondaryName = (
    getThreadSecondaryName(
      selectedMessageThread
    )
  );


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      <div className="space-y-5">

        {/* ================================================= */}
        {/* PAGE HEADER */}
        {/* ================================================= */}

        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Messages
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Communicate with millers regarding your
            applications, offers, opportunities, and
            current contracts.
          </p>
        </div>


        {/* ================================================= */}
        {/* ERROR */}
        {/* ================================================= */}

        {error && (
          <div
            className="
              rounded-xl
              border border-red-200
              bg-red-50
              px-4 py-3
              text-sm
              text-red-700
            "
          >
            {error}
          </div>
        )}


        {/* ================================================= */}
        {/* CHAT CONTAINER */}
        {/* ================================================= */}

        <div
          className="
            grid
            min-h-[650px]
            overflow-hidden
            rounded-2xl
            border border-gray-200
            bg-white
            shadow-sm
            lg:grid-cols-[340px_minmax(0,1fr)]
          "
        >

          {/* =============================================== */}
          {/* CONVERSATION SIDEBAR */}
          {/* =============================================== */}

          <aside
            className="
              flex
              min-h-[650px]
              flex-col
              border-b border-gray-200
              lg:border-b-0
              lg:border-r
            "
          >

            {/* SEARCH */}

            <div
              className="
                border-b border-gray-100
                p-4
              "
            >
              <div className="relative">
                <Search
                  size={18}
                  className="
                    absolute
                    left-3
                    top-1/2
                    -translate-y-1/2
                    text-gray-400
                  "
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search conversations"
                  className="
                    w-full
                    rounded-xl
                    border border-gray-200
                    bg-gray-50
                    py-2.5
                    pl-10
                    pr-3
                    text-sm
                    text-gray-800
                    outline-none
                    transition
                    placeholder:text-gray-400
                    focus:border-[#2F6B3B]
                    focus:bg-white
                    focus:ring-2
                    focus:ring-green-100
                  "
                />
              </div>
            </div>


            {/* THREAD LIST */}

            <div
              className="
                min-h-0
                flex-1
                overflow-y-auto
              "
            >
              {(
                isLoadingMessages
                &&
                messageThreads.length === 0
              ) ? (
                <div
                  className="
                    flex
                    h-full
                    min-h-[300px]
                    items-center
                    justify-center
                  "
                >
                  <Loader2
                    size={24}
                    className="
                      animate-spin
                      text-[#2F6B3B]
                    "
                  />
                </div>
              ) : filteredThreads.length === 0 ? (
                <div
                  className="
                    flex
                    min-h-[300px]
                    flex-col
                    items-center
                    justify-center
                    px-6
                    text-center
                  "
                >
                  <div
                    className="
                      mb-3
                      flex h-12 w-12
                      items-center
                      justify-center
                      rounded-full
                      bg-green-50
                    "
                  >
                    <MessageCircle
                      size={23}
                      className="text-[#2F6B3B]"
                    />
                  </div>

                  <p
                    className="
                      text-sm font-semibold
                      text-gray-700
                    "
                  >
                    No conversations found
                  </p>

                  <p
                    className="
                      mt-1
                      max-w-[220px]
                      text-xs
                      leading-5
                      text-gray-500
                    "
                  >
                    Your contract-related conversations
                    with millers will appear here.
                  </p>
                </div>
              ) : (
                filteredThreads.map(
                  (thread) => {
                    const active = (
                      selectedMessageThread
                      &&
                      Number(
                        selectedMessageThread
                          .supplier_profile_id
                      )
                        ===
                      Number(
                        thread
                          .supplier_profile_id
                      )
                      &&
                      selectedMessageThread
                        .reference_type
                        ===
                      thread.reference_type
                      &&
                      Number(
                        selectedMessageThread
                          .reference_id
                      )
                        ===
                      Number(
                        thread.reference_id
                      )
                    );


                    const unreadCount = (
                      Number(
                        thread.unread_count
                        || 0
                      )
                    );


                    return (
                      <button
                        key={[
                          thread.supplier_profile_id,
                          thread.reference_type,
                          thread.reference_id,
                        ].join("-")}
                        type="button"
                        onClick={() =>
                          handleSelectThread(
                            thread
                          )
                        }
                        className={`
                          w-full
                          border-b border-gray-100
                          px-4 py-4
                          text-left
                          transition
                          ${
                            active
                              ? "bg-green-50"
                              : "bg-white hover:bg-gray-50"
                          }
                        `}
                      >
                        <div
                          className="
                            flex
                            items-start
                            gap-3
                          "
                        >
                          <div
                            className="
                              flex h-10 w-10
                              shrink-0
                              items-center
                              justify-center
                              rounded-full
                              bg-[#2F6B3B]
                              text-sm
                              font-bold
                              text-white
                            "
                          >
                            {getThreadName(
                              thread
                            )
                              .charAt(0)
                              .toUpperCase()}
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
                              <div className="min-w-0">
                                <p
                                  className="
                                    truncate
                                    text-sm
                                    font-semibold
                                    text-gray-900
                                  "
                                >
                                  {getThreadName(
                                    thread
                                  )}
                                </p>

                                {getThreadSecondaryName(
                                  thread
                                ) && (
                                  <p
                                    className="
                                      mt-0.5
                                      truncate
                                      text-xs
                                      text-gray-500
                                    "
                                  >
                                    {getThreadSecondaryName(
                                      thread
                                    )}
                                  </p>
                                )}
                              </div>


                              {unreadCount > 0 && (
                                <span
                                  className="
                                    flex
                                    min-w-5
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-full
                                    bg-[#2F6B3B]
                                    px-1.5
                                    py-0.5
                                    text-[11px]
                                    font-semibold
                                    text-white
                                  "
                                >
                                  {unreadCount > 99
                                    ? "99+"
                                    : unreadCount}
                                </span>
                              )}
                            </div>


                            <div
                              className="
                                mt-2
                                flex
                                items-center
                                gap-1.5
                              "
                            >
                              <span
                                className="
                                  rounded-md
                                  bg-gray-100
                                  px-2 py-0.5
                                  text-[10px]
                                  font-medium
                                  text-gray-600
                                "
                              >
                                {formatReferenceType(
                                  thread.reference_type
                                )}
                              </span>

                              <span
                                className="
                                  truncate
                                  text-[11px]
                                  text-gray-500
                                "
                              >
                                {thread.reference_code
                                  || `#${thread.reference_id}`}
                              </span>
                            </div>


                            <p
                              className={`
                                mt-2
                                truncate
                                text-xs
                                ${
                                  unreadCount > 0
                                    ? "font-semibold text-gray-800"
                                    : "text-gray-500"
                                }
                              `}
                            >
                              {thread.sender_type ===
                              "farmer"
                                ? "You: "
                                : ""}

                              {thread.latest_message
                                || "No message"}
                            </p>


                            <p
                              className="
                                mt-1
                                text-[11px]
                                text-gray-400
                              "
                            >
                              {formatDateTime(
                                thread.latest_message_at
                              )}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  }
                )
              )}
            </div>
          </aside>


          {/* =============================================== */}
          {/* SELECTED CHAT */}
          {/* =============================================== */}

          <section
            className="
              flex
              min-h-[650px]
              min-w-0
              flex-col
            "
          >
            {!selectedMessageThread ? (

              /* =========================================== */
              /* NO CHAT SELECTED */
              /* =========================================== */

              <div
                className="
                  flex
                  flex-1
                  flex-col
                  items-center
                  justify-center
                  px-6
                  text-center
                "
              >
                <div
                  className="
                    mb-4
                    flex h-16 w-16
                    items-center
                    justify-center
                    rounded-full
                    bg-green-50
                  "
                >
                  <MessageCircle
                    size={30}
                    className="text-[#2F6B3B]"
                  />
                </div>

                <h3
                  className="
                    text-lg
                    font-semibold
                    text-gray-800
                  "
                >
                  Select a Conversation
                </h3>

                <p
                  className="
                    mt-2
                    max-w-sm
                    text-sm
                    leading-6
                    text-gray-500
                  "
                >
                  Choose a contract-related conversation
                  to view your messages with a Miller.
                </p>
              </div>

            ) : (
              <>

                {/* ========================================= */}
                {/* CHAT HEADER */}
                {/* ========================================= */}

                <header
                  className="
                    border-b
                    border-gray-200
                    bg-white
                    px-5 py-4
                  "
                >
                  <div
                    className="
                      flex
                      flex-wrap
                      items-center
                      justify-between
                      gap-3
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
                          flex h-11 w-11
                          shrink-0
                          items-center
                          justify-center
                          rounded-full
                          bg-[#2F6B3B]
                          font-bold
                          text-white
                        "
                      >
                        {selectedName
                          .charAt(0)
                          .toUpperCase()}
                      </div>


                      <div className="min-w-0">
                        <h3
                          className="
                            truncate
                            text-base
                            font-semibold
                            text-gray-900
                          "
                        >
                          {selectedName}
                        </h3>

                        {selectedSecondaryName && (
                          <p
                            className="
                              truncate
                              text-xs
                              text-gray-500
                            "
                          >
                            {selectedSecondaryName}
                          </p>
                        )}
                      </div>
                    </div>


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
                          rounded-lg
                          bg-green-50
                          px-3 py-1.5
                          text-xs
                          font-medium
                          text-[#2F6B3B]
                        "
                      >
                        {formatReferenceType(
                          selectedMessageThread
                            .reference_type
                        )}
                      </span>

                      <span
                        className="
                          rounded-lg
                          border border-gray-200
                          bg-white
                          px-3 py-1.5
                          text-xs
                          font-medium
                          text-gray-600
                        "
                      >
                        {selectedMessageThread
                          .reference_code
                          ||
                          `#${selectedMessageThread.reference_id}`}
                      </span>
                    </div>
                  </div>
                </header>


                {/* ========================================= */}
                {/* MESSAGE AREA */}
                {/* ========================================= */}

                <div
                  className="
                    min-h-0
                    flex-1
                    overflow-y-auto
                    bg-gray-50
                    px-4 py-5
                    sm:px-6
                  "
                >
                  {(
                    isLoadingMessages
                    &&
                    messages.length === 0
                  ) ? (
                    <div
                      className="
                        flex h-full
                        min-h-[300px]
                        items-center
                        justify-center
                      "
                    >
                      <Loader2
                        size={26}
                        className="
                          animate-spin
                          text-[#2F6B3B]
                        "
                      />
                    </div>
                  ) : messages.length === 0 ? (
                    <div
                      className="
                        flex h-full
                        min-h-[300px]
                        flex-col
                        items-center
                        justify-center
                        text-center
                      "
                    >
                      <MessageCircle
                        size={30}
                        className="text-gray-300"
                      />

                      <p
                        className="
                          mt-3
                          text-sm
                          font-medium
                          text-gray-600
                        "
                      >
                        No messages yet
                      </p>

                      <p
                        className="
                          mt-1
                          text-xs
                          text-gray-400
                        "
                      >
                        Send a message to start the
                        conversation.
                      </p>
                    </div>
                  ) : (
                    renderedMessages.map(
                      (message) => {
                        const ownMessage = (
                          message.sender_type ===
                          "farmer"
                        );


                        return (
                          <div
                            key={message.message_id}
                          >
                            {message.showDateSeparator && (
                              <div
                                className="
                                  my-5
                                  flex
                                  items-center
                                  gap-3
                                "
                              >
                                <div
                                  className="
                                    h-px
                                    flex-1
                                    bg-gray-200
                                  "
                                />

                                <span
                                  className="
                                    text-[11px]
                                    font-medium
                                    text-gray-400
                                  "
                                >
                                  {formatMessageDate(
                                    message.created_at
                                  )}
                                </span>

                                <div
                                  className="
                                    h-px
                                    flex-1
                                    bg-gray-200
                                  "
                                />
                              </div>
                            )}


                            <div
                              className={`
                                mb-3
                                flex
                                ${
                                  ownMessage
                                    ? "justify-end"
                                    : "justify-start"
                                }
                              `}
                            >
                              <div
                                className={`
                                  max-w-[82%]
                                  sm:max-w-[72%]
                                `}
                              >
                                {!ownMessage && (
                                  <p
                                    className="
                                      mb-1
                                      ml-1
                                      text-[11px]
                                      font-medium
                                      text-gray-500
                                    "
                                  >
                                    {selectedName}
                                  </p>
                                )}


                                <div
                                  className={`
                                    rounded-2xl
                                    px-4 py-2.5
                                    text-sm
                                    leading-6
                                    shadow-sm
                                    ${
                                      ownMessage
                                        ? (
                                          "rounded-br-md "
                                          + "bg-[#2F6B3B] "
                                          + "text-white"
                                        )
                                        : (
                                          "rounded-bl-md "
                                          + "border "
                                          + "border-gray-200 "
                                          + "bg-white "
                                          + "text-gray-800"
                                        )
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
                                    text-gray-400
                                    ${
                                      ownMessage
                                        ? "text-right"
                                        : "text-left"
                                    }
                                  `}
                                >
                                  {formatMessageTime(
                                    message.created_at
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    )
                  )}


                  <div
                    ref={messagesEndRef}
                  />
                </div>


                {/* ========================================= */}
                {/* MESSAGE INPUT */}
                {/* ========================================= */}

                <div
                  className="
                    border-t border-gray-200
                    bg-white
                    p-4
                  "
                >
                  <div
                    className="
                      flex
                      items-end
                      gap-3
                    "
                  >
                    <textarea
                      value={messageText}
                      onChange={(event) => {
                        if (
                          event.target.value.length
                          <= 5000
                        ) {
                          setMessageText(
                            event.target.value
                          );
                        }
                      }}
                      onKeyDown={
                        handleMessageKeyDown
                      }
                      placeholder="Type your message..."
                      rows={1}
                      disabled={isSaving}
                      className="
                        min-h-[46px]
                        max-h-32
                        flex-1
                        resize-none
                        rounded-xl
                        border border-gray-200
                        bg-gray-50
                        px-4 py-3
                        text-sm
                        leading-5
                        text-gray-800
                        outline-none
                        transition
                        placeholder:text-gray-400
                        focus:border-[#2F6B3B]
                        focus:bg-white
                        focus:ring-2
                        focus:ring-green-100
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                      "
                    />


                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={
                        isSaving
                        ||
                        !messageText.trim()
                      }
                      className="
                        flex h-[46px]
                        shrink-0
                        items-center
                        justify-center
                        gap-2
                        rounded-xl
                        bg-[#2F6B3B]
                        px-4
                        text-sm
                        font-semibold
                        text-white
                        transition
                        hover:bg-[#275a32]
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                      "
                    >
                      {isSaving ? (
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />
                      ) : (
                        <Send size={18} />
                      )}

                      <span
                        className="
                          hidden sm:inline
                        "
                      >
                        Send
                      </span>
                    </button>
                  </div>


                  <div
                    className="
                      mt-2
                      flex
                      items-center
                      justify-between
                      gap-3
                    "
                  >
                    <p
                      className="
                        text-[11px]
                        text-gray-400
                      "
                    >
                      Press Enter to send. Shift + Enter
                      for a new line.
                    </p>

                    <p
                      className={`
                        text-[11px]
                        ${
                          messageText.length >= 4800
                            ? "text-red-500"
                            : "text-gray-400"
                        }
                      `}
                    >
                      {messageText.length}/5000
                    </p>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>


      {/* =================================================== */}
      {/* GLOBAL PROFANITY BLOCKER */}
      {/* =================================================== */}

      <ProfanityBlockModal
        open={
          profanityBlock.open
        }
        message={
          profanityBlock.message
        }
        onClose={
          clearProfanityBlock
        }
      />
    </>
  );
}