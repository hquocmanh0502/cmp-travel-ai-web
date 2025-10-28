// frontend/js/contact.js - Enhanced Contact Form
document.addEventListener('DOMContentLoaded', () => {
  const contactForm = document.querySelector('#contactForm');
  const submitBtn = document.querySelector('#submit-btn');
  const messageTextarea = document.querySelector('#message');
  const charCount = document.querySelector('#char-count');

  // Character counter for message
  if (messageTextarea && charCount) {
    messageTextarea.addEventListener('input', () => {
      const count = messageTextarea.value.length;
      charCount.textContent = count;
      
      if (count > 900) {
        charCount.style.color = '#dc3545';
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
  }

  // Show success
  function showSuccess(fieldId) {
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
      showError('name', 'Name must be at least 2 characters');
    } else {
      showSuccess('name');
    }
  });

  document.querySelector('#email')?.addEventListener('blur', (e) => {
    if (!validateEmail(e.target.value)) {
      showError('email', 'Please enter a valid email address');
    } else {
      showSuccess('email');
    }
  });

  document.querySelector('#phone')?.addEventListener('blur', (e) => {
    if (e.target.value && !validatePhone(e.target.value)) {
      showError('phone', 'Please enter a valid Vietnamese phone number');
    } else {
      showSuccess('phone');
    }
  });

  document.querySelector('#subject')?.addEventListener('change', (e) => {
    if (!e.target.value) {
      showError('subject', 'Please select a subject');
    } else {
      showSuccess('subject');
    }
  });

  document.querySelector('#message')?.addEventListener('blur', (e) => {
    if (e.target.value.trim().length < 10) {
      showError('message', 'Message must be at least 10 characters');
    } else {
      showSuccess('message');
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
          showToast('Please fix the errors in the form', 'error');
        }
        return;
      }
      
      // Show loading state
      submitBtn.disabled = true;
      document.querySelector('.btn-text').style.display = 'none';
      document.querySelector('.btn-loader').style.display = 'inline-flex';
      
      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            name, 
            email, 
            phone, 
            subject,
            message 
          })
        });
        
        if (response.ok) {
          // Success
          if (typeof showToast === 'function') {
            showToast('✅ Message sent successfully! We will contact you soon.', 'success');
          } else {
            alert('✅ Message sent successfully! We will contact you soon.');
          }
          
          // Reset form
          contactForm.reset();
          clearErrors();
          if (charCount) charCount.textContent = '0';
          
          // Smooth scroll to top
          window.scrollTo({ top: 0, behavior: 'smooth' });
          
        } else {
          const data = await response.json();
          if (typeof showToast === 'function') {
            showToast('❌ ' + (data.error || 'Error sending message. Please try again.'), 'error');
          } else {
            alert('❌ Error sending message. Please try again.');
          }
        }
      } catch (error) {
        console.error('Contact error:', error);
        if (typeof showToast === 'function') {
          showToast('❌ Connection error. Please check your internet and try again.', 'error');
        } else {
          alert('❌ Connection error. Please try again.');
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