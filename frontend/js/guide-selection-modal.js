// Tour Guide Selection Modal for Booking Flow

let selectedTourGuide = null;
let availableGuides = [];

function openGuideSelectionModal(guides, callback) {
  console.log('🎯 Opening guide selection modal with guides:', guides);
  
  availableGuides = guides;
  
  if (!guides || guides.length === 0) {
    // No guides assigned - skip this step
    if (callback) callback(null);
    return;
  }
  
  const modalHTML = `
    <div class="modal-overlay" id="guideSelectionModal">
      <div class="modal-content guide-selection-modal-content">
        <button class="modal-close" onclick="closeGuideSelectionModal()">
          <i class="fas fa-times"></i>
        </button>
        
        <div class="modal-header">
          <h3><i class="fas fa-user-tie"></i> Select Your Tour Guide</h3>
          <p>Choose a tour guide for your trip</p>
        </div>
        
        <div class="modal-body">
          <div class="guides-selection-grid" id="guidesSelectionGrid">
            ${guides.map(guide => renderGuideSelectionCard(guide)).join('')}
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeGuideSelectionModal()">Cancel</button>
          <button class="btn btn-primary" onclick="confirmGuideSelection()" id="confirmGuideBtn" disabled>
            Continue to Booking
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Store callback
  window.guideSelectionCallback = callback;
  
  // Remove existing modal
  const existing = document.getElementById('guideSelectionModal');
  if (existing) existing.remove();
  
  // Add to page
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function renderGuideSelectionCard(guide) {
  const guideName = guide.name || 'Tour Guide';
  const guideId = guide._id || guide.id;
  const avatar = guide.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(guideName)}&background=ff6600&color=fff&size=128`;
  const starsHTML = generateStarsHTML(guide.rating || 0);
  
  return `
    <div class="guide-selection-card" data-guide-id="${guideId}" onclick="selectGuide('${guideId}')">
      <div class="guide-selection-avatar">
        <img src="${avatar}" alt="${guideName}">
      </div>
      <div class="guide-selection-info">
        <h4>${guideName}</h4>
        <div class="guide-rating">
          <div class="stars">${starsHTML}</div>
          <span>${(guide.rating || 0).toFixed(1)} (${guide.totalReviews || 0} reviews)</span>
        </div>
        <div class="guide-details-list">
          <div class="guide-detail-row">
            <i class="fas fa-briefcase"></i>
            <span>${guide.experience || 0} years experience</span>
          </div>
          ${guide.languages && guide.languages.length > 0 ? `
            <div class="guide-detail-row">
              <i class="fas fa-globe"></i>
              <span>${guide.languages.slice(0, 2).join(', ')}${guide.languages.length > 2 ? '...' : ''}</span>
            </div>
          ` : ''}
          ${guide.specialties && guide.specialties.length > 0 ? `
            <div class="guide-detail-row">
              <i class="fas fa-star"></i>
              <span>${guide.specialties.slice(0, 2).join(', ')}${guide.specialties.length > 2 ? '...' : ''}</span>
            </div>
          ` : ''}
        </div>
        ${guide.bio ? `<p class="guide-bio">${guide.bio.substring(0, 100)}${guide.bio.length > 100 ? '...' : ''}</p>` : ''}
        <button class="btn-view-guide-details" onclick="event.stopPropagation(); viewGuideDetails('${guideId}')">
          <i class="fas fa-info-circle"></i> View Full Profile
        </button>
      </div>
      <div class="selection-check">
        <i class="fas fa-check-circle"></i>
      </div>
    </div>
  `;
}

function selectGuide(guideId) {
  console.log('✅ Guide selected:', guideId);
  
  selectedTourGuide = availableGuides.find(g => (g._id || g.id) === guideId);
  
  // Update UI
  document.querySelectorAll('.guide-selection-card').forEach(card => {
    card.classList.remove('selected');
  });
  
  const selectedCard = document.querySelector(`[data-guide-id="${guideId}"]`);
  if (selectedCard) {
    selectedCard.classList.add('selected');
  }
  
  // Enable confirm button
  const confirmBtn = document.getElementById('confirmGuideBtn');
  if (confirmBtn) {
    confirmBtn.disabled = false;
  }
}

function viewGuideDetails(guideId) {
  // Use existing showGuideDetailModal if available
  if (typeof showGuideDetailModal === 'function') {
    showGuideDetailModal(guideId);
  } else {
    alert('Guide details will open here');
  }
}

function confirmGuideSelection() {
  if (!selectedTourGuide) {
    alert('Please select a tour guide');
    return;
  }
  
  console.log('✅ Confirmed guide selection:', selectedTourGuide);
  
  // Call callback with selected guide
  if (window.guideSelectionCallback) {
    window.guideSelectionCallback(selectedTourGuide);
  }
  
  closeGuideSelectionModal();
}

function closeGuideSelectionModal() {
  const modal = document.getElementById('guideSelectionModal');
  if (modal) {
    modal.remove();
  }
  selectedTourGuide = null;
  window.guideSelectionCallback = null;
}

// Expose functions globally
window.openGuideSelectionModal = openGuideSelectionModal;
window.closeGuideSelectionModal = closeGuideSelectionModal;
window.selectGuide = selectGuide;
window.viewGuideDetails = viewGuideDetails;
window.confirmGuideSelection = confirmGuideSelection;

console.log('✅ Guide Selection Modal loaded');
