import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const Breadcrumbs = ({ items = [] }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 mb-4">
      {items.map((item, index) => {
        const isCurrent = index === items.length - 1;

        return (
          <div key={index} className="flex items-center gap-1.5">
            {item.path ? (
              <Link
                to={item.path}
                className="text-gray-600 hover:text-gray-900 text-xs font-medium transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={`text-xs font-medium ${isCurrent ? "" : "text-gray-600"}`}
                style={isCurrent ? { color: "#00580C" } : undefined}
              >
                {item.label}
              </span>
            )}

            {index < items.length - 1 && (
              <ChevronRight size={12} className="text-gray-400" />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Breadcrumbs;