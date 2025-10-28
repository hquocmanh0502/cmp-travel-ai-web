import React, { useState, useEffect } from "react";
import { MdAdd, MdSearch, MdFilterList, MdEdit, MdDelete, MdVisibility, MdStar } from "react-icons/md";

function Tours() {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    // TODO: Replace with actual API call
    // fetch('http://localhost:3000/api/admin/tours')
    //   .then(res => res.json())
    //   .then(data => setTours(data))
    
    // Mock data
    setTimeout(() => {
      setTours([
        {
          _id: "1",
          name: "Paris Adventure",
          country: "France",
          type: "international",
          duration: "5 days",
          pricing: { adult: 2500 },
          rating: 4.8,
          img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400",
          totalBookings: 145,
          totalRevenue: 362500,
        },
        {
          _id: "2",
          name: "Tokyo Discovery",
          country: "Japan",
          type: "international",
          duration: "7 days",
          pricing: { adult: 3200 },
          rating: 4.9,
          img: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400",
          totalBookings: 132,
          totalRevenue: 422400,
        },
        {
          _id: "3",
          name: "Bali Escape",
          country: "Indonesia",
          type: "international",
          duration: "6 days",
          pricing: { adult: 1800 },
          rating: 4.7,
          img: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400",
          totalBookings: 98,
          totalRevenue: 176400,
        },
        {
          _id: "4",
          name: "Dubai Luxury",
          country: "UAE",
          type: "international",
          duration: "4 days",
          pricing: { adult: 4500 },
          rating: 4.9,
          img: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400",
          totalBookings: 87,
          totalRevenue: 391500,
        },
        {
          _id: "5",
          name: "Hanoi Heritage",
          country: "Vietnam",
          type: "domestic",
          duration: "3 days",
          pricing: { adult: 500 },
          rating: 4.6,
          img: "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=400",
          totalBookings: 210,
          totalRevenue: 105000,
        },
        {
          _id: "6",
          name: "Da Nang Beach",
          country: "Vietnam",
          type: "domestic",
          duration: "4 days",
          pricing: { adult: 650 },
          rating: 4.5,
          img: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400",
          totalBookings: 189,
          totalRevenue: 122850,
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const filteredTours = tours.filter(tour => {
    const matchesSearch = tour.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tour.country.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || tour.type === filterType;
    return matchesSearch && matchesType;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
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
            <TourCard key={tour._id} tour={tour} formatCurrency={formatCurrency} />
          ))
        )}
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

// Tour Card Component
function TourCard({ tour, formatCurrency }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group">
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={tour.img}
          alt={tour.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        <div className="absolute top-3 left-3">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            tour.type === "domestic" 
              ? "bg-green-100 text-green-700" 
              : "bg-blue-100 text-blue-700"
          }`}>
            {tour.type}
          </span>
        </div>
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
          <MdStar className="text-yellow-500" />
          <span className="text-sm font-semibold">{tour.rating}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-1">{tour.name}</h3>
        <p className="text-sm text-gray-600 mb-3">{tour.country} • {tour.duration}</p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-xs text-gray-600">Bookings</p>
            <p className="text-lg font-bold text-gray-800">{tour.totalBookings}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Revenue</p>
            <p className="text-lg font-bold text-gray-800">{formatCurrency(tour.totalRevenue)}</p>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-600">Price from</p>
            <p className="text-xl font-bold text-orange-600">{formatCurrency(tour.pricing.adult)}</p>
          </div>
        </div>

        {/* Actions */}
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
      </div>
    </div>
  );
}

export default Tours;
