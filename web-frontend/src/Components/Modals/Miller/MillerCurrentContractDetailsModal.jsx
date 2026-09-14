import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  CheckCircle2,
  Download,
  FileSignature,
  Loader2,
  MapPin,
  MessageCircle,
  X,
  XCircle,
} from "lucide-react";

import {
  jsPDF,
} from "jspdf";

import SignaturePad from "../../Minor-Components/SignaturePad";


// ============================================================
// CONSTANTS
// ============================================================

const VOID_REASONS = [
  "Unable to continue procurement",
  "Product or supply issue",
  "Fulfillment arrangement issue",
  "Contract terms cannot be fulfilled",
  "Mutual agreement to cancel",
  "Other",
];


const CONTRACT_STATUS_STYLES = {
  active:
    "bg-emerald-100 text-emerald-700",

  void_requested:
    "bg-amber-100 text-amber-700",

  completed:
    "bg-blue-100 text-blue-700",

  voided:
    "bg-red-100 text-red-700",
};


const FULFILLMENT_STATUS_STYLES = {
  pending:
    "bg-slate-100 text-slate-600",

  partially_fulfilled:
    "bg-amber-100 text-amber-700",

  fulfilled:
    "bg-emerald-100 text-emerald-700",
};


// ============================================================
// HELPERS
// ============================================================

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
      (letter) =>
        letter.toUpperCase()
    );
}


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
  const number =
    Number(value);


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
    !Number.isFinite(
      number
    )
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


function productTypeLabel(value) {
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


  return (
    titleCase(value)
    || "—"
  );
}


function fulfillmentMethodLabel(value) {
  if (
    value ===
    "buyer_pickup"
  ) {
    return "Buyer Pickup";
  }


  if (
    value ===
    "farmer_delivery"
  ) {
    return "Farmer Delivery";
  }


  return (
    titleCase(value)
    || "—"
  );
}


function contractSourceLabel(value) {
  if (
    value ===
    "posting_application"
  ) {
    return "Posting Application";
  }


  if (
    value ===
    "bidding_offer"
  ) {
    return "Bidding Offer";
  }


  return (
    titleCase(value)
    || "—"
  );
}


function normalizeSignature(value) {
  if (
    typeof value ===
    "string"
  ) {
    return value;
  }


  if (
    typeof value?.dataUrl ===
    "string"
  ) {
    return value.dataUrl;
  }


  if (
    typeof value?.signature ===
    "string"
  ) {
    return value.signature;
  }


  return "";
}


// ============================================================
// REUSABLE DISPLAY
// ============================================================

function InfoItem({
  label,
  value,
}) {
  return (
    <div>
      <p
        className="
          text-[11px]
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
  description = "",
  children,
}) {
  return (
    <section
      className="
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-4
        sm:p-5
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


      {description && (
        <p
          className="
            mt-1
            text-xs
            text-slate-500
          "
        >
          {description}
        </p>
      )}


      {children}
    </section>
  );
}


// ============================================================
// MAIN
// ============================================================

export default function MillerCurrentContractDetailsModal({
  open,
  contract,

  isLoading = false,

  contractError = "",
  actionError = "",

  isActionLoading = false,

  onClose,

  onSign,
  onComplete,
  onRequestVoid,

  onMessageFarmer,

  onClearActionError,
}) {
  const [
    actionPanel,
    setActionPanel,
  ] = useState("");


  const [
    savedSignature,
    setSavedSignature,
  ] = useState("");


  const [
    signatureError,
    setSignatureError,
  ] = useState("");


  const [
    voidReason,
    setVoidReason,
  ] = useState("");


  const [
    voidRemarks,
    setVoidRemarks,
  ] = useState("");


  const [
    voidError,
    setVoidError,
  ] = useState("");


  // ==========================================================
  // RESET
  // ==========================================================

  useEffect(
    () => {
      if (open) {
        return;
      }


      setActionPanel(
        ""
      );

      setSavedSignature(
        ""
      );

      setSignatureError(
        ""
      );

      setVoidReason(
        ""
      );

      setVoidRemarks(
        ""
      );

      setVoidError(
        ""
      );
    },
    [
      open,
    ]
  );


  // ==========================================================
  // BACKGROUND SCROLL
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
  // COMPUTED DATA
  // ==========================================================

  const contractStatus =
    String(
      contract?.contract_status
      || ""
    ).toLowerCase();


  const fulfillmentStatus =
    String(
      contract?.fulfillment_status
      || "pending"
    ).toLowerCase();


  const contractedQuantity =
    Number(
      contract?.contracted_quantity_kg
      || 0
    );


  const fulfilledQuantity =
    Number(
      contract?.quantity_fulfilled_kg
      || 0
    );


  const remainingQuantity =
    Number(
      contract?.remaining_quantity_kg
      ?? Math.max(
        contractedQuantity
        - fulfilledQuantity,
        0
      )
    );


  const farmAddress =
    useMemo(
      () => {
        if (!contract) {
          return "—";
        }


        return [
          contract.farm_street_address,
          contract.farm_barangay,
          contract.farm_municipality,
          contract.farm_province,
          contract.farm_postal_code,
        ]
          .filter(Boolean)
          .join(", ")
          || "—";
      },
      [
        contract,
      ]
    );


  const canSign =
    Boolean(
      contract
      && !contract.miller_signature_path
      && contractStatus ===
        "active"
    );


  const canRequestVoid =
    Boolean(
      contract
      && contractStatus ===
        "active"
    );


  /*
   * IMPORTANT:
   *
   * Previously the button was disabled unless the frontend already
   * saw fulfillment_status === fulfilled.
   *
   * That made the button unusable from this module.
   *
   * Now an ACTIVE contract may call the backend completion endpoint.
   * The backend remains the source of truth and can still reject
   * invalid completion based on server-side rules.
   */
  const canComplete =
    Boolean(
      contract
      && contractStatus ===
        "active"
    );


  if (!open) {
    return null;
  }


  // ==========================================================
  // SIGNATURE
  // ==========================================================

  const handleSignatureSave =
    (value) => {
      const signature =
        normalizeSignature(
          value
        );


      if (
        !signature
        || !signature.startsWith(
          "data:image/"
        )
      ) {
        setSavedSignature(
          ""
        );

        setSignatureError(
          "Please draw and save a valid signature."
        );

        return;
      }


      setSavedSignature(
        signature
      );

      setSignatureError(
        ""
      );
    };


  const handleSignatureClear =
    () => {
      setSavedSignature(
        ""
      );

      setSignatureError(
        ""
      );
    };


  const handleSign =
    async () => {
      if (!savedSignature) {
        setSignatureError(
          "Please draw and save your signature first."
        );

        return;
      }


      const success =
        await onSign?.(
          savedSignature
        );


      if (
        success !== false
      ) {
        setSavedSignature(
          ""
        );

        setSignatureError(
          ""
        );

        setActionPanel(
          ""
        );
      }
    };


  // ==========================================================
  // COMPLETE
  // ==========================================================

  const handleComplete =
    async () => {
      if (!canComplete) {
        return;
      }


      onClearActionError?.();


      await onComplete?.();
    };


  // ==========================================================
  // VOID
  // ==========================================================

  const handleVoid =
    async () => {
      if (!voidReason) {
        setVoidError(
          "Reason for void request is required."
        );

        return;
      }


      if (
        voidReason ===
          "Other"
        && !voidRemarks.trim()
      ) {
        setVoidError(
          "Please provide an explanation."
        );

        return;
      }


      if (
        voidRemarks.length >
        1500
      ) {
        setVoidError(
          "Remarks cannot exceed 1500 characters."
        );

        return;
      }


      setVoidError(
        ""
      );


      const success =
        await onRequestVoid?.({
          reason:
            voidReason,

          remarks:
            voidRemarks.trim(),
        });


      if (
        success !== false
      ) {
        setVoidReason(
          ""
        );

        setVoidRemarks(
          ""
        );

        setActionPanel(
          ""
        );
      }
    };


  // ==========================================================
  // MESSAGE FARMER
  // ==========================================================

  const handleMessageFarmer =
    () => {
      if (!contract) {
        return;
      }


      onMessageFarmer?.(
        contract
      );
    };


  // ==========================================================
  // PDF
  // ==========================================================

  const handleDownloadPdf =
    () => {
      if (!contract) {
        return;
      }


      const pdf =
        new jsPDF({
          orientation:
            "portrait",

          unit:
            "mm",

          format:
            "a4",
        });


      const pageWidth =
        pdf.internal.pageSize.getWidth();


      const margin =
        18;


      const usableWidth =
        pageWidth
        - margin * 2;


      let y =
        20;


      const checkPage =
        (
          requiredHeight = 10
        ) => {
          if (
            y + requiredHeight >
            278
          ) {
            pdf.addPage();

            y =
              20;
          }
        };


      const addTitle =
        (
          text
        ) => {
          checkPage(
            16
          );

          pdf.setFont(
            "helvetica",
            "bold"
          );

          pdf.setFontSize(
            13
          );

          pdf.text(
            String(text),
            margin,
            y
          );

          y +=
            8;
        };


      const addRow =
        (
          label,
          value
        ) => {
          checkPage(
            12
          );


          pdf.setFontSize(
            9
          );

          pdf.setFont(
            "helvetica",
            "bold"
          );

          pdf.text(
            `${label}:`,
            margin,
            y
          );


          pdf.setFont(
            "helvetica",
            "normal"
          );


          const wrapped =
            pdf.splitTextToSize(
              String(
                value
                ?? "—"
              ),
              usableWidth
              - 45
            );


          pdf.text(
            wrapped,
            margin + 45,
            y
          );


          y +=
            Math.max(
              6,
              wrapped.length
              * 4.5
            );
        };


      // ======================================================
      // HEADER
      // ======================================================

      pdf.setFont(
        "helvetica",
        "bold"
      );

      pdf.setFontSize(
        18
      );

      pdf.text(
        "GrainRise Contract",
        margin,
        y
      );


      y +=
        8;


      pdf.setFontSize(
        10
      );

      pdf.setFont(
        "helvetica",
        "normal"
      );

      pdf.text(
        contract.contract_code
        || `Contract ${contract.contract_id}`,
        margin,
        y
      );


      y +=
        12;


      pdf.setDrawColor(
        210
      );

      pdf.line(
        margin,
        y,
        pageWidth - margin,
        y
      );


      y +=
        10;


      // ======================================================
      // CONTRACT
      // ======================================================

      addTitle(
        "Contract Information"
      );


      addRow(
        "Contract ID",
        contract.contract_code
      );

      addRow(
        "Status",
        titleCase(
          contract.contract_status
        )
      );

      addRow(
        "Source",
        contractSourceLabel(
          contract.contract_source
        )
      );

      addRow(
        "Created Date",
        formatDate(
          contract.created_at,
          true
        )
      );

      addRow(
        "Contract Start Date",
        formatDate(
          contract.contract_start_date
        )
      );

      addRow(
        "Fulfillment Date",
        formatDate(
          contract.fulfillment_date
        )
      );


      y +=
        5;


      // ======================================================
      // FARMER
      // ======================================================

      addTitle(
        "Farmer Information"
      );


      addRow(
        "Farmer",
        contract.farmer_name
      );

      addRow(
        "Farm",
        contract.farm_name
        || "Registered Farm"
      );

      addRow(
        "Email",
        contract.farmer_email
      );

      addRow(
        "Contact Number",
        contract.farmer_contact_number
      );

      addRow(
        "Farm Location",
        farmAddress
      );


      y +=
        5;


      // ======================================================
      // PRODUCT
      // ======================================================

      addTitle(
        "Product Information"
      );


      addRow(
        "Product Code",
        contract.product_code
      );

      addRow(
        "Product Type",
        productTypeLabel(
          contract.product_type
        )
      );

      addRow(
        "Rice Variety",
        contract.rice_variety
      );

      addRow(
        "Grade",
        contract.product_grade
      );

      addRow(
        "Contracted Quantity",
        formatQuantity(
          contract.contracted_quantity_kg
        )
      );

      addRow(
        "Agreed Price / kg",
        formatPeso(
          contract.agreed_price_per_kg
        )
      );

      addRow(
        "Total Contract Value",
        formatPeso(
          contract.total_contract_value
        )
      );


      y +=
        5;


      // ======================================================
      // FULFILLMENT
      // ======================================================

      addTitle(
        "Fulfillment Information"
      );


      addRow(
        "Method",
        fulfillmentMethodLabel(
          contract.fulfillment_method
        )
      );

      addRow(
        "Fulfillment Status",
        titleCase(
          contract.fulfillment_status
        )
      );

      addRow(
        "Quantity Fulfilled",
        formatQuantity(
          fulfilledQuantity
        )
      );

      addRow(
        "Remaining Quantity",
        formatQuantity(
          remainingQuantity
        )
      );

      addRow(
        "Location",
        contract.fulfillment_location
      );


      y +=
        5;


      // ======================================================
      // TERMS
      // ======================================================

      addTitle(
        "Contract Terms"
      );


      addRow(
        "Agreed Terms",
        contract.agreed_terms
        || "No additional terms recorded."
      );


      y +=
        5;


      // ======================================================
      // SIGNATURE INFO
      // ======================================================

      addTitle(
        "Electronic Signatures"
      );


      addRow(
        "Farmer",
        contract.farmer_signature_path
          ? `Signed - ${formatDate(
              contract.farmer_signed_at,
              true
            )}`
          : "Not signed"
      );


      addRow(
        "Miller",
        contract.miller_signature_path
          ? `Signed - ${formatDate(
              contract.miller_signed_at,
              true
            )}`
          : "Not signed"
      );


      // ======================================================
      // FOOTER
      // ======================================================

      const pageCount =
        pdf.internal.getNumberOfPages();


      for (
        let page = 1;
        page <= pageCount;
        page += 1
      ) {
        pdf.setPage(
          page
        );


        pdf.setFontSize(
          8
        );

        pdf.setTextColor(
          120
        );

        pdf.text(
          `GrainRise • ${contract.contract_code || "Contract"} • Page ${page} of ${pageCount}`,
          margin,
          290
        );
      }


      pdf.save(
        `${
          contract.contract_code
          || `grainrise-contract-${contract.contract_id}`
        }.pdf`
      );
    };


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
        className="
          flex
          max-h-[92vh]
          w-full
          max-w-3xl
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
                {contract?.contract_code
                  || "Current Contract"}
              </p>


              {contract && (
                <span
                  className={`
                    rounded-full
                    px-2.5
                    py-1
                    text-[10px]
                    font-bold
                    uppercase

                    ${
                      CONTRACT_STATUS_STYLES[
                        contractStatus
                      ]
                      || "bg-slate-100 text-slate-600"
                    }
                  `}
                >
                  {titleCase(
                    contractStatus
                  )}
                </span>
              )}
            </div>


            <h2
              className="
                mt-1
                text-lg
                font-bold
                text-slate-900
              "
            >
              Current Contract Details
            </h2>


            <p
              className="
                mt-0.5
                text-xs
                text-slate-500
              "
            >
              Review contract, Farmer, product, fulfillment, and signature information.
            </p>
          </div>


          <button
            type="button"
            onClick={
              onClose
            }
            disabled={
              isActionLoading
            }
            className="
              rounded-lg
              p-2
              text-slate-400
              hover:bg-slate-100
              hover:text-slate-600
            "
          >
            <X
              size={19}
            />
          </button>
        </div>


        {/* ==================================================
            CONTENT
        ================================================== */}

        <div
          className="
            flex-1
            space-y-4
            overflow-y-auto
            bg-slate-50/40
            p-4
            sm:p-5
          "
        >
          {isLoading ? (
            <div
              className="
                flex
                min-h-[380px]
                items-center
                justify-center
              "
            >
              <Loader2
                size={28}
                className="
                  animate-spin
                  text-[#0B5D1E]
                "
              />
            </div>

          ) : contract ? (
            <>

              {/* CONTRACT */}

              <Section
                title="Contract Information"
              >
                <div
                  className="
                    mt-4
                    grid
                    gap-4
                    sm:grid-cols-2
                  "
                >
                  <InfoItem
                    label="Contract ID"
                    value={
                      contract.contract_code
                    }
                  />

                  <InfoItem
                    label="Contract Status"
                    value={
                      titleCase(
                        contract.contract_status
                      )
                    }
                  />

                  <InfoItem
                    label="Contract Source"
                    value={
                      contractSourceLabel(
                        contract.contract_source
                      )
                    }
                  />

                  <InfoItem
                    label="Created Date"
                    value={
                      formatDate(
                        contract.created_at,
                        true
                      )
                    }
                  />

                  <InfoItem
                    label="Contract Start Date"
                    value={
                      formatDate(
                        contract.contract_start_date
                      )
                    }
                  />

                  <InfoItem
                    label="Required Fulfillment Date"
                    value={
                      formatDate(
                        contract.fulfillment_date
                      )
                    }
                  />
                </div>
              </Section>


              {/* FARMER */}

              <Section
                title="Farmer Information"
              >
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
                      contract.farmer_name
                    }
                  />

                  <InfoItem
                    label="Farm / Farm Lot"
                    value={
                      contract.farm_name
                      || "Registered Farm"
                    }
                  />

                  <InfoItem
                    label="Email Address"
                    value={
                      contract.farmer_email
                    }
                  />

                  <InfoItem
                    label="Contact Number"
                    value={
                      contract.farmer_contact_number
                    }
                  />
                </div>


                <div
                  className="
                    mt-4
                    rounded-xl
                    bg-slate-50
                    p-3
                  "
                >
                  <p
                    className="
                      text-[11px]
                      text-slate-400
                    "
                  >
                    Farm Location
                  </p>

                  <p
                    className="
                      mt-1
                      flex
                      items-start
                      gap-1.5
                      text-sm
                      font-semibold
                      text-slate-800
                    "
                  >
                    <MapPin
                      size={14}
                      className="
                        mt-0.5
                        shrink-0
                        text-[#0B5D1E]
                      "
                    />

                    {farmAddress}
                  </p>
                </div>
              </Section>


              {/* PRODUCT */}

              <Section
                title="Product Information"
              >
                <div
                  className="
                    mt-4
                    grid
                    gap-4
                    sm:grid-cols-2
                  "
                >
                  <InfoItem
                    label="Product Code"
                    value={
                      contract.product_code
                    }
                  />

                  <InfoItem
                    label="Product Type"
                    value={
                      productTypeLabel(
                        contract.product_type
                      )
                    }
                  />

                  <InfoItem
                    label="Rice Variety / Variant"
                    value={
                      contract.rice_variety
                    }
                  />

                  <InfoItem
                    label="Grade / Classification"
                    value={
                      contract.product_grade
                    }
                  />

                  <InfoItem
                    label="Contracted Quantity"
                    value={
                      formatQuantity(
                        contractedQuantity
                      )
                    }
                  />

                  <InfoItem
                    label="Agreed Price / kg"
                    value={
                      formatPeso(
                        contract.agreed_price_per_kg
                      )
                    }
                  />
                </div>


                <div
                  className="
                    mt-4
                    rounded-xl
                    bg-emerald-50
                    p-4
                  "
                >
                  <InfoItem
                    label="Total Contract Value"
                    value={
                      formatPeso(
                        contract.total_contract_value
                      )
                    }
                  />
                </div>


                {contract.product_description && (
                  <div
                    className="
                      mt-3
                      rounded-xl
                      border
                      border-slate-200
                      bg-slate-50
                      p-3
                    "
                  >
                    <InfoItem
                      label="Product Description"
                      value={
                        contract.product_description
                      }
                    />
                  </div>
                )}
              </Section>


              {/* FULFILLMENT */}

              <Section
                title="Fulfillment Information"
              >
                <div
                  className="
                    mt-4
                    grid
                    gap-4
                    sm:grid-cols-2
                  "
                >
                  <InfoItem
                    label="Method"
                    value={
                      fulfillmentMethodLabel(
                        contract.fulfillment_method
                      )
                    }
                  />

                  <InfoItem
                    label="Fulfillment Date"
                    value={
                      formatDate(
                        contract.fulfillment_date
                      )
                    }
                  />

                  <InfoItem
                    label="Quantity Fulfilled"
                    value={
                      formatQuantity(
                        fulfilledQuantity
                      )
                    }
                  />

                  <InfoItem
                    label="Remaining Quantity"
                    value={
                      formatQuantity(
                        remainingQuantity
                      )
                    }
                  />
                </div>


                <div
                  className="
                    mt-4
                    flex
                    items-center
                    gap-2
                  "
                >
                  <span
                    className="
                      text-xs
                      text-slate-400
                    "
                  >
                    Fulfillment Status
                  </span>

                  <span
                    className={`
                      rounded-full
                      px-2.5
                      py-1
                      text-[10px]
                      font-bold
                      uppercase

                      ${
                        FULFILLMENT_STATUS_STYLES[
                          fulfillmentStatus
                        ]
                        || "bg-slate-100 text-slate-600"
                      }
                    `}
                  >
                    {titleCase(
                      fulfillmentStatus
                    )}
                  </span>
                </div>


                <div
                  className="
                    mt-4
                    rounded-xl
                    bg-slate-50
                    p-3
                  "
                >
                  <InfoItem
                    label="Pickup / Delivery Location"
                    value={
                      contract.fulfillment_location
                    }
                  />
                </div>
              </Section>


              {/* TERMS */}

              <Section
                title="Contract Terms"
              >
                <p
                  className="
                    mt-3
                    whitespace-pre-wrap
                    rounded-xl
                    bg-slate-50
                    p-3
                    text-sm
                    leading-6
                    text-slate-700
                  "
                >
                  {contract.agreed_terms
                    || "No additional terms were recorded."}
                </p>
              </Section>


              {/* SIGNATURE */}

              <Section
                title="Electronic Signatures"
              >
                <div
                  className="
                    mt-4
                    grid
                    gap-3
                    sm:grid-cols-2
                  "
                >
                  <div
                    className="
                      rounded-xl
                      bg-slate-50
                      p-3
                    "
                  >
                    <InfoItem
                      label="Farmer Signature"
                      value={
                        contract.farmer_signature_path
                          ? "Signed"
                          : "Not Signed"
                      }
                    />

                    <p
                      className="
                        mt-2
                        text-xs
                        text-slate-500
                      "
                    >
                      {formatDate(
                        contract.farmer_signed_at,
                        true
                      )}
                    </p>
                  </div>


                  <div
                    className="
                      rounded-xl
                      bg-slate-50
                      p-3
                    "
                  >
                    <InfoItem
                      label="Miller Signature"
                      value={
                        contract.miller_signature_path
                          ? "Signed"
                          : "Signature Required"
                      }
                    />

                    <p
                      className="
                        mt-2
                        text-xs
                        text-slate-500
                      "
                    >
                      {formatDate(
                        contract.miller_signed_at,
                        true
                      )}
                    </p>
                  </div>
                </div>
              </Section>


              {/* E-SIGN PANEL */}

              {actionPanel ===
                "signature"
                && canSign && (
                <Section
                  title="E-Sign Contract"
                  description="Use your mouse on desktop or your finger/stylus on mobile."
                >
                  <div
                    className="
                      mt-4
                      overflow-x-auto
                    "
                  >
                    <SignaturePad
                      onSave={
                        handleSignatureSave
                      }
                      onClear={
                        handleSignatureClear
                      }
                      width={600}
                      height={180}
                    />
                  </div>


                  {signatureError && (
                    <p
                      className="
                        mt-2
                        text-xs
                        font-medium
                        text-red-600
                      "
                    >
                      {signatureError}
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
                        setActionPanel(
                          ""
                        );

                        setSavedSignature(
                          ""
                        );
                      }}
                      className="
                        rounded-xl
                        border
                        border-slate-200
                        px-4
                        py-2.5
                        text-sm
                        font-normal
                        text-slate-600
                      "
                    >
                      Back
                    </button>


                    <button
                      type="button"
                      onClick={
                        handleSign
                      }
                      disabled={
                        !savedSignature
                        || isActionLoading
                      }
                      className="
                        rounded-xl
                        bg-[#0B5D1E]
                        px-4
                        py-2.5
                        text-sm
                        font-normal
                        text-white
                        disabled:opacity-50
                      "
                    >
                      Confirm E-Signature
                    </button>
                  </div>
                </Section>
              )}


              {/* VOID PANEL */}

              {actionPanel ===
                "void"
                && canRequestVoid && (
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
                    Request to Void Contract
                  </h3>


                  <div
                    className="
                      mt-4
                      space-y-4
                    "
                  >
                    <label
                      className="
                        block
                      "
                    >
                      <span
                        className="
                          text-xs
                          font-semibold
                          text-slate-700
                        "
                      >
                        Reason *
                      </span>

                      <select
                        value={
                          voidReason
                        }
                        onChange={
                          (
                            event
                          ) => {
                            setVoidReason(
                              event.target.value
                            );

                            setVoidError(
                              ""
                            );
                          }
                        }
                        className="
                          mt-1.5
                          w-full
                          rounded-xl
                          border
                          border-slate-200
                          bg-white
                          px-3.5
                          py-2.5
                          text-sm
                          outline-none
                        "
                      >
                        <option value="">
                          Select Reason
                        </option>

                        {VOID_REASONS.map(
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


                    <label
                      className="
                        block
                      "
                    >
                      <span
                        className="
                          text-xs
                          font-semibold
                          text-slate-700
                        "
                      >
                        Explanation / Remarks
                      </span>

                      <textarea
                        rows={4}
                        maxLength={1500}
                        value={
                          voidRemarks
                        }
                        onChange={
                          (
                            event
                          ) => {
                            setVoidRemarks(
                              event.target.value
                            );

                            setVoidError(
                              ""
                            );
                          }
                        }
                        className="
                          mt-1.5
                          w-full
                          resize-none
                          rounded-xl
                          border
                          border-slate-200
                          bg-white
                          px-3.5
                          py-2.5
                          text-sm
                          outline-none
                        "
                      />

                      <p
                        className="
                          mt-1
                          text-right
                          text-[11px]
                          text-slate-400
                        "
                      >
                        {voidRemarks.length}/1500
                      </p>
                    </label>
                  </div>


                  {voidError && (
                    <p
                      className="
                        mt-2
                        text-xs
                        text-red-600
                      "
                    >
                      {voidError}
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
                      onClick={
                        () =>
                          setActionPanel(
                            ""
                          )
                      }
                      className="
                        rounded-xl
                        border
                        border-slate-200
                        bg-white
                        px-4
                        py-2.5
                        text-sm
                        font-normal
                      "
                    >
                      Back
                    </button>


                    <button
                      type="button"
                      onClick={
                        handleVoid
                      }
                      disabled={
                        isActionLoading
                      }
                      className="
                        rounded-xl
                        bg-red-600
                        px-4
                        py-2.5
                        text-sm
                        font-normal
                        text-white
                      "
                    >
                      Submit Void Request
                    </button>
                  </div>
                </section>
              )}


              {(actionError
                || contractError) && (
                <div
                  className="
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
                  {actionError
                    || contractError}
                </div>
              )}
            </>

          ) : (
            <div
              className="
                py-16
                text-center
                text-sm
                text-slate-500
              "
            >
              Contract details are unavailable.
            </div>
          )}
        </div>


        {/* ==================================================
            FOOTER
        ================================================== */}

        {contract
          && !isLoading && (
          <div
            className="
              flex
              flex-wrap
              justify-end
              gap-2
              border-t
              border-slate-200
              bg-white
              px-4
              py-4
              sm:px-5
            "
          >
            <button
              type="button"
              onClick={
                handleMessageFarmer
              }
              className="
                inline-flex
                items-center
                gap-2
                rounded-xl
                border
                border-slate-200
                bg-white
                px-3.5
                py-2.5
                text-sm
                font-normal
                text-slate-700
                hover:bg-slate-50
              "
            >
              <MessageCircle
                size={15}
              />

              Message Farmer
            </button>


            <button
              type="button"
              onClick={
                handleDownloadPdf
              }
              className="
                inline-flex
                items-center
                gap-2
                rounded-xl
                border
                border-slate-200
                bg-white
                px-3.5
                py-2.5
                text-sm
                font-normal
                text-slate-700
                hover:bg-slate-50
              "
            >
              <Download
                size={15}
              />

              Download PDF
            </button>


            {canRequestVoid && (
              <button
                type="button"
                onClick={() => {
                  onClearActionError?.();

                  setActionPanel(
                    "void"
                  );
                }}
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-red-200
                  bg-white
                  px-3.5
                  py-2.5
                  text-sm
                  font-normal
                  text-red-600
                  hover:bg-red-50
                "
              >
                <XCircle
                  size={15}
                />

                Request to Void
              </button>
            )}


            {canSign && (
              <button
                type="button"
                onClick={() => {
                  onClearActionError?.();

                  setActionPanel(
                    "signature"
                  );
                }}
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-[#0B5D1E]
                  bg-white
                  px-3.5
                  py-2.5
                  text-sm
                  font-normal
                  text-[#0B5D1E]
                  hover:bg-emerald-50
                "
              >
                <FileSignature
                  size={15}
                />

                E-Sign
              </button>
            )}


            {contractStatus ===
              "completed" ? (
              <button
                type="button"
                disabled
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-xl
                  bg-emerald-100
                  px-3.5
                  py-2.5
                  text-sm
                  font-normal
                  text-emerald-700
                "
              >
                <CheckCircle2
                  size={15}
                />

                Completed
              </button>

            ) : (
              <button
                type="button"
                onClick={
                  handleComplete
                }
                disabled={
                  !canComplete
                  || isActionLoading
                }
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-xl
                  bg-[#0B5D1E]
                  px-3.5
                  py-2.5
                  text-sm
                  font-normal
                  text-white
                  hover:bg-[#094d19]
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                {isActionLoading ? (
                  <Loader2
                    size={15}
                    className="
                      animate-spin
                    "
                  />

                ) : (
                  <CheckCircle2
                    size={15}
                  />
                )}

                Mark as Completed
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}