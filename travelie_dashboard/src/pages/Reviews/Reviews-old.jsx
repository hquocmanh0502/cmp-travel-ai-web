import React, { useState, useEffect } from "react";
import { MdSearch, MdStar, MdCheckCircle, MdCancel, MdReply, MdDelete, MdVerified, MdWarning, MdThumbUp, MdRefresh, MdClose } from "react-icons/md";

function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRating, setFilterRating] = useState("all");
  const [filterVerified, setFilterVerified] = useState("all");
  const [stats, setStats] = useState({});
  const [error, setError] = useState("");
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);

  // 🔍 DEBUG Console
  const debugLog = (action, data) => {
    console.log(`[REVIEW-MANAGEMENT] ${new Date().toISOString()}`);
    console.log(`Action: ${action}`);
    console.log('Data:', data);
    console.log('=' + '='.repeat(50));
  };

  // Fetch reviews from API
  const fetchReviews = async () => {
    try {
      debugLog('FETCH_REVIEWS_START', { searchTerm, filterRating, filterVerified });
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      // Remove status filter - show all reviews
      if (filterRating !== 'all') params.append('rating', filterRating);
      if (filterVerified !== 'all') params.append('verified', filterVerified);
      params.append('limit', '50'); // Show more reviews

      const response = await fetch(`http://localhost:3000/api/admin/reviews?${params}`);
      const data = await response.json();

      debugLog('FETCH_REVIEWS_RESPONSE', { 
        success: data.success, 
        count: data.count,
        stats: data.stats,
        responseKeys: Object.keys(data)
      });

      if (data.success) {
        setReviews(data.data || []);
        debugLog('FETCH_REVIEWS_SUCCESS', { reviewsCount: data.data?.length || 0 });
        
        // Debug: Log detailed data structure
        if (data.data && data.data.length > 0) {
          console.group('🔍 REVIEWS DATA STRUCTURE DEBUG');
          console.log('Total reviews:', data.data.length);
          console.log('First review sample:', data.data[0]);
          console.log('Review source fields:');
          console.log('- userName:', data.data[0]?.userName);
          console.log('- tourName:', data.data[0]?.tourName); 
          console.log('- comment:', data.data[0]?.comment);
          console.log('- rating:', data.data[0]?.rating);
          console.log('- verified:', data.data[0]?.verified);
          console.log('- date:', data.data[0]?.date);
          console.log('- helpful structure:', typeof data.data[0]?.helpful, data.data[0]?.helpful);
          console.log('- Is this from Comment model?', !!data.data[0]?.tourId);
          console.log('- Backend transformation check:', Object.keys(data.data[0] || {}));
          console.groupEnd();
        }
      } else {
        setError(data.message || 'Failed to fetch reviews');
        debugLog('FETCH_REVIEWS_ERROR', { error: data.message });
      }
    } catch (error) {
      setError('Network error: ' + error.message);
      debugLog('FETCH_REVIEWS_EXCEPTION', { error: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      debugLog('FETCH_STATS_START', {});
      
      const response = await fetch('http://localhost:3000/api/admin/reviews/stats');
      const data = await response.json();

      debugLog('FETCH_STATS_RESPONSE', data);

      if (data.success) {
        setStats(data.data);
        debugLog('FETCH_STATS_SUCCESS', data.data);
      }
    } catch (error) {
      debugLog('FETCH_STATS_EXCEPTION', { error: error.message });
    }
  };

  // Handle review status update
  const handleStatusUpdate = async (reviewId, newStatus) => {
    try {
      debugLog('UPDATE_STATUS_START', { reviewId, newStatus });
      
      const response = await fetch(`http://localhost:3000/api/admin/reviews/${reviewId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await response.json();

      if (data.success) {
        debugLog('UPDATE_STATUS_SUCCESS', { reviewId, newStatus });
        fetchReviews(); // Refresh list
        fetchStats(); // Refresh stats
      } else {
        debugLog('UPDATE_STATUS_ERROR', { error: data.message });
        alert(data.message || 'Failed to update review status');
      }
    } catch (error) {
      debugLog('UPDATE_STATUS_EXCEPTION', { error: error.message });
      alert('Failed to update review status');
    }
  };

  // Handle review delete
  const handleDelete = async (reviewId) => {
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      return;
    }

    try {
      debugLog('DELETE_REVIEW_START', { reviewId });
      
      const response = await fetch(`http://localhost:3000/api/admin/reviews/${reviewId}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        debugLog('DELETE_REVIEW_SUCCESS', { reviewId });
        fetchReviews(); // Refresh list
        fetchStats(); // Refresh stats
        alert('Review deleted successfully');
      } else {
        debugLog('DELETE_REVIEW_ERROR', { error: data.message });
        alert(data.message || 'Failed to delete review');
      }
    } catch (error) {
      debugLog('DELETE_REVIEW_EXCEPTION', { error: error.message });
      alert('Failed to delete review');
    }
  };

  // Initial load
  useEffect(() => {
    debugLog('COMPONENT_MOUNTED', {});
    fetchReviews();
    fetchStats();
  }, []);

  // Search and filter effect
  useEffect(() => {
    debugLog('FILTERS_CHANGED', { searchTerm, filterRating, filterVerified });
    const timeoutId = setTimeout(() => {
      fetchReviews();
    }, 500); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filterRating, filterVerified]);

  // Filter reviews based on search and filters
  const filteredReviews = reviews.filter(review => {
    const matchesSearch = 
      searchTerm === "" ||
      review.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.tourName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.tourCountry?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRating = 
      filterRating === "all" ||
      review.rating === parseInt(filterRating);

    const matchesVerified = 
      filterVerified === "all" ||
      (filterVerified === "true" && review.verified) ||
      (filterVerified === "false" && !review.verified);
    
    return matchesSearch && matchesRating && matchesVerified;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Review Management</h1>
            <p className="text-gray-600 mt-1">Moderate and respond to customer reviews</p>
          </div>
          
          <button
            onClick={() => {
              fetchReviews();
              fetchStats();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <MdRefresh />
            Refresh
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap gap-4 mt-6">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search reviews, users, or tours..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  debugLog('SEARCH_CHANGED', { searchTerm: e.target.value });
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Reviews Counter */}
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-blue-600 font-semibold">{filteredReviews.length}</span>
            <span className="text-blue-500 text-sm">Reviews Found</span>
          </div>

          {/* Filter by Rating */}
          <div className="flex items-center gap-2">
            <select
              value={filterRating}
              onChange={(e) => {
                setFilterRating(e.target.value);
                debugLog('RATING_FILTER_CHANGED', { filterRating: e.target.value });
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Ratings</option>
              <option value="5">⭐ 5 Stars</option>
              <option value="4">⭐ 4 Stars</option>
              <option value="3">⭐ 3 Stars</option>
              <option value="2">⭐ 2 Stars</option>
              <option value="1">⭐ 1 Star</option>
            </select>
          </div>

          {/* Filter by Verified */}
          <div className="flex items-center gap-2">
            <select
              value={filterVerified}
              onChange={(e) => {
                setFilterVerified(e.target.value);
                debugLog('VERIFIED_FILTER_CHANGED', { filterVerified: e.target.value });
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Reviews</option>
              <option value="true">✅ Verified Only</option>
              <option value="false">❌ Unverified Only</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-6 pt-4 border-t border-gray-200">
          <StatBox label="Total Reviews" value={stats.total || reviews.length} />
          <StatBox label="Pending" value={stats.pending || reviews.filter(r => r.status === "pending").length} />
          <StatBox label="Approved" value={stats.approved || reviews.filter(r => r.status === "approved").length} />
          <StatBox label="Rejected" value={stats.rejected || reviews.filter(r => r.status === "rejected").length} />
          <StatBox label="Verified" value={stats.verified || reviews.filter(r => r.verified).length} />
          <StatBox label="Avg Rating" value={stats.avgRating ? `${stats.avgRating.toFixed(1)} ⭐` : (reviews.length > 0 ? `${(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)} ⭐` : '0 ⭐')} />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <MdWarning />
            <span className="font-medium">Error:</span>
            {error}
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <ReviewSkeleton key={i} />
          ))
        ) : filteredReviews.length === 0 ? (
          <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
            <MdWarning className="text-4xl text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Reviews Found</h3>
            <p className="text-gray-500">
              {searchTerm || filterRating !== 'all' || filterVerified !== 'all'
                ? 'Try adjusting your search or filters'
                : 'No reviews have been submitted yet'}
            </p>
          </div>
        ) : (
          filteredReviews.map((review) => (
            <ReviewCard 
              key={review._id} 
              review={review} 
              onStatusUpdate={handleStatusUpdate}
              onDelete={handleDelete}
              onReply={(review) => {
                setSelectedReview(review);
                setShowReplyModal(true);
              }}
              debugLog={debugLog}
            />
          ))
        )}
      </div>

      {/* Reply Modal */}
      {showReplyModal && selectedReview && (
        <ReplyModal 
          review={selectedReview}
          onClose={() => {
            setShowReplyModal(false);
            setSelectedReview(null);
          }}
          onSuccess={() => {
            setShowReplyModal(false);
            setSelectedReview(null);
            fetchReviews();
          }}
          debugLog={debugLog}
        />
      )}
    </div>
  );
}

// Stats Box Component
function StatBox({ label, value }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
}

// Review Card Component
function ReviewCard({ review, onStatusUpdate, onDelete, onReply, debugLog }) {
  const handleCardAction = (action, data) => {
    debugLog(`REVIEW_CARD_${action.toUpperCase()}`, { reviewId: review._id, ...data });
  };

  // Debug log để xem structure của review object
  debugLog('REVIEW_OBJECT_DEBUG', {
    reviewId: review._id,
    helpfulValue: review.helpful,
    helpfulType: typeof review.helpful,
    helpfulKeys: typeof review.helpful === 'object' ? Object.keys(review.helpful || {}) : null
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <img
              src={review.userAvatar}
              alt={review.userName}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-800">{review.userName}</h3>
                {review.verified && (
                  <MdVerified className="text-blue-500" title="Verified Purchase" />
                )}
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  review.status === 'approved' 
                    ? 'bg-green-100 text-green-800' 
                    : review.status === 'rejected'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {review.status?.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-gray-600">{review.tourName}</p>
              <p className="text-xs text-gray-500">{review.tourCountry}</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center gap-1 mb-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <MdStar 
                  key={i} 
                  className={i < review.rating ? 'text-yellow-400' : 'text-gray-300'} 
                />
              ))}
              <span className="text-sm font-semibold text-gray-700 ml-1">
                {review.rating}/5
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {new Date(review.date).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <p className="text-gray-700 mb-4 leading-relaxed">
          {review.comment}
        </p>

        {/* Images */}
        {review.images && review.images.length > 0 && (
          <div className="flex gap-2 mb-4">
            {review.images.slice(0, 3).map((image, i) => (
              <img
                key={i}
                src={image}
                alt={`Review image ${i + 1}`}
                className="w-16 h-16 rounded-lg object-cover"
              />
            ))}
            {review.images.length > 3 && (
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-600">
                +{review.images.length - 3}
              </div>
            )}
          </div>
        )}

        {/* Metrics */}
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-1">
            <MdThumbUp className="text-blue-500" />
            <span>
              {(() => {
                try {
                  if (typeof review.helpful === 'object' && review.helpful?.count !== undefined) {
                    return review.helpful.count;
                  }
                  if (typeof review.helpful === 'number') {
                    return review.helpful;
                  }
                  return 0;
                } catch (error) {
                  debugLog('HELPFUL_RENDER_ERROR', { error: error.message, helpful: review.helpful });
                  return 0;
                }
              })()} helpful
            </span>
          </div>
          <div className="flex items-center gap-1">
            <MdReply className="text-green-500" />
            <span>{review.repliesCount || 0} replies</span>
          </div>
          {review.aiAnalysis && (
            <div className="flex items-center gap-1">
              <span className={`px-2 py-1 text-xs rounded ${
                review.aiAnalysis.sentiment?.label === 'positive' 
                  ? 'bg-green-100 text-green-800'
                  : review.aiAnalysis.sentiment?.label === 'negative'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {review.aiAnalysis.sentiment?.label || 'neutral'}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {review.status === 'pending' && (
            <>
              <button
                onClick={() => {
                  handleCardAction('approve', {});
                  onStatusUpdate(review._id, 'approved');
                }}
                className="flex items-center gap-1 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm"
              >
                <MdCheckCircle />
                Approve
              </button>
              <button
                onClick={() => {
                  handleCardAction('reject', {});
                  onStatusUpdate(review._id, 'rejected');
                }}
                className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
              >
                <MdCancel />
                Reject
              </button>
            </>
          )}
          
          <button
            onClick={() => {
              handleCardAction('reply', {});
              onReply(review);
            }}
            className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
          >
            <MdReply />
            Reply
          </button>
          
          <button
            onClick={() => {
              handleCardAction('delete', {});
              onDelete(review._id);
            }}
            className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
          >
            <MdDelete />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Review Skeleton Component
function ReviewSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="animate-pulse">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-48 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-24"></div>
          </div>
          <div className="w-20 h-4 bg-gray-200 rounded"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    </div>
  );
}

// Reply Modal Component
function ReplyModal({ review, onClose, onSuccess, debugLog }) {
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminRole, setAdminRole] = useState('customer_service');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      debugLog('REPLY_SUBMIT_START', { reviewId: review._id, replyText, adminRole });
      
      const response = await fetch(`http://localhost:3000/api/admin/reviews/${review._id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: replyText, adminRole })
      });
      const data = await response.json();

      if (data.success) {
        debugLog('REPLY_SUBMIT_SUCCESS', { reviewId: review._id });
        alert('Reply added successfully!');
        onSuccess();
      } else {
        debugLog('REPLY_SUBMIT_ERROR', { error: data.message });
        alert(data.message || 'Failed to add reply');
      }
    } catch (error) {
      debugLog('REPLY_SUBMIT_EXCEPTION', { error: error.message });
      alert('Failed to add reply');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold">Reply to Review</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <MdClose className="text-2xl" />
          </button>
        </div>
        
        {/* Review Preview */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-start gap-3">
            <img
              src={review.userAvatar}
              alt={review.userName}
              className="w-10 h-10 rounded-full"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-800">{review.userName}</span>
                <div className="flex items-center">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <MdStar 
                      key={i} 
                      className={i < review.rating ? 'text-yellow-400' : 'text-gray-300'} 
                      size={16}
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-2">{review.tourName}</p>
              <p className="text-gray-700">{review.comment}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Admin Role</label>
            <select
              value={adminRole}
              onChange={(e) => setAdminRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="customer_service">Customer Service</option>
              <option value="tour_guide">Tour Guide</option>
              <option value="manager">Manager</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reply Message *</label>
            <textarea
              required
              rows="4"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a professional response to this review..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
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
              disabled={loading || !replyText.trim()}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Reviews;