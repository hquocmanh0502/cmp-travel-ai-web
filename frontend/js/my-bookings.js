document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 My Bookings page initialized');
    
    // Check authentication
    if (!checkUserAuth()) return;
    
    // Initialize page components
    initializeBookingsPage();
    
    // Load user bookings
    loadUserBookings();
    
    // Setup event listeners
    setupEventListeners();
});

// Global variables
let allBookings = [];
let filteredBookings = [];
let currentBooking = null;

function checkUserAuth() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        showNotification('Please login to view your booking history', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return false;
    }
    return true;
}

function initializeBookingsPage() {
    // Update page title
    document.title = 'Booking History - CMP Travel';
    
    // Show loading state
    showLoadingState();
    
    // Initialize filters
    initializeFilters();
    
    console.log('✅ My Bookings page initialized');
}

async function loadUserBookings() {
    try {
        const userId = localStorage.getItem('userId');
        const token = localStorage.getItem('authToken') || userId;
        
        console.log('🔄 Loading bookings for user:', userId);
        
        // ✅ Call real API endpoint
        const response = await fetch(`/api/bookings/user/${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch bookings');
        }
        
        const data = await response.json();
        
        if (data.success && data.bookings) {
            // ✅ Transform API data to match frontend format
            allBookings = data.bookings.map(booking => ({
                id: booking.bookingId || booking._id,
                tourId: booking.tourId?._id || booking.tourId,
                tourName: booking.tourId?.title || 'Unknown Tour',
                tourImage: booking.tourId?.images?.[0] || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=300',
                destination: booking.tourId?.destination || 'Unknown',
                duration: booking.tourId?.duration || 'N/A',
                status: booking.status,
                bookingDate: new Date(booking.bookingDate).toISOString().split('T')[0],
                departureDate: new Date(booking.departureDate).toISOString().split('T')[0],
                checkinDate: new Date(booking.checkinDate).toISOString().split('T')[0],
                checkoutDate: new Date(booking.checkoutDate).toISOString().split('T')[0],
                adults: booking.adults,
                children: booking.children,
                infants: booking.infants,
                totalAmount: booking.totalAmount,
                paymentStatus: booking.paymentStatus,
                paymentMethod: booking.paymentMethod,
                rooms: booking.rooms,
                services: booking.services,
                customerInfo: {
                    name: booking.customerInfo?.fullName || 'N/A',
                    email: booking.customerInfo?.email || 'N/A',
                    phone: booking.customerInfo?.phone || 'N/A',
                    title: booking.customerInfo?.title || 'Mr'
                },
                hotelName: booking.hotelId?.name || 'No hotel selected',
                _rawBooking: booking // Keep original data for reference
            }));
            
            filteredBookings = [...allBookings];
            
            // Update statistics
            updateBookingStats();
            
            // Display bookings
            displayBookings(filteredBookings);
            
            console.log('✅ Bookings loaded from API:', allBookings.length);
        } else {
            // No bookings found
            allBookings = [];
            filteredBookings = [];
            updateBookingStats();
            showEmptyState('You have no bookings yet');
        }
        
        // Hide loading state
        hideLoadingState();
        
    } catch (error) {
        console.error('❌ Error loading bookings:', error);
        showNotification('Failed to load booking history', 'error');
        hideLoadingState();
        showEmptyState('An error occurred while loading data');
    }
}

function generateMockBookings(userId) {
    const tours = [
        {
            id: 'tour-001',
            name: 'Tokyo Cherry Blossom Tour',
            image: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=300',
            destination: 'Tokyo, Japan',
            duration: '7 days 6 nights'
        },
        {
            id: 'tour-002', 
            name: 'Paris Romance Getaway',
            image: 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=300',
            destination: 'Paris, France',
            duration: '5 days 4 nights'
        },
        {
            id: 'tour-003',
            name: 'Maldives Paradise',
            image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300',
            destination: 'Maldives',
            duration: '4 days 3 nights'
        },
        {
            id: 'tour-004',
            name: 'Swiss Alps Adventure',
            image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=300',
            destination: 'Switzerland',
            duration: '6 days 5 nights'
        },
        {
            id: 'tour-005',
            name: 'Bali Cultural Journey',
            image: 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=300',
            destination: 'Bali, Indonesia',
            duration: '8 days 7 nights'
        },
        {
            id: 'tour-006',
            name: 'Iceland Northern Lights',
            image: 'https://images.unsplash.com/photo-1539066436319-6a24b3c7c3a6?w=300',
            destination: 'Reykjavik, Iceland',
            duration: '6 days 5 nights'
        }
    ];
    
    const statuses = ['confirmed', 'pending', 'completed', 'cancelled'];
    const mockBookings = [];
    
    for (let i = 0; i < 10; i++) {
        const tour = tours[Math.floor(Math.random() * tours.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const bookingDate = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000); // Last 60 days
        const departureDate = new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000); // Next 90 days
        
        mockBookings.push({
            id: `BOOK${Date.now() + i}${Math.random().toString(36).substr(2, 5)}`,
            tourId: tour.id,
            tourName: tour.name,
            tourImage: tour.image,
            destination: tour.destination,
            duration: tour.duration,
            status: status,
            bookingDate: bookingDate.toISOString().split('T')[0],
            departureDate: departureDate.toISOString().split('T')[0],
            adults: Math.floor(Math.random() * 4) + 1,
            children: Math.floor(Math.random() * 3),
            totalAmount: (Math.floor(Math.random() * 5000) + 1000),
            paymentStatus: status === 'cancelled' ? 'refunded' : 'paid',
            customerInfo: {
                name: localStorage.getItem('userFullName') || 'John Doe',
                email: localStorage.getItem('userEmail') || 'user@example.com',
                phone: '+1 (555) 123-4567'
            }
        });
    }
    
    return mockBookings.sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate));
}

function updateBookingStats() {
    const stats = {
        total: allBookings.length,
        confirmed: allBookings.filter(b => b.status === 'confirmed').length,
        pending: allBookings.filter(b => b.status === 'pending').length,
        completed: allBookings.filter(b => b.status === 'completed').length
    };
    
    document.getElementById('totalBookings').textContent = stats.total;
    document.getElementById('confirmedBookings').textContent = stats.confirmed;
    document.getElementById('pendingBookings').textContent = stats.pending;
    document.getElementById('completedBookings').textContent = stats.completed;
}

function displayBookings(bookings) {
    const container = document.getElementById('bookingsContainer');
    
    if (!bookings || bookings.length === 0) {
        showEmptyState();
        return;
    }
    
    container.innerHTML = bookings.map(booking => `
        <div class="booking-card" data-booking-id="${booking.id}">
            <div class="booking-card-header">
                <div class="booking-header-row">
                    <div class="booking-id">Booking ID: #${booking.id}</div>
                    <div class="booking-badges">
                        <div class="booking-status status-${booking.status}">
                            ${getStatusText(booking.status)}
                        </div>
                        <div class="payment-status payment-${booking.paymentStatus}">
                            ${getPaymentStatusBadge(booking.paymentStatus)}
                        </div>
                    </div>
                </div>
                <div class="booking-tour-info">
                    <img src="${booking.tourImage}" alt="${booking.tourName}" class="tour-thumbnail">
                    <div class="tour-details">
                        <h3>${booking.tourName}</h3>
                        <div class="tour-meta">
                            <span><i class="fas fa-map-marker-alt"></i> ${booking.destination}</span>
                            <span><i class="fas fa-clock"></i> ${booking.duration}</span>
                            <span><i class="fas fa-calendar"></i> ${formatDate(booking.departureDate)}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="booking-card-body">
                <div class="booking-details">
                    <div class="detail-item">
                        <i class="fas fa-calendar-check"></i>
                        <span class="detail-label">Booking Date:</span>
                        <span class="detail-value">${formatDate(booking.bookingDate)}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-users"></i>
                        <span class="detail-label">Guests:</span>
                        <span class="detail-value">${booking.adults} adult${booking.adults > 1 ? 's' : ''}${booking.children > 0 ? `, ${booking.children} child${booking.children > 1 ? 'ren' : ''}` : ''}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-dollar-sign"></i>
                        <span class="detail-label">Total Amount:</span>
                        <span class="detail-value">$${booking.totalAmount.toLocaleString()}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-credit-card"></i>
                        <span class="detail-label">Payment:</span>
                        <span class="detail-value">${getPaymentStatusText(booking.paymentStatus)}</span>
                    </div>
                </div>
                <div class="booking-actions">
                    <button class="btn btn-outline" onclick="viewBookingDetails('${booking.id}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    ${booking.paymentStatus === 'unpaid' && booking.status === 'pending' ? `
                        <button class="btn btn-primary" onclick="payNow('${booking.id}')">
                            <i class="fas fa-credit-card"></i> Pay Now
                        </button>
                    ` : ''}
                    ${booking.status === 'confirmed' ? `
                        <button class="btn btn-outline" onclick="downloadTicket('${booking.id}')">
                            <i class="fas fa-download"></i> Download Ticket
                        </button>
                    ` : ''}
                    ${booking.status === 'pending' ? `
                        <button class="btn btn-danger" onclick="cancelBooking('${booking.id}')">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    ` : ''}
                    ${booking.status === 'completed' ? `
                        <button class="btn btn-outline" onclick="writeReview('${booking.tourId}')">
                            <i class="fas fa-star"></i> Write Review
                        </button>
                        <button class="btn btn-primary" onclick="rebookTour('${booking.tourId}')">
                            <i class="fas fa-redo"></i> Book Again
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

function showEmptyState(message = 'You haven\'t booked any tours yet') {
    const container = document.getElementById('bookingsContainer');
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">
                <i class="fas fa-calendar-times"></i>
            </div>
            <h3>No Bookings Found</h3>
            <p>${message}</p>
            <button class="btn btn-primary" onclick="window.location.href='destination.html'">
                <i class="fas fa-search"></i> Explore Tours
            </button>
        </div>
    `;
}

function initializeFilters() {
    // Set up date filters
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (startDateInput && endDateInput) {
        // Set default date range (last 3 months)
        const today = new Date();
        const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
        
        startDateInput.value = threeMonthsAgo.toISOString().split('T')[0];
        endDateInput.value = today.toISOString().split('T')[0];
    }
}

function setupEventListeners() {
    // Filter event listeners
    const filterForm = document.getElementById('filterForm');
    if (filterForm) {
        filterForm.addEventListener('submit', handleFilterSubmit);
    }
    
    const resetBtn = document.getElementById('resetFilters');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetFilters);
    }
    
    // Search input with debounce
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                applyFilters();
            }, 300);
        });
    }
    
    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }
    
    // Date filters
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    
    if (startDate) startDate.addEventListener('change', applyFilters);
    if (endDate) endDate.addEventListener('change', applyFilters);
}

function handleFilterSubmit(e) {
    e.preventDefault();
    applyFilters();
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const startDate = document.getElementById('startDate')?.value || '';
    const endDate = document.getElementById('endDate')?.value || '';
    
    filteredBookings = allBookings.filter(booking => {
        // Search filter
        const matchesSearch = !searchTerm || 
            booking.tourName.toLowerCase().includes(searchTerm) ||
            booking.destination.toLowerCase().includes(searchTerm) ||
            booking.id.toLowerCase().includes(searchTerm);
        
        // Status filter
        const matchesStatus = !statusFilter || booking.status === statusFilter;
        
        // Date filter
        const bookingDate = new Date(booking.bookingDate);
        const matchesDate = (!startDate || bookingDate >= new Date(startDate)) &&
                           (!endDate || bookingDate <= new Date(endDate));
        
        return matchesSearch && matchesStatus && matchesDate;
    });
    
    displayBookings(filteredBookings);
    
    // Update results count
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) {
        resultsCount.textContent = `Showing ${filteredBookings.length} of ${allBookings.length} bookings`;
    }
}

function resetFilters() {
    // Reset form
    const filterForm = document.getElementById('filterForm');
    if (filterForm) {
        filterForm.reset();
    }
    
    // Reset date range
    initializeFilters();
    
    // Show all bookings
    filteredBookings = [...allBookings];
    displayBookings(filteredBookings);
    
    showNotification('Filters have been reset', 'success');
}

// Booking actions
function viewBookingDetails(bookingId) {
    const booking = allBookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    showBookingModal(booking);
}

function showBookingModal(booking) {
    // Format rooms information
    const roomsList = booking.rooms ? Object.entries(booking.rooms)
        .filter(([key, value]) => value > 0)
        .map(([key, value]) => {
            const roomNames = {
                superior: 'Superior',
                juniorDeluxe: 'Junior Deluxe',
                deluxe: 'Deluxe',
                suite: 'Suite',
                family: 'Family',
                president: 'President'
            };
            return `${value} x ${roomNames[key] || key}`;
        }).join(', ') : 'No rooms selected';
    
    // Format services
    const servicesList = [];
    if (booking.services?.meals) {
        const meals = [];
        if (booking.services.meals.breakfast) meals.push('Breakfast');
        if (booking.services.meals.lunch) meals.push('Lunch');
        if (booking.services.meals.dinner) meals.push('Dinner');
        if (meals.length > 0) servicesList.push(`Meals: ${meals.join(', ')}`);
    }
    if (booking.services?.transfer && booking.services.transfer !== 'none') {
        const transferNames = {
            'airport': 'Airport Transfer',
            'hotel': 'Hotel Transfer',
            'both': 'Airport + Hotel Transfer'
        };
        servicesList.push(`Transfer: ${transferNames[booking.services.transfer] || booking.services.transfer}`);
    }
    if (booking.services?.tourGuide) {
        servicesList.push('Tour Guide included');
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Booking Details</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="booking-detail-info">
                    <h4>${booking.tourName}</h4>
                    <p><strong>Booking ID:</strong> #${booking.id}</p>
                    <p><strong>Hotel:</strong> ${booking.hotelName || 'Not selected'}</p>
                    <p><strong>Destination:</strong> ${booking.destination}</p>
                    <p><strong>Duration:</strong> ${booking.duration}</p>
                    <p><strong>Check-in Date:</strong> ${formatDate(booking.checkinDate)}</p>
                    <p><strong>Check-out Date:</strong> ${formatDate(booking.checkoutDate)}</p>
                    <p><strong>Departure Date:</strong> ${formatDate(booking.departureDate)}</p>
                    <p><strong>Guests:</strong> ${booking.adults} adult${booking.adults > 1 ? 's' : ''}${booking.children > 0 ? `, ${booking.children} child${booking.children > 1 ? 'ren' : ''}` : ''}${booking.infants > 0 ? `, ${booking.infants} infant${booking.infants > 1 ? 's' : ''}` : ''}</p>
                    
                    <h5 style="margin-top: 1.5rem;">Rooms</h5>
                    <p>${roomsList}</p>
                    
                    ${servicesList.length > 0 ? `
                        <h5 style="margin-top: 1.5rem;">Services</h5>
                        <ul style="padding-left: 1.5rem;">
                            ${servicesList.map(s => `<li>${s}</li>`).join('')}
                        </ul>
                    ` : ''}
                    
                    <h5 style="margin-top: 1.5rem;">Payment Information</h5>
                    <p><strong>Total Amount:</strong> <span style="font-size: 1.3rem; color: #ff6600;">$${booking.totalAmount.toLocaleString()}</span></p>
                    <p><strong>Payment Status:</strong> <span class="payment-status payment-${booking.paymentStatus}">${getPaymentStatusBadge(booking.paymentStatus)}</span></p>
                    ${booking.paymentMethod ? `<p><strong>Payment Method:</strong> ${booking.paymentMethod.replace('_', ' ').toUpperCase()}</p>` : ''}
                    <p><strong>Booking Status:</strong> <span class="booking-status status-${booking.status}">${getStatusText(booking.status)}</span></p>
                    
                    <h5 style="margin-top: 1.5rem;">Customer Information</h5>
                    <p><strong>Name:</strong> ${booking.customerInfo.title || 'Mr'}. ${booking.customerInfo.name}</p>
                    <p><strong>Email:</strong> ${booking.customerInfo.email}</p>
                    <p><strong>Phone:</strong> ${booking.customerInfo.phone}</p>
                </div>
            </div>
            <div class="modal-footer">
                ${booking.paymentStatus === 'unpaid' && booking.status === 'pending' ? `
                    <button class="btn btn-primary" onclick="payNow('${booking.id}')">
                        <i class="fas fa-credit-card"></i> Pay Now
                    </button>
                ` : ''}
                ${booking.status === 'confirmed' ? `
                    <button class="btn btn-primary" onclick="downloadTicket('${booking.id}')">
                        <i class="fas fa-download"></i> Download Ticket
                    </button>
                ` : ''}
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                    Close
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
}

function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    const booking = allBookings.find(b => b.id === bookingId);
    if (booking) {
        booking.status = 'cancelled';
        booking.paymentStatus = 'refunded';
        
        // Update display
        updateBookingStats();
        applyFilters();
        
        showNotification('Booking cancelled successfully', 'success');
    }
}

function downloadTicket(bookingId) {
    showNotification('Downloading e-ticket...', 'info');
    
    // Simulate download
    setTimeout(() => {
        showNotification('E-ticket downloaded successfully', 'success');
    }, 2000);
}

function writeReview(tourId) {
    showNotification('Redirecting to review page...', 'info');
    setTimeout(() => {
        window.location.href = `detail.html?id=${tourId}#reviews`;
    }, 1000);
}

function rebookTour(tourId) {
    showNotification('Redirecting to tour booking...', 'info');
    setTimeout(() => {
        window.location.href = `detail.html?id=${tourId}`;
    }, 1000);
}

function payNow(bookingId) {
    const booking = allBookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    showNotification('Payment feature will be available soon!', 'info');
    
    // TODO: Implement payment logic with CMP Wallet
    // For now, just show a placeholder message
    setTimeout(() => {
        const confirmPay = confirm(`Pay $${booking.totalAmount.toLocaleString()} for booking #${booking.id}?\n\nNote: Payment feature is under development. This will be connected to your CMP Wallet.`);
        
        if (confirmPay) {
            showNotification('Payment processing... (Feature coming soon)', 'info');
            // Close modal
            document.querySelector('.modal-overlay')?.remove();
        }
    }, 500);
}

// Utility functions
function getStatusText(status) {
    const statusMap = {
        'confirmed': 'Confirmed',
        'pending': 'Pending',
        'cancelled': 'Cancelled',
        'completed': 'Completed'
    };
    return statusMap[status] || status;
}

function getPaymentStatusText(status) {
    const statusMap = {
        'paid': 'Paid',
        'unpaid': 'Unpaid',
        'partial': 'Partially Paid',
        'pending': 'Pending Payment',
        'refunded': 'Refunded'
    };
    return statusMap[status] || status;
}

function getPaymentStatusBadge(status) {
    const icons = {
        'paid': 'fa-check-circle',
        'unpaid': 'fa-exclamation-circle',
        'partial': 'fa-clock',
        'pending': 'fa-clock',
        'refunded': 'fa-undo'
    };
    const icon = icons[status] || 'fa-question-circle';
    return `<i class="fas ${icon}"></i> ${getPaymentStatusText(status)}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function showLoadingState() {
    const container = document.getElementById('bookingsContainer');
    container.innerHTML = `
        <div class="loading-card">
            <div class="loading-spinner"></div>
            <p>Loading booking history...</p>
        </div>
    `;
}

function hideLoadingState() {
    // Loading state will be replaced by actual content
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#ff6600'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 500;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Export functions for global use
window.viewBookingDetails = viewBookingDetails;
window.cancelBooking = cancelBooking;
window.downloadTicket = downloadTicket;
window.writeReview = writeReview;
window.rebookTour = rebookTour;