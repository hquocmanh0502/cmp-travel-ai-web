// frontend/js/contact.js
document.addEventListener('DOMContentLoaded', () => {
  const contactForm = document.querySelector('#contactForm');
  
  // If no form with ID, try to find contact form by other means
  if (!contactForm) {
    const submitButton = document.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const name = document.querySelector('#name')?.value || '';
        const email = document.querySelector('#email')?.value || '';
        const message = document.querySelector('#message')?.value || '';
        
        if (!name || !email || !message) {
          alert('Vui lòng điền đầy đủ thông tin!');
          return;
        }
        
        try {
          const response = await fetch('/api/contact', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, message })
          });
          
          if (response.ok) {
            alert('Gửi liên hệ thành công!');
            document.querySelector('#name').value = '';
            document.querySelector('#email').value = '';
            document.querySelector('#message').value = '';
          } else {
            alert('Có lỗi xảy ra. Vui lòng thử lại!');
          }
        } catch (error) {
          console.error('Contact error:', error);
          alert('Lỗi kết nối. Vui lòng thử lại!');
        }
      });
    }
  } else {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = {
        name: document.querySelector('#name').value,
        email: document.querySelector('#email').value,
        message: document.querySelector('#message').value
      };
      
      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });
        
        if (response.ok) {
          alert('Message sent successfully!');
          contactForm.reset();
        } else {
          alert('Error sending message. Please try again.');
        }
      } catch (error) {
        console.error('Contact error:', error);
        alert('Connection error. Please try again.');
      }
    });
  }
});