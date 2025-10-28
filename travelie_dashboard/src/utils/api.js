// API Helper for Dashboard Frontend
// File: travelie_dashboard/src/utils/api.js

const API_BASE_URL = 'http://localhost:3000/api/admin';

/**
 * Generic API call function
 */
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'API call failed');
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * Dashboard Analytics API
 */
export const dashboardAPI = {
  // Get overview statistics
  getOverview: () => apiCall('/analytics/overview'),
};

/**
 * Tours API
 */
export const toursAPI = {
  // Get all tours with optional filters
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/tours${queryString ? `?${queryString}` : ''}`);
  },

  // Create new tour
  create: (tourData) => apiCall('/tours', {
    method: 'POST',
    body: JSON.stringify(tourData),
  }),

  // Update tour
  update: (id, tourData) => apiCall(`/tours/${id}`, {
    method: 'PUT',
    body: JSON.stringify(tourData),
  }),

  // Delete tour
  delete: (id) => apiCall(`/tours/${id}`, {
    method: 'DELETE',
  }),
};

/**
 * Users API
 */
export const usersAPI = {
  // Get all users with optional filters
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/users${queryString ? `?${queryString}` : ''}`);
  },

  // Update user
  update: (id, userData) => apiCall(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  }),

  // Block/Unblock user
  toggleBlock: (id) => apiCall(`/users/${id}/block`, {
    method: 'PUT',
  }),
};

/**
 * Hotels API
 */
export const hotelsAPI = {
  // Get all hotels with optional filters
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/hotels${queryString ? `?${queryString}` : ''}`);
  },

  // Create new hotel
  create: (hotelData) => apiCall('/hotels', {
    method: 'POST',
    body: JSON.stringify(hotelData),
  }),

  // Update hotel
  update: (id, hotelData) => apiCall(`/hotels/${id}`, {
    method: 'PUT',
    body: JSON.stringify(hotelData),
  }),

  // Delete hotel
  delete: (id) => apiCall(`/hotels/${id}`, {
    method: 'DELETE',
  }),
};

/**
 * Reviews API
 */
export const reviewsAPI = {
  // Get all reviews with optional filters
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/reviews${queryString ? `?${queryString}` : ''}`);
  },

  // Approve review
  approve: (id) => apiCall(`/reviews/${id}/approve`, {
    method: 'PUT',
  }),

  // Reject review
  reject: (id) => apiCall(`/reviews/${id}/reject`, {
    method: 'PUT',
  }),

  // Delete review
  delete: (id) => apiCall(`/reviews/${id}`, {
    method: 'DELETE',
  }),

  // Reply to review
  reply: (id, replyText) => apiCall(`/reviews/${id}/reply`, {
    method: 'POST',
    body: JSON.stringify({ reply: replyText }),
  }),
};

/**
 * Bookings API
 */
export const bookingsAPI = {
  // Get booking statistics
  getStats: () => apiCall('/bookings/stats'),
};

/**
 * Blog API
 */
export const blogsAPI = {
  // Get all blogs
  getAll: async () => {
    const response = await apiCall('/blogs');
    return response.data || response; // Handle both { data: [] } and direct array
  },

  // Create new blog
  create: async (blogData) => {
    const response = await apiCall('/blogs', {
      method: 'POST',
      body: JSON.stringify(blogData),
    });
    return response.data || response;
  },

  // Update blog
  update: async (id, blogData) => {
    const response = await apiCall(`/blogs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(blogData),
    });
    return response.data || response;
  },

  // Delete blog
  delete: (id) => apiCall(`/blogs/${id}`, {
    method: 'DELETE',
  }),
};

/**
 * Convenience functions for common operations
 */
export const fetchBlogs = () => blogsAPI.getAll();
export const createBlog = (data) => blogsAPI.create(data);
export const updateBlog = (id, data) => blogsAPI.update(id, data);
export const deleteBlog = (id) => blogsAPI.delete(id);

/**
 * Export all APIs
 */
export default {
  dashboard: dashboardAPI,
  tours: toursAPI,
  users: usersAPI,
  hotels: hotelsAPI,
  reviews: reviewsAPI,
  bookings: bookingsAPI,
  blogs: blogsAPI,
};
