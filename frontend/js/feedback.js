// frontend/js/feedback.js
document.addEventListener('DOMContentLoaded', () => {
  // Existing testimonial code...
  const clientImg = document.querySelector('.clientimg');
  const clientFeedback = document.querySelector('.review');
  const clientName = document.querySelector('.client');
  const clientRating = document.querySelector('.rating');
  const prevButton = document.getElementById('trai');
  const nextButton = document.getElementById('phai');
  let testimonials = [];
  let currentIndex = 0;

  // Fetch testimonials
  console.log('🔍 Fetching website feedback...');
  fetch('/api/feedback')
    .then(response => {
      console.log('📥 Response status:', response.status);
      return response.json();
    })
    .then(data => {
      console.log('📊 Received feedback data:', data);
      testimonials = data.slice(0, 10); // Show last 10 approved feedbacks
      console.log(`✅ Loaded ${testimonials.length} testimonials`);
      if (testimonials.length > 0) {
        displayTestimonial(currentIndex);
      } else {
        console.warn('⚠️ No testimonials found, using fallback');
        useFallbackData();
      }
    })
    .catch(error => {
      console.error('❌ Error fetching testimonials:', error);
      useFallbackData();
    });

  function useFallbackData() {
    // Fallback to mock data
    testimonials = [
      {
        name: "John Doe",
        feedback: "Amazing travel website experience!",
        rating: 5,
        img: "./images/feedback/avatar/1.jpg"
      }
    ];
    displayTestimonial(currentIndex);
  }

  function displayTestimonial(index) {
    if (testimonials.length === 0) return;
    
    const testimonial = testimonials[index];
    console.log(`📺 Displaying testimonial ${index + 1}/${testimonials.length}:`, testimonial);
    
    if (clientName) {
      clientName.textContent = testimonial.name;
      console.log('  ✅ Name set:', testimonial.name);
    }
    if (clientFeedback) {
      clientFeedback.textContent = testimonial.feedback;
      console.log('  ✅ Feedback set');
    }
    if (clientRating) {
      clientRating.innerHTML = '★'.repeat(testimonial.rating) + '☆'.repeat(5 - testimonial.rating);
      console.log('  ✅ Rating set:', testimonial.rating);
    }
    if (clientImg) {
      // Use local avatar images from feedback/avatar folder
      const avatarUrl = testimonial.img && testimonial.img !== './images/feedback/default-avatar.jpg' 
        ? testimonial.img 
        : getLocalAvatar(index);
      
      clientImg.src = avatarUrl;
      clientImg.alt = testimonial.name || 'Client';
      console.log('  ✅ Image set:', clientImg.src);
    }
  }

  // Get random avatar from local images/feedback/avatar folder
  function getLocalAvatar(index) {
    // We have 9 avatar images (1.jpg to 9.jpg)
    const avatarNumber = (index % 9) + 1;
    return `./images/feedback/avatar/${avatarNumber}.jpg`;
  }

  if (prevButton) {
    console.log('✅ Previous button found, adding click handler');
    prevButton.addEventListener('click', () => {
      console.log('⬅️ Previous button clicked');
      currentIndex = (currentIndex > 0) ? currentIndex - 1 : testimonials.length - 1;
      displayTestimonial(currentIndex);
    });
  } else {
    console.warn('⚠️ Previous button (#trai) not found!');
  }

  if (nextButton) {
    console.log('✅ Next button found, adding click handler');
    nextButton.addEventListener('click', () => {
      console.log('➡️ Next button clicked');
      currentIndex = (currentIndex < testimonials.length - 1) ? currentIndex + 1 : 0;
      displayTestimonial(currentIndex);
    });
  } else {
    console.warn('⚠️ Next button (#phai) not found!');
  }

  // Auto advance testimonials
  setInterval(() => {
    if (testimonials.length > 0) {
      currentIndex = (currentIndex < testimonials.length - 1) ? currentIndex + 1 : 0;
      displayTestimonial(currentIndex);
      console.log('🔄 Auto-advanced to testimonial', currentIndex + 1);
    }
  }, 4000);

  // Feedback form submission
  const feedbackForm = document.querySelector('#feedbackForm');
  if (feedbackForm) {
    // Form elements
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const ratingInput = document.getElementById('rating');
    const categorySelect = document.getElementById('category');
    const feedbackTextarea = document.getElementById('feedback');
    const wouldRecommendCheckbox = document.getElementById('wouldRecommend');
    const submitBtn = document.getElementById('submitBtn');
    const charCount = document.getElementById('charCount');
    const charCounter = document.querySelector('.char-counter');
    const maxChars = 500;

    // Star rating elements
    const stars = document.querySelectorAll('.star');
    const ratingLabel = document.getElementById('ratingLabel');
    let selectedRating = 0;

    // Rating labels
    const ratingLabels = {
      1: 'Poor',
      2: 'Fair',
      3: 'Good',
      4: 'Very Good',
      5: 'Excellent'
    };

    // ============ STAR RATING INTERACTION ============
    stars.forEach(star => {
      star.addEventListener('click', function() {
        selectedRating = parseInt(this.getAttribute('data-rating'));
        ratingInput.value = selectedRating;
        updateStars(selectedRating);
        ratingLabel.textContent = ratingLabels[selectedRating];
        clearError('rating');
        validateField(ratingInput);
      });

      star.addEventListener('mouseenter', function() {
        const hoverRating = parseInt(this.getAttribute('data-rating'));
        updateStars(hoverRating, true);
      });

      star.addEventListener('mouseleave', function() {
        updateStars(selectedRating);
      });
    });

    function updateStars(rating, isHover = false) {
      stars.forEach((star, index) => {
        if (index < rating) {
          star.classList.add(isHover ? 'hover' : 'active');
          if (!isHover) star.classList.remove('hover');
        } else {
          star.classList.remove('active', 'hover');
        }
      });
    }

    // ============ CHARACTER COUNTER ============
    feedbackTextarea.addEventListener('input', function() {
      const length = this.value.length;
      charCount.textContent = length;

      // Update counter color based on length
      charCounter.classList.remove('warning', 'danger');
      if (length > maxChars * 0.9) {
        charCounter.classList.add('danger');
      } else if (length > maxChars * 0.75) {
        charCounter.classList.add('warning');
      }

      // Prevent exceeding max length
      if (length > maxChars) {
        this.value = this.value.substring(0, maxChars);
        charCount.textContent = maxChars;
      }
    });

    // ============ CUSTOM SELECT DROPDOWN ============
    const categoryDisplay = document.getElementById('categoryDisplay');
    const categoryDropdown = document.getElementById('categoryDropdown');
    const categoryOptions = document.querySelectorAll('.custom-option');

    // Toggle dropdown
    if (categoryDisplay) {
      categoryDisplay.addEventListener('click', function() {
        categoryDropdown.classList.toggle('active');
        console.log('🖱️ Category dropdown toggled');
      });
    }

    // Select option
    categoryOptions.forEach(option => {
      option.addEventListener('click', function() {
        const value = this.getAttribute('data-value');
        const text = this.textContent;
        
        // Update hidden input
        categorySelect.value = value;
        
        // Update display input
        categoryDisplay.value = text;
        
        // Update styling
        if (value) {
          categoryDisplay.classList.add('selected');
        } else {
          categoryDisplay.classList.remove('selected');
        }
        
        // Update selected class
        categoryOptions.forEach(opt => opt.classList.remove('selected'));
        this.classList.add('selected');
        
        // Close dropdown
        categoryDropdown.classList.remove('active');
        
        console.log('✅ Category selected:', value);
        console.log('📝 Selected text:', text);
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.custom-select-wrapper')) {
        if (categoryDropdown) {
          categoryDropdown.classList.remove('active');
        }
      }
    });

    // ============ VALIDATION FUNCTIONS ============
    function validateEmail(email) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
    }

    function validatePhone(phone) {
      // Vietnamese phone format: +84 or 0, followed by 9-10 digits
      const re = /^(\+84|0)[0-9]{9,10}$/;
      return re.test(phone.replace(/\s/g, ''));
    }

    function validateField(field) {
      const fieldId = field.id;
      let isValid = true;
      let errorMessage = '';

      // Clear previous error
      clearError(fieldId);

      // Name validation
      if (fieldId === 'name') {
        if (field.value.trim().length < 2) {
          errorMessage = 'Name must be at least 2 characters';
          isValid = false;
        }
      }

      // Email validation
      if (fieldId === 'email') {
        if (!validateEmail(field.value)) {
          errorMessage = 'Please enter a valid email address';
          isValid = false;
        }
      }

      // Phone validation (optional field)
      if (fieldId === 'phone' && field.value.trim()) {
        if (!validatePhone(field.value)) {
          errorMessage = 'Please enter a valid phone number';
          isValid = false;
        }
      }

      // Rating validation
      if (fieldId === 'rating') {
        if (!field.value || field.value === '0') {
          errorMessage = 'Please select a rating';
          isValid = false;
        }
      }

      // Feedback validation
      if (fieldId === 'feedback') {
        if (field.value.trim().length < 10) {
          errorMessage = 'Feedback must be at least 10 characters';
          isValid = false;
        }
      }

      if (!isValid) {
        showError(fieldId, errorMessage);
        field.classList.add('error');
        field.classList.remove('success');
      } else {
        field.classList.remove('error');
        field.classList.add('success');
      }

      return isValid;
    }

    function showError(fieldId, message) {
      const errorElement = document.getElementById(`${fieldId}-error`);
      if (errorElement) {
        errorElement.textContent = message;
      }
    }

    function clearError(fieldId) {
      const errorElement = document.getElementById(`${fieldId}-error`);
      if (errorElement) {
        errorElement.textContent = '';
      }
    }

    // ============ REAL-TIME VALIDATION ============
    nameInput.addEventListener('blur', () => validateField(nameInput));
    emailInput.addEventListener('blur', () => validateField(emailInput));
    if (phoneInput) phoneInput.addEventListener('blur', () => validateField(phoneInput));
    feedbackTextarea.addEventListener('blur', () => validateField(feedbackTextarea));

    // Clear error on input
    [nameInput, emailInput, phoneInput, feedbackTextarea].forEach(input => {
      if (input) {
        input.addEventListener('input', function() {
          if (this.classList.contains('error')) {
            clearError(this.id);
            this.classList.remove('error');
          }
        });
      }
    });

    // ============ FORM SUBMISSION ============
    feedbackForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Validate all required fields
      const isNameValid = validateField(nameInput);
      const isEmailValid = validateField(emailInput);
      const isRatingValid = validateField(ratingInput);
      const isFeedbackValid = validateField(feedbackTextarea);

      if (!isNameValid || !isEmailValid || !isRatingValid || !isFeedbackValid) {
        // Scroll to first error
        const firstError = feedbackForm.querySelector('.error');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        showToast('Please fix the errors before submitting', 'error');
        return;
      }

      // Show loading state
      submitBtn.disabled = true;
      submitBtn.querySelector('.btn-text').style.display = 'none';
      submitBtn.querySelector('.btn-loading').style.display = 'inline-flex';

      try {
        const userId = localStorage.getItem('userId');
        const formData = {
          name: nameInput.value.trim(),
          email: emailInput.value.trim(),
          phone: phoneInput ? phoneInput.value.trim() : '',
          rating: parseInt(ratingInput.value),
          category: categorySelect.value,
          feedback: feedbackTextarea.value.trim(),
          wouldRecommend: wouldRecommendCheckbox.checked,
          userId: userId
        };

        console.log('📤 Submitting feedback:', formData);
        
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        console.log('📥 Response status:', response.status);
        
        const data = await response.json();
        console.log('📥 Response data:', data);
        
        if (response.ok) {
          showToast('Thank you for your feedback! We appreciate your input to improve our website.', 'success');
          
          // Reset form
          feedbackForm.reset();
          selectedRating = 0;
          updateStars(0);
          ratingLabel.textContent = 'Click to rate our website';
          charCount.textContent = '0';
          charCounter.classList.remove('warning', 'danger');
          
          // Remove success classes
          document.querySelectorAll('.form-control').forEach(field => {
            field.classList.remove('success', 'error');
          });

          // Smooth scroll to top of form
          feedbackForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          showToast(data.message || 'Error submitting feedback. Please try again.', 'error');
        }
      } catch (error) {
        console.error('Feedback error:', error);
        showToast('Connection error. Please check your internet and try again.', 'error');
      } finally {
        // Hide loading state
        submitBtn.disabled = false;
        submitBtn.querySelector('.btn-text').style.display = 'inline';
        submitBtn.querySelector('.btn-loading').style.display = 'none';
      }
    });
  }
});