// frontend/js/main.js

// Authentication functions
function checkAuthStatus() {
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');
  
  const usernameElements = document.querySelectorAll('#username');
  const greetingElements = document.querySelectorAll('.greeting-li');
  const authElements = document.querySelectorAll('.auth-li, #auth-li');
  
  console.log('🔍 Checking auth status:', { userId, username, greetingCount: greetingElements.length, authCount: authElements.length });
  
  if (userId && username) {
    // User đã đăng nhập - HIỆN greeting, ẨN auth buttons
    usernameElements.forEach(el => {
      if (el) el.textContent = username;
    });
    
    greetingElements.forEach(el => {
      if (el) {
        el.classList.add('logged-in');
        el.style.display = 'inline-block';
        el.style.visibility = 'visible';
      }
    });
    
    authElements.forEach(el => {
      if (el) {
        el.classList.add('hide-auth');
        el.style.display = 'none';
        el.style.visibility = 'hidden';
      }
    });
    
    console.log('✅ User logged in, UI updated for:', username);
  } else {
    // User CHƯA đăng nhập - ẨN greeting, HIỆN auth buttons
    greetingElements.forEach(el => {
      if (el) {
        el.classList.remove('logged-in');
        el.style.display = 'none';
        el.style.visibility = 'hidden';
      }
    });
    
    authElements.forEach(el => {
      if (el) {
        el.classList.remove('hide-auth');
        el.style.display = 'inline-block';
        el.style.visibility = 'visible';
      }
    });
    
    console.log('❌ User not logged in, showing auth buttons');
  }
}

function logout() {
  localStorage.removeItem('userId');
  localStorage.removeItem('username');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userFullName');
  
  console.log('🚪 User logged out');
  alert('Logged out successfully!');
  
  // Force refresh auth status immediately
  setTimeout(() => {
    checkAuthStatus();
  }, 100);
  
  // Redirect to home page
  window.location.href = 'index.html';
}

// Main DOM initialization
document.addEventListener('DOMContentLoaded', () => {
  // Check auth status first
  checkAuthStatus();
  
  // Initialize other components
  initializeFooter();
  initializeDropdown();
  
  // Initialize scroll reveal
  if (typeof ScrollReveal !== 'undefined') {
    ScrollReveal().reveal('.reveal', { 
      delay: 200,
      distance: '50px',
      origin: 'bottom',
      duration: 1000
    });
  }
});

// Enhanced Dropdown functionality
function initializeDropdown() {
  // Remove any existing event listeners to prevent conflicts
  document.removeEventListener('click', handleDocumentClick);
  
  // Add new event listener
  document.addEventListener('click', handleDocumentClick);
  
  // Add logout functionality to all logout links
  document.querySelectorAll('.logout-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      handleLogout();
    });
  });
  
  console.log('🔽 Enhanced dropdown initialized');
}

function handleDocumentClick(e) {
  const greetingLi = document.querySelector('.greeting-li');
  const userGreeting = document.querySelector('.user-greeting');
  
  if (!greetingLi || !userGreeting) return;
  
  // Toggle dropdown when clicking on greeting
  if (userGreeting.contains(e.target)) {
    e.stopPropagation();
    greetingLi.classList.toggle('active');
    
    // Add animation class
    const dropdown = greetingLi.querySelector('.user-dropdown-menu');
    if (dropdown && greetingLi.classList.contains('active')) {
      dropdown.style.animation = 'dropdownSlideIn 0.3s ease';
    }
    return;
  }
  
  // Close dropdown when clicking outside
  if (!greetingLi.contains(e.target)) {
    greetingLi.classList.remove('active');
  }
  
  // Prevent dropdown from closing when clicking inside menu
  if (greetingLi.contains(e.target)) {
    e.stopPropagation();
  }
}

function handleLogout() {
  // Show confirmation dialog
  if (confirm('Are you sure you want to logout?')) {
    // Clear user data
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userFullName');
    
    // Show success message
    alert('Logged out successfully!');
    
    // Redirect to home
    window.location.href = 'index.html';
  }
}

// Scroll icons initialization
// ...existing code...

// Notification system
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
    <span>${message}</span>
  `;
  
  // Add notification styles
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
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ...existing code...

// Footer initialization
function initializeFooter() {
  const footer = document.querySelector("footer");
  if (footer) {
    footer.innerHTML = `
      <div class="footer-container">
        <div class="footer-left">
          <img src="./images/header/logo-removebg-preview.png" alt="Logo" class="footer-logo" />
          <p class="footer-text">Travel helps companies manage payments easily.</p>
          <div class="social-icons">
            <a href="#"><i class="fab fa-linkedin-in"></i></a>
            <a href="#"><i class="fab fa-facebook-messenger"></i></a>
            <a href="#"><i class="fab fa-twitter"></i></a>
            <a href="#"><i class="fas fa-infinity"></i></a>
          </div>
        </div>
        <div class="footer-right">
          <div class="footer-column">
            <h3>Company</h3>
            <ul>
              <li><a href="aboutus.html">About us</a></li>
              <li><a href="blog.html">Blog</a></li>
              <li><a href="contact.html">Contact</a></li>
              <li><a href="feedback.html">Feedback</a></li>
            </ul>
          </div>
          <div class="footer-column">
            <h3>Destination</h3>
            <ul>
              <li><a href="detail.html?id=35">Maldives</a></li>
              <li><a href="detail.html?id=36">Switzerland</a></li>
              <li><a href="detail.html?id=27">Venice</a></li>
              <li><a href="detail.html?id=2">Toronto</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-subscribe">
          <h3>Join Our Newsletter</h3>
          <div class="email-box">
            <img src="./images/homepage/footer/email.png" alt="Email Icon" />
            <input type="email" placeholder="example@gmail.com" />
          </div>
          <p>* Will send you weekly updates for your better tour packages.</p>
        </div>
      </div>
      <div class="footer-bottom">
        <p>Copyright @ CMP-2024. All Rights Reserved.</p>
      </div>
    `;
  }
}

// Scroll reveal
function initializeScrollReveal() {
  if (typeof ScrollReveal !== 'undefined') {
    const sr = ScrollReveal({
      origin: 'top',
      distance: '60px',
      duration: 2000,
      delay: 200,
      reset: true
    });
    
    sr.reveal('.reveal');
    sr.reveal('.reveal-delay', { delay: 400 });
    sr.reveal('.slide-up', { origin: 'bottom' });
    sr.reveal('.slide-left', { origin: 'left' });
    sr.reveal('.slide-right', { origin: 'right' });
  }
}

// Form Submit validation
function initializeFormSubmit() {
  const buttonSubmit = document.querySelector("button[type=submit]");
  if (buttonSubmit) {
    const formControl = document.querySelectorAll(".form-control[required]");
    const formControlArray = Array.from(formControl);
    
    buttonSubmit.addEventListener("click", (e) => {
      const checkValid = formControlArray.some((input) => input.value == "");
      const alertSuccess = document.querySelector(".alert-success");
      const alertFail = document.querySelector(".alert-danger");

      if (checkValid) {
        if (alertSuccess) alertSuccess.classList.add("d-none");
        if (alertFail) alertFail.classList.remove("d-none");
      } else {
        if (alertFail) alertFail.classList.add("d-none");
        if (alertSuccess) alertSuccess.classList.remove("d-none");
        formControlArray.forEach((input) => (input.value = ""));

        e.preventDefault();
        setTimeout(() => {
          window.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        }, 4000);
      }
    });
  }
}

// Popup Image
function initializeImagePopup() {
  const popup = document.querySelector("#popup");
  const popupImg = document.querySelector("#popup-img");
  const closeBtn = document.querySelector(".close");
  const images = document.querySelectorAll(".light-box");

  if (images.length != 0 && popup && popupImg && closeBtn) {
    images.forEach(image => {
      image.addEventListener("click", () => {
        popup.style.display = "block"
        popupImg.src = image.src
      })
    })
    
    closeBtn.addEventListener("click", () => {
      popup.style.display = 'none';
    })
    
    window.addEventListener("click", (e) => {
      if (e.target == popup) {
        popup.style.display = 'none';
      }
    })
  }
}

// Export functions for global use
window.checkAuthStatus = checkAuthStatus;
window.logout = logout;