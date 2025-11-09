// frontend/js/blog.js
let allBlogs = [];
let filteredBlogs = [];
let currentFilter = 'all';
let searchQuery = '';
let displayedBlogs = 6; // Show 6 blogs initially

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize counters animation
  animateCounters();
  
  // Load blogs
  await loadBlogs();
  
  // Setup event listeners
  setupEventListeners();
  
  // Setup newsletter functionality
  setupNewsletter();
});

// Animate counter numbers
function animateCounters() {
  const counters = document.querySelectorAll('.stat-number');
  
  counters.forEach(counter => {
    const target = parseInt(counter.getAttribute('data-count'));
    const duration = 2000; // 2 seconds
    const step = target / (duration / 50); // Update every 50ms
    let current = 0;
    
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      counter.textContent = Math.floor(current);
    }, 50);
  });
}

// Load blogs from API
async function loadBlogs() {
  try {
    showLoading();
    
    const response = await fetch('http://localhost:3000/api/blogs');
    const blogs = await response.json();
    
    console.log('📚 Loaded blogs from API:', blogs);
    console.log('📚 Total blogs:', blogs.length);
    
    // Filter published blogs
    allBlogs = blogs.filter(blog => blog.status === 'published');
    filteredBlogs = [...allBlogs];
    
    hideLoading();
    displayBlogs();
    
  } catch (error) {
    console.error('Error loading blogs:', error);
    showError();
  }
}

// Display blogs with pagination
function displayBlogs() {
  const blogContainer = document.querySelector('.noidung');
  
  if (blogContainer) {
    blogContainer.innerHTML = '';
    
    if (filteredBlogs.length === 0) {
      showEmptyState();
      return;
    }
    
    // Show blogs based on displayedBlogs count
    const blogsToShow = filteredBlogs.slice(0, displayedBlogs);
    
    blogsToShow.forEach((blog, index) => {
      const blogCard = createBlogCard(blog, index);
      blogContainer.appendChild(blogCard);
    });
    
    // Show/hide load more button
    updateLoadMoreButton();
    
    // Initialize animations
    initializeAnimations();
  }
}

// Create enhanced blog card
function createBlogCard(blog, index) {
  const card = document.createElement('div');
  card.className = 'box slide-up';
  card.style.animationDelay = `${index * 0.1}s`;
  
  // Format date
  const date = new Date(blog.publishedDate || blog.createdAt);
  const formattedDate = date.toLocaleDateString('en-US', { 
    year: 'numeric',
    month: 'short', 
    day: 'numeric'
  });
  
  // Get category badge
  const category = blog.category || 'travel';
  const categoryBadge = getCategoryBadge(category);
  
  // Limit excerpt length
  const excerpt = blog.excerpt || blog.content.substring(0, 120) + '...';
  
  card.innerHTML = `
    <a href="blog-detail.html?id=${blog._id}">
      <img src="${blog.thumbnail || blog.image || getDefaultImage(category)}" 
           alt="${blog.title}"
           onerror="this.src='${getDefaultImage(category)}'">
      ${categoryBadge}
    </a>
    <div class="nd">
      <a href="blog-detail.html?id=${blog._id}">${blog.title}</a>
      <h6>${formattedDate}</h6>
      <p>${excerpt}</p>
      <a href="blog-detail.html?id=${blog._id}" class="learn-more">
        <span class="button-text">Read Story</span>
        <span class="icon arrow"></span>
      </a>
    </div>
  `;
  
  return card;
}

// Get category badge
function getCategoryBadge(category) {
  const badges = {
    'destination': { icon: '🏖️', text: 'Destination', color: '#ff6600' },
    'tips': { icon: '💡', text: 'Tips', color: '#48bb78' },
    'culture': { icon: '🏛️', text: 'Culture', color: '#ed8936' },
    'food': { icon: '🍽️', text: 'Food', color: '#e53e3e' },
    'adventure': { icon: '🏔️', text: 'Adventure', color: '#9f7aea' },
    'default': { icon: '✈️', text: 'Travel', color: '#ff6600' }
  };
  
  const badge = badges[category] || badges.default;
  
  return `
    <div class="category-badge" style="background: ${badge.color};">
      <span class="badge-icon">${badge.icon}</span>
      <span class="badge-text">${badge.text}</span>
    </div>
  `;
}

// Get default image based on category
function getDefaultImage(category) {
  const images = {
    'destination': 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800',
    'tips': 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800',
    'culture': 'https://images.unsplash.com/photo-1539650116574-75c0c6d73a8e?w=800',
    'food': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
    'adventure': 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800'
  };
  
  return images[category] || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800';
}

// Setup event listeners
function setupEventListeners() {
  // Search functionality
  const searchInput = document.getElementById('blog-search');
  const searchBtn = document.getElementById('search-btn');
  
  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    });
  }
  
  if (searchBtn) {
    searchBtn.addEventListener('click', handleSearch);
  }
  
  // Filter functionality
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const category = e.target.getAttribute('data-category');
      handleFilter(category, e.target);
    });
  });
  
  // Load more functionality
  const loadMoreBtn = document.querySelector('.load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', loadMoreBlogs);
  }
}

// Handle search
function handleSearch() {
  const searchInput = document.getElementById('blog-search');
  searchQuery = searchInput.value.toLowerCase().trim();
  
  applyFilters();
}

// Handle filter
function handleFilter(category, btnElement) {
  // Update active button
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  btnElement.classList.add('active');
  
  currentFilter = category;
  displayedBlogs = 6; // Reset pagination
  
  applyFilters();
}

// Apply search and filter
function applyFilters() {
  filteredBlogs = allBlogs.filter(blog => {
    // Apply category filter
    const matchesCategory = currentFilter === 'all' || 
                           blog.category === currentFilter ||
                           (currentFilter === 'tips' && blog.tags?.includes('tips'));
    
    // Apply search filter
    const matchesSearch = searchQuery === '' ||
                         blog.title.toLowerCase().includes(searchQuery) ||
                         blog.content.toLowerCase().includes(searchQuery) ||
                         (blog.excerpt && blog.excerpt.toLowerCase().includes(searchQuery));
    
    return matchesCategory && matchesSearch;
  });
  
  displayBlogs();
}

// Load more blogs
function loadMoreBlogs() {
  displayedBlogs += 6;
  displayBlogs();
}

// Update load more button visibility
function updateLoadMoreButton() {
  const loadMoreContainer = document.querySelector('.load-more-container');
  if (loadMoreContainer) {
    if (filteredBlogs.length > displayedBlogs) {
      loadMoreContainer.style.display = 'block';
    } else {
      loadMoreContainer.style.display = 'none';
    }
  }
}

// Newsletter setup
function setupNewsletter() {
  const newsletterBtn = document.getElementById('newsletter-subscribe');
  const newsletterEmail = document.getElementById('newsletter-email');
  
  if (newsletterBtn && newsletterEmail) {
    newsletterBtn.addEventListener('click', async () => {
      const email = newsletterEmail.value.trim();
      
      if (!email) {
        showToast('Please enter your email address', 'error');
        return;
      }
      
      if (!isValidEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
      }
      
      try {
        newsletterBtn.disabled = true;
        newsletterBtn.textContent = 'Subscribing...';
        
        const response = await fetch('/api/newsletter/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, source: 'blog' })
        });
        
        const data = await response.json();
        
        if (data.success) {
          showToast('🎉 Thank you for subscribing!', 'success');
          newsletterEmail.value = '';
        } else {
          showToast(data.message || 'Failed to subscribe', 'error');
        }
        
      } catch (error) {
        console.error('Newsletter error:', error);
        showToast('Connection error. Please try again.', 'error');
      } finally {
        newsletterBtn.disabled = false;
        newsletterBtn.textContent = 'Subscribe';
      }
    });
    
    // Enter key support
    newsletterEmail.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        newsletterBtn.click();
      }
    });
  }
}

// Utility functions
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// State management functions
function showLoading() {
  const blogContainer = document.querySelector('.noidung');
  if (blogContainer) {
    blogContainer.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>Discovering amazing stories for you...</p>
      </div>
    `;
  }
}

function hideLoading() {
  const loadingContainer = document.querySelector('.loading-container');
  if (loadingContainer) {
    loadingContainer.remove();
  }
}

function showError() {
  const blogContainer = document.querySelector('.noidung');
  if (blogContainer) {
    blogContainer.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; grid-column: 1 / -1;">
        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #e53e3e; margin-bottom: 20px;"></i>
        <h3 style="color: #e53e3e; margin-bottom: 10px;">Oops! Something went wrong</h3>
        <p style="color: #666; margin-bottom: 30px;">We couldn't load the stories. Please try again later.</p>
        <button onclick="location.reload()" style="background: #ff6600; color: white; border: none; padding: 12px 25px; border-radius: 25px; cursor: pointer;">
          Try Again
        </button>
      </div>
    `;
  }
}

function showEmptyState() {
  const blogContainer = document.querySelector('.noidung');
  if (blogContainer) {
    const message = searchQuery ? 
      `No stories found for "${searchQuery}"` : 
      `No stories found in ${currentFilter} category`;
      
    blogContainer.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; grid-column: 1 / -1;">
        <i class="fas fa-search" style="font-size: 3rem; color: #cbd5e0; margin-bottom: 20px;"></i>
        <h3 style="color: #4a5568; margin-bottom: 10px;">${message}</h3>
        <p style="color: #718096;">Try adjusting your search or browse all stories.</p>
        <button onclick="clearFilters()" style="background: #ff6600; color: white; border: none; padding: 12px 25px; border-radius: 25px; cursor: pointer; margin-top: 20px;">
          Show All Stories
        </button>
      </div>
    `;
  }
}

function clearFilters() {
  // Reset search
  const searchInput = document.getElementById('blog-search');
  if (searchInput) searchInput.value = '';
  
  // Reset filter
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelector('.filter-btn[data-category="all"]').classList.add('active');
  
  // Reset variables
  searchQuery = '';
  currentFilter = 'all';
  displayedBlogs = 6;
  
  // Apply filters
  applyFilters();
}

// Initialize animations
function initializeAnimations() {
  if (typeof ScrollReveal !== 'undefined') {
    // Check if elements exist before revealing
    const slideUpElements = document.querySelectorAll('.slide-up');
    const revealElements = document.querySelectorAll('.reveal');
    
    if (slideUpElements.length > 0) {
      ScrollReveal().reveal('.slide-up', {
        duration: 800,
        distance: '50px',
        origin: 'bottom',
        reset: false,
        easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)'
      });
    }
    
    if (revealElements.length > 0) {
      ScrollReveal().reveal('.reveal', {
        duration: 1000,
        distance: '30px',
        origin: 'bottom',
        reset: false
      });
    }
  }
}

// Toast notification function (if not available)
function showToast(message, type = 'info') {
  // Fallback toast (always use fallback to avoid conflicts)
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#e53e3e' : '#ff6600'};
    color: white;
    padding: 15px 20px;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}