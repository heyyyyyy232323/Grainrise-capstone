import React, { createContext, useContext, useState, useCallback } from "react";

const LoadingContext = createContext(null);

/**
 * Provides a global loading-screen trigger.
 *
 * Usage:
 *   const { triggerLoading } = useLoading();
 *   triggerLoading(800);   // show loader for 800 ms
 */
export function LoadingProvider({ children }) {
  const [visible, setVisible] = useState(false);

  const triggerLoading = useCallback((durationMs = 700) => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), durationMs);
    return () => clearTimeout(t);
  }, []);

  return (
    <LoadingContext.Provider value={{ visible, setVisible, triggerLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error("useLoading must be used inside <LoadingProvider>");
  return ctx;
}
