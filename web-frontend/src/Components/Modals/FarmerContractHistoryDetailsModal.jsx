import {
  useEffect,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  Building2,
  CalendarDays,
  CheckCircle2,
  FileSignature,
  FileText,
  Loader2,
  MapPin,
  Package,
  Scale,
  X,
} from "lucide-react";


// ============================================================
// GRAINRISE
// FARMER > TRANSACTION HISTORY
// CONTRACT HISTORY DETAILS MODAL
// ============================================================
//
// PURPOSE:
//
// Read-only historical Contract Details.
//
// USED BY:
//
// Farmer
//   > Transaction History
//   > Contract History
//   > View Details
//
//
// IMPORTANT:
//
// - Separate from FarmerContractDetailsModal.jsx.
// - Current Contract actions are NOT available here.
// - No Message.
// - No E-Sign.
// - No Request to Void.
// - No Mark as Completed.
// - Historical data only.
// - Rendered using createPortal(..., document.body).
// - Covers navbar/sidebar/page.
// - Backdrop click does NOT close.
// - X and Escape close the modal.
// ============================================================


// ============================================================
// CONSTANTS
// ============================================================

const CONTRACT_STATUS_LABELS = {
  completed:
    "Completed",

  voided:
    "Voided",
};


const FULFILLMENT_STATUS_LABELS = {
  pending:
    "Pending",

  partially_fulfilled:
    "Partially Fulfilled",

  fulfilled:
    "Fulfilled",
};


const SOURCE_LABELS = {
  posting_application:
    "Posting Application",

  bidding_offer:
    "Bidding Offer",
};


const FULFILLMENT_METHOD_LABELS = {
  buyer_pickup:
    "Buyer Pickup",

  farmer_delivery:
    "Farmer Delivery",
};


const PRODUCT_TYPE_LABELS = {
  unmilled_palay:
    "Unmilled Palay",

  milled_rice:
    "Milled Rice",
};


// ============================================================
// DISPLAY VALUE
// ============================================================

const displayValue = (
  value,
  fallback = "—"
) => {

  if (
    value === null
    ||
    value === undefined
    ||
    value === ""
  ) {
    return fallback;
  }


  const normalized =
    String(
      value
    ).trim();


  return (
    normalized
    ||
    fallback
  );

};


// ============================================================
// HUMANIZE
// ============================================================

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


// ============================================================
// FORMAT DATE
// ============================================================

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
// FORMAT DATE TIME
// ============================================================

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
// FORMAT QUANTITY
// ============================================================

const formatQuantity = (
  value
) => {

  const number =
    Number(
      value
    );


  if (
    !Number.isFinite(
      number
    )
  ) {
    return "—";
  }


  return `${new Intl.NumberFormat(
    "en-PH",
    {
      minimumFractionDigits:
        0,

      maximumFractionDigits:
        2,
    }
  ).format(
    number
  )} kg`;

};


// ============================================================
// FORMAT PESO
// ============================================================

const formatPeso = (
  value
) => {

  if (
    value === null
    ||
    value === undefined
    ||
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
    return "—";
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


// ============================================================
// BUILD FARM ADDRESS
// ============================================================

const buildFarmAddress = (
  contract
) => {

  const parts = [
    contract?.farm_street_address,
    contract?.farm_barangay,
    contract?.farm_municipality,
    contract?.farm_province,
    contract?.farm_postal_code,
  ]
    .map(
      (
        value
      ) =>
        String(
          value || ""
        ).trim()
    )
    .filter(
      Boolean
    );


  return (
    parts.join(
      ", "
    )
    ||
    "—"
  );

};


// ============================================================
// MILLER / BUSINESS NAME
// ============================================================

const getMillerBusinessName = (
  contract
) => {

  return (
    contract?.business_name
    ||
    contract?.organization_name
    ||
    contract?.miller_name
    ||
    "—"
  );

};


// ============================================================
// STATUS BADGE
// ============================================================

const ContractStatusBadge = ({
  status,
}) => {

  const styles = {

    completed:
      (
        "border-green-200 " +
        "bg-green-50 " +
        "text-green-700"
      ),

    voided:
      (
        "border-red-200 " +
        "bg-red-50 " +
        "text-red-700"
      ),

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
          styles[
            status
          ]
          ||
          "border-slate-200 bg-slate-100 text-slate-600"
        }
      `}
    >
      {
        CONTRACT_STATUS_LABELS[
          status
        ]
        ||
        humanize(
          status
        )
      }
    </span>

  );

};


// ============================================================
// FULFILLMENT STATUS BADGE
// ============================================================

const FulfillmentStatusBadge = ({
  status,
}) => {

  const styles = {

    pending:
      (
        "border-slate-200 " +
        "bg-slate-100 " +
        "text-slate-600"
      ),

    partially_fulfilled:
      (
        "border-amber-200 " +
        "bg-amber-50 " +
        "text-amber-700"
      ),

    fulfilled:
      (
        "border-green-200 " +
        "bg-green-50 " +
        "text-green-700"
      ),

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
          styles[
            status
          ]
          ||
          "border-slate-200 bg-slate-100 text-slate-600"
        }
      `}
    >
      {
        FULFILLMENT_STATUS_LABELS[
          status
        ]
        ||
        humanize(
          status
        )
      }
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
          {displayValue(
            value
          )}
        </p>

      )}

    </div>

  );

};


// ============================================================
// DETAIL SECTION
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
            <Icon
              size={17}
            />
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

export default function FarmerContractHistoryDetailsModal({
  open = false,
  contract = null,
  isLoading = false,
  onClose,
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


  // =========================================================
  // ESC KEY
  // =========================================================

  useEffect(
    () => {

      if (!open) {
        return undefined;
      }


      const handleKeyDown = (
        event
      ) => {

        if (
          event.key ===
          "Escape"
        ) {
          onClose?.();
        }

      };


      window.addEventListener(
        "keydown",
        handleKeyDown
      );


      return () => {

        window.removeEventListener(
          "keydown",
          handleKeyDown
        );

      };

    },
    [
      open,
      onClose,
    ]
  );


  // =========================================================
  // CLOSED
  // =========================================================

  if (!open) {
    return null;
  }


  // =========================================================
  // DERIVED VALUES
  // =========================================================

  const farmerSigned =
    Boolean(
      contract?.farmer_signed_at
      ||
      contract?.farmer_signature_path
    );


  const millerSigned =
    Boolean(
      contract?.miller_signed_at
      ||
      contract?.miller_signature_path
    );


  const farmAddress =
    buildFarmAddress(
      contract
    );


  const millerBusinessName =
    getMillerBusinessName(
      contract
    );


  const showVoidInformation =
    Boolean(
      contract?.contract_status ===
        "voided"
      ||
      contract?.void_requested_at
      ||
      contract?.void_reason
      ||
      contract?.void_remarks
    );


  // =========================================================
  // PORTAL
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
      role="presentation"
    >

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="farmer-contract-history-details-title"
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

        {/* ===================================================
            HEADER
        ==================================================== */}

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
                  id="farmer-contract-history-details-title"
                  className="
                    text-xl
                    font-bold
                    text-slate-900
                  "
                >
                  Contract History Details
                </h3>


                {contract && (

                  <ContractStatusBadge
                    status={
                      contract.contract_status
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
                {
                  contract?.contract_code
                    ? `Contract ID: ${contract.contract_code}`
                    : "Review this historical contract record."
                }
              </p>

            </div>

          </div>


          {/* =================================================
              X CLOSE
          ================================================== */}

          <button
            type="button"
            onClick={
              onClose
            }
            aria-label="Close contract history details"
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
              bg-white
              text-slate-400
              transition
              hover:bg-slate-50
              hover:text-slate-700
              focus:outline-none
              focus:ring-2
              focus:ring-slate-300
              focus:ring-offset-2
            "
          >
            <X
              size={18}
            />
          </button>

        </div>


        {/* ===================================================
            BODY
        ==================================================== */}

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

          {/* =================================================
              LOADING
          ================================================== */}

          {isLoading && (

            <div
              className="
                flex
                min-h-[360px]
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

                Loading contract history details...

              </div>

            </div>

          )}


          {/* =================================================
              EMPTY
          ================================================== */}

          {!isLoading
            &&
            !contract
            && (

            <div
              className="
                flex
                min-h-[360px]
                flex-col
                items-center
                justify-center
                rounded-xl
                border
                border-dashed
                border-slate-300
                bg-white
                px-6
                text-center
              "
            >

              <FileText
                size={28}
                className="text-slate-300"
              />


              <p
                className="
                  mt-3
                  font-semibold
                  text-slate-700
                "
              >
                Contract details are unavailable.
              </p>


              <p
                className="
                  mt-1
                  text-sm
                  text-slate-500
                "
              >
                The historical contract record could not be loaded.
              </p>

            </div>

          )}


          {/* =================================================
              CONTRACT DATA
          ================================================== */}

          {!isLoading
            &&
            contract
            && (

            <div className="space-y-5">

              {/* =============================================
                  CONTRACT INFORMATION
              ============================================== */}

              <DetailSection
                icon={
                  CalendarDays
                }
                title="Contract Information"
                description="General information about this historical contract."
              >

                <DetailItem
                  label="Contract ID"
                  value={
                    contract.contract_code
                  }
                />


                <DetailItem
                  label="Contract Status"
                >

                  <ContractStatusBadge
                    status={
                      contract.contract_status
                    }
                  />

                </DetailItem>


                <DetailItem
                  label="Contract Source"
                  value={
                    SOURCE_LABELS[
                      contract.contract_source
                    ]
                    ||
                    humanize(
                      contract.contract_source
                    )
                  }
                />


                <DetailItem
                  label="Contract Created"
                  value={
                    formatDateTime(
                      contract.created_at
                    )
                  }
                />


                <DetailItem
                  label="Contract Start Date"
                  value={
                    formatDate(
                      contract.contract_start_date
                    )
                  }
                />


                <DetailItem
                  label="Fulfillment Date"
                  value={
                    formatDate(
                      contract.fulfillment_date
                    )
                  }
                />


                <DetailItem
                  label="Last Updated"
                  value={
                    formatDateTime(
                      contract.updated_at
                    )
                  }
                />

              </DetailSection>


              {/* =============================================
                  MILLER INFORMATION
              ============================================== */}

              <DetailSection
                icon={
                  Building2
                }
                title="Miller / Buyer Information"
                description="Miller or buyer information associated with this contract."
              >

                <DetailItem
                  label="Miller / Buyer Name"
                  value={
                    contract.miller_name
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
                    contract.official_email
                  }
                />


                <DetailItem
                  label="Official Contact Number"
                  value={
                    contract.official_contact_number
                  }
                />

              </DetailSection>


              {/* =============================================
                  FARM INFORMATION
              ============================================== */}

              <DetailSection
                icon={
                  MapPin
                }
                title="Farm Information"
                description="Farm associated with the contracted product."
              >

                <DetailItem
                  label="Farm Name"
                  value={
                    contract.farm_name
                  }
                />


                <DetailItem
                  label="Farm Location"
                  value={
                    farmAddress
                  }
                  fullWidth
                />

              </DetailSection>


              {/* =============================================
                  PRODUCT INFORMATION
              ============================================== */}

              <DetailSection
                icon={
                  Package
                }
                title="Product Information"
              >

                <DetailItem
                  label="Product Code"
                  value={
                    contract.product_code
                  }
                />


                <DetailItem
                  label="Product Type"
                  value={
                    PRODUCT_TYPE_LABELS[
                      contract.product_type
                    ]
                    ||
                    humanize(
                      contract.product_type
                    )
                  }
                />


                <DetailItem
                  label="Rice Variety"
                  value={
                    contract.rice_variety
                  }
                />


                <DetailItem
                  label="Product Grade"
                  value={
                    contract.product_grade
                  }
                />


                <DetailItem
                  label="Product Description"
                  value={
                    contract.product_description
                  }
                  fullWidth
                />

              </DetailSection>


              {/* =============================================
                  AGREED CONTRACT DETAILS
              ============================================== */}

              <DetailSection
                icon={
                  FileText
                }
                title="Agreed Contract Details"
                description="Final quantity, pricing, and terms agreed by both parties."
              >

                <DetailItem
                  label="Contracted Quantity"
                  value={
                    formatQuantity(
                      contract.contracted_quantity_kg
                    )
                  }
                />


                <DetailItem
                  label="Agreed Price"
                  value={
                    contract.agreed_price_per_kg
                      ? `${formatPeso(
                          contract.agreed_price_per_kg
                        )} / kg`
                      : "—"
                  }
                />


                <DetailItem
                  label="Total Contract Value"
                  value={
                    formatPeso(
                      contract.total_contract_value
                    )
                  }
                />


                <DetailItem
                  label="Agreed Terms"
                  value={
                    contract.agreed_terms
                  }
                  fullWidth
                />

              </DetailSection>


              {/* =============================================
                  FULFILLMENT INFORMATION
              ============================================== */}

              <DetailSection
                icon={
                  Scale
                }
                title="Fulfillment Information"
                description="Final fulfillment information recorded for this contract."
              >

                <DetailItem
                  label="Fulfillment Method"
                  value={
                    FULFILLMENT_METHOD_LABELS[
                      contract.fulfillment_method
                    ]
                    ||
                    humanize(
                      contract.fulfillment_method
                    )
                  }
                />


                <DetailItem
                  label="Fulfillment Status"
                >

                  <FulfillmentStatusBadge
                    status={
                      contract.fulfillment_status
                    }
                  />

                </DetailItem>


                <DetailItem
                  label="Fulfillment Location"
                  value={
                    contract.fulfillment_location
                  }
                  fullWidth
                />


                <DetailItem
                  label="Quantity Fulfilled"
                  value={
                    formatQuantity(
                      contract.quantity_fulfilled_kg
                    )
                  }
                />


                <DetailItem
                  label="Remaining Quantity"
                  value={
                    formatQuantity(
                      contract.remaining_quantity_kg
                    )
                  }
                />

              </DetailSection>


              {/* =============================================
                  ELECTRONIC SIGNATURES
              ============================================== */}

              <DetailSection
                icon={
                  FileSignature
                }
                title="Electronic Signatures"
                description="Recorded signature status of both parties."
              >

                <DetailItem
                  label="Farmer Signature"
                  value={
                    farmerSigned
                      ? "Signed"
                      : "Not Signed"
                  }
                />


                <DetailItem
                  label="Farmer Signed At"
                  value={
                    formatDateTime(
                      contract.farmer_signed_at
                    )
                  }
                />


                <DetailItem
                  label="Miller Signature"
                  value={
                    millerSigned
                      ? "Signed"
                      : "Not Signed"
                  }
                />


                <DetailItem
                  label="Miller Signed At"
                  value={
                    formatDateTime(
                      contract.miller_signed_at
                    )
                  }
                />

              </DetailSection>


              {/* =============================================
                  COMPLETED INDICATOR
              ============================================== */}

              {contract.contract_status ===
                "completed" && (

                <div
                  className="
                    flex
                    items-start
                    gap-3
                    rounded-xl
                    border
                    border-green-200
                    bg-green-50
                    px-4
                    py-3
                  "
                >

                  <CheckCircle2
                    size={18}
                    className="
                      mt-0.5
                      shrink-0
                      text-green-700
                    "
                  />


                  <div>

                    <p
                      className="
                        text-sm
                        font-semibold
                        text-green-800
                      "
                    >
                      Contract Completed
                    </p>


                    <p
                      className="
                        mt-0.5
                        text-xs
                        leading-5
                        text-green-700
                      "
                    >
                      This contract is already part of your historical contract records.
                    </p>

                  </div>

                </div>

              )}


              {/* =============================================
                  VOID INFORMATION
              ============================================== */}

              {showVoidInformation && (

                <DetailSection
                  icon={
                    FileText
                  }
                  title="Void Information"
                  description="Recorded information related to the voided contract."
                >

                  <DetailItem
                    label="Requested By"
                    value={
                      humanize(
                        contract.void_requested_by
                      )
                    }
                  />


                  <DetailItem
                    label="Requested At"
                    value={
                      formatDateTime(
                        contract.void_requested_at
                      )
                    }
                  />


                  <DetailItem
                    label="Void Reason"
                    value={
                      contract.void_reason
                    }
                    fullWidth
                  />


                  <DetailItem
                    label="Remarks"
                    value={
                      contract.void_remarks
                    }
                    fullWidth
                  />

                </DetailSection>

              )}

            </div>

          )}

        </div>

      </div>

    </div>,
    document.body
  );

}