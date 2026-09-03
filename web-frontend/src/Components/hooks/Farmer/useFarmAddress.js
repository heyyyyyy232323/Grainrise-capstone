import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import useApi from "../useApi";


// ============================================================
// HELPERS
// ============================================================

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
    if (!item?.name) {
      return;
    }

    records[item.name] = item;
  });

  return records;
};


// ============================================================
// HOOK
// ============================================================

const useFarmAddress = () => {
  const {
    request,
  } = useApi();


  // =========================================================
  // SELECTED VALUES
  // =========================================================

  const [
    province,
    setProvince,
  ] = useState("");


  const [
    municipality,
    setMunicipality,
  ] = useState("");


  const [
    barangay,
    setBarangay,
  ] = useState("");


  const [
    postalCode,
    setPostalCode,
  ] = useState("");


  // =========================================================
  // LOCATION OPTIONS
  // =========================================================

  const [
    provinces,
    setProvinces,
  ] = useState([]);


  const [
    municipalities,
    setMunicipalities,
  ] = useState([]);


  const [
    barangays,
    setBarangays,
  ] = useState([]);


  // =========================================================
  // RECORD MAPS
  // =========================================================

  const [
    provinceRecords,
    setProvinceRecords,
  ] = useState({});


  const [
    municipalityRecords,
    setMunicipalityRecords,
  ] = useState({});


  // =========================================================
  // MANUAL FALLBACK
  // =========================================================

  const [
    manualMode,
    setManualMode,
  ] = useState(false);


  // =========================================================
  // LOADING
  // =========================================================

  const [
    loading,
    setLoading,
  ] = useState({
    provinces: false,
    municipalities: false,
    barangays: false,
    postalCode: false,
  });


  // =========================================================
  // ERRORS
  // =========================================================

  const [
    errors,
    setErrors,
  ] = useState({
    provinces: "",
    municipalities: "",
    barangays: "",
    postalCode: "",
  });


  // =========================================================
  // REQUEST HELPER
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
    [
      request,
    ]
  );


  // =========================================================
  // LOAD PROVINCES
  // =========================================================

  const loadProvinces = useCallback(
    async () => {
      setLoading(
        (current) => ({
          ...current,
          provinces: true,
        })
      );


      setErrors(
        (current) => ({
          ...current,
          provinces: "",
        })
      );


      try {
        const response =
          await getLocation(
            "/locations/provinces"
          );


        const results =
          sortByName(
            Array.isArray(
              response?.results
            )
              ? response.results
              : []
          );


        setProvinces(
          results
        );


        setProvinceRecords(
          createRecordMap(
            results
          )
        );


        if (
          results.length === 0
        ) {
          setErrors(
            (current) => ({
              ...current,

              provinces:
                "Province list is unavailable. You may enter the address manually.",
            })
          );
        }

      } catch (error) {
        setProvinces(
          []
        );


        setProvinceRecords(
          {}
        );


        setErrors(
          (current) => ({
            ...current,

            provinces:
              error?.message ||
              "Unable to load provinces. You may enter the address manually.",
          })
        );

      } finally {
        setLoading(
          (current) => ({
            ...current,
            provinces: false,
          })
        );
      }
    },
    [
      getLocation,
    ]
  );


  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(
    () => {
      loadProvinces();
    },
    [
      loadProvinces,
    ]
  );


  // =========================================================
  // SELECT PROVINCE
  // =========================================================

  const selectProvince = useCallback(
    async (provinceName) => {
      setProvince(
        provinceName
      );


      setMunicipality(
        ""
      );

      setBarangay(
        ""
      );

      setPostalCode(
        ""
      );


      setMunicipalities(
        []
      );

      setBarangays(
        []
      );

      setMunicipalityRecords(
        {}
      );


      setErrors(
        (current) => ({
          ...current,
          municipalities: "",
          barangays: "",
          postalCode: "",
        })
      );


      if (
        !provinceName
      ) {
        return;
      }


      const selectedProvince =
        provinceRecords[
          provinceName
        ];


      if (
        !selectedProvince?.code
      ) {
        setErrors(
          (current) => ({
            ...current,

            municipalities:
              "Unable to identify this province. You may enter the address manually.",
          })
        );

        return;
      }


      setLoading(
        (current) => ({
          ...current,
          municipalities: true,
        })
      );


      try {
        const response =
          await getLocation(
            (
              "/locations/provinces/" +
              `${encodeURIComponent(
                selectedProvince.code
              )}/cities-municipalities`
            )
          );


        const results =
          sortByName(
            Array.isArray(
              response?.results
            )
              ? response.results
              : []
          );


        setMunicipalities(
          results
        );


        setMunicipalityRecords(
          createRecordMap(
            results
          )
        );


        if (
          results.length === 0
        ) {
          setErrors(
            (current) => ({
              ...current,

              municipalities:
                "No city or municipality data was found. You may enter it manually.",
            })
          );
        }

      } catch (error) {
        setMunicipalities(
          []
        );


        setMunicipalityRecords(
          {}
        );


        setErrors(
          (current) => ({
            ...current,

            municipalities:
              error?.message ||
              "Unable to load cities and municipalities. You may enter it manually.",
          })
        );

      } finally {
        setLoading(
          (current) => ({
            ...current,
            municipalities: false,
          })
        );
      }
    },
    [
      getLocation,
      provinceRecords,
    ]
  );


  // =========================================================
  // LOAD POSTAL CODE
  // =========================================================

  const loadPostalCode = useCallback(
    async (
      municipalityCode,
      existingPostalCode = ""
    ) => {
      if (
        existingPostalCode
      ) {
        setPostalCode(
          String(
            existingPostalCode
          )
        );

        return;
      }


      if (
        !municipalityCode
      ) {
        return;
      }


      setLoading(
        (current) => ({
          ...current,
          postalCode: true,
        })
      );


      try {
        const response =
          await getLocation(
            (
              "/locations/cities-municipalities/" +
              encodeURIComponent(
                municipalityCode
              )
            )
          );


        const value =
          response?.postal_code
            ? String(
              response.postal_code
            )
            : "";


        setPostalCode(
          value
        );


        if (
          !value
        ) {
          setErrors(
            (current) => ({
              ...current,

              postalCode:
                "Postal code was not found automatically. You may enter it manually.",
            })
          );
        }

      } catch (error) {
        setPostalCode(
          ""
        );


        setErrors(
          (current) => ({
            ...current,

            postalCode:
              error?.message ||
              "Postal code could not be loaded. You may enter it manually.",
          })
        );

      } finally {
        setLoading(
          (current) => ({
            ...current,
            postalCode: false,
          })
        );
      }
    },
    [
      getLocation,
    ]
  );


  // =========================================================
  // SELECT MUNICIPALITY
  // =========================================================

  const selectMunicipality = useCallback(
    async (municipalityName) => {
      setMunicipality(
        municipalityName
      );


      setBarangay(
        ""
      );

      setPostalCode(
        ""
      );


      setBarangays(
        []
      );


      setErrors(
        (current) => ({
          ...current,
          barangays: "",
          postalCode: "",
        })
      );


      if (
        !municipalityName
      ) {
        return;
      }


      const selectedMunicipality =
        municipalityRecords[
          municipalityName
        ];


      if (
        !selectedMunicipality?.code
      ) {
        setErrors(
          (current) => ({
            ...current,

            barangays:
              "Unable to identify this city or municipality. You may enter the remaining address manually.",
          })
        );

        return;
      }


      const postalFromRecord =
        selectedMunicipality
          .postal_code ||
        selectedMunicipality
          .zip_code ||
        selectedMunicipality
          .zipCode ||
        "";


      loadPostalCode(
        selectedMunicipality.code,
        postalFromRecord
      );


      setLoading(
        (current) => ({
          ...current,
          barangays: true,
        })
      );


      try {
        const response =
          await getLocation(
            (
              "/locations/cities-municipalities/" +
              `${encodeURIComponent(
                selectedMunicipality.code
              )}/barangays`
            )
          );


        const results =
          sortByName(
            Array.isArray(
              response?.results
            )
              ? response.results
              : []
          );


        setBarangays(
          results
        );


        if (
          results.length === 0
        ) {
          setErrors(
            (current) => ({
              ...current,

              barangays:
                "No barangay data was found. You may enter the barangay manually.",
            })
          );
        }

      } catch (error) {
        setBarangays(
          []
        );


        setErrors(
          (current) => ({
            ...current,

            barangays:
              error?.message ||
              "Unable to load barangays. You may enter the barangay manually.",
          })
        );

      } finally {
        setLoading(
          (current) => ({
            ...current,
            barangays: false,
          })
        );
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


      setErrors(
        (current) => ({
          ...current,
          barangays: "",
        })
      );
    },
    []
  );


  // =========================================================
  // POSTAL CODE — ALWAYS EDITABLE
  // =========================================================

  const updatePostalCode = useCallback(
    (value) => {
      const cleaned =
        String(
          value || ""
        )
          .replace(
            /\D/g,
            ""
          )
          .slice(
            0,
            4
          );


      setPostalCode(
        cleaned
      );


      setErrors(
        (current) => ({
          ...current,
          postalCode: "",
        })
      );
    },
    []
  );


  // =========================================================
  // MANUAL ADDRESS
  // =========================================================

  const updateManualProvince =
    useCallback(
      (value) => {
        setProvince(
          value
        );
      },
      []
    );


  const updateManualMunicipality =
    useCallback(
      (value) => {
        setMunicipality(
          value
        );
      },
      []
    );


  const updateManualBarangay =
    useCallback(
      (value) => {
        setBarangay(
          value
        );
      },
      []
    );


  // =========================================================
  // MANUAL MODE
  // =========================================================

  const enableManualMode =
    useCallback(
      () => {
        setManualMode(
          true
        );
      },
      []
    );


  const enableDropdownMode =
    useCallback(
      () => {
        setManualMode(
          false
        );


        setProvince(
          ""
        );

        setMunicipality(
          ""
        );

        setBarangay(
          ""
        );

        setPostalCode(
          ""
        );


        setMunicipalities(
          []
        );

        setBarangays(
          []
        );


        setMunicipalityRecords(
          {}
        );


        setErrors({
          provinces: "",
          municipalities: "",
          barangays: "",
          postalCode: "",
        });


        if (
          provinces.length ===
          0
        ) {
          loadProvinces();
        }
      },
      [
        loadProvinces,
        provinces.length,
      ]
    );


  // =========================================================
  // SET INITIAL ADDRESS — EDIT FARM
  // =========================================================

  const setInitialAddress =
    useCallback(
      ({
        province:
          initialProvince = "",

        municipality:
          initialMunicipality = "",

        barangay:
          initialBarangay = "",

        postalCode:
          initialPostalCode = "",
      } = {}) => {
        setProvince(
          initialProvince
        );


        setMunicipality(
          initialMunicipality
        );


        setBarangay(
          initialBarangay
        );


        setPostalCode(
          String(
            initialPostalCode || ""
          )
        );


        /*
         * Existing farm addresses may no longer
         * perfectly match the external location API.
         *
         * Manual mode guarantees the farmer can still
         * edit and save the registered address.
         */
        setManualMode(
          true
        );
      },
      []
    );


  // =========================================================
  // RESET
  // =========================================================

  const resetAddress =
    useCallback(
      () => {
        setProvince(
          ""
        );

        setMunicipality(
          ""
        );

        setBarangay(
          ""
        );

        setPostalCode(
          ""
        );


        setMunicipalities(
          []
        );

        setBarangays(
          []
        );


        setMunicipalityRecords(
          {}
        );


        setManualMode(
          false
        );


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
  // OPTIONS
  // =========================================================

  const provinceOptions =
    useMemo(
      () =>
        provinces.map(
          (item) =>
            item.name
        ),
      [
        provinces,
      ]
    );


  const municipalityOptions =
    useMemo(
      () =>
        municipalities.map(
          (item) =>
            item.name
        ),
      [
        municipalities,
      ]
    );


  const barangayOptions =
    useMemo(
      () =>
        barangays.map(
          (item) =>
            item.name
        ),
      [
        barangays,
      ]
    );


  // =========================================================
  // RETURN
  // =========================================================

  return {
    // values
    province,
    municipality,
    barangay,
    postalCode,

    // options
    provinceOptions,
    municipalityOptions,
    barangayOptions,

    // loading / errors
    loading,
    errors,

    // mode
    manualMode,

    // dependent dropdowns
    selectProvince,
    selectMunicipality,
    selectBarangay,

    // manual fallback
    updateManualProvince,
    updateManualMunicipality,
    updateManualBarangay,
    updatePostalCode,

    enableManualMode,
    enableDropdownMode,

    // edit/reset
    setInitialAddress,
    resetAddress,

    // retry
    reloadProvinces:
      loadProvinces,
  };
};


export default useFarmAddress;