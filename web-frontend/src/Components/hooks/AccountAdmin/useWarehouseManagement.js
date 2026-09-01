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

const normalizeTab = (tab) => {
  const value = String(
    tab || "to-review"
  )
    .trim()
    .toLowerCase();

  if (
    value === "active" ||
    value === "inactive"
  ) {
    return value;
  }

  return "to-review";
};


const normalizeRows = (rows) =>
  Array.isArray(rows)
    ? rows
    : [];


const normalizeCounts = (counts) => ({
  to_review:
    Number(
      counts?.to_review
    ) || 0,

  active:
    Number(
      counts?.active
    ) || 0,

  inactive:
    Number(
      counts?.inactive
    ) || 0,
});


// ============================================================
// HOOK
// ============================================================

const useWarehouseManagement = (
  initialTab = "to-review"
) => {
  const {
    request,
  } = useApi();


  // =========================================================
  // MANAGEMENT LIST
  // =========================================================

  const [
    activeTab,
    setActiveTab,
  ] = useState(
    normalizeTab(
      initialTab
    )
  );


  const [
    rows,
    setRows,
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
  // REVIEW DETAILS
  // =========================================================

  const [
    selectedWarehouse,
    setSelectedWarehouse,
  ] = useState(null);


  const [
    isReviewLoading,
    setIsReviewLoading,
  ] = useState(false);


  // =========================================================
  // VIEW DETAILS
  // =========================================================

  const [
    warehouseViewDetails,
    setWarehouseViewDetails,
  ] = useState(null);


  const [
    isViewDetailsLoading,
    setIsViewDetailsLoading,
  ] = useState(false);


  // =========================================================
  // WAREHOUSE ACTION STATES
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

  const loadWarehouses =
    useCallback(
      async (
        requestedTab = activeTab
      ) => {
        const tab =
          normalizeTab(
            requestedTab
          );


        setIsLoading(
          true
        );

        setError("");


        try {
          const response =
            await request(
              `/admin/warehouses/?tab=${encodeURIComponent(
                tab
              )}`,
              {
                throwOnError:
                  true,
              }
            );


          const loadedRows =
            normalizeRows(
              response?.results
            );


          setRows(
            loadedRows
          );


          setCounts(
            normalizeCounts(
              response?.counts
            )
          );


          return response;

        } catch (err) {
          const message =
            err?.message ||
            "Unable to load Warehouse Manager accounts.";


          setError(
            message
          );

          setRows([]);

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
  // CHANGE MANAGEMENT TAB
  // =========================================================

  const changeTab =
    useCallback(
      (tab) => {
        setActiveTab(
          normalizeTab(
            tab
          )
        );
      },
      []
    );


  // =========================================================
  // GET REGISTRATION / OWNER DETAILS
  // =========================================================

  const getWarehouseDetails =
    useCallback(
      async (
        userId
      ) => {
        if (!userId) {
          throw new Error(
            "Warehouse Manager user ID is required."
          );
        }


        setIsReviewLoading(
          true
        );

        setError("");


        try {
          const response =
            await request(
              `/admin/warehouses/${userId}/`,
              {
                throwOnError:
                  true,
              }
            );


          const warehouse =
            response?.warehouse ||
            null;


          setSelectedWarehouse(
            warehouse
          );


          return warehouse;

        } catch (err) {
          const message =
            err?.message ||
            "Unable to load Warehouse Manager details.";


          setError(
            message
          );

          throw err;

        } finally {
          setIsReviewLoading(
            false
          );
        }
      },
      [
        request,
      ]
    );


  // =========================================================
  // GET WAREHOUSE VIEW DETAILS
  // =========================================================

  const getWarehouseViewDetails =
    useCallback(
      async (
        userId
      ) => {
        if (!userId) {
          throw new Error(
            "Warehouse Manager user ID is required."
          );
        }


        setIsViewDetailsLoading(
          true
        );

        setError("");


        try {
          const response =
            await request(
              `/admin/warehouses/${userId}/view-details/`,
              {
                throwOnError:
                  true,
              }
            );


          const data =
            response?.data ||
            null;


          setWarehouseViewDetails(
            data
          );


          return data;

        } catch (err) {
          const message =
            err?.message ||
            "Unable to load Warehouse View Details.";


          setError(
            message
          );

          throw err;

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
  // CONFIRM WAREHOUSE APPLICATION
  // =========================================================

  const confirmWarehouse =
    useCallback(
      async (
        userId
      ) => {
        if (!userId) {
          throw new Error(
            "Warehouse Manager user ID is required."
          );
        }


        setIsConfirming(
          true
        );

        setError("");


        try {
          const response =
            await request(
              `/admin/warehouses/${userId}/confirm/`,
              {
                method:
                  "POST",

                throwOnError:
                  true,
              }
            );


          await loadWarehouses(
            activeTab
          );


          return response;

        } catch (err) {
          const message =
            err?.message ||
            "Unable to confirm Warehouse Manager application.";


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
        loadWarehouses,
        request,
      ]
    );


  // =========================================================
  // ARCHIVE WAREHOUSE ACCOUNT
  // =========================================================

  const archiveWarehouse =
    useCallback(
      async (
        userId,
        reason
      ) => {
        if (!userId) {
          throw new Error(
            "Warehouse Manager user ID is required."
          );
        }


        const cleanedReason =
          String(
            reason || ""
          ).trim();


        if (!cleanedReason) {
          throw new Error(
            "Archive reason is required."
          );
        }


        setIsArchiving(
          true
        );

        setError("");


        try {
          const response =
            await request(
              `/admin/warehouses/${userId}/archive/`,
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


          await loadWarehouses(
            activeTab
          );


          return response;

        } catch (err) {
          const message =
            err?.message ||
            "Unable to archive Warehouse Manager account.";


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
        loadWarehouses,
        request,
      ]
    );


  // =========================================================
  // RESTORE WAREHOUSE ACCOUNT
  // =========================================================

  const restoreWarehouse =
    useCallback(
      async (
        userId
      ) => {
        if (!userId) {
          throw new Error(
            "Warehouse Manager user ID is required."
          );
        }


        setIsRestoring(
          true
        );

        setError("");


        try {
          const response =
            await request(
              `/admin/warehouses/${userId}/restore/`,
              {
                method:
                  "POST",

                throwOnError:
                  true,
              }
            );


          await loadWarehouses(
            activeTab
          );


          return response;

        } catch (err) {
          const message =
            err?.message ||
            "Unable to restore Warehouse Manager account.";


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
        loadWarehouses,
        request,
      ]
    );


  // =========================================================
  // DELETE WAREHOUSE ACCOUNT
  // =========================================================

  const deleteWarehouse =
    useCallback(
      async (
        userId
      ) => {
        if (!userId) {
          throw new Error(
            "Warehouse Manager user ID is required."
          );
        }


        setIsDeleting(
          true
        );

        setError("");


        try {
          const response =
            await request(
              `/admin/warehouses/${userId}/delete/`,
              {
                method:
                  "POST",

                throwOnError:
                  true,
              }
            );


          await loadWarehouses(
            activeTab
          );


          return response;

        } catch (err) {
          const message =
            err?.message ||
            "Unable to permanently delete Warehouse Manager account.";


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
        loadWarehouses,
        request,
      ]
    );


  // =========================================================
  // ARCHIVE WAREHOUSE EMPLOYEE
  // =========================================================

  const archiveWarehouseEmployee =
    useCallback(
      async (
        userId,
        employeeId,
        reason
      ) => {
        if (!userId) {
          throw new Error(
            "Warehouse Manager user ID is required."
          );
        }


        if (!employeeId) {
          throw new Error(
            "Warehouse employee ID is required."
          );
        }


        const cleanedReason =
          String(
            reason || ""
          ).trim();


        if (!cleanedReason) {
          throw new Error(
            "Archive reason is required."
          );
        }


        setIsArchivingEmployee(
          true
        );

        setError("");


        try {
          const response =
            await request(
              `/admin/warehouses/${userId}/employees/${employeeId}/archive/`,
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


          await getWarehouseViewDetails(
            userId
          );


          return response;

        } catch (err) {
          const message =
            err?.message ||
            "Unable to archive Warehouse employee.";


          setError(
            message
          );

          throw err;

        } finally {
          setIsArchivingEmployee(
            false
          );
        }
      },
      [
        getWarehouseViewDetails,
        request,
      ]
    );


  // =========================================================
  // RESTORE / RETRIEVE WAREHOUSE EMPLOYEE
  // =========================================================

  const restoreWarehouseEmployee =
    useCallback(
      async (
        userId,
        employeeId
      ) => {
        if (!userId) {
          throw new Error(
            "Warehouse Manager user ID is required."
          );
        }


        if (!employeeId) {
          throw new Error(
            "Warehouse employee ID is required."
          );
        }


        setIsRestoringEmployee(
          true
        );

        setError("");


        try {
          const response =
            await request(
              `/admin/warehouses/${userId}/employees/${employeeId}/restore/`,
              {
                method:
                  "POST",

                throwOnError:
                  true,
              }
            );


          await getWarehouseViewDetails(
            userId
          );


          return response;

        } catch (err) {
          const message =
            err?.message ||
            "Unable to retrieve Warehouse employee account.";


          setError(
            message
          );

          throw err;

        } finally {
          setIsRestoringEmployee(
            false
          );
        }
      },
      [
        getWarehouseViewDetails,
        request,
      ]
    );


  // =========================================================
  // DELETE WAREHOUSE EMPLOYEE
  // =========================================================

  const deleteWarehouseEmployee =
    useCallback(
      async (
        userId,
        employeeId
      ) => {
        if (!userId) {
          throw new Error(
            "Warehouse Manager user ID is required."
          );
        }


        if (!employeeId) {
          throw new Error(
            "Warehouse employee ID is required."
          );
        }


        setIsDeletingEmployee(
          true
        );

        setError("");


        try {
          const response =
            await request(
              `/admin/warehouses/${userId}/employees/${employeeId}/delete/`,
              {
                method:
                  "POST",

                throwOnError:
                  true,
              }
            );


          await getWarehouseViewDetails(
            userId
          );


          return response;

        } catch (err) {
          const message =
            err?.message ||
            "Unable to permanently delete Warehouse employee.";


          setError(
            message
          );

          throw err;

        } finally {
          setIsDeletingEmployee(
            false
          );
        }
      },
      [
        getWarehouseViewDetails,
        request,
      ]
    );


  // =========================================================
  // CLEAR STATE
  // =========================================================

  const clearSelectedWarehouse =
    useCallback(
      () => {
        setSelectedWarehouse(
          null
        );
      },
      []
    );


  const clearWarehouseViewDetails =
    useCallback(
      () => {
        setWarehouseViewDetails(
          null
        );
      },
      []
    );


  const clearError =
    useCallback(
      () => {
        setError("");
      },
      []
    );


  // =========================================================
  // AUTO LOAD MANAGEMENT TAB
  // =========================================================

  useEffect(() => {
    loadWarehouses(
      activeTab
    ).catch(() => {
      // loadWarehouses already stores the error.
    });
  }, [
    activeTab,
    loadWarehouses,
  ]);


  // =========================================================
  // RETURN
  // =========================================================

  return {
    // MANAGEMENT
    activeTab,
    rows,
    counts,
    isLoading,

    // REVIEW
    selectedWarehouse,
    isReviewLoading,

    // VIEW DETAILS
    warehouseViewDetails,
    isViewDetailsLoading,

    // ACCOUNT ACTION STATES
    isConfirming,
    isArchiving,
    isRestoring,
    isDeleting,

    // EMPLOYEE ACTION STATES
    isArchivingEmployee,
    isRestoringEmployee,
    isDeletingEmployee,

    // ERROR
    error,

    // MANAGEMENT
    changeTab,
    loadWarehouses,

    // DETAILS
    getWarehouseDetails,
    getWarehouseViewDetails,

    // ACCOUNT ACTIONS
    confirmWarehouse,
    archiveWarehouse,
    restoreWarehouse,
    deleteWarehouse,

    // EMPLOYEE ACTIONS
    archiveWarehouseEmployee,
    restoreWarehouseEmployee,
    deleteWarehouseEmployee,

    // CLEAR
    clearSelectedWarehouse,
    clearWarehouseViewDetails,
    clearError,
  };
};


export default useWarehouseManagement;