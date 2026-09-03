import {
  useCallback,
  useEffect,
  useState,
} from "react";

import useApi from "../useApi";


// ============================================================
// DEFAULT DATA
// ============================================================

const DEFAULT_DASHBOARD = {
  kpis: {
    miller_managers: 0,
    warehouse_managers: 0,
    retailers: 0,
    farmers: 0,
  },

  overall_users: 0,

  account_status: {
    active: 0,
    to_review: 0,
    archived: 0,
    deactivated: 0,
  },

  entity_breakdown: [],

  role_status_breakdown: [],

  recent_activity: [],
};


// ============================================================
// HOOK
// ============================================================

const useAdminDashboard = () => {
  const {
    request,
  } = useApi();


  // =========================================================
  // DASHBOARD DATA
  // =========================================================

  const [
    dashboard,
    setDashboard,
  ] = useState(
    DEFAULT_DASHBOARD
  );


  // =========================================================
  // FETCH TIMESTAMP
  // =========================================================

  const [
    fetchedAt,
    setFetchedAt,
  ] = useState(
    null
  );


  // =========================================================
  // LOADING
  // =========================================================

  const [
    isLoading,
    setIsLoading,
  ] = useState(
    true
  );


  // =========================================================
  // REFRESHING
  // =========================================================

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(
    false
  );


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
  // LOAD DASHBOARD
  // =========================================================

  const loadDashboard =
    useCallback(
      async ({
        refresh = false,
      } = {}) => {
        if (refresh) {
          setIsRefreshing(
            true
          );
        } else {
          setIsLoading(
            true
          );
        }


        setError(
          ""
        );


        try {
          const response =
            await request(
              "/admin/dashboard/",
              {
                method: "GET",
                throwOnError: true,
              }
            );


          const data =
            response?.dashboard ||
            DEFAULT_DASHBOARD;


          setDashboard({
            kpis: {
              miller_managers:
                Number(
                  data
                    ?.kpis
                    ?.miller_managers ||
                  0
                ),

              warehouse_managers:
                Number(
                  data
                    ?.kpis
                    ?.warehouse_managers ||
                  0
                ),

              retailers:
                Number(
                  data
                    ?.kpis
                    ?.retailers ||
                  0
                ),

              farmers:
                Number(
                  data
                    ?.kpis
                    ?.farmers ||
                  0
                ),
            },


            overall_users:
              Number(
                data
                  ?.overall_users ||
                0
              ),


            account_status: {
              active:
                Number(
                  data
                    ?.account_status
                    ?.active ||
                  0
                ),

              to_review:
                Number(
                  data
                    ?.account_status
                    ?.to_review ||
                  0
                ),

              archived:
                Number(
                  data
                    ?.account_status
                    ?.archived ||
                  0
                ),

              deactivated:
                Number(
                  data
                    ?.account_status
                    ?.deactivated ||
                  0
                ),
            },


            entity_breakdown:
              Array.isArray(
                data
                  ?.entity_breakdown
              )
                ? data.entity_breakdown
                : [],


            role_status_breakdown:
              Array.isArray(
                data
                  ?.role_status_breakdown
              )
                ? data.role_status_breakdown
                : [],


            recent_activity:
              Array.isArray(
                data
                  ?.recent_activity
              )
                ? data.recent_activity
                : [],
          });


          setFetchedAt(
            response
              ?.fetched_at ||
            new Date().toISOString()
          );


          return response;

        } catch (
          err
        ) {
          const message =
            err?.message ||
            "Unable to load the admin dashboard.";


          setError(
            message
          );


          throw err;

        } finally {
          setIsLoading(
            false
          );

          setIsRefreshing(
            false
          );
        }
      },
      [
        request,
      ]
    );


  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(
    () => {
      loadDashboard().catch(
        () => {
          // Error state is already handled above.
        }
      );
    },
    [
      loadDashboard,
    ]
  );


  // =========================================================
  // REFRESH DASHBOARD
  // =========================================================

  const refreshDashboard =
    useCallback(
      async () => {
        return loadDashboard({
          refresh: true,
        });
      },
      [
        loadDashboard,
      ]
    );


  // =========================================================
  // RETURN
  // =========================================================

  return {
    dashboard,

    kpis:
      dashboard.kpis,

    overallUsers:
      dashboard.overall_users,

    accountStatus:
      dashboard.account_status,

    entityBreakdown:
      dashboard.entity_breakdown,

    roleStatusBreakdown:
      dashboard.role_status_breakdown,

    recentActivity:
      dashboard.recent_activity,

    fetchedAt,

    isLoading,
    isRefreshing,

    error,

    loadDashboard,
    refreshDashboard,
  };
};


export default useAdminDashboard;