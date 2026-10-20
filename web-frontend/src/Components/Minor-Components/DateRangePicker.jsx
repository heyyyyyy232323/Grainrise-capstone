import { useState, useRef, useEffect } from "react";
import { Calendar } from "lucide-react";

const DateRangePicker = ({ onDateChange }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const dateRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dateRef.current && !dateRef.current.contains(event.target)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isInvalidRange = Boolean(startDate && endDate && endDate < startDate);

  const handleStartDateChange = (e) => {
    const nextStart = e.target.value;
    setStartDate(nextStart);
    if (nextStart && endDate && endDate < nextStart) {
      setEndDate(nextStart);
    }
  };

  const handleEndDateChange = (e) => {
    const nextEnd = e.target.value;
    if (startDate && nextEnd && nextEnd < startDate) {
      return;
    }
    setEndDate(nextEnd);
  };

  const handleApply = () => {
    if (isInvalidRange) return;
    onDateChange({ startDate, endDate });
    setShowPicker(false);
  };

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    onDateChange({ startDate: "", endDate: "" });
    setShowPicker(false);
  };

  const isFiltered = Boolean(startDate || endDate);

  return (
    <div className="relative w-full sm:w-auto" ref={dateRef}>
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className={`flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors cursor-pointer ${
          isFiltered ? "border-emerald-500 text-emerald-700 bg-emerald-50/40" : ""
        }`}
      >
        <span>
          {startDate ? `${startDate} - ${endDate || "..."}` : "Date Range"}
        </span>
        <Calendar size={16} className={isFiltered ? "text-emerald-600" : "text-gray-500"} />
      </button>

      {showPicker && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-20 w-64">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={handleStartDateChange}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={handleEndDateChange}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>
            {isInvalidRange && (
              <p className="text-[11px] text-red-600 font-medium">
                To Date must be on or after From Date.
              </p>
            )}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                disabled={isInvalidRange}
                onClick={handleApply}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-[#0B5D1E] hover:bg-[#084b18] disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
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
