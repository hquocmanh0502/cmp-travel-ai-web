import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { 
  AlertTriangle, 
  Shield, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Users,
  MessageCircle,
  Zap,
  Activity,
  PieChart,
  Calendar,
  Download,
  Mail,
  Phone,
  Link,
  DollarSign,
  Eye,
  Trash2,
  Filter,
  RefreshCw,
  Settings
} from 'lucide-react';

const SpamDashboard = () => {
  const [spamData, setSpamData] = useState([]);
  const [stats, setStats] = useState({
    totalReplies: 0,
    spamReplies: 0,
    cleanReplies: 0,
    spamRate: 0,
    todaySpam: 0,
    weeklyTrend: 0,
    toxicReplies: 0,
    toxicRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    timeRange: '7d',
    confidenceMin: 0
  });
  const [selectedReplies, setSelectedReplies] = useState(new Set());
  const [realTimeMonitoring, setRealTimeMonitoring] = useState(false);
  const [testText, setTestText] = useState('');
  const [testResult, setTestResult] = useState(null);
  
  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedReply, setSelectedReply] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReplyId, setDeleteReplyId] = useState(null);
  
  // Debug modal state changes
  useEffect(() => {
    console.log('Modal state changed:', { showViewModal, selectedReply: !!selectedReply });
  }, [showViewModal, selectedReply]);
  
  const [patterns, setPatterns] = useState({
    links: 0,
    emails: 0,
    phones: 0,
    caps: 0,
    urgentWords: 0
  });
  const [systemHealth, setSystemHealth] = useState({
    modelAccuracy: 94.2,
    processingSpeed: 'Normal',
    lastUpdate: new Date(),
    queueLength: 3
  });

  const fetchSpamData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching spam data from API...');
      const response = await fetch('http://localhost:3000/api/admin/spam-replies/list');
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      
      setSpamData(data.spamReplies || []);
      
      // Calculate statistics
      const totalReplies = data.spamReplies?.length || 0;
      const spamReplies = data.spamReplies?.filter(reply => 
        reply.classification?.isSpam === true || 
        reply.classification?.isSpam === 'true'
      ).length || 0;
      
      // Calculate toxic replies
      const toxicReplies = data.spamReplies?.filter(reply => 
        reply.classification?.toxicity_detected === true ||
        reply.classification?.toxic_type !== 'none'
      ).length || 0;
      
      const cleanReplies = totalReplies - spamReplies;
      const spamRate = totalReplies > 0 ? (spamReplies / totalReplies) * 100 : 0;
      const toxicRate = totalReplies > 0 ? (toxicReplies / totalReplies) * 100 : 0;
      
      // Calculate today's spam
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaySpam = data.spamReplies?.filter(reply => {
        const replyDate = new Date(reply.processedAt);
        return replyDate >= today && (
          reply.classification?.isSpam === true || 
          reply.classification?.isSpam === 'true'
        );
      }).length || 0;

      // Calculate pattern statistics
      const patternStats = {
        links: 0,
        emails: 0,
        phones: 0,
        caps: 0,
        urgentWords: 0
      };

      data.spamReplies?.forEach(reply => {
        const content = reply.content?.toLowerCase() || '';
        if (content.includes('http') || content.includes('www.')) patternStats.links++;
        if (content.includes('@') && content.includes('.')) patternStats.emails++;
        if (/\d{3,}/.test(content)) patternStats.phones++;
        if (reply.content && reply.content.split('').filter(c => c === c.toUpperCase()).length > reply.content.length * 0.3) {
          patternStats.caps++;
        }
        if (/urgent|limited|act now|hurry|expires|last chance/i.test(content)) patternStats.urgentWords++;
      });

      setStats({
        totalReplies,
        spamReplies,
        cleanReplies,
        spamRate,
        todaySpam,
        toxicReplies,
        toxicRate,
        weeklyTrend: Math.random() * 20 - 10 // Mock trend data
      });
      setPatterns(patternStats);
      
      // Fetch real-time filtering stats
      const statsResponse = await fetch('http://localhost:3000/api/admin/spam-replies/real-time-stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        // if (statsData.success) {
        //   setRealTimeStats(statsData.stats);
        // }
      }
      
    } catch (err) {
      console.error('Error fetching spam data:', err);
      setError('Unable to load spam data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpamData();
  }, [fetchSpamData]);

  // Real-time monitoring effect
  useEffect(() => {
    let interval;
    if (realTimeMonitoring) {
      interval = setInterval(() => {
        fetchSpamData();
        setSystemHealth(prev => ({
          ...prev,
          lastUpdate: new Date(),
          queueLength: Math.floor(Math.random() * 10)
        }));
      }, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [realTimeMonitoring, fetchSpamData]);

  const handleBulkAction = async (action) => {
    if (selectedReplies.size === 0) return;

    try {
      const replyIds = Array.from(selectedReplies);
      let apiAction = action;
      
      // Map frontend actions to backend actions
      if (action === 'delete') {
        apiAction = 'remove';
      } else if (action === 'mark-clean') {
        apiAction = 'approve';
      }

      const response = await fetch(`http://localhost:3000/api/admin/spam-replies/bulk-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: apiAction, 
          replyIds 
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchSpamData();
        setSelectedReplies(new Set());
        
        // Show success message
        toast.success(`Successfully ${action}d ${result.result.processed} replies`);
      } else {
        throw new Error(result.message || 'Action failed');
      }
    } catch (error) {
      console.error(`Error performing bulk ${action}:`, error);
      toast.error(`Error performing bulk ${action}: ${error.message}`);
    }
  };

  const handleIndividualAction = async (replyId, action) => {
    try {
      if (action === 'view') {
        // Show reply details in modal - search in filteredData first, then spamData
        let reply = filteredData.find(r => (r.replyId || r._id) === replyId);
        if (!reply) {
          reply = spamData.find(r => (r.replyId || r._id) === replyId);
        }
        
        console.log('Looking for replyId:', replyId);
        console.log('Found reply for view:', reply);
        console.log('Reply keys:', reply ? Object.keys(reply) : 'None');
        
        if (reply) {
          setSelectedReply(reply);
          setShowViewModal(true);
        } else {
          toast.error('Reply not found');
        }
      } else if (action === 'delete') {
        // Show delete confirmation modal
        setDeleteReplyId(replyId);
        setShowDeleteConfirm(true);
      }
    } catch (error) {
      console.error('Action error:', error);
      toast.error('Action failed: ' + error.message);
    }
  };

  const confirmDelete = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/admin/spam-replies/${deleteReplyId}/remove`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        await fetchSpamData();
        toast.success('Reply deleted successfully');
      } else {
        throw new Error(result.message || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Delete failed: ' + error.message);
    } finally {
      setShowDeleteConfirm(false);
      setDeleteReplyId(null);
    }
  };

  const handleTestDetection = async () => {
    if (!testText.trim()) {
      toast.error('Please enter text to test');
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/admin/spam-replies/test-detection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: testText }),
      });

      const result = await response.json();

      if (result.success) {
        setTestResult(result);
      } else {
        throw new Error(result.message || 'Test failed');
      }
    } catch (error) {
      console.error('Error testing detection:', error);
      alert(`Error testing detection: ${error.message}`);
    }
  };

  const exportToCSV = () => {
    const csvData = spamData.map(reply => ({
      ID: reply.replyId || reply._id,
      Content: reply.content,
      'Is Spam': reply.classification?.isSpam ? 'Yes' : 'No',
      Confidence: reply.classification?.confidence ? (reply.classification.confidence * 100).toFixed(1) + '%' : 'N/A',
      'Created At': new Date(reply.processedAt).toISOString(),
      'Comment ID': reply.commentId
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spam_analysis_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const filteredData = spamData.filter(reply => {
    if (filters.status === 'spam' && !reply.classification?.isSpam) return false;
    if (filters.status === 'clean' && reply.classification?.isSpam) return false;
    
    const confidence = reply.classification?.confidence || 0;
    if (confidence < filters.confidenceMin) return false;

    const replyDate = new Date(reply.processedAt);
    const now = new Date();
    if (filters.timeRange === '1d') {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      if (replyDate < yesterday) return false;
    } else if (filters.timeRange === '7d') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (replyDate < weekAgo) return false;
    }

    return true;
  });

  const StatCard = ({ title, value, change, icon: Icon, color, trend }) => (
    <div className={`bg-gradient-to-br ${color} rounded-xl shadow-lg p-6 text-white relative overflow-hidden`}>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white bg-opacity-20 rounded-lg">
            <Icon className="w-6 h-6" />
          </div>
          {trend && (
            <div className={`flex items-center text-sm ${trend > 0 ? 'text-red-200' : 'text-green-200'}`}>
              {trend > 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>
        <div className="text-3xl font-bold mb-2">{value}</div>
        <div className="text-sm opacity-90">{title}</div>
        {change && (
          <div className="text-xs mt-2 opacity-75">
            {change > 0 ? '+' : ''}{change} from yesterday
          </div>
        )}
      </div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white bg-opacity-10 rounded-full transform translate-x-16 -translate-y-16"></div>
    </div>
  );

  const PatternCard = ({ title, count, icon: Icon, percentage }) => (
    <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center text-gray-600 text-sm mb-1">
            <Icon className="w-4 h-4 mr-2" />
            {title}
          </div>
          <div className="text-2xl font-bold text-gray-800">{count}</div>
          <div className="text-xs text-gray-500">{percentage}% of total</div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-300 rounded-lg"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-300 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Shield className="w-8 h-8 mr-3 text-blue-600" />
              Spam Detection Dashboard
            </h1>
            <p className="text-gray-600 mt-2">Real-time spam replies monitoring and management</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setRealTimeMonitoring(!realTimeMonitoring)}
              className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
                realTimeMonitoring 
                  ? 'bg-green-100 border-green-300 text-green-700' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Activity className="w-4 h-4 mr-2" />
              {realTimeMonitoring ? 'Monitoring' : 'Real-time Monitoring'}
            </button>
            <button
              onClick={fetchSpamData}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard
            title="Total Replies"
            value={stats.totalReplies.toLocaleString()}
            icon={MessageCircle}
            color="from-blue-500 to-blue-600"
          />
          <StatCard
            title="Spam Replies"
            value={stats.spamReplies.toLocaleString()}
            change={stats.todaySpam}
            icon={AlertTriangle}
            color="from-red-500 to-red-600"
            trend={stats.weeklyTrend}
          />
          <StatCard
            title="Toxic Content"
            value={stats.toxicReplies.toLocaleString()}
            icon={Shield}
            color="from-purple-500 to-purple-600"
            trend={stats.toxicRate}
          />
          <StatCard
            title="Spam Rate"
            value={`${stats.spamRate.toFixed(1)}%`}
            icon={PieChart}
            color="from-orange-500 to-orange-600"
            trend={stats.weeklyTrend}
          />
          <StatCard
            title="Clean Replies"
            value={stats.cleanReplies.toLocaleString()}
            icon={CheckCircle}
            color="from-green-500 to-green-600"
          />
        </div>

        {/* System Health & Pattern Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* System Health */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-yellow-500" />
              System Health
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Model Accuracy</span>
                <span className="font-semibold text-green-600">{systemHealth.modelAccuracy}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Processing Speed</span>
                <span className="font-semibold text-blue-600">{systemHealth.processingSpeed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Queue Length</span>
                <span className="font-semibold text-purple-600">{systemHealth.queueLength} items</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Last Update</span>
                <span className="text-sm text-gray-500">
                  {systemHealth.lastUpdate.toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>

          {/* Pattern Analysis */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-purple-500" />
              Pattern Analysis
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <PatternCard
                title="Links/URLs"
                count={patterns.links}
                icon={Link}
                percentage={((patterns.links / stats.totalReplies) * 100).toFixed(1)}
              />
              <PatternCard
                title="Email Addresses"
                count={patterns.emails}
                icon={Mail}
                percentage={((patterns.emails / stats.totalReplies) * 100).toFixed(1)}
              />
              <PatternCard
                title="Phone Numbers"
                count={patterns.phones}
                icon={Phone}
                percentage={((patterns.phones / stats.totalReplies) * 100).toFixed(1)}
              />
              <PatternCard
                title="Urgent Words"
                count={patterns.urgentWords}
                icon={Clock}
                percentage={((patterns.urgentWords / stats.totalReplies) * 100).toFixed(1)}
              />
            </div>
          </div>
        </div>

        {/* Test Detection Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <Settings className="w-5 h-5 mr-2 text-blue-500" />
            Test Detection System
          </h3>
          <div className="flex space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Enter text to test spam detection..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleTestDetection}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Zap className="w-4 h-4 mr-2" />
              Test Detection
            </button>
          </div>
          {testResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Result:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${
                    testResult.result.isSpam ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {testResult.result.isSpam ? 'SPAM' : 'CLEAN'}
                  </span>
                </div>
                <div><strong>Confidence:</strong> {(testResult.result.confidence * 100).toFixed(1)}%</div>
                <div><strong>Model Used:</strong> {testResult.result.modelUsed}</div>
              </div>
            </div>
          )}
        </div>

        {/* Filters and Controls */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All</option>
                  <option value="spam">Spam Only</option>
                  <option value="clean">Clean Only</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <select
                  value={filters.timeRange}
                  onChange={(e) => setFilters({...filters, timeRange: e.target.value})}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="1d">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="all">All time</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {selectedReplies.size > 0 && (
                <>
                  <button
                    onClick={() => handleBulkAction('delete')}
                    className="flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete ({selectedReplies.size})
                  </button>
                  <button
                    onClick={() => handleBulkAction('mark-clean')}
                    className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark as Clean
                  </button>
                </>
              )}
              <button
                onClick={exportToCSV}
                className="flex items-center px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">
              Spam Detection Results ({filteredData.length} replies)
            </h3>
          </div>
          
          {error && (
            <div className="p-6 bg-red-50 border-l-4 border-red-500">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedReplies(new Set(filteredData.map(reply => reply.replyId || reply._id)));
                        } else {
                          setSelectedReplies(new Set());
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Content
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tour Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Review Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((reply) => {
                  const replyId = reply.replyId || reply._id;
                  // Use a combined key to ensure uniqueness when multiple records
                  // reference the same replyId (classification vs reply subdoc ids)
                  const uniqueKey = `${reply._id}-${reply.replyId || ''}`;
                  return (
                    <tr key={uniqueKey} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedReplies.has(replyId)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedReplies);
                          if (e.target.checked) {
                            newSelected.add(replyId);
                          } else {
                            newSelected.delete(replyId);
                          }
                          setSelectedReplies(newSelected);
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <p className="text-sm text-gray-900 line-clamp-3">
                          {reply.content}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          By: {reply.replyAuthor}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <p className="text-sm font-medium text-gray-900">
                          {reply.tourName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {reply.tourDestination}
                        </p>
                        {reply.tourPrice && (
                          <p className="text-xs text-green-600 font-medium">
                            ${reply.tourPrice}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <p className="text-sm text-gray-900 line-clamp-2">
                          {reply.reviewContent}
                        </p>
                        <div className="flex items-center mt-1">
                          {reply.reviewRating && (
                            <div className="flex items-center">
                              <span className="text-yellow-400">★</span>
                              <span className="text-xs text-gray-600 ml-1">
                                {reply.reviewRating}/5
                              </span>
                            </div>
                          )}
                          <span className="text-xs text-gray-500 ml-2">
                            by {reply.reviewAuthor}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        reply.classification?.isSpam === true || reply.classification?.isSpam === 'true'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {reply.classification?.isSpam === true || reply.classification?.isSpam === 'true'
                          ? 'Spam' 
                          : 'Clean'
                        }
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {reply.classification?.confidence 
                        ? `${(reply.classification.confidence * 100).toFixed(1)}%`
                        : 'N/A'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(reply.processedAt).toLocaleDateString('en-US')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleIndividualAction(replyId, 'view')}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleIndividualAction(replyId, 'delete')}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Delete Reply"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredData.length === 0 && !loading && (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No data to display</p>
                <p className="text-gray-400">Try changing filters or refresh data</p>
              </div>
            )}
          </div>
        </div>

        {/* Real-time Status */}
        {realTimeMonitoring && (
          <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center">
            <div className="w-2 h-2 bg-green-300 rounded-full mr-2 animate-pulse"></div>
            <span className="text-sm">Real-time monitoring active</span>
          </div>
        )}

        {/* View Details Modal */}
        {showViewModal && selectedReply && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            style={{ zIndex: 9999 }}
            onClick={(e) => {
              // Close modal if clicking backdrop
              if (e.target === e.currentTarget) {
                setShowViewModal(false);
              }
            }}
          >
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Reply Details</h3>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Reply Content */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">📝 Reply Content</h4>
                  <p className="text-gray-700 mb-2">{selectedReply?.content || 'No content'}</p>
                  <div className="text-sm text-gray-500">
                    <p>Author: {selectedReply?.replyAuthor || 'Unknown'}</p>
                    <p>Date: {selectedReply?.replyDate ? 
                      new Date(selectedReply.replyDate).toLocaleString() : 
                      (selectedReply?.processedAt ? new Date(selectedReply.processedAt).toLocaleString() : 'Unknown')}</p>
                  </div>
                </div>

                {/* Tour Information */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">🏨 Tour Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <p><strong>Tour:</strong> {selectedReply?.tourName || 'Unknown Tour'}</p>
                    <p><strong>Location:</strong> {
                      selectedReply?.tourLocation ? 
                        (typeof selectedReply.tourLocation === 'string' ? 
                          selectedReply.tourLocation : 
                          `${selectedReply.tourLocation.address || ''}, ${selectedReply.tourLocation.region || ''}`.replace(/^, |, $/, '') || 'N/A'
                        ) : 'N/A'
                    }</p>
                    <p><strong>Price:</strong> {selectedReply?.tourPrice ? '$' + selectedReply.tourPrice.toLocaleString() : 'N/A'}</p>
                    <p><strong>Tour ID:</strong> {selectedReply?.tourId || 'N/A'}</p>
                  </div>
                </div>

                {/* Review Information */}
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">⭐ Review Information</h4>
                  <p className="text-gray-700 mb-2">{selectedReply?.reviewContent || 'No review content'}</p>
                  <div className="text-sm text-gray-600">
                    <p><strong>Rating:</strong> {selectedReply?.reviewRating ? selectedReply.reviewRating + '/5 stars' : 'N/A'}</p>
                    <p><strong>Reviewer:</strong> {selectedReply?.reviewAuthor || 'Unknown'}</p>
                  </div>
                </div>

                {/* Detection Results */}
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">🛡️ Detection Results</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <p><strong>Status:</strong> 
                      <span className={`ml-1 px-2 py-1 rounded text-xs ${
                        selectedReply?.classification?.isSpam ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {selectedReply?.classification?.isSpam ? 'SPAM' : 'CLEAN'}
                      </span>
                    </p>
                    <p><strong>Confidence:</strong> {selectedReply?.classification?.confidence ? 
                      (selectedReply.classification.confidence * 100).toFixed(1) + '%' : 'N/A'}</p>
                    <p><strong>Model:</strong> {selectedReply?.classification?.modelUsed || 'N/A'}</p>
                    <p><strong>Processed:</strong> {selectedReply?.processedAt ? 
                      new Date(selectedReply.processedAt).toLocaleString() : 'Unknown'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Confirm Delete</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this reply? This action cannot be undone.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpamDashboard;