import {
  useCallback,
  useState,
} from "react";

import useApi from "../useApi";


// ============================================================
// GRAINRISE
// FARMER > TRANSACTION HISTORY HOOK
// ============================================================
//
// TABS:
//
// 1. POS Transactions
// 2. Contract History
//
//
// BACKEND:
//
// GET /farmer/transaction-history/pos/
//
// GET /farmer/transaction-history/pos/summary/
//
// GET /farmer/transaction-history/contracts/
//
// GET /farmer/transaction-history/contracts/<contract_id>/
//
//
// SECURITY:
//
// Farmer ID is NOT sent by this hook.
//
// Backend determines Farmer ownership using the authenticated
// Farmer JWT/session.
//
// ============================================================


// ============================================================
// DEFAULT PAGINATION
// ============================================================

const DEFAULT_PAGINATION = {
  page: 1,
  page_size: 10,
  total_items: 0,
  total_pages: 0,
  has_previous: false,
  has_next: false,
};


// ============================================================
// DEFAULT POS SUMMARY
// ============================================================

const DEFAULT_POS_SUMMARY = {
  completed_transactions: 0,
  product_lines_sold: 0,
  total_quantity_sold_kg: 0,
  total_revenue: 0,
};


// ============================================================
// RESPONSE HELPER
// ============================================================

const unwrapData = (
  response
) => {

  if (
    response
    &&
    typeof response === "object"
    &&
    Object.prototype.hasOwnProperty.call(
      response,
      "data"
    )
  ) {

    return response.data;

  }


  return response;

};


// ============================================================
// ERROR MESSAGE
// ============================================================

const getErrorMessage = (
  error,
  fallback
) => {

  return (
    error?.data?.message
    ||
    error?.message
    ||
    fallback
  );

};


// ============================================================
// NUMBER HELPER
// ============================================================

const toNumber = (
  value,
  fallback = 0
) => {

  if (
    value === null
    ||
    value === undefined
    ||
    value === ""
  ) {

    return fallback;

  }


  const number =
    Number(
      value
    );


  return Number.isFinite(
    number
  )
    ? number
    : fallback;

};


// ============================================================
// NULLABLE NUMBER
// ============================================================

const toNullableNumber = (
  value
) => {

  if (
    value === null
    ||
    value === undefined
    ||
    value === ""
  ) {

    return null;

  }


  const number =
    Number(
      value
    );


  return Number.isFinite(
    number
  )
    ? number
    : null;

};


// ============================================================
// PAGINATION NORMALIZER
// ============================================================

const normalizePagination = (
  pagination
) => {

  if (
    !pagination
    ||
    typeof pagination !== "object"
  ) {

    return {
      ...DEFAULT_PAGINATION,
    };

  }


  return {

    page:
      toNumber(
        pagination.page,
        1
      ),

    page_size:
      toNumber(
        pagination.page_size,
        10
      ),

    total_items:
      toNumber(
        pagination.total_items,
        0
      ),

    total_pages:
      toNumber(
        pagination.total_pages,
        0
      ),

    has_previous:
      Boolean(
        pagination.has_previous
      ),

    has_next:
      Boolean(
        pagination.has_next
      ),

  };

};


// ============================================================
// POS TRANSACTION NORMALIZER
// ============================================================

const normalizePosTransaction = (
  transaction
) => {

  if (
    !transaction
    ||
    typeof transaction !== "object"
  ) {

    return null;

  }


  return {

    ...transaction,


    transaction_id:
      transaction.transaction_id,


    transaction_code:
      transaction.transaction_code
      || "",


    transaction_date:
      transaction.transaction_date
      || null,


    buyer_name:
      transaction.buyer_name
      || "",


    transaction_type:
      transaction.transaction_type
      || "Sale",


    product_type:
      transaction.product_type
      || "",


    rice_variety:
      transaction.rice_variety
      || "",


    product_grade:
      transaction.product_grade
      || "",


    quantity_sold_kg:
      toNumber(
        transaction.quantity_sold_kg
      ),


    selling_price_per_kg:
      toNumber(
        transaction.selling_price_per_kg
      ),


    amount:
      toNumber(
        transaction.amount
      ),


    payment_method:
      transaction.payment_method
      || "",


    transaction_status:
      transaction.transaction_status
      || "",

  };

};


// ============================================================
// POS LIST NORMALIZER
// ============================================================

const normalizePosResult = (
  payload
) => {

  const rawItems =
    Array.isArray(
      payload?.items
    )
      ? payload.items
      : [];


  return {

    items:
      rawItems
        .map(
          normalizePosTransaction
        )
        .filter(
          Boolean
        ),


    pagination:
      normalizePagination(
        payload?.pagination
      ),

  };

};


// ============================================================
// POS SUMMARY NORMALIZER
// ============================================================

const normalizePosSummary = (
  payload
) => {

  return {

    completed_transactions:
      toNumber(
        payload?.completed_transactions
      ),


    product_lines_sold:
      toNumber(
        payload?.product_lines_sold
      ),


    total_quantity_sold_kg:
      toNumber(
        payload?.total_quantity_sold_kg
      ),


    total_revenue:
      toNumber(
        payload?.total_revenue
      ),

  };

};


// ============================================================
// CONTRACT HISTORY NORMALIZER
// ============================================================

const normalizeContractHistory = (
  contract
) => {

  if (
    !contract
    ||
    typeof contract !== "object"
  ) {

    return null;

  }


  return {

    ...contract,


    contract_id:
      contract.contract_id,


    contract_code:
      contract.contract_code
      || "",


    contract_date:
      contract.contract_date
      || null,


    product_code:
      contract.product_code
      || "",


    product_type:
      contract.product_type
      || "",


    rice_variety:
      contract.rice_variety
      || "",


    product_grade:
      contract.product_grade
      || "",


    contracted_quantity_kg:
      toNumber(
        contract.contracted_quantity_kg
      ),


    agreed_price_per_kg:
      toNumber(
        contract.agreed_price_per_kg
      ),


    contract_status:
      contract.contract_status
      || "",

  };

};


// ============================================================
// CONTRACT LIST NORMALIZER
// ============================================================

const normalizeContractResult = (
  payload
) => {

  const rawItems =
    Array.isArray(
      payload?.items
    )
      ? payload.items
      : [];


  return {

    items:
      rawItems
        .map(
          normalizeContractHistory
        )
        .filter(
          Boolean
        ),


    pagination:
      normalizePagination(
        payload?.pagination
      ),

  };

};


// ============================================================
// CONTRACT DETAILS NORMALIZER
// ============================================================

const normalizeContractDetails = (
  contract
) => {

  if (
    !contract
    ||
    typeof contract !== "object"
  ) {

    return null;

  }


  return {

    ...contract,


    contract_id:
      contract.contract_id,


    contracted_quantity_kg:
      toNumber(
        contract.contracted_quantity_kg
      ),


    agreed_price_per_kg:
      toNumber(
        contract.agreed_price_per_kg
      ),


    total_contract_value:
      toNumber(
        contract.total_contract_value
      ),


    quantity_fulfilled_kg:
      toNumber(
        contract.quantity_fulfilled_kg
      ),


    remaining_quantity_kg:
      toNumber(
        contract.remaining_quantity_kg
      ),


    farm_id:
      contract.farm_id
      ?? null,


    supplier_profile_id:
      contract.supplier_profile_id
      ?? null,


    created_at:
      contract.created_at
      || null,


    updated_at:
      contract.updated_at
      || null,


    contract_start_date:
      contract.contract_start_date
      || null,


    fulfillment_date:
      contract.fulfillment_date
      || null,


    farmer_signed_at:
      contract.farmer_signed_at
      || null,


    miller_signed_at:
      contract.miller_signed_at
      || null,


    void_requested_at:
      contract.void_requested_at
      || null,


    latitude:
      toNullableNumber(
        contract.latitude
      ),


    longitude:
      toNullableNumber(
        contract.longitude
      ),

  };

};


// ============================================================
// QUERY BUILDER
// ============================================================

const buildQuery = (
  filters = {}
) => {

  const params =
    new URLSearchParams();


  Object.entries(
    filters
  ).forEach(
    (
      [
        key,
        value,
      ]
    ) => {

      if (
        value === undefined
        ||
        value === null
        ||
        String(
          value
        ).trim() === ""
      ) {

        return;

      }


      params.set(
        key,
        String(
          value
        ).trim()
      );

    }
  );


  const query =
    params.toString();


  return query
    ? `?${query}`
    : "";

};


// ============================================================
// HOOK
// ============================================================

const useFarmerTransactionHistory =
  () => {

    const {
      request,
    } = useApi();


    // ========================================================
    // POS TRANSACTIONS
    // ========================================================

    const [
      posTransactions,
      setPosTransactions,
    ] = useState(
      []
    );


    const [
      posPagination,
      setPosPagination,
    ] = useState(
      DEFAULT_PAGINATION
    );


    const [
      posSummary,
      setPosSummary,
    ] = useState(
      DEFAULT_POS_SUMMARY
    );


    // ========================================================
    // CONTRACT HISTORY
    // ========================================================

    const [
      contractHistory,
      setContractHistory,
    ] = useState(
      []
    );


    const [
      contractPagination,
      setContractPagination,
    ] = useState(
      DEFAULT_PAGINATION
    );


    const [
      selectedContract,
      setSelectedContract,
    ] = useState(
      null
    );


    // ========================================================
    // LOADING STATES
    // ========================================================

    const [
      isLoadingPos,
      setIsLoadingPos,
    ] = useState(
      false
    );


    const [
      isLoadingPosSummary,
      setIsLoadingPosSummary,
    ] = useState(
      false
    );


    const [
      isLoadingContracts,
      setIsLoadingContracts,
    ] = useState(
      false
    );


    const [
      isLoadingContractDetails,
      setIsLoadingContractDetails,
    ] = useState(
      false
    );


    // ========================================================
    // ERROR
    // ========================================================

    const [
      error,
      setError,
    ] = useState(
      ""
    );


    // ========================================================
    // LOAD POS TRANSACTIONS
    // ========================================================
    //
    // UI FILTER FORMAT:
    //
    // {
    //   search: "",
    //   paymentMethod: "",
    //   transactionStatus: "",
    //   year: "",
    //   month: "",
    //   sortBy: "newest",
    //   page: 1,
    //   pageSize: 10
    // }
    //
    // ========================================================

    const loadPosTransactions =
      useCallback(
        async (
          filters = {}
        ) => {

          setIsLoadingPos(
            true
          );


          setError(
            ""
          );


          const query =
            buildQuery(
              {
                search:
                  filters.search,

                payment_method:
                  filters.paymentMethod,

                transaction_status:
                  filters.transactionStatus,

                year:
                  filters.year,

                month:
                  filters.month,

                sort_by:
                  filters.sortBy
                  || "newest",

                page:
                  filters.page
                  || 1,

                page_size:
                  filters.pageSize
                  || 10,
              }
            );


          try {

            const response =
              await request(
                `/farmer/transaction-history/pos/${query}`,
                {
                  method: "GET",
                  throwOnError: true,
                }
              );


            const payload =
              unwrapData(
                response
              );


            const normalized =
              normalizePosResult(
                payload
              );


            setPosTransactions(
              normalized.items
            );


            setPosPagination(
              normalized.pagination
            );


            return normalized;


          } catch (
            err
          ) {

            const message =
              getErrorMessage(
                err,
                (
                  "Unable to load POS " +
                  "Transaction History."
                )
              );


            setError(
              message
            );


            setPosTransactions(
              []
            );


            setPosPagination(
              {
                ...DEFAULT_PAGINATION,
              }
            );


            throw err;


          } finally {

            setIsLoadingPos(
              false
            );

          }

        },
        [
          request,
        ]
      );


    // ========================================================
    // LOAD POS SUMMARY
    // ========================================================

    const loadPosSummary =
      useCallback(
        async () => {

          setIsLoadingPosSummary(
            true
          );


          setError(
            ""
          );


          try {

            const response =
              await request(
                "/farmer/transaction-history/pos/summary/",
                {
                  method: "GET",
                  throwOnError: true,
                }
              );


            const payload =
              unwrapData(
                response
              );


            const normalized =
              normalizePosSummary(
                payload
              );


            setPosSummary(
              normalized
            );


            return normalized;


          } catch (
            err
          ) {

            const message =
              getErrorMessage(
                err,
                (
                  "Unable to load POS " +
                  "transaction summary."
                )
              );


            setError(
              message
            );


            setPosSummary(
              {
                ...DEFAULT_POS_SUMMARY,
              }
            );


            throw err;


          } finally {

            setIsLoadingPosSummary(
              false
            );

          }

        },
        [
          request,
        ]
      );


    // ========================================================
    // LOAD CONTRACT HISTORY
    // ========================================================
    //
    // TABLE:
    //
    // Contract ID
    // Date
    // Product
    // Qty
    // Price/kg
    // Action
    //
    //
    // UI FILTER FORMAT:
    //
    // {
    //   search: "",
    //   year: "",
    //   month: "",
    //   sortBy: "newest",
    //   page: 1,
    //   pageSize: 10
    // }
    //
    // ========================================================

    const loadContractHistory =
      useCallback(
        async (
          filters = {}
        ) => {

          setIsLoadingContracts(
            true
          );


          setError(
            ""
          );


          const query =
            buildQuery(
              {
                search:
                  filters.search,

                year:
                  filters.year,

                month:
                  filters.month,

                sort_by:
                  filters.sortBy
                  || "newest",

                page:
                  filters.page
                  || 1,

                page_size:
                  filters.pageSize
                  || 10,
              }
            );


          try {

            const response =
              await request(
                `/farmer/transaction-history/contracts/${query}`,
                {
                  method: "GET",
                  throwOnError: true,
                }
              );


            const payload =
              unwrapData(
                response
              );


            const normalized =
              normalizeContractResult(
                payload
              );


            setContractHistory(
              normalized.items
            );


            setContractPagination(
              normalized.pagination
            );


            return normalized;


          } catch (
            err
          ) {

            const message =
              getErrorMessage(
                err,
                "Unable to load Contract History."
              );


            setError(
              message
            );


            setContractHistory(
              []
            );


            setContractPagination(
              {
                ...DEFAULT_PAGINATION,
              }
            );


            throw err;


          } finally {

            setIsLoadingContracts(
              false
            );

          }

        },
        [
          request,
        ]
      );


    // ========================================================
    // LOAD CONTRACT HISTORY DETAILS
    // ========================================================
    //
    // Used by:
    //
    // Contract History
    //      ↓
    // View Details
    //
    // ========================================================

    const loadContractDetails =
      useCallback(
        async (
          contractId
        ) => {

          if (
            !contractId
          ) {

            throw new Error(
              "Contract ID is required."
            );

          }


          setIsLoadingContractDetails(
            true
          );


          setError(
            ""
          );


          try {

            const response =
              await request(
                (
                  "/farmer/transaction-history/" +
                  `contracts/${contractId}/`
                ),
                {
                  method: "GET",
                  throwOnError: true,
                }
              );


            const payload =
              unwrapData(
                response
              );


            const normalized =
              normalizeContractDetails(
                payload
              );


            setSelectedContract(
              normalized
            );


            return normalized;


          } catch (
            err
          ) {

            const message =
              getErrorMessage(
                err,
                (
                  "Unable to load Contract " +
                  "History details."
                )
              );


            setError(
              message
            );


            setSelectedContract(
              null
            );


            throw err;


          } finally {

            setIsLoadingContractDetails(
              false
            );

          }

        },
        [
          request,
        ]
      );


    // ========================================================
    // CLEAR SELECTED CONTRACT
    // ========================================================

    const clearSelectedContract =
      useCallback(
        () => {

          setSelectedContract(
            null
          );

        },
        []
      );


    // ========================================================
    // CLEAR ERROR
    // ========================================================

    const clearError =
      useCallback(
        () => {

          setError(
            ""
          );

        },
        []
      );


    // ========================================================
    // RETURN
    // ========================================================

    return {

      // ======================================================
      // POS DATA
      // ======================================================

      posTransactions,

      posPagination,

      posSummary,


      // ======================================================
      // CONTRACT DATA
      // ======================================================

      contractHistory,

      contractPagination,

      selectedContract,


      // ======================================================
      // LOADING
      // ======================================================

      isLoadingPos,

      isLoadingPosSummary,

      isLoadingContracts,

      isLoadingContractDetails,


      // ======================================================
      // ERROR
      // ======================================================

      error,


      // ======================================================
      // POS ACTIONS
      // ======================================================

      loadPosTransactions,

      loadPosSummary,


      // ======================================================
      // CONTRACT ACTIONS
      // ======================================================

      loadContractHistory,

      loadContractDetails,

      clearSelectedContract,


      // ======================================================
      // COMMON
      // ======================================================

      clearError,

    };

  };


export default useFarmerTransactionHistory;