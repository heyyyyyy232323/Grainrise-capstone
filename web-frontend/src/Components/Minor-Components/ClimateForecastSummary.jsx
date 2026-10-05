import React, {
  useMemo,
} from "react";

import {
  CloudRain,
  Thermometer,
  Wind,
} from "lucide-react";


const ClimateForecastSummary = ({
  location = "Bulacan",
  months = [],
  selectedRange = 6,
}) => {

  const normalizedMonths =
    useMemo(() => {

      if (!Array.isArray(months)) {
        return [];
      }

      return months.map(
        (item, index) => ({
          month:
            item?.month ||
            item?.label ||
            `Month ${index + 1}`,

          averageTemperature:
            Number(
              item?.average_temperature_c ??
              item?.average_temperature ??
              item?.temperature_c ??
              item?.temperature ??
              0
            ),

          totalRainfall:
            Number(
              item?.total_precipitation_mm ??
              item?.total_rainfall_mm ??
              item?.rainfall_mm ??
              item?.rainfall ??
              0
            ),

          averageWindSpeed:
            Number(
              item?.average_wind_speed_kmh ??
              item?.average_wind_speed ??
              item?.wind_speed_kmh ??
              item?.wind_speed ??
              0
            ),
        })
      );

    }, [months]);


  const averages =
    useMemo(() => {

      if (!normalizedMonths.length) {
        return {
          temperature: 0,
          rainfall: 0,
          wind: 0,
        };
      }

      const totalTemperature =
        normalizedMonths.reduce(
          (sum, item) =>
            sum +
            item.averageTemperature,
          0
        );

      const totalRainfall =
        normalizedMonths.reduce(
          (sum, item) =>
            sum +
            item.totalRainfall,
          0
        );

      const totalWind =
        normalizedMonths.reduce(
          (sum, item) =>
            sum +
            item.averageWindSpeed,
          0
        );

      return {
        temperature:
          totalTemperature /
          normalizedMonths.length,

        rainfall:
          totalRainfall,

        wind:
          totalWind /
          normalizedMonths.length,
      };

    }, [normalizedMonths]);


  const maxRainfall =
    Math.max(
      ...normalizedMonths.map(
        (item) =>
          item.totalRainfall
      ),
      1
    );


  const temperatureValues =
    normalizedMonths.map(
      (item) =>
        item.averageTemperature
    );


  const minTemperature =
    temperatureValues.length
      ? Math.min(
          ...temperatureValues
        )
      : 0;


  const maxTemperature =
    temperatureValues.length
      ? Math.max(
          ...temperatureValues
        )
      : 1;


  const temperatureRange =
    Math.max(
      maxTemperature -
        minTemperature,
      1
    );


  if (!normalizedMonths.length) {
    return (
      <div
        className="
          rounded-xl
          border
          border-dashed
          border-gray-300
          bg-white
          px-6
          py-10
          text-center
        "
      >
        <p
          className="
            text-sm
            font-semibold
            text-gray-700
          "
        >
          No climate data available
        </p>

        <p
          className="
            mt-1
            text-xs
            text-gray-500
          "
        >
          Climate forecast values
          will appear here after
          the latest data is fetched.
        </p>
      </div>
    );
  }


  return (
    <div
      className="
        space-y-5
      "
    >

      {/* SUMMARY HEADER */}

      <div
        className="
          flex
          flex-col
          gap-1
        "
      >
        <p
          className="
            text-sm
            font-bold
            text-gray-900
          "
        >
          Climate Forecast Summary
        </p>

        <p
          className="
            text-xs
            text-gray-500
          "
        >
          {location} •{" "}
          {selectedRange}{" "}
          {selectedRange === 1
            ? "month"
            : "months"}
        </p>
      </div>


      {/* KPI CARDS */}

      <div
        className="
          grid
          grid-cols-1
          gap-4
          md:grid-cols-3
        "
      >

        {/* TEMPERATURE */}

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
                items-center
                justify-center
                rounded-lg
                bg-orange-50
                text-orange-600
              "
            >
              <Thermometer
                size={19}
              />
            </div>

            <div>
              <p
                className="
                  text-xs
                  font-medium
                  text-gray-500
                "
              >
                Average Temperature
              </p>

              <p
                className="
                  mt-0.5
                  text-lg
                  font-bold
                  text-gray-900
                "
              >
                {
                  averages.temperature.toFixed(
                    1
                  )
                }
                °C
              </p>
            </div>
          </div>
        </div>


        {/* RAINFALL */}

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
                items-center
                justify-center
                rounded-lg
                bg-blue-50
                text-blue-600
              "
            >
              <CloudRain
                size={19}
              />
            </div>

            <div>
              <p
                className="
                  text-xs
                  font-medium
                  text-gray-500
                "
              >
                Total Rainfall
              </p>

              <p
                className="
                  mt-0.5
                  text-lg
                  font-bold
                  text-gray-900
                "
              >
                {
                  averages.rainfall.toFixed(
                    1
                  )
                }
                {" "}mm
              </p>
            </div>
          </div>
        </div>


        {/* WIND */}

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
                items-center
                justify-center
                rounded-lg
                bg-slate-100
                text-slate-600
              "
            >
              <Wind
                size={19}
              />
            </div>

            <div>
              <p
                className="
                  text-xs
                  font-medium
                  text-gray-500
                "
              >
                Average Wind Speed
              </p>

              <p
                className="
                  mt-0.5
                  text-lg
                  font-bold
                  text-gray-900
                "
              >
                {
                  averages.wind.toFixed(
                    1
                  )
                }
                {" "}km/h
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* MONTHLY DETAILS */}

      <div
        className="
          rounded-xl
          border
          border-gray-200
          bg-white
        "
      >
        <div
          className="
            border-b
            border-gray-100
            px-4
            py-3
          "
        >
          <p
            className="
              text-sm
              font-bold
              text-gray-900
            "
          >
            Monthly Forecast
          </p>
        </div>


        <div
          className="
            divide-y
            divide-gray-100
          "
        >
          {normalizedMonths.map(
            (item) => (
              <div
                key={item.month}
                className="
                  grid
                  grid-cols-1
                  gap-3
                  px-4
                  py-4
                  sm:grid-cols-4
                  sm:items-center
                "
              >
                <div>
                  <p
                    className="
                      text-sm
                      font-semibold
                      text-gray-900
                    "
                  >
                    {item.month}
                  </p>
                </div>

                <div>
                  <p
                    className="
                      text-[11px]
                      uppercase
                      tracking-wide
                      text-gray-400
                    "
                  >
                    Temperature
                  </p>

                  <p
                    className="
                      mt-1
                      text-sm
                      font-semibold
                      text-gray-700
                    "
                  >
                    {
                      item.averageTemperature.toFixed(
                        1
                      )
                    }
                    °C
                  </p>
                </div>

                <div>
                  <p
                    className="
                      text-[11px]
                      uppercase
                      tracking-wide
                      text-gray-400
                    "
                  >
                    Rainfall
                  </p>

                  <p
                    className="
                      mt-1
                      text-sm
                      font-semibold
                      text-gray-700
                    "
                  >
                    {
                      item.totalRainfall.toFixed(
                        1
                      )
                    }
                    {" "}mm
                  </p>
                </div>

                <div>
                  <p
                    className="
                      text-[11px]
                      uppercase
                      tracking-wide
                      text-gray-400
                    "
                  >
                    Wind Speed
                  </p>

                  <p
                    className="
                      mt-1
                      text-sm
                      font-semibold
                      text-gray-700
                    "
                  >
                    {
                      item.averageWindSpeed.toFixed(
                        1
                      )
                    }
                    {" "}km/h
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      </div>


      {/* RAINFALL CHART */}

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
          "
        >
          <p
            className="
              text-sm
              font-bold
              text-gray-900
            "
          >
            Rainfall Forecast
          </p>

          <p
            className="
              mt-1
              text-xs
              text-gray-500
            "
          >
            Total monthly rainfall
          </p>
        </div>


        <div
          className="
            flex
            h-48
            items-end
            gap-3
            overflow-x-auto
            border-b
            border-gray-200
            pb-0
          "
        >
          {normalizedMonths.map(
            (item) => {

              const heightPercent =
                Math.max(
                  8,
                  (
                    item.totalRainfall /
                    maxRainfall
                  ) * 100
                );

              return (
                <div
                  key={`rain-${item.month}`}
                  className="
                    flex
                    min-w-[70px]
                    flex-1
                    flex-col
                    items-center
                    justify-end
                  "
                >
                  <span
                    className="
                      mb-2
                      text-[11px]
                      font-semibold
                      text-gray-600
                    "
                  >
                    {
                      item.totalRainfall.toFixed(
                        0
                      )
                    }
                  </span>

                  <div
                    className="
                      flex
                      h-32
                      w-full
                      items-end
                      justify-center
                    "
                  >
                    <div
                      style={{
                        height: `${heightPercent}%`,
                      }}
                      className="
                        w-8
                        rounded-t-md
                        bg-blue-500
                        transition-all
                      "
                    />
                  </div>

                  <span
                    className="
                      mt-2
                      max-w-[80px]
                      truncate
                      text-[10px]
                      text-gray-500
                    "
                    title={item.month}
                  >
                    {item.month}
                  </span>
                </div>
              );
            }
          )}
        </div>

        <p
          className="
            mt-3
            text-[11px]
            text-gray-400
          "
        >
          Values shown in millimeters.
        </p>
      </div>


      {/* TEMPERATURE CHART */}

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
          "
        >
          <p
            className="
              text-sm
              font-bold
              text-gray-900
            "
          >
            Temperature Forecast
          </p>

          <p
            className="
              mt-1
              text-xs
              text-gray-500
            "
          >
            Average monthly temperature
          </p>
        </div>


        <div
          className="
            overflow-x-auto
          "
        >
          <div
            className="
              relative
              min-w-[520px]
            "
          >
            <div
              className="
                flex
                h-48
                items-end
                gap-3
                border-b
                border-gray-200
              "
            >
              {normalizedMonths.map(
                (item) => {

                  const position =
                    (
                      (
                        item.averageTemperature -
                        minTemperature
                      ) /
                      temperatureRange
                    ) *
                    70 +
                    15;

                  return (
                    <div
                      key={`temp-${item.month}`}
                      className="
                        relative
                        flex
                        min-w-[70px]
                        flex-1
                        justify-center
                      "
                    >
                      <div
                        className="
                          relative
                          h-40
                          w-full
                        "
                      >
                        <div
                          style={{
                            bottom: `${position}%`,
                          }}
                          className="
                            absolute
                            left-1/2
                            -translate-x-1/2
                          "
                        >
                          <div
                            className="
                              mb-1
                              whitespace-nowrap
                              text-[11px]
                              font-semibold
                              text-gray-700
                            "
                          >
                            {
                              item.averageTemperature.toFixed(
                                1
                              )
                            }
                            °C
                          </div>

                          <div
                            className="
                              mx-auto
                              h-3
                              w-3
                              rounded-full
                              bg-orange-500
                            "
                          />
                        </div>
                      </div>

                      <span
                        className="
                          absolute
                          -bottom-6
                          max-w-[80px]
                          truncate
                          text-[10px]
                          text-gray-500
                        "
                        title={item.month}
                      >
                        {item.month}
                      </span>
                    </div>
                  );
                }
              )}
            </div>

            <div
              className="
                h-7
              "
            />
          </div>
        </div>

        <p
          className="
            mt-2
            text-[11px]
            text-gray-400
          "
        >
          Values shown in degrees Celsius.
        </p>
      </div>
    </div>
  );
};


export default ClimateForecastSummary;