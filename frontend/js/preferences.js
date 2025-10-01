document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 AI Preferences page initialized');
    
    // Check authentication
    if (!checkUserAuth()) return;
    
    // Initialize page
    initializePreferencesPage();
    
    // Load user preferences
    loadUserPreferences();
    
    // Setup event listeners
    setupEventListeners();
    
    // Generate AI insights
    generateAIInsights();
});

// Global variables
let userPreferences = {};
let originalPreferences = {};
let hasUnsavedChanges = false;

function checkUserAuth() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        showNotification('Please login to access AI preferences', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return false;
    }
    return true;
}

function initializePreferencesPage() {
    // Update page title
    document.title = 'AI Travel Preferences - CMP Travel';
    
    // Initialize range sliders
    initializeRangeSliders();
    
    // Setup form validation
    setupFormValidation();
    
    console.log('✅ AI Preferences page initialized');
}

function loadUserPreferences() {
    try {
        // Load from localStorage or use defaults
        const savedPreferences = localStorage.getItem('userPreferences');
        
        if (savedPreferences) {
            userPreferences = JSON.parse(savedPreferences);
        } else {
            // Default preferences
            userPreferences = {
                budget: {
                    min: 500,
                    max: 5000
                },
                travelStyle: ['adventure', 'cultural'],
                accommodation: {
                    type: 'hotel',
                    rating: 4,
                    amenities: ['wifi', 'breakfast']
                },
                activities: ['sightseeing', 'shopping'],
                dietary: [],
                climate: 'temperate',
                language: 'en',
                groupSize: 'medium',
                travelFrequency: 'quarterly'
            };
        }
        
        // Store original for change detection
        originalPreferences = JSON.parse(JSON.stringify(userPreferences));
        
        // Populate form fields
        populatePreferencesForm();
        
        console.log('✅ User preferences loaded');
        
    } catch (error) {
        console.error('Error loading preferences:', error);
        showNotification('Error loading your preferences', 'error');
    }
}

function populatePreferencesForm() {
    // Budget range
    const budgetMin = document.getElementById('budgetMin');
    const budgetMax = document.getElementById('budgetMax');
    
    if (budgetMin && budgetMax) {
        budgetMin.value = userPreferences.budget?.min || 500;
        budgetMax.value = userPreferences.budget?.max || 5000;
        updateRangeDisplay('budgetMin');
        updateRangeDisplay('budgetMax');
    }
    
    // Travel style checkboxes
    const travelStyles = userPreferences.travelStyle || [];
    travelStyles.forEach(style => {
        const checkbox = document.querySelector(`input[name="travelStyle"][value="${style}"]`);
        if (checkbox) {
            checkbox.checked = true;
            checkbox.closest('.checkbox-item').classList.add('active');
        }
    });
    
    // Accommodation preferences
    const accomType = document.querySelector(`input[name="accommodationType"][value="${userPreferences.accommodation?.type || 'hotel'}"]`);
    if (accomType) {
        accomType.checked = true;
        accomType.closest('.radio-item').classList.add('active');
    }
    
    const accomRating = document.getElementById('accommodationRating');
    if (accomRating) {
        accomRating.value = userPreferences.accommodation?.rating || 4;
        updateRangeDisplay('accommodationRating');
    }
    
    // Amenities
    const amenities = userPreferences.accommodation?.amenities || [];
    amenities.forEach(amenity => {
        const checkbox = document.querySelector(`input[name="amenities"][value="${amenity}"]`);
        if (checkbox) {
            checkbox.checked = true;
            checkbox.closest('.checkbox-item').classList.add('active');
        }
    });
    
    // Activities
    const activities = userPreferences.activities || [];
    activities.forEach(activity => {
        const checkbox = document.querySelector(`input[name="activities"][value="${activity}"]`);
        if (checkbox) {
            checkbox.checked = true;
            checkbox.closest('.checkbox-item').classList.add('active');
        }
    });
    
    // Other preferences
    const fields = {
        'dietaryRestrictions': userPreferences.dietary?.join(', ') || '',
        'climatePreference': userPreferences.climate || 'temperate',
        'languagePreference': userPreferences.language || 'en'
    };
    
    Object.entries(fields).forEach(([fieldId, value]) => {
        const field = document.getElementById(fieldId);
        if (field) field.value = value;
    });
    
    // Group size and travel frequency
    const groupSize = document.querySelector(`input[name="groupSize"][value="${userPreferences.groupSize || 'medium'}"]`);
    if (groupSize) {
        groupSize.checked = true;
        groupSize.closest('.radio-item').classList.add('active');
    }
    
    const travelFreq = document.querySelector(`input[name="travelFrequency"][value="${userPreferences.travelFrequency || 'quarterly'}"]`);
    if (travelFreq) {
        travelFreq.checked = true;
        travelFreq.closest('.radio-item').classList.add('active');
    }
}

function initializeRangeSliders() {
    const rangeInputs = document.querySelectorAll('.range-slider');
    
    rangeInputs.forEach(input => {
        input.addEventListener('input', function() {
            updateRangeDisplay(this.id);
            updateRangeBackground(this);
            markAsChanged();
        });
        
        // Initialize display and background
        updateRangeDisplay(input.id);
        updateRangeBackground(input);
    });
}

function updateRangeDisplay(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const value = parseInt(input.value);
    const display = input.parentElement.querySelector('.current-value');
    
    if (display) {
        if (inputId.includes('budget')) {
            display.textContent = `$${value.toLocaleString()}`;
        } else if (inputId.includes('Rating')) {
            display.textContent = `${value} Star${value > 1 ? 's' : ''}`;
        } else {
            display.textContent = value;
        }
    }
}

function updateRangeBackground(input) {
    const value = input.value;
    const min = input.min || 0;
    const max = input.max || 100;
    const percentage = ((value - min) / (max - min)) * 100;
    
    input.style.background = `linear-gradient(to right, #ff6600 ${percentage}%, #e9ecef ${percentage}%)`;
}

function setupEventListeners() {
    // Checkbox and radio button interactions
    setupCheckboxRadioListeners();
    
    // Form input change detection
    setupChangeDetection();
    
    // Action buttons
    const saveBtn = document.getElementById('savePreferences');
    const resetBtn = document.getElementById('resetPreferences');
    const exportBtn = document.getElementById('exportPreferences');
    
    if (saveBtn) saveBtn.addEventListener('click', savePreferences);
    if (resetBtn) resetBtn.addEventListener('click', resetPreferences);
    if (exportBtn) exportBtn.addEventListener('click', exportPreferences);
    
    // Prevent form submission on enter
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    });
    
    // Warn about unsaved changes
    window.addEventListener('beforeunload', function(e) {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return e.returnValue;
        }
    });
}

function setupCheckboxRadioListeners() {
    // Checkbox interactions
    document.querySelectorAll('.checkbox-item').forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        const label = item.querySelector('label');
        
        if (checkbox && label) {
            label.addEventListener('click', function(e) {
                e.preventDefault();
                checkbox.checked = !checkbox.checked;
                item.classList.toggle('active', checkbox.checked);
                markAsChanged();
            });
            
            checkbox.addEventListener('change', function() {
                item.classList.toggle('active', this.checked);
                markAsChanged();
            });
        }
    });
    
    // Radio button interactions
    document.querySelectorAll('.radio-item').forEach(item => {
        const radio = item.querySelector('input[type="radio"]');
        const label = item.querySelector('label');
        
        if (radio && label) {
            label.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Uncheck other radios in the same group
                const groupName = radio.name;
                document.querySelectorAll(`input[name="${groupName}"]`).forEach(r => {
                    r.checked = false;
                    r.closest('.radio-item').classList.remove('active');
                });
                
                // Check this radio
                radio.checked = true;
                item.classList.add('active');
                markAsChanged();
            });
            
            radio.addEventListener('change', function() {
                if (this.checked) {
                    // Remove active from other items in group
                    const groupName = this.name;
                    document.querySelectorAll(`input[name="${groupName}"]`).forEach(r => {
                        r.closest('.radio-item').classList.remove('active');
                    });
                    
                    // Add active to current item
                    item.classList.add('active');
                    markAsChanged();
                }
            });
        }
    });
}

function setupChangeDetection() {
    const inputs = document.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
        input.addEventListener('change', markAsChanged);
        input.addEventListener('input', markAsChanged);
    });
}

function markAsChanged() {
    hasUnsavedChanges = true;
    
    // Update save button state
    const saveBtn = document.getElementById('savePreferences');
    if (saveBtn) {
        saveBtn.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
        saveBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Save Changes';
    }
}

function setupFormValidation() {
    // Budget validation
    const budgetMin = document.getElementById('budgetMin');
    const budgetMax = document.getElementById('budgetMax');
    
    if (budgetMin && budgetMax) {
        function validateBudget() {
            const min = parseInt(budgetMin.value);
            const max = parseInt(budgetMax.value);
            
            if (min >= max) {
                budgetMax.value = min + 100;
                updateRangeDisplay('budgetMax');
                updateRangeBackground(budgetMax);
            }
        }
        
        budgetMin.addEventListener('change', validateBudget);
        budgetMax.addEventListener('change', validateBudget);
    }
}

async function savePreferences() {
    try {
        showLoadingOverlay('Saving your preferences...');
        
        // Collect form data
        const formData = collectFormData();
        
        // Validate data
        if (!validateFormData(formData)) {
            hideLoadingOverlay();
            return;
        }
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Save to localStorage
        localStorage.setItem('userPreferences', JSON.stringify(formData));
        
        // Update global variables
        userPreferences = formData;
        originalPreferences = JSON.parse(JSON.stringify(formData));
        hasUnsavedChanges = false;
        
        hideLoadingOverlay();
        
        // Show success message
        showSuccessMessage('Your AI preferences have been saved successfully!');
        
        // Update save button
        const saveBtn = document.getElementById('savePreferences');
        if (saveBtn) {
            saveBtn.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
            saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved!';
            
            setTimeout(() => {
                saveBtn.style.background = 'linear-gradient(135deg, #ff6600, #ff8533)';
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Preferences';
            }, 3000);
        }
        
        // Regenerate AI insights
        generateAIInsights();
        
    } catch (error) {
        console.error('Error saving preferences:', error);
        hideLoadingOverlay();
        showNotification('Error saving preferences. Please try again.', 'error');
    }
}

function collectFormData() {
    const formData = {
        budget: {
            min: parseInt(document.getElementById('budgetMin')?.value || 500),
            max: parseInt(document.getElementById('budgetMax')?.value || 5000)
        },
        travelStyle: [],
        accommodation: {
            type: '',
            rating: parseInt(document.getElementById('accommodationRating')?.value || 4),
            amenities: []
        },
        activities: [],
        dietary: document.getElementById('dietaryRestrictions')?.value.split(',').map(s => s.trim()).filter(s => s) || [],
        climate: document.getElementById('climatePreference')?.value || 'temperate',
        language: document.getElementById('languagePreference')?.value || 'en',
        groupSize: '',
        travelFrequency: ''
    };
    
    // Collect travel styles
    document.querySelectorAll('input[name="travelStyle"]:checked').forEach(input => {
        formData.travelStyle.push(input.value);
    });
    
    // Collect accommodation type
    const accomType = document.querySelector('input[name="accommodationType"]:checked');
    if (accomType) formData.accommodation.type = accomType.value;
    
    // Collect amenities
    document.querySelectorAll('input[name="amenities"]:checked').forEach(input => {
        formData.accommodation.amenities.push(input.value);
    });
    
    // Collect activities
    document.querySelectorAll('input[name="activities"]:checked').forEach(input => {
        formData.activities.push(input.value);
    });
    
    // Collect group size
    const groupSize = document.querySelector('input[name="groupSize"]:checked');
    if (groupSize) formData.groupSize = groupSize.value;
    
    // Collect travel frequency
    const travelFreq = document.querySelector('input[name="travelFrequency"]:checked');
    if (travelFreq) formData.travelFrequency = travelFreq.value;
    
    return formData;
}

function validateFormData(data) {
    const errors = [];
    
    // Validate budget
    if (data.budget.min >= data.budget.max) {
        errors.push('Maximum budget must be greater than minimum budget');
    }
    
    // Validate travel styles
    if (data.travelStyle.length === 0) {
        errors.push('Please select at least one travel style');
    }
    
    // Validate accommodation
    if (!data.accommodation.type) {
        errors.push('Please select an accommodation type');
    }
    
    // Validate group size
    if (!data.groupSize) {
        errors.push('Please select your preferred group size');
    }
    
    // Validate travel frequency
    if (!data.travelFrequency) {
        errors.push('Please select your travel frequency');
    }
    
    if (errors.length > 0) {
        showNotification(errors.join('<br>'), 'error');
        return false;
    }
    
    return true;
}

function resetPreferences() {
    if (hasUnsavedChanges) {
        if (!confirm('Are you sure you want to reset all changes? This will discard your unsaved modifications.')) {
            return;
        }
    }
    
    // Reset to original preferences
    userPreferences = JSON.parse(JSON.stringify(originalPreferences));
    
    // Clear all form fields
    document.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(input => {
        input.checked = false;
        input.closest('.checkbox-item, .radio-item')?.classList.remove('active');
    });
    
    document.querySelectorAll('input[type="range"], input[type="text"], select, textarea').forEach(input => {
        if (input.type === 'range') {
            input.value = input.defaultValue;
            updateRangeDisplay(input.id);
            updateRangeBackground(input);
        } else {
            input.value = '';
        }
    });
    
    // Repopulate with original data
    populatePreferencesForm();
    
    hasUnsavedChanges = false;
    
    showNotification('Preferences have been reset to your last saved settings', 'success');
}

function exportPreferences() {
    try {
        const data = {
            preferences: userPreferences,
            exportDate: new Date().toISOString(),
            user: localStorage.getItem('username') || 'Unknown'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `cmp-travel-preferences-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        
        showNotification('Preferences exported successfully!', 'success');
        
    } catch (error) {
        console.error('Error exporting preferences:', error);
        showNotification('Error exporting preferences', 'error');
    }
}

function generateAIInsights() {
    const insightsContainer = document.getElementById('aiInsights');
    if (!insightsContainer) return;
    
    const insights = [];
    
    // Budget analysis
    const budget = userPreferences.budget;
    if (budget && budget.max > 0) {
        const budgetLevel = budget.max < 1000 ? 'budget' : budget.max < 3000 ? 'mid-range' : 'luxury';
        insights.push({
            title: 'Budget Analysis',
            content: `Based on your ${budgetLevel} travel budget ($${budget.min}-$${budget.max}), we recommend destinations in Southeast Asia, Eastern Europe, or Central America for the best value.`,
            tags: [budgetLevel, 'value-destinations']
        });
    }
    
    // Travel style insights
    const styles = userPreferences.travelStyle || [];
    if (styles.length > 0) {
        const styleText = styles.join(' and ');
        insights.push({
            title: 'Travel Style Match',
            content: `Your preference for ${styleText} travel suggests you'd enjoy destinations like Nepal (adventure), Japan (cultural), or Maldives (luxury).`,
            tags: [...styles, 'personalized']
        });
    }
    
    // Activity recommendations
    const activities = userPreferences.activities || [];
    if (activities.length > 0) {
        insights.push({
            title: 'Activity Recommendations',
            content: `Given your interest in ${activities.join(', ')}, consider tours that include local experiences, guided tours, and interactive activities.`,
            tags: ['activities', 'experiences']
        });
    }
    
    // Climate preferences
    if (userPreferences.climate) {
        const climateRecommendations = {
            'tropical': 'Thailand, Indonesia, Philippines',
            'temperate': 'Europe, New Zealand, Chile',
            'cold': 'Scandinavia, Canada, Alaska',
            'desert': 'Morocco, Jordan, Southwestern USA'
        };
        
        insights.push({
            title: 'Climate Match',
            content: `For ${userPreferences.climate} climates, we recommend: ${climateRecommendations[userPreferences.climate] || 'various destinations worldwide'}.`,
            tags: ['climate', userPreferences.climate]
        });
    }
    
    // Render insights
    insightsContainer.innerHTML = `
        <h4><i class="fas fa-brain"></i> AI-Powered Insights</h4>
        ${insights.map(insight => `
            <div class="insight-item">
                <h5>${insight.title}</h5>
                <p>${insight.content}</p>
                <div class="recommendation-tags">
                    ${insight.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </div>
        `).join('')}
    `;
}

// Utility functions
function showLoadingOverlay(message = 'Processing...') {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <p>${message}</p>
        </div>
    `;
    document.body.appendChild(overlay);
}

function hideLoadingOverlay() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

function showSuccessMessage(message) {
    const container = document.querySelector('.preferences-container');
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    
    container.insertBefore(successDiv, container.firstChild);
    
    setTimeout(() => {
        successDiv.remove();
    }, 5000);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#ff6600'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 500;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}