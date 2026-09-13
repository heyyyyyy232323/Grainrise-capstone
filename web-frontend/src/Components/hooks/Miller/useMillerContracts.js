import { useCallback, useState } from "react";
import useApi from "../useApi";

const BASE = "/miller/contracts";

function unwrap(response) {
  if (
    response
    && typeof response === "object"
    && Object.prototype.hasOwnProperty.call(response, "data")
  ) {
    return response.data;
  }

  return response;
}

function asList(value) {
  const data = unwrap(value);

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
}

function errorPayload(error) {
  if (error?.response?.data) {
    return error.response.data;
  }

  if (
    error?.data
    && typeof error.data === "object"
  ) {
    return error.data;
  }

  return typeof error === "object" && error
    ? error
    : {};
}

function errorMessage(
  error,
  fallback = "Something went wrong."
) {
  const payload = errorPayload(error);

  if (
    typeof payload?.message === "string"
    && payload.message.trim()
  ) {
    return payload.message.trim();
  }

  if (
    typeof payload?.detail === "string"
    && payload.detail.trim()
  ) {
    return payload.detail.trim();
  }

  if (
    typeof error?.message === "string"
    && error.message.trim()
  ) {
    return error.message.trim();
  }

  return fallback;
}

function isProfanity(value) {
  const data = unwrap(value);

  return Boolean(
    data
    && (
      data.code === "PROFANITY_DETECTED"
      || data.blocked === true
    )
  );
}

function queryString(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(
    ([key, value]) => {
      if (
        value === undefined
        || value === null
        || value === ""
      ) {
        return;
      }

      params.set(
        key,
        String(value)
      );
    }
  );

  const query = params.toString();

  return query
    ? `?${query}`
    : "";
}

export default function useMillerContracts() {
  const {
    request,
  } = useApi();

  // =========================================================
  // LIST STATE
  // =========================================================

  const [
    biddingOffers,
    setBiddingOffers,
  ] = useState([]);

  const [
    postings,
    setPostings,
  ] = useState([]);

  const [
    currentContracts,
    setCurrentContracts,
  ] = useState([]);

  const [
    messageThreads,
    setMessageThreads,
  ] = useState([]);

  const [
    messages,
    setMessages,
  ] = useState([]);

  // =========================================================
  // SELECTED RECORD STATE
  // =========================================================

  const [
    selectedBidding,
    setSelectedBidding,
  ] = useState(null);

  const [
    selectedPosting,
    setSelectedPosting,
  ] = useState(null);

  const [
    selectedApplication,
    setSelectedApplication,
  ] = useState(null);

  const [
    selectedContract,
    setSelectedContract,
  ] = useState(null);

  const [
    selectedMessageThread,
    setSelectedMessageThread,
  ] = useState(null);

  // =========================================================
  // GENERAL STATE
  // =========================================================

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    isLoadingMessages,
    setIsLoadingMessages,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    profanityBlock,
    setProfanityBlock,
  ] = useState({
    open: false,
    message: "",
  });

  // =========================================================
  // COMMON HELPERS
  // =========================================================

  const clearError = useCallback(
    () => {
      setError("");
    },
    []
  );

  const clearProfanityBlock = useCallback(
    () => {
      setProfanityBlock({
        open: false,
        message: "",
      });
    },
    []
  );

  const showProfanityBlock = useCallback(
    (payload = {}) => {
      setProfanityBlock({
        open: true,
        message:
          payload?.message
          || "Your message contains language that is not allowed under GrainRise communication guidelines.",
      });
    },
    []
  );

  const runRead = useCallback(
    async (
      endpoint,
      onSuccess = null,
      messageLoading = false
    ) => {
      if (messageLoading) {
        setIsLoadingMessages(true);
      } else {
        setIsLoading(true);
      }

      setError("");

      try {
        const response = await request(
          endpoint,
          {
            method: "GET",
            throwOnError: true,
          }
        );

        const data = unwrap(response);

        if (onSuccess) {
          onSuccess(data);
        }

        return data;
      } catch (err) {
        setError(
          errorMessage(
            err,
            "Unable to load Contracts data."
          )
        );

        return null;
      } finally {
        if (messageLoading) {
          setIsLoadingMessages(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [
      request,
    ]
  );

  const runWrite = useCallback(
    async (
      endpoint,
      method = "POST",
      body = undefined
    ) => {
      setIsSaving(true);
      setError("");

      try {
        const response = await request(
          endpoint,
          {
            method,
            body,
            throwOnError: true,
          }
        );

        const data = unwrap(response);

        if (isProfanity(data)) {
          showProfanityBlock(data);

          return {
            ...data,
            success: false,
            blocked: true,
            code: "PROFANITY_DETECTED",
          };
        }

        return data;
      } catch (err) {
        const payload = errorPayload(err);

        if (isProfanity(payload)) {
          showProfanityBlock(payload);

          setError("");

          return {
            success: false,
            blocked: true,
            code: "PROFANITY_DETECTED",
            message:
              payload?.message
              || "Your message contains language that is not allowed under GrainRise communication guidelines.",
          };
        }

        setError(
          errorMessage(
            err,
            "Unable to complete the Contracts request."
          )
        );

        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [
      request,
      showProfanityBlock,
    ]
  );

  // =========================================================
  // BIDDING OFFERS
  // =========================================================

  const loadBiddingOffers = useCallback(
    async (
      filters = {}
    ) => {
      const query = queryString({
        search:
          filters.search,

        product_type:
          filters.product_type,

        rice_variety:
          filters.rice_variety,

        farmer_location:
          filters.farmer_location,

        status:
          filters.status,

        bidding_deadline:
          filters.bidding_deadline,

        sort_by:
          filters.sort_by,
      });

      return runRead(
        `${BASE}/bidding-offers/${query}`,
        (data) => {
          setBiddingOffers(
            asList(data)
          );
        }
      );
    },
    [
      runRead,
    ]
  );

  const loadBiddingDetails = useCallback(
    async (
      biddingId
    ) => {
      if (!biddingId) {
        return null;
      }

      return runRead(
        `${BASE}/bidding-offers/${biddingId}/`,
        setSelectedBidding
      );
    },
    [
      runRead,
    ]
  );

  const submitOffer = useCallback(
    async (
      biddingId,
      payload
    ) => {
      if (!biddingId) {
        return null;
      }

      const result = await runWrite(
        `${BASE}/bidding-offers/${biddingId}/submit-offer/`,
        "POST",
        payload
      );

      if (
        result
        && !result.blocked
      ) {
        await loadBiddingOffers();

        await loadBiddingDetails(
          biddingId
        );
      }

      return result;
    },
    [
      runWrite,
      loadBiddingOffers,
      loadBiddingDetails,
    ]
  );

  const editOffer = useCallback(
    async (
      offerId,
      payload,
      biddingId = null
    ) => {
      if (!offerId) {
        return null;
      }

      const result = await runWrite(
        `${BASE}/offers/${offerId}/`,
        "PATCH",
        payload
      );

      if (result) {
        await loadBiddingOffers();

        if (biddingId) {
          await loadBiddingDetails(
            biddingId
          );
        }
      }

      return result;
    },
    [
      runWrite,
      loadBiddingOffers,
      loadBiddingDetails,
    ]
  );

  const withdrawOffer = useCallback(
    async (
      offerId,
      biddingId = null
    ) => {
      if (!offerId) {
        return null;
      }

      const result = await runWrite(
        `${BASE}/offers/${offerId}/withdraw/`,
        "POST"
      );

      if (result) {
        await loadBiddingOffers();

        if (biddingId) {
          await loadBiddingDetails(
            biddingId
          );
        }
      }

      return result;
    },
    [
      runWrite,
      loadBiddingOffers,
      loadBiddingDetails,
    ]
  );

  // =========================================================
  // POSTINGS
  // =========================================================

  const loadPostings = useCallback(
    async (
      filters = {}
    ) => {
      const query = queryString({
        search:
          filters.search,

        status:
          filters.status,

        product_type:
          filters.product_type,

        rice_variety:
          filters.rice_variety,

        year:
          filters.year,

        month:
          filters.month,

        sort_by:
          filters.sort_by,
      });

      return runRead(
        `${BASE}/postings/${query}`,
        (data) => {
          setPostings(
            asList(data)
          );
        }
      );
    },
    [
      runRead,
    ]
  );

  const createPosting = useCallback(
    async (
      payload
    ) => {
      const result = await runWrite(
        `${BASE}/postings/`,
        "POST",
        payload
      );

      if (result) {
        await loadPostings();
      }

      return result;
    },
    [
      runWrite,
      loadPostings,
    ]
  );

  const loadPostingDetails = useCallback(
    async (
      postingId,
      filters = {}
    ) => {
      if (!postingId) {
        return null;
      }

      const query = queryString({
        search:
          filters.search,

        application_status:
          filters.application_status,

        farmer_location:
          filters.farmer_location,

        sort_by:
          filters.sort_by,
      });

      return runRead(
        `${BASE}/postings/${postingId}/${query}`,
        setSelectedPosting
      );
    },
    [
      runRead,
    ]
  );

  const editPosting = useCallback(
    async (
      postingId,
      payload
    ) => {
      if (!postingId) {
        return null;
      }

      const result = await runWrite(
        `${BASE}/postings/${postingId}/`,
        "PATCH",
        payload
      );

      if (result) {
        await loadPostings();

        await loadPostingDetails(
          postingId
        );
      }

      return result;
    },
    [
      runWrite,
      loadPostings,
      loadPostingDetails,
    ]
  );

  const closePosting = useCallback(
    async (
      postingId
    ) => {
      if (!postingId) {
        return null;
      }

      const result = await runWrite(
        `${BASE}/postings/${postingId}/close/`,
        "POST"
      );

      if (result) {
        await loadPostings();

        await loadPostingDetails(
          postingId
        );
      }

      return result;
    },
    [
      runWrite,
      loadPostings,
      loadPostingDetails,
    ]
  );

  // =========================================================
  // CURRENT CONTRACTS
  // =========================================================

  const loadCurrentContracts = useCallback(
    async (
      filters = {}
    ) => {
      const query = queryString({
        search:
          filters.search,

        status:
          filters.status,

        product_type:
          filters.product_type,

        rice_variety:
          filters.rice_variety,

        year:
          filters.year,

        month:
          filters.month,

        sort_by:
          filters.sort_by,
      });

      return runRead(
        `${BASE}/current/${query}`,
        (data) => {
          setCurrentContracts(
            asList(data)
          );
        }
      );
    },
    [
      runRead,
    ]
  );

  const loadContractDetails = useCallback(
    async (
      contractId
    ) => {
      if (!contractId) {
        return null;
      }

      return runRead(
        `${BASE}/current/${contractId}/`,
        (data) => {
          setSelectedContract(
            data?.contract
            || data
          );
        }
      );
    },
    [
      runRead,
    ]
  );

  const signContract = useCallback(
    async (
      contractId,
      millerSignaturePath
    ) => {
      if (!contractId) {
        return null;
      }

      const result = await runWrite(
        `${BASE}/current/${contractId}/sign/`,
        "POST",
        {
          miller_signature_path:
            millerSignaturePath,
        }
      );

      if (result) {
        await loadContractDetails(
          contractId
        );

        await loadCurrentContracts();
      }

      return result;
    },
    [
      runWrite,
      loadContractDetails,
      loadCurrentContracts,
    ]
  );

  const markContractCompleted = useCallback(
    async (
      contractId
    ) => {
      if (!contractId) {
        return null;
      }

      const result = await runWrite(
        `${BASE}/current/${contractId}/complete/`,
        "POST"
      );

      if (result) {
        await loadContractDetails(
          contractId
        );

        await loadCurrentContracts();
      }

      return result;
    },
    [
      runWrite,
      loadContractDetails,
      loadCurrentContracts,
    ]
  );

  const requestVoid = useCallback(
    async (
      contractId,
      {
        voidReason,
        voidRemarks = "",
      } = {}
    ) => {
      if (!contractId) {
        return null;
      }

      const result = await runWrite(
        `${BASE}/current/${contractId}/void-request/`,
        "POST",
        {
          void_reason:
            voidReason,

          void_remarks:
            voidRemarks,
        }
      );

      if (result) {
        await loadContractDetails(
          contractId
        );

        await loadCurrentContracts();
      }

      return result;
    },
    [
      runWrite,
      loadContractDetails,
      loadCurrentContracts,
    ]
  );

  // =========================================================
  // FARMER APPLICATIONS
  // =========================================================

  const loadApplicationDetails = useCallback(
    async (
      applicationId
    ) => {
      if (!applicationId) {
        return null;
      }

      return runRead(
        `${BASE}/applications/${applicationId}/`,
        (data) => {
          setSelectedApplication(
            data?.application
            || data
          );
        }
      );
    },
    [
      runRead,
    ]
  );

  const startApplicationReview = useCallback(
    async (
      applicationId,
      postingId = null
    ) => {
      if (!applicationId) {
        return null;
      }

      const result = await runWrite(
        `${BASE}/applications/${applicationId}/review/`,
        "POST"
      );

      if (result) {
        await loadApplicationDetails(
          applicationId
        );

        if (postingId) {
          await loadPostingDetails(
            postingId
          );
        }
      }

      return result;
    },
    [
      runWrite,
      loadApplicationDetails,
      loadPostingDetails,
    ]
  );

  const approveApplication = useCallback(
    async (
      applicationId,
      payload = {},
      postingId = null
    ) => {
      if (!applicationId) {
        return null;
      }

      const result = await runWrite(
        `${BASE}/applications/${applicationId}/approve/`,
        "POST",
        payload
      );

      if (result) {
        setSelectedApplication(
          null
        );

        if (postingId) {
          await loadPostingDetails(
            postingId
          );
        }

        await loadPostings();
        await loadCurrentContracts();
      }

      return result;
    },
    [
      runWrite,
      loadPostingDetails,
      loadPostings,
      loadCurrentContracts,
    ]
  );

  const declineApplication = useCallback(
    async (
      applicationId,
      {
        declineReason,
        declineRemarks = "",
      } = {},
      postingId = null
    ) => {
      if (!applicationId) {
        return null;
      }

      const result = await runWrite(
        `${BASE}/applications/${applicationId}/decline/`,
        "POST",
        {
          decline_reason:
            declineReason,

          decline_remarks:
            declineRemarks,
        }
      );

      if (result) {
        await loadApplicationDetails(
          applicationId
        );

        if (postingId) {
          await loadPostingDetails(
            postingId
          );
        }

        await loadPostings();
      }

      return result;
    },
    [
      runWrite,
      loadApplicationDetails,
      loadPostingDetails,
      loadPostings,
    ]
  );

  // =========================================================
  // MESSAGES
  // =========================================================

  const loadMessageThreads = useCallback(
    async (
      filters = {}
    ) => {
      const query = queryString({
        search:
          filters.search,
      });

      return runRead(
        `${BASE}/messages/threads/${query}`,
        (data) => {
          setMessageThreads(
            asList(data)
          );
        },
        true
      );
    },
    [
      runRead,
    ]
  );

  const loadMessages = useCallback(
    async ({
      farmerUserId,
      referenceType,
      referenceId,
    } = {}) => {
      if (
        !farmerUserId
        || !referenceType
        || !referenceId
      ) {
        setMessages([]);
        return null;
      }

      const query = queryString({
        farmer_user_id:
          farmerUserId,

        reference_type:
          referenceType,

        reference_id:
          referenceId,
      });

      return runRead(
        `${BASE}/messages/conversation/${query}`,
        (data) => {
          setMessages(
            asList(data)
          );
        },
        true
      );
    },
    [
      runRead,
    ]
  );

  const selectMessageThread = useCallback(
    async (
      thread
    ) => {
      if (!thread) {
        setSelectedMessageThread(
          null
        );

        setMessages([]);

        return null;
      }

      setSelectedMessageThread(
        thread
      );

      return loadMessages({
        farmerUserId:
          thread.farmer_user_id,

        referenceType:
          thread.reference_type,

        referenceId:
          thread.reference_id,
      });
    },
    [
      loadMessages,
    ]
  );

  const sendMessage = useCallback(
    async (
      messageText,
      thread = selectedMessageThread
    ) => {
      const cleanMessage = String(
        messageText || ""
      ).trim();

      if (
        !thread
        || !cleanMessage
      ) {
        return null;
      }

      const result = await runWrite(
        `${BASE}/messages/send/`,
        "POST",
        {
          farmer_user_id:
            thread.farmer_user_id,

          reference_type:
            thread.reference_type,

          reference_id:
            thread.reference_id,

          message_text:
            cleanMessage,
        }
      );

      if (
        result
        && !result.blocked
      ) {
        await loadMessages({
          farmerUserId:
            thread.farmer_user_id,

          referenceType:
            thread.reference_type,

          referenceId:
            thread.reference_id,
        });

        await loadMessageThreads();
      }

      return result;
    },
    [
      runWrite,
      selectedMessageThread,
      loadMessages,
      loadMessageThreads,
    ]
  );

  const clearMessageConversation = useCallback(
    () => {
      setSelectedMessageThread(
        null
      );

      setMessages([]);
    },
    []
  );

  return {
    // ========================================================
    // LIST DATA
    // ========================================================

    biddingOffers,
    postings,
    currentContracts,
    messageThreads,
    messages,

    // ========================================================
    // SELECTED DATA
    // ========================================================

    selectedBidding,
    selectedPosting,
    selectedApplication,
    selectedContract,
    selectedMessageThread,

    // ========================================================
    // UI STATE
    // ========================================================

    isLoading,
    isSaving,
    isLoadingMessages,
    error,
    profanityBlock,

    // ========================================================
    // COMMON
    // ========================================================

    clearError,
    clearProfanityBlock,

    // ========================================================
    // BIDDING OFFERS
    // ========================================================

    loadBiddingOffers,
    loadBiddingDetails,
    submitOffer,
    editOffer,
    withdrawOffer,

    // ========================================================
    // POSTINGS
    // ========================================================

    loadPostings,
    createPosting,
    loadPostingDetails,
    editPosting,
    closePosting,

    // ========================================================
    // FARMER APPLICATIONS
    // ========================================================

    loadApplicationDetails,
    startApplicationReview,
    approveApplication,
    declineApplication,

    // ========================================================
    // CURRENT CONTRACTS
    // ========================================================

    loadCurrentContracts,
    loadContractDetails,
    signContract,
    markContractCompleted,
    requestVoid,

    // ========================================================
    // MESSAGES
    // ========================================================

    loadMessageThreads,
    loadMessages,
    selectMessageThread,
    sendMessage,
    clearMessageConversation,
  };
}