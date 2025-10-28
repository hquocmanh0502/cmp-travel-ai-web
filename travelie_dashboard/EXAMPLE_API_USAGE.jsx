// EXAMPLE: Cách sử dụng API trong Dashboard Components
// File này chỉ là example, không cần import vào project

import { useState, useEffect } from 'react';
import api from '../utils/api';

// ============================================
// EXAMPLE 1: Dashboard.jsx - Get Overview Stats
// ============================================
function DashboardExample() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        const response = await api.dashboard.getOverview();
        
        if (response.success) {
          setStats(response.data);
        }
      } catch (err) {
        setError(err.message);
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="stats">
        <div className="stat-card">
          <h3>Total Revenue</h3>
          <p>${stats.totalRevenue.toLocaleString()}</p>
          <span className={stats.revenueGrowth > 0 ? 'positive' : 'negative'}>
            {stats.revenueGrowth > 0 ? '+' : ''}{stats.revenueGrowth}%
          </span>
        </div>
        <div className="stat-card">
          <h3>Total Users</h3>
          <p>{stats.totalUsers.toLocaleString()}</p>
          <span>{stats.userGrowth > 0 ? '+' : ''}{stats.userGrowth}%</span>
        </div>
        <div className="stat-card">
          <h3>Total Bookings</h3>
          <p>{stats.totalBookings.toLocaleString()}</p>
          <span>{stats.bookingGrowth > 0 ? '+' : ''}{stats.bookingGrowth}%</span>
        </div>
        <div className="stat-card">
          <h3>Total Tours</h3>
          <p>{stats.totalTours}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// EXAMPLE 2: Tours.jsx - CRUD Operations
// ============================================
function ToursExample() {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Fetch tours with search and filter
  const fetchTours = async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (searchTerm) params.search = searchTerm;
      if (filterType !== 'all') params.type = filterType;

      const response = await api.tours.getAll(params);
      
      if (response.success) {
        setTours(response.data);
      }
    } catch (err) {
      console.error('Error fetching tours:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTours();
  }, [searchTerm, filterType]);

  // Create new tour
  const handleCreateTour = async (tourData) => {
    try {
      const response = await api.tours.create(tourData);
      
      if (response.success) {
        alert('Tour created successfully!');
        fetchTours(); // Refresh list
      }
    } catch (err) {
      alert('Error creating tour: ' + err.message);
    }
  };

  // Update tour
  const handleUpdateTour = async (id, tourData) => {
    try {
      const response = await api.tours.update(id, tourData);
      
      if (response.success) {
        alert('Tour updated successfully!');
        fetchTours(); // Refresh list
      }
    } catch (err) {
      alert('Error updating tour: ' + err.message);
    }
  };

  // Delete tour
  const handleDeleteTour = async (id) => {
    if (!confirm('Are you sure you want to delete this tour?')) return;

    try {
      const response = await api.tours.delete(id);
      
      if (response.success) {
        alert('Tour deleted successfully!');
        fetchTours(); // Refresh list
      }
    } catch (err) {
      alert('Error deleting tour: ' + err.message);
    }
  };

  return (
    <div>
      <h1>Tours Management</h1>
      
      {/* Search and Filter */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search tours..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          <option value="day-tour">Day Tour</option>
          <option value="group-tour">Group Tour</option>
          <option value="private-tour">Private Tour</option>
        </select>
      </div>

      {/* Tours List */}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="tours-grid">
          {tours.map(tour => (
            <div key={tour._id} className="tour-card">
              <h3>{tour.title}</h3>
              <p>{tour.city}, {tour.country}</p>
              <p>Price: ${tour.price}</p>
              <p>Bookings: {tour.bookings}</p>
              <p>Revenue: ${tour.revenue}</p>
              <div className="actions">
                <button onClick={() => handleUpdateTour(tour._id, {...tour, price: tour.price + 10})}>
                  Update
                </button>
                <button onClick={() => handleDeleteTour(tour._id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// EXAMPLE 3: Users.jsx - Manage Users
// ============================================
function UsersExample() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchUsers = async () => {
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await api.users.getAll(params);
      
      if (response.success) {
        setUsers(response.data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchTerm, statusFilter]);

  // Block/Unblock user
  const handleToggleBlock = async (userId) => {
    try {
      const response = await api.users.toggleBlock(userId);
      
      if (response.success) {
        alert(response.message);
        fetchUsers(); // Refresh list
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div>
      <h1>Users Management</h1>
      
      <div className="filters">
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Users</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
        </select>
      </div>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Bookings</th>
            <th>Total Spent</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user._id}>
              <td>{user.fullName}</td>
              <td>{user.email}</td>
              <td>{user.totalBookings}</td>
              <td>${user.totalSpent}</td>
              <td>{user.verified ? 'Verified' : 'Unverified'}</td>
              <td>
                <button onClick={() => handleToggleBlock(user._id)}>
                  {user.blocked ? 'Unblock' : 'Block'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// EXAMPLE 4: Reviews.jsx - Moderate Reviews
// ============================================
function ReviewsExample() {
  const [reviews, setReviews] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');

  const fetchReviews = async () => {
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (ratingFilter !== 'all') params.rating = ratingFilter;

      const response = await api.reviews.getAll(params);
      
      if (response.success) {
        setReviews(response.data);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [statusFilter, ratingFilter]);

  // Approve review
  const handleApprove = async (reviewId) => {
    try {
      const response = await api.reviews.approve(reviewId);
      
      if (response.success) {
        alert('Review approved!');
        fetchReviews();
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Reject review
  const handleReject = async (reviewId) => {
    try {
      const response = await api.reviews.reject(reviewId);
      
      if (response.success) {
        alert('Review rejected!');
        fetchReviews();
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Delete review
  const handleDelete = async (reviewId) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
      const response = await api.reviews.delete(reviewId);
      
      if (response.success) {
        alert('Review deleted!');
        fetchReviews();
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Reply to review
  const handleReply = async (reviewId, replyText) => {
    try {
      const response = await api.reviews.reply(reviewId, replyText);
      
      if (response.success) {
        alert('Reply posted!');
        fetchReviews();
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div>
      <h1>Reviews Management</h1>
      
      <div className="filters">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}>
          <option value="all">All Ratings</option>
          <option value="5">5 Stars</option>
          <option value="4">4 Stars</option>
          <option value="3">3 Stars</option>
          <option value="2">2 Stars</option>
          <option value="1">1 Star</option>
        </select>
      </div>

      <div className="reviews-list">
        {reviews.map(review => (
          <div key={review._id} className="review-card">
            <div className="review-header">
              <h4>{review.userId?.fullName || 'Anonymous'}</h4>
              <div className="rating">{'⭐'.repeat(review.rating)}</div>
              <span className={`status ${review.status}`}>{review.status}</span>
            </div>
            <p className="tour-name">Tour: {review.tourId?.title || 'Unknown'}</p>
            <p className="comment">{review.comment}</p>
            
            {review.adminResponse && (
              <div className="admin-reply">
                <strong>Admin Reply:</strong>
                <p>{review.adminResponse}</p>
              </div>
            )}

            <div className="actions">
              {review.status === 'pending' && (
                <>
                  <button onClick={() => handleApprove(review._id)}>Approve</button>
                  <button onClick={() => handleReject(review._id)}>Reject</button>
                </>
              )}
              <button onClick={() => {
                const reply = prompt('Enter your reply:');
                if (reply) handleReply(review._id, reply);
              }}>
                Reply
              </button>
              <button onClick={() => handleDelete(review._id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// EXAMPLE 5: Hotels.jsx - Hotels CRUD
// ============================================
function HotelsExample() {
  const [hotels, setHotels] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [starsFilter, setStarsFilter] = useState('all');

  const fetchHotels = async () => {
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (starsFilter !== 'all') params.stars = starsFilter;

      const response = await api.hotels.getAll(params);
      
      if (response.success) {
        setHotels(response.data);
      }
    } catch (err) {
      console.error('Error fetching hotels:', err);
    }
  };

  useEffect(() => {
    fetchHotels();
  }, [searchTerm, starsFilter]);

  // Similar create, update, delete functions as Tours example...

  return (
    <div>
      <h1>Hotels Management</h1>
      {/* Similar structure as Tours... */}
    </div>
  );
}

export {
  DashboardExample,
  ToursExample,
  UsersExample,
  ReviewsExample,
  HotelsExample
};
