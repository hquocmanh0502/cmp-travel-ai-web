import React from "react";
import Metric from "../components/Metric";
import RevenueChart from "../components/RevenueChart";
import PieCard from "../components/PieCard";

function Dashboard() {
  const packages = Array.from({ length: 3 }).map((_, i) => ({
    id: i,
    title: "Paris, France",
    subtitle: "Romantic Getaway • 5 - 10 July",
  }));

  return (
    <div className="bg-gray-50 min-h-screen p-6 space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Metric title="Total Booking" value="1,200" delta="+2.98%" />
        <Metric title="Total New Customers" value="2,845" delta="-1.45%" />
        <Metric title="Total Earnings" value="$12,890" delta="+3.75%" />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* RevenueChart chiếm 3/5 */}
        <div className="lg:col-span-3 h-80">
          <RevenueChart />
        </div>
        {/* PieCard chiếm 2/5 */}
        <div className="lg:col-span-2 h-80">
          <PieCard />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
