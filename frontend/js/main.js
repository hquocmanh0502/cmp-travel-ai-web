// frontend/js/main.js

// Authentication functions
function checkAuthStatus() {
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');
  
  const usernameElements = document.querySelectorAll('#username');
  const greetingElements = document.querySelectorAll('.greeting-li');
  const authElements = document.querySelectorAll('.auth-li, #auth-li');
  
  console.log('🔍 Checking auth status:', { userId, username });
  
  if (userId && username) {
    // User đã đăng nhập - HIỆN greeting, ẨN auth buttons
    usernameElements.forEach(el => {
      if (el) el.textContent = username;
    });
    greetingElements.forEach(el => {
      if (el) {
        el.style.display = 'inline-block';
        el.style.visibility = 'visible';
      }
    });
    authElements.forEach(el => {
      if (el) {
        el.style.display = 'none';
      }
    });
    
    console.log('✅ User logged in:', username);
  } else {
    // User CHƯA đăng nhập - ẨN greeting, HIỆN auth buttons
    greetingElements.forEach(el => {
      if (el) {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
      }
    });
    authElements.forEach(el => {
      if (el) {
        el.style.display = 'inline-block';
      }
    });
    
    console.log('❌ User not logged in');
  }
}

function logout() {
  localStorage.removeItem('userId');
  localStorage.removeItem('username');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userFullName');
  
  console.log('🚪 User logged out');
  alert('Đăng xuất thành công!');
  
  // Refresh auth status immediately
  checkAuthStatus();
  
  // Redirect to home page
  window.location.href = 'index.html';
}

// Main DOM initialization
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 DOM loaded, initializing...');
  
  // Check auth status first
  checkAuthStatus();
  
  // Handle dropdown functionality
  const userGreeting = document.querySelector('.user-greeting');
  const greetingLi = document.querySelector('.greeting-li');
  
  if (userGreeting && greetingLi) {
    userGreeting.addEventListener('click', (e) => {
      e.stopPropagation();
      greetingLi.classList.toggle('active');
      console.log('🔽 Dropdown toggled');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!greetingLi.contains(e.target)) {
        greetingLi.classList.remove('active');
      }
    });
    
    // Handle logout - Find logout link
    const logoutLinks = document.querySelectorAll('.user-dropdown-menu a');
    logoutLinks.forEach((link) => {
      if (link.textContent.includes('Đăng xuất') || link.textContent.includes('Logout')) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          logout();
        });
      }
    });
  }
  
  // Initialize other components
  initializeFooter();
  initializeScrollReveal();
  initializeImagePopup();
  initializeFormSubmit();
  initializeScrollIcons(); // 🔥 KHÔI PHỤC SCROLL ICONS
});

// 🔥 KHÔI PHỤC SCROLL FUNCTIONS
function initializeScrollIcons() {
  const scrollDownIcon = document.getElementById('scrollDownIcon');
  const scrollUpIcon = document.getElementById('scrollUpIcon');
  
  if (scrollDownIcon) {
    scrollDownIcon.addEventListener('click', () => {
      window.scrollBy({
        top: window.innerHeight,
        behavior: 'smooth'
      });
    });
  }
  
  if (scrollUpIcon) {
    scrollUpIcon.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
  
  // Show/hide scroll icons based on scroll position
  window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollUpIcon) {
      if (scrollTop > 300) {
        scrollUpIcon.style.display = 'block';
      } else {
        scrollUpIcon.style.display = 'none';
      }
    }
  });
}

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