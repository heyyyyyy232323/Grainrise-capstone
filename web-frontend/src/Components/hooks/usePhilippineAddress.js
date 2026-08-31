import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import useApi from "./useApi";


const sortByName = (items = []) => {
  return [...items].sort((a, b) =>
    String(a?.name || "").localeCompare(
      String(b?.name || "")
    )
  );
};


const createRecordMap = (items = []) => {
  const records = {};

  items.forEach((item) => {
    if (!item?.name) return;

    records[item.name] = item;
  });

  return records;
};


const usePhilippineAddress = () => {
  const { request } = useApi();


  // =========================================================
  // SELECTED VALUES
  // =========================================================

  const [province, setProvince] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [barangay, setBarangay] = useState("");
  const [postalCode, setPostalCode] = useState("");


  // =========================================================
  // LOCATION DATA
  // =========================================================

  const [provinces, setProvinces] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [barangays, setBarangays] = useState([]);


  // =========================================================
  // LOOKUP MAPS
  // =========================================================

  const [provinceRecords, setProvinceRecords] =
    useState({});

  const [municipalityRecords, setMunicipalityRecords] =
    useState({});


  // =========================================================
  // LOADING STATE
  // =========================================================

  const [loading, setLoading] = useState({
    provinces: false,
    municipalities: false,
    barangays: false,
    postalCode: false,
  });


  // =========================================================
  // ERROR STATE
  // =========================================================

  const [errors, setErrors] = useState({
    provinces: "",
    municipalities: "",
    barangays: "",
    postalCode: "",
  });


  // =========================================================
  // POSTAL CODE STATUS
  // =========================================================
  //
  // idle
  // auto
  // manual
  // unavailable
  // =========================================================

  const [postalStatus, setPostalStatus] =
    useState("idle");


  // =========================================================
  // GENERIC LOCATION REQUEST
  // =========================================================

  const getLocation = useCallback(
    async (endpoint) => {
      return request(
        endpoint,
        {
          method: "GET",
          throwOnError: true,
        }
      );
    },
    [request]
  );


  // =========================================================
  // LOAD PROVINCES
  // =========================================================

  const loadProvinces = useCallback(
    async () => {
      setLoading((prev) => ({
        ...prev,
        provinces: true,
      }));

      setErrors((prev) => ({
        ...prev,
        provinces: "",
      }));

      try {
        const response = await getLocation(
          "/locations/provinces"
        );

        const results = sortByName(
          Array.isArray(response?.results)
            ? response.results
            : []
        );

        setProvinces(results);

        setProvinceRecords(
          createRecordMap(results)
        );
      } catch (error) {
        setProvinces([]);

        setProvinceRecords({});

        setErrors((prev) => ({
          ...prev,

          provinces:
            error?.message ||
            "Unable to load Philippine provinces.",
        }));
      } finally {
        setLoading((prev) => ({
          ...prev,
          provinces: false,
        }));
      }
    },
    [getLocation]
  );


  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadProvinces();
  }, [loadProvinces]);


  // =========================================================
  // SELECT PROVINCE
  // =========================================================

  const selectProvince = useCallback(
    async (provinceName) => {
      // New province means all lower address
      // selections must reset.

      setProvince(provinceName);

      setMunicipality("");
      setBarangay("");
      setPostalCode("");

      setMunicipalities([]);
      setBarangays([]);

      setMunicipalityRecords({});

      setPostalStatus("idle");

      setErrors((prev) => ({
        ...prev,
        municipalities: "",
        barangays: "",
        postalCode: "",
      }));


      if (!provinceName) {
        return;
      }


      const selectedProvince =
        provinceRecords[provinceName];


      if (!selectedProvince?.code) {
        setErrors((prev) => ({
          ...prev,

          municipalities:
            "Province code is unavailable.",
        }));

        return;
      }


      setLoading((prev) => ({
        ...prev,
        municipalities: true,
      }));


      try {
        const response = await getLocation(
          `/locations/provinces/${encodeURIComponent(
            selectedProvince.code
          )}/cities-municipalities`
        );


        const results = sortByName(
          Array.isArray(response?.results)
            ? response.results
            : []
        );


        setMunicipalities(results);

        setMunicipalityRecords(
          createRecordMap(results)
        );


        if (results.length === 0) {
          setErrors((prev) => ({
            ...prev,

            municipalities:
              "No cities or municipalities were found.",
          }));
        }
      } catch (error) {
        setMunicipalities([]);

        setMunicipalityRecords({});

        setErrors((prev) => ({
          ...prev,

          municipalities:
            error?.message ||
            "Unable to load cities and municipalities.",
        }));
      } finally {
        setLoading((prev) => ({
          ...prev,
          municipalities: false,
        }));
      }
    },
    [
      getLocation,
      provinceRecords,
    ]
  );


  // =========================================================
  // GET POSTAL CODE FALLBACK
  // =========================================================

  const loadPostalCode = useCallback(
    async (
      municipalityCode,
      existingPostalCode = ""
    ) => {
      // If the municipality list already returned
      // zip_code, no second API call is needed.

      if (existingPostalCode) {
        const value = String(
          existingPostalCode
        );

        setPostalCode(value);
        setPostalStatus("auto");

        return value;
      }


      if (!municipalityCode) {
        setPostalCode("");
        setPostalStatus("unavailable");

        return "";
      }


      setLoading((prev) => ({
        ...prev,
        postalCode: true,
      }));


      try {
        const response = await getLocation(
          `/locations/cities-municipalities/${encodeURIComponent(
            municipalityCode
          )}`
        );


        const value =
          response?.postal_code
            ? String(response.postal_code)
            : "";


        setPostalCode(value);

        setPostalStatus(
          value
            ? "auto"
            : "unavailable"
        );


        return value;
      } catch (error) {
        setPostalCode("");

        setPostalStatus(
          "unavailable"
        );

        setErrors((prev) => ({
          ...prev,

          postalCode:
            error?.message ||
            "Postal code could not be loaded automatically.",
        }));

        return "";
      } finally {
        setLoading((prev) => ({
          ...prev,
          postalCode: false,
        }));
      }
    },
    [getLocation]
  );


  // =========================================================
  // SELECT MUNICIPALITY / CITY
  // =========================================================

  const selectMunicipality = useCallback(
    async (municipalityName) => {
      setMunicipality(
        municipalityName
      );

      setBarangay("");
      setPostalCode("");

      setBarangays([]);

      setPostalStatus("idle");

      setErrors((prev) => ({
        ...prev,
        barangays: "",
        postalCode: "",
      }));


      if (!municipalityName) {
        return;
      }


      const selectedMunicipality =
        municipalityRecords[
          municipalityName
        ];


      if (!selectedMunicipality?.code) {
        setErrors((prev) => ({
          ...prev,

          barangays:
            "City/Municipality code is unavailable.",
        }));

        setPostalStatus(
          "unavailable"
        );

        return;
      }


      // =====================================================
      // AUTO-FILL POSTAL CODE
      // =====================================================
      //
      // PSGC v1 city/municipality records may already include
      // zip_code.
      //
      // If not included in the list response,
      // loadPostalCode() requests the detail endpoint.
      // =====================================================

      const postalFromRecord =
        selectedMunicipality.postal_code ||
        selectedMunicipality.zip_code ||
        selectedMunicipality.zipCode ||
        "";


      loadPostalCode(
        selectedMunicipality.code,
        postalFromRecord
      );


      // =====================================================
      // LOAD BARANGAYS
      // =====================================================

      setLoading((prev) => ({
        ...prev,
        barangays: true,
      }));


      try {
        const response = await getLocation(
          `/locations/cities-municipalities/${encodeURIComponent(
            selectedMunicipality.code
          )}/barangays`
        );


        const results = sortByName(
          Array.isArray(response?.results)
            ? response.results
            : []
        );


        setBarangays(results);


        if (results.length === 0) {
          setErrors((prev) => ({
            ...prev,

            barangays:
              "No barangays were found for this city or municipality.",
          }));
        }
      } catch (error) {
        setBarangays([]);

        setErrors((prev) => ({
          ...prev,

          barangays:
            error?.message ||
            "Unable to load barangays.",
        }));
      } finally {
        setLoading((prev) => ({
          ...prev,
          barangays: false,
        }));
      }
    },
    [
      getLocation,
      loadPostalCode,
      municipalityRecords,
    ]
  );


  // =========================================================
  // SELECT BARANGAY
  // =========================================================

  const selectBarangay = useCallback(
    (barangayName) => {
      setBarangay(
        barangayName
      );

      setErrors((prev) => ({
        ...prev,
        barangays: "",
      }));
    },
    []
  );


  // =========================================================
  // EDIT POSTAL CODE
  // =========================================================
  //
  // Postal code is AUTO-FILLED when possible,
  // but NEVER locked.
  //
  // User can correct the API-provided value.
  // =========================================================

  const updatePostalCode = useCallback(
    (value) => {
      const cleaned =
        String(value || "")
          .replace(/\D/g, "")
          .slice(0, 4);


      setPostalCode(cleaned);


      setPostalStatus(
        cleaned
          ? "manual"
          : "unavailable"
      );


      setErrors((prev) => ({
        ...prev,
        postalCode: "",
      }));
    },
    []
  );


  // =========================================================
  // RESET ADDRESS
  // =========================================================

  const resetAddress = useCallback(
    () => {
      setProvince("");
      setMunicipality("");
      setBarangay("");
      setPostalCode("");

      setMunicipalities([]);
      setBarangays([]);

      setMunicipalityRecords({});

      setPostalStatus("idle");

      setErrors({
        provinces: "",
        municipalities: "",
        barangays: "",
        postalCode: "",
      });
    },
    []
  );


  // =========================================================
  // DROPDOWN OPTIONS
  // =========================================================

  const provinceOptions = useMemo(
    () =>
      provinces.map(
        (item) => item.name
      ),
    [provinces]
  );


  const municipalityOptions = useMemo(
    () =>
      municipalities.map(
        (item) => item.name
      ),
    [municipalities]
  );


  const barangayOptions = useMemo(
    () =>
      barangays.map(
        (item) => item.name
      ),
    [barangays]
  );


  // =========================================================
  // SELECTED FULL RECORDS
  // =========================================================

  const selectedProvince =
    province
      ? provinceRecords[
          province
        ] || null
      : null;


  const selectedMunicipality =
    municipality
      ? municipalityRecords[
          municipality
        ] || null
      : null;


  // =========================================================
  // COMPLETENESS
  // =========================================================

  const isComplete = Boolean(
    province &&
    municipality &&
    barangay
  );


  // =========================================================
  // PUBLIC REUSABLE API
  // =========================================================

  return {
    // Selected values
    province,
    municipality,
    barangay,
    postalCode,


    // Dropdown values
    provinceOptions,
    municipalityOptions,
    barangayOptions,


    // Full records
    provinces,
    municipalities,
    barangays,

    selectedProvince,
    selectedMunicipality,


    // Selection handlers
    selectProvince,
    selectMunicipality,
    selectBarangay,


    // Postal
    updatePostalCode,
    postalStatus,


    // State
    loading,
    errors,
    isComplete,


    // Utilities
    resetAddress,

    reloadProvinces:
      loadProvinces,
  };
};


export default usePhilippineAddress;