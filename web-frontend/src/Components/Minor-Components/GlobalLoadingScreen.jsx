import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Logo from "../../assets/Logo.png";

export default function GlobalLoadingScreen() {
  const { pathname } = useLocation();
  const initialPathname = useRef(pathname);
  const isBrowserReload = useRef(() => {
    const navigationEntry = performance.getEntriesByType("navigation")[0];
    return navigationEntry?.type === "reload" || performance.navigation?.type === 1;
  }).current();
  const hasStartedLandingLoader = useRef(false);
  const hasFinishedLandingLoader = useRef(false);
  const hasLeftLandingPage = useRef(false);
  const hideTimerRef = useRef(null);
  const removeTimerRef = useRef(null);

  const [shouldRender, setShouldRender] = useState(() => {
    const navigationEntry = performance.getEntriesByType("navigation")[0];
    const reloaded = navigationEntry?.type === "reload" || performance.navigation?.type === 1;
    return pathname === "/" || reloaded;
  });

  const [visible, setVisible] = useState(shouldRender);

  useEffect(() => {
    const isInitialEntry = pathname === initialPathname.current;

    if (!isInitialEntry && hasStartedLandingLoader.current) {
      hasLeftLandingPage.current = true;
      clearTimeout(hideTimerRef.current);
      clearTimeout(removeTimerRef.current);
      hideTimerRef.current = null;
      removeTimerRef.current = null;
      setVisible(false);
      setShouldRender(false);
      return undefined;
    }

    if (!hasStartedLandingLoader.current && pathname !== "/" && !isBrowserReload) {
      return undefined;
    }

    if (hasFinishedLandingLoader.current || hasLeftLandingPage.current) {
      return undefined;
    }

    hasStartedLandingLoader.current = true;
    setShouldRender(true);
    setVisible(true);

    // Trigger visual fade-out right before unmounting
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      removeTimerRef.current = setTimeout(() => {
        hasFinishedLandingLoader.current = true;
        setShouldRender(false);
      }, 400);
    }, 850);

    return () => {
      clearTimeout(hideTimerRef.current);
      clearTimeout(removeTimerRef.current);
      hideTimerRef.current = null;
      removeTimerRef.current = null;
    };
  }, [pathname]);

  if (!shouldRender) return null;

  const petals = [
    { color: "bg-teal-700", angle: 0 },
    { color: "bg-green-600", angle: 45 },
    { color: "bg-lime-500", angle: 90 },
    { color: "bg-yellow-500", angle: 135 },
    { color: "bg-amber-400", angle: 180 },
    { color: "bg-yellow-400", angle: 225 },
    { color: "bg-lime-400", angle: 270 },
    { color: "bg-teal-500", angle: 315 },
  ];

  return (
    <div
      className={`global-loading-screen fixed inset-0 z-[999999] flex flex-col items-center justify-center transition-all duration-400 ease-in-out pointer-events-auto select-none ${
        visible
          ? "opacity-100 scale-100"
          : "opacity-0 scale-95 pointer-events-none"
      }`}
    >
      {/* Brand Logo with Smooth Scaling Pulse */}
      <div className="mb-8 transition-transform duration-700 ease-in-out transform hover:scale-105">
        <img
          src={Logo}
          alt="GrainRise Logo"
          className="h-12 md:h-14 object-contain drop-shadow-xs animate-pulse"
          style={{ animationDuration: "2s" }}
        />
      </div>

      {/* Loading Label with Soft Fade Pulse */}
      <div
        className="text-green-700 font-bold text-lg md:text-xl tracking-wider mb-8 animate-pulse"
        style={{ animationDuration: "1.5s" }}
      >
        Loading...
      </div>

      {/* Custom Petal Spinner Container */}
      <div className="relative flex items-center justify-center w-28 h-28 bg-green-100/50 backdrop-blur-sm rounded-full shadow-inner border border-green-200/40">
        <div
          className="w-16 h-16 relative animate-spin will-change-transform"
          style={{
            animationDuration: "1.4s",
            animationTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {petals.map((petal, index) => (
            <div
              key={index}
              className={`absolute top-0 left-1/2 w-2.5 h-4.5 ${petal.color} rounded-full shadow-xs`}
              style={{
                transform: `translateX(-50%) rotate(${petal.angle}deg)`,
                transformOrigin: "50% 170%",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}