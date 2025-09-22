// frontend/js/reservation.js
document.addEventListener('DOMContentLoaded', () => {
  const reservationForm = document.querySelector('#reservationForm');
  
  if (reservationForm) {
    reservationForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const userId = localStorage.getItem('userId');
      const urlParams = new URLSearchParams(window.location.search);
      const tourId = urlParams.get('tourId');
      
      const formData = {
        tourId: tourId,
        customerInfo: {
          name: document.querySelector('#name').value,
          email: document.querySelector('#email').value,
          phone: document.querySelector('#phone').value
        },
        numberOfPeople: parseInt(document.querySelector('#people').value),
        bookingDate: document.querySelector('#date').value,
        totalAmount: calculateTotal(),
        userId: userId
      };
      
      try {
        const response = await fetch('/api/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
          alert(`Booking successful! Booking ID: ${data.bookingId}`);
          window.location.href = 'index.html';
        } else {
          alert('Error creating booking. Please try again.');
        }
      } catch (error) {
        console.error('Booking error:', error);
        alert('Connection error. Please try again.');
      }
    });
  }
  
  function calculateTotal() {
    // Calculate based on tour price and number of people
    // This should be implemented based on your pricing logic
    return 5000; // Placeholder
  }
});