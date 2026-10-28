import { useCallback, useMemo, useState } from "react";

// ============================================================
// STATIC PHILIPPINE REGIONS / PROVINCES DATA
// ============================================================

export const PHILIPPINE_LOCATIONS = {
  "Nueva Ecija": {
    postalCode: "3100",
    municipalities: {
      "Cabanatuan City": ["San Jose", "San Josef Sur", "Valdefuente", "Magsaysay District", "Zulueta", "Bitas", "Sumacab"],
      "Gapan City": ["San Nicolas", "San Vicente", "Santa Cruz", "Bayanihan", "Malimba"],
      "San Jose City": ["Abar 1st", "Abar 2nd", "Malasin", "Palestina", "Santo Niño 1st"],
      "Palayan City": ["Atate", "Cabaluay", "Imelda Valley", "Malate", "Singalat"],
      "Talavera": ["Maestrang Kikay", "Pag-asa", "Sampaloc", "La Torre", "Burnay"],
      "Guimba": ["Ayeb", "Bacayao", "Cavite", "Manacsac", "San Roque"],
      "Muñoz (Science City)": ["Bantug", "Curva", "Maligaya", "Maragol", "Villa Nati"],
    },
  },
  "Isabela": {
    postalCode: "3300",
    municipalities: {
      "Cauayan City": ["Maligaya", "San Fermin", "Tagaran", "Cabaruan", "District 1"],
      "Santiago City": ["Rizal", "Malvar", "Victory Norte", "Dubinan East", "Plaridel"],
      "Ilagan City": ["Alibagu", "Calamagui 1st", "Guinatan", "Marana 1st", "San Vicente"],
      "Alicia": ["Antonino", "Bagnos", "Burgos", "Mabini", "Rizal"],
      "Roxas": ["Bantug", "Luna", "San Marcos", "Vira"],
    },
  },
  "Tarlac": {
    postalCode: "2300",
    municipalities: {
      "Tarlac City": ["Matatalaib", "San Sebastian", "San Nicolas", "Maliwalo", "Aguso"],
      "Concepcion": ["Poblacion", "San Nicolas", "Alfonso", "Santa Rita", "Magao"],
      "Capas": ["Cutcut 1st", "Cubcub", "O'Donnell", "Santo Rosario", "Cristo Rey"],
      "Paniqui": ["Poblacion Norte", "Poblacion Sur", "Colibao", "Salumague"],
    },
  },
  "Pangasinan": {
    postalCode: "2400",
    municipalities: {
      "Dagupan City": ["Bonuan Gueset", "Lucao", "Pantal", "Poblacion Oeste", "Tapuac"],
      "Urdaneta City": ["Anonas", "Bayaoas", "Camantiles", "Nancayasan", "Pinmaludpod"],
      "San Carlos City": ["Agdao", "Balite", "Ilang", "Mabini", "Rizal"],
      "Rosales": ["Carmen East", "Carmen West", "Poblacion", "Station District"],
    },
  },
  "Pampanga": {
    postalCode: "2000",
    municipalities: {
      "San Fernando City": ["Dolores", "Sindalan", "San Agustin", "San Jose", "Telabastagan"],
      "Angeles City": ["Balibago", "Cutcut", "Malabanias", "Pandan", "Santo Rosario"],
      "Arayat": ["Arenas", "Camba", "Mangumit", "Plazang Luma", "San Agustin Sur"],
      "Magalang": ["San Pedro 1st", "San Nicolas 1st", "Santa Cruz", "Camias"],
    },
  },
  "Bulacan": {
    postalCode: "3000",
    municipalities: {
      "Malolos City": ["Bulihan", "Cofradia", "Dakila", "Mojon", "San Gabriel"],
      "Plaridel": ["Banga 1st", "Banga 2nd", "Poblacion", "Rocka", "Tabang"],
      "San Ildefonso": ["Anyatam", "Basuit", "Garlang", "Pala-Pala", "Sapang Dayap"],
      "San Miguel": ["Bantog", "Camias", "Poblacion", "Salangan", "San Jose"],
    },
  },
  "Iloilo": {
    postalCode: "5000",
    municipalities: {
      "Iloilo City": ["Jaro", "La Paz", "Mandurriao", "Molo", "City Proper"],
      "Pototan": ["Barangay I", "Barangay II", "Cahaguichican", "Poblacion"],
      "Dingle": ["Poblacion", "San Matias", "Sinamay", "Tulatula-an"],
    },
  },
};

export const DEFAULT_PROVINCES = Object.keys(PHILIPPINE_LOCATIONS);

const useFarmAddress = () => {
  const [province, setProvince] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [barangay, setBarangay] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [manualMode, setManualMode] = useState(false);
  const [loading, setLoading] = useState({
    provinces: false,
    municipalities: false,
    barangays: false,
  });
  const [errors, setErrors] = useState({
    provinces: "",
    municipalities: "",
    barangays: "",
  });

  const provinceOptions = useMemo(() => {
    if (province && !DEFAULT_PROVINCES.includes(province)) {
      return [province, ...DEFAULT_PROVINCES];
    }
    return DEFAULT_PROVINCES;
  }, [province]);

  const municipalityOptions = useMemo(() => {
    if (!province) return [];
    const standard = PHILIPPINE_LOCATIONS[province]?.municipalities
      ? Object.keys(PHILIPPINE_LOCATIONS[province].municipalities)
      : [];
    if (municipality && !standard.includes(municipality)) {
      return [municipality, ...standard];
    }
    return standard;
  }, [province, municipality]);

  const barangayOptions = useMemo(() => {
    if (!province || !municipality) return [];
    const standard = PHILIPPINE_LOCATIONS[province]?.municipalities?.[municipality] || [];
    if (barangay && !standard.includes(barangay)) {
      return [barangay, ...standard];
    }
    return standard;
  }, [province, municipality, barangay]);

  const selectProvince = useCallback((selected) => {
    setProvince(selected || "");
    setMunicipality("");
    setBarangay("");
    if (selected && PHILIPPINE_LOCATIONS[selected]) {
      setPostalCode(PHILIPPINE_LOCATIONS[selected].postalCode || "");
    } else {
      setPostalCode("");
    }
  }, []);

  const selectMunicipality = useCallback((selected) => {
    setMunicipality(selected || "");
    setBarangay("");
  }, []);

  const selectBarangay = useCallback((selected) => {
    setBarangay(selected || "");
  }, []);

  const updateManualProvince = useCallback((val) => setProvince(val || ""), []);
  const updateManualMunicipality = useCallback((val) => setMunicipality(val || ""), []);
  const updateManualBarangay = useCallback((val) => setBarangay(val || ""), []);
  const updatePostalCode = useCallback((val) => setPostalCode(val || ""), []);

  const enableManualMode = useCallback(() => setManualMode(true), []);
  const enableDropdownMode = useCallback(() => setManualMode(false), []);

  const setInitialAddress = useCallback(({ province: p = "", municipality: m = "", barangay: b = "", postalCode: pc = "" } = {}) => {
    setProvince(p || "");
    setMunicipality(m || "");
    setBarangay(b || "");
    setPostalCode(pc || "");
    setManualMode(false);
  }, []);

  const resetAddress = useCallback(() => {
    setProvince("");
    setMunicipality("");
    setBarangay("");
    setPostalCode("");
    setManualMode(false);
  }, []);

  const loadProvinces = useCallback(async () => DEFAULT_PROVINCES, []);

  return {
    province,
    municipality,
    barangay,
    postalCode,

    provinceOptions,
    municipalityOptions,
    barangayOptions,

    loading,
    errors,

    manualMode,

    selectProvince,
    selectMunicipality,
    selectBarangay,

    updateManualProvince,
    updateManualMunicipality,
    updateManualBarangay,
    updatePostalCode,

    enableManualMode,
    enableDropdownMode,

    setInitialAddress,
    resetAddress,

    reloadProvinces: loadProvinces,
  };
};

export default useFarmAddress;
