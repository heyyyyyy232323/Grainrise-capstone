import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  FileSignature,
  ImageOff,
  Loader2,
  Send,
  X,
} from "lucide-react";

import SignaturePad from "../Minor-Components/SignaturePad";


// ============================================================
// DEFAULT FORM
// ============================================================

const EMPTY_FORM = {
  farm_product_id: "",
  quantity_to_commit_kg: "",
  expected_availability_date: "",
  proposed_selling_price_per_kg: "",
  additional_notes_to_miller: "",
  farmer_signature_path: "",
  termsAccepted: false,
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
    return "—";
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


const formatDate = (
  value
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      `${value}T00:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  ).format(date);
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
// READ ONLY ITEM
// ============================================================

const DetailItem = ({
  label,
  value,
}) => {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-800">
        {value || "—"}
      </p>
    </div>
  );
};


// ============================================================
// COMPONENT
// ============================================================

export default function FarmerContractApplicationModal({
  open,
  opportunity,
  products = [],

  isLoadingProducts = false,
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
    validationError,
    setValidationError,
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

      setValidationError("");
    },
    [
      open,
      opportunity?.posting_id,
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
  // ELIGIBLE PRODUCTS
  // ==========================================================

  const eligibleProducts =
    useMemo(
      () =>
        products.filter(
          (product) => {
            const available =
              Number(
                product.available_quantity_kg
              );

            const active =
              !product.status ||
              product.status ===
                "active";

            const matchesType =
              !opportunity?.product_type ||
              product.product_type ===
                opportunity.product_type;

            const matchesVariety =
              !opportunity?.rice_variety ||
              product.rice_variety ===
                opportunity.rice_variety;

            return (
              active &&
              matchesType &&
              matchesVariety &&
              Number.isFinite(
                available
              ) &&
              available > 0
            );
          }
        ),
      [
        products,
        opportunity,
      ]
    );


  // ==========================================================
  // SELECTED PRODUCT
  // ==========================================================

  const selectedProduct =
    useMemo(
      () =>
        eligibleProducts.find(
          (product) =>
            String(
              product.farm_product_id
            ) ===
            String(
              form.farm_product_id
            )
        ) || null,
      [
        eligibleProducts,
        form.farm_product_id,
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

    if (
      validationError
    ) {
      setValidationError("");
    }
  };


  // ==========================================================
  // PRODUCT CHANGE
  // ==========================================================

  const handleProductChange = (
    value
  ) => {
    const product =
      eligibleProducts.find(
        (item) =>
          String(
            item.farm_product_id
          ) === String(value)
      );


    if (!product) {
      setForm(
        (current) => ({
          ...current,

          farm_product_id: "",
          quantity_to_commit_kg: "",
          expected_availability_date: "",
        })
      );

      return;
    }


    let defaultQuantity = "";


    if (
      opportunity &&
      !opportunity.partial_quantity_allowed
    ) {
      const requiredQuantity =
        Number(
          opportunity.required_quantity_kg
        );

      const availableQuantity =
        Number(
          product.available_quantity_kg
        );


      if (
        requiredQuantity <=
        availableQuantity
      ) {
        defaultQuantity =
          String(
            requiredQuantity
          );
      }
    }


    setForm(
      (current) => ({
        ...current,

        farm_product_id:
          String(
            product.farm_product_id
          ),

        quantity_to_commit_kg:
          defaultQuantity,

        expected_availability_date:
          product.harvest_acquisition_date ||
          "",
      })
    );

    setValidationError("");
  };


  // ==========================================================
  // VALIDATION
  // ==========================================================

  const validate = () => {
    if (!opportunity) {
      return "Opportunity information is unavailable.";
    }


    if (!selectedProduct) {
      return "Please select an eligible Inventory product.";
    }


    const quantity =
      Number(
        form.quantity_to_commit_kg
      );


    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      return "Quantity to Commit must be greater than zero.";
    }


    const availableQuantity =
      Number(
        selectedProduct.available_quantity_kg
      );


    if (
      quantity >
      availableQuantity
    ) {
      return "Quantity to Commit cannot exceed your available Inventory quantity.";
    }


    const requiredQuantity =
      Number(
        opportunity.required_quantity_kg
      );


    if (
      Number.isFinite(
        requiredQuantity
      ) &&
      quantity >
        requiredQuantity
    ) {
      return "Quantity to Commit cannot exceed the Miller's required quantity.";
    }


    if (
      !opportunity.partial_quantity_allowed &&
      Number.isFinite(
        requiredQuantity
      ) &&
      quantity !==
        requiredQuantity
    ) {
      return `This opportunity does not allow partial quantity. You must commit ${formatQuantity(
        requiredQuantity
      )}.`;
    }


    if (
      !form.expected_availability_date
    ) {
      return "Expected Availability Date is required.";
    }


    if (
      opportunity.required_fulfillment_date
    ) {
      const availabilityDate =
        new Date(
          `${form.expected_availability_date}T00:00:00`
        );

      const requiredDate =
        new Date(
          `${opportunity.required_fulfillment_date}T23:59:59`
        );


      if (
        availabilityDate >
        requiredDate
      ) {
        return "Expected Availability Date cannot be later than the required fulfillment date.";
      }
    }


    if (
      !opportunity.price_negotiation_allowed &&
      form.proposed_selling_price_per_kg
    ) {
      return "Price negotiation is not allowed for this opportunity.";
    }


    if (
      form.proposed_selling_price_per_kg
    ) {
      const price =
        Number(
          form.proposed_selling_price_per_kg
        );


      if (
        !Number.isFinite(price) ||
        price <= 0
      ) {
        return "Proposed Selling Price must be greater than zero.";
      }
    }


    if (
      !form.farmer_signature_path
      || !String(
        form.farmer_signature_path
      ).startsWith(
        "data:image/"
      )
    ) {
      return "Electronic signature is required.";
    }


    if (
      !form.termsAccepted
    ) {
      return "Please confirm that you reviewed the opportunity and your application details.";
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


    const validation =
      validate();


    if (validation) {
      setValidationError(
        validation
      );

      return;
    }


    setValidationError("");


    onSubmit?.({
      farm_product_id:
        Number(
          form.farm_product_id
        ),

      quantity_to_commit_kg:
        Number(
          form.quantity_to_commit_kg
        ),

      expected_availability_date:
        form.expected_availability_date,

      proposed_selling_price_per_kg:
        opportunity
          ?.price_negotiation_allowed &&
        form.proposed_selling_price_per_kg
          ? Number(
              form.proposed_selling_price_per_kg
            )
          : null,

      additional_notes_to_miller:
        form.additional_notes_to_miller
          .trim(),

      farmer_signature_path:
        form.farmer_signature_path
          .trim(),
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
        aria-labelledby="farmer-opportunity-application-title"
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
              <Send size={19} />
            </div>


            <div>
              <h3
                id="farmer-opportunity-application-title"
                className="
                  text-xl
                  font-bold
                  text-slate-900
                "
              >
                Apply to Opportunity
              </h3>

              <p
                className="
                  mt-1
                  text-sm
                  text-slate-500
                "
              >
                Select an eligible product and submit your commitment to the Miller.
              </p>
            </div>
          </div>


          <button
            type="button"
            disabled={isSaving}
            onClick={handleClose}
            aria-label="Close application modal"
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

          {/* ERROR */}

          {(validationError ||
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
              {validationError ||
                error}
            </div>
          )}


          {/* =================================================
              OPPORTUNITY SUMMARY
          ================================================= */}

          {opportunity && (
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
                  Opportunity Information
                </h4>
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
                <DetailItem
                  label="Opportunity ID"
                  value={
                    opportunity.posting_code
                  }
                />

                <DetailItem
                  label="Miller / Buyer"
                  value={
                    opportunity.business_name ||
                    opportunity.organization_name ||
                    opportunity.miller_name
                  }
                />

                <DetailItem
                  label="Product Type"
                  value={
                    humanize(
                      opportunity.product_type
                    )
                  }
                />

                <DetailItem
                  label="Rice Variety"
                  value={
                    opportunity.rice_variety
                  }
                />

                <DetailItem
                  label="Required Quantity"
                  value={
                    formatQuantity(
                      opportunity.required_quantity_kg
                    )
                  }
                />

                <DetailItem
                  label="Buying Price"
                  value={
                    opportunity.buying_price_per_kg
                      ? `${formatPeso(
                          opportunity.buying_price_per_kg
                        )} / kg`
                      : "—"
                  }
                />

                <DetailItem
                  label="Required Fulfillment Date"
                  value={
                    formatDate(
                      opportunity.required_fulfillment_date
                    )
                  }
                />

                <DetailItem
                  label="Partial Quantity"
                  value={
                    opportunity.partial_quantity_allowed
                      ? "Allowed"
                      : "Not Allowed"
                  }
                />

                <DetailItem
                  label="Price Negotiation"
                  value={
                    opportunity.price_negotiation_allowed
                      ? "Allowed"
                      : "Not Allowed"
                  }
                />
              </div>
            </section>
          )}


          {/* =================================================
              PRODUCT SELECTION
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
                Your Product
              </h4>

              <p
                className="
                  mt-0.5
                  text-xs
                  text-slate-500
                "
              >
                Only products matching the required product type and rice variety are shown.
              </p>
            </div>


            <div
              className="
                space-y-4
                p-4
              "
            >

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
                  Inventory Product
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>


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
                    outline-none
                    focus:border-green-600
                    focus:ring-1
                    focus:ring-green-600
                    disabled:bg-slate-100
                  "
                >
                  <option value="">
                    {isLoadingProducts
                      ? "Loading products..."
                      : "Select Inventory Product"}
                  </option>


                  {eligibleProducts.map(
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
                  eligibleProducts.length ===
                    0 && (
                    <p
                      className="
                        mt-2
                        text-xs
                        font-medium
                        text-amber-600
                      "
                    >
                      You currently have no available Inventory product that matches this opportunity.
                    </p>
                  )}
              </div>


              {selectedProduct && (
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

                  {selectedProduct.product_image ? (
                    <img
                      src={
                        selectedProduct.product_image
                      }
                      alt={
                        selectedProduct.rice_variety ||
                        "Farmer product"
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


                  <div
                    className="
                      grid
                      flex-1
                      gap-4
                      sm:grid-cols-2
                    "
                  >
                    <DetailItem
                      label="Product Code"
                      value={
                        selectedProduct.product_code
                      }
                    />

                    <DetailItem
                      label="Rice Variety"
                      value={
                        selectedProduct.rice_variety
                      }
                    />

                    <DetailItem
                      label="Product Grade"
                      value={
                        selectedProduct.product_grade
                      }
                    />

                    <DetailItem
                      label="Available Quantity"
                      value={
                        formatQuantity(
                          selectedProduct.available_quantity_kg
                        )
                      }
                    />
                  </div>

                </div>
              )}

            </div>
          </section>


          {/* =================================================
              APPLICATION DETAILS
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
                Application Details
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

              {/* QUANTITY */}

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
                  Quantity to Commit (kg)
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>


                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  disabled={
                    isSaving ||
                    !selectedProduct ||
                    !opportunity
                      ?.partial_quantity_allowed
                  }
                  value={
                    form.quantity_to_commit_kg
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "quantity_to_commit_kg",
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


                {opportunity &&
                  !opportunity.partial_quantity_allowed && (
                    <p
                      className="
                        mt-1.5
                        text-xs
                        text-slate-500
                      "
                    >
                      Partial quantity is not allowed. Full required quantity must be committed.
                    </p>
                  )}
              </div>


              {/* AVAILABILITY */}

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
                  Expected Availability Date
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>


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
              </div>


              {/* NEGOTIATED PRICE */}

              {opportunity
                ?.price_negotiation_allowed && (
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
                    Proposed Selling Price per kg
                    <span
                      className="
                        ml-1
                        text-xs
                        font-normal
                        text-slate-400
                      "
                    >
                      Optional
                    </span>
                  </label>


                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    disabled={isSaving}
                    value={
                      form.proposed_selling_price_per_kg
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "proposed_selling_price_per_kg",
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
                </div>
              )}


              {/* NOTES */}

              <div className="md:col-span-2">

                <label
                  className="
                    mb-1.5
                    block
                    text-sm
                    font-semibold
                    text-slate-700
                  "
                >
                  Additional Notes to Miller
                  <span
                    className="
                      ml-1
                      text-xs
                      font-normal
                      text-slate-400
                    "
                  >
                    Optional
                  </span>
                </label>


                <textarea
                  rows={4}
                  maxLength={1500}
                  disabled={isSaving}
                  value={
                    form.additional_notes_to_miller
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "additional_notes_to_miller",
                      event.target.value
                    )
                  }
                  placeholder="Add relevant information about your product or availability."
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
              </div>

            </div>
          </section>


          {/* =================================================
              E-SIGNATURE
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
                flex
                items-center
                gap-2
                border-b
                border-slate-100
                bg-slate-50
                px-4
                py-3
              "
            >
              <FileSignature
                size={17}
                className="text-green-700"
              />

              <h4
                className="
                  text-sm
                  font-bold
                  text-slate-800
                "
              >
                Electronic Signature
              </h4>
            </div>


            <div
              className="
                space-y-4
                p-4
              "
            >
              <div>
                <p
                  className="
                    text-xs
                    leading-5
                    text-slate-500
                  "
                >
                  Draw your signature using your mouse on desktop or your finger/stylus on mobile.
                  Your signature confirms this Farmer application.
                </p>


                <div className="mt-4">
                  <SignaturePad
                    value={
                      form.farmer_signature_path
                    }
                    onChange={(
                      signature
                    ) =>
                      updateField(
                        "farmer_signature_path",
                        signature
                      )
                    }
                    disabled={
                      isSaving
                    }
                    error={
                      validationError ===
                      "Electronic signature is required."
                        ? validationError
                        : ""
                    }
                  />
                </div>
              </div>


              <label
                className="
                  flex
                  cursor-pointer
                  items-start
                  gap-3
                  rounded-lg
                  border
                  border-slate-200
                  bg-slate-50
                  p-4
                "
              >
                <input
                  type="checkbox"
                  disabled={isSaving}
                  checked={
                    form.termsAccepted
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "termsAccepted",
                      event.target.checked
                    )
                  }
                  className="
                    mt-1
                    h-4
                    w-4
                    accent-green-700
                  "
                />

                <span
                  className="
                    text-sm
                    leading-6
                    text-slate-600
                  "
                >
                  I confirm that I reviewed the opportunity requirements and that the product, quantity, availability date, and other information in this application are correct.
                </span>
              </label>
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
              !selectedProduct
            }
            className="
              inline-flex
              min-w-[175px]
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

                Submitting...
              </>
            ) : (
              <>
                <Send size={16} />

                Submit Application
              </>
            )}
          </button>
        </div>

      </form>
    </div>,
    document.body
  );
}