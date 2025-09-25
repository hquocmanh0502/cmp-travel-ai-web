import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const data = [
  { name: "Mon", revenue: 400 },
  { name: "Tue", revenue: 300 },
  { name: "Wed", revenue: 500 },
  { name: "Thu", revenue: 700 },
  { name: "Fri", revenue: 600 },
  { name: "Sat", revenue: 800 },
  { name: "Sun", revenue: 650 },
];

function RevenueChart() {
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-lg font-semibold">Revenue Overview</div>
          <div className="text-xs text-gray-400">Weekly</div>
        </div>
        <div className="text-sm text-gray-400">$635 • 12 Jul</div>
      </div>

      <div className="w-full h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="name" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip />
            <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default RevenueChart;
