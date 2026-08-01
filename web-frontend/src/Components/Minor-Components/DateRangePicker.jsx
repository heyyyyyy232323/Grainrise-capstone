import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";

const DateRangePicker = ({ onDateChange }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleStartDateChange = (e) => {
    const date = e.target.value;
    setStartDate(date);
    onDateChange({ startDate: date, endDate });
  };

  const handleEndDateChange = (e) => {
    const date = e.target.value;
    setEndDate(date);
    onDateChange({ startDate, endDate: date });
  };

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    onDateChange({ startDate: "", endDate: "" });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
      >
        <Calendar size={18} className="text-gray-600" />
        <span className="text-gray-700">Date Range</span>
        <ChevronDown size={16} className="text-gray-400" />
      </button>

      {showPicker && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-10 w-64">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-green-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={handleEndDateChange}
                className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-green-600"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleReset}
                className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                Reset
              </button>
              <button
                onClick={() => setShowPicker(false)}
                className="flex-1 px-3 py-2 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
