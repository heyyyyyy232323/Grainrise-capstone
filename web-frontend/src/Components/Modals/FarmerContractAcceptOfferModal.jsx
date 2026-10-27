import {
  useEffect,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  CheckCircle2,
  FileSignature,
  Loader2,
  X,
} from "lucide-react";

import SignaturePad from "../Minor-Components/SignaturePad";


// ============================================================
// HELPERS
// ============================================================

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
    return value;
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


const getMillerName = (
  offer
) => {
  return (
    offer?.business_name ||
    offer?.organization_name ||
    offer?.miller_name ||
    "Miller / Buyer"
  );
};


// ============================================================
// SUMMARY ITEM
// ============================================================

const SummaryItem = ({
  label,
  value,
}) => {
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
          text-sm
          font-semibold
          text-slate-800
        "
      >
        {value || "—"}
      </p>
    </div>
  );
};


// ============================================================
// COMPONENT
// ============================================================

export default function FarmerContractAcceptOfferModal({
  open,
  offer,

  isSaving = false,
  error = "",

  onClose,
  onConfirm,
}) {
  const [
    signature,
    setSignature,
  ] = useState("");

  const [
    termsAccepted,
    setTermsAccepted,
  ] = useState(false);

  const [
    validationError,
    setValidationError,
  ] = useState("");


  // ==========================================================
  // RESET
  // ==========================================================

  useEffect(
    () => {
      if (!open) {
        return;
      }

      setSignature("");
      setTermsAccepted(false);
      setValidationError("");
    },
    [
      open,
      offer?.offer_id,
    ]
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
    [
      open,
    ]
  );


  if (!open) {
    return null;
  }


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
  // SIGNATURE CHANGE
  // ==========================================================

  const handleSignatureChange = (
    value
  ) => {
    setSignature(
      value || ""
    );

    if (
      validationError
    ) {
      setValidationError(
        ""
      );
    }
  };


  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();


    const normalizedSignature =
      String(
        signature || ""
      ).trim();


    if (
      !normalizedSignature
      ||
      !normalizedSignature.startsWith(
        "data:image/"
      )
    ) {
      setValidationError(
        "Electronic signature is required."
      );

      return;
    }


    if (!termsAccepted) {
      setValidationError(
        "Please confirm that you reviewed and accept the offer terms."
      );

      return;
    }


    setValidationError("");


    onConfirm?.({
      farmerSignaturePath:
        normalizedSignature,
    });
  };


  // ==========================================================
  // SIGNATURE ERROR
  // ==========================================================

  const signatureError =
    validationError ===
    "Electronic signature is required."
      ? validationError
      : "";


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
        p-4
      "
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="farmer-accept-offer-title"
        onSubmit={handleSubmit}
        className="
          flex
          max-h-[92vh]
          w-full
          max-w-xl
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
              <FileSignature
                size={20}
              />
            </div>


            <div>
              <h3
                id="farmer-accept-offer-title"
                className="
                  text-lg
                  font-bold
                  text-slate-900
                "
              >
                Accept Offer
              </h3>

              <p
                className="
                  mt-1
                  text-sm
                  leading-5
                  text-slate-500
                "
              >
                Review the selected offer and provide your electronic signature to confirm.
              </p>
            </div>
          </div>


          <button
            type="button"
            disabled={isSaving}
            onClick={handleClose}
            aria-label="Close accept offer modal"
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
            space-y-5
            overflow-y-auto
            px-5
            py-5
            sm:px-6
          "
        >

          {/* =================================================
              OFFER SUMMARY
          ================================================= */}

          {offer && (
            <section
              className="
                overflow-hidden
                rounded-xl
                border
                border-green-100
                bg-green-50/40
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-2
                  border-b
                  border-green-100
                  px-4
                  py-3
                "
              >
                <CheckCircle2
                  size={17}
                  className="text-green-700"
                />

                <h4
                  className="
                    text-sm
                    font-bold
                    text-slate-800
                  "
                >
                  Selected Offer
                </h4>
              </div>


              <div
                className="
                  grid
                  gap-x-5
                  gap-y-4
                  p-4
                  sm:grid-cols-2
                "
              >
                <SummaryItem
                  label="Miller / Buyer"
                  value={
                    getMillerName(
                      offer
                    )
                  }
                />

                <SummaryItem
                  label="Offer ID"
                  value={
                    offer.offer_code
                  }
                />

                <SummaryItem
                  label="Offered Price"
                  value={
                    offer.offered_buying_price_per_kg
                      ? `${formatPeso(
                          offer.offered_buying_price_per_kg
                        )} / kg`
                      : "—"
                  }
                />

                <SummaryItem
                  label="Offered Quantity"
                  value={
                    formatQuantity(
                      offer.offered_quantity_kg
                    )
                  }
                />

                <SummaryItem
                  label="Estimated Contract Value"
                  value={
                    formatPeso(
                      offer.estimated_offer_value
                    )
                  }
                />

                <SummaryItem
                  label="Proposed Fulfillment Date"
                  value={
                    formatDate(
                      offer.proposed_fulfillment_date
                    )
                  }
                />
              </div>
            </section>
          )}


          {/* =================================================
              TERMS SUMMARY
          ================================================= */}

          {offer?.proposed_terms && (
            <div>
              <p
                className="
                  mb-1.5
                  text-sm
                  font-semibold
                  text-slate-700
                "
              >
                Proposed Terms
              </p>

              <div
                className="
                  max-h-32
                  overflow-y-auto
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
                {offer.proposed_terms}
              </div>
            </div>
          )}


          {/* =================================================
              ERRORS
          ================================================= */}

          {(validationError ||
            error) && (
            <div
              className="
                rounded-lg
                border
                border-red-200
                bg-red-50
                px-4
                py-3
                text-sm
                text-red-700
              "
            >
              {validationError ||
                error}
            </div>
          )}


          {/* =================================================
              ELECTRONIC SIGNATURE
          ================================================= */}

          <section>
            <div
              className="
                flex
                items-start
                gap-2
              "
            >
              <FileSignature
                size={17}
                className="
                  mt-0.5
                  shrink-0
                  text-green-700
                "
              />

              <div>
                <h4
                  className="
                    text-sm
                    font-bold
                    text-slate-900
                  "
                >
                  Electronic Signature
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </h4>

                <p
                  className="
                    mt-0.5
                    text-xs
                    leading-5
                    text-slate-500
                  "
                >
                  Draw your signature using your mouse on desktop or your finger/stylus on mobile.
                  Your signature confirms your acceptance of this Miller offer.
                </p>
              </div>
            </div>


            <div className="mt-4">
              <SignaturePad
                value={
                  signature
                }
                onChange={
                  handleSignatureChange
                }
                disabled={
                  isSaving
                }
                error={
                  signatureError
                }
              />
            </div>
          </section>


          {/* =================================================
              CONFIRMATION
          ================================================= */}

          <label
            className="
              flex
              cursor-pointer
              items-start
              gap-3
              rounded-xl
              border
              border-slate-200
              bg-slate-50
              p-4
            "
          >
            <input
              type="checkbox"
              disabled={isSaving}
              checked={
                termsAccepted
              }
              onChange={(
                event
              ) => {
                setTermsAccepted(
                  event.target.checked
                );

                if (
                  validationError
                ) {
                  setValidationError(
                    ""
                  );
                }
              }}
              className="
                mt-1
                h-4
                w-4
                accent-green-700
              "
            />

            <span
              className="
                text-sm
                leading-6
                text-slate-600
              "
            >
              I have reviewed the price, quantity, fulfillment details, and proposed terms of this offer and I confirm my acceptance.
            </span>
          </label>


          {/* =================================================
              INFO
          ================================================= */}

          <div
            className="
              rounded-xl
              border
              border-blue-100
              bg-blue-50
              px-4
              py-3
            "
          >
            <p
              className="
                text-sm
                leading-6
                text-blue-800
              "
            >
              Once confirmed, this offer will be accepted and the transaction will be moved to Current Contracts.
            </p>
          </div>

        </div>


        {/* ==================================================
            FOOTER
        ================================================== */}

        <div
          className="
            flex
            shrink-0
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
            Back
          </button>


          <button
            type="submit"
            disabled={
              isSaving ||
              !String(
                signature || ""
              ).startsWith(
                "data:image/"
              ) ||
              !termsAccepted
            }
            className="
              inline-flex
              min-w-[170px]
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
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {isSaving ? (
              <>
                <Loader2
                  size={16}
                  className="animate-spin"
                />

                Accepting...
              </>
            ) : (
              "Confirm Acceptance"
            )}
          </button>

        </div>

      </form>
    </div>,
    document.body
  );
}