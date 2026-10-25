import {
  useCallback,
  useEffect,
  useState,
} from "react";

import useApi from "../useApi";


// ============================================================
// DEFAULT VALUES
// ============================================================

const DEFAULT_COUNTS = {
  to_review: 0,
  active: 0,
  inactive: 0,
};


// ============================================================
// HELPERS
// ============================================================

const normalizeTab = (
  tab
) => {
  if (
    tab === "active"
  ) {
    return "active";
  }

  if (
    tab === "inactive"
  ) {
    return "inactive";
  }

  return "to-review";
};


const normalizeCounts = (
  counts
) => ({
  to_review:
    Number(
      counts?.to_review ||
      0
    ),

  active:
    Number(
      counts?.active ||
      0
    ),

  inactive:
    Number(
      counts?.inactive ||
      0
    ),
});


const normalizeRetailerRow = (
  row
) => ({
  id:
    row?.id,

  retailer:
    row?.retailer_name ||
    row?.retailer ||
    "",

  email:
    row?.email ||
    "",

  contact:
    row?.contact_number ||
    row?.contact ||
    "",

  username:
    row?.username ||
    "",

  status:
    row?.status ||
    "",

  archiveReason:
    row?.archive_reason ||
    row?.archiveReason ||
    "",

  archivedAt:
    row?.archived_at ||
    row?.archivedAt ||
    null,

  joined:
    row?.created_at ||
    row?.joined ||
    null,

  updatedAt:
    row?.updated_at ||
    row?.updatedAt ||
    null,
});


// ============================================================
// RETAILER MANAGEMENT HOOK
// ============================================================

const useRetailerManagement = () => {
  const {
    request,
  } =
    useApi();


  // =========================================================
  // CURRENT TAB
  // =========================================================

  const [
    activeTab,
    setActiveTab,
  ] =
    useState(
      "to-review"
    );


  // =========================================================
  // DATA
  // =========================================================

  const [
    rows,
    setRows,
  ] =
    useState([]);


  const [
    counts,
    setCounts,
  ] =
    useState(
      DEFAULT_COUNTS
    );


  // =========================================================
  // LOADING STATES
  // =========================================================

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(false);


  const [
    isDetailsLoading,
    setIsDetailsLoading,
  ] =
    useState(false);


  const [
    isConfirming,
    setIsConfirming,
  ] =
    useState(false);


  const [
    isArchiving,
    setIsArchiving,
  ] =
    useState(false);


  const [
    isRestoring,
    setIsRestoring,
  ] =
    useState(false);


  const [
    isDeleting,
    setIsDeleting,
  ] =
    useState(false);


  // =========================================================
  // ERROR
  // =========================================================

  const [
    error,
    setError,
  ] =
    useState("");


  // =========================================================
  // LOAD RETAILERS
  // =========================================================

  const loadRetailers =
    useCallback(
      async (
        tab = "to-review"
      ) => {
        const normalizedTab =
          normalizeTab(
            tab
          );


        setIsLoading(
          true
        );

        setError(
          ""
        );


        try {
          const response =
            await request(
              `/admin/retailers/?tab=${encodeURIComponent(
                normalizedTab
              )}`,
              {
                throwOnError:
                  true,
              }
            );


          const normalizedRows =
            Array.isArray(
              response?.results
            )
              ? response.results.map(
                  normalizeRetailerRow
                )
              : [];


          setRows(
            normalizedRows
          );


          setCounts(
            normalizeCounts(
              response?.counts
            )
          );


          return normalizedRows;

        } catch (
          requestError
        ) {
          const message =
            requestError?.message ||
            "Unable to load Retailer accounts.";


          setRows(
            []
          );

          setError(
            message
          );


          throw requestError;

        } finally {
          setIsLoading(
            false
          );
        }
      },
      [
        request,
      ]
    );


  // =========================================================
  // CHANGE TAB
  // =========================================================

  const changeTab =
    useCallback(
      (
        tab
      ) => {
        setActiveTab(
          normalizeTab(
            tab
          )
        );
      },
      []
    );


  // =========================================================
  // GET RETAILER DETAILS
  //
  // Used by:
  // - To Review -> Review
  // - Active -> View Details
  // - Inactive -> View Details
  // =========================================================

  const getRetailerDetails =
    useCallback(
      async (
        userId
      ) => {
        if (!userId) {
          throw new Error(
            "Retailer user ID is required."
          );
        }


        setIsDetailsLoading(
          true
        );

        setError(
          ""
        );


        try {
          const response =
            await request(
              `/admin/retailers/${userId}/`,
              {
                throwOnError:
                  true,
              }
            );


          return (
            response?.retailer ||
            null
          );

        } catch (
          requestError
        ) {
          const message =
            requestError?.message ||
            "Unable to load Retailer details.";


          setError(
            message
          );


          throw requestError;

        } finally {
          setIsDetailsLoading(
            false
          );
        }
      },
      [
        request,
      ]
    );


  // =========================================================
  // CONFIRM RETAILER
  //
  // inactive -> active
  // =========================================================

  const confirmRetailer =
    useCallback(
      async (
        userId
      ) => {
        if (!userId) {
          throw new Error(
            "Retailer user ID is required."
          );
        }


        setIsConfirming(
          true
        );

        setError(
          ""
        );


        try {
          const response =
            await request(
              `/admin/retailers/${userId}/confirm/`,
              {
                method:
                  "POST",

                throwOnError:
                  true,
              }
            );


          await loadRetailers(
            activeTab
          );


          return response;

        } catch (
          requestError
        ) {
          const message =
            requestError?.message ||
            "Unable to confirm Retailer application.";


          setError(
            message
          );


          throw requestError;

        } finally {
          setIsConfirming(
            false
          );
        }
      },
      [
        activeTab,
        loadRetailers,
        request,
      ]
    );


  // =========================================================
  // ARCHIVE RETAILER
  //
  // active -> archived
  // reason required
  // =========================================================

  const archiveRetailer =
    useCallback(
      async (
        userId,
        reason
      ) => {
        if (!userId) {
          throw new Error(
            "Retailer user ID is required."
          );
        }


        const cleanedReason =
          String(
            reason ||
            ""
          ).trim();


        if (!cleanedReason) {
          throw new Error(
            "Archive reason is required."
          );
        }


        setIsArchiving(
          true
        );

        setError(
          ""
        );


        try {
          const response =
            await request(
              `/admin/retailers/${userId}/archive/`,
              {
                method:
                  "POST",

                body: {
                  reason:
                    cleanedReason,
                },

                throwOnError:
                  true,
              }
            );


          await loadRetailers(
            activeTab
          );


          return response;

        } catch (
          requestError
        ) {
          const message =
            requestError?.message ||
            "Unable to archive Retailer account.";


          setError(
            message
          );


          throw requestError;

        } finally {
          setIsArchiving(
            false
          );
        }
      },
      [
        activeTab,
        loadRetailers,
        request,
      ]
    );


  // =========================================================
  // RESTORE RETAILER
  //
  // archived / deactivated -> active
  // =========================================================

  const restoreRetailer =
    useCallback(
      async (
        userId
      ) => {
        if (!userId) {
          throw new Error(
            "Retailer user ID is required."
          );
        }


        setIsRestoring(
          true
        );

        setError(
          ""
        );


        try {
          const response =
            await request(
              `/admin/retailers/${userId}/restore/`,
              {
                method:
                  "POST",

                throwOnError:
                  true,
              }
            );


          await loadRetailers(
            activeTab
          );


          return response;

        } catch (
          requestError
        ) {
          const message =
            requestError?.message ||
            "Unable to restore Retailer account.";


          setError(
            message
          );


          throw requestError;

        } finally {
          setIsRestoring(
            false
          );
        }
      },
      [
        activeTab,
        loadRetailers,
        request,
      ]
    );


  // =========================================================
  // DELETE RETAILER
  //
  // archived / deactivated only
  // =========================================================

  const deleteRetailer =
    useCallback(
      async (
        userId
      ) => {
        if (!userId) {
          throw new Error(
            "Retailer user ID is required."
          );
        }


        setIsDeleting(
          true
        );

        setError(
          ""
        );


        try {
          const response =
            await request(
              `/admin/retailers/${userId}/delete/`,
              {
                method:
                  "POST",

                throwOnError:
                  true,
              }
            );


          await loadRetailers(
            activeTab
          );


          return response;

        } catch (
          requestError
        ) {
          const message =
            requestError?.message ||
            "Unable to permanently delete Retailer account.";


          setError(
            message
          );


          throw requestError;

        } finally {
          setIsDeleting(
            false
          );
        }
      },
      [
        activeTab,
        loadRetailers,
        request,
      ]
    );


  // =========================================================
  // REFRESH CURRENT TAB
  // =========================================================

  const refreshRetailers =
    useCallback(
      () =>
        loadRetailers(
          activeTab
        ),
      [
        activeTab,
        loadRetailers,
      ]
    );


  // =========================================================
  // INITIAL / TAB LOAD
  // =========================================================

  useEffect(
    () => {
      loadRetailers(
        activeTab
      ).catch(
        () => {
          // Error state is already
          // handled inside loadRetailers.
        }
      );
    },
    [
      activeTab,
      loadRetailers,
    ]
  );


  // =========================================================
  // RESOLVE REPORT
  // =========================================================

  const resolveRetailerReport =
    useCallback(
      async (reportId) => {
        if (!reportId) {
          throw new Error("Report ID is required.");
        }

        const response = await request(
          `/admin/retailers/reports/${reportId}/resolve/`,
          {
            method: "POST",
          }
        );

        return response;
      },
      [request]
    );


  // =========================================================
  // RETURN
  // =========================================================

  return {
    // TAB
    activeTab,
    changeTab,

    // DATA
    rows,
    counts,

    // LOADINGS
    isLoading,
    isDetailsLoading,
    isConfirming,
    isArchiving,
    isRestoring,
    isDeleting,

    // ERROR
    error,

    // DATA ACTIONS
    loadRetailers,
    refreshRetailers,
    getRetailerDetails,
    resolveRetailerReport,

    // ACCOUNT ACTIONS
    confirmRetailer,
    archiveRetailer,
    restoreRetailer,
    deleteRetailer,
  };
};


export default useRetailerManagement;