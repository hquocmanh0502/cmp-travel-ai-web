import React, { useState, useEffect } from 'react';

const BanManagementTest = () => {
  const [stats, setStats] = useState({
    activeBans: 0,
    weeklyViolations: 0,
    monthlyBans: 0
  });
  const [activeBans, setActiveBans] = useState([]);
  const [selectedTab, setSelectedTab] = useState('bans');

  useEffect(() => {
    console.log('BanManagementTest: Loading mock data...');
    
    // Force set mock data
    setStats({
      activeBans: 5,
      weeklyViolations: 23,
      monthlyBans: 12
    });

    setActiveBans([
      {
        _id: '1',
        userId: {
          _id: 'user1',
          username: 'johndoe',
          email: 'john@example.com',
          fullName: 'John Doe'
        },
        banType: 'reply_ban',
        reason: 'Multiple spam violations',
        severity: 'temporary',
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        bannedBy: { username: 'admin' }
      },
      {
        _id: '2',
        userId: {
          _id: 'user2',
          username: 'janesmith', 
          email: 'jane@example.com',
          fullName: 'Jane Smith'
        },
        banType: 'reply_ban',
        reason: 'Toxic behavior',
        severity: 'permanent',
        endDate: null,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        bannedBy: { username: 'admin' }
      }
    ]);

    console.log('BanManagementTest: Mock data loaded');
  }, []);

  const formatDuration = (endDate, severity) => {
    if (severity === 'permanent') return 'Permanent';
    if (!endDate) return 'Unknown';

    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;

    if (diff <= 0) return 'Expired';

    const hours = Math.ceil(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h`;
    const days = Math.ceil(hours / 24);
    return `${days}d`;
  };

  console.log('BanManagementTest render:', { stats, activeBans: activeBans.length, selectedTab });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Ban Management Test</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Active Bans</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.activeBans}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Weekly Violations</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.weeklyViolations}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Monthly Bans</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.monthlyBans}</p>
          </div>
        </div>
      </div>

      {/* Active Bans List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Active Bans ({activeBans.length})</h2>
        
        {activeBans.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No active bans</div>
        ) : (
          <div className="space-y-4">
            {activeBans.map((ban) => (
              <div key={ban._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-lg">
                        {ban.userId?.fullName || ban.userId?.username || 'Unknown User'}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        ban.severity === 'permanent' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {ban.severity}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-2">{ban.userId?.email}</p>
                    <p className="text-sm mb-2"><strong>Reason:</strong> {ban.reason}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Duration: {formatDuration(ban.endDate, ban.severity)}</span>
                      <span>Banned: {new Date(ban.createdAt).toLocaleDateString()}</span>
                      <span>By: {ban.bannedBy?.username || 'System'}</span>
                    </div>
                  </div>
                  <button className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm">
                    Lift Ban
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BanManagementTest;