import {
  useEffect,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";


// ============================================================
// ACTIONS
// ============================================================

export const INVENTORY_ARCHIVE_ACTION =
  "archive";

export const INVENTORY_RESTORE_ACTION =
  "restore";


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
    String(
      value
    ).trim();

  return (
    normalized ||
    fallback
  );
};


// ============================================================
// COMPONENT
// ============================================================

export default function FarmerInventoryStatusConfirmModal({
  open,
  action,
  product,
  isSaving = false,
  error = "",
  onClose,
  onConfirm,
}) {

  // =========================================================
  // BODY SCROLL LOCK
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


  if (!open) {
    return null;
  }


  // =========================================================
  // DERIVED
  // =========================================================

  const isArchive =
    action ===
    INVENTORY_ARCHIVE_ACTION;


  const isRestore =
    action ===
    INVENTORY_RESTORE_ACTION;


  const productCode =
    displayValue(
      product?.product_code,
      "this product"
    );


  const riceVariety =
    displayValue(
      product?.rice_variety
    );


  const title =
    isArchive
      ? "Archive Product?"
      : "Restore Product?";


  const description =
    isArchive
      ? (
        "This product will be moved from Active Inventory to Archive. "
        +
        "Its product information, stock quantities, and source history will not be deleted."
      )
      : (
        "This product will be returned to Active Inventory with its existing product, source, and stock information unchanged."
      );


  const confirmLabel =
    isArchive
      ? "Archive"
      : "Restore";


  // =========================================================
  // CLOSE
  // =========================================================

  const handleClose = () => {
    if (isSaving) {
      return;
    }

    onClose?.();
  };


  // =========================================================
  // CONFIRM
  // =========================================================

  const handleConfirm = async () => {
    if (
      isSaving ||
      !product ||
      !onConfirm
    ) {
      return;
    }

    await onConfirm(
      product,
      action
    );
  };


  // =========================================================
  // MODAL
  // =========================================================

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
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="farmer-inventory-status-confirm-title"
        className="
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
              className={`
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl

                ${
                  isArchive
                    ? "bg-orange-50 text-orange-600"
                    : "bg-green-50 text-green-700"
                }
              `}
            >
              <AlertCircle
                size={20}
              />
            </div>


            <div
              className="
                min-w-0
              "
            >
              <h3
                id="farmer-inventory-status-confirm-title"
                className="
                  text-lg
                  font-bold
                  text-slate-900
                "
              >
                {title}
              </h3>

              <p
                className="
                  mt-1
                  text-sm
                  leading-5
                  text-slate-500
                "
              >
                {description}
              </p>
            </div>
          </div>


          <button
            type="button"
            onClick={
              handleClose
            }
            disabled={
              isSaving
            }
            aria-label="Close confirmation"
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
              text-slate-400
              transition
              hover:bg-slate-50
              hover:text-slate-700
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            <X
              size={18}
            />
          </button>
        </div>


        {/* ==================================================
            PRODUCT SUMMARY
        ================================================== */}

        <div
          className="
            px-5
            py-5
          "
        >
          <div
            className="
              rounded-xl
              border
              border-slate-200
              bg-slate-50
              p-4
            "
          >
            <div>
              <p
                className="
                  text-xs
                  font-medium
                  text-slate-400
                "
              >
                Product Code
              </p>

              <p
                className="
                  mt-1
                  break-words
                  text-sm
                  font-bold
                  text-slate-800
                "
              >
                {productCode}
              </p>
            </div>


            <div
              className="
                mt-4
              "
            >
              <p
                className="
                  text-xs
                  font-medium
                  text-slate-400
                "
              >
                Rice Variety / Variant
              </p>

              <p
                className="
                  mt-1
                  break-words
                  text-sm
                  font-semibold
                  text-slate-700
                "
              >
                {riceVariety}
              </p>
            </div>
          </div>


          {error && (
            <div
              className="
                mt-4
                flex
                items-start
                gap-3
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
              <AlertCircle
                size={18}
                className="
                  mt-0.5
                  shrink-0
                "
              />

              <span>
                {error}
              </span>
            </div>
          )}


          {isArchive && (
            <p
              className="
                mt-4
                text-xs
                leading-5
                text-slate-500
              "
            >
              You can restore this product later from the Archive tab.
            </p>
          )}


          {isRestore && (
            <p
              className="
                mt-4
                text-xs
                leading-5
                text-slate-500
              "
            >
              After restoration, this product will appear again under Active Inventory.
            </p>
          )}
        </div>


        {/* ==================================================
            FOOTER
        ================================================== */}

        <div
          className="
            flex
            items-center
            justify-end
            gap-2
            border-t
            border-slate-200
            bg-white
            px-5
            py-4
          "
        >
          <button
            type="button"
            onClick={
              handleClose
            }
            disabled={
              isSaving
            }
            className="
              rounded-lg
              border
              border-slate-300
              bg-white
              px-5
              py-2.5
              text-sm
              font-semibold
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
            onClick={
              handleConfirm
            }
            disabled={
              isSaving
            }
            className={`
              inline-flex
              min-w-28
              items-center
              justify-center
              gap-2
              rounded-lg
              px-5
              py-2.5
              text-sm
              font-semibold
              text-white
              transition
              disabled:cursor-not-allowed
              disabled:opacity-60

              ${
                isArchive
                  ? "bg-orange-500 hover:bg-orange-600"
                  : "bg-green-700 hover:bg-green-800"
              }
            `}
          >
            {isSaving && (
              <Loader2
                size={16}
                className="
                  animate-spin
                "
              />
            )}

            {isSaving
              ? (
                isArchive
                  ? "Archiving..."
                  : "Restoring..."
              )
              : confirmLabel}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}