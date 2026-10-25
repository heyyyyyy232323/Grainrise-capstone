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
    (args, maybeType, maybeTitle, maybeDuration) => {
      let type = "info";
      let title = "";
      let message = "";
      let duration = 4000;

      if (typeof args === "string") {
        message = args;
        if (typeof maybeType === "string") type = maybeType;
        if (typeof maybeTitle === "string") {
          title = maybeTitle;
        } else if (type === "success") {
          title = "Success";
        } else if (type === "error") {
          title = "Error";
        } else if (type === "warning") {
          title = "Warning";
        }
        if (typeof maybeDuration === "number") duration = maybeDuration;
      } else if (args && typeof args === "object") {
        type = args.type || "info";
        title = args.title || (type === "success" ? "Success" : type === "error" ? "Error" : "");
        message = args.message || "";
        duration = args.duration !== undefined ? args.duration : 4000;
      }

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
