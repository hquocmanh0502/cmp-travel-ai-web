import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  CreditCardIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format, subDays } from 'date-fns';

const Revenue = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [groupBy, setGroupBy] = useState('day');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchRevenueStats();
  }, [dateRange, groupBy]);

  const fetchRevenueStats = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.start,
        endDate: dateRange.end,
        groupBy: groupBy
      });

      console.log('🔍 Fetching revenue with params:', {
        startDate: dateRange.start,
        endDate: dateRange.end,
        groupBy: groupBy
      });

      const response = await fetch(`http://localhost:3000/api/admin/revenue/stats?${params}`);
      const data = await response.json();

      console.log('📦 Revenue API response:', data);

      if (data.success) {
        console.log('✅ Stats data received:', data.data);
        setStats(data.data);
      } else {
        console.error('❌ API returned success=false:', data);
      }
    } catch (error) {
      console.error('❌ Failed to fetch revenue stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format = 'csv') => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.start,
        endDate: dateRange.end,
        format: format
      });

      const response = await fetch(`http://localhost:3000/api/admin/revenue/export?${params}`);
      
      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `revenue-report-${dateRange.start}-to-${dateRange.end}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `revenue-report-${dateRange.start}-to-${dateRange.end}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateObj) => {
    const { year, month, period } = dateObj;
    if (groupBy === 'month') {
      return `${year}-${String(month).padStart(2, '0')}`;
    } else if (groupBy === 'week') {
      return `${year} W${period}`;
    } else {
      return `${year}-${String(month).padStart(2, '0')}-${String(period).padStart(2, '0')}`;
    }
  };

  const COLORS = {
    bookings: '#3B82F6',
    topups: '#10B981',
    total: '#8B5CF6'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No revenue data available</p>
      </div>
    );
  }

  const { summary, timeline, topUsers } = stats;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue Management</h1>
          <p className="text-gray-500 mt-1">Track and analyze your revenue streams</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            Export CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Date Range:</span>
          </div>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center gap-2 ml-4">
            <FunnelIcon className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Group By:</span>
          </div>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Revenue</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(summary.totalRevenue)}</p>
              <p className="text-blue-100 text-xs mt-1">{summary.totalTransactions} transactions</p>
            </div>
            <BanknotesIcon className="w-12 h-12 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Wallet Revenue (Deposits + Balance)</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(summary.totalTopupRevenue)}</p>
              <p className="text-purple-100 text-xs mt-1">
                Deposits: {formatCurrency(summary.totalTopupDeposits || 0)} + Balance: {formatCurrency(summary.totalWalletBalance || 0)}
              </p>
            </div>
            <CreditCardIcon className="w-12 h-12 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Avg. Booking Value</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(summary.avgBookingValue)}</p>
              <p className="text-orange-100 text-xs mt-1">{summary.totalBookings} bookings</p>
            </div>
            <ArrowTrendingUpIcon className="w-12 h-12 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Revenue Timeline Chart */}
      <div className="bg-white rounded-lg shadow p-6" style={{ minHeight: '500px' }}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Over Time</h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={timeline}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey={(item) => formatDate(item.date)} 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip 
              formatter={(value) => formatCurrency(value)}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="bookingRevenue" 
              stroke={COLORS.bookings} 
              strokeWidth={2}
              name="Booking Revenue"
            />
            <Line 
              type="monotone" 
              dataKey="topupRevenue" 
              stroke={COLORS.topups} 
              strokeWidth={2}
              name="Top-up Revenue"
            />
            <Line 
              type="monotone" 
              dataKey="totalRevenue" 
              stroke={COLORS.total} 
              strokeWidth={3}
              name="Total Revenue"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Customers by Spending */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Top Customers by Spending</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bookings
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topUsers.map((user, index) => (
                <tr key={user.userId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.userName}</div>
                    <div className="text-xs text-gray-500">{user.userEmail}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-blue-600">
                      {formatCurrency(user.totalSpent)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.bookings}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Revenue;
