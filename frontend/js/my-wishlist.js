document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 My Wishlist page initialized');
    
    // Check authentication
    if (!checkUserAuth()) return;
    
    // Initialize page components
    initializeWishlistPage();
    
    // Load wishlist data
    loadWishlistData();
    
    // Setup event listeners
    setupEventListeners();
});

// Global variables
let allWishlistItems = [];
let filteredWishlistItems = [];
let currentView = 'grid';
let selectedItems = [];

function checkUserAuth() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        showNotification('Vui lòng đăng nhập để xem danh sách yêu thích', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return false;
    }
    return true;
}

function initializeWishlistPage() {
    // Update page title
    document.title = 'Danh sách yêu thích - CMP Travel';
    
    // Show loading state
    showLoadingState();
    
    // Initialize filters
    initializeFilters();
    
    console.log('✅ My Wishlist page initialized');
}

async function loadWishlistData() {
    try {
        // Get wishlist from localStorage
        const wishlistIds = JSON.parse(localStorage.getItem('wishlist') || '[]');
        
        if (wishlistIds.length === 0) {
            hideLoadingState();
            showEmptyState();
            return;
        }
        
        // Simulate loading delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Load tour data for wishlist items
        const wishlistItems = await loadToursFromWishlist(wishlistIds);
        
        allWishlistItems = wishlistItems;
        filteredWishlistItems = [...allWishlistItems];
        
        // Update statistics
        updateWishlistStats();
        
        // Display wishlist items
        displayWishlistItems(filteredWishlistItems);
        
        // Hide loading state
        hideLoadingState();
        
        console.log('✅ Wishlist loaded:', allWishlistItems.length, 'items');
        
    } catch (error) {
        console.error('Error loading wishlist:', error);
        showNotification('Không thể tải danh sách yêu thích', 'error');
        hideLoadingState();
        showEmptyState('Có lỗi xảy ra khi tải dữ liệu');
    }
}

async function loadToursFromWishlist(wishlistIds) {
    // Mock function to load tours - replace with actual API call
    const mockTours = [
        {
            _id: 'tour-001',
            name: 'Tokyo Cherry Blossom Adventure',
            country: 'Japan',
            estimatedCost: 4500,
            rating: 4.8,
            img: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=400',
            duration: '7 ngày 6 đêm',
            category: 'Cultural',
            description: 'Khám phá vẻ đẹp của hoa anh đào Nhật Bản'
        },
        {
            _id: 'tour-002',
            name: 'Maldives Paradise Escape',
            country: 'Maldives',
            estimatedCost: 6200,
            rating: 4.9,
            img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
            duration: '5 ngày 4 đêm',
            category: 'Beach',
            description: 'Thiên đường biển xanh với resort cao cấp'
        },
        {
            _id: 'tour-003',
            name: 'Swiss Alps Mountain Trek',
            country: 'Switzerland',
            estimatedCost: 3800,
            rating: 4.7,
            img: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400',
            duration: '6 ngày 5 đêm',
            category: 'Adventure',
            description: 'Chinh phục đỉnh núi Alps hùng vĩ'
        },
        {
            _id: 'tour-004',
            name: 'Paris Romance Getaway',
            country: 'France',
            estimatedCost: 4100,
            rating: 4.6,
            img: 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=400',
            duration: '4 ngày 3 đêm',
            category: 'Romance',
            description: 'Thành phố tình yêu với những trải nghiệm lãng mạn'
        },
        {
            _id: 'tour-005',
            name: 'Bali Cultural Journey',
            country: 'Indonesia',
            estimatedCost: 2800,
            rating: 4.5,
            img: 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=400',
            duration: '8 ngày 7 đêm',
            category: 'Cultural',
            description: 'Khám phá văn hóa độc đáo của đảo Bali'
        }
    ];
    
    // Filter tours that are in wishlist and add dateAdded
    const wishlistItems = mockTours
        .filter(tour => wishlistIds.includes(tour._id))
        .map(tour => ({
            ...tour,
            dateAdded: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
            originalPrice: tour.estimatedCost + Math.floor(Math.random() * 1000)
        }));
    
    return wishlistItems;
}

function updateWishlistStats() {
    const totalItems = allWishlistItems.length;
    const totalValue = allWishlistItems.reduce((sum, item) => sum + item.estimatedCost, 0);
    const averageRating = totalItems > 0 ? 
        (allWishlistItems.reduce((sum, item) => sum + item.rating, 0) / totalItems).toFixed(1) : 0;
    
    // Find most common destination
    const destinations = allWishlistItems.map(item => item.country);
    const topDestination = destinations.length > 0 ? 
        destinations.reduce((a, b, i, arr) => 
            arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
        ) : 'N/A';
    
    // Update display
    document.getElementById('totalItems').textContent = totalItems;
    document.getElementById('totalValue').textContent = `$${totalValue.toLocaleString()}`;
    document.getElementById('averageRating').textContent = averageRating;
    document.getElementById('topDestination').textContent = topDestination;
}

function displayWishlistItems(items) {
    const container = document.getElementById('wishlistContainer');
    
    if (!items || items.length === 0) {
        showEmptyState();
        return;
    }
    
    // Update results count
    updateResultsCount(items.length);
    
    container.innerHTML = items.map(item => `
        <div class="wishlist-item ${currentView === 'list' ? 'list-view' : ''}" data-id="${item._id}">
            <div class="item-checkbox">
                <input type="checkbox" value="${item._id}" onchange="handleItemSelection(this)">
            </div>
            
            <div class="item-image">
                <img src="${item.img}" alt="${item.name}" loading="lazy">
                <div class="item-badges">
                    ${item.estimatedCost < item.originalPrice ? '<div class="item-badge sale">SALE</div>' : ''}
                    ${item.rating >= 4.8 ? '<div class="item-badge hot">HOT</div>' : ''}
                </div>
                <div class="date-added">
                    Thêm: ${formatDate(item.dateAdded)}
                </div>
            </div>
            
            <div class="item-content">
                <div class="item-header">
                    <h3 class="item-title">${item.name}</h3>
                    <div class="item-rating">
                        <i class="fas fa-star"></i>
                        <span>${item.rating}</span>
                    </div>
                </div>
                
                <div class="item-details">
                    <div class="item-detail">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${item.country}</span>
                    </div>
                    <div class="item-detail">
                        <i class="fas fa-clock"></i>
                        <span>${item.duration}</span>
                    </div>
                    <div class="item-detail">
                        <i class="fas fa-tag"></i>
                        <span>${item.category}</span>
                    </div>
                </div>
                
                <div class="item-price">
                    $${item.estimatedCost.toLocaleString()}
                    ${item.originalPrice > item.estimatedCost ? 
                        `<span class="old-price">$${item.originalPrice.toLocaleString()}</span>` : ''}
                </div>
                
                <div class="item-actions">
                    <button class="btn" onclick="viewTourDetails('${item._id}')">
                        <i class="fas fa-eye"></i> Xem chi tiết
                    </button>
                    <button class="btn btn-outline" onclick="bookTour('${item._id}')">
                        <i class="fas fa-calendar-plus"></i> Đặt tour
                    </button>
                    <button class="btn remove-btn" onclick="removeFromWishlist('${item._id}')">
                        <i class="fas fa-heart-broken"></i> Xóa
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    // Animate items
    const itemElements = container.querySelectorAll('.wishlist-item');
    itemElements.forEach((item, index) => {
        item.style.animationDelay = `${index * 0.1}s`;
    });
}

function showEmptyState(message = 'Bạn chưa có tour nào trong danh sách yêu thích') {
    const container = document.getElementById('wishlistContainer');
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">
                <i class="fas fa-heart-broken"></i>
            </div>
            <h3>Danh sách yêu thích trống</h3>
            <p>${message}</p>
            <button class="btn" onclick="window.location.href='destination.html'">
                <i class="fas fa-search"></i> Khám phá tour
            </button>
        </div>
    `;
    
    // Update stats to zero
    document.getElementById('totalItems').textContent = '0';
    document.getElementById('totalValue').textContent = '$0';
    document.getElementById('averageRating').textContent = '0';
    document.getElementById('topDestination').textContent = 'N/A';
}

function initializeFilters() {
    // Price range slider
    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');
    
    if (priceRange && priceValue) {
        priceRange.addEventListener('input', function() {
            const value = this.value;
            priceValue.textContent = `$${parseInt(value).toLocaleString()}`;
            
            // Update slider background
            const percentage = (value - this.min) / (this.max - this.min) * 100;
            this.style.background = `linear-gradient(to right, #ff6600 ${percentage}%, #e9ecef ${percentage}%)`;
        });
        
        // Initialize slider background
        priceRange.dispatchEvent(new Event('input'));
    }
}

function setupEventListeners() {
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
    
    // Filter selects
    const categoryFilter = document.getElementById('categoryFilter');
    const sortBy = document.getElementById('sortBy');
    const priceRange = document.getElementById('priceRange');
    
    if (categoryFilter) categoryFilter.addEventListener('change', applyFilters);
    if (sortBy) sortBy.addEventListener('change', applyFilters);
    if (priceRange) priceRange.addEventListener('change', applyFilters);
    
    // Clear filters button
    const clearFiltersBtn = document.getElementById('clearFilters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearFilters);
    }
    
    // View toggle buttons
    const gridViewBtn = document.getElementById('gridView');
    const listViewBtn = document.getElementById('listView');
    
    if (gridViewBtn) {
        gridViewBtn.addEventListener('click', () => toggleView('grid'));
    }
    if (listViewBtn) {
        listViewBtn.addEventListener('click', () => toggleView('list'));
    }
    
    // Bulk action buttons
    const selectAllBtn = document.getElementById('selectAll');
    const removeSelectedBtn = document.getElementById('removeSelected');
    const shareSelectedBtn = document.getElementById('shareSelected');
    
    if (selectAllBtn) {
        selectAllBtn.addEventListener('change', handleSelectAll);
    }
    if (removeSelectedBtn) {
        removeSelectedBtn.addEventListener('click', removeSelectedItems);
    }
    if (shareSelectedBtn) {
        shareSelectedBtn.addEventListener('click', shareSelectedItems);
    }
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const maxPrice = parseInt(document.getElementById('priceRange')?.value || 10000);
    const sortBy = document.getElementById('sortBy')?.value || 'dateAdded-desc';
    
    // Filter items
    filteredWishlistItems = allWishlistItems.filter(item => {
        const matchesSearch = !searchTerm || 
            item.name.toLowerCase().includes(searchTerm) ||
            item.country.toLowerCase().includes(searchTerm) ||
            item.description.toLowerCase().includes(searchTerm);
        
        const matchesCategory = !categoryFilter || item.category === categoryFilter;
        const matchesPrice = item.estimatedCost <= maxPrice;
        
        return matchesSearch && matchesCategory && matchesPrice;
    });
    
    // Sort items
    filteredWishlistItems.sort((a, b) => {
        switch (sortBy) {
            case 'dateAdded-desc':
                return new Date(b.dateAdded) - new Date(a.dateAdded);
            case 'dateAdded-asc':
                return new Date(a.dateAdded) - new Date(b.dateAdded);
            case 'price-asc':
                return a.estimatedCost - b.estimatedCost;
            case 'price-desc':
                return b.estimatedCost - a.estimatedCost;
            case 'rating-desc':
                return b.rating - a.rating;
            case 'name-asc':
                return a.name.localeCompare(b.name);
            default:
                return 0;
        }
    });
    
    displayWishlistItems(filteredWishlistItems);
}

function clearFilters() {
    // Reset all filter inputs
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const priceRange = document.getElementById('priceRange');
    const sortBy = document.getElementById('sortBy');
    
    if (searchInput) searchInput.value = '';
    if (categoryFilter) categoryFilter.value = '';
    if (priceRange) {
        priceRange.value = 10000;
        priceRange.dispatchEvent(new Event('input'));
    }
    if (sortBy) sortBy.value = 'dateAdded-desc';
    
    // Reset filtered items
    filteredWishlistItems = [...allWishlistItems];
    displayWishlistItems(filteredWishlistItems);
    
    showNotification('Đã xóa tất cả bộ lọc', 'success');
}

function toggleView(viewType) {
    currentView = viewType;
    
    // Update button states
    const gridBtn = document.getElementById('gridView');
    const listBtn = document.getElementById('listView');
    
    if (gridBtn && listBtn) {
        gridBtn.classList.toggle('active', viewType === 'grid');
        listBtn.classList.toggle('active', viewType === 'list');
    }
    
    // Update container class
    const container = document.getElementById('wishlistContainer');
    if (container) {
        container.className = viewType === 'list' ? 'wishlist-grid list-view' : 'wishlist-grid';
    }
    
    // Re-display items with new view
    displayWishlistItems(filteredWishlistItems);
}

function handleItemSelection(checkbox) {
    const itemId = checkbox.value;
    
    if (checkbox.checked) {
        if (!selectedItems.includes(itemId)) {
            selectedItems.push(itemId);
        }
    } else {
        selectedItems = selectedItems.filter(id => id !== itemId);
    }
    
    updateBulkActions();
}

function handleSelectAll(event) {
    const checkboxes = document.querySelectorAll('.item-checkbox input[type="checkbox"]');
    const isChecked = event.target.checked;
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
        handleItemSelection(checkbox);
    });
}

function updateBulkActions() {
    const bulkActions = document.getElementById('bulkActions');
    const selectedCount = document.getElementById('selectedCount');
    
    if (selectedItems.length > 0) {
        bulkActions.classList.add('show');
        selectedCount.textContent = `${selectedItems.length} mục đã chọn`;
    } else {
        bulkActions.classList.remove('show');
    }
}

function updateResultsCount(count) {
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) {
        resultsCount.textContent = `Hiển thị ${count} trong số ${allWishlistItems.length} tour yêu thích`;
    }
}

// Action functions
function viewTourDetails(tourId) {
    window.location.href = `detail.html?id=${tourId}`;
}

function bookTour(tourId) {
    window.location.href = `detail.html?id=${tourId}#booking`;
}

function removeFromWishlist(tourId) {
    if (!confirm('Bạn có chắc chắn muốn xóa tour này khỏi danh sách yêu thích?')) return;
    
    // Remove from localStorage
    let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    wishlist = wishlist.filter(id => id !== tourId);
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    
    // Remove from arrays
    allWishlistItems = allWishlistItems.filter(item => item._id !== tourId);
    filteredWishlistItems = filteredWishlistItems.filter(item => item._id !== tourId);
    selectedItems = selectedItems.filter(id => id !== tourId);
    
    // Update display
    updateWishlistStats();
    displayWishlistItems(filteredWishlistItems);
    updateBulkActions();
    
    showNotification('Đã xóa tour khỏi danh sách yêu thích', 'success');
    
    // Check if empty
    if (allWishlistItems.length === 0) {
        showEmptyState();
    }
}

function removeSelectedItems() {
    if (selectedItems.length === 0) return;
    
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedItems.length} tour đã chọn?`)) return;
    
    selectedItems.forEach(tourId => {
        // Remove from localStorage
        let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
        wishlist = wishlist.filter(id => id !== tourId);
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
    });
    
    // Remove from arrays
    allWishlistItems = allWishlistItems.filter(item => !selectedItems.includes(item._id));
    filteredWishlistItems = filteredWishlistItems.filter(item => !selectedItems.includes(item._id));
    
    const removedCount = selectedItems.length;
    selectedItems = [];
    
    // Update display
    updateWishlistStats();
    displayWishlistItems(filteredWishlistItems);
    updateBulkActions();
    
    showNotification(`Đã xóa ${removedCount} tour khỏi danh sách yêu thích`, 'success');
    
    // Check if empty
    if (allWishlistItems.length === 0) {
        showEmptyState();
    }
}

function shareSelectedItems() {
    if (selectedItems.length === 0) return;
    
    const selectedTours = allWishlistItems.filter(item => selectedItems.includes(item._id));
    const shareText = `Danh sách tour yêu thích của tôi:\n\n${selectedTours.map(tour => 
        `• ${tour.name} - ${tour.country} - $${tour.estimatedCost.toLocaleString()}`
    ).join('\n')}\n\nKhám phá thêm tại: ${window.location.origin}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Danh sách tour yêu thích - CMP Travel',
            text: shareText,
            url: window.location.href
        }).catch(err => {
            console.log('Error sharing:', err);
            fallbackShare(shareText);
        });
    } else {
        fallbackShare(shareText);
    }
}

function fallbackShare(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('Đã sao chép danh sách vào clipboard!', 'success');
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Đã sao chép danh sách vào clipboard!', 'success');
    }
}

// Utility functions
function formatDate(date) {
    return new Date(date).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function showLoadingState() {
    const container = document.getElementById('wishlistContainer');
    container.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Đang tải danh sách yêu thích...</p>
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
window.viewTourDetails = viewTourDetails;
window.bookTour = bookTour;
window.removeFromWishlist = removeFromWishlist;
window.handleItemSelection = handleItemSelection;