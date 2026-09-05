import { useEffect } from "react";
import { createPortal } from "react-dom";

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  MapPin,
  Package,
  Scale,
  Store,
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
// Read-only details modal for historical Farmer contracts.
//
// OPENED FROM:
//
// Transaction History
//      ↓
// Contract History
//      ↓
// View Details
//
//
// IMPORTANT:
//
// - Modal is rendered through document.body.
// - Covers Navbar, Sidebar, and Page Content.
// - Backdrop click does NOT close the modal.
// - X is the only close control.
// - No contract-editing actions.
// - No Request to Void.
// - No E-Sign.
// - No Mark as Completed.
//
// Historical contracts are read-only.
// ============================================================


// ============================================================
// FORMAT CURRENCY
// ============================================================

const formatCurrency = (value) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "—";
  }

  return numeric.toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};


// ============================================================
// FORMAT QUANTITY
// ============================================================

const formatQuantity = (value) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "—";
  }

  return `${numeric.toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} kg`;
};


// ============================================================
// FORMAT DATE
// ============================================================

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};


// ============================================================
// FORMAT DATE + TIME
// ============================================================

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
};


// ============================================================
// FORMAT ENUM / IDENTIFIER
// ============================================================

const formatLabel = (value) => {
  if (!value) {
    return "—";
  }

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};


// ============================================================
// CONTRACT SOURCE
// ============================================================

const formatContractSource = (value) => {
  switch (value) {
    case "posting_application":
      return "Posting Application";

    case "bidding_offer":
      return "Bidding Offer";

    default:
      return formatLabel(value);
  }
};


// ============================================================
// PRODUCT TYPE
// ============================================================

const formatProductType = (value) => {
  switch (value) {
    case "unmilled_palay":
      return "Unmilled Palay";

    case "milled_rice":
      return "Milled Rice";

    default:
      return formatLabel(value);
  }
};


// ============================================================
// ADDRESS BUILDER
// ============================================================

const buildFarmAddress = (contract) => {
  const values = [
    contract?.farm_street_address,
    contract?.farm_barangay,
    contract?.farm_municipality,
    contract?.farm_province,
    contract?.farm_postal_code,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return values.length > 0
    ? values.join(", ")
    : "—";
};


// ============================================================
// MILLER DISPLAY NAME
// ============================================================

const getMillerDisplayName = (contract) => {
  return (
    contract?.business_name ||
    contract?.organization_name ||
    contract?.miller_name ||
    "—"
  );
};


// ============================================================
// STATUS STYLE
// ============================================================

const getStatusStyle = (status) => {
  switch (String(status || "").toLowerCase()) {
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "voided":
      return "border-rose-200 bg-rose-50 text-rose-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
};


// ============================================================
// SECTION
// ============================================================

const Section = ({
  icon: Icon,
  title,
  children,
}) => {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
          <Icon size={17} />
        </div>

        <h3 className="text-sm font-bold text-slate-900">
          {title}
        </h3>
      </div>

      <div className="p-5">
        {children}
      </div>
    </section>
  );
};


// ============================================================
// DETAIL FIELD
// ============================================================

const DetailField = ({
  label,
  value,
  fullWidth = false,
}) => {
  return (
    <div className={fullWidth ? "sm:col-span-2" : ""}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold leading-6 text-slate-800">
        {value || "—"}
      </p>
    </div>
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
  // LOCK BACKGROUND SCROLL
  // =========================================================

  useEffect(() => {
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
  }, [open]);


  // =========================================================
  // ESC KEY
  // =========================================================

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
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
  }, [
    open,
    onClose,
  ]);


  // =========================================================
  // CLOSED
  // =========================================================

  if (!open) {
    return null;
  }


  // =========================================================
  // PORTAL
  // =========================================================

  return createPortal(
    <div
      className="
        fixed
        inset-0
        z-[9999]
        flex
        items-center
        justify-center
        bg-slate-950/55
        px-4
        py-6
      "
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="farmer-contract-history-modal-title"
        className="
          relative
          flex
          max-h-[92vh]
          w-full
          max-w-4xl
          flex-col
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-slate-50
          shadow-2xl
        "
      >

        {/* ===================================================
            HEADER
        ==================================================== */}

        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100">
              <FileText
                size={20}
                className="text-green-700"
              />
            </div>


            <div>
              <h2
                id="farmer-contract-history-modal-title"
                className="text-xl font-extrabold tracking-[-0.02em] text-slate-900"
              >
                Contract Details
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Historical contract record
              </p>
            </div>

          </div>


          {/* =================================================
              X CLOSE
          ================================================== */}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close contract details"
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
              <X size={18} />
            </button>
          )}
        </div>


        {/* ===================================================
            BODY
        ==================================================== */}

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">

          {/* =================================================
              LOADING
          ================================================== */}

          {isLoading ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2
                size={30}
                className="animate-spin text-green-700"
              />

              <p className="text-sm font-medium">
                Loading contract details...
              </p>
            </div>
          ) : !contract ? (

            /* ===============================================
               NO DATA
            ================================================ */

            <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <FileText
                  size={22}
                  className="text-slate-400"
                />
              </div>

              <div>
                <p className="font-semibold text-slate-700">
                  Contract details unavailable
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  The historical contract record could not be loaded.
                </p>
              </div>
            </div>
          ) : (

            /* ===============================================
               CONTRACT DATA
            ================================================ */

            <div className="space-y-5">

              {/* =============================================
                  CONTRACT SUMMARY
              ============================================== */}

              <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Contract ID
                  </p>

                  <p className="mt-1 text-lg font-extrabold text-slate-900">
                    {contract.contract_code || "—"}
                  </p>
                </div>


                <span
                  className={`
                    inline-flex
                    w-fit
                    items-center
                    rounded-full
                    border
                    px-3
                    py-1.5
                    text-xs
                    font-bold
                    ${getStatusStyle(
                      contract.contract_status
                    )}
                  `}
                >
                  {formatLabel(
                    contract.contract_status
                  )}
                </span>

              </div>


              {/* =============================================
                  CONTRACT INFORMATION
              ============================================== */}

              <Section
                icon={CalendarDays}
                title="Contract Information"
              >
                <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">

                  <DetailField
                    label="Contract ID"
                    value={
                      contract.contract_code
                    }
                  />

                  <DetailField
                    label="Contract Status"
                    value={
                      formatLabel(
                        contract.contract_status
                      )
                    }
                  />

                  <DetailField
                    label="Contract Created Date"
                    value={
                      formatDateTime(
                        contract.created_at
                      )
                    }
                  />

                  <DetailField
                    label="Last Updated"
                    value={
                      formatDateTime(
                        contract.updated_at
                      )
                    }
                  />

                  <DetailField
                    label="Contract Start Date"
                    value={
                      formatDate(
                        contract.contract_start_date
                      )
                    }
                  />

                  <DetailField
                    label="Fulfillment Date"
                    value={
                      formatDate(
                        contract.fulfillment_date
                      )
                    }
                  />

                  <DetailField
                    label="Contract Source"
                    value={
                      formatContractSource(
                        contract.contract_source
                      )
                    }
                  />

                </div>
              </Section>


              {/* =============================================
                  MILLER INFORMATION
              ============================================== */}

              <Section
                icon={Store}
                title="Miller Information"
              >
                <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">

                  <DetailField
                    label="Miller / Business"
                    value={
                      getMillerDisplayName(
                        contract
                      )
                    }
                  />

                  <DetailField
                    label="Representative"
                    value={
                      contract.miller_name ||
                      "—"
                    }
                  />

                  <DetailField
                    label="Official Email"
                    value={
                      contract.official_email ||
                      "—"
                    }
                  />

                  <DetailField
                    label="Contact Number"
                    value={
                      contract.official_contact_number ||
                      "—"
                    }
                  />

                </div>
              </Section>


              {/* =============================================
                  FARM INFORMATION
              ============================================== */}

              <Section
                icon={MapPin}
                title="Farm Information"
              >
                <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">

                  <DetailField
                    label="Farm / Farm Lot"
                    value={
                      contract.farm_name ||
                      "—"
                    }
                  />

                  <DetailField
                    label="Farm Location"
                    value={
                      buildFarmAddress(
                        contract
                      )
                    }
                    fullWidth
                  />

                </div>
              </Section>


              {/* =============================================
                  PRODUCT INFORMATION
              ============================================== */}

              <Section
                icon={Package}
                title="Product Information"
              >
                <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">

                  <DetailField
                    label="Product Code"
                    value={
                      contract.product_code ||
                      "—"
                    }
                  />

                  <DetailField
                    label="Product Type"
                    value={
                      formatProductType(
                        contract.product_type
                      )
                    }
                  />

                  <DetailField
                    label="Rice Variety"
                    value={
                      contract.rice_variety ||
                      "—"
                    }
                  />

                  <DetailField
                    label="Product Grade / Classification"
                    value={
                      contract.product_grade ||
                      "—"
                    }
                  />

                  <DetailField
                    label="Product Description"
                    value={
                      contract.product_description ||
                      "—"
                    }
                    fullWidth
                  />

                  <DetailField
                    label="Contracted Quantity"
                    value={
                      formatQuantity(
                        contract.contracted_quantity_kg
                      )
                    }
                  />

                  <DetailField
                    label="Agreed Price per kg"
                    value={
                      formatCurrency(
                        contract.agreed_price_per_kg
                      )
                    }
                  />

                  <DetailField
                    label="Total Contract Value"
                    value={
                      formatCurrency(
                        contract.total_contract_value
                      )
                    }
                  />

                </div>
              </Section>


              {/* =============================================
                  FULFILLMENT INFORMATION
              ============================================== */}

              <Section
                icon={Scale}
                title="Fulfillment Information"
              >
                <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">

                  <DetailField
                    label="Fulfillment Method"
                    value={
                      formatLabel(
                        contract.fulfillment_method
                      )
                    }
                  />

                  <DetailField
                    label="Fulfillment Status"
                    value={
                      formatLabel(
                        contract.fulfillment_status
                      )
                    }
                  />

                  <DetailField
                    label="Pickup / Delivery Location"
                    value={
                      contract.fulfillment_location ||
                      "—"
                    }
                    fullWidth
                  />

                  <DetailField
                    label="Quantity Fulfilled"
                    value={
                      formatQuantity(
                        contract.quantity_fulfilled_kg
                      )
                    }
                  />

                  <DetailField
                    label="Remaining Quantity"
                    value={
                      formatQuantity(
                        contract.remaining_quantity_kg
                      )
                    }
                  />

                </div>
              </Section>


              {/* =============================================
                  CONTRACT TERMS
              ============================================== */}

              <Section
                icon={FileText}
                title="Contract Terms"
              >
                <DetailField
                  label="Additional Notes / Agreed Deal / Terms"
                  value={
                    contract.agreed_terms ||
                    "No additional terms recorded."
                  }
                  fullWidth
                />
              </Section>


              {/* =============================================
                  E-SIGNATURE INFORMATION
              ============================================== */}

              <Section
                icon={CheckCircle2}
                title="E-Signature Information"
              >
                <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">

                  <DetailField
                    label="Farmer Signature Status"
                    value={
                      contract.farmer_signed_at
                        ? "Signed"
                        : "Not Signed"
                    }
                  />

                  <DetailField
                    label="Farmer Date / Time Signed"
                    value={
                      formatDateTime(
                        contract.farmer_signed_at
                      )
                    }
                  />

                  <DetailField
                    label="Miller Signature Status"
                    value={
                      contract.miller_signed_at
                        ? "Signed"
                        : "Not Signed"
                    }
                  />

                  <DetailField
                    label="Miller Date / Time Signed"
                    value={
                      formatDateTime(
                        contract.miller_signed_at
                      )
                    }
                  />

                </div>
              </Section>


              {/* =============================================
                  VOID INFORMATION
                  ONLY FOR VOIDED / VOID RECORDS
              ============================================== */}

              {(
                contract.contract_status === "voided" ||
                contract.void_reason ||
                contract.void_remarks ||
                contract.void_requested_at
              ) && (
                <Section
                  icon={Clock3}
                  title="Void Information"
                >
                  <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">

                    <DetailField
                      label="Requested By"
                      value={
                        formatLabel(
                          contract.void_requested_by
                        )
                      }
                    />

                    <DetailField
                      label="Requested Date"
                      value={
                        formatDateTime(
                          contract.void_requested_at
                        )
                      }
                    />

                    <DetailField
                      label="Void Reason"
                      value={
                        contract.void_reason ||
                        "—"
                      }
                      fullWidth
                    />

                    <DetailField
                      label="Remarks"
                      value={
                        contract.void_remarks ||
                        "—"
                      }
                      fullWidth
                    />

                  </div>
                </Section>
              )}

            </div>
          )}

        </div>

      </div>
    </div>,
    document.body
  );
}