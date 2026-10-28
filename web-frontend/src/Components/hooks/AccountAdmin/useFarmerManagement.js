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
  "to-review": 0,
};


// ============================================================
// HELPERS
// ============================================================

const normalizeTab = (tab) => {
  if (tab === "active") {
    return "active";
  }

  if (tab === "inactive") {
    return "inactive";
  }

  return "to-review";
};


const normalizeCounts = (counts) => {
  const toReview = Number(
    counts?.to_review ?? counts?.["to-review"] ?? 0
  );
  const active = Number(counts?.active ?? 0);
  const inactive = Number(counts?.inactive ?? 0);

  return {
    to_review: toReview,
    active,
    inactive,
    "to-review": toReview,
  };
};


const normalizeFarmerRow = (row) => ({
  id: row?.id,
  user_id: row?.id,

  farmer:
    row?.farmer_name ||
    row?.farmer ||
    "",

  farmer_name:
    row?.farmer_name ||
    row?.farmer ||
    "",

  email:
    row?.email ||
    "",

  contact:
    row?.contact_number ||
    row?.contact ||
    "",

  contact_number:
    row?.contact_number ||
    row?.contact ||
    "",

  username:
    row?.username ||
    "",

  status:
    row?.status ||
    "",

  rsbsaNumber:
    row?.rsbsa_number ||
    row?.rsbsaNumber ||
    "—",

  rsbsa_number:
    row?.rsbsa_number ||
    row?.rsbsaNumber ||
    "—",

  submission_method:
    row?.submission_method ||
    "Online Partner Inquiry",

  farmCount: Number(
    row?.farm_count ??
    row?.farmCount ??
    0
  ),

  farm_count: Number(
    row?.farm_count ??
    row?.farmCount ??
    0
  ),

  total_farm_area:
    row?.total_farm_area ||
    0,

  archiveReason:
    row?.archive_reason ||
    row?.archiveReason ||
    "",

  archive_reason:
    row?.archive_reason ||
    row?.archiveReason ||
    "",

  archivedAt:
    row?.archived_at ||
    row?.archivedAt ||
    null,

  archived_at:
    row?.archived_at ||
    row?.archivedAt ||
    null,

  created_at:
    row?.created_at ||
    null,

  updated_at:
    row?.updated_at ||
    null,

  is_partnership: Boolean(
    row?.is_partnership
  ),
});


// ============================================================
// FARMER MANAGEMENT HOOK
// ============================================================

const useFarmerManagement = () => {
  const { request } = useApi();

  const [activeTab, setActiveTab] = useState("to-review");
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState(DEFAULT_COUNTS);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  // =========================================================
  // LOAD FARMERS
  // =========================================================

  const loadFarmers = useCallback(
    async (tab = activeTab) => {
      const normalizedTab = normalizeTab(tab);

      setIsLoading(true);
      setError("");

      try {
        const response = await request(
          `/admin/farmers/?tab=${encodeURIComponent(normalizedTab)}`,
          {
            throwOnError: true,
          }
        );

        const normalizedRows = Array.isArray(response?.results)
          ? response.results.map(normalizeFarmerRow)
          : [];

        setRows(normalizedRows);
        setCounts(normalizeCounts(response?.counts));

        return normalizedRows;
      } catch (requestError) {
        const message =
          requestError?.message || "Unable to load Farmer accounts.";

        setRows([]);
        setError(message);
        throw requestError;
      } finally {
        setIsLoading(false);
      }
    },
    [activeTab, request]
  );

  // =========================================================
  // CHANGE TAB
  // =========================================================

  const changeTab = useCallback((tab) => {
    setActiveTab(normalizeTab(tab));
  }, []);

  // =========================================================
  // GET FARMER DETAILS
  // =========================================================

  const getFarmerDetails = useCallback(
    async (userId) => {
      if (!userId) {
        throw new Error("Farmer user ID is required.");
      }

      setIsLoadingDetails(true);
      setError("");

      try {
        const response = await request(`/admin/farmers/${userId}/`, {
          throwOnError: true,
        });

        return response?.farmer || null;
      } catch (requestError) {
        const message =
          requestError?.message || "Unable to load Farmer details.";
        setError(message);
        throw requestError;
      } finally {
        setIsLoadingDetails(false);
      }
    },
    [request]
  );

  // =========================================================
  // CONFIRM FARMER
  // =========================================================

  const confirmFarmer = useCallback(
    async (userId) => {
      if (!userId) {
        throw new Error("Farmer user ID is required.");
      }

      setIsConfirming(true);
      setError("");

      try {
        const response = await request(
          `/admin/farmers/${userId}/confirm/`,
          {
            method: "POST",
            throwOnError: true,
          }
        );

        await loadFarmers(activeTab);
        return response;
      } catch (requestError) {
        const message =
          requestError?.message ||
          "Unable to confirm the Farmer application.";
        setError(message);
        throw requestError;
      } finally {
        setIsConfirming(false);
      }
    },
    [activeTab, loadFarmers, request]
  );

  // =========================================================
  // ARCHIVE FARMER
  // =========================================================

  const archiveFarmer = useCallback(
    async (userId, reason = "") => {
      if (!userId) {
        throw new Error("Farmer user ID is required.");
      }

      setIsArchiving(true);
      setError("");

      try {
        const response = await request(
          `/admin/farmers/${userId}/archive/`,
          {
            method: "POST",
            body: {
              reason: String(reason || "").trim(),
            },
            throwOnError: true,
          }
        );

        await loadFarmers(activeTab);
        return response;
      } catch (requestError) {
        const message =
          requestError?.message ||
          "Unable to archive the Farmer account.";
        setError(message);
        throw requestError;
      } finally {
        setIsArchiving(false);
      }
    },
    [activeTab, loadFarmers, request]
  );

  // =========================================================
  // RESTORE FARMER
  // =========================================================

  const restoreFarmer = useCallback(
    async (userId) => {
      if (!userId) {
        throw new Error("Farmer user ID is required.");
      }

      setIsRestoring(true);
      setError("");

      try {
        const response = await request(
          `/admin/farmers/${userId}/restore/`,
          {
            method: "POST",
            throwOnError: true,
          }
        );

        await loadFarmers(activeTab);
        return response;
      } catch (requestError) {
        const message =
          requestError?.message ||
          "Unable to restore the Farmer account.";
        setError(message);
        throw requestError;
      } finally {
        setIsRestoring(false);
      }
    },
    [activeTab, loadFarmers, request]
  );

  // =========================================================
  // DELETE FARMER
  // =========================================================

  const deleteFarmer = useCallback(
    async (userId) => {
      if (!userId) {
        throw new Error("Farmer user ID is required.");
      }

      setIsDeleting(true);
      setError("");

      try {
        const response = await request(
          `/admin/farmers/${userId}/delete/`,
          {
            method: "POST",
            throwOnError: true,
          }
        );

        await loadFarmers(activeTab);
        return response;
      } catch (requestError) {
        const message =
          requestError?.message ||
          "Unable to permanently delete the Farmer account.";
        setError(message);
        throw requestError;
      } finally {
        setIsDeleting(false);
      }
    },
    [activeTab, loadFarmers, request]
  );

  // =========================================================
  // REFRESH CURRENT TAB
  // =========================================================

  const refreshFarmers = useCallback(
    () => loadFarmers(activeTab),
    [activeTab, loadFarmers]
  );

  // =========================================================
  // INITIAL & TAB CHANGE AUTO-FETCH
  // =========================================================

  useEffect(() => {
    loadFarmers(activeTab).catch(() => {
      // Error handled within loadFarmers
    });
  }, [activeTab, loadFarmers]);

  const clearError = useCallback(() => setError(""), []);

  return {
    activeTab,
    changeTab,

    farmers: rows,
    rows,
    counts,

    isLoading,
    isLoadingDetails,
    isDetailsLoading: isLoadingDetails,

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
