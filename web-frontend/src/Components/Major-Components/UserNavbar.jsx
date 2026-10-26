import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  PanelLeft,
  Search,
  Bell,
  ChevronDown,
  CircleUserRound,
  Moon,
  CircleHelp,
  LogOut,
  AlertCircle,
} from "lucide-react";

import useAuth from "../hooks/useAuth";
import useAdminNotifications from "../hooks/AccountAdmin/useAdminNotifications";
import useFarmerNotifications from "../hooks/Farmer/UseFarmerNotifications";
import useEncoderNotifications from "../hooks/MillerEncoder/useEncoderNotifications";
import useProcurementNotifications from "../hooks/MillerProcurement/useProcurementNotifications";
import useFinanceNotifications from "../hooks/MillerFinance/useFinanceNotifications";
import useSalesNotifications from "../hooks/MillerSales/useSalesNotifications";
import useLogisticsNotifications from "../hooks/MillerLogistics/useLogisticsNotifications";
import useDriverNotifications from "../hooks/MillerDriver/useDriverNotifications";



// ============================================================
// SHARED NAVBAR MENU ITEMS
// ============================================================

export const getUserNavbarMenuItems = (
  navigate,
  onLogout
) => [
  {
    label: "Help Center",

    onClick: () => {
      navigate("/admin/help-center");
    },
  },

  {
    label: "Logout",

    onClick: () => {
      if (onLogout) {
        onLogout();
        return;
      }

      navigate("/login");
    },
  },
];


// ============================================================
// FALLBACK NOTIFICATIONS
// ============================================================
// Used only by other roles that do not yet have their
// own functional notification APIs.
//
// Account Admin and Farmer do NOT use these.
// ============================================================

export const getUserNavbarNotifications = () => [
  {
    id: "notif-1",
    title: "Low Stock Alert",
    description:
      "Dinorado Rice has reached the minimum stock level.",
    time: "15 mins",
    read: false,
    onView: () =>
      alert("Open stock details"),
  },

  {
    id: "notif-2",
    title: "Low Stock Alert",
    description:
      "Dinorado Rice has reached the minimum stock level.",
    time: "15 mins",
    read: false,
    onView: () =>
      alert("Open stock details"),
  },

  {
    id: "notif-3",
    title: "Low Stock Alert",
    description:
      "Dinorado Rice has reached the minimum stock level.",
    time: "15 mins",
    read: false,
    onView: () =>
      alert("Open stock details"),
  },

  {
    id: "notif-4",
    title: "Low Stock Alert",
    description:
      "Dinorado Rice has reached the minimum stock level.",
    time: "15 mins",
    read: false,
    onView: () =>
      alert("Open stock details"),
  },
];


// ============================================================
// HELPERS
// ============================================================

const formatNotificationTime = (
  value
) => {
  if (!value) {
    return "Recently";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Recently";
  }


  const difference =
    Date.now() -
    date.getTime();


  if (difference < 0) {
    return "Just now";
  }


  const minute =
    60 * 1000;

  const hour =
    60 * minute;

  const day =
    24 * hour;

  const week =
    7 * day;


  if (
    difference < minute
  ) {
    return "Just now";
  }


  if (
    difference < hour
  ) {
    const minutes =
      Math.floor(
        difference /
        minute
      );


    return `${minutes} ${
      minutes === 1
        ? "min"
        : "mins"
    }`;
  }


  if (
    difference < day
  ) {
    const hours =
      Math.floor(
        difference /
        hour
      );


    return `${hours} ${
      hours === 1
        ? "hour"
        : "hours"
    }`;
  }


  if (
    difference < week
  ) {
    const days =
      Math.floor(
        difference /
        day
      );


    return `${days} ${
      days === 1
        ? "day"
        : "days"
    }`;
  }


  return date.toLocaleDateString(
    "en-PH",
    {
      month: "short",
      day: "numeric",
    }
  );
};


// ============================================================
// USER NAVBAR
// ============================================================

const UserNavbar = ({
  user = {
    name: "",
    email: "",
    avatarUrl: "",
  },

  role: propRole,

  notificationCount = 0,

  onToggleSidebar,

  onSearch,

  menuItems = [],

  notificationItems = [],

  onMarkAllAsRead,

  onProfileClick,
}) => {
  const navigate =
    useNavigate();


  // =========================================================
  // AUTHENTICATED SESSION
  // =========================================================

  const {
    user: authenticatedUser,
    role,
    logout,
  } = useAuth();


  const isAdmin =
    role === "admin";


  const isFarmer =
    role === "farmer";


  const isEncoder =
    propRole === "supplier_encoder" ||
    role === "supplier_encoder" ||
    role === "miller_encoder" ||
    (authenticatedUser?.account_type === "supplier_employee" &&
      authenticatedUser?.position === "encoder") ||
    (authenticatedUser?.role === "supplier_employee" &&
      authenticatedUser?.position === "encoder");


  const isProcurement =
    propRole === "supplier_procurement" ||
    propRole === "miller_procurement" ||
    role === "supplier_procurement" ||
    role === "miller_procurement" ||
    (authenticatedUser?.account_type === "supplier_employee" &&
      authenticatedUser?.position === "procurement") ||
    (authenticatedUser?.role === "supplier_employee" &&
      authenticatedUser?.position === "procurement");

  const isFinance =
    propRole === "supplier_finance" ||
    propRole === "miller_finance" ||
    role === "supplier_finance" ||
    role === "miller_finance" ||
    (authenticatedUser?.account_type === "supplier_employee" &&
      authenticatedUser?.position === "finance") ||
    (authenticatedUser?.role === "supplier_employee" &&
      authenticatedUser?.position === "finance");

  const isSales =
    propRole === "supplier_sales" ||
    propRole === "miller_sales" ||
    propRole === "warehouse_sales" ||
    role === "supplier_sales" ||
    role === "miller_sales" ||
    role === "warehouse_sales" ||
    (authenticatedUser?.account_type === "supplier_employee" &&
      (authenticatedUser?.position === "sales" ||
        authenticatedUser?.position === "seller")) ||
    (authenticatedUser?.role === "supplier_employee" &&
      (authenticatedUser?.position === "sales" ||
        authenticatedUser?.position === "seller"));

  const isLogistics =
    propRole === "supplier_logistics" ||
    propRole === "miller_logistics" ||
    propRole === "warehouse_logistics" ||
    role === "supplier_logistics" ||
    role === "miller_logistics" ||
    role === "warehouse_logistics" ||
    (authenticatedUser?.account_type === "supplier_employee" &&
      (authenticatedUser?.position === "logistics" ||
        authenticatedUser?.position === "fulfillment_logistics_coordinator")) ||
    (authenticatedUser?.role === "supplier_employee" &&
      (authenticatedUser?.position === "logistics" ||
        authenticatedUser?.position === "fulfillment_logistics_coordinator"));

  const isDriver =
    propRole === "miller_driver" ||
    propRole === "warehouse_driver" ||
    role === "miller_driver" ||
    role === "warehouse_driver" ||
    (authenticatedUser?.account_type === "supplier_employee" &&
      (authenticatedUser?.position === "driver" ||
        authenticatedUser?.position === "delivery_driver")) ||
    (authenticatedUser?.role === "supplier_employee" &&
      (authenticatedUser?.position === "driver" ||
        authenticatedUser?.position === "delivery_driver"));




  // =========================================================
  // ACTUAL LOGGED-IN USER DISPLAY
  // =========================================================

  const authenticatedName =
    [
      authenticatedUser
        ?.first_name,

      authenticatedUser
        ?.last_name,
    ]
      .filter(
        (
          value
        ) =>
          String(
            value || ""
          ).trim()
      )
      .join(" ")
      .trim();


  const displayUser = {
    name:
      authenticatedName ||
      authenticatedUser
        ?.full_name ||
      authenticatedUser
        ?.name ||
      authenticatedUser
        ?.username ||
      user?.name ||
      "User",

    email:
      authenticatedUser
        ?.email ||
      user?.email ||
      "",

    avatarUrl:
      authenticatedUser
        ?.avatarUrl ||
      authenticatedUser
        ?.avatar_url ||
      user?.avatarUrl ||
      "",
  };


  // =========================================================
  // ACCOUNT ADMIN NOTIFICATIONS
  // =========================================================

  const {
    notifications:
      adminNotifications,

    unreadCount:
      adminUnreadCount,

    isLoading:
      isLoadingAdminNotifications,

    isUpdating:
      isUpdatingAdminNotifications,

    error:
      adminNotificationError,

    loadUnreadCount,

    refreshNotifications,

    openNotification:
      openAdminNotification,

    markAllAsRead:
      markAllAdminNotificationsAsRead,
  } = useAdminNotifications({
    enabled:
      isAdmin,
  });


  // =========================================================
  // FARMER NOTIFICATIONS
  // =========================================================

  const {
    notifications:
      farmerNotifications,

    unreadCount:
      farmerUnreadCount,

    isLoading:
      isLoadingFarmerNotifications,

    isUpdating:
      isUpdatingFarmerNotifications,

    error:
      farmerNotificationError,

    loadUnreadCount:
      loadFarmerUnreadCount,

    refreshNotifications:
      refreshFarmerNotifications,

    openNotification:
      openFarmerNotification,

    markAllAsRead:
      markAllFarmerNotificationsAsRead,
  } = useFarmerNotifications({
    enabled:
      isFarmer,
  });


  // =========================================================
  // MILLER ENCODER NOTIFICATIONS
  // =========================================================

  const {
    notifications:
      encoderNotifications,

    unseenCount:
      encoderUnseenCount,

    isLoading:
      isLoadingEncoderNotifications,

    isUpdating:
      isUpdatingEncoderNotifications,

    error:
      encoderNotificationError,

    loadUnseenCount:
      loadEncoderUnseenCount,

    refreshNotifications:
      refreshEncoderNotifications,

    openNotification:
      openEncoderNotification,
  } = useEncoderNotifications({
    enabled:
      isEncoder,
  });


  // =========================================================
  // MILLER PROCUREMENT NOTIFICATIONS
  // =========================================================

  const {
    notifications:
      procurementNotifications,

    unseenCount:
      procurementUnseenCount,

    isLoading:
      isLoadingProcurementNotifications,

    isUpdating:
      isUpdatingProcurementNotifications,

    error:
      procurementNotificationError,

    loadUnseenCount:
      loadProcurementUnseenCount,

    refreshNotifications:
      refreshProcurementNotifications,

    openNotification:
      openProcurementNotification,

    markAllAsRead:
      markAllProcurementNotificationsAsRead,
  } = useProcurementNotifications({
    enabled:
      isProcurement,
  });


  // =========================================================
  // MILLER FINANCE NOTIFICATIONS
  // =========================================================

  const {
    notifications:
      financeNotifications,

    unseenCount:
      financeUnseenCount,

    isLoading:
      isLoadingFinanceNotifications,

    isUpdating:
      isUpdatingFinanceNotifications,

    error:
      financeNotificationError,

    loadUnseenCount:
      loadFinanceUnseenCount,

    refreshNotifications:
      refreshFinanceNotifications,

    openNotification:
      openFinanceNotification,

    markAllAsRead:
      markAllFinanceNotificationsAsRead,
  } = useFinanceNotifications({
    enabled:
      isFinance,
  });


  // =========================================================
  // MILLER SALES NOTIFICATIONS
  // =========================================================

  const {
    notifications:
      salesNotifications,

    unseenCount:
      salesUnseenCount,

    isLoading:
      isLoadingSalesNotifications,

    isUpdating:
      isUpdatingSalesNotifications,

    error:
      salesNotificationError,

    loadUnseenCount:
      loadSalesUnseenCount,

    refreshNotifications:
      refreshSalesNotifications,

    openNotification:
      openSalesNotification,

    markAllAsRead:
      markAllSalesNotificationsAsRead,
  } = useSalesNotifications({
    enabled:
      isSales,
  });


  // =========================================================
  // MILLER LOGISTICS NOTIFICATIONS
  // =========================================================

  const {
    notifications:
      logisticsNotifications,

    unseenCount:
      logisticsUnseenCount,

    isLoading:
      isLoadingLogisticsNotifications,

    isUpdating:
      isUpdatingLogisticsNotifications,

    error:
      logisticsNotificationError,

    loadUnseenCount:
      loadLogisticsUnseenCount,

    refreshNotifications:
      refreshLogisticsNotifications,

    openNotification:
      openLogisticsNotification,

    markAllAsRead:
      markAllLogisticsNotificationsAsRead,
  } = useLogisticsNotifications({
    enabled:
      isLogistics,
  });

  // =========================================================
  // DRIVER NOTIFICATIONS
  // =========================================================

  const {
    notifications: driverNotifications,
    unseenCount: driverUnseenCount,
    isLoading: isLoadingDriverNotifications,
    isUpdating: isUpdatingDriverNotifications,
    error: driverNotificationError,
    refreshNotifications: refreshDriverNotifications,
    openNotification: openDriverNotification,
    markAllAsRead: markAllDriverNotificationsAsRead,
  } = useDriverNotifications({
    enabled: isDriver,
  });




  // =========================================================
  // NAVBAR STATE
  // =========================================================

  const [
    menuOpen,
    setMenuOpen,
  ] = useState(false);


  const [
    notificationOpen,
    setNotificationOpen,
  ] = useState(false);


  const [
    darkModeEnabled,
    setDarkModeEnabled,
  ] = useState(false);


  // =========================================================
  // FALLBACK NOTIFICATION STATE
  // =========================================================

  const [
    notifications,
    setNotifications,
  ] = useState(
    notificationItems.length > 0
      ? notificationItems
      : getUserNavbarNotifications()
  );


  const menuRef =
    useRef(null);


  const notificationRef =
    useRef(null);


  // =========================================================
  // SYNC EXTERNAL NOTIFICATIONS
  // =========================================================

  useEffect(
    () => {
      if (
        notificationItems.length >
        0
      ) {
        setNotifications(
          notificationItems
        );
      }
    },
    [
      notificationItems,
    ]
  );


  // =========================================================
  // DATABASE NOTIFICATION BADGE REFRESH
  // =========================================================

  useEffect(
    () => {
      if (
        !isAdmin &&
        !isFarmer &&
        !isEncoder &&
        !isProcurement &&
        !isFinance &&
        !isSales &&
        !isLogistics
      ) {
        return undefined;
      }


      const interval =
        window.setInterval(
          () => {
            const refreshCount =
              isAdmin
                ? loadUnreadCount
                : isFarmer
                  ? loadFarmerUnreadCount
                  : isEncoder
                    ? loadEncoderUnseenCount
                    : isProcurement
                      ? loadProcurementUnseenCount
                      : isFinance
                        ? loadFinanceUnseenCount
                        : isSales
                          ? loadSalesUnseenCount
                          : loadLogisticsUnseenCount;


            refreshCount().catch(
              () => {
                // Error stored by hook.
              }
            );
          },
          60000
        );


      return () => {
        window.clearInterval(
          interval
        );
      };
    },
    [
      isAdmin,
      isFarmer,
      isEncoder,
      isProcurement,
      isFinance,
      isSales,
      isLogistics,
      loadUnreadCount,
      loadFarmerUnreadCount,
      loadEncoderUnseenCount,
      loadProcurementUnseenCount,
      loadFinanceUnseenCount,
      loadSalesUnseenCount,
      loadLogisticsUnseenCount,
    ]
  );



  // =========================================================
  // THEME INITIALIZATION
  // =========================================================

  useEffect(
    () => {
      try {
        const saved =
          localStorage.getItem(
            "theme"
          );


        if (
          saved === "light"
        ) {
          document
            .documentElement
            .classList
            .add("light");
          document
            .documentElement
            .classList
            .remove("dark");

          setDarkModeEnabled(
            false
          );

        } else if (
          saved === "dark"
        ) {
          document
            .documentElement
            .classList
            .add("dark");
          document
            .documentElement
            .classList
            .remove("light");

          setDarkModeEnabled(
            true
          );

        } else {
          document
            .documentElement
            .classList
            .add("light");
          document
            .documentElement
            .classList
            .remove("dark");

          localStorage.setItem(
            "theme",
            "light"
          );

          setDarkModeEnabled(
            false
          );
        }

      } catch {
        // Ignore unavailable localStorage.
      }
    },
    []
  );


  // =========================================================
  // TOGGLE THEME
  // =========================================================

  const toggleTheme = () => {
    setDarkModeEnabled(
      (
        previous
      ) => {
        const next =
          !previous;


        try {
          if (next) {
            document
              .documentElement
              .classList
              .add("dark");
            document
              .documentElement
              .classList
              .remove("light");

            localStorage.setItem(
              "theme",
              "dark"
            );

          } else {
            document
              .documentElement
              .classList
              .add("light");
            document
              .documentElement
              .classList
              .remove("dark");

            localStorage.setItem(
              "theme",
              "light"
            );
          }

        } catch {
          // Ignore unavailable localStorage.
        }


        return next;
      }
    );
  };


  // =========================================================
  // CLICK OUTSIDE
  // =========================================================

  useEffect(
    () => {
      const handleClickOutside =
        (
          event
        ) => {
          if (
            menuRef.current &&
            !menuRef.current.contains(
              event.target
            )
          ) {
            setMenuOpen(
              false
            );
          }


          if (
            notificationRef.current &&
            !notificationRef.current.contains(
              event.target
            )
          ) {
            setNotificationOpen(
              false
            );
          }
        };


      document.addEventListener(
        "mousedown",
        handleClickOutside
      );


      return () => {
        document.removeEventListener(
          "mousedown",
          handleClickOutside
        );
      };
    },
    []
  );


  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = () => {
    const confirmed =
      window.confirm(
        "Are you sure you want to log out of GrainRise?"
      );


    if (!confirmed) {
      return;
    }


    setMenuOpen(
      false
    );

    setNotificationOpen(
      false
    );


    logout();


    navigate(
      isAdmin
        ? "/admin-login"
        : "/login",
      {
        replace: true,
      }
    );
  };


  // =========================================================
  // EFFECTIVE MENU ITEMS
  // =========================================================

  const effectiveMenuItems =
    menuItems.length > 0
      ? menuItems
      : getUserNavbarMenuItems(
          navigate,
          handleLogout
        );


  // =========================================================
  // EFFECTIVE NOTIFICATIONS
  // =========================================================

  const effectiveNotifications =
    isAdmin
      ? adminNotifications
      : isFarmer
        ? farmerNotifications
        : isEncoder
          ? encoderNotifications
          : isProcurement
            ? procurementNotifications
            : isFinance
              ? financeNotifications
              : isSales
                ? salesNotifications
                : isLogistics
                  ? logisticsNotifications
                  : isDriver
                    ? driverNotifications
                    : notifications;


  const usesDatabaseNotifications =
    isAdmin ||
    isFarmer ||
    isEncoder ||
    isProcurement ||
    isFinance ||
    isSales ||
    isLogistics ||
    isDriver;



  const isLoadingDatabaseNotifications =
    isAdmin
      ? isLoadingAdminNotifications
      : isFarmer
        ? isLoadingFarmerNotifications
        : isEncoder
          ? isLoadingEncoderNotifications
          : isProcurement
            ? procurementNotifications
            : isFinance
              ? isLoadingFinanceNotifications
              : isSales
                ? isLoadingSalesNotifications
                : isLogistics
                  ? isLoadingLogisticsNotifications
                  : isDriver
                    ? isLoadingDriverNotifications
                    : false;


  const isUpdatingDatabaseNotifications =
    isAdmin
      ? isUpdatingAdminNotifications
      : isFarmer
        ? isUpdatingFarmerNotifications
        : isEncoder
          ? isUpdatingEncoderNotifications
          : isProcurement
            ? isUpdatingProcurementNotifications
            : isFinance
              ? isUpdatingFinanceNotifications
              : isSales
                ? isUpdatingSalesNotifications
                : isLogistics
                  ? isUpdatingLogisticsNotifications
                  : isDriver
                    ? isUpdatingDriverNotifications
                    : false;


  const databaseNotificationError =
    isAdmin
      ? adminNotificationError
      : isFarmer
        ? farmerNotificationError
        : isEncoder
          ? encoderNotificationError
          : isProcurement
            ? procurementNotificationError
            : isFinance
              ? financeNotificationError
              : isSales
                ? salesNotificationError
                : isLogistics
                  ? logisticsNotificationError
                  : isDriver
                    ? driverNotificationError
                    : "";



  // =========================================================
  // BADGE COUNT
  // =========================================================

  const localUnreadCount =
    notifications.filter(
      (
        item
      ) =>
        !item.read
    ).length;


  const badgeCount =
    isAdmin
      ? adminUnreadCount
      : isFarmer
        ? farmerUnreadCount
        : isEncoder
          ? encoderUnseenCount
          : isProcurement
            ? procurementUnseenCount
            : isFinance
              ? financeUnseenCount
              : isSales
                ? salesUnseenCount
                : isLogistics
                  ? logisticsUnseenCount
                  : isDriver
                    ? driverUnseenCount
                    : (
                        notificationCount ||
                        localUnreadCount
                      );




  // =========================================================
  // TOGGLE NOTIFICATIONS
  // =========================================================

  const handleNotificationToggle =
    () => {
      const willOpen =
        !notificationOpen;


      setNotificationOpen(
        willOpen
      );


      setMenuOpen(
        false
      );


      if (
        willOpen &&
        isAdmin
      ) {
        refreshNotifications().catch(
          () => {
            // Hook already stores error.
          }
        );

        return;
      }


      if (
        willOpen &&
        isFarmer
      ) {
        refreshFarmerNotifications().catch(
          () => {
            // Hook already stores error.
          }
        );

        return;
      }


      if (
        willOpen &&
        isEncoder
      ) {
        refreshEncoderNotifications().catch(
          () => {
            // Hook already stores error.
          }
        );

        return;
      }


      if (
        willOpen &&
        isProcurement
      ) {
        refreshProcurementNotifications().catch(
          () => {
            // Hook already stores error.
          }
        );
        return;
      }

      if (
        willOpen &&
        isFinance
      ) {
        refreshFinanceNotifications().catch(
          () => {
            // Hook already stores error.
          }
        );
        return;
      }

      if (
        willOpen &&
        isSales
      ) {
        refreshSalesNotifications().catch(
          () => {
            // Hook already stores error.
          }
        );
        return;
      }

      if (
        willOpen &&
        isLogistics
      ) {
        refreshLogisticsNotifications().catch(
          () => {
            // Hook already stores error.
          }
        );
        return;
      }

      if (
        willOpen &&
        isDriver
      ) {
        refreshDriverNotifications().catch(
          () => {
            // Hook already stores error.
          }
        );
        return;
      }
    };




  // =========================================================
  // MARK ALL AS READ
  // =========================================================

  const handleMarkAllAsRead =
    async () => {
      if (isAdmin) {
        if (
          adminUnreadCount <= 0 ||
          isUpdatingAdminNotifications
        ) {
          return;
        }


        try {
          await markAllAdminNotificationsAsRead();

        } catch {
          // Error remains available from hook.
        }


        return;
      }


      if (isFarmer) {
        if (
          farmerUnreadCount <= 0 ||
          isUpdatingFarmerNotifications
        ) {
          return;
        }


        try {
          await markAllFarmerNotificationsAsRead();

        } catch {
          // Error remains available from hook.
        }


        return;
      }


      if (isProcurement) {
        if (
          procurementUnseenCount <= 0 ||
          isUpdatingProcurementNotifications
        ) {
          return;
        }

        try {
          await markAllProcurementNotificationsAsRead();
        } catch {
          // Error remains available from hook.
        }

        return;
      }

      if (isFinance) {
        if (
          financeUnseenCount <= 0 ||
          isUpdatingFinanceNotifications
        ) {
          return;
        }

        try {
          await markAllFinanceNotificationsAsRead();
        } catch {
          // Error remains available from hook.
        }

        return;
      }

      if (isSales) {
        if (
          salesUnseenCount <= 0 ||
          isUpdatingSalesNotifications
        ) {
          return;
        }

        try {
          await markAllSalesNotificationsAsRead();
        } catch {
          // Error remains available from hook.
        }

        return;
      }

      if (isLogistics) {
        if (
          logisticsUnseenCount <= 0 ||
          isUpdatingLogisticsNotifications
        ) {
          return;
        }

        try {
          await markAllLogisticsNotificationsAsRead();
        } catch {
          // Error remains available from hook.
        }

        return;
      }

      if (isDriver) {
        if (
          driverUnseenCount <= 0 ||
          isUpdatingDriverNotifications
        ) {
          return;
        }

        try {
          await markAllDriverNotificationsAsRead();
        } catch {
          // Error remains available from hook.
        }

        return;
      }




      setNotifications(
        (
          previous
        ) =>
          previous.map(
            (
              item
            ) => ({
              ...item,
              read: true,
            })
          )
      );


      onMarkAllAsRead?.();
    };


  // =========================================================
  // OPEN NOTIFICATION
  // =========================================================

  const handleNotificationView =
    async (
      item
    ) => {
      if (isAdmin) {
        const notificationId =
          item?.notification_id;


        if (!notificationId) {
          return;
        }


        try {
          const result =
            await openAdminNotification(
              notificationId
            );


          setNotificationOpen(
            false
          );


          navigate(
            result?.targetPath ||
            "/admin/dashboard"
          );

        } catch {
          // Error displayed inside notification panel.
        }


        return;
      }


      if (isFarmer) {
        const notificationId =
          item?.notification_id;


        if (!notificationId) {
          return;
        }


        try {
          const result =
            await openFarmerNotification(
              notificationId
            );


          setNotificationOpen(
            false
          );


          let targetPath =
            result?.targetPath ||
            "/farmer/dashboard";


          if (
            targetPath ===
            "/farmer/account-settings"
          ) {
            targetPath =
              "/farmer/profile";
          }


          navigate(
            targetPath
          );

        } catch {
          // Error displayed inside notification panel.
        }


        return;
      }


      if (isEncoder) {
        try {
          const result =
            await openEncoderNotification(
              item
            );


          setNotificationOpen(
            false
          );


          const targetPath =
            result?.targetPath ||
            item?.action_url ||
            "/supplier-encoder/stock";


          navigate(
            targetPath
          );

        } catch {
          // Error displayed inside notification panel.
        }


        return;
      }


      if (isProcurement) {
        try {
          const result =
            await openProcurementNotification(
              item
            );

          setNotificationOpen(
            false
          );

          const targetPath =
            result?.targetPath ||
            item?.action_url ||
            "/miller-procurement/dashboard";

          navigate(
            targetPath
          );
        } catch {
          // Error displayed inside notification panel.
        }

        return;
      }

      if (isFinance) {
        try {
          const result =
            await openFinanceNotification(
              item
            );

          setNotificationOpen(
            false
          );

          const targetPath =
            result?.targetPath ||
            item?.action_url ||
            "/miller-finance/dashboard";

          navigate(
            targetPath
          );
        } catch {
          // Error displayed inside notification panel.
        }

        return;
      }

      if (isSales) {
        try {
          const result =
            await openSalesNotification(
              item
            );

          setNotificationOpen(
            false
          );

          const targetPath =
            result?.targetPath ||
            item?.action_url ||
            "/miller-sales/dashboard";

          navigate(
            targetPath
          );
        } catch {
          // Error displayed inside notification panel.
        }

        return;
      }

      if (isLogistics) {
        try {
          const result =
            await openLogisticsNotification(
              item
            );

          setNotificationOpen(
            false
          );

          const targetPath =
            result?.targetPath ||
            item?.action_url ||
            "/miller-logistics/delivery-management";

          navigate(
            targetPath
          );
        } catch {
          // Error displayed inside notification panel.
        }

        return;
      }

      if (isDriver) {
        try {
          const result =
            await openDriverNotification(
              item
            );

          setNotificationOpen(
            false
          );

          const targetPath =
            result?.targetPath ||
            item?.action_url ||
            "/miller-driver/my-duties";

          navigate(
            targetPath
          );
        } catch {
          // Error displayed inside notification panel.
        }

        return;
      }




      item?.onView?.(
        item
      );
    };


  // =========================================================
  // MY ACCOUNT
  // =========================================================

  const handleMyAccountClick =
    () => {
      setMenuOpen(
        false
      );


      if (onProfileClick) {
        onProfileClick();
        return;
      }


      if (isAdmin) {
        navigate(
          "/admin/profile"
        );

        return;
      }


      if (isFarmer) {
        navigate(
          "/farmer/profile"
        );

        return;
      }


      navigate(
        "/account-profile"
      );
    };


  // =========================================================
  // RENDER
  // =========================================================

  return (
    <header className="dark-readable-navbar h-18.25 w-full bg-white border-b border-gray-200 flex items-center gap-2 sm:gap-4 px-4 sm:px-6 z-30">

      {/* =====================================================
          SIDEBAR TOGGLE
      ===================================================== */}

      <button
        type="button"
        onClick={
          onToggleSidebar
        }
        className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition shrink-0 cursor-pointer"
        aria-label="Toggle sidebar"
      >
        <PanelLeft
          size={18}
        />
      </button>


      {/* =====================================================
          SEARCH
      ===================================================== */}

      <div className="relative flex-1 max-w-xl hidden sm:flex">

        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
        />

        <input
          type="text"
          placeholder="Search"
          onChange={(
            event
          ) =>
            onSearch?.(
              event.target.value
            )
          }
          className="w-full pl-10 pr-4 py-2.5 rounded-full border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-100 focus:border-green-600 transition"
        />

      </div>


      <div className="flex-1" />


      {/* =====================================================
          NOTIFICATION BUTTON & PANEL
      ===================================================== */}

      <div
        className="relative"
        ref={
          notificationRef
        }
      >

        <button
          type="button"
          onClick={
            handleNotificationToggle
          }
          className="relative w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition shrink-0 cursor-pointer"
          aria-label="Notifications"
        >

          <Bell
            size={18}
          />


          {
            badgeCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">

                {
                  badgeCount > 99
                    ? "99+"
                    : badgeCount
                }

              </span>
            )
          }

        </button>


        {
          notificationOpen && (
            <div className="dark-readable-notifications absolute right-0 mt-2 w-[min(88vw,20rem)] rounded-xl border border-slate-200 bg-white shadow-2xl z-50 overflow-hidden">

              {/* =============================================
                  HEADER
              ============================================= */}

              <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-gray-200">

                <div className="flex items-center gap-2">

                  <h3 className="text-sm leading-none font-bold text-gray-900">
                    Notifications
                  </h3>


                  {
                    badgeCount > 0 && (
                      <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-red-50 px-1.5 text-[10px] font-bold text-red-600">

                        {
                          badgeCount > 99
                            ? "99+"
                            : badgeCount
                        }

                      </span>
                    )
                  }

                </div>


                {
                  !isEncoder && (
                    <button
                      type="button"
                      onClick={
                        handleMarkAllAsRead
                      }
                      disabled={
                        badgeCount <= 0 ||
                        (
                          usesDatabaseNotifications &&
                          isUpdatingDatabaseNotifications
                        )
                      }
                      className="text-[11px] font-semibold text-[#0B7A2A] hover:text-[#096322] transition cursor-pointer disabled:text-gray-300 disabled:cursor-not-allowed"
                    >

                      {
                        usesDatabaseNotifications &&
                        isUpdatingDatabaseNotifications
                          ? "Updating..."
                          : "Mark all as read"
                      }

                    </button>
                  )
                }
              </div>


              {/* =============================================
                  NOTIFICATION LIST
              ============================================= */}

              <div className="max-h-80 overflow-y-auto px-2 py-2 space-y-1">

                {
                  usesDatabaseNotifications &&
                  isLoadingDatabaseNotifications ? (

                    <div className="flex items-center justify-center py-8">

                      <div className="text-center">

                        <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-[#0B7A2A]" />

                        <p className="text-xs text-gray-500">
                          Loading notifications...
                        </p>

                      </div>

                    </div>

                  ) : effectiveNotifications.length > 0 ? (

                    effectiveNotifications.map(
                      (
                        item
                      ) => {
                        const itemId =
                          usesDatabaseNotifications
                            ? (item?.notification_id || item?.id)
                            : item?.id;


                        const itemRead =
                          usesDatabaseNotifications
                            ? Boolean(
                                item?.is_read || item?.status === "seen"
                              )
                            : Boolean(
                                item?.read
                              );


                        const itemTitle =
                          item?.notification_title ||
                          item?.title ||
                          "Notification";


                        const itemDescription =
                          usesDatabaseNotifications
                            ? (item?.notification_content ||
                                item?.message ||
                                item?.content)
                            : item?.description;


                        const itemTime =
                          usesDatabaseNotifications
                            ? formatNotificationTime(
                                item?.created_at
                              )
                            : item?.time;

                        const seenByName =
                          item?.seen_by_name;


                        return (
                          <div
                            key={
                              itemId
                            }
                            onClick={() =>
                              handleNotificationView(
                                item
                              )
                            }
                            className={`dark-readable-notification-item p-3 border-b border-slate-100 last:border-b-0 cursor-pointer hover:bg-slate-50 transition-colors ${
                              itemRead
                                ? "bg-white"
                                : "bg-[#F0F8F1]"
                            }`}
                          >

                            <div className="flex items-start gap-3">

                              <div className="w-8 h-8 rounded-full bg-amber-400 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">

                                <AlertCircle
                                  size={16}
                                />

                              </div>


                              <div className="flex-1 min-w-0">

                                <div className="flex items-start justify-between gap-2">

                                  <div className="flex min-w-0 items-start gap-1.5">

                                    {
                                      !itemRead && (
                                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0B7A2A]" />
                                      )
                                    }


                                    <p className="text-xs leading-tight font-bold text-gray-900">
                                      {
                                        itemTitle
                                      }
                                    </p>

                                  </div>


                                  <span className="text-[10px] font-semibold text-gray-500 whitespace-nowrap pt-0.5">
                                    {
                                      itemTime
                                    }
                                  </span>

                                </div>


                                <p className="text-[11px] leading-4 text-gray-500 mt-1">

                                  {
                                    itemDescription ||
                                    "No additional details."
                                  }

                                </p>


                                {
                                  seenByName && (
                                    <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-medium text-emerald-700">
                                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                      <span>Seen by {seenByName}</span>
                                    </div>
                                  )
                                }


                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleNotificationView(
                                      item
                                    );
                                  }}
                                  disabled={
                                    usesDatabaseNotifications &&
                                    isUpdatingDatabaseNotifications
                                  }
                                  className="mt-2.5 inline-flex items-center rounded-full bg-[#007A1F] px-3 py-1 text-[11px] font-bold text-white hover:bg-[#006218] transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                >

                                  {
                                    usesDatabaseNotifications
                                      ? "View"
                                      : (
                                          item?.actionLabel ||
                                          "View Stock"
                                        )
                                  }

                                </button>

                              </div>

                            </div>

                          </div>
                        );
                      }
                    )

                  ) : (

                    <div className="px-4 py-8 text-center">

                      <Bell
                        size={24}
                        className="mx-auto text-gray-300"
                      />

                      <p className="mt-2 text-xs font-semibold text-gray-600">
                        No notifications yet.
                      </p>

                      <p className="mt-1 text-[11px] text-gray-400">
                        New activity will appear here.
                      </p>

                    </div>

                  )
                }

              </div>


              {/* =============================================
                  ERROR
              ============================================= */}

              {
                usesDatabaseNotifications &&
                databaseNotificationError && (

                  <div className="border-t border-red-100 bg-red-50 px-3 py-2">

                    <p className="text-[11px] text-red-600">
                      {
                        databaseNotificationError
                      }
                    </p>

                  </div>

                )
              }

            </div>
          )
        }

      </div>


      {/* =====================================================
          USER DROPDOWN
      ===================================================== */}

      <div
        className="relative"
        ref={
          menuRef
        }
      >

        <button
          type="button"
          onClick={() => {
            setMenuOpen(
              (
                previous
              ) =>
                !previous
            );

            setNotificationOpen(
              false
            );
          }}
          className="flex items-center gap-2 sm:gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-gray-50 transition cursor-pointer"
        >

          {
            displayUser.avatarUrl ? (

              <img
                src={
                  displayUser.avatarUrl
                }
                alt={
                  displayUser.name
                }
                className="w-9 h-9 rounded-full object-cover"
              />

            ) : (

              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-600 to-yellow-400 flex items-center justify-center text-white text-sm font-bold">

                {
                  displayUser.name
                    ?.charAt(0)
                    ?.toUpperCase() ||
                  "U"
                }

              </div>

            )
          }


          <div className="text-left hidden sm:block">

            <p className="text-sm font-semibold text-gray-800 leading-tight">
              {
                displayUser.name
              }
            </p>

            <p className="text-xs text-gray-500 leading-tight">
              {
                displayUser.email
              }
            </p>

          </div>


          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform hidden sm:block ${
              menuOpen
                ? "rotate-180"
                : ""
            }`}
          />

        </button>


        {
          menuOpen && (
            <div className="dark-readable-account absolute right-0 mt-2 w-[min(80vw,15rem)] rounded-xl border border-gray-200 bg-[#EDF4EE] shadow-2xl z-50 overflow-hidden p-2">

              {/* =============================================
                  MY ACCOUNT
              ============================================= */}

              <button
                type="button"
                onClick={
                  handleMyAccountClick
                }
                className="w-full rounded-lg bg-[#DDE7DF] hover:bg-[#d0dfd3] px-2.5 py-2 flex items-center gap-2 text-[#006A1E] mb-1.5 transition cursor-pointer"
              >

                <CircleUserRound
                  size={18}
                  className="shrink-0"
                />

                <span className="text-sm leading-none font-bold">
                  My Account
                </span>

              </button>


              {/* =============================================
                  DARK MODE
              ============================================= */}

              <div className="w-full flex items-center justify-between px-1.5 py-1.5 text-left text-gray-500">

                <span className="flex items-center gap-1.5 text-sm leading-none">

                  <Moon
                    size={16}
                  />

                  <span className="text-sm">
                    Dark Mode
                  </span>

                </span>


                <button
                  type="button"
                  aria-label="Toggle dark mode"
                  onClick={
                    toggleTheme
                  }
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition cursor-pointer ${
                    darkModeEnabled
                      ? "bg-[#0B7A2A]"
                      : "bg-gray-300"
                  }`}
                >

                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
                      darkModeEnabled
                        ? "translate-x-4.5"
                        : "translate-x-1"
                    }`}
                  />

                </button>

              </div>


              {/* =============================================
                  MENU ITEMS
              ============================================= */}

              <div className="space-y-0.5">

                {
                  effectiveMenuItems.map(
                    (
                      item
                    ) => {
                      const normalizedLabel =
                        String(
                          item?.label ||
                          ""
                        )
                          .trim()
                          .toLowerCase();


                      const isLogout =
                        normalizedLabel.includes(
                          "logout"
                        ) ||
                        normalizedLabel.includes(
                          "log out"
                        );


                      return (
                        <button
                          key={
                            item.label
                          }
                          type="button"
                          onClick={() => {
                            if (
                              isLogout
                            ) {
                              handleLogout();
                              return;
                            }


                            item.onClick?.();


                            setMenuOpen(
                              false
                            );
                          }}
                          className={`w-full flex items-center gap-1.5 px-1.5 py-1.5 text-left transition cursor-pointer ${
                            isLogout
                              ? "mt-0.5 pt-2 border-t border-gray-300 text-red-600 hover:text-red-700"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                        >

                          {
                            isLogout ? (

                              <LogOut
                                size={16}
                              />

                            ) : (

                              <CircleHelp
                                size={16}
                              />

                            )
                          }


                          <span className="text-sm leading-none">
                            {
                              item.label
                            }
                          </span>

                        </button>
                      );
                    }
                  )
                }

              </div>

            </div>
          )
        }

      </div>

    </header>
  );
};


export default UserNavbar;