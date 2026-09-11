import {
  useEffect,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  ShieldAlert,
  X,
} from "lucide-react";


const formatRole = (
  value
) =>
  String(
    value || ""
  )
    .replace(
      /_/g,
      " "
    )
    .replace(
      /\b\w/g,
      (char) =>
        char.toUpperCase()
    );


const AdminNewsPenaltyModal = ({
  open,
  target,
  loading = false,
  onClose,
  onConfirm,
}) => {

  const [
    reason,
    setReason,
  ] = useState("");


  useEffect(() => {
    if (!open) {
      return;
    }

    setReason("");

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };

  }, [
    open,
    target?.comment_id,
  ]);


  if (!open) {
    return null;
  }


  const cleanedReason =
    reason.trim();

  const disabled =
    loading ||
    !cleanedReason;


  return createPortal(
    <div
      className="
        fixed
        inset-0
        z-[10001]
        flex
        items-center
        justify-center
        bg-black/60
        p-4
      "
    >
      <div
        className="
          w-full
          max-w-lg
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
            items-start
            justify-between
            gap-4
            border-b
            border-gray-100
            px-5
            py-4
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
              <ShieldAlert
                size={19}
              />
            </div>

            <div>
              <h2
                className="
                  text-base
                  font-bold
                  text-gray-900
                "
              >
                Penalize User
              </h2>

              <p
                className="
                  mt-0.5
                  text-xs
                  text-gray-500
                "
              >
                Apply a penalty for this News interaction.
              </p>
            </div>
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
              disabled:opacity-50
            "
          >
            <X size={18} />
          </button>
        </div>


        {/* BODY */}

        <div
          className="
            max-h-[70vh]
            overflow-y-auto
            px-5
            py-5
          "
        >
          {/* USER */}

          <div
            className="
              rounded-xl
              border
              border-gray-200
              bg-gray-50
              p-4
            "
          >
            <p
              className="
                text-[11px]
                font-semibold
                uppercase
                tracking-wide
                text-gray-400
              "
            >
              User
            </p>

            <p
              className="
                mt-1
                text-sm
                font-bold
                text-gray-900
              "
            >
              {
                target?.author_name ||
                "Unknown User"
              }
            </p>

            <p
              className="
                mt-1
                text-xs
                text-gray-500
              "
            >
              {formatRole(
                target?.author_role
              )}
            </p>
          </div>


          {/* COMMENT */}

          <div className="mt-4">
            <p
              className="
                mb-1.5
                text-xs
                font-semibold
                text-gray-700
              "
            >
              Comment
            </p>

            <div
              className="
                rounded-xl
                border
                border-gray-200
                bg-white
                px-4
                py-3
              "
            >
              <p
                className="
                  whitespace-pre-wrap
                  text-sm
                  leading-6
                  text-gray-600
                "
              >
                {
                  target?.comment_text ||
                  "Comment unavailable."
                }
              </p>
            </div>
          </div>


          {/* PENALTY */}

          <div className="mt-4">
            <p
              className="
                mb-1.5
                text-xs
                font-semibold
                text-gray-700
              "
            >
              Penalty
            </p>

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
                  text-sm
                  font-semibold
                  text-red-700
                "
              >
                Deactivate Account
              </p>

              <p
                className="
                  mt-1
                  text-xs
                  leading-5
                  text-red-600
                "
              >
                The user will no longer be able to log in
                while the account remains deactivated.
              </p>
            </div>
          </div>


          {/* REASON */}

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
              Reason for Penalty *
            </label>

            <textarea
              value={reason}
              onChange={(event) =>
                setReason(
                  event.target.value
                )
              }
              rows={4}
              placeholder="Explain why this user should be penalized..."
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

            <p
              className="
                mt-1
                text-[11px]
                text-gray-400
              "
            >
              A reason is required before the penalty can be applied.
            </p>
          </div>
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
            disabled={disabled}
            onClick={() =>
              onConfirm?.(
                cleanedReason
              )
            }
            className="
              rounded-lg
              bg-red-600
              px-4
              py-2
              text-sm
              font-semibold
              text-white
              hover:bg-red-700
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {
              loading
                ? "Applying Penalty..."
                : "Confirm Penalty"
            }
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};


export default AdminNewsPenaltyModal;