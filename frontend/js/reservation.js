document.addEventListener('DOMContentLoaded', () => {
  // ✅ DEBUG: Check session storage immediately
  console.log('🔍 DOMContentLoaded fired');
  console.log('📦 SessionStorage pendingBooking:', sessionStorage.getItem('pendingBooking'));
  
  // ✅ DEBUG: Check if validation functions are loaded
  console.log('🔍 Reservation.js loaded successfully');
  console.log('✅ Validation functions available:', {
    validateRoomCapacity: typeof validateRoomCapacity,
    setupRoomValidation: typeof setupRoomValidation,
    // updateRoomSuggestion: removed smart suggestions
  });
  
  // ✅ POPULATE BOOKING SUMMARY CARD (first for visual feedback)
  setTimeout(() => {
    console.log('⏰ Running populateBookingSummary after 100ms delay');
    populateBookingSummary();
  }, 100);
  
  // ✅ LOAD BOOKING DATA AND APPLY CONSTRAINTS (with delay to ensure DOM is ready)
  setTimeout(() => {
    console.log('⏰ Running loadBookingData after 200ms delay');
    loadBookingData();
  }, 200);
  
  // ✅ SETUP ROOM VALIDATION
  setupRoomValidation();
  
  // ✅ SETUP INPUT VALIDATION
  setupInputValidation();
  
  const reservationForm = document.querySelector('form');
  
  console.log('🔍 Form found:', !!reservationForm);
  
  if (reservationForm) {
    console.log('✅ Attaching submit event listener to form');
    
    reservationForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      console.log('🚀 FORM SUBMIT EVENT FIRED!');
      console.log('📝 Event details:', e);
      
      const pendingBooking = JSON.parse(sessionStorage.getItem('pendingBooking'));
      if (!pendingBooking) {
        showNotification('Booking information not found. Please return to tour detail page.', 'error');
        window.location.href = 'destination.html';
        return;
      }
      
      // ✅ VALIDATE ALL INPUT FIELDS
      if (!validateAllFields()) {
        showNotification('Please fill in all information accurately!', 'error');
        // Scroll to first error
        const firstError = document.querySelector('.field-error');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
      
      // ✅ VALIDATE ROOM CAPACITY BEFORE SUBMIT
      if (!validateRoomCapacity()) {
        showNotification('Please select enough rooms for the number of guests booked!', 'error');
        return;
      }
      
      // Check authentication
      const token = localStorage.getItem('authToken');
      const userId = localStorage.getItem('userId');
      
      console.log('🔐 Auth Check:', {
        hasToken: !!token,
        hasUserId: !!userId,
        userId: userId,
        userIdType: typeof userId
      });

      if (!token && !userId) {
        console.error('❌ Authentication failed - Missing credentials');
        showNotification('Please login to book a tour', 'error');
        
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
        showNotification('Please login to book a tour', 'error');
        
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
      const checkinDate = document.querySelector('#checkin-date')?.value || pendingBooking.checkinDate;
      const checkoutDate = document.querySelector('#checkout-date')?.value;
      
      // Get adult/children values - prefer pendingBooking if form is locked
      const adultValue = document.querySelector('#adult')?.value;
      const childrenValue = document.querySelector('#children')?.value;
      
      const adults = adultValue ? parseInt(adultValue) : (pendingBooking.adults || 1);
      const children = childrenValue ? parseInt(childrenValue) : (pendingBooking.children || 0);
      
      console.log('📋 Form values:', { checkinDate, checkoutDate, adults, children });
      
      // ✅ Validate hotelId - must be valid MongoDB ObjectId (24 hex chars)
      const hotelId = pendingBooking.selectedHotel?.id;
      const isValidObjectId = hotelId && /^[0-9a-fA-F]{24}$/.test(hotelId);
      
      console.log('🏨 Hotel validation:', {
        hotelId: hotelId,
        isValidObjectId: isValidObjectId,
        willSend: isValidObjectId ? hotelId : null
      });
      
      // ✅ CRITICAL: Ensure ALL required fields are present
      // Backend requires: userId, tourId, checkinDate, checkoutDate, departureDate, adults, customerInfo
      const formData = {
        userId: userId,
        tourId: pendingBooking.tourId,
        hotelId: isValidObjectId ? hotelId : null, // ✅ Only send valid ObjectId
        selectedGuide: pendingBooking.selectedGuide?.id || null, // ✅ Add selected guide
        
        // ✅ Store tour and hotel names for display purposes
        tourName: pendingBooking.tourName || 'Tour',
        hotelName: pendingBooking.selectedHotel?.name || 'No hotel',
        guideName: pendingBooking.selectedGuide?.name || null,
        
        checkinDate: checkinDate,
        checkoutDate: checkoutDate || checkinDate, // ✅ Default to checkin if not provided
        departureDate: checkinDate, // ✅ Use checkin date as departure
        adults: adults,
        children: children,
        infants: 0,
        
        rooms: {
          superior: parseInt(document.querySelector('#room-superior')?.value) || 0,
          juniorDeluxe: parseInt(document.querySelector('#room-junior-deluxe')?.value) || 0,
          deluxe: parseInt(document.querySelector('#room-deluxe')?.value) || 0,
          suite: parseInt(document.querySelector('#room-suite')?.value) || 0,
          family: parseInt(document.querySelector('#room-family')?.value) || 0,
          president: parseInt(document.querySelector('#room-president')?.value) || 0
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
          fullName: document.querySelector('#customer-fullname')?.value || '',
          email: document.querySelector('#customer-email')?.value || '',
          phone: document.querySelector('#customer-phone')?.value || '',
          specialRequests: document.querySelector('#other-request')?.value || ''
        },
        
        tourBaseCost: pendingBooking.tourPrice || pendingBooking.totalPrice || 0,
        accommodationCost: calculateAccommodationCost(),
        servicesCost: calculateServicesCost(),
        totalAmount: pendingBooking.totalPrice || 0
      };
      
      // Validation
      console.log('🔍 =============== VALIDATION START ===============');
      console.log('  - userId:', userId, typeof userId);
      console.log('  - tourId:', formData.tourId, typeof formData.tourId);
      console.log('  - hotelId:', formData.hotelId, typeof formData.hotelId);
      console.log('  - checkinDate:', formData.checkinDate, typeof formData.checkinDate);
      console.log('  - checkoutDate:', formData.checkoutDate, typeof formData.checkoutDate);
      console.log('  - departureDate:', formData.departureDate, typeof formData.departureDate);
      console.log('  - adults:', formData.adults, typeof formData.adults);
      console.log('  - customerInfo:', formData.customerInfo);
      console.log('🔍 =============== VALIDATION END ===============');
      
      if (!userId) {
        showNotification('User ID is missing. Please login again.', 'error');
        return;
      }
      
      if (!formData.tourId) {
        showNotification('Tour ID is missing. Please select tour again.', 'error');
        setTimeout(() => window.location.href = 'destination.html', 2000);
        return;
      }
      
      if (!formData.customerInfo.fullName || !formData.customerInfo.email || !formData.customerInfo.phone) {
        showNotification('Please fill in all customer information', 'error');
        return;
      }
      
      if (!checkinDate) {
        showNotification('Please select check-in date', 'error');
        return;
      }
      
      if (!formData.checkoutDate) {
        showNotification('Please select check-out date', 'error');
        return;
      }
      
      console.log('📤 Sending booking data:', formData);
      
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
        
        console.log('📥 Response status:', response.status);
        
        const data = await response.json();
        
        console.log('📥 =============== BACKEND RESPONSE ===============');
        console.log('Status:', response.status);
        console.log('Success:', data.success);
        console.log('Message:', data.message);
        console.log('Error:', data.error);
        console.log('Full response:', data);
        console.log('📥 =============== END RESPONSE ===============');
        
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
        showNotification('An error occurred: ' + error.message, 'error');
      }
    });
    
    // ✅ DEBUG: Add click listener to submit button
    const submitBtn = reservationForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      console.log('✅ Submit button found:', submitBtn);
      submitBtn.addEventListener('click', (e) => {
        console.log('🖱️ SUBMIT BUTTON CLICKED!');
        console.log('Button element:', e.target);
        console.log('Button disabled:', submitBtn.disabled);
      });
    } else {
      console.warn('⚠️ Submit button NOT found in form');
    }
  } else {
    console.error('❌ Form NOT found on page');
  }
});

// ✅ FUNCTION LOAD BOOKING DATA VÀ HIỂN THỊ THÔNG TIN
function loadBookingData() {
  try {
    console.log('🔄 loadBookingData() called');
    const bookingDataString = sessionStorage.getItem('pendingBooking');
    console.log('📦 Raw sessionStorage data:', bookingDataString);
    
    if (!bookingDataString) {
      console.warn('⚠️ No pendingBooking in sessionStorage');
      return;
    }
    
    const pendingBooking = JSON.parse(bookingDataString);
    console.log('📦 loadBookingData - pendingBooking:', pendingBooking);
  
    if (pendingBooking) {
      console.log('✅ Booking data found, applying constraints...');
    
    // ✅ APPLY BOOKING CONSTRAINTS - Lock dates, guests from booking data
    const checkinInput = document.querySelector('#checkin-date');
    const checkoutInput = document.querySelector('#checkout-date');
    
    console.log('🔍 Found elements:', {
      checkinInput: !!checkinInput,
      checkoutInput: !!checkoutInput
    });
    
    // Set and LOCK check-in date from booking
    if (checkinInput && pendingBooking.checkinDate) {
      checkinInput.value = pendingBooking.checkinDate;
      checkinInput.readOnly = true;
      checkinInput.style.backgroundColor = '#f0f0f0 !important';
      checkinInput.style.cursor = 'not-allowed';
      checkinInput.style.opacity = '0.7';
      checkinInput.style.border = '2px solid #ff6600';
      checkinInput.title = 'Check-in date selected from booking';
      
      console.log('✅ Check-in date locked:', checkinInput.value, 'readOnly:', checkinInput.readOnly);
      
      // ✅ Set minimum date to prevent past dates
      const today = new Date().toISOString().split('T')[0];
      checkinInput.min = today;
    } else {
      console.warn('⚠️ Check-in input not found or no date');
    }
    
    // Set checkout date and apply constraints
    if (checkoutInput && pendingBooking.checkinDate) {
      // ✅ Calculate checkout date based on tour duration
      let checkoutDate;
      
      if (pendingBooking.tourDuration) {
        // Parse duration like "7 days 6 nights" or "5 days" or "1 week"
        const durationMatch = pendingBooking.tourDuration.match(/(\d+)\s*(day|week)/i);
        let days = 1; // Default 1 day
        
        if (durationMatch) {
          const value = parseInt(durationMatch[1]);
          const unit = durationMatch[2].toLowerCase();
          
          if (unit === 'week') {
            days = value * 7;
          } else {
            days = value;
          }
        }
        
        checkoutDate = new Date(pendingBooking.checkinDate);
        checkoutDate.setDate(checkoutDate.getDate() + days);
        
        console.log(`✅ Calculated checkout from duration: ${pendingBooking.tourDuration} = ${days} days`);
      } else {
        // Fallback: default 1 day
        checkoutDate = new Date(pendingBooking.checkinDate);
        checkoutDate.setDate(checkoutDate.getDate() + 1);
      }
      
      checkoutInput.value = checkoutDate.toISOString().split('T')[0];
      
      console.log('✅ Check-out date set:', checkoutInput.value);
      
      // ✅ Set minimum checkout date (must be after check-in)
      const minCheckoutDate = new Date(pendingBooking.checkinDate);
      minCheckoutDate.setDate(minCheckoutDate.getDate() + 1);
      checkoutInput.min = minCheckoutDate.toISOString().split('T')[0];
      
      // ✅ Lock checkout if tour has fixed duration
      if (pendingBooking.tourDuration) {
        checkoutInput.readOnly = true;
        checkoutInput.style.backgroundColor = '#f0f0f0 !important';
        checkoutInput.style.cursor = 'not-allowed';
        checkoutInput.style.opacity = '0.7';
        checkoutInput.style.border = '2px solid #ff6600';
        checkoutInput.title = `Check-out date auto-calculated from tour duration: ${pendingBooking.tourDuration}`;
        console.log('🔒 Check-out date LOCKED based on tour duration');
      } else {
        // Allow manual adjustment if no fixed duration
        checkoutInput.addEventListener('change', function() {
          const checkinDate = new Date(checkinInput.value);
          const checkoutDate = new Date(this.value);
          
          if (checkoutDate <= checkinDate) {
            showNotification('Ngày check-out phải sau ngày check-in!', 'error');
            const minCheckout = new Date(checkinDate);
            minCheckout.setDate(minCheckout.getDate() + 1);
            this.value = minCheckout.toISOString().split('T')[0];
          }
        });
      }
    } else {
      console.warn('⚠️ Check-out input not found or no date');
    }
    
    // ✅ LOCK guest numbers from booking
    const adultSelect = document.querySelector('#adult');
    const childrenSelect = document.querySelector('#children');
    
    console.log('🔍 Found guest selects:', {
      adultSelect: !!adultSelect,
      childrenSelect: !!childrenSelect,
      adults: pendingBooking.adults,
      children: pendingBooking.children
    });
    
    if (adultSelect) {
      if (pendingBooking.adults > 0) {
        adultSelect.value = pendingBooking.adults.toString();
      }
      // LOCK - không cho thay đổi số người đã đặt
      adultSelect.disabled = true;
      adultSelect.style.backgroundColor = '#f0f0f0 !important';
      adultSelect.style.cursor = 'not-allowed';
      adultSelect.style.opacity = '0.7';
      adultSelect.style.border = '2px solid #ff6600';
      adultSelect.title = 'Number of adults selected from booking';
      
      console.log('✅ Adult select locked:', adultSelect.value, 'disabled:', adultSelect.disabled);
    } else {
      console.error('❌ Adult select not found!');
    }
    
    if (childrenSelect) {
      if (pendingBooking.children > 0) {
        childrenSelect.value = pendingBooking.children.toString();
      } else {
        childrenSelect.value = '0';
      }
      // LOCK - không cho thay đổi số trẻ em đã đặt
      childrenSelect.disabled = true;
      childrenSelect.style.backgroundColor = '#f0f0f0 !important';
      childrenSelect.style.cursor = 'not-allowed';
      childrenSelect.style.opacity = '0.7';
      childrenSelect.style.border = '2px solid #ff6600';
      childrenSelect.title = 'Number of children selected from booking';
      
      console.log('✅ Children select locked:', childrenSelect.value, 'disabled:', childrenSelect.disabled);
    } else {
      console.error('❌ Children select not found!');
    }
    
    // Removed smart room suggestion - using simple validation instead
    
    console.log('✅ loadBookingData completed - all constraints applied');
    }
  } catch (error) {
    console.error('❌ Error in loadBookingData():', error);
    console.error('Stack trace:', error.stack);
  }
}

// ✅ POPULATE BOOKING SUMMARY CARD AT TOP OF PAGE
function populateBookingSummary() {
  console.log('🔍 populateBookingSummary called');
  
  const pendingBooking = JSON.parse(sessionStorage.getItem('pendingBooking'));
  
  console.log('📦 pendingBooking data:', pendingBooking);
  
  if (!pendingBooking) {
    console.warn('⚠️ No pendingBooking found in sessionStorage');
    // Hide summary card if no booking data
    const summaryCard = document.getElementById('booking-summary-card');
    if (summaryCard) {
      summaryCard.style.display = 'none';
    }
    return;
  }
  
  console.log('✅ Found booking data, populating summary card...');
  
  // Populate tour name
  const tourName = document.getElementById('summary-tour');
  if (tourName) {
    tourName.textContent = pendingBooking.tourName || 'Tour not selected';
    console.log('✅ Set tour name:', tourName.textContent);
  } else {
    console.error('❌ Element #summary-tour not found');
  }
  
  // Populate hotel name
  const hotelName = document.getElementById('summary-hotel');
  if (hotelName) {
    hotelName.textContent = pendingBooking.selectedHotel?.name || 'Hotel not selected';
    console.log('✅ Set hotel name:', hotelName.textContent);
  } else {
    console.error('❌ Element #summary-hotel not found');
  }
  
  // Populate tour guide
  const guideName = document.getElementById('summary-guide');
  if (guideName) {
    guideName.textContent = pendingBooking.selectedGuide?.name || 'N/A';
    console.log('✅ Set guide name:', guideName.textContent);
  } else {
    console.error('❌ Element #summary-guide not found');
  }
  
  // Populate check-in date
  const checkinDate = document.getElementById('summary-checkin');
  if (checkinDate && pendingBooking.checkinDate) {
    const date = new Date(pendingBooking.checkinDate);
    checkinDate.textContent = date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    console.log('✅ Set check-in date:', checkinDate.textContent);
  } else if (checkinDate) {
    checkinDate.textContent = 'Date not selected';
    console.warn('⚠️ No checkinDate in pendingBooking');
  } else {
    console.error('❌ Element #summary-checkin not found');
  }
  
  // Populate guests
  const guests = document.getElementById('summary-guests');
  if (guests) {
    const adults = pendingBooking.adults || 0;
    const children = pendingBooking.children || 0;
    let guestText = '';
    
    if (adults > 0) {
      guestText += `${adults} adult${adults > 1 ? 's' : ''}`;
    }
    if (children > 0) {
      if (guestText) guestText += ', ';
      guestText += `${children} child${children > 1 ? 'ren' : ''}`;
    }
    
    guests.textContent = guestText || 'Guests not selected';
    console.log('✅ Set guests:', guests.textContent);
  } else {
    console.error('❌ Element #summary-guests not found');
  }
  
  // Populate total price
  const price = document.getElementById('summary-price');
  if (price) {
    const totalPrice = pendingBooking.totalPrice || 0;
    price.textContent = `$${totalPrice.toLocaleString()}`;
    console.log('✅ Set price:', price.textContent);
  } else {
    console.error('❌ Element #summary-price not found');
  }
  
  console.log('✅ Booking summary populated successfully!');
}

function showSuccessMessage(bookingId) {
  const successMsg = document.createElement('div');
  successMsg.className = 'booking-success-overlay';
  successMsg.innerHTML = `
    <div class="success-modal">
      <div class="success-icon">
        <i class="fas fa-check-circle"></i>
      </div>
      <h3>Tour Booking Successful!</h3>
      <p>Your booking ID: <strong>${bookingId}</strong></p>
      <p>We will contact you as soon as possible.</p>
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

// ✅ SMART ROOM CAPACITY SYSTEM WITH HOTEL DATA
let currentHotelRoomData = null; // Store hotel room data for intelligent suggestions

// Load hotel room data for smart suggestions
async function loadHotelRoomData(hotelId) {
  if (!hotelId) return null;
  
  try {
    const response = await fetch(`http://localhost:3000/api/hotels/${hotelId}`);
    if (response.ok) {
      const hotel = await response.json();
      currentHotelRoomData = hotel.roomTypes || [];
      console.log('🏨 Hotel room data loaded:', currentHotelRoomData);
      return currentHotelRoomData;
    }
  } catch (error) {
    console.log('⚠️ Could not load hotel data, using default capacity rules');
  }
  return null;
}

// Get room capacity based on hotel data or default rules  
function getRoomCapacity(roomType) {
  // First try to get from loaded hotel data
  if (currentHotelRoomData) {
    const roomData = currentHotelRoomData.find(room => 
      room.type.toLowerCase().replace(' ', '-') === roomType.toLowerCase() ||
      room.type.toLowerCase() === roomType.toLowerCase().replace('-', ' ')
    );
    
    if (roomData && roomData.capacity) {
      return {
        adults: roomData.capacity.adults,
        children: roomData.capacity.children,
        total: roomData.capacity.total,
        available: roomData.available !== false
      };
    }
  }
  
  // Fallback to default capacity rules (no pricing for all-inclusive tours)
  const defaultCapacities = {
    'superior': { adults: 2, children: 1, total: 3 },
    'junior-deluxe': { adults: 2, children: 1, total: 3 },
    'deluxe': { adults: 2, children: 2, total: 4 },
    'suite': { adults: 3, children: 1, total: 4 },
    'family': { adults: 2, children: 3, total: 5 },
    'president': { adults: 4, children: 2, total: 6 }
  };
  
  return defaultCapacities[roomType] || { adults: 2, children: 1, total: 3 };
}

// Enhanced room validation with smart suggestions
function validateRoomCapacity() {
  const adults = parseInt(document.querySelector('#adult')?.value) || 0;
  const children = parseInt(document.querySelector('#children')?.value) || 0;
  const infants = parseInt(document.querySelector('#infant')?.value) || 0;
  
  // Only adults + children count toward room capacity (infants don't count)
  const countableGuests = adults + children;
  
  if (countableGuests === 0 && adults === 0) {
    hideRoomWarning();
    return true; // No guests selected yet
  }
  
  // Calculate total rooms selected and their capacity
  const roomSelection = getCurrentRoomSelection();
  const totalRooms = roomSelection.total;
  const totalCapacity = roomSelection.capacity;
  
  if (totalRooms === 0) {
    if (countableGuests > 0) {
      showRoomInfo(`Please select rooms for ${countableGuests} people (${adults} adults + ${children} children). Infants don't require separate beds.`);
    }
    return false;
  }
  
  // Rule 1: Cannot have more rooms than adults + children (each person can have max 1 room)
  if (totalRooms > countableGuests) {
    showRoomInfo(`Invalid selection: You have ${totalRooms} rooms for only ${countableGuests} people (adults + children). Each person can have maximum 1 room. Please reduce rooms.`);
    return false;
  }
  
  // Rule 2: Must have enough capacity for adults + children
  if (countableGuests > totalCapacity) {
    const shortage = countableGuests - totalCapacity;
    showRoomInfo(`Insufficient capacity: Selected rooms can only accommodate ${totalCapacity} guests, but you have ${countableGuests} people (adults + children). Please add more rooms or select larger rooms.`);
    return false;
  }
  
  // Rule 3: Warning when room capacity is much larger than needed (3+ people excess)
  const excessCapacity = totalCapacity - countableGuests;
  if (excessCapacity >= 3) {
    showRoomInfo(`Notice: Your selected rooms can accommodate ${totalCapacity} guests, but you only have ${countableGuests} people. You might want to consider selecting smaller rooms to optimize your booking.`);
    return true; // Still valid, just a notice
  }
  
  // Success case
  hideRoomWarning();
  
  return true;
}

// Get current room selection details
function getCurrentRoomSelection() {
  const roomTypes = ['superior', 'junior-deluxe', 'deluxe', 'suite', 'family', 'president'];
  let totalRooms = 0;
  let totalCapacity = 0;
  let details = [];
  
  roomTypes.forEach(roomType => {
    const count = parseInt(document.querySelector(`select[name="${roomType}"]`)?.value || 0);
    if (count > 0) {
      const capacity = getRoomCapacity(roomType);
      totalRooms += count;
      totalCapacity += capacity.total * count;
      details.push({
        type: roomType,
        count: count,
        capacity: capacity.total * count
      });
    }
  });
  
  return {
    total: totalRooms,
    capacity: totalCapacity,
    details: details
  };
}

// Simple room validation - removed complex smart suggestion system

// Removed smart suggestion functions - using simple validation instead

// Show informational message (not error)
function showRoomInfo(message) {
  const warningDiv = document.querySelector('.room-warning') || createRoomWarningDiv();
  warningDiv.innerHTML = `
    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i> ${message}
    </div>
  `;
  warningDiv.style.display = 'block';
}

// Enhanced room warning function with different types
function showRoomWarning(message, type = 'warning') {
  const warningDiv = document.querySelector('.room-warning') || createRoomWarningDiv();
  
  const alertClass = {
    'warning': 'alert-warning',
    'error': 'alert-danger',
    'suggestion': 'alert-info',
    'info': 'alert-info'
  }[type] || 'alert-warning';
  
  const icon = {
    'warning': 'fa-exclamation-triangle',
    'error': 'fa-times-circle',
    'suggestion': 'fa-lightbulb',
    'info': 'fa-info-circle'
  }[type] || 'fa-exclamation-triangle';
  
  warningDiv.innerHTML = `
    <div class="alert ${alertClass}">
      <i class="fas ${icon}"></i> ${message}
    </div>
  `;
  warningDiv.style.display = 'block';
}

function createRoomWarningDiv() {
  const warningDiv = document.createElement('div');
  warningDiv.className = 'room-warning';
  warningDiv.style.marginTop = '15px';
  
  // Insert after the room selection section
  const roomSection = document.querySelector('.form-group:has([name="superior"])') || 
                     document.querySelector('select[name="superior"]')?.closest('.form-group');
  
  if (roomSection) {
    roomSection.parentNode.insertBefore(warningDiv, roomSection.nextSibling);
  }
  
  return warningDiv;
}

function hideRoomWarning() {
  const warningDiv = document.querySelector('.room-warning');
  if (warningDiv) {
    warningDiv.style.display = 'none';
  }
}

// Enhanced booking summary update with room details
function updateBookingSummary() {
  const pendingBooking = JSON.parse(sessionStorage.getItem('pendingBooking') || '{}');
  const roomSelection = getCurrentRoomSelection();
  
  const summaryElement = document.querySelector('.booking-summary-content');
  if (!summaryElement) return;
  
  let roomDetailsHtml = '';
  if (roomSelection.details.length > 0) {
    roomDetailsHtml = `
      <div class="room-breakdown">
        <h6>Room Details:</h6>
        ${roomSelection.details.map(room => `
          <div class="room-detail-item">
            <span>${room.count} ${room.type.replace('-', ' ')}</span>
            <span>${room.capacity} guests</span>
          </div>
        `).join('')}
        <div class="room-detail-total">
          <strong>Total Capacity: ${roomSelection.capacity} guests</strong>
        </div>
      </div>
    `;
  }
  
  // Update summary with room information
  const existingContent = summaryElement.innerHTML;
  const roomSectionRegex = /<div class="room-breakdown">[\s\S]*?<\/div>\s*<\/div>/;
  
  if (roomSectionRegex.test(existingContent)) {
    summaryElement.innerHTML = existingContent.replace(roomSectionRegex, roomDetailsHtml);
  } else {
    summaryElement.innerHTML += roomDetailsHtml;
  }
}

function getTotalRoomsSelected() {
  return getCurrentRoomSelection().total;
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

// Removed updateRoomSuggestion and autoSelectRooms functions - using simple validation instead
  
// Removed autoSelectRooms function - using simple validation instead

function setupRoomValidation() {
  console.log('🏨 Setting up enhanced room validation with hotel data');
  
  // Load hotel data for intelligent suggestions
  const pendingBooking = JSON.parse(sessionStorage.getItem('pendingBooking') || '{}');
  if (pendingBooking.selectedHotel?.id) {
    loadHotelRoomData(pendingBooking.selectedHotel.id).then(() => {
      console.log('✅ Hotel room data loaded for smart suggestions');
      // Trigger initial validation after hotel data is loaded
      setTimeout(validateRoomCapacity, 100);
    });
  }
  
  const roomSelects = [
    { id: 'room-superior', name: 'superior' },
    { id: 'room-junior-deluxe', name: 'junior-deluxe' },
    { id: 'room-deluxe', name: 'deluxe' },
    { id: 'room-suite', name: 'suite' },
    { id: 'room-family', name: 'family' },
    { id: 'room-president', name: 'president' }
  ];
  
  // Add change listeners to all room selects
  roomSelects.forEach(room => {
    const select = document.querySelector(`#${room.id}`);
    if (select) {
      // Add capacity info to room labels
      updateRoomLabels(room.name, select);
      
      select.addEventListener('change', () => {
        validateRoomCapacity();
        updateBookingSummary(); // Update cost calculation
      });
    }
  });
  
  // Add change listeners to guest selects (in case they're not locked)
  const adultSelect = document.querySelector('#adult');
  const childrenSelect = document.querySelector('#children');
  const infantSelect = document.querySelector('#infant');
  
  const triggerAutoSuggestion = () => {
    const adults = parseInt(adultSelect?.value) || 0;
    const children = parseInt(childrenSelect?.value) || 0;
    const infants = parseInt(infantSelect?.value) || 0;
    
    validateRoomCapacity();
    
    // Room validation will show appropriate messages
  };
  
  if (adultSelect) {
    adultSelect.addEventListener('change', triggerAutoSuggestion);
  }
  
  if (childrenSelect) {
    childrenSelect.addEventListener('change', triggerAutoSuggestion);
  }
  
  if (infantSelect) {
    infantSelect.addEventListener('change', () => {
      // Infants don't trigger auto-suggestion but do trigger validation
      validateRoomCapacity();
    });
  }
  
  // Removed smart suggestion button per user request
}

// Update room labels with capacity info (no pricing for all-inclusive tours)
function updateRoomLabels(roomType, selectElement) {
  const capacity = getRoomCapacity(roomType);
  const label = selectElement.closest('.form-group')?.querySelector('label');
  
  if (label && capacity) {
    const roomName = roomType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    const capacityText = `${capacity.adults + capacity.children} guests`;
    
    label.innerHTML = `
      ${roomName}
      <small class="room-info text-muted d-block">
        <i class="fas fa-users"></i> ${capacityText}
      </small>
    `;
  }
}

// Smart suggestion button removed per user request

// Removed triggerSmartSuggestion function - using simple validation instead

// Show notification function
function showNotification(message, type = 'info') {
  // Create notification element if it doesn't exist
  let notification = document.getElementById('notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 5px;
      color: white;
      font-weight: 500;
      z-index: 9999;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
      max-width: 400px;
      word-wrap: break-word;
    `;
    document.body.appendChild(notification);
  }
  
  // Set notification style based on type
  const colors = {
    'success': '#28a745',
    'error': '#dc3545',
    'warning': '#ffc107',
    'info': '#17a2b8'
  };
  
  notification.style.backgroundColor = colors[type] || colors.info;
  notification.textContent = message;
  
  // Show notification
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(0)';
  }, 10);
  
  // Hide notification after 4 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
  }, 4000);
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

// ✅ SETUP INPUT VALIDATION FOR FORM FIELDS
function setupInputValidation() {
  // Validate Full Name
  const fullNameInput = document.querySelector('#customer-fullname');
  if (fullNameInput) {
    fullNameInput.addEventListener('blur', function() {
      const value = this.value.trim();
      if (value.length < 2) {
        showFieldError(this, 'Tên phải có ít nhất 2 ký tự');
      } else if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(value)) {
        showFieldError(this, 'Tên chỉ được chứa chữ cái');
      } else {
        clearFieldError(this);
      }
    });
    
    fullNameInput.addEventListener('input', function() {
      clearFieldError(this);
    });
  }
  
  // Validate Email
  const emailInput = document.querySelector('#customer-email');
  if (emailInput) {
    emailInput.addEventListener('blur', function() {
      const value = this.value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (!emailRegex.test(value)) {
        showFieldError(this, 'Email không hợp lệ');
      } else {
        clearFieldError(this);
      }
    });
    
    emailInput.addEventListener('input', function() {
      clearFieldError(this);
    });
  }
  
  // Validate Phone Number
  const phoneInput = document.querySelector('#customer-phone');
  if (phoneInput) {
    phoneInput.addEventListener('blur', function() {
      const value = this.value.trim();
      
      if (value.length < 10 || value.length > 11) {
        showFieldError(this, 'Số điện thoại phải có 10-11 chữ số');
      } else if (!/^[0-9]+$/.test(value)) {
        showFieldError(this, 'Số điện thoại chỉ được chứa số');
      } else {
        clearFieldError(this);
      }
    });
    
    phoneInput.addEventListener('input', function() {
      // Prevent non-numeric input
      this.value = this.value.replace(/[^0-9]/g, '');
      clearFieldError(this);
    });
    
    // Prevent + and - keys
    phoneInput.addEventListener('keydown', function(e) {
      if (e.key === '+' || e.key === '-' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
      }
    });
  }
  
  // Validate Check-out date
  const checkoutInput = document.querySelectorAll('input[type="date"]')[1];
  const checkinInput = document.querySelector('input[type="date"]');
  
  if (checkoutInput && checkinInput) {
    checkoutInput.addEventListener('change', function() {
      const checkinDate = new Date(checkinInput.value);
      const checkoutDate = new Date(this.value);
      
      if (checkoutDate <= checkinDate) {
        showFieldError(this, 'Ngày check-out phải sau ngày check-in');
        const minCheckout = new Date(checkinDate);
        minCheckout.setDate(minCheckout.getDate() + 1);
        this.value = minCheckout.toISOString().split('T')[0];
      } else {
        clearFieldError(this);
      }
    });
  }
}

// Show field error message
function showFieldError(field, message) {
  // Remove existing error
  clearFieldError(field);
  
  // Add error class
  field.classList.add('field-error');
  
  // Create error message
  const errorDiv = document.createElement('div');
  errorDiv.className = 'field-error-message';
  errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
  
  // Insert after field
  field.parentNode.insertBefore(errorDiv, field.nextSibling);
}

// Clear field error
function clearFieldError(field) {
  field.classList.remove('field-error');
  
  // Remove error message
  const errorMsg = field.parentNode.querySelector('.field-error-message');
  if (errorMsg) {
    errorMsg.remove();
  }
}

// Validate all fields before submit
function validateAllFields() {
  let isValid = true;
  
  // Check full name
  const fullNameInput = document.querySelector('#customer-fullname');
  if (fullNameInput) {
    const value = fullNameInput.value.trim();
    if (value.length < 2 || !/^[a-zA-ZÀ-ỹ\s]+$/.test(value)) {
      showFieldError(fullNameInput, 'Vui lòng nhập tên hợp lệ');
      isValid = false;
    }
  }
  
  // Check email
  const emailInput = document.querySelector('#customer-email');
  if (emailInput) {
    const value = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      showFieldError(emailInput, 'Vui lòng nhập email hợp lệ');
      isValid = false;
    }
  }
  
  // Check phone
  const phoneInput = document.querySelector('#customer-phone');
  if (phoneInput) {
    const value = phoneInput.value.trim();
    if (value.length < 10 || value.length > 11) {
      showFieldError(phoneInput, 'Vui lòng nhập số điện thoại hợp lệ (10-11 số)');
      isValid = false;
    }
  }
  
  // Check customer title
  const titleSelect = document.querySelector('#customer-title');
  if (titleSelect && !titleSelect.value) {
    showFieldError(titleSelect, 'Vui lòng chọn danh xưng');
    isValid = false;
  }
  
  return isValid;
}