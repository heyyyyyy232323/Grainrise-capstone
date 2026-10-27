import {
  useEffect,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";

import useFarmAddress from "../hooks/Farmer/useFarmAddress";


// ============================================================
// EMPTY FORM
// ============================================================

const EMPTY_FORM = {
  farm_name: "",
  street_address: "",
  total_farm_area: "",
  land_ownership_status: "owned",
  rice_variety_currently_planted: "",
  cropping_cycles_per_year: "",
};


// ============================================================
// EMPTY EDIT ADDRESS
// ============================================================

const EMPTY_EDIT_ADDRESS = {
  province: "",
  municipality: "",
  barangay: "",
  postalCode: "",
};


// ============================================================
// LAND OWNERSHIP
// ============================================================

const LAND_OWNERSHIP_OPTIONS = [
  {
    value: "owned",
    label: "Owned",
  },
  {
    value: "leased",
    label: "Rented / Leased",
  },
  {
    value: "tenant",
    label: "Tenant",
  },
  {
    value: "shared",
    label: "Shared",
  },
  {
    value: "other",
    label: "Other",
  },
];


// ============================================================
// INITIAL VALUES
// ============================================================

const normalizeInitialValues = (
  values = {}
) => ({
  farm_name:
    values.farm_name || "",

  street_address:
    values.street_address || "",

  total_farm_area:
    values.total_farm_area ?? "",

  land_ownership_status:
    values.land_ownership_status ||
    "owned",

  rice_variety_currently_planted:
    values.rice_variety_currently_planted ||
    values.registered_rice_variety ||
    "",

  cropping_cycles_per_year:
    values.cropping_cycles_per_year ??
    "",
});


// ============================================================
// NORMALIZE ADDRESS
// ============================================================

const normalizeEditAddress = (
  values = {}
) => ({
  province:
    String(
      values.province ||
      ""
    ).trim(),

  municipality:
    String(
      values.municipality ||
      ""
    ).trim(),

  barangay:
    String(
      values.barangay ||
      ""
    ).trim(),

  postalCode:
    String(
      values.postal_code ||
      values.postalCode ||
      ""
    ).trim(),
});


// ============================================================
// COMPONENT
// ============================================================

export default function FarmerFarmFormModal({
  open,
  mode = "add",
  initialValues = null,
  isSaving = false,
  error = "",
  onClose,
  onSubmit,
}) {
  const [
    form,
    setForm,
  ] = useState(
    EMPTY_FORM
  );


  const [
    editAddressSeed,
    setEditAddressSeed,
  ] = useState(
    EMPTY_EDIT_ADDRESS
  );


  const [
    editAddressHydrated,
    setEditAddressHydrated,
  ] = useState(
    false
  );


  const isEdit =
    mode === "edit";


  // =========================================================
  // ADDRESS
  // ============================================================

  const {
    province,
    municipality,
    barangay,
    postalCode,

    provinceOptions,
    municipalityOptions,
    barangayOptions,

    loading,
    errors,

    manualMode,

    selectProvince,
    selectMunicipality,
    selectBarangay,

    updateManualProvince,
    updateManualMunicipality,
    updateManualBarangay,
    updatePostalCode,

    enableManualMode,
    enableDropdownMode,

    resetAddress,
  } = useFarmAddress();


  // =========================================================
  // INITIALIZE MODAL
  // ============================================================

  useEffect(
    () => {
      if (!open) {
        return;
      }


      // ------------------------------------------------------
      // EDIT FARM
      // ------------------------------------------------------

      if (isEdit) {
        const normalizedAddress =
          normalizeEditAddress(
            initialValues || {}
          );


        setForm(
          normalizeInitialValues(
            initialValues || {}
          )
        );


        setEditAddressSeed(
          normalizedAddress
        );


        setEditAddressHydrated(
          false
        );


        /*
          Important:

          Do NOT force Edit mode into manual address mode.

          We reset the address and allow the same dropdown
          sequence used by Add Farm:

          Province
            -> Municipality
              -> Barangay
                -> Postal Code

          The effects below will restore the saved farm address.
        */

        resetAddress();


        if (
          typeof enableDropdownMode ===
          "function"
        ) {
          enableDropdownMode();
        }


        return;
      }


      // ------------------------------------------------------
      // ADD FARM
      // ------------------------------------------------------

      setForm({
        ...EMPTY_FORM,
      });


      setEditAddressSeed({
        ...EMPTY_EDIT_ADDRESS,
      });


      setEditAddressHydrated(
        false
      );


      resetAddress();


      if (
        typeof enableDropdownMode ===
        "function"
      ) {
        enableDropdownMode();
      }
    },
    [
      open,
      isEdit,
      initialValues,
      resetAddress,
      enableDropdownMode,
    ]
  );


  // =========================================================
  // EDIT ADDRESS
  // STEP 1 — RESTORE PROVINCE
  // ============================================================

  useEffect(
    () => {
      if (
        !open ||
        !isEdit ||
        manualMode ||
        editAddressHydrated
      ) {
        return;
      }


      const savedProvince =
        editAddressSeed.province;


      if (!savedProvince) {
        return;
      }


      if (
        province === savedProvince
      ) {
        return;
      }


      if (
        loading.provinces
      ) {
        return;
      }


      /*
        Wait until province records have loaded.

        We do not immediately switch to manual mode while
        provinceOptions is still empty because the request
        may still be initializing.
      */

      if (
        provinceOptions.length === 0
      ) {
        return;
      }


      const exactMatch =
        provinceOptions.find(
          (
            option
          ) =>
            String(
              option
            ).trim().toLowerCase() ===
            savedProvince.toLowerCase()
        );


      // Saved province exists in lookup.
      if (exactMatch) {
        selectProvince(
          exactMatch
        );

        return;
      }


      /*
        Saved address is not represented by the current
        lookup data. Preserve the farmer's existing address
        instead of deleting or changing it.
      */

      enableManualMode();
    },
    [
      open,
      isEdit,
      manualMode,
      editAddressHydrated,
      editAddressSeed.province,
      province,
      provinceOptions,
      loading.provinces,
      selectProvince,
      enableManualMode,
    ]
  );


  // =========================================================
  // EDIT ADDRESS
  // STEP 2 — RESTORE CITY / MUNICIPALITY
  // ============================================================

  useEffect(
    () => {
      if (
        !open ||
        !isEdit ||
        manualMode ||
        editAddressHydrated
      ) {
        return;
      }


      const savedProvince =
        editAddressSeed.province;


      const savedMunicipality =
        editAddressSeed.municipality;


      if (
        !savedProvince ||
        !savedMunicipality
      ) {
        return;
      }


      /*
        Province must be restored first because municipality
        options depend on the selected province.
      */

      if (
        province !==
        savedProvince
      ) {
        return;
      }


      if (
        municipality ===
        savedMunicipality
      ) {
        return;
      }


      if (
        loading.municipalities
      ) {
        return;
      }


      if (
        municipalityOptions.length === 0
      ) {
        return;
      }


      const exactMatch =
        municipalityOptions.find(
          (
            option
          ) =>
            String(
              option
            ).trim().toLowerCase() ===
            savedMunicipality.toLowerCase()
        );


      if (exactMatch) {
        selectMunicipality(
          exactMatch
        );

        return;
      }


      enableManualMode();
    },
    [
      open,
      isEdit,
      manualMode,
      editAddressHydrated,
      editAddressSeed.province,
      editAddressSeed.municipality,
      province,
      municipality,
      municipalityOptions,
      loading.municipalities,
      selectMunicipality,
      enableManualMode,
    ]
  );


  // =========================================================
  // EDIT ADDRESS
  // STEP 3 — RESTORE BARANGAY
  // ============================================================

  useEffect(
    () => {
      if (
        !open ||
        !isEdit ||
        manualMode ||
        editAddressHydrated
      ) {
        return;
      }


      const savedMunicipality =
        editAddressSeed.municipality;


      const savedBarangay =
        editAddressSeed.barangay;


      if (
        !savedMunicipality ||
        !savedBarangay
      ) {
        return;
      }


      if (
        municipality !==
        savedMunicipality
      ) {
        return;
      }


      if (
        barangay ===
        savedBarangay
      ) {
        return;
      }


      if (
        loading.barangays
      ) {
        return;
      }


      if (
        barangayOptions.length === 0
      ) {
        return;
      }


      const exactMatch =
        barangayOptions.find(
          (
            option
          ) =>
            String(
              option
            ).trim().toLowerCase() ===
            savedBarangay.toLowerCase()
        );


      if (exactMatch) {
        selectBarangay(
          exactMatch
        );

        return;
      }


      enableManualMode();
    },
    [
      open,
      isEdit,
      manualMode,
      editAddressHydrated,
      editAddressSeed.municipality,
      editAddressSeed.barangay,
      municipality,
      barangay,
      barangayOptions,
      loading.barangays,
      selectBarangay,
      enableManualMode,
    ]
  );


  // =========================================================
  // EDIT ADDRESS
  // STEP 4 — RESTORE SAVED POSTAL CODE
  // ============================================================

  useEffect(
    () => {
      if (
        !open ||
        !isEdit ||
        manualMode ||
        editAddressHydrated
      ) {
        return;
      }


      const savedBarangay =
        editAddressSeed.barangay;


      if (!savedBarangay) {
        return;
      }


      /*
        Wait until the complete address hierarchy has been
        restored before applying the saved postal code.

        Municipality selection may automatically fetch a
        postal code. The stored farm value is applied last
        so the edit modal preserves the farmer's saved data.
      */

      if (
        barangay !==
        savedBarangay
      ) {
        return;
      }


      if (
        editAddressSeed.postalCode
      ) {
        updatePostalCode(
          editAddressSeed.postalCode
        );
      }


      setEditAddressHydrated(
        true
      );
    },
    [
      open,
      isEdit,
      manualMode,
      editAddressHydrated,
      editAddressSeed.barangay,
      editAddressSeed.postalCode,
      barangay,
      updatePostalCode,
    ]
  );


  // =========================================================
  // AUTOMATIC FALLBACK
  // ============================================================

  useEffect(
    () => {
      if (
        !open ||
        manualMode
      ) {
        return;
      }


      const failed =
        Boolean(
          errors.provinces ||
          errors.municipalities ||
          errors.barangays
        );


      if (failed) {
        enableManualMode();
      }
    },
    [
      open,
      manualMode,
      errors.provinces,
      errors.municipalities,
      errors.barangays,
      enableManualMode,
    ]
  );


  // =========================================================
  // PRESERVE EDIT ADDRESS WHEN FALLBACK BECOMES MANUAL
  // ============================================================

  useEffect(
    () => {
      if (
        !open ||
        !isEdit ||
        !manualMode ||
        editAddressHydrated
      ) {
        return;
      }


      /*
        If the lookup fails while editing, never wipe the
        address already saved in the farm record.

        Populate the manual fields with those original values.
      */

      updateManualProvince(
        editAddressSeed.province
      );


      updateManualMunicipality(
        editAddressSeed.municipality
      );


      updateManualBarangay(
        editAddressSeed.barangay
      );


      updatePostalCode(
        editAddressSeed.postalCode
      );


      setEditAddressHydrated(
        true
      );
    },
    [
      open,
      isEdit,
      manualMode,
      editAddressHydrated,
      editAddressSeed.province,
      editAddressSeed.municipality,
      editAddressSeed.barangay,
      editAddressSeed.postalCode,
      updateManualProvince,
      updateManualMunicipality,
      updateManualBarangay,
      updatePostalCode,
    ]
  );


  // =========================================================
  // LOCK BACKGROUND
  // ============================================================

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


  if (!open) {
    return null;
  }


  // =========================================================
  // NORMAL FORM CHANGE
  // ============================================================

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } =
      event.target;


    setForm(
      (
        current
      ) => ({
        ...current,

        [name]:
          value,
      })
    );
  };


  // =========================================================
  // PROVINCE CHANGE
  // ============================================================

  const handleProvinceChange = (
    event
  ) => {
    selectProvince(
      event.target.value
    );
  };


  // =========================================================
  // MUNICIPALITY CHANGE
  // ============================================================

  const handleMunicipalityChange = (
    event
  ) => {
    selectMunicipality(
      event.target.value
    );
  };


  // =========================================================
  // BARANGAY CHANGE
  // ============================================================

  const handleBarangayChange = (
    event
  ) => {
    selectBarangay(
      event.target.value
    );
  };


  // =========================================================
  // CLEAR
  // ============================================================

  const handleClear = () => {
    if (isSaving) {
      return;
    }


    setForm({
      ...EMPTY_FORM,
    });


    setEditAddressSeed({
      ...EMPTY_EDIT_ADDRESS,
    });


    setEditAddressHydrated(
      false
    );


    resetAddress();


    if (
      typeof enableDropdownMode ===
      "function"
    ) {
      enableDropdownMode();
    }
  };


  // =========================================================
  // CLOSE
  // ============================================================

  const handleClose = () => {
    if (isSaving) {
      return;
    }


    onClose?.();
  };


  // =========================================================
  // SUBMIT
  // ============================================================

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();


      if (
        !onSubmit ||
        isSaving
      ) {
        return;
      }


      const commonPayload = {
        farm_name:
          String(
            form.farm_name ||
            ""
          ).trim(),

        street_address:
          String(
            form.street_address ||
            ""
          ).trim(),

        barangay:
          String(
            barangay ||
            ""
          ).trim(),

        municipality:
          String(
            municipality ||
            ""
          ).trim(),

        province:
          String(
            province ||
            ""
          ).trim(),

        postal_code:
          String(
            postalCode ||
            ""
          ).trim(),

        total_farm_area:
          form.total_farm_area,

        land_ownership_status:
          form.land_ownership_status,

        cropping_cycles_per_year:
          form.cropping_cycles_per_year,
      };


      if (isEdit) {
        await onSubmit(
          commonPayload
        );

        return;
      }


      await onSubmit({
        ...commonPayload,

        rice_variety_currently_planted:
          String(
            form.rice_variety_currently_planted ||
            ""
          ).trim(),
      });
    };


  // =========================================================
  // MODAL
  // ============================================================

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
    >

      <div
        role="dialog"
        aria-modal="true"
        className="
          flex
          max-h-[90vh]
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
            px-6
            py-5
          "
        >

          <div>

            <h3
              className="
                text-xl
                font-bold
                text-slate-900
              "
            >
              {
                isEdit
                  ? "Edit Farm Information"
                  : "Add New Farm"
              }
            </h3>


            <p
              className="
                mt-1
                text-sm
                text-slate-500
              "
            >
              {
                isEdit
                  ? "Update the registered information for this farm."
                  : "Register a farm or farm lot under your Farmer account."
              }
            </p>

          </div>


          <button
            type="button"
            onClick={
              handleClose
            }
            disabled={
              isSaving
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
              px-6
              py-5
            "
          >

            {/* ==============================================
                ERROR
            ============================================== */}

            {
              error &&
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
                    {error}
                  </span>
                </div>
              )
            }


            <div
              className="
                grid
                gap-x-4
                gap-y-5
                md:grid-cols-2
              "
            >

              {/* ============================================
                  FARM NAME
              ============================================ */}

              <div
                className="
                  md:col-span-2
                "
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
                  Farm / Farm Lot Name

                  <span
                    className="
                      ml-1
                      font-normal
                      text-slate-400
                    "
                  >
                    (Optional)
                  </span>
                </label>


                <input
                  type="text"
                  name="farm_name"
                  value={
                    form.farm_name
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. North Rice Farm"
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
              </div>


              {/* ============================================
                  ADDRESS LINE
              ============================================ */}

              <div
                className="
                  md:col-span-2
                "
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
                  Farm Address / Address Line

                  <span className="text-red-500">
                    {" "}*
                  </span>
                </label>


                <input
                  required
                  type="text"
                  name="street_address"
                  value={
                    form.street_address
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Street, sitio, purok, or farm location"
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
              </div>


              {/* ============================================
                  PROVINCE
              ============================================ */}

              <div>
                <label
                  className="
                    mb-1.5
                    block
                    text-sm
                    font-semibold
                    text-slate-700
                  "
                >
                  Province

                  <span className="text-red-500">
                    {" "}*
                  </span>
                </label>


                {
                  manualMode
                    ? (
                      <input
                        required
                        type="text"
                        value={
                          province
                        }
                        onChange={
                          (
                            event
                          ) =>
                            updateManualProvince(
                              event.target.value
                            )
                        }
                        placeholder="Enter province"
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
                    )
                    : (
                      <select
                        required
                        value={
                          province
                        }
                        onChange={
                          handleProvinceChange
                        }
                        disabled={
                          loading.provinces
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
                          disabled:bg-slate-50
                          disabled:text-slate-400
                        "
                      >
                        <option value="">
                          {
                            loading.provinces
                              ? "Loading provinces..."
                              : "Select province"
                          }
                        </option>


                        {
                          provinceOptions.map(
                            (
                              option
                            ) => (
                              <option
                                key={
                                  option
                                }
                                value={
                                  option
                                }
                              >
                                {option}
                              </option>
                            )
                          )
                        }
                      </select>
                    )
                }
              </div>


              {/* ============================================
                  CITY / MUNICIPALITY
              ============================================ */}

              <div>
                <label
                  className="
                    mb-1.5
                    block
                    text-sm
                    font-semibold
                    text-slate-700
                  "
                >
                  City / Municipality

                  <span className="text-red-500">
                    {" "}*
                  </span>
                </label>


                {
                  manualMode
                    ? (
                      <input
                        required
                        type="text"
                        value={
                          municipality
                        }
                        onChange={
                          (
                            event
                          ) =>
                            updateManualMunicipality(
                              event.target.value
                            )
                        }
                        placeholder="Enter city or municipality"
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
                    )
                    : (
                      <select
                        required
                        value={
                          municipality
                        }
                        onChange={
                          handleMunicipalityChange
                        }
                        disabled={
                          !province ||
                          loading.municipalities
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
                          disabled:bg-slate-50
                          disabled:text-slate-400
                        "
                      >
                        <option value="">
                          {
                            loading.municipalities
                              ? "Loading cities / municipalities..."
                              : (
                                province
                                  ? "Select city / municipality"
                                  : "Select province first"
                              )
                          }
                        </option>


                        {
                          municipalityOptions.map(
                            (
                              option
                            ) => (
                              <option
                                key={
                                  option
                                }
                                value={
                                  option
                                }
                              >
                                {option}
                              </option>
                            )
                          )
                        }
                      </select>
                    )
                }
              </div>


              {/* ============================================
                  BARANGAY
              ============================================ */}

              <div>
                <label
                  className="
                    mb-1.5
                    block
                    text-sm
                    font-semibold
                    text-slate-700
                  "
                >
                  Barangay

                  <span className="text-red-500">
                    {" "}*
                  </span>
                </label>


                {
                  manualMode
                    ? (
                      <input
                        required
                        type="text"
                        value={
                          barangay
                        }
                        onChange={
                          (
                            event
                          ) =>
                            updateManualBarangay(
                              event.target.value
                            )
                        }
                        placeholder="Enter barangay"
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
                    )
                    : (
                      <select
                        required
                        value={
                          barangay
                        }
                        onChange={
                          handleBarangayChange
                        }
                        disabled={
                          !municipality ||
                          loading.barangays
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
                          disabled:bg-slate-50
                          disabled:text-slate-400
                        "
                      >
                        <option value="">
                          {
                            loading.barangays
                              ? "Loading barangays..."
                              : (
                                municipality
                                  ? "Select barangay"
                                  : "Select municipality first"
                              )
                          }
                        </option>


                        {
                          barangayOptions.map(
                            (
                              option
                            ) => (
                              <option
                                key={
                                  option
                                }
                                value={
                                  option
                                }
                              >
                                {option}
                              </option>
                            )
                          )
                        }
                      </select>
                    )
                }
              </div>


              {/* ============================================
                  POSTAL CODE
              ============================================ */}

              <div>
                <label
                  className="
                    mb-1.5
                    block
                    text-sm
                    font-semibold
                    text-slate-700
                  "
                >
                  Postal Code

                  <span
                    className="
                      ml-1
                      text-xs
                      font-normal
                      text-slate-400
                    "
                  >
                    (Auto-filled / Editable)
                  </span>
                </label>


                <div
                  className="
                    relative
                  "
                >
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={
                      postalCode
                    }
                    onChange={
                      (
                        event
                      ) =>
                        updatePostalCode(
                          event.target.value
                        )
                    }
                    placeholder="Enter postal code"
                    className="
                      w-full
                      rounded-xl
                      border
                      border-slate-300
                      px-3.5
                      py-2.5
                      pr-10
                      text-sm
                      outline-none
                      placeholder:text-slate-400
                      focus:border-green-600
                      focus:ring-1
                      focus:ring-green-600
                    "
                  />


                  {
                    loading.postalCode &&
                    (
                      <Loader2
                        size={15}
                        className="
                          absolute
                          right-3
                          top-1/2
                          -translate-y-1/2
                          animate-spin
                          text-slate-400
                        "
                      />
                    )
                  }
                </div>
              </div>


              {/* ============================================
                  FARM AREA
              ============================================ */}

              <div>
                <label
                  className="
                    mb-1.5
                    block
                    text-sm
                    font-semibold
                    text-slate-700
                  "
                >
                  Total Farm Area (ha)

                  <span className="text-red-500">
                    {" "}*
                  </span>
                </label>


                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  name="total_farm_area"
                  value={
                    form.total_farm_area
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="0.00"
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
              </div>


              {/* ============================================
                  LAND OWNERSHIP
              ============================================ */}

              <div>
                <label
                  className="
                    mb-1.5
                    block
                    text-sm
                    font-semibold
                    text-slate-700
                  "
                >
                  Land Ownership

                  <span className="text-red-500">
                    {" "}*
                  </span>
                </label>


                <select
                  required
                  name="land_ownership_status"
                  value={
                    form.land_ownership_status
                  }
                  onChange={
                    handleChange
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
                  {
                    LAND_OWNERSHIP_OPTIONS.map(
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
                          {option.label}
                        </option>
                      )
                    )
                  }
                </select>
              </div>


              {/* ============================================
                  RICE VARIETY
                  ADD FARM ONLY
              ============================================ */}

              {
                !isEdit &&
                (
                  <div>
                    <label
                      className="
                        mb-1.5
                        block
                        text-sm
                        font-semibold
                        text-slate-700
                      "
                    >
                      Rice Variety Currently Planted

                      <span className="text-red-500">
                        {" "}*
                      </span>
                    </label>


                    <input
                      required
                      type="text"
                      name="rice_variety_currently_planted"
                      value={
                        form.rice_variety_currently_planted
                      }
                      onChange={
                        handleChange
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
                  </div>
                )
              }


              {/* ============================================
                  CROPPING CYCLES
              ============================================ */}

              <div>
                <label
                  className="
                    mb-1.5
                    block
                    text-sm
                    font-semibold
                    text-slate-700
                  "
                >
                  Number of Cropping Cycles per Year

                  <span className="text-red-500">
                    {" "}*
                  </span>
                </label>


                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  name="cropping_cycles_per_year"
                  value={
                    form.cropping_cycles_per_year
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. 2"
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
              </div>

            </div>


            {/* ==============================================
                MANUAL ADDRESS FALLBACK NOTICE
            ============================================== */}

            {
              manualMode &&
              (
                <p
                  className="
                    mt-3
                    text-xs
                    text-slate-400
                  "
                >
                  Address lookup is unavailable.
                  You can enter the address manually.
                </p>
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
              gap-2
              border-t
              border-slate-200
              bg-white
              px-6
              py-4
            "
          >

            {
              !isEdit &&
              (
                <button
                  type="button"
                  onClick={
                    handleClear
                  }
                  disabled={
                    isSaving
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
                    text-slate-600
                    transition
                    hover:bg-slate-50
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  Clear
                </button>
              )
            }


            <button
              type="submit"
              disabled={
                isSaving
              }
              className="
                inline-flex
                min-w-28
                items-center
                justify-center
                gap-2
                rounded-lg
                bg-green-700
                px-5
                py-2.5
                text-sm
                font-semibold
                text-white
                transition
                hover:bg-green-800
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {
                isSaving &&
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
                isEdit
                  ? "Save Changes"
                  : "Add Farm"
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