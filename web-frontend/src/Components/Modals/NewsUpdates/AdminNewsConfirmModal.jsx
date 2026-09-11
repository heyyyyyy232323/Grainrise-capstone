import {
  useEffect,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  X,
} from "lucide-react";


const AdminNewsConfirmModal = ({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  reason = "",
  setReason,
  requireReason = false,
  destructive = false,
  loading = false,
  onClose,
  onConfirm,
}) => {

  useEffect(() => {
    if (!open) {
      return;
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


  if (!open) {
    return null;
  }


  const disabled =
    loading ||
    (
      requireReason &&
      !String(
        reason || ""
      ).trim()
    );


  return createPortal(
    <div
      className="
        fixed
        inset-0
        z-[10000]
        flex
        items-center
        justify-center
        bg-black/55
        p-4
      "
    >
      <div
        className="
          w-full
          max-w-md
          overflow-hidden
          rounded-2xl
          bg-white
          shadow-2xl
        "
      >
        {/* HEADER */}

        <div
          className="
            flex
            items-center
            justify-between
            gap-4
            border-b
            border-gray-100
            px-5
            py-4
          "
        >
          <div>
            <h2
              className="
                text-base
                font-bold
                text-gray-900
              "
            >
              {title}
            </h2>

            <p
              className="
                mt-0.5
                text-xs
                text-gray-400
              "
            >
              Review before confirming this action.
            </p>
          </div>


          {/* X ONLY */}

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            className="
              rounded-lg
              p-1.5
              text-gray-400
              hover:bg-gray-100
              hover:text-gray-700
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            <X size={18} />
          </button>
        </div>


        {/* BODY */}

        <div
          className="
            px-5
            py-5
          "
        >
          <p
            className="
              text-sm
              leading-6
              text-gray-600
            "
          >
            {message}
          </p>


          {requireReason && (
            <div className="mt-4">
              <label
                className="
                  mb-1.5
                  block
                  text-xs
                  font-semibold
                  text-gray-700
                "
              >
                Reason *
              </label>

              <textarea
                value={reason}
                onChange={(event) =>
                  setReason?.(
                    event.target.value
                  )
                }
                rows={4}
                placeholder="Enter the reason for this action..."
                className="
                  w-full
                  resize-none
                  rounded-xl
                  border
                  border-gray-300
                  px-3
                  py-2.5
                  text-sm
                  outline-none
                  focus:border-[#08511f]
                  focus:ring-2
                  focus:ring-emerald-100
                "
              />
            </div>
          )}
        </div>


        {/* CONFIRM ONLY */}

        <div
          className="
            flex
            justify-end
            border-t
            border-gray-100
            px-5
            py-4
          "
        >
          <button
            type="button"
            onClick={onConfirm}
            disabled={disabled}
            className={`
              rounded-lg
              px-4
              py-2
              text-sm
              font-semibold
              text-white
              disabled:cursor-not-allowed
              disabled:opacity-50

              ${
                destructive
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-[#08511f] hover:bg-[#063d18]"
              }
            `}
          >
            {
              loading
                ? "Processing..."
                : confirmLabel
            }
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};


export default AdminNewsConfirmModal;