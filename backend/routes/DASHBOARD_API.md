# Dashboard Backend API Documentation

Base URL: `http://localhost:3000/api/admin`

## ✅ Đã hoàn thành

### 📊 Dashboard Analytics

#### GET `/analytics/overview`
Lấy tổng quan thống kê dashboard
- **Response:**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 125840,
    "revenueGrowth": 12.5,
    "totalUsers": 2845,
    "userGrowth": 8.2,
    "totalBookings": 1289,
    "bookingGrowth": 15.3,
    "totalTours": 156,
    "recentBookings": [...],
    "topTours": [...],
    "revenueByMonth": [...]
  }
}
```

---

### 🗺️ Tours Management

#### GET `/tours`
Lấy danh sách tất cả tours
- **Query params:** 
  - `search` - Tìm kiếm theo title, country, city
  - `type` - Lọc theo loại tour (all/day-tour/group-tour/...)
- **Response:** Danh sách tours kèm số booking và revenue

#### POST `/tours`
Tạo tour mới
- **Body:** Tour data (title, country, city, price, duration,...)

#### PUT `/tours/:id`
Cập nhật thông tin tour
- **Body:** Tour data cần update

#### DELETE `/tours/:id`
Xóa tour

---

### 👥 Users Management

#### GET `/users`
Lấy danh sách users
- **Query params:**
  - `search` - Tìm kiếm theo fullName, email, username
  - `status` - Lọc theo trạng thái (verified/unverified)
- **Response:** Danh sách users kèm thống kê bookings và spending

#### PUT `/users/:id`
Cập nhật thông tin user
- **Body:** User data (không bao gồm password)

#### PUT `/users/:id/block`
Block/Unblock user
- Toggle trạng thái blocked của user

---

### 🏨 Hotels Management

#### GET `/hotels`
Lấy danh sách khách sạn
- **Query params:**
  - `search` - Tìm kiếm theo name, location
  - `stars` - Lọc theo số sao

#### POST `/hotels`
Tạo khách sạn mới
- **Body:** Hotel data

#### PUT `/hotels/:id`
Cập nhật khách sạn

#### DELETE `/hotels/:id`
Xóa khách sạn

---

### ⭐ Reviews Management

#### GET `/reviews`
Lấy danh sách reviews
- **Query params:**
  - `search` - Tìm kiếm theo nội dung comment
  - `status` - Lọc theo trạng thái (approved/rejected/pending)
  - `rating` - Lọc theo rating (1-5 sao)
- **Response:** Reviews với thông tin user và tour

#### PUT `/reviews/:id/approve`
Duyệt review

#### PUT `/reviews/:id/reject`
Từ chối review

#### DELETE `/reviews/:id`
Xóa review

#### POST `/reviews/:id/reply`
Trả lời review
- **Body:** `{ "reply": "Admin response text" }`

---

### 📅 Bookings Stats

#### GET `/bookings/stats`
Lấy thống kê bookings
- **Response:**
```json
{
  "success": true,
  "data": {
    "total": 1289,
    "pending": 45,
    "confirmed": 234,
    "completed": 980,
    "cancelled": 30
  }
}
```

---

### 📝 Blog Management

#### GET `/blogs`
Lấy danh sách blog posts

#### POST `/blogs`
Tạo blog mới
- **Body:** Blog data

#### PUT `/blogs/:id`
Cập nhật blog

#### DELETE `/blogs/:id`
Xóa blog

---

## 🔧 Middleware

### `isAdmin` Middleware
- **TODO:** Cần implement authentication thật
- Hiện tại: Cho phép tất cả requests (development only)
- Production: Cần check JWT token và admin role

---

## 📝 Notes

1. **Authentication:** Tất cả endpoints đều có middleware `isAdmin` nhưng chưa implement JWT authentication thực sự. Cần implement trong production.

2. **Error Handling:** Tất cả endpoints đều có try-catch và trả về error message chuẩn:
```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error"
}
```

3. **Pagination:** Chưa implement pagination. Nếu data nhiều nên thêm pagination cho `/tours`, `/users`, `/reviews`.

4. **Validation:** Chưa có validation chi tiết cho input data. Nên thêm validation middleware.

5. **Rate Limiting:** Chưa có rate limiting. Production nên thêm.

---

## 🚀 Cách sử dụng

### Test API với cURL:

```bash
# Get dashboard overview
curl http://localhost:3000/api/admin/analytics/overview

# Get all tours
curl http://localhost:3000/api/admin/tours

# Search tours
curl "http://localhost:3000/api/admin/tours?search=bangkok&type=day-tour"

# Get users
curl http://localhost:3000/api/admin/users

# Get reviews
curl "http://localhost:3000/api/admin/reviews?status=pending"
```

### Test API với Frontend:

```javascript
// Dashboard.jsx
useEffect(() => {
  fetch('http://localhost:3000/api/admin/analytics/overview')
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setStats(data.data);
      }
    })
    .catch(error => console.error('Error:', error));
}, []);
```

---

## ✅ Checklist cho Production

- [ ] Implement JWT authentication trong `isAdmin` middleware
- [ ] Thêm role-based access control (admin, moderator, user)
- [ ] Thêm input validation với Joi hoặc express-validator
- [ ] Thêm pagination cho các endpoints trả về list
- [ ] Thêm rate limiting
- [ ] Thêm request logging
- [ ] Thêm CORS configuration cụ thể
- [ ] Thêm API versioning (/api/v1/admin/...)
- [ ] Optimize database queries (add indexes)
- [ ] Add caching cho frequently accessed data

---

## 🎯 Next Steps

1. **Connect Frontend:** Update các trang Dashboard, Tours, Users, Hotels, Reviews để gọi API thật thay vì mock data

2. **Authentication:** Implement JWT authentication và protected routes

3. **Testing:** Viết unit tests và integration tests cho các endpoints

4. **Documentation:** Thêm Swagger/OpenAPI documentation

5. **Deployment:** Setup production environment và deploy
