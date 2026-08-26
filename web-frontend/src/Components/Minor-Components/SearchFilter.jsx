import { useState } from "react";
import { Search, X } from "lucide-react";

const SearchFilter = ({ onSearch, placeholder = "Search Batch ID, Product Code, Variant, or Supplier" }) => {
  const [searchValue, setSearchValue] = useState("");

  const handleChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    onSearch(value);
  };

  const handleClear = () => {
    setSearchValue("");
    onSearch("");
  };

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <Search size={16} className="absolute left-3 text-slate-400" />
        <input
          type="text"
          value={searchValue}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-2 border border-slate-200 rounded-[8px] text-[13px] font-normal text-slate-700 placeholder:text-slate-500 focus:outline-none focus:border-[#0B5D1E] focus:ring-1 focus:ring-[#EAF7E8]"
        />
        {searchValue && (
          <button
            onClick={handleClear}
            className="absolute right-3 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchFilter;