# 🚀 HƯỚNG DẪN CHẠY HỆ THỐNG CMP TRAVEL

## 📋 Tổng quan hệ thống
Hệ thống CMP Travel bao gồm 3 service:
1. **Backend** (API Server + Website) - Port 3000. Backend phục vụ luôn thư mục `frontend`
2. **Chatbot API** (AI Service) - Port 5000
3. **React Dashboard** (Admin Panel) - Port 5173

> Không mở website bằng server riêng (ví dụ `python -m http.server 8080`). Nhiều trang gọi
> API bằng đường dẫn tương đối `/api/...`, nên phải chạy chung port với backend.

---

## 🔧 Chuẩn bị môi trường

### 1. Kiểm tra Node.js và Python
```bash
node --version    # Cần >= 16.x
python --version  # Cần >= 3.8
```

### 2. MongoDB Atlas
- Đảm bảo MongoDB Atlas cluster đang hoạt động
- Connection string đã được cài đặt đúng

---

## 🚀 CÁCH CHẠY HỆ THỐNG (3 bước)

### Bước 1: Khởi động Backend (Port 3000)
```powershell
# Terminal 1
cd backend
npm install  # Chỉ cần chạy 1 lần đầu
npm start
```
**✅ Kiểm tra:** Thấy message "Server running on port 3000" và "MongoDB Connected"

### Bước 2: Khởi động Chatbot API (Port 5000)
```powershell
# Terminal 2  
cd rag-chatbot
python chatbot_api.py
```
**✅ Kiểm tra:** Thấy message "✅ Loaded 232 documents" và "Running on http://127.0.0.1:5000"

### Bước 3: Khởi động React Dashboard (Port 5173)
```powershell
# Terminal 3
cd travelie_dashboard
npm install  # Chỉ cần chạy 1 lần đầu  
npm run dev
```
**✅ Kiểm tra:** Thấy message "Local: http://localhost:5173/"

---

## 🌐 Truy cập hệ thống

### URLs chính:
- **Website:** http://localhost:3000
- **Backend API:** http://localhost:3000/api
- **Admin Dashboard:** http://localhost:5173
- **Chatbot API:** http://localhost:5000/health

### Test pages có chatbot:
- http://localhost:3000 (Homepage)
- http://localhost:3000/detail.html
- http://localhost:3000/blog.html
- http://localhost:3000/contact.html
- http://localhost:3000/login.html
- ... và 10+ trang khác

---

## 🧪 KIỂM TRA HOẠT ĐỘNG

### 1. Test Backend
```bash
curl http://localhost:3000/api/tours
```

### 2. Test Chatbot API
```bash
curl http://localhost:5000/health
```

### 3. Test Frontend + Chatbot
1. Mở http://localhost:3000
2. Tìm chatbot widget ở góc phải dưới
3. Click để mở chatbot
4. Test chat: "Show me tours under $3000"

---

## 🔥 SCRIPT NHANH - CHẠY TẤT CẢ

Double-click file `start_all.bat` ở thư mục gốc project. Script tự mở 4 cửa sổ cho backend, chatbot, dashboard và frontend.

Script dùng đường dẫn tương đối theo vị trí của chính nó (`%~dp0`), nên clone project về thư mục nào cũng chạy được, không cần sửa gì.

Tắt tất cả: double-click `stop_all.bat`.

---

## ❌ XỬ LÝ LỖI THƯỜNG GẶP

### Lỗi: "Port already in use"
```powershell
# Tìm và kill process đang sử dụng port
netstat -ano | findstr :3000
taskkill /PID [PID_NUMBER] /F
```

### Lỗi: "MongoDB connection failed"
- Kiểm tra internet connection
- Verify MongoDB Atlas cluster status
- Check connection string trong code

### Lỗi: "OpenAI API quota exceeded"
- Kiểm tra usage tại: https://platform.openai.com/usage
- Nạp thêm credit nếu cần

### Lỗi: "Knowledge base not found"
```powershell
cd rag-chatbot
python extract_mongodb_data.py
```

---

## 🔄 TẮT HỆ THỐNG

1. **Graceful shutdown:** Ctrl+C trong từng terminal
2. **Force kill:** Đóng terminal windows
3. **Kill specific ports:**
```powershell
# Kill port 3000 (Backend)
netstat -ano | findstr :3000
taskkill /PID [PID] /F

# Kill port 5000 (Chatbot)  
netstat -ano | findstr :5000
taskkill /PID [PID] /F

# Kill port 8080 (Frontend)
netstat -ano | findstr :8080
taskkill /PID [PID] /F
```

---

## 📊 MONITORING

### Logs quan trọng:
- **Backend:** MongoDB connection status, API requests
- **Chatbot:** Document loading, OpenAI API calls
- **Frontend:** Browser console for JavaScript errors

### Performance check:
- Backend: Response time < 500ms
- Chatbot: AI response time < 5s
- Frontend: Page load < 2s

---

## 🎯 PRODUCTION DEPLOYMENT

### Environment variables cần thiết:
```env
# Backend (.env)
MONGODB_URI=mongodb+srv://...
PAYOS_CLIENT_ID=your_payos_id
PAYOS_API_KEY=your_payos_key
NODE_ENV=production

# Chatbot API
OPENAI_API_KEY=sk-proj-...
```

### Build production:
```bash
# Backend
cd backend
npm run build

# Frontend  
cd frontend
# Deploy static files to web server
```

---

## 📞 SUPPORT

Nếu gặp vấn đề:
1. Kiểm tra logs trong terminal
2. Verify các ports không bị conflict
3. Restart services theo đúng thứ tự
4. Check network connectivity

**Happy coding! 🚀**