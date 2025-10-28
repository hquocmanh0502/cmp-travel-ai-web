import React, { useState, useEffect } from "react";
import Metric from "../components/Metric";
import RevenueChart from "../components/RevenueChart";
import PieCard from "../components/PieCard";
import { MdTrendingUp, MdTrendingDown, MdPeople, MdBookOnline, MdTour, MdAttachMoney } from "react-icons/md";

function Dashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalUsers: 0,
    totalBookings: 0,
    totalTours: 0,
    revenueChange: 0,
    usersChange: 0,
    bookingsChange: 0,
    toursChange: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with actual API call
    // fetch('http://localhost:3000/api/admin/analytics/overview')
    //   .then(res => res.json())
    //   .then(data => setStats(data))
    
    // Mock data for now
    setTimeout(() => {
      setStats({
        totalRevenue: 125840,
        totalUsers: 2845,
        totalBookings: 1289,
        totalTours: 156,
        revenueChange: 12.5,
        usersChange: 8.2,
        bookingsChange: 15.3,
        toursChange: 3.1,
      });
      setLoading(false);
    }, 500);
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard Overview</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your travel business today.</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={loading ? "Loading..." : formatCurrency(stats.totalRevenue)}
          change={stats.revenueChange}
          icon={MdAttachMoney}
          color="green"
          loading={loading}
        />
        <MetricCard
          title="Total Users"
          value={loading ? "Loading..." : formatNumber(stats.totalUsers)}
          change={stats.usersChange}
          icon={MdPeople}
          color="blue"
          loading={loading}
        />
        <MetricCard
          title="Total Bookings"
          value={loading ? "Loading..." : formatNumber(stats.totalBookings)}
          change={stats.bookingsChange}
          icon={MdBookOnline}
          color="orange"
          loading={loading}
        />
        <MetricCard
          title="Total Tours"
          value={loading ? "Loading..." : formatNumber(stats.totalTours)}
          change={stats.toursChange}
          icon={MdTour}
          color="purple"
          loading={loading}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue Chart - takes 2/3 */}
        <div className="xl:col-span-2">
          <RevenueChart />
        </div>
        {/* Pie Card - takes 1/3 */}
        <div className="xl:col-span-1">
          <PieCard />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RecentBookings />
        <TopTours />
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({ title, value, change, icon: Icon, color, loading }) {
  const colorClasses = {
    green: "bg-green-100 text-green-600",
    blue: "bg-blue-100 text-blue-600",
    orange: "bg-orange-100 text-orange-600",
    purple: "bg-purple-100 text-purple-600",
  };

  const isPositive = change >= 0;

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 font-medium">{title}</p>
          <h3 className="text-2xl font-bold text-gray-800 mt-2">
            {loading ? (
              <div className="h-8 w-32 bg-gray-200 animate-pulse rounded"></div>
            ) : (
              value
            )}
          </h3>
          {!loading && (
            <div className="flex items-center gap-1 mt-2">
              {isPositive ? (
                <MdTrendingUp className="text-green-600" />
              ) : (
                <MdTrendingDown className="text-red-600" />
              )}
              <span className={`text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{change.toFixed(1)}%
              </span>
              <span className="text-sm text-gray-500">vs last month</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="text-2xl" />
        </div>
      </div>
    </div>
  );
}

// Recent Bookings Component
function RecentBookings() {
  const bookings = [
    { id: "BK-001", user: "John Doe", tour: "Paris Adventure", amount: "$2,500", status: "confirmed" },
    { id: "BK-002", user: "Jane Smith", tour: "Tokyo Discovery", amount: "$3,200", status: "pending" },
    { id: "BK-003", user: "Bob Wilson", tour: "Bali Escape", amount: "$1,800", status: "confirmed" },
    { id: "BK-004", user: "Alice Brown", tour: "Dubai Luxury", amount: "$4,500", status: "confirmed" },
    { id: "BK-005", user: "Charlie Davis", tour: "Rome Classic", amount: "$2,100", status: "cancelled" },
  ];

  const getStatusColor = (status) => {
    const colors = {
      confirmed: "bg-green-100 text-green-700",
      pending: "bg-yellow-100 text-yellow-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">Recent Bookings</h3>
        <button className="text-sm text-orange-600 hover:text-orange-700 font-medium">View All</button>
      </div>
      <div className="space-y-3">
        {bookings.map((booking) => (
          <div key={booking.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
            <div className="flex-1">
              <p className="font-medium text-gray-800">{booking.user}</p>
              <p className="text-sm text-gray-600">{booking.tour}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-800">{booking.amount}</p>
              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(booking.status)}`}>
                {booking.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Top Tours Component
function TopTours() {
  const tours = [
    { name: "Paris Adventure", bookings: 145, revenue: "$362,500", growth: 12 },
    { name: "Tokyo Discovery", bookings: 132, revenue: "$422,400", growth: 8 },
    { name: "Bali Escape", bookings: 98, revenue: "$176,400", growth: -3 },
    { name: "Dubai Luxury", bookings: 87, revenue: "$391,500", growth: 15 },
    { name: "Rome Classic", bookings: 76, revenue: "$159,600", growth: 5 },
  ];

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">Top Tours</h3>
        <button className="text-sm text-orange-600 hover:text-orange-700 font-medium">View All</button>
      </div>
      <div className="space-y-3">
        {tours.map((tour, index) => (
          <div key={tour.name} className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
              {index + 1}
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-800">{tour.name}</p>
              <p className="text-sm text-gray-600">{tour.bookings} bookings</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-800">{tour.revenue}</p>
              <div className="flex items-center gap-1">
                {tour.growth >= 0 ? (
                  <MdTrendingUp className="text-green-600 text-sm" />
                ) : (
                  <MdTrendingDown className="text-red-600 text-sm" />
                )}
                <span className={`text-xs ${tour.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {tour.growth > 0 ? '+' : ''}{tour.growth}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
