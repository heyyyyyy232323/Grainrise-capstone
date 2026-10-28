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

import useFarmAddress, {
  PHILIPPINE_LOCATIONS,
  DEFAULT_PROVINCES,
} from "../hooks/Farmer/useFarmAddress";


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
// ADDRESS HELPERS
// ============================================================

const extractBarangay = (streetAddress) => {
  const street = String(streetAddress || "").trim();
  if (!street) return "";
  for (const prefix of ["Brgy. ", "brgy. ", "Barangay ", "barangay ", "Brgy ", "brgy "]) {
    if (street.includes(prefix)) {
      return street.split(prefix)[1].trim();
    }
  }
  return "";
};

const cleanStreetAddress = (rawStreet = "", rawBarangay = "") => {
  let s = String(rawStreet || "").trim();
  if (rawBarangay && s) {
    const escapedBrgy = rawBarangay.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const brgyPattern = new RegExp(`,?\\s*(?:brgy\\.?|barangay)\\s*${escapedBrgy}\\s*$`, "i");
    const cleaned = s.replace(brgyPattern, "").trim();
    if (cleaned) return cleaned;
  }
  return s;
};

const normalizeInitialValues = (values = {}) => {
  const brgy = String(values.barangay || "").trim() || extractBarangay(values.street_address);
  return {
    farm_name: values.farm_name || "",
    street_address: cleanStreetAddress(values.street_address || "", brgy),
    total_farm_area: values.total_farm_area ?? "",
    land_ownership_status: values.land_ownership_status || "owned",
    rice_variety_currently_planted:
      values.rice_variety_currently_planted ||
      values.registered_rice_variety ||
      "",
    cropping_cycles_per_year: values.cropping_cycles_per_year ?? "",
  };
};

const normalizeEditAddress = (values = {}) => {
  const brgy = String(values.barangay || "").trim() || extractBarangay(values.street_address);
  return {
    province: String(values.province || "").trim(),
    municipality: String(values.municipality || "").trim(),
    barangay: brgy,
    postalCode: String(values.postal_code || values.postalCode || "").trim(),
  };
};


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
  const [form, setForm] = useState(EMPTY_FORM);
  const [editAddressSeed, setEditAddressSeed] = useState(EMPTY_EDIT_ADDRESS);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const isEdit = mode === "edit";

  // =========================================================
  // ADDRESS HOOK
  // =========================================================

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

    setInitialAddress,
    resetAddress,
  } = useFarmAddress();

  // Helper: Match saved address values case-insensitively with standard options
  const resolveMatchedAddress = (addr) => {
    let matchedProvince = addr.province;
    if (addr.province) {
      const found = DEFAULT_PROVINCES.find(
        (p) => p.toLowerCase() === addr.province.toLowerCase()
      );
      if (found) matchedProvince = found;
    }

    let matchedMunicipality = addr.municipality;
    if (
      matchedProvince &&
      addr.municipality &&
      PHILIPPINE_LOCATIONS[matchedProvince]?.municipalities
    ) {
      const munis = Object.keys(PHILIPPINE_LOCATIONS[matchedProvince].municipalities);
      const found = munis.find(
        (m) => m.toLowerCase() === addr.municipality.toLowerCase()
      );
      if (found) matchedMunicipality = found;
    }

    let matchedBarangay = addr.barangay;
    if (
      matchedProvince &&
      matchedMunicipality &&
      PHILIPPINE_LOCATIONS[matchedProvince]?.municipalities?.[matchedMunicipality]
    ) {
      const brgys = PHILIPPINE_LOCATIONS[matchedProvince].municipalities[matchedMunicipality];
      const found = brgys.find(
        (b) => b.toLowerCase() === addr.barangay.toLowerCase()
      );
      if (found) matchedBarangay = found;
    }

    const resolvedPostalCode =
      addr.postalCode ||
      (matchedProvince && PHILIPPINE_LOCATIONS[matchedProvince]?.postalCode) ||
      "";

    return {
      province: matchedProvince,
      municipality: matchedMunicipality,
      barangay: matchedBarangay,
      postalCode: resolvedPostalCode,
    };
  };

  // =========================================================
  // INITIALIZE MODAL (Auto-prefill in Edit Mode)
  // =========================================================

  useEffect(() => {
    setShowClearConfirm(false);

    if (!open) {
      return;
    }

    if (isEdit && initialValues) {
      setForm(normalizeInitialValues(initialValues));

      const addr = normalizeEditAddress(initialValues);
      setEditAddressSeed(addr);

      const matched = resolveMatchedAddress(addr);
      setInitialAddress(matched);

      if (typeof enableDropdownMode === "function") {
        enableDropdownMode();
      }
    } else {
      setForm({ ...EMPTY_FORM });
      setEditAddressSeed({ ...EMPTY_EDIT_ADDRESS });
      resetAddress();
      if (typeof enableDropdownMode === "function") {
        enableDropdownMode();
      }
    }
  }, [open, isEdit, initialValues, setInitialAddress, resetAddress, enableDropdownMode]);

  // =========================================================
  // LOCK BACKGROUND
  // =========================================================

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

  if (!open) {
    return null;
  }

  // =========================================================
  // FORM HANDLERS
  // =========================================================

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleProvinceChange = (event) => {
    selectProvince(event.target.value);
  };

  const handleMunicipalityChange = (event) => {
    selectMunicipality(event.target.value);
  };

  const handleBarangayChange = (event) => {
    selectBarangay(event.target.value);
  };

  // =========================================================
  // INPUT DETECTION
  // =========================================================

  const hasFormInput = isEdit
    ? Boolean(
        form.farm_name !== (initialValues?.farm_name || "") ||
        form.street_address !== (initialValues?.street_address || "") ||
        String(form.total_farm_area ?? "") !== String(initialValues?.total_farm_area ?? "") ||
        form.land_ownership_status !== (initialValues?.land_ownership_status || "owned") ||
        form.rice_variety_currently_planted !== (initialValues?.rice_variety_currently_planted || initialValues?.registered_rice_variety || "") ||
        String(form.cropping_cycles_per_year ?? "") !== String(initialValues?.cropping_cycles_per_year ?? "") ||
        province !== (editAddressSeed.province || "") ||
        municipality !== (editAddressSeed.municipality || "") ||
        barangay !== (editAddressSeed.barangay || "") ||
        postalCode !== (editAddressSeed.postalCode || "")
      )
    : Boolean(
        form.farm_name ||
        form.street_address ||
        form.total_farm_area ||
        form.rice_variety_currently_planted ||
        form.cropping_cycles_per_year ||
        province ||
        municipality ||
        barangay ||
        postalCode
      );

  // =========================================================
  // CLEAR (Matches Miller Procurement - Edit Supplier)
  // =========================================================

  const handleClearClick = () => {
    if (isSaving) return;
    setShowClearConfirm(true);
  };

  const handleConfirmClear = () => {
    if (isEdit && initialValues) {
      setForm(normalizeInitialValues(initialValues));
      const addr = normalizeEditAddress(initialValues);
      setEditAddressSeed(addr);
      const matched = resolveMatchedAddress(addr);
      setInitialAddress(matched);
    } else {
      setForm({ ...EMPTY_FORM });
      setEditAddressSeed({ ...EMPTY_EDIT_ADDRESS });
      resetAddress();
    }

    if (typeof enableDropdownMode === "function") {
      enableDropdownMode();
    }
    setShowClearConfirm(false);
  };

  // =========================================================
  // CLOSE (Only exit control via top-right X)
  // =========================================================

  const handleClose = () => {
    if (isSaving) return;
    setShowClearConfirm(false);
    onClose?.();
  };

  // =========================================================
  // SUBMIT
  // =========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!onSubmit || isSaving) return;

    const commonPayload = {
      farm_name: String(form.farm_name || "").trim(),
      street_address: String(form.street_address || "").trim(),
      barangay: String(barangay || "").trim(),
      municipality: String(municipality || "").trim(),
      province: String(province || "").trim(),
      postal_code: String(postalCode || "").trim(),
      total_farm_area: form.total_farm_area,
      land_ownership_status: form.land_ownership_status,
      cropping_cycles_per_year: form.cropping_cycles_per_year,
    };

    if (isEdit) {
      await onSubmit(commonPayload);
      return;
    }

    await onSubmit({
      ...commonPayload,
      rice_variety_currently_planted: String(form.rice_variety_currently_planted || "").trim(),
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
        backdrop-blur-xs
      "
    >
      {showClearConfirm ? (
        /* Clear Form / Restore Confirmation Modal (temporarily replaces modal card) */
        <div
          className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <AlertCircle size={20} />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">
                {isEdit ? "Restore Original Values" : "Clear Form"}
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                {isEdit
                  ? "Are you sure you want to discard your changes and restore original values?"
                  : "Are you sure you want to clear all entered fields?"}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowClearConfirm(false)}
              className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition cursor-pointer"
            >
              No
            </button>
            <button
              type="button"
              onClick={handleConfirmClear}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0B5D1E] hover:bg-[#084b18] rounded-lg transition cursor-pointer"
            >
              Yes
            </button>
          </div>
        </div>
      ) : (
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
          onClick={(e) => e.stopPropagation()}
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

            {/* Top-right X button: ONLY modal exit control */}
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="
                p-1.5
                rounded-lg
                text-slate-400
                hover:text-slate-600
                hover:bg-slate-100
                transition
                cursor-pointer
                disabled:opacity-50
              "
              aria-label="Close modal"
              title="Close modal"
            >
              <X size={20} />
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

            <button
              type="button"
              onClick={handleClearClick}
              disabled={isSaving || !hasFormInput}
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
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              Clear
            </button>

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
      )}

    </div>
  );


  return createPortal(
    modalContent,
    document.body
  );
}