import {
  useEffect,
} from "react";

import {
  CheckCircle2,
  X,
} from "lucide-react";

import {
  createPortal,
} from "react-dom";


// ============================================================
// GRAINRISE
// SHARED TRANSACTION SUCCESS MODAL
// ============================================================
//
// PURPOSE:
//
// Universal success-confirmation modal for completed sales
// transactions across GrainRise RBAC.
//
// CAN BE USED BY:
//
// - Farmer POS
// - Retailer POS
// - Miller / Supplier Seller
// - Warehouse Seller
// - Other future transaction modules
//
//
// THIS IS NOT THE RECEIPT MODAL.
//
// FLOW:
//
// Successful Transaction
//          ↓
// TransactionSuccessModal
//          ↓
//        Confirm
//          ↓
// PrintableReceiptModal
//
//
// IMPORTANT UI BEHAVIOR:
//
// Uses React Portal:
//
//     createPortal(..., document.body)
//
// Therefore the modal is rendered ABOVE:
//
// - Navbar
// - Sidebar
// - Page content
// - Layout stacking contexts
//
//
// BACKDROP CLICK:
//
// Does NOT close the modal.
//
// User must use:
//
// - X
// - Confirm
//
// ============================================================


// ============================================================
// DEFAULT MONEY FORMATTER
// ============================================================

const defaultFormatAmount = (
  value
) => {

  return Number(
    value || 0
  ).toLocaleString(
    "en-PH",
    {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );

};


// ============================================================
// COMPONENT
// ============================================================

export default function TransactionSuccessModal({
  open = false,

  title = "Transaction Successful",

  message =
    "The transaction has been recorded successfully.",

  transactionId = "",

  totalAmount = null,

  transactionIdLabel =
    "Transaction ID",

  totalAmountLabel =
    "Total Amount",

  confirmLabel =
    "Confirm",

  showTransactionId =
    true,

  showTotalAmount =
    true,

  formatAmount =
    defaultFormatAmount,

  onConfirm,

  onClose,
}) {

  // =========================================================
  // LOCK PAGE SCROLL WHILE MODAL IS OPEN
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
  //
  // Same behavior as pressing X.
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

      {/* =====================================================
          MODAL
      ====================================================== */}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-success-modal-title"
        className="
          relative
          w-full
          max-w-md
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-2xl
        "
      >

        {/* ===================================================
            CLOSE BUTTON
        ==================================================== */}

        {onClose && (

          <button
            type="button"
            onClick={
              onClose
            }
            aria-label="Close transaction confirmation"
            className="
              absolute
              right-5
              top-5
              z-10
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-full
              border
              border-slate-200
              bg-white
              text-slate-400
              transition-colors
              hover:bg-slate-50
              hover:text-slate-700
              focus:outline-none
              focus:ring-2
              focus:ring-green-700
              focus:ring-offset-2
            "
          >

            <X
              size={18}
            />

          </button>

        )}


        {/* ===================================================
            CONTENT
        ==================================================== */}

        <div className="px-7 pb-7 pt-8">

          {/* =================================================
              SUCCESS ICON
          ================================================== */}

          <div
            className="
              mx-auto
              flex
              h-14
              w-14
              items-center
              justify-center
              rounded-full
              bg-green-100
            "
          >

            <CheckCircle2
              size={28}
              className="text-green-700"
            />

          </div>


          {/* =================================================
              TITLE + MESSAGE
          ================================================== */}

          <div className="mt-4 text-center">

            <h2
              id="transaction-success-modal-title"
              className="
                text-xl
                font-extrabold
                tracking-[-0.02em]
                text-slate-900
              "
            >
              {title}
            </h2>


            {message && (

              <p
                className="
                  mx-auto
                  mt-2
                  max-w-sm
                  text-sm
                  leading-6
                  text-slate-500
                "
              >
                {message}
              </p>

            )}

          </div>


          {/* =================================================
              TRANSACTION SUMMARY
          ================================================== */}

          {(
            showTransactionId ||
            showTotalAmount
          ) && (

            <div
              className="
                mt-6
                rounded-xl
                border
                border-slate-200
                bg-slate-50
                px-4
                py-4
              "
            >

              {/* =============================================
                  TRANSACTION ID
              ============================================== */}

              {showTransactionId && (

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-4
                  "
                >

                  <span
                    className="
                      text-xs
                      font-medium
                      text-slate-500
                    "
                  >
                    {transactionIdLabel}
                  </span>


                  <span
                    className="
                      break-all
                      text-right
                      text-sm
                      font-bold
                      text-slate-900
                    "
                  >
                    {transactionId || "—"}
                  </span>

                </div>

              )}


              {/* =============================================
                  TOTAL AMOUNT
              ============================================== */}

              {showTotalAmount && (

                <div
                  className={`
                    flex
                    items-center
                    justify-between
                    gap-4
                    ${
                      showTransactionId
                        ? "mt-3 border-t border-slate-200 pt-3"
                        : ""
                    }
                  `}
                >

                  <span
                    className="
                      text-xs
                      font-medium
                      text-slate-500
                    "
                  >
                    {totalAmountLabel}
                  </span>


                  <span
                    className="
                      text-right
                      text-base
                      font-extrabold
                      text-green-700
                    "
                  >
                    {formatAmount(
                      totalAmount
                    )}
                  </span>

                </div>

              )}

            </div>

          )}


          {/* =================================================
              CONFIRM
          ================================================== */}

          <button
            type="button"
            onClick={
              onConfirm
            }
            className="
              mt-6
              w-full
              rounded-xl
              bg-green-700
              px-4
              py-3
              text-sm
              font-bold
              text-white
              transition-colors
              hover:bg-green-800
              focus:outline-none
              focus:ring-2
              focus:ring-green-700
              focus:ring-offset-2
            "
          >
            {confirmLabel}
          </button>

        </div>

      </div>

    </div>,
    document.body
  );
}