import { useState, useEffect } from 'react';
import { FiX, FiStar, FiUser, FiCalendar, FiMessageSquare } from 'react-icons/fi';
import { guideReviewsAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const GuideReviewsModal = ({ isOpen, onClose, guide }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    avgRating: 0
  });

  useEffect(() => {
    if (isOpen && guide?._id) {
      fetchReviews();
    }
  }, [isOpen, guide]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await guideReviewsAPI.getByGuide(guide._id);
      
      console.log('🔍 DEBUG - Full API Response:', response);
      console.log('🔍 DEBUG - Response.data:', response.data);
      
      // API returns { success: true, data: [...] }
      const reviewData = response.data || response;
      
      console.log('🔍 DEBUG - reviewData:', reviewData);
      console.log('🔍 DEBUG - Is Array?', Array.isArray(reviewData));
      
      // Ensure we have an array
      const allReviews = Array.isArray(reviewData) ? reviewData : [];
      
      console.log('🔍 DEBUG - allReviews length:', allReviews.length);
      if (allReviews.length > 0) {
        console.log('🔍 DEBUG - First review:', allReviews[0]);
        console.log('🔍 DEBUG - userId:', allReviews[0].userId);
        console.log('🔍 DEBUG - tourId:', allReviews[0].tourId);
      }
      
      // Only get approved reviews
      const approvedReviews = allReviews.filter(r => r.status === 'approved');
      
      console.log('🔍 DEBUG - approvedReviews length:', approvedReviews.length);
      
      // Calculate stats
      const avgRating = approvedReviews.length > 0 
        ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length
        : 0;

      setStats({
        total: approvedReviews.length,
        avgRating: avgRating.toFixed(1)
      });

      setReviews(approvedReviews);
    } catch (error) {
      console.error('❌ Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <FiStar
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold">Customer Reviews</h2>
              <p className="text-blue-100 mt-1">{guide?.name}</p>
            </div>
            <div className="flex items-center gap-2 bg-white bg-opacity-20 px-4 py-2 rounded-lg">
              <FiStar className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="text-xl font-bold">{stats.avgRating}</span>
              <span className="text-blue-100">({stats.total} reviews)</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Reviews List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12">
              <FiMessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No customer reviews yet</p>
              <p className="text-gray-400 text-sm mt-2">Reviews will appear here after customers complete their tours</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review._id}
                  className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      {review.userId?.avatar ? (
                        <img 
                          src={review.userId.avatar} 
                          alt={review.userId.fullName || review.userId.name || 'User'}
                          className="w-12 h-12 rounded-full object-cover border-2 border-blue-200"
                        />
                      ) : (
                        <div className="bg-blue-100 rounded-full p-3">
                          <FiUser className="w-6 h-6 text-blue-600" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900 text-lg">
                          {review.userId?.fullName || review.userId?.name || 'Anonymous User'}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <FiCalendar className="w-4 h-4" />
                          {new Date(review.createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </div>
                      </div>
                    </div>
                    {review.isVerified && (
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                        ✓ Verified Purchase
                      </span>
                    )}
                  </div>

                  {/* Overall Rating */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2">
                      {renderStars(review.rating)}
                      <span className="text-lg font-bold text-black">
                        {review.rating.toFixed(1)}
                      </span>
                      <span className="text-black font-medium">/5.0</span>
                    </div>
                  </div>

                  {/* Comment */}
                  {review.comment && (
                    <p className="text-gray-700 mb-4 leading-relaxed text-base bg-gray-50 p-4 rounded-lg italic">
                      "{review.comment}"
                    </p>
                  )}

                  {/* Detailed Ratings */}
                  {review.detailedRatings && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                      {Object.entries(review.detailedRatings).map(([key, value]) => (
                        <div key={key} className="text-center">
                          <p className="text-xs text-gray-600 mb-2 capitalize font-medium">{key}</p>
                          <div className="flex items-center justify-center gap-1">
                            <FiStar className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-base font-bold text-gray-900">{value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tour Info */}
                  {review.tourId && (
                    <div className="text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded">
                      <span className="font-semibold">Tour:</span> {review.tourId.title || 'N/A'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuideReviewsModal;
