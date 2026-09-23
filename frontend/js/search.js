document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input');
  const suggestionsContainer = document.getElementById('search-suggestions');
  const travelTypeSelect = document.getElementById('travel-type-select');
  const durationSelect = document.getElementById('duration-select');
  const submitBtn = document.querySelector('.submit-btn');

  let debounceTimer;
  let currentSuggestions = [];
  let selectedIndex = -1;
  // Giữ lại đúng chuỗi người dùng đã gõ, để khi bấm mũi tên lên quá đầu danh sách
  // thì trả ô tìm kiếm về nguyên trạng thay vì kẹt ở tên gợi ý.
  let typedQuery = '';

  if (searchInput && suggestionsContainer) {
    loadFilterOptions();

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      typedQuery = e.target.value;

      clearTimeout(debounceTimer);

      if (query.length >= 2) {
        debounceTimer = setTimeout(() => {
          fetchSuggestions(query);
        }, 300);
      } else {
        hideSuggestions();
      }
    });

    searchInput.addEventListener('keydown', (e) => {
      if (currentSuggestions.length === 0) {
        if (e.key === 'Enter') {
          e.preventDefault();
          performSearch();
        }
        return;
      }

      switch (e.key) {
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
            // Lần Enter đầu chỉ chọn gợi ý, chưa tìm. Muốn tìm thì Enter lần nữa
            // hoặc bấm nút Search.
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

    // Chọn gợi ý bằng chuột. Dùng mousedown thay vì click vì click xảy ra sau blur,
    // lúc đó dropdown có thể đã bị đóng.
    suggestionsContainer.addEventListener('mousedown', (e) => {
      const item = e.target.closest('.suggestion-item');
      if (!item) return;
      e.preventDefault();
      const index = Number(item.dataset.index);
      if (currentSuggestions[index]) {
        selectSuggestion(currentSuggestions[index]);
      }
    });

    if (submitBtn) {
      submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        performSearch();
      });
    }

    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
        hideSuggestions();
      }
    });
  }

  async function fetchSuggestions(query) {
    try {
      const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);

      if (response.ok) {
        const suggestions = await response.json();
        currentSuggestions = suggestions;
        displaySuggestions(suggestions, query);
      } else {
        hideSuggestions();
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      hideSuggestions();
    }
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Tô đậm đúng đoạn khớp với từ khoá, để thấy rõ vì sao gợi ý được xếp trên. */
  function highlight(text, query) {
    const safeText = escapeHtml(text);
    if (!query) return safeText;

    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return safeText.replace(new RegExp(`(${safeQuery})`, 'i'), '<mark>$1</mark>');
  }

  function displaySuggestions(suggestions, query) {
    if (!suggestions || suggestions.length === 0) {
      hideSuggestions();
      return;
    }

    suggestionsContainer.innerHTML = suggestions.map((suggestion, index) => `
      <div class="suggestion-item" data-index="${index}">
        <div class="suggestion-name">${highlight(suggestion.name, query)}</div>
        <div class="suggestion-country">${highlight(suggestion.country, query)}</div>
        <div class="suggestion-price">$${escapeHtml(suggestion.estimatedCost)}</div>
      </div>
    `).join('') + `
      <div class="suggestion-hint">Chọn một gợi ý rồi bấm Search để tìm</div>
    `;

    suggestionsContainer.style.display = 'block';
    selectedIndex = -1;
  }

  function updateSuggestionSelection() {
    const items = suggestionsContainer.querySelectorAll('.suggestion-item');

    items.forEach((item, index) => {
      item.classList.toggle('suggestion-active', index === selectedIndex);
    });

    if (selectedIndex >= 0) {
      searchInput.value = currentSuggestions[selectedIndex].name;
      items[selectedIndex]?.scrollIntoView({ block: 'nearest' });
    } else {
      searchInput.value = typedQuery;
    }
  }

  /**
   * Chọn một gợi ý: chỉ điền tên vào ô tìm kiếm rồi đóng dropdown.
   *
   * Trước đây hàm này nhảy thẳng sang detail.html, nên người dùng không kịp chọn
   * thêm Travel Type / Duration. Giờ muốn đi tiếp phải bấm Search.
   */
  function selectSuggestion(suggestion) {
    searchInput.value = suggestion.name;
    typedQuery = suggestion.name;
    hideSuggestions();
    searchInput.focus();
  }

  function hideSuggestions() {
    suggestionsContainer.style.display = 'none';
    suggestionsContainer.innerHTML = '';
    currentSuggestions = [];
    selectedIndex = -1;
  }

  function performSearch() {
    const query = searchInput.value.trim();
    const travelType = travelTypeSelect ? travelTypeSelect.value : '';
    const duration = durationSelect ? durationSelect.value : '';

    const params = new URLSearchParams();
    if (query) params.set('search', query);
    if (travelType) params.set('type', travelType);
    if (duration) params.set('duration', duration);

    const qs = params.toString();
    window.location.href = qs ? `destination.html?${qs}` : 'destination.html';
  }

  async function loadFilterOptions() {
    try {
      const travelTypesResponse = await fetch('/api/filters/travel-types');
      if (travelTypesResponse.ok) {
        const travelTypes = await travelTypesResponse.json();
        populateSelect(travelTypeSelect, travelTypes, 'Travel Type');
      }

      const durationsResponse = await fetch('/api/filters/durations');
      if (durationsResponse.ok) {
        const durations = await durationsResponse.json();
        populateSelect(durationSelect, durations.map(d => ({ value: d, label: `${d} days` })), 'Duration');
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  }

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
