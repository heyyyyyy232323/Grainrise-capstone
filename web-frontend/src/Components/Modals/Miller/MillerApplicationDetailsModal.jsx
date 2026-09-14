import {
  useEffect,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  CheckCircle2,
  Loader2,
  MessageCircle,
  Send,
  X,
  XCircle,
} from "lucide-react";


const DECLINE_REASONS = [
  "Quantity does not meet requirement",
  "Product does not match requirement",
  "Availability date does not meet requirement",
  "Price or proposed terms are not acceptable",
  "Other",
];


const STATUS_STYLES = {
  pending:
    "bg-amber-100 text-amber-700",

  under_review:
    "bg-blue-100 text-blue-700",

  approved:
    "bg-emerald-100 text-emerald-700",

  declined:
    "bg-red-100 text-red-700",

  cancelled:
    "bg-slate-100 text-slate-600",
};


// ============================================================
// FORMATTERS
// ============================================================

function formatDate(
  value,
  includeTime = false
) {
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
    return String(value);
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      year: "numeric",
      month: "short",
      day: "numeric",

      ...(includeTime
        ? {
            hour: "numeric",
            minute: "2-digit",
          }
        : {}),
    }
  ).format(date);
}


function formatPeso(value) {
  if (
    value === null
    || value === undefined
    || value === ""
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
}


function formatQuantity(value) {
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
}


function titleCase(value) {
  return String(
    value || ""
  )
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}


function productTypeLabel(value) {
  if (
    value === "unmilled_palay"
  ) {
    return "Unmilled Palay";
  }

  if (
    value === "milled_rice"
  ) {
    return "Milled Rice";
  }

  return titleCase(value) || "—";
}


// ============================================================
// SMALL UI COMPONENTS
// ============================================================

function InfoItem({
  label,
  value,
}) {
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
          break-words
          text-sm
          font-semibold
          text-slate-800
        "
      >
        {value || "—"}
      </p>
    </div>
  );
}


function Section({
  title,
  children,
}) {
  return (
    <section
      className="
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-5
      "
    >
      <h3
        className="
          text-sm
          font-bold
          text-slate-900
        "
      >
        {title}
      </h3>

      {children}
    </section>
  );
}


// ============================================================
// MAIN COMPONENT
// ============================================================

export default function MillerApplicationDetailsModal({
  open,
  application,

  messages = [],

  isSaving = false,
  isLoadingMessages = false,

  error = "",

  profanityBlock = {
    open: false,
    message: "",
  },

  onClearProfanity,

  onClose,

  onApprove,
  onDecline,

  onLoadMessages,
  onSendMessage,
}) {
  const [
    declineMode,
    setDeclineMode,
  ] = useState(false);

  const [
    declineReason,
    setDeclineReason,
  ] = useState("");

  const [
    declineRemarks,
    setDeclineRemarks,
  ] = useState("");

  const [
    declineError,
    setDeclineError,
  ] = useState("");

  const [
    chatOpen,
    setChatOpen,
  ] = useState(false);

  const [
    messageText,
    setMessageText,
  ] = useState("");


  // ==========================================================
  // RESET WHEN MODAL CLOSES / CHANGES
  // ==========================================================

  useEffect(
    () => {
      if (!open) {
        setDeclineMode(false);
        setDeclineReason("");
        setDeclineRemarks("");
        setDeclineError("");
        setChatOpen(false);
        setMessageText("");
      }
    },
    [open]
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
    [open]
  );


  if (
    !open
    || !application
  ) {
    return null;
  }


  // ==========================================================
  // DERIVED DATA
  // ==========================================================

  const applicationStatus =
    application.application_status
    || "pending";


  const canDecide =
    [
      "pending",
      "under_review",
    ].includes(
      applicationStatus
    );


  const farmLocation =
    [
      application.farm_street_address,
      application.farm_barangay,
      application.farm_municipality,
      application.farm_province,
      application.farm_postal_code,
    ]
      .filter(Boolean)
      .join(", ");


  const proposedPrice =
    application.proposed_selling_price_per_kg;


  const displayedPrice =
    proposedPrice
      ? `${formatPeso(
          proposedPrice
        )}/kg`
      : `${formatPeso(
          application.buying_price_per_kg
        )}/kg`;


  // ==========================================================
  // CLOSE
  // ==========================================================

  const handleClose = () => {
    if (isSaving) {
      return;
    }

    setDeclineMode(false);
    setDeclineReason("");
    setDeclineRemarks("");
    setDeclineError("");
    setChatOpen(false);
    setMessageText("");

    onClose?.();
  };


  // ==========================================================
  // DECLINE APPLICATION
  // ==========================================================

  const handleDeclineSubmit =
    async () => {
      if (isSaving) {
        return;
      }

      if (!declineReason) {
        setDeclineError(
          "Reason for decline is required."
        );

        return;
      }

      if (
        declineReason === "Other"
        && !declineRemarks.trim()
      ) {
        setDeclineError(
          "Please provide remarks when selecting Other."
        );

        return;
      }

      if (
        declineRemarks.length > 1500
      ) {
        setDeclineError(
          "Remarks cannot exceed 1500 characters."
        );

        return;
      }

      setDeclineError("");

      const result =
        await onDecline?.(
          application,
          {
            declineReason,
            declineRemarks:
              declineRemarks.trim(),
          }
        );

      if (result) {
        setDeclineMode(false);
        setDeclineReason("");
        setDeclineRemarks("");
      }
    };


  // ==========================================================
  // MESSAGE FARMER
  // ==========================================================

  const handleToggleChat =
    async () => {
      const next =
        !chatOpen;

      setChatOpen(next);

      if (next) {
        await onLoadMessages?.(
          application
        );
      }
    };


  const handleSendMessage =
    async (event) => {
      event.preventDefault();

      const cleanMessage =
        messageText.trim();

      if (
        !cleanMessage
        || isSaving
      ) {
        return;
      }

      if (
        cleanMessage.length > 5000
      ) {
        return;
      }

      const result =
        await onSendMessage?.(
          application,
          cleanMessage
        );

      if (
        result
        && !result.blocked
      ) {
        setMessageText("");
      }
    };


  // ==========================================================
  // RENDER
  // ==========================================================

  return createPortal(
    <div
      className="
        fixed
        inset-0
        z-[100000]
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
        aria-labelledby="miller-application-details-title"
        className="
          flex
          max-h-[94vh]
          w-full
          max-w-5xl
          flex-col
          overflow-hidden
          rounded-2xl
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
            items-start
            justify-between
            gap-4
            border-b
            border-slate-200
            px-5
            py-4
            sm:px-6
            sm:py-5
          "
        >
          <div>
            <div
              className="
                flex
                flex-wrap
                items-center
                gap-2
              "
            >
              <p
                className="
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                  text-[#0B5D1E]
                "
              >
                {application.application_code
                  || `APP-${application.application_id}`}
              </p>

              <span
                className={`
                  rounded-full
                  px-2.5
                  py-1
                  text-[10px]
                  font-bold
                  uppercase

                  ${
                    STATUS_STYLES[
                      applicationStatus
                    ]
                    || STATUS_STYLES.cancelled
                  }
                `}
              >
                {titleCase(
                  applicationStatus
                )}
              </span>
            </div>

            <h2
              id="miller-application-details-title"
              className="
                mt-1
                text-lg
                font-bold
                text-slate-900
              "
            >
              Farmer Application Details
            </h2>

            <p
              className="
                mt-0.5
                text-sm
                text-slate-500
              "
            >
              Review the Farmer, farm, product, and supply commitment before making a decision.
            </p>
          </div>


          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            aria-label="Close application details"
            className="
              rounded-lg
              p-2
              text-slate-400
              transition
              hover:bg-slate-100
              hover:text-slate-600
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
            flex-1
            space-y-5
            overflow-y-auto
            p-5
            sm:p-6
          "
        >

          {/* ================================================
              APPLICATION SUMMARY
          ================================================ */}

          <section
            className="
              rounded-2xl
              border
              border-slate-200
              bg-slate-50/70
              p-4
            "
          >
            <div
              className="
                grid
                gap-4
                sm:grid-cols-2
                lg:grid-cols-4
              "
            >
              <InfoItem
                label="Application ID"
                value={
                  application.application_code
                }
              />

              <InfoItem
                label="Application Date"
                value={
                  formatDate(
                    application.application_date,
                    true
                  )
                }
              />

              <InfoItem
                label="Quantity to Commit"
                value={
                  formatQuantity(
                    application.quantity_to_commit_kg
                  )
                }
              />

              <InfoItem
                label="Expected Availability"
                value={
                  formatDate(
                    application.expected_availability_date
                  )
                }
              />
            </div>
          </section>


          {/* ================================================
              FARMER + POSTING
          ================================================ */}

          <div
            className="
              grid
              gap-5
              lg:grid-cols-2
            "
          >
            <Section title="Farmer & Farm Information">
              <div
                className="
                  mt-4
                  grid
                  gap-4
                  sm:grid-cols-2
                "
              >
                <InfoItem
                  label="Farmer Name"
                  value={
                    application.farmer_name
                  }
                />

                <InfoItem
                  label="Contact Number"
                  value={
                    application.farmer_contact_number
                  }
                />

                <InfoItem
                  label="Email"
                  value={
                    application.farmer_email
                  }
                />

                <InfoItem
                  label="Farm / Farm Lot"
                  value={
                    application.farm_name
                    || "Registered Farm"
                  }
                />

                <div
                  className="
                    sm:col-span-2
                  "
                >
                  <InfoItem
                    label="Farm Location"
                    value={
                      farmLocation
                      || "No farm address available."
                    }
                  />
                </div>

                <div
                  className="
                    sm:col-span-2
                  "
                >
                  <InfoItem
                    label="Distance"
                    value="Distance unavailable because farm coordinates are not yet stored."
                  />
                </div>
              </div>
            </Section>


            <Section title="Posting Reference">
              <div
                className="
                  mt-4
                  grid
                  gap-4
                  sm:grid-cols-2
                "
              >
                <InfoItem
                  label="Posting ID"
                  value={
                    application.posting_code
                  }
                />

                <InfoItem
                  label="Required Product"
                  value={
                    productTypeLabel(
                      application.required_product_type
                    )
                  }
                />

                <InfoItem
                  label="Rice Variety"
                  value={
                    application.required_rice_variety
                  }
                />

                <InfoItem
                  label="Required Quantity"
                  value={
                    formatQuantity(
                      application.required_quantity_kg
                    )
                  }
                />

                <InfoItem
                  label="Buying Price"
                  value={`${formatPeso(
                    application.buying_price_per_kg
                  )}/kg`}
                />

                <InfoItem
                  label="Required Fulfillment"
                  value={
                    formatDate(
                      application.required_fulfillment_date
                    )
                  }
                />

                <InfoItem
                  label="Partial Quantity"
                  value={
                    application.partial_quantity_allowed
                      ? "Allowed"
                      : "Not Allowed"
                  }
                />

                <InfoItem
                  label="Price Negotiation"
                  value={
                    application.price_negotiation_allowed
                      ? "Allowed"
                      : "Not Allowed"
                  }
                />
              </div>
            </Section>
          </div>


          {/* ================================================
              FARMER PRODUCT
          ================================================ */}

          <Section title="Farmer Product / Inventory">
            <div
              className="
                mt-4
                flex
                flex-col
                gap-5
                sm:flex-row
              "
            >
              {application.product_image ? (
                <img
                  src={
                    application.product_image
                  }
                  alt={
                    application.rice_variety
                    || "Farmer product"
                  }
                  className="
                    h-32
                    w-32
                    shrink-0
                    rounded-xl
                    border
                    border-slate-200
                    object-cover
                  "
                />
              ) : (
                <div
                  className="
                    flex
                    h-32
                    w-32
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-slate-200
                    bg-slate-100
                    text-xs
                    text-slate-400
                  "
                >
                  No Photo
                </div>
              )}


              <div
                className="
                  grid
                  flex-1
                  gap-4
                  sm:grid-cols-2
                  lg:grid-cols-3
                "
              >
                <InfoItem
                  label="Product Code"
                  value={
                    application.product_code
                  }
                />

                <InfoItem
                  label="Product Type"
                  value={
                    productTypeLabel(
                      application.product_type
                    )
                  }
                />

                <InfoItem
                  label="Rice Variety"
                  value={
                    application.rice_variety
                  }
                />

                <InfoItem
                  label="Grade / Classification"
                  value={
                    application.product_grade
                  }
                />

                <InfoItem
                  label="Available Quantity"
                  value={
                    formatQuantity(
                      application.available_quantity_kg
                    )
                  }
                />

                <InfoItem
                  label="Quantity to Commit"
                  value={
                    formatQuantity(
                      application.quantity_to_commit_kg
                    )
                  }
                />
              </div>
            </div>


            <div
              className="
                mt-4
                rounded-xl
                bg-slate-50
                p-4
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
                  mt-2
                  text-sm
                  leading-6
                  text-slate-700
                "
              >
                {application.product_description
                  || "No product description provided."}
              </p>
            </div>
          </Section>


          {/* ================================================
              APPLICATION COMMITMENT
          ================================================ */}

          <Section title="Application Commitment">
            <div
              className="
                mt-4
                grid
                gap-4
                sm:grid-cols-2
                lg:grid-cols-4
              "
            >
              <InfoItem
                label="Committed Quantity"
                value={
                  formatQuantity(
                    application.quantity_to_commit_kg
                  )
                }
              />

              <InfoItem
                label="Proposed Selling Price"
                value={
                  displayedPrice
                }
              />

              <InfoItem
                label="Farmer Signature"
                value={
                  application.farmer_signature_path
                    ? "Signed"
                    : "Not Signed"
                }
              />

              <InfoItem
                label="Signed At"
                value={
                  formatDate(
                    application.farmer_signed_at,
                    true
                  )
                }
              />
            </div>


            {application.farmer_signature_path?.startsWith(
              "data:image/"
            ) && (
              <div
                className="
                  mt-5
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  p-4
                "
              >
                <p
                  className="
                    mb-3
                    text-xs
                    font-medium
                    text-slate-400
                  "
                >
                  Farmer Electronic Signature
                </p>

                <img
                  src={
                    application.farmer_signature_path
                  }
                  alt="Farmer electronic signature"
                  className="
                    max-h-32
                    max-w-full
                    object-contain
                  "
                />
              </div>
            )}


            <div
              className="
                mt-5
                rounded-xl
                bg-slate-50
                p-4
              "
            >
              <p
                className="
                  text-xs
                  font-medium
                  text-slate-400
                "
              >
                Farmer Notes
              </p>

              <p
                className="
                  mt-2
                  whitespace-pre-wrap
                  text-sm
                  leading-6
                  text-slate-700
                "
              >
                {application.additional_notes_to_miller
                  || "No additional notes provided."}
              </p>
            </div>
          </Section>


          {/* ================================================
              DECLINE FORM
          ================================================ */}

          {declineMode && canDecide && (
            <section
              className="
                rounded-2xl
                border
                border-red-200
                bg-red-50
                p-5
              "
            >
              <h3
                className="
                  text-sm
                  font-bold
                  text-red-700
                "
              >
                Decline Farmer Application
              </h3>

              <p
                className="
                  mt-1
                  text-xs
                  text-red-600
                "
              >
                The Farmer will be able to see the reason for the decision.
              </p>


              <div
                className="
                  mt-4
                  grid
                  gap-4
                  md:grid-cols-2
                "
              >
                <label>
                  <span
                    className="
                      text-xs
                      font-semibold
                      text-red-700
                    "
                  >
                    Reason for Decline *
                  </span>

                  <select
                    value={
                      declineReason
                    }
                    onChange={
                      (event) => {
                        setDeclineReason(
                          event.target.value
                        );

                        setDeclineError("");
                      }
                    }
                    className={`
                      mt-1.5
                      w-full
                      rounded-xl
                      border
                      bg-white
                      px-3.5
                      py-2.5
                      text-sm
                      outline-none

                      ${
                        declineError
                          ? "border-red-400"
                          : "border-red-200 focus:border-red-400"
                      }
                    `}
                  >
                    <option value="">
                      Select Reason
                    </option>

                    {DECLINE_REASONS.map(
                      (reason) => (
                        <option
                          key={reason}
                          value={reason}
                        >
                          {reason}
                        </option>
                      )
                    )}
                  </select>
                </label>


                <label>
                  <span
                    className="
                      text-xs
                      font-semibold
                      text-red-700
                    "
                  >
                    Additional Remarks
                  </span>

                  <textarea
                    rows={4}
                    maxLength={1500}
                    value={
                      declineRemarks
                    }
                    onChange={
                      (event) => {
                        setDeclineRemarks(
                          event.target.value
                        );

                        setDeclineError("");
                      }
                    }
                    placeholder="Provide additional explanation if needed..."
                    className="
                      mt-1.5
                      w-full
                      resize-none
                      rounded-xl
                      border
                      border-red-200
                      bg-white
                      px-3.5
                      py-2.5
                      text-sm
                      outline-none
                      focus:border-red-400
                    "
                  />

                  <p
                    className="
                      mt-1
                      text-right
                      text-[11px]
                      text-red-400
                    "
                  >
                    {declineRemarks.length}/1500
                  </p>
                </label>
              </div>


              {declineError && (
                <p
                  className="
                    mt-3
                    text-xs
                    font-medium
                    text-red-600
                  "
                >
                  {declineError}
                </p>
              )}


              <div
                className="
                  mt-4
                  flex
                  justify-end
                  gap-2
                "
              >
                <button
                  type="button"
                  onClick={() => {
                    setDeclineMode(false);
                    setDeclineError("");
                  }}
                  disabled={isSaving}
                  className="
                    rounded-xl
                    border
                    border-red-200
                    bg-white
                    px-4
                    py-2
                    text-sm
                    font-bold
                    text-red-600
                    transition
                    hover:bg-red-50
                    disabled:opacity-50
                  "
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={
                    handleDeclineSubmit
                  }
                  disabled={isSaving}
                  className="
                    rounded-xl
                    bg-red-600
                    px-4
                    py-2
                    text-sm
                    font-bold
                    text-white
                    transition
                    hover:bg-red-700
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  {isSaving
                    ? "Declining..."
                    : "Confirm Decline"}
                </button>
              </div>
            </section>
          )}


          {/* ================================================
              MESSAGES
          ================================================ */}

          {chatOpen && (
            <section
              className="
                overflow-hidden
                rounded-2xl
                border
                border-slate-200
                bg-white
              "
            >
              <div
                className="
                  border-b
                  border-slate-200
                  px-4
                  py-3
                "
              >
                <h3
                  className="
                    text-sm
                    font-bold
                    text-slate-900
                  "
                >
                  Conversation with {application.farmer_name || "Farmer"}
                </h3>

                <p
                  className="
                    mt-0.5
                    text-xs
                    text-slate-500
                  "
                >
                  Application Reference: {application.application_code}
                </p>
              </div>


              <div
                className="
                  max-h-72
                  space-y-3
                  overflow-y-auto
                  bg-slate-50/60
                  p-4
                "
              >
                {isLoadingMessages ? (
                  <div
                    className="
                      flex
                      justify-center
                      py-8
                    "
                  >
                    <Loader2
                      size={22}
                      className="
                        animate-spin
                        text-[#0B5D1E]
                      "
                    />
                  </div>
                ) : messages.length ? (
                  messages.map(
                    (message) => {
                      const mine =
                        message.sender_type ===
                        "miller";

                      return (
                        <div
                          key={message.message_id}
                          className={`
                            flex

                            ${
                              mine
                                ? "justify-end"
                                : "justify-start"
                            }
                          `}
                        >
                          <div
                            className={`
                              max-w-[78%]
                              rounded-2xl
                              px-4
                              py-3
                              text-sm

                              ${
                                mine
                                  ? "bg-[#0B5D1E] text-white"
                                  : "border border-slate-200 bg-white text-slate-700"
                              }
                            `}
                          >
                            <p
                              className="
                                whitespace-pre-wrap
                                break-words
                              "
                            >
                              {message.message_text}
                            </p>

                            <p
                              className={`
                                mt-1
                                text-[10px]

                                ${
                                  mine
                                    ? "text-emerald-100"
                                    : "text-slate-400"
                                }
                              `}
                            >
                              {formatDate(
                                message.created_at,
                                true
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    }
                  )
                ) : (
                  <p
                    className="
                      py-8
                      text-center
                      text-sm
                      text-slate-500
                    "
                  >
                    No messages yet. Start a conversation about this application.
                  </p>
                )}
              </div>


              <form
                onSubmit={
                  handleSendMessage
                }
                className="
                  flex
                  gap-2
                  border-t
                  border-slate-200
                  p-3
                "
              >
                <input
                  type="text"
                  maxLength={5000}
                  value={
                    messageText
                  }
                  onChange={
                    (event) =>
                      setMessageText(
                        event.target.value
                      )
                  }
                  placeholder="Write a message to the Farmer..."
                  className="
                    min-w-0
                    flex-1
                    rounded-xl
                    border
                    border-slate-200
                    px-4
                    py-2.5
                    text-sm
                    outline-none
                    focus:border-[#0B5D1E]
                    focus:ring-1
                    focus:ring-[#0B5D1E]
                  "
                />

                <button
                  type="submit"
                  disabled={
                    !messageText.trim()
                    || isSaving
                  }
                  className="
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-[#0B5D1E]
                    px-4
                    py-2.5
                    text-sm
                    font-bold
                    text-white
                    transition
                    hover:bg-[#094d19]
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  <Send size={15} />

                  <span
                    className="
                      hidden
                      sm:inline
                    "
                  >
                    Send
                  </span>
                </button>
              </form>
            </section>
          )}


          {/* ================================================
              PROFANITY
          ================================================ */}

          {profanityBlock?.open && (
            <div
              className="
                flex
                items-start
                justify-between
                gap-3
                rounded-xl
                border
                border-amber-200
                bg-amber-50
                px-4
                py-3
                text-sm
                text-amber-700
              "
            >
              <span>
                {profanityBlock.message}
              </span>

              <button
                type="button"
                onClick={
                  onClearProfanity
                }
                className="
                  font-bold
                "
              >
                ×
              </button>
            </div>
          )}


          {/* ================================================
              API ERROR
          ================================================ */}

          {error && (
            <div
              className="
                rounded-xl
                border
                border-red-200
                bg-red-50
                px-4
                py-3
                text-sm
                font-medium
                text-red-700
              "
            >
              {error}
            </div>
          )}
        </div>


        {/* ==================================================
            FOOTER ACTIONS
        ================================================== */}

        <div
          className="
            flex
            flex-wrap
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
              handleToggleChat
            }
            disabled={isSaving}
            className="
              inline-flex
              items-center
              gap-2
              rounded-xl
              border
              border-slate-200
              px-4
              py-2.5
              text-sm
              font-bold
              text-slate-700
              transition
              hover:bg-slate-50
              disabled:opacity-50
            "
          >
            <MessageCircle size={16} />

            {chatOpen
              ? "Hide Messages"
              : "Message Farmer"}
          </button>


          {canDecide && !declineMode && (
            <>
              <button
                type="button"
                onClick={() => {
                  setDeclineMode(true);
                  setChatOpen(false);
                }}
                disabled={isSaving}
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-red-200
                  px-4
                  py-2.5
                  text-sm
                  font-bold
                  text-red-600
                  transition
                  hover:bg-red-50
                  disabled:opacity-50
                "
              >
                <XCircle size={16} />

                Decline
              </button>


              <button
                type="button"
                onClick={() =>
                  onApprove?.(
                    application
                  )
                }
                disabled={isSaving}
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-xl
                  bg-[#0B5D1E]
                  px-4
                  py-2.5
                  text-sm
                  font-bold
                  text-white
                  transition
                  hover:bg-[#094d19]
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {isSaving ? (
                  <Loader2
                    size={16}
                    className="
                      animate-spin
                    "
                  />
                ) : (
                  <CheckCircle2
                    size={16}
                  />
                )}

                Approve Application
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}