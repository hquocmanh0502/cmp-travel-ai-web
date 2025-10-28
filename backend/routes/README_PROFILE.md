# Profile API Documentation

## Base URL
```
http://localhost:3000/api/profile
```

---

## 📋 Table of Contents
1. [User Profile](#user-profile)
2. [User Statistics](#user-statistics)
3. [User Bookings](#user-bookings)
4. [Password Management](#password-management)
5. [Preferences](#preferences)
6. [Wishlist Management](#wishlist-management)
7. [Travel History](#travel-history)
8. [Search History](#search-history)
9. [Avatar Upload](#avatar-upload)
10. [Recent Activity](#recent-activity)
11. [Account Deletion](#account-deletion)

---

## User Profile

### 1. Get User Profile
**GET** `/api/profile/:userId`

Lấy thông tin chi tiết của user.

**Parameters:**
- `userId` (path): MongoDB ObjectId của user

**Response Success (200):**
```json
{
  "success": true,
  "user": {
    "id": "60d5ec49f1b2c72b8c8e4f1a",
    "username": "john_doe",
    "email": "john@example.com",
    "fullName": "John Doe",
    "phone": "0123456789",
    "dateOfBirth": "1990-01-15",
    "address": "123 Street, City",
    "avatar": "https://...",
    "verified": true,
    "preferences": {...},
    "behavior": {...},
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-10T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `404`: User not found
- `500`: Server error

---

### 2. Update User Profile
**PUT** `/api/profile/:userId`

Cập nhật thông tin profile của user.

**Parameters:**
- `userId` (path): MongoDB ObjectId của user

**Request Body:**
```json
{
  "fullName": "John Doe Updated",
  "phone": "0987654321",
  "dateOfBirth": "1990-01-15",
  "address": "456 New Street, City",
  "email": "newemail@example.com",
  "avatar": "https://new-avatar-url.com/image.jpg"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "id": "60d5ec49f1b2c72b8c8e4f1a",
    "username": "john_doe",
    "email": "newemail@example.com",
    "fullName": "John Doe Updated",
    "phone": "0987654321",
    "dateOfBirth": "1990-01-15",
    "address": "456 New Street, City",
    "avatar": "https://new-avatar-url.com/image.jpg",
    "updatedAt": "2024-01-15T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400`: Email already in use
- `404`: User not found
- `500`: Server error

---

### 3. Change Password
**PUT** `/api/profile/:userId/password`

Thay đổi mật khẩu của user.

**Parameters:**
- `userId` (path): MongoDB ObjectId của user

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Responses:**
- `400`: Missing required fields or password too short
- `401`: Current password is incorrect
- `404`: User not found
- `500`: Server error

---

### 4. Get User Bookings
**GET** `/api/profile/:userId/bookings?status=completed&limit=10`

Lấy danh sách bookings của user.

**Parameters:**
- `userId` (path): MongoDB ObjectId của user
- `status` (query, optional): Filter by status (pending, confirmed, completed, cancelled)
- `limit` (query, optional): Limit number of results

**Response Success (200):**
```json
{
  "success": true,
  "count": 5,
  "bookings": [
    {
      "_id": "60d5ec49f1b2c72b8c8e4f1b",
      "userId": "60d5ec49f1b2c72b8c8e4f1a",
      "hotelId": {
        "name": "Grand Hotel",
        "location": {...},
        "images": [...],
        "rating": 4.5
      },
      "checkInDate": "2024-02-01",
      "checkOutDate": "2024-02-05",
      "totalPrice": 5000000,
      "status": "confirmed",
      "createdAt": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

**Error Responses:**
- `500`: Server error

---

### 5. Get User Statistics
**GET** `/api/profile/:userId/stats`

Lấy thống kê về hoạt động của user.

**Parameters:**
- `userId` (path): MongoDB ObjectId của user

**Response Success (200):**
```json
{
  "success": true,
  "stats": {
    "totalBookings": 10,
    "completedBookings": 7,
    "pendingBookings": 2,
    "wishlistCount": 15,
    "totalSpent": 25000000,
    "viewHistoryCount": 50,
    "searchHistoryCount": 30,
    "memberSince": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `404`: User not found
- `500`: Server error

---

### 6. Update User Preferences
**PUT** `/api/profile/:userId/preferences`

Cập nhật preferences của user (cho AI recommendations).

**Parameters:**
- `userId` (path): MongoDB ObjectId của user

**Request Body:**
```json
{
  "budgetRange": {
    "min": 1000000,
    "max": 5000000
  },
  "favoriteCountries": ["Japan", "Korea", "Thailand"],
  "favoriteDestinations": ["Tokyo", "Seoul", "Bangkok"],
  "travelStyle": ["adventure", "cultural", "luxury"],
  "hotelPreferences": {
    "rating": 4,
    "amenities": ["wifi", "pool", "gym"],
    "roomType": "double"
  },
  "activities": ["sightseeing", "shopping", "food"],
  "dietaryRestrictions": ["vegetarian"],
  "languagePreference": "vi",
  "climatePreference": "tropical"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Preferences updated successfully",
  "preferences": {...}
}
```

**Error Responses:**
- `404`: User not found
- `500`: Server error

---

### 7. Delete User Account
**DELETE** `/api/profile/:userId`

Xóa tài khoản user (cần xác nhận bằng password).

**Parameters:**
- `userId` (path): MongoDB ObjectId của user

**Request Body:**
```json
{
  "password": "user_password"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

**Error Responses:**
- `400`: Password is required
- `401`: Password is incorrect
- `404`: User not found
- `500`: Server error

---

## Frontend Integration

### Example: Get User Profile
```javascript
async function loadUserProfile() {
    const userId = localStorage.getItem('userId');
    
    try {
        const response = await fetch(`http://localhost:3000/api/profile/${userId}`);
        const data = await response.json();
        
        if (data.success) {
            console.log('User:', data.user);
            // Update UI with user data
        }
    } catch (error) {
        console.error('Error:', error);
    }
}
```

### Example: Update Profile
```javascript
async function updateProfile(profileData) {
    const userId = localStorage.getItem('userId');
    
    try {
        const response = await fetch(`http://localhost:3000/api/profile/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(profileData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('Profile updated!');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}
```

### Example: Change Password
```javascript
async function changePassword(currentPassword, newPassword) {
    const userId = localStorage.getItem('userId');
    
    try {
        const response = await fetch(`http://localhost:3000/api/profile/${userId}/password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('Password changed!');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}
```

---

## Testing

Run the test file:
```bash
cd backend
node test-profile-api.js
```

Remember to:
1. Replace `TEST_USER_ID` with a real user ID from your database
2. Make sure MongoDB is connected
3. Server is running on port 3000

---

## Notes

- All endpoints require valid MongoDB ObjectId for userId
- Password changes require bcryptjs for secure hashing
- Bookings endpoint uses population to include hotel/tour details
- Statistics are calculated from actual booking data
- Preferences are used for AI-powered recommendations

---

## 🆕 New Features

### 8. Wishlist Management

#### Get Wishlist
**GET** `/api/profile/:userId/wishlist`

Get user's wishlist with tour details.

**Response:**
```json
{
  "success": true,
  "count": 3,
  "wishlist": [
    {
      "_id": "...",
      "name": "Tokyo Adventure",
      "country": "Japan",
      "estimatedCost": 50000000
    }
  ]
}
```

#### Add to Wishlist
**POST** `/api/profile/:userId/wishlist`

**Request Body:**
```json
{
  "tourId": "60d5ec49f1b2c72b8c8e4f1a"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Added to wishlist successfully"
}
```

#### Remove from Wishlist
**DELETE** `/api/profile/:userId/wishlist/:tourId`

**Response:**
```json
{
  "success": true,
  "message": "Removed from wishlist successfully"
}
```

---

### 9. Travel History

**GET** `/api/profile/:userId/travel-history?limit=20`

Get user's recently viewed tours.

**Response:**
```json
{
  "success": true,
  "count": 10,
  "history": [
    {
      "_id": "...",
      "name": "Paris Romance",
      "country": "France"
    }
  ]
}
```

---

### 10. Search History

#### Get Search History
**GET** `/api/profile/:userId/search-history?limit=10`

**Response:**
```json
{
  "success": true,
  "count": 5,
  "searches": [
    {
      "query": "Tokyo",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### Clear Search History
**DELETE** `/api/profile/:userId/search-history`

**Response:**
```json
{
  "success": true,
  "message": "Search history cleared successfully"
}
```

---

### 11. Avatar Upload

**PUT** `/api/profile/:userId/avatar`

Upload avatar as base64 string or URL.

**Request Body:**
```json
{
  "avatar": "data:image/png;base64,iVBORw0KGgoAAAANS..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Avatar updated successfully",
  "avatar": "data:image/png;base64,..."
}
```

---

### 12. Recent Activity

**GET** `/api/profile/:userId/recent-activity?limit=10`

Get combined recent activities (bookings, wishlist additions).

**Response:**
```json
{
  "success": true,
  "count": 8,
  "activities": [
    {
      "type": "booking",
      "icon": "fa-plane",
      "title": "Booked Tokyo Adventure",
      "description": "Status: confirmed",
      "timestamp": "2024-01-15T10:00:00Z"
    },
    {
      "type": "wishlist",
      "icon": "fa-heart",
      "title": "Added to wishlist",
      "description": "Paris Romance",
      "timestamp": "2024-01-14T15:30:00Z"
    }
  ]
}
```

---

## 📊 Complete API Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile/:userId` | Get user profile |
| PUT | `/api/profile/:userId` | Update profile |
| PUT | `/api/profile/:userId/password` | Change password |
| GET | `/api/profile/:userId/bookings` | Get bookings |
| GET | `/api/profile/:userId/stats` | Get statistics |
| PUT | `/api/profile/:userId/preferences` | Update preferences |
| DELETE | `/api/profile/:userId` | Delete account |
| **GET** | **`/api/profile/:userId/wishlist`** | **Get wishlist** |
| **POST** | **`/api/profile/:userId/wishlist`** | **Add to wishlist** |
| **DELETE** | **`/api/profile/:userId/wishlist/:tourId`** | **Remove from wishlist** |
| **GET** | **`/api/profile/:userId/travel-history`** | **Get view history** |
| **GET** | **`/api/profile/:userId/search-history`** | **Get search history** |
| **DELETE** | **`/api/profile/:userId/search-history`** | **Clear search history** |
| **PUT** | **`/api/profile/:userId/avatar`** | **Upload avatar** |
| **GET** | **`/api/profile/:userId/recent-activity`** | **Get recent activity** |

---

## 🧪 Testing

### Test Wishlist
```bash
# Add to wishlist
curl -X POST http://localhost:3000/api/profile/USER_ID/wishlist \
  -H "Content-Type: application/json" \
  -d '{"tourId":"TOUR_ID"}'

# Get wishlist
curl http://localhost:3000/api/profile/USER_ID/wishlist

# Remove from wishlist
curl -X DELETE http://localhost:3000/api/profile/USER_ID/wishlist/TOUR_ID
```

### Test Avatar Upload
```javascript
const avatar = 'data:image/png;base64,iVBORw0KGgoAAAANS...';
fetch('http://localhost:3000/api/profile/USER_ID/avatar', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ avatar })
});
```

---

## 🎯 Frontend Integration Examples

### Get Recent Activity
```javascript
async function loadRecentActivity() {
  const userId = localStorage.getItem('userId');
  const response = await fetch(
    `http://localhost:3000/api/profile/${userId}/recent-activity?limit=10`
  );
  const data = await response.json();
  
  if (data.success) {
    displayActivities(data.activities);
  }
}
```

### Manage Wishlist
```javascript
// Add to wishlist
async function addToWishlist(tourId) {
  const userId = localStorage.getItem('userId');
  const response = await fetch(
    `http://localhost:3000/api/profile/${userId}/wishlist`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tourId })
    }
  );
  return await response.json();
}

// Remove from wishlist
async function removeFromWishlist(tourId) {
  const userId = localStorage.getItem('userId');
  const response = await fetch(
    `http://localhost:3000/api/profile/${userId}/wishlist/${tourId}`,
    { method: 'DELETE' }
  );
  return await response.json();
}
```

---

## ✅ Backend Complete!

All profile management features have been implemented:
- ✅ Basic CRUD operations
- ✅ Password management
- ✅ Statistics & analytics
- ✅ Wishlist management
- ✅ Travel & search history
- ✅ Avatar upload
- ✅ Recent activity tracking
- ✅ Comprehensive error handling
- ✅ MongoDB ObjectId validation
- ✅ Full API documentation

**Total Endpoints: 15**

