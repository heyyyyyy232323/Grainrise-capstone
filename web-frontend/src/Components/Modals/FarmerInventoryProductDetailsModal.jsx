import {
  useEffect,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  AlertCircle,
  ImageOff,
  Loader2,
  Package,
  RotateCcw,
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

  return (
    normalized ||
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


const formatPeso = (
  value
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Not set";
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
      style:
        "currency",

      currency:
        "PHP",

      minimumFractionDigits:
        2,

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
// LABEL HELPERS
// ============================================================

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


// ============================================================
// DETAIL ITEM
// ============================================================

const DetailItem = ({
  label,
  value,
  fullWidth = false,
  children,
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

      {children ? (
        <div
          className="
            mt-1.5
          "
        >
          {children}
        </div>
      ) : (
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
      )}
    </div>
  );
};


// ============================================================
// SECTION
// ============================================================

const DetailSection = ({
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
          bg-slate-50/70
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
// PRODUCT STATUS BADGE
// ============================================================

const ProductStatusBadge = ({
  status,
}) => {
  const isActive =
    status ===
    "active";

  return (
    <span
      className={`
        inline-flex
        rounded-full
        border
        px-2.5
        py-1
        text-xs
        font-semibold

        ${
          isActive
            ? (
              "border-green-200 " +
              "bg-green-50 " +
              "text-green-700"
            )
            : (
              "border-slate-300 " +
              "bg-slate-100 " +
              "text-slate-600"
            )
        }
      `}
    >
      {
        isActive
          ? "Active"
          : "Archived"
      }
    </span>
  );
};


// ============================================================
// STOCK LEVEL BADGE
// ============================================================

const StockLevelBadge = ({
  stockLevel,
}) => {
  let classes =
    "border-green-200 bg-green-50 text-green-700";


  if (
    stockLevel ===
    "low_stock"
  ) {
    classes =
      "border-amber-200 bg-amber-50 text-amber-700";
  }


  if (
    stockLevel ===
    "out_of_stock"
  ) {
    classes =
      "border-red-200 bg-red-50 text-red-700";
  }


  return (
    <span
      className={`
        inline-flex
        rounded-full
        border
        px-2.5
        py-1
        text-xs
        font-semibold
        ${classes}
      `}
    >
      {
        formatStockLevel(
          stockLevel
        )
      }
    </span>
  );
};


// ============================================================
// COMPONENT
// ============================================================

export default function FarmerInventoryProductDetailsModal({
  open,
  product,
  isLoading = false,
  isChangingStatus = false,
  error = "",
  onClose,
  onEdit,
  onArchive,
  onRestore,
}) {

  // =========================================================
  // BODY SCROLL LOCK
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
  // CLOSE
  // =========================================================

  const handleClose = () => {
    if (
      isChangingStatus
    ) {
      return;
    }

    onClose?.();
  };


  // =========================================================
  // DERIVED
  // =========================================================

  const isActive =
    product?.status ===
    "active";


  const isArchived =
    product?.status ===
    "archived";


  const isHarvestGenerated =
    product?.record_source_type ===
    "harvest_generated";


  const isOwnFarm =
    product?.acquisition_source_type ===
    "own_farm";


  const productImage =
    String(
      product?.product_image ||
      ""
    ).trim();


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
        aria-labelledby="farmer-inventory-product-details-title"
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
              <Package
                size={20}
              />
            </div>

            <div
              className="
                min-w-0
              "
            >
              <h3
                id="farmer-inventory-product-details-title"
                className="
                  break-words
                  text-xl
                  font-bold
                  text-slate-900
                "
              >
                Product Details
              </h3>

              <p
                className="
                  mt-1
                  text-sm
                  leading-5
                  text-slate-500
                "
              >
                Review complete inventory, source, stock, and record information.
              </p>
            </div>
          </div>


          <button
            type="button"
            onClick={
              handleClose
            }
            disabled={
              isChangingStatus
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
            CONTENT
        ================================================== */}

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

          {error && (
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
          )}


          {/* LOADING */}

          {isLoading ? (
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
                  Loading product details...
                </p>
              </div>
            </div>
          ) : !product ? (
            <div
              className="
                flex
                min-h-[320px]
                flex-col
                items-center
                justify-center
                text-center
              "
            >
              <AlertCircle
                size={32}
                className="
                  text-amber-500
                "
              />

              <p
                className="
                  mt-3
                  text-sm
                  font-semibold
                  text-slate-700
                "
              >
                Product details are unavailable.
              </p>
            </div>
          ) : (
            <div
              className="
                space-y-5
              "
            >

              {/* ============================================
                  PRODUCT SUMMARY
              ============================================ */}

              <div
                className="
                  grid
                  gap-5
                  rounded-xl
                  border
                  border-slate-200
                  bg-slate-50
                  p-4
                  sm:grid-cols-[140px_minmax(0,1fr)]
                "
              >
                <div
                  className="
                    flex
                    min-h-[140px]
                    items-center
                    justify-center
                    overflow-hidden
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                  "
                >
                  {productImage ? (
                    <img
                      src={
                        productImage
                      }
                      alt={
                        product.product_code ||
                        "Inventory product"
                      }
                      className="
                        h-full
                        min-h-[140px]
                        w-full
                        object-cover
                      "
                    />
                  ) : (
                    <div
                      className="
                        flex
                        flex-col
                        items-center
                        justify-center
                        gap-2
                        px-3
                        text-center
                        text-slate-400
                      "
                    >
                      <ImageOff
                        size={28}
                      />

                      <span
                        className="
                          text-xs
                          font-medium
                        "
                      >
                        No product image
                      </span>
                    </div>
                  )}
                </div>


                <div
                  className="
                    grid
                    content-start
                    gap-x-6
                    gap-y-5
                    sm:grid-cols-2
                  "
                >
                  <DetailItem
                    label="Product Code"
                    value={
                      product.product_code
                    }
                  />

                  <DetailItem
                    label="Product Type"
                    value={
                      formatProductType(
                        product.product_type
                      )
                    }
                  />

                  <DetailItem
                    label="Rice Variety / Variant"
                    value={
                      product.rice_variety
                    }
                  />

                  <DetailItem
                    label="Product Grade / Classification"
                    value={
                      product.product_grade
                    }
                  />
                </div>
              </div>


              {/* ============================================
                  PRODUCT INFORMATION
                  NO DUPLICATE PRODUCT IDENTITY FIELDS
              ============================================ */}

              <DetailSection
                title="Product Information"
              >
                <DetailItem
                  label="Product Status"
                >
                  <ProductStatusBadge
                    status={
                      product.status
                    }
                  />
                </DetailItem>

                <DetailItem
                  label="Description"
                  value={
                    product.description
                  }
                  fullWidth
                />
              </DetailSection>


              {/* ============================================
                  SOURCE INFORMATION
              ============================================ */}

              <DetailSection
                title="Source Information"
                description="Shows how this Inventory record entered GrainRise and where the product came from."
              >
                <DetailItem
                  label="Record Source"
                  value={
                    formatRecordSource(
                      product.record_source_type
                    )
                  }
                />

                <DetailItem
                  label="Acquisition Source"
                  value={
                    formatAcquisitionSource(
                      product.acquisition_source_type
                    )
                  }
                />


                {isOwnFarm && (
                  <>
                    <DetailItem
                      label="Source Farm"
                      value={
                        product.source_farm_name
                      }
                    />

                    <DetailItem
                      label="Source Farm Location"
                      value={
                        product.source_farm_location
                      }
                    />
                  </>
                )}


                {isHarvestGenerated && (
                  <>
                    <DetailItem
                      label="Source Cropping Cycle"
                      value={
                        product.source_crop_cycle_id
                          ? (
                            `Cycle #${product.source_crop_cycle_id}`
                          )
                          : "—"
                      }
                    />

                    <DetailItem
                      label="Source Crop Status"
                      value={
                        humanize(
                          product.source_crop_status
                        )
                      }
                    />
                  </>
                )}


                <DetailItem
                  label="Harvest / Acquisition Date"
                  value={
                    formatDate(
                      product.harvest_acquisition_date
                    )
                  }
                />


                {isHarvestGenerated && (
                  <>
                    <DetailItem
                      label="Source Planting Date"
                      value={
                        formatDate(
                          product.source_planting_date
                        )
                      }
                    />

                    <DetailItem
                      label="Source Actual Harvest Date"
                      value={
                        formatDate(
                          product.source_actual_harvest_date
                        )
                      }
                    />

                    <DetailItem
                      label="Source Actual Yield"
                      value={
                        product.source_actual_yield_kg !==
                          null &&
                        product.source_actual_yield_kg !==
                          undefined
                          ? (
                            `${formatNumber(
                              product.source_actual_yield_kg
                            )} kg`
                          )
                          : "—"
                      }
                    />
                  </>
                )}


                <DetailItem
                  label="Source / Acquisition Remarks"
                  value={
                    product.source_acquisition_remarks
                  }
                  fullWidth
                />
              </DetailSection>


              {/* ============================================
                  STOCK INFORMATION
              ============================================ */}

              <DetailSection
                title="Stock Information"
              >
                <DetailItem
                  label="Total Stock Quantity"
                  value={
                    `${
                      formatNumber(
                        product.total_stock_quantity_kg
                      )
                    } kg`
                  }
                />

                <DetailItem
                  label="Reserved / Committed Quantity"
                  value={
                    `${
                      formatNumber(
                        product.reserved_committed_quantity_kg
                      )
                    } kg`
                  }
                />

                <DetailItem
                  label="Available Quantity"
                  value={
                    `${
                      formatNumber(
                        product.available_quantity_kg
                      )
                    } kg`
                  }
                />

                <DetailItem
                  label="Stock Level"
                >
                  <StockLevelBadge
                    stockLevel={
                      product.stock_level
                    }
                  />
                </DetailItem>
              </DetailSection>


              {/* ============================================
                  COMMERCIAL INFORMATION
              ============================================ */}

              <DetailSection
                title="Commercial Information"
              >
                <DetailItem
                  label="Selling Price per kg"
                  value={
                    formatPeso(
                      product.selling_price_per_kg
                    )
                  }
                />

                {isHarvestGenerated && (
                  <DetailItem
                    label="Pricing Status"
                    value={
                      product.selling_price_per_kg ===
                        null ||
                      product.selling_price_per_kg ===
                        undefined
                        ? "Selling Price Not Set"
                        : "Selling Price Set"
                    }
                  />
                )}
              </DetailSection>


              {/* ============================================
                  RECORD INFORMATION
              ============================================ */}

              <DetailSection
                title="Record Information"
              >
                <DetailItem
                  label="Date Added"
                  value={
                    formatDateTime(
                      product.created_at
                    )
                  }
                />

                <DetailItem
                  label="Last Updated"
                  value={
                    formatDateTime(
                      product.updated_at
                    )
                  }
                />
              </DetailSection>

            </div>
          )}

        </div>


        {/* ==================================================
            FOOTER ACTIONS
            NO CLOSE BUTTON
        ================================================== */}

        {!isLoading &&
          product && (
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

              {/* ============================================
                  ACTIVE ACTIONS
              ============================================ */}

              {isActive && (
                <>
                  <button
                    type="button"
                    onClick={
                      () =>
                        onArchive?.(
                          product
                        )
                    }
                    disabled={
                      isChangingStatus
                    }
                    className="
                      rounded-lg
                      bg-orange-500
                      px-5
                      py-2.5
                      text-sm
                      font-semibold
                      text-white
                      transition
                      hover:bg-orange-600
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                  >
                    Archive
                  </button>


                  <button
                    type="button"
                    onClick={
                      () =>
                        onEdit?.(
                          product
                        )
                    }
                    disabled={
                      isChangingStatus
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
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                  >
                    Edit Product
                  </button>
                </>
              )}


              {/* ============================================
                  ARCHIVED ACTION
              ============================================ */}

              {isArchived && (
                <button
                  type="button"
                  onClick={
                    () =>
                      onRestore?.(
                        product
                      )
                  }
                  disabled={
                    isChangingStatus
                  }
                  className="
                    inline-flex
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
                  {isChangingStatus ? (
                    <Loader2
                      size={15}
                      className="
                        animate-spin
                      "
                    />
                  ) : (
                    <RotateCcw
                      size={15}
                    />
                  )}

                  Restore
                </button>
              )}

            </div>
          )}

      </div>
    </div>,
    document.body
  );
}