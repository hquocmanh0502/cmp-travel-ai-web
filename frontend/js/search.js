document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input');
  const suggestionsContainer = document.getElementById('search-suggestions');
  const travelTypeSelect = document.getElementById('travel-type-select');
  const durationSelect = document.getElementById('duration-select');
  const submitBtn = document.querySelector('.submit-btn');
  
  let debounceTimer;
  let currentSuggestions = [];
  let selectedIndex = -1;
  
  if (searchInput && suggestionsContainer) {
    // Load filter options on page load
    loadFilterOptions();
    
    // Search input event handler
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      
      clearTimeout(debounceTimer);
      
      if (query.length >= 2) {
        debounceTimer = setTimeout(() => {
          fetchSuggestions(query);
        }, 300);
      } else {
        hideSuggestions();
      }
    });
    
    // Keyboard navigation
    searchInput.addEventListener('keydown', (e) => {
      if (currentSuggestions.length === 0) return;
      
      switch(e.key) {
        case 'ArrowDown':
          e.preventDefault();
          selectedIndex = Math.min(selectedIndex + 1, currentSuggestions.length - 1);
          updateSuggestionSelection();
          break;
        case 'ArrowUp':
          e.preventDefault();
          selectedIndex = Math.max(selectedIndex - 1, -1);
          updateSuggestionSelection();
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0) {
            selectSuggestion(currentSuggestions[selectedIndex]);
          } else {
            performSearch();
          }
          break;
        case 'Escape':
          hideSuggestions();
          break;
      }
    });
    
    // Submit button click
    submitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      performSearch();
    });
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
        hideSuggestions();
      }
    });
  }
  
  // Fetch suggestions from API
  async function fetchSuggestions(query) {
    try {
      const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
      
      if (response.ok) {
        const suggestions = await response.json();
        currentSuggestions = suggestions;
        displaySuggestions(suggestions);
      } else {
        hideSuggestions();
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      hideSuggestions();
    }
  }
  
  // Display suggestions
  function displaySuggestions(suggestions) {
    if (suggestions.length === 0) {
      hideSuggestions();
      return;
    }
    
    suggestionsContainer.innerHTML = suggestions.map((suggestion, index) => `
      <div class="suggestion-item" data-index="${index}" onclick="selectSuggestionByIndex(${index})">
        <div class="suggestion-name">${suggestion.name}</div>
        <div class="suggestion-country">${suggestion.country}</div>
        <div class="suggestion-price">$${suggestion.estimatedCost}</div>
      </div>
    `).join('');
    
    suggestionsContainer.style.display = 'block';
    selectedIndex = -1;
  }
  
  // Update suggestion selection highlighting
  function updateSuggestionSelection() {
    const items = suggestionsContainer.querySelectorAll('.suggestion-item');
    items.forEach((item, index) => {
      if (index === selectedIndex) {
        item.classList.add('suggestion-active');
        searchInput.value = currentSuggestions[index].name;
      } else {
        item.classList.remove('suggestion-active');
      }
    });
  }
  
  // Select suggestion
  function selectSuggestion(suggestion) {
    searchInput.value = suggestion.name;
    hideSuggestions();
    // Redirect to detail page
    window.location.href = `detail.html?id=${suggestion.id}`;
  }
  
  // Select suggestion by index (for onclick)
  window.selectSuggestionByIndex = function(index) {
    if (currentSuggestions[index]) {
      selectSuggestion(currentSuggestions[index]);
    }
  };
  
  // Hide suggestions
  function hideSuggestions() {
    suggestionsContainer.style.display = 'none';
    currentSuggestions = [];
    selectedIndex = -1;
  }
  
  // Perform search with filters
  function performSearch() {
    const query = searchInput.value.trim();
    const travelType = travelTypeSelect.value;
    const duration = durationSelect.value;
    
    if (query) {
      let searchUrl = `destination.html?search=${encodeURIComponent(query)}`;
      
      if (travelType) {
        searchUrl += `&type=${encodeURIComponent(travelType)}`;
      }
      
      if (duration) {
        searchUrl += `&duration=${encodeURIComponent(duration)}`;
      }
      
      window.location.href = searchUrl;
    } else {
      window.location.href = 'destination.html';
    }
  }
  
  // Load filter options
  async function loadFilterOptions() {
    try {
      // Load travel types
      const travelTypesResponse = await fetch('/api/filters/travel-types');
      if (travelTypesResponse.ok) {
        const travelTypes = await travelTypesResponse.json();
        populateSelect(travelTypeSelect, travelTypes, 'Travel Type');
      }
      
      // Load durations
      const durationsResponse = await fetch('/api/filters/durations');
      if (durationsResponse.ok) {
        const durations = await durationsResponse.json();
        populateSelect(durationSelect, durations.map(d => ({ value: d, label: `${d} days` })), 'Duration');
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  }
  
  // Populate select element
  function populateSelect(selectElement, options, placeholder) {
    if (!selectElement) return;
    
    selectElement.innerHTML = `<option value="">${placeholder}</option>`;
    
    if (Array.isArray(options)) {
      options.forEach(option => {
        const optionElement = document.createElement('option');
        if (typeof option === 'string') {
          optionElement.value = option;
          optionElement.textContent = option;
        } else {
          optionElement.value = option.value;
          optionElement.textContent = option.label;
        }
        selectElement.appendChild(optionElement);
      });
    }
  }
});