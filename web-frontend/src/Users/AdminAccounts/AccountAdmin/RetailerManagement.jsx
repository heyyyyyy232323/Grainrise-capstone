import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Check,
  Eye,
  FileText,
  RefreshCw,
  Search,
  X,
  Archive,
  RotateCcw,
} from "lucide-react";

import useApi from "../../../Components/hooks/useApi";


const normalizeStatus = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");
};


const getDisplayStatus = (status) => {

  const normalized = normalizeStatus(status);

  if (
    [
      "pending",
      "pending_review",
      "pending_approval",
      "for_review",
      "to_review",
      "inactive",
    ].includes(normalized)
  ) {
    return "To Review";
  }

  if (
    [
      "active",
      "approved",
      "verified",
    ].includes(normalized)
  ) {
    return "Active";
  }

  if (
    [
      "rejected",
      "declined",
    ].includes(normalized)
  ) {
    return "Rejected";
  }

  return status || "Unknown";
};


const fullName = (retailer) => {

  return [
    retailer.first_name,
    retailer.middle_initial,
    retailer.last_name,
    retailer.suffix,
  ]
    .filter(Boolean)
    .join(" ");

};


const fullAddress = (retailer) => {

  return [
    retailer.street_address,
    retailer.barangay,
    retailer.municipality,
    retailer.province,
    retailer.postal_code,
  ]
    .filter(Boolean)
    .join(", ");

};


const RetailerManagement = () => {

  const {
    request,
    API_BASE_URL,
  } = useApi();


  const [retailers, setRetailers] = useState([]);

  const [activeTab, setActiveTab] = useState("review");

  const [searchTerm, setSearchTerm] = useState("");

  const [isLoading, setIsLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const [selectedRetailer, setSelectedRetailer] = useState(null);

  const [actionLoading, setActionLoading] = useState(null);

  const [documentLoading, setDocumentLoading] = useState("");


  // =========================================================
  // LOAD RETAILERS FROM DJANGO
  // =========================================================

  const loadRetailers = useCallback(
    async () => {

      setIsLoading(true);

      setErrorMessage("");


      try {

        const response = await request(
          "/admin/retailers",
          {
            method: "GET",
            throwOnError: true,
          }
        );


        setRetailers(
          Array.isArray(response?.retailers)
            ? response.retailers
            : []
        );


      } catch (error) {

        setErrorMessage(
          error.message ||
          "Unable to load retailer accounts."
        );


      } finally {

        setIsLoading(false);

      }

    },
    [request]
  );


  useEffect(() => {

    loadRetailers();

  }, [loadRetailers]);


  // =========================================================
  // COUNTS
  // =========================================================

  const counts = useMemo(() => {

    let review = 0;
    let active = 0;
    let rejected = 0;


    retailers.forEach((retailer) => {

      const displayStatus = getDisplayStatus(
        retailer.status
      );


      if (displayStatus === "To Review") {
        review += 1;
      }

      if (displayStatus === "Active") {
        active += 1;
      }

      if (displayStatus === "Rejected") {
        rejected += 1;
      }

    });


    return {
      review,
      active,
      rejected,
    };

  }, [retailers]);


  // =========================================================
  // FILTER
  // =========================================================

  const filteredRetailers = useMemo(() => {

    const query = searchTerm
      .trim()
      .toLowerCase();


    return retailers.filter(
      (retailer) => {

        const displayStatus =
          getDisplayStatus(
            retailer.status
          );


        const matchesTab =

          activeTab === "review"
            ? displayStatus === "To Review"

            : activeTab === "active"
            ? displayStatus === "Active"

            : activeTab === "rejected"
            ? displayStatus === "Rejected"

            : true;


        if (!matchesTab) {
          return false;
        }


        if (!query) {
          return true;
        }


        const searchable = [
          retailer.id,
          fullName(retailer),
          retailer.email,
          retailer.contact_number,
          retailer.province,
          retailer.municipality,
          retailer.barangay,
          retailer.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();


        return searchable.includes(query);

      }
    );

  }, [
    retailers,
    activeTab,
    searchTerm,
  ]);


  // =========================================================
  // UPDATE STATUS
  // =========================================================

  const updateStatus = async (
    retailer,
    action
  ) => {

    const retailerId =
      retailer.id;


    if (!retailerId) {

      setErrorMessage(
        "Retailer user ID is missing."
      );

      return;

    }


    setActionLoading(
      `${retailerId}-${action}`
    );

    setErrorMessage("");

    setSuccessMessage("");


    try {

      const response = await request(
        `/admin/retailers/${retailerId}/status`,
        {
          method: "PATCH",

          body: {
            action,
          },

          throwOnError: true,
        }
      );


      let message =
        response?.message ||
        "Retailer account updated successfully.";


      if (response?.warning) {

        message += ` ${response.warning}`;

      }


      setSuccessMessage(message);


      setSelectedRetailer(null);


      await loadRetailers();


    } catch (error) {

      setErrorMessage(
        error.message ||
        "Unable to update retailer account."
      );


    } finally {

      setActionLoading(null);

    }

  };


  // =========================================================
  // VIEW DOCUMENT
  // =========================================================

  const viewDocument = async (
    retailer,
    documentKind
  ) => {

    const retailerId =
      retailer.id;


    if (!retailerId) {

      setErrorMessage(
        "Retailer user ID is missing."
      );

      return;

    }


    setDocumentLoading(
      `${retailerId}-${documentKind}`
    );

    setErrorMessage("");


    try {

      const token =
        localStorage.getItem(
          "grainrise_token"
        ) ||
        localStorage.getItem(
          "access_token"
        ) ||
        "";


      const response = await fetch(
        `${API_BASE_URL}/admin/retailers/${retailerId}/documents/${documentKind}`,
        {
          method: "GET",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );


      if (!response.ok) {

        let message =
          "Unable to open document.";


        try {

          const payload =
            await response.json();


          message =
            payload?.detail ||
            payload?.message ||
            message;


        } catch {

          // Ignore response parsing failure.

        }


        throw new Error(message);

      }


      const blob =
        await response.blob();


      const objectUrl =
        URL.createObjectURL(blob);


      window.open(
        objectUrl,
        "_blank",
        "noopener,noreferrer"
      );


      // Give the new browser tab time
      // to load the blob before cleanup.
      setTimeout(
        () => {
          URL.revokeObjectURL(
            objectUrl
          );
        },
        60_000
      );


    } catch (error) {

      setErrorMessage(
        error.message ||
        "Unable to open document."
      );


    } finally {

      setDocumentLoading("");

    }

  };


  // =========================================================
  // TAB BUTTON
  // =========================================================

  const tabButton = (
    key,
    label,
    count
  ) => (

    <button
      type="button"
      onClick={() =>
        setActiveTab(key)
      }
      className={`
        px-5
        py-3
        rounded-xl
        text-sm
        font-semibold
        transition-all

        ${
          activeTab === key

            ? "bg-[#08511f] text-white shadow"

            : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
        }
      `}
    >

      {label}

      <span
        className={`
          ml-2
          px-2
          py-0.5
          rounded-full
          text-xs

          ${
            activeTab === key

              ? "bg-white/20 text-white"

              : "bg-gray-100 text-gray-600"
          }
        `}
      >

        {count}

      </span>

    </button>

  );


  return (

    <div
      className="
        w-full
        min-h-screen
        bg-gray-50
        p-5
        md:p-8
      "
    >


      {/* =====================================================
          HEADER
      ====================================================== */}

      <div
        className="
          flex
          flex-col
          md:flex-row
          md:items-center
          md:justify-between
          gap-4
          mb-7
        "
      >

        <div>

          <h1
            className="
              text-2xl
              md:text-3xl
              font-bold
              text-gray-900
            "
          >

            Retailer Management

          </h1>


          <p
            className="
              text-sm
              text-gray-500
              mt-1
            "
          >

            Review and manage registered GrainRise retailers.

          </p>

        </div>


        <button
          type="button"
          onClick={loadRetailers}
          disabled={isLoading}
          className="
            inline-flex
            items-center
            justify-center
            gap-2
            bg-white
            border
            border-gray-200
            rounded-xl
            px-4
            py-2.5
            text-sm
            font-semibold
            text-gray-700
            hover:bg-gray-50
            disabled:opacity-50
          "
        >

          <RefreshCw
            size={17}
            className={
              isLoading
                ? "animate-spin"
                : ""
            }
          />

          Refresh

        </button>

      </div>


      {/* =====================================================
          MESSAGES
      ====================================================== */}

      {
        errorMessage && (

          <div
            className="
              mb-5
              bg-red-50
              border
              border-red-200
              text-red-700
              px-4
              py-3
              rounded-xl
              text-sm
            "
          >

            {errorMessage}

          </div>

        )
      }


      {
        successMessage && (

          <div
            className="
              mb-5
              bg-green-50
              border
              border-green-200
              text-green-700
              px-4
              py-3
              rounded-xl
              text-sm
            "
          >

            {successMessage}

          </div>

        )
      }


      {/* =====================================================
          TABS
      ====================================================== */}

      <div
        className="
          flex
          flex-wrap
          gap-3
          mb-6
        "
      >

        {tabButton(
          "review",
          "To Review",
          counts.review
        )}

        {tabButton(
          "active",
          "Active",
          counts.active
        )}

        {tabButton(
          "rejected",
          "Rejected",
          counts.rejected
        )}

      </div>


      {/* =====================================================
          SEARCH
      ====================================================== */}

      <div
        className="
          bg-white
          border
          border-gray-100
          rounded-2xl
          shadow-sm
          p-4
          mb-5
        "
      >

        <div
          className="
            relative
            max-w-lg
          "
        >

          <Search
            size={18}
            className="
              absolute
              left-4
              top-1/2
              -translate-y-1/2
              text-gray-400
            "
          />


          <input
            type="text"
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value
              )
            }
            placeholder="Search retailer name, email, contact, or address..."
            className="
              w-full
              pl-11
              pr-4
              py-3
              border
              border-gray-200
              rounded-xl
              outline-none
              focus:border-green-600
              focus:ring-2
              focus:ring-green-100
              text-sm
            "
          />

        </div>

      </div>


      {/* =====================================================
          TABLE
      ====================================================== */}

      <div
        className="
          bg-white
          rounded-2xl
          border
          border-gray-100
          shadow-sm
          overflow-hidden
        "
      >

        {
          isLoading ? (

            <div
              className="
                min-h-[300px]
                flex
                items-center
                justify-center
                text-gray-500
              "
            >

              <RefreshCw
                size={22}
                className="
                  animate-spin
                  mr-3
                "
              />

              Loading retailers...

            </div>

          ) : filteredRetailers.length === 0 ? (

            <div
              className="
                min-h-[300px]
                flex
                flex-col
                items-center
                justify-center
                text-center
                px-6
              "
            >

              <FileText
                size={38}
                className="
                  text-gray-300
                  mb-3
                "
              />

              <p
                className="
                  font-semibold
                  text-gray-700
                "
              >

                No retailer records found

              </p>


              <p
                className="
                  text-sm
                  text-gray-400
                  mt-1
                "
              >

                Retailer registrations will appear here after submission.

              </p>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table
                className="
                  w-full
                  min-w-[1000px]
                "
              >

                <thead
                  className="
                    bg-gray-50
                    border-b
                    border-gray-100
                  "
                >

                  <tr>

                    <th className="text-left px-5 py-4 text-xs font-bold uppercase tracking-wide text-gray-500">
                      Retailer
                    </th>

                    <th className="text-left px-5 py-4 text-xs font-bold uppercase tracking-wide text-gray-500">
                      Contact
                    </th>

                    <th className="text-left px-5 py-4 text-xs font-bold uppercase tracking-wide text-gray-500">
                      Location
                    </th>

                    <th className="text-left px-5 py-4 text-xs font-bold uppercase tracking-wide text-gray-500">
                      Status
                    </th>

                    <th className="text-right px-5 py-4 text-xs font-bold uppercase tracking-wide text-gray-500">
                      Action
                    </th>

                  </tr>

                </thead>


                <tbody
                  className="
                    divide-y
                    divide-gray-100
                  "
                >

                  {
                    filteredRetailers.map(
                      (retailer) => {

                        const displayStatus =
                          getDisplayStatus(
                            retailer.status
                          );


                        return (

                          <tr
                            key={retailer.id}
                            className="
                              hover:bg-gray-50/70
                              transition
                            "
                          >

                            <td className="px-5 py-4">

                              <p
                                className="
                                  font-semibold
                                  text-gray-900
                                "
                              >

                                {fullName(retailer) || "Unnamed Retailer"}

                              </p>


                              <p
                                className="
                                  text-xs
                                  text-gray-400
                                  mt-1
                                "
                              >

                                User ID: {retailer.id}

                              </p>

                            </td>


                            <td className="px-5 py-4">

                              <p
                                className="
                                  text-sm
                                  text-gray-700
                                "
                              >

                                {retailer.email || "—"}

                              </p>


                              <p
                                className="
                                  text-xs
                                  text-gray-400
                                  mt-1
                                "
                              >

                                {retailer.contact_number || "—"}

                              </p>

                            </td>


                            <td className="px-5 py-4">

                              <p
                                className="
                                  text-sm
                                  text-gray-700
                                  max-w-[280px]
                                "
                              >

                                {
                                  [
                                    retailer.municipality,
                                    retailer.province,
                                  ]
                                    .filter(Boolean)
                                    .join(", ") || "—"
                                }

                              </p>

                            </td>


                            <td className="px-5 py-4">

                              <span
                                className={`
                                  inline-flex
                                  px-3
                                  py-1
                                  rounded-full
                                  text-xs
                                  font-semibold

                                  ${
                                    displayStatus === "Active"

                                      ? "bg-green-100 text-green-700"

                                      : displayStatus === "Rejected"

                                      ? "bg-red-100 text-red-700"

                                      : "bg-yellow-100 text-yellow-700"
                                  }
                                `}
                              >

                                {displayStatus}

                              </span>

                            </td>


                            <td
                              className="
                                px-5
                                py-4
                                text-right
                              "
                            >

                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedRetailer(
                                    retailer
                                  )
                                }
                                className="
                                  inline-flex
                                  items-center
                                  gap-2
                                  px-4
                                  py-2
                                  rounded-lg
                                  bg-[#08511f]
                                  text-white
                                  text-sm
                                  font-semibold
                                  hover:bg-green-800
                                "
                              >

                                <Eye size={16} />

                                Review

                              </button>

                            </td>

                          </tr>

                        );

                      }
                    )
                  }

                </tbody>

              </table>

            </div>

          )
        }

      </div>


      {/* =====================================================
          REVIEW MODAL
      ====================================================== */}

      {
        selectedRetailer && (

          <div
            className="
              fixed
              inset-0
              z-50
              bg-black/40
              flex
              items-center
              justify-center
              p-4
            "
          >

            <div
              className="
                bg-white
                rounded-2xl
                shadow-2xl
                w-full
                max-w-2xl
                max-h-[90vh]
                overflow-y-auto
              "
            >


              {/* MODAL HEADER */}

              <div
                className="
                  sticky
                  top-0
                  bg-white
                  border-b
                  border-gray-100
                  px-6
                  py-5
                  flex
                  items-center
                  justify-between
                  z-10
                "
              >

                <div>

                  <h2
                    className="
                      text-xl
                      font-bold
                      text-gray-900
                    "
                  >

                    Retailer Application

                  </h2>


                  <p
                    className="
                      text-sm
                      text-gray-400
                      mt-1
                    "
                  >

                    User ID: {selectedRetailer.id}

                  </p>

                </div>


                <button
                  type="button"
                  onClick={() =>
                    setSelectedRetailer(null)
                  }
                  className="
                    p-2
                    rounded-full
                    hover:bg-gray-100
                    text-gray-500
                  "
                >

                  <X size={20} />

                </button>

              </div>


              {/* MODAL CONTENT */}

              <div
                className="
                  p-6
                  space-y-6
                "
              >


                {/* PERSONAL */}

                <section>

                  <h3
                    className="
                      text-sm
                      font-bold
                      uppercase
                      tracking-wide
                      text-[#08511f]
                      mb-3
                    "
                  >

                    Personal Information

                  </h3>


                  <div
                    className="
                      grid
                      grid-cols-1
                      sm:grid-cols-2
                      gap-4
                      text-sm
                    "
                  >

                    <InfoItem
                      label="Full Name"
                      value={
                        fullName(
                          selectedRetailer
                        )
                      }
                    />

                    <InfoItem
                      label="Email"
                      value={
                        selectedRetailer.email
                      }
                    />

                    <InfoItem
                      label="Contact Number"
                      value={
                        selectedRetailer.contact_number
                      }
                    />

                    <InfoItem
                      label="Status"
                      value={
                        getDisplayStatus(
                          selectedRetailer.status
                        )
                      }
                    />

                  </div>

                </section>


                {/* ADDRESS */}

                <section>

                  <h3
                    className="
                      text-sm
                      font-bold
                      uppercase
                      tracking-wide
                      text-[#08511f]
                      mb-3
                    "
                  >

                    Address

                  </h3>


                  <div
                    className="
                      bg-gray-50
                      rounded-xl
                      p-4
                      text-sm
                      text-gray-700
                    "
                  >

                    {
                      fullAddress(
                        selectedRetailer
                      ) || "No address available."
                    }

                  </div>

                </section>


                {/* DOCUMENTS */}

                <section>

                  <h3
                    className="
                      text-sm
                      font-bold
                      uppercase
                      tracking-wide
                      text-[#08511f]
                      mb-3
                    "
                  >

                    Submitted Documents

                  </h3>


                  <div
                    className="
                      grid
                      grid-cols-1
                      sm:grid-cols-2
                      gap-3
                    "
                  >

                    <button
                      type="button"
                      onClick={() =>
                        viewDocument(
                          selectedRetailer,
                          "barangay_permit"
                        )
                      }
                      disabled={
                        documentLoading ===
                        `${selectedRetailer.id}-barangay_permit`
                      }
                      className="
                        border
                        border-gray-200
                        rounded-xl
                        p-4
                        flex
                        items-center
                        gap-3
                        hover:border-green-600
                        hover:bg-green-50
                        transition
                        disabled:opacity-50
                      "
                    >

                      <FileText
                        size={22}
                        className="
                          text-[#08511f]
                        "
                      />

                      <div className="text-left">

                        <p
                          className="
                            text-sm
                            font-semibold
                            text-gray-800
                          "
                        >

                          Barangay Permit

                        </p>


                        <p
                          className="
                            text-xs
                            text-gray-400
                          "
                        >

                          View Document

                        </p>

                      </div>

                    </button>


                    <button
                      type="button"
                      onClick={() =>
                        viewDocument(
                          selectedRetailer,
                          "valid_id"
                        )
                      }
                      disabled={
                        documentLoading ===
                        `${selectedRetailer.id}-valid_id`
                      }
                      className="
                        border
                        border-gray-200
                        rounded-xl
                        p-4
                        flex
                        items-center
                        gap-3
                        hover:border-green-600
                        hover:bg-green-50
                        transition
                        disabled:opacity-50
                      "
                    >

                      <FileText
                        size={22}
                        className="
                          text-[#08511f]
                        "
                      />

                      <div className="text-left">

                        <p
                          className="
                            text-sm
                            font-semibold
                            text-gray-800
                          "
                        >

                          Valid ID

                        </p>


                        <p
                          className="
                            text-xs
                            text-gray-400
                          "
                        >

                          View Document

                        </p>

                      </div>

                    </button>

                  </div>

                </section>


                {/* ACTIONS */}

                <section
                  className="
                    pt-5
                    border-t
                    border-gray-100
                  "
                >

                  {
                    getDisplayStatus(
                      selectedRetailer.status
                    ) === "To Review" && (

                      <div
                        className="
                          flex
                          flex-col
                          sm:flex-row
                          gap-3
                          justify-end
                        "
                      >

                        <button
                          type="button"
                          onClick={() =>
                            updateStatus(
                              selectedRetailer,
                              "reject"
                            )
                          }
                          disabled={
                            actionLoading !== null
                          }
                          className="
                            inline-flex
                            items-center
                            justify-center
                            gap-2
                            px-5
                            py-3
                            rounded-xl
                            border
                            border-red-200
                            bg-red-50
                            text-red-700
                            font-semibold
                            text-sm
                            hover:bg-red-100
                            disabled:opacity-50
                          "
                        >

                          <X size={17} />

                          {
                            actionLoading ===
                            `${selectedRetailer.id}-reject`

                              ? "Rejecting..."

                              : "Reject"
                          }

                        </button>


                        <button
                          type="button"
                          onClick={() =>
                            updateStatus(
                              selectedRetailer,
                              "approve"
                            )
                          }
                          disabled={
                            actionLoading !== null
                          }
                          className="
                            inline-flex
                            items-center
                            justify-center
                            gap-2
                            px-5
                            py-3
                            rounded-xl
                            bg-[#08511f]
                            text-white
                            font-semibold
                            text-sm
                            hover:bg-green-800
                            disabled:opacity-50
                          "
                        >

                          <Check size={17} />

                          {
                            actionLoading ===
                            `${selectedRetailer.id}-approve`

                              ? "Approving..."

                              : "Approve Retailer"
                          }

                        </button>

                      </div>

                    )
                  }


                  {
                    getDisplayStatus(
                      selectedRetailer.status
                    ) === "Active" && (

                      <div
                        className="
                          flex
                          justify-end
                        "
                      >

                        <button
                          type="button"
                          onClick={() =>
                            updateStatus(
                              selectedRetailer,
                              "archive"
                            )
                          }
                          disabled={
                            actionLoading !== null
                          }
                          className="
                            inline-flex
                            items-center
                            gap-2
                            px-5
                            py-3
                            rounded-xl
                            border
                            border-gray-200
                            text-gray-700
                            font-semibold
                            text-sm
                            hover:bg-gray-50
                            disabled:opacity-50
                          "
                        >

                          <Archive size={17} />

                          Archive Retailer

                        </button>

                      </div>

                    )
                  }


                  {
                    getDisplayStatus(
                      selectedRetailer.status
                    ) === "Rejected" && (

                      <div
                        className="
                          flex
                          justify-end
                        "
                      >

                        <button
                          type="button"
                          onClick={() =>
                            updateStatus(
                              selectedRetailer,
                              "restore"
                            )
                          }
                          disabled={
                            actionLoading !== null
                          }
                          className="
                            inline-flex
                            items-center
                            gap-2
                            px-5
                            py-3
                            rounded-xl
                            bg-[#08511f]
                            text-white
                            font-semibold
                            text-sm
                            hover:bg-green-800
                            disabled:opacity-50
                          "
                        >

                          <RotateCcw size={17} />

                          Restore / Activate

                        </button>

                      </div>

                    )
                  }

                </section>

              </div>

            </div>

          </div>

        )
      }

    </div>

  );

};


// ===========================================================
// INFO ITEM
// ===========================================================

const InfoItem = ({
  label,
  value,
}) => (

  <div>

    <p
      className="
        text-xs
        uppercase
        tracking-wide
        font-semibold
        text-gray-400
        mb-1
      "
    >

      {label}

    </p>


    <p
      className="
        text-gray-800
        font-medium
      "
    >

      {value || "—"}

    </p>

  </div>

);


export default RetailerManagement;