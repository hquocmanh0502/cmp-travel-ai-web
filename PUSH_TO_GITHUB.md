# Hướng Dẫn Push Project Lên GitHub

## ⚠️ Các File NÊN XÓA Trước Khi Push:

### 1. **File Test/Debug (Không cần thiết cho production)**
```
backend/test-booking-api.js
backend/test-user.js
backend/insert-blog.js
backend/insert-db.js
```

### 2. **Node Modules (Đã có trong .gitignore)**
```
node_modules/
backend/node_modules/
travelie_dashboard/node_modules/
```

### 3. **Environment Files (QUAN TRỌNG - Chứa thông tin nhạy cảm)**
```
backend/.env
```
**⚠️ CẢNH BÁO:** File `.env` chứa MongoDB connection string, API keys. **KHÔNG BAO GIỜ** push lên GitHub!

### 4. **Build Artifacts**
```
travelie_dashboard/dist/
```

### 5. **Log Files**
```
*.log
npm-debug.log*
```

---

## ✅ Các Bước Push Lên GitHub:

### Bước 1: Xóa các file test không cần thiết
```powershell
cd E:\cmp-travel-main\backend
Remove-Item test-booking-api.js -ErrorAction SilentlyContinue
Remove-Item test-user.js -ErrorAction SilentlyContinue
Remove-Item insert-blog.js -ErrorAction SilentlyContinue
Remove-Item insert-db.js -ErrorAction SilentlyContinue
```

### Bước 2: Kiểm tra Git status
```powershell
cd E:\cmp-travel-main
git status
```

### Bước 3: Xóa cache và re-add tất cả files
```powershell
# Xóa cached files (để .gitignore có hiệu lực)
git rm -r --cached .

# Add lại tất cả files (trừ files trong .gitignore)
git add .
```

### Bước 4: Commit changes
```powershell
git commit -m "feat: Complete booking system with reservation flow

- Fixed booking summary display from detail.html
- Added form constraints (locked dates, disabled guest selects)
- Implemented hotelId validation for MongoDB ObjectId
- Mounted new booking routes (routes/bookings.js)
- Commented out old booking endpoint in server.js
- Added comprehensive validation and error handling
- Fixed reservation.js script loading
- Updated .gitignore for better security"
```

### Bước 5: Push lên GitHub (Force push để thay thế hoàn toàn)
```powershell
# Kiểm tra remote
git remote -v

# Force push để thay thế hoàn toàn remote repository
git push origin master --force

# Hoặc nếu branch là main:
# git push origin main --force
```

---

## 🔒 Tạo File .env.example (Template cho người khác)

Tạo file `backend/.env.example` với nội dung:
```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Secret (optional)
JWT_SECRET=your_jwt_secret_here

# API Keys (if any)
API_KEY=your_api_key_here
```

---

## 📝 Checklist Trước Khi Push:

- [ ] Đã xóa các file test (test-*.js, insert-*.js)
- [ ] File `.env` KHÔNG có trong staged files (`git status`)
- [ ] Đã cập nhật .gitignore
- [ ] Đã tạo .env.example
- [ ] Code đã test và chạy OK
- [ ] Backend server khởi động thành công
- [ ] Frontend load được data từ backend

---

## ⚠️ LƯU Ý QUAN TRỌNG:

1. **Backup .env file**: Sao chép `backend/.env` ra ngoài project trước khi push
2. **Force push sẽ XÓA toàn bộ history cũ**: Không thể khôi phục
3. **Thông báo team members**: Họ cần `git pull --force` để sync
4. **MongoDB credentials**: Đảm bảo .env không bị push lên GitHub

---

## 🚀 Alternative: Soft Reset (Không xóa history)

Nếu không muốn force push:
```powershell
git pull origin master --rebase
git push origin master
```
