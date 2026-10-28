import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  History,
  Loader2,
  MapPin,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Sprout,
} from "lucide-react";

import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import PaginationControls from "../../Components/Minor-Components/PaginationControls";

import FarmerFarmFormModal from "../../Components/Modals/FarmerFarmFormModal";

import FarmerCropActionModal, {
  START_LAND_PREPARATION,
  RECORD_PLANTING,
  UPDATE_CROP,
  RECORD_FAILED_CROP,
} from "../../Components/Modals/FarmerCropActionModal";

import FarmerFarmActivityDetailsModal from "../../Components/Modals/FarmerFarmActivityDetailsModal";
import Toast from "../../Components/Modals/Toast";

import useFarmManagement from "../../Components/hooks/Farmer/useFarmManagement";
import useToast from "../../Components/hooks/useToast";


// ============================================================
// CONSTANTS
// ============================================================

const ACTIVITY_PAGE_SIZE = 10;

/*
  Temporary local constant.

  Sa NEXT file natin — FarmerCropActionModal.jsx —
  ie-export din natin itong same action name.
*/
const RECORD_HARVEST =
  "record_harvest";


// ============================================================
// LABELS
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


const LAND_OWNERSHIP_LABELS = {
  owned:
    "Owned",

  leased:
    "Rented / Leased",

  tenant:
    "Tenant",

  shared:
    "Shared",

  other:
    "Other",
};


const FAILURE_REASON_LABELS = {
  severe_weather_typhoon:
    "Severe Weather / Typhoon",

  drought_insufficient_water:
    "Drought / Insufficient Water",

  pest_disease:
    "Pest / Disease",

  low_or_failed_yield:
    "Low or Failed Yield",

  other:
    "Other",
};


const ACTIVITY_LABELS = {
  farm_added:
    "Farm Added",

  land_preparation_started:
    "Land Preparation Started",

  planting_recorded:
    "Planting Recorded",

  crop_status_updated:
    "Crop Updated",

  expected_harvest_updated:
    "Expected Harvest Updated",

  harvest_recorded:
    "Harvest Recorded",

  yield_recorded:
    "Yield Recorded",

  failed_crop_recorded:
    "Failed Crop Recorded",

  farm_information_updated:
    "Farm Information Updated",

  farm_set_inactive:
    "Farm Set Inactive",

  farm_reactivated:
    "Farm Reactivated",

  inventory_record_created:
    "Inventory Record Created",

  inventory_record_updated:
    "Inventory Record Updated",
};


// ============================================================
// HELPERS
// ============================================================

const displayValue = (
  value,
  fallback = "—"
) => {
  const cleaned =
    String(
      value ?? ""
    ).trim();

  return (
    cleaned ||
    fallback
  );
};


const humanize = (
  value
) => {
  const normalized =
    String(
      value || ""
    )
      .trim()
      .replaceAll(
        "_",
        " "
      );

  if (!normalized) {
    return "—";
  }

  return normalized.replace(
    /\b\w/g,
    (
      character
    ) =>
      character.toUpperCase()
  );
};


const formatCropStatus = (
  value
) => {
  return (
    CROP_STATUS_LABELS[
      value
    ] ||
    humanize(
      value
    )
  );
};


const formatOwnership = (
  value
) => {
  return (
    LAND_OWNERSHIP_LABELS[
      value
    ] ||
    humanize(
      value
    )
  );
};


const formatFailureReason = (
  value
) => {
  return (
    FAILURE_REASON_LABELS[
      value
    ] ||
    humanize(
      value
    )
  );
};


const formatActivity = (
  value
) => {
  return (
    ACTIVITY_LABELS[
      value
    ] ||
    humanize(
      value
    )
  );
};


const formatNumber = (
  value
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  const number =
    Number(
      value
    );

  if (
    !Number.isFinite(
      number
    )
  ) {
    return displayValue(
      value
    );
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


const formatDate = (
  value
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return displayValue(
      value
    );
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      year:
        "numeric",

      month:
        "short",

      day:
        "numeric",
    }
  ).format(
    date
  );
};


const formatDateTime = (
  value
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return displayValue(
      value
    );
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      year:
        "numeric",

      month:
        "short",

      day:
        "numeric",

      hour:
        "numeric",

      minute:
        "2-digit",
    }
  ).format(
    date
  );
};


// ============================================================
// STATUS BADGE
// ============================================================

const StatusBadge = ({
  status,
  type = "crop",
}) => {
  let label =
    displayValue(
      status
    );

  let classes =
    "border-slate-200 bg-slate-100 text-slate-600";


  if (
    type === "farm"
  ) {
    if (
      status === "active"
    ) {
      label =
        "Active";

      classes =
        "border-green-200 bg-green-50 text-green-700";
    }

    if (
      status === "inactive"
    ) {
      label =
        "Inactive";

      classes =
        "border-slate-300 bg-slate-100 text-slate-600";
    }
  }


  if (
    type === "crop"
  ) {
    label =
      formatCropStatus(
        status
      );

    if (
      status ===
      "available_for_planting"
    ) {
      classes =
        "border-slate-200 bg-slate-100 text-slate-600";
    }

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
      {label}
    </span>
  );
};


// ============================================================
// DETAIL ITEM
// ============================================================

const DetailItem = ({
  label,
  value,
  children,
  fullWidth = false,
}) => {
  return (
    <div
      className={`
        min-w-0
        ${
          fullWidth
            ? "sm:col-span-2"
            : ""
        }
      `}
    >
      <p
        className="
          text-xs
          font-medium
          text-slate-400
        "
      >
        {label}
      </p>

      {
        children
          ? (
            <div
              className="
                mt-1.5
              "
            >
              {children}
            </div>
          )
          : (
            <p
              className="
                mt-1
                break-words
                text-sm
                font-semibold
                leading-5
                text-slate-800
              "
            >
              {
                displayValue(
                  value
                )
              }
            </p>
          )
      }
    </div>
  );
};


// ============================================================
// ACTIVITY BADGE
// ============================================================

const ActivityBadge = ({
  type,
}) => {
  let classes =
    "border-slate-200 bg-slate-50 text-slate-600";


  if (
    type === "farm_added" ||
    type === "farm_reactivated"
  ) {
    classes =
      "border-green-200 bg-green-50 text-green-700";
  }


  if (
    type ===
    "land_preparation_started"
  ) {
    classes =
      "border-amber-200 bg-amber-50 text-amber-700";
  }


  if (
    type ===
      "planting_recorded" ||
    type ===
      "expected_harvest_updated"
  ) {
    classes =
      "border-emerald-200 bg-emerald-50 text-emerald-700";
  }


  if (
    type ===
    "failed_crop_recorded"
  ) {
    classes =
      "border-red-200 bg-red-50 text-red-700";
  }


  if (
    type ===
    "farm_set_inactive"
  ) {
    classes =
      "border-slate-300 bg-slate-100 text-slate-600";
  }


  return (
    <span
      className={`
        inline-flex
        max-w-full
        items-center
        justify-center
        rounded-full
        border
        px-2.5
        py-1
        text-center
        text-xs
        font-semibold
        leading-4
        ${classes}
      `}
    >
      {
        formatActivity(
          type
        )
      }
    </span>
  );
};


// ============================================================
// COMPONENT
// ============================================================

export default function FarmerFarmDetails() {
  const navigate =
    useNavigate();


  const routeParams =
    useParams();

  const farmId =
    routeParams.farmId ||
    routeParams.id;


  const {
    selectedFarm,
    farmActivity,

    isLoadingFarmDetails,
    isLoadingActivity,
    isSavingFarm,
    isSavingCrop,

    error,

    loadFarmDetails,
    loadFarmActivity,

    updateFarm,
    updateFarmStatus,

    startLandPreparation,
    recordPlanting,
    updateCurrentCrop,
    recordHarvest,
    recordFailedCrop,

    clearError,
    clearSelectedFarm,
  } =
    useFarmManagement();


  // =========================================================
  // MODALS
  // =========================================================

  const [
    editFarmOpen,
    setEditFarmOpen,
  ] =
    useState(
      false
    );


  const [
    cropAction,
    setCropAction,
  ] =
    useState(
      null
    );


  const [
    selectedActivity,
    setSelectedActivity,
  ] =
    useState(
      null
    );

  const { toasts, showToast, removeToast } = useToast();

  // =========================================================
  // LOAD FARM
  // =========================================================

  useEffect(
    () => {
      if (!farmId) {
        return undefined;
      }


      loadFarmDetails(
        farmId
      ).catch(
        () => {}
      );


      loadFarmActivity(
        farmId,
        {
          page:
            1,

          pageSize:
            ACTIVITY_PAGE_SIZE,
        }
      ).catch(
        () => {}
      );


      return () => {
        clearSelectedFarm();
      };
    },
    [
      farmId,
      loadFarmDetails,
      loadFarmActivity,
      clearSelectedFarm,
    ]
  );

  // =========================================================
  // FARM STATE
  // =========================================================

  const farmStatus =
    selectedFarm?.farm_status ||
    "active";


  const cropStatus =
    selectedFarm?.current_crop_status ||
    "available_for_planting";


  const farmIsActive =
    farmStatus ===
    "active";


  const hasOngoingCrop =
    cropStatus ===
      "land_preparation" ||
    cropStatus ===
      "planted_and_growing";


  // =========================================================
  // PRIMARY CROP ACTION
  // =========================================================

  let primaryCropAction =
    null;


  let primaryCropLabel =
    "";


  if (
    farmIsActive &&
    (
      cropStatus ===
        "available_for_planting" ||
      cropStatus ===
        "harvested" ||
      cropStatus ===
        "failed_crop"
    )
  ) {
    primaryCropAction =
      START_LAND_PREPARATION;

    primaryCropLabel =
      "Start Land Preparation";
  }


  if (
    farmIsActive &&
    cropStatus ===
      "land_preparation"
  ) {
    primaryCropAction =
      RECORD_PLANTING;

    primaryCropLabel =
      "Record Planting";
  }


  if (
    farmIsActive &&
    cropStatus ===
      "planted_and_growing"
  ) {
    primaryCropAction =
      UPDATE_CROP;

    primaryCropLabel =
      "Update Crop";
  }


  // =========================================================
  // BACK
  // =========================================================

  const handleBack = () => {
    clearError();

    navigate(
      "/farmer/farm-management"
    );
  };


  // =========================================================
  // RETRY
  // =========================================================

  const handleRetry =
    async () => {
      clearError();


      await Promise.allSettled([
        loadFarmDetails(
          farmId
        ),

        loadFarmActivity(
          farmId,
          {
            page:
              1,

            pageSize:
              ACTIVITY_PAGE_SIZE,
          }
        ),
      ]);
    };


  // =========================================================
  // EDIT FARM
  // =========================================================

  const handleOpenEditFarm =
    () => {
      clearError();

      setEditFarmOpen(
        true
      );
    };


  const handleSaveFarm =
    async (
      farmData
    ) => {
      try {
        await updateFarm(
          farmId,
          farmData
        );


        setEditFarmOpen(
          false
        );


        showToast({
          type: "success",
          title: "Success",
          message: "Farm information updated successfully.",
          duration: 4000,
        });


        await loadFarmActivity(
          farmId,
          {
            page:
              1,

            pageSize:
              ACTIVITY_PAGE_SIZE,
          }
        );

      } catch {
        // Hook handles error.
      }
    };


  // =========================================================
  // FARM ACTIVE / INACTIVE
  // =========================================================

  const handleFarmStatusChange =
    async () => {
      if (
        !selectedFarm ||
        isSavingFarm
      ) {
        return;
      }


      const nextStatus =
        farmStatus ===
          "active"
          ? "inactive"
          : "active";


      clearError();


      try {
        await updateFarmStatus(
          farmId,
          nextStatus
        );


        showToast({
          type: "success",
          title: "Success",
          message:
            nextStatus ===
              "active"
              ? "Farm reactivated successfully."
              : "Farm set to inactive successfully.",
          duration: 4000,
        });


        await loadFarmActivity(
          farmId,
          {
            page:
              1,

            pageSize:
              ACTIVITY_PAGE_SIZE,
          }
        );

      } catch {
        // Hook handles error.
      }
    };


  // =========================================================
  // OPEN CROP ACTION
  // =========================================================

  const handleOpenCropAction =
    () => {
      if (
        !primaryCropAction ||
        !farmIsActive
      ) {
        return;
      }


      clearError();

      setCropAction(
        primaryCropAction
      );
    };


  // =========================================================
  // CROP SUBMIT
  // =========================================================

  const handleCropSubmit =
    async (
      data,
      actionUsed
    ) => {
      const finalAction =
        actionUsed ||
        cropAction;


      try {

        // ----------------------------------------------------
        // START LAND PREPARATION
        // ----------------------------------------------------

        if (
          finalAction ===
          START_LAND_PREPARATION
        ) {
          await startLandPreparation(
            farmId,
            data
          );

          showToast({
            type: "success",
            title: "Success",
            message: "Land preparation started successfully.",
            duration: 4000,
          });
        }


        // ----------------------------------------------------
        // RECORD PLANTING
        // ----------------------------------------------------

        else if (
          finalAction ===
          RECORD_PLANTING
        ) {
          await recordPlanting(
            farmId,
            data
          );

          showToast({
            type: "success",
            title: "Success",
            message: "Planting recorded successfully.",
            duration: 4000,
          });
        }


        // ----------------------------------------------------
        // UPDATE CURRENT CROP
        // ----------------------------------------------------

        else if (
          finalAction ===
          UPDATE_CROP
        ) {
          await updateCurrentCrop(
            farmId,
            data
          );

          showToast({
            type: "success",
            title: "Success",
            message: "Current crop updated successfully.",
            duration: 4000,
          });
        }


        // ----------------------------------------------------
        // RECORD HARVEST
        // ----------------------------------------------------

        else if (
          finalAction ===
          RECORD_HARVEST
        ) {
          await recordHarvest(
            farmId,
            data
          );

          showToast({
            type: "success",
            title: "Success",
            message: "Harvest recorded successfully and added to Inventory.",
            duration: 4000,
          });
        }


        // ----------------------------------------------------
        // RECORD FAILED CROP
        // ----------------------------------------------------

        else if (
          finalAction ===
          RECORD_FAILED_CROP
        ) {
          await recordFailedCrop(
            farmId,
            data
          );

          showToast({
            type: "success",
            title: "Success",
            message: "Failed crop recorded successfully.",
            duration: 4000,
          });
        }


        else {
          throw new Error(
            "Unsupported crop action."
          );
        }


        setCropAction(
          null
        );


        await loadFarmActivity(
          farmId,
          {
            page:
              1,

            pageSize:
              ACTIVITY_PAGE_SIZE,
          }
        );

      } catch {
        // Keep modal open.
      }
    };


  // =========================================================
  // ACTIVITY DETAILS
  // =========================================================

  const handleViewActivity =
    (
      activity
    ) => {
      setSelectedActivity(
        activity
      );
    };


  // =========================================================
  // ACTIVITY PAGINATION
  // =========================================================

  const handleActivityPage =
    async (
      nextPage
    ) => {
      if (
        isLoadingActivity
      ) {
        return;
      }


      const totalPages =
        farmActivity
          ?.pagination
          ?.total_pages ||
        0;


      if (
        nextPage < 1
      ) {
        return;
      }


      if (
        totalPages > 0 &&
        nextPage >
          totalPages
      ) {
        return;
      }


      try {
        await loadFarmActivity(
          farmId,
          {
            page:
              nextPage,

            pageSize:
              ACTIVITY_PAGE_SIZE,
          }
        );

      } catch {
        // Hook handles error.
      }
    };


  // =========================================================
  // INITIAL LOADING
  // =========================================================

  if (
    isLoadingFarmDetails &&
    !selectedFarm
  ) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            {
              label:
                "Dashboard",

              path:
                "/farmer/dashboard",
            },

            {
              label:
                "Farm Management",

              path:
                "/farmer/farm-management",
            },

            {
              label:
                "Farm Details",
            },
          ]}
        />


        <div
          className="
            flex
            min-h-[420px]
            items-center
            justify-center
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
              Loading farm details...
            </p>
          </div>
        </div>
      </div>
    );
  }


  // =========================================================
  // LOAD FAILED
  // =========================================================

  if (
    !selectedFarm
  ) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            {
              label:
                "Dashboard",

              path:
                "/farmer/dashboard",
            },

            {
              label:
                "Farm Management",

              path:
                "/farmer/farm-management",
            },

            {
              label:
                "Farm Details",
            },
          ]}
        />


        <div
          className="
            rounded-2xl
            border
            border-slate-200
            bg-white
            p-8
            text-center
            shadow-sm
          "
        >
          <AlertCircle
            size={34}
            className="
              mx-auto
              text-amber-500
            "
          />

          <h2
            className="
              mt-4
              text-xl
              font-bold
              text-slate-900
            "
          >
            Farm details are unavailable
          </h2>

          <p
            className="
              mx-auto
              mt-2
              max-w-lg
              text-sm
              text-slate-500
            "
          >
            {
              error ||
              "We could not load this farm. Please try again."
            }
          </p>

          <div
            className="
              mt-6
              flex
              flex-wrap
              justify-center
              gap-3
            "
          >
            <button
              type="button"
              onClick={
                handleBack
              }
              className="
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
              Back to My Farms
            </button>

            <button
              type="button"
              onClick={
                handleRetry
              }
              className="
                inline-flex
                items-center
                gap-2
                rounded-lg
                bg-green-700
                px-4
                py-2.5
                text-sm
                font-semibold
                text-white
                transition
                hover:bg-green-800
              "
            >
              <RefreshCw
                size={15}
              />

              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }


  // =========================================================
  // ACTIVITY
  // =========================================================

  const activityItems =
    farmActivity?.items ||
    [];


  const currentActivityPage =
    farmActivity
      ?.pagination
      ?.page ||
    1;


  const totalActivityPages =
    farmActivity
      ?.pagination
      ?.total_pages ||
    0;


  const totalActivityItems =
    farmActivity
      ?.pagination
      ?.total_items ||
    0;


  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="space-y-5">

      {/* ====================================================
          BREADCRUMBS
      ==================================================== */}

      <Breadcrumbs
        items={[
          {
            label:
              "Dashboard",

            path:
              "/farmer/dashboard",
          },

          {
            label:
              "Farm Management",

            path:
              "/farmer/farm-management",
          },

          {
            label:
              selectedFarm.farm_name ||
              `Farm #${selectedFarm.farm_id}`,
          },
        ]}
      />


      {/* ====================================================
          BACK
      ==================================================== */}

      <div>
        <button
          type="button"
          onClick={
            handleBack
          }
          className="
            inline-flex
            items-center
            gap-2
            rounded-lg
            border
            border-slate-200
            bg-white
            px-3.5
            py-2
            text-sm
            font-semibold
            text-slate-600
            transition
            hover:border-green-200
            hover:bg-green-50
            hover:text-green-700
          "
        >
          <ArrowLeft
            size={16}
          />

          Back to My Farms
        </button>
      </div>


      {/* ====================================================
          PAGE ERROR
      ==================================================== */}

      {
        error &&
        !editFarmOpen &&
        !cropAction &&
        (
          <div
            className="
              flex
              items-start
              gap-3
              rounded-xl
              border
              border-red-200
              bg-red-50
              px-4
              py-3
              text-sm
              text-red-700
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
        )
      }


      {/* ====================================================
          FARM + CURRENT CROP
      ==================================================== */}

      <div
        className="
          grid
          gap-5
          lg:grid-cols-2
          lg:items-stretch
        "
      >

        {/* ==================================================
            FARM INFORMATION
        ================================================== */}

        <section
          className="
            flex
            h-full
            flex-col
            overflow-hidden
            rounded-2xl
            border
            border-slate-200
            bg-white
            shadow-sm
          "
        >

          <div
            className="
              flex
              min-h-[82px]
              flex-col
              gap-3
              border-b
              border-slate-100
              px-5
              py-4
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >

            <div
              className="
                flex
                min-w-0
                items-center
                gap-3
              "
            >
              <div
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-green-50
                  text-green-700
                "
              >
                <MapPin
                  size={18}
                />
              </div>


              <div className="min-w-0">
                <div
                  className="
                    flex
                    flex-wrap
                    items-center
                    gap-2
                  "
                >
                  <h2
                    className="
                      break-words
                      text-base
                      font-bold
                      text-slate-900
                    "
                  >
                    {
                      selectedFarm.farm_name ||
                      `Farm #${selectedFarm.farm_id}`
                    }
                  </h2>


                  <StatusBadge
                    status={
                      farmStatus
                    }
                    type="farm"
                  />
                </div>


                <p
                  className="
                    mt-0.5
                    text-xs
                    text-slate-500
                  "
                >
                  Registered farm details.
                </p>
              </div>
            </div>


            <div
              className="
                flex
                shrink-0
                items-center
                gap-2
                sm:justify-end
              "
            >

              {
                farmStatus ===
                  "inactive"
                  ? (
                    <button
                      type="button"
                      onClick={
                        handleFarmStatusChange
                      }
                      disabled={
                        isSavingFarm
                      }
                      className="
                        inline-flex
                        items-center
                        gap-1.5
                        rounded-lg
                        border
                        border-green-200
                        bg-green-50
                        px-3
                        py-2
                        text-xs
                        font-semibold
                        text-green-700
                        transition
                        hover:bg-green-100
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                      "
                    >
                      <PlayCircle
                        size={14}
                      />

                      Set Active
                    </button>
                  )
                  : (
                    <button
                      type="button"
                      onClick={
                        handleFarmStatusChange
                      }
                      disabled={
                        isSavingFarm ||
                        hasOngoingCrop
                      }
                      title={
                        hasOngoingCrop
                          ? "Complete or record the current crop outcome before setting this farm inactive."
                          : "Set this farm inactive"
                      }
                      className="
                        inline-flex
                        items-center
                        gap-1.5
                        rounded-lg
                        border
                        border-amber-200
                        bg-amber-50
                        px-3
                        py-2
                        text-xs
                        font-semibold
                        text-amber-700
                        transition
                        hover:bg-amber-100
                        disabled:cursor-not-allowed
                        disabled:opacity-40
                      "
                    >
                      <PauseCircle
                        size={14}
                      />

                      Set Inactive
                    </button>
                  )
              }


              <button
                type="button"
                onClick={
                  handleOpenEditFarm
                }
                disabled={
                  isSavingFarm
                }
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  rounded-lg
                  border
                  border-slate-200
                  bg-white
                  px-3
                  py-2
                  text-xs
                  font-semibold
                  text-slate-600
                  transition
                  hover:border-green-200
                  hover:bg-green-50
                  hover:text-green-700
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                <Edit3
                  size={14}
                />

                Edit
              </button>

            </div>

          </div>


          <div
            className="
              grid
              flex-1
              content-start
              gap-x-6
              gap-y-6
              p-5
              sm:grid-cols-2
            "
          >
            <DetailItem
              label="Address Line"
              value={
                selectedFarm.street_address
              }
              fullWidth
            />


            <DetailItem
              label="Province"
              value={
                selectedFarm.province
              }
            />


            <DetailItem
              label="City / Municipality"
              value={
                selectedFarm.municipality
              }
            />


            <DetailItem
              label="Barangay"
              value={
                selectedFarm.barangay
              }
            />


            <DetailItem
              label="Postal Code"
              value={
                selectedFarm.postal_code
              }
            />


            <DetailItem
              label="Total Farm Area"
              value={
                selectedFarm.total_farm_area !==
                  null &&
                selectedFarm.total_farm_area !==
                  undefined
                  ? (
                    `${formatNumber(
                      selectedFarm.total_farm_area
                    )} ha`
                  )
                  : "—"
              }
            />


            <DetailItem
              label="Land Ownership"
              value={
                formatOwnership(
                  selectedFarm.land_ownership_status
                )
              }
            />


            <DetailItem
              label="Cropping Cycles per Year"
              value={
                selectedFarm.cropping_cycles_per_year
              }
            />
          </div>

        </section>


        {/* ==================================================
            CURRENT CROP
        ================================================== */}

        <section
          className="
            flex
            h-full
            flex-col
            overflow-hidden
            rounded-2xl
            border
            border-slate-200
            bg-white
            shadow-sm
          "
        >

          <div
            className="
              flex
              min-h-[82px]
              flex-col
              gap-3
              border-b
              border-slate-100
              px-5
              py-4
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <div
              className="
                flex
                min-w-0
                items-center
                gap-3
              "
            >
              <div
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-green-50
                  text-green-700
                "
              >
                <Sprout
                  size={18}
                />
              </div>


              <div>
                <h2
                  className="
                    text-base
                    font-bold
                    text-slate-900
                  "
                >
                  Current Crop Information
                </h2>

                <p
                  className="
                    mt-0.5
                    text-xs
                    text-slate-500
                  "
                >
                  Current cropping cycle.
                </p>
              </div>
            </div>


            {
              primaryCropAction &&
              (
                <button
                  type="button"
                  onClick={
                    handleOpenCropAction
                  }
                  disabled={
                    isSavingCrop
                  }
                  className="
                    shrink-0
                    rounded-lg
                    bg-green-700
                    px-3.5
                    py-2
                    text-xs
                    font-semibold
                    text-white
                    transition
                    hover:bg-green-800
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >
                  {
                    primaryCropLabel
                  }
                </button>
              )
            }

          </div>


          {
            !farmIsActive &&
            (
              <div
                className="
                  mx-5
                  mt-5
                  flex
                  items-start
                  gap-2
                  rounded-xl
                  border
                  border-amber-200
                  bg-amber-50
                  px-3.5
                  py-3
                  text-xs
                  leading-5
                  text-amber-700
                "
              >
                <AlertCircle
                  size={16}
                  className="
                    mt-0.5
                    shrink-0
                  "
                />

                <span>
                  This farm is inactive.
                  Set it to Active before recording crop activities.
                </span>
              </div>
            )
          }


          <div
            className="
              grid
              flex-1
              content-start
              gap-x-6
              gap-y-6
              p-5
              sm:grid-cols-2
            "
          >
            <DetailItem
              label="Rice Variety"
              value={
                selectedFarm.current_rice_variety ||
                selectedFarm.registered_rice_variety
              }
            />


            <DetailItem
              label="Current Crop Status"
            >
              <StatusBadge
                status={
                  cropStatus
                }
                type="crop"
              />
            </DetailItem>


            <DetailItem
              label="Land Preparation Date"
              value={
                formatDate(
                  selectedFarm.land_preparation_date
                )
              }
            />


            <DetailItem
              label="Planting Date"
              value={
                formatDate(
                  selectedFarm.planting_date
                )
              }
            />


            <DetailItem
              label="Expected Harvest Date"
              value={
                formatDate(
                  selectedFarm.expected_harvest_date
                )
              }
            />


            <DetailItem
              label="Expected Yield"
              value={
                selectedFarm.expected_yield_kg !==
                  null &&
                selectedFarm.expected_yield_kg !==
                  undefined
                  ? (
                    `${formatNumber(
                      selectedFarm.expected_yield_kg
                    )} kg`
                  )
                  : "—"
              }
            />


            {
              cropStatus ===
                "harvested" &&
              (
                <>
                  <DetailItem
                    label="Actual Harvest Date"
                    value={
                      formatDate(
                        selectedFarm.actual_harvest_date
                      )
                    }
                  />

                  <DetailItem
                    label="Actual Yield"
                    value={
                      selectedFarm.actual_yield_kg !==
                        null &&
                      selectedFarm.actual_yield_kg !==
                        undefined
                        ? (
                          `${formatNumber(
                            selectedFarm.actual_yield_kg
                          )} kg`
                        )
                        : "—"
                    }
                  />
                </>
              )
            }


            {
              cropStatus ===
                "failed_crop" &&
              (
                <>
                  <DetailItem
                    label="Failure Reason"
                    value={
                      formatFailureReason(
                        selectedFarm.failure_reason
                      )
                    }
                  />

                  <DetailItem
                    label="Failure Remarks"
                    value={
                      selectedFarm.failure_remarks
                    }
                  />
                </>
              )
            }

          </div>

        </section>

      </div>


      {/* ====================================================
          ACTIVITY LOG
      ==================================================== */}

      <section
        className="
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-sm
        "
      >

        <div
          className="
            flex
            items-center
            justify-between
            gap-4
            border-b
            border-slate-100
            px-4
            py-4
            sm:px-5
          "
        >
          <div
            className="
              flex
              items-center
              gap-3
            "
          >
            <div
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-green-50
                text-green-700
              "
            >
              <History
                size={18}
              />
            </div>


            <div>
              <h2
                className="
                  text-base
                  font-bold
                  text-slate-900
                "
              >
                Farm Activity Log
              </h2>

              <p
                className="
                  mt-0.5
                  text-xs
                  text-slate-500
                "
              >
                Farm and crop activity history.
              </p>
            </div>
          </div>


          <span
            className="
              shrink-0
              text-xs
              font-medium
              text-slate-400
            "
          >
            {
              totalActivityItems
            }{" "}
            {
              totalActivityItems ===
                1
                ? "activity"
                : "activities"
            }
          </span>
        </div>


        {
          isLoadingActivity &&
          activityItems.length === 0
            ? (
              <div className="flex min-h-[180px] items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 size={18} className="animate-spin text-emerald-600" />
                  Loading farm activity...
                </div>
              </div>
            )
            : activityItems.length === 0
            ? (
              <div className="px-6 py-12 text-center">
                <History size={30} className="mx-auto text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  No farm activity yet
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  New farm and crop activities will appear here.
                </p>
              </div>
            )
            : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse table-auto">
                    <thead>
                      <tr className="bg-[#EDEDED] text-left text-[11px] font-extrabold uppercase tracking-[0.03em] text-slate-600">
                        <th
                          className="whitespace-nowrap px-4 py-3.5 align-middle first:pl-6 last:pr-6 text-left"
                          style={{ width: "35%" }}
                        >
                          DATE / TIME
                        </th>
                        <th
                          className="whitespace-nowrap px-4 py-3.5 align-middle first:pl-6 last:pr-6 text-left"
                          style={{ width: "45%" }}
                        >
                          ACTIVITY
                        </th>
                        <th
                          className="whitespace-nowrap px-4 py-3.5 align-middle first:pl-6 last:pr-6 text-center"
                          style={{ width: "20%" }}
                        >
                          ACTION
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {activityItems.map((activity) => (
                        <tr
                          key={activity.farm_activity_id}
                          className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="whitespace-nowrap px-4 py-3 pl-6 text-[13px] font-medium text-slate-700">
                            {formatDateTime(activity.activity_date_time)}
                          </td>

                          <td className="px-4 py-3 text-[13px] font-medium text-slate-700">
                            <ActivityBadge type={activity.activity_type} />
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 pr-6 text-center">
                            <button
                              type="button"
                              onClick={() => handleViewActivity(activity)}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 cursor-pointer"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer: Results count & pagination matching FarmerInventory */}
                {totalActivityItems > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
                    <span>
                      Showing{" "}
                      {totalActivityItems === 0
                        ? 0
                        : (currentActivityPage - 1) *
                            (farmActivity?.pagination?.page_size || 10) +
                          1}{" "}
                      to{" "}
                      {Math.min(
                        currentActivityPage *
                          (farmActivity?.pagination?.page_size || 10),
                        totalActivityItems
                      )}{" "}
                      of {totalActivityItems}{" "}
                      {totalActivityItems === 1 ? "activity" : "activities"}
                    </span>

                    <PaginationControls
                      currentPage={currentActivityPage}
                      totalPages={totalActivityPages}
                      onPageChange={handleActivityPage}
                      disabled={isLoadingActivity}
                    />
                  </div>
                )}
              </>
            )
        }

      </section>


      {/* ====================================================
          EDIT FARM MODAL
      ==================================================== */}

      <FarmerFarmFormModal
        open={
          editFarmOpen
        }
        mode="edit"
        initialValues={
          selectedFarm
        }
        isSaving={
          isSavingFarm
        }
        error={
          editFarmOpen
            ? error
            : ""
        }
        onClose={
          () => {
            if (
              isSavingFarm
            ) {
              return;
            }

            clearError();

            setEditFarmOpen(
              false
            );
          }
        }
        onSubmit={
          handleSaveFarm
        }
      />


      {/* ====================================================
          CROP ACTION MODAL
      ==================================================== */}

      <FarmerCropActionModal
        open={
          Boolean(
            cropAction
          )
        }
        action={
          cropAction
        }
        farm={
          selectedFarm
        }
        isSaving={
          isSavingCrop
        }
        error={
          cropAction
            ? error
            : ""
        }
        onClose={
          () => {
            if (
              isSavingCrop
            ) {
              return;
            }

            clearError();

            setCropAction(
              null
            );
          }
        }
        onSubmit={
          handleCropSubmit
        }
      />


      {/* ====================================================
          ACTIVITY DETAILS MODAL
      ==================================================== */}

      <FarmerFarmActivityDetailsModal
        open={
          Boolean(
            selectedActivity
          )
        }
        activity={
          selectedActivity
        }
        onClose={
          () =>
            setSelectedActivity(
              null
            )
        }
      />

      <Toast toasts={toasts} removeToast={removeToast} />

    </div>
  );
}