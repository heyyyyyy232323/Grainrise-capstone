import {
  useEffect,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";


// ============================================================
// COMPONENT
// ============================================================

export default function FarmerContractVoidRequestModal({
  open,
  contract,

  isSaving = false,
  error = "",

  onClose,
  onConfirm,
}) {
  const [
    reason,
    setReason,
  ] = useState("");

  const [
    remarks,
    setRemarks,
  ] = useState("");

  const [
    validationError,
    setValidationError,
  ] = useState("");


  // ==========================================================
  // RESET FORM
  // ==========================================================

  useEffect(
    () => {
      if (!open) {
        return;
      }

      setReason("");
      setRemarks("");
      setValidationError("");
    },
    [
      open,
      contract?.contract_id,
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
  // SUBMIT
  // ==========================================================

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();


    const normalizedReason =
      reason.trim();

    const normalizedRemarks =
      remarks.trim();


    if (!normalizedReason) {
      setValidationError(
        "Reason for void request is required."
      );

      return;
    }


    if (
      normalizedReason.length <
      3
    ) {
      setValidationError(
        "Please provide a valid reason for requesting to void this contract."
      );

      return;
    }


    setValidationError("");


    onConfirm?.({
      reason:
        normalizedReason,

      remarks:
        normalizedRemarks,
    });
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
        p-4
      "
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="farmer-contract-void-request-title"
        onSubmit={handleSubmit}
        className="
          w-full
          max-w-lg
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
                bg-red-50
                text-red-600
              "
            >
              <AlertTriangle
                size={20}
              />
            </div>


            <div>
              <h3
                id="farmer-contract-void-request-title"
                className="
                  text-lg
                  font-bold
                  text-slate-900
                "
              >
                Request to Void Contract
              </h3>

              <p
                className="
                  mt-1
                  text-sm
                  leading-5
                  text-slate-500
                "
              >
                Submit a request to void this contract and provide the reason for your request.
              </p>
            </div>
          </div>


          <button
            type="button"
            disabled={isSaving}
            onClick={handleClose}
            aria-label="Close void request modal"
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
            space-y-5
            px-5
            py-5
            sm:px-6
          "
        >

          {/* CONTRACT REFERENCE */}

          {contract && (
            <div
              className="
                rounded-xl
                border
                border-slate-200
                bg-slate-50
                p-4
              "
            >
              <p
                className="
                  text-xs
                  font-medium
                  text-slate-500
                "
              >
                Contract
              </p>

              <p
                className="
                  mt-1
                  text-sm
                  font-bold
                  text-slate-900
                "
              >
                {contract.contract_code ||
                  `Contract #${contract.contract_id}`}
              </p>


              {(contract.business_name ||
                contract.organization_name ||
                contract.miller_name) && (
                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-500
                  "
                >
                  {contract.business_name ||
                    contract.organization_name ||
                    contract.miller_name}
                </p>
              )}
            </div>
          )}


          {/* WARNING */}

          <div
            className="
              rounded-xl
              border
              border-amber-200
              bg-amber-50
              px-4
              py-3
            "
          >
            <p
              className="
                text-sm
                font-semibold
                text-amber-800
              "
            >
              This is a void request, not an immediate cancellation.
            </p>

            <p
              className="
                mt-1
                text-sm
                leading-5
                text-amber-700
              "
            >
              The contract will remain recorded while the request is being reviewed.
            </p>
          </div>


          {/* SERVER ERROR */}

          {error && (
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
              {error}
            </div>
          )}


          {/* VALIDATION ERROR */}

          {validationError && (
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
              {validationError}
            </div>
          )}


          {/* =================================================
              REASON
          ================================================= */}

          <div>
            <label
              htmlFor="farmer-contract-void-reason"
              className="
                mb-1.5
                block
                text-sm
                font-semibold
                text-slate-700
              "
            >
              Reason for Void Request
              <span className="ml-1 text-red-500">
                *
              </span>
            </label>


            <textarea
              id="farmer-contract-void-reason"
              rows={4}
              maxLength={500}
              disabled={isSaving}
              value={reason}
              onChange={(
                event
              ) => {
                setReason(
                  event.target.value
                );

                if (
                  validationError
                ) {
                  setValidationError(
                    ""
                  );
                }
              }}
              placeholder="Explain why you are requesting to void this contract."
              className="
                w-full
                resize-none
                rounded-lg
                border
                border-slate-300
                px-3
                py-2.5
                text-sm
                text-slate-800
                outline-none
                transition
                placeholder:text-slate-400
                focus:border-green-600
                focus:ring-1
                focus:ring-green-600
                disabled:cursor-not-allowed
                disabled:bg-slate-100
              "
            />


            <p
              className="
                mt-1
                text-right
                text-xs
                text-slate-400
              "
            >
              {reason.length}/500
            </p>
          </div>


          {/* =================================================
              REMARKS
          ================================================= */}

          <div>
            <label
              htmlFor="farmer-contract-void-remarks"
              className="
                mb-1.5
                block
                text-sm
                font-semibold
                text-slate-700
              "
            >
              Additional Remarks

              <span
                className="
                  ml-1
                  text-xs
                  font-normal
                  text-slate-400
                "
              >
                Optional
              </span>
            </label>


            <textarea
              id="farmer-contract-void-remarks"
              rows={4}
              maxLength={1000}
              disabled={isSaving}
              value={remarks}
              onChange={(
                event
              ) =>
                setRemarks(
                  event.target.value
                )
              }
              placeholder="Add supporting details or other relevant information."
              className="
                w-full
                resize-none
                rounded-lg
                border
                border-slate-300
                px-3
                py-2.5
                text-sm
                text-slate-800
                outline-none
                transition
                placeholder:text-slate-400
                focus:border-green-600
                focus:ring-1
                focus:ring-green-600
                disabled:cursor-not-allowed
                disabled:bg-slate-100
              "
            />


            <p
              className="
                mt-1
                text-right
                text-xs
                text-slate-400
              "
            >
              {remarks.length}/1000
            </p>
          </div>

        </div>


        {/* ==================================================
            FOOTER
        ================================================== */}

        <div
          className="
            flex
            items-center
            justify-end
            gap-3
            border-t
            border-slate-200
            bg-slate-50/50
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
              !reason.trim()
            }
            className="
              inline-flex
              min-w-[175px]
              items-center
              justify-center
              gap-2
              rounded-lg
              bg-red-600
              px-4
              py-2.5
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-red-700
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

                Submitting...
              </>
            ) : (
              "Submit Void Request"
            )}
          </button>
        </div>

      </form>
    </div>,
    document.body
  );
}