import React from "react";

function Metric({ title, value, delta }) {
  const deltaClass =
    delta && delta.startsWith("-")
      ? "bg-red-100 text-red-600"
      : "bg-green-100 text-green-600";

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 min-w-[180px]">
      <div className="text-xs text-gray-400">{title}</div>
      <div className="flex items-end gap-2">
        <div className="text-2xl font-bold">{value}</div>
        {delta && (
          <div className={`text-sm px-2 py-1 rounded-full ${deltaClass}`}>{delta}</div>
        )}
      </div>
    </div>
  );
}

export default Metric;
