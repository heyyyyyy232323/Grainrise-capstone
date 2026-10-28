import {
  useEffect,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  X,
} from "lucide-react";


// ============================================================
// LABELS
// ============================================================

const ACTIVITY_LABELS = {
  farm_added: "Farm Added",
  land_preparation_started: "Land Preparation Started",
  planting_recorded: "Planting Recorded",
  crop_status_updated: "Crop Updated",
  expected_harvest_updated: "Expected Harvest Updated",
  harvest_recorded: "Harvest Recorded",
  yield_recorded: "Yield Recorded",
  failed_crop_recorded: "Failed Crop Recorded",
  farm_information_updated: "Farm Information Updated",
  farm_set_inactive: "Farm Set Inactive",
  farm_reactivated: "Farm Reactivated",
  inventory_record_created: "Inventory Record Created",
  inventory_record_updated: "Inventory Record Updated",
};

const CROP_STATUS_LABELS = {
  available_for_planting: "Available for Planting",
  land_preparation: "Land Preparation",
  planted_and_growing: "Planted and Growing",
  harvested: "Harvested",
  failed_crop: "Failed Crop",
};


// ============================================================
// HELPERS
// ============================================================

const displayValue = (value, fallback = "—") => {
  const cleaned = String(value ?? "").trim();
  return cleaned || fallback;
};

const humanize = (value) => {
  const normalized = String(value || "")
    .trim()
    .replaceAll("_", " ");

  if (!normalized) {
    return "—";
  }

  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatActivityType = (value) => {
  return ACTIVITY_LABELS[value] || humanize(value);
};

const formatCropStatus = (value) => {
  return CROP_STATUS_LABELS[value] || humanize(value);
};

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return displayValue(value);
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};


// ============================================================
// MODAL DETAIL ROW (Matches Miller Manager - Order Approval)
// ============================================================

function ModalDetailRow({ label, value, isBadge = false, badgeStyle = "", children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-xs sm:text-sm">
      <span className="text-slate-500 font-medium shrink-0">{label}:</span>
      {children ? (
        <div className="text-right">{children}</div>
      ) : isBadge ? (
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${badgeStyle}`}
        >
          {value}
        </span>
      ) : (
        <span className="font-semibold text-slate-800 text-right break-words max-w-[60%]">
          {value}
        </span>
      )}
    </div>
  );
}


// ============================================================
// COMPONENT
// ============================================================

export default function FarmerFarmActivityDetailsModal({
  open,
  activity = null,
  onClose,
}) {
  // Lock background scroll when open
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !activity) {
    return null;
  }

  const handleClose = () => {
    onClose?.();
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      role="presentation"
    >
      {/*
        Matches Miller Manager - Order Approval View Details Modal:
        - Clean layout, section grouping, typography, spacing
        - No outside-click close (e.stopPropagation())
        - Top-right X as the ONLY exit control
        - NO Done button in footer
      */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="farm-activity-details-title"
        className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2
              id="farm-activity-details-title"
              className="text-base sm:text-lg font-bold text-slate-900 tracking-tight"
            >
              {formatActivityType(activity.activity_type)}
            </h2>
            <p className="text-xs text-slate-500 font-medium">Activity Details</p>
          </div>

          {/* X Button: Only way to close */}
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close activity details"
            title="Close details"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-75px)] space-y-4">
          {/* SECTION 1 — GENERAL INFORMATION */}
          <div className="space-y-1">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              General Information
            </div>

            <ModalDetailRow
              label="Date & Time"
              value={formatDateTime(activity.activity_date_time)}
            />

            <ModalDetailRow
              label="Activity Type"
              value={formatActivityType(activity.activity_type)}
            />

            <ModalDetailRow
              label="Performed By"
              value={displayValue(activity.performed_by, "Farmer")}
            />
          </div>

          {/* SECTION 2 — CROP & FARM INFORMATION */}
          <div className="space-y-1">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              Crop & Farm Information
            </div>

            <ModalDetailRow
              label="Cropping Cycle"
              value={
                activity.crop_cycle_id
                  ? `Cycle #${activity.crop_cycle_id}`
                  : "—"
              }
            />

            <ModalDetailRow
              label="Rice Variety"
              value={displayValue(activity.rice_variety)}
            />

            <ModalDetailRow
              label="Farm / Crop Status"
              value={
                activity.farm_crop_status
                  ? formatCropStatus(activity.farm_crop_status)
                  : "—"
              }
            />
          </div>

          {/* SECTION 3 — DETAILS / REMARKS */}
          <div className="space-y-1">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              Activity Notes & Remarks
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {displayValue(
                activity.details_remarks || activity.details,
                "No additional remarks recorded for this activity."
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
