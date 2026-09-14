import {
  useCallback,
  useState,
} from "react";

import useApi from "../useApi";


const API_BASE =
  "/miller/contracts";


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


function buildContractsQuery({
  search = "",
  status = "",
  productType = "",
  riceVariety = "",
  year = "",
  month = "",
  sortBy = "newest",
} = {}) {
  const params =
    new URLSearchParams();


  const normalizedSearch =
    String(
      search || ""
    ).trim();


  if (normalizedSearch) {
    params.set(
      "search",
      normalizedSearch
    );
  }


  if (status) {
    params.set(
      "status",
      status
    );
  }


  if (productType) {
    params.set(
      "product_type",
      productType
    );
  }


  if (riceVariety) {
    params.set(
      "rice_variety",
      riceVariety
    );
  }


  if (year) {
    params.set(
      "year",
      year
    );
  }


  if (month) {
    params.set(
      "month",
      month
    );
  }


  params.set(
    "sort_by",
    sortBy || "newest"
  );


  return params.toString();
}


// ============================================================
// HOOK
// ============================================================

export default function useMillerCurrentContracts() {
  const {
    request,
  } = useApi();


  // ==========================================================
  // CONTRACT LIST
  // ==========================================================

  const [
    contracts,
    setContracts,
  ] = useState([]);


  const [
    isContractsLoading,
    setIsContractsLoading,
  ] = useState(false);


  const [
    contractsError,
    setContractsError,
  ] = useState("");


  // ==========================================================
  // SELECTED CONTRACT
  // ==========================================================

  const [
    selectedContract,
    setSelectedContract,
  ] = useState(null);


  const [
    isContractLoading,
    setIsContractLoading,
  ] = useState(false);


  const [
    contractError,
    setContractError,
  ] = useState("");


  // ==========================================================
  // ACTIONS
  // ==========================================================

  const [
    isActionLoading,
    setIsActionLoading,
  ] = useState(false);


  const [
    actionError,
    setActionError,
  ] = useState("");


  // ==========================================================
  // MESSAGES
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
  // LOAD CURRENT CONTRACTS
  // ==========================================================

  const loadContracts =
    useCallback(
      async (
        filters = {}
      ) => {
        setIsContractsLoading(
          true
        );

        setContractsError(
          ""
        );


        try {
          const query =
            buildContractsQuery(
              filters
            );


          const payload =
            await request(
              `${API_BASE}/current/?${query}`,
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


          setContracts(
            rows
          );


          return rows;

        } catch (
          error
        ) {
          const message =
            error?.message
            || "Unable to load Current Contracts.";


          setContractsError(
            message
          );


          setContracts(
            []
          );


          throw error;

        } finally {
          setIsContractsLoading(
            false
          );
        }
      },
      [
        request,
      ]
    );


  // ==========================================================
  // LOAD CONTRACT DETAILS
  // ==========================================================

  const loadContractDetails =
    useCallback(
      async (
        contractId
      ) => {
        if (!contractId) {
          throw new Error(
            "Invalid Contract ID."
          );
        }


        setIsContractLoading(
          true
        );

        setContractError(
          ""
        );


        try {
          const payload =
            await request(
              `${API_BASE}/current/${encodeURIComponent(
                contractId
              )}/`,
              {
                method:
                  "GET",

                throwOnError:
                  true,
              }
            );


          const data =
            normalizePayloadData(
              payload
            );


          const contract =
            data?.contract
            || data
            || null;


          setSelectedContract(
            contract
          );


          return contract;

        } catch (
          error
        ) {
          setContractError(
            error?.message
            || "Unable to load Contract details."
          );


          setSelectedContract(
            null
          );


          throw error;

        } finally {
          setIsContractLoading(
            false
          );
        }
      },
      [
        request,
      ]
    );


  // ==========================================================
  // SIGN CONTRACT
  // ==========================================================

  const signContract =
    useCallback(
      async (
        contractId,
        signatureDataUrl
      ) => {
        if (!contractId) {
          throw new Error(
            "Invalid Contract ID."
          );
        }


        if (
          !String(
            signatureDataUrl
            || ""
          ).startsWith(
            "data:image/"
          )
        ) {
          throw new Error(
            "Please draw your electronic signature first."
          );
        }


        setIsActionLoading(
          true
        );

        setActionError(
          ""
        );


        try {
          const payload =
            await request(
              `${API_BASE}/current/${encodeURIComponent(
                contractId
              )}/sign/`,
              {
                method:
                  "POST",

                body: {
                  miller_signature_path:
                    signatureDataUrl,
                },

                throwOnError:
                  true,
              }
            );


          return normalizePayloadData(
            payload
          );

        } catch (
          error
        ) {
          setActionError(
            error?.message
            || "Unable to sign the Contract."
          );


          throw error;

        } finally {
          setIsActionLoading(
            false
          );
        }
      },
      [
        request,
      ]
    );


  // ==========================================================
  // MARK COMPLETED
  // ==========================================================

  const completeContract =
    useCallback(
      async (
        contractId
      ) => {
        if (!contractId) {
          throw new Error(
            "Invalid Contract ID."
          );
        }


        setIsActionLoading(
          true
        );

        setActionError(
          ""
        );


        try {
          const payload =
            await request(
              `${API_BASE}/current/${encodeURIComponent(
                contractId
              )}/complete/`,
              {
                method:
                  "POST",

                throwOnError:
                  true,
              }
            );


          return normalizePayloadData(
            payload
          );

        } catch (
          error
        ) {
          setActionError(
            error?.message
            || "Unable to mark the Contract as completed."
          );


          throw error;

        } finally {
          setIsActionLoading(
            false
          );
        }
      },
      [
        request,
      ]
    );


  // ==========================================================
  // REQUEST VOID
  // ==========================================================

  const requestVoid =
    useCallback(
      async (
        contractId,
        {
          reason,
          remarks = "",
        }
      ) => {
        if (!contractId) {
          throw new Error(
            "Invalid Contract ID."
          );
        }


        const normalizedReason =
          String(
            reason || ""
          ).trim();


        if (!normalizedReason) {
          throw new Error(
            "Reason for void request is required."
          );
        }


        setIsActionLoading(
          true
        );

        setActionError(
          ""
        );


        try {
          const payload =
            await request(
              `${API_BASE}/current/${encodeURIComponent(
                contractId
              )}/void-request/`,
              {
                method:
                  "POST",

                body: {
                  void_reason:
                    normalizedReason,

                  void_remarks:
                    String(
                      remarks || ""
                    ).trim(),
                },

                throwOnError:
                  true,
              }
            );


          return normalizePayloadData(
            payload
          );

        } catch (
          error
        ) {
          setActionError(
            error?.message
            || "Unable to submit the void request."
          );


          throw error;

        } finally {
          setIsActionLoading(
            false
          );
        }
      },
      [
        request,
      ]
    );


  // ==========================================================
  // LOAD CONTRACT MESSAGES
  // ==========================================================

  const loadContractMessages =
    useCallback(
      async (
        contract
      ) => {
        if (
          !contract?.contract_id
          || !contract?.farmer_user_id
        ) {
          throw new Error(
            "Contract conversation information is incomplete."
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
                  contract.farmer_user_id
                ),

              reference_type:
                "contract",

              reference_id:
                String(
                  contract.contract_id
                ),
            });


          const payload =
            await request(
              `${API_BASE}/messages/conversation/?${params.toString()}`,
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
          setMessagesError(
            error?.message
            || "Unable to load the Contract conversation."
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
  // SEND CONTRACT MESSAGE
  // ==========================================================

  const sendContractMessage =
    useCallback(
      async (
        contract,
        messageText
      ) => {
        if (
          !contract?.contract_id
          || !contract?.farmer_user_id
        ) {
          throw new Error(
            "Contract conversation information is incomplete."
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
          normalizedMessage.length
          > 5000
        ) {
          throw new Error(
            "Message cannot exceed 5000 characters."
          );
        }


        setIsActionLoading(
          true
        );

        setActionError(
          ""
        );


        try {
          const payload =
            await request(
              `${API_BASE}/messages/send/`,
              {
                method:
                  "POST",

                body: {
                  farmer_user_id:
                    contract.farmer_user_id,

                  reference_type:
                    "contract",

                  reference_id:
                    contract.contract_id,

                  message_text:
                    normalizedMessage,
                },

                throwOnError:
                  true,
              }
            );


          await loadContractMessages(
            contract
          );


          return normalizePayloadData(
            payload
          );

        } catch (
          error
        ) {
          const blocked =
            Boolean(
              error?.payload?.blocked
            );


          const message =
            error?.payload?.message
            || error?.message
            || (
              blocked
                ? "Message blocked by GrainRise chat moderation."
                : "Unable to send the message."
            );


          setActionError(
            message
          );


          throw error;

        } finally {
          setIsActionLoading(
            false
          );
        }
      },
      [
        request,
        loadContractMessages,
      ]
    );


  // ==========================================================
  // CLEAR
  // ==========================================================

  const clearSelectedContract =
    useCallback(
      () => {
        setSelectedContract(
          null
        );

        setContractError(
          ""
        );

        setActionError(
          ""
        );

        setMessages(
          []
        );

        setMessagesError(
          ""
        );
      },
      []
    );


  const clearActionError =
    useCallback(
      () => {
        setActionError(
          ""
        );
      },
      []
    );


  // ==========================================================
  // RETURN
  // ==========================================================

  return {
    contracts,
    isContractsLoading,
    contractsError,

    selectedContract,
    isContractLoading,
    contractError,

    messages,
    isMessagesLoading,
    messagesError,

    isActionLoading,
    actionError,

    loadContracts,
    loadContractDetails,

    signContract,
    completeContract,
    requestVoid,

    loadContractMessages,
    sendContractMessage,

    clearSelectedContract,
    clearActionError,
  };
}