import React, { useState, useEffect } from "react";
import { MdAdd, MdSearch, MdFilterList, MdEdit, MdDelete, MdVisibility, MdStar, MdPerson } from "react-icons/md";
import TourGuidePickerModal from "../../components/Tours/TourGuidePickerModal";
import toast from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:3000/api/admin';

function Tours() {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [error, setError] = useState(null);
  const [isGuidePickerOpen, setIsGuidePickerOpen] = useState(false);
  const [selectedTour, setSelectedTour] = useState(null);

  useEffect(() => {
    fetchTours();
  }, [searchTerm, filterType]);

  const fetchTours = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterType !== 'all') params.append('type', filterType);
      
      const response = await fetch(`${API_BASE_URL}/tours?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setTours(data.data);
      } else {
        setError(data.error || 'Failed to fetch tours');
      }
    } catch (err) {
      console.error('Error fetching tours:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const filteredTours = tours;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleAssignGuide = (tour) => {
    setSelectedTour(tour);
    setIsGuidePickerOpen(true);
  };

  const handleGuideSelect = async (guide) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tours/${selectedTour._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...selectedTour,
          assignedGuide: guide._id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${guide.name} assigned to ${selectedTour.name || selectedTour.title}`);
        fetchTours(); // Refresh list
      } else {
        toast.error('Failed to assign guide');
      }
    } catch (error) {
      console.error('Error assigning guide:', error);
      toast.error('Failed to assign guide');
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 font-medium">⚠️ {error}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Tour Management</h1>
            <p className="text-gray-600 mt-1">Manage all your tour packages</p>
          </div>
          <button className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors font-medium">
            <MdAdd className="text-xl" />
            Add New Tour
          </button>
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
                placeholder="Search tours by name or country..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Filter by Type */}
          <div className="flex items-center gap-2">
            <MdFilterList className="text-gray-600 text-xl" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Types</option>
              <option value="domestic">Domestic</option>
              <option value="international">International</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
          <StatBox label="Total Tours" value={tours.length} />
          <StatBox label="Domestic" value={tours.filter(t => t.type === "domestic").length} />
          <StatBox label="International" value={tours.filter(t => t.type === "international").length} />
          <StatBox label="Avg Rating" value={tours.length > 0 ? (tours.reduce((sum, t) => sum + t.rating, 0) / tours.length).toFixed(1) : "0"} />
        </div>
      </div>

      {/* Tours Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="w-full h-48 bg-gray-200 animate-pulse rounded-lg"></div>
              <div className="mt-4 space-y-2">
                <div className="h-6 bg-gray-200 animate-pulse rounded"></div>
                <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4"></div>
              </div>
            </div>
          ))
        ) : filteredTours.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl p-12 border border-gray-200 text-center">
            <p className="text-gray-500 text-lg">No tours found</p>
          </div>
        ) : (
          filteredTours.map((tour) => (
            <TourCard 
              key={tour._id} 
              tour={tour} 
              formatCurrency={formatCurrency}
              onAssignGuide={() => handleAssignGuide(tour)}
            />
          ))
        )}
      </div>

      {/* Tour Guide Picker Modal */}
      <TourGuidePickerModal
        isOpen={isGuidePickerOpen}
        onClose={() => setIsGuidePickerOpen(false)}
        onSelect={handleGuideSelect}
        selectedGuideId={selectedTour?.assignedGuide}
      />
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

// Tour Card Component
function TourCard({ tour, formatCurrency, onAssignGuide }) {
  // Handle different data structures from API
  const tourName = tour.name || tour.title || 'Unnamed Tour';
  const tourCountry = tour.country || 'Unknown';
  const tourDuration = tour.duration || 'N/A';
  const tourType = tour.type || 'unknown';
  const tourRating = tour.rating || 0;
  const tourImage = tour.img || tour.image || 'https://via.placeholder.com/400';
  const tourBookings = tour.bookings || tour.totalBookings || 0;
  const tourRevenue = tour.revenue || tour.totalRevenue || 0;
  const tourPrice = tour.pricing?.adult || tour.price || 0;
  const assignedGuide = tour.assignedGuide;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group">
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={tourImage}
          alt={tourName}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/400?text=No+Image';
          }}
        />
        <div className="absolute top-3 left-3">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            tourType === "domestic" 
              ? "bg-green-100 text-green-700" 
              : "bg-blue-100 text-blue-700"
          }`}>
            {tourType}
          </span>
        </div>
        {tourRating > 0 && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
            <MdStar className="text-yellow-500" />
            <span className="text-sm font-semibold">{tourRating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-1 truncate" title={tourName}>
          {tourName}
        </h3>
        <p className="text-sm text-gray-600 mb-3">{tourCountry} • {tourDuration}</p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-xs text-gray-600">Bookings</p>
            <p className="text-lg font-bold text-gray-800">{tourBookings}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Revenue</p>
            <p className="text-lg font-bold text-gray-800">{formatCurrency(tourRevenue)}</p>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-600">Price from</p>
            <p className="text-xl font-bold text-orange-600">{formatCurrency(tourPrice)}</p>
          </div>
        </div>

        {/* Tour Guide Info */}
        {assignedGuide && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <MdPerson className="text-green-600" />
              <div>
                <p className="text-xs text-green-700 font-medium">Tour Guide</p>
                <p className="text-sm font-semibold text-green-900">{assignedGuide.name}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
              <MdVisibility />
              <span className="text-sm font-medium">View</span>
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors">
              <MdEdit />
              <span className="text-sm font-medium">Edit</span>
            </button>
            <button className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
              <MdDelete />
            </button>
          </div>
          
          <button 
            onClick={onAssignGuide}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 rounded-lg hover:from-purple-100 hover:to-purple-200 transition-all border border-purple-200"
          >
            <MdPerson className="w-4 h-4" />
            <span className="text-sm font-medium">
              {assignedGuide ? 'Change Guide' : 'Assign Guide'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Tours;
