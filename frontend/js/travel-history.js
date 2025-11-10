// Travel History Page JavaScript

document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is logged in
  const userId = localStorage.getItem('userId');
  if (!userId) {
    window.location.href = 'login.html';
    return;
  }

  // Load travel history
  await loadTravelHistory(userId);
});

async function loadTravelHistory(userId) {
  try {
    // Show loading state
    showLoadingState();

    // Fetch completed bookings from profile API
    const response = await fetch(`http://localhost:3000/api/profile/${userId}/travel-history`);

    if (!response.ok) {
      throw new Error('Failed to load travel history');
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to load travel history');
    }

    const completedBookings = data.bookings || [];

    if (completedBookings.length === 0) {
      showEmptyState();
      return;
    }

    // Display statistics
    displayStats(data.stats);

    // Render timeline
    renderTimeline(completedBookings);

    // Render photo gallery
    renderPhotoGallery(completedBookings);

  } catch (error) {
    console.error('Error loading travel history:', error);
    showError();
  }
}

function showLoadingState() {
  const timeline = document.getElementById('travelTimeline');
  timeline.innerHTML = `
    <div class="loading-spinner">
      <div class="spinner"></div>
    </div>
  `;
}

function showEmptyState() {
  const container = document.querySelector('.history-container');
  container.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-plane-slash"></i>
      <h4>No Travel History</h4>
      <p>You haven't completed any trips yet. Start exploring the world!</p>
      <a href="destination.html" class="btn">Explore Tours</a>
    </div>
  `;
}

function showError() {
  const timeline = document.getElementById('travelTimeline');
  timeline.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-exclamation-triangle"></i>
      <h4>Unable to Load Data</h4>
      <p>An error occurred. Please try again later.</p>
    </div>
  `;
}

function displayStats(stats) {
  // Display stats from API
  document.getElementById('totalTours').textContent = stats.totalTours || 0;
  document.getElementById('totalCountries').textContent = stats.totalCountries || 0;
  document.getElementById('totalDays').textContent = stats.totalDays || 0;
  document.getElementById('totalSpent').textContent = `$${(stats.totalSpent || 0).toLocaleString()}`;
}

function calculateStats(bookings) {
  // Total tours
  const totalTours = bookings.length;
  document.getElementById('totalTours').textContent = totalTours;

  // Total countries (unique destinations)
  const countries = new Set(bookings.map(b => b.destination || 'Unknown'));
  document.getElementById('totalCountries').textContent = countries.size;

  // Total days
  const totalDays = bookings.reduce((sum, b) => {
    const duration = parseInt(b.tourDuration) || 1;
    return sum + duration;
  }, 0);
  document.getElementById('totalDays').textContent = totalDays;

  // Total spent
  const totalSpent = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
  document.getElementById('totalSpent').textContent = `$${totalSpent.toLocaleString()}`;

  // Animate numbers
  animateNumbers();
}

function animateNumbers() {
  const stats = ['totalTours', 'totalCountries', 'totalDays'];
  
  stats.forEach(statId => {
    const element = document.getElementById(statId);
    const target = parseInt(element.textContent) || 0;
    let current = 0;
    const increment = Math.ceil(target / 30);
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      element.textContent = current;
    }, 50);
  });
}

function renderTimeline(bookings) {
  const timeline = document.getElementById('travelTimeline');
  
  // Sort by date (newest first)
  const sortedBookings = bookings.sort((a, b) => 
    new Date(b.tourDate) - new Date(a.tourDate)
  );

  if (sortedBookings.length === 0) {
    timeline.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-calendar-times"></i>
        <p>Không có chuyến đi nào trong lịch sử</p>
      </div>
    `;
    return;
  }

  timeline.innerHTML = sortedBookings.map(booking => {
    const date = new Date(booking.tourDate);
    const formattedDate = date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const tourName = booking.tourName || booking.destination || 'Tour';
    const destination = booking.destination || 'Destination';
    const duration = booking.tourDuration || 'N/A';
    const price = booking.totalPrice ? `$${booking.totalPrice.toLocaleString()}` : 'N/A';

    return `
      <div class="timeline-item">
        <div class="timeline-content">
          <div class="timeline-date">
            <i class="fas fa-calendar-alt"></i>
            ${formattedDate}
          </div>
          <div class="timeline-title">${tourName}</div>
          <div class="timeline-description">
            You have completed an amazing trip to ${destination}. 
            This is an unforgettable experience with memorable moments.
          </div>
          <div class="timeline-details">
            <span><i class="fas fa-map-marker-alt"></i> ${destination}</span>
            <span><i class="fas fa-clock"></i> ${duration} days</span>
            <span><i class="fas fa-users"></i> ${booking.numberOfGuests || 1} guests</span>
            <span><i class="fas fa-dollar-sign"></i> ${price}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Add animation on scroll
  observeTimelineItems();
}

function observeTimelineItems() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateX(0)';
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.timeline-item').forEach(item => {
    observer.observe(item);
  });
}

function renderPhotoGallery(bookings) {
  const gallery = document.getElementById('photoGallery');
  
  // Sample photos based on destinations
  const destinationImages = {
    'Paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400',
    'Tokyo': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400',
    'Thailand': 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=400',
    'Bali': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400',
    'Singapore': 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=400',
    'Malaysia': 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=400',
    'Vietnam': 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400',
    'Korea': 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=400'
  };

  const photos = bookings.slice(0, 6).map(booking => {
    const destination = booking.destination || 'Travel';
    const date = new Date(booking.tourDate).toLocaleDateString('vi-VN', {
      month: 'short',
      year: 'numeric'
    });
    
    // Find matching image or use default
    let imageUrl = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400';
    for (const [key, url] of Object.entries(destinationImages)) {
      if (destination.includes(key)) {
        imageUrl = url;
        break;
      }
    }

    return `
      <div class="photo-item">
        <img src="${imageUrl}" alt="${destination}" loading="lazy">
        <div class="photo-overlay">
          <h5>${destination}</h5>
          <p>${date}</p>
        </div>
      </div>
    `;
  }).join('');

  if (photos) {
    gallery.innerHTML = photos;
  } else {
    gallery.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-camera"></i>
        <p>No photos yet</p>
      </div>
    `;
  }
}

// Scroll reveal animation
window.addEventListener('scroll', () => {
  const reveals = document.querySelectorAll('.reveal');
  
  reveals.forEach(element => {
    const windowHeight = window.innerHeight;
    const elementTop = element.getBoundingClientRect().top;
    const elementVisible = 150;
    
    if (elementTop < windowHeight - elementVisible) {
      element.classList.add('active');
    }
  });
});
