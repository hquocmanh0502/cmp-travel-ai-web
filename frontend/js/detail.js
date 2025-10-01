// Enhanced Detail Page JavaScript with Orange Theme & AI Features

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
            
        } catch (error) {
            console.error('Error loading tour data:', error);
            showAlert('Failed to load tour data. Please try again.', 'error');
            hideLoadingState();
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
    
    async function loadHotels() {
        try {
            const response = await fetch('http://localhost:3000/api/hotels');
            const hotels = await response.json();
            
            displayHotels(hotels.slice(0, 3));
        } catch (error) {
            console.error('Error loading hotels:', error);
            // Show sample hotels if API fails
            displaySampleHotels();
        }
    }
    
    function displayHotels(hotels) {
        const hotelsList = document.getElementById('hotelsList');
        if (!hotelsList) return;
        
        hotelsList.innerHTML = '';
        
        hotels.forEach(hotel => {
            const rating = hotel.details?.rating || 4.5;
            const starsHTML = generateStarsHTML(rating);
            const price = hotel.details?.priceRange?.min || 200;
            
            hotelsList.innerHTML += `
                <div class="hotel-item">
                    <img src="${hotel.details?.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=100'}" 
                         alt="${hotel.name}" class="hotel-image">
                    <div class="hotel-details">
                        <h6>${hotel.name}</h6>
                        <div class="hotel-rating">
                            <div class="stars">${starsHTML}</div>
                            <span>${rating}</span>
                        </div>
                        <div class="hotel-price">From $${price}/night</div>
                    </div>
                </div>
            `;
        });
    }
    
    function displaySampleHotels() {
        const sampleHotels = [
            {
                name: 'Grand Plaza Hotel',
                rating: 4.8,
                price: 250,
                image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=100'
            },
            {
                name: 'Luxury Resort & Spa',
                rating: 4.6,
                price: 180,
                image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=100'
            },
            {
                name: 'Boutique City Hotel',
                rating: 4.7,
                price: 220,
                image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=100'
            }
        ];
        
        const hotelsList = document.getElementById('hotelsList');
        if (!hotelsList) return;
        
        hotelsList.innerHTML = '';
        
        sampleHotels.forEach(hotel => {
            const starsHTML = generateStarsHTML(hotel.rating);
            
            hotelsList.innerHTML += `
                <div class="hotel-item">
                    <img src="${hotel.image}" alt="${hotel.name}" class="hotel-image">
                    <div class="hotel-details">
                        <h6>${hotel.name}</h6>
                        <div class="hotel-rating">
                            <div class="stars">${starsHTML}</div>
                            <span>${hotel.rating}</span>
                        </div>
                        <div class="hotel-price">From $${hotel.price}/night</div>
                    </div>
                </div>
            `;
        });
    }
    
    async function loadReviews() {
        try {
            const response = await fetch(`http://localhost:3000/api/comments?tourId=${currentTour._id}`);
            const reviews = await response.json();
            
            displayReviews(reviews);
        } catch (error) {
            console.error('Error loading reviews:', error);
            displaySampleReviews();
        }
    }
    
    function displayReviews(reviews) {
        const reviewsList = document.getElementById('reviewsList');
        if (!reviewsList) return;
        
        if (reviews.length === 0) {
            displaySampleReviews();
            return;
        }
        
        reviewsList.innerHTML = '';
        
        reviews.forEach(review => {
            const starsHTML = generateStarsHTML(review.content?.rating || 5);
            const date = new Date(review.createdAt).toLocaleDateString();
            
            reviewsList.innerHTML += `
                <div class="review-item">
                    <div class="review-header">
                        <div class="reviewer-info">
                            <img src="https://images.unsplash.com/photo-1494790108755-2616b612b786?w=50&h=50&fit=crop&crop=face" 
                                 alt="Reviewer" class="reviewer-avatar">
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
                            <i class="fas fa-thumbs-up"></i> Helpful
                        </button>
                        <button class="review-action" onclick="reportReview('${review._id}')">
                            <i class="fas fa-flag"></i> Report
                        </button>
                    </div>
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
    
    async function loadGallery() {
        const galleryGrid = document.getElementById('galleryGrid');
        if (!galleryGrid) return;
        
        // Create sample gallery if no images provided
        const galleryImages = currentTour.gallery || [
            currentTour.img,
            'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=200&fit=crop',
            'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=300&h=200&fit=crop',
            'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&h=200&fit=crop',
            'https://images.unsplash.com/photo-1502780402662-acc01917476e?w=300&h=200&fit=crop',
            'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=300&h=200&fit=crop'
        ];
        
        galleryGrid.innerHTML = '';
        
        galleryImages.forEach((image, index) => {
            galleryGrid.innerHTML += `
                <div class="gallery-item" onclick="openLightbox('${image}', ${index})">
                    <img src="${image}" alt="Tour Gallery ${index + 1}" class="gallery-img">
                </div>
            `;
        });
    }
    
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
        
        // Add review button
        const addReviewBtn = document.getElementById('addReviewBtn');
        if (addReviewBtn) {
            addReviewBtn.addEventListener('click', function() {
                if (!currentUser) {
                    showAlert('Please login to write a review', 'warning');
                    return;
                }
                $('#reviewModal').modal('show');
            });
        }
        
        // Review form submission
        const reviewForm = document.getElementById('reviewForm');
        if (reviewForm) {
            reviewForm.addEventListener('submit', submitReview);
        }
        
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
        
        if (wishlistItems.includes(tourId)) {
            // Remove from wishlist
            wishlistItems = wishlistItems.filter(id => id !== tourId);
            wishlistBtn.classList.remove('active');
            wishlistBtn.innerHTML = '<i class="far fa-heart"></i>';
            showAlert('Removed from wishlist', 'info');
        } else {
            // Add to wishlist
            wishlistItems.push(tourId);
            wishlistBtn.classList.add('active');
            wishlistBtn.innerHTML = '<i class="fas fa-heart"></i>';
            showAlert('Added to wishlist', 'success');
        }
        
        localStorage.setItem('wishlist', JSON.stringify(wishlistItems));
        
        // Animate button
        wishlistBtn.style.transform = 'scale(1.2)';
        setTimeout(() => {
            wishlistBtn.style.transform = 'scale(1)';
        }, 200);
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
        if (!currentTour) return;
        
        const adults = parseInt(document.querySelector('.traveler-item:first-child .quantity').textContent) || 0;
        const children = parseInt(document.querySelector('.traveler-item:last-child .quantity').textContent) || 0;
        
        const adultPrice = currentTour.pricing?.adult || currentTour.estimatedCost;
        const childPrice = currentTour.pricing?.child || Math.round(adultPrice * 0.7);
        const servicePrice = 50;
        
        const subtotal = (adults * adultPrice) + (children * childPrice);
        const total = subtotal + servicePrice;
        
        // Update price breakdown
        const priceBreakdown = document.querySelector('.price-breakdown');
        if (priceBreakdown) {
            priceBreakdown.innerHTML = `
                <div class="price-row">
                    <span>Adults x ${adults}</span>
                    <span>$${(adults * adultPrice).toLocaleString()}</span>
                </div>
                <div class="price-row">
                    <span>Children x ${children}</span>
                    <span>$${(children * childPrice).toLocaleString()}</span>
                </div>
                <div class="price-row">
                    <span>Service Fee</span>
                    <span>$${servicePrice}</span>
                </div>
                <div class="price-row total">
                    <span>Total</span>
                    <span>$${total.toLocaleString()}</span>
                </div>
            `;
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
    
    async function handleBookNow() {
      if (!currentUser) {
          showAlert('Vui lòng đăng nhập để đặt tour', 'warning');
          setTimeout(() => {
              window.location.href = 'login.html';
          }, 2000);
          return;
      }
      
      if (!validateBookingForm()) {
          showAlert('Vui lòng điền đầy đủ thông tin bắt buộc', 'error');
          return;
      }
      
      const bookingData = {
          tourId: currentTour._id,
          userId: currentUser._id || currentUser.id,
          checkinDate: document.getElementById('checkinDate').value,
          adults: parseInt(document.querySelector('.traveler-item:first-child .quantity').textContent),
          children: parseInt(document.querySelector('.traveler-item:last-child .quantity').textContent),
          totalPrice: calculateTotalPrice(),
          status: 'pending'
      };
      
      try {
          showLoadingState();
          
          const response = await fetch('http://localhost:3000/api/bookings', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('userId')}` // Sử dụng userId thay vì authToken
              },
              body: JSON.stringify(bookingData)
          });
          
          if (response.ok) {
              const result = await response.json();
              showAlert('Đặt tour thành công! Chúng tôi sẽ liên hệ với bạn sớm.', 'success');
              
              // Track booking event
              trackEvent('tour_booked', {
                  tour_id: currentTour._id,
                  tour_name: currentTour.name,
                  total_price: bookingData.totalPrice
              });
          } else {
              throw new Error('Booking failed');
          }
          
      } catch (error) {
          console.error('Booking error:', error);
          showAlert('Có lỗi xảy ra khi đặt tour. Vui lòng thử lại.', 'error');
      } finally {
          hideLoadingState();
      }
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
            'chi tiết tour': `Tour ${currentTour?.name} có thời gian ${currentTour?.duration}, giá ${currentTour?.estimatedCost}$. Bao gồm ${currentTour?.inclusions?.length || 4} dịch vụ chính.`,
            'giá': `Giá tour này là $${currentTour?.estimatedCost?.toLocaleString()} cho người lớn. Trẻ em được giảm 30%.`,
            'khách sạn': 'Chúng tôi có nhiều khách sạn chất lượng từ 3-5 sao. Bạn có thể xem danh sách khách sạn bên phải.',
            'đặt tour': 'Để đặt tour, vui lòng chọn ngày và số lượng khách, sau đó nhấn "Book Now".',
            'default': 'Cảm ơn bạn đã liên hệ! Tôi có thể giúp bạn về thông tin tour, giá cả, đặt phòng. Bạn cần hỗ trợ gì cụ thể?'
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
    
    async function submitReview(e) {
      e.preventDefault();
      
      if (!currentUser) {
          showAlert('Vui lòng đăng nhập để viết đánh giá', 'warning');
          return;
      }
      
      const form = e.target;
      const formData = new FormData(form);
      
      const reviewData = {
          tourId: currentTour._id,
          userId: currentUser._id || currentUser.id,
          content: {
              text: formData.get('review'),
              rating: parseInt(document.querySelector('.rating-input').dataset.rating) || 5
          },
          verified: {
              isVerified: false // Will be verified after booking confirmation
          }
      };
      
      try {
          const response = await fetch('http://localhost:3000/api/comments', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('userId')}`
              },
              body: JSON.stringify(reviewData)
          });
          
          if (response.ok) {
              showAlert('Đánh giá đã được gửi thành công!', 'success');
              $('#reviewModal').modal('hide');
              
              // Reload reviews
              loadReviews();
          } else {
              throw new Error('Review submission failed');
          }
          
      } catch (error) {
          console.error('Review submission error:', error);
          showAlert('Có lỗi xảy ra khi gửi đánh giá. Vui lòng thử lại.', 'error');
      }
  }
    
    function likeReview(reviewId) {
        // Implement like functionality
        const likeBtn = event.target.closest('.review-action');
        if (!likeBtn) return;
        
        likeBtn.classList.toggle('active');
        
        const icon = likeBtn.querySelector('i');
        if (likeBtn.classList.contains('active')) {
            icon.className = 'fas fa-thumbs-up';
            showAlert('Thanks for your feedback!', 'success');
        } else {
            icon.className = 'far fa-thumbs-up';
        }
        
        // Track like event
        trackEvent('review_liked', {
            review_id: reviewId,
            tour_id: currentTour?._id
        });
    }
    
    // ...existing code...

    function reportReview(reviewId) {
        if (confirm('Are you sure you want to report this review?')) {
            // Implement report functionality
            trackEvent('review_reported', {
                review_id: reviewId,
                tour_id: currentTour?._id
            });
            
            showAlert('Review reported. We will investigate and take appropriate action.', 'info');
        }
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
    
    function showAlert(message, type = 'info') {
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.alert-notification');
        existingAlerts.forEach(alert => alert.remove());
        
        // Color scheme for different alert types
        const alertColors = {
            success: { bg: '#d4edda', border: '#c3e6cb', text: '#155724', icon: '#28a745' },
            error: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24', icon: '#dc3545' },
            warning: { bg: '#fff3cd', border: '#ffeaa7', text: '#856404', icon: '#ffc107' },
            info: { bg: '#fff0e6', border: '#ff9666', text: '#cc4400', icon: '#ff6600' }
        };
        
        const colors = alertColors[type] || alertColors.info;
        
        // Create new alert
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-notification`;
        alert.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            padding: 15px 20px;
            border-radius: 10px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            animation: slideInRight 0.3s ease;
            background: ${colors.bg};
            border: 1px solid ${colors.border};
            color: ${colors.text};
        `;
        
        // Add icon based on type
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        alert.innerHTML = `
            <i class="${icons[type] || icons.info}" style="color: ${colors.icon}"></i>
            <span>${message}</span>
            <button class="close-alert" style="margin-left: auto; background: none; border: none; font-size: 18px; cursor: pointer; color: ${colors.text};">&times;</button>
        `;
        
        document.body.appendChild(alert);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => alert.remove(), 300);
            }
        }, 5000);
        
        // Add close button functionality
        alert.querySelector('.close-alert').addEventListener('click', () => {
            alert.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => alert.remove(), 300);
        });
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