import {
  useCallback,
  useState,
} from "react";

import useApi from "../useApi";


// ============================================================
// GRAINRISE
// FARMER > CONTRACTS
// HOOK
// ============================================================
//
// Handles:
//
// - Applications
// - Offers / Open Biddings
// - Opportunities
// - Current Contracts
// - Messages
// - Global profanity blocker state
//
// ============================================================


// ============================================================
// RESPONSE HELPERS
// ============================================================

function unwrapData(response) {
  if (
    response
    && typeof response === "object"
    && Object.prototype.hasOwnProperty.call(
      response,
      "data"
    )
  ) {
    return response.data;
  }

  return response;
}


function normalizeList(data) {
  const unwrapped = unwrapData(
    data
  );


  if (
    Array.isArray(
      unwrapped
    )
  ) {
    return unwrapped;
  }


  if (
    unwrapped
    && Array.isArray(
      unwrapped.items
    )
  ) {
    return unwrapped.items;
  }


  if (
    unwrapped
    && Array.isArray(
      unwrapped.results
    )
  ) {
    return unwrapped.results;
  }


  return [];
}


// ============================================================
// ERROR PAYLOAD
// ============================================================

function getErrorPayload(error) {
  if (!error) {
    return {};
  }


  // Axios-style response
  if (
    error.response
    && error.response.data
  ) {
    return error.response.data;
  }


  // Custom useApi error
  if (
    error.data
    && typeof error.data === "object"
  ) {
    return error.data;
  }


  if (
    typeof error === "object"
  ) {
    return error;
  }


  return {};
}


// ============================================================
// ERROR MESSAGE
// ============================================================

function getErrorMessage(
  error,
  fallback = "Something went wrong."
) {
  const payload = (
    getErrorPayload(
      error
    )
  );


  if (
    typeof payload.message === "string"
    && payload.message.trim()
  ) {
    return payload.message.trim();
  }


  if (
    typeof payload.detail === "string"
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


// ============================================================
// PROFANITY RESPONSE
// ============================================================

function isProfanityResponse(value) {
  if (!value) {
    return false;
  }


  const payload = (
    unwrapData(
      value
    )
  );


  return (
    payload?.code ===
      "PROFANITY_DETECTED"
    ||
    payload?.blocked === true
  );
}


// ============================================================
// QUERY STRING
// ============================================================

function buildQuery(filters = {}) {
  const params = (
    new URLSearchParams()
  );


  Object.entries(
    filters
  ).forEach(
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


  const query = (
    params.toString()
  );


  return (
    query
      ? `?${query}`
      : ""
  );
}


// ============================================================
// MAIN HOOK
// ============================================================

export default function useFarmerContracts() {
  const {
    request,
  } = useApi();


  // ==========================================================
  // LIST DATA
  // ==========================================================

  const [
    applications,
    setApplications,
  ] = useState([]);


  const [
    biddings,
    setBiddings,
  ] = useState([]);


  const [
    opportunities,
    setOpportunities,
  ] = useState([]);


  const [
    contracts,
    setContracts,
  ] = useState([]);


  // ==========================================================
  // MESSAGE DATA
  // ==========================================================

  const [
    messageThreads,
    setMessageThreads,
  ] = useState([]);


  const [
    messages,
    setMessages,
  ] = useState([]);


  const [
    selectedMessageThread,
    setSelectedMessageThread,
  ] = useState(null);


  // ==========================================================
  // SELECTED RECORDS
  // ==========================================================

  const [
    selectedApplication,
    setSelectedApplication,
  ] = useState(null);


  const [
    selectedBidding,
    setSelectedBidding,
  ] = useState(null);


  const [
    selectedOffer,
    setSelectedOffer,
  ] = useState(null);


  const [
    selectedOpportunity,
    setSelectedOpportunity,
  ] = useState(null);


  const [
    selectedContract,
    setSelectedContract,
  ] = useState(null);


  // ==========================================================
  // GENERAL STATE
  // ==========================================================

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);


  const [
    isSaving,
    setIsSaving,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  // ==========================================================
  // MESSAGE-SPECIFIC LOADING
  // ==========================================================

  const [
    isLoadingMessages,
    setIsLoadingMessages,
  ] = useState(false);


  // ==========================================================
  // PROFANITY BLOCK STATE
  // ==========================================================

  const [
    profanityBlock,
    setProfanityBlock,
  ] = useState({
    open: false,
    message: "",
  });


  // ==========================================================
  // CLEAR GENERAL ERROR
  // ==========================================================

  const clearError = useCallback(
    () => {
      setError("");
    },
    []
  );


  // ==========================================================
  // CLEAR PROFANITY BLOCK
  // ==========================================================

  const clearProfanityBlock = useCallback(
    () => {
      setProfanityBlock({
        open: false,
        message: "",
      });
    },
    []
  );


  // ==========================================================
  // PROFANITY HANDLER
  // ==========================================================

  const handleProfanityBlock = useCallback(
    (payload = {}) => {
      const message = (
        payload?.message
        ||
        (
          "Your message contains language "
          + "that is not allowed under "
          + "GrainRise communication guidelines."
        )
      );


      setProfanityBlock({
        open: true,
        message,
      });
    },
    []
  );


  // ==========================================================
  // GENERIC READ
  // ==========================================================

  const runRead = useCallback(
    async (
      endpoint,
      onSuccess
    ) => {
      setIsLoading(true);
      setError("");


      try {
        const response = await request(
          endpoint,
          {
            method: "GET",
            throwOnError: true,
          }
        );


        const data = (
          unwrapData(
            response
          )
        );


        if (onSuccess) {
          onSuccess(
            data
          );
        }


        return data;
      }

      catch (err) {
        setError(
          getErrorMessage(
            err,
            "Unable to load data."
          )
        );


        return null;
      }

      finally {
        setIsLoading(false);
      }
    },
    [
      request,
    ]
  );


  // ==========================================================
  // GENERIC WRITE
  // ==========================================================

  const runWrite = useCallback(
    async (
      endpoint,
      {
        method = "POST",
        body,
      } = {}
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


        const data = (
          unwrapData(
            response
          )
        );


        // ----------------------------------------------------
        // Defensive handling:
        // useApi may return a blocked body without throwing.
        // ----------------------------------------------------

        if (
          isProfanityResponse(
            data
          )
        ) {
          handleProfanityBlock(
            data
          );


          return {
            ...data,

            success: false,
            blocked: true,

            code:
              "PROFANITY_DETECTED",
          };
        }


        return data;
      }

      catch (err) {
        const payload = (
          getErrorPayload(
            err
          )
        );


        // ====================================================
        // PROFANITY
        // ====================================================

        if (
          isProfanityResponse(
            payload
          )
        ) {
          handleProfanityBlock(
            payload
          );


          // Do not show the same message as a generic
          // red page error.
          setError("");


          return {
            success: false,

            blocked: true,

            code:
              "PROFANITY_DETECTED",

            message:
              (
                payload?.message
                ||
                (
                  "Your message contains "
                  + "language that is not "
                  + "allowed under GrainRise "
                  + "communication guidelines."
                )
              ),
          };
        }


        // ====================================================
        // NORMAL API ERROR
        // ====================================================

        setError(
          getErrorMessage(
            err,
            "Unable to complete request."
          )
        );


        return null;
      }

      finally {
        setIsSaving(false);
      }
    },
    [
      request,
      handleProfanityBlock,
    ]
  );


  // ==========================================================
  // APPLICATIONS
  // ==========================================================

  const loadApplications = useCallback(
    async (
      filters = {}
    ) => {
      const query = buildQuery({
        search:
          filters.search,

        status:
          filters.status,

        year:
          filters.year,

        month:
          filters.month,

        sort_by:
          filters.sort_by,
      });


      return runRead(
        (
          "/farmer/contracts/"
          + `applications/${query}`
        ),

        (data) => {
          setApplications(
            normalizeList(
              data
            )
          );
        }
      );
    },
    [
      runRead,
    ]
  );


  // ==========================================================
  // APPLICATION DETAILS
  // ==========================================================

  const loadApplicationDetails = useCallback(
    async (
      applicationId
    ) => {
      if (!applicationId) {
        return null;
      }


      return runRead(
        (
          "/farmer/contracts/"
          + `applications/${applicationId}/`
        ),

        (data) => {
          setSelectedApplication(
            data
          );
        }
      );
    },
    [
      runRead,
    ]
  );


  // ==========================================================
  // CANCEL APPLICATION
  // ==========================================================

  const cancelApplication = useCallback(
    async (
      applicationId,
      {
        cancellationReason,
        cancellationRemarks,
      } = {}
    ) => {
      if (!applicationId) {
        return null;
      }


      const result = await runWrite(
        (
          "/farmer/contracts/"
          + `applications/${applicationId}/cancel/`
        ),

        {
          method: "POST",

          body: {
            cancellation_reason:
              cancellationReason,

            cancellation_remarks:
              cancellationRemarks || "",
          },
        }
      );


      if (
        result
        && !result.blocked
      ) {
        await loadApplications();
      }


      return result;
    },
    [
      runWrite,
      loadApplications,
    ]
  );


  // ==========================================================
  // BIDDINGS
  // ==========================================================

  const loadBiddings = useCallback(
    async (
      filters = {}
    ) => {
      const query = buildQuery({
        search:
          filters.search,

        status:
          filters.status,

        year:
          filters.year,

        month:
          filters.month,

        sort_by:
          filters.sort_by,
      });


      return runRead(
        (
          "/farmer/contracts/"
          + `biddings/${query}`
        ),

        (data) => {
          setBiddings(
            normalizeList(
              data
            )
          );
        }
      );
    },
    [
      runRead,
    ]
  );


  // ==========================================================
  // CREATE OPEN BIDDING
  // ==========================================================

  const createBidding = useCallback(
    async (
      payload
    ) => {
      const result = await runWrite(
        "/farmer/contracts/biddings/",
        {
          method: "POST",
          body: payload,
        }
      );


      if (
        result
        && !result.blocked
      ) {
        await loadBiddings();
      }


      return result;
    },
    [
      runWrite,
      loadBiddings,
    ]
  );


  // ==========================================================
  // BIDDING DETAILS
  // ==========================================================

  const loadBiddingDetails = useCallback(
    async (
      biddingId
    ) => {
      if (!biddingId) {
        return null;
      }


      return runRead(
        (
          "/farmer/contracts/"
          + `biddings/${biddingId}/`
        ),

        (data) => {
          setSelectedBidding(
            data
          );
        }
      );
    },
    [
      runRead,
    ]
  );


  // ==========================================================
  // OFFER DETAILS
  // ==========================================================

  const loadOfferDetails = useCallback(
    async (
      offerId
    ) => {
      if (!offerId) {
        return null;
      }


      return runRead(
        (
          "/farmer/contracts/"
          + `offers/${offerId}/`
        ),

        (data) => {
          setSelectedOffer(
            data
          );
        }
      );
    },
    [
      runRead,
    ]
  );


  // ==========================================================
  // ACCEPT OFFER
  // ==========================================================

  const acceptOffer = useCallback(
    async (
      offerId,
      farmerSignaturePath
    ) => {
      if (!offerId) {
        return null;
      }


      const result = await runWrite(
        (
          "/farmer/contracts/"
          + `offers/${offerId}/accept/`
        ),

        {
          method: "POST",

          body: {
            farmer_signature_path:
              farmerSignaturePath,
          },
        }
      );


      if (
        result
        && !result.blocked
      ) {
        await loadBiddings();
      }


      return result;
    },
    [
      runWrite,
      loadBiddings,
    ]
  );


  // ==========================================================
  // DECLINE OFFER
  // ==========================================================

  const declineOffer = useCallback(
    async (
      offerId
    ) => {
      if (!offerId) {
        return null;
      }


      const result = await runWrite(
        (
          "/farmer/contracts/"
          + `offers/${offerId}/decline/`
        ),

        {
          method: "POST",
        }
      );


      if (
        result
        && !result.blocked
      ) {
        await loadBiddings();
      }


      return result;
    },
    [
      runWrite,
      loadBiddings,
    ]
  );


  // ==========================================================
  // OPPORTUNITIES
  // ==========================================================

  const loadOpportunities = useCallback(
    async (
      filters = {}
    ) => {
      const query = buildQuery({
        search:
          filters.search,

        product_type:
          filters.product_type,

        rice_variety:
          filters.rice_variety,

        location:
          filters.location,

        sort_by:
          filters.sort_by,
      });


      return runRead(
        (
          "/farmer/contracts/"
          + `opportunities/${query}`
        ),

        (data) => {
          setOpportunities(
            normalizeList(
              data
            )
          );
        }
      );
    },
    [
      runRead,
    ]
  );


  // ==========================================================
  // OPPORTUNITY DETAILS
  // ==========================================================

  const loadOpportunityDetails = useCallback(
    async (
      postingId
    ) => {
      if (!postingId) {
        return null;
      }


      return runRead(
        (
          "/farmer/contracts/"
          + `opportunities/${postingId}/`
        ),

        (data) => {
          setSelectedOpportunity(
            data
          );
        }
      );
    },
    [
      runRead,
    ]
  );


  // ==========================================================
  // SUBMIT APPLICATION
  // ==========================================================

  const submitApplication = useCallback(
    async (
      postingId,
      payload
    ) => {
      if (!postingId) {
        return null;
      }


      const result = await runWrite(
        (
          "/farmer/contracts/"
          + `opportunities/${postingId}/apply/`
        ),

        {
          method: "POST",
          body: payload,
        }
      );


      if (
        result
        && !result.blocked
      ) {
        await loadOpportunities();
        await loadApplications();
      }


      return result;
    },
    [
      runWrite,
      loadOpportunities,
      loadApplications,
    ]
  );


  // ==========================================================
  // CURRENT CONTRACTS
  // ==========================================================

  const loadContracts = useCallback(
    async () => {
      return runRead(
        "/farmer/contracts/current/",

        (data) => {
          setContracts(
            normalizeList(
              data
            )
          );
        }
      );
    },
    [
      runRead,
    ]
  );


  // ==========================================================
  // CONTRACT DETAILS
  // ==========================================================

  const loadContractDetails = useCallback(
    async (
      contractId
    ) => {
      if (!contractId) {
        return null;
      }


      return runRead(
        (
          "/farmer/contracts/"
          + `current/${contractId}/`
        ),

        (data) => {
          setSelectedContract(
            data
          );
        }
      );
    },
    [
      runRead,
    ]
  );


  // ==========================================================
  // REQUEST VOID
  // ==========================================================

  const requestVoid = useCallback(
    async (
      contractId,
      {
        reason,
        remarks,
      } = {}
    ) => {
      if (!contractId) {
        return null;
      }


      const result = await runWrite(
        (
          "/farmer/contracts/"
          + `current/${contractId}/void-request/`
        ),

        {
          method: "POST",

          body: {
            reason,
            remarks:
              remarks || "",
          },
        }
      );


      if (
        result
        && !result.blocked
      ) {
        await loadContracts();
      }


      return result;
    },
    [
      runWrite,
      loadContracts,
    ]
  );


  // ==========================================================
  // MESSAGE THREADS
  // ==========================================================

  const loadMessageThreads = useCallback(
    async () => {
      setIsLoadingMessages(true);
      setError("");


      try {
        const response = await request(
          "/farmer/contracts/messages/",
          {
            method: "GET",
            throwOnError: true,
          }
        );


        const data = (
          unwrapData(
            response
          )
        );


        const items = (
          normalizeList(
            data
          )
        );


        setMessageThreads(
          items
        );


        return items;
      }

      catch (err) {
        setError(
          getErrorMessage(
            err,
            "Unable to load conversations."
          )
        );


        setMessageThreads(
          []
        );


        return null;
      }

      finally {
        setIsLoadingMessages(
          false
        );
      }
    },
    [
      request,
    ]
  );


  // ==========================================================
  // LOAD ONE MESSAGE CONVERSATION
  // ==========================================================

  const loadMessages = useCallback(
    async ({
      supplierProfileId,
      referenceType,
      referenceId,
    }) => {
      if (
        !supplierProfileId
        || !referenceType
        || !referenceId
      ) {
        setMessages(
          []
        );

        return null;
      }


      setIsLoadingMessages(
        true
      );

      setError("");


      const query = buildQuery({
        supplier_profile_id:
          supplierProfileId,

        reference_type:
          referenceType,

        reference_id:
          referenceId,
      });


      try {
        const response = await request(
          (
            "/farmer/contracts/"
            + `messages/${query}`
          ),
          {
            method: "GET",
            throwOnError: true,
          }
        );


        const data = (
          unwrapData(
            response
          )
        );


        const items = (
          normalizeList(
            data
          )
        );


        setMessages(
          items
        );


        return items;
      }

      catch (err) {
        setError(
          getErrorMessage(
            err,
            "Unable to load messages."
          )
        );


        setMessages(
          []
        );


        return null;
      }

      finally {
        setIsLoadingMessages(
          false
        );
      }
    },
    [
      request,
    ]
  );


  // ==========================================================
  // SELECT MESSAGE THREAD
  // ==========================================================

  const selectMessageThread = useCallback(
    async (
      thread
    ) => {
      if (!thread) {
        setSelectedMessageThread(
          null
        );

        setMessages(
          []
        );

        return null;
      }


      setSelectedMessageThread(
        thread
      );


      return loadMessages({
        supplierProfileId:
          thread.supplier_profile_id,

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


  // ==========================================================
  // SEND FARMER MESSAGE
  // ==========================================================

  const sendMessage = useCallback(
    async ({
      supplierProfileId,
      referenceType,
      referenceId,
      messageText,
    }) => {
      setError("");


      const cleanedMessage = (
        String(
          messageText || ""
        ).trim()
      );


      if (!cleanedMessage) {
        setError(
          "Message cannot be empty."
        );

        return null;
      }


      const result = await runWrite(
        "/farmer/contracts/messages/",
        {
          method: "POST",

          body: {
            supplier_profile_id:
              supplierProfileId,

            reference_type:
              referenceType,

            reference_id:
              referenceId,

            message_text:
              cleanedMessage,
          },
        }
      );


      // ====================================================
      // PROFANITY BLOCKED
      // ====================================================
      //
      // Important:
      //
      // Do NOT reload/clear the conversation textbox here.
      // The page should keep the typed text so the Farmer
      // can edit it after closing ProfanityBlockModal.
      // ====================================================

      if (
        result?.code ===
        "PROFANITY_DETECTED"
      ) {
        return result;
      }


      // ====================================================
      // SEND FAILED
      // ====================================================

      if (!result) {
        return null;
      }


      // ====================================================
      // SUCCESS
      //
      // Refresh:
      // 1. selected conversation
      // 2. sidebar thread/latest message
      // ====================================================

      await Promise.all([
        loadMessages({
          supplierProfileId,
          referenceType,
          referenceId,
        }),

        loadMessageThreads(),
      ]);


      return result;
    },
    [
      runWrite,
      loadMessages,
      loadMessageThreads,
    ]
  );


  // ==========================================================
  // CLEAR MESSAGE CONVERSATION
  // ==========================================================

  const clearMessageConversation = useCallback(
    () => {
      setSelectedMessageThread(
        null
      );

      setMessages(
        []
      );
    },
    []
  );


  // ==========================================================
  // RETURN
  // ==========================================================

  return {
    // --------------------------------------------------------
    // DATA
    // --------------------------------------------------------

    applications,
    biddings,
    opportunities,
    contracts,

    messageThreads,
    messages,


    // --------------------------------------------------------
    // SELECTED
    // --------------------------------------------------------

    selectedApplication,
    selectedBidding,
    selectedOffer,
    selectedOpportunity,
    selectedContract,

    selectedMessageThread,


    // --------------------------------------------------------
    // STATE
    // --------------------------------------------------------

    isLoading,
    isSaving,
    isLoadingMessages,

    error,

    profanityBlock,


    // --------------------------------------------------------
    // SETTERS
    // --------------------------------------------------------

    setApplications,
    setBiddings,
    setOpportunities,
    setContracts,

    setSelectedApplication,
    setSelectedBidding,
    setSelectedOffer,
    setSelectedOpportunity,
    setSelectedContract,

    setMessageThreads,
    setMessages,
    setSelectedMessageThread,


    // --------------------------------------------------------
    // GENERAL
    // --------------------------------------------------------

    clearError,
    clearProfanityBlock,


    // --------------------------------------------------------
    // APPLICATIONS
    // --------------------------------------------------------

    loadApplications,
    loadApplicationDetails,
    cancelApplication,


    // --------------------------------------------------------
    // OFFERS / BIDDINGS
    // --------------------------------------------------------

    loadBiddings,
    createBidding,
    loadBiddingDetails,

    loadOfferDetails,
    acceptOffer,
    declineOffer,


    // --------------------------------------------------------
    // OPPORTUNITIES
    // --------------------------------------------------------

    loadOpportunities,
    loadOpportunityDetails,
    submitApplication,


    // --------------------------------------------------------
    // CURRENT CONTRACTS
    // --------------------------------------------------------

    loadContracts,
    loadContractDetails,
    requestVoid,


    // --------------------------------------------------------
    // MESSAGES
    // --------------------------------------------------------

    loadMessageThreads,
    loadMessages,
    selectMessageThread,
    sendMessage,
    clearMessageConversation,
  };
}