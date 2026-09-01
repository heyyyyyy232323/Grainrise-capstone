import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Archive,
  AlertTriangle,
  X,
} from "lucide-react";


const MAX_REASON_LENGTH = 1000;


const ArchiveAccountModal = ({
  isOpen = false,

  onClose,
  onArchive,

  accountName = "this account",
  accountType = "account",

  isArchiving = false,
}) => {
  const [reason, setReason] =
    useState("");

  const [error, setError] =
    useState("");


  // =========================================================
  // RESET MODAL
  // =========================================================

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setReason("");
    setError("");
  }, [isOpen]);


  // =========================================================
  // LOCK BACKGROUND SCROLL
  // =========================================================

  useEffect(() => {
    if (!isOpen) {
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
  }, [isOpen]);


  if (!isOpen) {
    return null;
  }


  // =========================================================
  // CLOSE
  // =========================================================

  const handleClose = () => {
    if (isArchiving) {
      return;
    }

    onClose?.();
  };


  // =========================================================
  // ARCHIVE
  // =========================================================

  const handleArchive = async () => {
    const cleanedReason =
      String(reason || "").trim();


    if (!cleanedReason) {
      setError(
        "Please provide a reason for archiving this account."
      );

      return;
    }


    if (
      cleanedReason.length >
      MAX_REASON_LENGTH
    ) {
      setError(
        `Archive reason must not exceed ${MAX_REASON_LENGTH} characters.`
      );

      return;
    }


    setError("");


    await onArchive?.(
      cleanedReason
    );
  };


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
        backdrop-blur-[2px]
      "
    >

      {/*
        No backdrop onClick.
        Clicking outside will NOT close the modal.
      */}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="archive-account-title"
        className="
          w-full
          max-w-[520px]
          overflow-hidden
          rounded-[20px]
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
            flex
            items-start
            justify-between
            gap-4
            border-b
            border-slate-200
            px-6
            py-5
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
                bg-amber-50
                text-amber-600
              "
            >
              <Archive size={19} />
            </div>


            <div className="min-w-0">

              <h2
                id="archive-account-title"
                className="
                  text-[17px]
                  font-extrabold
                  text-slate-900
                "
              >
                Archive{" "}
                {accountType
                  ? accountType
                      .charAt(0)
                      .toUpperCase() +
                    accountType.slice(1)
                  : "Account"}
              </h2>


              <p
                className="
                  mt-1
                  text-[12px]
                  leading-5
                  text-slate-500
                "
              >
                This account will be moved
                from Active to Inactive.
              </p>

            </div>

          </div>


          <button
            type="button"
            onClick={handleClose}
            disabled={isArchiving}
            aria-label="Close archive modal"
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
              hover:bg-slate-100
              hover:text-slate-700
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            <X size={17} />
          </button>

        </div>


        {/* ===================================================
            BODY
        =================================================== */}

        <div
          className="
            space-y-5
            px-6
            py-5
          "
        >

          {/* ACCOUNT */}

          <div
            className="
              rounded-xl
              border
              border-slate-200
              bg-slate-50
              px-4
              py-3.5
            "
          >

            <p
              className="
                text-[10px]
                font-bold
                uppercase
                tracking-[0.06em]
                text-slate-400
              "
            >
              Account
            </p>


            <p
              className="
                mt-1
                break-words
                text-[13px]
                font-bold
                text-slate-800
              "
            >
              {accountName}
            </p>

          </div>


          {/* WARNING */}

          <div
            className="
              flex
              items-start
              gap-3
              rounded-xl
              border
              border-amber-200
              bg-amber-50
              px-4
              py-3.5
            "
          >

            <AlertTriangle
              size={17}
              className="
                mt-0.5
                shrink-0
                text-amber-600
              "
            />


            <div>

              <p
                className="
                  text-[12px]
                  font-bold
                  text-slate-800
                "
              >
                This account will no longer
                appear under Active accounts.
              </p>


              <p
                className="
                  mt-1
                  text-[11px]
                  leading-5
                  text-slate-500
                "
              >
                The account information will
                remain stored and can be
                restored later.
              </p>

            </div>

          </div>


          {/* REASON */}

          <div>

            <div
              className="
                mb-2
                flex
                items-center
                justify-between
                gap-4
              "
            >

              <label
                htmlFor="archive-account-reason"
                className="
                  text-[12px]
                  font-bold
                  text-slate-700
                "
              >
                Reason for Archiving
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>


              <span
                className="
                  text-[10px]
                  font-medium
                  text-slate-400
                "
              >
                {reason.length}/
                {MAX_REASON_LENGTH}
              </span>

            </div>


            <textarea
              id="archive-account-reason"
              value={reason}
              maxLength={MAX_REASON_LENGTH}
              disabled={isArchiving}
              placeholder="Enter the reason why this account is being archived..."
              onChange={(event) => {
                setReason(
                  event.target.value
                );

                if (error) {
                  setError("");
                }
              }}
              rows={4}
              className={`
                w-full
                resize-none
                rounded-xl
                border
                bg-white
                px-4
                py-3
                text-[13px]
                leading-5
                text-slate-700
                outline-none
                transition
                placeholder:text-slate-400
                disabled:cursor-not-allowed
                disabled:bg-slate-50
                ${
                  error
                    ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    : "border-slate-300 focus:border-[#08751e] focus:ring-2 focus:ring-emerald-100"
                }
              `}
            />


            {error && (
              <p
                className="
                  mt-2
                  text-[11px]
                  font-semibold
                  text-red-500
                "
              >
                {error}
              </p>
            )}

          </div>

        </div>


        {/* ===================================================
            FOOTER
        =================================================== */}

        <div
          className="
            flex
            items-center
            justify-end
            gap-3
            border-t
            border-slate-200
            bg-white
            px-6
            py-4
          "
        >

          <button
            type="button"
            onClick={handleClose}
            disabled={isArchiving}
            className="
              inline-flex
              h-[40px]
              items-center
              justify-center
              rounded-lg
              border
              border-slate-300
              bg-white
              px-5
              text-[12px]
              font-bold
              text-slate-600
              transition
              hover:bg-slate-50
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            Cancel
          </button>


          <button
            type="button"
            onClick={handleArchive}
            disabled={isArchiving}
            className="
              inline-flex
              h-[40px]
              min-w-[130px]
              items-center
              justify-center
              gap-2
              rounded-lg
              bg-amber-500
              px-5
              text-[12px]
              font-bold
              text-white
              transition
              hover:bg-amber-600
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >

            <Archive size={15} />


            {isArchiving
              ? "Archiving..."
              : "Archive Account"}

          </button>

        </div>

      </div>
    </div>
  );


  return createPortal(
    modal,
    document.body
  );
};


export default ArchiveAccountModal;