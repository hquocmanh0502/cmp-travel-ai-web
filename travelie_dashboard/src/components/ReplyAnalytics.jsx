import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  BarChart3,
  PieChart
} from 'lucide-react';

const ReplyAnalytics = () => {
  const [analytics, setAnalytics] = useState({});
  const [dateRange, setDateRange] = useState('7days');
  const [loading, setLoading] = useState(true);

  const adminId = '69006c243a8a7b5d3ddc69ff';

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        adminId,
        dateRange: getDateRangeParam()
      });

      const response = await fetch(`/api/admin/replies/statistics?${params}`);
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.statistics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
    setLoading(false);
  };

  const getDateRangeParam = () => {
    const end = new Date();
    const start = new Date();
    
    switch (dateRange) {
      case '24hours':
        start.setHours(start.getHours() - 24);
        break;
      case '7days':
        start.setDate(start.getDate() - 7);
        break;
      case '30days':
        start.setDate(start.getDate() - 30);
        break;
      default:
        start.setDate(start.getDate() - 7);
    }
    
    return `${start.toISOString()},${end.toISOString()}`;
  };

  const MetricCard = ({ title, value, change, icon: Icon, color = 'blue', suffix = '' }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">
            {value}{suffix}
          </p>
          {change !== undefined && (
            <p className={`text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center mt-1`}>
              <TrendingUp className="h-4 w-4 mr-1" />
              {change >= 0 ? '+' : ''}{change}% vs last period
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`h-8 w-8 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  const ChartCard = ({ title, children }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Reply Analytics</h2>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="24hours">Last 24 Hours</option>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading analytics...</p>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Replies"
              value={analytics.general?.total || 0}
              icon={BarChart3}
              color="blue"
            />
            <MetricCard
              title="Spam Detected"
              value={analytics.general?.spam || 0}
              icon={AlertTriangle}
              color="red"
              suffix={analytics.general?.total ? ` (${((analytics.general.spam / analytics.general.total) * 100).toFixed(1)}%)` : ''}
            />
            <MetricCard
              title="Auto Approved"
              value={analytics.general?.approved || 0}
              icon={CheckCircle}
              color="green"
            />
            <MetricCard
              title="Pending Review"
              value={analytics.general?.pending || 0}
              icon={Clock}
              color="yellow"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Priority Distribution */}
            <ChartCard title="Priority Distribution">
              <div className="space-y-3">
                {analytics.byPriority?.map((item) => {
                  const total = analytics.general?.total || 1;
                  const percentage = ((item.count / total) * 100).toFixed(1);
                  const colors = {
                    urgent: 'bg-red-500',
                    high: 'bg-orange-500',
                    medium: 'bg-yellow-500',
                    low: 'bg-green-500'
                  };
                  
                  return (
                    <div key={item._id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full ${colors[item._id] || 'bg-gray-500'} mr-3`}></div>
                        <span className="text-sm font-medium text-gray-700 capitalize">{item._id}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-900 mr-2">{item.count}</span>
                        <span className="text-sm text-gray-500">({percentage}%)</span>
                      </div>
                    </div>
                  );
                }) || (
                  <p className="text-gray-500 text-center py-4">No data available</p>
                )}
              </div>
            </ChartCard>

            {/* Flag Types */}
            <ChartCard title="Flag Types">
              <div className="space-y-3">
                {analytics.byFlags?.map((item) => {
                  const colors = {
                    spam: 'bg-red-500',
                    promotional: 'bg-orange-500',
                    inappropriate: 'bg-purple-500',
                    fake: 'bg-pink-500',
                    offensive: 'bg-red-700'
                  };
                  
                  return (
                    <div key={item._id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full ${colors[item._id] || 'bg-gray-500'} mr-3`}></div>
                        <span className="text-sm font-medium text-gray-700 capitalize">{item._id}</span>
                      </div>
                      <span className="text-sm text-gray-900">{item.count}</span>
                    </div>
                  );
                }) || (
                  <p className="text-gray-500 text-center py-4">No flags data</p>
                )}
              </div>
            </ChartCard>
          </div>

          {/* Performance Metrics */}
          <ChartCard title="Moderation Performance">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {analytics.general?.avgConfidence ? (analytics.general.avgConfidence * 100).toFixed(1) : 0}%
                </div>
                <p className="text-sm text-gray-600 mt-1">Average AI Confidence</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {analytics.general?.total && analytics.general?.pending
                    ? (((analytics.general.total - analytics.general.pending) / analytics.general.total) * 100).toFixed(1)
                    : 0}%
                </div>
                <p className="text-sm text-gray-600 mt-1">Processing Rate</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {analytics.general?.spam && analytics.general?.total
                    ? ((analytics.general.spam / analytics.general.total) * 100).toFixed(1)
                    : 0}%
                </div>
                <p className="text-sm text-gray-600 mt-1">Spam Detection Rate</p>
              </div>
            </div>
          </ChartCard>
        </>
      )}
    </div>
  );
};

export default ReplyAnalytics;