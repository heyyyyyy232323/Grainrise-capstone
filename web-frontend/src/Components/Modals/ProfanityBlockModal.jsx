import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";


export default function ProfanityBlockModal({
  open,
  onClose,
  message = (
    "Your message contains language that is not allowed "
    + "under GrainRise communication guidelines."
  ),
}) {
  if (!open) {
    return null;
  }


  return createPortal(
    <div
      className="
        fixed inset-0 z-[9999]
        flex items-center justify-center
        bg-black/50
        px-4
      "
      role="dialog"
      aria-modal="true"
      aria-labelledby="profanity-block-title"
    >
      <div
        className="
          relative
          w-full max-w-md
          rounded-2xl
          bg-white
          p-6
          shadow-2xl
        "
      >
        {/* ================================================= */}
        {/* CLOSE BUTTON */}
        {/* ================================================= */}

        <button
          type="button"
          onClick={onClose}
          className="
            absolute right-4 top-4
            flex h-9 w-9
            items-center justify-center
            rounded-full
            text-gray-500
            transition
            hover:bg-gray-100
            hover:text-gray-700
          "
          aria-label="Close"
        >
          <X size={20} />
        </button>


        {/* ================================================= */}
        {/* ICON */}
        {/* ================================================= */}

        <div
          className="
            mb-4
            flex h-14 w-14
            items-center justify-center
            rounded-full
            bg-red-50
          "
        >
          <AlertTriangle
            size={28}
            className="text-red-600"
          />
        </div>


        {/* ================================================= */}
        {/* CONTENT */}
        {/* ================================================= */}

        <h2
          id="profanity-block-title"
          className="
            pr-10
            text-xl font-semibold
            text-gray-900
          "
        >
          Message Not Sent
        </h2>


        <p
          className="
            mt-3
            text-sm leading-6
            text-gray-600
          "
        >
          {message}
        </p>


        <div
          className="
            mt-4
            rounded-xl
            border border-red-100
            bg-red-50
            p-4
          "
        >
          <p
            className="
              text-sm leading-6
              text-red-700
            "
          >
            Please revise your message and remove any
            prohibited or inappropriate language before
            sending it again.
          </p>
        </div>


        {/* ================================================= */}
        {/* ACTION */}
        {/* ================================================= */}

        <div
          className="
            mt-6
            flex justify-end
          "
        >
          <button
            type="button"
            onClick={onClose}
            className="
              rounded-lg
              bg-[#2F6B3B]
              px-5 py-2.5
              text-sm font-medium
              text-white
              transition
              hover:bg-[#275a32]
            "
          >
            Edit Message
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}