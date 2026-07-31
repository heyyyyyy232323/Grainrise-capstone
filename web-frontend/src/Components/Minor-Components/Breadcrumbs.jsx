import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const Breadcrumbs = ({ items = [] }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 mb-4">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1.5">
          {item.path ? (
            <Link
              to={item.path}
              className="text-gray-600 hover:text-gray-900 text-xs font-medium transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-600 text-xs font-medium">
              {item.label}
            </span>
          )}
          
          {index < items.length - 1 && (
            <ChevronRight size={12} className="text-gray-400" />
          )}
        </div>
      ))}
    </div>
  );
};

export default Breadcrumbs;