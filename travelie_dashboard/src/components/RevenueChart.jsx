import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function RevenueChart({ data, loading }) {
  // Default mock data for fallback
  const defaultData = [
    { name: "Mon", revenue: 400 },
    { name: "Tue", revenue: 300 },
    { name: "Wed", revenue: 500 },
    { name: "Thu", revenue: 700 },
    { name: "Fri", revenue: 600 },
    { name: "Sat", revenue: 800 },
    { name: "Sun", revenue: 650 },
  ];

  const chartData = data || defaultData;

  // Calculate total revenue from data
  const totalRevenue = chartData.reduce((sum, item) => sum + (item.revenue || 0), 0);
  const avgRevenue = chartData.length > 0 ? Math.round(totalRevenue / chartData.length) : 0;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full min-h-[400px] flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="text-lg font-semibold">Revenue Overview</div>
          <div className="text-xs text-gray-400">Last 12 Months</div>
        </div>
        {!loading && (
          <div className="text-sm text-gray-400">
            Avg: ${avgRevenue.toLocaleString()}
          </div>
        )}
      </div>

      {loading ? (
        <div className="w-full flex-1 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading chart...</div>
        </div>
      ) : (
        <div className="w-full flex-1 min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
              />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default RevenueChart;
