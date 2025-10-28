import React, { useState, useEffect } from "react";
import { MdSearch, MdFilterList, MdStar, MdCheckCircle, MdCancel, MdReply, MdDelete } from "react-icons/md";

function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRating, setFilterRating] = useState("all");

  useEffect(() => {
    // TODO: Replace with actual API call
    // fetch('http://localhost:3000/api/admin/reviews')
    //   .then(res => res.json())
    //   .then(data => setReviews(data))
    
    // Mock data
    setTimeout(() => {
      setReviews([
        {
          _id: "1",
          userName: "John Doe",
          userAvatar: "https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff",
          tourName: "Amazing Paris Adventure",
          rating: 5,
          comment: "Absolutely fantastic tour! The guide was knowledgeable and the itinerary was perfect. Would definitely recommend!",
          status: "approved",
          date: "2024-04-15",
          helpful: 24,
        },
        {
          _id: "2",
          userName: "Jane Smith",
          userAvatar: "https://ui-avatars.com/api/?name=Jane+Smith&background=FF6600&color=fff",
          tourName: "Tokyo Discovery Tour",
          rating: 4,
          comment: "Great experience overall. The food was amazing and we saw all the major attractions. Only downside was the tight schedule.",
          status: "approved",
          date: "2024-04-12",
          helpful: 18,
        },
        {
          _id: "3",
          userName: "Bob Wilson",
          userAvatar: "https://ui-avatars.com/api/?name=Bob+Wilson&background=4B5563&color=fff",
          tourName: "Bali Beach Paradise",
          rating: 5,
          comment: "Paradise on Earth! Beautiful beaches, amazing hotels, and the best customer service. This trip exceeded all expectations.",
          status: "pending",
          date: "2024-04-14",
          helpful: 0,
        },
        {
          _id: "4",
          userName: "Alice Brown",
          userAvatar: "https://ui-avatars.com/api/?name=Alice+Brown&background=8B5CF6&color=fff",
          tourName: "Dubai Luxury Experience",
          rating: 3,
          comment: "Tour was okay but overpriced for what we got. The hotel was nice but expected more activities included.",
          status: "approved",
          date: "2024-04-10",
          helpful: 12,
        },
        {
          _id: "5",
          userName: "Charlie Davis",
          userAvatar: "https://ui-avatars.com/api/?name=Charlie+Davis&background=10B981&color=fff",
          tourName: "Hanoi Cultural Journey",
          rating: 5,
          comment: "Loved every moment! The local culture, food, and people were incredible. Our guide made the experience truly special.",
          status: "pending",
          date: "2024-04-16",
          helpful: 0,
        },
        {
          _id: "6",
          userName: "Emma Wilson",
          userAvatar: "https://ui-avatars.com/api/?name=Emma+Wilson&background=EC4899&color=fff",
          tourName: "Da Nang Beach Retreat",
          rating: 2,
          comment: "Disappointed with this tour. The hotel was not as advertised and several activities were cancelled without notice.",
          status: "pending",
          date: "2024-04-13",
          helpful: 0,
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = 
      review.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.tourName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.comment.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      filterStatus === "all" ||
      review.status === filterStatus;
    
    const matchesRating = 
      filterRating === "all" ||
      review.rating === parseInt(filterRating);
    
    return matchesSearch && matchesStatus && matchesRating;
  });

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) 
    : 0;

  const handleApprove = (reviewId) => {
    // TODO: API call to approve review
    setReviews(reviews.map(r => 
      r._id === reviewId ? { ...r, status: "approved" } : r
    ));
  };

  const handleReject = (reviewId) => {
    // TODO: API call to reject review
    setReviews(reviews.map(r => 
      r._id === reviewId ? { ...r, status: "rejected" } : r
    ));
  };

  const handleDelete = (reviewId) => {
    // TODO: API call to delete review
    if (confirm("Are you sure you want to delete this review?")) {
      setReviews(reviews.filter(r => r._id !== reviewId));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Review Management</h1>
            <p className="text-gray-600 mt-1">Moderate and respond to customer reviews</p>
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
                placeholder="Search reviews by user, tour, or content..."
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
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Filter by Rating */}
          <select
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars ⭐⭐⭐⭐⭐</option>
            <option value="4">4 Stars ⭐⭐⭐⭐</option>
            <option value="3">3 Stars ⭐⭐⭐</option>
            <option value="2">2 Stars ⭐⭐</option>
            <option value="1">1 Star ⭐</option>
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
          <StatBox label="Total Reviews" value={reviews.length} />
          <StatBox label="Pending" value={reviews.filter(r => r.status === "pending").length} />
          <StatBox label="Approved" value={reviews.filter(r => r.status === "approved").length} />
          <StatBox label="Avg Rating" value={`${avgRating} ⭐`} />
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="h-24 bg-gray-200 animate-pulse rounded"></div>
            </div>
          ))
        ) : filteredReviews.length === 0 ? (
          <div className="bg-white rounded-xl p-12 border border-gray-200 text-center text-gray-500">
            No reviews found
          </div>
        ) : (
          filteredReviews.map((review) => (
            <ReviewCard
              key={review._id}
              review={review}
              onApprove={handleApprove}
              onReject={handleReject}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Review Card Component
function ReviewCard({ review, onApprove, onReject, onDelete }) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-700";
      case "rejected": return "bg-red-100 text-red-700";
      case "pending": return "bg-yellow-100 text-yellow-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <img
            src={review.userAvatar}
            alt={review.userName}
            className="w-12 h-12 rounded-full"
          />
          <div>
            <p className="font-semibold text-gray-800">{review.userName}</p>
            <p className="text-sm text-gray-600">{review.tourName}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(review.status)}`}>
          {review.status}
        </span>
      </div>

      {/* Rating */}
      <div className="flex items-center gap-2 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <MdStar
            key={i}
            className={i < review.rating ? "text-yellow-400" : "text-gray-300"}
          />
        ))}
        <span className="text-sm text-gray-600">({review.rating}/5)</span>
      </div>

      {/* Comment */}
      <p className="text-gray-700 mb-4">{review.comment}</p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>{formatDate(review.date)}</span>
          {review.helpful > 0 && (
            <span>{review.helpful} people found this helpful</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {review.status === "pending" && (
            <>
              <button
                onClick={() => onApprove(review._id)}
                className="flex items-center gap-1 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm"
              >
                <MdCheckCircle />
                Approve
              </button>
              <button
                onClick={() => onReject(review._id)}
                className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
              >
                <MdCancel />
                Reject
              </button>
            </>
          )}
          <button className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm">
            <MdReply />
            Reply
          </button>
          <button
            onClick={() => onDelete(review._id)}
            className="flex items-center gap-1 px-3 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors text-sm"
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

export default Reviews;
