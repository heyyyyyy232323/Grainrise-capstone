import {
  useCallback,
  useEffect,
  useState,
} from "react";

import useApi from "../useApi";


// ============================================================
// DEFAULTS
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
      counts?.to_review || 0
    ),

  active:
    Number(
      counts?.active || 0
    ),

  inactive:
    Number(
      counts?.inactive || 0
    ),
});


const normalizeFarmerRow = (
  row
) => ({
  id:
    row?.id,

  farmer:
    row?.farmer_name || "",

  email:
    row?.email || "",

  contact:
    row?.contact_number || "",

  username:
    row?.username || "",

  status:
    row?.status || "",


  // =========================================================
  // FARMER COMPLIANCE
  // =========================================================

  rsbsaNumber:
    row?.rsbsa_number || "",

  submissionMethod:
    row?.submission_method || "",


  // =========================================================
  // FARM SUMMARY
  // =========================================================

  farmCount:
    Number(
      row?.farm_count || 0
    ),

  totalFarmArea:
    Number(
      row?.total_farm_area || 0
    ),


  // =========================================================
  // ARCHIVE INFORMATION
  // =========================================================

  archiveReason:
    row?.archive_reason || "",

  archivedAt:
    row?.archived_at || null,


  // =========================================================
  // TIMESTAMPS
  // =========================================================

  joined:
    row?.created_at || null,

  updatedAt:
    row?.updated_at || null,
});


// ============================================================
// HOOK
// ============================================================

const useFarmerManagement = () => {
  const {
    request,
  } = useApi();


  // =========================================================
  // TAB + DATA
  // =========================================================

  const [
    activeTab,
    setActiveTab,
  ] = useState(
    "to-review"
  );


  const [
    farmers,
    setFarmers,
  ] = useState(
    []
  );


  const [
    counts,
    setCounts,
  ] = useState(
    DEFAULT_COUNTS
  );


  // =========================================================
  // LOADING STATES
  // =========================================================

  const [
    isLoading,
    setIsLoading,
  ] = useState(
    false
  );


  const [
    isLoadingDetails,
    setIsLoadingDetails,
  ] = useState(
    false
  );


  const [
    isConfirming,
    setIsConfirming,
  ] = useState(
    false
  );


  const [
    isArchiving,
    setIsArchiving,
  ] = useState(
    false
  );


  const [
    isRestoring,
    setIsRestoring,
  ] = useState(
    false
  );


  const [
    isDeleting,
    setIsDeleting,
  ] = useState(
    false
  );


  const [
    error,
    setError,
  ] = useState(
    ""
  );


  // =========================================================
  // LOAD FARMERS
  // =========================================================

  const loadFarmers = useCallback(
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
            `/admin/farmers/?tab=${encodeURIComponent(
              normalizedTab
            )}`,
            {
              method: "GET",
              throwOnError: true,
            }
          );


        const rows =
          Array.isArray(
            response?.results
          )
            ? response.results.map(
                normalizeFarmerRow
              )
            : [];


        setFarmers(
          rows
        );


        setCounts(
          normalizeCounts(
            response?.counts
          )
        );


        return rows;

      } catch (
        err
      ) {
        const message =
          err?.message ||
          "Unable to load Farmer accounts.";


        setError(
          message
        );


        setFarmers(
          []
        );


        throw err;

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
  // TAB CHANGE
  // =========================================================

  const changeTab = useCallback(
    (
      tab
    ) => {
      const normalizedTab =
        normalizeTab(
          tab
        );


      setActiveTab(
        normalizedTab
      );
    },
    []
  );


  // =========================================================
  // LOAD WHEN TAB CHANGES
  // =========================================================

  useEffect(
    () => {
      loadFarmers(
        activeTab
      ).catch(
        () => {
          // Error state is already handled by loadFarmers.
        }
      );
    },
    [
      activeTab,
      loadFarmers,
    ]
  );


  // =========================================================
  // FARMER DETAILS
  // =========================================================

  const getFarmerDetails =
    useCallback(
      async (
        userId
      ) => {
        if (
          !userId
        ) {
          throw new Error(
            "Farmer user ID is required."
          );
        }


        setIsLoadingDetails(
          true
        );

        setError(
          ""
        );


        try {
          const response =
            await request(
              `/admin/farmers/${userId}/`,
              {
                method: "GET",
                throwOnError: true,
              }
            );


          return (
            response?.farmer ||
            null
          );

        } catch (
          err
        ) {
          const message =
            err?.message ||
            "Unable to load Farmer details.";


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
  // CONFIRM FARMER
  // =========================================================

  const confirmFarmer =
    useCallback(
      async (
        userId
      ) => {
        if (
          !userId
        ) {
          throw new Error(
            "Farmer user ID is required."
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
              `/admin/farmers/${userId}/confirm/`,
              {
                method: "POST",
                throwOnError: true,
              }
            );


          await loadFarmers(
            activeTab
          );


          return response;

        } catch (
          err
        ) {
          const message =
            err?.message ||
            "Unable to confirm Farmer application.";


          setError(
            message
          );


          throw err;

        } finally {
          setIsConfirming(
            false
          );
        }
      },
      [
        activeTab,
        loadFarmers,
        request,
      ]
    );


  // =========================================================
  // ARCHIVE FARMER
  // =========================================================

  const archiveFarmer =
    useCallback(
      async (
        userId,
        reason
      ) => {
        if (
          !userId
        ) {
          throw new Error(
            "Farmer user ID is required."
          );
        }


        const cleanedReason =
          String(
            reason || ""
          ).trim();


        if (
          !cleanedReason
        ) {
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
              `/admin/farmers/${userId}/archive/`,
              {
                method: "POST",

                body: {
                  reason:
                    cleanedReason,
                },

                throwOnError: true,
              }
            );


          await loadFarmers(
            activeTab
          );


          return response;

        } catch (
          err
        ) {
          const message =
            err?.message ||
            "Unable to archive Farmer account.";


          setError(
            message
          );


          throw err;

        } finally {
          setIsArchiving(
            false
          );
        }
      },
      [
        activeTab,
        loadFarmers,
        request,
      ]
    );


  // =========================================================
  // RESTORE FARMER
  // =========================================================

  const restoreFarmer =
    useCallback(
      async (
        userId
      ) => {
        if (
          !userId
        ) {
          throw new Error(
            "Farmer user ID is required."
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
              `/admin/farmers/${userId}/restore/`,
              {
                method: "POST",
                throwOnError: true,
              }
            );


          await loadFarmers(
            activeTab
          );


          return response;

        } catch (
          err
        ) {
          const message =
            err?.message ||
            "Unable to restore Farmer account.";


          setError(
            message
          );


          throw err;

        } finally {
          setIsRestoring(
            false
          );
        }
      },
      [
        activeTab,
        loadFarmers,
        request,
      ]
    );


  // =========================================================
  // DELETE FARMER
  // =========================================================

  const deleteFarmer =
    useCallback(
      async (
        userId
      ) => {
        if (
          !userId
        ) {
          throw new Error(
            "Farmer user ID is required."
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
              `/admin/farmers/${userId}/delete/`,
              {
                method: "POST",
                throwOnError: true,
              }
            );


          await loadFarmers(
            activeTab
          );


          return response;

        } catch (
          err
        ) {
          const message =
            err?.message ||
            "Unable to permanently delete Farmer account.";


          setError(
            message
          );


          throw err;

        } finally {
          setIsDeleting(
            false
          );
        }
      },
      [
        activeTab,
        loadFarmers,
        request,
      ]
    );


  // =========================================================
  // REFRESH
  // =========================================================

  const refreshFarmers =
    useCallback(
      async () => {
        return loadFarmers(
          activeTab
        );
      },
      [
        activeTab,
        loadFarmers,
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
    activeTab,
    changeTab,

    farmers,
    counts,

    isLoading,
    isLoadingDetails,

    isConfirming,
    isArchiving,
    isRestoring,
    isDeleting,

    error,
    clearError,

    loadFarmers,
    refreshFarmers,

    getFarmerDetails,

    confirmFarmer,
    archiveFarmer,
    restoreFarmer,
    deleteFarmer,
  };
};


export default useFarmerManagement;