document.addEventListener('DOMContentLoaded', () => {
  // ✅ DEBUG: Check if validation functions are loaded
  console.log('🔍 Reservation.js loaded successfully');
  console.log('✅ Validation functions available:', {
    validateRoomCapacity: typeof validateRoomCapacity,
    setupRoomValidation: typeof setupRoomValidation,
    updateRoomSuggestion: typeof updateRoomSuggestion
  });
  
  // ✅ LOAD BOOKING DATA TỪ SESSION STORAGE
  loadBookingData();
  
  // ✅ SETUP ROOM VALIDATION
  setupRoomValidation();
  
  const reservationForm = document.querySelector('form');
  
  if (reservationForm) {
    reservationForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const pendingBooking = JSON.parse(sessionStorage.getItem('pendingBooking'));
      if (!pendingBooking) {
        showNotification('Không tìm thấy thông tin đặt tour. Vui lòng quay lại trang chi tiết tour.', 'error');
        window.location.href = 'destination.html';
        return;
      }
      
      // ✅ VALIDATE ROOM CAPACITY BEFORE SUBMIT
      if (!validateRoomCapacity()) {
        showNotification('Vui lòng chọn đủ số phòng cho số khách đã đặt!', 'error');
        return;
      }
      
      // Check authentication
      const token = localStorage.getItem('authToken');
      const userId = localStorage.getItem('userId');
      

      if (!token && !userId) {
        console.error('❌ Authentication failed - Missing credentials');
        showNotification('Vui lòng đăng nhập để đặt tour', 'error');
        
        setTimeout(() => {
          window.location.href = 'login.html?redirect=reservation.html';
        }, 2000);
        return;
      }
      
      console.log('✅ Authentication OK - Proceeding with booking');

      // ✅ DEBUG: Log auth status
      console.log('🔐 Auth Check:', {
        hasToken: !!token,
        hasUserId: !!userId,
        token: token ? token.substring(0, 20) + '...' : 'null',
        userId: userId || 'null'
      });
      
      if (!token || !userId) {
        console.error('❌ Authentication failed - Missing credentials');
        showNotification('Vui lòng đăng nhập để đặt tour', 'error');
        
        // ✅ Save current booking data before redirect
        const currentUrl = window.location.pathname + window.location.search;
        localStorage.setItem('redirectAfterLogin', currentUrl);
        
        setTimeout(() => {
          window.location.href = 'login.html?redirect=reservation.html';
        }, 2000);
        return;
      }
      
      console.log('✅ Authentication OK - Proceeding with booking');
      
      // Collect form data
      const checkinDate = document.querySelector('input[type="date"]').value;
      const checkoutDate = document.querySelectorAll('input[type="date"]')[1].value;
      
      const formData = {
        userId: userId, // ✅ Add userId for backend
        tourId: pendingBooking.tourId,
        hotelId: pendingBooking.selectedHotel?.id || null,
        checkinDate: checkinDate,
        checkoutDate: checkoutDate,
        departureDate: checkinDate, // Same as checkin for now
        adults: parseInt(document.querySelector('select[name="adult"]')?.value) || pendingBooking.adults || 1,
        children: parseInt(document.querySelector('select[name="children"]')?.value) || pendingBooking.children || 0,
        infants: 0,
        
        rooms: {
          superior: parseInt(document.querySelector('select[name="superior"]')?.value) || 0,
          juniorDeluxe: parseInt(document.querySelector('select[name="junior-deluxe"]')?.value) || 0,
          deluxe: parseInt(document.querySelector('select[name="deluxe"]')?.value) || 0,
          suite: parseInt(document.querySelector('select[name="suite"]')?.value) || 0,
          family: parseInt(document.querySelector('select[name="family"]')?.value) || 0,
          president: parseInt(document.querySelector('select[name="president"]')?.value) || 0
        },
        
        services: {
          meals: {
            breakfast: document.querySelector('#restaurant-1')?.checked || false,
            lunch: document.querySelector('#restaurant-2')?.checked || false,
            dinner: document.querySelectorAll('input[name="restaurant"]')[2]?.checked || false
          },
          transfer: document.querySelector('input[name="transfer"]:checked')?.value || 'none',
          insurance: false,
          tourGuide: true
        },
        
        customerInfo: {
          title: document.querySelector('#customer-title')?.value || 'Mr',
          fullName: document.querySelector('input[placeholder="Full Name *"]')?.value || '',
          email: document.querySelector('input[type="email"]')?.value || '',
          phone: document.querySelector('input[type="number"]')?.value || '',
          specialRequests: document.querySelector('#other-request')?.value || ''
        },
        
        tourBaseCost: pendingBooking.tourPrice || pendingBooking.totalPrice || 0,
        accommodationCost: calculateAccommodationCost(),
        servicesCost: calculateServicesCost(),
        totalAmount: pendingBooking.totalPrice || 0
      };
      
      // Validation
      if (!formData.customerInfo.fullName || !formData.customerInfo.email || !formData.customerInfo.phone) {
        showNotification('Vui lòng điền đầy đủ thông tin khách hàng', 'error');
        return;
      }
      
      if (!checkinDate) {
        showNotification('Vui lòng chọn ngày khởi hành', 'error');
        return;
      }
      
      try {
        showLoading();
        
        const response = await fetch('/api/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        hideLoading();
        
        if (response.ok && data.success) {
          // Clear pending booking data
          sessionStorage.removeItem('pendingBooking');
          
          // Show success message
          showSuccessMessage(data.bookingId);
          
          // Redirect after delay
          setTimeout(() => {
            window.location.href = 'my-bookings.html';
          }, 3000);
        } else {
          throw new Error(data.error || 'Booking failed');
        }
      } catch (error) {
        hideLoading();
        console.error('Booking error:', error);
        showNotification('Có lỗi xảy ra: ' + error.message, 'error');
      }
    });
  }
});

// ✅ FUNCTION LOAD BOOKING DATA VÀ HIỂN THỊ THÔNG TIN
function loadBookingData() {
  const pendingBooking = JSON.parse(sessionStorage.getItem('pendingBooking'));
  
  if (pendingBooking) {
    // Display tour info
    const tourInfo = document.createElement('div');
    tourInfo.className = 'booking-summary';
    tourInfo.innerHTML = `
      <div class="booking-info-card">
        <h4><i class="fas fa-map-marked-alt"></i> Thông tin tour đã chọn</h4>
        <div class="tour-summary">
          <p><strong>Tour:</strong> ${pendingBooking.tourName}</p>
          <p><strong>Khách sạn:</strong> ${pendingBooking.selectedHotel.name}</p>
          <p><strong>Ngày khởi hành:</strong> ${pendingBooking.checkinDate}</p>
          <p><strong>Số khách:</strong> ${pendingBooking.adults} người lớn${pendingBooking.children > 0 ? `, ${pendingBooking.children} trẻ em` : ''}</p>
          <p><strong>Tổng tiền tour:</strong> <span class="price-highlight">$${pendingBooking.totalPrice.toLocaleString()}</span></p>
        </div>
      </div>
    `;
    
    // Insert before form
    const container = document.querySelector('.container');
    const form = container.querySelector('form');
    container.insertBefore(tourInfo, form);
    
    // Pre-fill form data
    const checkinInput = document.querySelector('input[type="date"]');
    if (checkinInput) {
      checkinInput.value = pendingBooking.checkinDate;
    }
    
    // Set checkout date (1 day after checkin for default)
    const checkoutInput = document.querySelectorAll('input[type="date"]')[1];
    if (checkoutInput && pendingBooking.checkinDate) {
      const checkout = new Date(pendingBooking.checkinDate);
      checkout.setDate(checkout.getDate() + 1);
      checkoutInput.value = checkout.toISOString().split('T')[0];
    }
    
    // Pre-select guest numbers
    const adultSelect = document.querySelector('select[name="adult"]');
    const childrenSelect = document.querySelector('select[name="children"]');
    
    if (adultSelect && pendingBooking.adults > 0) {
      adultSelect.value = pendingBooking.adults;
      // ✅ LOCK ADULTS SELECT (không cho thay đổi)
      adultSelect.disabled = true;
      adultSelect.style.backgroundColor = '#f0f0f0';
      adultSelect.style.cursor = 'not-allowed';
    }
    if (childrenSelect && pendingBooking.children > 0) {
      childrenSelect.value = pendingBooking.children;
      // ✅ LOCK CHILDREN SELECT (không cho thay đổi)
      childrenSelect.disabled = true;
      childrenSelect.style.backgroundColor = '#f0f0f0';
      childrenSelect.style.cursor = 'not-allowed';
    }
    
    // ✅ SHOW INITIAL ROOM SUGGESTION
    updateRoomSuggestion();
  } else {
    // No booking data - redirect back
    const urlParams = new URLSearchParams(window.location.search);
    const tourId = urlParams.get('tourId');
    
    if (tourId) {
      alert('Vui lòng chọn khách sạn trước khi đặt tour.');
      window.location.href = `detail.html?id=${tourId}`;
    } else {
      alert('Không tìm thấy thông tin đặt tour. Vui lòng chọn tour từ trang chủ.');
      window.location.href = 'destination.html';
    }
  }
}

function showSuccessMessage(bookingId) {
  const successMsg = document.createElement('div');
  successMsg.className = 'booking-success-overlay';
  successMsg.innerHTML = `
    <div class="success-modal">
      <div class="success-icon">
        <i class="fas fa-check-circle"></i>
      </div>
      <h3>Đặt tour thành công!</h3>
      <p>Mã đặt tour của bạn: <strong>${bookingId}</strong></p>
      <p>Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất.</p>
      <div class="success-actions">
        <button onclick="window.location.href='my-bookings.html'" class="btn btn-primary">
          <i class="fas fa-list"></i> Xem đơn đặt tour
        </button>
        <button onclick="window.location.href='destination.html'" class="btn btn-secondary">
          <i class="fas fa-search"></i> Tìm tour khác
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(successMsg);
}

// ✅ ROOM CAPACITY VALIDATION FUNCTIONS
function validateRoomCapacity() {
  const adults = parseInt(document.querySelector('select[name="adult"]')?.value) || 0;
  const children = parseInt(document.querySelector('select[name="children"]')?.value) || 0;
  const totalGuests = adults + children;
  
  if (totalGuests === 0) {
    return true; // No guests selected yet
  }
  
  // Calculate total rooms selected
  const totalRooms = getTotalRoomsSelected();
  
  if (totalRooms === 0) {
    showRoomWarning('Vui lòng chọn ít nhất 1 phòng!');
    return false;
  }
  
  // Room capacity rules:
  // Superior, Junior Deluxe, Deluxe: max 2 adults + 1 child = 3 guests
  // Suite: max 3 adults + 1 child = 4 guests
  // Family: max 2 adults + 2 children = 4 guests
  // President: max 4 adults + 2 children = 6 guests
  
  const superior = parseInt(document.querySelector('select[name="superior"]')?.value || 0);
  const juniorDeluxe = parseInt(document.querySelector('select[name="junior-deluxe"]')?.value || 0);
  const deluxe = parseInt(document.querySelector('select[name="deluxe"]')?.value || 0);
  const suite = parseInt(document.querySelector('select[name="suite"]')?.value || 0);
  const family = parseInt(document.querySelector('select[name="family"]')?.value || 0);
  const president = parseInt(document.querySelector('select[name="president"]')?.value || 0);
  
  // Calculate max capacity
  const maxCapacity = 
    (superior * 3) + 
    (juniorDeluxe * 3) + 
    (deluxe * 3) + 
    (suite * 4) + 
    (family * 4) + 
    (president * 6);
  
  if (totalGuests > maxCapacity) {
    showRoomWarning(`Số phòng đã chọn chỉ chứa tối đa ${maxCapacity} khách. Bạn cần thêm phòng!`);
    return false;
  }
  
  // Calculate minimum rooms needed (assuming avg 3 guests per room)
  const minRoomsNeeded = Math.ceil(totalGuests / 3);
  
  if (totalRooms < minRoomsNeeded) {
    showRoomWarning(`Bạn cần ít nhất ${minRoomsNeeded} phòng cho ${totalGuests} khách!`);
    return false;
  }
  
  hideRoomWarning();
  return true;
}

function getTotalRoomsSelected() {
  return (
    parseInt(document.querySelector('select[name="superior"]')?.value || 0) +
    parseInt(document.querySelector('select[name="junior-deluxe"]')?.value || 0) +
    parseInt(document.querySelector('select[name="deluxe"]')?.value || 0) +
    parseInt(document.querySelector('select[name="suite"]')?.value || 0) +
    parseInt(document.querySelector('select[name="family"]')?.value || 0) +
    parseInt(document.querySelector('select[name="president"]')?.value || 0)
  );
}

function showRoomWarning(message) {
  const warningDiv = document.getElementById('room-warning');
  const warningText = document.getElementById('room-warning-text');
  
  if (warningDiv && warningText) {
    warningText.textContent = message;
    warningDiv.style.display = 'block';
    warningDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function hideRoomWarning() {
  const warningDiv = document.getElementById('room-warning');
  if (warningDiv) {
    warningDiv.style.display = 'none';
  }
}

function updateRoomSuggestion() {
  const adults = parseInt(document.querySelector('select[name="adult"]')?.value) || 0;
  const children = parseInt(document.querySelector('select[name="children"]')?.value) || 0;
  const totalGuests = adults + children;
  
  const suggestionText = document.getElementById('suggestion-text');
  
  if (!suggestionText) return;
  
  if (totalGuests === 0) {
    suggestionText.innerHTML = 'Vui lòng chọn số khách trước';
    return;
  }
  
  let suggestion = '';
  
  if (totalGuests <= 2) {
    suggestion = '1 phòng Superior hoặc Deluxe';
  } else if (totalGuests <= 3) {
    suggestion = '1 phòng Deluxe, Suite hoặc Family';
  } else if (totalGuests <= 4) {
    suggestion = '1 phòng Family, 1 Suite hoặc 2 phòng Superior';
  } else if (totalGuests <= 6) {
    suggestion = '1 phòng President, 2 phòng Deluxe hoặc 1 Suite + 1 Family';
  } else if (totalGuests <= 8) {
    suggestion = `2-3 phòng (hỗn hợp các loại) cho ${totalGuests} khách`;
  } else {
    suggestion = `Tối thiểu ${Math.ceil(totalGuests / 3)} phòng cho ${totalGuests} khách`;
  }
  
  suggestionText.innerHTML = `${suggestion} <small class="text-muted">(${totalGuests} khách: ${adults} người lớn${children > 0 ? `, ${children} trẻ em` : ''})</small>`;
}

function setupRoomValidation() {
  const roomSelects = [
    'superior', 'junior-deluxe', 'deluxe', 
    'suite', 'family', 'president'
  ];
  
  // Add change listeners to all room selects
  roomSelects.forEach(roomType => {
    const select = document.querySelector(`select[name="${roomType}"]`);
    if (select) {
      select.addEventListener('change', () => {
        validateRoomCapacity();
        updateRoomSuggestion();
      });
    }
  });
  
  // Add change listeners to guest selects (in case they're not locked)
  const adultSelect = document.querySelector('select[name="adult"]');
  const childrenSelect = document.querySelector('select[name="children"]');
  
  if (adultSelect) {
    adultSelect.addEventListener('change', () => {
      validateRoomCapacity();
      updateRoomSuggestion();
    });
  }
  
  if (childrenSelect) {
    childrenSelect.addEventListener('change', () => {
      validateRoomCapacity();
      updateRoomSuggestion();
    });
  }
}

function calculateAccommodationCost() {
  // Placeholder function - implement pricing logic
  return 0;
}

function calculateServicesCost() {
  // Placeholder function - implement pricing logic
  return 0;
}

function showLoading() {
  // Create loading overlay if not exists
  let loadingOverlay = document.getElementById('loading-overlay');
  if (!loadingOverlay) {
    loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loading-overlay';
    loadingOverlay.innerHTML = `
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Đang xử lý đặt tour...</p>
      </div>
    `;
    document.body.appendChild(loadingOverlay);
  }
  loadingOverlay.style.display = 'flex';
}

function hideLoading() {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = 'none';
  }
}