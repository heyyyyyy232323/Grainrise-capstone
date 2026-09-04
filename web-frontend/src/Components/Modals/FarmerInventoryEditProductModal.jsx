import {
  useEffect,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  AlertCircle,
  ImagePlus,
  Loader2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";


// ============================================================
// HELPERS
// ============================================================

const displayValue = (
  value,
  fallback = "—"
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  const normalized =
    String(
      value
    ).trim();

  return normalized || fallback;
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


const formatProductType = (
  value
) => {
  if (
    value ===
    "unmilled_palay"
  ) {
    return "Unmilled Palay";
  }

  if (
    value ===
    "milled_rice"
  ) {
    return "Milled Rice";
  }

  return humanize(
    value
  );
};


const formatRecordSource = (
  value
) => {
  if (
    value ===
    "harvest_generated"
  ) {
    return "Harvest Generated";
  }

  if (
    value ===
    "manually_added"
  ) {
    return "Manually Added";
  }

  return humanize(
    value
  );
};


const formatAcquisitionSource = (
  value
) => {
  if (
    value ===
    "own_farm"
  ) {
    return "Own Farm";
  }

  if (
    value ===
    "other_source"
  ) {
    return "Other Source";
  }

  return humanize(
    value
  );
};


const formatStockLevel = (
  value
) => {
  if (
    value ===
    "in_stock"
  ) {
    return "In Stock";
  }

  if (
    value ===
    "low_stock"
  ) {
    return "Low Stock";
  }

  if (
    value ===
    "out_of_stock"
  ) {
    return "Out of Stock";
  }

  return humanize(
    value
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


// ============================================================
// EMPTY FORM
// ============================================================

const EMPTY_FORM = {
  product_image: "",
  product_image_name: "",

  description: "",

  product_grade: "",

  selling_price_per_kg: "",
};


// ============================================================
// FORM FIELD
// ============================================================

const FormField = ({
  label,
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
// READ ONLY ITEM
// ============================================================

const ReadOnlyItem = ({
  label,
  value,
  fullWidth = false,
}) => {
  return (
    <div
      className={
        fullWidth
          ? "sm:col-span-2"
          : ""
      }
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
    </div>
  );
};


// ============================================================
// READ ONLY SECTION
// ============================================================

const ReadOnlySection = ({
  title,
  description = "",
  children,
}) => {
  return (
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
          {title}
        </h4>

        {description && (
          <p
            className="
              mt-0.5
              text-xs
              leading-5
              text-slate-500
            "
          >
            {description}
          </p>
        )}
      </div>

      <div
        className="
          grid
          gap-x-6
          gap-y-5
          p-4
          sm:grid-cols-2
        "
      >
        {children}
      </div>
    </section>
  );
};


// ============================================================
// COMPONENT
// ============================================================

export default function FarmerInventoryEditProductModal({
  open,
  product,
  isSaving = false,
  error = "",
  onClose,
  onSubmit,
}) {
  const [
    form,
    setForm,
  ] =
    useState(
      EMPTY_FORM
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
  // LOAD PRODUCT
  // =========================================================

  useEffect(
    () => {
      if (
        !open ||
        !product
      ) {
        return;
      }

      setForm({
        product_image:
          product.product_image ||
          "",

        product_image_name:
          product.product_image
            ? "Current Product Image"
            : "",

        description:
          product.description ||
          "",

        product_grade:
          product.product_grade ||
          "",

        selling_price_per_kg:
          product.selling_price_per_kg ??
          "",
      });

      setLocalError(
        ""
      );
    },
    [
      open,
      product,
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
  // UPDATE FIELD
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

        [field]:
          value,
      })
    );

    if (localError) {
      setLocalError(
        ""
      );
    }
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
  // IMAGE
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

    setLocalError(
      ""
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
        !product ||
        isSaving ||
        isReadingImage
      ) {
        return;
      }


      setLocalError(
        ""
      );


      // =====================================================
      // SELLING PRICE
      // =====================================================

      if (
        form.selling_price_per_kg !==
        ""
      ) {
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
      }


      // =====================================================
      // PRODUCT GRADE
      // =====================================================

      const productGrade =
        String(
          form.product_grade ||
          ""
        ).trim();


      if (
        productGrade.length >
        100
      ) {
        setLocalError(
          "Product Grade / Classification must not exceed 100 characters."
        );

        return;
      }


      // =====================================================
      // PAYLOAD
      // =====================================================

      const payload = {
        product_image:
          form.product_image,

        description:
          String(
            form.description ||
            ""
          ).trim(),

        product_grade:
          productGrade,

        selling_price_per_kg:
          form.selling_price_per_kg ===
          ""
            ? null
            : form.selling_price_per_kg,
      };


      await onSubmit(
        product.farm_product_id,
        payload
      );
    };


  // =========================================================
  // DERIVED
  // =========================================================

  const sourceFarm =
    product?.source_farm_name ||
    "—";


  const sourceCropCycle =
    product?.source_crop_cycle_id
      ? `Cycle #${product.source_crop_cycle_id}`
      : "—";


  const totalStock =
    product?.total_stock_quantity_kg !==
      null &&
    product?.total_stock_quantity_kg !==
      undefined
      ? (
        `${formatNumber(
          product.total_stock_quantity_kg
        )} kg`
      )
      : "—";


  const reservedStock =
    product?.reserved_committed_quantity_kg !==
      null &&
    product?.reserved_committed_quantity_kg !==
      undefined
      ? (
        `${formatNumber(
          product.reserved_committed_quantity_kg
        )} kg`
      )
      : "—";


  const availableStock =
    product?.available_quantity_kg !==
      null &&
    product?.available_quantity_kg !==
      undefined
      ? (
        `${formatNumber(
          product.available_quantity_kg
        )} kg`
      )
      : "—";


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
        aria-labelledby="farmer-inventory-edit-product-title"
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
              <Pencil
                size={19}
              />
            </div>


            <div>
              <h3
                id="farmer-inventory-edit-product-title"
                className="
                  text-xl
                  font-bold
                  text-slate-900
                "
              >
                Edit Product
              </h3>

              <p
                className="
                  mt-1
                  text-sm
                  leading-5
                  text-slate-500
                "
              >
                Update product presentation and commercial information.
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

            {/* ERROR */}

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


            {/* =================================================
                PRODUCT IDENTITY
            ================================================= */}

            <ReadOnlySection
              title="Product Identity"
              description="Product identity cannot be changed after the Inventory record is created."
            >
              <ReadOnlyItem
                label="Product Code"
                value={
                  product?.product_code
                }
              />

              <ReadOnlyItem
                label="Product Type"
                value={
                  formatProductType(
                    product?.product_type
                  )
                }
              />

              <ReadOnlyItem
                label="Rice Variety / Variant"
                value={
                  product?.rice_variety
                }
              />

              <ReadOnlyItem
                label="Status"
                value={
                  humanize(
                    product?.status
                  )
                }
              />
            </ReadOnlySection>


            {/* =================================================
                SOURCE INFORMATION
            ================================================= */}

            <div
              className="
                mt-5
              "
            >
              <ReadOnlySection
                title="Source Information"
                description="Source information is preserved for traceability."
              >
                <ReadOnlyItem
                  label="Record Source"
                  value={
                    formatRecordSource(
                      product?.record_source_type
                    )
                  }
                />

                <ReadOnlyItem
                  label="Source Type"
                  value={
                    formatAcquisitionSource(
                      product?.acquisition_source_type
                    )
                  }
                />

                <ReadOnlyItem
                  label="Source Farm"
                  value={
                    sourceFarm
                  }
                />

                <ReadOnlyItem
                  label="Source Cropping Cycle"
                  value={
                    sourceCropCycle
                  }
                />

                <ReadOnlyItem
                  label="Harvest / Acquisition Date"
                  value={
                    formatDate(
                      product?.harvest_acquisition_date
                    )
                  }
                  fullWidth
                />
              </ReadOnlySection>
            </div>


            {/* =================================================
                STOCK INFORMATION
            ================================================= */}

            <div
              className="
                mt-5
              "
            >
              <ReadOnlySection
                title="Stock Information"
                description="Stock quantities are managed by Inventory transactions."
              >
                <ReadOnlyItem
                  label="Total Stock Quantity"
                  value={
                    totalStock
                  }
                />

                <ReadOnlyItem
                  label="Reserved / Committed Quantity"
                  value={
                    reservedStock
                  }
                />

                <ReadOnlyItem
                  label="Available Quantity"
                  value={
                    availableStock
                  }
                />

                <ReadOnlyItem
                  label="Stock Level"
                  value={
                    formatStockLevel(
                      product?.stock_level
                    )
                  }
                />
              </ReadOnlySection>
            </div>


            {/* =================================================
                EDITABLE INFORMATION
            ================================================= */}

            <section
              className="
                mt-6
                border-t
                border-slate-200
                pt-6
              "
            >
              <div
                className="
                  mb-4
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
                  Editable Product Information
                </h4>

                <p
                  className="
                    mt-1
                    text-xs
                    leading-5
                    text-slate-500
                  "
                >
                  Only the fields below can be updated.
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
                          h-28
                          w-28
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
                            leading-5
                            text-slate-400
                          "
                        >
                          Select a new image to replace the current image.
                        </p>


                        <label
                          className="
                            mt-3
                            inline-flex
                            cursor-pointer
                            items-center
                            justify-center
                            gap-2
                            rounded-lg
                            border
                            border-green-200
                            bg-white
                            px-3
                            py-2
                            text-xs
                            font-semibold
                            text-green-700
                            transition
                            hover:bg-green-50
                          "
                        >
                          <ImagePlus
                            size={14}
                          />

                          Replace Image

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
                      </div>


                      <button
                        type="button"
                        onClick={
                          handleRemoveImage
                        }
                        disabled={
                          isSaving ||
                          isReadingImage
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
                        className="
                          hidden
                        "
                      />
                    </label>
                  )}
                </FormField>


                {/* PRODUCT GRADE */}

                <FormField
                  label="Product Grade / Classification"
                  hint="Optional."
                >
                  <input
                    type="text"
                    maxLength={100}
                    value={
                      form.product_grade
                    }
                    onChange={
                      (
                        event
                      ) =>
                        updateField(
                          "product_grade",
                          event.target.value
                        )
                    }
                    placeholder="Enter product grade or classification"
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


                {/* SELLING PRICE */}

                <FormField
                  label="Selling Price per kg (₱)"
                  hint="Can be left blank if the product is not yet priced."
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


                {/* DESCRIPTION */}

                <FormField
                  label="Product Description"
                  fullWidth
                  hint="Optional."
                >
                  <textarea
                    rows={4}
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
              items-center
              justify-end
              gap-2
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
                    className="
                      animate-spin
                    "
                  />
                )}

              {isSaving
                ? "Saving..."
                : "Save Changes"}
            </button>
          </div>

        </form>
      </div>
    </div>,
    document.body
  );
}