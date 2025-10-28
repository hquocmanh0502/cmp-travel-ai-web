import React, { useState, useEffect } from "react";
import { MdSearch, MdFilterList, MdEdit, MdBlock, MdCheckCircle, MdEmail, MdPhone } from "react-icons/md";

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    // TODO: Replace with actual API call
    // fetch('http://localhost:3000/api/admin/users')
    //   .then(res => res.json())
    //   .then(data => setUsers(data))
    
    // Mock data
    setTimeout(() => {
      setUsers([
        {
          _id: "1",
          username: "johndoe",
          fullName: "John Doe",
          email: "john@example.com",
          phone: "+1234567890",
          verified: true,
          avatar: "https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff",
          createdAt: "2024-01-15",
          totalBookings: 5,
          totalSpent: 12500,
        },
        {
          _id: "2",
          username: "janesmith",
          fullName: "Jane Smith",
          email: "jane@example.com",
          phone: "+1234567891",
          verified: true,
          avatar: "https://ui-avatars.com/api/?name=Jane+Smith&background=FF6600&color=fff",
          createdAt: "2024-02-20",
          totalBookings: 3,
          totalSpent: 9600,
        },
        {
          _id: "3",
          username: "bobwilson",
          fullName: "Bob Wilson",
          email: "bob@example.com",
          phone: "+1234567892",
          verified: false,
          avatar: "https://ui-avatars.com/api/?name=Bob+Wilson&background=4B5563&color=fff",
          createdAt: "2024-03-10",
          totalBookings: 1,
          totalSpent: 1800,
        },
        {
          _id: "4",
          username: "alicebrown",
          fullName: "Alice Brown",
          email: "alice@example.com",
          phone: "+1234567893",
          verified: true,
          avatar: "https://ui-avatars.com/api/?name=Alice+Brown&background=8B5CF6&color=fff",
          createdAt: "2024-03-25",
          totalBookings: 7,
          totalSpent: 31500,
        },
        {
          _id: "5",
          username: "charliedavis",
          fullName: "Charlie Davis",
          email: "charlie@example.com",
          phone: "+1234567894",
          verified: true,
          avatar: "https://ui-avatars.com/api/?name=Charlie+Davis&background=10B981&color=fff",
          createdAt: "2024-04-05",
          totalBookings: 2,
          totalSpent: 4200,
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      filterStatus === "all" ||
      (filterStatus === "verified" && user.verified) ||
      (filterStatus === "unverified" && !user.verified);
    
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
            <p className="text-gray-600 mt-1">Manage all registered users and their activities</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
              <input
                type="text"
                placeholder="Search users by name, email, or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Filter by Status */}
          <div className="flex items-center gap-2">
            <MdFilterList className="text-gray-600 text-xl" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Users</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
          <StatBox label="Total Users" value={users.length} />
          <StatBox label="Verified" value={users.filter(u => u.verified).length} />
          <StatBox label="Unverified" value={users.filter(u => !u.verified).length} />
          <StatBox 
            label="Total Revenue" 
            value={formatCurrency(users.reduce((sum, u) => sum + u.totalSpent, 0))} 
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Bookings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4" colSpan="7">
                      <div className="h-12 bg-gray-200 animate-pulse rounded"></div>
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td className="px-6 py-12 text-center text-gray-500" colSpan="7">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                    {/* User */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar}
                          alt={user.fullName}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <p className="font-medium text-gray-800">{user.fullName}</p>
                          <p className="text-sm text-gray-600">@{user.username}</p>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MdEmail className="text-gray-400" />
                          {user.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MdPhone className="text-gray-400" />
                          {user.phone}
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      {user.verified ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          <MdCheckCircle />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                          <MdBlock />
                          Unverified
                        </span>
                      )}
                    </td>

                    {/* Joined */}
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(user.createdAt)}
                    </td>

                    {/* Bookings */}
                    <td className="px-6 py-4">
                      <span className="font-semibold text-gray-800">{user.totalBookings}</span>
                    </td>

                    {/* Total Spent */}
                    <td className="px-6 py-4">
                      <span className="font-semibold text-orange-600">
                        {formatCurrency(user.totalSpent)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <MdEdit />
                        </button>
                        <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <MdBlock />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Stat Box Component
function StatBox({ label, value }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
}

export default Users;
