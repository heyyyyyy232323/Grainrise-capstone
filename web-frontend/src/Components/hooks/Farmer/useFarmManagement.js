import { useCallback, useState } from "react";

import useApi from "../useApi";


// ============================================================
// DEFAULTS
// ============================================================

const DEFAULT_FILTERS = {
  search: "",
  cropStatus: "",
  farmStatus: "",
  sortBy: "newest",
};


const DEFAULT_ACTIVITY = {
  items: [],
  pagination: {
    page: 1,
    page_size: 10,
    total_items: 0,
    total_pages: 0,
  },
};


// ============================================================
// NORMALIZERS
// ============================================================

const toNumberOrNull = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
};


const normalizeFarm = (farm) => {
  if (
    !farm ||
    typeof farm !== "object"
  ) {
    return null;
  }

  return {
    ...farm,

    farm_id:
      farm.farm_id,

    total_farm_area:
      toNumberOrNull(
        farm.total_farm_area
      ),

    expected_yield_kg:
      toNumberOrNull(
        farm.expected_yield_kg
      ),

    actual_yield_kg:
      toNumberOrNull(
        farm.actual_yield_kg
      ),
  };
};


const normalizeFarmList = (items) => {
  if (
    !Array.isArray(items)
  ) {
    return [];
  }

  return items
    .map(normalizeFarm)
    .filter(Boolean);
};


const normalizeActivity = (payload) => {
  const items =
    Array.isArray(payload?.items)
      ? payload.items
      : [];

  const pagination =
    payload?.pagination &&
    typeof payload.pagination === "object"
      ? payload.pagination
      : DEFAULT_ACTIVITY.pagination;

  return {
    items,

    pagination: {
      page:
        Number(
          pagination.page || 1
        ),

      page_size:
        Number(
          pagination.page_size || 10
        ),

      total_items:
        Number(
          pagination.total_items || 0
        ),

      total_pages:
        Number(
          pagination.total_pages || 0
        ),
    },
  };
};


// ============================================================
// QUERY STRING
// ============================================================

const buildFarmQuery = (
  filters = {}
) => {
  const merged = {
    ...DEFAULT_FILTERS,
    ...filters,
  };

  const params =
    new URLSearchParams();

  const search =
    String(
      merged.search || ""
    ).trim();

  const cropStatus =
    String(
      merged.cropStatus || ""
    ).trim();

  const farmStatus =
    String(
      merged.farmStatus || ""
    ).trim();

  const sortBy =
    String(
      merged.sortBy || "newest"
    ).trim();

  if (search) {
    params.set(
      "search",
      search
    );
  }

  if (cropStatus) {
    params.set(
      "crop_status",
      cropStatus
    );
  }

  if (farmStatus) {
    params.set(
      "farm_status",
      farmStatus
    );
  }

  if (sortBy) {
    params.set(
      "sort_by",
      sortBy
    );
  }

  const query =
    params.toString();

  return query
    ? `?${query}`
    : "";
};


// ============================================================
// RESPONSE HELPERS
// ============================================================

const unwrapData = (response) => {
  if (
    response &&
    typeof response === "object" &&
    Object.prototype.hasOwnProperty.call(
      response,
      "data"
    )
  ) {
    return response.data;
  }

  return response;
};


const getErrorMessage = (
  error,
  fallback
) => {
  return (
    error?.data?.message ||
    error?.message ||
    fallback
  );
};


// ============================================================
// HOOK
// ============================================================

const useFarmManagement = () => {
  const {
    request,
  } = useApi();


  // =========================================================
  // DATA
  // =========================================================

  const [
    farms,
    setFarms,
  ] = useState(
    []
  );


  const [
    selectedFarm,
    setSelectedFarm,
  ] = useState(
    null
  );


  const [
    farmActivity,
    setFarmActivity,
  ] = useState(
    DEFAULT_ACTIVITY
  );


  const [
    filters,
    setFilters,
  ] = useState(
    DEFAULT_FILTERS
  );


  // =========================================================
  // LOADING STATES
  // =========================================================

  const [
    isLoadingFarms,
    setIsLoadingFarms,
  ] = useState(
    false
  );


  const [
    isLoadingFarmDetails,
    setIsLoadingFarmDetails,
  ] = useState(
    false
  );


  const [
    isLoadingActivity,
    setIsLoadingActivity,
  ] = useState(
    false
  );


  const [
    isSavingFarm,
    setIsSavingFarm,
  ] = useState(
    false
  );


  const [
    isSavingCrop,
    setIsSavingCrop,
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
  // LOAD MY FARMS
  // =========================================================

  const loadFarms =
    useCallback(
      async (
        nextFilters = filters
      ) => {
        setIsLoadingFarms(
          true
        );

        setError(
          ""
        );

        const mergedFilters = {
          ...DEFAULT_FILTERS,
          ...nextFilters,
        };

        try {
          const response =
            await request(
              (
                "/farmer/farm-management/farms/" +
                buildFarmQuery(
                  mergedFilters
                )
              ),
              {
                method:
                  "GET",

                throwOnError:
                  true,
              }
            );

          const payload =
            unwrapData(
              response
            );

          const normalized =
            normalizeFarmList(
              payload?.items
            );

          setFarms(
            normalized
          );

          setFilters(
            mergedFilters
          );

          return normalized;

        } catch (err) {
          const message =
            getErrorMessage(
              err,
              "Unable to load your farms."
            );

          setError(
            message
          );

          throw err;

        } finally {
          setIsLoadingFarms(
            false
          );
        }
      },
      [
        filters,
        request,
      ]
    );


  // =========================================================
  // LOAD SPECIFIC FARM
  // =========================================================

  const loadFarmDetails =
    useCallback(
      async (
        farmId
      ) => {
        if (!farmId) {
          throw new Error(
            "Farm ID is required."
          );
        }

        setIsLoadingFarmDetails(
          true
        );

        setError(
          ""
        );

        try {
          const response =
            await request(
              `/farmer/farm-management/farms/${farmId}/`,
              {
                method:
                  "GET",

                throwOnError:
                  true,
              }
            );

          const farm =
            normalizeFarm(
              unwrapData(
                response
              )
            );

          setSelectedFarm(
            farm
          );

          return farm;

        } catch (err) {
          const message =
            getErrorMessage(
              err,
              "Unable to load farm details."
            );

          setError(
            message
          );

          throw err;

        } finally {
          setIsLoadingFarmDetails(
            false
          );
        }
      },
      [
        request,
      ]
    );


  // =========================================================
  // LOAD FARM ACTIVITY
  // =========================================================

  const loadFarmActivity =
    useCallback(
      async (
        farmId,
        {
          page = 1,
          pageSize = 10,
        } = {}
      ) => {
        if (!farmId) {
          throw new Error(
            "Farm ID is required."
          );
        }

        setIsLoadingActivity(
          true
        );

        setError(
          ""
        );

        try {
          const params =
            new URLSearchParams();

          params.set(
            "page",
            String(page)
          );

          params.set(
            "page_size",
            String(pageSize)
          );

          const response =
            await request(
              (
                `/farmer/farm-management/farms/${farmId}/activity/` +
                `?${params.toString()}`
              ),
              {
                method:
                  "GET",

                throwOnError:
                  true,
              }
            );

          const normalized =
            normalizeActivity(
              unwrapData(
                response
              )
            );

          setFarmActivity(
            normalized
          );

          return normalized;

        } catch (err) {
          const message =
            getErrorMessage(
              err,
              "Unable to load farm activity."
            );

          setError(
            message
          );

          throw err;

        } finally {
          setIsLoadingActivity(
            false
          );
        }
      },
      [
        request,
      ]
    );


  // =========================================================
  // ADD FARM
  // =========================================================

  const addFarm =
    useCallback(
      async (
        farmData
      ) => {
        setIsSavingFarm(
          true
        );

        setError(
          ""
        );

        try {
          const response =
            await request(
              "/farmer/farm-management/farms/",
              {
                method:
                  "POST",

                body:
                  farmData,

                throwOnError:
                  true,
              }
            );

          const farm =
            normalizeFarm(
              unwrapData(
                response
              )
            );

          await loadFarms(
            filters
          );

          if (farm) {
            setSelectedFarm(
              farm
            );
          }

          return farm;

        } catch (err) {
          const message =
            getErrorMessage(
              err,
              "Unable to add farm."
            );

          setError(
            message
          );

          throw err;

        } finally {
          setIsSavingFarm(
            false
          );
        }
      },
      [
        filters,
        loadFarms,
        request,
      ]
    );


  // =========================================================
  // EDIT FARM INFORMATION
  // =========================================================

  const updateFarm =
    useCallback(
      async (
        farmId,
        farmData
      ) => {
        if (!farmId) {
          throw new Error(
            "Farm ID is required."
          );
        }

        setIsSavingFarm(
          true
        );

        setError(
          ""
        );

        try {
          const response =
            await request(
              `/farmer/farm-management/farms/${farmId}/`,
              {
                method:
                  "PATCH",

                body:
                  farmData,

                throwOnError:
                  true,
              }
            );

          const farm =
            normalizeFarm(
              unwrapData(
                response
              )
            );

          setSelectedFarm(
            farm
          );

          await loadFarms(
            filters
          );

          return farm;

        } catch (err) {
          const message =
            getErrorMessage(
              err,
              "Unable to update farm information."
            );

          setError(
            message
          );

          throw err;

        } finally {
          setIsSavingFarm(
            false
          );
        }
      },
      [
        filters,
        loadFarms,
        request,
      ]
    );


  // =========================================================
  // FARM ACTIVE / INACTIVE
  // =========================================================

  const updateFarmStatus =
    useCallback(
      async (
        farmId,
        nextStatus
      ) => {
        if (!farmId) {
          throw new Error(
            "Farm ID is required."
          );
        }

        setIsSavingFarm(
          true
        );

        setError(
          ""
        );

        try {
          const response =
            await request(
              `/farmer/farm-management/farms/${farmId}/status/`,
              {
                method:
                  "PATCH",

                body: {
                  status:
                    nextStatus,
                },

                throwOnError:
                  true,
              }
            );

          const farm =
            normalizeFarm(
              unwrapData(
                response
              )
            );

          setSelectedFarm(
            farm
          );

          await loadFarms(
            filters
          );

          return farm;

        } catch (err) {
          const message =
            getErrorMessage(
              err,
              "Unable to update farm status."
            );

          setError(
            message
          );

          throw err;

        } finally {
          setIsSavingFarm(
            false
          );
        }
      },
      [
        filters,
        loadFarms,
        request,
      ]
    );


  // =========================================================
  // CROP ACTION REQUEST HELPER
  // =========================================================

  const runCropAction =
    useCallback(
      async ({
        farmId,
        endpoint,
        method,
        body,
        fallbackMessage,
      }) => {
        if (!farmId) {
          throw new Error(
            "Farm ID is required."
          );
        }

        setIsSavingCrop(
          true
        );

        setError(
          ""
        );

        try {
          const response =
            await request(
              (
                `/farmer/farm-management/farms/${farmId}/crop/` +
                endpoint
              ),
              {
                method,
                body,

                throwOnError:
                  true,
              }
            );

          const farm =
            normalizeFarm(
              unwrapData(
                response
              )
            );

          setSelectedFarm(
            farm
          );

          await loadFarms(
            filters
          );

          return farm;

        } catch (err) {
          const message =
            getErrorMessage(
              err,
              fallbackMessage
            );

          setError(
            message
          );

          throw err;

        } finally {
          setIsSavingCrop(
            false
          );
        }
      },
      [
        filters,
        loadFarms,
        request,
      ]
    );


  // =========================================================
  // START LAND PREPARATION
  // =========================================================

  const startLandPreparation =
    useCallback(
      async (
        farmId,
        data
      ) => {
        return runCropAction({
          farmId,

          endpoint:
            "start-land-preparation/",

          method:
            "POST",

          body:
            data,

          fallbackMessage:
            "Unable to start land preparation.",
        });
      },
      [
        runCropAction,
      ]
    );


  // =========================================================
  // RECORD PLANTING
  // =========================================================

  const recordPlanting =
    useCallback(
      async (
        farmId,
        data
      ) => {
        return runCropAction({
          farmId,

          endpoint:
            "record-planting/",

          method:
            "POST",

          body:
            data,

          fallbackMessage:
            "Unable to record planting.",
        });
      },
      [
        runCropAction,
      ]
    );


  // =========================================================
  // UPDATE CURRENT CROP
  // =========================================================

  const updateCurrentCrop =
    useCallback(
      async (
        farmId,
        data
      ) => {
        return runCropAction({
          farmId,

          endpoint:
            "",

          method:
            "PATCH",

          body:
            data,

          fallbackMessage:
            "Unable to update current crop.",
        });
      },
      [
        runCropAction,
      ]
    );


  // =========================================================
  // RECORD HARVEST
  // =========================================================

  const recordHarvest =
    useCallback(
      async (
        farmId,
        data
      ) => {
        return runCropAction({
          farmId,

          endpoint:
            "record-harvest/",

          method:
            "POST",

          body:
            data,

          fallbackMessage:
            (
              "Unable to record harvest " +
              "and add it to Inventory."
            ),
        });
      },
      [
        runCropAction,
      ]
    );


  // =========================================================
  // RECORD FAILED CROP
  // =========================================================

  const recordFailedCrop =
    useCallback(
      async (
        farmId,
        data
      ) => {
        return runCropAction({
          farmId,

          endpoint:
            "record-failed/",

          method:
            "POST",

          body:
            data,

          fallbackMessage:
            "Unable to record failed crop.",
        });
      },
      [
        runCropAction,
      ]
    );


  // =========================================================
  // LOCAL HELPERS
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


  const clearSelectedFarm =
    useCallback(
      () => {
        setSelectedFarm(
          null
        );

        setFarmActivity(
          DEFAULT_ACTIVITY
        );
      },
      []
    );


  // =========================================================
  // RETURN
  // =========================================================

  return {
    // data
    farms,
    selectedFarm,
    farmActivity,
    filters,

    // loading
    isLoadingFarms,
    isLoadingFarmDetails,
    isLoadingActivity,
    isSavingFarm,
    isSavingCrop,

    // error
    error,

    // reads
    loadFarms,
    loadFarmDetails,
    loadFarmActivity,

    // farm actions
    addFarm,
    updateFarm,
    updateFarmStatus,

    // crop actions
    startLandPreparation,
    recordPlanting,
    updateCurrentCrop,
    recordHarvest,
    recordFailedCrop,

    // local state helpers
    setFilters,
    clearError,
    clearSelectedFarm,
  };
};


export default useFarmManagement;