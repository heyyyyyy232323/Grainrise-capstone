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
  ImagePlus,
  Loader2,
  PackagePlus,
  Trash2,
  X,
} from "lucide-react";


// ============================================================
// OPTIONS
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


const RICE_VARIETY_OPTIONS = [
  "Inbred (NSIC Rc 222)",
  "Inbred (NSIC Rc 160)",
  "Hybrid (Mestiso 20)",
  "Hybrid (SL-8H)",
  "Organic / Traditional Rice",
  "Other / Specify",
];


const SOURCE_TYPE_OPTIONS = [
  {
    value: "own_farm",
    label: "Own Farm",
  },
  {
    value: "other_source",
    label: "Other Source",
  },
];


// ============================================================
// DEFAULT FORM
// ============================================================

const EMPTY_FORM = {
  product_type: "",

  rice_variety_selection: "",
  rice_variety_custom: "",

  stock_quantity_kg: "",
  selling_price_per_kg: "",

  product_image: "",
  product_image_name: "",

  description: "",

  product_grade_selection: "",
  product_grade_custom: "",

  acquisition_source_type: "",

  source_farm_id: "",

  harvest_acquisition_date: "",

  source_acquisition_remarks: "",
};


// ============================================================
// FIELD
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
// READ ONLY FIELD
// ============================================================

const ReadOnlyField = ({
  label,
  value,
  hint = "",
}) => {
  return (
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
        {label}
      </label>

      <div
        className="
          rounded-xl
          border
          border-slate-200
          bg-slate-50
          px-3.5
          py-2.5
          text-sm
          font-medium
          text-slate-500
        "
      >
        {value}
      </div>

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
// COMPONENT
// ============================================================

export default function FarmerInventoryAddProductModal({
  open,
  farmOptions = [],
  isLoadingFarmOptions = false,
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
    localError,
    setLocalError,
  ] = useState(
    ""
  );


  const [
    isReadingImage,
    setIsReadingImage,
  ] = useState(
    false
  );


  // =========================================================
  // RESET
  // =========================================================

  useEffect(
    () => {
      if (!open) {
        return;
      }

      setForm({
        ...EMPTY_FORM,
      });

      setLocalError(
        ""
      );
    },
    [
      open,
    ]
  );


  // =========================================================
  // BODY SCROLL
  // =========================================================

  useEffect(
    () => {
      if (!open) {
        return undefined;
      }

      const oldOverflow =
        document.body.style.overflow;

      document.body.style.overflow =
        "hidden";

      return () => {
        document.body.style.overflow =
          oldOverflow;
      };
    },
    [
      open,
    ]
  );


  // =========================================================
  // DERIVED VALUES
  // =========================================================

  const isOwnFarm =
    form.acquisition_source_type ===
    "own_farm";


  const isOtherSource =
    form.acquisition_source_type ===
    "other_source";


  const selectedFarm =
    useMemo(
      () =>
        farmOptions.find(
          (
            farm
          ) =>
            String(
              farm.farm_id
            ) ===
            String(
              form.source_farm_id
            )
        ) || null,
      [
        farmOptions,
        form.source_farm_id,
      ]
    );


  if (!open) {
    return null;
  }


  // =========================================================
  // CHANGE
  // =========================================================

  const updateField = (
    field,
    value
  ) => {
    setForm(
      (
        current
      ) => ({
        ...current,
        [field]: value,
      })
    );

    if (localError) {
      setLocalError(
        ""
      );
    }
  };


  // =========================================================
  // SOURCE TYPE
  // =========================================================

  const handleSourceTypeChange = (
    value
  ) => {
    setForm(
      (
        current
      ) => ({
        ...current,

        acquisition_source_type:
          value,

        source_farm_id:
          "",

        source_acquisition_remarks:
          "",
      })
    );

    setLocalError(
      ""
    );
  };


  // =========================================================
  // IMAGE UPLOAD
  // =========================================================

  const handleImageChange = (
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
        "Product image must be a JPG, PNG, or WEBP file."
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
        "Product image must not exceed 5 MB."
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


    reader.onload = () => {
      setForm(
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


    reader.onerror = () => {
      setIsReadingImage(
        false
      );

      setLocalError(
        "Unable to read the selected product image."
      );
    };


    reader.readAsDataURL(
      file
    );
  };


  const handleRemoveImage = () => {
    if (
      isSaving ||
      isReadingImage
    ) {
      return;
    }

    setForm(
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
  // CLEAR
  // =========================================================

  const handleClear = () => {
    if (
      isSaving ||
      isReadingImage
    ) {
      return;
    }

    setForm({
      ...EMPTY_FORM,
    });

    setLocalError(
      ""
    );
  };


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
  // SUBMIT
  // =========================================================

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();


    if (
      isSaving ||
      isReadingImage ||
      !onSubmit
    ) {
      return;
    }


    setLocalError(
      ""
    );


    // --------------------------------------------------------
    // PRODUCT TYPE
    // --------------------------------------------------------

    if (
      !form.product_type
    ) {
      setLocalError(
        "Product Type is required."
      );

      return;
    }


    // --------------------------------------------------------
    // RICE VARIETY
    // --------------------------------------------------------

    if (
      !form.rice_variety_selection
    ) {
      setLocalError(
        "Rice Variety / Variant is required."
      );

      return;
    }


    let riceVariety =
      form.rice_variety_selection;


    if (
      form.rice_variety_selection ===
      "Other / Specify"
    ) {
      riceVariety =
        String(
          form.rice_variety_custom ||
          ""
        ).trim();

      if (!riceVariety) {
        setLocalError(
          "Please specify the Rice Variety / Variant."
        );

        return;
      }
    }


    // --------------------------------------------------------
    // STOCK
    // --------------------------------------------------------

    if (
      form.stock_quantity_kg ===
      ""
    ) {
      setLocalError(
        "Stock Quantity is required."
      );

      return;
    }


    const stockQuantity =
      Number(
        form.stock_quantity_kg
      );


    if (
      !Number.isFinite(
        stockQuantity
      ) ||
      stockQuantity <= 0
    ) {
      setLocalError(
        "Stock Quantity must be greater than zero."
      );

      return;
    }


    // --------------------------------------------------------
    // SELLING PRICE
    // --------------------------------------------------------

    if (
      form.selling_price_per_kg ===
      ""
    ) {
      setLocalError(
        "Selling Price per kg is required."
      );

      return;
    }


    const sellingPrice =
      Number(
        form.selling_price_per_kg
      );


    if (
      !Number.isFinite(
        sellingPrice
      ) ||
      sellingPrice <= 0
    ) {
      setLocalError(
        "Selling Price per kg must be greater than zero."
      );

      return;
    }


    // --------------------------------------------------------
    // SOURCE TYPE
    // --------------------------------------------------------

    if (
      !form.acquisition_source_type
    ) {
      setLocalError(
        "Source Type is required."
      );

      return;
    }


    // --------------------------------------------------------
    // SOURCE FARM
    // --------------------------------------------------------

    if (
      isOwnFarm &&
      !form.source_farm_id
    ) {
      setLocalError(
        "Source Farm is required when Source Type is Own Farm."
      );

      return;
    }


    // --------------------------------------------------------
    // DATE
    // --------------------------------------------------------

    if (
      !form.harvest_acquisition_date
    ) {
      setLocalError(
        "Harvest / Acquisition Date is required."
      );

      return;
    }


    // --------------------------------------------------------
    // PRODUCT GRADE
    // --------------------------------------------------------

    let productGrade =
      "";


    if (
      form.product_grade_selection ===
      "other"
    ) {
      productGrade =
        String(
          form.product_grade_custom ||
          ""
        ).trim();

      if (!productGrade) {
        setLocalError(
          "Please specify the Product Grade / Classification."
        );

        return;
      }
    }


    // --------------------------------------------------------
    // FINAL PAYLOAD
    // --------------------------------------------------------

    const payload = {
      product_type:
        form.product_type,

      rice_variety:
        riceVariety,

      stock_quantity_kg:
        form.stock_quantity_kg,

      selling_price_per_kg:
        form.selling_price_per_kg,

      product_image:
        form.product_image,

      description:
        String(
          form.description ||
          ""
        ).trim(),

      product_grade:
        productGrade,

      acquisition_source_type:
        form.acquisition_source_type,

      source_farm_id:
        isOwnFarm
          ? form.source_farm_id
          : null,

      harvest_acquisition_date:
        form.harvest_acquisition_date,

      source_acquisition_remarks:
        isOtherSource
          ? String(
              form.source_acquisition_remarks ||
              ""
            ).trim()
          : "",
    };


    await onSubmit(
      payload
    );
  };


  // =========================================================
  // MODAL
  // =========================================================

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
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="farmer-add-product-title"
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
              min-w-0
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
              <PackagePlus
                size={20}
              />
            </div>


            <div>
              <h3
                id="farmer-add-product-title"
                className="
                  text-xl
                  font-bold
                  text-slate-900
                "
              >
                Add Product
              </h3>

              <p
                className="
                  mt-1
                  text-sm
                  leading-5
                  text-slate-500
                "
              >
                Add an inventory product that was not automatically created from Record Harvest.
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
            aria-label="Close"
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

            {(localError || error) && (
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
            )}


            {/* ==============================================
                PRODUCT INFORMATION
            ============================================== */}

            <section>
              <div
                className="
                  mb-4
                  border-b
                  border-slate-100
                  pb-3
                "
              >
                <h4
                  className="
                    text-sm
                    font-bold
                    uppercase
                    tracking-wide
                    text-green-800
                  "
                >
                  Product Information
                </h4>

                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-500
                  "
                >
                  Enter the product and current stock information.
                </p>
              </div>


              <div
                className="
                  grid
                  gap-x-5
                  gap-y-5
                  md:grid-cols-2
                "
              >

                {/* PRODUCT CODE */}

                <ReadOnlyField
                  label="Product Code"
                  value="System-generated"
                  hint="GrainRise will create the Product Code after the product is saved."
                />


                {/* PRODUCT TYPE */}

                <FormField
                  label="Product Type"
                  required
                >
                  <select
                    value={
                      form.product_type
                    }
                    onChange={
                      (
                        event
                      ) =>
                        updateField(
                          "product_type",
                          event.target.value
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
                      Select Product Type
                    </option>

                    {PRODUCT_TYPE_OPTIONS.map(
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
                    )}
                  </select>
                </FormField>


                {/* RICE VARIETY */}

                <FormField
                  label="Rice Variety / Variant"
                  required
                >
                  <select
                    value={
                      form.rice_variety_selection
                    }
                    onChange={
                      (
                        event
                      ) => {
                        const value =
                          event.target.value;

                        setForm(
                          (
                            current
                          ) => ({
                            ...current,

                            rice_variety_selection:
                              value,

                            rice_variety_custom:
                              value ===
                              "Other / Specify"
                                ? current.rice_variety_custom
                                : "",
                          })
                        );

                        setLocalError(
                          ""
                        );
                      }
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
                      Select Rice Variety
                    </option>

                    {RICE_VARIETY_OPTIONS.map(
                      (
                        variety
                      ) => (
                        <option
                          key={
                            variety
                          }
                          value={
                            variety
                          }
                        >
                          {variety}
                        </option>
                      )
                    )}
                  </select>
                </FormField>


                {/* OTHER RICE VARIETY */}

                {form.rice_variety_selection ===
                  "Other / Specify" && (
                  <FormField
                    label="Specify Rice Variety / Variant"
                    required
                  >
                    <input
                      type="text"
                      value={
                        form.rice_variety_custom
                      }
                      onChange={
                        (
                          event
                        ) =>
                          updateField(
                            "rice_variety_custom",
                            event.target.value
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
                )}


                {/* STOCK */}

                <FormField
                  label="Stock Quantity (kg)"
                  required
                >
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={
                      form.stock_quantity_kg
                    }
                    onChange={
                      (
                        event
                      ) =>
                        updateField(
                          "stock_quantity_kg",
                          event.target.value
                        )
                    }
                    placeholder="Enter stock quantity"
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


                {/* PRICE */}

                <FormField
                  label="Selling Price per kg (₱)"
                  required
                >
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={
                      form.selling_price_per_kg
                    }
                    onChange={
                      (
                        event
                      ) =>
                        updateField(
                          "selling_price_per_kg",
                          event.target.value
                        )
                    }
                    placeholder="Enter selling price"
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


                {/* GRADE */}

                <FormField
                  label="Product Grade / Classification"
                  hint="Optional."
                >
                  <select
                    value={
                      form.product_grade_selection
                    }
                    onChange={
                      (
                        event
                      ) => {
                        const value =
                          event.target.value;

                        setForm(
                          (
                            current
                          ) => ({
                            ...current,

                            product_grade_selection:
                              value,

                            product_grade_custom:
                              value ===
                              "other"
                                ? current.product_grade_custom
                                : "",
                          })
                        );
                      }
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


                {/* CUSTOM GRADE */}

                {form.product_grade_selection ===
                  "other" && (
                  <FormField
                    label="Specify Product Grade / Classification"
                    required
                  >
                    <input
                      type="text"
                      value={
                        form.product_grade_custom
                      }
                      onChange={
                        (
                          event
                        ) =>
                          updateField(
                            "product_grade_custom",
                            event.target.value
                          )
                      }
                      placeholder="Enter product classification"
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
                )}


                {/* DESCRIPTION */}

                <FormField
                  label="Product Description"
                  fullWidth
                  hint="Optional."
                >
                  <textarea
                    rows={3}
                    value={
                      form.description
                    }
                    onChange={
                      (
                        event
                      ) =>
                        updateField(
                          "description",
                          event.target.value
                        )
                    }
                    placeholder="Enter relevant product information"
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


                {/* PRODUCT IMAGE */}

                <FormField
                  label="Product Image"
                  fullWidth
                  hint="Optional. JPG, PNG, or WEBP up to 5 MB."
                >
                  {form.product_image ? (
                    <div
                      className="
                        flex
                        flex-col
                        gap-4
                        rounded-xl
                        border
                        border-slate-200
                        bg-slate-50
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
                            form.product_image
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
                            form.product_image_name ||
                            "Product Image"
                          }
                        </p>

                        <p
                          className="
                            mt-1
                            text-xs
                            text-slate-400
                          "
                        >
                          Image ready for upload.
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
                          inline-flex
                          shrink-0
                          items-center
                          justify-center
                          gap-1.5
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
                          disabled:cursor-not-allowed
                          disabled:opacity-50
                        "
                      >
                        <Trash2
                          size={14}
                        />

                        Remove
                      </button>
                    </div>
                  ) : (
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
                      {isReadingImage ? (
                        <Loader2
                          size={26}
                          className="
                            animate-spin
                            text-green-700
                          "
                        />
                      ) : (
                        <ImagePlus
                          size={26}
                          className="
                            text-green-700
                          "
                        />
                      )}

                      <span
                        className="
                          mt-2
                          text-sm
                          font-semibold
                          text-slate-700
                        "
                      >
                        {isReadingImage
                          ? "Preparing Image..."
                          : "Upload Product Image"}
                      </span>

                      <span
                        className="
                          mt-1
                          text-xs
                          text-slate-400
                        "
                      >
                        Click to choose an image
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
                        className="hidden"
                      />
                    </label>
                  )}
                </FormField>

              </div>
            </section>


            {/* ==============================================
                SOURCE INFORMATION
            ============================================== */}

            <section
              className="
                mt-7
                border-t
                border-slate-200
                pt-6
              "
            >
              <div
                className="
                  mb-4
                  border-b
                  border-slate-100
                  pb-3
                "
              >
                <h4
                  className="
                    text-sm
                    font-bold
                    uppercase
                    tracking-wide
                    text-green-800
                  "
                >
                  Source Information
                </h4>

                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-500
                  "
                >
                  Identify where the manually added inventory came from.
                </p>
              </div>


              <div
                className="
                  grid
                  gap-x-5
                  gap-y-5
                  md:grid-cols-2
                "
              >

                {/* SOURCE TYPE */}

                <FormField
                  label="Source Type"
                  required
                >
                  <select
                    value={
                      form.acquisition_source_type
                    }
                    onChange={
                      (
                        event
                      ) =>
                        handleSourceTypeChange(
                          event.target.value
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
                      Select Source Type
                    </option>

                    {SOURCE_TYPE_OPTIONS.map(
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
                    )}
                  </select>
                </FormField>


                {/* SOURCE FARM */}

                {isOwnFarm && (
                  <FormField
                    label="Source Farm"
                    required
                  >
                    <select
                      value={
                        form.source_farm_id
                      }
                      onChange={
                        (
                          event
                        ) =>
                          updateField(
                            "source_farm_id",
                            event.target.value
                          )
                      }
                      disabled={
                        isLoadingFarmOptions
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
                        disabled:cursor-not-allowed
                        disabled:bg-slate-50
                      "
                    >
                      <option value="">
                        {isLoadingFarmOptions
                          ? "Loading farms..."
                          : "Select Source Farm"}
                      </option>

                      {farmOptions.map(
                        (
                          farm
                        ) => (
                          <option
                            key={
                              farm.farm_id
                            }
                            value={
                              farm.farm_id
                            }
                          >
                            {farm.farm_name}
                            {farm.farm_status
                              ? ` — ${farm.farm_status}`
                              : ""}
                          </option>
                        )
                      )}
                    </select>
                  </FormField>
                )}


                {/* FARM LOCATION */}

                {isOwnFarm &&
                  selectedFarm && (
                    <ReadOnlyField
                      label="Source Farm Location"
                      value={
                        selectedFarm.farm_location ||
                        "Location unavailable"
                      }
                    />
                  )}


                {/* DATE */}

                <FormField
                  label="Harvest / Acquisition Date"
                  required
                >
                  <input
                    type="date"
                    value={
                      form.harvest_acquisition_date
                    }
                    onChange={
                      (
                        event
                      ) =>
                        updateField(
                          "harvest_acquisition_date",
                          event.target.value
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


                {/* OTHER SOURCE REMARKS */}

                {isOtherSource && (
                  <FormField
                    label="Source / Acquisition Remarks"
                    fullWidth
                    hint="Optional. Add useful information about the external source or acquisition."
                  >
                    <textarea
                      rows={3}
                      value={
                        form.source_acquisition_remarks
                      }
                      onChange={
                        (
                          event
                        ) =>
                          updateField(
                            "source_acquisition_remarks",
                            event.target.value
                          )
                      }
                      placeholder="Example: Purchased from local rice producer..."
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
                )}

              </div>
            </section>

          </div>


          {/* =================================================
              FOOTER
          ================================================= */}

          <div
            className="
              flex
              shrink-0
              flex-col-reverse
              gap-2
              border-t
              border-slate-200
              bg-white
              px-5
              py-4
              sm:flex-row
              sm:items-center
              sm:justify-between
              sm:px-6
            "
          >
            <button
              type="button"
              onClick={
                handleClear
              }
              disabled={
                isSaving ||
                isReadingImage
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


            <div
              className="
                flex
                flex-col-reverse
                gap-2
                sm:flex-row
              "
            >
              <button
                type="button"
                onClick={
                  handleClose
                }
                disabled={
                  isSaving ||
                  isReadingImage
                }
                className="
                  rounded-lg
                  border
                  border-slate-300
                  bg-white
                  px-5
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
                Cancel
              </button>


              <button
                type="submit"
                disabled={
                  isSaving ||
                  isReadingImage
                }
                className="
                  inline-flex
                  min-w-36
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
                {(isSaving ||
                  isReadingImage) && (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                )}

                {isSaving
                  ? "Adding Product..."
                  : "Add Product"}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>,
    document.body
  );
}