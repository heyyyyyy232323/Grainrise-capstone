import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  Check,
  CloudSun,
  Loader2,
  MapPin,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";

import {
  createPortal,
} from "react-dom";

import usePhilippineAddress from "../../hooks/usePhilippineAddress";

import ClimateForecastSummary from "../../Minor-Components/ClimateForecastSummary";


const ClimateForecastModal = ({
  open,
  onClose,

  forecast = null,
  loading = false,
  generating = false,
  forecastError = "",

  audience = "",
  onAudienceChange,

  onConfirmLocation,
  onGenerateArticle,
}) => {

  const isProcessing = Boolean(loading || generating);

  const handleClose = () => {
    if (isProcessing) return;
    onClose?.();
  };

  const [
    selectedRange,
    setSelectedRange,
  ] = useState(6);

  const [
    confirmedLocation,
    setConfirmedLocation,
  ] = useState(null);


  const {
    province,
    municipality,

    provinces,
    municipalities,

    selectedProvince,
    selectedMunicipality,

    selectProvince,
    selectMunicipality,

    loading: locationLoading,
    errors: locationErrors,
  } = usePhilippineAddress();


  // =========================================================
  // FORECAST MONTHS
  // =========================================================

  const months =
    useMemo(() => {

      const source =
        forecast?.months;

      if (!Array.isArray(source)) {
        return [];
      }

      return source.slice(
        0,
        selectedRange
      );

    }, [
      forecast,
      selectedRange,
    ]);


  // =========================================================
  // KEYBOARD DISMISSAL LOCK
  // =========================================================

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (!isProcessing) {
          onClose?.();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, isProcessing, onClose]);


  if (!open) {
    return null;
  }


  // =========================================================
  // PROVINCE
  // =========================================================

  const handleProvinceChange =
    async (event) => {

      const value =
        event.target.value;

      setConfirmedLocation(
        null
      );


      try {

        await selectProvince(
          value
        );

      } catch (error) {

        console.error(
          "Unable to select province:",
          error
        );

      }

    };


  // =========================================================
  // CITY / MUNICIPALITY
  // =========================================================

  const handleMunicipalityChange =
    async (event) => {

      const value =
        event.target.value;

      setConfirmedLocation(
        null
      );


      try {

        await selectMunicipality(
          value
        );

      } catch (error) {

        console.error(
          "Unable to select city / municipality:",
          error
        );

      }

    };


  // =========================================================
  // CONFIRM LOCATION
  // =========================================================

  const handleConfirmLocation =
    () => {

      if (
        !province ||
        !municipality ||
        !selectedProvince ||
        !selectedMunicipality ||
        loading
      ) {
        return;
      }


      const location = {
        country:
          "Philippines",

        country_code:
          "PH",

        province:
          province,

        province_code:
          selectedProvince.code ||
          "",

        province_type:
          selectedProvince.type ||
          "",

        city:
          municipality,

        city_code:
          selectedMunicipality.code ||
          "",

        locality_type:
          selectedMunicipality.type ||
          "",

        display_name:
          `${municipality}, ${province}, Philippines`,
      };


      if (
        forecast &&
        confirmedLocation &&
        confirmedLocation.city_code === location.city_code &&
        confirmedLocation.province_code === location.province_code
      ) {
        return;
      }


      setConfirmedLocation(
        location
      );


      onConfirmLocation?.(
        location
      );

    };


  // =========================================================
  // GENERATE ARTICLE
  // =========================================================

  const handleGenerate =
    () => {

      if (
        !forecast ||
        !months.length ||
        !audience ||
        generating
      ) {
        return;
      }


      onGenerateArticle?.({
        audience,

        range:
          selectedRange,

        months,

        forecast,

        location:
          confirmedLocation ||
          forecast?.location ||
          null,
      });

    };


  // =========================================================
  // STATES
  // =========================================================

  const canConfirmLocation =
    Boolean(
      province &&
      municipality &&
      selectedProvince &&
      selectedMunicipality &&
      !locationLoading?.provinces &&
      !locationLoading?.municipalities &&
      !loading
    );


  const selectedLocationLabel =
    confirmedLocation?.display_name ||
    forecast?.location?.display_name ||
    (
      typeof forecast?.location ===
      "string"
        ? forecast.location
        : ""
    );


  // =========================================================
  // RENDER
  // =========================================================

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) {
          handleClose();
        }
      }}
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
        aria-labelledby="climate-forecast-title"
        className="
          flex
          max-h-[90vh]
          w-full
          max-w-6xl
          flex-col
          overflow-hidden
          rounded-2xl
          bg-white
          shadow-2xl
        "
      >

        {/* ===================================================
            HEADER
        ==================================================== */}

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
            <div
              className="
                flex
                items-center
                gap-2
              "
            >
              <CloudSun
                size={21}
                className="
                  text-[#08511f]
                "
              />

              <h2
                id="climate-forecast-title"
                className="
                  text-xl
                  font-bold
                  text-gray-900
                "
              >
                Climate Forecast
              </h2>
            </div>

            <p
              className="
                mt-1
                text-sm
                text-gray-500
              "
            >
              Select a location and review
              climate information before
              generating an announcement.
            </p>
          </div>


          <button
            type="button"
            onClick={
              handleClose
            }
            disabled={
              isProcessing
            }
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
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            <X
              size={19}
            />
          </button>
        </div>


        {/* ===================================================
            CONTENT
        ==================================================== */}

        <div
          className="
            flex-1
            overflow-y-auto
            bg-gray-50/60
            px-6
            py-5
          "
        >

          {/* =================================================
              LOCATION PICKER
          ================================================== */}

          <div
            className="
              rounded-xl
              border
              border-gray-200
              bg-white
              p-4
            "
          >
            <div
              className="
                mb-4
                flex
                items-center
                gap-2
              "
            >
              <MapPin
                size={17}
                className="
                  text-[#08511f]
                "
              />

              <div>
                <p
                  className="
                    text-sm
                    font-bold
                    text-gray-900
                  "
                >
                  Select Forecast Location
                </p>

                <p
                  className="
                    mt-0.5
                    text-xs
                    text-gray-500
                  "
                >
                  Choose the country,
                  province, and city or
                  municipality.
                </p>
              </div>
            </div>


            {/* =================================================
                ONE X-AXIS ROW
            ================================================== */}

            <div
              className="
                grid
                grid-cols-1
                gap-3
                xl:grid-cols-[1fr_1fr_1fr_auto]
                xl:items-end
              "
            >

              {/* COUNTRY */}

              <div>
                <label
                  htmlFor="forecast-country"
                  className="
                    mb-2
                    block
                    text-xs
                    font-semibold
                    text-gray-600
                  "
                >
                  Country
                </label>

                <select
                  id="forecast-country"
                  value="Philippines"
                  disabled
                  className="
                    h-11
                    w-full
                    rounded-lg
                    border
                    border-gray-300
                    bg-gray-50
                    px-3
                    text-sm
                    text-gray-700
                    outline-none
                  "
                >
                  <option
                    value="Philippines"
                  >
                    Philippines
                  </option>
                </select>
              </div>


              {/* PROVINCE */}

              <div>
                <label
                  htmlFor="forecast-province"
                  className="
                    mb-2
                    block
                    text-xs
                    font-semibold
                    text-gray-600
                  "
                >
                  Province
                </label>

                <select
                  id="forecast-province"
                  value={
                    province
                  }
                  onChange={
                    handleProvinceChange
                  }
                  disabled={
                    locationLoading?.provinces
                  }
                  className="
                    h-11
                    w-full
                    rounded-lg
                    border
                    border-gray-300
                    bg-white
                    px-3
                    text-sm
                    text-gray-700
                    outline-none
                    transition
                    focus:border-[#08511f]
                    focus:ring-1
                    focus:ring-[#08511f]
                    disabled:cursor-not-allowed
                    disabled:bg-gray-100
                  "
                >
                  <option value="">
                    {locationLoading?.provinces
                      ? "Loading provinces..."
                      : "Select province"}
                  </option>

                  {provinces.map(
                    (item) => (
                      <option
                        key={
                          item.code
                        }
                        value={
                          item.name
                        }
                      >
                        {item.name}
                      </option>
                    )
                  )}
                </select>


                {locationErrors?.provinces && (
                  <p
                    className="
                      mt-1
                      text-xs
                      text-red-600
                    "
                  >
                    {locationErrors.provinces}
                  </p>
                )}
              </div>


              {/* CITY / MUNICIPALITY */}

              <div>
                <label
                  htmlFor="forecast-municipality"
                  className="
                    mb-2
                    block
                    text-xs
                    font-semibold
                    text-gray-600
                  "
                >
                  City / Municipality
                </label>

                <select
                  id="forecast-municipality"
                  value={
                    municipality
                  }
                  onChange={
                    handleMunicipalityChange
                  }
                  disabled={
                    !province ||
                    locationLoading?.municipalities
                  }
                  className="
                    h-11
                    w-full
                    rounded-lg
                    border
                    border-gray-300
                    bg-white
                    px-3
                    text-sm
                    text-gray-700
                    outline-none
                    transition
                    focus:border-[#08511f]
                    focus:ring-1
                    focus:ring-[#08511f]
                    disabled:cursor-not-allowed
                    disabled:bg-gray-100
                  "
                >
                  <option value="">
                    {locationLoading?.municipalities
                      ? "Loading cities / municipalities..."
                      : "Select city / municipality"}
                  </option>

                  {municipalities.map(
                    (item) => (
                      <option
                        key={
                          item.code
                        }
                        value={
                          item.name
                        }
                      >
                        {item.name}
                      </option>
                    )
                  )}
                </select>


                {locationErrors?.municipalities && (
                  <p
                    className="
                      mt-1
                      text-xs
                      text-red-600
                    "
                  >
                    {locationErrors.municipalities}
                  </p>
                )}
              </div>


              {/* CONFIRM LOCATION */}

              <button
                type="button"
                onClick={
                  handleConfirmLocation
                }
                disabled={
                  !canConfirmLocation
                }
                className="
                  flex
                  h-11
                  items-center
                  justify-center
                  gap-2
                  whitespace-nowrap
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
                {loading ? (
                  <Loader2
                    size={16}
                    className="
                      animate-spin
                    "
                  />
                ) : (
                  <Check
                    size={16}
                  />
                )}

                {loading
                  ? "Loading..."
                  : "Confirm Location"}
              </button>
            </div>


            {/* =================================================
                CONFIRMED LOCATION
            ================================================== */}

            {selectedLocationLabel && (
              <div
                className="
                  mt-4
                  flex
                  items-center
                  gap-2
                  rounded-lg
                  border
                  border-green-200
                  bg-green-50
                  px-3
                  py-2.5
                "
              >
                <MapPin
                  size={15}
                  className="
                    shrink-0
                    text-[#08511f]
                  "
                />

                <p
                  className="
                    text-xs
                    text-gray-600
                  "
                >
                  Selected Location:{" "}

                  <span
                    className="
                      font-semibold
                      text-gray-800
                    "
                  >
                    {selectedLocationLabel}
                  </span>
                </p>
              </div>
            )}
          </div>


          {/* =================================================
              FORECAST LOADING
          ================================================== */}

          {loading && (
            <div
              className="
                mt-5
                flex
                min-h-[280px]
                flex-col
                items-center
                justify-center
                rounded-xl
                border
                border-gray-200
                bg-white
                px-6
                text-center
              "
            >
              <Loader2
                size={28}
                className="
                  animate-spin
                  text-[#08511f]
                "
              />

              <p
                className="
                  mt-4
                  text-sm
                  font-semibold
                  text-gray-800
                "
              >
                Getting climate forecast...
              </p>

              <p
                className="
                  mt-1
                  text-xs
                  text-gray-500
                "
              >
                Retrieving climate data for
                the selected location.
              </p>
            </div>
          )}


          {/* =================================================
              FORECAST ERROR WITH MANUAL RETRY
          ================================================== */}

          {!loading &&
            !forecast &&
            forecastError && (
              <div
                className="
                  mt-5
                  rounded-xl
                  border
                  border-red-200
                  bg-red-50/70
                  p-5
                  text-left
                "
              >
                <div className="flex flex-col sm:flex-row items-start gap-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <AlertCircle size={20} />
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-bold text-red-900">
                      Climate Forecast Unavailable
                    </p>

                    <p className="mt-1 text-xs leading-relaxed text-red-700">
                      {forecastError}
                    </p>

                    <div className="mt-3.5 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleConfirmLocation}
                        disabled={!canConfirmLocation || loading}
                        className="
                          inline-flex
                          items-center
                          gap-2
                          rounded-lg
                          bg-red-600
                          px-4
                          py-2
                          text-xs
                          font-semibold
                          text-white
                          shadow-sm
                          transition
                          hover:bg-red-700
                          disabled:cursor-not-allowed
                          disabled:opacity-50
                        "
                      >
                        <RefreshCw
                          size={14}
                          className={loading ? "animate-spin" : ""}
                        />
                        Retry Forecast
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}


          {/* =================================================
              NO FORECAST YET
          ================================================== */}

          {!loading &&
            !forecast &&
            !forecastError && (
              <div
                className="
                  mt-5
                  flex
                  min-h-[230px]
                  flex-col
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-dashed
                  border-gray-300
                  bg-white
                  px-6
                  text-center
                "
              >
                <MapPin
                  size={25}
                  className="
                    text-gray-400
                  "
                />

                <p
                  className="
                    mt-3
                    text-sm
                    font-semibold
                    text-gray-700
                  "
                >
                  Select a forecast location
                </p>

                <p
                  className="
                    mt-1
                    max-w-md
                    text-xs
                    leading-5
                    text-gray-500
                  "
                >
                  Select a province and city
                  or municipality, then confirm
                  the location to retrieve the
                  climate forecast.
                </p>
              </div>
            )}


          {/* =================================================
              FORECAST AVAILABLE
          ================================================== */}

          {!loading &&
            forecast && (
              <>

                {/* FORECAST RANGE */}

                <div
                  className="
                    mt-5
                    rounded-xl
                    border
                    border-gray-200
                    bg-white
                    p-4
                  "
                >
                  <div
                    className="
                      flex
                      flex-col
                      gap-3
                      sm:flex-row
                      sm:items-center
                      sm:justify-between
                    "
                  >
                    <div>
                      <p
                        className="
                          text-sm
                          font-bold
                          text-gray-900
                        "
                      >
                        Forecast Range
                      </p>

                      <p
                        className="
                          mt-1
                          text-xs
                          text-gray-500
                        "
                      >
                        Choose how much of
                        the six-month forecast
                        to review.
                      </p>
                    </div>


                    <div
                      className="
                        inline-flex
                        w-fit
                        rounded-lg
                        border
                        border-gray-200
                        bg-gray-50
                        p-1
                      "
                    >
                      {[1, 3, 6].map(
                        (range) => (
                          <button
                            key={
                              range
                            }
                            type="button"
                            onClick={() =>
                              setSelectedRange(
                                range
                              )
                            }
                            className={`
                              rounded-md
                              px-4
                              py-2
                              text-xs
                              font-semibold
                              transition

                              ${
                                selectedRange ===
                                range
                                  ? "bg-[#08511f] text-white shadow-sm"
                                  : "text-gray-600 hover:bg-white"
                              }
                            `}
                          >
                            {range}{" "}
                            {range === 1
                              ? "Month"
                              : "Months"}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>


                {/* CLIMATE SUMMARY */}

                <div
                  className="
                    mt-5
                  "
                >
                  <ClimateForecastSummary
                    location={
                      selectedLocationLabel
                    }
                    months={
                      months
                    }
                    selectedRange={
                      selectedRange
                    }
                  />
                </div>


                {/* SOURCE */}

                <div
                  className="
                    mt-5
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
                      text-xs
                      leading-5
                      text-gray-500
                    "
                  >
                    Source:{" "}

                    <span
                      className="
                        font-semibold
                        text-gray-700
                      "
                    >
                      {forecast.source ||
                        "Copernicus Climate Data Store"}
                    </span>
                  </p>
                </div>


                {/* ARTICLE AUDIENCE */}

                <div
                  className="
                    mt-5
                    rounded-xl
                    border
                    border-gray-200
                    bg-white
                    p-4
                  "
                >
                  <label
                    htmlFor="climate-article-audience"
                    className="
                      text-sm
                      font-bold
                      text-gray-900
                    "
                  >
                    Article Audience
                  </label>

                  <p
                    className="
                      mt-1
                      text-xs
                      text-gray-500
                    "
                  >
                    The generated article
                    will be written for the
                    selected GrainRise audience.
                  </p>


                  <select
                    id="climate-article-audience"
                    value={
                      audience
                    }
                    onChange={(
                      event
                    ) =>
                      onAudienceChange?.(
                        event.target.value
                      )
                    }
                    className="
                      mt-3
                      h-11
                      w-full
                      rounded-lg
                      border
                      border-gray-300
                      bg-white
                      px-3
                      text-sm
                      text-gray-700
                      outline-none
                      transition
                      focus:border-[#08511f]
                      focus:ring-1
                      focus:ring-[#08511f]
                    "
                  >
                    <option value="">
                      Select audience
                    </option>

                    <option value="all">
                      All
                    </option>

                    <option value="miller">
                      Miller
                    </option>

                    <option value="warehouse">
                      Warehouse
                    </option>

                    <option value="retailer">
                      Retailer
                    </option>
                  </select>
                </div>
              </>
            )}
        </div>


        {/* ===================================================
            FOOTER
        ==================================================== */}

        <div
          className="
            flex
            shrink-0
            items-center
            justify-end
            gap-3
            border-t
            border-gray-200
            bg-white
            px-6
            py-4
          "
        >
          <button
            type="button"
            onClick={handleClose}
            disabled={isProcessing}
            className="
              h-11
              rounded-lg
              border
              border-gray-300
              bg-white
              px-5
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

          {!loading &&
            forecast && (
              <button
                type="button"
                onClick={
                  handleGenerate
                }
                disabled={
                  !audience ||
                  !months.length ||
                  generating
                }
                className="
                  flex
                  h-11
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
                {generating ? (
                  <>
                    <Loader2
                      size={17}
                      className="
                        animate-spin
                      "
                    />

                    Generating Article...
                  </>
                ) : (
                  <>
                    <Sparkles
                      size={17}
                    />

                    Generate Article
                    from Forecast
                  </>
                )}
              </button>
            )}
        </div>
      </div>
    </div>,

    document.body
  );
};


export default ClimateForecastModal;