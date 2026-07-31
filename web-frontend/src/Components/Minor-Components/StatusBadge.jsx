const StatusBadge = ({ status }) => {
  const statusStyles = {
    Approved: "bg-green-100 text-green-800",
    Requested: "bg-yellow-100 text-yellow-800",
    Received: "bg-blue-100 text-blue-800",
    "In Transit": "bg-orange-100 text-orange-800",
    Declined: "bg-red-100 text-red-800",
    Adjusted: "bg-purple-100 text-purple-800",
  };

  const style = statusStyles[status] || "bg-gray-100 text-gray-800";

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${style}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
