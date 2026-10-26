import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Maximize2,
  Minimize2,
  MessageSquare,
  CheckCircle,
  Package,
  Store,
  Warehouse,
  Calendar,
  CreditCard,
  ShieldAlert,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Phone,
  LocateFixed,
  Camera,
  ChevronRight,
  X,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import DriverExitTrackingModal from "../../../Components/Modals/MillerDriver/DriverExitTrackingModal";
import DriverProofOfDeliveryModal from "../../../Components/Modals/MillerDriver/DriverProofOfDeliveryModal";
import DriverCODPaymentModal from "../../../Components/Modals/MillerDriver/DriverCODPaymentModal";
import DriverPOSReceiptModal from "../../../Components/Modals/MillerDriver/DriverPOSReceiptModal";
import DriverDeliverySuccessModal from "../../../Components/Modals/MillerDriver/DriverDeliverySuccessModal";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://127.0.0.1:8000" : "")
).replace(/\/$/, "");

export default function MillerDriverLiveTracking() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const buyerGroupKey = searchParams.get("group") || "";

  // Data State
  const [buyerGroup, setBuyerGroup] = useState(null);
  const [driverInfo, setDriverInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  // GPS Tracking State
  const [currentCoords, setCurrentCoords] = useState(null);
  const [gpsError, setGpsError] = useState("");
  const [isGpsActive, setIsGpsActive] = useState(false);
  const watchIdRef = useRef(null);
  const lastPingTimeRef = useRef(0);

  // Leaflet Map & Interactive Navigation State
  const leafletContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const [routeStats, setRouteStats] = useState({
    distanceKm: null,
    durationMinutes: null,
    etaTimeFormatted: null,
    isLoading: true,
  });
  const lastRouteCalcRef = useRef({ lat: 0, lng: 0, time: 0 });
  const routeEndpointsRef = useRef({ start: null, end: null });

  // Fullscreen Map State
  const [isFullScreen, setIsFullScreen] = useState(false);
  const mapContainerRef = useRef(null);

  // Modals State
  const [showExitModal, setShowExitModal] = useState(false);
  const [pendingNavigationPath, setPendingNavigationPath] = useState(null);
  const [isExiting, setIsExiting] = useState(false);

  const [showPodModal, setShowPodModal] = useState(false);
  const [showCodModal, setShowCodModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [pendingCodPayload, setPendingCodPayload] = useState(null);
  const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);

  const [capturedPodPhoto, setCapturedPodPhoto] = useState(null);
  const [activeTargetOrder, setActiveTargetOrder] = useState(null);
  const [showOrderSelectModal, setShowOrderSelectModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState({
    title: "Order Delivered Successfully",
    message: "Proof of delivery has been saved to your assignment.",
    buttonLabel: "Continue Delivery",
    action: null,
  });
  const [hasRemainingDeliveries, setHasRemainingDeliveries] = useState(true);

  // Auth token helper
  const getAuthToken = () => {
    return (
      localStorage.getItem("grainrise_token") ||
      sessionStorage.getItem("grainrise_token") ||
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      ""
    );
  };

  // 1. Fetch Buyer Group Details
  const fetchBuyerGroup = useCallback(async () => {
    if (!buyerGroupKey) {
      setFetchError("No buyer group specified.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setFetchError("");
    try {
      const token = getAuthToken();
      const res = await fetch(
        `${API_BASE}/api/miller-employees/driver/live-tracking/group/?buyer_group_key=${encodeURIComponent(buyerGroupKey)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load buyer delivery group.");
      }
      setBuyerGroup(data.buyer_group);
      if (data.driver_info) {
        setDriverInfo(data.driver_info);
      }
    } catch (err) {
      setFetchError(err.message || "Failed to connect to server.");
    } finally {
      setIsLoading(false);
    }
  }, [buyerGroupKey]);

  useEffect(() => {
    fetchBuyerGroup();
  }, [fetchBuyerGroup]);

  // 2. Continuous GPS Tracking via watchPosition
  const sendPingToServer = useCallback(
    async (lat, lng) => {
      if (!buyerGroup || !buyerGroup.orders?.length) return;
      const assignmentIds = buyerGroup.orders.map((o) => o.assignment_id);
      const token = getAuthToken();

      try {
        await fetch(`${API_BASE}/api/miller-employees/driver/live-tracking/ping/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assignment_ids: assignmentIds,
            latitude: lat,
            longitude: lng,
          }),
        });
      } catch {
        // Silently tolerate temporary ping network drop
      }
    },
    [buyerGroup]
  );

  const startGpsStream = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("GPS tracking is not supported on this browser.");
      return;
    }

    setGpsError("");
    setIsGpsActive(true);

    // 1. Immediate GPS fix
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentCoords({ latitude, longitude });
        setGpsError("");
        sendPingToServer(latitude, longitude);
      },
      (err) => {
        console.warn("Initial GPS acquisition notice:", err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    // 2. Continuous watchPosition
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentCoords({ latitude, longitude });
        setGpsError("");

        // Throttle server pings to every 10 seconds
        const now = Date.now();
        if (now - lastPingTimeRef.current >= 10000) {
          lastPingTimeRef.current = now;
          sendPingToServer(latitude, longitude);
        }
      },
      (err) => {
        setGpsError(err.message || "Unable to acquire real-time GPS location.");
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 1000,
      }
    );

    watchIdRef.current = watchId;
  }, [sendPingToServer]);

  const stopGpsStream = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsGpsActive(false);
  }, []);

  useEffect(() => {
    if (buyerGroup) {
      startGpsStream();
    }
    return () => {
      stopGpsStream();
    };
  }, [buyerGroup, startGpsStream, stopGpsStream]);

  // Handle browser close or refresh (keepalive exit ping)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!buyerGroup || !buyerGroup.orders?.length) return;
      const assignmentIds = buyerGroup.orders.map((o) => o.assignment_id);
      const token = getAuthToken();
      const payload = JSON.stringify({
        assignment_ids: assignmentIds,
        latitude: currentCoords?.latitude ?? null,
        longitude: currentCoords?.longitude ?? null,
      });

      fetch(`${API_BASE}/api/miller-employees/driver/live-tracking/exit/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: payload,
        keepalive: true,
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [buyerGroup, currentCoords]);

  // Helper to resolve coordinates from delivery address using real geocoding
  const resolveDestinationCoords = useCallback(async (address) => {
    // 1. Try real OpenStreetMap Nominatim Geocoding with raw full address
    if (address && address.trim()) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ph&q=${encodeURIComponent(address)}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0 && data[0].lat && data[0].lon) {
            return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
          }
        }
      } catch {
        // Fallback to secondary search
      }

      try {
        const cleanQuery = address.replace(/Metro Manila \(NCR\)/gi, "Metro Manila").trim();
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ph&q=${encodeURIComponent(cleanQuery)}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0 && data[0].lat && data[0].lon) {
            return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
          }
        }
      } catch {
        // Fallback to table below
      }
    }

    // 2. High-precision fallback coordinates for local addresses
    const lower = (address || "").toLowerCase();
    if (lower.includes("mba compound") || lower.includes("bagumbong")) {
      return [14.7613, 121.0278]; // MBA Compound / Street, Bagumbong, Caloocan
    }
    if (lower.includes("173") || lower.includes("caloocan")) {
      return [14.7613, 121.0278]; // Caloocan delivery area
    }
    if (lower.includes("macarthur") || lower.includes("biñang") || lower.includes("bocaue") || lower.includes("bulacan")) {
      return [14.7984, 120.9280]; // 245 MacArthur Highway, Biñang 1st, Bocaue, Bulacan
    }
    if (lower.includes("sampaloc") || lower.includes("manila")) {
      return [14.6091, 120.9898]; // Sampaloc, Manila
    }
    if (lower.includes("quezon city")) {
      return [14.6760, 121.0437]; // Quezon City
    }
    return [14.7984, 120.9280];
  }, []);

  // Calculate Haversine distance in km between two GPS coordinates
  const calculateHaversineDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Fetch real road route geometry from OSRM and compute real distance & ETA
  const fetchAndDrawRoute = useCallback(async (map, driverLat, driverLng, destLat, destLng) => {
    if (!map) return;

    // Routing endpoints to try in order (OSM Germany Routed-Car, then OSRM public)
    const endpoints = [
      `https://routing.openstreetmap.de/routed-car/route/v1/driving/${driverLng},${driverLat};${destLng},${destLat}?overview=full&geometries=geojson`,
      `https://router.project-osrm.org/route/v1/driving/${driverLng},${driverLat};${destLng},${destLat}?overview=full&geometries=geojson`,
    ];

    let routeData = null;

    for (const url of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (data && data.code === "Ok" && data.routes && data.routes.length > 0) {
            routeData = data.routes[0];
            break;
          }
        }
      } catch {
        // Continue to next endpoint
      }
    }

    if (routeData) {
      const distKm = (routeData.distance / 1000).toFixed(1);
      const durMin = Math.max(1, Math.round(routeData.duration / 60));
      const arrivalDate = new Date(Date.now() + routeData.duration * 1000);
      const arrivalTime = arrivalDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

      setRouteStats({
        distanceKm: distKm,
        durationMinutes: durMin,
        etaTimeFormatted: `${arrivalTime} (${durMin} mins)`,
        isLoading: false,
      });

      if (routeLayerRef.current && map) {
        map.removeLayer(routeLayerRef.current);
      }

      const geojsonLayer = L.geoJSON(routeData.geometry, {
        style: {
          color: "#0B5D1E",
          weight: 6,
          opacity: 0.92,
          lineCap: "round",
          lineJoin: "round",
        },
      }).addTo(map);
      routeLayerRef.current = geojsonLayer;
      routeEndpointsRef.current = { start: [driverLat, driverLng], end: [destLat, destLng] };

      if (destMarkerRef.current) {
        destMarkerRef.current.setLatLng([destLat, destLng]);
      }
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng([driverLat, driverLng]);
      }

      map.fitBounds(geojsonLayer.getBounds(), { padding: [65, 65], maxZoom: 16 });
      return;
    }

    // Fallback: If online routing services are offline or rate-limited,
    // compute accurate driving distance estimation using Haversine with road winding factor
    const directKm = calculateHaversineDistanceKm(driverLat, driverLng, destLat, destLng);
    const estimatedRoadKm = (directKm * 1.3).toFixed(1); // 1.3 typical road factor
    const durMin = Math.max(1, Math.round((parseFloat(estimatedRoadKm) / 32) * 60)); // 32 km/h city average
    const arrivalDate = new Date(Date.now() + durMin * 60 * 1000);
    const arrivalTime = arrivalDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

    setRouteStats({
      distanceKm: estimatedRoadKm,
      durationMinutes: durMin,
      etaTimeFormatted: `${arrivalTime} (${durMin} mins)`,
      isLoading: false,
    });

    if (routeLayerRef.current && map) {
      map.removeLayer(routeLayerRef.current);
    }

    const directPolyline = L.polyline([[driverLat, driverLng], [destLat, destLng]], {
      color: "#0B5D1E",
      weight: 5,
      opacity: 0.85,
      dashArray: "8, 8",
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);
    routeLayerRef.current = directPolyline;
    routeEndpointsRef.current = { start: [driverLat, driverLng], end: [destLat, destLng] };

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([driverLat, driverLng]);
    }
    if (destMarkerRef.current) {
      destMarkerRef.current.setLatLng([destLat, destLng]);
    }

    map.fitBounds(directPolyline.getBounds(), { padding: [65, 65] });
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!buyerGroup || !leafletContainerRef.current) return;

    let isMounted = true;

    async function initMap() {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const destCoords = await resolveDestinationCoords(buyerGroup.delivery_address);
      if (!isMounted || !leafletContainerRef.current) return;

      const initialStart = currentCoords
        ? [currentCoords.latitude, currentCoords.longitude]
        : destCoords;
      const initialDest = destCoords;

      const map = L.map(leafletContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView(initialStart, 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      L.control.attribution({ position: "bottomright", prefix: false })
        .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>')
        .addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Driver Marker Icon (Centered exact anchor [18, 18], stable without animation)
      const driverIcon = L.divIcon({
        className: "driver-marker-container",
        html: `
          <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
            <div style="position: relative; width: 32px; height: 32px; border-radius: 9999px; background: #0B5D1E; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white; transform: rotate(45deg); z-index: 10;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const dMarker = L.marker(initialStart, { icon: driverIcon }).addTo(map);
      dMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
          <b style="color: #0B5D1E;">Driver Vehicle (Live Location)</b><br/>
          <span>${initialStart[0].toFixed(5)}, ${initialStart[1].toFixed(5)}</span>
        </div>
      `);
      driverMarkerRef.current = dMarker;

      // Destination Pin with Pointed Needle Tip (Bottom needle tip anchor [16, 40])
      const destIcon = L.divIcon({
        className: "dest-marker-container",
        html: `
          <div style="width: 32px; height: 42px; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));">
            <div style="width: 32px; height: 32px; border-radius: 9999px; background: #E11D48; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </div>
            <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 10px solid #E11D48; margin-top: -2px;"></div>
          </div>
        `,
        iconSize: [32, 42],
        iconAnchor: [16, 40],
      });

      const dstMarker = L.marker(initialDest, { icon: destIcon }).addTo(map);
      dstMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
          <b style="color: #1E293B;">${buyerGroup.customer_name}</b> (${buyerGroup.customer_type})<br/>
          <span style="color: #64748B;">${buyerGroup.delivery_address || "Delivery Address"}</span>
        </div>
      `);
      destMarkerRef.current = dstMarker;

      mapInstanceRef.current = map;
      routeEndpointsRef.current = { start: initialStart, end: destCoords };

      // Calculate real road route & ETA
      lastRouteCalcRef.current = { lat: initialStart[0], lng: initialStart[1], time: Date.now() };
      fetchAndDrawRoute(map, initialStart[0], initialStart[1], destCoords[0], destCoords[1]);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [buyerGroup, resolveDestinationCoords, fetchAndDrawRoute]);

  // Update driver marker & route when live GPS coords update
  useEffect(() => {
    if (!mapInstanceRef.current || !driverMarkerRef.current || !currentCoords) return;

    const newPos = [currentCoords.latitude, currentCoords.longitude];
    driverMarkerRef.current.setLatLng(newPos);
    driverMarkerRef.current.setPopupContent(`
      <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
        <b style="color: #0B5D1E;">Driver Vehicle (Live Location)</b><br/>
        <span>${newPos[0].toFixed(5)}, ${newPos[1].toFixed(5)}</span>
      </div>
    `);

    const endPt = routeEndpointsRef.current?.end;
    if (endPt) {
      const last = lastRouteCalcRef.current;
      const now = Date.now();
      const distFromLast = calculateHaversineDistanceKm(newPos[0], newPos[1], last.lat, last.lng) * 1000;
      if ((distFromLast >= 40 && now - last.time >= 12000) || last.time === 0) {
        lastRouteCalcRef.current = { lat: newPos[0], lng: newPos[1], time: now };
        fetchAndDrawRoute(mapInstanceRef.current, newPos[0], newPos[1], endPt[0], endPt[1]);
      }
    }
  }, [currentCoords, fetchAndDrawRoute]);

  // Recenter map on route
  const handleRecenterRoute = () => {
    if (!mapInstanceRef.current) return;
    if (routeLayerRef.current) {
      mapInstanceRef.current.fitBounds(routeLayerRef.current.getBounds(), { padding: [60, 60] });
    } else if (driverMarkerRef.current && destMarkerRef.current) {
      const group = L.featureGroup([driverMarkerRef.current, destMarkerRef.current]);
      mapInstanceRef.current.fitBounds(group.getBounds(), { padding: [60, 60] });
    }
  };

  // Fullscreen Map toggle
  const toggleFullScreen = () => {
    if (!mapContainerRef.current) return;
    if (!document.fullscreenElement) {
      mapContainerRef.current.requestFullscreen?.().then(() => {
        setIsFullScreen(true);
        setTimeout(() => mapInstanceRef.current?.invalidateSize(), 200);
      }).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => {
        setIsFullScreen(false);
        setTimeout(() => mapInstanceRef.current?.invalidateSize(), 200);
      }).catch(() => {});
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 200);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Lock body scroll whenever any live tracking modal is open
  useEffect(() => {
    const isAnyModalOpen =
      showOrderSelectModal ||
      showExitModal ||
      showPodModal ||
      showCodModal ||
      showSuccessModal ||
      showReceiptModal;
    if (isAnyModalOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [
    showOrderSelectModal,
    showExitModal,
    showPodModal,
    showCodModal,
    showSuccessModal,
    showReceiptModal,
  ]);

  // 3. Navigation Protection (Sidebar, Back, Messages)
  const handleRequestExit = (targetPath = "/miller-driver/my-duties") => {
    setPendingNavigationPath(targetPath);
    setShowExitModal(true);
  };

  const handleConfirmExit = async () => {
    setIsExiting(true);
    stopGpsStream();

    if (buyerGroup && buyerGroup.orders?.length) {
      const assignmentIds = buyerGroup.orders.map((o) => o.assignment_id);
      const token = getAuthToken();
      try {
        await fetch(`${API_BASE}/api/miller-employees/driver/live-tracking/exit/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assignment_ids: assignmentIds,
            latitude: currentCoords?.latitude ?? null,
            longitude: currentCoords?.longitude ?? null,
          }),
        });
      } catch {
        // tolerate exit network error
      }
    }

    setIsExiting(false);
    setShowExitModal(false);
    navigate(pendingNavigationPath || "/miller-driver/my-duties");
  };

  // 4. Mark as Delivered Flow
  const orders = buyerGroup?.orders || [];
  const codOrders = orders.filter((o) => o.payment_method === "Cash on Delivery");
  const isRetailerBuyer = buyerGroup?.customer_type === "Retailer";
  const hasCodCollection = codOrders.length > 0 && isRetailerBuyer;
  const totalCodAmount = codOrders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
  const prepaidOrders = orders.filter((o) => o.payment_method !== "Cash on Delivery");
  const hasPrepaidOrders = prepaidOrders.length > 0;
  const allOrdersDelivered = orders.length > 0 && orders.every((o) => o.order_status === "Delivered");

  // Single Order Delivery Action (from order card)
  const handleStartSingleOrderDelivery = (ord) => {
    setActiveTargetOrder(ord);
    if (ord.payment_method === "Cash on Delivery" && isRetailerBuyer) {
      setShowCodModal(true);
    } else {
      setShowPodModal(true);
    }
  };

  // Group Bottom Button Action
  const handleStartDeliveryCompletion = () => {
    setActiveTargetOrder(null);
    const pendingOrders = orders.filter((o) => o.order_status !== "Delivered");
    const pendingCod = pendingOrders.filter((o) => o.payment_method === "Cash on Delivery" && isRetailerBuyer);
    const pendingPrepaid = pendingOrders.filter((o) => o.payment_method !== "Cash on Delivery" || !isRetailerBuyer);

    if (pendingCod.length > 0 && pendingPrepaid.length > 0) {
      setShowOrderSelectModal(true);
    } else if (pendingCod.length > 0) {
      setShowCodModal(true);
    } else {
      setShowPodModal(true);
    }
  };

  // Flow A: Proof of Delivery Saved (Prepaid or Warehouse)
  const handleSaveProofOfDelivery = async (capturedPhoto) => {
    // If completing all mixed orders together:
    if (!activeTargetOrder && hasCodCollection && hasPrepaidOrders) {
      setCapturedPodPhoto(capturedPhoto);
      setShowPodModal(false);
      setShowCodModal(true);
      return;
    }

    setIsSubmittingDelivery(true);
    try {
      const token = getAuthToken();
      const payload = {
        buyer_group_key: buyerGroupKey,
        proof_of_delivery: capturedPhoto,
        cod_data: null,
      };
      if (activeTargetOrder) {
        payload.order_id = activeTargetOrder.online_order_id;
      }

      const res = await fetch(`${API_BASE}/api/miller-employees/driver/delivery/complete/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to finalize delivery.");
      }

      setShowPodModal(false);

      // ALWAYS update buyerGroup.orders so delivered orders have order_status = 'Delivered'
      setBuyerGroup((prev) => {
        if (!prev) return prev;
        const updated = (prev.orders || []).map((o) =>
          data.order_ids.includes(o.online_order_id) ? { ...o, order_status: "Delivered" } : o
        );
        return { ...prev, orders: updated };
      });

      setHasRemainingDeliveries(Boolean(data.has_remaining_orders));

      if (data.has_remaining_orders) {
        setSuccessModalData({
          title: "Prepaid Order Delivered",
          message: "Proof of delivery has been saved to your assignment. You can now deliver the remaining order(s) for this customer.",
          buttonLabel: "Continue Delivery",
          action: () => setShowSuccessModal(false),
        });
        setShowSuccessModal(true);
      } else {
        stopGpsStream();
        setSuccessModalData({
          title: "All Deliveries Completed",
          message: "All assigned orders for this customer have been successfully delivered.",
          buttonLabel: "Return to My Duties",
          action: () => {
            setShowSuccessModal(false);
            navigate("/miller-driver/my-duties");
          },
        });
        setShowSuccessModal(true);
      }
    } catch (err) {
      alert(err.message || "Failed to mark delivery as delivered.");
    } finally {
      setIsSubmittingDelivery(false);
      setActiveTargetOrder(null);
    }
  };

  // Flow B: COD Paid -> Complete Delivery & Show Official POS Receipt
  const handleProceedToReceipt = async (codInfo) => {
    setIsSubmittingDelivery(true);
    const txDate = new Date();
    const companyName = driverInfo?.business_name || "GrainRise Milling Company";
    const driverFullName = driverInfo
      ? `${driverInfo.first_name || ""} ${driverInfo.last_name || ""}`.trim() || "Assigned Driver"
      : "Assigned Driver";
    const buyerName = buyerGroup?.customer_name || "Valued Customer";

    // Format: First Two Words of Milling Company Name + Driver Initials + Payment Date (MMDDYYYY) + Payment Time (HHMM) + Buyer Initials
    const cleanComp = companyName.replace(/[^a-zA-Z\s]/g, " ").trim();
    const words = cleanComp.split(/\s+/).filter(Boolean);
    let compPart = "GRAINRISE";
    if (words.length >= 2) {
      compPart = (words[0] + words[1]).toUpperCase();
    } else if (words.length === 1) {
      compPart = (words[0] + "MIL").toUpperCase();
    }

    const dParts = driverFullName.split(/\s+/).filter(Boolean);
    const dFirst = dParts[0]?.charAt(0).toUpperCase() || "D";
    const dLast = dParts.length > 1 ? dParts[dParts.length - 1].charAt(0).toUpperCase() : "";
    const driverInitials = `${dFirst}${dLast}` || "DR";

    const mm = String(txDate.getMonth() + 1).padStart(2, "0");
    const dd = String(txDate.getDate()).padStart(2, "0");
    const yyyy = String(txDate.getFullYear());
    const hh = String(txDate.getHours()).padStart(2, "0");
    const min = String(txDate.getMinutes()).padStart(2, "0");
    const dateStr = `${mm}${dd}${yyyy}`;
    const timeStr = `${hh}${min}`;

    const bParts = buyerName.split(/\s+/).filter(Boolean);
    const bFirst = bParts[0]?.charAt(0).toUpperCase() || "B";
    const bLast = bParts.length > 1 ? bParts[bParts.length - 1].charAt(0).toUpperCase() : "";
    const buyerInitials = `${bFirst}${bLast}` || "BY";

    const generatedRefNo = `${compPart}${driverInitials}${dateStr}${timeStr}${buyerInitials}`;

    const fullCodPayload = {
      ...codInfo,
      payment_reference_no: generatedRefNo,
    };

    const targetOrdersForCod = activeTargetOrder ? [activeTargetOrder] : codOrders;

    try {
      const token = getAuthToken();
      const payload = {
        buyer_group_key: buyerGroupKey,
        proof_of_delivery: capturedPodPhoto || null,
        cod_data: fullCodPayload,
      };
      if (activeTargetOrder) {
        payload.order_id = activeTargetOrder.online_order_id;
      }

      const res = await fetch(`${API_BASE}/api/miller-employees/driver/delivery/complete/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to finalize COD delivery.");
      }

      setShowCodModal(false);

      const finalRefNo = data.payment_reference_no || generatedRefNo;

      // Prepare POS Receipt Data
      setReceiptData({
        business_name: companyName,
        reference_no: finalRefNo,
        transaction_date_formatted: txDate.toLocaleString("en-US", {
          month: "numeric",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
        driver_name: driverFullName,
        customer_name: buyerName,
        payment_method: codInfo.payment_method,
        external_payment_reference_no: codInfo.external_payment_reference_no,
        receipt_photo: codInfo.receipt_photo,
        items: targetOrdersForCod,
        total_amount: codInfo.total_amount_due,
        amount_paid: codInfo.amount_paid,
        change_amount: codInfo.change_amount,
      });

      // ALWAYS update buyerGroup.orders so delivered orders have order_status = 'Delivered'
      setBuyerGroup((prev) => {
        if (!prev) return prev;
        const updated = (prev.orders || []).map((o) =>
          data.order_ids.includes(o.online_order_id) ? { ...o, order_status: "Delivered" } : o
        );
        return { ...prev, orders: updated };
      });

      setHasRemainingDeliveries(Boolean(data.has_remaining_orders));

      if (!data.has_remaining_orders) {
        stopGpsStream();
      }

      setShowReceiptModal(true);
    } catch (err) {
      alert(err.message || "Failed to complete delivery.");
    } finally {
      setIsSubmittingDelivery(false);
      setActiveTargetOrder(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Loader2 className="animate-spin text-[#0B5D1E]" size={36} />
        <p className="text-sm font-semibold text-gray-600">Loading Live Tracking session...</p>
      </div>
    );
  }

  if (fetchError || !buyerGroup) {
    return (
      <div className="p-8 max-w-lg mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm text-center space-y-4">
        <AlertTriangle size={36} className="text-amber-500 mx-auto" />
        <h3 className="text-lg font-bold text-gray-900">Unable to Start Live Tracking</h3>
        <p className="text-xs text-gray-600">{fetchError || "Delivery group not found or no longer active."}</p>
        <button
          type="button"
          onClick={() => navigate("/miller-driver/my-duties")}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0B5D1E] hover:bg-emerald-800 transition-colors"
        >
          Return to My Duties
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Top Bar: Back & Title ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Breadcrumbs
            items={[
              { label: "Operations" },
              { label: "My Duties", onClick: () => handleRequestExit("/miller-driver/my-duties") },
              { label: "Live Tracking" },
            ]}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleRequestExit("/miller-driver/my-duties")}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Exit Live Tracking"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-[clamp(1.5rem,2.2vw,2rem)] font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Live Delivery Tracking
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                Live GPS
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Delivering to <b className="text-gray-800">{buyerGroup.customer_name}</b> ({buyerGroup.customer_type})
          </p>
        </div>

        {/* GPS Live Status Badge */}
        <div className="flex items-center gap-2">
          {gpsError ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800">
              <AlertTriangle size={15} className="text-amber-600" />
              <span>GPS issue: {gpsError}</span>
            </div>
          ) : currentCoords ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
              <Navigation size={15} className="text-emerald-600" />
              <span>
                Coordinates: {currentCoords.latitude.toFixed(5)}, {currentCoords.longitude.toFixed(5)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-500">
              <Loader2 size={14} className="animate-spin text-gray-400" />
              <span>Acquiring coordinates...</span>
            </div>
          )}
        </div>
      </div>

      {/* ── MAP SECTION (Interactive OpenStreetMap Canvas via Leaflet) ──────── */}
      <div
        ref={mapContainerRef}
        className={`relative w-full rounded-2xl border border-slate-200 bg-slate-100 overflow-hidden shadow-lg transition-all select-none ${
          isFullScreen ? "h-screen rounded-none border-0" : "h-[450px] sm:h-[500px]"
        }`}
      >
        {/* Real Leaflet Map DOM Node */}
        <div ref={leafletContainerRef} className="w-full h-full z-0" />

        {/* ── Floating Dispatch HUD (Docked at Bottom-Left of Map) ─────────── */}
        <div className="absolute bottom-4 left-4 z-10 max-w-xs sm:max-w-sm w-full pointer-events-none">
          <div className="p-3.5 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl space-y-2.5 text-slate-900 pointer-events-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                  Active Dispatch Transit
                </span>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700">
                {orders.length} {orders.length === 1 ? "Assigned Order" : "Assigned Orders"}
              </span>
            </div>

            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-900 truncate">
                {buyerGroup.customer_name}
              </h4>
              <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                <MapPin size={11} className="text-rose-500 shrink-0" />
                <span className="truncate">{buyerGroup.delivery_address || "Designated Delivery Destination"}</span>
              </p>
            </div>

            {/* Live Real ETA & Driving Distance Display */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100/90 border border-emerald-300 text-emerald-900 font-extrabold text-[11px] flex items-center gap-1 shadow-xs">
                  <Navigation size={12} className="text-emerald-700 shrink-0" />
                  <span>ETA: {routeStats.isLoading ? "Calculating..." : routeStats.etaTimeFormatted}</span>
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-600">
                {routeStats.distanceKm ? `${routeStats.distanceKm} km` : ""}
              </span>
            </div>
          </div>
        </div>

        {/* ── Floating Map Controls (Top-Right) ──────────────────────────────── */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={handleRecenterRoute}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/95 hover:bg-white text-slate-800 backdrop-blur-md border border-slate-200 shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Recenter Map on Delivery Route"
          >
            <LocateFixed size={15} className="text-emerald-700" />
            <span className="hidden sm:inline">Recenter Route</span>
          </button>
          <button
            type="button"
            onClick={toggleFullScreen}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/95 hover:bg-white text-slate-800 backdrop-blur-md border border-slate-200 shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Toggle Fullscreen Map View"
          >
            {isFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            <span>{isFullScreen ? "Exit Fullscreen" : "Fullscreen Map"}</span>
          </button>
        </div>
      </div>

      {/* ── ONLINE ORDERS INFORMATION CARDS ─────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Package size={18} className="text-[#0B5D1E]" />
              Assigned Order Cards ({orders.length})
            </h3>
            <p className="text-xs text-slate-500">
              Orders being delivered to this destination in the current active dispatch.
            </p>
          </div>
          {hasCodCollection && (
            <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                Total Payable (COD):
              </span>
              <span className="text-base font-black text-amber-900">
                ₱{totalCodAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        {/* Cards Grid following GrainRise Driver Card styling */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((ord) => {
            const isReplacement = ord.is_replacement;
            const displayQty = ord.display_quantity || ord.ordered_quantity;

            return (
              <div
                key={ord.online_order_id}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col justify-between hover:border-emerald-600 hover:shadow-md transition-all"
              >
                <div>
                  {/* GrainRise Card Header Bar */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-emerald-100 bg-[#EBF7EE]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-emerald-800 truncate">
                        {ord.batch_no}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        ord.payment_method === "Online Payment"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {ord.payment_method}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3">
                    {/* Customer Row */}
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-800 font-bold">
                        {ord.customer_type === "Retailer" ? (
                          <Store size={14} className="text-[#0B5D1E] shrink-0" />
                        ) : (
                          <Warehouse size={14} className="text-[#0B5D1E] shrink-0" />
                        )}
                        <span className="truncate">{ord.customer_name}</span>
                        <span className="text-[10px] font-medium text-slate-400 shrink-0">
                          ({ord.customer_type})
                        </span>
                      </div>
                      {ord.customer_contact && (
                        <p className="text-[11px] text-slate-400 pl-5 mt-0.5 flex items-center gap-1">
                          <Phone size={10} />
                          {ord.customer_contact}
                        </p>
                      )}
                    </div>

                    {/* GrainRise Style Detail Box */}
                    <div className="rounded-xl bg-[#F5F7FA] p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            COMMODITY / VARIANT
                          </p>
                          <p className="font-bold text-slate-900 truncate">{ord.product_name}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            QUANTITY
                          </p>
                          <p className="font-extrabold text-slate-900">
                            {displayQty} kg
                            {isReplacement && (
                              <span className="block text-[9px] font-semibold text-emerald-700">
                                Approved Replacement
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-slate-200/60">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            UNIT COST
                          </p>
                          <p className="font-semibold text-slate-700">
                            ₱{Number(ord.unit_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            EXPECTED ARRIVAL
                          </p>
                          <p className="font-semibold text-slate-700 flex items-center gap-1">
                            <Calendar size={11} className="text-slate-400" />
                            {ord.expected_arrival_date}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Actual Order Total & Direct Action */}
                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Order Total:
                    </span>
                    <span className="text-base font-black text-[#0B5D1E]">
                      ₱{Number(ord.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {ord.order_status === "Delivered" ? (
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-[#0B5D1E] border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle size={14} />
                      Delivered
                    </span>
                  ) : ord.payment_method === "Cash on Delivery" ? (
                    <button
                      type="button"
                      onClick={() => handleStartSingleOrderDelivery(ord)}
                      disabled={isSubmittingDelivery}
                      className="px-3.5 py-1.5 rounded-xl bg-[#0B5D1E] hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle size={14} />
                      Mark as Delivered (COD)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartSingleOrderDelivery(ord)}
                      disabled={isSubmittingDelivery}
                      className="px-3.5 py-1.5 rounded-xl bg-[#0B5D1E] hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle size={14} />
                      Mark as Delivered
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── BOTTOM ACTION BUTTONS ───────────────────────────────────────────── */}
      <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Message Them - Blue Left */}
        <button
          type="button"
          onClick={() => {
            const target = `/miller-driver/messages?recipient=${buyerGroup.buyer_id}&type=${buyerGroup.customer_type}`;
            handleRequestExit(target);
          }}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          <MessageSquare size={16} />
          Message Them
        </button>

        {/* Mark as Delivered - Green Right */}
        <button
          type="button"
          onClick={handleStartDeliveryCompletion}
          disabled={isSubmittingDelivery || allOrdersDelivered}
          className={`w-full sm:w-auto px-8 py-2.5 rounded-xl text-xs font-extrabold text-white transition-colors shadow-md flex items-center justify-center gap-2 ${
            allOrdersDelivered
              ? "bg-emerald-600/90 cursor-default"
              : "bg-[#0B5D1E] hover:bg-emerald-800 cursor-pointer disabled:opacity-50"
          }`}
        >
          <CheckCircle size={16} />
          {allOrdersDelivered ? "All Orders Delivered" : "Mark as Delivered"}
        </button>
      </div>

      {/* ── SELECT ORDER TO DELIVER MODAL (When mixed orders exist) ── */}
      {showOrderSelectModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Select Order to Deliver</h3>
                  <p className="text-xs text-gray-500">This buyer has both Online Payment and COD orders</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOrderSelectModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 space-y-3">
                {prepaidOrders
                  .filter((o) => o.order_status !== "Delivered")
                  .map((ord) => (
                    <button
                      key={ord.online_order_id}
                      type="button"
                      onClick={() => {
                        setShowOrderSelectModal(false);
                        handleStartSingleOrderDelivery(ord);
                      }}
                      className="w-full p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 text-left transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold">
                            Online Payment (Prepaid)
                          </span>
                          <span className="text-xs font-bold text-gray-900">{ord.batch_no}</span>
                        </div>
                        <p className="text-xs text-gray-600">
                          {ord.product_name} • ₱{Number(ord.total_price || 0).toLocaleString()}
                        </p>
                        <p className="text-[11px] text-blue-800 font-medium flex items-center gap-1">
                          <Camera size={12} /> Requires device camera proof of delivery
                        </p>
                      </div>
                      <ChevronRight size={18} className="text-blue-500 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ))}

                {codOrders
                  .filter((o) => o.order_status !== "Delivered")
                  .map((ord) => (
                    <button
                      key={ord.online_order_id}
                      type="button"
                      onClick={() => {
                        setShowOrderSelectModal(false);
                        handleStartSingleOrderDelivery(ord);
                      }}
                      className="w-full p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 text-left transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-[#0B5D1E] text-[10px] font-bold">
                            Cash on Delivery
                          </span>
                          <span className="text-xs font-bold text-gray-900">{ord.batch_no}</span>
                        </div>
                        <p className="text-xs text-gray-600">
                          {ord.product_name} • ₱{Number(ord.total_price || 0).toLocaleString()}
                        </p>
                        <p className="text-[11px] text-emerald-800 font-medium">
                          Payable: ₱{Number(ord.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} (Opens Mini POS)
                        </p>
                      </div>
                      <ChevronRight size={18} className="text-[#0B5D1E] group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ))}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowOrderSelectModal(false);
                      setActiveTargetOrder(null);
                      setShowPodModal(true);
                    }}
                    className="w-full py-2.5 rounded-xl bg-[#0B5D1E] hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle size={15} />
                    Deliver All Orders (Proof then COD Collection)
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── MODALS ─────────────────────────────────────────────────────────── */}
      <DriverExitTrackingModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onConfirmExit={handleConfirmExit}
        isLoading={isExiting}
      />

      <DriverProofOfDeliveryModal
        isOpen={showPodModal}
        onClose={() => {
          setShowPodModal(false);
          setCapturedPodPhoto(null);
          setActiveTargetOrder(null);
        }}
        onSaveProof={handleSaveProofOfDelivery}
        isLoading={isSubmittingDelivery}
        title={
          activeTargetOrder
            ? `Proof of Delivery — ${activeTargetOrder.batch_no}`
            : hasCodCollection && hasPrepaidOrders
            ? "Prepaid Delivery Proof (Step 1 of 2)"
            : "Proof of Delivery"
        }
        subtitle={
          activeTargetOrder
            ? "Capture device camera proof of delivery for this online prepaid order"
            : hasCodCollection && hasPrepaidOrders
            ? "Capture photo proof for prepaid order before collecting COD payment"
            : "Capture delivery proof using device camera"
        }
        saveLabel={!activeTargetOrder && hasCodCollection && hasPrepaidOrders ? "Save & Proceed to Payment" : "Save & Confirm"}
      />

      <DriverCODPaymentModal
        isOpen={showCodModal}
        onClose={() => {
          setShowCodModal(false);
          setActiveTargetOrder(null);
        }}
        totalAmountDue={activeTargetOrder ? Number(activeTargetOrder.total_price || 0) : totalCodAmount}
        codOrders={activeTargetOrder ? [activeTargetOrder] : codOrders}
        onProceedToReceipt={handleProceedToReceipt}
        isLoading={isSubmittingDelivery}
      />

      <DriverDeliverySuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={successModalData.title}
        message={successModalData.message}
        buttonLabel={successModalData.buttonLabel}
        onAction={successModalData.action}
      />

      <DriverPOSReceiptModal
        isOpen={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false);
          const hasUnfinished = (buyerGroup?.orders || []).some((o) => o.order_status !== "Delivered");
          if (!hasRemainingDeliveries || !hasUnfinished) {
            navigate("/miller-driver/my-duties");
          }
        }}
        receiptData={receiptData}
      />
    </div>
  );
}
