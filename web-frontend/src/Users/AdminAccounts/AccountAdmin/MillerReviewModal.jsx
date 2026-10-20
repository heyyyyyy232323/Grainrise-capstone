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
  return (
    [
      personal.first_name,
      personal.middle_initial,
      personal.last_name,
      personal.suffix,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" ") || EMPTY_VALUE
  );
};

const formatAddress = (address = {}) => {
  return (
    [
      address.street_address,
      address.barangay,
      address.municipality,
      address.province,
      address.postal_code,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(", ") || EMPTY_VALUE
  );
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

const Field = ({ label, value }) => {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[11px] font-medium text-slate-400">
        {label}
      </p>
      <p className="break-words text-[13px] font-normal leading-5 text-slate-800">
        {displayValue(value)}
      </p>
    </div>
  );
};

const Section = ({ icon: Icon, title, children }) => {
  return (
    <section className="rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
      <div className="mb-3.5 flex items-center gap-2.5 border-b border-slate-100 pb-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#08631f]">
          <Icon size={15} />
        </div>
        <h3 className="text-[13px] font-semibold text-slate-800">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
};

const DocumentCard = ({ title, document }) => {
  const url = document?.url;

  return (
    <div className="flex min-h-[68px] items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-slate-50/70 px-3.5 py-2.5 transition hover:bg-slate-50">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#08631f] shadow-xs border border-slate-200/60">
          <FileText size={15} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[12px] font-medium text-slate-800" title={title}>
            {title}
          </p>
          <p className="text-[10px] text-slate-400 font-normal">
            Submitted verification document
          </p>
        </div>
      </div>

      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-[#08631f] transition hover:border-emerald-300 hover:bg-emerald-50"
        >
          View
          <ExternalLink size={11} />
        </a>
      ) : (
        <span className="shrink-0 text-[10px] font-normal text-rose-500">
          Unavailable
        </span>
      )}
    </div>
  );
};

const LoadingState = () => {
  return (
    <div className="flex min-h-[360px] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-[#08631f]" />
        <p className="text-sm font-medium text-slate-700">
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
  // Lock page scroll while modal is open
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const personal = miller?.personal_information || {};
  const personalAddress = miller?.personal_address || miller?.address || {};
  const account = miller?.account_information || {};
  const business = miller?.business_information || {};
  const documents = miller?.documents || {};

  const isPartnership = Boolean(
    miller?.is_partnership ||
    (typeof miller?.user_id === "string" && miller?.user_id.includes("-"))
  );

  const fullName = formatFullName(personal);
  const companyName =
    business.business_name ||
    business.organization_name ||
    miller?.business_name ||
    miller?.organization_name ||
    "Not provided";

  const inquiryMessage = String(
    miller?.message || account?.message || ""
  ).trim();

  const personalFullAddress = formatAddress(personalAddress);

  const businessFullAddress = formatAddress({
    street_address: business.street_address,
    barangay: business.barangay,
    municipality: business.municipality,
    province: business.province,
    postal_code: business.postal_code,
  });

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/45 p-4 sm:p-6 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="miller-review-title"
        onClick={(event) => event.stopPropagation()}
        className="flex h-auto max-h-[calc(100vh-48px)] w-full max-w-[920px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.22)]"
      >
        {/* ===================================================
            HEADER
        =================================================== */}
        <div className="shrink-0 border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
                  To Review
                </span>
                {miller?.user_id && (
                  <span className="text-[11px] text-slate-400 font-normal">
                    Application #{miller.user_id}
                  </span>
                )}
              </div>

              <h2
                id="miller-review-title"
                className="text-lg sm:text-xl font-bold tracking-tight text-slate-900"
              >
                Miller Application Review
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 font-normal">
                Review applicant profile and verification documents before approving this account.
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
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ===================================================
            SCROLLABLE BODY
        =================================================== */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8faf9] px-6 py-5 space-y-4">
          {isLoading ? (
            <LoadingState />
          ) : !miller ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700">
                  Unable to load Miller application.
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Close this window and try reviewing the application again.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Applicant Summary Banner */}
              <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-xs">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#08631f] text-white shadow-xs">
                      <User size={19} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-slate-900">
                        {fullName}
                      </p>
                      <p className="truncate text-xs font-normal text-slate-500">
                        {companyName}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 sm:text-right">
                    <p className="text-[11px] font-medium text-slate-400">
                      Application Submitted
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-slate-700">
                      {formatDate(account.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Grid 1: Applicant & Contact Information */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* APPLICANT INFO */}
                <Section icon={User} title="Applicant Information">
                  <div className="space-y-3">
                    <Field label="Applicant Name" value={fullName} />
                    <Field label="Company / Business Name" value={companyName} />
                    {personal.gender && (
                      <Field label="Gender" value={personal.gender} />
                    )}
                    {personalFullAddress !== EMPTY_VALUE && (
                      <Field label="Personal Address" value={personalFullAddress} />
                    )}
                  </div>
                </Section>

                {/* CONTACT DETAILS */}
                <Section icon={Mail} title="Contact Details">
                  <div className="space-y-3">
                    <div>
                      <p className="mb-1 text-[11px] font-medium text-slate-400">
                        Email Address
                      </p>
                      <div className="flex items-center gap-2 text-[13px] font-normal text-slate-800">
                        <Mail size={14} className="shrink-0 text-slate-400" />
                        <span className="break-all">{displayValue(account.email)}</span>
                      </div>
                    </div>

                    <div>
                      <p className="mb-1 text-[11px] font-medium text-slate-400">
                        Contact Number
                      </p>
                      <div className="flex items-center gap-2 text-[13px] font-normal text-slate-800">
                        <Phone size={14} className="shrink-0 text-slate-400" />
                        <span>{displayValue(account.contact_number)}</span>
                      </div>
                    </div>

                    {business.official_email && business.official_email !== account.email && (
                      <div>
                        <p className="mb-1 text-[11px] font-medium text-slate-400">
                          Official Business Email
                        </p>
                        <div className="flex items-center gap-2 text-[13px] font-normal text-slate-800">
                          <Mail size={14} className="shrink-0 text-slate-400" />
                          <span className="break-all">{business.official_email}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </Section>
              </div>

              {/* Grid 2: Business Information & Location */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* BUSINESS INFO */}
                <Section icon={Building2} title="Business Profile">
                  <div className="space-y-3">
                    <Field
                      label="Registered Business Name"
                      value={business.business_name || companyName}
                    />
                    {business.organization_name && (
                      <Field
                        label="Organization / Cooperative"
                        value={business.organization_name}
                      />
                    )}
                    {business.business_type && (
                      <Field
                        label="Business Type"
                        value={business.business_type}
                      />
                    )}
                    <Field
                      label="Official Contact Number"
                      value={business.official_contact_number || account.contact_number}
                    />
                  </div>
                </Section>

                {/* BUSINESS ADDRESS */}
                <Section icon={MapPin} title="Business Location">
                  <div className="space-y-3">
                    <Field
                      label="Business Address"
                      value={businessFullAddress !== EMPTY_VALUE ? businessFullAddress : personalFullAddress}
                    />
                    {business.province && (
                      <Field label="Province" value={business.province} />
                    )}
                    {business.municipality && (
                      <Field label="City / Municipality" value={business.municipality} />
                    )}
                  </div>
                </Section>
              </div>

              {/* Inquiry Message (if available) */}
              {inquiryMessage && (
                <Section icon={MessageSquare} title="Application / Partnership Inquiry Message">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
                    <p className="whitespace-pre-wrap break-words text-[13px] font-normal leading-relaxed text-slate-700">
                      {inquiryMessage}
                    </p>
                  </div>
                </Section>
              )}

              {/* Verification Documents */}
              <Section icon={FileText} title="Verification Documents">
                <p className="-mt-1 mb-3 text-xs font-normal text-slate-500">
                  {isPartnership
                    ? "Review the submitted credentials before approving this partner inquiry."
                    : "Review the required legal and business registration documents before approving."}
                </p>

                {isPartnership ? (
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <DocumentCard
                      title="Government-Issued ID"
                      document={documents.government_issued_id}
                    />
                    <DocumentCard
                      title="Business Verification Document"
                      document={
                        documents.business_registration ||
                        documents.business_permit ||
                        documents.business_verification_document
                      }
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <DocumentCard
                      title="Government-Issued ID"
                      document={documents.government_issued_id}
                    />
                    <DocumentCard
                      title="Mayor's / Business Permit"
                      document={documents.business_permit}
                    />
                    <DocumentCard
                      title="DTI / SEC / CDA Registration"
                      document={documents.business_registration}
                    />
                    <DocumentCard
                      title="BPI / NFA Milling License"
                      document={documents.milling_license}
                    />
                  </div>
                )}
              </Section>

              {/* Approval Notice */}
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3.5">
                <CheckCircle2
                  size={17}
                  className="mt-0.5 shrink-0 text-[#08631f]"
                />
                <div>
                  <p className="text-xs font-medium text-slate-800">
                    Approval will immediately activate this Miller account.
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 font-normal">
                    The account will be moved to the Active tab and an automated notification with login instructions will be sent.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===================================================
            FOOTER
        =================================================== */}
        <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-3.5">
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => onMessage?.(miller)}
              disabled={isLoading || isConfirming || !miller}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MessageSquare size={14} />
              Message
            </button>

            <button
              type="button"
              onClick={() => onConfirm?.(miller)}
              disabled={isLoading || isConfirming || !miller}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#08751e] hover:bg-[#066319] px-5 text-xs font-medium text-white shadow-xs transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCircle2 size={14} />
              {isConfirming ? "Confirming..." : "Confirm Application"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default MillerReviewModal;