import { useState, useCallback, useRef } from "react";

let _id = 0;
const nextId = () => ++_id;

/**
 * useToast — provides toast notification state and helpers.
 *
 * Usage:
 *   const { toasts, showToast, removeToast } = useToast();
 *
 *   showToast({ type: "error", title: "Validation Error", message: "Please fill required fields.", duration: 4000 });
 *
 * Pair with the <Toast toasts={toasts} removeToast={removeToast} /> component.
 */
const useToast = () => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const showToast = useCallback(
    ({ type = "info", title = "", message = "", duration = 4000 }) => {
      const id = nextId();
      setToasts((prev) => [...prev, { id, type, title, message }]);

      if (duration > 0) {
        timers.current[id] = setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  return { toasts, showToast, removeToast };
};

export default useToast;
