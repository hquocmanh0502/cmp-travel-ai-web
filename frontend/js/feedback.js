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
  fetch('/api/feedback')
    .then(response => response.json())
    .then(data => {
      testimonials = data.slice(0, 10); // Show last 10 approved feedbacks
      if (testimonials.length > 0) {
        displayTestimonial(currentIndex);
      }
    })
    .catch(error => {
      console.error('Error fetching testimonials:', error);
      // Fallback to mock data
      testimonials = [
        {
          name: "John Doe",
          feedback: "Amazing travel experience!",
          rating: 5,
          img: "./images/feedback/client1.jpg"
        }
      ];
      displayTestimonial(currentIndex);
    });

  function displayTestimonial(index) {
    if (testimonials.length === 0) return;
    
    const testimonial = testimonials[index];
    if (clientName) clientName.textContent = testimonial.name;
    if (clientFeedback) clientFeedback.textContent = testimonial.feedback;
    if (clientRating) {
      clientRating.innerHTML = '★'.repeat(testimonial.rating) + '☆'.repeat(5 - testimonial.rating);
    }
    if (clientImg) {
      clientImg.src = testimonial.img || './images/feedback/default-avatar.jpg';
    }
  }

  if (prevButton) {
    prevButton.addEventListener('click', () => {
      currentIndex = (currentIndex > 0) ? currentIndex - 1 : testimonials.length - 1;
      displayTestimonial(currentIndex);
    });
  }

  if (nextButton) {
    nextButton.addEventListener('click', () => {
      currentIndex = (currentIndex < testimonials.length - 1) ? currentIndex + 1 : 0;
      displayTestimonial(currentIndex);
    });
  }

  // Auto advance testimonials
  setInterval(() => {
    if (nextButton) nextButton.click();
  }, 4000);

  // Feedback form submission
  const feedbackForm = document.querySelector('#feedbackForm');
  if (feedbackForm) {
    feedbackForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const userId = localStorage.getItem('userId');
      const formData = {
        name: document.querySelector('#name').value,
        email: document.querySelector('#email').value,
        rating: parseInt(document.querySelector('#rating').value),
        feedback: document.querySelector('#feedback').value,
        userId: userId
      };
      
      try {
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
          alert('Thank you for your feedback!');
          feedbackForm.reset();
        } else {
          alert('Error submitting feedback. Please try again.');
        }
      } catch (error) {
        console.error('Feedback error:', error);
        alert('Connection error. Please try again.');
      }
    });
  }
});