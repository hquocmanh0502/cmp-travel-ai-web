// frontend/js/contact.js - Enhanced Contact Form with API Integration
const API_BASE_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
  const contactForm = document.querySelector('#contactForm');
  const submitBtn = document.querySelector('#submit-btn');
  const messageTextarea = document.querySelector('#message');
  const charCount = document.querySelector('#char-count');

  // Override HTML5 validation messages to English
  const emailInput = document.querySelector('#email');
  if (emailInput) {
    emailInput.addEventListener('invalid', function(e) {
      if (this.validity.valueMissing) {
        this.setCustomValidity('Please enter your email address.');
      } else if (this.validity.typeMismatch) {
        this.setCustomValidity('Please enter a valid email address (e.g., name@example.com).');
      } else {
        this.setCustomValidity('');
      }
    });
    
    emailInput.addEventListener('input', function() {
      this.setCustomValidity('');
    });
  }

  // Override other required field validation messages
  const nameInput = document.querySelector('#name');
  if (nameInput) {
    nameInput.addEventListener('invalid', function(e) {
      if (this.validity.valueMissing) {
        this.setCustomValidity('Please enter your full name.');
      } else {
        this.setCustomValidity('');
      }
    });
    
    nameInput.addEventListener('input', function() {
      this.setCustomValidity('');
    });
  }

  const subjectSelect = document.querySelector('#subject');
  if (subjectSelect) {
    subjectSelect.addEventListener('invalid', function(e) {
      if (this.validity.valueMissing) {
        this.setCustomValidity('Please select a contact subject.');
      } else {
        this.setCustomValidity('');
      }
    });
    
    subjectSelect.addEventListener('change', function() {
      this.setCustomValidity('');
    });
  }

  if (messageTextarea) {
    messageTextarea.addEventListener('invalid', function(e) {
      if (this.validity.valueMissing) {
        this.setCustomValidity('Please enter your message.');
      } else {
        this.setCustomValidity('');
      }
    });
    
    messageTextarea.addEventListener('input', function() {
      this.setCustomValidity('');
    });
  }

  // Character counter for message
  if (messageTextarea && charCount) {
    let hasShownWelcome = false;
    
    messageTextarea.addEventListener('input', () => {
      const count = messageTextarea.value.length;
      charCount.textContent = count;
      
      // Show welcome toast on first interaction
      if (!hasShownWelcome && count > 0) {
        hasShownWelcome = true;
        if (typeof showInfo === 'function') {
          showInfo('Welcome!', 'Thank you for your interest in CMP Travel. We will respond within 24 hours.', 'info', 4000);
        }
      }
      
      if (count > 900) {
        charCount.style.color = '#dc3545';
        if (count === 950 && typeof showWarning === 'function') {
          showWarning('Character Limit Warning', 'Your message is approaching the 1000 character limit.', 'warning', 3000);
        }
      } else if (count > 800) {
        charCount.style.color = '#ff8533';
      } else {
        charCount.style.color = '#999';
      }
    });
  }

  // Email validation
  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  // Phone validation (Vietnamese format)
  function validatePhone(phone) {
    if (!phone) return true; // Optional field
    const re = /^(\+84|0)[0-9]{9,10}$/;
    return re.test(phone.replace(/\s/g, ''));
  }

  // Show error message
  function showError(fieldId, message) {
    const field = document.querySelector(`#${fieldId}`);
    const errorElement = document.querySelector(`#${fieldId}-error`);
    const formGroup = field.closest('.form-group');
    
    if (errorElement) {
      errorElement.textContent = message;
    }
    if (formGroup) {
      formGroup.classList.add('error');
      formGroup.classList.remove('success');
    }
    
    // Show toast for validation error
    if (typeof showToast === 'function') {
      const fieldLabels = {
        name: 'Name',
        email: 'Email',  
        phone: 'Phone Number',
        subject: 'Subject',
        message: 'Message'
      };
      
      showToast(`${fieldLabels[fieldId] || 'Field'} Error`, message, 'warning', 3000);
    }
  }

  // Clear error message and show field success
  function showFieldSuccess(fieldId) {
    const field = document.querySelector(`#${fieldId}`);
    const errorElement = document.querySelector(`#${fieldId}-error`);
    const formGroup = field.closest('.form-group');
    
    if (errorElement) {
      errorElement.textContent = '';
    }
    if (formGroup) {
      formGroup.classList.add('success');
      formGroup.classList.remove('error');
    }
  }
  
  // Show completion progress
  function checkFormProgress() {
    const requiredFields = ['name', 'email', 'subject', 'message'];
    const completedFields = requiredFields.filter(fieldId => {
      const field = document.querySelector(`#${fieldId}`);
      return field && field.value.trim() !== '';
    });
    
    const progress = (completedFields.length / requiredFields.length) * 100;
    
    if (progress === 50 && typeof showInfo === 'function') {
      showInfo('Great Progress!', 'You have completed 50% of the form. Keep going!', 'info', 2000);
    } else if (progress === 100 && typeof showSuccess === 'function') {
      showSuccess('Form Complete!', 'All required information has been filled. You can submit your message now.', 'success', 3000);
    }
  }

  // Clear all errors
  function clearErrors() {
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
    document.querySelectorAll('.form-group').forEach(el => {
      el.classList.remove('error', 'success');
    });
  }

  // Real-time validation
  document.querySelector('#name')?.addEventListener('blur', (e) => {
    if (e.target.value.trim().length < 2) {
      showError('name', 'Name must be at least 2 characters long');
    } else {
      showFieldSuccess('name');
      checkFormProgress();
    }
  });

  document.querySelector('#email')?.addEventListener('blur', (e) => {
    if (!validateEmail(e.target.value)) {
      showError('email', 'Please enter a valid email address');
    } else {
      showFieldSuccess('email');
      checkFormProgress();
    }
  });

  document.querySelector('#phone')?.addEventListener('blur', (e) => {
    if (e.target.value && !validatePhone(e.target.value)) {
      showError('phone', 'Please enter a valid Vietnamese phone number (e.g., +84 123 456 789)');
    } else {
      showFieldSuccess('phone');
    }
  });

  document.querySelector('#subject')?.addEventListener('change', (e) => {
    if (!e.target.value) {
      showError('subject', 'Please select a subject for your message');
    } else {
      showFieldSuccess('subject');
      checkFormProgress();
      
      // Show helpful tips based on subject
      if (typeof showInfo === 'function') {
        const tips = {
          'tour': 'Tip: Please let us know your destination, travel dates, and number of travelers for the best consultation!',
          'booking': 'Tip: Please provide your booking reference (if available) for faster assistance.',
          'complaint': 'Tip: Please describe the issue in detail so we can resolve it effectively.',
          'general': 'Tip: Ask specific questions to receive the most accurate response.'
        };
        
        if (tips[e.target.value]) {
          setTimeout(() => showInfo('Helpful Tip', tips[e.target.value], 'info', 5000), 500);
        }
      }
    }
  });

  document.querySelector('#message')?.addEventListener('blur', (e) => {
    const length = e.target.value.trim().length;
    if (length < 10) {
      showError('message', 'Message content must be at least 10 characters long');
    } else {
      showFieldSuccess('message');
      checkFormProgress();
      
      // Encourage detailed messages
      if (length >= 50 && length < 100 && typeof showInfo === 'function') {
        setTimeout(() => showInfo('Excellent!', 'Detailed messages help us provide better support. Thank you!', 'info', 3000), 500);
      }
    }
  });

  // Form submission
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors();
      
      // Get form values
      const name = document.querySelector('#name').value.trim();
      const email = document.querySelector('#email').value.trim();
      const phone = document.querySelector('#phone').value.trim();
      const subject = document.querySelector('#subject').value;
      const message = document.querySelector('#message').value.trim();
      
      // Validate all fields
      let isValid = true;
      
      if (name.length < 2) {
        showError('name', 'Name must be at least 2 characters');
        isValid = false;
      }
      
      if (!validateEmail(email)) {
        showError('email', 'Please enter a valid email address');
        isValid = false;
      }
      
      if (phone && !validatePhone(phone)) {
        showError('phone', 'Please enter a valid phone number');
        isValid = false;
      }
      
      if (!subject) {
        showError('subject', 'Please select a subject');
        isValid = false;
      }
      
      if (message.length < 10) {
        showError('message', 'Message must be at least 10 characters');
        isValid = false;
      }
      
      if (!isValid) {
        if (typeof showToast === 'function') {
          showToast('Invalid Information', 'Please check and fix the errors in the form before submitting.', 'warning', 4000);
        }
        return;
      }
      
      // Show loading toast
      const loadingToast = showLoading('Sending Message', 'Your message is being sent...');
      
      // Show loading state
      submitBtn.disabled = true;
      document.querySelector('.btn-text').style.display = 'none';
      document.querySelector('.btn-loader').style.display = 'inline-flex';
      
      try {
        // Prepare contact data
        // Map form subject to backend category enum
        const categoryMapping = {
          'general': 'general',
          'tour': 'general', // Tour info maps to general
          'booking': 'booking', 
          'complaint': 'complaint',
          'other': 'other'
        };
        
        const contactData = {
          name,
          email,
          phone,
          category: categoryMapping[subject] || 'general', // Use valid enum value
          subject: subject === 'general' ? 'General Inquiry' : 
                  subject === 'tour' ? 'Tour Information' : 
                  subject === 'booking' ? 'Booking Support' : 
                  subject === 'complaint' ? 'Complaint' : 
                  subject === 'other' ? 'Other' : 'General Inquiry',
          message
        };

        console.log('Sending contact data:', contactData);

        const response = await fetch(`${API_BASE_URL}/contacts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(contactData)
        });
        
        const result = await response.json();
        console.log('Contact response:', result);
        
        // Hide loading toast
        if (loadingToast) {
          hideToast(loadingToast);
        }
        
        if (result.success) {
          // Success
          if (typeof showToast === 'function') {
            showToast('Success!', `Your message has been sent successfully! Contact ID: ${result.contactId}. We will get back to you within 24 hours.`, 'success', 5000);
          } else {
            alert(`✅ Message sent successfully! Contact ID: ${result.contactId}. We will contact you back as soon as possible.`);
          }
          
          // Reset form
          contactForm.reset();
          clearErrors();
          if (charCount) charCount.textContent = '0';
          
          // Show additional info toast after success
          setTimeout(() => {
            if (typeof showInfo === 'function') {
              showInfo('Additional Info', 'You can track your request status via email or call our hotline: +84 123 456 789', 'info', 7000);
            }
          }, 2000);
          
          // Smooth scroll to top
          window.scrollTo({ top: 0, behavior: 'smooth' });
          
        } else {
          if (typeof showToast === 'function') {
            showToast('Message Send Error', result.error || 'Unable to send message. Please try again later or contact us directly by phone.', 'error', 6000);
          } else {
            alert('❌ ' + (result.error || 'Unable to send message. Please try again.'));
          }
        }
      } catch (error) {
        console.error('Contact error:', error);
        
        // Hide loading toast
        if (loadingToast) {
          hideToast(loadingToast);
        }
        
        if (typeof showToast === 'function') {
          showToast('Connection Error', 'Unable to connect to server. Please check your network connection and try again.', 'error', 6000);
        } else {
          alert('❌ Connection error. Please try again later.');
        }
      } finally {
        // Reset button state
        submitBtn.disabled = false;
        document.querySelector('.btn-text').style.display = 'inline';
        document.querySelector('.btn-loader').style.display = 'none';
      }
    });
  }
});