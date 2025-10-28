document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 My Wishlist page initialized');
    
    // Check authentication
    if (!checkUserAuth()) return;
    
    // Initialize page components
    initializeWishlistPage();
    
    // Load user wishlist
    loadUserWishlist();
    
    // Setup event listeners
    setupEventListeners();
});

// Global variables
let allWishlistItems = [];
let filteredWishlistItems = [];
let currentView = 'grid'; // 'grid' or 'list'
let selectedItems = [];
let sortBy = 'dateAdded'; // 'dateAdded', 'price', 'rating', 'name'
let sortOrder = 'desc'; // 'asc' or 'desc'

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
    
    // Initialize view
    initializeView();
    
    // Initialize filters
    initializeFilters();
    
    console.log('✅ My Wishlist page initialized');
}

async function loadUserWishlist() {
    try {
        const userId = localStorage.getItem('userId');
        
        console.log('🔍 Loading wishlist from backend for userId:', userId);
        
        // Fetch wishlist from backend API
        const response = await fetch(`http://localhost:3000/api/profile/${userId}/wishlist`);
        const data = await response.json();
        
        console.log('📥 Wishlist API response:', data);
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to load wishlist');
        }
        
        // Convert backend data to frontend format
        allWishlistItems = data.wishlist.map(tour => ({
            id: tour._id,
            name: tour.name,
            image: tour.img || tour.image || 'https://via.placeholder.com/400x300',
            country: tour.country,
            city: tour.city || tour.location || 'N/A',
            price: tour.price || 0,
            originalPrice: tour.originalPrice || tour.price,
            rating: tour.rating || 4.5,
            reviewCount: tour.reviewCount || 0,
            duration: tour.duration || 'N/A',
            description: tour.description || '',
            available: tour.available !== false,
            tags: tour.tags || []
        }));
        
        filteredWishlistItems = [...allWishlistItems];
        
        // Update localStorage with tour IDs
        const tourIds = allWishlistItems.map(item => item.id);
        localStorage.setItem('wishlist', JSON.stringify(tourIds));
        
        // Update statistics
        updateWishlistStats();
        
        // Display wishlist
        displayWishlist(filteredWishlistItems);
        
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

async function generateMockWishlistData(wishlistIds) {
    // Mock tours data
    const allTours = [
        {
            id: 'tour-001',
            name: 'Tokyo Cherry Blossom Tour',
            image: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=400',
            country: 'Japan',
            city: 'Tokyo',
            price: 2890,
            originalPrice: 3200,
            rating: 4.8,
            reviewCount: 156,
            duration: '7 ngày 6 đêm',
            type: 'Cultural',
            description: 'Khám phá vẻ đẹp của hoa anh đào Nhật Bản trong mùa xuân tuyệt đẹp.',
            highlights: ['Công viên Ueno', 'Đền Senso-ji', 'Phố cổ Asakusa']
        },
        {
            id: 'tour-002',
            name: 'Paris Romance Getaway',
            image: 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=400',
            country: 'France',
            city: 'Paris',
            price: 3450,
            originalPrice: 3800,
            rating: 4.9,
            reviewCount: 203,
            duration: '5 ngày 4 đêm',
            type: 'Romance',
            description: 'Trải nghiệm Paris lãng mạn với người thương yêu.',
            highlights: ['Tháp Eiffel', 'Bảo tàng Louvre', 'Seine River Cruise']
        },
        {
            id: 'tour-003',
            name: 'Maldives Paradise',
            image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
            country: 'Maldives',
            city: 'Malé',
            price: 4200,
            originalPrice: 4800,
            rating: 4.7,
            reviewCount: 89,
            duration: '4 ngày 3 đêm',
            type: 'Beach',
            description: 'Nghỉ dưỡng trên thiên đường biển xanh cát trắng.',
            highlights: ['Overwater Villa', 'Snorkeling', 'Spa Treatment']
        },
        {
            id: 'tour-004',
            name: 'Swiss Alps Adventure',
            image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400',
            country: 'Switzerland',
            city: 'Interlaken',
            price: 3780,
            originalPrice: 4200,
            rating: 4.6,
            reviewCount: 142,
            duration: '6 ngày 5 đêm',
            type: 'Adventure',
            description: 'Phiêu lưu trên dãy núi Alps hùng vĩ.',
            highlights: ['Jungfraujoch', 'Cable Car', 'Mountain Hiking']
        },
        {
            id: 'tour-005',
            name: 'Bali Cultural Journey',
            image: 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=400',
            country: 'Indonesia',
            city: 'Ubud',
            price: 1890,
            originalPrice: 2200,
            rating: 4.5,
            reviewCount: 178,
            duration: '8 ngày 7 đêm',
            type: 'Cultural',
            description: 'Khám phá văn hóa và tâm linh độc đáo của Bali.',
            highlights: ['Tegallalang Rice Terrace', 'Tanah Lot Temple', 'Traditional Dance']
        },
        {
            id: 'tour-006',
            name: 'Iceland Northern Lights',
            image: 'https://images.unsplash.com/photo-1539066436319-6a24b3c7c3a6?w=400',
            country: 'Iceland',
            city: 'Reykjavik',
            price: 3200,
            originalPrice: 3600,
            rating: 4.8,
            reviewCount: 95,
            duration: '6 ngày 5 đêm',
            type: 'Nature',
            description: 'Săn đuổi cực quang tuyệt đẹp ở Iceland.',
            highlights: ['Aurora Viewing', 'Blue Lagoon', 'Golden Circle']
        }
    ];
    
    // Filter tours based on wishlist IDs or simulate random selection
    const wishlistTours = wishlistIds.length > 0 
        ? allTours.filter(tour => wishlistIds.includes(tour.id))
        : allTours.slice(0, Math.floor(Math.random() * 5) + 2); // 2-6 random tours
    
    // Add wishlist-specific metadata
    return wishlistTours.map(tour => ({
        ...tour,
        dateAdded: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        isAvailable: Math.random() > 0.1, // 90% available
        discountPercentage: Math.round(((tour.originalPrice - tour.price) / tour.originalPrice) * 100)
    }));
}

function updateWishlistStats() {
    const stats = {
        total: allWishlistItems.length,
        totalValue: allWishlistItems.reduce((sum, item) => sum + item.price, 0),
        averageRating: allWishlistItems.length > 0 
            ? (allWishlistItems.reduce((sum, item) => sum + item.rating, 0) / allWishlistItems.length).toFixed(1)
            : 0,
        topDestination: getTopDestination()
    };
    
    document.getElementById('totalItems').textContent = stats.total;
    document.getElementById('totalValue').textContent = `$${stats.totalValue.toLocaleString()}`;
    document.getElementById('averageRating').textContent = stats.averageRating;
    document.getElementById('topDestination').textContent = stats.topDestination || 'N/A';
}

function getTopDestination() {
    if (allWishlistItems.length === 0) return '';
    
    const countries = {};
    allWishlistItems.forEach(item => {
        countries[item.country] = (countries[item.country] || 0) + 1;
    });
    
    return Object.keys(countries).reduce((a, b) => countries[a] > countries[b] ? a : b);
}

function initializeView() {
    // Set default view
    const gridBtn = document.getElementById('gridView');
    const listBtn = document.getElementById('listView');
    
    if (gridBtn) gridBtn.classList.add('active');
    
    // Setup view toggle
    if (gridBtn) gridBtn.addEventListener('click', () => switchView('grid'));
    if (listBtn) listBtn.addEventListener('click', () => switchView('list'));
}

function switchView(view) {
    currentView = view;
    
    // Update buttons
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(view === 'grid' ? 'gridView' : 'listView').classList.add('active');
    
    // Update container
    const container = document.getElementById('wishlistContainer');
    container.className = view === 'grid' ? 'wishlist-grid' : 'wishlist-list';
    
    // Re-display items
    displayWishlist(filteredWishlistItems);
}

function initializeFilters() {
    // Setup sort options
    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            const [field, order] = this.value.split('-');
            sortBy = field;
            sortOrder = order;
            applySorting();
        });
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
    
    // Category filter
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', applyFilters);
    }
    
    // Price range filter
    const priceRange = document.getElementById('priceRange');
    if (priceRange) {
        priceRange.addEventListener('input', function() {
            document.getElementById('priceValue').textContent = `$${this.value}`;
            clearTimeout(this.timeout);
            this.timeout = setTimeout(applyFilters, 500);
        });
    }
    
    // Clear filters
    const clearBtn = document.getElementById('clearFilters');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearFilters);
    }
    
    // Select all checkbox
    const selectAllBtn = document.getElementById('selectAll');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('change', toggleSelectAll);
    }
    
    // Bulk actions
    const removeSelectedBtn = document.getElementById('removeSelected');
    const shareSelectedBtn = document.getElementById('shareSelected');
    
    if (removeSelectedBtn) removeSelectedBtn.addEventListener('click', removeSelectedItems);
    if (shareSelectedBtn) shareSelectedBtn.addEventListener('click', shareSelectedItems);
}

function displayWishlist(items) {
    const container = document.getElementById('wishlistContainer');
    
    if (!items || items.length === 0) {
        showEmptyState();
        return;
    }
    
    container.innerHTML = items.map(item => 
        currentView === 'grid' ? createGridCard(item) : createListCard(item)
    ).join('');
    
    // Update results count
    updateResultsCount();
}

function createGridCard(item) {
    const discountBadge = item.discountPercentage > 0 
        ? `<div class="tour-badge">-${item.discountPercentage}%</div>` 
        : '';
    
    return `
        <div class="wishlist-card" data-tour-id="${item.id}">
            <input type="checkbox" class="card-checkbox" onchange="toggleItemSelection('${item.id}')">
            <div class="card-image">
                <img src="${item.image}" alt="${item.name}" loading="lazy">
                <button class="remove-wishlist" onclick="removeFromWishlist('${item.id}')" title="Xóa khỏi yêu thích">
                    <i class="fas fa-heart"></i>
                </button>
                ${discountBadge}
            </div>
            <div class="card-content">
                <h3 class="tour-title">${item.name}</h3>
                <div class="tour-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${item.city}, ${item.country}
                </div>
                <div class="tour-details">
                    <div class="tour-price">
                        $${item.price.toLocaleString()}
                        ${item.originalPrice > item.price ? `<del style="color: #999; font-size: 0.9rem;">$${item.originalPrice.toLocaleString()}</del>` : ''}
                    </div>
                    <div class="tour-rating">
                        <div class="stars">
                            ${generateStarsHTML(item.rating)}
                        </div>
                        <span>(${item.reviewCount})</span>
                    </div>
                </div>
                <div class="tour-meta">
                    <small class="text-muted">
                        <i class="fas fa-clock"></i> ${item.duration} • 
                        <i class="fas fa-tag"></i> ${item.type}
                    </small>
                </div>
                <div class="card-actions">
                    <button class="btn btn-outline" onclick="viewTourDetails('${item.id}')">
                        <i class="fas fa-eye"></i> Chi tiết
                    </button>
                    <button class="btn btn-primary" onclick="bookTour('${item.id}')">
                        <i class="fas fa-ticket-alt"></i> Đặt ngay
                    </button>
                </div>
            </div>
        </div>
    `;
}

function createListCard(item) {
    const discountBadge = item.discountPercentage > 0 
        ? `<span class="tour-badge">-${item.discountPercentage}%</span>` 
        : '';
    
    return `
        <div class="wishlist-card" data-tour-id="${item.id}">
            <input type="checkbox" class="card-checkbox" onchange="toggleItemSelection('${item.id}')">
            <div class="list-content">
                <div class="list-image">
                    <img src="${item.image}" alt="${item.name}" loading="lazy">
                </div>
                <div class="list-details">
                    <div class="list-header">
                        <div>
                            <h3 class="tour-title">${item.name}</h3>
                            <div class="tour-location">
                                <i class="fas fa-map-marker-alt"></i>
                                ${item.city}, ${item.country}
                            </div>
                        </div>
                        <button class="remove-wishlist" onclick="removeFromWishlist('${item.id}')" title="Xóa khỏi yêu thích">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                    
                    <div class="list-meta">
                        <div class="meta-item">
                            <i class="fas fa-clock"></i>
                            <span>${item.duration}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-tag"></i>
                            <span>${item.type}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-star"></i>
                            <span>${item.rating} (${item.reviewCount} đánh giá)</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-calendar-plus"></i>
                            <span>Đã thêm ${formatRelativeDate(item.dateAdded)}</span>
                        </div>
                    </div>
                    
                    <div class="list-actions">
                        <div class="tour-price">
                            $${item.price.toLocaleString()} ${discountBadge}
                            ${item.originalPrice > item.price ? `<del style="color: #999; font-size: 0.9rem; margin-left: 0.5rem;">$${item.originalPrice.toLocaleString()}</del>` : ''}
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn btn-outline" onclick="viewTourDetails('${item.id}')">
                                <i class="fas fa-eye"></i> Chi tiết
                            </button>
                            <button class="btn btn-primary" onclick="bookTour('${item.id}')">
                                <i class="fas fa-ticket-alt"></i> Đặt ngay
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const maxPrice = parseInt(document.getElementById('priceRange')?.value) || 10000;
    
    filteredWishlistItems = allWishlistItems.filter(item => {
        // Search filter
        const matchesSearch = !searchTerm || 
            item.name.toLowerCase().includes(searchTerm) ||
            item.country.toLowerCase().includes(searchTerm) ||
            item.city.toLowerCase().includes(searchTerm);
        
        // Category filter
        const matchesCategory = !categoryFilter || item.type === categoryFilter;
        
        // Price filter
        const matchesPrice = item.price <= maxPrice;
        
        return matchesSearch && matchesCategory && matchesPrice;
    });
    
    applySorting();
}

function applySorting() {
    filteredWishlistItems.sort((a, b) => {
        let valueA, valueB;
        
        switch (sortBy) {
            case 'price':
                valueA = a.price;
                valueB = b.price;
                break;
            case 'rating':
                valueA = a.rating;
                valueB = b.rating;
                break;
            case 'name':
                valueA = a.name.toLowerCase();
                valueB = b.name.toLowerCase();
                break;
            case 'dateAdded':
            default:
                valueA = new Date(a.dateAdded);
                valueB = new Date(b.dateAdded);
                break;
        }
        
        if (sortOrder === 'asc') {
            return valueA > valueB ? 1 : -1;
        } else {
            return valueA < valueB ? 1 : -1;
        }
    });
    
    displayWishlist(filteredWishlistItems);
}

function clearFilters() {
    // Reset form inputs
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('priceRange').value = '10000';
    document.getElementById('priceValue').textContent = '$10,000';
    document.getElementById('sortBy').value = 'dateAdded-desc';
    
    // Reset variables
    sortBy = 'dateAdded';
    sortOrder = 'desc';
    
    // Show all items
    filteredWishlistItems = [...allWishlistItems];
    applySorting();
    
    showNotification('Đã xóa tất cả bộ lọc', 'success');
}

function toggleItemSelection(tourId) {
    const checkbox = document.querySelector(`[data-tour-id="${tourId}"] .card-checkbox`);
    const card = document.querySelector(`[data-tour-id="${tourId}"]`);
    
    if (checkbox.checked) {
        selectedItems.push(tourId);
        card.classList.add('selected');
    } else {
        selectedItems = selectedItems.filter(id => id !== tourId);
        card.classList.remove('selected');
    }
    
    updateBulkActions();
}

function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const itemCheckboxes = document.querySelectorAll('.card-checkbox');
    
    if (selectAllCheckbox.checked) {
        selectedItems = filteredWishlistItems.map(item => item.id);
        itemCheckboxes.forEach(checkbox => {
            checkbox.checked = true;
            checkbox.closest('.wishlist-card').classList.add('selected');
        });
    } else {
        selectedItems = [];
        itemCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
            checkbox.closest('.wishlist-card').classList.remove('selected');
        });
    }
    
    updateBulkActions();
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

function removeSelectedItems() {
    if (selectedItems.length === 0) return;
    
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedItems.length} tour khỏi danh sách yêu thích?`)) return;
    
    // Remove from local arrays
    allWishlistItems = allWishlistItems.filter(item => !selectedItems.includes(item.id));
    filteredWishlistItems = filteredWishlistItems.filter(item => !selectedItems.includes(item.id));
    
    // Update localStorage
    const currentWishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    const updatedWishlist = currentWishlist.filter(id => !selectedItems.includes(id));
    localStorage.setItem('wishlist', JSON.stringify(updatedWishlist));
    
    // Reset selection
    selectedItems = [];
    updateBulkActions();
    
    // Update display
    updateWishlistStats();
    displayWishlist(filteredWishlistItems);
    
    showNotification('Đã xóa các tour đã chọn khỏi danh sách yêu thích', 'success');
}

function shareSelectedItems() {
    if (selectedItems.length === 0) return;
    
    const selectedTours = allWishlistItems.filter(item => selectedItems.includes(item.id));
    showShareModal(selectedTours);
}

function showShareModal(tours) {
    const modal = document.createElement('div');
    modal.className = 'share-modal active';
    modal.innerHTML = `
        <div class="share-content">
            <h3>Chia sẻ danh sách yêu thích</h3>
            <p>Chia sẻ ${tours.length} tour yêu thích của bạn:</p>
            <div class="share-options">
                <button class="share-btn" onclick="shareViaWhatsApp(${JSON.stringify(tours.map(t => t.name)).replace(/"/g, '&quot;')})">
                    <i class="fab fa-whatsapp" style="color: #25D366;"></i><br>WhatsApp
                </button>
                <button class="share-btn" onclick="shareViaEmail(${JSON.stringify(tours.map(t => t.name)).replace(/"/g, '&quot;')})">
                    <i class="fas fa-envelope" style="color: #ea4335;"></i><br>Email
                </button>
                <button class="share-btn" onclick="shareViaFacebook()">
                    <i class="fab fa-facebook" style="color: #1877f2;"></i><br>Facebook
                </button>
                <button class="share-btn" onclick="copyShareLink(${JSON.stringify(tours.map(t => t.name)).replace(/"/g, '&quot;')})">
                    <i class="fas fa-copy" style="color: #666;"></i><br>Copy Link
                </button>
            </div>
            <button class="btn btn-secondary" onclick="closeShareModal()" style="margin-top: 1rem; width: 100%;">
                Đóng
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on outside click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeShareModal();
        }
    });
}

// Wishlist actions
async function removeFromWishlist(tourId) {
    if (!confirm('Bạn có chắc chắn muốn xóa tour này khỏi danh sách yêu thích?')) return;
    
    try {
        const userId = localStorage.getItem('userId');
        
        console.log('🗑️ Removing tour from wishlist:', tourId);
        
        // Call backend API to remove
        const response = await fetch(`http://localhost:3000/api/profile/${userId}/wishlist/${tourId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to remove from wishlist');
        }
        
        // Remove from arrays
        allWishlistItems = allWishlistItems.filter(item => item.id !== tourId);
        filteredWishlistItems = filteredWishlistItems.filter(item => item.id !== tourId);
        
        // Update localStorage
        const currentWishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
        const updatedWishlist = currentWishlist.filter(id => id !== tourId);
        localStorage.setItem('wishlist', JSON.stringify(updatedWishlist));
        
        // Update display
        updateWishlistStats();
        displayWishlist(filteredWishlistItems);
        
        showNotification('Đã xóa tour khỏi danh sách yêu thích', 'success');
        
        console.log('✅ Removed from wishlist successfully');
        
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        showNotification('Không thể xóa tour. Vui lòng thử lại.', 'error');
    }
}

function viewTourDetails(tourId) {
    window.location.href = `detail.html?id=${tourId}`;
}

function bookTour(tourId) {
    showNotification('Chuyển đến trang đặt tour...', 'info');
    setTimeout(() => {
        window.location.href = `detail.html?id=${tourId}`;
    }, 1000);
}

// Share functions
function shareViaWhatsApp(tourNames) {
    const message = `Tôi muốn chia sẻ danh sách tour yêu thích: ${tourNames.join(', ')}. Xem thêm tại CMP Travel!`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    closeShareModal();
}

function shareViaEmail(tourNames) {
    const subject = 'Danh sách tour yêu thích - CMP Travel';
    const body = `Tôi muốn chia sẻ danh sách tour yêu thích: ${tourNames.join(', ')}.\n\nXem thêm tại: ${window.location.origin}`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url);
    closeShareModal();
}

function shareViaFacebook() {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
    window.open(url, '_blank', 'width=600,height=400');
    closeShareModal();
}

function copyShareLink(tourNames) {
    const text = `Danh sách tour yêu thích: ${tourNames.join(', ')} - ${window.location.href}`;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('Đã sao chép link chia sẻ', 'success');
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Đã sao chép link chia sẻ', 'success');
    }
    
    closeShareModal();
}

function closeShareModal() {
    const modal = document.querySelector('.share-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
}

// Utility functions
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
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
        starsHTML += '<i class="far fa-star"></i>';
    }
    
    return starsHTML;
}

function formatRelativeDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'hôm nay';
    if (diffInDays === 1) return 'hôm qua';
    if (diffInDays < 7) return `${diffInDays} ngày trước`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} tuần trước`;
    return `${Math.floor(diffInDays / 30)} tháng trước`;
}

function updateResultsCount() {
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) {
        resultsCount.textContent = `Hiển thị ${filteredWishlistItems.length} trong số ${allWishlistItems.length} tour yêu thích`;
    }
}

function showEmptyState(message = 'Bạn chưa có tour yêu thích nào') {
    const container = document.getElementById('wishlistContainer');
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">
                <i class="fas fa-heart-broken"></i>
            </div>
            <h3>Danh sách yêu thích trống</h3>
            <p>${message}</p>
            <button class="btn btn-primary" onclick="window.location.href='destination.html'">
                <i class="fas fa-search"></i> Khám phá tour
            </button>
        </div>
    `;
}

function showLoadingState() {
    const container = document.getElementById('wishlistContainer');
    container.innerHTML = `
        <div class="loading-card">
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
window.removeFromWishlist = removeFromWishlist;
window.viewTourDetails = viewTourDetails;
window.bookTour = bookTour;
window.toggleItemSelection = toggleItemSelection;
window.shareViaWhatsApp = shareViaWhatsApp;
window.shareViaEmail = shareViaEmail;
window.shareViaFacebook = shareViaFacebook;
window.copyShareLink = copyShareLink;
window.closeShareModal = closeShareModal;