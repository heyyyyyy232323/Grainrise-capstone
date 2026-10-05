import React from "react";
import { createPortal } from "react-dom";


const ClearAnnouncementModal = ({
  open,
  onCancel,
  onConfirm,
}) => {

  if (!open) {
    return null;
  }


  return createPortal(
    <div
      className="
        fixed
        inset-0
        z-[9999]
        flex
        items-center
        justify-center
        bg-black/50
        p-4
      "
    >
      <div
        role="dialog"
        aria-modal="true"
        className="
          w-full
          max-w-md
          rounded-2xl
          bg-white
          shadow-2xl
        "
      >
        <div
          className="
            px-6
            py-5
          "
        >
          <h2
            className="
              text-lg
              font-bold
              text-gray-900
            "
          >
            Clear Announcement?
          </h2>

          <p
            className="
              mt-2
              text-sm
              leading-6
              text-gray-500
            "
          >
            All entered information in this form
            will be cleared. This action cannot
            be undone.
          </p>
        </div>


        <div
          className="
            flex
            items-center
            justify-end
            gap-3
            border-t
            border-gray-200
            px-6
            py-4
          "
        >
          <button
            type="button"
            onClick={onCancel}
            className="
              h-10
              rounded-lg
              border
              border-gray-300
              bg-white
              px-4
              text-sm
              font-semibold
              text-gray-700
              transition
              hover:bg-gray-50
            "
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="
              h-10
              rounded-lg
              bg-red-600
              px-4
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-red-700
            "
          >
            Clear
          </button>
        </div>
      </div>
    </div>,

    document.body
  );
};


export default ClearAnnouncementModal;