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
import Toast from "../../Components/Modals/Toast";

import useFarmManagement from "../../Components/hooks/Farmer/useFarmManagement";
import useToast from "../../Components/hooks/useToast";
import { translations, useLanguagePreference } from "../../lib/translations";


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
  let classes = "border-slate-200 bg-slate-100 text-slate-600";

  if (status === "land_preparation") {
    classes = "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "planted_and_growing") {
    classes = "border-green-200 bg-green-50 text-green-700";
  }

  if (status === "harvested") {
    classes = "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "failed_crop") {
    classes = "border-red-200 bg-red-50 text-red-700";
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${classes}`}
    >
      {formatCropStatus(status)}
    </span>
  );
};


// ============================================================
// FARM CARD (Matches Farmer Contracts Card Style)
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
      className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* HEADER: ID + STATUS */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-flex rounded-md bg-green-100 px-2.5 py-0.5 text-[10px] font-bold text-green-700">
              Farm #{farm.farm_id || farm.farm_profile_id}
            </span>

            <h4
              className="mt-1.5 truncate text-[15px] font-bold text-slate-900"
              title={getFarmName(farm)}
            >
              {getFarmName(farm)}
            </h4>
          </div>

          <span
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold capitalize ${
              String(farm.farm_status || farm.status || "").toLowerCase() === "inactive"
                ? "border-slate-300 bg-slate-100 text-slate-600"
                : "border-green-200 bg-green-50 text-green-700"
            }`}
          >
            {String(farm.farm_status || farm.status || "").toLowerCase() === "inactive"
              ? "Inactive"
              : "Active"}
          </span>
        </div>

        {/* LOCATION */}
        <div className="flex items-start gap-1.5 text-xs text-slate-500 min-h-[32px]">
          <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
          <span className="line-clamp-2">
            {farm.farm_location || "Farm location not recorded"}
          </span>
        </div>

        {/* DETAILS BOX (Highlight panel matching Farmer Contracts) */}
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-green-100 bg-green-50/40 p-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              Total Farm Area
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {formatNumber(farm.total_farm_area)} ha
            </p>
          </div>

          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              Crop Status
            </p>
            <div className="mt-1">
              <CropStatusBadge status={cropStatus} />
            </div>
          </div>
        </div>
      </div>

      {/* ACTION FOOTER */}
      <div className="mt-auto border-t border-slate-200 bg-slate-50/60 p-3">
        <button
          type="button"
          onClick={() => onViewDetails(farm.farm_id || farm.farm_profile_id)}
          className="w-full rounded-lg border border-green-600 bg-white px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-50 active:scale-98 cursor-pointer"
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
  const navigate = useNavigate();
  const [language] = useLanguagePreference();
  const t = translations[language]?.farmer ?? translations.en.farmer;

  const cropStatusOptions = [
    { value: "", label: t.farmManagement.statuses.allCropStatuses },
    { value: "available_for_planting", label: t.farmManagement.statuses.availableForPlanting },
    { value: "land_preparation", label: t.farmManagement.statuses.landPreparation },
    { value: "planted_and_growing", label: t.farmManagement.statuses.plantedAndGrowing },
    { value: "harvested", label: t.farmManagement.statuses.harvested },
    { value: "failed_crop", label: t.farmManagement.statuses.failedCrop },
  ];

  const farmStatusOptions = [
    { value: "", label: t.farmManagement.statuses.allFarmStatuses },
    { value: "active", label: t.farmManagement.statuses.active },
    { value: "inactive", label: t.farmManagement.statuses.inactive },
  ];

  const sortOptions = [
    { value: "newest", label: t.farmManagement.statuses.newest },
    { value: "oldest", label: t.farmManagement.statuses.oldest },
    { value: "size_highest", label: t.farmManagement.statuses.largestArea },
    { value: "size_lowest", label: t.farmManagement.statuses.smallestArea },
  ];

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

  const { toasts, showToast, removeToast } = useToast();

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
  // SEGMENT CHANGE
  // =========================================================

  const handleSegmentChange = (
    segment
  ) => {
    clearError();

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

        showToast({
          type: "success",
          title: "Success",
          message: "Farm added successfully.",
          duration: 4000,
        });

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
            label: t.sidebar.farm,
          },

          {
            label: t.farmManagement.title,
          },
        ]}
      />


      {/* ====================================================
          PAGE HEADER
      ==================================================== */}

      <div className="flex flex-col gap-1">
        <h1
          className="
            text-[clamp(2rem,3vw,2.5rem)]
            font-extrabold
            tracking-[-0.03em]
            text-slate-900
          "
        >
          {t.farmManagement.title}
        </h1>
        <p className="text-sm text-slate-500">
          {t.farmManagement.subtitle}
        </p>
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
                SEARCH, FILTERS, AND ADD FARM
            ============================================== */}

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-6 sm:mb-7">

              {/* LEFT-ALIGNED FILTERS ROW */}
              <div className="flex flex-wrap items-center gap-3 md:gap-3.5">

                {/* SEARCH FARM */}
                <div className="relative w-full sm:w-64 md:w-72">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    id="farm-search"
                    type="text"
                    value={filters.search}
                    onChange={(event) =>
                      handleFilterChange("search", event.target.value)
                    }
                    placeholder={t.farmManagement.searchPlaceholder}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-green-600 focus:ring-1 focus:ring-green-600"
                  />
                </div>

                {/* CURRENT CROP STATUS */}
                <div className="w-44">
                  <Dropdown
                    options={cropStatusOptions}
                    value={filters.cropStatus}
                    onChange={(value) =>
                      handleFilterChange("cropStatus", value)
                    }
                    placeholder={t.farmManagement.cropStatus}
                  />
                </div>

                {/* FARM STATUS */}
                <div className="w-36">
                  <Dropdown
                    options={farmStatusOptions}
                    value={filters.farmStatus}
                    onChange={(value) =>
                      handleFilterChange("farmStatus", value)
                    }
                    placeholder={t.farmManagement.farmStatus}
                  />
                </div>

                {/* SORT */}
                <div className="w-36">
                  <SortByDropdown
                    options={sortOptions}
                    value={filters.sortBy}
                    onChange={(value) =>
                      handleFilterChange("sortBy", value)
                    }
                  />
                </div>

                {/* RESET */}
                <button
                  type="button"
                  onClick={handleResetFilters}
                  disabled={!hasActiveFilters}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Reset
                </button>

              </div>

              {/* ADD NEW FARM */}
              <button
                type="button"
                onClick={handleOpenAddFarm}
                className="
                  shrink-0
                  self-start
                  lg:self-auto
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
                  cursor-pointer
                "
              >
                {t.farmManagement.addFarm}
              </button>

            </div>


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
                                  ? t.farmManagement.noResults
                                  : t.farmManagement.noFarms
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
                                  ? t.farmManagement.tryChangingFilters
                                  : t.farmManagement.addFirstFarm
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
                                className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
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

      <Toast toasts={toasts} removeToast={removeToast} />

    </div>
  );
}