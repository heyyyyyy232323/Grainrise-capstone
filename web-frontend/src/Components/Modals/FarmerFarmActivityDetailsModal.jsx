import {
  useEffect,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  CalendarDays,
  ClipboardList,
  Sprout,
  User,
  X,
} from "lucide-react";


// ============================================================
// LABELS
// ============================================================

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


  if (
    !normalized
  ) {
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


const formatActivityType = (
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


const formatDateTime = (
  value
) => {
  if (
    !value
  ) {
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
// DETAIL ROW
// ============================================================

const DetailRow = ({
  icon,
  label,
  value,
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
      <div
        className="
          flex
          items-center
          gap-2
          text-xs
          font-medium
          text-slate-400
        "
      >
        {
          icon
        }

        <span>
          {label}
        </span>
      </div>


      <p
        className="
          mt-1.5
          break-words
          text-sm
          font-semibold
          leading-6
          text-slate-800
        "
      >
        {
          displayValue(
            value
          )
        }
      </p>
    </div>
  );
};


// ============================================================
// COMPONENT
// ============================================================

export default function FarmerFarmActivityDetailsModal({
  open,
  activity = null,
  onClose,
}) {

  // =========================================================
  // LOCK PAGE SCROLL
  // =========================================================

  useEffect(
    () => {
      if (
        !open
      ) {
        return undefined;
      }


      const previousOverflow =
        document.body.style.overflow;


      document.body.style.overflow =
        "hidden";


      return () => {
        document.body.style.overflow =
          previousOverflow;
      };
    },
    [
      open,
    ]
  );


  // =========================================================
  // CLOSED
  // =========================================================

  if (
    !open ||
    !activity
  ) {
    return null;
  }


  // =========================================================
  // CLOSE
  // =========================================================

  const handleClose = () => {
    onClose?.();
  };


  // =========================================================
  // MODAL
  // =========================================================

  const modalContent = (
    <div
      className="
        fixed
        inset-0
        z-[99999]
        flex
        items-center
        justify-center
        bg-slate-950/55
        p-4
      "
      role="presentation"
    >

      {/*
        No outside-click close.
        X button only.
      */}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="farm-activity-details-title"
        className="
          flex
          max-h-[90vh]
          w-full
          max-w-xl
          flex-col
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-2xl
        "
      >

        {/* ==================================================
            HEADER
        ================================================== */}

        <div
          className="
            flex
            shrink-0
            items-start
            justify-between
            gap-4
            border-b
            border-slate-200
            bg-white
            px-6
            py-5
          "
        >

          <div
            className="
              flex
              items-start
              gap-3
            "
          >

            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-green-50
                text-green-700
              "
            >
              <ClipboardList
                size={19}
              />
            </div>


            <div>

              <h3
                id="farm-activity-details-title"
                className="
                  text-lg
                  font-bold
                  text-slate-900
                "
              >
                Activity Details
              </h3>


              <p
                className="
                  mt-1
                  text-sm
                  text-slate-500
                "
              >
                View the complete information
                recorded for this farm activity.
              </p>

            </div>

          </div>


          <button
            type="button"
            onClick={
              handleClose
            }
            aria-label="Close activity details"
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-full
              border
              border-slate-200
              bg-white
              text-slate-400
              transition
              hover:bg-slate-50
              hover:text-slate-700
            "
          >
            <X
              size={18}
            />
          </button>

        </div>


        {/* ==================================================
            BODY
        ================================================== */}

        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            px-6
            py-5
          "
        >

          {/* ACTIVITY SUMMARY */}

          <div
            className="
              rounded-xl
              border
              border-green-100
              bg-green-50/60
              px-4
              py-4
            "
          >
            <p
              className="
                text-xs
                font-semibold
                uppercase
                tracking-wide
                text-green-700
              "
            >
              Activity
            </p>


            <p
              className="
                mt-1
                text-base
                font-bold
                text-slate-900
              "
            >
              {
                formatActivityType(
                  activity.activity_type
                )
              }
            </p>
          </div>


          {/* DETAILS */}

          <div
            className="
              mt-5
              grid
              gap-x-6
              gap-y-6
              sm:grid-cols-2
            "
          >

            <DetailRow
              icon={
                <CalendarDays
                  size={14}
                />
              }
              label="Date / Time"
              value={
                formatDateTime(
                  activity.activity_date_time
                )
              }
            />


            <DetailRow
              icon={
                <ClipboardList
                  size={14}
                />
              }
              label="Cropping Cycle"
              value={
                activity.crop_cycle_id
                  ? (
                    `Cycle #${activity.crop_cycle_id}`
                  )
                  : "—"
              }
            />


            <DetailRow
              icon={
                <Sprout
                  size={14}
                />
              }
              label="Rice Variety"
              value={
                activity.rice_variety
              }
            />


            <DetailRow
              icon={
                <Sprout
                  size={14}
                />
              }
              label="Farm / Crop Status"
              value={
                activity.farm_crop_status
                  ? (
                    formatCropStatus(
                      activity.farm_crop_status
                    )
                  )
                  : "—"
              }
            />


            <DetailRow
              icon={
                <User
                  size={14}
                />
              }
              label="Performed By"
              value={
                displayValue(
                  activity.performed_by,
                  "Farmer"
                )
              }
            />


            <DetailRow
              icon={
                <ClipboardList
                  size={14}
                />
              }
              label="Details / Remarks"
              value={
                activity.details_remarks
              }
              fullWidth
            />

          </div>

        </div>


        {/* ==================================================
            FOOTER
        ================================================== */}

        <div
          className="
            flex
            shrink-0
            justify-end
            border-t
            border-slate-200
            bg-white
            px-6
            py-4
          "
        >

          <button
            type="button"
            onClick={
              handleClose
            }
            className="
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
            Done
          </button>

        </div>

      </div>

    </div>
  );


  // =========================================================
  // PORTAL
  // =========================================================

  return createPortal(
    modalContent,
    document.body
  );
}