import {
  useEffect,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  Building2,
  CalendarDays,
  Download,
  FileSignature,
  FileText,
  Loader2,
  MapPin,
  MessageSquare,
  Package,
  X,
} from "lucide-react";


// ============================================================
// CONSTANTS
// ============================================================

const CONTRACT_STATUS_LABELS = {
  active: "Active",
  void_requested: "Void Requested",
  completed: "Completed",
  voided: "Voided",
};


const FULFILLMENT_STATUS_LABELS = {
  pending: "Pending",
  partially_fulfilled:
    "Partially Fulfilled",
  fulfilled: "Fulfilled",
};


const SOURCE_LABELS = {
  posting_application:
    "Posting Application",

  bidding_offer:
    "Bidding Offer",
};


const FULFILLMENT_METHOD_LABELS = {
  buyer_pickup: "Buyer Pickup",
  farmer_delivery: "Farmer Delivery",
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


const buildBusinessAddress = (
  contract
) => {
  const parts = [
    contract?.business_street_address,
    contract?.business_barangay,
    contract?.business_municipality,
    contract?.business_province,
    contract?.business_postal_code,
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
// CONTRACT STATUS
// ============================================================

const ContractStatusBadge = ({
  status,
}) => {
  const styles = {
    active:
      "border-green-200 bg-green-50 text-green-700",

    void_requested:
      "border-amber-200 bg-amber-50 text-amber-700",

    completed:
      "border-blue-200 bg-blue-50 text-blue-700",

    voided:
      "border-red-200 bg-red-50 text-red-700",
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
          "border-slate-200 bg-slate-100 text-slate-600"
        }
      `}
    >
      {CONTRACT_STATUS_LABELS[
        status
      ] || humanize(status)}
    </span>
  );
};


// ============================================================
// FULFILLMENT STATUS
// ============================================================

const FulfillmentStatusBadge = ({
  status,
}) => {
  const styles = {
    pending:
      "border-slate-200 bg-slate-100 text-slate-600",

    partially_fulfilled:
      "border-amber-200 bg-amber-50 text-amber-700",

    fulfilled:
      "border-green-200 bg-green-50 text-green-700",
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
          "border-slate-200 bg-slate-100 text-slate-600"
        }
      `}
    >
      {FULFILLMENT_STATUS_LABELS[
        status
      ] || humanize(status)}
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

export default function FarmerContractDetailsModal({
  open,
  contract,

  isLoading = false,
  error = "",

  onClose,
  onMessage,
  onRequestVoid,
  onDownload,

  // Ready for later backend support.
  onSign,
  onMarkCompleted,
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
    contract?.contract_status;


  const isActive =
    status === "active";


  const farmerSigned =
    Boolean(
      contract?.farmer_signature_path
    );


  const millerSigned =
    Boolean(
      contract?.miller_signature_path
    );


  const canRequestVoid =
    isActive &&
    Boolean(
      onRequestVoid
    );


  const canSign =
    isActive &&
    !farmerSigned &&
    Boolean(onSign);


  const canMarkCompleted =
    isActive &&
    contract?.fulfillment_status ===
      "fulfilled" &&
    Boolean(
      onMarkCompleted
    );


  const millerBusinessName =
    contract?.business_name ||
    contract?.organization_name ||
    "—";


  const businessAddress =
    buildBusinessAddress(
      contract
    );


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
        aria-labelledby="farmer-current-contract-details-title"
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
                  id="farmer-current-contract-details-title"
                  className="
                    text-xl
                    font-bold
                    text-slate-900
                  "
                >
                  Current Contract Details
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
                {contract?.contract_code
                  ? `Contract ID: ${contract.contract_code}`
                  : "Review the complete contract information."}
              </p>
            </div>
          </div>


          <button
            type="button"
            onClick={onClose}
            aria-label="Close contract details"
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

                Loading contract details...
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
            !contract && (
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
                  Contract details are unavailable.
                </p>
              </div>
            )}


          {/* DATA */}

          {!isLoading &&
            !error &&
            contract && (
              <div
                className="
                  space-y-5
                "
              >

                {/* ==========================================
                    CONTRACT INFORMATION
                ========================================== */}

                <DetailSection
                  icon={FileText}
                  title="Contract Information"
                  description="General information and origin of this contract."
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
                      ] ||
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
                </DetailSection>


                {/* ==========================================
                    MILLER
                ========================================== */}

                <DetailSection
                  icon={Building2}
                  title="Miller / Buyer Information"
                  description="Business information of the Miller participating in this contract."
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


                  <DetailItem
                    label="Business Location"
                    value={
                      businessAddress
                    }
                    fullWidth
                  />
                </DetailSection>


                {/* ==========================================
                    PRODUCT
                ========================================== */}

                <DetailSection
                  icon={Package}
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
                      contract.product_description ||
                      contract.description
                    }
                    fullWidth
                  />
                </DetailSection>


                {/* ==========================================
                    AGREED CONTRACT
                ========================================== */}

                <DetailSection
                  icon={FileText}
                  title="Agreed Contract Details"
                  description="Final quantity and pricing agreed by both parties."
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


                {/* ==========================================
                    FULFILLMENT
                ========================================== */}

                <DetailSection
                  icon={MapPin}
                  title="Fulfillment Information"
                  description="Current fulfillment progress of this contract."
                >
                  <DetailItem
                    label="Fulfillment Method"
                    value={
                      FULFILLMENT_METHOD_LABELS[
                        contract.fulfillment_method
                      ] ||
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


                  <DetailItem
                    label="Fulfillment Date"
                    value={
                      formatDate(
                        contract.fulfillment_date
                      )
                    }
                  />
                </DetailSection>


                {/* ==========================================
                    SIGNATURES
                ========================================== */}

                <DetailSection
                  icon={FileSignature}
                  title="Electronic Signatures"
                  description="Signature status of both parties."
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


                {/* ==========================================
                    VOID REQUEST
                ========================================== */}

                {contract.contract_status ===
                  "void_requested" && (
                  <DetailSection
                    title="Void Request"
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
                      label="Reason"
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

          {/* DOWNLOAD */}

          {contract &&
            onDownload && (
              <button
                type="button"
                onClick={onDownload}
                className="
                  inline-flex
                  items-center
                  justify-center
                  gap-2
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
                <Download
                  size={16}
                />

                Download Copy
              </button>
            )}


          {/* MESSAGE */}

          {contract &&
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


          {/* FUTURE E-SIGN */}

          {canSign && (
            <button
              type="button"
              onClick={onSign}
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
              <FileSignature
                size={16}
              />

              E-Sign Contract
            </button>
          )}


          {/* FUTURE MARK COMPLETED */}

          {canMarkCompleted && (
            <button
              type="button"
              onClick={
                onMarkCompleted
              }
              className="
                rounded-lg
                bg-blue-600
                px-4
                py-2.5
                text-sm
                font-semibold
                text-white
                transition
                hover:bg-blue-700
              "
            >
              Mark as Completed
            </button>
          )}


          {/* REQUEST VOID */}

          {canRequestVoid && (
            <button
              type="button"
              onClick={
                onRequestVoid
              }
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
              "
            >
              Request to Void
            </button>
          )}


          {/* CLOSE */}

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