import { Calendar } from "lucide-react";

const DateDisplay = () => {
  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-full">
      <Calendar size={18} className="text-gray-600" />
      <span className="text-sm font-medium text-gray-700">
        {formattedDate}
      </span>
    </div>
  );
};

export default DateDisplay;
