import {
  useCallback,
  useRef,
  useState,
} from "react";

import useApi from "../useApi";


const API_BASE =
  "/miller/contracts/messages";


// ============================================================
// HELPERS
// ============================================================

function normalizePayloadData(
  payload
) {
  if (
    payload
    && Object.prototype.hasOwnProperty.call(
      payload,
      "data"
    )
  ) {
    return payload.data;
  }

  return payload;
}


function normalizeList(
  payload
) {
  const data =
    normalizePayloadData(
      payload
    );

  return Array.isArray(
    data
  )
    ? data
    : [];
}


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


// ============================================================
// HOOK
// ============================================================

export default function useMillerContractMessages() {
  const {
    request,
  } = useApi();


  const lastSearchRef =
    useRef("");


  // ==========================================================
  // THREADS
  // ==========================================================

  const [
    threads,
    setThreads,
  ] = useState([]);


  const [
    activeThread,
    setActiveThread,
  ] = useState(null);


  const [
    isThreadsLoading,
    setIsThreadsLoading,
  ] = useState(false);


  const [
    threadsError,
    setThreadsError,
  ] = useState("");


  // ==========================================================
  // CONVERSATION
  // ==========================================================

  const [
    messages,
    setMessages,
  ] = useState([]);


  const [
    isMessagesLoading,
    setIsMessagesLoading,
  ] = useState(false);


  const [
    messagesError,
    setMessagesError,
  ] = useState("");


  // ==========================================================
  // SEND
  // ==========================================================

  const [
    isSending,
    setIsSending,
  ] = useState(false);


  const [
    sendError,
    setSendError,
  ] = useState("");


  // ==========================================================
  // LOAD THREADS
  // ==========================================================

  const loadThreads =
    useCallback(
      async (
        search = ""
      ) => {
        const normalizedSearch =
          String(
            search || ""
          ).trim();


        lastSearchRef.current =
          normalizedSearch;


        setIsThreadsLoading(
          true
        );

        setThreadsError(
          ""
        );


        try {
          const params =
            new URLSearchParams();


          if (
            normalizedSearch
          ) {
            params.set(
              "search",
              normalizedSearch
            );
          }


          const query =
            params.toString();


          const payload =
            await request(
              `${API_BASE}/threads/${query ? `?${query}` : ""}`,
              {
                method:
                  "GET",

                throwOnError:
                  true,
              }
            );


          const rows =
            normalizeList(
              payload
            );


          setThreads(
            (
              current
            ) => {
              const selectedKey =
                threadKey(
                  activeThread
                );


              if (!selectedKey) {
                return rows;
              }


              return rows.map(
                (
                  row
                ) => {
                  if (
                    threadKey(
                      row
                    ) === selectedKey
                  ) {
                    return {
                      ...row,
                      unread_count: 0,
                    };
                  }

                  return row;
                }
              );
            }
          );


          return rows;

        } catch (
          error
        ) {
          const message =
            error?.message
            || "Unable to load Farmer conversations.";


          setThreadsError(
            message
          );

          setThreads(
            []
          );


          throw error;

        } finally {
          setIsThreadsLoading(
            false
          );
        }
      },
      [
        request,
        activeThread,
      ]
    );


  // ==========================================================
  // LOAD CONVERSATION
  // ==========================================================

  const loadMessages =
    useCallback(
      async (
        thread
      ) => {
        if (
          !thread?.farmer_user_id
          || !thread?.reference_type
          || !thread?.reference_id
        ) {
          throw new Error(
            "Conversation reference is incomplete."
          );
        }


        setIsMessagesLoading(
          true
        );

        setMessagesError(
          ""
        );


        try {
          const params =
            new URLSearchParams({
              farmer_user_id:
                String(
                  thread.farmer_user_id
                ),

              reference_type:
                String(
                  thread.reference_type
                ),

              reference_id:
                String(
                  thread.reference_id
                ),
            });


          const payload =
            await request(
              `${API_BASE}/conversation/?${params.toString()}`,
              {
                method:
                  "GET",

                throwOnError:
                  true,
              }
            );


          const rows =
            normalizeList(
              payload
            );


          setMessages(
            rows
          );


          return rows;

        } catch (
          error
        ) {
          const message =
            error?.message
            || "Unable to load this conversation.";


          setMessagesError(
            message
          );

          setMessages(
            []
          );


          throw error;

        } finally {
          setIsMessagesLoading(
            false
          );
        }
      },
      [
        request,
      ]
    );


  // ==========================================================
  // SELECT THREAD
  // ==========================================================

  const selectThread =
    useCallback(
      async (
        thread
      ) => {
        if (!thread) {
          return;
        }


        setActiveThread(
          {
            ...thread,
            unread_count: 0,
          }
        );


        setSendError(
          ""
        );

        setMessagesError(
          ""
        );


        const selectedKey =
          threadKey(
            thread
          );


        setThreads(
          (
            current
          ) =>
            current.map(
              (
                item
              ) =>
                threadKey(
                  item
                ) === selectedKey
                  ? {
                      ...item,
                      unread_count:
                        0,
                    }
                  : item
            )
        );


        await loadMessages(
          thread
        );
      },
      [
        loadMessages,
      ]
    );


  // ==========================================================
  // SEND MESSAGE
  // ==========================================================

  const sendMessage =
    useCallback(
      async (
        messageText
      ) => {
        if (!activeThread) {
          throw new Error(
            "Select a Farmer conversation first."
          );
        }


        const normalizedMessage =
          String(
            messageText || ""
          ).trim();


        if (!normalizedMessage) {
          throw new Error(
            "Message cannot be empty."
          );
        }


        if (
          normalizedMessage.length >
          5000
        ) {
          throw new Error(
            "Message cannot exceed 5000 characters."
          );
        }


        setIsSending(
          true
        );

        setSendError(
          ""
        );


        try {
          const payload =
            await request(
              `${API_BASE}/send/`,
              {
                method:
                  "POST",

                body: {
                  farmer_user_id:
                    activeThread.farmer_user_id,

                  reference_type:
                    activeThread.reference_type,

                  reference_id:
                    activeThread.reference_id,

                  message_text:
                    normalizedMessage,
                },

                throwOnError:
                  true,
              }
            );


          await loadMessages(
            activeThread
          );


          try {
            const params =
              new URLSearchParams();


            if (
              lastSearchRef.current
            ) {
              params.set(
                "search",
                lastSearchRef.current
              );
            }


            const query =
              params.toString();


            const threadsPayload =
              await request(
                `${API_BASE}/threads/${query ? `?${query}` : ""}`,
                {
                  method:
                    "GET",

                  throwOnError:
                    true,
                }
              );


            const rows =
              normalizeList(
                threadsPayload
              );


            const selectedKey =
              threadKey(
                activeThread
              );


            setThreads(
              rows.map(
                (
                  item
                ) =>
                  threadKey(
                    item
                  ) === selectedKey
                    ? {
                        ...item,
                        unread_count:
                          0,
                      }
                    : item
              )
            );

          } catch {
            // Message itself was already sent successfully.
            // Thread refresh failure should not invalidate it.
          }


          return normalizePayloadData(
            payload
          );

        } catch (
          error
        ) {
          const message =
            error?.payload?.message
            || error?.message
            || "Unable to send the message.";


          setSendError(
            message
          );


          throw error;

        } finally {
          setIsSending(
            false
          );
        }
      },
      [
        request,
        activeThread,
        loadMessages,
      ]
    );


  // ==========================================================
  // REFRESH ACTIVE THREAD
  // ==========================================================

  const refreshActiveThread =
    useCallback(
      async () => {
        if (!activeThread) {
          return [];
        }


        return loadMessages(
          activeThread
        );
      },
      [
        activeThread,
        loadMessages,
      ]
    );


  // ==========================================================
  // CLEAR ERRORS
  // ==========================================================

  const clearSendError =
    useCallback(
      () => {
        setSendError(
          ""
        );
      },
      []
    );


  // ==========================================================
  // RETURN
  // ==========================================================

  return {
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
  };
}