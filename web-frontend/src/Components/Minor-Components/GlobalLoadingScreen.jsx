import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Logo from "../../assets/Logo.png";

export default function GlobalLoadingScreen() {
  const { pathname } = useLocation();

  const [shouldRender, setShouldRender] = useState(() => {
    if (typeof window === "undefined") return false;
    const navEntry = performance.getEntriesByType("navigation")[0];
    const isBrowserReload = navEntry?.type === "reload" || performance.navigation?.type === 1;
    return pathname === "/" || isBrowserReload;
  });

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const navigationEntry = performance.getEntriesByType("navigation")[0];
    const isBrowserReload = navigationEntry?.type === "reload" || performance.navigation?.type === 1;
    const shouldLoad = pathname === "/" || isBrowserReload;

    if (!shouldLoad) {
      setShouldRender(false);
      setVisible(false);
      return undefined;
    }

    setShouldRender(true);

    // Trigger smooth fade-in agad pagka-mount
    const showTimer = requestAnimationFrame(() => {
      setVisible(true);
    });

    // Fade-out at unmount timers
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setShouldRender(false), 300); // 300ms matches duration-300
    }, 750);

    return () => {
      cancelAnimationFrame(showTimer);
      clearTimeout(hideTimer);
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
      className={`fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-[#F9FCF9] pointer-events-auto select-none transition-opacity duration-300 ease-in-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="mb-12 animate-pulse transition-transform duration-700 ease-in-out">
        <img src={Logo} alt="GrainRise Logo" className="h-12 object-contain drop-shadow-sm" />
      </div>

      <div className="text-green-700 font-bold text-xl tracking-wider mb-8 animate-pulse">
        Loading...
      </div>

      <div className="relative flex items-center justify-center w-32 h-32 bg-green-200/40 backdrop-blur-xs rounded-full shadow-inner">
        <div
          className="w-20 h-20 relative animate-spin"
          style={{ animationDuration: "1.8s", animationTimingFunction: "linear" }}
        >
          {petals.map((petal, index) => (
            <div
              key={index}
              className={`absolute top-0 left-1/2 w-2.5 h-5 ${petal.color} rounded-full shadow-xs`}
              style={{
                transform: `translateX(-50%) rotate(${petal.angle}deg)`,
                transformOrigin: "50% 160%",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}