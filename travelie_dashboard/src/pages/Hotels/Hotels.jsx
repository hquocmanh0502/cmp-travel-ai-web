import React, { useState, useEffect } from "react";
import { MdSearch, MdFilterList, MdAdd, MdStar, MdLocationOn, MdEdit, MdDelete, MdVisibility, MdWifi, MdPool, MdRestaurant, MdLocalParking } from "react-icons/md";

function Hotels() {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStars, setFilterStars] = useState("all");

  useEffect(() => {
    // TODO: Replace with actual API call
    // fetch('http://localhost:3000/api/admin/hotels')
    //   .then(res => res.json())
    //   .then(data => setHotels(data))
    
    // Mock data
    setTimeout(() => {
      setHotels([
        {
          _id: "1",
          name: "Grand Luxury Hotel",
          location: "Paris, France",
          stars: 5,
          rating: 4.8,
          reviewCount: 1243,
          pricePerNight: 250,
          image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&q=80",
          amenities: ["wifi", "pool", "restaurant", "parking"],
          rooms: 120,
          bookings: 890,
        },
        {
          _id: "2",
          name: "Seaside Resort & Spa",
          location: "Bali, Indonesia",
          stars: 4,
          rating: 4.6,
          reviewCount: 856,
          pricePerNight: 180,
          image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=500&q=80",
          amenities: ["wifi", "pool", "restaurant"],
          rooms: 85,
          bookings: 654,
        },
        {
          _id: "3",
          name: "Downtown Business Hotel",
          location: "Tokyo, Japan",
          stars: 4,
          rating: 4.4,
          reviewCount: 567,
          pricePerNight: 120,
          image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=500&q=80",
          amenities: ["wifi", "parking"],
          rooms: 200,
          bookings: 1120,
        },
        {
          _id: "4",
          name: "Mountain View Lodge",
          location: "Hanoi, Vietnam",
          stars: 3,
          rating: 4.3,
          reviewCount: 423,
          pricePerNight: 65,
          image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=500&q=80",
          amenities: ["wifi", "restaurant"],
          rooms: 45,
          bookings: 289,
        },
        {
          _id: "5",
          name: "Desert Oasis Resort",
          location: "Dubai, UAE",
          stars: 5,
          rating: 4.9,
          reviewCount: 1567,
          pricePerNight: 320,
          image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=500&q=80",
          amenities: ["wifi", "pool", "restaurant", "parking"],
          rooms: 250,
          bookings: 1845,
        },
        {
          _id: "6",
          name: "Beach Paradise Hotel",
          location: "Da Nang, Vietnam",
          stars: 4,
          rating: 4.7,
          reviewCount: 934,
          pricePerNight: 95,
          image: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=500&q=80",
          amenities: ["wifi", "pool", "restaurant"],
          rooms: 110,
          bookings: 723,
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const filteredHotels = hotels.filter(hotel => {
    const matchesSearch = 
      hotel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hotel.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStars = 
      filterStars === "all" ||
      hotel.stars === parseInt(filterStars);
    
    return matchesSearch && matchesStars;
  });

  const avgRating = hotels.length > 0 
    ? (hotels.reduce((sum, h) => sum + h.rating, 0) / hotels.length).toFixed(1) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Hotel Management</h1>
            <p className="text-gray-600 mt-1">Manage hotel listings and availability</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
            <MdAdd />
            Add New Hotel
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
                placeholder="Search hotels by name or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Filter by Stars */}
          <div className="flex items-center gap-2">
            <MdFilterList className="text-gray-600 text-xl" />
            <select
              value={filterStars}
              onChange={(e) => setFilterStars(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Stars</option>
              <option value="5">5 Stars ⭐⭐⭐⭐⭐</option>
              <option value="4">4 Stars ⭐⭐⭐⭐</option>
              <option value="3">3 Stars ⭐⭐⭐</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
          <StatBox label="Total Hotels" value={hotels.length} />
          <StatBox label="5-Star Hotels" value={hotels.filter(h => h.stars === 5).length} />
          <StatBox label="4-Star Hotels" value={hotels.filter(h => h.stars === 4).length} />
          <StatBox label="Avg Rating" value={`${avgRating} ⭐`} />
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
            No hotels found
          </div>
        ) : (
          filteredHotels.map((hotel) => (
            <HotelCard key={hotel._id} hotel={hotel} />
          ))
        )}
      </div>
    </div>
  );
}

// Hotel Card Component
function HotelCard({ hotel }) {
  const amenityIcons = {
    wifi: <MdWifi />,
    pool: <MdPool />,
    restaurant: <MdRestaurant />,
    parking: <MdLocalParking />,
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group">
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={hotel.image}
          alt={hotel.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        {/* Stars Badge */}
        <div className="absolute top-3 left-3 bg-white px-2 py-1 rounded-lg shadow-md flex items-center gap-1">
          {Array.from({ length: hotel.stars }).map((_, i) => (
            <MdStar key={i} className="text-yellow-400 text-sm" />
          ))}
        </div>
        {/* Rating Badge */}
        <div className="absolute top-3 right-3 bg-orange-600 text-white px-2 py-1 rounded-lg shadow-md font-semibold text-sm">
          {hotel.rating} ⭐
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
          {hotel.location}
        </div>

        {/* Amenities */}
        <div className="flex gap-2 mb-3">
          {hotel.amenities.map((amenity, i) => (
            <div
              key={i}
              className="p-2 bg-gray-100 text-gray-600 rounded-lg text-lg"
              title={amenity}
            >
              {amenityIcons[amenity]}
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
          <div>
            <p className="text-xs text-gray-600">Rooms</p>
            <p className="font-semibold text-gray-800">{hotel.rooms}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Bookings</p>
            <p className="font-semibold text-gray-800">{hotel.bookings}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Reviews</p>
            <p className="font-semibold text-gray-800">{hotel.reviewCount}</p>
          </div>
        </div>

        {/* Price */}
        <div className="mb-4">
          <p className="text-2xl font-bold text-orange-600">
            ${hotel.pricePerNight}
            <span className="text-sm font-normal text-gray-600">/night</span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm">
            <MdVisibility />
            View
          </button>
          <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors text-sm">
            <MdEdit />
            Edit
          </button>
          <button className="flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm">
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

export default Hotels;
