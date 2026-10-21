import {
  useCallback,
  useRef,
  useState,
} from "react";

import useApi from "../useApi";


const useAnnouncementClimate = () => {
  const {
    request,
  } = useApi();


  // =========================================================
  // CLIMATE FORECAST STATE
  // =========================================================

  const [
    forecast,
    setForecast,
  ] = useState(null);


  const [
    forecastLocation,
    setForecastLocation,
  ] = useState(null);


  const [
    loadingForecast,
    setLoadingForecast,
  ] = useState(false);


  const [
    forecastError,
    setForecastError,
  ] = useState("");


  // =========================================================
  // AI ARTICLE STATE
  // =========================================================

  const [
    generatedArticle,
    setGeneratedArticle,
  ] = useState(null);


  const [
    generatingArticle,
    setGeneratingArticle,
  ] = useState(false);


  const [
    generationError,
    setGenerationError,
  ] = useState("");

  const inFlightForecastRef = useRef(false);
  const inFlightArticleRef = useRef(false);


  // =========================================================
  // FETCH CLIMATE FORECAST
  // =========================================================

  const fetchClimateForecast =
    useCallback(
      async (
        location
      ) => {

        if (!location) {
          throw new Error(
            "Forecast location is required."
          );
        }

        if (inFlightForecastRef.current) {
          return forecast;
        }

        const reqKey = location?.city_code || location?.display_name || location?.city;
        const curKey = forecastLocation?.city_code || forecastLocation?.display_name || forecastLocation?.city;
        if (forecast && reqKey && curKey && reqKey === curKey) {
          return forecast;
        }

        inFlightForecastRef.current = true;

        setLoadingForecast(
          true
        );

        setForecastError("");

        setForecast(null);

        setGeneratedArticle(null);


        try {

          const response =
            await request(
              "/admin/announcements/climate/forecast/",
              {
                method:
                  "POST",

                body: {
                  location,
                },

                throwOnError:
                  true,
              }
            );


          const data =
            response?.data ||
            null;


          if (!data) {
            throw new Error(
              "No climate forecast was returned."
            );
          }


          setForecast(
            data
          );


          setForecastLocation(
            data?.location ||
            location
          );


        } catch (error) {

          const isQueueLimit =
            error?.status === 429 ||
            error?.data?.error_code === "CDS_QUEUE_LIMIT_REACHED" ||
            /queue/i.test(error?.message || "") ||
            /sequentially/i.test(error?.message || "");

          const message = isQueueLimit
            ? (error?.data?.detail || error?.message || "The Copernicus Climate Data Store queue is temporarily busy processing other requests. Please wait a moment and click Retry.")
            : (error?.message || "Unable to retrieve climate forecast.");

          setForecastError(
            message
          );

          throw error;

        } finally {

          inFlightForecastRef.current = false;

          setLoadingForecast(
            false
          );

        }

      },
      [
        request,
        forecast,
        forecastLocation,
      ]
    );


  // =========================================================
  // GENERATE CLIMATE-INFORMED ARTICLE
  // =========================================================

  const generateClimateArticle =
    useCallback(
      async ({
        audience,
        range,
        forecast:
          suppliedForecast,
        location:
          suppliedLocation,
      }) => {

        if (inFlightArticleRef.current) {
          return generatedArticle;
        }

        const activeForecast =
          suppliedForecast ||
          forecast;


        const activeLocation =
          suppliedLocation ||
          forecastLocation ||
          activeForecast?.location;


        if (!activeForecast) {
          throw new Error(
            "Climate forecast is required."
          );
        }


        if (!activeLocation) {
          throw new Error(
            "Forecast location is required."
          );
        }


        if (!audience) {
          throw new Error(
            "Article audience is required."
          );
        }


        const selectedRange =
          Number(
            range
          );


        if (
          ![
            1,
            3,
            6,
          ].includes(
            selectedRange
          )
        ) {
          throw new Error(
            "Forecast range must be 1, 3, or 6 months."
          );
        }


        inFlightArticleRef.current = true;

        setGeneratingArticle(
          true
        );

        setGenerationError("");

        setGeneratedArticle(
          null
        );


        try {

          const response =
            await request(
              "/admin/announcements/climate/generate-article/",
              {
                method:
                  "POST",

                body: {
                  location:
                    activeLocation,

                  audience,

                  range:
                    selectedRange,

                  forecast:
                    activeForecast,
                },

                throwOnError:
                  true,
              }
            );


          const article =
            response?.data ||
            null;


          if (!article) {
            throw new Error(
              "No generated article was returned."
            );
          }


          setGeneratedArticle(
            article
          );


          return article;

        } catch (error) {

          const message =
            error?.message ||
            "Unable to generate the climate-informed article.";


          setGenerationError(
            message
          );


          throw error;

        } finally {

          inFlightArticleRef.current = false;

          setGeneratingArticle(
            false
          );

        }

      },
      [
        request,
        forecast,
        forecastLocation,
        generatedArticle,
      ]
    );


  // =========================================================
  // CLEAR GENERATED ARTICLE ONLY
  // =========================================================

  const clearGeneratedArticle =
    useCallback(
      () => {

        setGeneratedArticle(
          null
        );

        setGenerationError("");

      },
      []
    );


  // =========================================================
  // CLEAR FORECAST ONLY
  // =========================================================

  const clearForecast =
    useCallback(
      () => {

        setForecast(
          null
        );

        setForecastLocation(
          null
        );

        setForecastError("");

        setGeneratedArticle(
          null
        );

        setGenerationError("");

      },
      []
    );


  // =========================================================
  // RESET ENTIRE CLIMATE + AI WORKFLOW
  // =========================================================

  const resetClimateWorkflow =
    useCallback(
      () => {

        setForecast(
          null
        );

        setForecastLocation(
          null
        );

        setForecastError("");

        setGeneratedArticle(
          null
        );

        setGenerationError("");

        setLoadingForecast(
          false
        );

        setGeneratingArticle(
          false
        );

      },
      []
    );


  // =========================================================
  // PUBLIC API
  // =========================================================

  return {
    // Climate forecast
    forecast,
    forecastLocation,
    loadingForecast,
    forecastError,

    fetchClimateForecast,
    clearForecast,

    // AI article
    generatedArticle,
    generatingArticle,
    generationError,

    generateClimateArticle,
    clearGeneratedArticle,

    // Full reset
    resetClimateWorkflow,
  };
};


export default useAnnouncementClimate;