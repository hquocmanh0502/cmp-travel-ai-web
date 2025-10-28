// Enhanced Detail Page JavaScript with Orange Theme & AI Features

// ==================== GLOBAL VARIABLES (Outside DOMContentLoaded) ====================
let globalCurrentTour = null;
let globalCurrentUser = null;

// ==================== GLOBAL HELPER FUNCTIONS ====================
function generateStarsHTML(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let starsHTML = '';
    for (let i = 0; i < fullStars; i++) {
        starsHTML += '<i class="fas fa-star"></i>';
    }
    if (hasHalfStar) {
        starsHTML += '<i class="fas fa-star-half-alt"></i>';
    }
    for (let i = 0; i < emptyStars; i++) {
        starsHTML += '<i class="far fa-star"></i>';
    }
    return starsHTML;
}

function getAmenityName(amenity) {
    const amenityNames = {
        'wifi': 'WiFi',
        'pool': 'Pool',
        'spa': 'Spa',
        'gym': 'Gym',
        'restaurant': 'Restaurant',
        'parking': 'Parking',
        'breakfast': 'Breakfast',
        'bar': 'Bar',
        'ac': 'Air Conditioning',
        'tv': 'TV',
        'minibar': 'Minibar',
        'safe': 'Safe',
        'laundry': 'Laundry',
        'beach_access': 'Beach Access',
        'airport_shuttle': 'Airport Shuttle',
        'room_service': 'Room Service',
        'rooftop_bar': 'Rooftop Bar',
        'business_center': 'Business Center'
    };
    return amenityNames[amenity] || amenity.charAt(0).toUpperCase() + amenity.slice(1).replace(/_/g, ' ');
}

// ==================== GLOBAL REVIEW REPLY FUNCTIONS ====================
function toggleReplyForm(reviewId) {
    console.log('🔄 Toggle reply form for:', reviewId);
    const replyForm = document.getElementById(`reply-form-${reviewId}`);
    if (!replyForm) {
        console.error('❌ Reply form not found:', reviewId);
        return;
    }
    
    console.log('Current display:', replyForm.style.display);
    if (replyForm.style.display === 'none' || !replyForm.style.display) {
        replyForm.style.display = 'block';
        const textarea = document.getElementById(`reply-text-${reviewId}`);
        if (textarea) {
            textarea.focus();
            console.log('✅ Reply form shown');
        }
    } else {
        replyForm.style.display = 'none';
        const textarea = document.getElementById(`reply-text-${reviewId}`);
        if (textarea) textarea.value = '';
        console.log('✅ Reply form hidden');
    }
}

async function submitReply(reviewId) {
    console.log('📤 Submitting reply for:', reviewId);
    
    // Get user from localStorage - using separate keys
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    
    console.log('👤 User info:', { userId, username });
    
    if (!userId) {
        alert('Please login to reply');
        console.log('❌ User not logged in');
        return;
    }
    
    const textarea = document.getElementById(`reply-text-${reviewId}`);
    const text = textarea?.value.trim();
    
    console.log('Reply text:', text);
    
    if (!text) {
        alert('Please write something before submitting');
        return;
    }
    
    try {
        console.log('Calling API...');
        const response = await fetch(`http://localhost:3000/api/comments/${reviewId}/reply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-id': userId
            },
            body: JSON.stringify({ text })
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ API Error:', errorData);
            throw new Error(errorData.message || 'Failed to submit reply');
        }
        
        const result = await response.json();
        console.log('✅ Reply submitted:', result);
        alert('Reply submitted successfully!');
        
        // Hide form and clear textarea
        toggleReplyForm(reviewId);
        
        // Reload page to show new reply
        window.location.reload();
    } catch (error) {
        console.error('❌ Error submitting reply:', error);
        alert('Failed to submit reply. Please try again.');
    }
}

// ✅ WRITE REVIEW MODAL
function openReviewModal() {
    console.log('📝 Opening review modal');
    
    const userId = localStorage.getItem('userId');
    if (!userId) {
        alert('Please login to write a review');
        window.location.href = 'login.html';
        return;
    }
    
    // Get booking ID from URL if redirected from My Bookings
    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get('bookingId');
    
    const modal = document.createElement('div');
    modal.className = 'review-modal-overlay';
    modal.id = 'reviewModal';
    
    modal.innerHTML = `
        <div class="review-modal">
            <div class="modal-header">
                <h3><i class="fas fa-star"></i> Write Your Review</h3>
                <button class="modal-close" onclick="closeReviewModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="modal-body">
                <form id="reviewForm">
                    <!-- Rating -->
                    <div class="form-group">
                        <label>Overall Rating <span class="required">*</span></label>
                        <div class="star-rating-input" id="starRating">
                            <i class="fas fa-star" data-rating="1"></i>
                            <i class="fas fa-star" data-rating="2"></i>
                            <i class="fas fa-star" data-rating="3"></i>
                            <i class="fas fa-star" data-rating="4"></i>
                            <i class="fas fa-star" data-rating="5"></i>
                        </div>
                        <span class="rating-text" id="ratingText">Select a rating</span>
                    </div>
                    
                    <!-- Review Text -->
                    <div class="form-group">
                        <label for="reviewText">Your Review <span class="required">*</span></label>
                        <textarea 
                            id="reviewText" 
                            placeholder="Share your experience with this tour. What did you love? What could be improved?"
                            rows="6"
                            required
                        ></textarea>
                        <small class="char-count"><span id="charCount">0</span>/1000 characters</small>
                    </div>
                    
                    <!-- Detailed Ratings (Optional) -->
                    <div class="form-group">
                        <label>Detailed Ratings (Optional)</label>
                        <div class="detailed-ratings">
                            <div class="rating-item">
                                <span>Guide</span>
                                <select id="guideRating">
                                    <option value="">Not rated</option>
                                    <option value="1">1 - Poor</option>
                                    <option value="2">2 - Fair</option>
                                    <option value="3">3 - Good</option>
                                    <option value="4">4 - Very Good</option>
                                    <option value="5">5 - Excellent</option>
                                </select>
                            </div>
                            <div class="rating-item">
                                <span>Accommodation</span>
                                <select id="accommodationRating">
                                    <option value="">Not rated</option>
                                    <option value="1">1 - Poor</option>
                                    <option value="2">2 - Fair</option>
                                    <option value="3">3 - Good</option>
                                    <option value="4">4 - Very Good</option>
                                    <option value="5">5 - Excellent</option>
                                </select>
                            </div>
                            <div class="rating-item">
                                <span>Transportation</span>
                                <select id="transportationRating">
                                    <option value="">Not rated</option>
                                    <option value="1">1 - Poor</option>
                                    <option value="2">2 - Fair</option>
                                    <option value="3">3 - Good</option>
                                    <option value="4">4 - Very Good</option>
                                    <option value="5">5 - Excellent</option>
                                </select>
                            </div>
                            <div class="rating-item">
                                <span>Food</span>
                                <select id="foodRating">
                                    <option value="">Not rated</option>
                                    <option value="1">1 - Poor</option>
                                    <option value="2">2 - Fair</option>
                                    <option value="3">3 - Good</option>
                                    <option value="4">4 - Very Good</option>
                                    <option value="5">5 - Excellent</option>
                                </select>
                            </div>
                            <div class="rating-item">
                                <span>Activities</span>
                                <select id="activitiesRating">
                                    <option value="">Not rated</option>
                                    <option value="1">1 - Poor</option>
                                    <option value="2">2 - Fair</option>
                                    <option value="3">3 - Good</option>
                                    <option value="4">4 - Very Good</option>
                                    <option value="5">5 - Excellent</option>
                                </select>
                            </div>
                            <div class="rating-item">
                                <span>Value for Money</span>
                                <select id="valueRating">
                                    <option value="">Not rated</option>
                                    <option value="1">1 - Poor</option>
                                    <option value="2">2 - Fair</option>
                                    <option value="3">3 - Good</option>
                                    <option value="4">4 - Very Good</option>
                                    <option value="5">5 - Excellent</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeReviewModal()">
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-paper-plane"></i> Submit Review
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Star rating interaction
    let selectedRating = 0;
    const stars = modal.querySelectorAll('.star-rating-input i');
    const ratingText = modal.querySelector('#ratingText');
    
    stars.forEach(star => {
        star.addEventListener('click', function() {
            selectedRating = parseInt(this.dataset.rating);
            updateStarDisplay();
        });
        
        star.addEventListener('mouseenter', function() {
            const hoverRating = parseInt(this.dataset.rating);
            stars.forEach((s, idx) => {
                s.classList.toggle('active', idx < hoverRating);
            });
        });
    });
    
    modal.querySelector('.star-rating-input').addEventListener('mouseleave', updateStarDisplay);
    
    function updateStarDisplay() {
        stars.forEach((s, idx) => {
            s.classList.toggle('active', idx < selectedRating);
        });
        
        const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
        ratingText.textContent = selectedRating > 0 ? ratingLabels[selectedRating] : 'Select a rating';
    }
    
    // Character counter
    const textarea = modal.querySelector('#reviewText');
    const charCount = modal.querySelector('#charCount');
    
    textarea.addEventListener('input', function() {
        const length = this.value.length;
        charCount.textContent = length;
        
        if (length > 1000) {
            this.value = this.value.substring(0, 1000);
            charCount.textContent = '1000';
        }
    });
    
    // Form submission
    const form = modal.querySelector('#reviewForm');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        await submitReview(selectedRating, bookingId);
    });
}

function closeReviewModal() {
    const modal = document.getElementById('reviewModal');
    if (modal) {
        modal.remove();
    }
}

async function submitReview(rating, bookingId) {
    console.log('📤 Submitting review with rating:', rating);
    
    if (!rating || rating < 1) {
        alert('Please select a rating');
        return;
    }
    
    const userId = localStorage.getItem('userId');
    if (!userId) {
        alert('Please login to submit review');
        return;
    }
    
    const reviewText = document.getElementById('reviewText').value.trim();
    if (!reviewText) {
        alert('Please write your review');
        return;
    }
    
    // Get detailed ratings (optional)
    const detailedRating = {
        guide: parseInt(document.getElementById('guideRating').value) || undefined,
        accommodation: parseInt(document.getElementById('accommodationRating').value) || undefined,
        transportation: parseInt(document.getElementById('transportationRating').value) || undefined,
        food: parseInt(document.getElementById('foodRating').value) || undefined,
        activities: parseInt(document.getElementById('activitiesRating').value) || undefined,
        valueForMoney: parseInt(document.getElementById('valueRating').value) || undefined
    };
    
    // Remove undefined values
    Object.keys(detailedRating).forEach(key => {
        if (detailedRating[key] === undefined) delete detailedRating[key];
    });
    
    const reviewData = {
        content: {
            text: reviewText,
            rating: rating,
            detailedRating: Object.keys(detailedRating).length > 0 ? detailedRating : undefined
        },
        bookingId: bookingId || undefined
    };
    
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const tourId = urlParams.get('id');
        
        console.log('Submitting to API:', reviewData);
        
        const response = await fetch('http://localhost:3000/api/comments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-id': userId
            },
            body: JSON.stringify({
                tourId: tourId,
                ...reviewData
            })
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ API Error:', errorData);
            alert(errorData.message || 'Failed to submit review');
            return;
        }
        
        const result = await response.json();
        console.log('✅ Review submitted:', result);
        
        alert('Thank you for your review!');
        closeReviewModal();
        
        // Reload page to show new review
        window.location.reload();
    } catch (error) {
        console.error('❌ Error submitting review:', error);
        alert('Failed to submit review. Please try again.');
    }
}

// Test if functions are accessible
console.log('✅ Global functions loaded:', {
    toggleReplyForm: typeof toggleReplyForm,
    submitReply: typeof submitReply,
    openReviewModal: typeof openReviewModal,
    closeReviewModal: typeof closeReviewModal,
    submitReview: typeof submitReview
});

// ==================== GLOBAL HOTEL MODAL FUNCTIONS ====================
async function showSidebarHotelDetailModal(hotelId) {
    try {
        console.log('🏨 Loading sidebar hotel details for:', hotelId);
        
        // Try to fetch hotel details from API
        let hotel = null;
        try {
            const response = await fetch(`http://localhost:3000/api/hotels/${hotelId}`);
            if (response.ok) {
                hotel = await response.json();
                console.log('✅ Sidebar hotel loaded from API:', hotel.name);
            }
        } catch (fetchError) {
            console.warn('❌ API fetch failed:', fetchError.message);
        }
        
        // Fallback to sample data if API fails
        if (!hotel) {
            console.log('💡 Using sample hotel data');
            hotel = {
                name: 'Sample Hotel',
                details: {
                    rating: 4.5,
                    images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'],
                    description: 'Luxury hotel with excellent service.',
                    amenities: ['wifi', 'pool', 'spa', 'restaurant'],
                    priceRange: { min: 2000000, max: 5000000 },
                    roomTypes: [
                        { type: 'Deluxe Room', capacity: 2, size: 35, price: 2500000, amenities: ['king_bed', 'city_view'] }
                    ]
                },
                location: { city: 'Prime Location', address: 'City Center' },
                reviewsSummary: { totalReviews: 120, averageRating: 4.5 }
            };
        }
        
        // Prepare hotel images
        const hotelImages = hotel.details?.images || [];
        const galleryImages = hotelImages.length > 0 ? hotelImages : [
            'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
            'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
            'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800'
        ];
        
        const priceRange = hotel.details?.priceRange;
        // Convert VND to USD
        const minUSD = priceRange && priceRange.min ? Math.round(priceRange.min / 25000) : 0;
        const maxUSD = priceRange && priceRange.max ? Math.round(priceRange.max / 25000) : 0;
        const priceText = (minUSD > 0 && maxUSD > 0) ? `$${minUSD} - $${maxUSD}` : 'Contact for price';
        
        const modal = document.createElement('div');
        modal.className = 'sidebar-hotel-detail-modal-overlay';
        modal.innerHTML = `
            <div class="sidebar-hotel-detail-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-hotel"></i> ${hotel.name}</h3>
                    <button class="modal-close" onclick="closeSidebarHotelDetailModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="hotel-detail-content">
                        <div class="hotel-images">
                            <div class="main-image-container">
                                <img src="${galleryImages[0]}" alt="${hotel.name}" class="main-hotel-image" id="sidebarMainHotelImage">
                                <div class="image-nav-buttons">
                                    <button class="nav-btn prev-btn" onclick="navigateSidebarHotelImage(-1)">
                                        <i class="fas fa-chevron-left"></i>
                                    </button>
                                    <button class="nav-btn next-btn" onclick="navigateSidebarHotelImage(1)">
                                        <i class="fas fa-chevron-right"></i>
                                    </button>
                                </div>
                                <div class="image-counter">
                                    <span id="sidebarCurrentImageIndex">1</span> / <span id="sidebarTotalImages">${galleryImages.length}</span>
                                </div>
                            </div>
                            <div class="image-thumbnails">
                                ${galleryImages.map((img, index) => 
                                    `<img src="${img}" alt="Hotel ${index + 1}" class="thumb-image ${index === 0 ? 'active' : ''}" 
                                        onclick="changeSidebarHotelImage(${index})" data-index="${index}">`
                                ).join('')}
                            </div>
                        </div>
                        
                        <div class="hotel-info-detailed">
                            <div class="hotel-rating-detailed">
                                ${generateStarsHTML(hotel.details?.rating || 4.5)}
                                <span class="rating-score">${hotel.details?.rating || 4.5}</span>
                                <span class="review-count">(${hotel.reviewsSummary?.totalReviews || 120} reviews)</span>
                            </div>
                            
                            <div class="hotel-location-detailed">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>${hotel.location?.address || hotel.location?.city || 'Prime Location'}</span>
                            </div>
                            
                            <div class="hotel-price-range">
                                <i class="fas fa-tag"></i>
                                <span>Price per night: <strong>${priceText}</strong></span>
                            </div>
                            
                            <div class="hotel-description">
                                <h4>Description</h4>
                                <p>${hotel.details?.description || 'Luxury hotel with excellent service and convenient location.'}</p>
                            </div>
                            
                            <div class="hotel-amenities-detailed">
                                <h4>Amenities</h4>
                                <div class="amenities-grid">
                                    ${(hotel.details?.amenities || ['wifi', 'pool', 'spa', 'restaurant']).map(amenity => 
                                        `<div class="amenity-item">
                                            <i class="fas fa-check"></i>
                                            <span>${getAmenityName(amenity)}</span>
                                        </div>`
                                    ).join('')}
                                </div>
                            </div>
                            
                            <div class="room-types">
                                <h4>Room Types</h4>
                                <div class="room-types-list">
                                    ${(hotel.details?.roomTypes || hotel.rooms || [
                                        { type: 'Deluxe Room', capacity: 2, size: 35, amenities: ['king_bed', 'city_view'] }
                                    ]).map(room => 
                                        `<div class="room-type-item">
                                            <div class="room-info">
                                                <h5>${room.type}</h5>
                                                <p><i class="fas fa-users"></i> ${room.capacity} guests</p>
                                                <p><i class="fas fa-expand"></i> ${room.size || 30}m²</p>
                                            </div>
                                            <div class="room-amenities">
                                                ${(room.amenities || ['wifi', 'tv', 'ac']).slice(0, 3).map(amenity => 
                                                    `<span class="room-amenity">${getAmenityName(amenity)}</span>`
                                                ).join('')}
                                            </div>
                                        </div>`
                                    ).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="closeSidebarHotelDetailModal()">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Store gallery images globally for navigation
        window.currentSidebarHotelGallery = galleryImages;
        window.currentSidebarHotelImageIndex = 0;
        
        // Close on outside click
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeSidebarHotelDetailModal();
            }
        });
        
    } catch (error) {
        console.error('❌ Error loading sidebar hotel details:', error);
        alert('Unable to load hotel information. Please try again.');
    }
}

function closeSidebarHotelDetailModal() {
    const modal = document.querySelector('.sidebar-hotel-detail-modal-overlay');
    if (modal) {
        modal.remove();
    }
}

function changeSidebarHotelImage(index) {
    const mainImage = document.getElementById('sidebarMainHotelImage');
    const currentIndex = document.getElementById('sidebarCurrentImageIndex');
    const thumbnails = document.querySelectorAll('.sidebar-hotel-detail-modal .thumb-image');
    
    if (mainImage && window.currentSidebarHotelGallery) {
        mainImage.src = window.currentSidebarHotelGallery[index];
        currentIndex.textContent = index + 1;
        window.currentSidebarHotelImageIndex = index;
        
        // Update thumbnail active state
        thumbnails.forEach((thumb, i) => {
            thumb.classList.toggle('active', i === index);
        });
    }
}

function navigateSidebarHotelImage(direction) {
    if (!window.currentSidebarHotelGallery) return;
    
    let newIndex = window.currentSidebarHotelImageIndex + direction;
    
    // Loop around
    if (newIndex >= window.currentSidebarHotelGallery.length) {
        newIndex = 0;
    } else if (newIndex < 0) {
        newIndex = window.currentSidebarHotelGallery.length - 1;
    }
    
    changeSidebarHotelImage(newIndex);
}

document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let currentTour = null;
    let currentUser = null;
    let wishlistItems = JSON.parse(localStorage.getItem('wishlist')) || [];
    let compareItems = JSON.parse(localStorage.getItem('compare')) || [];
    let chatbotOpen = false;
    
    // Initialize page
    initializePage();
    
    // ==================== INITIALIZATION ====================
    function initializePage() {
        console.log('🎯 Initializing Detail Page with Orange Theme...');
        
        // Check authentication
        checkAuthentication();
        
        // Load tour data
        loadTourData();
        
        // Setup event listeners
        setupEventListeners();
        
        // Initialize components
        initializeComponents();
        
        // Setup UI enhancements
        setupUIEnhancements();
        
        console.log('✅ Detail Page initialized successfully!');
    }
    
    // ==================== AUTHENTICATION ====================
    function checkAuthentication() {
        // Sử dụng cùng logic với main.js
        const userId = localStorage.getItem('userId');
        const username = localStorage.getItem('username');
        const userEmail = localStorage.getItem('userEmail');
        const userFullName = localStorage.getItem('userFullName');
        
        console.log('🔍 Detail page auth check:', { userId, username, userEmail, userFullName });
        
        if (userId && username) {
            // Tạo currentUser object từ localStorage
            currentUser = {
                _id: userId,
                id: userId,
                username: username,
                email: userEmail,
                fullName: userFullName
            };
            
            console.log('✅ User authenticated in detail page:', currentUser);
            showUserInterface();
        } else {
            console.log('❌ User not authenticated in detail page');
            currentUser = null;
            showGuestInterface();
        }
    }

    function showUserInterface() {
        const authLi = document.getElementById('auth-li');
        const greetingLi = document.querySelector('.greeting-li');
        const usernameSpan = document.getElementById('username');
        
        console.log('👤 Showing user interface for:', currentUser?.fullName || currentUser?.username);
        
        if (authLi) {
            authLi.style.display = 'none';
            authLi.style.visibility = 'hidden';
        }
        
        if (greetingLi) {
            greetingLi.style.display = 'inline-block';
            greetingLi.style.visibility = 'visible';
            
            if (usernameSpan) {
                usernameSpan.textContent = currentUser?.fullName || currentUser?.username || 'User';
            }
        }
    }

    function showGuestInterface() {
        const authLi = document.getElementById('auth-li');
        const greetingLi = document.querySelector('.greeting-li');
        
        console.log('🚪 Showing guest interface');
        
        if (authLi) {
            authLi.style.display = 'inline-block';
            authLi.style.visibility = 'visible';
        }
        
        if (greetingLi) {
            greetingLi.style.display = 'none';
            greetingLi.style.visibility = 'hidden';
        }
    }
    
    // ==================== TOUR DATA LOADING ====================
    async function loadTourData() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const tourId = urlParams.get('id');
            
            if (!tourId) {
                showAlert('Tour ID not found!', 'error');
                return;
            }
            
            showLoadingState();
            
            // Fetch tour data from API
            const response = await fetch(`http://localhost:3000/api/tours/${tourId}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch tour data');
            }
            
            currentTour = await response.json();
            
            // ✅ Update global variable for functions outside DOMContentLoaded scope
            globalCurrentTour = currentTour;
            
            // Populate tour information
            populateTourData(currentTour);
            
            // Load related data
            await Promise.all([
                loadRelatedTours(),
                loadHotels(),
                loadReviews(),
                loadGallery()
            ]);
            
            hideLoadingState();
            checkWishlistStatus();
            
            // Check if redirected from My Bookings to write review
            checkAutoOpenReviewModal();
            
        } catch (error) {
            console.error('Error loading tour data:', error);
            showAlert('Unable to load tour information', 'error');
        }
    }
    
    // Auto-open review modal if redirected from My Bookings
    function checkAutoOpenReviewModal() {
        const urlParams = new URLSearchParams(window.location.search);
        const writeReview = urlParams.get('writeReview');
        
        if (writeReview === 'true') {
            console.log('🎯 Auto-opening review modal from My Bookings');
            setTimeout(() => {
                openReviewModal();
                
                // Scroll to reviews section
                const reviewsSection = document.getElementById('reviews');
                if (reviewsSection) {
                    reviewsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 500);
        }
    }
    
    function populateTourData(tour) {
        try {
            // Update page title
            document.title = `${tour.name} - CMP Travel`;
            
            // Update breadcrumb
            const breadcrumbItem = document.getElementById('current-tour-name');
            if (breadcrumbItem) breadcrumbItem.textContent = tour.name;
            
            // Update tour header
            updateTourHeader(tour);
            
            // Update tour description
            updateTourDescription(tour);
            
            // Update tour details
            updateTourDetails(tour);
            
            // Update pricing
            updatePricing(tour);
            
            // Update image
            updateTourImage(tour);
            
            // Update status banner
            updateStatusBanner(tour);
            
            // Update itinerary
            updateItinerary(tour);
            
            // Update inclusions/exclusions
            updateInclusions(tour);
            
            console.log('✅ Tour data populated successfully');
            
        } catch (error) {
            console.error('Error populating tour data:', error);
            showAlert('Error displaying tour information', 'error');
        }
    }
    
    function updateTourHeader(tour) {
        // Tour title
        const titleElement = document.querySelector('.tour-title');
        if (titleElement) titleElement.textContent = tour.name;
        
        // Location
        const locationElement = document.querySelector('.location-text');
        if (locationElement) locationElement.textContent = `${tour.name}, ${tour.country}`;
        
        // Rating
        updateRating(tour.rating || 4.5);
        
        // Review count
        const reviewCount = document.querySelector('.review-count');
        if (reviewCount) reviewCount.textContent = `(${tour.analytics?.viewCount || 324} reviews)`;
        
        // Tour badges
        updateTourBadges(tour);
    }
    
    function updateTourBadges(tour) {
        const badgesContainer = document.querySelector('.tour-badges');
        if (!badgesContainer) return;
        
        badgesContainer.innerHTML = '';
        
        // Luxury badge
        if (tour.estimatedCost > 5000) {
            badgesContainer.innerHTML += '<span class="badge badge-luxury">Luxury</span>';
        }
        
        // Verified badge
        if (tour.status === 'active') {
            badgesContainer.innerHTML += '<span class="badge badge-verified">Verified</span>';
        }
        
        // Best seller badge
        if (tour.featured) {
            badgesContainer.innerHTML += '<span class="badge badge-bestseller">Best Seller</span>';
        }
        
        // Hot deal badge
        if (tour.analytics?.popularityScore > 0.8) {
            badgesContainer.innerHTML += '<span class="badge badge-hot">Hot Deal</span>';
        }
    }
    
    function updateRating(rating) {
        const ratingNumber = document.querySelector('.rating-number');
        const starsContainer = document.querySelector('.rating-section .stars');
        
        if (ratingNumber) ratingNumber.textContent = rating.toFixed(1);
        
        if (starsContainer) {
            const fullStars = Math.floor(rating);
            const hasHalfStar = rating % 1 >= 0.5;
            
            starsContainer.innerHTML = '';
            
            // Full stars
            for (let i = 0; i < fullStars; i++) {
                starsContainer.innerHTML += '<i class="fas fa-star"></i>';
            }
            
            // Half star
            if (hasHalfStar) {
                starsContainer.innerHTML += '<i class="fas fa-star-half-alt"></i>';
            }
            
            // Empty stars
            const remainingStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
            for (let i = 0; i < remainingStars; i++) {
                starsContainer.innerHTML += '<i class="far fa-star"></i>';
            }
        }
    }
    
    function updateTourDescription(tour) {
        const descriptionElement = document.querySelector('.description-text');
        if (descriptionElement) {
            descriptionElement.textContent = tour.description;
        }
        
        // Update highlights
        const highlightsList = document.getElementById('highlightsList');
        if (highlightsList && tour.attractions) {
            highlightsList.innerHTML = '';
            tour.attractions.slice(0, 5).forEach(attraction => {
                highlightsList.innerHTML += `<li>${attraction}</li>`;
            });
        }
    }
    
    function updateTourDetails(tour) {
        const detailsGrid = document.querySelector('.tour-details-grid');
        if (!detailsGrid) return;
        
        detailsGrid.innerHTML = `
            <div class="detail-card">
                <div class="detail-icon">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="detail-content">
                    <h4>Duration</h4>
                    <p>${tour.duration || '7 Days 6 Nights'}</p>
                </div>
            </div>
            <div class="detail-card">
                <div class="detail-icon">
                    <i class="fas fa-users"></i>
                </div>
                <div class="detail-content">
                    <h4>Group Size</h4>
                    <p>Max ${tour.maxGroupSize || 20} People</p>
                </div>
            </div>
            <div class="detail-card">
                <div class="detail-icon">
                    <i class="fas fa-language"></i>
                </div>
                <div class="detail-content">
                    <h4>Languages</h4>
                    <p>English, Vietnamese</p>
                </div>
            </div>
            <div class="detail-card">
                <div class="detail-icon">
                    <i class="fas fa-calendar-check"></i>
                </div>
                <div class="detail-content">
                    <h4>Age Range</h4>
                    <p>${tour.minAge || 12}-99 years</p>
                </div>
            </div>
        `;
    }
    
    function updatePricing(tour) {
        // Main price
        const amountElement = document.querySelector('.price-section .amount');
        if (amountElement) {
            amountElement.textContent = tour.estimatedCost.toLocaleString();
        }
        
        // Booking card price
        const bookingPriceElement = document.querySelector('.booking-price .price-amount');
        if (bookingPriceElement) {
            bookingPriceElement.textContent = tour.estimatedCost.toLocaleString();
        }
        
        // Original price (with discount)
        const originalPriceElement = document.querySelector('.original-price');
        if (originalPriceElement && tour.pricing) {
            const originalPrice = Math.round(tour.estimatedCost * 1.15);
            originalPriceElement.textContent = `$${originalPrice.toLocaleString()}`;
        }
        
        // Update price breakdown
        updatePriceBreakdown(tour);
    }
    
    function updatePriceBreakdown(tour) {
        const adultPrice = tour.pricing?.adult || tour.estimatedCost;
        const childPrice = tour.pricing?.child || Math.round(adultPrice * 0.7);
        
        // Update price calculations when quantities change
        calculateTotalPrice();
    }
    
    function updateTourImage(tour) {
        const mainImage = document.getElementById('mainTourImage');
        if (mainImage && tour.img) {
            mainImage.src = tour.img;
            mainImage.alt = tour.name;
        }
    }
    
    function updateStatusBanner(tour) {
        const banner = document.getElementById('tourStatusBanner');
        if (!banner) return;
        
        banner.innerHTML = '';
        
        if (tour.featured) {
            banner.innerHTML += `
                <div class="status-item">
                    <i class="fas fa-fire"></i>
                    <span>Hot Deal</span>
                </div>
            `;
        }
        
        if (tour.rating >= 4.5) {
            banner.innerHTML += `
                <div class="status-item">
                    <i class="fas fa-star"></i>
                    <span>Highly Rated</span>
                </div>
            `;
        }
        
        if (tour.analytics?.popularityScore > 0.7) {
            banner.innerHTML += `
                <div class="status-item">
                    <i class="fas fa-clock"></i>
                    <span>Limited Time</span>
                </div>
            `;
        }
    }
    
    function updateItinerary(tour) {
        // Create sample itinerary if not provided
        const itineraryTabs = document.getElementById('itineraryTabs');
        const tabContent = document.querySelector('.tab-content');
        
        if (!itineraryTabs || !tabContent) return;
        
        const sampleItinerary = tour.itinerary || [
            {
                day: 1,
                title: 'Arrival & City Tour',
                description: 'Welcome to your adventure! Today we\'ll explore the city center and iconic landmarks.',
                activities: ['Airport pickup', 'Hotel check-in', 'City sightseeing', 'Welcome dinner']
            },
            {
                day: 2,
                title: 'Cultural Exploration',
                description: 'Immerse yourself in local culture and visit historical sites.',
                activities: ['Museum visit', 'Local market tour', 'Traditional lunch', 'Cultural show']
            },
            {
                day: 3,
                title: 'Adventure & Nature',
                description: 'Experience the natural beauty and outdoor activities.',
                activities: ['Nature hike', 'Scenic viewpoints', 'Adventure sports', 'Picnic lunch']
            }
        ];
        
        // Build itinerary tabs
        let tabsHTML = '';
        let contentHTML = '';
        
        sampleItinerary.forEach((day, index) => {
            const isActive = index === 0 ? 'active' : '';
            
            tabsHTML += `
                <li class="nav-item">
                    <a class="nav-link ${isActive}" data-toggle="tab" href="#day${day.day}">Day ${day.day}</a>
                </li>
            `;
            
            const activitiesHTML = day.activities.map(activity => {
                const iconMap = {
                    'Airport pickup': 'fas fa-plane',
                    'Hotel check-in': 'fas fa-hotel',
                    'City sightseeing': 'fas fa-camera',
                    'Museum visit': 'fas fa-landmark',
                    'Local market tour': 'fas fa-shopping-bag',
                    'Traditional lunch': 'fas fa-utensils',
                    'Cultural show': 'fas fa-theater-masks',
                    'Nature hike': 'fas fa-hiking',
                    'Scenic viewpoints': 'fas fa-mountain',
                    'Adventure sports': 'fas fa-bicycle',
                    'Picnic lunch': 'fas fa-leaf'
                };
                
                const icon = iconMap[activity] || 'fas fa-check';
                
                return `
                    <div class="activity-item">
                        <i class="${icon}"></i>
                        <span>${activity}</span>
                    </div>
                `;
            }).join('');
            
            contentHTML += `
                <div class="tab-pane ${isActive}" id="day${day.day}">
                    <div class="day-content">
                        <h4>${day.title}</h4>
                        <p>${day.description}</p>
                        <div class="day-activities">
                            ${activitiesHTML}
                        </div>
                    </div>
                </div>
            `;
        });
        
        itineraryTabs.innerHTML = tabsHTML;
        tabContent.innerHTML = contentHTML;
    }
    
    function updateInclusions(tour) {
        const inclusionsList = document.querySelector('.inclusion-list');
        const exclusionsList = document.querySelector('.exclusion-list');
        
        if (inclusionsList && tour.inclusions) {
            inclusionsList.innerHTML = '';
            tour.inclusions.forEach(item => {
                inclusionsList.innerHTML += `
                    <li><i class="fas fa-check"></i> ${item}</li>
                `;
            });
        }
        
        if (exclusionsList && tour.exclusions) {
            exclusionsList.innerHTML = '';
            tour.exclusions.forEach(item => {
                exclusionsList.innerHTML += `
                    <li><i class="fas fa-times"></i> ${item}</li>
                `;
            });
        }
    }
    
    // ==================== RELATED DATA LOADING ====================
    async function loadRelatedTours() {
        try {
            const response = await fetch('http://localhost:3000/api/tours?limit=4');
            const tours = await response.json();
            
            displayRelatedTours(tours.filter(t => t._id !== currentTour._id).slice(0, 3));
        } catch (error) {
            console.error('Error loading related tours:', error);
        }
    }
    
    function displayRelatedTours(tours) {
        const relatedGrid = document.getElementById('relatedToursGrid');
        if (!relatedGrid) return;
        
        relatedGrid.innerHTML = '';
        
        tours.forEach(tour => {
            relatedGrid.innerHTML += `
                <div class="related-tour-card" onclick="navigateToTour('${tour._id}')">
                    <img src="${tour.img}" alt="${tour.name}" class="related-tour-image">
                    <div class="related-tour-content">
                        <h5 class="related-tour-title">${tour.name}</h5>
                        <div class="related-tour-location">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${tour.country}</span>
                        </div>
                        <div class="related-tour-price">$${tour.estimatedCost.toLocaleString()}</div>
                    </div>
                </div>
            `;
        });
    }
    
    // ✅ LOAD HOTELS BY DESTINATION FOR SIDEBAR
    async function loadHotels() {
        try {
            const destination = currentTour?.country || 'general';
            console.log(`🏨 Loading sidebar hotels for destination: ${destination}`);
            
            // Try destination-specific API first
            let response = await fetch(`http://localhost:3000/api/hotels/destination/${encodeURIComponent(destination)}`);
            let hotels = [];
            
            if (response.ok) {
                hotels = await response.json();
                console.log(`✅ Found ${hotels.length} hotels for sidebar in ${destination}`);
            }
            
            // Fallback to general hotels if no destination-specific hotels
            if (!hotels || hotels.length === 0) {
                console.log(`❌ No hotels found for ${destination}, using general hotels for sidebar`);
                const fallbackResponse = await fetch('http://localhost:3000/api/hotels?limit=3');
                if (fallbackResponse.ok) {
                    hotels = await fallbackResponse.json();
                }
            }
            
            // Display hotels or show sample data
            if (hotels && hotels.length > 0) {
                displayHotels(hotels.slice(0, 3));
            } else {
                console.log('💡 Using sample hotel data for sidebar');
                displaySampleHotels();
            }
            
        } catch (error) {
            console.error('Error loading hotels for sidebar:', error);
            // Show sample hotels if API fails
            displaySampleHotels();
        }
    }

    // ✅ UPDATE DISPLAY HOTELS FOR SIDEBAR - CHANGE CLICK HANDLER
    function displayHotels(hotels) {
        const hotelsList = document.getElementById('hotelsList');
        if (!hotelsList) return;
        
        hotelsList.innerHTML = '';
        
        hotels.forEach(hotel => {
            const rating = hotel.details?.rating || 4.5;
            const starsHTML = generateStarsHTML(rating);
            
            hotelsList.innerHTML += `
                <div class="hotel-item" onclick="showSidebarHotelDetailModal('${hotel._id || hotel.id}')">
                    <img src="${hotel.details?.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=100'}" 
                        alt="${hotel.name}" class="hotel-image">
                    <div class="hotel-details">
                        <h6>${hotel.name}</h6>
                        <div class="hotel-rating">
                            <div class="stars">${starsHTML}</div>
                            <span>${rating}</span>
                        </div>
                        <div class="hotel-location">
                            <i class="fas fa-map-marker-alt"></i>
                            ${hotel.location?.city || hotel.location?.address || 'Prime Location'}
                        </div>
                        <div class="hotel-amenities-preview">
                            ${(hotel.details?.amenities || ['wifi', 'restaurant']).slice(0, 3).map(amenity => 
                                `<span class="amenity-preview">${getAmenityName(amenity)}</span>`
                            ).join(' • ')}
                        </div>
                    </div>
                </div>
            `;
        });
    }

    // ✅ UPDATE SAMPLE HOTELS TO MATCH DESTINATION - CHANGE CLICK HANDLER
    function displaySampleHotels() {
        const destination = currentTour?.country || 'general';
        const sampleHotels = getSampleHotelsByDestination(destination);
        
        const hotelsList = document.getElementById('hotelsList');
        if (!hotelsList) return;
        
        hotelsList.innerHTML = '';
        
        sampleHotels.forEach(hotel => {
            const starsHTML = generateStarsHTML(hotel.rating);
            
            hotelsList.innerHTML += `
                <div class="hotel-item" onclick="showSidebarHotelDetailModal('${hotel.id}')">
                    <img src="${hotel.image}" alt="${hotel.name}" class="hotel-image">
                    <div class="hotel-details">
                        <h6>${hotel.name}</h6>
                        <div class="hotel-rating">
                            <div class="stars">${starsHTML}</div>
                            <span>${hotel.rating}</span>
                        </div>
                        <div class="hotel-location">
                            <i class="fas fa-map-marker-alt"></i>
                            ${hotel.location}
                        </div>
                        <div class="hotel-amenities-preview">
                            ${hotel.amenities.slice(0, 3).map(amenity => getAmenityName(amenity)).join(' • ')}
                        </div>
                    </div>
                </div>
            `;
        });
    }

    // ✅ GET SAMPLE HOTELS BY DESTINATION FOR SIDEBAR
    function getSampleHotelsByDestination(destination) {
        const hotelsByDestination = {
            'Maldives': [
                {
                    id: 'sample-maldives-1',
                    name: 'Maldives Paradise Resort',
                    rating: 4.9,
                    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=100',
                    location: 'Malé Atoll',
                    amenities: ['wifi', 'spa', 'water_sports']
                },
                {
                    id: 'sample-maldives-2',
                    name: 'Overwater Bungalow Resort',
                    rating: 4.8,
                    image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=100',
                    location: 'Baa Atoll',
                    amenities: ['wifi', 'overwater', 'snorkeling']
                },
                {
                    id: 'sample-maldives-3',
                    name: 'Sunset Island Villa',
                    rating: 4.7,
                    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=100',
                    location: 'Ari Atoll',
                    amenities: ['wifi', 'private_beach', 'sunset_view']
                }
            ],
            'Japan': [
                {
                    id: 'sample-japan-1',
                    name: 'Tokyo Imperial Hotel',
                    rating: 4.8,
                    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=100',
                    location: 'Tokyo',
                    amenities: ['wifi', 'spa', 'restaurant']
                },
                {
                    id: 'sample-japan-2',
                    name: 'Osaka Castle View',
                    rating: 4.6,
                    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=100',
                    location: 'Osaka',
                    amenities: ['wifi', 'city_view', 'bar']
                },
                {
                    id: 'sample-japan-3',
                    name: 'Kyoto Traditional Ryokan',
                    rating: 4.9,
                    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=100',
                    location: 'Kyoto',
                    amenities: ['wifi', 'spa', 'traditional']
                }
            ],
            'France': [
                {
                    id: 'sample-france-1',
                    name: 'Paris Romance Hotel',
                    rating: 4.6,
                    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=100',
                    location: 'Paris',
                    amenities: ['wifi', 'restaurant', 'romantic']
                },
                {
                    id: 'sample-france-2',
                    name: 'Champs-Élysées Palace',
                    rating: 4.8,
                    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=100',
                    location: 'Paris',
                    amenities: ['wifi', 'luxury', 'spa']
                },
                {
                    id: 'sample-france-3',
                    name: 'Montmartre Artist Hotel',
                    rating: 4.4,
                    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=100',
                    location: 'Paris',
                    amenities: ['wifi', 'art', 'boutique']
                }
            ]
        };
        
        return hotelsByDestination[destination] || [
            {
                id: 'general-1',
                name: 'Grand Plaza Hotel',
                rating: 4.8,
                image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=100',
                location: 'City Center',
                amenities: ['wifi', 'pool', 'spa']
            },
            {
                id: 'general-2',
                name: 'Luxury Resort',
                rating: 4.6,
                image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=100',
                location: 'Resort Area',
                amenities: ['wifi', 'spa', 'luxury']
            },
            {
                id: 'general-3',
                name: 'Boutique City Hotel',
                rating: 4.7,
                image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=100',
                location: 'Historic District',
                amenities: ['wifi', 'boutique', 'bar']
            }
        ];
    }
    
    // ✅ CHECK IF USER CAN WRITE REVIEW
    async function checkReviewEligibility() {
        try {
            // Get user from localStorage - using separate keys (userId, username, etc.)
            const userId = localStorage.getItem('userId');
            const username = localStorage.getItem('username');
            
            console.log('👤 User from localStorage:', { userId, username });
            
            if (!userId) {
                console.log('❌ User not logged in');
                return { canReview: false, reason: 'not_logged_in' };
            }
            
            const tourId = currentTour._id || currentTour.id;
            console.log('🎯 Tour ID:', tourId);
            
            if (!tourId) {
                console.log('❌ No tour ID');
                return { canReview: false, reason: 'no_tour_id' };
            }
            
            console.log('🔍 Checking review eligibility for user:', userId, 'tour:', tourId);
            
            const response = await fetch(`http://localhost:3000/api/comments/can-review/${tourId}`, {
                headers: {
                    'user-id': userId
                }
            });
            
            console.log('📡 API Response status:', response.status);
            
            if (!response.ok) {
                console.log('❌ API error:', response.status);
                return { canReview: false, reason: 'api_error' };
            }
            
            const data = await response.json();
            console.log('✅ Review eligibility:', data);
            return data;
        } catch (error) {
            console.error('❌ Error checking review eligibility:', error);
            return { canReview: false, reason: 'error' };
        }
    }
    
    // ✅ SHOW WRITE REVIEW BUTTON IF ELIGIBLE
    async function showWriteReviewButton() {
        const eligibility = await checkReviewEligibility();
        
        if (eligibility.canReview) {
            const reviewsSection = document.querySelector('.reviews-section');
            if (!reviewsSection) return;
            
            // Check if button already exists
            if (document.getElementById('writeReviewBtn')) return;
            
            const writeReviewHTML = `
                <div class="write-review-banner" id="writeReviewBtn">
                    <div class="banner-content">
                        <i class="fas fa-star"></i>
                        <div>
                            <h4>Share Your Experience</h4>
                            <p>You've completed this tour! Help others by writing a review.</p>
                        </div>
                    </div>
                    <button class="btn btn-primary" onclick="openReviewModal()">
                        <i class="fas fa-pencil-alt"></i> Write Review
                    </button>
                </div>
            `;
            
            // Insert before reviews header
            const reviewsHeader = reviewsSection.querySelector('.reviews-header');
            if (reviewsHeader) {
                reviewsHeader.insertAdjacentHTML('beforebegin', writeReviewHTML);
            }
        }
    }
    
    async function loadReviews() {
        try {
            // Use tour id or _id (MongoDB ObjectId)
            const tourIdParam = currentTour._id || currentTour.id;
            console.log('🎯 Loading reviews for tour:', tourIdParam);
            console.log('📦 Current tour object:', currentTour);
            
            if (!tourIdParam) {
                console.warn('⚠️ Tour ID not found, using sample reviews');
                displaySampleReviews();
                return;
            }
            
            const apiUrl = `http://localhost:3000/api/comments?tourId=${tourIdParam}`;
            console.log('🌐 Calling API:', apiUrl);
            
            const response = await fetch(apiUrl);
            console.log('📡 Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`API responded with ${response.status}`);
            }
            
            const reviews = await response.json();
            console.log('✅ Reviews received:', reviews);
            
            // Verify reviews is array
            if (!Array.isArray(reviews)) {
                console.error('❌ Reviews is not an array:', reviews);
                displaySampleReviews();
                return;
            }
            
            displayReviews(reviews);
            
            // Check if user can write review
            await showWriteReviewButton();
        } catch (error) {
            console.error('❌ Error loading reviews:', error);
            displaySampleReviews();
        }
    }
    
    function displayReviews(reviews) {
        const reviewsList = document.getElementById('reviewsList');
        if (!reviewsList) return;
        
        console.log('📝 Displaying reviews:', reviews.length);
        
        if (reviews.length === 0) {
            displaySampleReviews();
            return;
        }
        
        reviewsList.innerHTML = '';
        
        reviews.forEach(review => {
            console.log('Review:', review._id, 'Replies:', review.replies?.length || 0);
            const starsHTML = generateStarsHTML(review.content?.rating || 5);
            const date = new Date(review.createdAt).toLocaleDateString();
            
            // Get user avatar or use default
            const userAvatar = review.userId?.avatar || 
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(review.userId?.fullName || 'Anonymous')}&background=ff6600&color=fff&size=50`;
            
            reviewsList.innerHTML += `
                <div class="review-item">
                    <div class="review-header">
                        <div class="reviewer-info">
                            <img src="${userAvatar}" 
                                 alt="${review.userId?.fullName || 'Anonymous'}" 
                                 class="reviewer-avatar"
                                 onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(review.userId?.fullName || 'Anonymous')}&background=ff6600&color=fff&size=50'">
                            <div class="reviewer-details">
                                <h6>${review.userId?.fullName || 'Anonymous'}</h6>
                                <div class="review-date">${date}</div>
                            </div>
                        </div>
                        <div class="review-rating">
                            <div class="stars">${starsHTML}</div>
                        </div>
                    </div>
                    <div class="review-content">
                        ${review.content?.text || 'Great tour experience!'}
                    </div>
                    ${review.content?.images ? generateReviewPhotosHTML(review.content.images) : ''}
                    <div class="review-actions">
                        <button class="review-action" onclick="likeReview('${review._id}')">
                            <i class="fas fa-thumbs-up"></i> Helpful (${review.helpfulCount || 0})
                        </button>
                        <button class="review-action" onclick="toggleReplyForm('${review._id}')">
                            <i class="fas fa-reply"></i> Reply (${review.replyCount || 0})
                        </button>
                        <button class="review-action" onclick="reportReview('${review._id}')">
                            <i class="fas fa-flag"></i> Report
                        </button>
                    </div>
                    
                    <!-- Reply Form (hidden by default) -->
                    <div class="reply-form" id="reply-form-${review._id}" style="display: none;">
                        <textarea class="reply-input" id="reply-text-${review._id}" placeholder="Write your reply..."></textarea>
                        <div class="reply-actions">
                            <button class="btn btn-secondary" onclick="toggleReplyForm('${review._id}')">Cancel</button>
                            <button class="btn btn-primary" onclick="submitReply('${review._id}')">
                                <i class="fas fa-paper-plane"></i> Send Reply
                            </button>
                        </div>
                    </div>
                    
                    <!-- Replies List -->
                    ${review.replies && review.replies.length > 0 ? `
                        <div class="replies-list">
                            ${review.replies.map(reply => {
                                const replyAvatar = reply.userId?.avatar || 
                                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.userId?.fullName || 'Anonymous')}&background=4B5563&color=fff&size=40`;
                                return `
                                <div class="reply-item">
                                    <img src="${replyAvatar}" 
                                         alt="${reply.userId?.fullName || 'Anonymous'}" 
                                         class="reply-avatar"
                                         onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(reply.userId?.fullName || 'Anonymous')}&background=4B5563&color=fff&size=40'">
                                    <div class="reply-content">
                                        <div class="reply-header">
                                            <strong>${reply.userId?.fullName || 'Anonymous'}</strong>
                                            ${reply.isAdmin ? '<span class="admin-badge">Staff</span>' : ''}
                                            <span class="reply-date">${new Date(reply.timestamp).toLocaleDateString()}</span>
                                        </div>
                                        <p>${reply.text}</p>
                                    </div>
                                </div>
                            `}).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        });
    }
    
    function displaySampleReviews() {
        const sampleReviews = [
            {
                name: 'Sarah Johnson',
                rating: 5,
                date: 'March 15, 2024',
                content: 'Absolutely amazing tour! The guide was knowledgeable and friendly. Every detail was perfectly organized. Highly recommend!',
                avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=50&h=50&fit=crop&crop=face',
                photos: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=80&h=60&fit=crop']
            },
            {
                name: 'Mike Chen',
                rating: 4,
                date: 'March 10, 2024',
                content: 'Great experience overall. The accommodations were excellent and the itinerary was well-planned. Would do it again!',
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&crop=face'
            },
            {
                name: 'Emily Rodriguez',
                rating: 5,
                date: 'March 5, 2024',
                content: 'Perfect vacation! Every moment was magical. The local cuisine was incredible and the sights were breathtaking.',
                avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&h=50&fit=crop&crop=face'
            }
        ];
        
        const reviewsList = document.getElementById('reviewsList');
        if (!reviewsList) return;
        
        reviewsList.innerHTML = '';
        
        sampleReviews.forEach(review => {
            const starsHTML = generateStarsHTML(review.rating);
            const photosHTML = review.photos ? generateReviewPhotosHTML(review.photos) : '';
            
            reviewsList.innerHTML += `
                <div class="review-item">
                    <div class="review-header">
                        <div class="reviewer-info">
                            <img src="${review.avatar}" alt="${review.name}" class="reviewer-avatar">
                            <div class="reviewer-details">
                                <h6>${review.name}</h6>
                                <div class="review-date">${review.date}</div>
                            </div>
                        </div>
                        <div class="review-rating">
                            <div class="stars">${starsHTML}</div>
                        </div>
                    </div>
                    <div class="review-content">${review.content}</div>
                    ${photosHTML}
                    <div class="review-actions">
                        <button class="review-action" onclick="likeReview('sample')">
                            <i class="fas fa-thumbs-up"></i> Helpful (${Math.floor(Math.random() * 10) + 1})
                        </button>
                        <button class="review-action" onclick="reportReview('sample')">
                            <i class="fas fa-flag"></i> Report
                        </button>
                    </div>
                </div>
            `;
        });
    }
    
    // Thay thế function loadGallery:

    // ✅ LOAD GALLERY FROM DATABASE
    async function loadGallery() {
        const galleryGrid = document.getElementById('galleryGrid');
        if (!galleryGrid) return;
        
        try {
            console.log('🖼️ Loading gallery for tour:', currentTour._id || currentTour.id);
            
            let galleryImages = [];
            
            // Try to load from database first
            if (currentTour._id || currentTour.id) {
                try {
                    const response = await fetch(`/api/tours/${currentTour._id || currentTour.id}/gallery/all`);
                    if (response.ok) {
                        const galleryData = await response.json();
                        galleryImages = galleryData.images.map(img => img.url);
                        console.log(`✅ Loaded ${galleryImages.length} images from database`);
                    }
                } catch (fetchError) {
                    console.log('⚠️ Database fetch failed, using fallback');
                }
            }
            
            // Fallback to tour object gallery
            if (galleryImages.length === 0 && currentTour.gallery?.images) {
                galleryImages = currentTour.gallery.images;
                console.log(`✅ Using tour object gallery: ${galleryImages.length} images`);
            }
            
            // Fallback to imageCategories
            if (galleryImages.length === 0 && currentTour.imageCategories) {
                galleryImages = [
                    ...(currentTour.imageCategories.main ? [currentTour.imageCategories.main] : []),
                    ...(currentTour.imageCategories.attractions || []),
                    ...(currentTour.imageCategories.accommodation || []),
                    ...(currentTour.imageCategories.activities || []),
                    ...(currentTour.imageCategories.food || []),
                    ...(currentTour.imageCategories.landscape || []),
                    ...(currentTour.imageCategories.culture || [])
                ].filter(Boolean);
                console.log(`✅ Using categorized images: ${galleryImages.length} images`);
            }
            
            // Final fallback to destination-based gallery
            if (galleryImages.length === 0) {
                galleryImages = getGalleryByDestination(currentTour.country || currentTour.destination);
                console.log(`✅ Using destination fallback: ${galleryImages.length} images`);
            }
            
            // Display gallery
            displayGalleryImages(galleryImages);
            
        } catch (error) {
            console.error('❌ Error loading gallery:', error);
            // Ultimate fallback
            const fallbackImages = getGalleryByDestination(currentTour.country || currentTour.destination);
            displayGalleryImages(fallbackImages);
        }
    }

    // ✅ DISPLAY GALLERY IMAGES - FIXED DUPLICATE HEADER ISSUE
    function displayGalleryImages(images) {
        const galleryGrid = document.getElementById('galleryGrid');
        if (!galleryGrid) return;
        
        const gallerySection = galleryGrid.closest('.gallery-section');
        
        // Clear existing content
        galleryGrid.innerHTML = '';
        
        // Remove any existing dynamic headers/controls (keep static h3)
        const existingControls = gallerySection.querySelectorAll('.gallery-header, .gallery-controls');
        existingControls.forEach(control => control.remove());
        
        // Check if there's a static h3 header in HTML
        const staticHeader = gallerySection.querySelector('h3');
        
        // Add loading state
        galleryGrid.classList.add('loading');
        
        // Display images with delay for better UX
        setTimeout(() => {
            galleryGrid.classList.remove('loading');
            
            // Always add controls after static header (if exists) or create full header
            if (staticHeader) {
                // Static header exists, just add controls
                const controlsHTML = `
                    <div class="gallery-controls">
                        <div class="gallery-counter">
                            <i class="fas fa-camera"></i> ${images.length} Photos
                        </div>
                        <div class="gallery-filters">
                            <button class="filter-btn active" data-category="all">
                                <i class="fas fa-th"></i> All
                            </button>
                            <button class="filter-btn" data-category="attractions">
                                <i class="fas fa-map-marked-alt"></i> Attractions
                            </button>
                            <button class="filter-btn" data-category="accommodation">
                                <i class="fas fa-bed"></i> Hotels
                            </button>
                            <button class="filter-btn" data-category="activities">
                                <i class="fas fa-hiking"></i> Activities
                            </button>
                            <button class="filter-btn" data-category="food">
                                <i class="fas fa-utensils"></i> Food
                            </button>
                            <button class="filter-btn" data-category="landscape">
                                <i class="fas fa-mountain"></i> Landscape
                            </button>
                        </div>
                    </div>
                `;
                
                staticHeader.insertAdjacentHTML('afterend', controlsHTML);
            } else {
                // No static header, create full header
                const headerHTML = `
                    <div class="gallery-header">
                        <div class="gallery-title">
                            <h3><i class="fas fa-images"></i> Photo Gallery</h3>
                            <div class="gallery-counter">
                                <i class="fas fa-camera"></i> ${images.length} Photos
                            </div>
                        </div>
                        <div class="gallery-filters">
                            <button class="filter-btn active" data-category="all">
                                <i class="fas fa-th"></i> All
                            </button>
                            <button class="filter-btn" data-category="attractions">
                                <i class="fas fa-map-marked-alt"></i> Attractions
                            </button>
                            <button class="filter-btn" data-category="accommodation">
                                <i class="fas fa-bed"></i> Hotels
                            </button>
                            <button class="filter-btn" data-category="activities">
                                <i class="fas fa-hiking"></i> Activities
                            </button>
                            <button class="filter-btn" data-category="food">
                                <i class="fas fa-utensils"></i> Food
                            </button>
                            <button class="filter-btn" data-category="landscape">
                                <i class="fas fa-mountain"></i> Landscape
                            </button>
                        </div>
                    </div>
                `;
                
                gallerySection.insertAdjacentHTML('afterbegin', headerHTML);
            }
            
            images.forEach((item, index) => {
                // Handle both old format (string) and new format (object)
                const imageUrl = typeof item === 'string' ? item : (item.url || item);
                const caption = typeof item === 'object' ? (item.caption || '') : '';
                
                const isWide = index % 5 === 0;
                const isTall = index % 7 === 0;
                
                galleryGrid.innerHTML += `
                    <div class="gallery-item ${isWide ? 'gallery-wide' : ''} ${isTall ? 'gallery-tall' : ''}" 
                        onclick="openLightbox('${imageUrl}', ${index})">
                        <img src="${imageUrl}" alt="${caption || 'Tour Gallery ' + (index + 1)}" class="gallery-img">
                        <div class="gallery-overlay">
                            <i class="fas fa-search-plus"></i>
                            <span class="image-number">${index + 1}</span>
                        </div>
                    </div>
                `;
            });
            
            // Store for lightbox navigation (extract URLs only)
            window.currentGalleryImages = images.map(item => 
                typeof item === 'string' ? item : (item.url || item)
            );
            
            // Add gallery filter listeners
            addGalleryFilterListeners();
            
        }, 300);
    }

    // ✅ GALLERY FILTER FUNCTIONALITY
    function addGalleryFilterListeners() {
        const filterButtons = document.querySelectorAll('.gallery-filters .filter-btn');
        
        filterButtons.forEach(btn => {
            btn.addEventListener('click', async function() {
                const category = this.dataset.category;
                
                // Load category images (this will call updateActiveFilterButton internally)
                await loadGalleryByCategory(category);
            });
        });
    }

    // ✅ CẬP NHẬT LOAD GALLERY BY CATEGORY - CLIENT-SIDE FILTERING
    async function loadGalleryByCategory(category) {
        const galleryGrid = document.getElementById('galleryGrid');
        
        try {
            // Hiển thị loading state
            galleryGrid.innerHTML = '<div class="gallery-loading"><i class="fas fa-spinner fa-spin"></i> Loading images...</div>';
            
            let allImages = [];
            
            // Load all images from API or use cached data
            if (!window.allGalleryImages) {
                // Thử gọi API lần đầu
                if (currentTour && (currentTour._id || currentTour.id)) {
                    try {
                        const urlParams = new URLSearchParams(window.location.search);
                        const tourId = urlParams.get('id') || currentTour.id || currentTour._id;
                        const response = await fetch(`http://localhost:3000/api/tours/${tourId}/gallery`);
                        if (response.ok) {
                            const data = await response.json();
                            allImages = data.gallery || data || [];
                            window.allGalleryImages = allImages; // Cache for filtering
                            console.log(`✅ Đã tải ${allImages.length} ảnh gallery từ API`);
                        } else {
                            throw new Error(`API trả về ${response.status}`);
                        }
                    } catch (apiError) {
                        console.log(`⚠️ API thất bại, sử dụng dữ liệu mẫu:`, apiError.message);
                        allImages = getSampleGalleryByCategory('all');
                        window.allGalleryImages = allImages;
                    }
                } else {
                    // Không có tour ID, dùng sample data
                    allImages = getSampleGalleryByCategory('all');
                    window.allGalleryImages = allImages;
                }
            } else {
                // Use cached images
                allImages = window.allGalleryImages;
            }
            
            // Filter by category
            let filteredImages = allImages;
            if (category !== 'all') {
                filteredImages = allImages.filter(item => {
                    if (typeof item === 'object' && item.category) {
                        return item.category === category;
                    }
                    return false; // If it's just a string, exclude it from category filter
                });
            }
            
            console.log(`📸 Filtered ${filteredImages.length} images for category: ${category}`);
            
            // Hiển thị ảnh
            if (filteredImages && filteredImages.length > 0) {
                displayGalleryImages(filteredImages);
                // Cập nhật nút filter active sau khi display xong
                setTimeout(() => updateActiveFilterButton(category), 350);
            } else {
                // Hiển thị thông báo không có ảnh
                galleryGrid.innerHTML = `
                    <div class="no-images-message">
                        <i class="fas fa-images"></i>
                        <p>Không có ảnh nào cho ${category === 'all' ? 'tour này' : category}</p>
                    </div>
                `;
                // Cập nhật nút filter active
                setTimeout(() => updateActiveFilterButton(category), 350);
            }
            
        } catch (error) {
            console.error('Error loading gallery:', error);
            galleryGrid.innerHTML = `
                <div class="gallery-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Unable to load images. Please try again.</p>
                </div>
            `;
        }
    }

    // ✅ UPDATE ACTIVE FILTER BUTTON
    function updateActiveFilterButton(category) {
        const filterButtons = document.querySelectorAll('.gallery-filters .filter-btn');
        filterButtons.forEach(btn => {
            if (btn.dataset.category === category) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // ✅ FUNCTION MỚI - LẤY SAMPLE GALLERY THEO CATEGORY
    function getSampleGalleryByCategory(category) {
        const destination = currentTour?.country || 'general';
        const baseSample = getSampleGalleryForDestination(destination);
        
        if (category === 'all') {
            return baseSample;
        }
        
        // Lọc theo category
        return baseSample.filter(image => image.category === category);
    }

    // ✅ FUNCTION MỚI - LẤY SAMPLE GALLERY CHO ĐIỂM ĐẾN
    function getSampleGalleryForDestination(destination) {
        const galleries = {
            'Maldives': [
                {
                    id: 'maldives-1',
                    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
                    category: 'landscape',
                    title: 'Vùng nước trong vắt',
                    description: 'Hồ nước nguyên sơ tuyệt đẹp'
                },
                {
                    id: 'maldives-2',
                    url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400',
                    category: 'accommodation',
                    title: 'Bungalow trên nước',
                    description: 'Villa sang trọng trên mặt nước'
                },
                {
                    id: 'maldives-3',
                    url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400',
                    category: 'attractions',
                    title: 'Hoàng hôn tuyệt đẹp',
                    description: 'Cảnh hoàng hôn ngoạn mục'
                },
                {
                    id: 'maldives-4',
                    url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400',
                    category: 'activities',
                    title: 'Lặn ngắm san hô',
                    description: 'Khám phá thế giới dưới nước'
                },
                {
                    id: 'maldives-5',
                    url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400',
                    category: 'food',
                    title: 'Hải sản tươi sống',
                    description: 'Đặc sản địa phương'
                },
                {
                    id: 'maldives-6',
                    url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
                    category: 'landscape',
                    title: 'Thiên đường nhiệt đới',
                    description: 'Hòn đảo thiên đường'
                }
            ],
            'Japan': [
                {
                    id: 'japan-1',
                    url: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=400',
                    category: 'attractions',
                    title: 'Tháp Tokyo',
                    description: 'Biểu tượng nổi tiếng của thành phố'
                },
                {
                    id: 'japan-2',
                    url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
                    category: 'accommodation',
                    title: 'Ryokan truyền thống',
                    description: 'Nhà trọ truyền thống Nhật Bản'
                },
                {
                    id: 'japan-3',
                    url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400',
                    category: 'landscape',
                    title: 'Hoa anh đào',
                    description: 'Mùa sakura mùa xuân'
                },
                {
                    id: 'japan-4',
                    url: 'https://images.unsplash.com/photo-1591464491306-9f52e73781ac?w=400',
                    category: 'food',
                    title: 'Sushi chính thống',
                    description: 'Ẩm thực Nhật Bản tươi ngon'
                },
                {
                    id: 'japan-5',
                    url: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400',
                    category: 'activities',
                    title: 'Thăm chùa',
                    description: 'Trải nghiệm văn hóa'
                },
                {
                    id: 'japan-6',
                    url: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=400',
                    category: 'landscape',
                    title: 'Núi Phú Sĩ',
                    description: 'Ngọn núi thiêng liêng'
                }
            ],
            'France': [
                {
                    id: 'france-1',
                    url: 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=400',
                    category: 'attractions',
                    title: 'Tháp Eiffel',
                    description: 'Biểu tượng Paris nổi tiếng'
                },
                {
                    id: 'france-2',
                    url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400',
                    category: 'accommodation',
                    title: 'Khách sạn sang trọng',
                    description: 'Khách sạn Paris thanh lịch'
                },
                {
                    id: 'france-3',
                    url: 'https://images.unsplash.com/photo-1549396535-c11d5c55b9df?w=400',
                    category: 'food',
                    title: 'Ẩm thực Pháp',
                    description: 'Trải nghiệm ẩm thực cao cấp'
                },
                {
                    id: 'france-4',
                    url: 'https://images.unsplash.com/photo-1524821502015-c3c7d3ba32ec?w=400',
                    category: 'landscape',
                    title: 'Sông Seine',
                    description: 'Cảnh đẹp bên sông'
                },
                {
                    id: 'france-5',
                    url: 'https://images.unsplash.com/photo-1520637836862-4d197d17c916?w=400',
                    category: 'activities',
                    title: 'Tham quan bảo tàng',
                    description: 'Nghệ thuật và văn hóa'
                },
                {
                    id: 'france-6',
                    url: 'https://images.unsplash.com/photo-1471623320832-752e8bbf8413?w=400',
                    category: 'attractions',
                    title: 'Kiến trúc lịch sử',
                    description: 'Tòa nhà đẹp mắt'
                }
            ]
        };
        
        return galleries[destination] || [
            {
                id: 'default-1',
                url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
                category: 'landscape',
                title: 'Cảnh đẹp thiên nhiên',
                description: 'Khung cảnh tự nhiên tuyệt đẹp'
            },
            {
                id: 'default-2',
                url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
                category: 'accommodation',
                title: 'Nơi nghỉ ngơi thoải mái',
                description: 'Chỗ ở chất lượng cao'
            },
            {
                id: 'default-3',
                url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400',
                category: 'attractions',
                title: 'Famous attractions',
                description: 'Must-visit destinations'
            },
            {
                id: 'default-4',
                url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400',
                category: 'activities',
                title: 'Hoạt động thú vị',
                description: 'Trải nghiệm hấp dẫn'
            },
            {
                id: 'default-5',
                url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400',
                category: 'food',
                title: 'Ẩm thực địa phương',
                description: 'Món ăn ngon tuyệt'
            },
            {
                id: 'default-6',
                url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400',
                category: 'landscape',
                title: 'Vẻ đẹp tự nhiên',
                description: 'Phong cảnh ngoạn mục'
            }
        ];
    }

    

    // ✅ CẬP NHẬT DISPLAY GALLERY IMAGES - XÓA VẤN ĐỀ DUPLICATE HEADER
    function displayGalleryImages(images) {
        const galleryGrid = document.getElementById('galleryGrid');
        if (!galleryGrid) return;
        
        const gallerySection = galleryGrid.closest('.gallery-section');
        
        // Xóa nội dung hiện có
        galleryGrid.innerHTML = '';
        
        // Xóa các header/controls động hiện có (giữ h3 static)
        const existingControls = gallerySection.querySelectorAll('.gallery-header, .gallery-controls');
        existingControls.forEach(control => control.remove());
        
        // Kiểm tra có h3 static trong HTML không
        const staticHeader = gallerySection.querySelector('h3');
        
        // Thêm loading state
        galleryGrid.classList.add('loading');
        
        // Hiển thị ảnh với delay để UX tốt hơn
        setTimeout(() => {
            galleryGrid.classList.remove('loading');
            
            if (!images || images.length === 0) {
                galleryGrid.innerHTML = `
                    <div class="no-images">
                        <i class="fas fa-images"></i>
                        <p>Không có ảnh nào</p>
                    </div>
                `;
                return;
            }
            
            galleryGrid.innerHTML = '';
            
            images.forEach((image, index) => {
                const imageUrl = image.url || image.src || image;
                const title = image.title || `Ảnh Gallery ${index + 1}`;
                const description = image.description || '';
                
                const imageElement = document.createElement('div');
                imageElement.className = 'gallery-item';
                imageElement.innerHTML = `
                    <img src="${imageUrl}" alt="${title}" onclick="openLightbox('${imageUrl}', ${index})">
                    <div class="gallery-overlay">
                        <h5>${title}</h5>
                        ${description ? `<p>${description}</p>` : ''}
                    </div>
                `;
                
                galleryGrid.appendChild(imageElement);
            });
            
            // Thêm lại filter listeners
            addGalleryFilterListeners();
            
        }, 300);
    }

    // ✅ CẬP NHẬT LOAD GALLERY TỪ DATABASE - VỚI FALLBACK TỐT HỠN
    async function loadGallery() {
        const galleryGrid = document.getElementById('galleryGrid');
        if (!galleryGrid) return;
        
        try {
            let galleryData = [];
            
            // Thử tải từ API
            if (currentTour && (currentTour._id || currentTour.id)) {
                try {
                    // Use tour id from URL params or tour object
                    const urlParams = new URLSearchParams(window.location.search);
                    const tourId = urlParams.get('id') || currentTour.id || currentTour._id;
                    
                    const response = await fetch(`http://localhost:3000/api/tours/${tourId}/gallery`);
                    if (response.ok) {
                        const data = await response.json();
                        galleryData = data.gallery || data || [];
                        console.log(`✅ Đã tải ${galleryData.length} ảnh gallery từ API`);
                    } else {
                        throw new Error('API không khả dụng');
                    }
                } catch (apiError) {
                    console.log('⚠️ Gallery API thất bại, dùng dữ liệu mẫu:', apiError.message);
                    galleryData = getSampleGalleryByCategory('all');
                }
            } else {
                // Không có dữ liệu tour, dùng sample
                galleryData = getSampleGalleryByCategory('all');
            }
            
            // Hiển thị ảnh
            displayGalleryImages(galleryData);
            
        } catch (error) {
            console.error('Lỗi khi tải gallery:', error);
            // Hiển thị thông báo lỗi nhưng vẫn cung cấp sample data
            displayGalleryImages(getSampleGalleryByCategory('all'));
        }
    }

    // ✅ ADD GALLERY FILTER STYLES
    const galleryStyles = `
        .gallery-loading {
            text-align: center;
            padding: 40px;
            color: #666;
            font-size: 16px;
        }
        
        .gallery-error {
            text-align: center;
            padding: 40px;
            color: #e74c3c;
        }
        
        .gallery-error i {
            font-size: 48px;
            margin-bottom: 15px;
            display: block;
        }
        
        .no-images-message {
            text-align: center;
            padding: 40px;
            color: #999;
        }
        
        .no-images-message i {
            font-size: 48px;
            margin-bottom: 15px;
            display: block;
        }
        
        .gallery-filters {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin: 20px 0;
        }
        
        .gallery-filter-btn {
            background: #f8f9fa;
            border: 2px solid #dee2e6;
            color: #495057;
            padding: 8px 16px;
            border-radius: 25px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 500;
            font-size: 14px;
        }
        
        .gallery-filter-btn:hover {
            background: #e9ecef;
            border-color: #adb5bd;
        }
        
        .gallery-filter-btn.active {
            background: linear-gradient(135deg, #ff6b35, #f7931e);
            border-color: #ff6b35;
            color: white;
            box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
        }
        
        .gallery-item {
            position: relative;
            overflow: hidden;
            border-radius: 12px;
            cursor: pointer;
            transition: transform 0.3s ease;
        }
        
        .gallery-item:hover {
            transform: translateY(-5px);
        }
        
        .gallery-item img {
            width: 100%;
            height: 200px;
            object-fit: cover;
            transition: transform 0.3s ease;
        }
        
        .gallery-item:hover img {
            transform: scale(1.1);
        }
        
        .gallery-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(transparent, rgba(0,0,0,0.8));
            color: white;
            padding: 20px 15px 15px;
            transform: translateY(100%);
            transition: transform 0.3s ease;
        }
        
        .gallery-item:hover .gallery-overlay {
            transform: translateY(0);
        }
        
        .gallery-overlay h5 {
            margin: 0 0 5px 0;
            font-size: 14px;
            font-weight: 600;
        }
        
        .gallery-overlay p {
            margin: 0;
            font-size: 12px;
            opacity: 0.9;
        }
    `;

    // Add gallery styles if not already added
    if (!document.getElementById('gallery-styles')) {
        const style = document.createElement('style');
        style.id = 'gallery-styles';
        style.textContent = galleryStyles;
        document.head.appendChild(style);
    }

    // Update window exports
    window.loadGallery = loadGallery;
    window.loadGalleryByCategory = loadGalleryByCategory;
    
    // ==================== EVENT LISTENERS SETUP ====================
    function setupEventListeners() {
        // Floating action buttons
        setupFloatingButtons();
        
        // Booking functionality
        setupBookingFunctionality();
        
        // Chatbot
        setupChatbot();
        
        // Reviews
        setupReviews();
        
        // Gallery
        setupGallery();
        
        // UI interactions
        setupUIInteractions();
        
        // Form validations
        setupFormValidations();
        
        // View All Hotels button
        setupViewAllHotelsButton();
    }
    
    function setupFloatingButtons() {
        // Wishlist button
        const wishlistBtn = document.getElementById('wishlistBtn');
        if (wishlistBtn) {
            // Check if already in wishlist
            const isInWishlist = wishlistItems.includes(currentTour?._id);
            if (isInWishlist) {
                wishlistBtn.classList.add('active');
                wishlistBtn.innerHTML = '<i class="fas fa-heart"></i>';
            }
            
            wishlistBtn.addEventListener('click', toggleWishlist);
        }
        
        // Share button
        const shareBtn = document.getElementById('shareBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', shareTour);
        }
        
        // Compare button
        const compareBtn = document.getElementById('compareBtn');
        if (compareBtn) {
            compareBtn.addEventListener('click', toggleCompare);
        }
    }
    
    function setupBookingFunctionality() {
        // Quantity controls
        document.querySelectorAll('.btn-minus').forEach(btn => {
            btn.addEventListener('click', function() {
                const quantityElement = this.nextElementSibling;
                let quantity = parseInt(quantityElement.textContent);
                if (quantity > 0) {
                    quantity--;
                    quantityElement.textContent = quantity;
                    calculateTotalPrice();
                }
            });
        });
        
        document.querySelectorAll('.btn-plus').forEach(btn => {
            btn.addEventListener('click', function() {
                const quantityElement = this.previousElementSibling;
                let quantity = parseInt(quantityElement.textContent);
                quantity++;
                quantityElement.textContent = quantity;
                calculateTotalPrice();
            });
        });
        
        // Book now button
        const bookNowBtn = document.getElementById('bookNowBtn');
        if (bookNowBtn) {
            bookNowBtn.addEventListener('click', handleBookNow);
        }
        
        // Date selection
        const checkinDate = document.getElementById('checkinDate');
        if (checkinDate) {
            // Set minimum date to today
            const today = new Date().toISOString().split('T')[0];
            checkinDate.min = today;
            
            checkinDate.addEventListener('change', function() {
                validateBookingForm();
            });
        }
    }
    
    function setupChatbot() {
        const chatbotHeader = document.querySelector('.chatbot-header');
        const chatbotBody = document.getElementById('chatbot-body');
        const chatbotInput = document.getElementById('chatbot-input');
        const chatbotToggle = document.getElementById('chatbot-toggle');
        
        if (chatbotHeader) {
            chatbotHeader.addEventListener('click', toggleChatbot);
        }
        
        if (chatbotInput) {
            chatbotInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    sendChatMessage();
                }
            });
        }
        
        // Setup suggestion buttons
        document.querySelectorAll('.chatbot-suggestions button').forEach(btn => {
            btn.addEventListener('click', function() {
                const message = this.textContent;
                sendMessage(message);
            });
        });
    }
    
    function setupReviews() {
        // Review filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                const filter = this.dataset.filter;
                filterReviews(filter);
            });
        });
        
        // Rating input
        document.querySelectorAll('.rating-input i').forEach((star, index) => {
            star.addEventListener('click', function() {
                const rating = index + 1;
                updateRatingInput(rating);
            });
            
            star.addEventListener('mouseenter', function() {
                highlightStars(index + 1);
            });
        });
        
        const ratingInput = document.querySelector('.rating-input');
        if (ratingInput) {
            ratingInput.addEventListener('mouseleave', function() {
                const currentRating = this.dataset.rating || 0;
                highlightStars(currentRating);
            });
        }
    }
    
    function setupGallery() {
        // Image popup functionality
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('light-box') || e.target.classList.contains('gallery-img')) {
                const imageSrc = e.target.src;
                openLightbox(imageSrc);
            }
        });
        
        // Close popup
        const popup = document.getElementById('popup');
        const closeBtn = popup?.querySelector('.close');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', closeLightbox);
        }
        
        if (popup) {
            popup.addEventListener('click', function(e) {
                if (e.target === this) {
                    closeLightbox();
                }
            });
        }
        
        // Gallery view button
        const viewGalleryBtn = document.querySelector('.btn-view-gallery');
        if (viewGalleryBtn) {
            viewGalleryBtn.addEventListener('click', function() {
                document.querySelector('.gallery-section').scrollIntoView({
                    behavior: 'smooth'
                });
            });
        }
    }
    
    function setupUIInteractions() {
        // Smooth scrolling for internal links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
        
        // Lazy loading for images
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                });
            });
            
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
        
        // Scroll to top functionality
        const scrollToTopBtn = document.createElement('button');
        scrollToTopBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
        scrollToTopBtn.className = 'scroll-to-top';
        scrollToTopBtn.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 30px;
            width: 50px;
            height: 50px;
            background: var(--primary-orange);
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: none;
            z-index: 999;
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(scrollToTopBtn);
        
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 300) {
                scrollToTopBtn.style.display = 'block';
            } else {
                scrollToTopBtn.style.display = 'none';
            }
        });
        
        scrollToTopBtn.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    function setupFormValidations() {
        // Real-time form validation
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            const inputs = form.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                input.addEventListener('blur', validateField);
                input.addEventListener('input', clearFieldError);
            });
        });
    }
    
    // ==================== COMPONENT INITIALIZATION ====================
    function initializeComponents() {
        // Initialize date picker
        initializeDatePicker();
        
        // Initialize tooltips
        initializeTooltips();
        
        // Initialize animations
        initializeAnimations();
        
        // Initialize performance optimizations
        initializePerformanceOptimizations();
    }
    
    function initializeDatePicker() {
        const dateInputs = document.querySelectorAll('input[type="date"]');
        dateInputs.forEach(input => {
            // Set minimum date to today
            const today = new Date().toISOString().split('T')[0];
            input.min = today;
            
            // Set maximum date to 1 year from now
            const maxDate = new Date();
            maxDate.setFullYear(maxDate.getFullYear() + 1);
            input.max = maxDate.toISOString().split('T')[0];
        });
    }
    
    function initializeTooltips() {
        // Initialize Bootstrap tooltips if available
        if (typeof $().tooltip === 'function') {
            $('[data-toggle="tooltip"]').tooltip();
        }
        
        // Custom tooltip implementation
        document.querySelectorAll('[title]').forEach(element => {
            element.addEventListener('mouseenter', showTooltip);
            element.addEventListener('mouseleave', hideTooltip);
        });
    }
    
    function initializeAnimations() {
        // Intersection Observer for scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate');
                }
            });
        }, observerOptions);
        
        // Observe elements for animation
        document.querySelectorAll('.tour-description, .detail-card, .review-item').forEach(el => {
            observer.observe(el);
        });
    }
    
    function initializePerformanceOptimizations() {
        // Debounce scroll events
        let scrollTimer;
        window.addEventListener('scroll', function() {
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(handleScroll, 10);
        });
        
        // Preload critical images
        const criticalImages = document.querySelectorAll('.main-tour-image, .related-tour-image');
        criticalImages.forEach(img => {
            const imageUrl = img.src || img.dataset.src;
            if (imageUrl) {
                const preloadImg = new Image();
                preloadImg.src = imageUrl;
            }
        });
    }
    
    // ==================== UI ENHANCEMENTS ====================
    function setupUIEnhancements() {
        // Progressive enhancement
        document.body.classList.add('js-enabled');
        
        // Add loading states
        addLoadingStates();
        
        // Setup keyboard navigation
        setupKeyboardNavigation();
        
        // Setup error boundaries
        setupErrorBoundaries();
        
        // Setup analytics tracking
        setupAnalyticsTracking();
    }
    
    function addLoadingStates() {
        // Add loading state to buttons
        document.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', function() {
                if (!this.disabled) {
                    this.classList.add('loading');
                    setTimeout(() => this.classList.remove('loading'), 2000);
                }
            });
        });
    }
    
    function setupKeyboardNavigation() {
        // Tab navigation enhancement
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });
        
        document.addEventListener('mousedown', function() {
            document.body.classList.remove('keyboard-navigation');
        });
        
        // Escape key handlers
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                // Close modals
                const openModal = document.querySelector('.modal.show');
                if (openModal) {
                    $(openModal).modal('hide');
                }
                
                // Close lightbox
                const popup = document.getElementById('popup');
                if (popup && popup.style.display === 'block') {
                    closeLightbox();
                }
                
                // Close chatbot
                if (chatbotOpen) {
                    toggleChatbot();
                }
            }
        });
    }
    
    function setupErrorBoundaries() {
        // Global error handler
        window.addEventListener('error', function(e) {
            console.error('Global error:', e.error);
            showAlert('An unexpected error occurred. Please refresh the page.', 'error');
        });
        
        // Promise rejection handler
        window.addEventListener('unhandledrejection', function(e) {
            console.error('Unhandled promise rejection:', e.reason);
            e.preventDefault();
        });
    }
    
    function setupAnalyticsTracking() {
        // Track page view
        trackEvent('page_view', {
            page: 'tour_detail',
            tour_id: currentTour?._id,
            tour_name: currentTour?.name
        });
        
        // Track user interactions
        document.addEventListener('click', function(e) {
            const target = e.target.closest('[data-track]');
            if (target) {
                const action = target.dataset.track;
                trackEvent(action, {
                    element: target.tagName.toLowerCase(),
                    tour_id: currentTour?._id
                });
            }
        });
    }
    
    // ==================== FUNCTIONALITY IMPLEMENTATIONS ====================
    
    // Wishlist functionality
    function toggleWishlist() {
        if (!currentUser) {
            showAlert('Please login to add to wishlist', 'warning');
            return;
        }
        
        if (!currentTour) return;
        
        const wishlistBtn = document.getElementById('wishlistBtn');
        const tourId = currentTour._id;
        
        // Get current wishlist from localStorage
        let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
        
        if (wishlist.includes(tourId)) {
            // Remove from wishlist
            wishlist = wishlist.filter(id => id !== tourId);
            wishlistBtn.classList.remove('active');
            wishlistBtn.innerHTML = '<i class="far fa-heart"></i>';
            showAlert('Removed from wishlist', 'info');
        } else {
            // Add to wishlist with full tour data
            wishlist.push(tourId);
            wishlistBtn.classList.add('active');
            wishlistBtn.innerHTML = '<i class="fas fa-heart"></i>';
            showAlert('Added to wishlist', 'success');
            
            // Save tour data to localStorage for wishlist
            let wishlistData = JSON.parse(localStorage.getItem('wishlistData') || '{}');
            wishlistData[tourId] = {
                _id: currentTour._id,
                name: currentTour.name,
                country: currentTour.country,
                description: currentTour.description,
                estimatedCost: currentTour.estimatedCost,
                rating: currentTour.rating,
                img: currentTour.img,
                dateAdded: new Date().toISOString()
            };
            localStorage.setItem('wishlistData', JSON.stringify(wishlistData));
        }
        
        // Update localStorage
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
        
        // Animate button
        wishlistBtn.style.transform = 'scale(1.2)';
        setTimeout(() => {
            wishlistBtn.style.transform = 'scale(1)';
        }, 200);
    }

    function checkWishlistStatus() {
        const wishlistBtn = document.getElementById('wishlistBtn');
        if (!wishlistBtn || !currentTour) return;
        
        const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
        
        if (wishlist.includes(currentTour._id)) {
            wishlistBtn.classList.add('active');
            wishlistBtn.innerHTML = '<i class="fas fa-heart"></i>';
        } else {
            wishlistBtn.classList.remove('active');
            wishlistBtn.innerHTML = '<i class="far fa-heart"></i>';
        }
    }
    
    // Share functionality
    function shareTour() {
        if (!currentTour) return;
        
        const shareData = {
            title: currentTour.name,
            text: `Check out this amazing tour: ${currentTour.name}`,
            url: window.location.href
        };
        
        if (navigator.share) {
            navigator.share(shareData).catch(err => {
                console.log('Error sharing:', err);
                fallbackShare();
            });
        } else {
            fallbackShare();
        }
    }
    
    function fallbackShare() {
        const url = window.location.href;
        
        // Copy to clipboard
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => {
                showAlert('Link copied to clipboard!', 'success');
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showAlert('Link copied to clipboard!', 'success');
        }
    }
    
    // Compare functionality
    function toggleCompare() {
        if (!currentTour) return;
        
        const compareBtn = document.getElementById('compareBtn');
        const tourId = currentTour._id;
        
        if (compareItems.includes(tourId)) {
            // Remove from compare
            compareItems = compareItems.filter(id => id !== tourId);
            compareBtn.classList.remove('active');
            showAlert('Removed from comparison', 'info');
        } else {
            // Add to compare (max 3 items)
            if (compareItems.length >= 3) {
                showAlert('You can compare maximum 3 tours', 'warning');
                return;
            }
            
            compareItems.push(tourId);
            compareBtn.classList.add('active');
            showAlert('Added to comparison', 'success');
        }
        
        localStorage.setItem('compare', JSON.stringify(compareItems));
        
        // Update compare badge
        updateCompareBadge();
    }
    
    function updateCompareBadge() {
        let badge = document.querySelector('.compare-badge');
        
        if (compareItems.length > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'compare-badge';
                badge.style.cssText = `
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: var(--danger-red);
                    color: white;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                document.getElementById('compareBtn').appendChild(badge);
            }
            badge.textContent = compareItems.length;
        } else if (badge) {
            badge.remove();
        }
    }
    
    // Booking functionality
    function calculateTotalPrice() {
        if (!currentTour) return 0;
        
        const adults = parseInt(document.querySelector('.traveler-item:first-child .quantity')?.textContent) || 0;
        const children = parseInt(document.querySelector('.traveler-item:last-child .quantity')?.textContent) || 0;
        
        const adultPrice = currentTour.estimatedCost || 0;
        const childPrice = adultPrice * 0.7; // Children get 30% discount
        
        const total = (adults * adultPrice) + (children * childPrice);
        
        // Update price display
        const priceRows = document.querySelectorAll('.price-row');
        if (priceRows.length >= 3) {
            priceRows[0].querySelector('span:last-child').textContent = `$${(adults * adultPrice).toLocaleString()}`;
            priceRows[1].querySelector('span:last-child').textContent = `$${(children * childPrice).toLocaleString()}`;
            priceRows[2].querySelector('span:last-child').textContent = `$${total.toLocaleString()}`;
        }
        
        return total;
    }
    
    function validateBookingForm() {
        const checkinDate = document.getElementById('checkinDate').value;
        const adults = parseInt(document.querySelector('.traveler-item:first-child .quantity').textContent) || 0;
        
        let isValid = true;
        let message = '';
        
        if (!checkinDate) {
            isValid = false;
            message = 'Please select a check-in date';
        } else if (new Date(checkinDate) < new Date()) {
            isValid = false;
            message = 'Check-in date must be in the future';
        } else if (adults === 0) {
            isValid = false;
            message = 'At least one adult is required';
        }
        
        const bookNowBtn = document.getElementById('bookNowBtn');
        if (bookNowBtn) {
            bookNowBtn.disabled = !isValid;
            if (!isValid) {
                bookNowBtn.title = message;
            } else {
                bookNowBtn.title = '';
            }
        }
        
        return isValid;
    }
    
    // ✅ GLOBAL VARIABLE TO TRACK BOOKING FLOW
    let isFromBookingFlow = false;

    // ✅ CẬP NHẬT FUNCTION XỬ LÝ BOOK NOW
    function handleBookNow() {
        console.log('📝 Book Now clicked for tour:', currentTour.name);
        isFromBookingFlow = true; // ✅ Set booking flow flag
        showHotelSelectionModal();
    }

   // Tìm và thay thế function showHotelSelectionModal:

    // ✅ HOTEL SELECTION MODAL - FULL ENGLISH VERSION
    async function showHotelSelectionModal() {
        try {
            // Get destination from current tour
            const destination = currentTour?.country || 'general';
            
            console.log(`🏨 Loading hotels for destination: ${destination}`);
            
            let destinationHotels = [];
            
            // Try to fetch hotels from API
            try {
                // Try destination-specific API first
                let response = await fetch(`http://localhost:3000/api/hotels/destination/${encodeURIComponent(destination)}`);
                
                if (response.ok) {
                    destinationHotels = await response.json();
                    console.log(`✅ Found ${destinationHotels.length} hotels for ${destination}`);
                }
                
                // Fallback if no hotels found
                if (!destinationHotels || destinationHotels.length === 0) {
                    console.log(`❌ No hotels found for ${destination}, using general hotels`);
                    const fallbackResponse = await fetch('http://localhost:3000/api/hotels?limit=3');
                    if (fallbackResponse.ok) {
                        destinationHotels = await fallbackResponse.json();
                    }
                }
            } catch (apiError) {
                console.warn('⚠️ API not available, using sample data:', apiError.message);
            }
            
            // Final fallback with sample data
            if (!destinationHotels || destinationHotels.length === 0) {
                console.log('💡 Using sample hotel data');
                destinationHotels = getSampleHotels(destination);
            }
            
            const modal = document.createElement('div');
            modal.className = 'hotel-selection-modal-overlay';
            modal.innerHTML = `
                <div class="hotel-selection-modal">
                    <div class="modal-header">
                        <h3><i class="fas fa-bed"></i> Select Hotel in ${destination}</h3>
                        <button class="modal-close" onclick="this.closest('.hotel-selection-modal-overlay').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p class="selection-note">
                            <i class="fas fa-info-circle"></i> 
                            Choose a suitable hotel for your trip to ${destination}
                        </p>
                        <div class="hotels-list">
                            ${destinationHotels.map(hotel => `
                                <div class="hotel-option" data-hotel-id="${hotel._id || hotel.id}">
                                    <div class="hotel-info">
                                        <img src="${hotel.details?.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=120'}" 
                                            alt="${hotel.name}" class="hotel-thumb">
                                        <div class="hotel-details">
                                            <h4>${hotel.name}</h4>
                                            <div class="hotel-rating">
                                                ${generateStarsHTML(hotel.details?.rating || 4.5)}
                                                <span class="rating-score">${hotel.details?.rating || 4.5}</span>
                                                <span class="review-count">(${hotel.reviewsSummary?.totalReviews || 120} reviews)</span>
                                            </div>
                                            <div class="hotel-location">
                                                <i class="fas fa-map-marker-alt"></i> ${hotel.location?.address || hotel.location?.city || 'Prime Location'}
                                            </div>
                                            <div class="hotel-amenities">
                                                ${(hotel.details?.amenities || ['wifi', 'restaurant', 'pool']).slice(0, 4).map(amenity => 
                                                    `<span class="amenity-tag">${getAmenityName(amenity)}</span>`
                                                ).join('')}
                                            </div>
                                            <div class="hotel-description">
                                                <p>${hotel.details?.description?.substring(0, 100) || 'Luxury accommodation with excellent service and convenient location'}...</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="hotel-actions">
                                        <button class="btn-view-hotel-detail" onclick="showHotelDetailModal('${hotel._id || hotel.id}')">
                                            <i class="fas fa-eye"></i> Details
                                        </button>
                                        <button class="btn-select-hotel" onclick="selectHotelAndProceed('${hotel._id || hotel.id}', '${hotel.name.replace(/'/g, "\\'")}')">
                                            <i class="fas fa-check"></i> Select
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.hotel-selection-modal-overlay').remove()">
                            <i class="fas fa-arrow-left"></i> Back
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Close on outside click
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
        } catch (error) {
            console.error('Error loading hotels:', error);
            showAlert('Unable to load hotel list. Please try again.', 'error');
        }
    }

    // ✅ FUNCTION ĐÓNG HOTEL DETAIL MODAL
    function closeHotelDetailModal() {
        const modal = document.querySelector('.hotel-detail-modal-overlay');
        if (modal) {
            modal.remove();
        }
    }

    // ✅ FUNCTION SELECT HOTEL FROM DETAIL MODAL
    function selectHotelFromDetail(hotelId, hotelName) {
        console.log('✅ Hotel selected from detail:', hotelName);
        
        // Close hotel detail modal
        closeHotelDetailModal();
        
        // Close hotel selection modal
        const selectionModal = document.querySelector('.hotel-selection-modal-overlay');
        if (selectionModal) {
            selectionModal.remove();
        }
        
        // Proceed to reservation
        selectHotelAndProceed(hotelId, hotelName);
    }

    

    // ✅ HELPER FUNCTION - GET SAMPLE HOTELS BY DESTINATION
    function getSampleHotels(destination) {
        const sampleByDestination = {
            'Maldives': [
                { 
                    _id: 'sample-maldives-1', 
                    id: 'sample-maldives-1',
                    name: 'Maldives Paradise Resort', 
                    details: { 
                        rating: 4.9, 
                        priceRange: { min: 500 }, 
                        amenities: ['wifi', 'spa', 'water_sports'], 
                        images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=120'] 
                    }, 
                    location: { address: 'Malé Atoll, Maldives' } 
                },
                { 
                    _id: 'sample-maldives-2', 
                    id: 'sample-maldives-2',
                    name: 'Overwater Bungalow Resort', 
                    details: { 
                        rating: 4.8, 
                        priceRange: { min: 600 }, 
                        amenities: ['wifi', 'overwater', 'snorkeling'], 
                        images: ['https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=120'] 
                    }, 
                    location: { address: 'Baa Atoll, Maldives' } 
                },
                { 
                    _id: 'sample-maldives-3', 
                    id: 'sample-maldives-3',
                    name: 'Sunset Island Villa', 
                    details: { 
                        rating: 4.7, 
                        priceRange: { min: 400 }, 
                        amenities: ['wifi', 'private_beach', 'sunset_view'], 
                        images: ['https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=120'] 
                    }, 
                    location: { address: 'Ari Atoll, Maldives' } 
                }
            ],
            'Japan': [
                { 
                    _id: 'sample-japan-1', 
                    id: 'sample-japan-1',
                    name: 'Tokyo Imperial Hotel', 
                    details: { 
                        rating: 4.8, 
                        priceRange: { min: 300 }, 
                        amenities: ['wifi', 'spa', 'restaurant'], 
                        images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=120'] 
                    }, 
                    location: { address: 'Tokyo, Japan' } 
                },
                { 
                    _id: 'sample-japan-2', 
                    id: 'sample-japan-2',
                    name: 'Osaka Castle View', 
                    details: { 
                        rating: 4.6, 
                        priceRange: { min: 250 }, 
                        amenities: ['wifi', 'city_view', 'bar'], 
                        images: ['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=120'] 
                    }, 
                    location: { address: 'Osaka, Japan' } 
                },
                { 
                    _id: 'sample-japan-3', 
                    id: 'sample-japan-3',
                    name: 'Kyoto Traditional Ryokan', 
                    details: { 
                        rating: 4.9, 
                        priceRange: { min: 400 }, 
                        amenities: ['wifi', 'spa', 'traditional'], 
                        images: ['https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=120'] 
                    }, 
                    location: { address: 'Kyoto, Japan' } 
                }
            ]
        };
        
        return sampleByDestination[destination] || [
            { 
                _id: 'general-1', 
                id: 'general-1',
                name: 'Premium City Hotel', 
                details: { 
                    rating: 4.5, 
                    priceRange: { min: 200 }, 
                    amenities: ['wifi', 'restaurant', 'pool'], 
                    images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=120'] 
                }, 
                location: { address: 'City Center' } 
            },
            { 
                _id: 'general-2', 
                id: 'general-2',
                name: 'Luxury Resort', 
                details: { 
                    rating: 4.7, 
                    priceRange: { min: 300 }, 
                    amenities: ['wifi', 'spa', 'luxury'], 
                    images: ['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=120'] 
                }, 
                location: { address: 'Resort Area' } 
            },
            { 
                _id: 'general-3', 
                id: 'general-3',
                name: 'Boutique Hotel', 
                details: { 
                    rating: 4.4, 
                    priceRange: { min: 150 }, 
                    amenities: ['wifi', 'boutique', 'bar'], 
                    images: ['https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=120'] 
                }, 
                location: { address: 'Historic District' } 
            }
        ];
    }



    // Thêm vào cuối file, trước phần window exports:

    // ✅ FUNCTION GET SAMPLE HOTEL DETAIL - THÊM FUNCTION NÀY
    function getSampleHotelDetail(hotelId) {
        const sampleHotels = {
            'sample-maldives-1': {
                _id: 'sample-maldives-1',
                name: 'Maldives Paradise Resort',
                location: {
                    address: 'Malé Atoll, Republic of Maldives',
                    city: 'Malé',
                    country: 'Maldives'
                },
                details: {
                    rating: 4.9,
                    starRating: 5,
                    priceRange: { min: 500, max: 1500 },
                    amenities: ['wifi', 'pool', 'spa', 'water_sports', 'diving_center', 'restaurant', 'bar'],
                    images: [
                        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600',
                        'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600',
                        'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600'
                    ],
                    description: 'Exclusive overwater resort in pristine Maldivian waters with unparalleled luxury and natural beauty.',
                    roomTypes: [
                        {
                            type: 'Beach Villa',
                            price: 500,
                            capacity: 2,
                            size: 80,
                            amenities: ['wifi', 'tv', 'ac', 'private_beach', 'outdoor_shower']
                        },
                        {
                            type: 'Overwater Bungalow',
                            price: 800,
                            capacity: 2,
                            size: 100,
                            amenities: ['wifi', 'tv', 'ac', 'glass_floor', 'direct_lagoon_access']
                        },
                        {
                            type: 'Presidential Suite',
                            price: 1500,
                            capacity: 4,
                            size: 200,
                            amenities: ['wifi', 'tv', 'ac', 'private_pool', 'butler_service', 'yacht']
                        }
                    ]
                },
                reviewsSummary: {
                    totalReviews: 287,
                    averageRating: 4.9
                }
            },
            'sample-japan-1': {
                _id: 'sample-japan-1',
                name: 'Tokyo Imperial Hotel',
                location: {
                    address: 'Shibuya, Tokyo, Japan',
                    city: 'Tokyo',
                    country: 'Japan'
                },
                details: {
                    rating: 4.8,
                    starRating: 5,
                    priceRange: { min: 300, max: 800 },
                    amenities: ['wifi', 'spa', 'gym', 'restaurant', 'bar', 'concierge', 'room_service'],
                    images: [
                        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600',
                        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600',
                        'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600'
                    ],
                    description: 'Luxury hotel in the heart of Tokyo with stunning city views, world-class amenities, and exceptional service.',
                    roomTypes: [
                        {
                            type: 'Standard Room',
                            price: 300,
                            capacity: 2,
                            size: 25,
                            amenities: ['wifi', 'tv', 'ac', 'minibar']
                        },
                        {
                            type: 'Deluxe Room',
                            price: 450,
                            capacity: 3,
                            size: 35,
                            amenities: ['wifi', 'tv', 'ac', 'minibar', 'balcony']
                        },
                        {
                            type: 'Executive Suite',
                            price: 800,
                            capacity: 4,
                            size: 60,
                            amenities: ['wifi', 'tv', 'ac', 'minibar', 'balcony', 'living_room', 'city_view']
                        }
                    ]
                },
                reviewsSummary: {
                    totalReviews: 456,
                    averageRating: 4.8
                }
            }
        };
        
        // Return specific hotel or default hotel
        return sampleHotels[hotelId] || sampleHotels['sample-maldives-1'];
    }

    // ✅ FUNCTION GET SAMPLE ROOM TYPES - THÊM FUNCTION NÀY
    function getSampleRoomTypes() {
        return [
            {
                type: 'Standard Room',
                capacity: 2,
                size: 25,
                amenities: ['wifi', 'tv', 'ac']
            },
            {
                type: 'Deluxe Room',
                capacity: 3,
                size: 35,
                amenities: ['wifi', 'tv', 'ac', 'balcony']
            },
            {
                type: 'Suite',
                capacity: 4,
                size: 60,
                amenities: ['wifi', 'tv', 'ac', 'living_room', 'premium_view']
            }
        ];
    }

    // ✅ FUNCTION TO GENERATE ROOM TYPES HTML FROM DATABASE
    function getRoomTypesHTML(hotel) {
        // Get room types from hotel.rooms object in database
        const roomTypes = [];
        
        if (hotel.rooms) {
            // Map database room structure to display format
            const roomTypeMap = {
                'superior': { name: 'Superior Room', basePrice: 150, capacity: 2 },
                'juniorDeluxe': { name: 'Junior Deluxe', basePrice: 200, capacity: 2 },
                'deluxe': { name: 'Deluxe Room', basePrice: 250, capacity: 3 },
                'suite': { name: 'Suite', basePrice: 400, capacity: 4 },
                'family': { name: 'Family Room', basePrice: 350, capacity: 5 },
                'president': { name: 'Presidential Suite', basePrice: 800, capacity: 6 }
            };
            
            // Generate HTML for each room type available
            Object.keys(hotel.rooms).forEach(roomKey => {
                const roomData = hotel.rooms[roomKey];
                const roomInfo = roomTypeMap[roomKey];
                
                if (roomData && roomData.available > 0 && roomInfo) {
                    roomTypes.push(`
                        <div class="room-type-item">
                            <div class="room-info">
                                <h5>${roomInfo.name}</h5>
                                <div class="room-capacity">
                                    <i class="fas fa-users"></i> Up to ${roomInfo.capacity} guests
                                </div>
                                <div class="room-available">
                                    <i class="fas fa-door-open"></i> ${roomData.available} rooms available
                                </div>
                            </div>
                            <div class="room-price">
                                $${roomData.pricePerNight || roomInfo.basePrice}
                                <span>/night</span>
                            </div>
                        </div>
                    `);
                }
            });
        }
        
        // Fallback if no rooms data
        if (roomTypes.length === 0) {
            return getSampleRoomTypes().map(room => `
                <div class="room-type-item">
                    <div class="room-info">
                        <h5>${room.type}</h5>
                        <div class="room-capacity">
                            <i class="fas fa-users"></i> ${room.capacity} guests
                        </div>
                        <div class="room-size">
                            <i class="fas fa-expand"></i> ${room.size}m²
                        </div>
                    </div>
                    <div class="room-amenities-tags">
                        ${room.amenities.slice(0, 3).map(amenity => 
                            `<span class="amenity-badge">${getAmenityName(amenity)}</span>`
                        ).join('')}
                    </div>
                </div>
            `).join('');
        }
        
        return roomTypes.join('');
    }

    // ✅ FUNCTION GET AMENITY NAME - THÊM FUNCTION NÀY
    function getAmenityName(amenity) {
        const amenityNames = {
            'wifi': 'Free WiFi',
            'pool': 'Swimming Pool',
            'spa': 'Spa & Wellness',
            'gym': 'Fitness Center',
            'restaurant': 'Restaurant',
            'bar': 'Bar & Lounge',
            'concierge': 'Concierge Service',
            'room_service': '24h Room Service',
            'water_sports': 'Water Sports',
            'diving_center': 'Diving Center',
            'tv': 'Smart TV',
            'ac': 'Air Conditioning',
            'minibar': 'Minibar',
            'balcony': 'Private Balcony',
            'private_beach': 'Private Beach',
            'outdoor_shower': 'Outdoor Shower',
            'glass_floor': 'Glass Floor',
            'direct_lagoon_access': 'Direct Lagoon Access',
            'private_pool': 'Private Pool',
            'butler_service': 'Butler Service',
            'yacht': 'Private Yacht',
            'living_room': 'Living Room',
            'city_view': 'City View',
            'premium_view': 'Premium View',
            'traditional_bath': 'Traditional Bath',
            'garden': 'Garden View',
            'luxury': 'Luxury Amenities',
            'ski_storage': 'Ski Storage',
            'fireplace': 'Fireplace',
            'mountain_view': 'Mountain View',
            'hot_tub': 'Hot Tub',
            'kitchen': 'Kitchen',
            'overwater': 'Overwater',
            'snorkeling': 'Snorkeling',
            'sunset_view': 'Sunset View',
            'rice_field_view': 'Rice Field View',
            'private_terrace': 'Private Terrace',
            'traditional_architecture': 'Traditional Architecture',
            'yoga_studio': 'Yoga Studio',
            'cultural_shows': 'Cultural Shows',
            'aurora_viewing': 'Aurora Viewing',
            'geothermal_baths': 'Geothermal Baths',
            'sky_view': 'Sky View',
            'wake_up_call': 'Aurora Wake-up Call',
            'panoramic_view': 'Panoramic View',
            'telescope': 'Telescope',
            'private_balcony': 'Private Balcony',
            'beach_access': 'Beach Access',
            'nightlife': 'Nightlife Access',
            'golf_course': 'Golf Course',
            'blue_lagoon_access': 'Blue Lagoon Access',
            'golden_circle_tours': 'Golden Circle Tours',
            'boutique': 'Boutique Style',
            'art_gallery': 'Art Gallery'
        };
        
        return amenityNames[amenity] || amenity.charAt(0).toUpperCase() + amenity.slice(1).replace(/_/g, ' ');
    }
    // ✅ FUNCTION CHANGE MAIN IMAGE
    function changeMainImage(imageSrc) {
        const mainImage = document.querySelector('.main-hotel-image');
        if (mainImage) {
            mainImage.src = imageSrc;
        }
    }

    // Thêm function mới cho hotel detail từ sidebar (không có nút Select):

    // ✅ NOTE: HOTEL DETAIL MODAL FUNCTIONS MOVED TO GLOBAL SCOPE (LINE 51-240)
    // These functions are now available globally outside DOMContentLoaded
    // - showSidebarHotelDetailModal()
    // - closeSidebarHotelDetailModal()
    // - changeSidebarHotelImage()
    // - navigateSidebarHotelImage()

    /*
    // OLD CODE - COMMENTED OUT (Now in global scope)
    async function showSidebarHotelDetailModal(hotelId) {
        // ... moved to global scope ...
    }
    
    function closeSidebarHotelDetailModal() {
        // ... moved to global scope ...
    }
    
    function changeSidebarHotelImage(index) {
        // ... moved to global scope ...
    }
    
    function navigateSidebarHotelImage(direction) {
        // ... moved to global scope ...
    }
    */

    function openSidebarHotelGallery(startIndex = 0) {
        const popup = document.getElementById('sidebarHotelGalleryPopup');
        const mainImage = document.getElementById('sidebarGalleryMainImage');
        const currentIndex = document.getElementById('sidebarGalleryCurrentIndex');
        const thumbnails = document.querySelectorAll('.sidebar-hotel-gallery-popup .gallery-thumb');
        
        if (popup && mainImage && window.currentSidebarHotelGallery) {
            popup.style.display = 'flex';
            mainImage.src = window.currentSidebarHotelGallery[startIndex];
            currentIndex.textContent = startIndex + 1;
            window.currentSidebarHotelImageIndex = startIndex;
            
            // Update thumbnail active state
            thumbnails.forEach((thumb, i) => {
                thumb.classList.toggle('active', i === startIndex);
            });
            
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        }
    }

    function closeSidebarHotelGallery() {
        const popup = document.getElementById('sidebarHotelGalleryPopup');
        if (popup) {
            popup.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    function navigateSidebarGallery(direction) {
        if (!window.currentSidebarHotelGallery) return;
        
        let newIndex = window.currentSidebarHotelImageIndex + direction;
        
        // Loop around
        if (newIndex >= window.currentSidebarHotelGallery.length) {
            newIndex = 0;
        } else if (newIndex < 0) {
            newIndex = window.currentSidebarHotelGallery.length - 1;
        }
        
        goToSidebarGalleryImage(newIndex);
    }

    function goToSidebarGalleryImage(index) {
        const mainImage = document.getElementById('sidebarGalleryMainImage');
        const currentIndex = document.getElementById('sidebarGalleryCurrentIndex');
        const thumbnails = document.querySelectorAll('.sidebar-hotel-gallery-popup .gallery-thumb');
        
        if (mainImage && window.currentSidebarHotelGallery) {
            mainImage.src = window.currentSidebarHotelGallery[index];
            currentIndex.textContent = index + 1;
            window.currentSidebarHotelImageIndex = index;
            
            // Update thumbnail active state
            thumbnails.forEach((thumb, i) => {
                thumb.classList.toggle('active', i === index);
            });
        }
    }

    // ✅ HOTEL DETAIL MODAL WITH GALLERY - ENGLISH VERSION
    async function showHotelDetailModal(hotelId) {
        try {
            console.log('🏨 Loading hotel details for:', hotelId);
            
            // Try to fetch hotel details from API
            let hotel = null;
            try {
                const response = await fetch(`http://localhost:3000/api/hotels/${hotelId}`);
                if (response.ok) {
                    hotel = await response.json();
                    console.log('✅ Hotel loaded from API:', hotel.name);
                } else {
                    console.log('❌ API response not ok:', response.status);
                }
            } catch (fetchError) {
                console.log('❌ API fetch failed:', fetchError.message);
            }
            
            // Fallback to sample data if API fails
            if (!hotel) {
                console.log('💡 Using sample hotel data for:', hotelId);
                hotel = getSampleHotelDetail(hotelId);
            }
            
            // Ensure hotel object has required properties
            if (!hotel || !hotel.name) {
                console.error('❌ Invalid hotel data:', hotel);
                showAlert('Unable to load hotel information. Please try again.', 'error');
                return;
            }
            
            // ✅ USE IMAGES FROM DATABASE
            let galleryImages = [];
            if (hotel.details?.images && hotel.details.images.length > 0) {
                // Use images from database
                galleryImages = hotel.details.images;
                console.log('✅ Using', galleryImages.length, 'images from database');
            } else {
                // Fallback to sample images
                console.log('⚠️ No images in database, using sample images');
                galleryImages = [
                    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
                    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
                    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800',
                    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
                    'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
                    'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800'
                ];
            }
            
            const modal = document.createElement('div');
            modal.className = 'hotel-detail-modal-overlay';
            modal.innerHTML = `
                <div class="hotel-detail-modal">
                    <div class="modal-header">
                        <h3><i class="fas fa-hotel"></i> ${hotel.name}</h3>
                        <button class="modal-close" onclick="closeHotelDetailModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="hotel-detail-content">
                            <div class="hotel-images">
                                <div class="main-image-container">
                                    <img src="${galleryImages[0]}" alt="${hotel.name}" class="main-hotel-image" id="mainHotelImage">
                                    <div class="image-nav-buttons">
                                        <button class="nav-btn prev-btn" onclick="navigateHotelImage(-1)">
                                            <i class="fas fa-chevron-left"></i>
                                        </button>
                                        <button class="nav-btn next-btn" onclick="navigateHotelImage(1)">
                                            <i class="fas fa-chevron-right"></i>
                                        </button>
                                    </div>
                                    <div class="image-counter">
                                        <span id="currentImageIndex">1</span> / <span id="totalImages">${galleryImages.length}</span>
                                    </div>
                                    <button class="fullscreen-btn" onclick="openHotelGallery(0)">
                                        <i class="fas fa-expand"></i>
                                    </button>
                                </div>
                                <div class="image-thumbnails">
                                    ${galleryImages.map((img, index) => 
                                        `<img src="${img}" alt="Hotel ${index + 1}" class="thumb-image ${index === 0 ? 'active' : ''}" 
                                            onclick="changeHotelImage(${index})" data-index="${index}">`
                                    ).join('')}
                                </div>
                            </div>
                            
                            <div class="hotel-info-detailed">
                                <div class="hotel-rating-detailed">
                                    ${generateStarsHTML(hotel.details?.rating || 4.5)}
                                    <span class="rating-score">${hotel.details?.rating || 4.5}</span>
                                    <span class="review-count">(${hotel.reviewsSummary?.totalReviews || 120} reviews)</span>
                                </div>
                                
                                <div class="hotel-location-detailed">
                                    <i class="fas fa-map-marker-alt"></i>
                                    <span>${hotel.location?.address || hotel.location?.city || 'Prime Location'}</span>
                                </div>
                                
                                <div class="hotel-description">
                                    <h4>Description</h4>
                                    <p>${hotel.details?.description || 'Luxury hotel with excellent service and convenient location.'}</p>
                                </div>
                                
                                <div class="hotel-amenities-detailed">
                                    <h4>Amenities</h4>
                                    <div class="amenities-grid">
                                        ${(hotel.details?.amenities || ['wifi', 'pool', 'spa', 'restaurant']).map(amenity => 
                                            `<div class="amenity-item">
                                                <i class="fas fa-check"></i>
                                                <span>${getAmenityName(amenity)}</span>
                                            </div>`
                                        ).join('')}
                                    </div>
                                </div>
                                
                                <div class="room-types">
                                    <h4><i class="fas fa-bed"></i> Available Room Types</h4>
                                    <div class="room-types-list">
                                        ${getRoomTypesHTML(hotel)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closeHotelDetailModal()">
                            <i class="fas fa-arrow-left"></i> Back
                        </button>
                        <button class="btn btn-primary" onclick="selectHotelFromDetail('${hotel._id || hotel.id}', '${hotel.name.replace(/'/g, "\\'")}')">
                            <i class="fas fa-check"></i> Select This Hotel
                        </button>
                    </div>
                </div>
                
                <!-- Hotel Gallery Popup -->
                <div class="hotel-gallery-popup" id="hotelGalleryPopup" style="display: none;">
                    <div class="gallery-content">
                        <button class="gallery-close" onclick="closeHotelGallery()">
                            <i class="fas fa-times"></i>
                        </button>
                        <div class="gallery-main">
                            <img src="" alt="Hotel Gallery" id="galleryMainImage">
                            <button class="gallery-nav prev" onclick="navigateGallery(-1)">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <button class="gallery-nav next" onclick="navigateGallery(1)">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                            <div class="gallery-counter">
                                <span id="galleryCurrentIndex">1</span> / <span id="galleryTotalImages">${galleryImages.length}</span>
                            </div>
                        </div>
                        <div class="gallery-thumbnails">
                            ${galleryImages.map((img, index) => 
                                `<img src="${img}" alt="Gallery ${index + 1}" class="gallery-thumb ${index === 0 ? 'active' : ''}" 
                                    onclick="goToGalleryImage(${index})" data-index="${index}">`
                            ).join('')}
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Store gallery images globally for navigation
            window.currentHotelGallery = galleryImages;
            window.currentHotelImageIndex = 0;
            
            // Close on outside click
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    closeHotelDetailModal();
                }
            });
            
        } catch (error) {
            console.error('❌ Error loading hotel details:', error);
            showAlert('Unable to load hotel details. Please try again.', 'error');
        }
    }

    // ✅ HOTEL IMAGE NAVIGATION FUNCTIONS
    function changeHotelImage(index) {
        const mainImage = document.getElementById('mainHotelImage');
        const currentIndex = document.getElementById('currentImageIndex');
        const thumbnails = document.querySelectorAll('.thumb-image');
        
        if (mainImage && window.currentHotelGallery) {
            mainImage.src = window.currentHotelGallery[index];
            currentIndex.textContent = index + 1;
            window.currentHotelImageIndex = index;
            
            // Update thumbnail active state
            thumbnails.forEach((thumb, i) => {
                thumb.classList.toggle('active', i === index);
            });
        }
    }

    function navigateHotelImage(direction) {
        if (!window.currentHotelGallery) return;
        
        let newIndex = window.currentHotelImageIndex + direction;
        
        // Loop around
        if (newIndex >= window.currentHotelGallery.length) {
            newIndex = 0;
        } else if (newIndex < 0) {
            newIndex = window.currentHotelGallery.length - 1;
        }
        
        changeHotelImage(newIndex);
    }

    function openHotelGallery(startIndex = 0) {
        const popup = document.getElementById('hotelGalleryPopup');
        const mainImage = document.getElementById('galleryMainImage');
        const currentIndex = document.getElementById('galleryCurrentIndex');
        const thumbnails = document.querySelectorAll('.gallery-thumb');
        
        if (popup && mainImage && window.currentHotelGallery) {
            popup.style.display = 'flex';
            mainImage.src = window.currentHotelGallery[startIndex];
            currentIndex.textContent = startIndex + 1;
            window.currentHotelImageIndex = startIndex;
            
            // Update thumbnail active state
            thumbnails.forEach((thumb, i) => {
                thumb.classList.toggle('active', i === startIndex);
            });
            
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        }
    }

    function closeHotelGallery() {
        const popup = document.getElementById('hotelGalleryPopup');
        if (popup) {
            popup.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    function navigateGallery(direction) {
        if (!window.currentHotelGallery) return;
        
        let newIndex = window.currentHotelImageIndex + direction;
        
        // Loop around
        if (newIndex >= window.currentHotelGallery.length) {
            newIndex = 0;
        } else if (newIndex < 0) {
            newIndex = window.currentHotelGallery.length - 1;
        }
        
        goToGalleryImage(newIndex);
    }

    function goToGalleryImage(index) {
        const mainImage = document.getElementById('galleryMainImage');
        const currentIndex = document.getElementById('galleryCurrentIndex');
        const thumbnails = document.querySelectorAll('.gallery-thumb');
        
        if (mainImage && window.currentHotelGallery) {
            mainImage.src = window.currentHotelGallery[index];
            currentIndex.textContent = index + 1;
            window.currentHotelImageIndex = index;
            
            // Update thumbnail active state
            thumbnails.forEach((thumb, i) => {
                thumb.classList.toggle('active', i === index);
            });
        }
    }

    // ✅ CẬP NHẬT WINDOW EXPORTS - THÊM MISSING FUNCTIONS
    window.showHotelDetailModal = showHotelDetailModal;
    window.closeHotelDetailModal = closeHotelDetailModal; 
    window.selectHotelFromDetail = selectHotelFromDetail;
    window.getSampleHotelDetail = getSampleHotelDetail;
    window.getSampleRoomTypes = getSampleRoomTypes;
    window.getAmenityName = getAmenityName;
    window.changeMainImage = changeMainImage;
    window.changeHotelImage = changeHotelImage;
    window.navigateHotelImage = navigateHotelImage;
    window.openHotelGallery = openHotelGallery;
    window.closeHotelGallery = closeHotelGallery;
    window.navigateGallery = navigateGallery;
    window.goToGalleryImage = goToGalleryImage;
    window.showAlert = showAlert;
    window.selectHotelAndProceed = selectHotelAndProceed;
    window.showSidebarHotelDetailModal = showSidebarHotelDetailModal;
    window.closeSidebarHotelDetailModal = closeSidebarHotelDetailModal;
    window.changeSidebarHotelImage = changeSidebarHotelImage;
    window.navigateSidebarHotelImage = navigateSidebarHotelImage;
    window.openSidebarHotelGallery = openSidebarHotelGallery;
    window.closeSidebarHotelGallery = closeSidebarHotelGallery;
    window.navigateSidebarGallery = navigateSidebarGallery;
    window.goToSidebarGalleryImage = goToSidebarGalleryImage;

    // ✅ CẬP NHẬT FUNCTION RESET BOOKING FLOW
    function resetBookingFlow() {
        isFromBookingFlow = false;
    }

    // ✅ CẬP NHẬT CSS CHO HOTEL ACTIONS
    const additionalHotelStyles = `
    .hotel-actions {
        display: flex;
        gap: 10px;
        margin-top: 15px;
    }

    .btn-view-hotel-detail {
        background: #17a2b8;
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 5px;
        flex: 1;
    }

    .btn-view-hotel-detail:hover {
        background: #138496;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(23, 162, 184, 0.3);
    }

    .btn-select-hotel {
        background: linear-gradient(135deg, #ff6b35, #f7931e);
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 5px;
        flex: 1;
        box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
    }

    .btn-select-hotel:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 15px rgba(255, 107, 53, 0.4);
    }
    `;

    // Add the additional styles
    if (!document.querySelector('#hotel-actions-styles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'hotel-actions-styles';
        styleSheet.textContent = additionalHotelStyles;
        document.head.appendChild(styleSheet);
    }

    // Tìm và thay thế function selectHotelAndProceed:

    // ✅ SELECT HOTEL AND PROCEED - ENGLISH VERSION
    function selectHotelAndProceed(hotelId, hotelName) {
        console.log('✅ Hotel selected:', hotelName);
        
        // Close hotel selection modal
        const modal = document.querySelector('.hotel-selection-modal-overlay');
        if (modal) {
            modal.remove();
        }
        
        // Get current booking data
        const adults = parseInt(document.querySelector('.traveler-item:first-child .quantity').textContent) || 2;
        const children = parseInt(document.querySelector('.traveler-item:last-child .quantity').textContent) || 0;
        const checkinDate = document.getElementById('checkinDate').value;
        
        // Validate required fields
        if (!checkinDate) {
            showAlert('Please select a check-in date first.', 'warning');
            return;
        }
        
        if (adults === 0) {
            showAlert('At least one adult is required.', 'warning');
            return;
        }
        
        // Calculate total price
        const basePrice = currentTour?.estimatedCost || 1000;
        const totalPrice = (basePrice * adults) + (basePrice * 0.7 * children);
        
        // Store booking data in session storage
        const bookingData = {
            tourId: currentTour?.id || currentTour?._id,
            tourName: currentTour?.name || 'Selected Tour',
            tourDuration: currentTour?.duration || null, // ✅ Add tour duration
            selectedHotel: {
                id: hotelId,
                name: hotelName
            },
            checkinDate: checkinDate,
            adults: adults,
            children: children,
            totalPrice: totalPrice,
            userId: localStorage.getItem('userId') || 'guest',
            timestamp: new Date().toISOString()
        };
        
        sessionStorage.setItem('pendingBooking', JSON.stringify(bookingData));
        
        // Show confirmation message
        showAlert(`Hotel "${hotelName}" selected successfully! Proceeding to reservation...`, 'success');
        
        // Redirect to reservation page after short delay (with cache buster)
        setTimeout(() => {
            window.location.href = 'reservation.html?v=' + Date.now();
        }, 1500);
    }

    // ✅ HELPER FUNCTION TẠO STARS HTML
    function generateStarsHTML(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        let starsHTML = '';
        
        for (let i = 0; i < fullStars; i++) {
            starsHTML += '<i class="fas fa-star"></i>';
        }
        
        if (hasHalfStar) {
            starsHTML += '<i class="fas fa-star-half-alt"></i>';
        }
        
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        for (let i = 0; i < emptyStars; i++) {
            starsHTML += '<i class="far fa-star"></i>';
        }
        
        return starsHTML;
    }
    
    // Chatbot functionality
    function toggleChatbot() {
        const chatbotBody = document.getElementById('chatbot-body');
        const chatbotToggle = document.getElementById('chatbot-toggle');
        
        if (chatbotOpen) {
            chatbotBody.style.maxHeight = '0';
            chatbotToggle.style.transform = 'rotate(0deg)';
            chatbotOpen = false;
        } else {
            chatbotBody.style.maxHeight = '500px';
            chatbotToggle.style.transform = 'rotate(180deg)';
            chatbotOpen = true;
            
            // Track chatbot open
            trackEvent('chatbot_opened', {
                tour_id: currentTour?._id
            });
        }
    }
    
    function sendMessage(message) {
        const chatbotInput = document.getElementById('chatbot-input');
        if (chatbotInput) {
            chatbotInput.value = message;
        }
        sendChatMessage();
    }
    
    async function sendChatMessage() {
        const chatbotInput = document.getElementById('chatbot-input');
        const chatbotMessages = document.getElementById('chatbot-messages');
        
        if (!chatbotInput || !chatbotMessages) return;
        
        const message = chatbotInput.value.trim();
        if (!message) return;
        
        // Add user message
        addChatMessage(message, 'user');
        chatbotInput.value = '';
        
        // Show typing indicator
        showTypingIndicator();
        
        try {
            // Send to AI chatbot API
            const response = await fetch('http://localhost:3000/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    tourId: currentTour?._id,
                    context: 'tour_detail'
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                setTimeout(() => {
                    hideTypingIndicator();
                    addChatMessage(result.response, 'bot');
                }, 1000);
            } else {
                throw new Error('AI service unavailable');
            }
            
        } catch (error) {
            console.error('Chatbot error:', error);
            setTimeout(() => {
                hideTypingIndicator();
                addChatMessage(getDefaultResponse(message), 'bot');
            }, 1000);
        }
        
        // Track message
        trackEvent('chatbot_message_sent', {
            message_length: message.length,
            tour_id: currentTour?._id
        });
    }
    
    function addChatMessage(message, sender) {
        const chatbotMessages = document.getElementById('chatbot-messages');
        if (!chatbotMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `${sender}-message`;
        messageDiv.textContent = message;
        
        chatbotMessages.appendChild(messageDiv);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }
    
    function showTypingIndicator() {
        const chatbotMessages = document.getElementById('chatbot-messages');
        if (!chatbotMessages) return;
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        
        chatbotMessages.appendChild(typingDiv);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }
    
    function hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    function getDefaultResponse(message) {
        const responses = {
            'tour details': `${currentTour?.name} tour lasts ${currentTour?.duration}, costs ${currentTour?.estimatedCost}$. Includes ${currentTour?.inclusions?.length || 4} main services.`,
            'price': `The price for this tour is $${currentTour?.estimatedCost?.toLocaleString()} for adults. Children get 30% discount.`,
            'hotel': 'We have many quality hotels from 3-5 stars. You can view the hotel list on the right.',
            'book': 'To book a tour, please select date and number of guests, then click "Book Now".',
            'default': 'Thank you for contacting us! I can help you with tour information, pricing, and booking. What do you need assistance with?'
        };
        
        const lowerMessage = message.toLowerCase();
        
        for (const [key, response] of Object.entries(responses)) {
            if (lowerMessage.includes(key)) {
                return response;
            }
        }
        
        return responses.default;
    }
    
    // Review functionality
    function filterReviews(filter) {
        const reviewItems = document.querySelectorAll('.review-item');
        
        reviewItems.forEach(item => {
            let shouldShow = true;
            
            switch (filter) {
                case 'all':
                    shouldShow = true;
                    break;
                case '5':
                    shouldShow = item.querySelector('.stars').children.length === 5;
                    break;
                case '4':
                    shouldShow = item.querySelector('.stars').children.length === 4;
                    break;
                case 'with-photos':
                    shouldShow = item.querySelector('.review-photos') !== null;
                    break;
                case 'verified':
                    shouldShow = item.querySelector('.verified-badge') !== null;
                    break;
            }
            
            item.style.display = shouldShow ? 'block' : 'none';
        });
    }
    
    function updateRatingInput(rating) {
        const ratingInput = document.querySelector('.rating-input');
        if (!ratingInput) return;
        
        ratingInput.dataset.rating = rating;
        highlightStars(rating);
    }
    
    function highlightStars(rating) {
        const stars = document.querySelectorAll('.rating-input i');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }
    
    async function likeReview(reviewId) {
        // Check authentication
        const userId = localStorage.getItem('userId');
        if (!userId) {
            showAlert('Please login to mark reviews as helpful', 'warning');
            window.location.href = 'login.html';
            return;
        }
        
        const likeBtn = event.target.closest('.review-action');
        if (!likeBtn) return;
        
        try {
            const response = await fetch(`http://localhost:3000/api/comments/${reviewId}/helpful`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'user-id': userId
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to update helpful status');
            }
            
            const result = await response.json();
            
            // Update UI
            likeBtn.classList.toggle('active');
            const icon = likeBtn.querySelector('i');
            const text = likeBtn.querySelector('.text') || likeBtn.childNodes[2];
            
            if (result.isHelpful) {
                icon.className = 'fas fa-thumbs-up';
                showAlert('Thanks for your feedback!', 'success');
            } else {
                icon.className = 'far fa-thumbs-up';
            }
            
            // Update count
            likeBtn.innerHTML = `<i class="${icon.className}"></i> Helpful (${result.helpfulCount})`;
            
        } catch (error) {
            console.error('Error updating helpful:', error);
            showAlert('Failed to update. Please try again.', 'error');
        }
    }
    
    // ...existing code...

    async function reportReview(reviewId) {
        // Check authentication
        const userId = localStorage.getItem('userId');
        if (!userId) {
            showAlert('Please login to report reviews', 'warning');
            window.location.href = 'login.html';
            return;
        }
        
        // Create report modal
        const modal = document.createElement('div');
        modal.className = 'report-modal-overlay';
        modal.innerHTML = `
            <div class="report-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-flag"></i> Report Review</h3>
                    <button class="modal-close" onclick="this.closest('.report-modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="modal-body">
                    <p>Why are you reporting this review?</p>
                    <form id="reportForm">
                        <div class="form-group">
                            <label>
                                <input type="radio" name="reason" value="spam" required>
                                <span>Spam or fake review</span>
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="radio" name="reason" value="inappropriate" required>
                                <span>Inappropriate content</span>
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="radio" name="reason" value="offensive" required>
                                <span>Offensive or abusive language</span>
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="radio" name="reason" value="fake" required>
                                <span>Not a genuine review</span>
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="radio" name="reason" value="other" required>
                                <span>Other</span>
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label for="reportDescription">Additional details (optional)</label>
                            <textarea id="reportDescription" placeholder="Please provide more information..." rows="3"></textarea>
                        </div>
                        
                        <div class="modal-actions">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.report-modal-overlay').remove()">
                                Cancel
                            </button>
                            <button type="submit" class="btn btn-danger">
                                <i class="fas fa-flag"></i> Submit Report
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Handle form submission
        const form = modal.querySelector('#reportForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const reason = form.querySelector('input[name="reason"]:checked').value;
            const description = modal.querySelector('#reportDescription').value;
            
            try {
                const response = await fetch(`http://localhost:3000/api/comments/${reviewId}/report`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'user-id': userId
                    },
                    body: JSON.stringify({ reason, description })
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to submit report');
                }
                
                const result = await response.json();
                showAlert('Report submitted successfully. We will review it shortly.', 'success');
                modal.remove();
                
            } catch (error) {
                console.error('Error reporting review:', error);
                showAlert(error.message || 'Failed to submit report. Please try again.', 'error');
            }
        });
    }
    
    // Gallery functionality
    function openLightbox(imageSrc, index = 0) {
        const popup = document.getElementById('popup');
        const popupImg = document.getElementById('popup-img');
        
        if (popup && popupImg) {
            popup.style.display = 'block';
            popupImg.src = imageSrc;
            
            // Track image view
            trackEvent('image_viewed', {
                image_index: index,
                tour_id: currentTour?._id
            });
        }
    }
    
    function closeLightbox() {
        const popup = document.getElementById('popup');
        if (popup) {
            popup.style.display = 'none';
        }
    }
    
    // Navigation functionality
    function navigateToTour(tourId) {
        window.location.href = `detail.html?id=${tourId}`;
    }
    
    // ==================== UTILITY FUNCTIONS ====================
    
    function generateStarsHTML(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        let starsHTML = '';
        
        // Full stars
        for (let i = 0; i < fullStars; i++) {
            starsHTML += '<i class="fas fa-star"></i>';
        }
        
        // Half star
        if (hasHalfStar) {
            starsHTML += '<i class="fas fa-star-half-alt"></i>';
        }
        
        // Empty stars
        const remainingStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        for (let i = 0; i < remainingStars; i++) {
            starsHTML += '<i class="far fa-star"></i>';
        }
        
        return starsHTML;
    }
    
    function generateReviewPhotosHTML(photos) {
        if (!photos || photos.length === 0) return '';
        
        let photosHTML = '<div class="review-photos">';
        photos.forEach(photo => {
            photosHTML += `<img src="${photo}" alt="Review Photo" class="review-photo" onclick="openLightbox('${photo}')">`;
        });
        photosHTML += '</div>';
        
        return photosHTML;
    }
    
    // Thêm hoặc cập nhật function showAlert:

    // ✅ SHOW ALERT FUNCTION - ENGLISH VERSION
    function showAlert(message, type = 'info') {
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.custom-alert');
        existingAlerts.forEach(alert => alert.remove());
        
        const alert = document.createElement('div');
        alert.className = `custom-alert alert-${type}`;
        
        const icon = type === 'success' ? 'fa-check-circle' : 
                    type === 'warning' ? 'fa-exclamation-triangle' : 
                    type === 'error' ? 'fa-times-circle' : 'fa-info-circle';
        
        alert.innerHTML = `
            <div class="alert-content">
                <i class="fas ${icon}"></i>
                <span>${message}</span>
            </div>
            <button class="alert-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        alert.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#27ae60' : type === 'warning' ? '#f39c12' : type === 'error' ? '#e74c3c' : '#3498db'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 10001;
            min-width: 300px;
            max-width: 500px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            font-family: 'Poppins', sans-serif;
            font-size: 14px;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(alert);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alert.parentElement) {
                alert.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => alert.remove(), 300);
            }
        }, 5000);
    }

    // Add CSS animations for alerts
    const alertStyles = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .alert-content {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
        }
        
        .alert-close {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            transition: background 0.3s ease;
        }
        
        .alert-close:hover {
            background: rgba(255, 255, 255, 0.3);
        }
    `;

    // Add styles to document if not already added
    if (!document.getElementById('alert-styles')) {
        const style = document.createElement('style');
        style.id = 'alert-styles';
        style.textContent = alertStyles;
        document.head.appendChild(style);
    }
    
    function showLoadingState() {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loading-overlay';
        loadingOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        loadingOverlay.innerHTML = `
            <div style="
                background: white;
                padding: 30px;
                border-radius: 15px;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            ">
                <div class="spinner" style="
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #ff6600;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 15px;
                "></div>
                <div style="color: #333; font-weight: 600;">Loading...</div>
            </div>
        `;
        
        document.body.appendChild(loadingOverlay);
    }
    
    function hideLoadingState() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }
    
    function validateField(e) {
        const field = e.target;
        const value = field.value.trim();
        let isValid = true;
        let message = '';
        
        // Remove previous error styling
        field.classList.remove('error');
        const existingError = field.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // Validation rules
        switch (field.type) {
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                isValid = emailRegex.test(value);
                message = 'Please enter a valid email address';
                break;
            case 'tel':
                const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
                isValid = phoneRegex.test(value);
                message = 'Please enter a valid phone number';
                break;
            case 'date':
                isValid = new Date(value) > new Date();
                message = 'Date must be in the future';
                break;
            default:
                if (field.required) {
                    isValid = value.length > 0;
                    message = 'This field is required';
                }
        }
        
        if (!isValid) {
            field.classList.add('error');
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.style.cssText = `
                color: #dc3545;
                font-size: 12px;
                margin-top: 5px;
            `;
            errorDiv.textContent = message;
            field.parentNode.appendChild(errorDiv);
        }
        
        return isValid;
    }
    
    function clearFieldError(e) {
        const field = e.target;
        field.classList.remove('error');
        const existingError = field.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
    }
    
    function showTooltip(e) {
        const element = e.target;
        const title = element.getAttribute('title');
        
        if (!title) return;
        
        // Remove title to prevent browser tooltip
        element.setAttribute('data-original-title', title);
        element.removeAttribute('title');
        
        // Create custom tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.textContent = title;
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            pointer-events: none;
            z-index: 10000;
            white-space: nowrap;
        `;
        
        document.body.appendChild(tooltip);
        
        // Position tooltip
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';
        
        element.tooltipElement = tooltip;
    }
    
    function hideTooltip(e) {
        const element = e.target;
        
        if (element.tooltipElement) {
            element.tooltipElement.remove();
            element.tooltipElement = null;
        }
        
        // Restore original title
        const originalTitle = element.getAttribute('data-original-title');
        if (originalTitle) {
            element.setAttribute('title', originalTitle);
            element.removeAttribute('data-original-title');
        }
    }
    
    function handleScroll() {
        // Add scroll effects here
        const scrollTop = window.pageYOffset;
        
        // Progress bar
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        
        let progressBar = document.getElementById('progress-bar');
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.id = 'progress-bar';
            progressBar.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 0%;
                height: 3px;
                background: #ff6600;
                z-index: 9999;
                transition: width 0.1s ease;
            `;
            document.body.appendChild(progressBar);
        }
        
        progressBar.style.width = scrolled + '%';
    }
    
    function trackEvent(eventName, properties = {}) {
        // Analytics tracking implementation
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, properties);
        }
        
        // Custom analytics
        console.log('Analytics Event:', eventName, properties);
        
        // Store in localStorage for later sending
        const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
        events.push({
            event: eventName,
            properties: properties,
            timestamp: new Date().toISOString(),
            url: window.location.href
        });
        
        // Keep only last 100 events
        if (events.length > 100) {
            events.splice(0, events.length - 100);
        }
        
        localStorage.setItem('analytics_events', JSON.stringify(events));
    }
    
    function logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        showAlert('Logged out successfully', 'success');
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    }
    
    // Make functions globally available
    window.toggleChatbot = toggleChatbot;
    window.sendMessage = sendMessage;
    window.sendChatMessage = sendChatMessage;
    window.handleEnter = function(event) {
        if (event.key === 'Enter') {
            sendChatMessage();
        }
    };
    window.openLightbox = openLightbox;
    window.closeLightbox = closeLightbox;
    window.navigateToTour = navigateToTour;
    window.likeReview = likeReview;
    window.reportReview = reportReview;
    window.selectHotelAndProceed = selectHotelAndProceed; // ✅ THÊM DÒNG NÀY
    window.showHotelSelectionModal = showHotelSelectionModal; // ✅ THÊM DÒNG NÀY
    window.logout = logout;
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    @keyframes fadeInUp {
        from {
            transform: translateY(30px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .field.error {
        border-color: #dc3545 !important;
    }
    
    .js-enabled .animate {
        animation: fadeInUp 0.6s ease-out;
    }
    
    .keyboard-navigation *:focus {
        outline: 3px solid #ff6600 !important;
        outline-offset: 2px !important;
    }
    
    .scroll-to-top {
        position: fixed;
        bottom: 100px;
        right: 30px;
        width: 50px;
        height: 50px;
        background: linear-gradient(135deg, #ff6600, #ff8533);
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: none;
        z-index: 999;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(255, 102, 0, 0.3);
        align-items: center;
        justify-content: center;
    }
    
    .scroll-to-top:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(255, 102, 0, 0.4);
    }
`;
document.head.appendChild(style);

// ==================== VIEW ALL HOTELS FUNCTIONALITY ====================

function setupViewAllHotelsButton() {
    const viewAllBtn = document.querySelector('.btn-view-hotels');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', showAllHotelsModal);
        console.log('✅ View All Hotels button setup complete');
    }
}

async function showAllHotelsModal() {
    try {
        const destination = globalCurrentTour?.country || 'general';
        console.log(`🏨 Loading all hotels for destination: ${destination}`);
        
        // Fetch hotels from API
        let hotels = [];
        try {
            const response = await fetch(`http://localhost:3000/api/hotels/destination/${encodeURIComponent(destination)}`);
            if (response.ok) {
                hotels = await response.json();
                console.log(`✅ Found ${hotels.length} hotels for ${destination}`);
            }
        } catch (error) {
            console.warn('❌ API error:', error);
        }
        
        // Fallback to all hotels if no destination-specific hotels
        if (!hotels || hotels.length === 0) {
            console.log('🔄 No destination-specific hotels, loading all hotels...');
            try {
                const response = await fetch('http://localhost:3000/api/hotels');
                if (response.ok) {
                    hotels = await response.json();
                    console.log(`✅ Loaded ${hotels.length} hotels (all destinations)`);
                }
            } catch (error) {
                console.warn('❌ API error:', error);
            }
        }
        
        // Final fallback to sample data
        if (!hotels || hotels.length === 0) {
            console.log('💡 Using sample hotel data');
            hotels = [
                {
                    _id: 'sample1',
                    name: 'Sample Hotel 1',
                    details: {
                        rating: 4.5,
                        images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400'],
                        amenities: ['wifi', 'pool', 'spa', 'restaurant'],
                        priceRange: { min: 100, max: 300 }
                    },
                    location: { city: destination, address: 'Prime Location' }
                },
                {
                    _id: 'sample2',
                    name: 'Sample Hotel 2',
                    details: {
                        rating: 4.8,
                        images: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400'],
                        amenities: ['wifi', 'gym', 'parking', 'breakfast'],
                        priceRange: { min: 150, max: 400 }
                    },
                    location: { city: destination, address: 'Downtown' }
                }
            ];
        }
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'all-hotels-modal-overlay';
        modal.innerHTML = `
            <div class="all-hotels-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-hotel"></i> Hotels in ${destination}</h3>
                    <button class="modal-close" onclick="this.closest('.all-hotels-modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="hotels-grid">
                        ${hotels.map(hotel => createHotelCard(hotel)).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on outside click
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
    } catch (error) {
        console.error('❌ Error showing all hotels:', error);
        showAlert('Error loading hotels', 'error');
    }
}

function createHotelCard(hotel) {
    const rating = hotel.details?.rating || 4.5;
    const starsHTML = generateStarsHTML(rating);
    const image = hotel.details?.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400';
    const priceRange = hotel.details?.priceRange;
    
    // Convert VND to USD (approximate rate: 1 USD = 25,000 VND)
    const minUSD = priceRange && priceRange.min ? Math.round(priceRange.min / 25000) : 0;
    const maxUSD = priceRange && priceRange.max ? Math.round(priceRange.max / 25000) : 0;
    const priceText = (minUSD > 0 && maxUSD > 0) ? `$${minUSD} - $${maxUSD}` : 'Contact for price';
    
    return `
        <div class="hotel-card" onclick="event.stopPropagation(); showSidebarHotelDetailModal('${hotel._id || hotel.id}')">
            <div class="hotel-card-image">
                <img src="${image}" alt="${hotel.name}">
                <div class="hotel-card-badge">
                    <div class="stars">${starsHTML}</div>
                    <span class="rating-score">${rating}</span>
                </div>
            </div>
            <div class="hotel-card-content">
                <h4>${hotel.name}</h4>
                <div class="hotel-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${hotel.location?.city || hotel.location?.address || 'Prime Location'}
                </div>
                <div class="hotel-amenities">
                    ${(hotel.details?.amenities || ['wifi', 'restaurant']).slice(0, 4).map(amenity => 
                        `<span class="amenity-tag"><i class="fas fa-check"></i> ${getAmenityName(amenity)}</span>`
                    ).join('')}
                </div>
                <div class="hotel-card-footer">
                    <div class="hotel-price">
                        <span class="price-label">Price per night</span>
                        <span class="price-value">${priceText}</span>
                    </div>
                    <button class="btn-view-details" onclick="event.stopPropagation(); showSidebarHotelDetailModal('${hotel._id || hotel.id}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>
            </div>
        </div>
    `;
}