import {
  useEffect,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  Building2,
  CalendarDays,
  FileText,
  ImageOff,
  Loader2,
  MapPin,
  MessageSquare,
  Package,
  Send,
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
    String(value).trim();

  return normalized || fallback;
};


const formatDate = (
  value
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return displayValue(value);
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
    (character) =>
      character.toUpperCase()
  );
};


const buildAddress = ({
  street,
  barangay,
  municipality,
  province,
  postalCode,
}) => {
  const parts = [
    street,
    barangay,
    municipality,
    province,
    postalCode,
  ]
    .map(
      (value) =>
        String(
          value || ""
        ).trim()
    )
    .filter(Boolean);

  return (
    parts.join(", ") ||
    "—"
  );
};


// ============================================================
// DETAIL ITEM
// ============================================================

const DetailItem = ({
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
        {displayValue(value)}
      </p>
    </div>
  );
};


// ============================================================
// SECTION
// ============================================================

const DetailSection = ({
  icon: Icon,
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
          flex
          items-start
          gap-3
          border-b
          border-slate-100
          bg-slate-50/70
          px-4
          py-3
        "
      >
        {Icon && (
          <div
            className="
              mt-0.5
              text-green-700
            "
          >
            <Icon size={17} />
          </div>
        )}

        <div>
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

export default function FarmerContractOpportunityDetailsModal({
  open,
  opportunity,

  isLoading = false,
  error = "",

  onClose,
  onApply,
  onMessage,
}) {

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


  if (!open) {
    return null;
  }


  // ==========================================================
  // DERIVED
  // ==========================================================

  const businessName =
    opportunity?.business_name ||
    opportunity?.organization_name ||
    "—";


  const businessAddress =
    buildAddress({
      street:
        opportunity?.business_street_address,

      barangay:
        opportunity?.business_barangay,

      municipality:
        opportunity?.business_municipality,

      province:
        opportunity?.business_province,

      postalCode:
        opportunity?.business_postal_code,
    });


  const fulfillmentAddress =
    buildAddress({
      street:
        opportunity?.fulfillment_street_address,

      barangay:
        opportunity?.fulfillment_barangay,

      municipality:
        opportunity?.fulfillment_municipality,

      province:
        opportunity?.fulfillment_province,

      postalCode:
        opportunity?.fulfillment_postal_code,
    });


  const hasActiveApplication =
    Boolean(
      opportunity?.has_active_application
    );


  const canApply =
    opportunity?.posting_status ===
      "open" &&
    !hasActiveApplication;


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
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="farmer-opportunity-details-title"
        className="
          flex
          max-h-[92vh]
          w-full
          max-w-5xl
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
              <FileText
                size={20}
              />
            </div>


            <div
              className="
                min-w-0
              "
            >
              <div
                className="
                  flex
                  flex-wrap
                  items-center
                  gap-2
                "
              >
                <h3
                  id="farmer-opportunity-details-title"
                  className="
                    text-xl
                    font-bold
                    text-slate-900
                  "
                >
                  Opportunity Details
                </h3>


                {opportunity && (
                  <span
                    className="
                      rounded-full
                      border
                      border-green-200
                      bg-green-50
                      px-2.5
                      py-1
                      text-xs
                      font-bold
                      text-green-700
                    "
                  >
                    {humanize(
                      opportunity.posting_status
                    )}
                  </span>
                )}

              </div>


              <p
                className="
                  mt-1
                  text-sm
                  text-slate-500
                "
              >
                {opportunity
                  ?.posting_code
                  ? `Opportunity ID: ${opportunity.posting_code}`
                  : "Review the Miller's procurement requirements."}
              </p>

            </div>
          </div>


          <button
            type="button"
            onClick={onClose}
            aria-label="Close opportunity details"
            className="
              rounded-lg
              p-2
              text-slate-500
              transition
              hover:bg-slate-100
              hover:text-slate-700
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
            overflow-y-auto
            bg-slate-50/40
            px-5
            py-5
            sm:px-6
          "
        >

          {/* LOADING */}

          {isLoading && (
            <div
              className="
                flex
                min-h-[300px]
                items-center
                justify-center
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-2
                  text-sm
                  font-medium
                  text-slate-500
                "
              >
                <Loader2
                  size={18}
                  className="animate-spin"
                />

                Loading opportunity details...
              </div>
            </div>
          )}


          {/* ERROR */}

          {!isLoading &&
            error && (
              <div
                className="
                  rounded-xl
                  border
                  border-red-200
                  bg-red-50
                  p-4
                  text-sm
                  text-red-700
                "
              >
                {error}
              </div>
            )}


          {/* NO DATA */}

          {!isLoading &&
            !error &&
            !opportunity && (
              <div
                className="
                  rounded-xl
                  border
                  border-dashed
                  border-slate-300
                  bg-white
                  p-10
                  text-center
                "
              >
                <p
                  className="
                    font-semibold
                    text-slate-700
                  "
                >
                  Opportunity details are unavailable.
                </p>
              </div>
            )}


          {/* DATA */}

          {!isLoading &&
            !error &&
            opportunity && (
              <div
                className="
                  space-y-5
                "
              >

                {/* ==========================================
                    PRODUCT HERO
                ========================================== */}

                <section
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
                  {opportunity.product_image ? (
                    <img
                      src={
                        opportunity.product_image
                      }
                      alt={
                        opportunity.rice_variety ||
                        "Rice opportunity"
                      }
                      className="
                        h-36
                        w-full
                        shrink-0
                        rounded-xl
                        border
                        border-slate-200
                        bg-white
                        object-cover
                        sm:w-40
                      "
                    />
                  ) : (
                    <div
                      className="
                        flex
                        h-36
                        w-full
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        border
                        border-slate-200
                        bg-white
                        text-slate-400
                        sm:w-40
                      "
                    >
                      <ImageOff
                        size={26}
                      />
                    </div>
                  )}


                  <div
                    className="
                      flex
                      flex-1
                      flex-col
                      justify-center
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
                      {humanize(
                        opportunity.product_type
                      )}
                    </p>


                    <h4
                      className="
                        mt-1
                        text-xl
                        font-bold
                        text-slate-900
                      "
                    >
                      {displayValue(
                        opportunity.rice_variety
                      )}
                    </h4>


                    <p
                      className="
                        mt-1
                        text-sm
                        text-slate-500
                      "
                    >
                      Grade:{" "}
                      <span
                        className="
                          font-semibold
                          text-slate-700
                        "
                      >
                        {displayValue(
                          opportunity.product_grade
                        )}
                      </span>
                    </p>


                    {opportunity.product_description && (
                      <p
                        className="
                          mt-3
                          max-w-2xl
                          text-sm
                          leading-6
                          text-slate-600
                        "
                      >
                        {opportunity.product_description}
                      </p>
                    )}

                  </div>
                </section>


                {/* ==========================================
                    MILLER
                ========================================== */}

                <DetailSection
                  icon={Building2}
                  title="Miller / Buyer Information"
                  description="Business information of the organization that published this opportunity."
                >
                  <DetailItem
                    label="Miller / Buyer Name"
                    value={
                      opportunity.miller_name
                    }
                  />

                  <DetailItem
                    label="Business / Organization"
                    value={
                      businessName
                    }
                  />

                  <DetailItem
                    label="Official Email"
                    value={
                      opportunity.official_email
                    }
                  />

                  <DetailItem
                    label="Official Contact Number"
                    value={
                      opportunity.official_contact_number
                    }
                  />

                  <DetailItem
                    label="Business Location"
                    value={
                      businessAddress
                    }
                    fullWidth
                  />
                </DetailSection>


                {/* ==========================================
                    PROCUREMENT
                ========================================== */}

                <DetailSection
                  icon={Package}
                  title="Procurement Requirements"
                  description="Product, quantity, and pricing requirements for this opportunity."
                >
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
                    label="Product Grade"
                    value={
                      opportunity.product_grade
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
                </DetailSection>


                {/* ==========================================
                    DATES
                ========================================== */}

                <DetailSection
                  icon={CalendarDays}
                  title="Important Dates"
                >
                  <DetailItem
                    label="Application Deadline"
                    value={
                      formatDate(
                        opportunity.application_deadline
                      )
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
                </DetailSection>


                {/* ==========================================
                    FULFILLMENT
                ========================================== */}

                <DetailSection
                  icon={MapPin}
                  title="Fulfillment Information"
                >
                  <DetailItem
                    label="Fulfillment Method"
                    value={
                      humanize(
                        opportunity.fulfillment_method
                      )
                    }
                  />

                  <DetailItem
                    label="Fulfillment Location"
                    value={
                      fulfillmentAddress
                    }
                  />
                </DetailSection>


                {/* ==========================================
                    TERMS
                ========================================== */}

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
                      Proposed Deal / Terms
                    </h4>
                  </div>


                  <div
                    className="
                      space-y-5
                      p-4
                    "
                  >
                    <div>
                      <p
                        className="
                          text-xs
                          font-medium
                          text-slate-400
                        "
                      >
                        Terms
                      </p>

                      <div
                        className="
                          mt-1.5
                          min-h-[80px]
                          whitespace-pre-wrap
                          rounded-lg
                          border
                          border-slate-200
                          bg-slate-50
                          p-3
                          text-sm
                          leading-6
                          text-slate-700
                        "
                      >
                        {displayValue(
                          opportunity.proposed_deal_terms,
                          "No additional deal terms provided."
                        )}
                      </div>
                    </div>


                    <div>
                      <p
                        className="
                          text-xs
                          font-medium
                          text-slate-400
                        "
                      >
                        Additional Notes to Farmers
                      </p>

                      <div
                        className="
                          mt-1.5
                          min-h-[80px]
                          whitespace-pre-wrap
                          rounded-lg
                          border
                          border-slate-200
                          bg-slate-50
                          p-3
                          text-sm
                          leading-6
                          text-slate-700
                        "
                      >
                        {displayValue(
                          opportunity.additional_notes_to_farmers,
                          "No additional notes provided."
                        )}
                      </div>
                    </div>

                  </div>
                </section>


                {/* ==========================================
                    ALREADY APPLIED
                ========================================== */}

                {hasActiveApplication && (
                  <div
                    className="
                      rounded-xl
                      border
                      border-blue-200
                      bg-blue-50
                      px-4
                      py-3
                    "
                  >
                    <p
                      className="
                        text-sm
                        font-semibold
                        text-blue-800
                      "
                    >
                      You already have an active application for this opportunity.
                    </p>

                    <p
                      className="
                        mt-1
                        text-xs
                        leading-5
                        text-blue-700
                      "
                    >
                      You can review its progress from the Applications tab.
                    </p>
                  </div>
                )}

              </div>
            )}

        </div>


        {/* ==================================================
            FOOTER
        ================================================== */}

        <div
          className="
            flex
            shrink-0
            flex-wrap
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

          {opportunity &&
            onMessage && (
              <button
                type="button"
                onClick={onMessage}
                className="
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  rounded-lg
                  border
                  border-green-600
                  bg-white
                  px-4
                  py-2.5
                  text-sm
                  font-semibold
                  text-green-700
                  transition
                  hover:bg-green-50
                "
              >
                <MessageSquare
                  size={16}
                />

                Message Miller / Buyer
              </button>
            )}


          {canApply && (
            <button
              type="button"
              onClick={onApply}
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
              "
            >
              <Send size={16} />

              Apply
            </button>
          )}


          <button
            type="button"
            onClick={onClose}
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
            "
          >
            Close
          </button>

        </div>

      </div>
    </div>,
    document.body
  );
}