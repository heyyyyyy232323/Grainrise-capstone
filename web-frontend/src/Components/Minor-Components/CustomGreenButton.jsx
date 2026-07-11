const CustomGreenButton = ({
  text,
  onClick,
  type = "button",
  className = "",
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`
        px-6 py-2
        rounded-lg
        bg-[#018311]
        text-white
        font-medium
        hover:bg-[#016b0f]
        active:scale-95
        transition
        ${className}
      `}
    >
      {text}
    </button>
  );
};

export default CustomGreenButton;