import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  Gavel,
  ImageOff,
  Loader2,
  X,
} from "lucide-react";


// ============================================================
// DEFAULT FORM
// ============================================================

const EMPTY_FORM = {
  farm_product_id: "",
  farm_id: "",

  quantity_open_for_bidding_kg: "",
  minimum_acceptable_price_per_kg: "",

  expected_availability_date: "",
  bidding_deadline: "",

  fulfillment_method: "",
  preferred_fulfillment_date: "",

  additional_terms: "",
  notes_to_millers: "",
};


// ============================================================
// HELPERS
// ============================================================

const formatQuantity = (
  value
) => {
  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return "0 kg";
  }

  return `${new Intl.NumberFormat(
    "en-PH",
    {
      maximumFractionDigits: 2,
    }
  ).format(number)} kg`;
};


const formatPeso = (
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
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-PH",
    {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(number);
};


const humanize = (
  value
) => {
  if (!value) {
    return "—";
  }

  return String(value)
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
};


// ============================================================
// FORM FIELD
// ============================================================

const FormField = ({
  label,
  required = false,
  hint = "",
  fullWidth = false,
  children,
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

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      {children}

      {hint && (
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
      )}
    </div>
  );
};


// ============================================================
// READ ONLY
// ============================================================

const ReadOnlyField = ({
  label,
  value,
}) => {
  return (
    <div>
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
          text-sm
          font-semibold
          text-slate-800
        "
      >
        {value || "—"}
      </p>
    </div>
  );
};


// ============================================================
// COMPONENT
// ============================================================

export default function FarmerContractOpenBiddingModal({
  open,

  products = [],
  farmOptions = [],

  isLoadingProducts = false,
  isLoadingFarmOptions = false,
  isSaving = false,

  error = "",

  onClose,
  onSubmit,
}) {
  const [
    form,
    setForm,
  ] = useState({
    ...EMPTY_FORM,
  });

  const [
    localError,
    setLocalError,
  ] = useState("");


  // ==========================================================
  // RESET
  // ==========================================================

  useEffect(
    () => {
      if (!open) {
        return;
      }

      setForm({
        ...EMPTY_FORM,
      });

      setLocalError("");
    },
    [
      open,
    ]
  );


  // ==========================================================
  // BODY SCROLL LOCK
  // ==========================================================

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


  // ==========================================================
  // PRODUCTS ELIGIBLE FOR BIDDING
  // ==========================================================

  const availableProducts =
    useMemo(
      () =>
        products.filter(
          (product) => {
            const availableQuantity =
              Number(
                product.available_quantity_kg
              );

            const isActive =
              !product.status ||
              product.status ===
                "active";

            const hasFarm =
              Boolean(
                product.source_farm_id
              );

            const isOwnFarm =
              !product.acquisition_source_type ||
              product.acquisition_source_type ===
                "own_farm";

            return (
              isActive &&
              hasFarm &&
              isOwnFarm &&
              Number.isFinite(
                availableQuantity
              ) &&
              availableQuantity > 0
            );
          }
        ),
      [
        products,
      ]
    );


  // ==========================================================
  // SELECTED PRODUCT
  // ==========================================================

  const selectedProduct =
    useMemo(
      () =>
        availableProducts.find(
          (product) =>
            String(
              product.farm_product_id
            ) ===
            String(
              form.farm_product_id
            )
        ) || null,
      [
        availableProducts,
        form.farm_product_id,
      ]
    );


  // ==========================================================
  // SELECTED FARM
  // ==========================================================

  const selectedFarm =
    useMemo(
      () =>
        farmOptions.find(
          (farm) =>
            String(
              farm.farm_id
            ) ===
            String(
              form.farm_id
            )
        ) || null,
      [
        farmOptions,
        form.farm_id,
      ]
    );


  // ==========================================================
  // UPDATE FIELD
  // ==========================================================

  const updateField = (
    field,
    value
  ) => {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      })
    );

    if (localError) {
      setLocalError("");
    }
  };


  // ==========================================================
  // PRODUCT SELECTION
  // ==========================================================

  const handleProductChange = (
    value
  ) => {
    const product =
      availableProducts.find(
        (item) =>
          String(
            item.farm_product_id
          ) === String(value)
      );


    if (!product) {
      setForm({
        ...EMPTY_FORM,
      });

      return;
    }


    setForm(
      (current) => ({
        ...current,

        farm_product_id:
          String(
            product.farm_product_id
          ),

        farm_id:
          String(
            product.source_farm_id ||
              ""
          ),

        expected_availability_date:
          product.harvest_acquisition_date ||
          current.expected_availability_date,
      })
    );

    setLocalError("");
  };


  // ==========================================================
  // VALIDATE
  // ==========================================================

  const validateForm = () => {
    if (!selectedProduct) {
      return "Please select an Inventory product.";
    }


    if (!form.farm_id) {
      return "The selected product must have a source farm.";
    }


    const quantity =
      Number(
        form.quantity_open_for_bidding_kg
      );

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      return "Quantity Open for Bidding must be greater than zero.";
    }


    const availableQuantity =
      Number(
        selectedProduct.available_quantity_kg
      );

    if (
      quantity >
      availableQuantity
    ) {
      return "Quantity Open for Bidding cannot exceed the product's available quantity.";
    }


    if (
      form.minimum_acceptable_price_per_kg
    ) {
      const minimumPrice =
        Number(
          form.minimum_acceptable_price_per_kg
        );

      if (
        !Number.isFinite(
          minimumPrice
        ) ||
        minimumPrice <= 0
      ) {
        return "Minimum Acceptable Price must be greater than zero.";
      }
    }


    if (
      !form.expected_availability_date
    ) {
      return "Expected Harvest / Availability Date is required.";
    }


    if (
      !form.bidding_deadline
    ) {
      return "Bidding Deadline is required.";
    }


    const biddingDeadline =
      new Date(
        form.bidding_deadline
      );

    if (
      Number.isNaN(
        biddingDeadline.getTime()
      )
    ) {
      return "Please enter a valid Bidding Deadline.";
    }


    if (
      biddingDeadline <=
      new Date()
    ) {
      return "Bidding Deadline must be in the future.";
    }


    if (
      !form.fulfillment_method
    ) {
      return "Fulfillment Method is required.";
    }


    if (
      !form.preferred_fulfillment_date
    ) {
      return "Preferred Fulfillment Date is required.";
    }


    const availabilityDate =
      new Date(
        `${form.expected_availability_date}T00:00:00`
      );

    const fulfillmentDate =
      new Date(
        `${form.preferred_fulfillment_date}T23:59:59`
      );


    if (
      availabilityDate >
      fulfillmentDate
    ) {
      return "Expected Availability Date cannot be later than the Preferred Fulfillment Date.";
    }


    if (
      biddingDeadline >
      fulfillmentDate
    ) {
      return "Bidding Deadline cannot be later than the Preferred Fulfillment Date.";
    }


    return "";
  };


  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();


    const validationError =
      validateForm();


    if (validationError) {
      setLocalError(
        validationError
      );

      return;
    }


    setLocalError("");


    onSubmit?.({
      farm_id:
        Number(
          form.farm_id
        ),

      farm_product_id:
        Number(
          form.farm_product_id
        ),

      quantity_open_for_bidding_kg:
        Number(
          form.quantity_open_for_bidding_kg
        ),

      minimum_acceptable_price_per_kg:
        form.minimum_acceptable_price_per_kg
          ? Number(
              form.minimum_acceptable_price_per_kg
            )
          : null,

      expected_availability_date:
        form.expected_availability_date,

      bidding_deadline:
        form.bidding_deadline,

      fulfillment_method:
        form.fulfillment_method,

      preferred_fulfillment_date:
        form.preferred_fulfillment_date,

      additional_terms:
        form.additional_terms.trim(),

      notes_to_millers:
        form.notes_to_millers.trim(),
    });
  };


  // ==========================================================
  // CLOSE
  // ==========================================================

  const handleClose = () => {
    if (isSaving) {
      return;
    }

    onClose?.();
  };


  if (!open) {
    return null;
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return createPortal(
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
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="farmer-open-bidding-title"
        onSubmit={handleSubmit}
        className="
          flex
          max-h-[92vh]
          w-full
          max-w-4xl
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
              <Gavel size={20} />
            </div>


            <div>
              <h3
                id="farmer-open-bidding-title"
                className="
                  text-xl
                  font-bold
                  text-slate-900
                "
              >
                Create Open Bidding
              </h3>

              <p
                className="
                  mt-1
                  text-sm
                  leading-5
                  text-slate-500
                "
              >
                Offer an available Inventory product for Miller bidding.
              </p>
            </div>
          </div>


          <button
            type="button"
            disabled={isSaving}
            onClick={handleClose}
            aria-label="Close create open bidding"
            className="
              rounded-lg
              p-2
              text-slate-500
              transition
              hover:bg-slate-100
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            <X size={20} />
          </button>

        </div>


        {/* ==================================================
            BODY
        ================================================== */}

        <div
          className="
            min-h-0
            flex-1
            space-y-6
            overflow-y-auto
            bg-slate-50/30
            px-5
            py-5
            sm:px-6
          "
        >

          {/* ERRORS */}

          {(localError ||
            error) && (
            <div
              className="
                rounded-lg
                border
                border-red-200
                bg-red-50
                px-4
                py-3
                text-sm
                text-red-700
              "
            >
              {localError ||
                error}
            </div>
          )}


          {/* =================================================
              PRODUCT
          ================================================= */}

          <section
            className="
              overflow-hidden
              rounded-xl
              border
              border-slate-200
              bg-white
            "
          >
            <div
              className="
                border-b
                border-slate-100
                bg-slate-50
                px-4
                py-3
              "
            >
              <h4
                className="
                  text-sm
                  font-bold
                  text-slate-800
                "
              >
                Product Information
              </h4>

              <p
                className="
                  mt-0.5
                  text-xs
                  text-slate-500
                "
              >
                Select an available product already recorded in your Farm Inventory.
              </p>
            </div>


            <div
              className="
                grid
                gap-4
                p-4
                md:grid-cols-2
              "
            >

              <FormField
                label="Inventory Product"
                required
                fullWidth
              >
                <select
                  value={
                    form.farm_product_id
                  }
                  disabled={
                    isSaving ||
                    isLoadingProducts
                  }
                  onChange={(
                    event
                  ) =>
                    handleProductChange(
                      event.target.value
                    )
                  }
                  className="
                    w-full
                    rounded-lg
                    border
                    border-slate-300
                    bg-white
                    px-3
                    py-2.5
                    text-sm
                    text-slate-800
                    outline-none
                    focus:border-green-600
                    focus:ring-1
                    focus:ring-green-600
                    disabled:cursor-not-allowed
                    disabled:bg-slate-100
                  "
                >
                  <option value="">
                    {isLoadingProducts
                      ? "Loading Inventory products..."
                      : "Select Inventory Product"}
                  </option>

                  {availableProducts.map(
                    (
                      product
                    ) => (
                      <option
                        key={
                          product.farm_product_id
                        }
                        value={
                          product.farm_product_id
                        }
                      >
                        {product.product_code} —{" "}
                        {product.rice_variety} —{" "}
                        {formatQuantity(
                          product.available_quantity_kg
                        )}{" "}
                        available
                      </option>
                    )
                  )}
                </select>

                {!isLoadingProducts &&
                  availableProducts.length ===
                    0 && (
                    <p
                      className="
                        mt-2
                        text-xs
                        text-amber-600
                      "
                    >
                      No eligible own-farm Inventory product with available stock was found.
                    </p>
                  )}
              </FormField>


              {selectedProduct && (
                <div
                  className="
                    md:col-span-2
                  "
                >
                  <div
                    className="
                      flex
                      flex-col
                      gap-4
                      rounded-xl
                      border
                      border-green-100
                      bg-green-50/40
                      p-4
                      sm:flex-row
                    "
                  >

                    {/* IMAGE */}

                    {selectedProduct.product_image ? (
                      <img
                        src={
                          selectedProduct.product_image
                        }
                        alt={
                          selectedProduct.rice_variety ||
                          "Rice product"
                        }
                        className="
                          h-32
                          w-full
                          shrink-0
                          rounded-xl
                          border
                          border-slate-200
                          object-cover
                          sm:w-36
                        "
                      />
                    ) : (
                      <div
                        className="
                          flex
                          h-32
                          w-full
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          border
                          border-slate-200
                          bg-white
                          text-slate-400
                          sm:w-36
                        "
                      >
                        <ImageOff
                          size={24}
                        />
                      </div>
                    )}


                    {/* DETAILS */}

                    <div
                      className="
                        grid
                        flex-1
                        gap-4
                        sm:grid-cols-2
                      "
                    >
                      <ReadOnlyField
                        label="Product Type"
                        value={
                          humanize(
                            selectedProduct.product_type
                          )
                        }
                      />

                      <ReadOnlyField
                        label="Rice Variety"
                        value={
                          selectedProduct.rice_variety
                        }
                      />

                      <ReadOnlyField
                        label="Product Grade"
                        value={
                          selectedProduct.product_grade ||
                          "—"
                        }
                      />

                      <ReadOnlyField
                        label="Available Quantity"
                        value={
                          formatQuantity(
                            selectedProduct.available_quantity_kg
                          )
                        }
                      />

                      <ReadOnlyField
                        label="Current Selling Price"
                        value={
                          selectedProduct.selling_price_per_kg
                            ? `${formatPeso(
                                selectedProduct.selling_price_per_kg
                              )} / kg`
                            : "—"
                        }
                      />

                      <ReadOnlyField
                        label="Harvest / Acquisition Date"
                        value={
                          selectedProduct.harvest_acquisition_date ||
                          "—"
                        }
                      />

                    </div>

                  </div>


                  {selectedProduct.description && (
                    <div
                      className="
                        mt-3
                        rounded-lg
                        border
                        border-slate-200
                        bg-white
                        p-3
                      "
                    >
                      <p
                        className="
                          text-xs
                          font-medium
                          text-slate-400
                        "
                      >
                        Product Description
                      </p>

                      <p
                        className="
                          mt-1
                          text-sm
                          leading-6
                          text-slate-700
                        "
                      >
                        {selectedProduct.description}
                      </p>
                    </div>
                  )}

                </div>
              )}


              <FormField
                label="Quantity Open for Bidding (kg)"
                required
                hint={
                  selectedProduct
                    ? `Maximum available: ${formatQuantity(
                        selectedProduct.available_quantity_kg
                      )}`
                    : ""
                }
              >
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  disabled={
                    isSaving ||
                    !selectedProduct
                  }
                  value={
                    form.quantity_open_for_bidding_kg
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "quantity_open_for_bidding_kg",
                      event.target.value
                    )
                  }
                  placeholder="0.00"
                  className="
                    w-full
                    rounded-lg
                    border
                    border-slate-300
                    px-3
                    py-2.5
                    text-sm
                    outline-none
                    focus:border-green-600
                    focus:ring-1
                    focus:ring-green-600
                    disabled:bg-slate-100
                  "
                />
              </FormField>


              <FormField
                label="Expected Harvest / Availability Date"
                required
              >
                <input
                  type="date"
                  disabled={
                    isSaving ||
                    !selectedProduct
                  }
                  value={
                    form.expected_availability_date
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "expected_availability_date",
                      event.target.value
                    )
                  }
                  className="
                    w-full
                    rounded-lg
                    border
                    border-slate-300
                    px-3
                    py-2.5
                    text-sm
                    outline-none
                    focus:border-green-600
                    focus:ring-1
                    focus:ring-green-600
                    disabled:bg-slate-100
                  "
                />
              </FormField>

            </div>
          </section>


          {/* =================================================
              FARM
          ================================================= */}

          <section
            className="
              overflow-hidden
              rounded-xl
              border
              border-slate-200
              bg-white
            "
          >
            <div
              className="
                border-b
                border-slate-100
                bg-slate-50
                px-4
                py-3
              "
            >
              <h4
                className="
                  text-sm
                  font-bold
                  text-slate-800
                "
              >
                Farm Information
              </h4>

              <p
                className="
                  mt-0.5
                  text-xs
                  text-slate-500
                "
              >
                The source farm is taken automatically from the selected Inventory product.
              </p>
            </div>


            <div
              className="
                grid
                gap-4
                p-4
                md:grid-cols-2
              "
            >
              <ReadOnlyField
                label="Farm / Farm Lot"
                value={
                  isLoadingFarmOptions
                    ? "Loading..."
                    : selectedFarm?.farm_name ||
                      "Select an Inventory product"
                }
              />

              <ReadOnlyField
                label="Farm Location"
                value={
                  isLoadingFarmOptions
                    ? "Loading..."
                    : selectedFarm?.farm_location ||
                      "—"
                }
              />
            </div>
          </section>


          {/* =================================================
              BIDDING DETAILS
          ================================================= */}

          <section
            className="
              overflow-hidden
              rounded-xl
              border
              border-slate-200
              bg-white
            "
          >
            <div
              className="
                border-b
                border-slate-100
                bg-slate-50
                px-4
                py-3
              "
            >
              <h4
                className="
                  text-sm
                  font-bold
                  text-slate-800
                "
              >
                Bidding Details
              </h4>
            </div>


            <div
              className="
                grid
                gap-4
                p-4
                md:grid-cols-2
              "
            >

              <FormField
                label="Bidding Deadline"
                required
                hint="Millers can submit offers until this date and time."
              >
                <input
                  type="datetime-local"
                  disabled={isSaving}
                  value={
                    form.bidding_deadline
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "bidding_deadline",
                      event.target.value
                    )
                  }
                  className="
                    w-full
                    rounded-lg
                    border
                    border-slate-300
                    px-3
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
                label="Minimum Acceptable Price per kg"
                hint="Optional. Leave blank if you do not want to set a minimum."
              >
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  disabled={isSaving}
                  value={
                    form.minimum_acceptable_price_per_kg
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "minimum_acceptable_price_per_kg",
                      event.target.value
                    )
                  }
                  placeholder="₱ 0.00"
                  className="
                    w-full
                    rounded-lg
                    border
                    border-slate-300
                    px-3
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
                label="Fulfillment Method"
                required
              >
                <select
                  disabled={isSaving}
                  value={
                    form.fulfillment_method
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "fulfillment_method",
                      event.target.value
                    )
                  }
                  className="
                    w-full
                    rounded-lg
                    border
                    border-slate-300
                    bg-white
                    px-3
                    py-2.5
                    text-sm
                    outline-none
                    focus:border-green-600
                    focus:ring-1
                    focus:ring-green-600
                  "
                >
                  <option value="">
                    Select Fulfillment Method
                  </option>

                  <option value="buyer_pickup">
                    Buyer Pickup
                  </option>

                  <option value="farmer_delivery">
                    Farmer Delivery
                  </option>
                </select>
              </FormField>


              <FormField
                label="Preferred Fulfillment Date"
                required
              >
                <input
                  type="date"
                  disabled={isSaving}
                  value={
                    form.preferred_fulfillment_date
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "preferred_fulfillment_date",
                      event.target.value
                    )
                  }
                  className="
                    w-full
                    rounded-lg
                    border
                    border-slate-300
                    px-3
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
                label="Additional Terms"
                fullWidth
              >
                <textarea
                  rows={4}
                  maxLength={1500}
                  disabled={isSaving}
                  value={
                    form.additional_terms
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "additional_terms",
                      event.target.value
                    )
                  }
                  placeholder="Optional terms or conditions for this bidding."
                  className="
                    w-full
                    resize-none
                    rounded-lg
                    border
                    border-slate-300
                    px-3
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
                label="Notes to Millers / Buyers"
                fullWidth
              >
                <textarea
                  rows={4}
                  maxLength={1500}
                  disabled={isSaving}
                  value={
                    form.notes_to_millers
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "notes_to_millers",
                      event.target.value
                    )
                  }
                  placeholder="Optional information you want bidders to know."
                  className="
                    w-full
                    resize-none
                    rounded-lg
                    border
                    border-slate-300
                    px-3
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
          </section>

        </div>


        {/* ==================================================
            FOOTER
        ================================================== */}

        <div
          className="
            flex
            shrink-0
            items-center
            justify-end
            gap-3
            border-t
            border-slate-200
            bg-white
            px-5
            py-4
            sm:px-6
          "
        >
          <button
            type="button"
            disabled={isSaving}
            onClick={handleClose}
            className="
              rounded-lg
              border
              border-slate-300
              bg-white
              px-5
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
            Cancel
          </button>


          <button
            type="submit"
            disabled={
              isSaving ||
              isLoadingProducts ||
              isLoadingFarmOptions ||
              !selectedProduct
            }
            className="
              inline-flex
              min-w-[165px]
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
              disabled:opacity-50
            "
          >
            {isSaving ? (
              <>
                <Loader2
                  size={16}
                  className="animate-spin"
                />

                Opening...
              </>
            ) : (
              "Open for Bidding"
            )}
          </button>
        </div>

      </form>
    </div>,
    document.body
  );
}