import {
  useCallback,
  useEffect,
  useState,
} from "react";

import useApi from "../useApi";


// ============================================================
// HOOK
// ============================================================

const useEmailUsers = () => {
  const {
    request,
  } = useApi();


  // =========================================================
  // SENT HISTORY
  // =========================================================

  const [
    sentHistory,
    setSentHistory,
  ] = useState(
    []
  );


  const [
    isLoadingHistory,
    setIsLoadingHistory,
  ] = useState(
    false
  );


  // =========================================================
  // SENT EMAIL DETAILS
  // =========================================================

  const [
    selectedEmailDetails,
    setSelectedEmailDetails,
  ] = useState(
    null
  );


  const [
    isLoadingDetails,
    setIsLoadingDetails,
  ] = useState(
    false
  );


  // =========================================================
  // SPECIFIC USER RECIPIENTS
  // =========================================================

  const [
    recipients,
    setRecipients,
  ] = useState(
    []
  );


  const [
    isLoadingRecipients,
    setIsLoadingRecipients,
  ] = useState(
    false
  );


  // =========================================================
  // SEND STATE
  // =========================================================

  const [
    isSending,
    setIsSending,
  ] = useState(
    false
  );


  // =========================================================
  // RECEIVED SUPPORT MESSAGES
  // =========================================================

  const [
    receivedMessages,
    setReceivedMessages,
  ] = useState([]);

  const [
    unreadReceivedCount,
    setUnreadReceivedCount,
  ] = useState(0);

  const [
    totalReceivedCount,
    setTotalReceivedCount,
  ] = useState(0);

  const [
    isLoadingReceived,
    setIsLoadingReceived,
  ] = useState(false);

  const [
    selectedReceivedDetails,
    setSelectedReceivedDetails,
  ] = useState(null);

  const [
    isLoadingReceivedDetails,
    setIsLoadingReceivedDetails,
  ] = useState(false);

  // =========================================================
  // ERROR
  // =========================================================

  const [
    error,
    setError,
  ] = useState(
    ""
  );


  // =========================================================
  // LOAD SENT HISTORY
  // =========================================================

  const loadSentHistory =
    useCallback(
      async () => {
        setIsLoadingHistory(
          true
        );

        setError(
          ""
        );


        try {
          const response =
            await request(
              "/admin/email-users/history/",
              {
                method: "GET",
                throwOnError: true,
              }
            );


          const results =
            Array.isArray(
              response?.results
            )
              ? response.results
              : [];


          setSentHistory(
            results
          );


          return results;

        } catch (
          err
        ) {
          const message =
            err?.message ||
            "Unable to load sent email history.";


          setError(
            message
          );


          setSentHistory(
            []
          );


          throw err;

        } finally {
          setIsLoadingHistory(
            false
          );
        }
      },
      [
        request,
      ]
    );


  // =========================================================
  // INITIAL HISTORY LOAD
  // =========================================================

  useEffect(
    () => {
      loadSentHistory().catch(
        () => {
          // Error state already handled.
        }
      );
    },
    [
      loadSentHistory,
    ]
  );


  // =========================================================
  // RECEIVED SUPPORT MESSAGES METHODS
  // =========================================================

  const loadReceivedMessages = useCallback(
    async (params = {}) => {
      setIsLoadingReceived(true);
      setError("");

      try {
        const query = new URLSearchParams();
        if (params.search) query.set("search", params.search);
        if (params.category && params.category !== "all") query.set("category", params.category);
        if (params.status && params.status !== "all") query.set("status", params.status);
        if (params.is_read !== undefined && params.is_read !== "all" && params.is_read !== null) {
          query.set("is_read", params.is_read);
        }

        const qs = query.toString() ? `?${query.toString()}` : "";
        const response = await request(`/admin/email-users/received/${qs}`, {
          method: "GET",
          throwOnError: true,
        });

        const results = Array.isArray(response?.results) ? response.results : [];
        setReceivedMessages(results);
        setUnreadReceivedCount(Number(response?.unread_count || 0));
        setTotalReceivedCount(Number(response?.total || results.length));
        return results;
      } catch (err) {
        const message = err?.message || "Unable to load received support messages.";
        setError(message);
        setReceivedMessages([]);
        throw err;
      } finally {
        setIsLoadingReceived(false);
      }
    },
    [request]
  );

  const refreshReceivedMessages = useCallback(
    async (params = {}) => {
      return loadReceivedMessages(params);
    },
    [loadReceivedMessages]
  );

  const getReceivedMessageDetails = useCallback(
    async (supportId) => {
      if (!supportId) throw new Error("Support message ID is required.");
      setIsLoadingReceivedDetails(true);
      setSelectedReceivedDetails(null);
      setError("");

      try {
        const response = await request(`/admin/email-users/received/${supportId}/`, {
          method: "GET",
          throwOnError: true,
        });

        const message = response?.result || null;
        setSelectedReceivedDetails(message);
        return message;
      } catch (err) {
        const message = err?.message || "Unable to load support message details.";
        setError(message);
        throw err;
      } finally {
        setIsLoadingReceivedDetails(false);
      }
    },
    [request]
  );

  const markReceivedMessageRead = useCallback(
    async (supportId, isRead = true) => {
      if (!supportId) return false;
      try {
        await request(`/admin/email-users/received/${supportId}/read/`, {
          method: "POST",
          body: { is_read: isRead },
          throwOnError: true,
        });

        setReceivedMessages((prev) =>
          prev.map((m) =>
            m.id === supportId || m.support_id === supportId
              ? { ...m, is_read: isRead ? 1 : 0 }
              : m
          )
        );

        setSelectedReceivedDetails((prev) =>
          prev && (prev.id === supportId || prev.support_id === supportId)
            ? { ...prev, is_read: isRead ? 1 : 0 }
            : prev
        );

        setUnreadReceivedCount((prev) =>
          Math.max(0, isRead ? prev - 1 : prev + 1)
        );

        return true;
      } catch (err) {
        console.error("Failed to update read status:", err);
        return false;
      }
    },
    [request]
  );

  const updateReceivedMessageStatus = useCallback(
    async (supportId, status) => {
      if (!supportId || !status) return false;
      try {
        await request(`/admin/email-users/received/${supportId}/status/`, {
          method: "POST",
          body: { status },
          throwOnError: true,
        });

        setReceivedMessages((prev) =>
          prev.map((m) =>
            m.id === supportId || m.support_id === supportId
              ? { ...m, status }
              : m
          )
        );

        setSelectedReceivedDetails((prev) =>
          prev && (prev.id === supportId || prev.support_id === supportId)
            ? { ...prev, status }
            : prev
        );

        return true;
      } catch (err) {
        console.error("Failed to update message status:", err);
        return false;
      }
    },
    [request]
  );

  const clearSelectedReceivedDetails = useCallback(() => {
    setSelectedReceivedDetails(null);
  }, []);

  // Initial load of received messages
  useEffect(() => {
    loadReceivedMessages().catch(() => {});
  }, [loadReceivedMessages]);

  // =========================================================
  // SEARCH SPECIFIC USERS
  // =========================================================

  const searchRecipients =
    useCallback(
      async (
        search = ""
      ) => {
        const cleanedSearch =
          String(
            search || ""
          ).trim();


        setIsLoadingRecipients(
          true
        );

        setError(
          ""
        );


        try {
          const response =
            await request(
              `/admin/email-users/recipients/?search=${encodeURIComponent(
                cleanedSearch
              )}&limit=50`,
              {
                method: "GET",
                throwOnError: true,
              }
            );


          const results =
            Array.isArray(
              response?.results
            )
              ? response.results
              : [];


          setRecipients(
            results
          );


          return results;

        } catch (
          err
        ) {
          const message =
            err?.message ||
            "Unable to load email recipients.";


          setError(
            message
          );


          setRecipients(
            []
          );


          throw err;

        } finally {
          setIsLoadingRecipients(
            false
          );
        }
      },
      [
        request,
      ]
    );


  // =========================================================
  // CLEAR RECIPIENT SEARCH
  // =========================================================

  const clearRecipients =
    useCallback(
      () => {
        setRecipients(
          []
        );
      },
      []
    );


  // =========================================================
  // LOAD ONE SENT EMAIL
  // =========================================================

  const getSentEmailDetails =
    useCallback(
      async (
        emailHistoryId
      ) => {
        if (
          !emailHistoryId
        ) {
          throw new Error(
            "Sent email history ID is required."
          );
        }


        setIsLoadingDetails(
          true
        );

        setSelectedEmailDetails(
          null
        );

        setError(
          ""
        );


        try {
          const response =
            await request(
              `/admin/email-users/history/${emailHistoryId}/`,
              {
                method: "GET",
                throwOnError: true,
              }
            );


          const email =
            response?.email ||
            null;


          setSelectedEmailDetails(
            email
          );


          return email;

        } catch (
          err
        ) {
          const message =
            err?.message ||
            "Unable to load sent email details.";


          setError(
            message
          );


          throw err;

        } finally {
          setIsLoadingDetails(
            false
          );
        }
      },
      [
        request,
      ]
    );


  // =========================================================
  // CLEAR SELECTED EMAIL
  // =========================================================

  const clearSelectedEmail =
    useCallback(
      () => {
        setSelectedEmailDetails(
          null
        );
      },
      []
    );


  // =========================================================
  // SEND EMAIL
  // =========================================================

  const sendEmail =
    useCallback(
      async ({
        recipientType,
        recipient_type,
        recipient_id,
        recipientId,

        subject,

        messageHtml,
        messagePlain,

        recipientUserId = null,
        recipientEmail = "",
        recipientName = "",
      }) => {
        // ====================================================
        // NORMALIZE
        // ====================================================

        const cleanedRecipientType =
          String(
            recipientType ||
            ""
          )
            .trim()
            .toLowerCase();


        const cleanedSubject =
          String(
            subject ||
            ""
          ).trim();


        const cleanedMessagePlain =
          String(
            messagePlain ||
            ""
          ).trim();


        const cleanedMessageHtml =
          String(
            messageHtml ||
            ""
          ).trim();


        const cleanedRecipientEmail =
          String(
            recipientEmail ||
            ""
          ).trim();


        const cleanedRecipientName =
          String(
            recipientName ||
            ""
          ).trim();

        const finalRecipientId =
          recipient_id ??
          recipientId ??
          recipientUserId ??
          null;

        const finalRecipientType =
          cleanedRecipientType === "specific_user"
            ? (String(recipient_type || "").trim().toLowerCase() || "user")
            : cleanedRecipientType;


        // ====================================================
        // VALIDATION
        // ====================================================

        if (
          !cleanedRecipientType
        ) {
          throw new Error(
            "Email recipient is required."
          );
        }


        if (
          !cleanedSubject
        ) {
          throw new Error(
            "Subject is required."
          );
        }


        if (
          cleanedSubject.length >
          255
        ) {
          throw new Error(
            "Subject must not exceed 255 characters."
          );
        }


        if (
          !cleanedMessagePlain
        ) {
          throw new Error(
            "Message is required."
          );
        }


        if (
          cleanedMessagePlain.length >
          1000
        ) {
          throw new Error(
            "Message must not exceed 1,000 characters."
          );
        }


        if (
          cleanedRecipientType ===
          "specific_user"
        ) {
          const hasRecipientId =
            Boolean(
              finalRecipientId
            );


          const hasEmail =
            Boolean(
              cleanedRecipientEmail
            );


          if (
            !hasRecipientId &&
            !hasEmail
          ) {
            throw new Error(
              "Select a specific recipient before sending."
            );
          }
        }


        // ====================================================
        // REQUEST
        // ====================================================

        setIsSending(
          true
        );

        setError(
          ""
        );


        try {
          const payload = {
            recipient_type:
              finalRecipientType,

            recipient_id:
              finalRecipientId,

            subject:
              cleanedSubject,

            message_html:
              cleanedMessageHtml,

            message_plain:
              cleanedMessagePlain,
          };


          // ==================================================
          // SPECIFIC USER FIELDS
          // ==================================================

          if (
            cleanedRecipientType ===
            "specific_user"
          ) {
            payload.recipient_user_id =
              finalRecipientId;

            payload.recipient_email =
              cleanedRecipientEmail;

            payload.recipient_name =
              cleanedRecipientName;
          }


          const response =
            await request(
              "/admin/email-users/send/",
              {
                method: "POST",

                body:
                  payload,

                throwOnError: true,
              }
            );


          // ==================================================
          // REFRESH DATABASE HISTORY
          // ==================================================

          await loadSentHistory();


          return response;

        } catch (
          err
        ) {
          const message =
            err?.message ||
            "Unable to send the email.";


          setError(
            message
          );


          throw err;

        } finally {
          setIsSending(
            false
          );
        }
      },
      [
        request,
        loadSentHistory,
      ]
    );


  // =========================================================
  // REFRESH HISTORY
  // =========================================================

  const refreshSentHistory =
    useCallback(
      async () => {
        return loadSentHistory();
      },
      [
        loadSentHistory,
      ]
    );


  // =========================================================
  // CLEAR ERROR
  // =========================================================

  const clearError =
    useCallback(
      () => {
        setError(
          ""
        );
      },
      []
    );


  // =========================================================
  // RETURN
  // =========================================================

  return {
    // ========================================================
    // RECEIVED SUPPORT MESSAGES
    // ========================================================

    receivedMessages,
    unreadReceivedCount,
    totalReceivedCount,
    isLoadingReceived,

    selectedReceivedDetails,
    isLoadingReceivedDetails,

    loadReceivedMessages,
    refreshReceivedMessages,
    getReceivedMessageDetails,
    markReceivedMessageRead,
    updateReceivedMessageStatus,
    clearSelectedReceivedDetails,

    // ========================================================
    // HISTORY
    // ========================================================

    sentHistory,
    isLoadingHistory,

    loadSentHistory,
    refreshSentHistory,


    // ========================================================
    // SENT EMAIL DETAILS
    // ========================================================

    selectedEmailDetails,
    isLoadingDetails,

    getSentEmailDetails,
    clearSelectedEmail,


    // ========================================================
    // SPECIFIC USER RECIPIENT SEARCH
    // ========================================================

    recipients,
    isLoadingRecipients,

    searchRecipients,
    clearRecipients,


    // ========================================================
    // SEND
    // ========================================================

    isSending,
    sendEmail,


    // ========================================================
    // ERROR
    // ========================================================

    error,
    clearError,
  };
};


export default useEmailUsers;