// Newsletter subscription functionality for footer email boxes
class NewsletterManager {
  constructor() {
    this.apiUrl = 'http://localhost:3000/api/newsletter';
    this.lastSubscriptionTime = 0;
    this.minInterval = 5000; // 5 seconds between subscriptions
    this.recentEmails = new Set();
    this.init();
  }

  // Initialize newsletter functionality
  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.bindEvents());
    } else {
      this.bindEvents();
    }
  }

  // Bind events to all footer email boxes
  bindEvents() {
    // Find all email input boxes in footer - look for inputs inside .email-box containers
    const emailInputs = document.querySelectorAll('footer .email-box input[type="email"], .footer-subscribe input[type="email"], footer input[type="email"]');
    
    emailInputs.forEach(input => {
      // Remove any existing event listeners to prevent duplicates
      const boundHandler = this.handleKeyPress.bind(this);
      input.removeEventListener('keypress', boundHandler);
      
      // Add keypress event listener
      input.addEventListener('keypress', boundHandler);
      
      // Add visual feedback on focus
      input.addEventListener('focus', this.onInputFocus.bind(this));
      input.addEventListener('blur', this.onInputBlur.bind(this));
      
      // Add placeholder hint
      if (input.placeholder && !input.placeholder.includes('Enter')) {
        input.setAttribute('title', 'Press Enter to subscribe');
      }
    });

    console.log(`Newsletter: Initialized ${emailInputs.length} email input(s) in footer`);
  }

  // Handle keypress events
  handleKeyPress(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const email = event.target.value.trim();
      
      if (email) {
        this.subscribeToNewsletter(email, event.target);
      } else {
        this.showToast('Please enter a valid email address', 'error');
      }
    }
  }

  // Handle input focus
  onInputFocus(event) {
    event.target.style.borderColor = '#3B82F6';
    event.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
  }

  // Handle input blur
  onInputBlur(event) {
    event.target.style.borderColor = '';
    event.target.style.boxShadow = '';
  }

  // Subscribe to newsletter
  async subscribeToNewsletter(email, inputElement) {
    // Validate email format
    if (!this.isValidEmail(email)) {
      this.showToast('Please enter a valid email address', 'error');
      return;
    }

    // Check rate limiting - prevent spam
    const now = Date.now();
    if (now - this.lastSubscriptionTime < this.minInterval) {
      const remainingSeconds = Math.ceil((this.minInterval - (now - this.lastSubscriptionTime)) / 1000);
      this.showToast(`Please wait ${remainingSeconds} seconds before subscribing again`, 'error');
      return;
    }

    // Check if email was recently subscribed (prevent duplicate submissions)
    if (this.recentEmails.has(email.toLowerCase())) {
      this.showToast('This email was recently subscribed. Please check your inbox.', 'error');
      return;
    }

    // Update rate limit timestamp
    this.lastSubscriptionTime = now;

    // Show loading state
    const originalValue = inputElement.value;
    const originalPlaceholder = inputElement.placeholder;
    
    inputElement.disabled = true;
    inputElement.value = '';
    inputElement.placeholder = 'Subscribing...';
    inputElement.style.backgroundColor = '#F3F4F6';

    try {
      const response = await fetch(`${this.apiUrl}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          source: 'footer',
          subscribedFrom: window.location.href
        })
      });

      const data = await response.json();

      if (data.success) {
        // Success
        this.showToast(data.message || 'Successfully subscribed to newsletter!', 'success');
        inputElement.value = '';
        inputElement.placeholder = 'Email subscribed ✓';
        
        // Add to recent emails set and remove after 60 seconds
        this.recentEmails.add(email.toLowerCase());
        setTimeout(() => {
          this.recentEmails.delete(email.toLowerCase());
        }, 60000);
        
        // Reset placeholder after 3 seconds
        setTimeout(() => {
          inputElement.placeholder = originalPlaceholder;
        }, 3000);
        
      } else {
        // Error from server
        this.showToast(data.message || 'Subscription failed. Please try again.', 'error');
        inputElement.value = originalValue;
      }

    } catch (error) {
      console.error('Newsletter subscription error:', error);
      this.showToast('Network error. Please check your connection and try again.', 'error');
      inputElement.value = originalValue;
    } finally {
      // Reset input state
      inputElement.disabled = false;
      inputElement.style.backgroundColor = '';
      
      if (inputElement.placeholder === 'Subscribing...') {
        inputElement.placeholder = originalPlaceholder;
      }
    }
  }

  // Validate email format
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Show toast notification
  showToast(message, type = 'info') {
    // Remove any existing toasts
    const existingToasts = document.querySelectorAll('.newsletter-toast');
    existingToasts.forEach(toast => toast.remove());

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `newsletter-toast fixed top-4 right-4 max-w-sm p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full z-50`;
    
    // Set toast styling based on type
    switch (type) {
      case 'success':
        toast.classList.add('bg-green-500', 'text-white');
        break;
      case 'error':
        toast.classList.add('bg-red-500', 'text-white');
        break;
      default:
        toast.classList.add('bg-blue-500', 'text-white');
    }

    // Create toast content
    const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
    toast.innerHTML = `
      <div class="flex items-center space-x-3">
        <span class="text-lg font-bold">${icon}</span>
        <span class="text-sm font-medium">${message}</span>
      </div>
    `;

    // Add to DOM
    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.classList.remove('translate-x-full');
    }, 100);

    // Auto hide after 5 seconds
    setTimeout(() => {
      toast.classList.add('translate-x-full');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 5000);

    // Click to dismiss
    toast.addEventListener('click', () => {
      toast.classList.add('translate-x-full');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    });
  }

  // Method to manually trigger subscription (for button clicks)
  manualSubscribe(email) {
    if (email && this.isValidEmail(email)) {
      this.subscribeToNewsletter(email, { 
        value: '', 
        placeholder: 'Enter your email',
        disabled: false,
        style: {}
      });
    }
  }

  // Method to reinitialize (useful for dynamically loaded content)
  reinit() {
    this.bindEvents();
  }
}

// Initialize newsletter manager
const newsletterManager = new NewsletterManager();

// Make it globally available
window.newsletterManager = newsletterManager;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NewsletterManager;
}
