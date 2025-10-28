// Script to translate Vietnamese to English in all HTML files
const fs = require('fs');
const path = require('path');

const translations = {
  // Dropdown menu
  'Xin chào': 'Hello',
  'Thông tin cá nhân': 'Profile',
  'Đơn đặt tour': 'My Bookings',
  'Danh sách yêu thích': 'Wishlist',
  'Lịch sử du lịch': 'Travel History',
  'Tùy chọn AI': 'AI Preferences',
  'Đăng xuất': 'Logout',
  
  // Chatbot
  'Xin chào! Tôi là trợ lý AI của CMP Travel. Tôi có thể giúp bạn tìm tour phù hợp, tư vấn giá cả và hỗ trợ đặt tour. Bạn cần hỗ trợ gì?': 
    'Hello! I am CMP Travel\'s AI assistant. I can help you find suitable tours, advise on pricing, and assist with tour bookings. How can I help you?',
  
  // Common buttons and labels
  'Tìm kiếm': 'Search',
  'Đặt ngay': 'Book Now',
  'Xem thêm': 'View More',
  'Chi tiết': 'Details',
  'Liên hệ': 'Contact',
  'Gửi': 'Send',
  'Hủy': 'Cancel',
  'Đóng': 'Close',
  'Lưu': 'Save',
  'Chỉnh sửa': 'Edit',
  'Xóa': 'Delete',
  'Thêm': 'Add',
  
  // Notifications
  'Đăng xuất thành công!': 'Logged out successfully!',
  'Đăng nhập thành công!': 'Logged in successfully!',
  'Bạn có chắc chắn muốn đăng xuất?': 'Are you sure you want to logout?',
  
  // Other common phrases
  'Không thể tải': 'Cannot load',
  'Đang tải': 'Loading',
  'Vui lòng': 'Please',
  'Cảm ơn': 'Thank you'
};

function translateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Replace each translation
    for (const [vietnamese, english] of Object.entries(translations)) {
      const regex = new RegExp(vietnamese.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      if (content.includes(vietnamese)) {
        content = content.replace(regex, english);
        modified = true;
        console.log(`✅ ${path.basename(filePath)}: "${vietnamese}" → "${english}"`);
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function translateDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  let totalModified = 0;
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and other unnecessary directories
      if (!['node_modules', '.git', 'images'].includes(file)) {
        totalModified += translateDirectory(filePath);
      }
    } else if (file.endsWith('.html')) {
      if (translateFile(filePath)) {
        totalModified++;
      }
    }
  });
  
  return totalModified;
}

// Start translation
console.log('🌐 Starting Vietnamese to English translation...\n');
const frontendPath = path.join(__dirname, '..', '..', 'frontend');
const modifiedCount = translateDirectory(frontendPath);
console.log(`\n✅ Translation complete! Modified ${modifiedCount} files.`);
