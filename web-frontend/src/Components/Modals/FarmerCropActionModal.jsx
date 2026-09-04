import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
  Loader2,
  PackageCheck,
  Sprout,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";


// ============================================================
// ACTION CONSTANTS
// ============================================================

export const START_LAND_PREPARATION =
  "start_land_preparation";

export const RECORD_PLANTING =
  "record_planting";

export const UPDATE_CROP =
  "update_crop";

export const RECORD_HARVEST =
  "record_harvest";

export const RECORD_FAILED_CROP =
  "record_failed_crop";


export const FARM_CROP_ACTIONS = {
  START_LAND_PREPARATION,
  RECORD_PLANTING,
  UPDATE_CROP,
  RECORD_HARVEST,
  RECORD_FAILED_CROP,
};


export const CROP_ACTIONS =
  FARM_CROP_ACTIONS;


// ============================================================
// PRODUCT TYPE OPTIONS
// ============================================================

const PRODUCT_TYPE_OPTIONS = [
  {
    value: "unmilled_palay",
    label: "Unmilled Palay",
  },
  {
    value: "milled_rice",
    label: "Milled Rice",
  },
];


// ============================================================
// FAILURE REASONS
// ============================================================

const FAILURE_REASON_OPTIONS = [
  {
    value:
      "severe_weather_typhoon",

    label:
      "Severe Weather / Typhoon",
  },

  {
    value:
      "drought_insufficient_water",

    label:
      "Drought / Insufficient Water",
  },

  {
    value:
      "pest_disease",

    label:
      "Pest / Disease",
  },

  {
    value:
      "low_or_failed_yield",

    label:
      "Low or Failed Yield",
  },

  {
    value:
      "other",

    label:
      "Other",
  },
];


// ============================================================
// INITIAL FORMS
// ============================================================

const EMPTY_START_FORM = {
  land_preparation_date: "",
};


const EMPTY_PLANTING_FORM = {
  rice_variety: "",
  planting_date: "",
  expected_harvest_date: "",
  expected_yield_kg: "",
};


const EMPTY_UPDATE_FORM = {
  expected_harvest_date: "",
  expected_yield_kg: "",
  remarks: "",
};


const EMPTY_HARVEST_FORM = {
  product_type: "",
  actual_harvest_date: "",
  actual_yield_kg: "",
  product_image: "",
  product_image_name: "",
  description: "",
  product_grade_selection: "",
  product_grade_custom: "",
};


const EMPTY_FAILED_FORM = {
  failure_reason: "",
  additional_remarks: "",
};


// ============================================================
// HELPERS
// ============================================================

const displayValue = (
  value,
  fallback = "—"
) => {
  const normalized =
    String(
      value ?? ""
    ).trim();

  return (
    normalized ||
    fallback
  );
};


const formatStatus = (
  value
) => {
  const normalized =
    String(
      value || ""
    )
      .replaceAll(
        "_",
        " "
      )
      .trim();

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


const getTodayDate = () => {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
};


const toDateInputValue = (
  value
) => {
  if (!value) {
    return "";
  }

  const text =
    String(
      value
    ).trim();

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      text
    )
  ) {
    return text;
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
    return "";
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
};


// ============================================================
// FIELD COMPONENT
// ============================================================

const FormField = ({
  label,
  required = false,
  children,
  fullWidth = false,
  hint = "",
}) => {
  return (
    <div
      className={
        fullWidth
          ? "md:col-span-2"
          : ""
      }
    >
      <label
        className="
          mb-1.5
          block
          text-sm
          font-semibold
          text-slate-700
        "
      >
        {label}

        {
          required &&
          (
            <span
              className="
                ml-1
                text-red-500
              "
            >
              *
            </span>
          )
        }
      </label>

      {children}

      {
        hint &&
        (
          <p
            className="
              mt-1.5
              text-xs
              leading-5
              text-slate-400
            "
          >
            {hint}
          </p>
        )
      }
    </div>
  );
};


// ============================================================
// READ ONLY ITEM
// ============================================================

const ReadOnlyItem = ({
  label,
  value,
}) => {
  return (
    <div
      className="
        min-w-0
      "
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

      <p
        className="
          mt-1
          break-words
          text-sm
          font-semibold
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
// MAIN COMPONENT
// ============================================================

export default function FarmerCropActionModal({
  open,
  action,
  farm,
  isSaving = false,
  error = "",
  onClose,
  onSubmit,
}) {

  // =========================================================
  // VIEW
  // =========================================================

  const [
    modalView,
    setModalView,
  ] =
    useState(
      "primary"
    );


  // =========================================================
  // FORMS
  // =========================================================

  const [
    startForm,
    setStartForm,
  ] =
    useState(
      EMPTY_START_FORM
    );


  const [
    plantingForm,
    setPlantingForm,
  ] =
    useState(
      EMPTY_PLANTING_FORM
    );


  const [
    updateForm,
    setUpdateForm,
  ] =
    useState(
      EMPTY_UPDATE_FORM
    );


  const [
    harvestForm,
    setHarvestForm,
  ] =
    useState(
      EMPTY_HARVEST_FORM
    );


  const [
    failedForm,
    setFailedForm,
  ] =
    useState(
      EMPTY_FAILED_FORM
    );


  const [
    localError,
    setLocalError,
  ] =
    useState(
      ""
    );


  const [
    isReadingImage,
    setIsReadingImage,
  ] =
    useState(
      false
    );


  // =========================================================
  // DERIVED FARM INFORMATION
  // =========================================================

  const farmName =
    farm?.farm_name ||
    (
      farm?.farm_id
        ? `Farm #${farm.farm_id}`
        : "Farm"
    );


  const currentCropStatus =
    farm?.current_crop_status ||
    "available_for_planting";


  const currentRiceVariety =
    farm?.current_rice_variety ||
    farm?.rice_variety ||
    farm?.registered_rice_variety ||
    farm?.rice_variety_currently_planted ||
    "";


  const currentCropCycle =
    farm?.current_crop_cycle_id ||
    farm?.crop_cycle_id ||
    farm?.current_crop_cycle ||
    "";


  // =========================================================
  // RESET WHEN OPENED
  // =========================================================

  useEffect(
    () => {
      if (!open) {
        return;
      }


      setModalView(
        action === RECORD_FAILED_CROP
          ? "failed"
          : action === RECORD_HARVEST
            ? "harvest"
            : "primary"
      );


      setLocalError(
        ""
      );


      setStartForm({
        ...EMPTY_START_FORM,
      });


      setPlantingForm({
        ...EMPTY_PLANTING_FORM,

        rice_variety:
          currentRiceVariety,
      });


      setUpdateForm({
        ...EMPTY_UPDATE_FORM,

        expected_harvest_date:
          toDateInputValue(
            farm?.expected_harvest_date
          ),

        expected_yield_kg:
          farm?.expected_yield_kg ??
          "",
      });


      setHarvestForm({
        ...EMPTY_HARVEST_FORM,

        actual_harvest_date:
          getTodayDate(),
      });


      setFailedForm({
        ...EMPTY_FAILED_FORM,
      });
    },
    [
      open,
      action,
      farm,
      currentRiceVariety,
    ]
  );


  // =========================================================
  // BACKGROUND SCROLL LOCK
  // =========================================================

  useEffect(
    () => {
      if (!open) {
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
  // EFFECTIVE ACTION
  // =========================================================

  const effectiveAction =
    useMemo(
      () => {
        if (
          modalView ===
          "harvest"
        ) {
          return RECORD_HARVEST;
        }


        if (
          modalView ===
          "failed"
        ) {
          return RECORD_FAILED_CROP;
        }


        return action;
      },
      [
        modalView,
        action,
      ]
    );


  // =========================================================
  // TITLE
  // =========================================================

  const modalTitle =
    useMemo(
      () => {
        if (
          effectiveAction ===
          START_LAND_PREPARATION
        ) {
          return "Start Land Preparation";
        }


        if (
          effectiveAction ===
          RECORD_PLANTING
        ) {
          return "Record Planting";
        }


        if (
          effectiveAction ===
          UPDATE_CROP
        ) {
          return "Update Current Crop";
        }


        if (
          effectiveAction ===
          RECORD_HARVEST
        ) {
          return "Record Harvest";
        }


        if (
          effectiveAction ===
          RECORD_FAILED_CROP
        ) {
          return "Record Failed Crop";
        }


        return "Manage Current Crop";
      },
      [
        effectiveAction,
      ]
    );


  const modalDescription =
    useMemo(
      () => {
        if (
          effectiveAction ===
          START_LAND_PREPARATION
        ) {
          return (
            "Start a new cropping cycle by recording the land preparation date."
          );
        }


        if (
          effectiveAction ===
          RECORD_PLANTING
        ) {
          return (
            "Record the rice variety, planting date, and expected harvest information."
          );
        }


        if (
          effectiveAction ===
          UPDATE_CROP
        ) {
          return (
            "Update the expected harvest, expected yield, or crop progress."
          );
        }


        if (
          effectiveAction ===
          RECORD_HARVEST
        ) {
          return (
            "Record the successful harvest and automatically create its Farmer Inventory product."
          );
        }


        if (
          effectiveAction ===
          RECORD_FAILED_CROP
        ) {
          return (
            "Record why the current crop could not be successfully completed."
          );
        }


        return "";
      },
      [
        effectiveAction,
      ]
    );


  if (!open) {
    return null;
  }


  // =========================================================
  // CLOSE
  // =========================================================

  const handleClose = () => {
    if (
      isSaving ||
      isReadingImage
    ) {
      return;
    }


    setLocalError(
      ""
    );


    onClose?.();
  };


  // =========================================================
  // RETURN TO UPDATE VIEW
  // =========================================================

  const handleBackToPrimary =
    () => {
      if (
        isSaving ||
        isReadingImage
      ) {
        return;
      }


      setLocalError(
        ""
      );


      setModalView(
        "primary"
      );
    };


  // =========================================================
  // OPEN HARVEST
  // =========================================================

  const handleOpenHarvest =
    () => {
      if (isSaving) {
        return;
      }


      setLocalError(
        ""
      );


      setHarvestForm(
        (
          current
        ) => ({
          ...current,

          actual_harvest_date:
            current.actual_harvest_date ||
            getTodayDate(),
        })
      );


      setModalView(
        "harvest"
      );
    };


  // =========================================================
  // OPEN FAILED
  // =========================================================

  const handleOpenFailed =
    () => {
      if (isSaving) {
        return;
      }


      setLocalError(
        ""
      );


      setModalView(
        "failed"
      );
    };


  // =========================================================
  // IMAGE
  // =========================================================

  const handleImageChange =
    (
      event
    ) => {
      const file =
        event.target.files?.[0];


      if (!file) {
        return;
      }


      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
      ];


      if (
        !allowedTypes.includes(
          file.type
        )
      ) {
        setLocalError(
          "Product photo must be a JPG, PNG, or WEBP image."
        );

        event.target.value =
          "";

        return;
      }


      const maxFileSize =
        5 * 1024 * 1024;


      if (
        file.size >
        maxFileSize
      ) {
        setLocalError(
          "Product photo must not exceed 5 MB."
        );

        event.target.value =
          "";

        return;
      }


      setLocalError(
        ""
      );


      setIsReadingImage(
        true
      );


      const reader =
        new FileReader();


      reader.onload =
        () => {
          setHarvestForm(
            (
              current
            ) => ({
              ...current,

              product_image:
                typeof reader.result ===
                "string"
                  ? reader.result
                  : "",

              product_image_name:
                file.name,
            })
          );


          setIsReadingImage(
            false
          );
        };


      reader.onerror =
        () => {
          setIsReadingImage(
            false
          );


          setLocalError(
            "Unable to read the selected product photo."
          );
        };


      reader.readAsDataURL(
        file
      );
    };


  const handleRemoveImage =
    () => {
      if (
        isSaving ||
        isReadingImage
      ) {
        return;
      }


      setHarvestForm(
        (
          current
        ) => ({
          ...current,

          product_image:
            "",

          product_image_name:
            "",
        })
      );
    };


  // =========================================================
  // SUBMIT
  // =========================================================

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();


      if (
        !onSubmit ||
        isSaving ||
        isReadingImage
      ) {
        return;
      }


      setLocalError(
        ""
      );


      // ------------------------------------------------------
      // START LAND PREPARATION
      // ------------------------------------------------------

      if (
        effectiveAction ===
        START_LAND_PREPARATION
      ) {
        if (
          !startForm.land_preparation_date
        ) {
          setLocalError(
            "Land Preparation Date is required."
          );

          return;
        }


        await onSubmit(
          {
            land_preparation_date:
              startForm.land_preparation_date,
          },
          START_LAND_PREPARATION
        );

        return;
      }


      // ------------------------------------------------------
      // RECORD PLANTING
      // ------------------------------------------------------

      if (
        effectiveAction ===
        RECORD_PLANTING
      ) {
        const riceVariety =
          String(
            plantingForm.rice_variety ||
            ""
          ).trim();


        if (!riceVariety) {
          setLocalError(
            "Rice Variety is required."
          );

          return;
        }


        if (
          !plantingForm.planting_date
        ) {
          setLocalError(
            "Planting Date is required."
          );

          return;
        }


        if (
          !plantingForm.expected_harvest_date
        ) {
          setLocalError(
            "Expected Harvest Date is required."
          );

          return;
        }


        if (
          plantingForm.expected_harvest_date <
          plantingForm.planting_date
        ) {
          setLocalError(
            "Expected Harvest Date cannot be earlier than Planting Date."
          );

          return;
        }


        if (
          plantingForm.expected_yield_kg !==
            "" &&
          Number(
            plantingForm.expected_yield_kg
          ) <= 0
        ) {
          setLocalError(
            "Expected Yield must be greater than zero."
          );

          return;
        }


        await onSubmit(
          {
            rice_variety:
              riceVariety,

            planting_date:
              plantingForm.planting_date,

            expected_harvest_date:
              plantingForm.expected_harvest_date,

            expected_yield_kg:
              plantingForm.expected_yield_kg,
          },
          RECORD_PLANTING
        );

        return;
      }


      // ------------------------------------------------------
      // UPDATE CROP
      // ------------------------------------------------------

      if (
        effectiveAction ===
        UPDATE_CROP
      ) {
        if (
          updateForm.expected_yield_kg !==
            "" &&
          Number(
            updateForm.expected_yield_kg
          ) <= 0
        ) {
          setLocalError(
            "Expected Yield must be greater than zero."
          );

          return;
        }


        if (
          updateForm.expected_harvest_date &&
          farm?.planting_date &&
          updateForm.expected_harvest_date <
            toDateInputValue(
              farm.planting_date
            )
        ) {
          setLocalError(
            "Expected Harvest Date cannot be earlier than Planting Date."
          );

          return;
        }


        if (
          !updateForm.expected_harvest_date &&
          updateForm.expected_yield_kg ===
            "" &&
          !String(
            updateForm.remarks ||
            ""
          ).trim()
        ) {
          setLocalError(
            "Please provide at least one crop update."
          );

          return;
        }


        await onSubmit(
          {
            expected_harvest_date:
              updateForm.expected_harvest_date,

            expected_yield_kg:
              updateForm.expected_yield_kg,

            remarks:
              String(
                updateForm.remarks ||
                ""
              ).trim(),
          },
          UPDATE_CROP
        );

        return;
      }


      // ------------------------------------------------------
      // RECORD HARVEST
      // ------------------------------------------------------

      if (
        effectiveAction ===
        RECORD_HARVEST
      ) {
        if (
          !harvestForm.product_type
        ) {
          setLocalError(
            "Product Type is required."
          );

          return;
        }


        if (
          !harvestForm.actual_harvest_date
        ) {
          setLocalError(
            "Actual Harvest Date is required."
          );

          return;
        }


        if (
          !harvestForm.actual_yield_kg
        ) {
          setLocalError(
            "Actual Yield is required."
          );

          return;
        }


        if (
          Number(
            harvestForm.actual_yield_kg
          ) <= 0
        ) {
          setLocalError(
            "Actual Yield must be greater than zero."
          );

          return;
        }


        if (
          farm?.planting_date &&
          harvestForm.actual_harvest_date <
            toDateInputValue(
              farm.planting_date
            )
        ) {
          setLocalError(
            "Actual Harvest Date cannot be earlier than Planting Date."
          );

          return;
        }


        let productGrade =
          "";


        if (
          harvestForm.product_grade_selection ===
          "other"
        ) {
          productGrade =
            String(
              harvestForm.product_grade_custom ||
              ""
            ).trim();


          if (!productGrade) {
            setLocalError(
              "Please specify the Product Grade / Classification."
            );

            return;
          }
        }


        await onSubmit(
          {
            product_type:
              harvestForm.product_type,

            actual_harvest_date:
              harvestForm.actual_harvest_date,

            actual_yield_kg:
              harvestForm.actual_yield_kg,

            product_image:
              harvestForm.product_image,

            description:
              String(
                harvestForm.description ||
                ""
              ).trim(),

            product_grade:
              productGrade,
          },
          RECORD_HARVEST
        );

        return;
      }


      // ------------------------------------------------------
      // FAILED CROP
      // ------------------------------------------------------

      if (
        effectiveAction ===
        RECORD_FAILED_CROP
      ) {
        if (
          !failedForm.failure_reason
        ) {
          setLocalError(
            "Failure Reason is required."
          );

          return;
        }


        if (
          failedForm.failure_reason ===
            "other" &&
          !String(
            failedForm.additional_remarks ||
            ""
          ).trim()
        ) {
          setLocalError(
            "Please provide additional remarks when Other is selected."
          );

          return;
        }


        await onSubmit(
          {
            failure_reason:
              failedForm.failure_reason,

            additional_remarks:
              String(
                failedForm.additional_remarks ||
                ""
              ).trim(),
          },
          RECORD_FAILED_CROP
        );
      }
    };


  // =========================================================
  // CONTENT
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
        p-3
        sm:p-4
      "
    >

      <div
        role="dialog"
        aria-modal="true"
        className="
          flex
          max-h-[92vh]
          w-full
          max-w-3xl
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
            px-5
            py-5
            sm:px-6
          "
        >

          <div
            className="
              flex
              min-w-0
              items-start
              gap-3
            "
          >

            {
              (
                modalView ===
                  "harvest" ||
                modalView ===
                  "failed"
              ) &&
              action !== RECORD_HARVEST &&
              action !== RECORD_FAILED_CROP &&
              (
                <button
                  type="button"
                  onClick={
                    handleBackToPrimary
                  }
                  disabled={
                    isSaving
                  }
                  aria-label="Back"
                  className="
                    mt-0.5
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-slate-200
                    text-slate-500
                    transition
                    hover:bg-slate-50
                    hover:text-slate-800
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  <ArrowLeft
                    size={17}
                  />
                </button>
              )
            }


            <div
              className="
                min-w-0
              "
            >
              <h3
                className="
                  text-xl
                  font-bold
                  text-slate-900
                "
              >
                {
                  modalTitle
                }
              </h3>

              <p
                className="
                  mt-1
                  max-w-xl
                  text-sm
                  leading-5
                  text-slate-500
                "
              >
                {
                  modalDescription
                }
              </p>
            </div>

          </div>


          <button
            type="button"
            onClick={
              handleClose
            }
            disabled={
              isSaving ||
              isReadingImage
            }
            aria-label="Close modal"
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
              text-slate-400
              transition
              hover:bg-slate-50
              hover:text-slate-700
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            <X
              size={18}
            />
          </button>

        </div>


        {/* ==================================================
            FORM
        ================================================== */}

        <form
          onSubmit={
            handleSubmit
          }
          className="
            flex
            min-h-0
            flex-1
            flex-col
          "
        >

          <div
            className="
              min-h-0
              flex-1
              overflow-y-auto
              px-5
              py-5
              sm:px-6
            "
          >

            {/* ==============================================
                ERROR
            ============================================== */}

            {
              (
                localError ||
                error
              ) &&
              (
                <div
                  className="
                    mb-5
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
                    {
                      localError ||
                      error
                    }
                  </span>
                </div>
              )
            }


            {/* ==============================================
                FARM SUMMARY
            ============================================== */}

            <div
              className="
                mb-6
                grid
                gap-4
                rounded-xl
                border
                border-slate-200
                bg-slate-50
                p-4
                sm:grid-cols-2
              "
            >
              <ReadOnlyItem
                label="Farm / Farm Lot"
                value={
                  farmName
                }
              />

              <ReadOnlyItem
                label="Current Crop Status"
                value={
                  formatStatus(
                    currentCropStatus
                  )
                }
              />
            </div>


            {/* ==============================================
                START LAND PREPARATION
            ============================================== */}

            {
              effectiveAction ===
                START_LAND_PREPARATION &&
              (
                <div
                  className="
                    grid
                    gap-5
                    md:grid-cols-2
                  "
                >
                  <FormField
                    label="Land Preparation Date"
                    required
                    fullWidth
                  >
                    <input
                      required
                      type="date"
                      value={
                        startForm.land_preparation_date
                      }
                      onChange={
                        (
                          event
                        ) =>
                          setStartForm(
                            {
                              land_preparation_date:
                                event.target.value,
                            }
                          )
                      }
                      className="
                        w-full
                        rounded-xl
                        border
                        border-slate-300
                        px-3.5
                        py-2.5
                        text-sm
                        outline-none
                        focus:border-green-600
                        focus:ring-1
                        focus:ring-green-600
                      "
                    />
                  </FormField>
                </div>
              )
            }


            {/* ==============================================
                RECORD PLANTING
            ============================================== */}

            {
              effectiveAction ===
                RECORD_PLANTING &&
              (
                <>
                  <div
                    className="
                      grid
                      gap-x-4
                      gap-y-5
                      md:grid-cols-2
                    "
                  >
                    <FormField
                      label="Rice Variety"
                      required
                      fullWidth
                    >
                      <input
                        required
                        type="text"
                        value={
                          plantingForm.rice_variety
                        }
                        onChange={
                          (
                            event
                          ) =>
                            setPlantingForm(
                              (
                                current
                              ) => ({
                                ...current,

                                rice_variety:
                                  event.target.value,
                              })
                            )
                        }
                        placeholder="Enter rice variety"
                        className="
                          w-full
                          rounded-xl
                          border
                          border-slate-300
                          px-3.5
                          py-2.5
                          text-sm
                          outline-none
                          placeholder:text-slate-400
                          focus:border-green-600
                          focus:ring-1
                          focus:ring-green-600
                        "
                      />
                    </FormField>


                    <FormField
                      label="Planting Date"
                      required
                    >
                      <input
                        required
                        type="date"
                        value={
                          plantingForm.planting_date
                        }
                        onChange={
                          (
                            event
                          ) =>
                            setPlantingForm(
                              (
                                current
                              ) => ({
                                ...current,

                                planting_date:
                                  event.target.value,
                              })
                            )
                        }
                        className="
                          w-full
                          rounded-xl
                          border
                          border-slate-300
                          px-3.5
                          py-2.5
                          text-sm
                          outline-none
                          focus:border-green-600
                          focus:ring-1
                          focus:ring-green-600
                        "
                      />
                    </FormField>


                    <FormField
                      label="Expected Harvest Date"
                      required
                    >
                      <input
                        required
                        type="date"
                        value={
                          plantingForm.expected_harvest_date
                        }
                        onChange={
                          (
                            event
                          ) =>
                            setPlantingForm(
                              (
                                current
                              ) => ({
                                ...current,

                                expected_harvest_date:
                                  event.target.value,
                              })
                            )
                        }
                        className="
                          w-full
                          rounded-xl
                          border
                          border-slate-300
                          px-3.5
                          py-2.5
                          text-sm
                          outline-none
                          focus:border-green-600
                          focus:ring-1
                          focus:ring-green-600
                        "
                      />
                    </FormField>


                    <FormField
                      label="Expected Yield (kg)"
                      hint="Optional."
                    >
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={
                          plantingForm.expected_yield_kg
                        }
                        onChange={
                          (
                            event
                          ) =>
                            setPlantingForm(
                              (
                                current
                              ) => ({
                                ...current,

                                expected_yield_kg:
                                  event.target.value,
                              })
                            )
                        }
                        placeholder="Enter expected yield"
                        className="
                          w-full
                          rounded-xl
                          border
                          border-slate-300
                          px-3.5
                          py-2.5
                          text-sm
                          outline-none
                          placeholder:text-slate-400
                          focus:border-green-600
                          focus:ring-1
                          focus:ring-green-600
                        "
                      />
                    </FormField>
                  </div>


                  {/* FAILURE OPTION */}

                  <div
                    className="
                      mt-6
                      border-t
                      border-slate-200
                      pt-5
                    "
                  >
                    <div
                      className="
                        flex
                        flex-col
                        gap-3
                        rounded-xl
                        bg-slate-50
                        p-4
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                      "
                    >
                      <div>
                        <p
                          className="
                            text-sm
                            font-semibold
                            text-slate-700
                          "
                        >
                          Did this crop fail?
                        </p>

                        <p
                          className="
                            mt-1
                            text-xs
                            text-slate-500
                          "
                        >
                          Record the crop as failed instead of continuing this cycle.
                        </p>
                      </div>


                      <button
                        type="button"
                        onClick={
                          handleOpenFailed
                        }
                        disabled={
                          isSaving
                        }
                        className="
                          shrink-0
                          rounded-lg
                          border
                          border-red-200
                          bg-white
                          px-4
                          py-2.5
                          text-sm
                          font-semibold
                          text-red-600
                          transition
                          hover:bg-red-50
                          disabled:cursor-not-allowed
                          disabled:opacity-50
                        "
                      >
                        Record Failed Crop
                      </button>
                    </div>
                  </div>
                </>
              )
            }


            {/* ==============================================
                UPDATE CROP
            ============================================== */}

            {
              effectiveAction ===
                UPDATE_CROP &&
              (
                <>
                  <div
                    className="
                      grid
                      gap-x-4
                      gap-y-5
                      md:grid-cols-2
                    "
                  >
                    <FormField
                      label="Expected Harvest Date"
                    >
                      <input
                        type="date"
                        value={
                          updateForm.expected_harvest_date
                        }
                        onChange={
                          (
                            event
                          ) =>
                            setUpdateForm(
                              (
                                current
                              ) => ({
                                ...current,

                                expected_harvest_date:
                                  event.target.value,
                              })
                            )
                        }
                        className="
                          w-full
                          rounded-xl
                          border
                          border-slate-300
                          px-3.5
                          py-2.5
                          text-sm
                          outline-none
                          focus:border-green-600
                          focus:ring-1
                          focus:ring-green-600
                        "
                      />
                    </FormField>


                    <FormField
                      label="Expected Yield (kg)"
                    >
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={
                          updateForm.expected_yield_kg
                        }
                        onChange={
                          (
                            event
                          ) =>
                            setUpdateForm(
                              (
                                current
                              ) => ({
                                ...current,

                                expected_yield_kg:
                                  event.target.value,
                              })
                            )
                        }
                        placeholder="Enter updated expected yield"
                        className="
                          w-full
                          rounded-xl
                          border
                          border-slate-300
                          px-3.5
                          py-2.5
                          text-sm
                          outline-none
                          placeholder:text-slate-400
                          focus:border-green-600
                          focus:ring-1
                          focus:ring-green-600
                        "
                      />
                    </FormField>


                    <FormField
                      label="Crop Update / Remarks"
                      fullWidth
                    >
                      <textarea
                        rows={4}
                        value={
                          updateForm.remarks
                        }
                        onChange={
                          (
                            event
                          ) =>
                            setUpdateForm(
                              (
                                current
                              ) => ({
                                ...current,

                                remarks:
                                  event.target.value,
                              })
                            )
                        }
                        placeholder="Enter crop progress or other important observations"
                        className="
                          w-full
                          resize-none
                          rounded-xl
                          border
                          border-slate-300
                          px-3.5
                          py-2.5
                          text-sm
                          leading-6
                          outline-none
                          placeholder:text-slate-400
                          focus:border-green-600
                          focus:ring-1
                          focus:ring-green-600
                        "
                      />
                    </FormField>
                  </div>


                  {/* ========================================
                      CROP OUTCOME
                  ======================================== */}

                  <div
                    className="
                      mt-6
                      border-t
                      border-slate-200
                      pt-5
                    "
                  >
                    <div
                      className="
                        rounded-xl
                        border
                        border-slate-200
                        bg-slate-50
                        p-4
                      "
                    >
                      <div
                        className="
                          mb-4
                        "
                      >
                        <p
                          className="
                            text-sm
                            font-bold
                            text-slate-800
                          "
                        >
                          Crop Outcome
                        </p>

                        <p
                          className="
                            mt-1
                            text-xs
                            leading-5
                            text-slate-500
                          "
                        >
                          Use these actions only when the current cropping cycle has reached its final outcome.
                        </p>
                      </div>


                      <div
                        className="
                          grid
                          gap-3
                          sm:grid-cols-2
                        "
                      >

                        {/* HARVEST */}

                        <button
                          type="button"
                          onClick={
                            handleOpenHarvest
                          }
                          disabled={
                            isSaving
                          }
                          className="
                            flex
                            items-center
                            gap-3
                            rounded-xl
                            border
                            border-green-200
                            bg-white
                            p-4
                            text-left
                            transition
                            hover:border-green-300
                            hover:bg-green-50
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                          "
                        >
                          <span
                            className="
                              flex
                              h-10
                              w-10
                              shrink-0
                              items-center
                              justify-center
                              rounded-xl
                              bg-green-100
                              text-green-700
                            "
                          >
                            <PackageCheck
                              size={19}
                            />
                          </span>


                          <span>
                            <span
                              className="
                                block
                                text-sm
                                font-bold
                                text-green-700
                              "
                            >
                              Record Harvest
                            </span>

                            <span
                              className="
                                mt-0.5
                                block
                                text-xs
                                leading-4
                                text-slate-500
                              "
                            >
                              Complete the crop and add the harvested product to Inventory.
                            </span>
                          </span>
                        </button>


                        {/* FAILED */}

                        <button
                          type="button"
                          onClick={
                            handleOpenFailed
                          }
                          disabled={
                            isSaving
                          }
                          className="
                            flex
                            items-center
                            gap-3
                            rounded-xl
                            border
                            border-red-200
                            bg-white
                            p-4
                            text-left
                            transition
                            hover:border-red-300
                            hover:bg-red-50
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                          "
                        >
                          <span
                            className="
                              flex
                              h-10
                              w-10
                              shrink-0
                              items-center
                              justify-center
                              rounded-xl
                              bg-red-50
                              text-red-600
                            "
                          >
                            <TriangleAlert
                              size={19}
                            />
                          </span>


                          <span>
                            <span
                              className="
                                block
                                text-sm
                                font-bold
                                text-red-600
                              "
                            >
                              Record Failed Crop
                            </span>

                            <span
                              className="
                                mt-0.5
                                block
                                text-xs
                                leading-4
                                text-slate-500
                              "
                            >
                              End the cycle and record why the crop failed.
                            </span>
                          </span>
                        </button>

                      </div>
                    </div>
                  </div>
                </>
              )
            }


            {/* ==============================================
                RECORD HARVEST
            ============================================== */}

            {
              effectiveAction ===
                RECORD_HARVEST &&
              (
                <div
                  className="
                    space-y-6
                  "
                >

                  {/* ========================================
                      AUTOMATIC INFORMATION
                  ======================================== */}

                  <section
                    className="
                      overflow-hidden
                      rounded-xl
                      border
                      border-green-200
                      bg-green-50/40
                    "
                  >
                    <div
                      className="
                        flex
                        items-start
                        gap-3
                        border-b
                        border-green-100
                        px-4
                        py-3.5
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
                          bg-green-100
                          text-green-700
                        "
                      >
                        <CheckCircle2
                          size={18}
                        />
                      </div>


                      <div>
                        <p
                          className="
                            text-sm
                            font-bold
                            text-slate-800
                          "
                        >
                          Automatically Generated Information
                        </p>

                        <p
                          className="
                            mt-0.5
                            text-xs
                            leading-5
                            text-slate-500
                          "
                        >
                          GrainRise will automatically use these values when the harvest is saved to Inventory.
                        </p>
                      </div>
                    </div>


                    <div
                      className="
                        grid
                        gap-x-6
                        gap-y-4
                        p-4
                        sm:grid-cols-2
                        lg:grid-cols-3
                      "
                    >
                      <ReadOnlyItem
                        label="Product Code"
                        value="System-generated"
                      />

                      <ReadOnlyItem
                        label="Rice Variety"
                        value={
                          currentRiceVariety
                        }
                      />

                      <ReadOnlyItem
                        label="Source Type"
                        value="Harvest Generated"
                      />

                      <ReadOnlyItem
                        label="Source Farm"
                        value={
                          farmName
                        }
                      />

                      <ReadOnlyItem
                        label="Source Cropping Cycle"
                        value={
                          currentCropCycle
                            ? `Cycle #${currentCropCycle}`
                            : "Current Cropping Cycle"
                        }
                      />

                      <ReadOnlyItem
                        label="Product Status"
                        value="Active"
                      />
                    </div>
                  </section>


                  {/* ========================================
                      HARVEST INFORMATION
                  ======================================== */}

                  <section>
                    <div
                      className="
                        mb-4
                        flex
                        items-center
                        gap-2
                      "
                    >
                      <Sprout
                        size={17}
                        className="
                          text-green-700
                        "
                      />

                      <h4
                        className="
                          text-sm
                          font-bold
                          text-slate-800
                        "
                      >
                        Harvest Information
                      </h4>
                    </div>


                    <div
                      className="
                        grid
                        gap-x-4
                        gap-y-5
                        md:grid-cols-2
                      "
                    >
                      <FormField
                        label="Product Type"
                        required
                      >
                        <select
                          required
                          value={
                            harvestForm.product_type
                          }
                          onChange={
                            (
                              event
                            ) =>
                              setHarvestForm(
                                (
                                  current
                                ) => ({
                                  ...current,

                                  product_type:
                                    event.target.value,
                                })
                              )
                          }
                          className="
                            w-full
                            rounded-xl
                            border
                            border-slate-300
                            bg-white
                            px-3.5
                            py-2.5
                            text-sm
                            outline-none
                            focus:border-green-600
                            focus:ring-1
                            focus:ring-green-600
                          "
                        >
                          <option value="">
                            Select product type
                          </option>

                          {
                            PRODUCT_TYPE_OPTIONS.map(
                              (
                                option
                              ) => (
                                <option
                                  key={
                                    option.value
                                  }
                                  value={
                                    option.value
                                  }
                                >
                                  {
                                    option.label
                                  }
                                </option>
                              )
                            )
                          }
                        </select>
                      </FormField>


                      <FormField
                        label="Rice Variety"
                        hint="Automatically retrieved from the current crop."
                      >
                        <input
                          readOnly
                          type="text"
                          value={
                            currentRiceVariety
                          }
                          className="
                            w-full
                            cursor-not-allowed
                            rounded-xl
                            border
                            border-slate-200
                            bg-slate-50
                            px-3.5
                            py-2.5
                            text-sm
                            font-medium
                            text-slate-600
                            outline-none
                          "
                        />
                      </FormField>


                      <FormField
                        label="Actual Harvest Date"
                        required
                      >
                        <input
                          required
                          type="date"
                          value={
                            harvestForm.actual_harvest_date
                          }
                          onChange={
                            (
                              event
                            ) =>
                              setHarvestForm(
                                (
                                  current
                                ) => ({
                                  ...current,

                                  actual_harvest_date:
                                    event.target.value,
                                })
                              )
                          }
                          className="
                            w-full
                            rounded-xl
                            border
                            border-slate-300
                            px-3.5
                            py-2.5
                            text-sm
                            outline-none
                            focus:border-green-600
                            focus:ring-1
                            focus:ring-green-600
                          "
                        />
                      </FormField>


                      <FormField
                        label="Actual Yield / Initial Stock Quantity (kg)"
                        required
                        hint="This quantity will become the initial Total and Available Stock in Inventory."
                      >
                        <input
                          required
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={
                            harvestForm.actual_yield_kg
                          }
                          onChange={
                            (
                              event
                            ) =>
                              setHarvestForm(
                                (
                                  current
                                ) => ({
                                  ...current,

                                  actual_yield_kg:
                                    event.target.value,
                                })
                              )
                          }
                          placeholder="Enter actual harvested quantity"
                          className="
                            w-full
                            rounded-xl
                            border
                            border-slate-300
                            px-3.5
                            py-2.5
                            text-sm
                            outline-none
                            placeholder:text-slate-400
                            focus:border-green-600
                            focus:ring-1
                            focus:ring-green-600
                          "
                        />
                      </FormField>
                    </div>
                  </section>


                  {/* ========================================
                      PRODUCT INFORMATION
                  ======================================== */}

                  <section
                    className="
                      border-t
                      border-slate-200
                      pt-5
                    "
                  >
                    <div
                      className="
                        mb-4
                        flex
                        items-center
                        gap-2
                      "
                    >
                      <PackageCheck
                        size={17}
                        className="
                          text-green-700
                        "
                      />

                      <h4
                        className="
                          text-sm
                          font-bold
                          text-slate-800
                        "
                      >
                        Product Information
                      </h4>
                    </div>


                    <div
                      className="
                        grid
                        gap-x-4
                        gap-y-5
                        md:grid-cols-2
                      "
                    >

                      {/* PRODUCT IMAGE */}

                      <FormField
                        label="Product Photo"
                        fullWidth
                        hint="Optional. JPG, PNG, or WEBP up to 5 MB."
                      >
                        {
                          harvestForm.product_image
                            ? (
                              <div
                                className="
                                  overflow-hidden
                                  rounded-xl
                                  border
                                  border-slate-200
                                  bg-slate-50
                                "
                              >
                                <div
                                  className="
                                    flex
                                    flex-col
                                    gap-4
                                    p-4
                                    sm:flex-row
                                    sm:items-center
                                  "
                                >
                                  <div
                                    className="
                                      h-24
                                      w-24
                                      shrink-0
                                      overflow-hidden
                                      rounded-xl
                                      border
                                      border-slate-200
                                      bg-white
                                    "
                                  >
                                    <img
                                      src={
                                        harvestForm.product_image
                                      }
                                      alt="Product preview"
                                      className="
                                        h-full
                                        w-full
                                        object-cover
                                      "
                                    />
                                  </div>


                                  <div
                                    className="
                                      min-w-0
                                      flex-1
                                    "
                                  >
                                    <p
                                      className="
                                        truncate
                                        text-sm
                                        font-semibold
                                        text-slate-700
                                      "
                                    >
                                      {
                                        harvestForm.product_image_name ||
                                        "Product photo"
                                      }
                                    </p>

                                    <p
                                      className="
                                        mt-1
                                        text-xs
                                        text-slate-400
                                      "
                                    >
                                      Product image ready for harvest record.
                                    </p>
                                  </div>


                                  <button
                                    type="button"
                                    onClick={
                                      handleRemoveImage
                                    }
                                    disabled={
                                      isSaving
                                    }
                                    className="
                                      shrink-0
                                      rounded-lg
                                      border
                                      border-red-200
                                      bg-white
                                      px-3
                                      py-2
                                      text-xs
                                      font-semibold
                                      text-red-600
                                      transition
                                      hover:bg-red-50
                                    "
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            )
                            : (
                              <label
                                className="
                                  flex
                                  cursor-pointer
                                  flex-col
                                  items-center
                                  justify-center
                                  rounded-xl
                                  border
                                  border-dashed
                                  border-slate-300
                                  bg-slate-50
                                  px-5
                                  py-7
                                  text-center
                                  transition
                                  hover:border-green-400
                                  hover:bg-green-50/50
                                "
                              >
                                {
                                  isReadingImage
                                    ? (
                                      <Loader2
                                        size={25}
                                        className="
                                          animate-spin
                                          text-green-700
                                        "
                                      />
                                    )
                                    : (
                                      <ImagePlus
                                        size={25}
                                        className="
                                          text-green-700
                                        "
                                      />
                                    )
                                }

                                <span
                                  className="
                                    mt-2
                                    text-sm
                                    font-semibold
                                    text-slate-700
                                  "
                                >
                                  {
                                    isReadingImage
                                      ? "Preparing image..."
                                      : "Upload Product Photo"
                                  }
                                </span>

                                <span
                                  className="
                                    mt-1
                                    text-xs
                                    text-slate-400
                                  "
                                >
                                  Click to select a photo
                                </span>

                                <input
                                  type="file"
                                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                                  onChange={
                                    handleImageChange
                                  }
                                  disabled={
                                    isSaving ||
                                    isReadingImage
                                  }
                                  className="
                                    hidden
                                  "
                                />
                              </label>
                            )
                        }
                      </FormField>


                      {/* GRADE */}

                      <FormField
                        label="Product Grade / Classification"
                        hint="Optional. Select Other / Specify if you need to enter a classification."
                      >
                        <select
                          value={
                            harvestForm.product_grade_selection
                          }
                          onChange={
                            (
                              event
                            ) =>
                              setHarvestForm(
                                (
                                  current
                                ) => ({
                                  ...current,

                                  product_grade_selection:
                                    event.target.value,

                                  product_grade_custom:
                                    event.target.value ===
                                    "other"
                                      ? current.product_grade_custom
                                      : "",
                                })
                              )
                          }
                          className="
                            w-full
                            rounded-xl
                            border
                            border-slate-300
                            bg-white
                            px-3.5
                            py-2.5
                            text-sm
                            outline-none
                            focus:border-green-600
                            focus:ring-1
                            focus:ring-green-600
                          "
                        >
                          <option value="">
                            Not specified
                          </option>

                          <option value="other">
                            Other / Specify
                          </option>
                        </select>
                      </FormField>


                      {
                        harvestForm.product_grade_selection ===
                          "other" &&
                        (
                          <FormField
                            label="Specify Product Grade / Classification"
                          >
                            <input
                              type="text"
                              value={
                                harvestForm.product_grade_custom
                              }
                              onChange={
                                (
                                  event
                                ) =>
                                  setHarvestForm(
                                    (
                                      current
                                    ) => ({
                                      ...current,

                                      product_grade_custom:
                                        event.target.value,
                                    })
                                  )
                              }
                              placeholder="Enter classification"
                              className="
                                w-full
                                rounded-xl
                                border
                                border-slate-300
                                px-3.5
                                py-2.5
                                text-sm
                                outline-none
                                placeholder:text-slate-400
                                focus:border-green-600
                                focus:ring-1
                                focus:ring-green-600
                              "
                            />
                          </FormField>
                        )
                      }


                      {/* DESCRIPTION */}

                      <FormField
                        label="Product Description"
                        fullWidth
                        hint="Optional."
                      >
                        <textarea
                          rows={3}
                          value={
                            harvestForm.description
                          }
                          onChange={
                            (
                              event
                            ) =>
                              setHarvestForm(
                                (
                                  current
                                ) => ({
                                  ...current,

                                  description:
                                    event.target.value,
                                })
                              )
                          }
                          placeholder="Add relevant information about the harvested product"
                          className="
                            w-full
                            resize-none
                            rounded-xl
                            border
                            border-slate-300
                            px-3.5
                            py-2.5
                            text-sm
                            leading-6
                            outline-none
                            placeholder:text-slate-400
                            focus:border-green-600
                            focus:ring-1
                            focus:ring-green-600
                          "
                        />
                      </FormField>

                    </div>
                  </section>


                  {/* ========================================
                      INVENTORY NOTICE
                  ======================================== */}

                  <div
                    className="
                      flex
                      items-start
                      gap-3
                      rounded-xl
                      border
                      border-green-200
                      bg-green-50
                      p-4
                    "
                  >
                    <Upload
                      size={18}
                      className="
                        mt-0.5
                        shrink-0
                        text-green-700
                      "
                    />

                    <div>
                      <p
                        className="
                          text-sm
                          font-semibold
                          text-green-800
                        "
                      >
                        This harvest will be added to Inventory automatically.
                      </p>

                      <p
                        className="
                          mt-1
                          text-xs
                          leading-5
                          text-green-700
                        "
                      >
                        Total Stock and Available Stock will initially use the Actual Yield. Reserved / Committed Quantity will start at 0 kg. Selling Price can be configured later from Farmer Inventory.
                      </p>
                    </div>
                  </div>

                </div>
              )
            }


            {/* ==============================================
                FAILED CROP
            ============================================== */}

            {
              effectiveAction ===
                RECORD_FAILED_CROP &&
              (
                <div
                  className="
                    grid
                    gap-5
                  "
                >

                  <FormField
                    label="Failure Reason"
                    required
                  >
                    <select
                      required
                      value={
                        failedForm.failure_reason
                      }
                      onChange={
                        (
                          event
                        ) =>
                          setFailedForm(
                            (
                              current
                            ) => ({
                              ...current,

                              failure_reason:
                                event.target.value,
                            })
                          )
                      }
                      className="
                        w-full
                        rounded-xl
                        border
                        border-slate-300
                        bg-white
                        px-3.5
                        py-2.5
                        text-sm
                        outline-none
                        focus:border-red-500
                        focus:ring-1
                        focus:ring-red-500
                      "
                    >
                      <option value="">
                        Select failure reason
                      </option>

                      {
                        FAILURE_REASON_OPTIONS.map(
                          (
                            option
                          ) => (
                            <option
                              key={
                                option.value
                              }
                              value={
                                option.value
                              }
                            >
                              {
                                option.label
                              }
                            </option>
                          )
                        )
                      }
                    </select>
                  </FormField>


                  <FormField
                    label={
                      failedForm.failure_reason ===
                      "other"
                        ? "Additional Remarks"
                        : "Additional Remarks"
                    }
                    required={
                      failedForm.failure_reason ===
                      "other"
                    }
                    hint={
                      failedForm.failure_reason ===
                      "other"
                        ? "Required when Other is selected."
                        : "Optional."
                    }
                  >
                    <textarea
                      rows={4}
                      value={
                        failedForm.additional_remarks
                      }
                      onChange={
                        (
                          event
                        ) =>
                          setFailedForm(
                            (
                              current
                            ) => ({
                              ...current,

                              additional_remarks:
                                event.target.value,
                            })
                          )
                      }
                      placeholder="Provide additional details about the failed crop"
                      className="
                        w-full
                        resize-none
                        rounded-xl
                        border
                        border-slate-300
                        px-3.5
                        py-2.5
                        text-sm
                        leading-6
                        outline-none
                        placeholder:text-slate-400
                        focus:border-red-500
                        focus:ring-1
                        focus:ring-red-500
                      "
                    />
                  </FormField>


                  <div
                    className="
                      flex
                      items-start
                      gap-3
                      rounded-xl
                      border
                      border-red-200
                      bg-red-50
                      p-4
                    "
                  >
                    <TriangleAlert
                      size={18}
                      className="
                        mt-0.5
                        shrink-0
                        text-red-600
                      "
                    />

                    <div>
                      <p
                        className="
                          text-sm
                          font-semibold
                          text-red-700
                        "
                      >
                        This will end the current cropping cycle.
                      </p>

                      <p
                        className="
                          mt-1
                          text-xs
                          leading-5
                          text-red-600
                        "
                      >
                        The crop status will become Failed Crop. No Inventory product will be created.
                      </p>
                    </div>
                  </div>

                </div>
              )
            }

          </div>


          {/* =================================================
              FOOTER
          ================================================= */}

          <div
            className="
              flex
              shrink-0
              items-center
              justify-end
              border-t
              border-slate-200
              bg-white
              px-5
              py-4
              sm:px-6
            "
          >

            <button
              type="submit"
              disabled={
                isSaving ||
                isReadingImage
              }
              className={`
                inline-flex
                min-w-36
                items-center
                justify-center
                gap-2
                rounded-lg
                px-5
                py-2.5
                text-sm
                font-semibold
                text-white
                transition
                disabled:cursor-not-allowed
                disabled:opacity-60

                ${
                  effectiveAction ===
                  RECORD_FAILED_CROP
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-700 hover:bg-green-800"
                }
              `}
            >
              {
                (
                  isSaving ||
                  isReadingImage
                ) &&
                (
                  <Loader2
                    size={16}
                    className="
                      animate-spin
                    "
                  />
                )
              }


              {
                effectiveAction ===
                  START_LAND_PREPARATION &&
                "Start Land Preparation"
              }


              {
                effectiveAction ===
                  RECORD_PLANTING &&
                "Record Planting"
              }


              {
                effectiveAction ===
                  UPDATE_CROP &&
                "Save Crop Update"
              }


              {
                effectiveAction ===
                  RECORD_HARVEST &&
                "Record Harvest"
              }


              {
                effectiveAction ===
                  RECORD_FAILED_CROP &&
                "Record Failed Crop"
              }
            </button>

          </div>

        </form>

      </div>

    </div>
  );


  return createPortal(
    modalContent,
    document.body
  );
}