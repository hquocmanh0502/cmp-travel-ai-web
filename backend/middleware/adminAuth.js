// Admin Authentication Middleware
// For now, this is a placeholder that allows all requests
// TODO: Implement proper admin authentication

const isAdmin = (req, res, next) => {
  // Temporary: Allow all requests
  // In production, implement proper admin token verification
  next();
};

module.exports = { isAdmin };
