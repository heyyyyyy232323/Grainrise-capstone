import {
  lazy,
  Suspense,
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  AlertCircle,
  Loader2,
  MapPin,
  Search,
  Sprout,
} from "lucide-react";

import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import Dropdown from "../../Components/Minor-Components/Dropdown";
import SortByDropdown from "../../Components/Minor-Components/SortByDropdown";

import FarmerFarmFormModal from "../../Components/Modals/FarmerFarmFormModal";

import useFarmManagement from "../../Components/hooks/Farmer/useFarmManagement";


// ============================================================
// INVENTORY
// ============================================================
//
// Lazy loaded para hindi masira ang existing My Farms page
// habang hindi pa binubuksan ang Inventory.
// ============================================================

const FarmerInventory =
  lazy(
    () =>
      import(
        "./FarmerInventory"
      )
  );


// ============================================================
// FARM MANAGEMENT SEGMENTS
// ============================================================

const SEGMENT_MY_FARMS =
  "my_farms";

const SEGMENT_INVENTORY =
  "inventory";


// ============================================================
// DEFAULT FILTERS
// ============================================================

const DEFAULT_FILTERS = {
  search: "",
  cropStatus: "",
  farmStatus: "",
  sortBy: "newest",
};


// ============================================================
// CROP STATUS OPTIONS
// ============================================================

const CROP_STATUS_OPTIONS = [
  {
    value: "",
    label: "All Crop Statuses",
  },

  {
    value: "available_for_planting",
    label: "Available for Planting",
  },

  {
    value: "land_preparation",
    label: "Land Preparation",
  },

  {
    value: "planted_and_growing",
    label: "Planted and Growing",
  },

  {
    value: "harvested",
    label: "Harvested",
  },

  {
    value: "failed_crop",
    label: "Failed Crop",
  },
];


// ============================================================
// FARM STATUS OPTIONS
// ============================================================

const FARM_STATUS_OPTIONS = [
  {
    value: "",
    label: "All Farm Statuses",
  },

  {
    value: "active",
    label: "Active",
  },

  {
    value: "inactive",
    label: "Inactive",
  },
];


// ============================================================
// SORT OPTIONS
// ============================================================

const SORT_OPTIONS = [
  {
    value: "newest",
    label: "Newest",
  },

  {
    value: "oldest",
    label: "Oldest",
  },

  {
    value: "size_highest",
    label: "Largest Area",
  },

  {
    value: "size_lowest",
    label: "Smallest Area",
  },
];


// ============================================================
// CROP STATUS LABELS
// ============================================================

const CROP_STATUS_LABELS = {
  available_for_planting:
    "Available for Planting",

  land_preparation:
    "Land Preparation",

  planted_and_growing:
    "Planted and Growing",

  harvested:
    "Harvested",

  failed_crop:
    "Failed Crop",
};


// ============================================================
// HELPERS
// ============================================================

const formatCropStatus = (
  status
) => {
  if (
    CROP_STATUS_LABELS[
      status
    ]
  ) {
    return CROP_STATUS_LABELS[
      status
    ];
  }

  const normalized =
    String(
      status || ""
    )
      .trim()
      .replaceAll(
        "_",
        " "
      );

  if (!normalized) {
    return "Available for Planting";
  }

  return normalized.replace(
    /\b\w/g,
    (
      character
    ) =>
      character.toUpperCase()
  );
};


const formatNumber = (
  value
) => {
  const number =
    Number(
      value
    );

  if (
    !Number.isFinite(
      number
    )
  ) {
    return "0";
  }

  return new Intl.NumberFormat(
    "en-PH",
    {
      maximumFractionDigits:
        2,
    }
  ).format(
    number
  );
};


const getFarmName = (
  farm
) => {
  const farmName =
    String(
      farm?.farm_name || ""
    ).trim();

  if (farmName) {
    return farmName;
  }

  return `Farm Lot #${farm?.farm_id || ""}`;
};


// ============================================================
// CROP STATUS BADGE
// ============================================================

const CropStatusBadge = ({
  status,
}) => {
  let classes =
    "border-slate-200 bg-slate-100 text-slate-600";

  if (
    status ===
    "land_preparation"
  ) {
    classes =
      "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (
    status ===
    "planted_and_growing"
  ) {
    classes =
      "border-green-200 bg-green-50 text-green-700";
  }

  if (
    status ===
    "harvested"
  ) {
    classes =
      "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    status ===
    "failed_crop"
  ) {
    classes =
      "border-red-200 bg-red-50 text-red-700";
  }

  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-full
        border
        px-2.5
        py-1
        text-xs
        font-semibold
        ${classes}
      `}
    >
      {
        formatCropStatus(
          status
        )
      }
    </span>
  );
};


// ============================================================
// FARM CARD
// ============================================================

const FarmCard = ({
  farm,
  onViewDetails,
}) => {
  const cropStatus =
    farm.current_crop_status ||
    "available_for_planting";

  return (
    <article
      className="
        flex
        min-h-[330px]
        flex-col
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-5
        shadow-sm
        transition
        hover:border-slate-300
        hover:shadow-md
      "
    >

      {/* FARM NUMBER & STATUS */}

      <div className="flex items-center justify-between">
        <p
          className="
            text-xs
            font-bold
            uppercase
            tracking-wide
            text-green-700
          "
        >
          Farm #{farm.farm_id || farm.farm_profile_id}
        </p>

        <span
          className={`
            inline-flex
            items-center
            rounded-full
            border
            px-2.5
            py-0.5
            text-xs
            font-semibold
            ${
              String(farm.farm_status || farm.status || "").toLowerCase() === "inactive"
                ? "border-slate-300 bg-slate-100 text-slate-600"
                : "border-green-200 bg-green-50 text-green-700"
            }
          `}
        >
          {String(farm.farm_status || farm.status || "").toLowerCase() === "inactive"
            ? "Inactive"
            : "Active"}
        </span>
      </div>


      {/* FARM NAME */}

      <h3
        className="
          mt-1
          break-words
          text-lg
          font-bold
          text-slate-900
        "
      >
        {
          getFarmName(
            farm
          )
        }
      </h3>


      {/* LOCATION */}

      <div
        className="
          mt-4
          flex
          min-h-[42px]
          items-start
          gap-2
          text-sm
          text-slate-500
        "
      >
        <MapPin
          size={16}
          className="
            mt-0.5
            shrink-0
            text-slate-400
          "
        />

        <span
          className="
            break-words
          "
        >
          {
            farm.farm_location ||
            "Farm location not recorded"
          }
        </span>
      </div>


      {/* FARM AREA */}

      <div
        className="
          mt-6
          rounded-xl
          bg-slate-50
          px-4
          py-3
        "
      >
        <p
          className="
            text-xs
            font-medium
            text-slate-400
          "
        >
          Total Farm Area
        </p>

        <p
          className="
            mt-1
            text-sm
            font-bold
            text-slate-900
          "
        >
          {
            formatNumber(
              farm.total_farm_area
            )
          }{" "}
          ha
        </p>
      </div>


      {/* CURRENT CROP STATUS */}

      <div
        className="
          mt-4
        "
      >
        <p
          className="
            text-xs
            font-medium
            text-slate-500
          "
        >
          Current Crop Status
        </p>

        <div
          className="
            mt-2
          "
        >
          <CropStatusBadge
            status={
              cropStatus
            }
          />
        </div>
      </div>


      {/* VIEW DETAILS */}

      <div
        className="
          mt-auto
          pt-5
        "
      >
        <button
          type="button"
          onClick={
            () =>
              onViewDetails(
                farm.farm_id || farm.farm_profile_id
              )
          }
          className="
            w-full
            rounded-lg
            bg-green-700
            px-4
            py-2.5
            text-sm
            font-semibold
            text-white
            transition
            hover:bg-green-800
            focus:outline-none
            focus:ring-2
            focus:ring-green-600
            focus:ring-offset-2
          "
        >
          View Details
        </button>
      </div>

    </article>
  );
};


// ============================================================
// INVENTORY LOADING
// ============================================================

const InventoryLoading = () => {
  return (
    <div
      className="
        flex
        min-h-[320px]
        items-center
        justify-center
        rounded-2xl
        border
        border-slate-200
        bg-white
      "
    >
      <div
        className="
          flex
          flex-col
          items-center
          gap-3
          text-slate-500
        "
      >
        <Loader2
          size={28}
          className="
            animate-spin
            text-green-700
          "
        />

        <p
          className="
            text-sm
            font-medium
          "
        >
          Loading Inventory...
        </p>
      </div>
    </div>
  );
};


// ============================================================
// COMPONENT
// ============================================================

export default function FarmerFarmManagement() {
  const navigate =
    useNavigate();


  // =========================================================
  // HOOK
  // =========================================================

  const {
    farms,

    isLoadingFarms,
    isSavingFarm,

    error,

    loadFarms,
    addFarm,

    clearError,
  } =
    useFarmManagement();


  // =========================================================
  // ACTIVE SEGMENT
  // =========================================================

  const [
    activeSegment,
    setActiveSegment,
  ] =
    useState(
      SEGMENT_MY_FARMS
    );


  // =========================================================
  // LOCAL STATE
  // =========================================================

  const [
    filters,
    setFilters,
  ] =
    useState(
      DEFAULT_FILTERS
    );


  const [
    addFarmModalOpen,
    setAddFarmModalOpen,
  ] =
    useState(
      false
    );


  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState(
      ""
    );


  // =========================================================
  // LOAD FARMS
  // =========================================================
  //
  // Only load farm records while My Farms is active.
  // Inventory has its own hook and API loading.
  // =========================================================

  useEffect(
    () => {
      if (
        activeSegment !==
        SEGMENT_MY_FARMS
      ) {
        return undefined;
      }

      const timer =
        window.setTimeout(
          () => {
            loadFarms(
              filters
            ).catch(
              () => {}
            );
          },
          300
        );

      return () => {
        window.clearTimeout(
          timer
        );
      };
    },
    [
      activeSegment,
      filters.search,
      filters.cropStatus,
      filters.farmStatus,
      filters.sortBy,
    ]
  );


  // =========================================================
  // SUCCESS MESSAGE TIMER
  // =========================================================

  useEffect(
    () => {
      if (
        !successMessage
      ) {
        return undefined;
      }

      const timer =
        window.setTimeout(
          () => {
            setSuccessMessage(
              ""
            );
          },
          4000
        );

      return () => {
        window.clearTimeout(
          timer
        );
      };
    },
    [
      successMessage,
    ]
  );


  // =========================================================
  // SEGMENT CHANGE
  // =========================================================

  const handleSegmentChange = (
    segment
  ) => {
    clearError();

    setSuccessMessage(
      ""
    );

    setActiveSegment(
      segment
    );
  };


  // =========================================================
  // FILTER CHANGE
  // =========================================================

  const handleFilterChange = (
    field,
    value
  ) => {
    setFilters(
      (
        current
      ) => ({
        ...current,

        [field]:
          value,
      })
    );
  };


  // =========================================================
  // RESET FILTERS
  // =========================================================

  const handleResetFilters = () => {
    clearError();

    setFilters({
      ...DEFAULT_FILTERS,
    });
  };


  // =========================================================
  // ADD FARM
  // =========================================================

  const handleOpenAddFarm = () => {
    clearError();

    setAddFarmModalOpen(
      true
    );
  };


  const handleCloseAddFarm = () => {
    if (
      isSavingFarm
    ) {
      return;
    }

    clearError();

    setAddFarmModalOpen(
      false
    );
  };


  const handleAddFarm =
    async (
      farmData
    ) => {
      try {
        await addFarm(
          farmData
        );

        setAddFarmModalOpen(
          false
        );

        setSuccessMessage(
          "Farm added successfully."
        );

        await loadFarms(
          filters
        ).catch(() => {});
      } catch {
        // Keep modal open.
      }
    };


  // =========================================================
  // VIEW DETAILS
  // =========================================================

  const handleViewDetails = (
    farmId
  ) => {
    if (!farmId) {
      return;
    }

    clearError();

    navigate(
      `/farmer/farm-management/${farmId}`
    );
  };


  // =========================================================
  // RETRY
  // =========================================================

  const handleRetry = () => {
    clearError();

    loadFarms(
      filters
    ).catch(
      () => {}
    );
  };


  // =========================================================
  // FILTER CHECK
  // =========================================================

  const hasActiveFilters =
    Boolean(
      filters.search ||
      filters.cropStatus ||
      filters.farmStatus ||
      filters.sortBy !==
        "newest"
    );


  const isMyFarms =
    activeSegment ===
    SEGMENT_MY_FARMS;


  const isInventory =
    activeSegment ===
    SEGMENT_INVENTORY;


  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div
      className="
        space-y-6
      "
    >

      {/* ====================================================
          BREADCRUMBS
      ==================================================== */}

      <Breadcrumbs
        items={[
          {
            label:
              "Farm",
          },

          {
            label:
              "Farm Management",
          },
        ]}
      />


      {/* ====================================================
          PAGE HEADER
      ==================================================== */}

      <div
        className="
          flex
          flex-col
          gap-4
          sm:flex-row
          sm:items-start
          sm:justify-between
        "
      >
        <div />


        {/* ADD NEW FARM — ONLY MY FARMS */}

        {
          isMyFarms &&
          (
            <button
              type="button"
              onClick={
                handleOpenAddFarm
              }
              className="
                shrink-0
                rounded-lg
                bg-green-700
                px-5
                py-2.5
                text-sm
                font-semibold
                text-white
                transition
                hover:bg-green-800
                focus:outline-none
                focus:ring-2
                focus:ring-green-600
                focus:ring-offset-2
              "
            >
              Add New Farm
            </button>
          )
        }

      </div>


      {/* ====================================================
          SEGMENTATION
      ==================================================== */}

      <div
        className="
          flex
          items-end
          gap-7
          border-b
          border-slate-200
        "
      >

        {/* MY FARMS */}

        <button
          type="button"
          onClick={
            () =>
              handleSegmentChange(
                SEGMENT_MY_FARMS
              )
          }
          className={`
            border-b-2
            px-1
            pb-3
            text-sm
            transition

            ${
              isMyFarms
                ? (
                  "border-green-700 " +
                  "font-bold " +
                  "text-green-700"
                )
                : (
                  "border-transparent " +
                  "font-semibold " +
                  "text-slate-500 " +
                  "hover:text-slate-700"
                )
            }
          `}
        >
          My Farms
        </button>


        {/* INVENTORY */}

        <button
          type="button"
          onClick={
            () =>
              handleSegmentChange(
                SEGMENT_INVENTORY
              )
          }
          className={`
            border-b-2
            px-1
            pb-3
            text-sm
            transition

            ${
              isInventory
                ? (
                  "border-green-700 " +
                  "font-bold " +
                  "text-green-700"
                )
                : (
                  "border-transparent " +
                  "font-semibold " +
                  "text-slate-500 " +
                  "hover:text-slate-700"
                )
            }
          `}
        >
          Inventory
        </button>

      </div>


      {/* ====================================================
          MY FARMS CONTENT
      ==================================================== */}

      {
        isMyFarms &&
        (
          <>

            {/* ==============================================
                SUCCESS
            ============================================== */}

            {
              successMessage &&
              (
                <div
                  className="
                    flex
                    items-start
                    gap-3
                    rounded-xl
                    border
                    border-green-200
                    bg-green-50
                    px-4
                    py-3
                    text-sm
                    text-green-700
                  "
                >
                  <Sprout
                    size={18}
                    className="
                      mt-0.5
                      shrink-0
                    "
                  />

                  <span>
                    {
                      successMessage
                    }
                  </span>
                </div>
              )
            }


            {/* ==============================================
                FILTERS
            ============================================== */}

            <section
              className="
                rounded-2xl
                border
                border-slate-200
                bg-white
                p-4
                shadow-sm
              "
            >
              <div
                className="
                  grid
                  gap-3
                  md:grid-cols-2
                  xl:grid-cols-[minmax(280px,2fr)_minmax(180px,1fr)_minmax(170px,1fr)_minmax(150px,0.9fr)_auto]
                "
              >

                {/* SEARCH FARM */}

                <div>
                  <label
                    htmlFor="farm-search"
                    className="
                      mb-1.5
                      block
                      text-xs
                      font-semibold
                      text-slate-600
                    "
                  >
                    Search Farm
                  </label>

                  <div
                    className="
                      relative
                    "
                  >
                    <Search
                      size={17}
                      className="
                        pointer-events-none
                        absolute
                        left-3
                        top-1/2
                        -translate-y-1/2
                        text-slate-400
                      "
                    />

                    <input
                      id="farm-search"
                      type="text"
                      value={
                        filters.search
                      }
                      onChange={
                        (
                          event
                        ) =>
                          handleFilterChange(
                            "search",
                            event.target.value
                          )
                      }
                      placeholder="Search farm name or location"
                      className="
                        w-full
                        rounded-lg
                        border
                        border-slate-300
                        bg-white
                        py-2.5
                        pl-10
                        pr-3
                        text-sm
                        text-slate-800
                        outline-none
                        transition
                        placeholder:text-slate-400
                        focus:border-green-600
                        focus:ring-1
                        focus:ring-green-600
                      "
                    />
                  </div>
                </div>


                {/* CURRENT CROP STATUS */}
                <div>
                  <label
                    className="
                      mb-1.5
                      block
                      text-xs
                      font-semibold
                      text-slate-600
                    "
                  >
                    Current Crop Status
                  </label>
                  <Dropdown
                    options={CROP_STATUS_OPTIONS}
                    value={filters.cropStatus}
                    onChange={(value) =>
                      handleFilterChange("cropStatus", value)
                    }
                    placeholder="Crop Status"
                  />
                </div>


                {/* FARM STATUS */}
                <div>
                  <label
                    className="
                      mb-1.5
                      block
                      text-xs
                      font-semibold
                      text-slate-600
                    "
                  >
                    Farm Status
                  </label>
                  <Dropdown
                    options={FARM_STATUS_OPTIONS}
                    value={filters.farmStatus}
                    onChange={(value) =>
                      handleFilterChange("farmStatus", value)
                    }
                    placeholder="Farm Status"
                  />
                </div>


                {/* SORT */}
                <div>
                  <label
                    className="
                      mb-1.5
                      block
                      text-xs
                      font-semibold
                      text-slate-600
                    "
                  >
                    Sort By
                  </label>
                  <SortByDropdown
                    options={SORT_OPTIONS}
                    value={filters.sortBy}
                    onChange={(value) =>
                      handleFilterChange("sortBy", value)
                    }
                  />
                </div>


                {/* RESET */}

                <div
                  className="
                    flex
                    items-end
                  "
                >
                  <button
                    type="button"
                    onClick={
                      handleResetFilters
                    }
                    disabled={
                      !hasActiveFilters
                    }
                    className="
                      w-full
                      rounded-lg
                      border
                      border-slate-300
                      bg-white
                      px-4
                      py-2.5
                      text-sm
                      font-semibold
                      text-slate-600
                      transition
                      hover:bg-slate-50
                      disabled:cursor-not-allowed
                      disabled:opacity-40
                      xl:w-auto
                    "
                  >
                    Reset
                  </button>
                </div>

              </div>
            </section>


            {/* ==============================================
                PAGE ERROR
            ============================================== */}

            {
              error &&
              !addFarmModalOpen &&
              (
                <div
                  className="
                    flex
                    flex-col
                    gap-3
                    rounded-xl
                    border
                    border-red-200
                    bg-red-50
                    px-4
                    py-3
                    text-sm
                    text-red-700
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                  "
                >

                  <div
                    className="
                      flex
                      items-start
                      gap-3
                    "
                  >
                    <AlertCircle
                      size={18}
                      className="
                        mt-0.5
                        shrink-0
                      "
                    />

                    <span>
                      {error}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleRetry
                    }
                    className="
                      self-start
                      text-sm
                      font-semibold
                      text-red-700
                      underline
                      underline-offset-2
                      hover:text-red-800
                      sm:self-auto
                    "
                  >
                    Try Again
                  </button>

                </div>
              )
            }


            {/* ==============================================
                LOADING
            ============================================== */}

            {
              isLoadingFarms &&
              farms.length ===
                0
                ? (
                  <div
                    className="
                      flex
                      min-h-[300px]
                      items-center
                      justify-center
                      rounded-2xl
                      border
                      border-slate-200
                      bg-white
                    "
                  >
                    <div
                      className="
                        flex
                        flex-col
                        items-center
                        gap-3
                        text-slate-500
                      "
                    >
                      <Loader2
                        size={28}
                        className="
                          animate-spin
                          text-green-700
                        "
                      />

                      <p
                        className="
                          text-sm
                          font-medium
                        "
                      >
                        Loading your farms...
                      </p>
                    </div>
                  </div>
                )
                : (
                  <>

                    {/* ========================================
                        EMPTY STATE
                    ======================================== */}

                    {
                      farms.length ===
                        0
                        ? (
                          <div
                            className="
                              rounded-2xl
                              border
                              border-slate-200
                              bg-white
                              px-6
                              py-14
                              text-center
                              shadow-sm
                            "
                          >
                            <div
                              className="
                                mx-auto
                                flex
                                h-12
                                w-12
                                items-center
                                justify-center
                                rounded-full
                                bg-green-50
                                text-green-700
                              "
                            >
                              <Sprout
                                size={23}
                              />
                            </div>

                            <h2
                              className="
                                mt-4
                                text-lg
                                font-bold
                                text-slate-900
                              "
                            >
                              {
                                hasActiveFilters
                                  ? (
                                    "No farms match your filters"
                                  )
                                  : (
                                    "No registered farms yet"
                                  )
                              }
                            </h2>

                            <p
                              className="
                                mx-auto
                                mt-2
                                max-w-md
                                text-sm
                                text-slate-500
                              "
                            >
                              {
                                hasActiveFilters
                                  ? (
                                    "Try changing or clearing the search and filter options."
                                  )
                                  : (
                                    "Add your first farm or farm lot to start managing your farm records."
                                  )
                              }
                            </p>

                            {
                              hasActiveFilters
                                ? (
                                  <button
                                    type="button"
                                    onClick={
                                      handleResetFilters
                                    }
                                    className="
                                      mt-5
                                      rounded-lg
                                      border
                                      border-slate-300
                                      bg-white
                                      px-4
                                      py-2.5
                                      text-sm
                                      font-semibold
                                      text-slate-700
                                      transition
                                      hover:bg-slate-50
                                    "
                                  >
                                    Clear Filters
                                  </button>
                                )
                                : (
                                  <button
                                    type="button"
                                    onClick={
                                      handleOpenAddFarm
                                    }
                                    className="
                                      mt-5
                                      rounded-lg
                                      bg-green-700
                                      px-5
                                      py-2.5
                                      text-sm
                                      font-semibold
                                      text-white
                                      transition
                                      hover:bg-green-800
                                    "
                                  >
                                    Add New Farm
                                  </button>
                                )
                            }
                          </div>
                        )
                        : (
                          <>

                            {/* FARM CARDS */}

                            <div
                              className="
                                relative
                              "
                            >

                              {
                                isLoadingFarms &&
                                (
                                  <div
                                    className="
                                      pointer-events-none
                                      absolute
                                      right-1
                                      top-[-32px]
                                      flex
                                      items-center
                                      gap-2
                                      text-xs
                                      font-medium
                                      text-slate-400
                                    "
                                  >
                                    <Loader2
                                      size={13}
                                      className="
                                        animate-spin
                                      "
                                    />

                                    Updating farms...
                                  </div>
                                )
                              }


                              <div
                                className="
                                  grid
                                  gap-5
                                  md:grid-cols-2
                                  2xl:grid-cols-3
                                "
                              >
                                {
                                  farms.map(
                                    (
                                      farm
                                    ) => (
                                      <FarmCard
                                        key={
                                          farm.farm_id
                                        }
                                        farm={
                                          farm
                                        }
                                        onViewDetails={
                                          handleViewDetails
                                        }
                                      />
                                    )
                                  )
                                }
                              </div>

                            </div>


                            {/* FARM COUNT */}

                            <div
                              className="
                                flex
                                items-center
                                gap-2
                                pb-2
                                text-xs
                                text-slate-500
                              "
                            >
                              <Sprout
                                size={14}
                                className="
                                  text-slate-400
                                "
                              />

                              <span>
                                {
                                  farms.length
                                }{" "}
                                {
                                  farms.length ===
                                    1
                                    ? "farm"
                                    : "farms"
                                }{" "}
                                shown
                              </span>
                            </div>

                          </>
                        )
                    }

                  </>
                )
            }


            {/* ==============================================
                ADD FARM MODAL
            ============================================== */}

            <FarmerFarmFormModal
              open={
                addFarmModalOpen
              }
              mode="add"
              isSaving={
                isSavingFarm
              }
              error={
                addFarmModalOpen
                  ? error
                  : ""
              }
              onClose={
                handleCloseAddFarm
              }
              onSubmit={
                handleAddFarm
              }
            />

          </>
        )
      }


      {/* ====================================================
          INVENTORY CONTENT
      ==================================================== */}

      {
        isInventory &&
        (
          <Suspense
            fallback={
              <InventoryLoading />
            }
          >
            <FarmerInventory />
          </Suspense>
        )
      }

    </div>
  );
}