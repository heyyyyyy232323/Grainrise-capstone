import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import useApi from "../useApi";

const BASE_URL = "/miller-employees/finance/notifications";

const useFinanceNotifications = ({
  enabled = true,
  baseUrl = BASE_URL,
} = {}) => {
  const { request } = useApi();
  const resolvedBaseUrl = baseUrl || BASE_URL;

  const [notifications, setNotifications] = useState([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");
  const hasLoadedOnceRef = useRef(false);

  // =========================================================
  // LOAD NOTIFICATIONS
  // =========================================================
  const loadNotifications = useCallback(
    async ({ limit = 50, offset = 0, silent = false } = {}) => {
      if (!enabled) {
        setNotifications([]);
        setUnseenCount(0);
        return [];
      }

      // Show loader only on the very first load
      if (!silent && !hasLoadedOnceRef.current) {
        setIsLoading(true);
      }
      setError("");

      try {
        const response = await request(
          `${resolvedBaseUrl}/?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`,
          {
            method: "GET",
            throwOnError: true,
          }
        );

        hasLoadedOnceRef.current = true;

        const items = Array.isArray(response?.notifications)
          ? response.notifications
          : Array.isArray(response?.data?.notifications)
            ? response.data.notifications
            : [];

        const count = Number(
          response?.unseen_count ?? response?.data?.unseen_count ?? 0
        );

        setNotifications(items);
        setUnseenCount(count);

        return items;
      } catch (err) {
        const message =
          err?.data?.message ||
          err?.message ||
          "Unable to load finance notifications.";

        setError(message);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [enabled, request, resolvedBaseUrl]
  );

  // =========================================================
  // REFRESH NOTIFICATIONS
  // =========================================================
  const refreshNotifications = useCallback(
    async (options) => {
      return loadNotifications(options);
    },
    [loadNotifications]
  );

  // =========================================================
  // LOAD UNSEEN COUNT (LIGHTWEIGHT POLLING)
  // =========================================================
  const loadUnseenCount = useCallback(async () => {
    if (!enabled) {
      setUnseenCount(0);
      return 0;
    }

    try {
      const response = await request(`${resolvedBaseUrl}/?limit=1`, {
        method: "GET",
        throwOnError: true,
      });

      const count = Number(
        response?.unseen_count ?? response?.data?.unseen_count ?? 0
      );
      setUnseenCount(count);
      return count;
    } catch {
      // Silently fail badge refresh
      return 0;
    }
  }, [enabled, request, resolvedBaseUrl]);

  // =========================================================
  // INITIAL LOAD
  // =========================================================
  useEffect(() => {
    if (!enabled) {
      setNotifications([]);
      setUnseenCount(0);
      return;
    }

    loadNotifications().catch(() => {});
  }, [enabled, loadNotifications]);

  // =========================================================
  // MARK ONE AS SEEN
  // =========================================================
  const markAsSeen = useCallback(
    async (notificationId) => {
      if (!enabled || !notificationId) {
        return null;
      }

      setIsUpdating(true);
      setError("");

      try {
        const response = await request(
          `${resolvedBaseUrl}/${notificationId}/seen/`,
          {
            method: "POST",
            body: {},
            throwOnError: true,
          }
        );

        const updatedNotification = response?.notification || null;

        setNotifications((current) =>
          current.map((item) => {
            const currentId = item?.notification_id || item?.id;
            if (String(currentId) !== String(notificationId)) {
              return item;
            }

            return (
              updatedNotification || {
                ...item,
                status: "seen",
                is_seen: true,
                is_read: true,
              }
            );
          })
        );

        if (response?.unseen_count !== undefined) {
          setUnseenCount(Number(response.unseen_count));
        } else {
          setUnseenCount((prev) => Math.max(0, prev - 1));
        }

        return response;
      } catch (err) {
        const message =
          err?.data?.message ||
          err?.message ||
          "Unable to mark notification as seen.";

        setError(message);
        throw err;
      } finally {
        setIsUpdating(false);
      }
    },
    [enabled, request, resolvedBaseUrl]
  );

  // =========================================================
  // MARK ALL AS SEEN / READ
  // =========================================================
  const markAllAsRead = useCallback(async () => {
    if (!enabled) return;

    setIsUpdating(true);
    setError("");

    try {
      await request(`${resolvedBaseUrl}/mark-all-seen/`, {
        method: "POST",
        body: {},
        throwOnError: true,
      });

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          status: "seen",
          is_seen: true,
          is_read: true,
        }))
      );
      setUnseenCount(0);
    } catch (err) {
      const message =
        err?.data?.message ||
        err?.message ||
        "Unable to mark all notifications as seen.";
      setError(message);
    } finally {
      setIsUpdating(false);
    }
  }, [enabled, request]);

  // =========================================================
  // OPEN NOTIFICATION
  // =========================================================
  const openNotification = useCallback(
    async (item) => {
      const notificationId = item?.notification_id || item?.id;
      const targetPath = item?.action_url || "/miller-finance/dashboard";

      if (!notificationId) {
        return { targetPath };
      }

      const isUnseen = item?.status === "unseen" || !item?.is_seen;

      if (isUnseen) {
        try {
          await markAsSeen(notificationId);
        } catch {
          // Continue to navigation even if mark seen failed
        }
      }

      return {
        targetPath,
      };
    },
    [markAsSeen]
  );

  return {
    notifications,
    unseenCount,
    unreadCount: unseenCount, // compatibility alias
    isLoading,
    isUpdating,
    error,
    loadNotifications,
    refreshNotifications,
    loadUnseenCount,
    markAsSeen,
    markAsRead: markAsSeen, // compatibility alias
    markAllAsRead,
    openNotification,
  };
};

export default useFinanceNotifications;

