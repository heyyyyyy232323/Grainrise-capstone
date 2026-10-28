import { useCallback, useState } from "react";

const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    title: "New Offer Received",
    message: "Golden Grains Rice Mill submitted an offer of ₱24.00/kg for your BID-2026-001 open bidding.",
    is_read: false,
    created_at: "2026-10-26T14:30:00Z",
    notification_type: "contract_offer",
    link: "/farmer/contracts",
  },
  {
    id: 2,
    title: "Climate Outlook Update",
    message: "Optimal planting advisory generated for Nueva Ecija wet-season rice crops.",
    is_read: true,
    created_at: "2026-10-25T09:00:00Z",
    notification_type: "climate_update",
    link: "/farmer/forecasting",
  },
];

const useFarmerNotifications = ({ enabled = true } = {}) => {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [unreadCount, setUnreadCount] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async () => {
    setIsLoading(false);
    return notifications;
  }, [notifications]);

  const loadUnreadCount = useCallback(async () => {
    return unreadCount;
  }, [unreadCount]);

  const refreshNotifications = useCallback(async () => {
    return notifications;
  }, [notifications]);

  const markAsRead = useCallback(async (notificationId) => {
    setIsUpdating(true);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    setIsUpdating(false);
    return { success: true };
  }, []);

  const openNotification = useCallback(
    async (notification) => {
      if (notification?.id) {
        await markAsRead(notification.id);
      }
      return notification;
    },
    [markAsRead]
  );

  const markAllAsRead = useCallback(async () => {
    setIsUpdating(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    setIsUpdating(false);
    return { success: true };
  }, []);

  const clearError = useCallback(() => {
    setError("");
  }, []);

  return {
    notifications,
    unreadCount,

    isLoading,
    isUpdating,

    error,

    loadNotifications,
    loadUnreadCount,
    refreshNotifications,

    markAsRead,
    openNotification,
    markAllAsRead,

    clearError,
  };
};

export default useFarmerNotifications;
