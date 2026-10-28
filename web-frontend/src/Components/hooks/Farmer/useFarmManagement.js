import { useCallback, useState } from "react";

// ============================================================
// DEFAULTS & INITIAL SAMPLE DATA
// ============================================================

const DEFAULT_FILTERS = {
  search: "",
  cropStatus: "",
  farmStatus: "",
  sortBy: "newest",
};

const INITIAL_FARMS = [
  {
    farm_id: 1,
    farm_name: "Green Valley Rice Field",
    total_farm_area: 3.5,
    farm_location: "Barangay San Jose, Cabanatuan City, Nueva Ecija",
    street_address: "Purok 4",
    barangay: "San Jose",
    municipality: "Cabanatuan City",
    province: "Nueva Ecija",
    postal_code: "3100",
    land_ownership_status: "Owned",
    cropping_cycles_per_year: 2,
    registered_rice_variety: "RC 222 (Tubigan 18)",
    current_rice_variety: "RC 222 (Tubigan 18)",
    current_crop_status: "Planted",
    land_preparation_date: "2026-08-10",
    planting_date: "2026-08-28",
    expected_harvest_date: "2026-12-15",
    expected_yield_kg: 14500,
    actual_harvest_date: null,
    actual_yield_kg: null,
    failure_reason: null,
    failure_remarks: null,
    status: "active",
    created_at: "2026-01-15T08:00:00Z",
    updated_at: "2026-08-28T10:00:00Z",
  },
  {
    farm_id: 2,
    farm_name: "Central Isabela Agri Lot",
    total_farm_area: 5.0,
    farm_location: "Barangay Maligaya, Cauayan City, Isabela",
    street_address: "Sitio Ilang-Ilang",
    barangay: "Maligaya",
    municipality: "Cauayan City",
    province: "Isabela",
    postal_code: "3305",
    land_ownership_status: "Leased",
    cropping_cycles_per_year: 2,
    registered_rice_variety: "NSIC Rc 160",
    current_rice_variety: "NSIC Rc 160",
    current_crop_status: "Land Preparation",
    land_preparation_date: "2026-10-01",
    planting_date: null,
    expected_harvest_date: "2027-02-10",
    expected_yield_kg: 21000,
    actual_harvest_date: null,
    actual_yield_kg: null,
    failure_reason: null,
    failure_remarks: null,
    status: "active",
    created_at: "2026-02-20T09:30:00Z",
    updated_at: "2026-10-01T14:15:00Z",
  },
  {
    farm_id: 3,
    farm_name: "Tarlac Plains Paddy 4",
    total_farm_area: 2.0,
    farm_location: "Barangay Poblacion, Concepcion, Tarlac",
    street_address: "Zone 2",
    barangay: "Poblacion",
    municipality: "Concepcion",
    province: "Tarlac",
    postal_code: "2316",
    land_ownership_status: "Owned",
    cropping_cycles_per_year: 3,
    registered_rice_variety: "Angelica Special",
    current_rice_variety: "Angelica Special",
    current_crop_status: "Harvested",
    land_preparation_date: "2026-05-10",
    planting_date: "2026-05-25",
    expected_harvest_date: "2026-09-20",
    actual_harvest_date: "2026-09-22",
    expected_yield_kg: 9000,
    actual_yield_kg: 9450,
    failure_reason: null,
    failure_remarks: null,
    status: "active",
    created_at: "2026-03-05T11:00:00Z",
    updated_at: "2026-09-22T16:00:00Z",
  },
];

const INITIAL_ACTIVITIES = {
  1: [
    {
      activity_id: 101,
      farm_id: 1,
      activity_type: "Planting Recorded",
      title: "Crop Cycle Planted",
      notes: "Planted certified inbred RC 222 seeds across 3.5 ha.",
      activity_date: "2026-08-28",
      created_at: "2026-08-28T09:30:00Z",
      status: "completed",
    },
    {
      activity_id: 102,
      farm_id: 1,
      activity_type: "Land Preparation",
      title: "Tillage & Levelling",
      notes: "Plowing, harrowing, and field leveling completed.",
      activity_date: "2026-08-10",
      created_at: "2026-08-10T08:00:00Z",
      status: "completed",
    },
  ],
  2: [
    {
      activity_id: 201,
      farm_id: 2,
      activity_type: "Land Preparation",
      title: "Field Preparation Begun",
      notes: "Initial rotary tillage and canal inspection.",
      activity_date: "2026-10-01",
      created_at: "2026-10-01T14:15:00Z",
      status: "in_progress",
    },
  ],
  3: [
    {
      activity_id: 301,
      farm_id: 3,
      activity_type: "Harvest Recorded",
      title: "Harvest Completed",
      notes: "9,450 kg harvested at 14% moisture content.",
      activity_date: "2026-09-22",
      created_at: "2026-09-22T16:00:00Z",
      status: "completed",
    },
    {
      activity_id: 302,
      farm_id: 3,
      activity_type: "Planting Recorded",
      title: "Planting Angelica Special",
      notes: "Transplanted 21-day seedlings.",
      activity_date: "2026-05-25",
      created_at: "2026-05-25T10:00:00Z",
      status: "completed",
    },
  ],
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
// HOOK
// ============================================================

export const useFarmManagement = () => {
  const [farms, setFarms] = useState(INITIAL_FARMS);
  const [selectedFarm, setSelectedFarm] = useState(INITIAL_FARMS[0]);
  const [farmActivity, setFarmActivity] = useState({
    items: INITIAL_ACTIVITIES[1] || [],
    pagination: {
      page: 1,
      page_size: 10,
      total_items: (INITIAL_ACTIVITIES[1] || []).length,
      total_pages: 1,
    },
  });
  const [activitiesByFarm, setActivitiesByFarm] = useState(INITIAL_ACTIVITIES);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const [isLoadingFarms, setIsLoadingFarms] = useState(false);
  const [isLoadingFarmDetails, setIsLoadingFarmDetails] = useState(false);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [isSavingFarm, setIsSavingFarm] = useState(false);
  const [isSavingCrop, setIsSavingCrop] = useState(false);
  const [error, setError] = useState("");

  // =========================================================
  // READS
  // =========================================================

  const loadFarms = useCallback(async () => {
    setIsLoadingFarms(false);
    return farms;
  }, [farms]);

  const loadFarmDetails = useCallback(
    async (farmId) => {
      setIsLoadingFarmDetails(false);
      const targetId = Number(farmId);
      const farm = farms.find((f) => Number(f.farm_id) === targetId) || farms[0] || null;
      if (farm) {
        setSelectedFarm(farm);
        const activities = activitiesByFarm[targetId] || [];
        setFarmActivity({
          items: activities,
          pagination: {
            page: 1,
            page_size: 10,
            total_items: activities.length,
            total_pages: 1,
          },
        });
      }
      return farm;
    },
    [farms, activitiesByFarm]
  );

  const loadFarmActivity = useCallback(
    async (farmId, params = {}) => {
      setIsLoadingActivity(false);
      const targetId = Number(farmId);
      const activities = activitiesByFarm[targetId] || [];
      const result = {
        items: activities,
        pagination: {
          page: Number(params.page || 1),
          page_size: 10,
          total_items: activities.length,
          total_pages: Math.max(1, Math.ceil(activities.length / 10)),
        },
      };
      setFarmActivity(result);
      return result;
    },
    [activitiesByFarm]
  );

  // =========================================================
  // FARM ACTIONS
  // =========================================================

  const addFarm = useCallback(async (payload) => {
    setIsSavingFarm(true);
    const newId = Date.now();
    const locationStr = [
      payload.street_address,
      payload.barangay ? `Barangay ${payload.barangay}` : "",
      payload.municipality,
      payload.province,
    ]
      .filter(Boolean)
      .join(", ");

    const newFarm = {
      farm_id: newId,
      farm_name: payload.farm_name || "New Rice Farm",
      total_farm_area: Number(payload.total_farm_area || 1),
      farm_location: locationStr || "Nueva Ecija",
      street_address: payload.street_address || "",
      barangay: payload.barangay || "",
      municipality: payload.municipality || "",
      province: payload.province || "",
      postal_code: payload.postal_code || "",
      land_ownership_status: payload.land_ownership_status || "Owned",
      cropping_cycles_per_year: Number(payload.cropping_cycles_per_year || 2),
      registered_rice_variety: payload.registered_rice_variety || "RC 222 (Tubigan 18)",
      current_rice_variety: payload.registered_rice_variety || "RC 222 (Tubigan 18)",
      current_crop_status: "Land Preparation",
      land_preparation_date: new Date().toISOString().split("T")[0],
      planting_date: null,
      expected_harvest_date: null,
      expected_yield_kg: Number(payload.total_farm_area || 1) * 4000,
      actual_harvest_date: null,
      actual_yield_kg: null,
      failure_reason: null,
      failure_remarks: null,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setFarms((prev) => [newFarm, ...prev]);
    setIsSavingFarm(false);
    return { success: true, data: newFarm };
  }, []);

  const updateFarm = useCallback(async (farmId, payload) => {
    setIsSavingFarm(true);
    const targetId = Number(farmId);
    let updatedObj = null;

    setFarms((prev) =>
      prev.map((f) => {
        if (Number(f.farm_id) === targetId) {
          updatedObj = {
            ...f,
            ...payload,
            total_farm_area: Number(payload.total_farm_area ?? f.total_farm_area),
            updated_at: new Date().toISOString(),
          };
          return updatedObj;
        }
        return f;
      })
    );

    if (updatedObj) {
      setSelectedFarm(updatedObj);
    }
    setIsSavingFarm(false);
    return { success: true, data: updatedObj };
  }, []);

  const updateFarmStatus = useCallback(async (farmId, status) => {
    const targetId = Number(farmId);
    setFarms((prev) =>
      prev.map((f) => {
        if (Number(f.farm_id) === targetId) {
          return { ...f, status, farm_status: status };
        }
        return f;
      })
    );
    return { success: true };
  }, []);

  // =========================================================
  // CROP ACTIONS
  // =========================================================

  const addActivityForFarm = (farmId, activity) => {
    const targetId = Number(farmId);
    const newActivity = {
      activity_id: Date.now(),
      farm_id: targetId,
      created_at: new Date().toISOString(),
      ...activity,
    };
    setActivitiesByFarm((prev) => ({
      ...prev,
      [targetId]: [newActivity, ...(prev[targetId] || [])],
    }));
    setFarmActivity((prev) => ({
      ...prev,
      items: [newActivity, ...prev.items],
      pagination: {
        ...prev.pagination,
        total_items: prev.items.length + 1,
      },
    }));
  };

  const startLandPreparation = useCallback(async (farmId, payload = {}) => {
    setIsSavingCrop(true);
    const targetId = Number(farmId);
    const prepDate = payload.land_preparation_date || new Date().toISOString().split("T")[0];

    setFarms((prev) =>
      prev.map((f) => {
        if (Number(f.farm_id) === targetId) {
          const updated = {
            ...f,
            current_crop_status: "Land Preparation",
            land_preparation_date: prepDate,
            planting_date: null,
            expected_harvest_date: null,
            actual_harvest_date: null,
            actual_yield_kg: null,
            failure_reason: null,
            failure_remarks: null,
          };
          setSelectedFarm(updated);
          return updated;
        }
        return f;
      })
    );

    addActivityForFarm(targetId, {
      activity_type: "Land Preparation",
      title: "Started Land Preparation",
      notes: payload.notes || "Field tilling and harrowing commenced.",
      activity_date: prepDate,
      status: "completed",
    });

    setIsSavingCrop(false);
    return { success: true };
  }, []);

  const recordPlanting = useCallback(async (farmId, payload = {}) => {
    setIsSavingCrop(true);
    const targetId = Number(farmId);
    const plantDate = payload.planting_date || new Date().toISOString().split("T")[0];

    setFarms((prev) =>
      prev.map((f) => {
        if (Number(f.farm_id) === targetId) {
          const updated = {
            ...f,
            current_crop_status: "Planted",
            planting_date: plantDate,
            current_rice_variety: payload.rice_variety || f.registered_rice_variety,
            expected_harvest_date: payload.expected_harvest_date || f.expected_harvest_date,
            expected_yield_kg: Number(payload.expected_yield_kg || f.expected_yield_kg || 10000),
          };
          setSelectedFarm(updated);
          return updated;
        }
        return f;
      })
    );

    addActivityForFarm(targetId, {
      activity_type: "Planting Recorded",
      title: `Planting ${payload.rice_variety || "Rice Crop"}`,
      notes: payload.notes || "Planting recorded successfully.",
      activity_date: plantDate,
      status: "completed",
    });

    setIsSavingCrop(false);
    return { success: true };
  }, []);

  const updateCurrentCrop = useCallback(async (farmId, payload = {}) => {
    setIsSavingCrop(true);
    const targetId = Number(farmId);

    setFarms((prev) =>
      prev.map((f) => {
        if (Number(f.farm_id) === targetId) {
          const updated = {
            ...f,
            ...payload,
          };
          setSelectedFarm(updated);
          return updated;
        }
        return f;
      })
    );

    setIsSavingCrop(false);
    return { success: true };
  }, []);

  const recordHarvest = useCallback(async (farmId, payload = {}) => {
    setIsSavingCrop(true);
    const targetId = Number(farmId);
    const harvestDate = payload.actual_harvest_date || new Date().toISOString().split("T")[0];
    const actualYield = Number(payload.actual_yield_kg || 10000);

    setFarms((prev) =>
      prev.map((f) => {
        if (Number(f.farm_id) === targetId) {
          const updated = {
            ...f,
            current_crop_status: "Harvested",
            actual_harvest_date: harvestDate,
            actual_yield_kg: actualYield,
          };
          setSelectedFarm(updated);
          return updated;
        }
        return f;
      })
    );

    addActivityForFarm(targetId, {
      activity_type: "Harvest Recorded",
      title: "Harvest Recorded",
      notes: payload.notes || `Yield recorded: ${actualYield.toLocaleString()} kg.`,
      activity_date: harvestDate,
      status: "completed",
    });

    setIsSavingCrop(false);
    return { success: true };
  }, []);

  const recordFailedCrop = useCallback(async (farmId, payload = {}) => {
    setIsSavingCrop(true);
    const targetId = Number(farmId);
    const failDate = payload.failure_date || new Date().toISOString().split("T")[0];

    setFarms((prev) =>
      prev.map((f) => {
        if (Number(f.farm_id) === targetId) {
          const updated = {
            ...f,
            current_crop_status: "Failed",
            failure_reason: payload.failure_reason || "Calamity/Pest",
            failure_remarks: payload.failure_remarks || payload.notes || "Crop loss reported.",
          };
          setSelectedFarm(updated);
          return updated;
        }
        return f;
      })
    );

    addActivityForFarm(targetId, {
      activity_type: "Crop Failure Recorded",
      title: "Crop Failure Reported",
      notes: payload.failure_remarks || payload.notes || "Crop failure recorded.",
      activity_date: failDate,
      status: "failed",
    });

    setIsSavingCrop(false);
    return { success: true };
  }, []);

  // =========================================================
  // LOCAL HELPERS
  // =========================================================

  const clearError = useCallback(() => {
    setError("");
  }, []);

  const clearSelectedFarm = useCallback(() => {
    setSelectedFarm(null);
    setFarmActivity(DEFAULT_ACTIVITY);
  }, []);

  return {
    farms,
    selectedFarm,
    farmActivity,
    filters,

    isLoadingFarms,
    isLoadingFarmDetails,
    isLoadingActivity,
    isSavingFarm,
    isSavingCrop,

    error,

    loadFarms,
    loadFarmDetails,
    loadFarmActivity,

    addFarm,
    updateFarm,
    updateFarmStatus,

    startLandPreparation,
    recordPlanting,
    updateCurrentCrop,
    recordHarvest,
    recordFailedCrop,

    setFilters,
    clearError,
    clearSelectedFarm,
  };
};

export default useFarmManagement;
