import { useEffect } from "react";
import { createPortal } from "react-dom";


const AccountActionConfirmModal = ({
  isOpen = false,
  title = "Confirm Action",
  message = "",
  accountName = "",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  isProcessing = false,
  onClose,
  onConfirm,
}) => {
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


  const handleClose = () => {
    if (isProcessing) {
      return;
    }

    onClose?.();
  };


  const confirmButtonClass =
    variant === "danger"
      ? `
          bg-red-600
          hover:bg-red-700
          focus:ring-red-100
        `
      : `
          bg-[#08751e]
          hover:bg-[#066319]
          focus:ring-emerald-100
        `;


  return createPortal(
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
      <div
        role="dialog"
        aria-modal="true"
        className="
          w-full
          max-w-[480px]
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-[0_25px_70px_rgba(15,23,42,0.28)]
        "
      >

        {/* HEADER */}

        <div
          className="
            border-b
            border-slate-200
            px-6
            py-5
          "
        >
          <h2
            className="
              text-[17px]
              font-extrabold
              text-slate-900
            "
          >
            {title}
          </h2>

          <p
            className="
              mt-1
              text-[12px]
              leading-5
              text-slate-500
            "
          >
            Please review this action before continuing.
          </p>
        </div>


        {/* BODY */}

        <div
          className="
            space-y-4
            px-6
            py-5
          "
        >
          {accountName && (
            <div
              className="
                rounded-xl
                border
                border-slate-200
                bg-slate-50
                px-4
                py-3
              "
            >
              <p
                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-wide
                  text-slate-400
                "
              >
                Account
              </p>

              <p
                className="
                  mt-1
                  text-[13px]
                  font-bold
                  text-slate-800
                "
              >
                {accountName}
              </p>
            </div>
          )}


          <p
            className="
              text-[13px]
              leading-6
              text-slate-600
            "
          >
            {message}
          </p>


          {variant === "danger" && (
            <div
              className="
                rounded-xl
                border
                border-red-200
                bg-red-50
                px-4
                py-3
              "
            >
              <p
                className="
                  text-[11px]
                  font-semibold
                  leading-5
                  text-red-700
                "
              >
                This action is permanent and cannot be undone.
              </p>
            </div>
          )}
        </div>


        {/* FOOTER */}

        <div
          className="
            flex
            items-center
            justify-end
            gap-3
            border-t
            border-slate-200
            px-6
            py-4
          "
        >
          <button
            type="button"
            onClick={handleClose}
            disabled={isProcessing}
            className="
              h-10
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
            {cancelText}
          </button>


          <button
            type="button"
            onClick={() =>
              onConfirm?.()
            }
            disabled={isProcessing}
            className={`
              h-10
              min-w-[130px]
              rounded-lg
              px-5
              text-[12px]
              font-bold
              text-white
              transition
              focus:outline-none
              focus:ring-2
              disabled:cursor-not-allowed
              disabled:opacity-60
              ${confirmButtonClass}
            `}
          >
            {isProcessing
              ? "Processing..."
              : confirmText}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};


export default AccountActionConfirmModal;