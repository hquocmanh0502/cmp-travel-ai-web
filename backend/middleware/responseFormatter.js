// Response formatting middleware for consistent API responses
const responseFormatter = (req, res, next) => {
  // Store original json method
  const originalJson = res.json;
  
  // Override res.json
  res.json = function(data) {
    // Check if this is an admin/hotels route
    if (req.url.includes('/api/admin/hotels') && data.hotels) {
      // Ensure consistent format - don't double wrap
      return originalJson.call(this, data);
    }
    
    // For other routes, keep original behavior
    return originalJson.call(this, data);
  };
  
  next();
};

module.exports = responseFormatter;