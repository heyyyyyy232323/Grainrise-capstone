import React from "react";
import { Loader2 } from "lucide-react";
import { createPortal } from "react-dom";


const PublishAnnouncementModal = ({
  open,
  loading = false,
  title = "",
  audience = "",
  onCancel,
  onConfirm,
}) => {

  if (!open) {
    return null;
  }


  const formatAudience = (
    value
  ) => {

    const labels = {
      all: "All",
      miller: "Miller",
      warehouse: "Warehouse",
      retailer: "Retailer",
    };

    return (
      labels[
        String(value || "")
          .toLowerCase()
      ] || "Not selected"
    );
  };


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
            Publish Announcement?
          </h2>

          <p
            className="
              mt-2
              text-sm
              leading-6
              text-gray-500
            "
          >
            This announcement will become
            visible to the selected audience.
          </p>


          <div
            className="
              mt-4
              rounded-xl
              border
              border-gray-200
              bg-gray-50
              p-4
            "
          >
            <div>
              <p
                className="
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                  text-gray-400
                "
              >
                Title
              </p>

              <p
                className="
                  mt-1
                  text-sm
                  font-semibold
                  text-gray-800
                "
              >
                {title ||
                  "Untitled Announcement"}
              </p>
            </div>

            <div
              className="
                mt-3
              "
            >
              <p
                className="
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                  text-gray-400
                "
              >
                Audience
              </p>

              <p
                className="
                  mt-1
                  text-sm
                  font-semibold
                  text-gray-800
                "
              >
                {formatAudience(
                  audience
                )}
              </p>
            </div>
          </div>
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
            disabled={loading}
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
            onClick={onConfirm}
            disabled={loading}
            className="
              flex
              h-10
              items-center
              justify-center
              gap-2
              rounded-lg
              bg-[#08511f]
              px-5
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-[#063d18]
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {loading && (
              <Loader2
                size={16}
                className="animate-spin"
              />
            )}

            {loading
              ? "Publishing..."
              : "Publish"}
          </button>
        </div>
      </div>
    </div>,

    document.body
  );
};


export default PublishAnnouncementModal;