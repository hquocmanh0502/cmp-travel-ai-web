import React, { useState, useEffect } from "react";
import Metric from "../components/Metric";
import RevenueChart from "../components/RevenueChart";
import PieCard from "../components/PieCard";
import { MdTrendingUp, MdTrendingDown, MdPeople, MdBookOnline, MdTour, MdAttachMoney, MdFileDownload } from "react-icons/md";
import { exportDashboardToExcel } from "../utils/exportExcel";

const API_BASE_URL = 'http://localhost:3000/api/admin';

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
  const [recentBookings, setRecentBookings] = useState([]);
  const [topTours, setTopTours] = useState([]);
  const [revenueByMonth, setRevenueByMonth] = useState([]);
  const [topDestinations, setTopDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`${API_BASE_URL}/analytics/overview`);
        const data = await response.json();
        
        if (data.success) {
          setStats({
            totalRevenue: data.data.totalRevenue,
            totalUsers: data.data.totalUsers,
            totalBookings: data.data.totalBookings,
            totalTours: data.data.totalTours,
            revenueChange: data.data.revenueGrowth,
            usersChange: data.data.userGrowth,
            bookingsChange: data.data.bookingGrowth,
            toursChange: 0,
          });
          setRecentBookings(data.data.recentBookings || []);
          setTopTours(data.data.topTours || []);
          
          // Format revenue by month for chart
          if (data.data.revenueByMonth && data.data.revenueByMonth.length > 0) {
            const chartData = data.data.revenueByMonth.map(item => ({
              name: item.month, // Format: "2025-10"
              revenue: item.revenue
            }));
            setRevenueByMonth(chartData);
          }
          
          // Format top tours for pie chart (top destinations)
          if (data.data.topTours && data.data.topTours.length > 0) {
            const pieData = data.data.topTours.slice(0, 5).map(tour => ({
              name: tour.name,
              value: tour.bookings
            }));
            setTopDestinations(pieData);
          }
        } else {
          setError(data.error || 'Failed to fetch data');
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to connect to server. Please make sure backend is running.');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
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

  const handleExportDashboard = async (event) => {
    try {
      // Show loading state
      const button = event.target;
      const originalText = button.innerText;
      button.innerText = 'Exporting...';
      button.disabled = true;

      // Fetch FULL data from backend for export
      const response = await fetch(`${API_BASE_URL}/export/full-data`);
      const result = await response.json();

      if (result.success) {
        const fullData = result.data;
        
        // Prepare export data with FULL dataset
        const exportData = {
          totalRevenue: stats.totalRevenue,
          totalBookings: stats.totalBookings,
          totalUsers: stats.totalUsers,
          totalTours: stats.totalTours,
          revenueChange: stats.revenueChange,
          bookingsChange: stats.bookingsChange,
          usersChange: stats.usersChange,
          toursChange: stats.toursChange,
          revenueByMonth: fullData.revenueByMonth, // Full 12 months
          topTours: fullData.tours, // ALL tours with stats
          recentBookings: fullData.bookings // ALL bookings
        };
        
        const filename = `dashboard-full-report-${new Date().toISOString().split('T')[0]}.xlsx`;
        const success = exportDashboardToExcel(exportData, filename);
        
        if (success) {
          alert(`✅ Exported ${fullData.bookings.length} bookings and ${fullData.tours.length} tours successfully!`);
        } else {
          alert('❌ Failed to export report. Please try again.');
        }
      } else {
        alert('❌ Failed to fetch data from server: ' + (result.error || 'Unknown error'));
      }
      
      // Reset button state
      button.innerText = originalText;
      button.disabled = false;
    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Error exporting data: ' + error.message);
      
      // Reset button on error
      const button = event.target;
      button.innerText = 'Export Report';
      button.disabled = false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 font-medium">⚠️ {error}</p>
          <p className="text-sm text-red-600 mt-1">Make sure the backend server is running on port 3000</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Dashboard Overview</h1>
            <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your travel business today.</p>
          </div>
          <button
            onClick={handleExportDashboard}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <MdFileDownload className="text-xl" />
            Export Report
          </button>
        </div>
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
          <RevenueChart data={revenueByMonth} loading={loading} />
        </div>
        {/* Pie Card - takes 1/3 */}
        <div className="xl:col-span-1">
          <PieCard data={topDestinations} loading={loading} />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RecentBookings bookings={recentBookings} loading={loading} />
        <TopTours tours={topTours} loading={loading} />
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
function RecentBookings({ bookings, loading }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status) => {
    const colors = {
      confirmed: "bg-green-100 text-green-700",
      pending: "bg-yellow-100 text-yellow-700",
      cancelled: "bg-red-100 text-red-700",
      completed: "bg-blue-100 text-blue-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Bookings</h3>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Bookings</h3>
      {bookings.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No recent bookings</p>
      ) : (
        <div className="space-y-3">
          {bookings.slice(0, 5).map((booking) => (
            <div key={booking._id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="flex-1">
                <p className="font-medium text-gray-800">{booking.customerName}</p>
                <p className="text-sm text-gray-600">{booking.tourName}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-800">{formatCurrency(booking.totalPrice)}</p>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(booking.paymentStatus)}`}>
                  {booking.paymentStatus}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Top Tours Component
function TopTours({ tours, loading }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Top Tours</h3>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Top Tours</h3>
      {tours.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No tour data available</p>
      ) : (
        <div className="space-y-3">
          {tours.slice(0, 5).map((tour, index) => (
            <div key={tour._id} className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800">{tour.name}</p>
                <p className="text-sm text-gray-600">{tour.bookings} bookings</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-800">{formatCurrency(tour.revenue)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
