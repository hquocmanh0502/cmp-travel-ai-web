// Part 2: Details, Gallery, Itinerary, Pricing tabs for EnhancedTourFormModal

// Add this content after the Basic Info tab in EnhancedTourFormModal.jsx

{/* Details Tab */}
{activeTab === 'details' && (
  <div className="space-y-6">
    {/* Attractions */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Attractions
      </label>
      <div className="space-y-2">
        {formData.attractions.map((attraction, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={attraction}
              onChange={(e) => handleArrayChange('attractions', index, e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Tourist attraction name"
            />
            <button
              type="button"
              onClick={() => removeArrayItem('attractions', index)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
            >
              <MdDelete />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addArrayItem('attractions')}
          className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
        >
          <MdAdd /> Add Attraction
        </button>
      </div>
    </div>

    {/* Food */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Local Food & Cuisine
      </label>
      <div className="space-y-2">
        {formData.food.map((food, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={food}
              onChange={(e) => handleArrayChange('food', index, e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Local food or restaurant"
            />
            <button
              type="button"
              onClick={() => removeArrayItem('food', index)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
            >
              <MdDelete />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addArrayItem('food')}
          className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
        >
          <MdAdd /> Add Food Item
        </button>
      </div>
    </div>

    {/* Inclusions */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Inclusions (What's included)
      </label>
      <div className="space-y-2">
        {formData.inclusions.map((inclusion, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={inclusion}
              onChange={(e) => handleArrayChange('inclusions', index, e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Accommodation, Meals, Transportation"
            />
            <button
              type="button"
              onClick={() => removeArrayItem('inclusions', index)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
            >
              <MdDelete />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addArrayItem('inclusions')}
          className="flex items-center gap-2 px-4 py-2 text-green-600 border border-green-300 rounded-lg hover:bg-green-50"
        >
          <MdAdd /> Add Inclusion
        </button>
      </div>
    </div>

    {/* Exclusions */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Exclusions (What's not included)
      </label>
      <div className="space-y-2">
        {formData.exclusions.map((exclusion, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={exclusion}
              onChange={(e) => handleArrayChange('exclusions', index, e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Personal expenses, Tips, Insurance"
            />
            <button
              type="button"
              onClick={() => removeArrayItem('exclusions', index)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
            >
              <MdDelete />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addArrayItem('exclusions')}
          className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
        >
          <MdAdd /> Add Exclusion
        </button>
      </div>
    </div>
  </div>
)}

{/* Gallery Tab - 12 Photos */}
{activeTab === 'gallery' && (
  <div className="space-y-6">
    <div className="bg-blue-50 p-4 rounded-lg">
      <h3 className="font-medium text-blue-800 mb-2">Gallery Instructions</h3>
      <p className="text-sm text-blue-700">
        Add 12 high-quality photos for your tour. Each photo should be categorized appropriately. 
        At least 8 photos are required. Use high-resolution URLs from reliable sources.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {formData.gallery.map((photo, index) => {
        const categoryData = GALLERY_CATEGORIES.find(cat => cat.value === photo.category);
        const CategoryIcon = categoryData?.icon || MdPhotoLibrary;
        
        return (
          <div key={index} className="border border-gray-300 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Photo {index + 1}</span>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <CategoryIcon />
                {categoryData?.label}
              </div>
            </div>

            {/* Photo URL */}
            <div>
              <input
                type="url"
                value={photo.url}
                onChange={(e) => handleGalleryChange(index, 'url', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="https://example.com/photo.jpg"
              />
            </div>

            {/* Category */}
            <div>
              <select
                value={photo.category}
                onChange={(e) => handleGalleryChange(index, 'category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {GALLERY_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Caption */}
            <div>
              <input
                type="text"
                value={photo.caption}
                onChange={(e) => handleGalleryChange(index, 'caption', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Photo caption (optional)"
              />
            </div>

            {/* Preview */}
            {photo.url && (
              <div className="mt-2">
                <img
                  src={photo.url}
                  alt={`Gallery ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>

    <div className="text-center p-4 bg-gray-50 rounded-lg">
      <p className="text-sm text-gray-600">
        Gallery Status: {formData.gallery.filter(photo => photo.url.trim() !== '').length}/12 photos added
        {formData.gallery.filter(photo => photo.url.trim() !== '').length < 8 && (
          <span className="text-red-600 ml-2">(Minimum 8 required)</span>
        )}
      </p>
    </div>
  </div>
)}

{/* Itinerary Tab */}
{activeTab === 'itinerary' && (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-medium text-gray-800">Day-by-Day Itinerary</h3>
      <button
        type="button"
        onClick={addItineraryDay}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        <MdAdd /> Add Day
      </button>
    </div>

    <div className="space-y-4">
      {formData.itinerary.map((day, index) => (
        <div key={index} className="border border-gray-300 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <MdDragHandle className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Day {day.day}</span>
            </div>
            <input
              type="text"
              value={day.title}
              onChange={(e) => handleItineraryChange(index, 'title', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Day title (e.g., Arrival & City Tour)"
            />
            {formData.itinerary.length > 1 && (
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  itinerary: prev.itinerary.filter((_, i) => i !== index)
                }))}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <MdDelete />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Activities */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Activities
              </label>
              <div className="space-y-2">
                {(day.activities || []).map((activity, actIndex) => (
                  <div key={actIndex} className="flex gap-2">
                    <input
                      type="text"
                      value={activity}
                      onChange={(e) => {
                        const newActivities = [...(day.activities || [])];
                        newActivities[actIndex] = e.target.value;
                        handleItineraryChange(index, 'activities', newActivities);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Activity description"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newActivities = (day.activities || []).filter((_, i) => i !== actIndex);
                        handleItineraryChange(index, 'activities', newActivities);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <MdDelete className="text-sm" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const newActivities = [...(day.activities || []), ''];
                    handleItineraryChange(index, 'activities', newActivities);
                  }}
                  className="text-xs px-3 py-1 text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
                >
                  + Add Activity
                </button>
              </div>
            </div>

            {/* Meals */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meals
              </label>
              <div className="space-y-2">
                {(day.meals || []).map((meal, mealIndex) => (
                  <div key={mealIndex} className="flex gap-2">
                    <input
                      type="text"
                      value={meal}
                      onChange={(e) => {
                        const newMeals = [...(day.meals || [])];
                        newMeals[mealIndex] = e.target.value;
                        handleItineraryChange(index, 'meals', newMeals);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Meal description"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newMeals = (day.meals || []).filter((_, i) => i !== mealIndex);
                        handleItineraryChange(index, 'meals', newMeals);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <MdDelete className="text-sm" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const newMeals = [...(day.meals || []), ''];
                    handleItineraryChange(index, 'meals', newMeals);
                  }}
                  className="text-xs px-3 py-1 text-green-600 border border-green-300 rounded hover:bg-green-50"
                >
                  + Add Meal
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)}

{/* Pricing Tab */}
{activeTab === 'pricing' && (
  <div className="space-y-6">
    <div className="bg-green-50 p-4 rounded-lg">
      <h3 className="font-medium text-green-800 mb-2">Pricing Information</h3>
      <p className="text-sm text-green-700">
        Set competitive prices for different passenger types. Child prices are typically 70% of adult prices, 
        and infant prices are about 30% of adult prices.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Adult Price */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Adult Price (USD) *
        </label>
        <div className="relative">
          <span className="absolute left-3 top-2 text-gray-500">$</span>
          <input
            type="number"
            value={formData.pricing.adult}
            onChange={(e) => {
              const adultPrice = parseInt(e.target.value) || 0;
              handleNestedChange('pricing', 'adult', adultPrice);
              // Auto-calculate other prices
              handleNestedChange('pricing', 'child', Math.floor(adultPrice * 0.7));
              handleNestedChange('pricing', 'infant', Math.floor(adultPrice * 0.3));
              // Update estimatedCost for compatibility
              setFormData(prev => ({ ...prev, estimatedCost: adultPrice }));
            }}
            className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            min="0"
            required
          />
        </div>
      </div>

      {/* Child Price */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Child Price (USD)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-2 text-gray-500">$</span>
          <input
            type="number"
            value={formData.pricing.child}
            onChange={(e) => handleNestedChange('pricing', 'child', parseInt(e.target.value) || 0)}
            className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            min="0"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Auto: {Math.floor(formData.pricing.adult * 0.7)} (70% of adult)
        </p>
      </div>

      {/* Infant Price */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Infant Price (USD)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-2 text-gray-500">$</span>
          <input
            type="number"
            value={formData.pricing.infant}
            onChange={(e) => handleNestedChange('pricing', 'infant', parseInt(e.target.value) || 0)}
            className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            min="0"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Auto: {Math.floor(formData.pricing.adult * 0.3)} (30% of adult)
        </p>
      </div>

      {/* Group Discount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Group Discount (%)
        </label>
        <div className="relative">
          <input
            type="number"
            value={formData.pricing.groupDiscount}
            onChange={(e) => handleNestedChange('pricing', 'groupDiscount', parseInt(e.target.value) || 0)}
            className="w-full pr-8 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            min="0"
            max="50"
          />
          <span className="absolute right-3 top-2 text-gray-500">%</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          For groups of 10+ people
        </p>
      </div>
    </div>

    {/* Pricing Summary */}
    <div className="bg-gray-50 p-4 rounded-lg">
      <h4 className="font-medium text-gray-800 mb-3">Pricing Summary</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Adult:</span>
          <span className="ml-2 font-medium">${formData.pricing.adult}</span>
        </div>
        <div>
          <span className="text-gray-600">Child:</span>
          <span className="ml-2 font-medium">${formData.pricing.child}</span>
        </div>
        <div>
          <span className="text-gray-600">Infant:</span>
          <span className="ml-2 font-medium">${formData.pricing.infant}</span>
        </div>
        <div>
          <span className="text-gray-600">Group Discount:</span>
          <span className="ml-2 font-medium">{formData.pricing.groupDiscount}%</span>
        </div>
      </div>
      
      {formData.pricing.groupDiscount > 0 && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Group Price (10+ people):</strong> ${Math.floor(formData.pricing.adult * (100 - formData.pricing.groupDiscount) / 100)} per adult
          </p>
        </div>
      )}
    </div>
  </div>
)}