import { useState, useEffect } from 'react';
import { FiX, FiUser, FiStar, FiMapPin, FiGlobe, FiCheckCircle } from 'react-icons/fi';
import { tourGuidesAPI, guideReviewsAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const TourGuidePickerModal = ({ isOpen, onClose, onSelect, selectedGuideId = null }) => {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchGuides();
    }
  }, [isOpen]);

  const fetchGuides = async () => {
    try {
      setLoading(true);
      const response = await tourGuidesAPI.getAll({ status: 'active' });
      const guidesData = response.data || response;
      setGuides(Array.isArray(guidesData) ? guidesData : []);
    } catch (error) {
      console.error('Error fetching guides:', error);
      toast.error('Failed to load tour guides');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async (guideId) => {
    try {
      const response = await guideReviewsAPI.getByGuide(guideId);
      const reviewData = response.data || response;
      const approvedReviews = Array.isArray(reviewData) 
        ? reviewData.filter(r => r.status === 'approved') 
        : [];
      setReviews(approvedReviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    }
  };

  const handleGuideClick = async (guide) => {
    setSelectedGuide(guide);
    setShowReviews(true);
    await fetchReviews(guide._id);
  };

  const handleSelectGuide = () => {
    if (selectedGuide) {
      onSelect(selectedGuide);
      onClose();
      toast.success(`Selected ${selectedGuide.name} as tour guide`);
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

  const filteredGuides = guides.filter(guide =>
    guide.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guide.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guide.specialties?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-800 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Select Tour Guide</h2>
            <p className="text-orange-100 mt-1">Choose a guide for this tour</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <input
            type="text"
            placeholder="Search by name, email, or specialty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Guides List */}
          <div className={`${showReviews ? 'w-1/2' : 'w-full'} overflow-y-auto p-6 border-r`}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
              </div>
            ) : filteredGuides.length === 0 ? (
              <div className="text-center py-12">
                <FiUser className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No tour guides found</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredGuides.map((guide) => (
                  <div
                    key={guide._id}
                    onClick={() => handleGuideClick(guide)}
                    className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                      selectedGuide?._id === guide._id
                        ? 'border-orange-500 bg-orange-50'
                        : selectedGuideId === guide._id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <img
                        src={guide.avatar || 'https://via.placeholder.com/80'}
                        alt={guide.name}
                        className="w-20 h-20 rounded-full object-cover border-2 border-orange-200"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{guide.name}</h3>
                          {selectedGuideId === guide._id && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                              <FiCheckCircle className="w-3 h-3" />
                              Current Guide
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          {renderStars(guide.rating || 0)}
                          <span className="text-sm font-medium text-gray-700">
                            {(guide.rating || 0).toFixed(1)}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({guide.totalReviews || 0} reviews)
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <span className="flex items-center gap-1">
                            <FiGlobe className="w-4 h-4" />
                            {guide.languages?.slice(0, 2).join(', ')}
                          </span>
                          <span>{guide.experience} years exp</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {guide.specialties?.slice(0, 3).map((specialty, idx) => (
                            <span
                              key={idx}
                              className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                            >
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Guide Details & Reviews */}
          {showReviews && selectedGuide && (
            <div className="w-1/2 overflow-y-auto p-6">
              <div className="mb-6">
                <div className="flex items-start gap-4 mb-4">
                  <img
                    src={selectedGuide.avatar || 'https://via.placeholder.com/100'}
                    alt={selectedGuide.name}
                    className="w-24 h-24 rounded-full object-cover border-4 border-orange-200"
                  />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{selectedGuide.name}</h3>
                    <p className="text-gray-600 mb-2">{selectedGuide.email}</p>
                    <div className="flex items-center gap-2 mb-2">
                      {renderStars(selectedGuide.rating || 0)}
                      <span className="text-sm font-bold text-gray-900">
                        {(selectedGuide.rating || 0).toFixed(1)}/5.0
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {selectedGuide.totalReviews || 0} reviews • {selectedGuide.totalTours || 0} tours
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-gray-700">{selectedGuide.bio}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-blue-50 p-3 rounded">
                    <div className="text-xs text-blue-700 mb-1">Languages</div>
                    <div className="text-sm font-medium text-gray-900">
                      {selectedGuide.languages?.join(', ')}
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <div className="text-xs text-green-700 mb-1">Experience</div>
                    <div className="text-sm font-medium text-gray-900">
                      {selectedGuide.experience} years
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Specialties</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedGuide.specialties?.map((specialty, idx) => (
                      <span
                        key={idx}
                        className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reviews */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">
                  Customer Reviews ({reviews.length})
                </h4>
                <div className="space-y-3">
                  {reviews.slice(0, 5).map((review) => (
                    <div key={review._id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        {renderStars(review.rating)}
                        <span className="text-sm font-medium text-gray-900">
                          {review.userId?.fullName || 'Anonymous'}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-gray-700">{review.comment}</p>
                      )}
                    </div>
                  ))}
                  {reviews.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No reviews yet</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSelectGuide}
            disabled={!selectedGuide}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              selectedGuide
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {selectedGuide ? `Select ${selectedGuide.name}` : 'Select a Guide'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TourGuidePickerModal;
