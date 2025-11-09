import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiStar, FiUser, FiMail, FiPhone, FiMapPin, FiAward, FiMessageSquare } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { fetchTourGuides, createTourGuide, updateTourGuide, deleteTourGuide } from '../../utils/api';
import TourGuideModal from '../../components/TourGuides/TourGuideModal';
import GuideReviewsModal from '../../components/TourGuides/GuideReviewsModal';
import DeleteConfirmModal from '../../components/common/DeleteConfirmModal';

const TourGuideManagement = () => {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [guideToDelete, setGuideToDelete] = useState(null);
  const [guideForReviews, setGuideForReviews] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadGuides();
  }, []);

  const loadGuides = async () => {
    try {
      setLoading(true);
      const response = await fetchTourGuides();
      setGuides(response.data || response || []);
    } catch (error) {
      console.error('Error loading tour guides:', error);
      toast.error('Failed to load tour guides');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGuide = () => {
    setSelectedGuide(null);
    setIsModalOpen(true);
  };

  const handleEditGuide = (guide) => {
    setSelectedGuide(guide);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (guide) => {
    setGuideToDelete(guide);
    setIsDeleteModalOpen(true);
  };

  const handleViewReviews = (guide) => {
    setGuideForReviews(guide);
    setIsReviewsModalOpen(true);
  };

  const handleSaveGuide = async (guideData) => {
    try {
      if (selectedGuide) {
        await updateTourGuide(selectedGuide._id, guideData);
        toast.success('Tour guide updated successfully!');
      } else {
        await createTourGuide(guideData);
        toast.success('Tour guide created successfully!');
      }
      setIsModalOpen(false);
      loadGuides();
    } catch (error) {
      console.error('Error saving tour guide:', error);
      toast.error(error.message || 'Failed to save tour guide');
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteTourGuide(guideToDelete._id);
      toast.success('Tour guide deleted successfully!');
      setIsDeleteModalOpen(false);
      setGuideToDelete(null);
      loadGuides();
    } catch (error) {
      console.error('Error deleting tour guide:', error);
      toast.error('Failed to delete tour guide');
    }
  };

  const filteredGuides = guides.filter(guide => {
    const matchesFilter = filter === 'all' || guide.status === filter;
    const matchesSearch = guide.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         guide.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: guides.length,
    active: guides.filter(g => g.status === 'active').length,
    inactive: guides.filter(g => g.status === 'inactive').length,
    available: guides.filter(g => g.availability === 'available').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-xl text-gray-600">Loading tour guides...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Tour Guide Management</h1>
        <p className="text-gray-600">Manage tour guides, their profiles, and performance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Guides</p>
              <p className="text-3xl font-bold mt-1">{stats.total}</p>
            </div>
            <FiUser className="w-12 h-12 text-blue-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Active</p>
              <p className="text-3xl font-bold mt-1">{stats.active}</p>
            </div>
            <FiAward className="w-12 h-12 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Available</p>
              <p className="text-3xl font-bold mt-1">{stats.available}</p>
            </div>
            <FiStar className="w-12 h-12 text-orange-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">Inactive</p>
              <p className="text-3xl font-bold mt-1">{stats.inactive}</p>
            </div>
            <FiUser className="w-12 h-12 text-red-200" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex gap-2">
            {['all', 'active', 'inactive', 'on-leave'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === status
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <button
              onClick={handleCreateGuide}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 font-medium"
            >
              <FiPlus className="w-5 h-5" />
              Add Guide
            </button>
          </div>
        </div>
      </div>

      {/* Guides Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGuides.map((guide) => (
          <div key={guide._id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <div className="relative h-32 bg-gradient-to-r from-orange-400 to-orange-500">
              <div className="absolute -bottom-12 left-6">
                <img
                  src={guide.avatar || 'https://via.placeholder.com/100'}
                  alt={guide.name}
                  className="w-24 h-24 rounded-full border-4 border-white object-cover"
                />
              </div>
              <div className="absolute top-3 right-3 flex gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  guide.status === 'active' ? 'bg-green-100 text-green-700' :
                  guide.status === 'inactive' ? 'bg-gray-100 text-gray-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {guide.status}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  guide.availability === 'available' ? 'bg-blue-100 text-blue-700' :
                  guide.availability === 'busy' ? 'bg-orange-100 text-orange-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {guide.availability}
                </span>
              </div>
            </div>

            <div className="pt-16 p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-1">{guide.name}</h3>
              
              <div className="flex items-center gap-1 mb-3">
                <FiStar className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="font-semibold text-gray-700">{guide.rating.toFixed(1)}</span>
                <span className="text-gray-500 text-sm">({guide.totalReviews} reviews)</span>
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{guide.bio}</p>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <FiMail className="w-4 h-4" />
                  <span className="truncate">{guide.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <FiPhone className="w-4 h-4" />
                  <span>{guide.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <FiAward className="w-4 h-4" />
                  <span>{guide.experience} years experience</span>
                </div>
              </div>

              {guide.languages && guide.languages.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {guide.languages.slice(0, 3).map((lang, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                        {lang}
                      </span>
                    ))}
                    {guide.languages.length > 3 && (
                      <span className="px-2 py-1 bg-gray-50 text-gray-700 rounded text-xs">
                        +{guide.languages.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleViewReviews(guide)}
                  className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <FiMessageSquare className="w-4 h-4" />
                  Reviews
                </button>
                <button
                  onClick={() => handleEditGuide(guide)}
                  className="flex-1 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <FiEdit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteClick(guide)}
                  className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredGuides.length === 0 && (
        <div className="text-center py-12">
          <FiUser className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No tour guides found</p>
          <p className="text-gray-400">Try adjusting your filters or add a new guide</p>
        </div>
      )}

      {/* Modals */}
      <TourGuideModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveGuide}
        guide={selectedGuide}
      />

      <GuideReviewsModal
        isOpen={isReviewsModalOpen}
        onClose={() => setIsReviewsModalOpen(false)}
        guide={guideForReviews}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Tour Guide"
        message={`Are you sure you want to delete ${guideToDelete?.name}? This action cannot be undone.`}
      />
    </div>
  );
};

export default TourGuideManagement;
