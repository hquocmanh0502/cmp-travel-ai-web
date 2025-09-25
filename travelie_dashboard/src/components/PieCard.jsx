import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const data = [
  { name: "Tokyo, Japan", value: 35 },
  { name: "Sydney, Australia", value: 28 },
  { name: "Paris, France", value: 22 },
  { name: "Venice, Italy", value: 15 },
];

const COLORS = ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd"];

function PieCard() {
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="text-lg font-semibold">Top Destinations</div>
          <div className="text-xs text-gray-400">This Month</div>
        </div>
        <div className="text-sm text-gray-400">2,458 Participants</div>
      </div>

      {/* Content song song */}
      <div className="flex flex-1 items-center gap-6">
        {/* Pie chart */}
        <div className="w-40 h-40">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                {data.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <ul className="text-sm space-y-2">
          {data.map((item, i) => (
            <li key={i} className="flex items-center">
              <span
                className="inline-block w-3 h-3 rounded-sm mr-2"
                style={{ backgroundColor: COLORS[i] }}
              />
              {item.name}
              <span className="text-xs text-gray-400 ml-1">({item.value}%)</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default PieCard;
