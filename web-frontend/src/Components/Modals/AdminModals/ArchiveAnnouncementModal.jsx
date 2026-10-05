import React from "react";

import {
  Archive,
  Loader2,
} from "lucide-react";

import {
  createPortal,
} from "react-dom";


const ArchiveAnnouncementModal = ({
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
                bg-orange-50
                text-orange-700
              "
            >
              <Archive
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
                Archive Announcement
              </h2>

              <p
                className="
                  mt-0.5
                  text-sm
                  text-gray-500
                "
              >
                Move this announcement to archived status.
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
            Are you sure you want to archive{" "}

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
            Once archived, the announcement will no longer be visible to its
            intended audience. You can reactivate it at any time from the
            announcements management table.
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
              bg-orange-600
              px-4
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-orange-700
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

                Archiving...
              </>
            ) : (
              <>
                <Archive
                  size={16}
                />

                Archive
              </>
            )}
          </button>
        </div>
      </div>
    </div>,

    document.body
  );
};


export default ArchiveAnnouncementModal;
