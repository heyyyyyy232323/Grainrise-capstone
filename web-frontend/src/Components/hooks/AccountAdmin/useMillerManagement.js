import {
  useCallback,
  useEffect,
  useState,
} from "react";

import useApi from "../useApi";


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


const normalizeMillerRow = (
  row
) => ({
  id:
    row?.id,

  miller:
    row?.miller_name ||
    "",

  company:
    row?.business_name ||
    "",

  organization:
    row?.organization_name ||
    "",

  email:
    row?.email ||
    "",

  contact:
    row?.contact_number ||
    "",

  status:
    row?.status ||
    "",

  archiveReason:
    row?.archive_reason ||
    "",

  archivedAt:
    row?.archived_at ||
    null,

  joined:
    row?.created_at ||
    null,

  updatedAt:
    row?.updated_at ||
    null,
});


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


const validateUserId = (
  userId
) => {
  if (!userId) {
    throw new Error(
      "Miller user ID is required."
    );
  }
};


const validateEmployeeId = (
  employeeId
) => {
  if (!employeeId) {
    throw new Error(
      "Miller employee ID is required."
    );
  }
};


const validateArchiveReason = (
  reason
) => {
  const cleanedReason =
    String(
      reason || ""
    ).trim();


  if (!cleanedReason) {
    throw new Error(
      "Archive reason is required."
    );
  }


  if (
    cleanedReason.length >
    1000
  ) {
    throw new Error(
      "Archive reason must not exceed 1000 characters."
    );
  }


  return cleanedReason;
};


// ============================================================
// HOOK
// ============================================================

const useMillerManagement = (
  activeTab = "to-review"
) => {
  const {
    request,
  } = useApi();


  // =========================================================
  // MANAGEMENT LIST STATE
  // =========================================================

  const [
    millers,
    setMillers,
  ] = useState([]);


  const [
    counts,
    setCounts,
  ] = useState(
    DEFAULT_COUNTS
  );


  const [
    isLoading,
    setIsLoading,
  ] = useState(false);


  // =========================================================
  // REVIEW / OWNER DETAILS
  // =========================================================

  const [
    isLoadingDetails,
    setIsLoadingDetails,
  ] = useState(false);


  // =========================================================
  // VIEW DETAILS PAGE
  // =========================================================

  const [
    millerViewDetails,
    setMillerViewDetails,
  ] = useState(null);


  const [
    isViewDetailsLoading,
    setIsViewDetailsLoading,
  ] = useState(false);


  // =========================================================
  // ACCOUNT ACTION STATES
  // =========================================================

  const [
    isConfirming,
    setIsConfirming,
  ] = useState(false);


  const [
    isArchiving,
    setIsArchiving,
  ] = useState(false);


  const [
    isRestoring,
    setIsRestoring,
  ] = useState(false);


  const [
    isDeleting,
    setIsDeleting,
  ] = useState(false);


  // =========================================================
  // EMPLOYEE ACTION STATES
  // =========================================================

  const [
    isArchivingEmployee,
    setIsArchivingEmployee,
  ] = useState(false);


  const [
    isRestoringEmployee,
    setIsRestoringEmployee,
  ] = useState(false);


  const [
    isDeletingEmployee,
    setIsDeletingEmployee,
  ] = useState(false);


  // =========================================================
  // ERROR
  // =========================================================

  const [
    error,
    setError,
  ] = useState("");


  // =========================================================
  // LOAD MANAGEMENT LIST
  // =========================================================

  const loadMillers =
    useCallback(
      async (
        tab = activeTab
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
              `/admin/millers/?tab=${encodeURIComponent(
                normalizedTab
              )}`,
              {
                throwOnError:
                  true,
              }
            );


          const rows =
            Array.isArray(
              response?.results
            )
              ? response.results.map(
                  normalizeMillerRow
                )
              : [];


          setMillers(
            rows
          );


          setCounts(
            normalizeCounts(
              response?.counts
            )
          );


          return rows;

        } catch (
          requestError
        ) {
          const message =
            requestError
              ?.message ||
            "Unable to load Miller accounts.";


          setError(
            message
          );


          setMillers(
            []
          );


          throw requestError;

        } finally {
          setIsLoading(
            false
          );
        }
      },
      [
        activeTab,
        request,
      ]
    );


  // =========================================================
  // REFRESH MANAGEMENT LIST
  // =========================================================

  const refreshMillers =
    useCallback(
      () => {
        return loadMillers(
          activeTab
        );
      },
      [
        activeTab,
        loadMillers,
      ]
    );


  // =========================================================
  // GET REVIEW / OWNER DETAILS
  // =========================================================

  const getMillerDetails =
    useCallback(
      async (
        userId
      ) => {
        validateUserId(
          userId
        );


        setIsLoadingDetails(
          true
        );

        setError(
          ""
        );


        try {
          const response =
            await request(
              `/admin/millers/${userId}/`,
              {
                throwOnError:
                  true,
              }
            );


          return (
            response
              ?.miller ||
            null
          );

        } catch (
          requestError
        ) {
          const message =
            requestError
              ?.message ||
            "Unable to load Miller details.";


          setError(
            message
          );


          throw requestError;

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
  // GET COMPLETE MILLER VIEW DETAILS
  // =========================================================

  const getMillerViewDetails =
    useCallback(
      async (
        userId
      ) => {
        validateUserId(
          userId
        );


        setIsViewDetailsLoading(
          true
        );

        setError(
          ""
        );


        try {
          const response =
            await request(
              `/admin/millers/${userId}/view-details/`,
              {
                throwOnError:
                  true,
              }
            );


          const details =
            response?.data ||
            null;


          setMillerViewDetails(
            details
          );


          return details;

        } catch (
          requestError
        ) {
          const message =
            requestError
              ?.message ||
            "Unable to load Miller View Details.";


          setError(
            message
          );


          setMillerViewDetails(
            null
          );


          throw requestError;

        } finally {
          setIsViewDetailsLoading(
            false
          );
        }
      },
      [
        request,
      ]
    );


  // =========================================================
  // CONFIRM MILLER APPLICATION
  // =========================================================

  const confirmMiller =
    useCallback(
      async (
        userId
      ) => {
        validateUserId(
          userId
        );


        setIsConfirming(
          true
        );

        setError(
          ""
        );


        try {
          const response =
            await request(
              `/admin/millers/${userId}/confirm/`,
              {
                method:
                  "POST",

                throwOnError:
                  true,
              }
            );


          await loadMillers(
            activeTab
          );


          return response;

        } catch (
          requestError
        ) {
          const message =
            requestError
              ?.message ||
            "Unable to confirm Miller application.";


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
        loadMillers,
        request,
      ]
    );


  // =========================================================
  // ARCHIVE MILLER ACCOUNT
  // =========================================================

  const archiveMiller =
    useCallback(
      async (
        userId,
        reason
      ) => {
        validateUserId(
          userId
        );


        const cleanedReason =
          validateArchiveReason(
            reason
          );


        setIsArchiving(
          true
        );

        setError(
          ""
        );


        try {
          const response =
            await request(
              `/admin/millers/${userId}/archive/`,
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


          await loadMillers(
            activeTab
          );


          return response;

        } catch (
          requestError
        ) {
          const message =
            requestError
              ?.message ||
            "Unable to archive Miller account.";


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
        loadMillers,
        request,
      ]
    );


  // =========================================================
  // RESTORE MILLER ACCOUNT
  // =========================================================

  const restoreMiller =
    useCallback(
      async (
        userId
      ) => {
        validateUserId(
          userId
        );


        setIsRestoring(
          true
        );

        setError(
          ""
        );


        try {
          const response =
            await request(
              `/admin/millers/${userId}/restore/`,
              {
                method:
                  "POST",

                throwOnError:
                  true,
              }
            );


          await loadMillers(
            activeTab
          );


          return response;

        } catch (
          requestError
        ) {
          const message =
            requestError
              ?.message ||
            "Unable to restore Miller account.";


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
        loadMillers,
        request,
      ]
    );


  // =========================================================
  // DELETE MILLER ACCOUNT
  // =========================================================

  const deleteMiller =
    useCallback(
      async (
        userId
      ) => {
        validateUserId(
          userId
        );


        setIsDeleting(
          true
        );

        setError(
          ""
        );


        try {
          const response =
            await request(
              `/admin/millers/${userId}/delete/`,
              {
                method:
                  "POST",

                throwOnError:
                  true,
              }
            );


          await loadMillers(
            activeTab
          );


          return response;

        } catch (
          requestError
        ) {
          const message =
            requestError
              ?.message ||
            "Unable to permanently delete Miller account.";


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
        loadMillers,
        request,
      ]
    );


  // =========================================================
  // ARCHIVE MILLER EMPLOYEE
  // =========================================================

  const archiveMillerEmployee =
    useCallback(
      async (
        userId,
        employeeId,
        reason
      ) => {
        validateUserId(
          userId
        );


        validateEmployeeId(
          employeeId
        );


        const cleanedReason =
          validateArchiveReason(
            reason
          );


        setIsArchivingEmployee(
          true
        );

        setError(
          ""
        );


        try {
          const response =
            await request(
              `/admin/millers/${userId}/employees/${employeeId}/archive/`,
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


          await getMillerViewDetails(
            userId
          );


          return response;

        } catch (
          requestError
        ) {
          const message =
            requestError
              ?.message ||
            "Unable to archive Miller employee.";


          setError(
            message
          );


          throw requestError;

        } finally {
          setIsArchivingEmployee(
            false
          );
        }
      },
      [
        getMillerViewDetails,
        request,
      ]
    );


  // =========================================================
  // RESTORE / RETRIEVE MILLER EMPLOYEE
  // =========================================================

  const restoreMillerEmployee =
    useCallback(
      async (
        userId,
        employeeId
      ) => {
        validateUserId(
          userId
        );


        validateEmployeeId(
          employeeId
        );


        setIsRestoringEmployee(
          true
        );

        setError(
          ""
        );


        try {
          const response =
            await request(
              `/admin/millers/${userId}/employees/${employeeId}/restore/`,
              {
                method:
                  "POST",

                throwOnError:
                  true,
              }
            );


          await getMillerViewDetails(
            userId
          );


          return response;

        } catch (
          requestError
        ) {
          const message =
            requestError
              ?.message ||
            "Unable to retrieve Miller employee account.";


          setError(
            message
          );


          throw requestError;

        } finally {
          setIsRestoringEmployee(
            false
          );
        }
      },
      [
        getMillerViewDetails,
        request,
      ]
    );


  // =========================================================
  // DELETE MILLER EMPLOYEE
  // =========================================================

  const deleteMillerEmployee =
    useCallback(
      async (
        userId,
        employeeId
      ) => {
        validateUserId(
          userId
        );


        validateEmployeeId(
          employeeId
        );


        setIsDeletingEmployee(
          true
        );

        setError(
          ""
        );


        try {
          const response =
            await request(
              `/admin/millers/${userId}/employees/${employeeId}/delete/`,
              {
                method:
                  "POST",

                throwOnError:
                  true,
              }
            );


          await getMillerViewDetails(
            userId
          );


          return response;

        } catch (
          requestError
        ) {
          const message =
            requestError
              ?.message ||
            "Unable to permanently delete Miller employee account.";


          setError(
            message
          );


          throw requestError;

        } finally {
          setIsDeletingEmployee(
            false
          );
        }
      },
      [
        getMillerViewDetails,
        request,
      ]
    );


  // =========================================================
  // CLEAR VIEW DETAILS
  // =========================================================

  const clearMillerViewDetails =
    useCallback(
      () => {
        setMillerViewDetails(
          null
        );
      },
      []
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
  // AUTO LOAD MANAGEMENT TAB
  // =========================================================

  useEffect(() => {
    loadMillers(
      activeTab
    ).catch(
      () => {
        /*
         * Error is already stored
         * inside loadMillers().
         */
      }
    );
  }, [
    activeTab,
    loadMillers,
  ]);


  // =========================================================
  // RETURN
  // =========================================================

  return {
    // Management list
    millers,
    counts,
    isLoading,

    // Review details
    isLoadingDetails,

    // View Details
    millerViewDetails,
    isViewDetailsLoading,

    // Account actions
    isConfirming,
    isArchiving,
    isRestoring,
    isDeleting,

    // Employee actions
    isArchivingEmployee,
    isRestoringEmployee,
    isDeletingEmployee,

    // Error
    error,

    // List
    loadMillers,
    refreshMillers,

    // Details
    getMillerDetails,
    getMillerViewDetails,
    clearMillerViewDetails,

    // Account actions
    confirmMiller,
    archiveMiller,
    restoreMiller,
    deleteMiller,

    // Employee actions
    archiveMillerEmployee,
    restoreMillerEmployee,
    deleteMillerEmployee,

    // Error helper
    clearError,
  };
};


export default useMillerManagement;