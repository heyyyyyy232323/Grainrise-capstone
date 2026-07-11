


const CustomTextbox = ({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
}) => {
  return (
    <div className="w-full">
      {/* Label */}
      {label && (
        <label className="block mb-2 text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      {/* Input */}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="
          w-full
          px-4 py-3
          rounded-xl
          bg-gray-200
          text-gray-700
          placeholder-gray-500
          outline-none
          focus:ring-2 focus:ring-gray-400
          transition
        "
      />
    </div>
  );
};

export default CustomTextbox;