# 🚀 Hướng dẫn nhanh: Update các trang còn lại

## Pattern chung để connect với Backend API

### Bước 1: Add API constant và states
```javascript
const API_BASE_URL = 'http://localhost:3000/api/admin';

function YourComponent() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // ... rest of component
}
```

### Bước 2: Replace mock data với API call
```javascript
// ❌ CŨ (Mock data)
useEffect(() => {
  setTimeout(() => {
    setData([...mockDataArray]);
    setLoading(false);
  }, 500);
}, []);

// ✅ MỚI (Real API)
useEffect(() => {
  fetchData();
}, []);

const fetchData = async () => {
  try {
    setLoading(true);
    setError(null);
    
    const response = await fetch(`${API_BASE_URL}/endpoint`);
    const result = await response.json();
    
    if (result.success) {
      setData(result.data);
    } else {
      setError(result.error || 'Failed to fetch');
    }
  } catch (err) {
    console.error('Error:', err);
    setError('Failed to connect to server');
  } finally {
    setLoading(false);
  }
};
```

### Bước 3: Add error UI
```javascript
return (
  <div className="space-y-6">
    {/* Error Message */}
    {error && (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-red-700 font-medium">⚠️ {error}</p>
        <p className="text-sm text-red-600 mt-1">
          Make sure the backend server is running on port 3000
        </p>
      </div>
    )}
    
    {/* Rest of your component */}
  </div>
);
```

---

## 📋 TODO: Users.jsx

**API Endpoint:** `GET /api/admin/users?search=&status=`

**Changes needed:**
```javascript
// 1. Add API call
const fetchUsers = async () => {
  const params = new URLSearchParams();
  if (searchTerm) params.append('search', searchTerm);
  if (statusFilter !== 'all') params.append('status', statusFilter);
  
  const response = await fetch(`${API_BASE_URL}/users?${params}`);
  const data = await response.json();
  
  if (data.success) {
    setUsers(data.data);
  }
};

// 2. Map response data
// Backend returns: { fullName, email, totalBookings, totalSpent, verified, blocked }
// Component expects: similar fields
```

**Block/Unblock action:**
```javascript
const handleToggleBlock = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/block`, {
      method: 'PUT',
    });
    const result = await response.json();
    
    if (result.success) {
      fetchUsers(); // Refresh list
    }
  } catch (err) {
    console.error('Error:', err);
  }
};
```

---

## 📋 TODO: Hotels.jsx

**API Endpoint:** `GET /api/admin/hotels?search=&stars=`

**Changes needed:**
```javascript
// 1. Add API call
const fetchHotels = async () => {
  const params = new URLSearchParams();
  if (searchTerm) params.append('search', searchTerm);
  if (starsFilter !== 'all') params.append('stars', starsFilter);
  
  const response = await fetch(`${API_BASE_URL}/hotels?${params}`);
  const data = await response.json();
  
  if (data.success) {
    setHotels(data.data);
  }
};

// 2. Map response data
// Backend returns: { name, location, stars, rating, price, amenities, images }
// Component expects: similar fields
```

**CRUD Operations:**
```javascript
// Create
const handleCreate = async (hotelData) => {
  const response = await fetch(`${API_BASE_URL}/hotels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(hotelData),
  });
  if (response.ok) fetchHotels();
};

// Update
const handleUpdate = async (id, hotelData) => {
  const response = await fetch(`${API_BASE_URL}/hotels/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(hotelData),
  });
  if (response.ok) fetchHotels();
};

// Delete
const handleDelete = async (id) => {
  const response = await fetch(`${API_BASE_URL}/hotels/${id}`, {
    method: 'DELETE',
  });
  if (response.ok) fetchHotels();
};
```

---

## 📋 TODO: Reviews.jsx

**API Endpoint:** `GET /api/admin/reviews?search=&status=&rating=`

**Changes needed:**
```javascript
// 1. Add API call
const fetchReviews = async () => {
  const params = new URLSearchParams();
  if (searchTerm) params.append('search', searchTerm);
  if (statusFilter !== 'all') params.append('status', statusFilter);
  if (ratingFilter !== 'all') params.append('rating', ratingFilter);
  
  const response = await fetch(`${API_BASE_URL}/reviews?${params}`);
  const data = await response.json();
  
  if (data.success) {
    setReviews(data.data);
  }
};

// 2. Map response data
// Backend returns: { comment, rating, status, userId: {fullName, email}, tourId: {title} }
// Component expects: user name, tour name, comment, rating, status
```

**Moderation actions:**
```javascript
// Approve
const handleApprove = async (reviewId) => {
  await fetch(`${API_BASE_URL}/reviews/${reviewId}/approve`, {
    method: 'PUT',
  });
  fetchReviews();
};

// Reject
const handleReject = async (reviewId) => {
  await fetch(`${API_BASE_URL}/reviews/${reviewId}/reject`, {
    method: 'PUT',
  });
  fetchReviews();
};

// Reply
const handleReply = async (reviewId, replyText) => {
  await fetch(`${API_BASE_URL}/reviews/${reviewId}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reply: replyText }),
  });
  fetchReviews();
};

// Delete
const handleDelete = async (reviewId) => {
  await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
    method: 'DELETE',
  });
  fetchReviews();
};
```

---

## 🎨 UI Pattern cho Loading & Empty States

### Loading Skeleton
```jsx
{loading ? (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="h-48 bg-gray-200 animate-pulse rounded-lg"></div>
        <div className="mt-4 space-y-2">
          <div className="h-6 bg-gray-200 animate-pulse rounded"></div>
          <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4"></div>
        </div>
      </div>
    ))}
  </div>
) : (
  <ActualContent />
)}
```

### Empty State
```jsx
{data.length === 0 && !loading && (
  <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
    <p className="text-gray-500 text-lg">No data found</p>
    <button className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg">
      Add New
    </button>
  </div>
)}
```

---

## 🔧 Common Utilities

### Format Currency
```javascript
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
};
```

### Format Date
```javascript
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};
```

### Safe Data Access
```javascript
// Instead of: tour.pricing.adult (might crash)
// Use: tour.pricing?.adult || 0
```

---

## 📝 Checklist cho mỗi trang

- [ ] Import API_BASE_URL constant
- [ ] Add error state và error UI
- [ ] Add loading state và skeleton
- [ ] Replace mock data với fetch() call
- [ ] Map response data đúng với component
- [ ] Handle empty states
- [ ] Add try-catch error handling
- [ ] Test with backend running
- [ ] Test with backend offline (error case)
- [ ] Test all CRUD operations (if applicable)

---

## 🚀 Quick Start

1. **Copy pattern từ Tours.jsx**
2. **Replace endpoint và data mapping**
3. **Test với backend**
4. **Done!**

Thời gian ước tính: **15-30 phút/trang**

---

## 💡 Tips

1. **Always check console for errors** - Giúp debug nhanh
2. **Use React DevTools** - Xem state changes
3. **Check Network tab** - Xem API requests/responses
4. **Test error cases** - Stop backend và xem error handling
5. **Add console.logs** - Debug data structure
6. **Use optional chaining** - `data?.field?.subfield`
7. **Provide fallbacks** - `data.field || 'default value'`

---

## 🎯 Priority Order

1. **Users.jsx** - Quan trọng, dùng nhiều
2. **Reviews.jsx** - Moderation quan trọng
3. **Hotels.jsx** - Ít dùng hơn
4. **Bookings/*** - Có thể để sau

**Estimated total time: 2-3 hours** để complete tất cả trang còn lại.
