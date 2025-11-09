import React, { useState, useEffect } from "react";
import { 
  MdSearch, MdFilterList, MdDownload, MdRefresh, 
  MdVisibility, MdEdit, MdDelete, MdCheckCircle, 
  MdCancel, MdPending, MdAttachMoney, MdPeople,
  MdCalendarToday, MdClose
} from "react-icons/md";

const API_BASE_URL = 'http://localhost:3000/api/admin';

function BookingsManagement() {
  // State
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination & Filters
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Modals
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Fetch bookings
  useEffect(() => {
    fetchBookings();
  }, [currentPage, statusFilter, paymentFilter, sortBy, sortOrder]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: limit,
        search: searchTerm,
        status: statusFilter,
        paymentStatus: paymentFilter,
        sortBy: sortBy,
        sortOrder: sortOrder
      });
      
      const response = await fetch(`${API_BASE_URL}/bookings?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setBookings(data.data.bookings);
        setTotalPages(data.data.pagination.totalPages);
        setTotal(data.data.pagination.total);
      } else {
        setError(data.error || 'Failed to fetch bookings');
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchBookings();
  };

  const handleRefresh = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPaymentFilter('all');
    setCurrentPage(1);
    fetchBookings();
  };

  const handleViewDetail = async (bookingId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedBooking(data.data);
        setShowDetailModal(true);
      }
    } catch (err) {
      console.error('Error fetching booking detail:', err);
      alert('Failed to load booking details');
    }
  };

  const handleStatusUpdate = (booking) => {
    setSelectedBooking(booking);
    setShowStatusModal(true);
  };

  const handlePaymentUpdate = (booking) => {
    setSelectedBooking(booking);
    setShowPaymentModal(true);
  };

  const handleEditBooking = async (bookingId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedBooking(data.data);
        setShowEditModal(true);
      }
    } catch (err) {
      console.error('Error fetching booking detail:', err);
      alert('Failed to load booking details');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    
    const icons = {
      pending: MdPending,
      confirmed: MdCheckCircle,
      completed: MdCheckCircle,
      cancelled: MdCancel
    };
    
    const Icon = icons[status] || MdPending;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        <Icon className="text-sm" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPaymentBadge = (paymentStatus) => {
    const styles = {
      unpaid: 'bg-red-100 text-red-700',
      partial: 'bg-orange-100 text-orange-700',
      paid: 'bg-green-100 text-green-700',
      refunded: 'bg-purple-100 text-purple-700'
    };
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[paymentStatus] || 'bg-gray-100 text-gray-700'}`}>
        <MdAttachMoney className="text-sm" />
        {paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Bookings Management</h1>
            <p className="text-gray-600 mt-1">Manage all tour bookings and reservations</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Bookings</p>
              <p className="text-2xl font-bold text-orange-600">{total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Customer or Tour
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by name, email, tour..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Search
              </button>
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Booking Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Payment Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Status
            </label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">All Payments</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <MdRefresh />
            Reset
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 font-medium">⚠️ {error}</p>
        </div>
      )}

      {/* Bookings Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Booking ID
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Customer
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Tour
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Departure
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Guests
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Amount
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Payment
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                    </div>
                    <p className="text-gray-500 mt-2">Loading bookings...</p>
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                    No bookings found
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking._id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-xs font-medium text-gray-900">
                        {booking.bookingId}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div>
                        <p className="text-xs font-medium text-gray-900 truncate max-w-[150px]">{booking.customerName}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[150px]">{booking.customerEmail}</p>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div>
                        <p className="text-xs font-medium text-gray-900 truncate max-w-[180px]">{booking.tourName}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[180px]">{booking.tourLocation}</p>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-xs text-gray-900">
                        {formatDate(booking.departureDate)}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-xs text-gray-900">
                        <MdPeople />
                        {booking.totalGuests}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div>
                        <p className="text-xs font-semibold text-gray-900">
                          {formatCurrency(booking.totalAmount)}
                        </p>
                        {booking.paidAmount > 0 && (
                          <p className="text-xs text-green-600">
                            Paid: {formatCurrency(booking.paidAmount)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {getStatusBadge(booking.status)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {getPaymentBadge(booking.paymentStatus)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewDetail(booking._id)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <MdVisibility className="text-sm" />
                        </button>
                        <button
                          onClick={() => handleEditBooking(booking._id)}
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Edit Booking"
                        >
                          <MdEdit className="text-sm" />
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(booking)}
                          className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Update Status"
                        >
                          <MdEdit className="text-sm" />
                        </button>
                        <button
                          onClick={() => handlePaymentUpdate(booking)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Update Payment"
                        >
                          <MdAttachMoney className="text-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm text-gray-700">
                Showing page {currentPage} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showDetailModal && selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedBooking(null);
          }}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />
      )}

      {showEditModal && selectedBooking && (
        <EditBookingModal
          booking={selectedBooking}
          onClose={() => {
            setShowEditModal(false);
            setSelectedBooking(null);
          }}
          onUpdate={() => {
            setShowEditModal(false);
            fetchBookings();
          }}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />
      )}

      {showStatusModal && selectedBooking && (
        <StatusUpdateModal
          booking={selectedBooking}
          onClose={() => {
            setShowStatusModal(false);
            setSelectedBooking(null);
          }}
          onUpdate={() => {
            setShowStatusModal(false);
            fetchBookings();
          }}
        />
      )}

      {showPaymentModal && selectedBooking && (
        <PaymentUpdateModal
          booking={selectedBooking}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedBooking(null);
          }}
          onUpdate={() => {
            setShowPaymentModal(false);
            fetchBookings();
          }}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
}

// Booking Detail Modal Component
function BookingDetailModal({ booking, onClose, formatCurrency, formatDate }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Booking Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MdClose className="text-xl" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Booking ID & Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Booking ID</p>
                <p className="text-lg font-bold text-gray-900">{booking.bookingId}</p>
              </div>
              <div className="flex gap-2">
                {getStatusBadge(booking.status)}
                {getPaymentBadge(booking.paymentStatus)}
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Customer Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Full Name</p>
                <p className="font-medium text-gray-900">{booking.customer.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Title</p>
                <p className="font-medium text-gray-900">{booking.customer.title}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{booking.customer.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium text-gray-900">{booking.customer.phone}</p>
              </div>
              {booking.customer.specialRequests && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Special Requests</p>
                  <p className="font-medium text-gray-900">{booking.customer.specialRequests}</p>
                </div>
              )}
            </div>
          </div>

          {/* Tour Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Tour Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <p className="text-sm text-gray-600">Tour Name</p>
                <p className="font-medium text-gray-900">{booking.tour.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-medium text-gray-900">{booking.tour.location}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="font-medium text-gray-900">{booking.tour.duration || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Tour Guide Info */}
          {booking.guide && booking.guide.name !== 'N/A' ? (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Tour Guide</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  {booking.guide.avatar && (
                    <img 
                      src={booking.guide.avatar} 
                      alt={booking.guide.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  )}
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium text-gray-900">{booking.guide.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium text-gray-900">{booking.guide.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Rating</p>
                      <p className="font-medium text-gray-900">
                        {booking.guide.rating ? `⭐ ${booking.guide.rating.toFixed(1)}` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Experience</p>
                      <p className="font-medium text-gray-900">{booking.guide.experience || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Tour Guide</h3>
              <p className="text-gray-500 italic">No tour guide assigned</p>
            </div>
          )}

          {/* Dates */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Travel Dates</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Departure</p>
                <p className="font-medium text-gray-900">{formatDate(booking.dates.departure)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Check-in</p>
                <p className="font-medium text-gray-900">{formatDate(booking.dates.checkin)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Check-out</p>
                <p className="font-medium text-gray-900">{formatDate(booking.dates.checkout)}</p>
              </div>
            </div>
          </div>

          {/* Guests & Rooms */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Guests</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Adults:</span>
                  <span className="font-medium">{booking.guests.adults}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Children:</span>
                  <span className="font-medium">{booking.guests.children}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Infants:</span>
                  <span className="font-medium">{booking.guests.infants}</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span>{booking.guests.total}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Rooms</h3>
              <div className="space-y-2">
                {Object.entries(booking.rooms).map(([type, count]) => 
                  count > 0 && (
                    <div key={type} className="flex justify-between">
                      <span className="text-gray-600 capitalize">{type.replace(/([A-Z])/g, ' $1')}:</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  )
                )}
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span>Total Rooms:</span>
                  <span>{booking.totalRooms}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Pricing Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Tour Base Cost:</span>
                <span className="font-medium">{formatCurrency(booking.pricing.tourBaseCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Accommodation:</span>
                <span className="font-medium">{formatCurrency(booking.pricing.accommodationCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Services:</span>
                <span className="font-medium">{formatCurrency(booking.pricing.servicesCost)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t-2">
                <span>Total Amount:</span>
                <span className="text-orange-600">{formatCurrency(booking.pricing.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Paid Amount:</span>
                <span className="font-medium">{formatCurrency(booking.pricing.paidAmount)}</span>
              </div>
              {booking.pricing.remainingAmount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Remaining:</span>
                  <span className="font-medium">{formatCurrency(booking.pricing.remainingAmount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Payment Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Payment Method</p>
                <p className="font-medium text-gray-900 capitalize">{booking.paymentMethod.replace(/_/g, ' ')}</p>
              </div>
              {booking.paymentDetails.paidAt && (
                <div>
                  <p className="text-sm text-gray-600">Paid At</p>
                  <p className="font-medium text-gray-900">{formatDate(booking.paymentDetails.paidAt)}</p>
                </div>
              )}
              {booking.paymentDetails.paymentReference && (
                <div>
                  <p className="text-sm text-gray-600">Reference</p>
                  <p className="font-medium text-gray-900">{booking.paymentDetails.paymentReference}</p>
                </div>
              )}
            </div>
          </div>

          {/* Admin Notes */}
          {booking.adminNotes && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Admin Notes</h3>
              <p className="text-gray-700 bg-yellow-50 p-4 rounded-lg">{booking.adminNotes}</p>
            </div>
          )}

          {/* Cancellation Info */}
          {booking.cancellation && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Cancellation Details</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-red-600">Cancelled On</p>
                  <p className="font-medium text-red-900">{formatDate(booking.cancellation.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-red-600">Reason</p>
                  <p className="font-medium text-red-900">{booking.cancellation.reason}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Status Update Modal Component
function StatusUpdateModal({ booking, onClose, onUpdate }) {
  const [newStatus, setNewStatus] = useState(booking.status);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (newStatus === 'cancelled' && !reason.trim()) {
      alert('Please provide a cancellation reason');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/bookings/${booking._id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Status updated successfully!');
        onUpdate();
      } else {
        alert('Error: ' + (data.error || 'Failed to update status'));
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Update Booking Status</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <MdClose className="text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">Booking ID: <span className="font-medium">{booking.bookingId}</span></p>
            <p className="text-sm text-gray-600">Customer: <span className="font-medium">{booking.customerName}</span></p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              required
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {newStatus === 'cancelled' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cancellation Reason *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                rows="3"
                placeholder="Please provide a reason for cancellation..."
                required
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300"
            >
              {loading ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Payment Update Modal Component
function PaymentUpdateModal({ booking, onClose, onUpdate, formatCurrency }) {
  const [paymentStatus, setPaymentStatus] = useState(booking.paymentStatus);
  const [paidAmount, setPaidAmount] = useState(booking.paidAmount || 0);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/bookings/${booking._id}/payment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          paymentStatus, 
          paidAmount: parseFloat(paidAmount),
          paymentReference,
          paymentNote 
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Payment updated successfully!');
        onUpdate();
      } else {
        alert('Error: ' + (data.error || 'Failed to update payment'));
      }
    } catch (err) {
      console.error('Error updating payment:', err);
      alert('Failed to update payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Update Payment</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <MdClose className="text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(booking.totalAmount)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Status
            </label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              required
            >
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paid Amount
            </label>
            <input
              type="number"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              min="0"
              max={booking.totalAmount}
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Reference (Optional)
            </label>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              placeholder="Transaction ID, Reference Number..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Note (Optional)
            </label>
            <textarea
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              rows="2"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300"
            >
              {loading ? 'Updating...' : 'Update Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Booking Modal Component
function EditBookingModal({ booking, onClose, onUpdate, formatCurrency, formatDate }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Customer info
    customerTitle: booking.customer.title || 'Mr',
    customerName: booking.customer.name || '',
    customerEmail: booking.customer.email || '',
    customerPhone: booking.customer.phone || '',
    specialRequests: booking.customer.specialRequests || '',
    
    // Guests
    adults: booking.guests.adults || 1,
    children: booking.guests.children || 0,
    infants: booking.guests.infants || 0,
    
    // Dates
    departureDate: booking.dates.departure ? new Date(booking.dates.departure).toISOString().split('T')[0] : '',
    checkinDate: booking.dates.checkin ? new Date(booking.dates.checkin).toISOString().split('T')[0] : '',
    checkoutDate: booking.dates.checkout ? new Date(booking.dates.checkout).toISOString().split('T')[0] : '',
    
    // Admin notes
    adminNotes: booking.adminNotes || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Prepare update data
      const updateData = {
        customerInfo: {
          title: formData.customerTitle,
          fullName: formData.customerName,
          email: formData.customerEmail,
          phone: formData.customerPhone,
          specialRequests: formData.specialRequests
        },
        adults: parseInt(formData.adults),
        children: parseInt(formData.children),
        infants: parseInt(formData.infants),
        departureDate: new Date(formData.departureDate),
        checkinDate: new Date(formData.checkinDate),
        checkoutDate: new Date(formData.checkoutDate),
        adminNotes: formData.adminNotes
      };
      
      const response = await fetch(`${API_BASE_URL}/bookings/${booking._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('✅ Booking updated successfully!');
        onUpdate();
      } else {
        alert('❌ Error: ' + (data.error || 'Failed to update booking'));
      }
    } catch (err) {
      console.error('Error updating booking:', err);
      alert('❌ Error updating booking: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Fixed Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Edit Booking</h2>
            <p className="text-sm text-gray-600">ID: {booking.bookingId}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <MdClose className="text-xl" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form id="edit-booking-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
          {/* Customer Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <select
                  name="customerTitle"
                  value={formData.customerTitle}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="Mr">Mr</option>
                  <option value="Mrs">Mrs</option>
                  <option value="Ms">Ms</option>
                  <option value="Dr">Dr</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="customerEmail"
                  value={formData.customerEmail}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  name="customerPhone"
                  value={formData.customerPhone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Requests
                </label>
                <textarea
                  name="specialRequests"
                  value={formData.specialRequests}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  rows="2"
                  placeholder="Any special requests or notes..."
                />
              </div>
            </div>
          </div>

          {/* Travel Dates */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Travel Dates</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Departure Date *
                </label>
                <input
                  type="date"
                  name="departureDate"
                  value={formData.departureDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Check-in Date *
                </label>
                <input
                  type="date"
                  name="checkinDate"
                  value={formData.checkinDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Check-out Date *
                </label>
                <input
                  type="date"
                  name="checkoutDate"
                  value={formData.checkoutDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Number of Guests */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Number of Guests</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adults *
                </label>
                <input
                  type="number"
                  name="adults"
                  value={formData.adults}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  min="1"
                  max="20"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Children
                </label>
                <input
                  type="number"
                  name="children"
                  value={formData.children}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  min="0"
                  max="20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Infants
                </label>
                <input
                  type="number"
                  name="infants"
                  value={formData.infants}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  min="0"
                  max="10"
                />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Total Guests: {parseInt(formData.adults) + parseInt(formData.children) + parseInt(formData.infants)}
            </p>
          </div>

          {/* Admin Notes */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Admin Notes</h3>
            <textarea
              name="adminNotes"
              value={formData.adminNotes}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              rows="3"
              placeholder="Internal notes for admin reference..."
            />
          </div>

          {/* Tour Info (Read-only) */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Tour Information (Read-only)</h3>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Tour: <span className="font-medium text-gray-900">{booking.tour.name}</span></p>
              <p className="text-sm text-gray-600">Location: <span className="font-medium text-gray-900">{booking.tour.location}</span></p>
              <p className="text-sm text-gray-600">Total Amount: <span className="font-medium text-gray-900">{formatCurrency(booking.pricing.totalAmount)}</span></p>
            </div>
          </div>
          </div>
        </form>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-booking-form"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 transition-colors"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function to get status badge
function getStatusBadge(status) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700'
  };
  
  const icons = {
    pending: MdPending,
    confirmed: MdCheckCircle,
    completed: MdCheckCircle,
    cancelled: MdCancel
  };
  
  const Icon = icons[status] || MdPending;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      <Icon className="text-sm" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// Helper function to get payment badge
function getPaymentBadge(paymentStatus) {
  const styles = {
    unpaid: 'bg-red-100 text-red-700',
    partial: 'bg-orange-100 text-orange-700',
    paid: 'bg-green-100 text-green-700',
    refunded: 'bg-purple-100 text-purple-700'
  };
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[paymentStatus] || 'bg-gray-100 text-gray-700'}`}>
      <MdAttachMoney className="text-sm" />
      {paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}
    </span>
  );
}

export default BookingsManagement;
