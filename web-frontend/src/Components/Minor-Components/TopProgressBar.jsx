import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function TopProgressBar() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setVisible(true);
    setProgress(10); // Start progress

    // Simulate loading steps
    const timer1 = setTimeout(() => setProgress(40), 100);
    const timer2 = setTimeout(() => setProgress(80), 250);
    const timer3 = setTimeout(() => setProgress(100), 400); // Complete
    
    // Hide bar after completion
    const timer4 = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setProgress(0), 200); // Reset after hidden
    }, 600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [location.pathname]); // Trigger on route change

  if (!visible && progress === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: 4,
        zIndex: 999999,
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.2s ease",
      }}
    >
      <div
        style={{
          height: "100%",
          background: "linear-gradient(90deg, #2d6a35 0%, #7dfa90 100%)",
          width: `${progress}%`,
          transition: progress === 0 ? "none" : "width 0.2s ease-out",
          boxShadow: "0 0 12px rgba(125, 250, 144, 0.8)",
          borderRadius: "0 2px 2px 0",
        }}
      />
    </div>
  );
}
