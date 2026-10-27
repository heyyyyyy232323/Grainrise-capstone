import {
  useEffect,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  Building2,
  FileText,
  Loader2,
  MessageSquare,
  Package,
  X,
} from "lucide-react";


// ============================================================
// CONSTANTS
// ============================================================

const OFFER_STATUS_LABELS = {
  submitted: "Submitted",
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "Withdrawn",
};


const FULFILLMENT_LABELS = {
  buyer_pickup: "Buyer Pickup",
  farmer_delivery: "Farmer Delivery",
};


const PRODUCT_TYPE_LABELS = {
  unmilled_palay: "Unmilled Palay",
  milled_rice: "Milled Rice",
};


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


const buildAddress = ({
  street,
  barangay,
  municipality,
  province,
  postalCode,
}) => {
  const values = [
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
    values.join(", ") ||
    "—"
  );
};


// ============================================================
// STATUS BADGE
// ============================================================

const OfferStatusBadge = ({
  status,
}) => {
  const styles = {
    submitted:
      "border-amber-200 bg-amber-50 text-amber-700",

    accepted:
      "border-green-200 bg-green-50 text-green-700",

    declined:
      "border-red-200 bg-red-50 text-red-700",

    withdrawn:
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
      {OFFER_STATUS_LABELS[
        status
      ] || displayValue(status)}
    </span>
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

export default function FarmerContractOfferDetailsModal({
  open,
  offer,

  isLoading = false,
  isSaving = false,
  error = "",

  onClose,
  onMessage,
  onDecline,
  onAccept,
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
  // DERIVED DATA
  // ==========================================================

  const offerStatus =
    offer?.offer_status;


  const biddingStatus =
    offer?.bidding_status;


  const canRespond =
    offerStatus === "submitted" &&
    biddingStatus === "open";


  const millerBusinessName =
    offer?.business_name ||
    offer?.organization_name ||
    "—";


  const millerAddress =
    buildAddress({
      street:
        offer?.business_street_address,

      barangay:
        offer?.business_barangay,

      municipality:
        offer?.business_municipality,

      province:
        offer?.business_province,

      postalCode:
        offer?.business_postal_code,
    });


  // ==========================================================
  // CLOSE
  // ==========================================================

  const handleClose = () => {
    if (isSaving) {
      return;
    }

    onClose?.();
  };


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
        aria-labelledby="farmer-contract-offer-details-title"
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
              <FileText size={20} />
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
                  id="farmer-contract-offer-details-title"
                  className="
                    text-xl
                    font-bold
                    text-slate-900
                  "
                >
                  Offer Details
                </h3>

                {offer && (
                  <OfferStatusBadge
                    status={
                      offer.offer_status
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
                {offer?.offer_code
                  ? `Offer ID: ${offer.offer_code}`
                  : "Review the Miller's submitted offer."}
              </p>
            </div>
          </div>


          <button
            type="button"
            disabled={isSaving}
            onClick={handleClose}
            aria-label="Close offer details"
            className="
              rounded-lg
              p-2
              text-slate-500
              transition
              hover:bg-slate-100
              hover:text-slate-700
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

                Loading offer details...
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


          {/* EMPTY */}

          {!isLoading &&
            !error &&
            !offer && (
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
                  Offer details are unavailable.
                </p>
              </div>
            )}


          {/* DATA */}

          {!isLoading &&
            !error &&
            offer && (
              <div
                className="
                  space-y-5
                "
              >

                {/* ==========================================
                    OFFER INFORMATION
                ========================================== */}

                <DetailSection
                  icon={FileText}
                  title="Offer Information"
                  description="The price, quantity, and fulfillment proposed by the Miller."
                >
                  <DetailItem
                    label="Offer ID"
                    value={
                      offer.offer_code
                    }
                  />

                  <DetailItem
                    label="Offer Status"
                    value={
                      OFFER_STATUS_LABELS[
                        offer.offer_status
                      ] ||
                      offer.offer_status
                    }
                  />

                  <DetailItem
                    label="Offer Date"
                    value={
                      formatDateTime(
                        offer.offer_date ||
                        offer.created_at
                      )
                    }
                  />

                  <DetailItem
                    label="Offered Buying Price"
                    value={
                      offer.offered_buying_price_per_kg
                        ? `${formatPeso(
                            offer.offered_buying_price_per_kg
                          )} / kg`
                        : "—"
                    }
                  />

                  <DetailItem
                    label="Offered Quantity"
                    value={
                      formatQuantity(
                        offer.offered_quantity_kg
                      )
                    }
                  />

                  <DetailItem
                    label="Estimated Offer Value"
                    value={
                      formatPeso(
                        offer.estimated_offer_value
                      )
                    }
                  />

                  <DetailItem
                    label="Proposed Fulfillment Date"
                    value={
                      formatDate(
                        offer.proposed_fulfillment_date
                      )
                    }
                  />

                  <DetailItem
                    label="Fulfillment Method"
                    value={
                      FULFILLMENT_LABELS[
                        offer.fulfillment_method
                      ] ||
                      displayValue(
                        offer.fulfillment_method
                      )
                    }
                  />

                </DetailSection>


                {/* ==========================================
                    MILLER / BUYER
                ========================================== */}

                <DetailSection
                  icon={Building2}
                  title="Miller / Buyer Information"
                  description="Business information of the Miller who submitted this offer."
                >
                  <DetailItem
                    label="Miller / Buyer Name"
                    value={
                      offer.miller_name
                    }
                  />

                  <DetailItem
                    label="Business / Organization"
                    value={
                      millerBusinessName
                    }
                  />

                  <DetailItem
                    label="Official Email"
                    value={
                      offer.official_email
                    }
                  />

                  <DetailItem
                    label="Official Contact Number"
                    value={
                      offer.official_contact_number
                    }
                  />

                  <DetailItem
                    label="Business Location"
                    value={
                      millerAddress
                    }
                    fullWidth
                  />

                </DetailSection>


                {/* ==========================================
                    BIDDING / PRODUCT
                ========================================== */}

                <DetailSection
                  icon={Package}
                  title="Bidding Information"
                  description="The Farmer bidding this offer was submitted to."
                >
                  <DetailItem
                    label="Bidding ID"
                    value={
                      offer.bidding_code
                    }
                  />

                  <DetailItem
                    label="Bidding Status"
                    value={
                      displayValue(
                        offer.bidding_status
                      )
                        .replaceAll(
                          "_",
                          " "
                        )
                        .replace(
                          /\b\w/g,
                          (
                            character
                          ) =>
                            character.toUpperCase()
                        )
                    }
                  />

                  <DetailItem
                    label="Product Type"
                    value={
                      PRODUCT_TYPE_LABELS[
                        offer.product_type
                      ] ||
                      displayValue(
                        offer.product_type
                      )
                    }
                  />

                  <DetailItem
                    label="Rice Variety"
                    value={
                      offer.rice_variety
                    }
                  />

                  <DetailItem
                    label="Product Grade"
                    value={
                      offer.product_grade
                    }
                  />

                  <DetailItem
                    label="Quantity Open for Bidding"
                    value={
                      formatQuantity(
                        offer.quantity_open_for_bidding_kg
                      )
                    }
                  />

                  <DetailItem
                    label="Minimum Acceptable Price"
                    value={
                      offer.minimum_acceptable_price_per_kg
                        ? `${formatPeso(
                            offer.minimum_acceptable_price_per_kg
                          )} / kg`
                        : "Not Set"
                    }
                  />

                  <DetailItem
                    label="Expected Availability Date"
                    value={
                      formatDate(
                        offer.expected_availability_date
                      )
                    }
                  />

                  <DetailItem
                    label="Bidding Deadline"
                    value={
                      formatDateTime(
                        offer.bidding_deadline
                      )
                    }
                  />

                  <DetailItem
                    label="Preferred Fulfillment Date"
                    value={
                      formatDate(
                        offer.preferred_fulfillment_date
                      )
                    }
                  />

                </DetailSection>


                {/* ==========================================
                    PROPOSED TERMS
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
                        Proposed Terms
                      </p>

                      <div
                        className="
                          mt-1.5
                          min-h-[70px]
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
                          offer.proposed_terms,
                          "No proposed terms provided."
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
                        Additional Notes to Farmer
                      </p>

                      <div
                        className="
                          mt-1.5
                          min-h-[70px]
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
                          offer.additional_notes_to_farmer,
                          "No additional notes provided."
                        )}
                      </div>
                    </div>
                  </div>
                </section>


                {/* ==========================================
                    MILLER E-SIGNATURE
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
                      Miller E-Signature
                    </h4>
                  </div>


                  <div
                    className="
                      grid
                      gap-4
                      p-4
                      sm:grid-cols-2
                    "
                  >
                    <DetailItem
                      label="Signature Status"
                      value={
                        offer.miller_signature_path
                          ? "Signed"
                          : "Not Signed"
                      }
                    />

                    <DetailItem
                      label="Signed At"
                      value={
                        formatDateTime(
                          offer.miller_signed_at
                        )
                      }
                    />
                  </div>
                </section>

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

          {offer &&
            onMessage && (
              <button
                type="button"
                disabled={isSaving}
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
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                <MessageSquare
                  size={16}
                />

                Message Miller / Buyer
              </button>
            )}


          {canRespond && (
            <>
              <button
                type="button"
                disabled={isSaving}
                onClick={onDecline}
                className="
                  rounded-lg
                  border
                  border-red-300
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
                Decline Offer
              </button>


              <button
                type="button"
                disabled={isSaving}
                onClick={onAccept}
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
                Accept Offer
              </button>
            </>
          )}


          <button
            type="button"
            disabled={isSaving}
            onClick={handleClose}
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
            Close
          </button>

        </div>

      </div>
    </div>,
    document.body
  );
}