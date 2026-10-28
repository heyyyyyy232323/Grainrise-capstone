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

export default function WarehouseDriverLiveTracking() {
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
        `${API_BASE}/api/warehouse-employees/driver/live-tracking/group/?buyer_group_key=${encodeURIComponent(buyerGroupKey)}`,
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
        await fetch(`${API_BASE}/api/warehouse-employees/driver/live-tracking/ping/`, {
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
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    // 2. Continuous GPS Watch
    const wid = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentCoords({ latitude, longitude });
        setGpsError("");

        const now = Date.now();
        if (now - lastPingTimeRef.current >= 4000) {
          lastPingTimeRef.current = now;
          sendPingToServer(latitude, longitude);
        }
      },
      (err) => {
        setGpsError(
          err.code === 1
            ? "Location permission denied. Please allow GPS access to continue tracking."
            : "GPS signal weak or unavailable."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 3000,
      }
    );
    watchIdRef.current = wid;
  }, [sendPingToServer]);

  const stopGpsStream = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsGpsActive(false);
  }, []);

  useEffect(() => {
    startGpsStream();
    return () => {
      stopGpsStream();
    };
  }, [startGpsStream, stopGpsStream]);

  // Synchronous Beacon Fallback on tab close / reload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!buyerGroup || !buyerGroup.orders?.length) return;
      const assignmentIds = buyerGroup.orders.map((o) => o.assignment_id);
      const token = getAuthToken();

      const payload = JSON.stringify({
        assignment_ids: assignmentIds,
        latitude: currentCoords?.latitude || null,
        longitude: currentCoords?.longitude || null,
      });

      fetch(`${API_BASE}/api/warehouse-employees/driver/live-tracking/exit/`, {
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

    const lower = (address || "").toLowerCase();
    if (lower.includes("mba compound") || lower.includes("bagumbong")) {
      return [14.7613, 121.0278]; // MBA Compound / Street, Bagumbong, Caloocan
    }
    if (lower.includes("173") || lower.includes("caloocan")) {
      return [14.7613, 121.0278];
    }
    if (lower.includes("macarthur") || lower.includes("biñang") || lower.includes("bocaue") || lower.includes("bulacan")) {
      return [14.7984, 120.9280];
    }
    if (lower.includes("sampaloc") || lower.includes("manila")) {
      return [14.6091, 120.9898];
    }
    if (lower.includes("quezon city")) {
      return [14.6760, 121.0437];
    }
    return [14.7984, 120.9280];
  }, []);

  const calculateHaversineDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
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

  const fetchAndDrawRoute = useCallback(async (map, driverLat, driverLng, destLat, destLng) => {
    if (!map) return;

    routeEndpointsRef.current = {
      start: [driverLat, driverLng],
      end: [destLat, destLng],
    };

    setRouteStats((prev) => ({ ...prev, isLoading: true }));

    const drawPolyline = (coords) => {
      if (routeLayerRef.current) {
        map.removeLayer(routeLayerRef.current);
      }
      const polyline = L.polyline(coords, {
        color: "#0B5D1E",
        weight: 5,
        opacity: 0.85,
        lineJoin: "round",
        dashArray: null,
      }).addTo(map);
      routeLayerRef.current = polyline;
    };

    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${driverLng},${driverLat};${destLng},${destLat}?overview=full&geometries=geojson`;
      const res = await fetch(osrmUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.code === "Ok" && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const distKm = route.distance / 1000;
          const durMin = Math.round(route.duration / 60);

          const etaDate = new Date(Date.now() + durMin * 60 * 1000);
          const etaFormatted = etaDate.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });

          const geoCoords = route.geometry.coordinates.map((c) => [c[1], c[0]]);
          drawPolyline(geoCoords);

          setRouteStats({
            distanceKm: distKm.toFixed(1),
            durationMinutes: durMin,
            etaTimeFormatted: etaFormatted,
            isLoading: false,
          });
          return;
        }
      }
    } catch {
      // OSRM routing fallback
    }

    const distKm = calculateHaversineDistanceKm(driverLat, driverLng, destLat, destLng);
    const estMinutes = Math.max(5, Math.round((distKm / 35) * 60));
    const etaDate = new Date(Date.now() + estMinutes * 60 * 1000);
    const etaFormatted = etaDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    drawPolyline([
      [driverLat, driverLng],
      [destLat, destLng],
    ]);

    setRouteStats({
      distanceKm: distKm.toFixed(1),
      durationMinutes: estMinutes,
      etaTimeFormatted: etaFormatted,
      isLoading: false,
    });
  }, []);

  const createDriverMarkerIcon = () =>
    L.divIcon({
      className: "driver-live-marker-wrapper",
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(11, 93, 30, 0.22); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: #0B5D1E; border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
            </svg>
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

  const createDestinationMarkerIcon = () =>
    L.divIcon({
      className: "destination-marker-wrapper",
      html: `
        <div style="position: relative; width: 36px; height: 46px; display: flex; flex-direction: column; align-items: center;">
          <div style="width: 32px; height: 32px; border-radius: 50% 50% 50% 0; background: #DC2626; border: 2.5px solid #ffffff; transform: rotate(-45deg); box-shadow: 0 4px 12px rgba(220, 38, 38, 0.45); display: flex; align-items: center; justify-content: center;">
            <div style="transform: rotate(45deg); color: white; display: flex; align-items: center; justify-content: center;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
          </div>
          <div style="width: 8px; height: 3px; background: rgba(0,0,0,0.3); border-radius: 50%; margin-top: 4px; filter: blur(1px);"></div>
        </div>
      `,
      iconSize: [36, 46],
      iconAnchor: [16, 40],
    });

  // Initialize Leaflet Map
  useEffect(() => {
    if (!leafletContainerRef.current || mapInstanceRef.current || !buyerGroup) return;

    const initialCenter = currentCoords
      ? [currentCoords.latitude, currentCoords.longitude]
      : [14.6760, 121.0437];

    const map = L.map(leafletContainerRef.current, {
      center: initialCenter,
      zoom: 14,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    mapInstanceRef.current = map;

    (async () => {
      const destCoords = await resolveDestinationCoords(buyerGroup.delivery_address);

      if (currentCoords) {
        const dMarker = L.marker([currentCoords.latitude, currentCoords.longitude], {
          icon: createDriverMarkerIcon(),
          zIndexOffset: 1000,
        }).addTo(map);
        dMarker.bindPopup(`<b>Your Live GPS Location</b><br/>Lat: ${currentCoords.latitude.toFixed(5)}, Lng: ${currentCoords.longitude.toFixed(5)}`);
        driverMarkerRef.current = dMarker;
      }

      const destMarker = L.marker(destCoords, {
        icon: createDestinationMarkerIcon(),
        zIndexOffset: 900,
      }).addTo(map);
      destMarker.bindPopup(`<b>Destination: ${buyerGroup.customer_name}</b><br/>${buyerGroup.delivery_address}`);
      destMarkerRef.current = destMarker;

      const driverLat = currentCoords ? currentCoords.latitude : destCoords[0] - 0.015;
      const driverLng = currentCoords ? currentCoords.longitude : destCoords[1] - 0.015;

      if (!driverMarkerRef.current) {
        const dMarker = L.marker([driverLat, driverLng], {
          icon: createDriverMarkerIcon(),
          zIndexOffset: 1000,
        }).addTo(map);
        driverMarkerRef.current = dMarker;
      }

      await fetchAndDrawRoute(map, driverLat, driverLng, destCoords[0], destCoords[1]);

      const bounds = L.latLngBounds([
        [driverLat, driverLng],
        [destCoords[0], destCoords[1]],
      ]);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    })();

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      driverMarkerRef.current = null;
      destMarkerRef.current = null;
      routeLayerRef.current = null;
    };
  }, [buyerGroup, resolveDestinationCoords, fetchAndDrawRoute]);

  // Synchronize Live Driver Position on GPS Tick
  useEffect(() => {
    if (!currentCoords || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const { latitude, longitude } = currentCoords;

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([latitude, longitude]);
    } else {
      const dMarker = L.marker([latitude, longitude], {
        icon: createDriverMarkerIcon(),
        zIndexOffset: 1000,
      }).addTo(map);
      driverMarkerRef.current = dMarker;
    }

    if (destMarkerRef.current) {
      const destLatLng = destMarkerRef.current.getLatLng();
      const last = lastRouteCalcRef.current;
      const movedMeters = calculateHaversineDistanceKm(last.lat, last.lng, latitude, longitude) * 1000;
      const secondsSince = (Date.now() - last.time) / 1000;

      if (movedMeters > 50 || secondsSince > 30) {
        lastRouteCalcRef.current = { lat: latitude, lng: longitude, time: Date.now() };
        fetchAndDrawRoute(map, latitude, longitude, destLatLng.lat, destLatLng.lng);
      }
    }
  }, [currentCoords, fetchAndDrawRoute]);

  // Recenter Route
  const handleRecenterRoute = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    if (routeEndpointsRef.current.start && routeEndpointsRef.current.end) {
      const bounds = L.latLngBounds([
        routeEndpointsRef.current.start,
        routeEndpointsRef.current.end,
      ]);
      map.fitBounds(bounds, { padding: [70, 70], maxZoom: 16 });
    } else if (driverMarkerRef.current) {
      map.setView(driverMarkerRef.current.getLatLng(), 15);
    }
  };

  // Fullscreen Map Toggle
  const toggleFullScreenMap = () => {
    if (!mapContainerRef.current) return;
    if (!isFullScreen) {
      if (mapContainerRef.current.requestFullscreen) {
        mapContainerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      const isFs = Boolean(document.fullscreenElement);
      setIsFullScreen(isFs);
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);
    };

    document.addEventListener("fullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
    };
  }, []);

  // Exit Modal Confirmation
  const handleExitClick = (targetPath = null) => {
    setPendingNavigationPath(targetPath);
    setShowExitModal(true);
  };

  const handleConfirmExit = async () => {
    setIsExiting(true);
    try {
      if (buyerGroup && buyerGroup.orders?.length) {
        const assignmentIds = buyerGroup.orders.map((o) => o.assignment_id);
        const token = getAuthToken();

        await fetch(`${API_BASE}/api/warehouse-employees/driver/live-tracking/exit/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assignment_ids: assignmentIds,
            latitude: currentCoords?.latitude || null,
            longitude: currentCoords?.longitude || null,
          }),
        });
      }
    } catch (err) {
      console.warn("Notice during exit:", err);
    } finally {
      setIsExiting(false);
      setShowExitModal(false);
      stopGpsStream();
      const next = pendingNavigationPath || "/warehouse-driver/my-duties";
      navigate(next);
    }
  };

  // Mark as Delivered Trigger
  const handleOpenMarkAsDelivered = (order = null) => {
    if (!buyerGroup || !buyerGroup.orders?.length) return;

    if (order) {
      setActiveTargetOrder(order);
      proceedToOrderDeliveryModal(order);
      return;
    }

    const pendingOrders = buyerGroup.orders.filter((o) => o.order_status !== "Delivered");
    if (pendingOrders.length === 1) {
      setActiveTargetOrder(pendingOrders[0]);
      proceedToOrderDeliveryModal(pendingOrders[0]);
    } else {
      setShowOrderSelectModal(true);
    }
  };

  const proceedToOrderDeliveryModal = (targetOrder) => {
    setShowOrderSelectModal(false);
    if (!targetOrder) {
      const pendingCod = buyerGroup.orders.filter(
        (o) => o.payment_method === "Cash on Delivery" && o.order_status !== "Delivered"
      );
      if (pendingCod.length > 0) {
        setShowCodModal(true);
      } else {
        setShowPodModal(true);
      }
      return;
    }

    if (targetOrder.payment_method === "Cash on Delivery") {
      setShowCodModal(true);
    } else {
      setShowPodModal(true);
    }
  };

  // Proof of Delivery Saved -> Proceed or Complete
  const handlePodSaved = async (photoBase64) => {
    setCapturedPodPhoto(photoBase64);
    setShowPodModal(false);

    const targetOrders = activeTargetOrder
      ? [activeTargetOrder]
      : buyerGroup.orders.filter((o) => o.order_status !== "Delivered");

    const hasAnyCod = targetOrders.some((o) => o.payment_method === "Cash on Delivery");

    if (hasAnyCod) {
      setShowCodModal(true);
      return;
    }

    // Prepaid Delivery: Finalize immediately with captured POD
    setIsSubmittingDelivery(true);
    try {
      const token = getAuthToken();
      const payload = {
        buyer_group_key: buyerGroupKey,
        proof_of_delivery: photoBase64,
      };
      if (activeTargetOrder) {
        payload.order_id = activeTargetOrder.online_order_id;
      }

      const res = await fetch(`${API_BASE}/api/warehouse-employees/driver/delivery/complete/`, {
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

      setSuccessModalData({
        title: "Delivery Completed Successfully",
        message: "Proof of delivery has been uploaded and assigned status set to Done.",
        buttonLabel: data.has_remaining_orders ? "Continue Remaining Deliveries" : "Back to My Duties",
        action: () => {
          setShowSuccessModal(false);
          if (!data.has_remaining_orders) {
            navigate("/warehouse-driver/my-duties");
          }
        },
      });
      setShowSuccessModal(true);
    } catch (err) {
      alert(err.message || "Failed to submit delivery completion.");
    } finally {
      setIsSubmittingDelivery(false);
      setActiveTargetOrder(null);
    }
  };

  // COD Payment Completed -> Complete Delivery & Open POS Receipt
  const handleCodPaymentCompleted = async (codInfo) => {
    setIsSubmittingDelivery(true);

    const codOrders = buyerGroup.orders.filter(
      (o) => o.payment_method === "Cash on Delivery" && o.order_status !== "Delivered"
    );

    const companyName = driverInfo?.business_name || "GrainRise Warehouse";
    const driverFullName = driverInfo ? `${driverInfo.first_name} ${driverInfo.last_name}`.trim() : "Driver";
    const buyerName = buyerGroup.customer_name;

    const compWords = companyName.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean);
    const compPart = compWords.length >= 2 ? (compWords[0] + compWords[1]).toUpperCase() : compWords[0] ? (compWords[0] + "WH").toUpperCase() : "GRAINRISE";

    const dFirst = driverInfo?.first_name ? driverInfo.first_name.charAt(0).toUpperCase() : "D";
    const dLast = driverInfo?.last_name ? driverInfo.last_name.charAt(0).toUpperCase() : "R";
    const driverInitials = `${dFirst}${dLast}`;

    const txDate = new Date();
    const mm = String(txDate.getMonth() + 1).padStart(2, "0");
    const dd = String(txDate.getDate()).padStart(2, "0");
    const yyyy = String(txDate.getFullYear());
    const dateStr = `${mm}${dd}${yyyy}`;

    const hh = String(txDate.getHours()).padStart(2, "0");
    const min = String(txDate.getMinutes()).padStart(2, "0");
    const timeStr = `${hh}${min}`;

    const bParts = buyerName.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean);
    const bFirst = bParts.length > 0 ? bParts[0].charAt(0).toUpperCase() : "B";
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

      const res = await fetch(`${API_BASE}/api/warehouse-employees/driver/delivery/complete/`, {
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
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
          Initializing Live Tracking Session...
        </p>
      </div>
    );
  }

  if (fetchError || !buyerGroup) {
    return (
      <div className="space-y-4 max-w-lg mx-auto py-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
          <AlertTriangle size={28} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Delivery Unavailable</h2>
        <p className="text-xs text-slate-500 font-medium">
          {fetchError || "The requested delivery group cannot be loaded."}
        </p>
        <button
          type="button"
          onClick={() => navigate("/warehouse-driver/my-duties")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to My Duties
        </button>
      </div>
    );
  }

  const pendingOrders = buyerGroup.orders.filter((o) => o.order_status !== "Delivered");
  const isAllDelivered = pendingOrders.length === 0;

  const totalCodAmount = buyerGroup.orders
    .filter((o) => o.payment_method === "Cash on Delivery" && o.order_status !== "Delivered")
    .reduce((sum, o) => sum + (o.total_price || 0), 0);

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Back Bar ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Breadcrumbs
            items={[
              { label: "Operations", path: "/warehouse-driver/my-duties" },
              { label: "Live Tracking" },
            ]}
          />
          <div className="flex items-center gap-2.5 mt-1">
            <button
              type="button"
              onClick={() => handleExitClick("/warehouse-driver/my-duties")}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer shadow-xs"
              title="Return to My Duties"
            >
              <ArrowLeft size={16} />
            </button>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Live Delivery Tracking
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Live GPS Active
            </span>
          </div>
        </div>

        {/* Top-Right Quick Status */}
        <div className="flex items-center gap-2 shrink-0">
          {driverInfo && (
            <div className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-xs">
              Driver: <span className="font-bold text-slate-900">{driverInfo.first_name} {driverInfo.last_name}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => handleExitClick("/warehouse-driver/my-duties")}
            className="px-3.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition cursor-pointer"
          >
            Exit Tracking
          </button>
        </div>
      </div>

      {/* ── INTERACTIVE LEAFLET MAP & FLOATING ACTIVE DISPATCH TRANSIT CARD ── */}
      <div
        ref={mapContainerRef}
        className={`relative w-full rounded-2xl border border-slate-200 overflow-hidden shadow-lg bg-slate-900 transition-all ${
          isFullScreen ? "fixed inset-0 z-[9990] rounded-none border-0" : "h-[460px] md:h-[520px]"
        }`}
      >
        {/* Leaflet Mount Container */}
        <div ref={leafletContainerRef} className="w-full h-full z-10" />

        {/* FLOATING ACTIVE DISPATCH TRANSIT CARD (Top-Left overlay) */}
        <div className="absolute top-3.5 left-3.5 z-20 w-[92%] sm:w-[360px] bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-slate-200/90 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0B5D1E] animate-pulse" />
              <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#0B5D1E]">
                Active Dispatch Transit
              </span>
            </div>
            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              {buyerGroup.orders?.length || 1} Order(s)
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <Store size={16} className="text-emerald-700 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 truncate">
                {buyerGroup.customer_name}
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-1 min-w-0">
              <MapPin size={13} className="text-slate-400 shrink-0" />
              <span className="truncate">{buyerGroup.delivery_address || "Designated Delivery Destination"}</span>
            </p>
          </div>

          {/* Real-time Distance & ETA Metrics */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
            <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <span className="text-[9px] font-extrabold uppercase text-emerald-800 tracking-wider block">
                Estimated Arrival
              </span>
              <p className="text-sm font-extrabold text-[#0B5D1E] mt-0.5">
                {routeStats.isLoading ? (
                  <span className="text-xs font-semibold text-slate-400">Calculating...</span>
                ) : (
                  routeStats.etaTimeFormatted || "N/A"
                )}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[9px] font-extrabold uppercase text-slate-500 tracking-wider block">
                Road Distance
              </span>
              <p className="text-sm font-extrabold text-slate-800 mt-0.5">
                {routeStats.isLoading ? (
                  <span className="text-xs font-semibold text-slate-400">Calculating...</span>
                ) : (
                  `${routeStats.distanceKm || "—"} km`
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Map Control Buttons (Top-Right overlay) */}
        <div className="absolute top-3.5 right-3.5 z-20 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleRecenterRoute}
            className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 text-slate-700 hover:text-[#0B5D1E] hover:bg-white flex items-center justify-center shadow-lg transition cursor-pointer"
            title="Recenter Route"
          >
            <LocateFixed size={18} />
          </button>
          <button
            type="button"
            onClick={toggleFullScreenMap}
            className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-white flex items-center justify-center shadow-lg transition cursor-pointer"
            title={isFullScreen ? "Exit Fullscreen" : "Fullscreen Map"}
          >
            {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>

        {/* Live GPS Status Strip (Bottom overlay) */}
        <div className="absolute bottom-3 left-3.5 z-20 bg-black/75 backdrop-blur-md rounded-xl px-3 py-1.5 text-[11px] font-mono text-white flex items-center gap-2.5 shadow-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            GPS: {currentCoords ? `${currentCoords.latitude.toFixed(5)}, ${currentCoords.longitude.toFixed(5)}` : "Acquiring Fix..."}
          </span>
          {gpsError && <span className="text-amber-300 font-sans text-[10px]">({gpsError})</span>}
        </div>
      </div>

      {/* ── ASSIGNED ORDER CARDS ───────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Assigned Order Cards ({buyerGroup.orders?.length || 0})
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Orders being delivered to this destination in the current active dispatch.
            </p>
          </div>
          {totalCodAmount > 0 && (
            <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
              Total COD Due: ₱{totalCodAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {buyerGroup.orders.map((order, idx) => {
            const isDelivered = order.order_status === "Delivered";
            const isCod = order.payment_method === "Cash on Delivery";

            return (
              <div
                key={order.online_order_id || idx}
                className={`rounded-2xl border transition p-5 flex flex-col justify-between space-y-4 ${
                  isDelivered
                    ? "bg-slate-50/70 border-slate-200 opacity-80"
                    : "bg-white border-slate-200/90 shadow-sm hover:shadow"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 font-mono">
                        {order.batch_no}
                      </span>
                      {order.is_replacement && (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                          Replacement
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-[#0B5D1E]">
                      {order.product_name}
                    </p>
                  </div>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      isDelivered
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : isCod
                        ? "bg-amber-100 text-amber-800 border-amber-200"
                        : "bg-blue-100 text-blue-800 border-blue-200"
                    }`}
                  >
                    {isDelivered ? "Delivered" : order.payment_method}
                  </span>
                </div>

                {/* Details Breakdown */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block font-semibold uppercase">Quantity</span>
                    <span className="font-bold text-slate-800">
                      {order.display_quantity || order.ordered_quantity} kg
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-semibold uppercase">Unit Cost</span>
                    <span className="font-bold text-slate-800">
                      ₱{(order.unit_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-semibold uppercase">Total Price</span>
                    <span className="font-extrabold text-[#0B5D1E]">
                      ₱{(order.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-semibold uppercase">Expected Arrival</span>
                    <span className="font-semibold text-slate-700">
                      {order.expected_arrival_date}
                    </span>
                  </div>
                </div>

                {/* Individual Mark as Delivered Button */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500 font-medium">
                    Order ID: #{order.online_order_id}
                  </span>
                  {!isDelivered ? (
                    <button
                      type="button"
                      onClick={() => handleOpenMarkAsDelivered(order)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#0B5D1E] hover:bg-emerald-800 text-white text-xs font-bold transition cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5"
                    >
                      <CheckCircle size={14} />
                      <span>Deliver This Order</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                      <CheckCircle size={14} /> Delivered
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── BOTTOM ACTION BUTTONS ─────────────────────────────────────────── */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-4 z-30">
        <button
          type="button"
          onClick={() => {
            handleExitClick(`/warehouse-driver/messages?conversation=${buyerGroup.buyer_id}`);
          }}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer shadow-sm active:scale-95"
        >
          <MessageSquare size={16} />
          <span>Message Them</span>
        </button>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {!isAllDelivered && (
            <button
              type="button"
              onClick={() => handleOpenMarkAsDelivered(null)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#0B5D1E] hover:bg-[#084b18] text-white text-xs font-bold transition cursor-pointer shadow-sm active:scale-95"
            >
              <CheckCircle size={16} />
              <span>Mark as Delivered {buyerGroup.orders.length > 1 ? `(${pendingOrders.length})` : ""}</span>
            </button>
          )}
          {isAllDelivered && (
            <button
              type="button"
              onClick={() => navigate("/warehouse-driver/my-duties")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer shadow-sm"
            >
              <CheckCircle size={16} />
              <span>All Orders Delivered · Finish Duty</span>
            </button>
          )}
        </div>
      </div>

      {/* ── SELECT ORDER MODAL (For Group Deliveries) ────────────────────── */}
      {showOrderSelectModal && (
        createPortal(
          <div
            className="fixed inset-0 z-[9995] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Select Order to Deliver</h3>
                  <p className="text-xs text-slate-500">
                    Deliver all orders together or select an individual order.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOrderSelectModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-3">
                <button
                  type="button"
                  onClick={() => proceedToOrderDeliveryModal(null)}
                  className="w-full p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 text-left transition cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-extrabold text-[#0B5D1E] block">
                      Deliver All Pending Orders ({pendingOrders.length})
                    </span>
                    <span className="text-[11px] text-slate-600">
                      Process proof and payment collection for all remaining orders.
                    </span>
                  </div>
                  <ChevronRight size={18} className="text-emerald-700" />
                </button>

                <div className="pt-2">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-2">
                    Or Select Individual Order:
                  </span>
                  <div className="space-y-2">
                    {pendingOrders.map((o) => (
                      <button
                        key={o.online_order_id}
                        type="button"
                        onClick={() => {
                          setActiveTargetOrder(o);
                          proceedToOrderDeliveryModal(o);
                        }}
                        className="w-full p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-left transition cursor-pointer flex items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-slate-900 font-mono block">
                            {o.batch_no}
                          </span>
                          <span className="text-xs font-medium text-slate-600 block">
                            {o.product_name} · ₱{(o.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold block">
                            {o.payment_method}
                          </span>
                        </div>
                        <ChevronRight size={16} className="text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      )}

      {/* ── MODAL 1: EXIT LIVE TRACKING MODAL ─────────────────────────────── */}
      <DriverExitTrackingModal
        isOpen={showExitModal}
        onClose={() => {
          setShowExitModal(false);
          setPendingNavigationPath(null);
        }}
        onConfirmExit={handleConfirmExit}
        isLoading={isExiting}
      />

      {/* ── MODAL 2: PROOF OF DELIVERY CAMERA MODAL ────────────────────────── */}
      <DriverProofOfDeliveryModal
        isOpen={showPodModal}
        onClose={() => {
          setShowPodModal(false);
          setActiveTargetOrder(null);
        }}
        onSaveProof={handlePodSaved}
        isLoading={isSubmittingDelivery}
      />

      {/* ── MODAL 3: COD PAYMENT MINI POS MODAL ────────────────────────────── */}
      <DriverCODPaymentModal
        isOpen={showCodModal}
        onClose={() => {
          setShowCodModal(false);
          setActiveTargetOrder(null);
        }}
        orders={activeTargetOrder ? [activeTargetOrder] : buyerGroup.orders.filter((o) => o.payment_method === "Cash on Delivery" && o.order_status !== "Delivered")}
        onPaymentComplete={handleCodPaymentCompleted}
        isLoading={isSubmittingDelivery}
      />

      {/* ── MODAL 4: POS THERMAL-STYLE RECEIPT MODAL ────────────────────────── */}
      <DriverPOSReceiptModal
        isOpen={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false);
          if (!hasRemainingDeliveries) {
            navigate("/warehouse-driver/my-duties");
          }
        }}
        receiptData={receiptData}
        hasRemainingDeliveries={hasRemainingDeliveries}
      />

      {/* ── MODAL 5: SUCCESS MODAL ────────────────────────────────────────── */}
      <DriverDeliverySuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          if (successModalData.action) {
            successModalData.action();
          }
        }}
        title={successModalData.title}
        message={successModalData.message}
        buttonLabel={successModalData.buttonLabel}
        onButtonClick={() => {
          setShowSuccessModal(false);
          if (successModalData.action) {
            successModalData.action();
          }
        }}
      />
    </div>
  );
}
