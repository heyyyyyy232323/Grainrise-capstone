import {
  useCallback,
  useEffect,
  useState,
} from "react";

import useApi from "../useApi";


// ============================================================
// HOOK
// ============================================================

const useAdminNotifications = ({
  enabled = true,
} = {}) => {
  const {
    request,
  } = useApi();


  // =========================================================
  // NOTIFICATIONS
  // =========================================================

  const [
    notifications,
    setNotifications,
  ] = useState([]);


  // =========================================================
  // UNREAD COUNT
  // =========================================================

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);


  // =========================================================
  // LOADING STATES
  // =========================================================

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);


  const [
    isUpdating,
    setIsUpdating,
  ] = useState(false);


  // =========================================================
  // ERROR
  // =========================================================

  const [
    error,
    setError,
  ] = useState("");


  // =========================================================
  // LOAD NOTIFICATIONS
  // =========================================================

  const loadNotifications =
    useCallback(
      async ({
        limit = 30,
      } = {}) => {
        if (!enabled) {
          setNotifications([]);
          setUnreadCount(0);

          return [];
        }


        setIsLoading(true);
        setError("");


        try {
          const response =
            await request(
              `/admin/notifications/?limit=${encodeURIComponent(
                limit
              )}`,
              {
                method: "GET",
                throwOnError: true,
              }
            );


          const results =
            Array.isArray(
              response?.results
            )
              ? response.results
              : [];


          setNotifications(
            results
          );


          setUnreadCount(
            Number(
              response?.unread_count ||
              0
            )
          );


          return results;

        } catch (err) {
          const message =
            err?.message ||
            "Unable to load notifications.";


          setError(
            message
          );


          throw err;

        } finally {
          setIsLoading(false);
        }
      },
      [
        enabled,
        request,
      ]
    );


  // =========================================================
  // LOAD UNREAD COUNT
  // =========================================================

  const loadUnreadCount =
    useCallback(
      async () => {
        if (!enabled) {
          setUnreadCount(0);

          return 0;
        }


        try {
          const response =
            await request(
              "/admin/notifications/unread-count/",
              {
                method: "GET",
                throwOnError: true,
              }
            );


          const count =
            Number(
              response?.unread_count ||
              0
            );


          setUnreadCount(
            count
          );


          return count;

        } catch (err) {
          const message =
            err?.message ||
            "Unable to load unread notification count.";


          setError(
            message
          );


          throw err;
        }
      },
      [
        enabled,
        request,
      ]
    );


  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(
    () => {
      if (!enabled) {
        setNotifications([]);
        setUnreadCount(0);

        return;
      }


      loadNotifications().catch(
        () => {
          // Hook already stores error state.
        }
      );
    },
    [
      enabled,
      loadNotifications,
    ]
  );


  // =========================================================
  // MARK ONE AS READ
  // =========================================================

  const markAsRead =
    useCallback(
      async (
        notificationId
      ) => {
        if (!enabled) {
          return null;
        }


        if (!notificationId) {
          throw new Error(
            "Notification ID is required."
          );
        }


        setIsUpdating(true);
        setError("");


        try {
          const response =
            await request(
              `/admin/notifications/${notificationId}/read/`,
              {
                method: "POST",
                body: {},
                throwOnError: true,
              }
            );


          const updatedNotification =
            response?.notification ||
            null;


          setNotifications(
            (
              current
            ) =>
              current.map(
                (
                  item
                ) => {
                  if (
                    item?.notification_id !==
                    notificationId
                  ) {
                    return item;
                  }


                  return (
                    updatedNotification ||
                    {
                      ...item,
                      is_read: true,
                    }
                  );
                }
              )
          );


          setUnreadCount(
            Number(
              response?.unread_count ||
              0
            )
          );


          return response;

        } catch (err) {
          const message =
            err?.message ||
            "Unable to mark notification as read.";


          setError(
            message
          );


          throw err;

        } finally {
          setIsUpdating(false);
        }
      },
      [
        enabled,
        request,
      ]
    );


  // =========================================================
  // OPEN NOTIFICATION
  // =========================================================

  const openNotification =
    useCallback(
      async (
        notificationId
      ) => {
        if (!enabled) {
          return null;
        }


        if (!notificationId) {
          throw new Error(
            "Notification ID is required."
          );
        }


        setIsUpdating(true);
        setError("");


        try {
          const response =
            await request(
              `/admin/notifications/${notificationId}/open/`,
              {
                method: "POST",
                body: {},
                throwOnError: true,
              }
            );


          const updatedNotification =
            response?.notification ||
            null;


          setNotifications(
            (
              current
            ) =>
              current.map(
                (
                  item
                ) => {
                  if (
                    item?.notification_id !==
                    notificationId
                  ) {
                    return item;
                  }


                  return (
                    updatedNotification ||
                    {
                      ...item,
                      is_read: true,
                    }
                  );
                }
              )
          );


          setUnreadCount(
            Number(
              response?.unread_count ||
              0
            )
          );


          return {
            ...response,

            targetPath:
              response?.target_path ||
              "/admin/dashboard",
          };

        } catch (err) {
          const message =
            err?.message ||
            "Unable to open notification.";


          setError(
            message
          );


          throw err;

        } finally {
          setIsUpdating(false);
        }
      },
      [
        enabled,
        request,
      ]
    );


  // =========================================================
  // MARK ALL AS READ
  // =========================================================

  const markAllAsRead =
    useCallback(
      async () => {
        if (!enabled) {
          return null;
        }


        setIsUpdating(true);
        setError("");


        try {
          const response =
            await request(
              "/admin/notifications/read-all/",
              {
                method: "POST",
                body: {},
                throwOnError: true,
              }
            );


          setNotifications(
            (
              current
            ) =>
              current.map(
                (
                  item
                ) => ({
                  ...item,

                  is_read: true,

                  read_at:
                    item?.read_at ||
                    new Date().toISOString(),
                })
              )
          );


          setUnreadCount(0);


          return response;

        } catch (err) {
          const message =
            err?.message ||
            "Unable to mark all notifications as read.";


          setError(
            message
          );


          throw err;

        } finally {
          setIsUpdating(false);
        }
      },
      [
        enabled,
        request,
      ]
    );


  // =========================================================
  // REFRESH
  // =========================================================

  const refreshNotifications =
    useCallback(
      async () => {
        return loadNotifications();
      },
      [
        loadNotifications,
      ]
    );


  // =========================================================
  // CLEAR ERROR
  // =========================================================

  const clearError =
    useCallback(
      () => {
        setError("");
      },
      []
    );


  // =========================================================
  // RETURN
  // =========================================================

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


export default useAdminNotifications;