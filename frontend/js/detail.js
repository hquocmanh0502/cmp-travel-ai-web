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

// ==================== USER HELPER FUNCTIONS ====================
function getCurrentUser() {
    try {
        const userId = localStorage.getItem('userId');
        const username = localStorage.getItem('username');
        const email = localStorage.getItem('email');
        const fullName = localStorage.getItem('fullName');
        
        if (userId) {
            return {
                userId,
                username,
                email,
                fullName
            };
        }
        return null;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

// DEBUG: Test function to simulate blocked user
function testBlockedUser() {
    console.log('🧪 Testing blocked user simulation');
    const mockBlockData = {
        blocked: true,
        reason: 'Test block - violating booking policy',
        blockedAt: new Date()
    };
    
    console.log('Simulating blocked user with data:', mockBlockData);
    
    // Test the functions
    if (typeof showToast === 'function') {
        showToast('Booking Blocked', 'You are currently blocked from making bookings. Please contact support for assistance.', 'error', 8000);
    }
    
    // Test disable button
    const bookNowBtn = document.getElementById('bookNowBtn');
    if (bookNowBtn) {
        bookNowBtn.style.opacity = '0.5';
        bookNowBtn.style.cursor = 'not-allowed';
        bookNowBtn.style.pointerEvents = 'none';
        bookNowBtn.title = 'You are blocked from booking';
        bookNowBtn.innerHTML = '<i class="fas fa-ban"></i> Booking Blocked';
    }
}

// Make test function available globally
window.testBlockedUser = testBlockedUser;

// ==================== GLOBAL REVIEW REPLY FUNCTIONS ====================
async function toggleReplyForm(reviewId) {
    console.log('🔄 Toggle reply form for:', reviewId);
    
    // Check if user is logged in
    const userId = localStorage.getItem('userId');
    if (!userId) {
        alert('Please login to reply');
        return;
    }
    
    const replyForm = document.getElementById(`reply-form-${reviewId}`);
    if (!replyForm) {
        console.error('❌ Reply form not found:', reviewId);
        return;
    }
    
    console.log('Current display:', replyForm.style.display);
    
    // If form is hidden, check ban status before showing
    if (replyForm.style.display === 'none' || !replyForm.style.display) {
        // Check ban status before opening reply form
        try {
            const response = await fetch('http://localhost:3000/api/comments/ban-status', {
                headers: {
                    'user-id': userId
                }
            });
            
            if (response.ok) {
                const banData = await response.json();
                if (banData.banned) {
                    const banInfo = banData.banInfo;
                    let banMessage = 'You are banned from commenting';
                    
                    if (banInfo) {
                        if (banInfo.remainingTime && banInfo.remainingTime > 0) {
                            const hours = Math.ceil(banInfo.remainingTime / (1000 * 60 * 60));
                            banMessage = `You are banned from commenting for ${hours} more hours due to community guideline violations.`;
                        } else {
                            banMessage = 'You are permanently banned from commenting due to severe community guideline violations.';
                        }
                        
                        if (banInfo.reason) {
                            banMessage += `\nReason: ${banInfo.reason}`;
                        }
                        
                        if (banInfo.appealStatus === 'none') {
                            banMessage += '\n\nYou can appeal this ban in your profile section.';
                        } else if (banInfo.appealStatus === 'pending') {
                            banMessage += '\n\nYour appeal is being reviewed.';
                        }
                    }
                    
                    // Show ban toast notification
                    if (typeof showError === 'function') {
                        showError('Cannot Comment', banMessage, 6000);
                    } else {
                        alert(banMessage);
                    }
                    return;
                }
            }
        } catch (error) {
            console.error('Error checking ban status:', error);
            // Continue to show form if check fails
        }
        
        // Show form if not banned
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

// Function to disable reply buttons if user is banned
async function disableReplyButtonsIfBanned() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
        const response = await fetch('http://localhost:3000/api/comments/ban-status', {
            headers: {
                'user-id': userId
            }
        });

        if (response.ok) {
            const banData = await response.json();
            if (banData.banned) {
                // Disable all reply buttons and add banned styling
                const replyButtons = document.querySelectorAll('[onclick*="toggleReplyForm"]');
                replyButtons.forEach(button => {
                    button.style.opacity = '0.5';
                    button.style.cursor = 'not-allowed';
                    button.title = 'You are banned from commenting';
                    
                    // Replace onclick with ban message
                    const reviewId = button.getAttribute('onclick').match(/toggleReplyForm\('(.+?)'\)/)?.[1];
                    button.setAttribute('onclick', `showBanMessage()`);
                });
            }
        }
    } catch (error) {
        console.error('Error checking ban status for buttons:', error);
    }
}

// Show ban message when user tries to reply while banned
function showBanMessage() {
    if (typeof showError === 'function') {
        showError('Cannot Comment', 'You are banned from commenting due to community guideline violations.');
    } else {
        alert('You are banned from commenting due to community guideline violations.');
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

    // 🛡️ CHECK FOR SPAM/TOXIC CONTENT BEFORE SUBMISSION
    try {
        console.log('🔍 Checking content for spam/toxic...');
        
        const spamCheckResponse = await fetch('http://localhost:3000/api/spam-check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                text: text,
                userId: userId 
            })
        });

        if (spamCheckResponse.ok) {
            const spamResult = await spamCheckResponse.json();
            console.log('📊 Spam check result:', spamResult);

            // If content is problematic, show warning
            if (spamResult.isProblematic) {
                return new Promise((resolve, reject) => {
                    window.spamWarningToast.showWarning(
                        spamResult.warningMessage,
                        spamResult.warningType,
                        () => {
                            // User confirmed to proceed
                            console.log('⚠️ User confirmed to post flagged content');
                            proceedWithSubmission(reviewId, text, userId, true);
                            resolve();
                        },
                        () => {
                            // User cancelled
                            console.log('✅ User cancelled flagged content submission');
                            textarea.focus(); // Focus back to textarea for editing
                            resolve();
                        }
                    );
                });
            }
        } else {
            console.warn('⚠️ Spam check failed, proceeding without check');
        }
    } catch (error) {
        console.warn('⚠️ Spam check error, proceeding without check:', error);
    }

    // If no issues detected or spam check failed, proceed normally
    await proceedWithSubmission(reviewId, text, userId, false);
}

async function proceedWithSubmission(reviewId, text, userId, isUserConfirmedSpam = false) {
    try {
        console.log('Calling API...');
        
        // Add flag if user confirmed spam content
        const requestBody = { text };
        if (isUserConfirmedSpam) {
            requestBody.userConfirmedSpam = true;
            requestBody.flagForReview = true;
        }

        const response = await fetch(`http://localhost:3000/api/comments/${reviewId}/reply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-id': userId
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ API Error:', errorData);
            
            // Special handling for banned users
            if (response.status === 403 && errorData.banned) {
                const banInfo = errorData.banInfo;
                let banMessage = 'You are banned from commenting';
                
                if (banInfo) {
                    if (banInfo.remainingTime && banInfo.remainingTime > 0) {
                        const hours = Math.ceil(banInfo.remainingTime / (1000 * 60 * 60));
                        banMessage = `You are banned from commenting for ${hours} more hours due to community guideline violations.`;
                    } else {
                        banMessage = 'You are permanently banned from commenting due to severe community guideline violations.';
                    }
                    
                    if (banInfo.reason) {
                        banMessage += `\nReason: ${banInfo.reason}`;
                    }
                }
                
                // Show ban toast notification
                if (typeof showError === 'function') {
                    showError('Cannot Comment', banMessage);
                } else {
                    alert(banMessage);
                }
                return;
            }
            
            throw new Error(errorData.message || 'Failed to submit reply');
        }
        
        const result = await response.json();
        console.log('✅ Reply submitted:', result);
        
        // Show appropriate success message
        if (isUserConfirmedSpam) {
            window.spamWarningToast.showInfo('Reply submitted and flagged for admin review', 4000);
        } else {
            alert('Reply submitted successfully!');
        }
        
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
                const apiResponse = await response.json();
                hotel = apiResponse.data || apiResponse; // Handle both formats
                console.log('✅ Sidebar hotel loaded from API:', hotel?.name);
                console.log('🔍 Full hotel object structure:', {
                    id: hotel?._id,
                    name: hotel?.name,
                    hasDetails: !!hotel?.details,
                    hasMainImage: !!hotel?.details?.mainImage,
                    roomTypesCount: hotel?.details?.roomTypes?.length || 0
                });
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
        
        // Prepare hotel images - prioritize mainImage, then images array
        const mainImage = hotel.details?.mainImage;
        const hotelImages = hotel.details?.images || [];
        
        let galleryImages = [];
        if (mainImage) {
            galleryImages.push(mainImage);
            // Add other images from gallery (avoid duplicates)
            hotelImages.forEach(img => {
                if (img !== mainImage) {
                    galleryImages.push(img);
                }
            });
        } else if (hotelImages.length > 0) {
            galleryImages = hotelImages;
        } else {
            // Fallback to sample images
            galleryImages = [
                'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
                'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
                'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800'
            ];
        }
        
        // Get price range from room types
        const roomTypes = hotel.details?.roomTypes || [];
        let priceText = 'Contact for price';
        if (roomTypes.length > 0) {
            const prices = roomTypes.map(rt => rt.price).filter(p => p > 0);
            if (prices.length > 0) {
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                priceText = minPrice === maxPrice ? `$${minPrice}` : `$${minPrice} - $${maxPrice}`;
            }
        }
        
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
                                <span class="rating-score">${(hotel.details?.rating || 4.5).toFixed(1)}</span>
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
                                <h4>Available Room Types</h4>
                                <div class="room-types-list">
                                    ${(hotel.details?.roomTypes || []).map(room => 
                                        `<div class="room-type-item">
                                            <div class="room-header">
                                                <div class="room-name-price">
                                                    <h5>${room.name || room.type}</h5>
                                                    <div class="room-price">
                                                        ${room.originalPrice && room.originalPrice > room.price ? 
                                                            `<span class="original-price">$${room.originalPrice}</span>` : ''
                                                        }
                                                        <span class="current-price">$${room.price}</span>
                                                        <span class="per-night">/night</span>
                                                    </div>
                                                </div>
                                                <div class="room-availability">
                                                    <span class="available-rooms">${room.availableRooms || 0}/${room.totalRooms || 10} available</span>
                                                </div>
                                            </div>
                                            <div class="room-details">
                                                <div class="room-specs">
                                                    <div class="spec-item">
                                                        <i class="fas fa-users"></i>
                                                        <span>${room.capacity?.total || room.capacity || 2} guests</span>
                                                        ${room.capacity?.adults ? `<small>(${room.capacity.adults} adults, ${room.capacity.children || 0} children)</small>` : ''}
                                                    </div>
                                                    <div class="spec-item">
                                                        <i class="fas fa-expand"></i>
                                                        <span>${room.size || 30}m²</span>
                                                    </div>
                                                    ${room.bedInfo ? 
                                                        `<div class="spec-item">
                                                            <i class="fas fa-bed"></i>
                                                            <span>${room.bedInfo}</span>
                                                        </div>` : ''
                                                    }
                                                </div>
                                                <div class="room-amenities">
                                                    ${(room.amenities || []).slice(0, 4).map(amenity => 
                                                        `<span class="room-amenity">
                                                            <i class="fas fa-check-circle"></i>
                                                            ${getAmenityName(amenity)}
                                                        </span>`
                                                    ).join('')}
                                                </div>
                                                ${room.description ? 
                                                    `<div class="room-description">
                                                        <p>${room.description}</p>
                                                    </div>` : ''
                                                }
                                            </div>
                                        </div>`
                                    ).join('')}
                                    ${(hotel.details?.roomTypes || []).length === 0 ? 
                                        `<div class="no-rooms">
                                            <p><i class="fas fa-info-circle"></i> Room type information will be available soon.</p>
                                        </div>` : ''
                                    }
                                </div>
                                
                                <!-- Close button cho sidebar modal -->
                                <div class="modal-actions">
                                    <button class="btn btn-primary" onclick="closeSidebarHotelDetailModal()">
                                        <i class="fas fa-times"></i> Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
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
    let assignedGuides = []; // ✅ Store guides globally
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
        
        // Check ban status if user is logged in
        checkUserBanStatus();
        
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

    // Check ban status and show notification if user is banned
    async function checkUserBanStatus() {
        const userId = localStorage.getItem('userId');
        if (!userId) return;

        try {
            // Check comment/reply ban status
            const commentBanResponse = await fetch('http://localhost:3000/api/comments/ban-status', {
                headers: {
                    'user-id': userId
                }
            });

            if (commentBanResponse.ok) {
                const banData = await commentBanResponse.json();
                if (banData.banned) {
                    showBanNotification(banData.banInfo);
                }
            }

            // Check booking block status
            console.log('🔍 Checking booking block status on page load for userId:', userId);
            const bookingBlockResponse = await fetch(`http://localhost:3000/api/users/${userId}/block-status`);
            if (bookingBlockResponse.ok) {
                const blockData = await bookingBlockResponse.json();
                console.log('📋 Booking block response:', blockData);
                if (blockData.success && blockData.data.blocked) {
                    console.log('🚫 User is blocked from booking, showing notification');
                    showBookingBlockNotification(blockData.data);
                    disableBookingButton();
                } else {
                    console.log('✅ User is not blocked from booking');
                }
            } else {
                console.log('❌ Failed to check booking block status:', bookingBlockResponse.status);
            }
        } catch (error) {
            console.error('Error checking ban status:', error);
        }
    }

    // Show persistent ban notification
    function showBanNotification(banInfo) {
        // Remove existing ban notification
        const existingBan = document.querySelector('.ban-notification');
        if (existingBan) existingBan.remove();

        let banMessage = 'You are banned from commenting';
        let timeInfo = '';
        
        if (banInfo.remainingTime && banInfo.remainingTime > 0) {
            const hours = Math.ceil(banInfo.remainingTime / (1000 * 60 * 60));
            timeInfo = `for ${hours} more hours`;
            banMessage = 'You are temporarily banned from commenting';
        } else {
            timeInfo = 'permanently';
            banMessage = 'You are permanently banned from commenting';
        }

        // Create ban notification banner
        const banNotification = document.createElement('div');
        banNotification.className = 'ban-notification';
        banNotification.innerHTML = `
            <div class="ban-content">
                <div class="ban-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="ban-message">
                    <strong>${banMessage} ${timeInfo}</strong>
                    <p>Reason: ${banInfo.reason || 'Community guideline violations'}</p>
                    ${banInfo.appealStatus === 'none' ? 
                        '<small>You can appeal this ban in your profile section.</small>' : 
                        banInfo.appealStatus === 'pending' ? 
                        '<small>Your appeal is being reviewed.</small>' :
                        '<small>Your appeal has been processed.</small>'
                    }
                </div>
                <button class="ban-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Add styles if not exists
        if (!document.querySelector('#ban-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'ban-notification-styles';
            style.textContent = `
                .ban-notification {
                    position: fixed;
                    top: 70px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 9999;
                    background: linear-gradient(135deg, #ff6b6b, #ee5a52);
                    color: white;
                    padding: 0;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(255, 107, 107, 0.3);
                    max-width: 500px;
                    width: 90%;
                    animation: slideDown 0.5s ease;
                }
                
                .ban-content {
                    display: flex;
                    align-items: center;
                    padding: 16px 20px;
                    gap: 12px;
                }
                
                .ban-icon {
                    font-size: 24px;
                    color: #fff3cd;
                }
                
                .ban-message {
                    flex: 1;
                }
                
                .ban-message strong {
                    display: block;
                    font-size: 16px;
                    margin-bottom: 4px;
                }
                
                .ban-message p {
                    margin: 0;
                    font-size: 14px;
                    opacity: 0.9;
                }
                
                .ban-message small {
                    display: block;
                    font-size: 12px;
                    opacity: 0.8;
                    margin-top: 4px;
                }
                
                .ban-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 50%;
                    transition: background 0.2s;
                }
                
                .ban-close:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
                
                @keyframes slideDown {
                    from {
                        transform: translateX(-50%) translateY(-100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(-50%) translateY(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Insert at the top of the page
        document.body.insertBefore(banNotification, document.body.firstChild);

        // Auto hide after 10 seconds
        setTimeout(() => {
            if (banNotification.parentElement) {
                banNotification.remove();
            }
        }, 10000);
    }

    // Show booking block notification
    function showBookingBlockNotification(blockData) {
        // Remove existing block notification
        const existingBlock = document.querySelector('.booking-block-notification');
        if (existingBlock) existingBlock.remove();

        const blockNotification = document.createElement('div');
        blockNotification.className = 'booking-block-notification';
        blockNotification.innerHTML = `
            <div class="block-content">
                <div class="block-icon">
                    <i class="fas fa-ban"></i>
                </div>
                <div class="block-message">
                    <strong>Booking Access Blocked</strong>
                    <p>You are currently blocked from making new bookings.</p>
                    ${blockData.reason ? `<p>Reason: ${blockData.reason}</p>` : ''}
                    <small>Please contact support for assistance: support@cmptravel.com</small>
                </div>
                <button class="block-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Add styles for booking block notification
        if (!document.querySelector('#booking-block-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'booking-block-notification-styles';
            style.textContent = `
                .booking-block-notification {
                    position: fixed;
                    top: 200px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 9997;
                    background: linear-gradient(135deg, #dc2626, #b91c1c);
                    color: white;
                    padding: 16px 24px;
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(220, 38, 38, 0.3);
                    max-width: 90%;
                    width: 600px;
                    animation: slideDown 0.3s ease-out;
                }
                
                .block-content {
                    display: flex;
                    align-items: flex-start;
                    gap: 16px;
                }
                
                .block-icon {
                    font-size: 24px;
                    color: #fecaca;
                }
                
                .block-message {
                    flex: 1;
                }
                
                .block-message strong {
                    display: block;
                    font-size: 16px;
                    margin-bottom: 4px;
                }
                
                .block-message p {
                    margin: 4px 0;
                    font-size: 14px;
                    opacity: 0.9;
                }
                
                .block-message small {
                    display: block;
                    font-size: 12px;
                    opacity: 0.8;
                    margin-top: 8px;
                    color: #fecaca;
                }
                
                .block-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 50%;
                    transition: background 0.2s;
                }
                
                .block-close:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `;
            document.head.appendChild(style);
        }

        document.body.insertBefore(blockNotification, document.body.firstChild);

        // Auto hide after 15 seconds (longer for booking blocks)
        setTimeout(() => {
            if (blockNotification.parentElement) {
                blockNotification.remove();
            }
        }, 15000);
    }

    // Disable booking button when user is blocked
    function disableBookingButton() {
        console.log('🔘 Attempting to disable booking button...');
        const bookNowBtn = document.getElementById('bookNowBtn');
        console.log('🔍 Found booking button:', bookNowBtn);
        
        if (bookNowBtn) {
            console.log('✅ Disabling booking button');
            bookNowBtn.style.opacity = '0.5';
            bookNowBtn.style.cursor = 'not-allowed';
            bookNowBtn.style.pointerEvents = 'none';
            bookNowBtn.title = 'Booking is disabled - You are blocked from making bookings';
            
            // Add blocked text
            const originalText = bookNowBtn.textContent;
            console.log('Original button text:', originalText);
            if (!originalText.includes('Blocked')) {
                bookNowBtn.innerHTML = `<i class="fas fa-ban"></i> Booking Blocked`;
                console.log('✅ Button text updated to blocked');
            }
        } else {
            console.log('❌ Booking button not found! Available buttons:', 
                Array.from(document.querySelectorAll('button')).map(btn => ({
                    id: btn.id, 
                    class: btn.className,
                    text: btn.textContent.trim()
                }))
            );
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
            
            // Get userId from localStorage for VIP discount
            const userId = localStorage.getItem('userId');
            const apiUrl = userId 
                ? `http://localhost:3000/api/tours/${tourId}?userId=${userId}`
                : `http://localhost:3000/api/tours/${tourId}`;
            
            // Fetch tour data from API
            const response = await fetch(apiUrl);
            
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
                loadGuides(),
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
        // Check if VIP discount available
        const hasVIPDiscount = tour.vipInfo && tour.vipInfo.discount > 0;
        
        // Main price
        const amountElement = document.querySelector('.price-section .amount');
        if (amountElement) {
            if (hasVIPDiscount) {
                // Show discounted price
                amountElement.textContent = tour.vipInfo.finalPrice.toLocaleString();
                amountElement.style.color = '#059669'; // Green color for discounted price
            } else {
                amountElement.textContent = tour.estimatedCost.toLocaleString();
            }
        }
        
        // Booking card price
        const bookingPriceElement = document.querySelector('.booking-price .price-amount');
        if (bookingPriceElement) {
            if (hasVIPDiscount) {
                bookingPriceElement.textContent = tour.vipInfo.finalPrice.toLocaleString();
                bookingPriceElement.style.color = '#059669';
            } else {
                bookingPriceElement.textContent = tour.estimatedCost.toLocaleString();
            }
        }
        
        // Original price (with VIP discount or regular discount)
        const originalPriceElement = document.querySelector('.original-price');
        if (originalPriceElement) {
            if (hasVIPDiscount) {
                // Show original price crossed out with VIP badge
                originalPriceElement.innerHTML = `
                    <span style="text-decoration: line-through; color: #999;">$${tour.vipInfo.originalPrice.toLocaleString()}</span>
                    <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-left: 8px;">
                        ${getVIPIcon(tour.vipInfo.membershipLevel)} VIP ${tour.vipInfo.discount}% OFF
                    </span>
                `;
            } else if (tour.pricing) {
                const originalPrice = Math.round(tour.estimatedCost * 1.15);
                originalPriceElement.textContent = `$${originalPrice.toLocaleString()}`;
            }
        }
        
        // Add VIP savings info if available
        if (hasVIPDiscount) {
            const priceSectionElement = document.querySelector('.price-section');
            if (priceSectionElement) {
                // Remove existing VIP info if any
                const existingVIPInfo = priceSectionElement.querySelector('.vip-savings-info');
                if (existingVIPInfo) {
                    existingVIPInfo.remove();
                }
                
                // Add VIP savings badge
                const vipSavingsHTML = `
                    <div class="vip-savings-info" style="margin-top: 8px; padding: 8px 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; display: inline-block;">
                        <span style="color: white; font-size: 13px; font-weight: 600;">
                            ${getVIPIcon(tour.vipInfo.membershipLevel)} You save $${tour.vipInfo.savings.toLocaleString()} with ${tour.vipInfo.membershipLevel.toUpperCase()} VIP!
                        </span>
                    </div>
                `;
                priceSectionElement.insertAdjacentHTML('beforeend', vipSavingsHTML);
            }
        }
        
        // Update price breakdown
        updatePriceBreakdown(tour);
    }
    
    // Helper function to get VIP icon
    function getVIPIcon(level) {
        const icons = {
            bronze: '🥉',
            silver: '🥈',
            gold: '🥇',
            platinum: '💎',
            diamond: '💠'
        };
        return icons[level] || '🥉';
    }
    
    function updatePriceBreakdown(tour) {
        // Use VIP discounted price if available
        const basePrice = tour.vipInfo?.finalPrice || tour.estimatedCost;
        const adultPrice = tour.pricing?.adult || basePrice;
        const childPrice = tour.pricing?.child || Math.round(adultPrice * 0.7);
        
        // Store VIP info for later use in calculations
        if (tour.vipInfo) {
            window.currentVIPDiscount = tour.vipInfo;
        }
        
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
            console.log(`🏨 Loading hotels for tour: ${currentTour?.name || 'Unknown'}`);
            
            // 🎯 PRIORITY 1: Use admin-selected hotels from tour.selectedHotels (max 3 in sidebar)
            if (currentTour?.selectedHotels && currentTour.selectedHotels.length > 0) {
                console.log(`✅ Found ${currentTour.selectedHotels.length} admin-selected hotels for this tour`);
                console.log('🏨 DEBUG Selected Hotels Data:', currentTour.selectedHotels);
                displayHotels(currentTour.selectedHotels.slice(0, 3), true);
                return;
            }
            
            // 🔄 FALLBACK 1: Try destination-specific hotels
            const destination = currentTour?.country || 'general';
            console.log(`🔄 No admin-selected hotels, trying destination: ${destination}`);
            
            let response = await fetch(`http://localhost:3000/api/hotels/destination/${encodeURIComponent(destination)}`);
            let hotels = [];
            
            if (response.ok) {
                hotels = await response.json();
                console.log(`✅ Found ${hotels.length} destination hotels in ${destination}`);
            }
            
            // 🔄 FALLBACK 2: General hotels if no destination-specific hotels
            if (!hotels || hotels.length === 0) {
                console.log(`🔄 No destination hotels, using general hotels`);
                const fallbackResponse = await fetch('http://localhost:3000/api/hotels?limit=3');
                if (fallbackResponse.ok) {
                    hotels = await fallbackResponse.json();
                }
            }
            
            // 🔄 FALLBACK 3: Sample data if all API calls fail
            if (hotels && hotels.length > 0) {
                console.log('✅ Displaying API hotels:', hotels.slice(0, 3));
                displayHotels(hotels.slice(0, 3), false);
            } else {
                console.log('💡 No API hotels found, using sample hotel data');
                displaySampleHotels();
            }
            
        } catch (error) {
            console.error('Error loading hotels:', error);
            // Show sample hotels if API fails
            displaySampleHotels();
        }
    }

    // ✅ UNIFIED HOTEL ITEM RENDERER 
    function renderHotelItem(hotel) {
        // Handle both database structure and sample structure
        const hotelId = hotel._id || hotel.id;
        const hotelName = hotel.name;
        const hotelImage = hotel.details?.images?.[0] || hotel.image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=100';
        const hotelRating = hotel.details?.rating || hotel.rating || 4.5;
        const hotelLocation = hotel.location?.city || hotel.location?.address || hotel.location || 'Prime Location';
        const hotelAmenities = hotel.details?.amenities || hotel.amenities || ['wifi', 'restaurant'];
        
        // 🐛 DEBUG HOTEL IMAGE
        console.log('🏨 DEBUG Hotel Item:', {
            hotelName: hotelName,
            hotelId: hotelId,
            originalHotel: hotel,
            detailsImages: hotel.details?.images,
            sampleImage: hotel.image,
            finalImage: hotelImage,
            hasDetails: !!hotel.details,
            hasDetailsImages: !!(hotel.details?.images),
            imageArrayLength: hotel.details?.images?.length || 0
        });
        
        const starsHTML = generateStarsHTML(hotelRating);
        
        return `
            <div class="hotel-item" onclick="showSidebarHotelDetailModal('${hotelId}')">
                <img src="${hotelImage}" alt="${hotelName}" class="hotel-image">
                <div class="hotel-details">
                    <h6>${hotelName}</h6>
                    <div class="hotel-rating">
                        <div class="stars">${starsHTML}</div>
                        <span>${hotelRating.toFixed(1)}</span>
                    </div>
                    <div class="hotel-location">
                        <i class="fas fa-map-marker-alt"></i>
                        ${hotelLocation}
                    </div>
                    <div class="hotel-amenities-preview">
                        ${hotelAmenities.slice(0, 3).map(amenity => 
                            `<span class="amenity-preview">${getAmenityName(amenity)}</span>`
                        ).join(' • ')}
                    </div>
                </div>
            </div>
        `;
    }

    // ✅ UPDATE DISPLAY HOTELS FOR SIDEBAR - CHANGE CLICK HANDLER
    function displayHotels(hotels, isAdminSelected = false) {
        console.log('🏨 DEBUG displayHotels called with:', {
            hotelsCount: hotels.length,
            isAdminSelected: isAdminSelected,
            firstHotel: hotels[0],
            hotelsData: hotels
        });
        
        const hotelsList = document.getElementById('hotelsList');
        if (!hotelsList) return;
        
        // Update section title based on hotel source
        const hotelCard = hotelsList.closest('.hotels-card');
        if (hotelCard) {
            const titleElement = hotelCard.querySelector('h4');
            if (titleElement) {
                titleElement.innerHTML = isAdminSelected 
                    ? '<i class="fas fa-crown"></i> Curated Hotels for This Tour'
                    : '<i class="fas fa-bed"></i> Recommended Hotels';
            }
            
            // Update "View All" button text based on available hotels
            const viewAllBtn = hotelCard.querySelector('.btn-view-hotels');
            if (viewAllBtn && isAdminSelected && currentTour?.selectedHotels) {
                const totalHotels = currentTour.selectedHotels.length;
                const displayedHotels = hotels.length;
                
                if (totalHotels > displayedHotels) {
                    viewAllBtn.textContent = `View All ${totalHotels} Curated Hotels`;
                    viewAllBtn.style.display = 'inline-block';
                } else if (totalHotels <= 3) {
                    // If 3 or fewer hotels, hide the button
                    viewAllBtn.style.display = 'none';
                } else {
                    viewAllBtn.textContent = 'View All Hotels';
                    viewAllBtn.style.display = 'inline-block';
                }
            } else if (viewAllBtn) {
                viewAllBtn.textContent = 'View All Hotels';
                viewAllBtn.style.display = 'inline-block';
            }
        }
        
        hotelsList.innerHTML = '';
        
        hotels.forEach(hotel => {
            hotelsList.innerHTML += renderHotelItem(hotel);
        });
    }

    // ✅ UPDATE SAMPLE HOTELS TO MATCH DESTINATION - CHANGE CLICK HANDLER
    function displaySampleHotels() {
        const destination = currentTour?.country || 'general';
        const sampleHotels = getSampleHotelsByDestination(destination);
        
        console.log('🏨 DEBUG displaySampleHotels called:', {
            destination: destination,
            sampleHotelsCount: sampleHotels.length,
            firstSampleHotel: sampleHotels[0],
            sampleHotels: sampleHotels
        });
        
        const hotelsList = document.getElementById('hotelsList');
        if (!hotelsList) return;
        
        hotelsList.innerHTML = '';
        
        sampleHotels.forEach(hotel => {
            hotelsList.innerHTML += renderHotelItem(hotel);
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
    
    // ==================== TOUR GUIDES SECTION ====================
    
    async function loadGuides() {
        try {
            console.log(`👨‍✈️ Loading tour guides for tour: ${currentTour?.name || 'Unknown'}`);
            console.log('📋 assignedGuide data:', currentTour?.assignedGuide);
            
            // Check if tour has assigned guides
            if (currentTour?.assignedGuide && currentTour.assignedGuide.length > 0) {
                console.log(`✅ Found ${currentTour.assignedGuide.length} assigned tour guides`);
                console.log('📊 Guide objects:', currentTour.assignedGuide);
                
                // ✅ Store guides globally for booking flow
                assignedGuides = currentTour.assignedGuide;
                console.log('💾 Stored guides globally:', assignedGuides);
                
                displayGuides(currentTour.assignedGuide);
            } else {
                console.log('ℹ️ No tour guides assigned to this tour');
                assignedGuides = []; // ✅ Clear global guides
                // Hide guides section if no guides
                const guidesCard = document.querySelector('.guides-card');
                if (guidesCard) {
                    guidesCard.style.display = 'none';
                }
            }
            
        } catch (error) {
            console.error('Error loading tour guides:', error);
            assignedGuides = []; // ✅ Clear global guides on error
            // Hide guides section on error
            const guidesCard = document.querySelector('.guides-card');
            if (guidesCard) {
                guidesCard.style.display = 'none';
            }
        }
    }
    
    function displayGuides(guides) {
        const guidesList = document.getElementById('tourGuidesList');
        const viewAllBtn = document.getElementById('viewAllGuidesBtn');
        const guidesCard = document.querySelector('.guides-card');
        
        if (!guidesList) return;
        
        // Show guides card
        if (guidesCard) {
            guidesCard.style.display = 'block';
        }
        
        guidesList.innerHTML = '';
        
        // Display up to 3 guides
        const displayGuides = guides.slice(0, 3);
        displayGuides.forEach(guide => {
            guidesList.innerHTML += renderGuideCard(guide);
        });
        
        // Show "View All" button if more than 3 guides
        if (viewAllBtn) {
            if (guides.length > 3) {
                viewAllBtn.style.display = 'block';
                viewAllBtn.textContent = `View All ${guides.length} Guides`;
                // Add click handler
                viewAllBtn.onclick = () => showAllGuidesModal(guides);
            } else {
                viewAllBtn.style.display = 'none';
            }
        }
    }
    
    function renderGuideCard(guide) {
        const starsHTML = generateStarsHTML(guide.rating || 0);
        const guideName = guide.name || 'Tour Guide';
        const guideId = guide._id || guide.id;
        const avatar = guide.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(guideName)}&background=ff6600&color=fff&size=128`;
        
        // Get languages (max 2 to display)
        const languages = guide.languages || [];
        const displayLanguages = languages.slice(0, 2);
        
        // Get specialties (max 2 to display)
        const specialties = guide.specialties || [];
        const displaySpecialties = specialties.slice(0, 2);
        
        return `
            <div class="guide-card-item" onclick="showGuideDetailModal('${guideId}')">
                <div class="guide-card-header">
                    <img src="${avatar}" alt="${guideName}" class="guide-card-avatar">
                    <div class="guide-card-info">
                        <h6>${guideName}</h6>
                        <div class="guide-card-rating">
                            <div class="stars">${starsHTML}</div>
                            <span>${(guide.rating || 0).toFixed(1)} (${guide.totalReviews || 0} reviews)</span>
                        </div>
                    </div>
                </div>
                <div class="guide-card-details">
                    <div class="guide-detail-item">
                        <i class="fas fa-briefcase"></i>
                        <span>${guide.experience || 0} years experience</span>
                    </div>
                    ${displayLanguages.length > 0 ? `
                        <div class="guide-detail-item">
                            <i class="fas fa-globe"></i>
                            <div class="guide-languages">
                                ${displayLanguages.map(lang => `<span class="guide-lang-tag">${lang}</span>`).join('')}
                                ${languages.length > 2 ? `<span class="guide-lang-tag">+${languages.length - 2}</span>` : ''}
                            </div>
                        </div>
                    ` : ''}
                    ${displaySpecialties.length > 0 ? `
                        <div class="guide-detail-item">
                            <i class="fas fa-star"></i>
                            <div class="guide-specialties">
                                ${displaySpecialties.map(spec => `<span class="guide-specialty-tag">${spec}</span>`).join('')}
                                ${specialties.length > 2 ? `<span class="guide-specialty-tag">+${specialties.length - 2}</span>` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    // Show guide detail modal
    async function showGuideDetailModal(guideId) {
        try {
            console.log('👨‍✈️ Loading guide details for:', guideId);
            
            // Fetch guide details from API
            const response = await fetch(`http://localhost:3000/api/admin/tour-guides/${guideId}`);
            if (!response.ok) {
                throw new Error('Failed to load guide details');
            }
            
            const apiResponse = await response.json();
            console.log('✅ Guide API response:', apiResponse);
            
            // Unwrap guide data - handle {success: true, data: {...}} format
            const guide = apiResponse.data || apiResponse;
            console.log('📋 Guide data:', guide);
            
            // Handle guide name - might be undefined
            const guideName = guide.name || 'Tour Guide';
            
            // Reviews already included in guide.recentReviews from backend
            let reviews = guide.recentReviews || [];
            console.log(`✅ Found ${reviews.length} reviews for guide`);
            
            // Create modal HTML
            const starsHTML = generateStarsHTML(guide.rating || 0);
            const avatar = guide.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(guideName)}&background=ff6600&color=fff&size=128`;
            
            const modalHTML = `
                <div class="modal-overlay" id="guideDetailModal" onclick="closeGuideDetailModal()">
                    <div class="modal-content guide-detail-modal-content" onclick="event.stopPropagation()">
                        <button class="modal-close" onclick="closeGuideDetailModal()">
                            <i class="fas fa-times"></i>
                        </button>
                        
                        <div class="guide-detail-header">
                            <img src="${avatar}" alt="${guideName}" class="guide-detail-avatar">
                            <div class="guide-detail-header-info">
                                <h3>${guideName}</h3>
                                <div class="guide-detail-rating">
                                    <div class="stars">${starsHTML}</div>
                                    <span>${(guide.rating || 0).toFixed(1)} (${guide.totalReviews || 0} reviews)</span>
                                </div>
                                <div class="guide-contact-info">
                                    <div><i class="fas fa-envelope"></i> ${guide.email || 'N/A'}</div>
                                    <div><i class="fas fa-phone"></i> ${guide.phone || 'N/A'}</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="guide-detail-body">
                            <div class="guide-info-section">
                                <h4><i class="fas fa-user"></i> About</h4>
                                <p>${guide.bio || 'No bio available'}</p>
                            </div>
                            
                            <div class="guide-stats-grid">
                                <div class="guide-stat-item">
                                    <i class="fas fa-briefcase"></i>
                                    <div>
                                        <strong>${guide.experience || 0} years</strong>
                                        <span>Experience</span>
                                    </div>
                                </div>
                                <div class="guide-stat-item">
                                    <i class="fas fa-users"></i>
                                    <div>
                                        <strong>${guide.gender || 'N/A'}</strong>
                                        <span>Gender</span>
                                    </div>
                                </div>
                                <div class="guide-stat-item">
                                    <i class="fas fa-check-circle"></i>
                                    <div>
                                        <strong>${guide.status || 'active'}</strong>
                                        <span>Status</span>
                                    </div>
                                </div>
                                <div class="guide-stat-item">
                                    <i class="fas fa-calendar"></i>
                                    <div>
                                        <strong>${guide.availability || 'available'}</strong>
                                        <span>Availability</span>
                                    </div>
                                </div>
                            </div>
                            
                            ${guide.languages && guide.languages.length > 0 ? `
                                <div class="guide-info-section">
                                    <h4><i class="fas fa-globe"></i> Languages</h4>
                                    <div class="guide-tags">
                                        ${guide.languages.map(lang => `<span class="guide-tag">${lang}</span>`).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${guide.specialties && guide.specialties.length > 0 ? `
                                <div class="guide-info-section">
                                    <h4><i class="fas fa-star"></i> Specialties</h4>
                                    <div class="guide-tags">
                                        ${guide.specialties.map(spec => `<span class="guide-tag">${spec}</span>`).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${guide.certifications && guide.certifications.length > 0 ? `
                                <div class="guide-info-section">
                                    <h4><i class="fas fa-certificate"></i> Certifications</h4>
                                    <div class="guide-certifications-list">
                                        ${guide.certifications.map(cert => {
                                            const issueDate = cert.issueDate ? new Date(cert.issueDate).toLocaleDateString() : '';
                                            const expiryDate = cert.expiryDate ? new Date(cert.expiryDate).toLocaleDateString() : '';
                                            const dateRange = issueDate + (expiryDate ? ' - ' + expiryDate : '');
                                            return `
                                                <div class="certification-item">
                                                    <div class="cert-name">${cert.name}</div>
                                                    <div class="cert-issuer">${cert.issuedBy}</div>
                                                    <div class="cert-date">${dateRange}</div>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${reviews.length > 0 ? `
                                <div class="guide-info-section">
                                    <h4><i class="fas fa-comments"></i> Customer Reviews (${reviews.length})</h4>
                                    <div class="guide-reviews-list">
                                        ${reviews.slice(0, 5).map(review => {
                                            const reviewStars = generateStarsHTML(review.rating);
                                            const userName = review.userId?.fullName || review.userName || 'Anonymous';
                                            const tourName = review.tourId?.name || '';
                                            return `
                                                <div class="guide-review-item">
                                                    <div class="review-header">
                                                        <div>
                                                            <strong>${userName}</strong>
                                                            ${tourName ? `<span class="review-tour"> • ${tourName}</span>` : ''}
                                                        </div>
                                                        <div class="stars">${reviewStars}</div>
                                                    </div>
                                                    <p>${review.comment || 'No comment'}</p>
                                                    <div class="review-date">${new Date(review.createdAt).toLocaleDateString()}</div>
                                                </div>
                                            `;
                                        }).join('')}
                                        ${reviews.length > 5 ? `<p class="view-more-reviews">${reviews.length - 5} more reviews...</p>` : ''}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="modal-footer">
                            <button class="btn btn-secondary" onclick="closeGuideDetailModal()">Close</button>
                        </div>
                    </div>
                </div>
            `;
            
            console.log('🎨 Creating modal HTML...');
            
            // Remove existing modal if present
            const existingModal = document.getElementById('guideDetailModal');
            if (existingModal) {
                console.log('🗑️ Removing existing modal');
                existingModal.remove();
            }
            
            // Add modal to page
            console.log('➕ Adding modal to page');
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            console.log('✅ Modal added successfully');
            
        } catch (error) {
            console.error('Error showing guide detail:', error);
            alert('Failed to load guide details. Please try again.');
        }
    }
    
    function closeGuideDetailModal() {
        const modal = document.getElementById('guideDetailModal');
        if (modal) {
            modal.remove();
        }
    }
    
    // Show all guides modal
    function showAllGuidesModal(guides) {
        const modalHTML = `
            <div class="modal-overlay" id="allGuidesModal" onclick="closeAllGuidesModal()">
                <div class="modal-content all-guides-modal-content" onclick="event.stopPropagation()">
                    <button class="modal-close" onclick="closeAllGuidesModal()">
                        <i class="fas fa-times"></i>
                    </button>
                    
                    <h3><i class="fas fa-user-tie"></i> All Tour Guides (${guides.length})</h3>
                    
                    <div class="all-guides-grid">
                        ${guides.map(guide => renderGuideCard(guide)).join('')}
                    </div>
                    
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closeAllGuidesModal()">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if present
        const existingModal = document.getElementById('allGuidesModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    function closeAllGuidesModal() {
        const modal = document.getElementById('allGuidesModal');
        if (modal) {
            modal.remove();
        }
    }
    
    // Make guide modal functions globally available
    window.showGuideDetailModal = showGuideDetailModal;
    window.closeGuideDetailModal = closeGuideDetailModal;
    window.showAllGuidesModal = showAllGuidesModal;
    window.closeAllGuidesModal = closeAllGuidesModal;
    
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
                console.warn('⚠️ Tour ID not found, showing no reviews message');
                displayNoReviews();
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
                displayNoReviews();
                return;
            }
            
            displayReviews(reviews);
            
            // Check ban status and disable reply buttons if needed
            await disableReplyButtonsIfBanned();
            
            // Check if user can write review
            await showWriteReviewButton();
        } catch (error) {
            console.error('❌ Error loading reviews:', error);
            displayNoReviews();
        }
    }
    
    function displayReviews(reviews) {
        const reviewsList = document.getElementById('reviewsList');
        if (!reviewsList) return;
        
        console.log('📝 Displaying reviews:', reviews.length);
        
        if (reviews.length === 0) {
            displayNoReviews();
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
                <div class="review-item" data-rating="${review.content?.rating || 5}">
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
                                // Use userName from backend transformation (includes "CMP Travel" for admin)
                                const displayName = reply.userName || reply.userId?.fullName || 'Anonymous';
                                const replyAvatar = reply.userId?.avatar || 
                                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4B5563&color=fff&size=40`;
                                return `
                                <div class="reply-item">
                                    <img src="${replyAvatar}" 
                                         alt="${displayName}" 
                                         class="reply-avatar"
                                         onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4B5563&color=fff&size=40'">
                                    <div class="reply-content">
                                        <div class="reply-header">
                                            <strong>${displayName}</strong>
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
    
    function displayNoReviews() {
        const reviewsList = document.getElementById('reviewsList');
        if (!reviewsList) return;
        
        reviewsList.innerHTML = `
            <div class="no-reviews-message">
                <div class="no-reviews-icon">
                    <i class="fas fa-star-o"></i>
                </div>
                <h4>No reviews yet</h4>
                <p>Be the first to share your experience with this tour!</p>
            </div>
        `;
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
                <div class="review-item" data-rating="${review.rating}">
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
        
        // Display images immediately without loading states
        // Always add controls after static header (if exists) or create full header
        if (staticHeader) {
            // Static header exists, just add controls
            const controlsHTML = `
                <div class="gallery-controls">
                        <div class="gallery-counter">
                            <i class="fas fa-camera"></i> ${images.length} Photos
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
            
            console.log('🖼️ DEBUG Gallery images stored in displayGalleryImages:', {
                originalImages: images,
                processedImages: window.currentGalleryImages,
                imageCount: window.currentGalleryImages.length,
                caller: 'displayGalleryImages'
            });
            
            // Removed gallery filter functionality for performance
            console.log('✅ Gallery setup complete - filters removed');
    }

    // ✅ REMOVE GALLERY FILTER SECTION - SIMPLIFIED FOR PERFORMANCE

    // ✅ SIMPLIFIED SAMPLE GALLERY FUNCTION - NO CATEGORY FILTERING
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

    

    // Function to get category display name
    function getCategoryDisplayName(category) {
        const categoryMap = {
            'attractions': 'Attractions',
            'landscape': 'Landscape', 
            'accommodation': 'Hotels',
            'activities': 'Activities',
            'food': 'Food',
            'all': 'All'
        };
        return categoryMap[category] || category;
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
                    const tourId = urlParams.get('id') || currentTour._id || currentTour.id;
                    
                    const response = await fetch(`http://localhost:3000/api/tours/${tourId}/gallery`);
                    if (response.ok) {
                        const data = await response.json();
                        galleryData = data.gallery || data || [];
                        console.log(`✅ Đã tải ${galleryData.length} ảnh gallery từ API`);
                        console.log('🖼️ DEBUG Gallery data from API:', galleryData);
                    } else {
                        throw new Error('API không khả dụng');
                    }
                } catch (apiError) {
                    console.log('⚠️ Gallery API thất bại, dùng dữ liệu mẫu:', apiError.message);
                    galleryData = getSampleGalleryForDestination(currentTour?.country || 'general');
                }
            } else {
                // Không có dữ liệu tour, dùng sample
                galleryData = getSampleGalleryForDestination(currentTour?.country || 'general');
            }
            
            console.log('🖼️ DEBUG About to call displayGalleryImages with:', {
                galleryDataLength: galleryData.length,
                galleryData: galleryData
            });
            
            // Hiển thị ảnh
            displayGalleryImages(galleryData);
            
            console.log('🖼️ DEBUG displayGalleryImages completed');
            
        } catch (error) {
            console.error('Lỗi khi tải gallery:', error);
            // Hiển thị thông báo lỗi nhưng vẫn cung cấp sample data
            displayGalleryImages(getSampleGalleryForDestination(currentTour?.country || 'general'));
        }
    }

    // ✅ REMOVED GALLERY LOADING STYLES FOR INSTANT DISPLAY
    
    const galleryStyles = `
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
        
        .no-reviews-message {
            text-align: center;
            padding: 60px 40px;
            color: #999;
            background: #f8f9fa;
            border-radius: 12px;
            margin: 20px 0;
        }
        
        .no-reviews-message .no-reviews-icon {
            font-size: 48px;
            margin-bottom: 20px;
            color: #dee2e6;
        }
        
        .no-reviews-message h4 {
            margin: 0 0 10px 0;
            color: #6c757d;
            font-weight: 600;
        }
        
        .no-reviews-message p {
            margin: 0;
            font-size: 14px;
            color: #adb5bd;
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
    // Gallery filter functions removed for performance
    
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
        // Review filters - only target review filter buttons
        document.querySelectorAll('.review-filters .filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                // Remove active class from review filter buttons only
                document.querySelectorAll('.review-filters .filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                const filter = this.dataset.filter;
                console.log('🔍 Filtering reviews by:', filter);
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
        
        // Simple popup close setup
        if (popup) {
            // Close button
            const closeBtn = popup.querySelector('.close');
            if (closeBtn) {
                closeBtn.onclick = closeLightbox;
            }
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
    async function toggleWishlist() {
        if (!currentUser) {
            showAlert('Vui lòng đăng nhập để thêm vào yêu thích', 'warning');
            return;
        }
        
        if (!currentTour) return;
        
        const wishlistBtn = document.getElementById('wishlistBtn');
        const tourId = currentTour._id;
        const userId = localStorage.getItem('userId');
        
        // Get current wishlist from localStorage
        let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
        
        try {
            if (wishlist.includes(tourId)) {
                // Remove from wishlist via API
                console.log('🗑️ Removing from wishlist:', tourId);
                
                const response = await fetch(`http://localhost:3000/api/profile/${userId}/wishlist/${tourId}`, {
                    method: 'DELETE'
                });
                
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.message || 'Failed to remove from wishlist');
                }
                
                // Update UI
                wishlist = wishlist.filter(id => id !== tourId);
                wishlistBtn.classList.remove('active');
                wishlistBtn.innerHTML = '<i class="far fa-heart"></i>';
                showAlert('Đã xóa khỏi danh sách yêu thích', 'info');
                
                console.log('✅ Removed from wishlist successfully');
                
            } else {
                // Add to wishlist via API
                console.log('➕ Adding to wishlist:', tourId);
                
                const response = await fetch(`http://localhost:3000/api/profile/${userId}/wishlist`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ tourId: tourId })
                });
                
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.message || 'Failed to add to wishlist');
                }
                
                // Update UI
                wishlist.push(tourId);
                wishlistBtn.classList.add('active');
                wishlistBtn.innerHTML = '<i class="fas fa-heart"></i>';
                showAlert('Đã thêm vào danh sách yêu thích', 'success');
                
                console.log('✅ Added to wishlist successfully');
                
                // Save tour data to localStorage for quick access
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
            
        } catch (error) {
            console.error('Error toggling wishlist:', error);
            showAlert(error.message || 'Có lỗi xảy ra. Vui lòng thử lại.', 'error');
        }
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

    // ✅ CHECK USER BLOCK STATUS BEFORE BOOKING
    async function checkUserBlockStatus() {
        try {
            const currentUser = getCurrentUser();
            console.log('🔍 Checking block status for user:', currentUser);
            
            if (!currentUser || !currentUser.userId) {
                console.log('❌ User not logged in, redirecting to login');
                // User not logged in - redirect to login
                window.location.href = '/frontend/login.html';
                return false;
            }

            console.log(`🌐 Fetching block status from API: /api/users/${currentUser.userId}/block-status`);
            const response = await fetch(`http://localhost:3000/api/users/${currentUser.userId}/block-status`);
            const data = await response.json();
            
            console.log('📋 Block status response:', data);
            
            if (data.success && data.data.blocked) {
                console.log('🚫 User is blocked, showing notification');
                
                // User is blocked - show toast and disable booking
                if (typeof showToast === 'function') {
                    console.log('📢 Showing toast notification');
                    showToast('Booking Blocked', 'You are currently blocked from making bookings. Please contact support for assistance.', 'error', 8000);
                } else {
                    console.log('⚠️ Toast function not available, using alert');
                    alert('You are currently blocked from making bookings. Please contact support for assistance.');
                }
                
                // Disable booking button visually
                const bookNowBtn = document.getElementById('bookNowBtn');
                console.log('🔘 Found booking button:', bookNowBtn);
                if (bookNowBtn) {
                    bookNowBtn.style.opacity = '0.5';
                    bookNowBtn.style.cursor = 'not-allowed';
                    bookNowBtn.title = 'You are blocked from booking';
                    console.log('✅ Booking button disabled');
                }
                
                return false;
            } else {
                console.log('✅ User is not blocked, can proceed with booking');
            }
            
            return true; // User is not blocked
        } catch (error) {
            console.error('Error checking user block status:', error);
            // On error, allow booking (don't block legitimate users due to API issues)
            return true;
        }
    }

    // ✅ CẬP NHẬT FUNCTION XỬ LÝ BOOK NOW
    async function handleBookNow() {
        console.log('📝 Book Now clicked for tour:', currentTour.name);
        
        // Check if user is blocked before allowing booking
        const canBook = await checkUserBlockStatus();
        if (!canBook) {
            return; // User is blocked or not logged in
        }
        
        isFromBookingFlow = true; // ✅ Set booking flow flag
        showHotelSelectionModal();
    }

   // Tìm và thay thế function showHotelSelectionModal:

    // ✅ HOTEL SELECTION MODAL - FULL ENGLISH VERSION
    async function showHotelSelectionModal() {
        try {
            // Get destination from current tour
            const destination = currentTour?.country || 'general';
            
            console.log(`🏨 Loading admin-selected hotels for destination: ${destination}`);
            
            let destinationHotels = [];
            
            // Use admin-selected hotels if available
            if (currentTour?.selectedHotels && currentTour.selectedHotels.length > 0) {
                destinationHotels = currentTour.selectedHotels;
                console.log(`✅ Using ${destinationHotels.length} admin-selected hotels`);
            } else {
                console.log('⚠️ No admin-selected hotels, falling back to destination hotels');
                
                // Try to fetch hotels from API as fallback
                try {
                    // Try destination-specific API first
                    let response = await fetch(`http://localhost:3000/api/hotels/destination/${encodeURIComponent(destination)}`);
                    
                    if (response.ok) {
                        const result = await response.json();
                        // Handle both { success: true, data: [...] } and direct array response
                        destinationHotels = result.data || result;
                        console.log(`✅ Found ${destinationHotels.length} hotels for ${destination}`);
                    }
                    
                    // Fallback if no hotels found
                    if (!destinationHotels || destinationHotels.length === 0) {
                        console.log(`❌ No hotels found for ${destination}, using general hotels`);
                        const fallbackResponse = await fetch('http://localhost:3000/api/hotels?limit=3');
                        if (fallbackResponse.ok) {
                            const fallbackResult = await fallbackResponse.json();
                            destinationHotels = fallbackResult.data || fallbackResult;
                        }
                    }
                } catch (apiError) {
                    console.warn('⚠️ API not available, using sample data:', apiError.message);
                }
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
                        <h3><i class="fas fa-bed"></i> ${currentTour?.selectedHotels?.length > 0 ? 'Recommended Hotels' : `Select Hotel in ${destination}`}</h3>
                        <button class="modal-close" onclick="this.closest('.hotel-selection-modal-overlay').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p class="selection-note">
                            <i class="fas fa-info-circle"></i> 
                            ${currentTour?.selectedHotels?.length > 0 ? 
                                'These hotels have been carefully selected for this tour by our experts' : 
                                `Choose a suitable hotel for your trip to ${destination}`
                            }
                        </p>
                        <div class="hotels-list">
                            ${destinationHotels.map(hotel => {
                                const hotelName = hotel.name || hotel.hotelName || 'Unnamed Hotel';
                                const hotelId = hotel._id || hotel.id;
                                return `
                                <div class="hotel-option" data-hotel-id="${hotelId}">
                                    <div class="hotel-info">
                                        <img src="${hotel.details?.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=120'}" 
                                            alt="${hotelName}" class="hotel-thumb">
                                        <div class="hotel-details">
                                            <h4>${hotelName}</h4>
                                            <div class="hotel-rating">
                                                ${generateStarsHTML(hotel.details?.rating || 4.5)}
                                                <span class="rating-score">${(hotel.details?.rating || 4.5).toFixed(1)}</span>
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
                                        <button class="btn-view-hotel-detail" onclick="showHotelDetailModal('${hotelId}')">
                                            <i class="fas fa-eye"></i> Details
                                        </button>
                                        <button class="btn-select-hotel" onclick="selectHotelAndProceed('${hotelId}', '${hotelName.replace(/'/g, "\\'")}')">
                                            <i class="fas fa-check"></i> Select
                                        </button>
                                    </div>
                                </div>
                            `}).join('')}
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

    // ✅ FUNCTION TO GENERATE ROOM TYPES HTML FROM NEW DATABASE STRUCTURE
    function getRoomTypesHTML(hotel) {
        const roomTypes = hotel.details?.roomTypes || [];
        
        if (roomTypes.length === 0) {
            return `<div class="no-rooms">
                        <p><i class="fas fa-info-circle"></i> Room type information will be available soon.</p>
                    </div>`;
        }
        
        return roomTypes.map(room => `
            <div class="room-type-item">
                <div class="room-header">
                    <div class="room-name-price">
                        <h5>${room.name || room.type}</h5>
                        <div class="room-price">
                            ${room.originalPrice && room.originalPrice > room.price ? 
                                `<span class="original-price">$${room.originalPrice}</span>` : ''
                            }
                            <span class="current-price">$${room.price}</span>
                            <span class="per-night">/night</span>
                        </div>
                    </div>
                    <div class="room-availability">
                        <span class="available-rooms">
                            <i class="fas fa-door-open"></i>
                            ${room.availableRooms || 0}/${room.totalRooms || 10} available
                        </span>
                    </div>
                </div>
                <div class="room-details">
                    <div class="room-specs">
                        <div class="spec-item">
                            <i class="fas fa-users"></i>
                            <span>${room.capacity?.total || room.capacity || 2} guests</span>
                            ${room.capacity?.adults ? `<small>(${room.capacity.adults} adults, ${room.capacity.children || 0} children)</small>` : ''}
                        </div>
                        <div class="spec-item">
                            <i class="fas fa-expand"></i>
                            <span>${room.size || 30}m²</span>
                        </div>
                        ${room.bedInfo ? 
                            `<div class="spec-item">
                                <i class="fas fa-bed"></i>
                                <span>${room.bedInfo}</span>
                            </div>` : ''
                        }
                    </div>
                    <div class="room-amenities-tags">
                        ${(room.amenities || []).slice(0, 4).map(amenity => 
                            `<span class="amenity-tag">
                                <i class="fas fa-check-circle"></i>
                                ${getAmenityName(amenity)}
                            </span>`
                        ).join('')}
                    </div>
                    ${room.description ? 
                        `<div class="room-description">
                            <p>${room.description}</p>
                        </div>` : ''
                    }
                    ${room.images && room.images.length > 0 ? 
                        `<div class="room-images-preview">
                            ${room.images.slice(0, 3).map((img, index) => 
                                `<img src="${img}" alt="${room.name}" class="room-preview-img"
                                    onclick="openRoomImagePopup('${room.name}', '${hotel.name}', ${index}, '${room.type || 'room'}')"
                                    style="cursor: pointer;"
                                    title="Click to view room gallery">`
                            ).join('')}
                            ${room.images.length > 3 ? 
                                `<div class="more-images-indicator" 
                                    onclick="openRoomImagePopup('${room.name}', '${hotel.name}', 0, '${room.type || 'room'}')">
                                    +${room.images.length - 3} more
                                </div>` : ''
                            }
                        </div>` : ''
                    }
                </div>
            </div>
        `).join('');
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
                    const apiResponse = await response.json();
                    hotel = apiResponse.data || apiResponse; // Handle both formats
                    console.log('✅ Hotel loaded from API:', hotel.name);
                    console.log('🏨 Hotel details structure:', {
                        hasMainImage: !!hotel.details?.mainImage,
                        mainImage: hotel.details?.mainImage,
                        roomTypesCount: hotel.details?.roomTypes?.length || 0,
                        firstRoomType: hotel.details?.roomTypes?.[0]
                    });
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
            
            // ✅ USE IMAGES FROM DATABASE - prioritize mainImage
            const mainImage = hotel.details?.mainImage;
            const hotelImages = hotel.details?.images || [];
            
            let galleryImages = [];
            if (mainImage) {
                galleryImages.push(mainImage);
                // Add other images from gallery (avoid duplicates)
                hotelImages.forEach(img => {
                    if (img !== mainImage) {
                        galleryImages.push(img);
                    }
                });
                console.log('✅ Using mainImage +', galleryImages.length - 1, 'gallery images from database');
            } else if (hotelImages.length > 0) {
                galleryImages = hotelImages;
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
                            <!-- Cột trái: Hình ảnh và thông tin cơ bản -->
                            <div class="hotel-left-section">
                                <div class="hotel-images">
                                    <div class="main-image-container">
                                        <img src="${galleryImages[0]}" alt="${hotel.name}" class="main-hotel-image" id="mainHotelImage"
                                            onclick="openHotelImagePopup(0)"
                                            style="cursor: pointer;"
                                            title="Click to view full size">
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
                                                onclick="changeHotelImage(${index})" 
                                                oncontextmenu="openHotelImagePopup(${index}); return false;"
                                                ondblclick="openHotelImagePopup(${index})"
                                                data-index="${index}">`
                                        ).join('')}
                                    </div>
                                </div>
                                
                                <div class="hotel-info-detailed">
                                    <div class="hotel-rating-detailed">
                                        ${generateStarsHTML(hotel.details?.rating || 4.5)}
                                        <span class="rating-score">${(hotel.details?.rating || 4.5).toFixed(1)}</span>
                                        <span class="review-count">(${hotel.reviewsSummary?.totalReviews || 120} reviews)</span>
                                    </div>
                                    
                                    <div class="hotel-location-detailed">
                                        <i class="fas fa-map-marker-alt"></i>
                                        <span>${hotel.location?.address || hotel.location?.city || 'Prime Location'}</span>
                                    </div>
                                    
                                    <div class="hotel-description">
                                        <h4>About This Hotel</h4>
                                        <p>${hotel.details?.description || 'Luxury hotel with excellent service and convenient location.'}</p>
                                    </div>
                                    
                                    <div class="hotel-amenities-detailed">
                                        <h4>Hotel Amenities</h4>
                                        <div class="amenities-grid">
                                            ${(hotel.details?.amenities || ['wifi', 'pool', 'spa', 'restaurant']).map(amenity => 
                                                `<div class="amenity-item">
                                                    <i class="fas fa-check-circle"></i>
                                                    <span>${getAmenityName(amenity)}</span>
                                                </div>`
                                            ).join('')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Cột phải: Room Types -->
                            <div class="hotel-right-section">
                                <div class="room-types-header">
                                    <h3><i class="fas fa-bed"></i> Available Room Types</h3>
                                    <p class="room-types-subtitle">Choose from our selection of comfortable accommodations</p>
                                </div>
                                
                                <div class="room-types-container">
                                    ${getRoomTypesHTML(hotel)}
                                </div>
                                
                                <!-- Action buttons ở cuối cột phải -->
                                <div class="modal-actions">
                                    <button class="btn btn-secondary" onclick="closeHotelDetailModal()">
                                        <i class="fas fa-arrow-left"></i> Back
                                    </button>
                                    <button class="btn btn-primary" onclick="selectHotelFromDetail('${hotel._id || hotel.id}', '${hotel.name.replace(/'/g, "\\'")}')">
                                        <i class="fas fa-check"></i> Select This Hotel
                                    </button>
                                </div>
                            </div>
                        </div>
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
            window.currentHotelName = hotel.name;
            
            // Store room images for popup navigation
            window.currentHotelRooms = hotel.details?.roomTypes || [];
            
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

    // ✅ IMAGE POPUP FUNCTIONS WITH GALLERY NAVIGATION
    let currentPopupGallery = [];
    let currentPopupIndex = 0;

    window.openImagePopup = function(imageSrc, hotelName, galleryImages = null, startIndex = 0) {
        // Setup gallery array
        if (galleryImages && Array.isArray(galleryImages)) {
            currentPopupGallery = galleryImages;
            currentPopupIndex = startIndex;
        } else {
            // Single image mode
            currentPopupGallery = [imageSrc];
            currentPopupIndex = 0;
        }

        const popup = document.createElement('div');
        popup.className = 'image-popup-overlay';
        
        popup.innerHTML = `
            <div class="image-popup-content">
                <button class="image-popup-close" id="popupCloseBtn">
                    <i class="fas fa-times"></i>
                </button>
                
                <button class="image-popup-nav image-popup-prev" id="popupPrevBtn" ${currentPopupGallery.length <= 1 ? 'style="display: none;"' : ''}>
                    <i class="fas fa-chevron-left"></i>
                </button>
                <button class="image-popup-nav image-popup-next" id="popupNextBtn" ${currentPopupGallery.length <= 1 ? 'style="display: none;"' : ''}>
                    <i class="fas fa-chevron-right"></i>
                </button>
                
                <div class="image-popup-container">
                    <img src="${currentPopupGallery[currentPopupIndex]}" alt="${hotelName}" class="popup-image" id="popupImage">
                    <div class="image-popup-caption">
                        <h4>${hotelName}</h4>
                        ${currentPopupGallery.length > 1 ? 
                            `<p><span id="popupImageCounter">${currentPopupIndex + 1}</span> / ${currentPopupGallery.length} - Use arrow keys or click buttons to navigate</p>` :
                            `<p>Click outside or press ESC to close</p>`
                        }
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Add proper event listeners instead of inline onclick
        const closeBtn = popup.querySelector('#popupCloseBtn');
        const prevBtn = popup.querySelector('#popupPrevBtn');
        const nextBtn = popup.querySelector('#popupNextBtn');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                closeImagePopup();
            });
        }
        
        if (prevBtn) {
            prevBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                navigatePopupImage(-1);
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                navigatePopupImage(1);
            });
        }
        
        // Preload adjacent images for smooth navigation
        if (currentPopupGallery.length > 1) {
            preloadAdjacentImages();
        }
        
        // Close on outside click
        popup.addEventListener('click', function(e) {
            if (e.target === popup) {
                closeImagePopup();
            }
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', handlePopupKeydown);
    };

    function handlePopupKeydown(e) {
        if (!document.querySelector('.image-popup-overlay')) return;
        
        switch(e.key) {
            case 'Escape':
                closeImagePopup();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                navigatePopupImage(-1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                navigatePopupImage(1);
                break;
        }
    }

    window.navigatePopupImage = function(direction) {
        if (currentPopupGallery.length <= 1) return;
        
        currentPopupIndex += direction;
        
        // Loop around
        if (currentPopupIndex < 0) {
            currentPopupIndex = currentPopupGallery.length - 1;
        } else if (currentPopupIndex >= currentPopupGallery.length) {
            currentPopupIndex = 0;
        }
        
        // Update image and counter immediately
        const popupImage = document.getElementById('popupImage');
        const popupCounter = document.getElementById('popupImageCounter');
        
        if (popupImage) {
            // Direct image change without loading effects
            popupImage.src = currentPopupGallery[currentPopupIndex];
            
            // Preload next and previous images for smooth navigation
            preloadAdjacentImages();
        }
        if (popupCounter) {
            popupCounter.textContent = currentPopupIndex + 1;
        }
    };

    // Helper function to preload adjacent images
    function preloadAdjacentImages() {
        if (currentPopupGallery.length <= 1) return;
        
        const nextIndex = (currentPopupIndex + 1) % currentPopupGallery.length;
        const prevIndex = currentPopupIndex === 0 ? currentPopupGallery.length - 1 : currentPopupIndex - 1;
        
        // Preload next image
        const nextImg = new Image();
        nextImg.src = currentPopupGallery[nextIndex];
        
        // Preload previous image  
        const prevImg = new Image();
        prevImg.src = currentPopupGallery[prevIndex];
    }

    window.closeImagePopup = function() {
        const popup = document.querySelector('.image-popup-overlay');
        if (popup) {
            popup.remove();
        }
        // Remove event listener
        document.removeEventListener('keydown', handlePopupKeydown);
        
        // Reset gallery state
        currentPopupGallery = [];
        currentPopupIndex = 0;
    };

    // Helper function to open popup from hotel gallery
    window.openHotelImagePopup = function(index) {
        if (!window.currentHotelGallery || !window.currentHotelName) return;
        
        openImagePopup(
            window.currentHotelGallery[index], 
            window.currentHotelName, 
            window.currentHotelGallery, 
            index
        );
    };

    // Helper function to open popup from room gallery
    window.openRoomImagePopup = function(roomName, hotelName, imageIndex, roomType) {
        if (!window.currentHotelRooms) return;
        
        // Find the room by name or type
        const room = window.currentHotelRooms.find(r => 
            r.name === roomName || r.type === roomName || r.type === roomType
        );
        
        if (room && room.images && room.images.length > 0) {
            openImagePopup(
                room.images[imageIndex], 
                `${roomName} - ${hotelName}`, 
                room.images, 
                imageIndex
            );
        }
    };

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
        console.log('📊 Current tour object:', currentTour);
        console.log('📋 assignedGuide field:', currentTour?.assignedGuide);
        console.log('📦 Global assignedGuides:', assignedGuides);
        
        // Close hotel selection modal
        const modal = document.querySelector('.hotel-selection-modal-overlay');
        if (modal) {
            modal.remove();
        }
        
        // Use global assignedGuides (more reliable than currentTour.assignedGuide)
        console.log('👨‍✈️ Number of guides available:', assignedGuides.length);
        
        // Show guide selection modal if guides available
        if (assignedGuides && assignedGuides.length > 0) {
            console.log('✅ Opening guide selection modal with guides:', assignedGuides);
            openGuideSelectionModal(assignedGuides, (selectedGuide) => {
                console.log('✅ Guide selected from modal:', selectedGuide);
                proceedToReservation(hotelId, hotelName, selectedGuide);
            });
        } else {
            // No guides - proceed without guide
            console.log('⚠️ No guides available - proceeding without guide');
            proceedToReservation(hotelId, hotelName, null);
        }
    }
    
    function proceedToReservation(hotelId, hotelName, selectedGuide) {
        console.log('📝 Proceeding to reservation with:', { hotelId, hotelName, selectedGuide });
        
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
            tourId: currentTour?._id || currentTour?.id,
            tourName: currentTour?.name || 'Selected Tour',
            tourDuration: currentTour?.duration || null,
            selectedHotel: {
                id: hotelId,
                name: hotelName
            },
            selectedGuide: selectedGuide ? {
                id: selectedGuide._id || selectedGuide.id,
                name: selectedGuide.name || 'Tour Guide',
                avatar: selectedGuide.avatar,
                rating: selectedGuide.rating,
                experience: selectedGuide.experience
            } : null,
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
        let visibleCount = 0;
        
        reviewItems.forEach(item => {
            let shouldShow = true;
            const rating = parseInt(item.dataset.rating);
            
            switch (filter) {
                case 'all':
                    shouldShow = true;
                    break;
                case '5':
                    shouldShow = rating === 5;
                    break;
                case '4':
                    shouldShow = rating === 4;
                    break;
                case '3':
                    shouldShow = rating === 3;
                    break;
                case '2':
                    shouldShow = rating === 2;
                    break;
                case '1':
                    shouldShow = rating === 1;
                    break;
                case 'with-photos':
                    shouldShow = item.querySelector('.review-photos') !== null;
                    break;
                case 'verified':
                    shouldShow = item.querySelector('.verified-badge') !== null;
                    break;
            }
            
            if (shouldShow) {
                item.style.display = 'block';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });
        
        // Update filter button text with count
        const activeBtn = document.querySelector('.filter-btn.active');
        if (activeBtn && filter !== 'all') {
            const originalText = activeBtn.textContent.split(' (')[0];
            activeBtn.textContent = `${originalText} (${visibleCount})`;
        }
        
        console.log(`✅ Filtered reviews: ${filter}, showing ${visibleCount} of ${reviewItems.length}`);
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
    
    // Gallery functionality with navigation - SIMPLIFIED
    let currentLightboxIndex = 0;
    let currentLightboxGallery = [];

    function openLightbox(imageSrc, index = 0) {
        const popup = document.getElementById('popup');
        const popupImg = document.getElementById('popup-img');
        const popupPrev = document.querySelector('.popup-prev');
        const popupNext = document.querySelector('.popup-next');
        const popupCaption = document.getElementById('popup-caption');
        
        // 🐛 DEBUG LIGHTBOX
        console.log('🖼️ DEBUG Lightbox opened:', {
            imageSrc: imageSrc,
            index: index,
            currentGalleryImages: window.currentGalleryImages,
            galleryLength: window.currentGalleryImages?.length || 0
        });
        
        if (popup && popupImg) {
            // Setup gallery navigation
            currentLightboxIndex = index;
            currentLightboxGallery = window.currentGalleryImages || [imageSrc];
            
            console.log('🖼️ DEBUG Gallery setup:', {
                currentLightboxIndex: currentLightboxIndex,
                currentLightboxGallery: currentLightboxGallery,
                galleryLength: currentLightboxGallery.length,
                caller: 'openLightbox'
            });
            
            popup.style.display = 'block';
            popupImg.src = imageSrc;
            
            // Show/hide navigation buttons
            const hasMultipleImages = currentLightboxGallery.length > 1;
            console.log('🖼️ DEBUG Navigation:', {
                hasMultipleImages: hasMultipleImages,
                showingButtons: hasMultipleImages
            });
            
            if (popupPrev && popupNext) {
                popupPrev.style.display = hasMultipleImages ? 'block' : 'none';
                popupNext.style.display = hasMultipleImages ? 'block' : 'none';
            }
            
            // Update caption
            if (popupCaption) {
                if (hasMultipleImages) {
                    popupCaption.innerHTML = `<p>${currentLightboxIndex + 1} / ${currentLightboxGallery.length} - Press ESC or click outside to close</p>`;
                } else {
                    popupCaption.innerHTML = `<p>Press ESC or click outside to close</p>`;
                }
            }
            
            // Add keyboard navigation
            document.addEventListener('keydown', handleLightboxKeydown);
            
            // Track image view
            trackEvent('image_viewed', {
                image_index: index,
                tour_id: currentTour?._id
            });
        }
    }

    function handleLightboxKeydown(e) {
        const popup = document.getElementById('popup');
        if (!popup || popup.style.display === 'none') return;
        
        console.log('🖼️ DEBUG Keydown:', {
            key: e.key,
            popupVisible: popup.style.display !== 'none'
        });
        
        switch(e.key) {
            case 'Escape':
                console.log('🖼️ DEBUG: Closing lightbox via ESC');
                closeLightbox();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                console.log('🖼️ DEBUG: Navigate left');
                navigateGalleryPopup(-1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                console.log('🖼️ DEBUG: Navigate right');
                navigateGalleryPopup(1);
                break;
        }
    }

    window.navigateGalleryPopup = function(direction) {
        console.log('🖼️ DEBUG Navigate called:', direction);
        
        if (currentLightboxGallery.length <= 1) {
            console.log('🖼️ DEBUG: No navigation - only 1 image');
            return;
        }
        
        currentLightboxIndex += direction;
        
        // Loop around
        if (currentLightboxIndex < 0) {
            currentLightboxIndex = currentLightboxGallery.length - 1;
        } else if (currentLightboxIndex >= currentLightboxGallery.length) {
            currentLightboxIndex = 0;
        }
        
        console.log('🖼️ DEBUG New index:', currentLightboxIndex);
        
        // Update image and caption
        const popupImg = document.getElementById('popup-img');
        const popupCaption = document.getElementById('popup-caption');
        
        if (popupImg) {
            popupImg.src = currentLightboxGallery[currentLightboxIndex];
        }
        
        if (popupCaption) {
            popupCaption.innerHTML = `<p>${currentLightboxIndex + 1} / ${currentLightboxGallery.length} - Press ESC or click outside to close</p>`;
        }
    };
    
    function closeLightbox() {
        console.log('🖼️ DEBUG: Closing lightbox');
        
        const popup = document.getElementById('popup');
        if (popup) {
            popup.style.display = 'none';
            
            // Remove keyboard event listener
            document.removeEventListener('keydown', handleLightboxKeydown);
            
            // Reset gallery state
            currentLightboxIndex = 0;
            currentLightboxGallery = [];
            
            console.log('🖼️ DEBUG: Lightbox closed, state reset');
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
        console.log(`🏨 Loading all selected hotels for this tour`);
        
        let hotels = [];
        
        // 🎯 PRIORITY 1: Use admin-selected hotels if available
        if (globalCurrentTour?.selectedHotels && globalCurrentTour.selectedHotels.length > 0) {
            hotels = globalCurrentTour.selectedHotels;
            console.log(`✅ Found ${hotels.length} admin-selected hotels for this tour`);
        } else {
            // 🔄 FALLBACK: Load destination hotels if no admin selection
            const destination = globalCurrentTour?.country || 'general';
            console.log(`🔄 No admin-selected hotels, loading all hotels for destination: ${destination}`);
            
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
        
        // Determine modal title based on hotel source
        const isAdminSelected = globalCurrentTour?.selectedHotels && globalCurrentTour.selectedHotels.length > 0;
        const modalTitle = isAdminSelected 
            ? `<i class="fas fa-crown"></i> Curated Hotels for This Tour (${hotels.length})`
            : `<i class="fas fa-hotel"></i> Hotels in ${globalCurrentTour?.country || 'this destination'} (${hotels.length})`;
            
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'all-hotels-modal-overlay';
        modal.innerHTML = `
            <div class="all-hotels-modal">
                <div class="modal-header">
                    <h3>${modalTitle}</h3>
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
                    <span class="rating-score">${rating.toFixed(1)}</span>
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
                        <span class="price-value">Contact for price</span>
                    </div>
                    <button class="btn-view-details" onclick="event.stopPropagation(); showSidebarHotelDetailModal('${hotel._id || hotel.id}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>
            </div>
        </div>
    `;
}