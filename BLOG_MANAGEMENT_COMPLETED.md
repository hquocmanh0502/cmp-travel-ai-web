# Blog Management Feature - Setup Guide

## 📦 Installation

### 1. Install react-hot-toast (nếu chưa có)
```bash
cd travelie_dashboard
npm install react-hot-toast
```

## 🚀 Quick Start

### 1. Chạy Backend Server
```bash
cd backend
node server.js
```
Backend sẽ chạy tại: `http://localhost:3000`

### 2. Chạy Dashboard Frontend
```bash
cd travelie_dashboard
npm run dev
```
Dashboard sẽ chạy tại: `http://localhost:5173`

## 📂 Files Created

### Frontend Files:
- `travelie_dashboard/src/pages/Blog/BlogManagement.jsx` - Main blog management page
- `travelie_dashboard/src/components/Blog/BlogModal.jsx` - Create/Edit blog modal
- `travelie_dashboard/src/components/Modals/DeleteConfirmModal.jsx` - Delete confirmation modal

### Updated Files:
- `travelie_dashboard/src/App.jsx` - Added Blog route and Toaster
- `travelie_dashboard/src/utils/api.js` - Added blog API helper functions
- `travelie_dashboard/src/utils/exportExcel.js` - Added export blogs function

### Backend:
Backend Blog API đã sẵn sàng tại `backend/routes/admin.js`:
- `GET /api/admin/blogs` - Lấy tất cả blogs
- `POST /api/admin/blogs` - Tạo blog mới
- `PUT /api/admin/blogs/:id` - Cập nhật blog
- `DELETE /api/admin/blogs/:id` - Xóa blog

## ✨ Features

### Blog Management Page
✅ **View All Blogs** - Hiển thị tất cả blogs với table responsive
✅ **Statistics Cards** - Tổng số blogs, published, drafts, categories
✅ **Search** - Tìm kiếm theo title, author, excerpt
✅ **Filters** - Lọc theo status (all, published, draft, archived) và category
✅ **Create Blog** - Tạo blog mới với form đầy đủ
✅ **Edit Blog** - Chỉnh sửa blog existing
✅ **Delete Blog** - Xóa blog với confirmation modal
✅ **Export Excel** - Export danh sách blogs ra file Excel
✅ **Toast Notifications** - Thông báo success/error khi thực hiện actions

### Blog Form Fields:
- **Title*** (required) - Tiêu đề blog
- **Author*** (required) - Tác giả
- **Category*** (required) - Danh mục (11 categories)
- **Excerpt*** (required) - Tóm tắt ngắn gọn
- **Content*** (required) - Nội dung chi tiết (supports Markdown)
- **Featured Image** - URL ảnh đại diện
- **Tags** - Các tags phân cách bằng dấu phẩy
- **Status*** (required) - Draft/Published/Archived
- **Published Date** - Ngày xuất bản

### Categories Available:
1. Travel Tips
2. Destination Guides
3. Culture & Tradition
4. Food & Cuisine
5. Adventure
6. Budget Travel
7. Luxury Travel
8. Family Travel
9. Solo Travel
10. Photography
11. News & Updates

## 🎨 UI Features

### Modern Design:
- ✅ Clean, professional interface
- ✅ Responsive grid layout
- ✅ Beautiful gradient header
- ✅ Hover effects and transitions
- ✅ Color-coded status badges
- ✅ Image preview in modal
- ✅ Character counter for excerpt/content
- ✅ Form validation with error messages
- ✅ Loading states and spinners

### Icons Used:
- FiPlus - Create new blog
- FiEdit2 - Edit blog
- FiTrash2 - Delete blog
- FiEye - Views counter
- FiSearch - Search input
- FiFilter - Filter dropdown
- FiCalendar - Date display
- FiUser - Author display
- FiTag - Tags and categories
- FiImage - Image placeholder
- FiUpload - Upload button
- FiX - Close modal
- FiAlertTriangle - Delete warning

## 📊 API Endpoints

### GET /api/admin/blogs
**Response:**
```json
[
  {
    "_id": "...",
    "title": "Amazing Travel Destination",
    "author": "John Doe",
    "category": "Destination Guides",
    "excerpt": "Short description...",
    "content": "Full blog content...",
    "image": "https://...",
    "tags": ["travel", "adventure"],
    "status": "published",
    "publishedDate": "2025-01-15",
    "views": 150,
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

### POST /api/admin/blogs
**Request Body:**
```json
{
  "title": "Blog Title",
  "author": "Author Name",
  "category": "Travel Tips",
  "excerpt": "Short description",
  "content": "Full content here",
  "image": "https://...",
  "tags": ["tag1", "tag2"],
  "status": "published",
  "publishedDate": "2025-01-15"
}
```

### PUT /api/admin/blogs/:id
**Request Body:** (same as POST)

### DELETE /api/admin/blogs/:id
**Response:**
```json
{
  "message": "Blog deleted successfully"
}
```

## 🔧 Customization

### Add More Categories:
Edit `BlogManagement.jsx`, line 33:
```javascript
const categories = [
  'Travel Tips',
  'Your New Category', // Add here
  // ...
];
```

### Change Excel Export Columns:
Edit `exportExcel.js`, `exportBlogsToExcel` function

### Modify Form Validation:
Edit `BlogModal.jsx`, `validateForm` function

## 🐛 Troubleshooting

### 1. "react-hot-toast not found"
```bash
cd travelie_dashboard
npm install react-hot-toast
```

### 2. Backend API không hoạt động
- Kiểm tra backend server đang chạy: `http://localhost:3000`
- Kiểm tra console logs trong terminal backend
- Kiểm tra Network tab trong browser DevTools

### 3. Modal không mở
- Kiểm tra console errors
- Verify import paths đúng
- Clear browser cache và reload

### 4. Excel export không work
- Kiểm tra `xlsx` package đã được cài: `npm list xlsx`
- Nếu chưa có: `npm install xlsx`

## 📝 Usage Example

1. **Tạo Blog Mới:**
   - Click nút "New Blog"
   - Điền thông tin: Title, Author, Category, Excerpt, Content
   - Thêm image URL (optional)
   - Thêm tags (optional)
   - Chọn Status (Draft/Published)
   - Click "Create Blog"

2. **Edit Blog:**
   - Click icon Edit (pencil) trên row của blog
   - Sửa thông tin cần thiết
   - Click "Update Blog"

3. **Delete Blog:**
   - Click icon Delete (trash) trên row của blog
   - Confirm xóa trong modal
   - Blog sẽ bị xóa khỏi database

4. **Export Excel:**
   - Click nút "Export Excel"
   - File `blogs-export.xlsx` sẽ được tải xuống

5. **Search & Filter:**
   - Dùng search box để tìm theo title/author/excerpt
   - Chọn filter Status: All/Published/Draft/Archived
   - Chọn filter Category: All/Specific Category

## 🎯 Next Steps

- [ ] Add image upload functionality (currently using URL)
- [ ] Add rich text editor for content (TinyMCE/Quill)
- [ ] Add blog preview before publish
- [ ] Add SEO fields (meta description, keywords)
- [ ] Add blog comments management
- [ ] Add blog analytics (views over time)
- [ ] Add bulk actions (publish/delete multiple)
- [ ] Add blog scheduling (publish at specific time)

## 📞 Support

Nếu gặp vấn đề, hãy:
1. Check console logs (F12)
2. Check Network tab để xem API calls
3. Verify backend logs
4. Check file paths và imports

Happy blogging! 🚀✨
