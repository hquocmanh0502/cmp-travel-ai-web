import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const COLORS = ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#dbeafe"];

function PieCard({ data, loading }) {
  // Default mock data for fallback
  const defaultData = [
    { name: "Tokyo, Japan", value: 35 },
    { name: "Sydney, Australia", value: 28 },
    { name: "Paris, France", value: 22 },
    { name: "Venice, Italy", value: 15 },
  ];

  const chartData = data || defaultData;
  
  // Calculate total participants
  const totalParticipants = chartData.reduce((sum, item) => sum + (item.value || 0), 0);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full min-h-[400px] flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="text-lg font-semibold">Top Destinations</div>
          <div className="text-xs text-gray-400">By Bookings</div>
        </div>
        {!loading && (
          <div className="text-sm text-gray-400">
            {totalParticipants} Total
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400 text-sm">No data available</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          {/* Pie chart */}
          <div className="w-64 h-64 flex-shrink-0">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" outerRadius={110} dataKey="value">
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend - Below chart */}
          <ul className="w-full text-sm space-y-2">
            {chartData.slice(0, 5).map((item, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-4">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span
                    className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: COLORS[i] }}
                  />
                  <span className="truncate" title={item.name}>
                    {item.name}
                  </span>
                </div>
                <span className="text-xs text-gray-500 font-medium flex-shrink-0">
                  {item.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default PieCard;
