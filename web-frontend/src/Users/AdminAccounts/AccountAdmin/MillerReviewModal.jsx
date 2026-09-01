import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  User,
  X,
} from "lucide-react";


const EMPTY_VALUE = "Not provided";


const displayValue = (value) => {
  const cleaned = String(value ?? "").trim();

  return cleaned || EMPTY_VALUE;
};


const formatFullName = (personal = {}) => {
  return [
    personal.first_name,
    personal.middle_initial,
    personal.last_name,
    personal.suffix,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" ") || EMPTY_VALUE;
};


const formatAddress = (address = {}) => {
  return [
    address.street_address,
    address.barangay,
    address.municipality,
    address.province,
    address.postal_code,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ") || EMPTY_VALUE;
};


const formatDate = (value) => {
  if (!value) {
    return EMPTY_VALUE;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return displayValue(value);
  }

  return date.toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};


const Field = ({
  label,
  value,
}) => {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-400">
        {label}
      </p>

      <p className="break-words text-[13px] font-medium leading-5 text-slate-700">
        {displayValue(value)}
      </p>
    </div>
  );
};


const Section = ({
  icon: Icon,
  title,
  children,
}) => {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2.5 border-b border-slate-100 pb-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#08631f]">
          <Icon size={16} />
        </div>

        <h3 className="text-[13px] font-bold text-slate-900">
          {title}
        </h3>
      </div>

      {children}
    </section>
  );
};


const DocumentCard = ({
  title,
  document,
}) => {
  const url = document?.url;

  return (
    <div className="flex min-h-[76px] items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#08631f] shadow-sm">
          <FileText size={17} />
        </div>

        <div className="min-w-0">
          <p className="text-[12px] font-bold leading-5 text-slate-800">
            {title}
          </p>

          <p className="text-[10px] text-slate-400">
            Submitted verification document
          </p>
        </div>
      </div>

      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="
            inline-flex
            shrink-0
            items-center
            gap-1.5
            rounded-lg
            border
            border-emerald-200
            bg-white
            px-3
            py-2
            text-[11px]
            font-bold
            text-[#08631f]
            transition
            hover:border-emerald-300
            hover:bg-emerald-50
          "
        >
          View

          <ExternalLink size={12} />
        </a>
      ) : (
        <span className="shrink-0 text-[10px] font-semibold text-red-500">
          Unavailable
        </span>
      )}
    </div>
  );
};


const LoadingState = () => {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-[#08631f]" />

        <p className="text-sm font-semibold text-slate-700">
          Loading Miller application...
        </p>

        <p className="mt-1 text-xs text-slate-400">
          Retrieving applicant information and documents.
        </p>
      </div>
    </div>
  );
};


const MillerReviewModal = ({
  isOpen,
  onClose,
  miller,
  isLoading = false,
  isConfirming = false,
  onMessage,
  onConfirm,
}) => {

  // =========================================================
  // LOCK PAGE SCROLL WHILE MODAL IS OPEN
  // =========================================================

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [isOpen]);


  if (!isOpen) {
    return null;
  }


  // =========================================================
  // DATA
  // =========================================================

  const personal =
    miller?.personal_information || {};

  const personalAddress =
    miller?.personal_address || {};

  const account =
    miller?.account_information || {};

  const business =
    miller?.business_information || {};

  const documents =
    miller?.documents || {};


  const fullName =
    formatFullName(personal);


  const personalFullAddress =
    formatAddress(personalAddress);


  const businessFullAddress =
    formatAddress({
      street_address:
        business.street_address,

      barangay:
        business.barangay,

      municipality:
        business.municipality,

      province:
        business.province,

      postal_code:
        business.postal_code,
    });


  // =========================================================
  // MODAL
  // =========================================================

  const modal = (
    <div
      className="
        fixed
        inset-0
        z-[9999]
        flex
        items-center
        justify-center
        bg-slate-950/50
        p-4
        sm:p-6
        backdrop-blur-[2px]
      "
    >

      {/* IMPORTANT:
          No backdrop click handler.
          Clicking outside WILL NOT close the modal.
      */}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="miller-review-title"
        onClick={(event) =>
          event.stopPropagation()
        }
        className="
          flex
          h-auto
          max-h-[calc(100vh-48px)]
          w-full
          max-w-[980px]
          flex-col
          overflow-hidden
          rounded-[22px]
          border
          border-slate-200
          bg-white
          shadow-[0_25px_70px_rgba(15,23,42,0.28)]
        "
      >

        {/* ===================================================
            HEADER
        =================================================== */}

        <div
          className="
            shrink-0
            border-b
            border-slate-200
            bg-white
            px-6
            py-5
          "
        >
          <div className="flex items-start justify-between gap-6">

            <div className="min-w-0">

              <div className="mb-2 flex flex-wrap items-center gap-2">

                <span
                  className="
                    inline-flex
                    items-center
                    rounded-full
                    bg-amber-100
                    px-2.5
                    py-1
                    text-[10px]
                    font-extrabold
                    uppercase
                    tracking-wide
                    text-amber-700
                  "
                >
                  To Review
                </span>


                {miller?.user_id && (
                  <span className="text-[11px] font-medium text-slate-400">
                    Application ID #{miller.user_id}
                  </span>
                )}

              </div>


              <h2
                id="miller-review-title"
                className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-[22px]"
              >
                Miller Application Review
              </h2>


              <p className="mt-1 text-[12px] leading-5 text-slate-500">
                Review the applicant information and verification documents before confirming the account.
              </p>

            </div>


            <button
              type="button"
              onClick={() => {
                if (!isConfirming) {
                  onClose?.();
                }
              }}
              disabled={isConfirming}
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
                hover:border-slate-300
                hover:bg-slate-100
                hover:text-slate-700
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
              aria-label="Close Miller review"
            >
              <X size={18} />
            </button>

          </div>
        </div>


        {/* ===================================================
            SCROLLABLE BODY
        =================================================== */}

        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            bg-[#fafcfb]
            px-6
            py-5
            scrollbar-thin
          "
        >

          {isLoading ? (

            <LoadingState />

          ) : !miller ? (

            <div className="flex min-h-[420px] items-center justify-center">

              <div className="text-center">

                <p className="text-sm font-bold text-slate-700">
                  Unable to load Miller information.
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Close this window and try reviewing the application again.
                </p>

              </div>

            </div>

          ) : (

            <div className="space-y-4">


              {/* =================================================
                  APPLICANT SUMMARY
              ================================================= */}

              <div
                className="
                  rounded-2xl
                  border
                  border-emerald-100
                  bg-gradient-to-r
                  from-emerald-50
                  via-emerald-50/40
                  to-white
                  p-5
                "
              >

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

                  <div className="flex min-w-0 items-center gap-4">

                    <div
                      className="
                        flex
                        h-12
                        w-12
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        bg-[#08631f]
                        text-white
                        shadow-sm
                      "
                    >
                      <User size={21} />
                    </div>


                    <div className="min-w-0">

                      <p className="truncate text-[15px] font-extrabold text-slate-900">
                        {fullName}
                      </p>

                      <p className="mt-0.5 truncate text-[12px] font-medium text-slate-500">
                        {displayValue(
                          business.business_name
                        )}
                      </p>

                    </div>

                  </div>


                  <div className="shrink-0 sm:text-right">

                    <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">
                      Application Submitted
                    </p>

                    <p className="mt-1 text-[12px] font-semibold text-slate-700">
                      {formatDate(
                        account.created_at
                      )}
                    </p>

                  </div>

                </div>

              </div>


              {/* =================================================
                  PERSONAL + ACCOUNT
              ================================================= */}

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">


                {/* PERSONAL */}

                <Section
                  icon={User}
                  title="Personal Information"
                >

                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">

                    <Field
                      label="First Name"
                      value={personal.first_name}
                    />

                    <Field
                      label="Middle Initial"
                      value={personal.middle_initial}
                    />

                    <Field
                      label="Last Name"
                      value={personal.last_name}
                    />

                    <Field
                      label="Suffix"
                      value={personal.suffix}
                    />

                    <Field
                      label="Gender"
                      value={personal.gender}
                    />

                  </div>

                </Section>


                {/* ACCOUNT */}

                <Section
                  icon={Mail}
                  title="Account Information"
                >

                  <div className="space-y-4">


                    <div>

                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Email Address
                      </p>

                      <div className="flex items-center gap-2 text-[13px] font-medium text-slate-700">

                        <Mail
                          size={14}
                          className="shrink-0 text-slate-400"
                        />

                        <span className="break-all">
                          {displayValue(
                            account.email
                          )}
                        </span>

                      </div>

                    </div>


                    <div>

                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Contact Number
                      </p>

                      <div className="flex items-center gap-2 text-[13px] font-medium text-slate-700">

                        <Phone
                          size={14}
                          className="shrink-0 text-slate-400"
                        />

                        <span>
                          {displayValue(
                            account.contact_number
                          )}
                        </span>

                      </div>

                    </div>


                    <Field
                      label="Username"
                      value={account.username}
                    />

                  </div>

                </Section>

              </div>


              {/* =================================================
                  PERSONAL ADDRESS
              ================================================= */}

              <Section
                icon={MapPin}
                title="Personal Address"
              >

                <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3">

                  <p className="text-[12px] font-medium leading-5 text-slate-600">
                    {personalFullAddress}
                  </p>

                </div>


                <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">

                  <Field
                    label="Province"
                    value={personalAddress.province}
                  />

                  <Field
                    label="Municipality / City"
                    value={personalAddress.municipality}
                  />

                  <Field
                    label="Postal Code"
                    value={personalAddress.postal_code}
                  />

                  <Field
                    label="Barangay"
                    value={personalAddress.barangay}
                  />

                  <Field
                    label="Street Address"
                    value={personalAddress.street_address}
                  />

                </div>

              </Section>


              {/* =================================================
                  BUSINESS
              ================================================= */}

              <Section
                icon={Building2}
                title="Miller / Business Information"
              >

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                  <Field
                    label="Business Name"
                    value={business.business_name}
                  />

                  <Field
                    label="Organization Name"
                    value={business.organization_name}
                  />

                </div>


                <div className="my-4 rounded-xl bg-slate-50 px-4 py-3">

                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Complete Business Address
                  </p>

                  <p className="text-[12px] font-medium leading-5 text-slate-600">
                    {businessFullAddress}
                  </p>

                </div>


                <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">

                  <Field
                    label="Province"
                    value={business.province}
                  />

                  <Field
                    label="Municipality / City"
                    value={business.municipality}
                  />

                  <Field
                    label="Postal Code"
                    value={business.postal_code}
                  />

                  <Field
                    label="Barangay"
                    value={business.barangay}
                  />

                  <Field
                    label="Street Address"
                    value={business.street_address}
                  />

                </div>


                <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">

                  <Field
                    label="Official Email Address"
                    value={business.official_email}
                  />

                  <Field
                    label="Official Contact Number"
                    value={business.official_contact_number}
                  />

                </div>

              </Section>


              {/* =================================================
                  DOCUMENTS
              ================================================= */}

              <Section
                icon={FileText}
                title="Verification Documents"
              >

                <p className="-mt-1 mb-4 text-[11px] leading-5 text-slate-500">
                  Review all four submitted documents before confirming this Miller application.
                </p>


                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

                  <DocumentCard
                    title="Valid Government-Issued ID"
                    document={
                      documents.government_issued_id
                    }
                  />

                  <DocumentCard
                    title="Mayor's / Business Permit"
                    document={
                      documents.business_permit
                    }
                  />

                  <DocumentCard
                    title="DTI / SEC / CDA Registration"
                    document={
                      documents.business_registration
                    }
                  />

                  <DocumentCard
                    title="BPI / NFA / Milling License"
                    document={
                      documents.milling_license
                    }
                  />

                </div>

              </Section>


              {/* =================================================
                  NOTICE
              ================================================= */}

              <div
                className="
                  flex
                  items-start
                  gap-3
                  rounded-xl
                  border
                  border-emerald-200
                  bg-emerald-50
                  px-4
                  py-3.5
                "
              >

                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0 text-[#08631f]"
                />


                <div>

                  <p className="text-[12px] font-bold text-slate-800">
                    Confirmation will activate this Miller account.
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-slate-500">
                    After confirmation, the applicant will move to the Active tab and receive a confirmation email.
                  </p>

                </div>

              </div>


            </div>
          )}

        </div>


        {/* ===================================================
            FOOTER
        =================================================== */}

        <div
          className="
            shrink-0
            border-t
            border-slate-200
            bg-white
            px-6
            py-4
          "
        >

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">


            {/* MESSAGE */}

            <button
              type="button"
              onClick={() =>
                onMessage?.(miller)
              }
              disabled={
                isLoading ||
                isConfirming ||
                !miller
              }
              className="
                inline-flex
                h-[40px]
                min-w-[105px]
                items-center
                justify-center
                gap-2
                rounded-lg
                border
                border-slate-300
                bg-white
                px-5
                text-[12px]
                font-bold
                text-slate-600
                transition
                hover:border-[#08631f]
                hover:bg-emerald-50
                hover:text-[#08631f]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              <MessageSquare size={15} />

              Message
            </button>


            {/* CONFIRM */}

            <button
              type="button"
              onClick={() =>
                onConfirm?.(miller)
              }
              disabled={
                isLoading ||
                isConfirming ||
                !miller
              }
              className="
                inline-flex
                h-[40px]
                min-w-[150px]
                items-center
                justify-center
                gap-2
                rounded-lg
                bg-[#08751e]
                px-6
                text-[12px]
                font-bold
                text-white
                shadow-sm
                transition
                hover:bg-[#066319]
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >

              <CheckCircle2 size={15} />

              {isConfirming
                ? "Confirming..."
                : "Confirm Application"}

            </button>

          </div>

        </div>

      </div>
    </div>
  );


  // =========================================================
  // PORTAL
  // =========================================================

  return createPortal(
    modal,
    document.body
  );
};


export default MillerReviewModal;