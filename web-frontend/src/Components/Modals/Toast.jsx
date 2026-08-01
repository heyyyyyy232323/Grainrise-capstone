import { useEffect } from "react";
import { Check, AlertCircle, Info, X } from "lucide-react";

const Toast = ({
  isOpen,
  message,
  type = "success", // success, error, info
  duration = 3000,
  onClose,
}) => {
  useEffect(() => {
    if (isOpen && duration) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const toastStyles = {
    success: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-800",
      icon: "text-green-600",
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
      icon: "text-red-600",
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-800",
      icon: "text-blue-600",
    },
  };

  const style = toastStyles[type] || toastStyles.info;

  const iconMap = {
    success: <Check size={20} />,
    error: <AlertCircle size={20} />,
    info: <Info size={20} />,
  };

  return (
    <div className="fixed top-20 right-6 z-[60]">
      <div
        className={`${style.bg} ${style.border} border rounded-lg shadow-lg p-4 flex items-center gap-3 max-w-md animate-slide-in`}
      >
        <div className={`${style.icon} flex-shrink-0`}>{iconMap[type]}</div>
        <p className={`${style.text} text-sm font-medium flex-1`}>{message}</p>
        <button
          onClick={onClose}
          className={`${style.text} flex-shrink-0 opacity-70 hover:opacity-100 transition`}
        >
          <X size={16} />
        </button>
      </div>

      <style>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(400px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Toast;
