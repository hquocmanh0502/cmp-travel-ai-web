# 🚀 Quick Start Guide - Dashboard với Revenue Data

## ✅ Đã Fix

Backend API đã được update để lấy đúng revenue data:
- ✅ Changed `paymentStatus: 'completed'` → `paymentStatus: 'paid'`
- ✅ Changed `totalPrice` → `totalAmount`
- ✅ Database có **98 paid bookings** với tổng **$509,720**

## 🏃 Cách Chạy

### 1. Start Backend Server

Mở **Terminal mới** (riêng biệt) và chạy:

```bash
cd backend
npm start
```

**Quan trọng:** Giữ terminal này **mở** và để server chạy!

Bạn sẽ thấy:
```
Server running on port 3000
✅ MongoDB Connected: ...
```

### 2. Start Dashboard Frontend

Mở **Terminal thứ 2** và chạy:

```bash
cd travelie_dashboard
npm run dev
```

### 3. Mở Dashboard

Mở trình duyệt và vào:
```
http://localhost:5173
```

## 📊 Dữ Liệu Dashboard

Dashboard sẽ hiển thị:

### Stats Cards
- 💰 **Total Revenue**: $509,720
- 📅 **Total Bookings**: 139
- 👥 **Total Users**: 10
- 🗺️ **Total Tours**: 8

### Charts
- 📈 **Revenue Chart**: 6 tháng doanh thu (May-Oct 2025)
- 📊 **Top Destinations**: 5 tour phổ biến nhất

### Recent Bookings
- Danh sách booking gần nhất với customer info

## 🔍 Verify Data

Để check data trong database:

```bash
node backend/scripts/check-payment-status.js
```

Output:
```
📊 Payment Status Breakdown:
   paid: 98 bookings, $509,720
   unpaid: 28 bookings, $178,528
   partial: 13 bookings, $70,530
```

## ⚠️ Troubleshooting

### Backend không start?
```bash
# Kill các node process cũ
taskkill /F /IM node.exe

# Start lại
cd backend
npm start
```

### Dashboard không hiển thị revenue?

1. **Check backend đang chạy:**
   ```bash
   curl http://localhost:3000/api/admin/analytics/overview
   ```

2. **Check browser console** (F12) xem có error không

3. **Hard refresh dashboard:** `Ctrl + Shift + R`

### Port 3000 đã bị chiếm?

Đổi port trong `backend/.env`:
```env
PORT=3001
```

Và update trong `travelie_dashboard/src/pages/Dashboard.jsx`:
```js
const API_BASE_URL = 'http://localhost:3001/api/admin';
```

## 📁 File Locations

- Backend server: `backend/server.js`
- Dashboard page: `travelie_dashboard/src/pages/Dashboard.jsx`
- Admin API routes: `backend/routes/admin.js`
- Data populate script: `backend/scripts/populate-complete-data.js`

## ✨ Features Hoạt Động

- ✅ Total revenue calculation từ paid bookings
- ✅ Revenue growth percentage (30 ngày)
- ✅ Revenue by month chart (6 tháng)
- ✅ Top 5 tours by bookings
- ✅ Recent bookings list
- ✅ User/booking/tour counts
- ✅ Gallery images cho mỗi tour

Enjoy your dashboard! 🎉
