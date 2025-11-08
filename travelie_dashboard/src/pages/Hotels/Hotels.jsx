import React, { useState, useEffect } from "react";
import { MdSearch, MdFilterList, MdAdd, MdStar, MdLocationOn, MdEdit, MdDelete, MdVisibility, MdWifi, MdPool, MdRestaurant, MdLocalParking, MdToggleOn, MdToggleOff, MdRefresh, MdWarning, MdClose } from "react-icons/md";

function Hotels() {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [stats, setStats] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [error, setError] = useState("");

  // 🔍 DEBUG Console
  const debugLog = (action, data) => {
    console.log(`[HOTEL-MANAGEMENT] ${new Date().toISOString()}`);
    console.log(`Action: ${action}`);
    console.log('Data:', data);
    console.log('=' + '='.repeat(50));
  };

  // Fetch hotels from API
  const fetchHotels = async () => {
    try {
      debugLog('FETCH_HOTELS_START', { searchTerm, filterCountry, filterStatus });
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterCountry !== 'all') params.append('country', filterCountry);
      if (filterStatus !== 'all') params.append('status', filterStatus);

      const response = await fetch(`http://localhost:3000/api/admin/hotels?${params}`);
      const data = await response.json();

      debugLog('FETCH_HOTELS_RESPONSE', { 
        success: data.success, 
        count: data.hotels?.length || data.data?.length || 0,
        hasHotels: !!data.hotels,
        hasData: !!data.data,
        responseKeys: Object.keys(data)
      });

      if (data.success) {
        // Handle both response formats
        const hotels = data.hotels || data.data || [];
        setHotels(hotels);
      } else {
        setError(data.message || 'Failed to fetch hotels');
        debugLog('FETCH_HOTELS_ERROR', { error: data.message });
      }
    } catch (error) {
      debugLog('FETCH_HOTELS_EXCEPTION', { error: error.message });
      console.error('Error fetching hotels:', error);
      setError('Failed to connect to server - Using mock data');
      
      // Fallback to mock data
      const mockHotels = [
        {
          _id: "1",
          name: "Grand Luxury Hotel",
          location: "Paris, France", 
          stars: 5,
          rating: 4.8,
          reviewCount: 1243,
          pricePerNight: 250,
          images: ["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&q=80"],
          amenities: ["wifi", "pool", "restaurant", "parking"],
          roomTypes: [{name: "Deluxe", count: 120}],
          status: "active"
        },
        {
          _id: "2", 
          name: "Seaside Resort & Spa",
          location: "Bali, Indonesia",
          stars: 4,
          rating: 4.6,
          reviewCount: 856, 
          pricePerNight: 180,
          images: ["https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=500&q=80"],
          amenities: ["wifi", "pool", "restaurant"],
          roomTypes: [{name: "Suite", count: 85}],
          status: "active"
        },
        {
          _id: "3",
          name: "Mountain View Lodge",
          location: "Hanoi, Vietnam", 
          stars: 3,
          rating: 4.3,
          reviewCount: 423,
          pricePerNight: 65,
          images: ["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=500&q=80"],
          amenities: ["wifi", "restaurant"],
          roomTypes: [{name: "Standard", count: 45}],
          status: "inactive"
        }
      ];
      
      setHotels(mockHotels);
      debugLog('USING_MOCK_DATA', { count: mockHotels.length });
    } finally {
      setLoading(false);
    }
  };

  // Fetch hotel statistics
  const fetchStats = async () => {
    try {
      debugLog('FETCH_STATS_START', {});
      const response = await fetch('http://localhost:3000/api/admin/hotels/stats/overview');
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
        debugLog('FETCH_STATS_SUCCESS', data.stats);
      }
    } catch (error) {
      debugLog('FETCH_STATS_ERROR', { error: error.message });
      // Mock stats for development
      setStats({
        total: hotels.length,
        active: hotels.filter(h => h.status === 'active').length,
        inactive: hotels.filter(h => h.status === 'inactive').length,
        starDistribution: { '5': 1, '4': 1, '3': 1 }
      });
    }
  };

  // Delete hotel
  const handleDelete = async (hotelId) => {
    if (!window.confirm('Are you sure you want to delete this hotel?')) return;

    try {
      debugLog('DELETE_HOTEL_START', { hotelId });
      
      const response = await fetch(`http://localhost:3000/api/admin/hotels/${hotelId}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        debugLog('DELETE_HOTEL_SUCCESS', { hotelId });
        fetchHotels(); // Refresh list
        fetchStats(); // Refresh stats
        alert('Hotel deleted successfully!');
      } else {
        debugLog('DELETE_HOTEL_ERROR', { error: data.message });
        alert(data.message || 'Failed to delete hotel');
      }
    } catch (error) {
      debugLog('DELETE_HOTEL_EXCEPTION', { error: error.message });
      alert('Failed to delete hotel');
    }
  };

  // Toggle hotel status
  const handleToggleStatus = async (hotelId, currentStatus) => {
    try {
      debugLog('TOGGLE_STATUS_START', { hotelId, currentStatus });
      
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const response = await fetch(`http://localhost:3000/api/admin/hotels/${hotelId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await response.json();

      if (data.success) {
        debugLog('TOGGLE_STATUS_SUCCESS', { hotelId, newStatus });
        fetchHotels(); // Refresh list
        fetchStats(); // Refresh stats
      } else {
        debugLog('TOGGLE_STATUS_ERROR', { error: data.message });
        alert(data.message || 'Failed to update hotel status');
      }
    } catch (error) {
      debugLog('TOGGLE_STATUS_EXCEPTION', { error: error.message });
      alert('Failed to update hotel status');
    }
  };

  // Initial load
  useEffect(() => {
    debugLog('COMPONENT_MOUNTED', {});
    fetchHotels();
    fetchStats();
  }, []);

  // Search and filter effect
  useEffect(() => {
    debugLog('FILTERS_CHANGED', { searchTerm, filterCountry, filterStatus });
    const timeoutId = setTimeout(() => {
      fetchHotels();
    }, 500); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filterCountry, filterStatus]);

  const filteredHotels = hotels.filter(hotel => {
    // Fix location search - location is an object with city and country
    const locationString = hotel.location 
      ? `${hotel.location.city || ''} ${hotel.location.country || ''} ${hotel.location.address || ''}` 
      : '';
    
    const matchesSearch = 
      hotel.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      locationString.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by country
    const matchesCountry = 
      filterCountry === "all" ||
      hotel.location?.country?.toLowerCase() === filterCountry.toLowerCase();
      
    const matchesStatus = 
      filterStatus === "all" ||
      hotel.status === filterStatus;
    
    return matchesSearch && matchesCountry && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Hotel Management</h1>
            <p className="text-gray-600 mt-1">Manage hotel listings and availability</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                debugLog('REFRESH_CLICKED', {});
                fetchHotels();
                fetchStats();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <MdRefresh />
              Refresh
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <MdAdd />
              Add Hotel
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-yellow-700">
            <MdWarning />
            <span className="font-semibold">Notice:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
              <input
                type="text"
                placeholder="Search hotels by name or location..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  debugLog('SEARCH_CHANGED', { searchTerm: e.target.value });
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Filter by Country */}
          <div className="flex items-center gap-2">
            <MdFilterList className="text-gray-600 text-xl" />
            <select
              value={filterCountry}
              onChange={(e) => {
                setFilterCountry(e.target.value);
                debugLog('COUNTRY_FILTER_CHANGED', { filterCountry: e.target.value });
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Countries</option>
              <option value="Viet Nam">🇻🇳 Vietnam</option>
              <option value="Thailand">🇹🇭 Thailand</option>
              <option value="United Kingdom">🇬🇧 United Kingdom</option>
              <option value="Canada">🇨🇦 Canada</option>
              <option value="Australia">🇦🇺 Australia</option>
              <option value="Singapore">🇸🇬 Singapore</option>
              <option value="Malaysia">🇲🇾 Malaysia</option>
              <option value="Japan">🇯🇵 Japan</option>
            </select>
          </div>

          {/* Filter by Status */}
          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                debugLog('STATUS_FILTER_CHANGED', { filterStatus: e.target.value });
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 pt-4 border-t border-gray-200">
          <StatBox label="Total Hotels" value={stats.total || hotels.length} />
          <StatBox label="Active Hotels" value={stats.active || hotels.filter(h => h.status === 'active').length} />
          <StatBox label="Inactive Hotels" value={stats.inactive || hotels.filter(h => h.status === 'inactive').length} />
          <StatBox label="5-Star Hotels" value={stats.starDistribution?.[5] || hotels.filter(h => (h.details?.starRating || h.stars) === 5).length} />
          <StatBox label="Avg Rating" value={hotels.length > 0 ? (hotels.reduce((sum, h) => {
            const rating = h.details?.rating || h.reviewsSummary?.averageRating || h.rating || 0;
            return sum + rating;
          }, 0) / hotels.length).toFixed(1) + ' ⭐' : '0 ⭐'} />
        </div>
      </div>

      {/* Hotels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="h-48 bg-gray-200 animate-pulse"></div>
              <div className="p-4 space-y-3">
                <div className="h-6 bg-gray-200 animate-pulse rounded"></div>
                <div className="h-4 bg-gray-200 animate-pulse rounded w-2/3"></div>
                <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2"></div>
              </div>
            </div>
          ))
        ) : filteredHotels.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            <MdWarning className="text-4xl mx-auto mb-4" />
            <p>No hotels found</p>
            {(searchTerm || filterCountry !== 'all' || filterStatus !== 'all') && (
              <p className="text-sm mt-2">Try adjusting your search or filters</p>
            )}
          </div>
        ) : (
          filteredHotels.map((hotel) => (
            <HotelCard 
              key={hotel._id} 
              hotel={hotel} 
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
              onEdit={(hotel) => {
                setSelectedHotel(hotel);
                setShowEditModal(true);
              }}
              onView={(hotel) => {
                setSelectedHotel(hotel);
                setShowViewModal(true);
              }}
              debugLog={debugLog}
            />
          ))
        )}
      </div>

      {/* Add Hotel Modal */}
      {showAddModal && (
        <AddHotelModal 
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchHotels();
            fetchStats();
          }}
          debugLog={debugLog}
        />
      )}

      {/* Edit Hotel Modal */}
      {showEditModal && selectedHotel && (
        <EditHotelModal 
          hotel={selectedHotel}
          onClose={() => {
            setShowEditModal(false);
            setSelectedHotel(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedHotel(null);
            fetchHotels();
            fetchStats();
          }}
          debugLog={debugLog}
        />
      )}

      {/* View Hotel Modal */}
      {showViewModal && selectedHotel && (
        <ViewHotelModal 
          hotel={selectedHotel}
          onClose={() => {
            setShowViewModal(false);
            setSelectedHotel(null);
          }}
          debugLog={debugLog}
        />
      )}
    </div>
  );
}

// Hotel Card Component
function HotelCard({ hotel, onDelete, onToggleStatus, onEdit, onView, debugLog }) {
  const amenityIcons = {
    wifi: <MdWifi />,
    pool: <MdPool />,
    restaurant: <MdRestaurant />,
    parking: <MdLocalParking />,
  };

  const handleCardClick = (action, data) => {
    debugLog(`HOTEL_CARD_${action.toUpperCase()}`, { hotelId: hotel._id, hotelName: hotel.name, ...data });
  };

  return (
    <div className={`bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-all duration-300 group ${
      hotel.status === 'inactive' ? 'border-red-200 bg-red-50' : 'border-gray-200'
    }`}>
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={hotel.details?.mainImage || hotel.details?.images?.[0] || hotel.images?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&q=80"}
          alt={hotel.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        {/* Stars Badge */}
        <div className="absolute top-3 left-3 bg-white px-2 py-1 rounded-lg shadow-md flex items-center gap-1">
          {Array.from({ length: hotel.details?.starRating || hotel.stars || 0 }).map((_, i) => (
            <MdStar key={i} className="text-yellow-400 text-sm" />
          ))}
        </div>
        {/* Rating Badge */}
        {hotel.details?.rating && (
          <div className="absolute top-3 right-3 bg-orange-600 text-white px-2 py-1 rounded-lg shadow-md font-semibold text-sm">
            {hotel.details.rating.toFixed(1)} ⭐
          </div>
        )}
        {/* Status Badge */}
        <div className={`absolute bottom-3 left-3 px-2 py-1 rounded-lg shadow-md text-xs font-semibold ${
          hotel.status === 'active' 
            ? 'bg-green-600 text-white' 
            : 'bg-red-600 text-white'
        }`}>
          {hotel.status?.toUpperCase()}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-lg text-gray-800 mb-2 line-clamp-1">
          {hotel.name}
        </h3>
        
        {/* Location */}
        <div className="flex items-center gap-1 text-gray-600 text-sm mb-3">
          <MdLocationOn className="text-orange-600" />
          {hotel.location?.city && hotel.location?.country 
            ? `${hotel.location.city}, ${hotel.location.country}` 
            : hotel.location || 'Location not specified'}
        </div>

        {/* Amenities */}
        {(hotel.details?.amenities || hotel.amenities) && (hotel.details?.amenities || hotel.amenities).length > 0 && (
          <div className="flex gap-2 mb-3">
            {(hotel.details?.amenities || hotel.amenities).slice(0, 4).map((amenity, i) => (
              <div
                key={i}
                className="p-2 bg-gray-100 text-gray-600 rounded-lg text-lg"
                title={amenity}
              >
                {amenityIcons[amenity] || <MdWifi />}
              </div>
            ))}
            {(hotel.details?.amenities || hotel.amenities).length > 4 && (
              <div className="p-2 bg-gray-100 text-gray-600 rounded-lg text-xs">
                +{(hotel.details?.amenities || hotel.amenities).length - 4}
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
          <div>
            <p className="text-xs text-gray-600">Rooms</p>
            <p className="font-semibold text-gray-800">
              {hotel.details?.roomTypes?.reduce((sum, room) => sum + (room.totalRooms || room.count || 0), 0) || 
               hotel.roomTypes?.reduce((sum, room) => sum + (room.count || 0), 0) || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Reviews</p>
            <p className="font-semibold text-gray-800">
              {hotel.reviewsSummary?.totalReviews || hotel.reviewCount || 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Rating</p>
            <p className="font-semibold text-gray-800">
              {hotel.details?.rating ? `${hotel.details.rating.toFixed(1)} ⭐` : hotel.reviewsSummary?.averageRating ? `${hotel.reviewsSummary.averageRating.toFixed(1)} ⭐` : 'N/A'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button 
            onClick={() => {
              handleCardClick('view', {});
              onView(hotel);
            }}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
          >
            <MdVisibility />
            View
          </button>
          <button 
            onClick={() => {
              handleCardClick('edit', {});
              onEdit(hotel);
            }}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors text-sm"
          >
            <MdEdit />
            Edit
          </button>
          <button 
            onClick={() => {
              handleCardClick('toggle_status', { currentStatus: hotel.status });
              onToggleStatus(hotel._id, hotel.status);
            }}
            className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors text-sm ${
              hotel.status === 'active'
                ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                : 'bg-green-50 text-green-600 hover:bg-green-100'
            }`}
          >
            {hotel.status === 'active' ? <MdToggleOff /> : <MdToggleOn />}
          </button>
          <button 
            onClick={() => {
              handleCardClick('delete', {});
              onDelete(hotel._id);
            }}
            className="flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
          >
            <MdDelete />
          </button>
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

// Add Hotel Modal Component
function AddHotelModal({ onClose, onSuccess, debugLog }) {
  const [formData, setFormData] = useState({
    name: '',
    location: {
      address: '',
      city: '',
      country: '',
      coordinates: [0, 0],
      distanceToCenter: 0
    },
    details: {
      starRating: 5,
      rating: 0,
      priceRange: { min: 50, max: 500 },
      currency: 'USD',
      mainImage: '',
      amenities: [],
      roomTypes: [{
        type: 'Superior',
        name: 'Superior Room',
        price: 100,
        capacity: { adults: 2, children: 1, total: 3 },
        size: 25,
        bedInfo: '1 Queen Bed',
        totalRooms: 10,
        availableRooms: 10,
        available: true
      }],
      images: [],
      description: '',
      checkInTime: '14:00',
      checkOutTime: '12:00',
      policies: {
        cancellation: '',
        petPolicy: '',
        childPolicy: ''
      }
    },
    reviewsSummary: {
      totalReviews: 0,
      averageRating: 0,
      ratings: {
        cleanliness: 0,
        comfort: 0,
        location: 0,
        service: 0,
        value: 0
      }
    },
    status: 'active'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      debugLog('ADD_HOTEL_START', formData);
      
      const response = await fetch('http://localhost:3000/api/admin/hotels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();

      if (data.success) {
        debugLog('ADD_HOTEL_SUCCESS', { hotelId: data.hotel._id });
        alert('Hotel added successfully!');
        onSuccess();
      } else {
        debugLog('ADD_HOTEL_ERROR', { error: data.message });
        alert(data.message || 'Failed to add hotel');
      }
    } catch (error) {
      debugLog('ADD_HOTEL_EXCEPTION', { error: error.message });
      alert('Failed to add hotel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold">Add New Hotel</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <MdClose className="text-2xl" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hotel Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Star Rating *</label>
                <select
                  value={formData.details.starRating}
                  onChange={(e) => setFormData({
                    ...formData, 
                    details: {...formData.details, starRating: parseInt(e.target.value)}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value={1}>1 Star</option>
                  <option value={2}>2 Stars</option>
                  <option value={3}>3 Stars</option>
                  <option value={4}>4 Stars</option>
                  <option value={5}>5 Stars</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                rows="3"
                value={formData.details.description}
                onChange={(e) => setFormData({
                  ...formData, 
                  details: {...formData.details, description: e.target.value}
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Main Image URL *</label>
                <input
                  type="url"
                  required
                  value={formData.details.mainImage}
                  onChange={(e) => setFormData({
                    ...formData, 
                    details: {...formData.details, mainImage: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                <input
                  type="text"
                  required
                  value={formData.location.address}
                  onChange={(e) => setFormData({
                    ...formData, 
                    location: {...formData.location, address: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                <input
                  type="text"
                  required
                  value={formData.location.city}
                  onChange={(e) => setFormData({
                    ...formData, 
                    location: {...formData.location, city: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
                <input
                  type="text"
                  required
                  value={formData.location.country}
                  onChange={(e) => setFormData({
                    ...formData, 
                    location: {...formData.location, country: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Distance to Center (km)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.location.distanceToCenter}
                  onChange={(e) => setFormData({
                    ...formData, 
                    location: {...formData.location, distanceToCenter: parseFloat(e.target.value)}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Price Range */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Price Range</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min Price *</label>
                <input
                  type="number"
                  required
                  value={formData.details.priceRange.min}
                  onChange={(e) => setFormData({
                    ...formData, 
                    details: {
                      ...formData.details, 
                      priceRange: {...formData.details.priceRange, min: parseInt(e.target.value)}
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Price *</label>
                <input
                  type="number"
                  required
                  value={formData.details.priceRange.max}
                  onChange={(e) => setFormData({
                    ...formData, 
                    details: {
                      ...formData.details, 
                      priceRange: {...formData.details.priceRange, max: parseInt(e.target.value)}
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                <select
                  value={formData.details.currency}
                  onChange={(e) => setFormData({
                    ...formData, 
                    details: {...formData.details, currency: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="VND">VND</option>
                </select>
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Amenities</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['wifi', 'pool', 'gym', 'spa', 'restaurant', 'parking', 'breakfast', 'room-service'].map(amenity => (
                <label key={amenity} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.details.amenities.includes(amenity)}
                    onChange={(e) => {
                      const amenities = e.target.checked 
                        ? [...formData.details.amenities, amenity]
                        : formData.details.amenities.filter(a => a !== amenity);
                      setFormData({
                        ...formData,
                        details: {...formData.details, amenities}
                      });
                    }}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-sm capitalize">{amenity.replace('-', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Check-in/Check-out Times */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Check-in/Check-out</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Check-in Time</label>
                <input
                  type="time"
                  value={formData.details.checkInTime}
                  onChange={(e) => setFormData({
                    ...formData, 
                    details: {...formData.details, checkInTime: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Check-out Time</label>
                <input
                  type="time"
                  value={formData.details.checkOutTime}
                  onChange={(e) => setFormData({
                    ...formData, 
                    details: {...formData.details, checkOutTime: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Hotel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Hotel Modal Component  
function EditHotelModal({ hotel, onClose, onSuccess, debugLog }) {
  const [formData, setFormData] = useState({
    name: hotel.name || '',
    location: {
      address: hotel.location?.address || '',
      city: hotel.location?.city || '',
      country: hotel.location?.country || '',
      coordinates: hotel.location?.coordinates || [0, 0],
      distanceToCenter: hotel.location?.distanceToCenter || 0
    },
    details: {
      starRating: hotel.details?.starRating || hotel.stars || 5,
      rating: hotel.details?.rating || 0,
      priceRange: {
        min: hotel.details?.priceRange?.min || 50,
        max: hotel.details?.priceRange?.max || 500
      },
      currency: hotel.details?.currency || 'USD',
      mainImage: hotel.details?.mainImage || '',
      amenities: hotel.details?.amenities || [],
      roomTypes: hotel.details?.roomTypes || [{
        type: 'Superior',
        name: 'Superior Room',
        price: 100,
        capacity: { adults: 2, children: 1, total: 3 },
        size: 25,
        bedInfo: '1 Queen Bed',
        totalRooms: 10,
        availableRooms: 10,
        available: true
      }],
      images: hotel.details?.images || [],
      description: hotel.details?.description || '',
      checkInTime: hotel.details?.checkInTime || '14:00',
      checkOutTime: hotel.details?.checkOutTime || '12:00',
      policies: {
        cancellation: hotel.details?.policies?.cancellation || '',
        petPolicy: hotel.details?.policies?.petPolicy || '',
        childPolicy: hotel.details?.policies?.childPolicy || ''
      }
    },
    reviewsSummary: {
      totalReviews: hotel.reviewsSummary?.totalReviews || 0,
      averageRating: hotel.reviewsSummary?.averageRating || 0,
      ratings: {
        cleanliness: hotel.reviewsSummary?.ratings?.cleanliness || 0,
        comfort: hotel.reviewsSummary?.ratings?.comfort || 0,
        location: hotel.reviewsSummary?.ratings?.location || 0,
        service: hotel.reviewsSummary?.ratings?.service || 0,
        value: hotel.reviewsSummary?.ratings?.value || 0
      }
    },
    status: hotel.status || 'active'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      debugLog('EDIT_HOTEL_START', { hotelId: hotel._id, formData });
      
      const response = await fetch(`http://localhost:3000/api/admin/hotels/${hotel._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();

      if (data.success) {
        debugLog('EDIT_HOTEL_SUCCESS', { hotelId: hotel._id });
        alert('Hotel updated successfully!');
        onSuccess();
      } else {
        debugLog('EDIT_HOTEL_ERROR', { error: data.message });
        alert(data.message || 'Failed to update hotel');
      }
    } catch (error) {
      debugLog('EDIT_HOTEL_EXCEPTION', { error: error.message });
      alert('Failed to update hotel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold">Edit Hotel: {hotel.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <MdClose className="text-2xl" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hotel Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Star Rating *</label>
                <select
                  value={formData.details.starRating}
                  onChange={(e) => setFormData({
                    ...formData, 
                    details: {...formData.details, starRating: parseInt(e.target.value)}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value={1}>1 Star</option>
                  <option value={2}>2 Stars</option>
                  <option value={3}>3 Stars</option>
                  <option value={4}>4 Stars</option>
                  <option value={5}>5 Stars</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                rows="3"
                value={formData.details.description}
                onChange={(e) => setFormData({
                  ...formData, 
                  details: {...formData.details, description: e.target.value}
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Main Image URL *</label>
                <input
                  type="url"
                  required
                  value={formData.details.mainImage}
                  onChange={(e) => setFormData({
                    ...formData, 
                    details: {...formData.details, mainImage: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                <input
                  type="text"
                  required
                  value={formData.location.address}
                  onChange={(e) => setFormData({
                    ...formData, 
                    location: {...formData.location, address: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                <input
                  type="text"
                  required
                  value={formData.location.city}
                  onChange={(e) => setFormData({
                    ...formData, 
                    location: {...formData.location, city: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
                <input
                  type="text"
                  required
                  value={formData.location.country}
                  onChange={(e) => setFormData({
                    ...formData, 
                    location: {...formData.location, country: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Distance to Center (km)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.location.distanceToCenter}
                  onChange={(e) => setFormData({
                    ...formData, 
                    location: {...formData.location, distanceToCenter: parseFloat(e.target.value)}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Price Range */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Price Range</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min Price *</label>
                <input
                  type="number"
                  required
                  value={formData.details.priceRange.min}
                  onChange={(e) => setFormData({
                    ...formData, 
                    details: {
                      ...formData.details, 
                      priceRange: {...formData.details.priceRange, min: parseInt(e.target.value)}
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Price *</label>
                <input
                  type="number"
                  required
                  value={formData.details.priceRange.max}
                  onChange={(e) => setFormData({
                    ...formData, 
                    details: {
                      ...formData.details, 
                      priceRange: {...formData.details.priceRange, max: parseInt(e.target.value)}
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                <select
                  value={formData.details.currency}
                  onChange={(e) => setFormData({
                    ...formData, 
                    details: {...formData.details, currency: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="VND">VND</option>
                </select>
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Amenities</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['wifi', 'pool', 'gym', 'spa', 'restaurant', 'parking', 'breakfast', 'room-service'].map(amenity => (
                <label key={amenity} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.details.amenities.includes(amenity)}
                    onChange={(e) => {
                      const amenities = e.target.checked 
                        ? [...formData.details.amenities, amenity]
                        : formData.details.amenities.filter(a => a !== amenity);
                      setFormData({
                        ...formData,
                        details: {...formData.details, amenities}
                      });
                    }}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-sm capitalize">{amenity.replace('-', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Check-in/Check-out Times */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Check-in/Check-out</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Check-in Time</label>
                <input
                  type="time"
                  value={formData.details.checkInTime}
                  onChange={(e) => setFormData({
                    ...formData, 
                    details: {...formData.details, checkInTime: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Check-out Time</label>
                <input
                  type="time"
                  value={formData.details.checkOutTime}
                  onChange={(e) => setFormData({
                    ...formData, 
                    details: {...formData.details, checkOutTime: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Hotel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// View Hotel Modal Component
function ViewHotelModal({ hotel, onClose, debugLog }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold">Hotel Details: {hotel.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <MdClose className="text-2xl" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Hotel Image */}
          <div className="relative h-64 overflow-hidden rounded-lg">
            <img
              src={hotel.details?.mainImage || hotel.details?.images?.[0] || hotel.images?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&q=80"}
              alt={hotel.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Hotel Name:</span>
                  <span className="font-medium">{hotel.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Star Rating:</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: hotel.details?.starRating || hotel.stars || 0 }).map((_, i) => (
                      <MdStar key={i} className="text-yellow-400" />
                    ))}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    hotel.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {hotel.status?.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average Rating:</span>
                  <span className="font-medium">
                    {hotel.details?.rating 
                      ? `${hotel.details.rating.toFixed(1)} ⭐` 
                      : hotel.reviewsSummary?.averageRating 
                      ? `${hotel.reviewsSummary.averageRating.toFixed(1)} ⭐`
                      : 'No ratings yet'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Location</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Address:</span>
                  <span className="font-medium text-right">{hotel.location?.address || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">City:</span>
                  <span className="font-medium">{hotel.location?.city || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Country:</span>
                  <span className="font-medium">{hotel.location?.country || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Distance to Center:</span>
                  <span className="font-medium">{hotel.location?.distanceToCenter || 0} km</span>
                </div>
              </div>
            </div>
          </div>

          {/* Price Range */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Pricing</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600 text-sm">Min Price</p>
                <p className="font-bold text-lg">{hotel.details?.priceRange?.min || 'N/A'} {hotel.details?.currency || 'USD'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600 text-sm">Max Price</p>
                <p className="font-bold text-lg">{hotel.details?.priceRange?.max || 'N/A'} {hotel.details?.currency || 'USD'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600 text-sm">Currency</p>
                <p className="font-bold text-lg">{hotel.details?.currency || 'USD'}</p>
              </div>
            </div>
          </div>

          {/* Amenities */}
          {(hotel.details?.amenities || hotel.amenities) && (hotel.details?.amenities || hotel.amenities).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Amenities</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(hotel.details?.amenities || hotel.amenities).map((amenity, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <MdWifi className="text-orange-600" />
                    <span className="text-sm capitalize">{amenity.replace('-', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Room Types */}
          {hotel.details?.roomTypes && hotel.details.roomTypes.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Room Types</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hotel.details.roomTypes.map((room, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-lg mb-2">{room.name}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Type:</span>
                        <span>{room.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Price:</span>
                        <span>{room.price} {hotel.details?.currency || 'USD'}/night</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Capacity:</span>
                        <span>{room.capacity?.total || 'N/A'} people</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Size:</span>
                        <span>{room.size || 'N/A'} m²</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bed Info:</span>
                        <span>{room.bedInfo || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Available Rooms:</span>
                        <span>{room.availableRooms || 0}/{room.totalRooms || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews Summary */}
          {hotel.reviewsSummary && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Reviews Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-orange-600">{hotel.reviewsSummary.totalReviews || 0}</p>
                  <p className="text-sm text-gray-600">Total Reviews</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-orange-600">{hotel.reviewsSummary.averageRating?.toFixed(1) || '0.0'}</p>
                  <p className="text-sm text-gray-600">Average Rating</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-orange-600">{((hotel.reviewsSummary.averageRating || 0) * 20).toFixed(0)}%</p>
                  <p className="text-sm text-gray-600">Satisfaction</p>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          {hotel.details?.description && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Description</h3>
              <p className="text-gray-700 leading-relaxed">{hotel.details.description}</p>
            </div>
          )}

          {/* Check-in/Check-out */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Check-in/Check-out</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="font-bold text-lg">{hotel.details?.checkInTime || '14:00'}</p>
                <p className="text-sm text-gray-600">Check-in Time</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="font-bold text-lg">{hotel.details?.checkOutTime || '12:00'}</p>
                <p className="text-sm text-gray-600">Check-out Time</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Hotels;