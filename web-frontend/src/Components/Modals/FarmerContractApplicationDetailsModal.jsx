import {
  useEffect,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  FileText,
  ImageOff,
  Loader2,
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


const formatDateTime = (
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
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(date);
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
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return displayValue(value);
  }

  return new Intl.NumberFormat(
    "en-PH",
    {
      maximumFractionDigits: 2,
    }
  ).format(number);
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
    return displayValue(value);
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
// STATUS BADGE
// ============================================================

const ApplicationStatusBadge = ({
  status,
}) => {
  const styles = {
    pending:
      "border-amber-200 bg-amber-50 text-amber-700",

    under_review:
      "border-blue-200 bg-blue-50 text-blue-700",

    approved:
      "border-green-200 bg-green-50 text-green-700",

    declined:
      "border-red-200 bg-red-50 text-red-700",

    cancelled:
      "border-slate-300 bg-slate-100 text-slate-600",
  };


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
          styles[status] ||
          "border-slate-300 bg-slate-100 text-slate-600"
        }
      `}
    >
      {humanize(status)}
    </span>
  );
};


// ============================================================
// DETAIL ITEM
// ============================================================

const DetailItem = ({
  label,
  value,
  children,
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

      {children ? (
        <div className="mt-1.5">
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
          {displayValue(value)}
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
// COMPONENT
// ============================================================

export default function FarmerContractApplicationDetailsModal({
  open,
  application,
  isLoading = false,
  error = "",
  onClose,
  onCancel,
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

  const status =
    application?.application_status;




  const canCancel =
    status === "pending" || status === "under_review";


  const businessName =
    application?.business_name ||
    application?.organization_name ||
    "—";


  const businessAddress =
    buildAddress({
      street:
        application?.business_street_address,

      barangay:
        application?.business_barangay,

      municipality:
        application?.business_municipality,

      province:
        application?.business_province,

      postalCode:
        application?.business_postal_code,
    });


  const farmAddress =
    buildAddress({
      street:
        application?.farm_street_address,

      barangay:
        application?.farm_barangay,

      municipality:
        application?.farm_municipality,

      province:
        application?.farm_province,

      postalCode:
        application?.farm_postal_code,
    });


  // ==========================================================
  // MODAL
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
        aria-labelledby="farmer-contract-application-details-title"
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
              <FileText size={20} />
            </div>


            <div className="min-w-0">

              <div
                className="
                  flex
                  flex-wrap
                  items-center
                  gap-2
                "
              >
                <h3
                  id="farmer-contract-application-details-title"
                  className="
                    text-xl
                    font-bold
                    text-slate-900
                  "
                >
                  Application Details
                </h3>

                {application && (
                  <ApplicationStatusBadge
                    status={
                      application.application_status
                    }
                  />
                )}

              </div>

              <p
                className="
                  mt-1
                  text-sm
                  text-slate-500
                "
              >
                Review your submitted application and opportunity information.
              </p>

            </div>
          </div>


          <button
            type="button"
            onClick={onClose}
            className="
              rounded-lg
              p-2
              text-slate-500
              transition
              hover:bg-slate-100
              hover:text-slate-700
            "
            aria-label="Close application details"
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
                min-h-[280px]
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

                Loading application details...
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
            !application && (
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
                  Application details are unavailable.
                </p>
              </div>
            )}


          {/* DATA */}

          {!isLoading &&
            !error &&
            application && (
              <div className="space-y-5">

                {/* ==========================================
                    APPLICATION INFORMATION
                ========================================== */}

                <DetailSection
                  title="Application Information"
                  description="Basic information about your submitted application."
                >
                  <DetailItem
                    label="Application ID"
                    value={
                      application.application_code
                    }
                  />

                  <DetailItem
                    label="Application Date"
                    value={
                      formatDate(
                        application.application_date
                      )
                    }
                  />

                  <DetailItem
                    label="Application Status"
                  >
                    <ApplicationStatusBadge
                      status={
                        application.application_status
                      }
                    />
                  </DetailItem>

                  <DetailItem
                    label="Farmer Signature"
                    value={
                      application.farmer_signature_path
                        ? "Signed"
                        : "Not Signed"
                    }
                  />

                  <DetailItem
                    label="Signed At"
                    value={
                      formatDateTime(
                        application.farmer_signed_at
                      )
                    }
                  />

                </DetailSection>


                {/* ==========================================
                    MILLER / BUYER
                ========================================== */}

                <DetailSection
                  title="Miller / Buyer Information"
                  description="Business information of the Miller connected to this opportunity."
                >
                  <DetailItem
                    label="Miller / Buyer Name"
                    value={
                      application.miller_name
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
                      application.official_email
                    }
                  />

                  <DetailItem
                    label="Official Contact Number"
                    value={
                      application.official_contact_number
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
                    OPPORTUNITY INFORMATION
                ========================================== */}

                <DetailSection
                  title="Opportunity Information"
                  description="Requirements published by the Miller for this procurement posting."
                >
                  <DetailItem
                    label="Opportunity ID"
                    value={
                      application.posting_code
                    }
                  />

                  <DetailItem
                    label="Required Product Type"
                    value={
                      humanize(
                        application.required_product_type
                      )
                    }
                  />

                  <DetailItem
                    label="Required Rice Variety"
                    value={
                      application.required_rice_variety
                    }
                  />

                  <DetailItem
                    label="Required Quantity"
                    value={
                      `${formatNumber(
                        application.required_quantity_kg
                      )} kg`
                    }
                  />

                  <DetailItem
                    label="Buying Price"
                    value={
                      application.buying_price_per_kg
                        ? `${formatPeso(
                            application.buying_price_per_kg
                          )} / kg`
                        : "—"
                    }
                  />

                  <DetailItem
                    label="Required Fulfillment Date"
                    value={
                      formatDate(
                        application.required_fulfillment_date
                      )
                    }
                  />

                  <DetailItem
                    label="Partial Quantity Allowed"
                    value={
                      application.partial_quantity_allowed
                        ? "Yes"
                        : "No"
                    }
                  />

                  <DetailItem
                    label="Price Negotiation Allowed"
                    value={
                      application.price_negotiation_allowed
                        ? "Yes"
                        : "No"
                    }
                  />

                  <DetailItem
                    label="Fulfillment Method"
                    value={
                      humanize(
                        application.fulfillment_method
                      )
                    }
                  />

                  <DetailItem
                    label="Proposed Deal Terms"
                    value={
                      application.proposed_deal_terms
                    }
                    fullWidth
                  />

                  <DetailItem
                    label="Notes from Miller"
                    value={
                      application.additional_notes_to_farmers
                    }
                    fullWidth
                  />

                </DetailSection>


                {/* ==========================================
                    FARMER PRODUCT
                ========================================== */}

                <DetailSection
                  title="Your Product Information"
                  description="Product and quantity you committed to this application."
                >

                  <div
                    className="
                      sm:col-span-2
                    "
                  >
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
                      "
                    >

                      {application.product_image ? (
                        <img
                          src={
                            application.product_image
                          }
                          alt={
                            application.rice_variety ||
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
                          <ImageOff size={24} />
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
                            application.product_code
                          }
                        />

                        <DetailItem
                          label="Rice Variety"
                          value={
                            application.rice_variety
                          }
                        />

                        <DetailItem
                          label="Product Type"
                          value={
                            humanize(
                              application.product_type
                            )
                          }
                        />

                        <DetailItem
                          label="Product Grade"
                          value={
                            application.product_grade
                          }
                        />

                        <DetailItem
                          label="Available Quantity"
                          value={
                            `${formatNumber(
                              application.available_quantity_kg
                            )} kg`
                          }
                        />

                      </div>

                    </div>
                  </div>


                  <DetailItem
                    label="Product Description"
                    value={
                      application.product_description
                    }
                    fullWidth
                  />

                </DetailSection>


                {/* ==========================================
                    FARM
                ========================================== */}

                <DetailSection
                  title="Source Farm"
                  description="Farm associated with the selected product."
                >
                  <DetailItem
                    label="Farm Name"
                    value={
                      application.farm_name
                    }
                  />

                  <DetailItem
                    label="Farm Location"
                    value={
                      farmAddress
                    }
                  />

                </DetailSection>


                {/* ==========================================
                    FARMER APPLICATION DETAILS
                ========================================== */}

                <DetailSection
                  title="Your Application"
                  description="The commitment and terms you submitted to the Miller."
                >
                  <DetailItem
                    label="Quantity to Commit"
                    value={
                      `${formatNumber(
                        application.quantity_to_commit_kg
                      )} kg`
                    }
                  />

                  <DetailItem
                    label="Expected Availability Date"
                    value={
                      formatDate(
                        application.expected_availability_date
                      )
                    }
                  />

                  <DetailItem
                    label="Proposed Selling Price"
                    value={
                      application.proposed_selling_price_per_kg
                        ? `${formatPeso(
                            application.proposed_selling_price_per_kg
                          )} / kg`
                        : "Not Proposed"
                    }
                  />

                  <DetailItem
                    label="Additional Notes"
                    value={
                      application.additional_notes_to_miller
                    }
                    fullWidth
                  />

                </DetailSection>


                {/* ==========================================
                    DECLINED
                ========================================== */}

                {status === "declined" && (
                  <DetailSection
                    title="Decline Information"
                  >
                    <DetailItem
                      label="Reason"
                      value={
                        application.decline_reason
                      }
                    />

                    <DetailItem
                      label="Declined At"
                      value={
                        formatDateTime(
                          application.declined_at
                        )
                      }
                    />

                    <DetailItem
                      label="Remarks"
                      value={
                        application.decline_remarks
                      }
                      fullWidth
                    />
                  </DetailSection>
                )}


                {/* ==========================================
                    CANCELLED
                ========================================== */}

                {status === "cancelled" && (
                  <DetailSection
                    title="Cancellation Information"
                  >
                    <DetailItem
                      label="Reason"
                      value={
                        application.cancellation_reason
                      }
                    />

                    <DetailItem
                      label="Cancelled At"
                      value={
                        formatDateTime(
                          application.cancelled_at
                        )
                      }
                    />

                    <DetailItem
                      label="Remarks"
                      value={
                        application.cancellation_remarks
                      }
                      fullWidth
                    />
                  </DetailSection>
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



          {canCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="
                rounded-lg
                border
                border-red-300
                px-4
                py-2.5
                text-sm
                font-semibold
                text-red-600
                transition
                hover:bg-red-50
              "
            >
              Cancel Application
            </button>
          )}


          <button
            type="button"
            onClick={onClose}
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