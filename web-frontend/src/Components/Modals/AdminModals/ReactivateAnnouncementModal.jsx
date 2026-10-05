import React from "react";

import {
  Loader2,
  RotateCcw,
} from "lucide-react";

import {
  createPortal,
} from "react-dom";


const ReactivateAnnouncementModal = ({
  open,
  announcement,
  loading = false,
  onCancel,
  onConfirm,
}) => {

  if (!open) {
    return null;
  }


  const title =
    announcement?.title ||
    "this announcement";


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
          overflow-hidden
          rounded-2xl
          bg-white
          shadow-2xl
        "
      >

        {/* HEADER */}

        <div
          className="
            border-b
            border-gray-200
            px-6
            py-4
          "
        >
          <div
            className="
              flex
              items-center
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
                rounded-full
                bg-green-50
                text-[#08511f]
              "
            >
              <RotateCcw
                size={19}
              />
            </div>

            <div>
              <h2
                className="
                  text-lg
                  font-bold
                  text-gray-900
                "
              >
                Reactivate Announcement
              </h2>

              <p
                className="
                  mt-0.5
                  text-sm
                  text-gray-500
                "
              >
                Restore this announcement
                to active status.
              </p>
            </div>
          </div>
        </div>


        {/* CONTENT */}

        <div
          className="
            px-6
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
            Are you sure you want to
            reactivate{" "}

            <span
              className="
                font-semibold
                text-gray-900
              "
            >
              “{title}”
            </span>
            ?
          </p>

          <p
            className="
              mt-3
              text-xs
              leading-5
              text-gray-500
            "
          >
            Once reactivated, the
            announcement will return to
            active status and become
            available again to its intended
            audience.
          </p>
        </div>


        {/* ACTIONS */}

        <div
          className="
            flex
            items-center
            justify-end
            gap-3
            border-t
            border-gray-200
            bg-gray-50
            px-6
            py-4
          "
        >
          <button
            type="button"
            onClick={
              onCancel
            }
            disabled={
              loading
            }
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
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            Cancel
          </button>


          <button
            type="button"
            onClick={
              onConfirm
            }
            disabled={
              loading
            }
            className="
              flex
              h-10
              items-center
              justify-center
              gap-2
              rounded-lg
              bg-[#08511f]
              px-4
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-[#063d18]
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {loading ? (
              <>
                <Loader2
                  size={16}
                  className="
                    animate-spin
                  "
                />

                Reactivating...
              </>
            ) : (
              <>
                <RotateCcw
                  size={16}
                />

                Reactivate
              </>
            )}
          </button>
        </div>
      </div>
    </div>,

    document.body
  );
};


export default ReactivateAnnouncementModal;