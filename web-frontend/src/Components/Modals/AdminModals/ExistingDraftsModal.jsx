import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FileText,
  Search,
  X,
} from "lucide-react";

import {
  createPortal,
} from "react-dom";


const ExistingDraftsModal = ({
  open,
  onClose,
  onUseDraft,
  drafts = [],
  loading = false,
}) => {

  const [
    search,
    setSearch,
  ] = useState("");


  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);


  const filteredDrafts =
    useMemo(() => {

      const keyword =
        search
          .trim()
          .toLowerCase();

      if (!keyword) {
        return drafts;
      }

      return drafts.filter(
        (draft) => {

          const title =
            String(
              draft?.title || ""
            ).toLowerCase();

          const audience =
            String(
              draft?.audience || ""
            ).toLowerCase();

          return (
            title.includes(keyword) ||
            audience.includes(keyword)
          );
        }
      );

    }, [
      drafts,
      search,
    ]);


  if (!open) {
    return null;
  }


  const formatAudience = (
    audience
  ) => {

    const value =
      String(
        audience || ""
      ).toLowerCase();

    const labels = {
      all: "All",
      miller: "Miller",
      warehouse: "Warehouse",
      retailer: "Retailer",
    };

    return (
      labels[value] ||
      audience ||
      "Not specified"
    );
  };


  const formatDate = (
    value
  ) => {

    if (!value) {
      return "No saved date";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return String(value);
    }

    return new Intl.DateTimeFormat(
      "en-PH",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    ).format(date);
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
        aria-labelledby="existing-drafts-title"
        className="
          flex
          max-h-[85vh]
          w-full
          max-w-3xl
          flex-col
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
            shrink-0
            items-center
            justify-between
            border-b
            border-gray-200
            bg-white
            px-6
            py-4
          "
        >
          <div>
            <h2
              id="existing-drafts-title"
              className="
                text-xl
                font-bold
                text-gray-900
              "
            >
              Use Existing Draft
            </h2>

            <p
              className="
                mt-1
                text-sm
                text-gray-500
              "
            >
              Continue editing a previously
              saved announcement draft.
            </p>
          </div>


          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-full
              text-gray-500
              transition
              hover:bg-gray-100
              hover:text-gray-800
            "
          >
            <X size={19} />
          </button>
        </div>


        {/* SEARCH */}

        <div
          className="
            shrink-0
            border-b
            border-gray-100
            px-6
            py-4
          "
        >
          <div
            className="
              flex
              h-11
              items-center
              gap-2
              rounded-lg
              border
              border-gray-300
              bg-white
              px-3
              focus-within:border-[#08511f]
              focus-within:ring-1
              focus-within:ring-[#08511f]
            "
          >
            <Search
              size={17}
              className="
                shrink-0
                text-gray-400
              "
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search drafts..."
              className="
                w-full
                border-0
                bg-transparent
                text-sm
                text-gray-800
                outline-none
                placeholder:text-gray-400
              "
            />
          </div>
        </div>


        {/* CONTENT */}

        <div
          className="
            flex-1
            overflow-y-auto
            px-6
            py-5
          "
        >

          {loading ? (

            <div
              className="
                flex
                min-h-48
                items-center
                justify-center
                text-sm
                text-gray-500
              "
            >
              Loading drafts...
            </div>

          ) : filteredDrafts.length === 0 ? (

            <div
              className="
                flex
                min-h-48
                flex-col
                items-center
                justify-center
                rounded-xl
                border
                border-dashed
                border-gray-300
                bg-gray-50
                px-6
                text-center
              "
            >
              <div
                className="
                  mb-3
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-full
                  bg-emerald-50
                  text-[#08511f]
                "
              >
                <FileText
                  size={20}
                />
              </div>

              <p
                className="
                  text-sm
                  font-semibold
                  text-gray-700
                "
              >
                No drafts found
              </p>

              <p
                className="
                  mt-1
                  text-xs
                  text-gray-500
                "
              >
                Saved drafts will appear here.
              </p>
            </div>

          ) : (

            <div
              className="
                space-y-3
              "
            >
              {filteredDrafts.map(
                (draft) => (

                  <div
                    key={
                      draft.announcement_id ??
                      draft.id ??
                      `${draft.title}-${draft.created_at}`
                    }
                    className="
                      rounded-xl
                      border
                      border-gray-200
                      bg-white
                      p-4
                      transition
                      hover:border-emerald-200
                      hover:shadow-sm
                    "
                  >
                    <div
                      className="
                        flex
                        flex-col
                        gap-4
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                      "
                    >
                      <div
                        className="
                          min-w-0
                          flex-1
                        "
                      >
                        <h3
                          className="
                            truncate
                            text-sm
                            font-bold
                            text-gray-900
                          "
                        >
                          {draft.title ||
                            "Untitled Draft"}
                        </h3>


                        <div
                          className="
                            mt-2
                            flex
                            flex-wrap
                            gap-x-4
                            gap-y-1
                            text-xs
                            text-gray-500
                          "
                        >
                          <span>
                            Audience:{" "}

                            <strong
                              className="
                                font-semibold
                                text-gray-700
                              "
                            >
                              {formatAudience(
                                draft.audience
                              )}
                            </strong>
                          </span>


                          <span>
                            Saved:{" "}

                            <strong
                              className="
                                font-semibold
                                text-gray-700
                              "
                            >
                              {formatDate(
                                draft.updated_at ||
                                draft.created_at
                              )}
                            </strong>
                          </span>
                        </div>
                      </div>


                      <button
                        type="button"
                        onClick={() =>
                          onUseDraft?.(
                            draft
                          )
                        }
                        className="
                          h-10
                          shrink-0
                          rounded-lg
                          bg-[#08511f]
                          px-4
                          text-sm
                          font-semibold
                          text-white
                          transition
                          hover:bg-[#063d18]
                        "
                      >
                        Use Draft
                      </button>
                    </div>
                  </div>

                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>,

    document.body
  );
};


export default ExistingDraftsModal;