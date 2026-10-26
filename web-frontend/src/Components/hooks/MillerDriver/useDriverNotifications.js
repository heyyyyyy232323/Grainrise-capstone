import {
  useCallback,
  useEffect,
  useState,
} from "react";
import useApi from "../useApi";

const BASE_URL = "/miller-employees/driver/notifications";

const useDriverNotifications = ({
  enabled = true,
} = {}) => {
  const { request } = useApi();

  const [notifications, setNotifications] = useState([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");

  // =========================================================
  // LOAD NOTIFICATIONS
  // =========================================================
  const loadNotifications = useCallback(
    async ({ limit = 50, offset = 0 } = {}) => {
      if (!enabled) {
        setNotifications([]);
        setUnseenCount(0);
        return [];
      }

      setIsLoading(true);
      setError("");

      try {
        const response = await request(
          `${BASE_URL}/?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`,
          {
            method: "GET",
            throwOnError: true,
          }
        );

        const items = Array.isArray(response?.notifications)
          ? response.notifications
          : [];

        const count = Number(response?.unseen_count || 0);

        setNotifications(items);
        setUnseenCount(count);

        return items;
      } catch (err) {
        const message =
          err?.data?.message ||
          err?.message ||
          "Unable to load driver notifications.";

        setError(message);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [enabled, request]
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
      const response = await request(`${BASE_URL}/?limit=1`, {
        method: "GET",
        throwOnError: true,
      });

      const count = Number(response?.unseen_count || 0);
      setUnseenCount(count);
      return count;
    } catch {
      // Silently fail badge refresh
      return 0;
    }
  }, [enabled, request]);

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
          `${BASE_URL}/${notificationId}/seen/`,
          {
            method: "POST",
            body: {},
            throwOnError: true,
          }
        );

        setNotifications((current) =>
          current.map((item) => {
            const currentId = item?.notification_id || item?.id;
            if (String(currentId) !== String(notificationId)) {
              return item;
            }

            return {
              ...item,
              status: "seen",
              is_seen: true,
              is_read: true,
            };
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
    [enabled, request]
  );

  // =========================================================
  // MARK ALL AS SEEN / READ
  // =========================================================
  const markAllAsRead = useCallback(async () => {
    if (!enabled) return;

    setIsUpdating(true);
    setError("");

    try {
      await request(`${BASE_URL}/mark-all-seen/`, {
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
      const targetPath = item?.action_url || "/miller-driver/my-duties";

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

export default useDriverNotifications;
