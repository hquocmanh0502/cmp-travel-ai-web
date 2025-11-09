import { useState, useEffect } from 'react';
import { 
  MdClose, 
  MdAdd, 
  MdDelete, 
  MdPhotoLibrary, 
  MdLocationOn,
  MdAttachMoney,
  MdPeople,
  MdSchedule,
  MdStar,
  MdRestaurant,
  MdHotel,
  MdLocalActivity,
  MdLandscape,
  MdDragHandle,
  MdPerson
} from 'react-icons/md';
import { FiStar, FiMapPin, FiGlobe, FiMessageSquare } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import ImageUpload from './ImageUpload';
import { tourGuidesAPI, guideReviewsAPI } from '../utils/api';

const API_BASE_URL = 'http://localhost:3000/api/admin';

// Load hotel data
const loadHotels = async () => {
  try {
    const response = await fetch(`${API_BASE_URL.replace('/admin', '')}/hotels`);
    const result = await response.json();
    if (result.success) {
      return result.data;
    } else {
      console.error('Failed to load hotels:', result.message);
      return {};
    }
  } catch (error) {
    console.error('Error loading hotels:', error);
    return {};
  }
};

// Gallery categories với icons
const GALLERY_CATEGORIES = [
  { value: 'all', label: 'All', icon: MdPhotoLibrary },
  { value: 'attractions', label: 'Attractions', icon: MdLocationOn },
  { value: 'accommodation', label: 'Hotels', icon: MdHotel },
  { value: 'activities', label: 'Activities', icon: MdLocalActivity },
  { value: 'food', label: 'Food', icon: MdRestaurant },
  { value: 'landscape', label: 'Landscape', icon: MdLandscape }
];

const TOUR_TYPES = ['domestic', 'international'];
const TOUR_STATUSES = ['active', 'draft', 'inactive'];

export default function EnhancedTourFormModal({ tour, isEdit, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [availableHotels, setAvailableHotels] = useState({});
  const [hotelSearchTerm, setHotelSearchTerm] = useState('');
  const [tourGuides, setTourGuides] = useState([]);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [guideReviews, setGuideReviews] = useState([]);
  const [loadingGuides, setLoadingGuides] = useState(false);

  // Load hotels on mount  
  useEffect(() => {
    console.log('=== HOTELS LOADING START ===');
    const loadHotels = async () => {
      try {
        console.log('Fetching from: http://localhost:3000/api/hotels');
        const response = await fetch('http://localhost:3000/api/hotels');
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Raw API response:', data);
        return data;
      } catch (error) {
        console.error('Error loading hotels:', error);
        throw error;
      }
    };

    loadHotels().then(response => {
      console.log('Hotels API response:', response);
      // API returns { success: true, data: { Country: [...] } }
      if (response && response.success && response.data) {
        console.log('Setting availableHotels to:', response.data);
        setAvailableHotels(response.data);
      } else {
        console.warn('Invalid response structure:', response);
        setAvailableHotels({});
      }
      console.log('=== HOTELS LOADING COMPLETE ===');
    }).catch(error => {
      console.error('Failed to load hotels:', error);
      setAvailableHotels({});
    });
  }, []);

  // Load tour guides on mount
  useEffect(() => {
    const loadGuides = async () => {
      try {
        setLoadingGuides(true);
        const response = await tourGuidesAPI.getAll({ status: 'active' });
        const guidesData = response.data || response;
        setTourGuides(Array.isArray(guidesData) ? guidesData : []);
      } catch (error) {
        console.error('Error loading tour guides:', error);
        toast.error('Failed to load tour guides');
      } finally {
        setLoadingGuides(false);
      }
    };
    loadGuides();
  }, []);

  // Initialize empty form data
  const initializeFormData = (tourData = null) => ({
    name: tourData?.name || '',
    country: tourData?.country || '',
    description: tourData?.description || '',
    img: tourData?.img ? (typeof tourData.img === 'string' ? { url: tourData.img, data: tourData.img } : tourData.img) : null,
    duration: tourData?.duration || '7 Days',
    type: tourData?.type || 'international',
    estimatedCost: tourData?.estimatedCost || tourData?.pricing?.adult || 5000,
    maxGroupSize: tourData?.maxGroupSize || 20,
    minAge: tourData?.minAge || 0,
    status: tourData?.status || 'active',
    featured: tourData?.featured || false,
    
    // Location
    location: {
      coordinates: tourData?.location?.coordinates || [0, 0],
      address: tourData?.location?.address || '',
      region: tourData?.location?.region || ''
    },
    
    // Pricing
    pricing: {
      adult: tourData?.pricing?.adult || 5000,
      child: tourData?.pricing?.child || 3500,
      infant: tourData?.pricing?.infant || 1500,
      groupDiscount: tourData?.pricing?.groupDiscount || 10
    },
    
    // Detailed information
    attractions: tourData?.attractions || [],
    food: tourData?.food || [],
    inclusions: tourData?.inclusions || [],
    exclusions: tourData?.exclusions || [],
    
    // Itinerary
    itinerary: tourData?.itinerary || [
      { day: 1, title: 'Arrival Day', activities: [], meals: [] }
    ],
    
    // Hotels
    selectedHotels: tourData?.selectedHotels || [],
    
    // Tour Guides - handle both ObjectId strings and populated objects
    assignedGuide: (() => {
      if (!tourData?.assignedGuide) return [];
      
      // If already an array, map to IDs
      if (Array.isArray(tourData.assignedGuide)) {
        return tourData.assignedGuide.map(guide => {
          // If guide is an object (populated), get _id
          if (typeof guide === 'object' && guide !== null) {
            return guide._id || guide.id;
          }
          // If guide is already a string ID
          return guide;
        });
      }
      
      // If single value (old format), convert to array
      const singleGuide = typeof tourData.assignedGuide === 'object' 
        ? (tourData.assignedGuide._id || tourData.assignedGuide.id)
        : tourData.assignedGuide;
      return singleGuide ? [singleGuide] : [];
    })(),
    
    // Gallery - 12 photos với file upload support
    gallery: tourData?.gallery && tourData.gallery.length > 0 ? 
      // If tour has existing gallery, pad it to 12 items
      [...tourData.gallery.map(photo => ({
        ...photo,
        url: photo.url,
        data: photo.data || photo.url
      })), ...Array(Math.max(0, 12 - tourData.gallery.length)).fill(null).map((_, index) => ({
        url: '',
        data: '',
        category: (tourData.gallery.length + index) < 3 ? 'attractions' : 
                 (tourData.gallery.length + index) < 6 ? 'landscape' : 
                 (tourData.gallery.length + index) < 9 ? 'accommodation' : 'activities',
        caption: ''
      }))] :
      // If no tour or empty gallery, create 12 empty slots
      Array(12).fill(null).map((_, index) => ({
        url: '',
        data: '',
        category: index < 3 ? 'attractions' : index < 6 ? 'landscape' : index < 9 ? 'accommodation' : 'activities',
        caption: ''
      }))
  });

  // Basic Information
  const [formData, setFormData] = useState(() => initializeFormData(tour));

  // Update form data when tour prop changes
  useEffect(() => {
    const newFormData = initializeFormData(tour);
    setFormData(newFormData);
  }, [tour]);

  // Debug selected hotels in edit mode
  useEffect(() => {
    if (isEdit && tour) {
      console.log('=== EDIT MODE DEBUG ===');
      console.log('Tour data:', tour);
      console.log('Selected hotels from tour:', tour.selectedHotels);
      console.log('Form selected hotels:', formData.selectedHotels);
    }
  }, [isEdit, tour, formData.selectedHotels]);

  const handleBasicChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Reset hotel search when country changes
    if (name === 'country' && value !== formData.country) {
      setHotelSearchTerm('');
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleNestedChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleArrayChange = (field, index, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (field, defaultValue = '') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], defaultValue]
    }));
  };

  const removeArrayItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  // Handle main image upload
  const handleMainImageUpload = (file) => {
    setFormData(prev => ({
      ...prev,
      img: file
    }));
  };

  // Handle gallery upload
  const handleGalleryUpload = (files) => {
    if (!files || files.length === 0) return;
    
    setFormData(prev => {
      const newGallery = [...prev.gallery];
      
      // Replace slots starting from the beginning
      for (let i = 0; i < files.length && i < newGallery.length; i++) {
        newGallery[i] = {
          ...newGallery[i],
          url: files[i].url || '',
          data: files[i].data || files[i].url || '',
          name: files[i].originalName || files[i].name || ''
        };
      }
      
      return {
        ...prev,
        gallery: newGallery
      };
    });
  };

  // Handle single gallery photo upload
  const handleSingleGalleryUpload = (index, file) => {
    setFormData(prev => ({
      ...prev,
      gallery: prev.gallery.map((item, i) => 
        i === index ? { 
          ...item, 
          url: file?.url || '', 
          data: file?.data || file?.url || '',
          name: file?.name || ''
        } : item
      )
    }));
  };

  const handleGalleryChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      gallery: prev.gallery.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleItineraryChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      itinerary: prev.itinerary.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addItineraryDay = () => {
    const newDay = {
      day: formData.itinerary.length + 1,
      title: `Day ${formData.itinerary.length + 1}`,
      activities: [],
      meals: []
    };
    setFormData(prev => ({
      ...prev,
      itinerary: [...prev.itinerary, newDay]
    }));
  };

  // Hotel Selection Handlers
  const handleHotelSelection = (hotelId, checked) => {
    console.log('=== HOTEL SELECTION DEBUG ===');
    console.log('Hotel ID:', hotelId);
    console.log('Checked:', checked);
    console.log('Current selectedHotels:', formData.selectedHotels);
    
    setFormData(prev => {
      const newSelectedHotels = checked 
        ? [...prev.selectedHotels, hotelId]
        : prev.selectedHotels.filter(id => id !== hotelId);
      
      console.log('New selectedHotels:', newSelectedHotels);
      
      return {
        ...prev,
        selectedHotels: newSelectedHotels
      };
    });
  };

  const getHotelsForCountry = (country) => {
    console.log('getHotelsForCountry called with:', country);
    console.log('availableHotels:', availableHotels);
    
    // Check if availableHotels is grouped by country or flat array
    let countryHotels = [];
    if (availableHotels[country]) {
      countryHotels = availableHotels[country];
    } else if (Array.isArray(availableHotels)) {
      // If data is flat array, filter by country
      countryHotels = availableHotels.filter(hotel => hotel.location?.country === country);
    }
    
    console.log('countryHotels before filter:', countryHotels);
    
    // Log first hotel structure for debugging
    if (countryHotels.length > 0) {
      console.log('Sample hotel structure:', {
        _id: countryHotels[0]._id,
        id: countryHotels[0].id,
        name: countryHotels[0].name,
        hasId: !!countryHotels[0].id,
        has_id: !!countryHotels[0]._id
      });
    }
    
    if (!hotelSearchTerm.trim()) {
      return countryHotels;
    }
    
    const searchLower = hotelSearchTerm.toLowerCase();
    const filtered = countryHotels.filter(hotel => 
      hotel.name.toLowerCase().includes(searchLower) ||
      hotel.location?.city?.toLowerCase().includes(searchLower) ||
      hotel.location?.address?.toLowerCase().includes(searchLower) ||
      hotel.details?.amenities?.some(amenity => 
        amenity.toLowerCase().replace('_', ' ').includes(searchLower)
      )
    );
    
    console.log('filtered hotels:', filtered);
    return filtered;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate main image
      if (!formData.img || (!formData.img.url && !formData.img.data)) {
        toast.error('Please upload a main image');
        setLoading(false);
        return;
      }

      // Validate gallery photos
      const validPhotos = formData.gallery.filter(photo => 
        (photo.url && photo.url.trim() !== '') || (photo.data && photo.data.trim() !== '')
      );
      if (validPhotos.length < 8) {
        toast.error('Please add at least 8 gallery photos');
        setLoading(false);
        return;
      }

      const url = isEdit 
        ? `${API_BASE_URL}/tours/${tour._id}`
        : `${API_BASE_URL}/tours`;
      
      const method = isEdit ? 'PUT' : 'POST';

      // Prepare tour data
      const tourData = {
        ...formData,
        // Convert main image - now using real URLs from upload service
        img: formData.img?.url || '',
        // Process gallery - now using real URLs from upload service
        gallery: formData.gallery
          .filter(photo => (photo.url && photo.url.trim() !== '') || (photo.data && photo.data.trim() !== ''))
          .map(photo => ({
            url: photo.url || photo.data,
            category: photo.category,
            caption: photo.caption
          })),
        // Filter out empty arrays
        attractions: formData.attractions.filter(item => item.trim() !== ''),
        food: formData.food.filter(item => item.trim() !== ''),
        inclusions: formData.inclusions.filter(item => item.trim() !== ''),
        exclusions: formData.exclusions.filter(item => item.trim() !== '')
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tourData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success(isEdit ? 'Tour updated successfully' : 'Tour created successfully');
        onSuccess();
        onClose();
      } else {
        toast.error(data.error || 'Failed to save tour');
      }
    } catch (error) {
      console.error('Error saving tour:', error);
      toast.error('Failed to save tour');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: MdLocationOn },
    { id: 'details', label: 'Details', icon: MdStar },
    { id: 'hotels', label: 'Hotels', icon: MdHotel },
    { id: 'guide', label: 'Tour Guide', icon: MdPerson },
    { id: 'gallery', label: 'Gallery (12 Photos)', icon: MdPhotoLibrary },
    { id: 'itinerary', label: 'Itinerary', icon: MdSchedule },
    { id: 'pricing', label: 'Pricing', icon: MdAttachMoney }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-800">
            {isEdit ? `Edit Tour: ${tour?.name}` : 'Create New Tour'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <MdClose className="text-xl" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 px-6">
          <div className="flex space-x-0 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="text-lg" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Tour Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tour Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleBasicChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Beautiful Maldives Adventure"
                      required
                    />
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country *
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleBasicChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Maldives"
                      required
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleBasicChange}
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Discover the pristine beauty of the Maldives..."
                    required
                  />
                </div>

                {/* Main Image */}
                <ImageUpload
                  value={formData.img}
                  onChange={handleMainImageUpload}
                  label="Main Image *"
                  className="mb-4"
                  showPreview={true}
                  previewClassName="w-32 h-20"
                />

                <div className="grid grid-cols-4 gap-4">
                  {/* Duration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration
                    </label>
                    <input
                      type="text"
                      name="duration"
                      value={formData.duration}
                      onChange={handleBasicChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="7 Days"
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type *
                    </label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleBasicChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {TOUR_TYPES.map(type => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Max Group Size */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Group Size
                    </label>
                    <input
                      type="number"
                      name="maxGroupSize"
                      value={formData.maxGroupSize}
                      onChange={handleBasicChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="50"
                    />
                  </div>

                  {/* Min Age */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Age
                    </label>
                    <input
                      type="number"
                      name="minAge"
                      value={formData.minAge}
                      onChange={handleBasicChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0"
                      max="21"
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Location Details</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      <input
                        type="text"
                        value={formData.location.address}
                        onChange={(e) => handleNestedChange('location', 'address', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Main destination address"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Region
                      </label>
                      <input
                        type="text"
                        value={formData.location.region}
                        onChange={(e) => handleNestedChange('location', 'region', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Region/Province"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Longitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={formData.location.coordinates[0]}
                          onChange={(e) => handleNestedChange('location', 'coordinates', [parseFloat(e.target.value) || 0, formData.location.coordinates[1]])}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="0.0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Latitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={formData.location.coordinates[1]}
                          onChange={(e) => handleNestedChange('location', 'coordinates', [formData.location.coordinates[0], parseFloat(e.target.value) || 0])}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="0.0"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status & Featured */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status *
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleBasicChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {TOUR_STATUSES.map(status => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer w-full">
                      <input
                        type="checkbox"
                        name="featured"
                        checked={formData.featured}
                        onChange={handleBasicChange}
                        className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-gray-800">Featured Tour</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                {/* Attractions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attractions
                  </label>
                  <div className="space-y-2">
                    {formData.attractions.map((attraction, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={attraction}
                          onChange={(e) => handleArrayChange('attractions', index, e.target.value)}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Tourist attraction name"
                        />
                        <button
                          type="button"
                          onClick={() => removeArrayItem('attractions', index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <MdDelete />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayItem('attractions')}
                      className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
                    >
                      <MdAdd /> Add Attraction
                    </button>
                  </div>
                </div>

                {/* Food */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Local Food & Cuisine
                  </label>
                  <div className="space-y-2">
                    {formData.food.map((food, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={food}
                          onChange={(e) => handleArrayChange('food', index, e.target.value)}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Local food or restaurant"
                        />
                        <button
                          type="button"
                          onClick={() => removeArrayItem('food', index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <MdDelete />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayItem('food')}
                      className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
                    >
                      <MdAdd /> Add Food Item
                    </button>
                  </div>
                </div>

                {/* Inclusions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Inclusions (What's included)
                  </label>
                  <div className="space-y-2">
                    {formData.inclusions.map((inclusion, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={inclusion}
                          onChange={(e) => handleArrayChange('inclusions', index, e.target.value)}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Accommodation, Meals, Transportation"
                        />
                        <button
                          type="button"
                          onClick={() => removeArrayItem('inclusions', index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <MdDelete />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayItem('inclusions')}
                      className="flex items-center gap-2 px-4 py-2 text-green-600 border border-green-300 rounded-lg hover:bg-green-50"
                    >
                      <MdAdd /> Add Inclusion
                    </button>
                  </div>
                </div>

                {/* Exclusions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exclusions (What's not included)
                  </label>
                  <div className="space-y-2">
                    {formData.exclusions.map((exclusion, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={exclusion}
                          onChange={(e) => handleArrayChange('exclusions', index, e.target.value)}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Personal expenses, Tips, Insurance"
                        />
                        <button
                          type="button"
                          onClick={() => removeArrayItem('exclusions', index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <MdDelete />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayItem('exclusions')}
                      className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                    >
                      <MdAdd /> Add Exclusion
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Hotels Tab */}
            {activeTab === 'hotels' && (
              <div className="space-y-6">
                {!formData.country ? (
                  <div className="text-center py-12">
                    <MdHotel className="mx-auto text-6xl text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">Select a Country First</h3>
                    <p className="text-gray-500">
                      Please select a country in the Basic Info tab to see available hotels.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Header with Search */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-blue-800">Hotel Selection for {formData.country}</h3>
                          <p className="text-sm text-blue-700">
                            Select hotels that will be available for this tour. Guests can choose from these options during booking.
                          </p>
                        </div>
                        {formData.selectedHotels.length > 0 && (
                          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                            ✓ {formData.selectedHotels.length} selected
                          </div>
                        )}
                      </div>
                      
                      {/* Search Bar */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search hotels by name, city, or amenities..."
                          value={hotelSearchTerm}
                          onChange={(e) => setHotelSearchTerm(e.target.value)}
                          className="w-full px-4 py-2 pl-10 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <MdLocationOn className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      </div>
                    </div>

                    {/* Hotels Grid */}
                    {(() => {
                      console.log('=== HOTELS TAB DEBUG ===');
                      console.log('availableHotels:', availableHotels);
                      console.log('formData.country:', formData.country);
                      console.log('hotels for country:', availableHotels[formData.country]);
                      console.log('has hotels?:', availableHotels && availableHotels[formData.country] && availableHotels[formData.country].length > 0);
                      return null;
                    })()}
                    {availableHotels && availableHotels[formData.country] && availableHotels[formData.country].length > 0 ? (
                      <>
                        {/* Results Info */}
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600">
                            Showing {getHotelsForCountry(formData.country).length} of {availableHotels[formData.country].length} hotels
                          </p>
                          {hotelSearchTerm && (
                            <button
                              onClick={() => setHotelSearchTerm('')}
                              className="text-sm text-blue-600 hover:text-blue-700"
                            >
                              Clear search
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {getHotelsForCountry(formData.country).map((hotel) => (
                            <div 
                              key={hotel._id} 
                              className={`border-2 rounded-lg overflow-hidden transition-all duration-200 ${
                                formData.selectedHotels.includes(hotel._id) 
                                  ? 'border-blue-500 bg-blue-50 shadow-lg' 
                                  : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                              }`}
                            >
                              {/* Hotel Image */}
                              {hotel.details.images && hotel.details.images[0] && (
                                <div className="relative h-48">
                                  <img 
                                    src={hotel.details.images[0]} 
                                    alt={hotel.name}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute top-3 left-3">
                                    <input
                                      type="checkbox"
                                      checked={formData.selectedHotels.includes(hotel._id)}
                                      onChange={(e) => handleHotelSelection(hotel._id, e.target.checked)}
                                      className="w-5 h-5 text-blue-600 focus:ring-blue-500 rounded"
                                    />
                                  </div>
                                  <div className="absolute top-3 right-3 bg-white/90 px-2 py-1 rounded-md">
                                    <div className="flex items-center gap-1 text-yellow-500">
                                      {[...Array(hotel.details.starRating)].map((_, i) => (
                                        <MdStar key={i} size={16} />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Hotel Info */}
                              <div className="p-4">
                                <h4 className="font-semibold text-gray-900 mb-1 text-lg">{hotel.name}</h4>
                                
                                {/* Location */}
                                <div className="flex items-center gap-1 text-gray-600 mb-2">
                                  <MdLocationOn size={16} />
                                  <span className="text-sm">{hotel.location.city}</span>
                                </div>
                                
                                {/* Rating & Price */}
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-md">
                                      <span className="text-sm font-medium">{hotel.details.rating}</span>
                                      <MdStar size={14} className="text-green-600" />
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      ({hotel.reviewsSummary.totalReviews} reviews)
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-lg font-bold text-blue-600">
                                      ${hotel.details.priceRange.min}-{hotel.details.priceRange.max}
                                    </div>
                                    <div className="text-xs text-gray-500">per night</div>
                                  </div>
                                </div>
                                
                                {/* Amenities */}
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {hotel.details.amenities.slice(0, 4).map((amenity, index) => (
                                    <span
                                      key={index}
                                      className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                                    >
                                      {amenity.replace('_', ' ')}
                                    </span>
                                  ))}
                                  {hotel.details.amenities.length > 4 && (
                                    <span className="text-xs text-gray-500 px-2 py-1">
                                      +{hotel.details.amenities.length - 4} more
                                    </span>
                                  )}
                                </div>
                                
                                {/* Quick Details */}
                                <div className="text-xs text-gray-600 space-y-1">
                                  <div>📍 {hotel.location.address}</div>
                                  <div>🏨 {hotel.details.roomTypes.length} room types</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {getHotelsForCountry(formData.country).length === 0 && hotelSearchTerm && (
                          <div className="text-center py-12">
                            <MdLocationOn className="mx-auto text-6xl text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-600 mb-2">No hotels found</h3>
                            <p className="text-gray-500">
                              Try adjusting your search terms or browse all hotels.
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <MdHotel className="mx-auto text-6xl text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-600 mb-2">No Hotels Available</h3>
                        <p className="text-gray-500">
                          No hotels found for {formData.country}. Please check back later.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Tour Guide Tab */}
            {activeTab === 'guide' && (
              <div className="space-y-6">
                <div className="bg-purple-50 p-4 rounded-lg mb-6">
                  <h3 className="font-medium text-purple-800 mb-2">Assign Tour Guides</h3>
                  <p className="text-sm text-purple-700">
                    Select one or more experienced tour guides for this tour. Click on a guide card to view their profile and customer reviews.
                  </p>
                  {formData.assignedGuide && Array.isArray(formData.assignedGuide) && formData.assignedGuide.length > 0 && (
                    <p className="text-sm text-purple-800 font-medium mt-2">
                      {formData.assignedGuide.length} guide(s) selected
                    </p>
                  )}
                </div>

                {loadingGuides ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="bg-white border rounded-lg p-4 animate-pulse">
                        <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-3"></div>
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : tourGuides.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <MdPerson className="mx-auto text-6xl text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">No Tour Guides Available</h3>
                    <p className="text-gray-500">Please add tour guides first before assigning them to tours.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tourGuides.map(guide => {
                      const isSelected = Array.isArray(formData.assignedGuide) 
                        ? formData.assignedGuide.includes(guide._id)
                        : formData.assignedGuide === guide._id;
                      
                      return (
                      <div
                        key={guide._id}
                        onClick={async () => {
                          setSelectedGuide(guide);
                          // Load reviews for selected guide
                          try {
                            const response = await guideReviewsAPI.getByGuide(guide._id);
                            const reviewData = response.data || response;
                            const approvedReviews = Array.isArray(reviewData) 
                              ? reviewData.filter(r => r.status === 'approved') 
                              : [];
                            setGuideReviews(approvedReviews);
                          } catch (error) {
                            console.error('Error loading reviews:', error);
                            setGuideReviews([]);
                          }
                        }}
                        className={`bg-white border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50' 
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="flex flex-col items-center text-center">
                          {guide.avatar ? (
                            <img
                              src={guide.avatar}
                              alt={guide.name}
                              className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 mb-3"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center mb-3">
                              <MdPerson className="text-white text-4xl" />
                            </div>
                          )}
                          
                          <h4 className="font-semibold text-gray-900 mb-1">{guide.name}</h4>
                          
                          <div className="flex items-center gap-1 mb-2">
                            <FiStar className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium text-gray-700">
                              {guide.rating?.toFixed(1) || '0.0'}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({guide.totalReviews || 0} reviews)
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                            <FiMapPin className="w-3 h-3" />
                            <span>{guide.experience || 0} years exp</span>
                          </div>

                          {guide.languages && guide.languages.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-gray-600 mb-3">
                              <FiGlobe className="w-3 h-3" />
                              <span>{guide.languages.slice(0, 2).join(', ')}</span>
                            </div>
                          )}

                          {guide.specialties && guide.specialties.length > 0 && (
                            <div className="flex flex-wrap gap-1 justify-center mb-3">
                              {guide.specialties.slice(0, 2).map((specialty, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                                >
                                  {specialty}
                                </span>
                              ))}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormData(prev => {
                                const currentGuides = Array.isArray(prev.assignedGuide) 
                                  ? prev.assignedGuide 
                                  : prev.assignedGuide ? [prev.assignedGuide] : [];
                                
                                const isAlreadySelected = currentGuides.includes(guide._id);
                                
                                return {
                                  ...prev,
                                  assignedGuide: isAlreadySelected
                                    ? currentGuides.filter(id => id !== guide._id)
                                    : [...currentGuides, guide._id]
                                };
                              });
                            }}
                            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                              isSelected
                                ? 'bg-purple-600 text-white hover:bg-purple-700'
                                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                            }`}
                          >
                            {isSelected ? 'Selected ✓' : 'Select Guide'}
                          </button>
                        </div>
                      </div>
                    )})}
                  </div>
                )}

                {/* Selected Guide Detail Modal */}
                {selectedGuide && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 flex justify-between items-center">
                        <div>
                          <h2 className="text-2xl font-bold">{selectedGuide.name}</h2>
                          <p className="text-purple-100 mt-1">{selectedGuide.email}</p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedGuide(null);
                            setGuideReviews([]);
                          }}
                          className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2"
                        >
                          <MdClose className="w-6 h-6" />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-6">
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="bg-purple-50 p-4 rounded-lg">
                            <p className="text-sm text-purple-700">Rating</p>
                            <div className="flex items-center gap-2 mt-1">
                              <FiStar className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                              <span className="text-2xl font-bold text-purple-900">
                                {selectedGuide.rating?.toFixed(1) || '0.0'}
                              </span>
                            </div>
                          </div>
                          <div className="bg-purple-50 p-4 rounded-lg">
                            <p className="text-sm text-purple-700">Experience</p>
                            <p className="text-2xl font-bold text-purple-900 mt-1">
                              {selectedGuide.experience || 0} years
                            </p>
                          </div>
                        </div>

                        <div className="mb-6">
                          <h3 className="font-semibold text-gray-900 mb-2">Bio</h3>
                          <p className="text-gray-700">{selectedGuide.bio}</p>
                        </div>

                        <div className="mb-6">
                          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <FiMessageSquare className="w-5 h-5" />
                            Customer Reviews ({guideReviews.length})
                          </h3>
                          {guideReviews.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No reviews yet</p>
                          ) : (
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                              {guideReviews.slice(0, 5).map(review => (
                                <div key={review._id} className="bg-gray-50 p-4 rounded-lg">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <p className="font-medium text-gray-900">
                                        {review.userId?.fullName || review.userId?.name || 'Anonymous'}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {new Date(review.createdAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {[1, 2, 3, 4, 5].map(star => (
                                        <FiStar
                                          key={star}
                                          className={`w-4 h-4 ${
                                            star <= review.rating 
                                              ? 'fill-yellow-400 text-yellow-400' 
                                              : 'text-gray-300'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                  <p className="text-gray-700 text-sm">{review.comment}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-gray-50 px-6 py-4 border-t flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGuide(null);
                            setGuideReviews([]);
                          }}
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          Close
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => {
                              const currentGuides = Array.isArray(prev.assignedGuide) 
                                ? prev.assignedGuide 
                                : prev.assignedGuide ? [prev.assignedGuide] : [];
                              
                              const isAlreadySelected = currentGuides.includes(selectedGuide._id);
                              
                              return {
                                ...prev,
                                assignedGuide: isAlreadySelected
                                  ? currentGuides.filter(id => id !== selectedGuide._id)
                                  : [...currentGuides, selectedGuide._id]
                              };
                            });
                            setSelectedGuide(null);
                            setGuideReviews([]);
                            const isSelected = Array.isArray(formData.assignedGuide) 
                              ? formData.assignedGuide.includes(selectedGuide._id)
                              : formData.assignedGuide === selectedGuide._id;
                            toast.success(isSelected 
                              ? `${selectedGuide.name} removed from tour guides`
                              : `${selectedGuide.name} selected as tour guide`
                            );
                          }}
                          className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                        >
                          {(() => {
                            const isSelected = Array.isArray(formData.assignedGuide) 
                              ? formData.assignedGuide.includes(selectedGuide._id)
                              : formData.assignedGuide === selectedGuide._id;
                            return isSelected ? 'Remove This Guide' : 'Select This Guide';
                          })()}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Gallery Tab - 12 Photos */}
            {activeTab === 'gallery' && (
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-800 mb-2">Gallery Instructions</h3>
                  <p className="text-sm text-blue-700">
                    Upload 12 high-quality photos for your tour. Each photo should be categorized appropriately. 
                    At least 8 photos are required. Supported formats: JPG, PNG, GIF, WebP (max 5MB each).
                  </p>
                </div>

                {/* Bulk Upload */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <ImageUpload
                    value={null}
                    onChange={handleGalleryUpload}
                    multiple={true}
                    maxFiles={12}
                    label="Bulk Upload Gallery Photos (Upload multiple photos at once)"
                    showPreview={false}
                    className="mb-0"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Tip: Select up to 12 photos at once. They will be automatically distributed to empty slots below.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {formData.gallery.map((photo, index) => {
                    const categoryData = GALLERY_CATEGORIES.find(cat => cat.value === photo.category);
                    const CategoryIcon = categoryData?.icon || MdPhotoLibrary;
                    
                    // Display caption if available, otherwise show category, fallback to Photo number
                    const displayTitle = photo.caption && photo.caption.trim() !== '' 
                      ? photo.caption 
                      : categoryData?.label || `Photo ${index + 1}`;
                    
                    return (
                      <div key={index} className="border border-gray-300 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700" title={displayTitle}>
                            {displayTitle.length > 20 ? `${displayTitle.substring(0, 20)}...` : displayTitle}
                          </span>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <CategoryIcon />
                            {categoryData?.label}
                          </div>
                        </div>

                        {/* Individual Photo Upload */}
                        <ImageUpload
                          value={photo.url || photo.data ? { url: photo.url || photo.data, data: photo.data } : null}
                          onChange={(file) => handleSingleGalleryUpload(index, file)}
                          label={`Upload ${displayTitle}`}
                          showPreview={true}
                          previewClassName="w-full h-24"
                          className="mb-2"
                        />

                        {/* Category */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                          <select
                            value={photo.category}
                            onChange={(e) => handleGalleryChange(index, 'category', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            {GALLERY_CATEGORIES.filter(cat => cat.value !== 'all').map(cat => (
                              <option key={cat.value} value={cat.value}>
                                {cat.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Caption */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Caption</label>
                          <input
                            type="text"
                            value={photo.caption}
                            onChange={(e) => handleGalleryChange(index, 'caption', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="Photo caption (optional)"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Gallery Status: {formData.gallery.filter(photo => 
                      (photo.url && photo.url.trim() !== '') || (photo.data && photo.data.trim() !== '')
                    ).length}/12 photos uploaded
                    {formData.gallery.filter(photo => 
                      (photo.url && photo.url.trim() !== '') || (photo.data && photo.data.trim() !== '')
                    ).length < 8 && (
                      <span className="text-red-600 ml-2">(Minimum 8 required)</span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Itinerary Tab */}
            {activeTab === 'itinerary' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-800">Day-by-Day Itinerary</h3>
                  <button
                    type="button"
                    onClick={addItineraryDay}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <MdAdd /> Add Day
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.itinerary.map((day, index) => (
                    <div key={index} className="border border-gray-300 rounded-lg p-4 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <MdDragHandle className="text-gray-400" />
                          <span className="text-sm font-medium text-gray-700">Day {day.day}</span>
                        </div>
                        <input
                          type="text"
                          value={day.title}
                          onChange={(e) => handleItineraryChange(index, 'title', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Day title (e.g., Arrival & City Tour)"
                        />
                        {formData.itinerary.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              itinerary: prev.itinerary.filter((_, i) => i !== index)
                            }))}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <MdDelete />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Activities */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Activities
                          </label>
                          <div className="space-y-2">
                            {(day.activities || []).map((activity, actIndex) => (
                              <div key={actIndex} className="flex gap-2">
                                <input
                                  type="text"
                                  value={activity}
                                  onChange={(e) => {
                                    const newActivities = [...(day.activities || [])];
                                    newActivities[actIndex] = e.target.value;
                                    handleItineraryChange(index, 'activities', newActivities);
                                  }}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                  placeholder="Activity description"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newActivities = (day.activities || []).filter((_, i) => i !== actIndex);
                                    handleItineraryChange(index, 'activities', newActivities);
                                  }}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                  <MdDelete className="text-sm" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const newActivities = [...(day.activities || []), ''];
                                handleItineraryChange(index, 'activities', newActivities);
                              }}
                              className="text-xs px-3 py-1 text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
                            >
                              + Add Activity
                            </button>
                          </div>
                        </div>

                        {/* Meals */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Meals
                          </label>
                          <div className="space-y-2">
                            {(day.meals || []).map((meal, mealIndex) => (
                              <div key={mealIndex} className="flex gap-2">
                                <input
                                  type="text"
                                  value={meal}
                                  onChange={(e) => {
                                    const newMeals = [...(day.meals || [])];
                                    newMeals[mealIndex] = e.target.value;
                                    handleItineraryChange(index, 'meals', newMeals);
                                  }}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                  placeholder="Meal description"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newMeals = (day.meals || []).filter((_, i) => i !== mealIndex);
                                    handleItineraryChange(index, 'meals', newMeals);
                                  }}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                  <MdDelete className="text-sm" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const newMeals = [...(day.meals || []), ''];
                                handleItineraryChange(index, 'meals', newMeals);
                              }}
                              className="text-xs px-3 py-1 text-green-600 border border-green-300 rounded hover:bg-green-50"
                            >
                              + Add Meal
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing Tab */}
            {activeTab === 'pricing' && (
              <div className="space-y-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-medium text-green-800 mb-2">Pricing Information</h3>
                  <p className="text-sm text-green-700">
                    Set competitive prices for different passenger types. Child prices are typically 70% of adult prices, 
                    and infant prices are about 30% of adult prices.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Adult Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adult Price (USD) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={formData.pricing.adult}
                        onChange={(e) => {
                          const adultPrice = parseInt(e.target.value) || 0;
                          handleNestedChange('pricing', 'adult', adultPrice);
                          // Auto-calculate other prices
                          handleNestedChange('pricing', 'child', Math.floor(adultPrice * 0.7));
                          handleNestedChange('pricing', 'infant', Math.floor(adultPrice * 0.3));
                          // Update estimatedCost for compatibility
                          setFormData(prev => ({ ...prev, estimatedCost: adultPrice }));
                        }}
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  {/* Child Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Child Price (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={formData.pricing.child}
                        onChange={(e) => handleNestedChange('pricing', 'child', parseInt(e.target.value) || 0)}
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Auto: {Math.floor(formData.pricing.adult * 0.7)} (70% of adult)
                    </p>
                  </div>

                  {/* Infant Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Infant Price (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={formData.pricing.infant}
                        onChange={(e) => handleNestedChange('pricing', 'infant', parseInt(e.target.value) || 0)}
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Auto: {Math.floor(formData.pricing.adult * 0.3)} (30% of adult)
                    </p>
                  </div>

                  {/* Group Discount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Group Discount (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.pricing.groupDiscount}
                        onChange={(e) => handleNestedChange('pricing', 'groupDiscount', parseInt(e.target.value) || 0)}
                        className="w-full pr-8 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        min="0"
                        max="50"
                      />
                      <span className="absolute right-3 top-2 text-gray-500">%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      For groups of 10+ people
                    </p>
                  </div>
                </div>

                {/* Pricing Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-3">Pricing Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Adult:</span>
                      <span className="ml-2 font-medium">${formData.pricing.adult}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Child:</span>
                      <span className="ml-2 font-medium">${formData.pricing.child}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Infant:</span>
                      <span className="ml-2 font-medium">${formData.pricing.infant}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Group Discount:</span>
                      <span className="ml-2 font-medium">{formData.pricing.groupDiscount}%</span>
                    </div>
                  </div>
                  
                  {formData.pricing.groupDiscount > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Group Price (10+ people):</strong> ${Math.floor(formData.pricing.adult * (100 - formData.pricing.groupDiscount) / 100)} per adult
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors flex items-center gap-2"
            >
              {loading ? 'Saving...' : isEdit ? 'Update Tour' : 'Create Tour'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}