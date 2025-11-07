import React, { useState, useEffect } from 'react';
import { Search, Star, CheckCircle, XCircle, Clock, Eye, ThumbsUp, MessageSquare } from 'lucide-react';

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState('all');
  const [filterAdminReplied, setFilterAdminReplied] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Reply modal state
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [replyText, setReplyText] = useState('');

  // Fetch reviews from API
  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        ...(searchTerm && { search: searchTerm }),
        ...(filterRating !== 'all' && { rating: filterRating }),
        ...(filterAdminReplied !== 'all' && { adminReplied: filterAdminReplied })
      });

      console.log('🔄 Fetching reviews with params:', params.toString());

      const response = await fetch(`http://localhost:3000/api/admin/reviews?${params}`);
      const result = await response.json();
      
      console.log('📥 API Response:', result);

      if (result.success) {
        setReviews(result.data || []);
        setTotalPages(result.stats?.totalPages || 1);
        console.log(`✅ Loaded ${result.data?.length || 0} reviews`);
      } else {
        console.error('❌ API Error:', result.message);
        setReviews([]);
      }
    } catch (error) {
      console.error('❌ Fetch error:', error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/admin/reviews/stats');
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data);
        console.log('📊 Stats loaded:', result.data);
      }
    } catch (error) {
      console.error('❌ Stats fetch error:', error);
    }
  };

  // Update review status
  const updateReviewStatus = async (reviewId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:3000/api/admin/reviews/${reviewId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const result = await response.json();
      if (result.success) {
        fetchReviews(); // Refresh list
        fetchStats(); // Refresh stats
        console.log(`✅ Status updated for review ${reviewId}`);
      }
    } catch (error) {
      console.error('❌ Status update error:', error);
    }
  };

  // Delete review
  const deleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    
    try {
      const response = await fetch(`http://localhost:3000/api/admin/reviews/${reviewId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        fetchReviews(); // Refresh list
        fetchStats(); // Refresh stats
        console.log(`✅ Review ${reviewId} deleted`);
      }
    } catch (error) {
      console.error('❌ Delete error:', error);
    }
  };

  // Open reply modal
  const openReplyModal = (review) => {
    setSelectedReview(review);
    setReplyText('');
    setShowReplyModal(true);
  };

  // Submit admin reply
  const submitReply = async () => {
    if (!replyText.trim()) {
      alert('Please enter a reply');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/admin/reviews/${selectedReview.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: replyText
        })
      });

      const result = await response.json();
      if (result.success) {
        setShowReplyModal(false);
        setReplyText('');
        setSelectedReview(null);
        fetchReviews(); // Refresh to show new reply count
        console.log('✅ Reply added successfully');
      } else {
        alert('Failed to add reply: ' + result.message);
      }
    } catch (error) {
      console.error('❌ Reply error:', error);
      alert('Error adding reply');
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status color and icon
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'approved':
        return { color: 'text-green-600 bg-green-100', icon: CheckCircle, label: 'Approved' };
      case 'rejected':
        return { color: 'text-red-600 bg-red-100', icon: XCircle, label: 'Rejected' };
      case 'pending':
      default:
        return { color: 'text-yellow-600 bg-yellow-100', icon: Clock, label: 'Pending' };
    }
  };

  // Render star rating
  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        className={i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}
      />
    ));
  };

  // Effects
  useEffect(() => {
    fetchReviews();
  }, [currentPage, searchTerm, filterRating, filterAdminReplied]);

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Review Management</h1>
        <p className="text-gray-600">Manage and moderate user reviews</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{stats.total || 0}</div>
          <div className="text-blue-800 font-medium">Total Reviews</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</div>
          <div className="text-yellow-800 font-medium">Pending</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{stats.approved || 0}</div>
          <div className="text-green-800 font-medium">Approved</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{stats.rejected || 0}</div>
          <div className="text-red-800 font-medium">Rejected</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{stats.verified || 0}</div>
          <div className="text-purple-800 font-medium">Verified</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{stats.avgRating || 0}</div>
          <div className="text-orange-800 font-medium">Avg Rating</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search reviews, users, tours..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Rating Filter */}
          <select
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>

          {/* Admin Replied Filter */}
          <select
            value={filterAdminReplied}
            onChange={(e) => setFilterAdminReplied(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Reviews</option>
            <option value="true">Admin Replied</option>
            <option value="false">No Admin Reply</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reviews...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No reviews found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review, index) => {
            // Debug: Log structure of problematic fields
            if (index === 0) {
              console.log('🐛 DEBUG - Review structure:', {
                helpful: review.helpful,
                helpfulType: typeof review.helpful,
                aiAnalysis: review.aiAnalysis,
                sentiment: review.aiAnalysis?.sentiment,
                sentimentType: typeof review.aiAnalysis?.sentiment
              });
            }
            
            const statusDisplay = getStatusDisplay(review.status);
            const StatusIcon = statusDisplay.icon;

            return (
              <div key={review.id} className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4">
                    <img
                      src={review.userAvatar}
                      alt={review.userName}
                      className="w-12 h-12 rounded-full"
                    />
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-gray-900">{String(review.userName || 'Unknown')}</h3>
                        {review.verified && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{String(review.userEmail || 'No email')}</p>
                      <p className="text-sm text-gray-600 font-medium">{String(review.tourName || 'Unknown Tour')} • {String(review.tourCountry || 'Unknown')}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusDisplay.color}`}>
                      <StatusIcon className="w-4 h-4 mr-1" />
                      {statusDisplay.label}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <div className="flex items-center mr-4">
                      {renderStars(review.rating)}
                      <span className="ml-2 text-sm font-medium text-gray-700">{review.rating || 0}/5</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(review.date)}
                    </div>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{String(review.comment || 'No comment')}</p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <ThumbsUp className="w-4 h-4 mr-1" />
                      {typeof review.helpful === 'object' ? review.helpful?.count || 0 : review.helpful || 0}
                    </span>
                    <span className="flex items-center">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      {review.repliesCount || 0}
                    </span>
                    <span>Sentiment: {typeof review.aiAnalysis?.sentiment === 'string' ? review.aiAnalysis.sentiment : 'neutral'}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openReplyModal(review)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center"
                    >
                      <MessageSquare className="w-3 h-3 mr-1" />
                      Reply
                    </button>
                    {review.status !== 'approved' && (
                      <button
                        onClick={() => updateReviewStatus(review.id, 'approved')}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                    )}
                    {review.status !== 'rejected' && (
                      <button
                        onClick={() => updateReviewStatus(review.id, 'rejected')}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                      >
                        Reject
                      </button>
                    )}
                    <button
                      onClick={() => deleteReview(review.id)}
                      className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {showReplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
                Reply to Review
              </h3>
              <button
                onClick={() => setShowReplyModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {selectedReview && (
              <div className="mb-4">
                {/* Original Review */}
                <div className="p-4 bg-gray-50 rounded-lg mb-4">
                  <div className="flex items-center mb-2">
                    <img 
                      src={selectedReview.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedReview.userName)}&background=0D8ABC&color=fff`}
                      alt={selectedReview.userName}
                      className="w-8 h-8 rounded-full mr-3"
                    />
                    <span className="font-medium">{selectedReview.userName}</span>
                    <div className="flex items-center ml-4">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className={i < selectedReview.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-500 ml-auto">
                      {new Date(selectedReview.date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-700">{selectedReview.comment}</p>
                </div>

                {/* Existing Replies */}
                {selectedReview.replies && selectedReview.replies.length > 0 ? (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Conversation ({selectedReview.replies.length} replies)
                    </h4>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {selectedReview.replies.map((reply, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <img 
                            src={reply.userAvatar || (reply.isAdmin 
                              ? 'https://ui-avatars.com/api/?name=CMP%20Travel&background=2563eb&color=fff&size=32'
                              : `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.userName || 'User')}&background=6b7280&color=fff&size=32`
                            )}
                            alt={reply.userName || (reply.isAdmin ? 'CMP Travel' : 'User')}
                            className="w-8 h-8 rounded-full border-2 border-gray-200"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-sm font-medium text-gray-900">
                                {reply.userName || (reply.isAdmin ? 'CMP Travel' : 'User')}
                              </span>
                              {reply.isAdmin && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                                  Official
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                {new Date(reply.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <div className={`text-sm p-3 rounded-lg max-w-md ${
                              reply.isAdmin 
                                ? 'bg-blue-50 border border-blue-200 text-blue-900' 
                                : 'bg-gray-50 border border-gray-200 text-gray-700'
                            }`}>
                              {reply.text}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg text-center">
                    <MessageSquare className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">No replies yet. Be the first to respond!</p>
                  </div>
                )}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Your Reply as CMP Travel
                </div>
              </label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="4"
                placeholder="Type your professional reply as CMP Travel support team..."
              />
              <div className="text-xs text-gray-500 mt-1">
                This reply will be visible to the customer and marked as official CMP Travel response.
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowReplyModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitReply}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Send Reply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reviews;