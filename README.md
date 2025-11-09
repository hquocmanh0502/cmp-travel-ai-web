# 🌍 CMP Travel - AI-Powered Travel Booking Platform

A comprehensive travel booking platform with AI recommendations, smart scroll navigation, tour guide reviews, and advanced admin authentication with facial recognition.

## ✨ Key Highlights

- 🤖 **AI-Powered Recommendations** - Personalized tour suggestions based on user preferences
- 🎭 **Tour Guide Review System** - Detailed rating system for tour guides (5-star overall + 5 detailed metrics)
- 🔐 **Advanced Admin Authentication** - Password login + Facial recognition attendance system
- 📜 **Smart Scroll Navigation** - Intelligent section-based scrolling on all pages
- 💳 **CMP Wallet** - Virtual wallet system for seamless payments
- 🏨 **Real-time Hotel Search** - Dynamic hotel integration with filters
- 💬 **AI Chatbot Assistant** - Interactive travel assistant for personalized recommendations

## 🚀 Core Features

### Customer Website
- 🗺️ **Smart Tour Discovery**
  - Browse tours by destination, category, and price range
  - AI-powered tour recommendations based on user behavior
  - Advanced filtering and sorting options
  - Wishlist functionality with persistent storage

- 🏨 **Hotel Integration**
  - Real-time hotel search across destinations
  - Filter by price, star rating, amenities
  - Hotel details with photos and reviews
  - Direct booking integration

- 👨‍✈️ **Tour Guide System**
  - View certified tour guides for each tour
  - Detailed guide profiles with experience and languages
  - Comprehensive review system:
    - Overall rating (1-5 stars)
    - Detailed ratings: Knowledge, Communication, Professionalism, Friendliness, Punctuality
    - Written reviews with timestamps
  - Guide selection during booking process

- 🤖 **AI Chatbot**
  - Natural language understanding
  - Personalized tour recommendations
  - Price comparisons and availability checks
  - 24/7 automated assistance

- 💰 **CMP Wallet**
  - Add funds via PayOS, Momo, Bank Transfer
  - Use wallet balance for bookings
  - Transaction history tracking
  - Automatic refunds for cancellations

- 📜 **Smart Scroll Navigation**
  - Auto-detects important sections on each page
  - Smooth scroll between sections
  - Special logic for gallery pages (category-based scrolling)
  - Responsive positioning (avoids chatbot overlap)
  - Keyboard shortcuts (Alt + Arrow keys)

- 📱 **Responsive Design**
  - Mobile-first approach
  - Optimized for all screen sizes
  - Touch-friendly interface
  - Progressive Web App capabilities

### Admin Dashboard (React)
- � **Advanced Authentication**
  - **Password Login**: Secure admin login with JWT tokens
  - **Facial Recognition Attendance**: Admin attendance tracking using face recognition
  - Session management with auto-logout
  - IP-based security logging

- �📊 **Analytics Dashboard**
  - Real-time revenue statistics
  - Booking trends and charts
  - User growth metrics
  - Top destinations and popular tours
  - Revenue breakdown (bookings + wallet top-ups)

- 🗺️ **Tour Management**
  - Create, read, update, delete tours
  - Image upload and management
  - Category and pricing management
  - Tour availability controls
  - Bulk operations

- 👨‍✈️ **Tour Guide Management**
  - Add and manage tour guides
  - Assign guides to specific tours
  - View guide performance metrics
  - Review and rating management
  - Guide availability scheduling

- 👥 **User Management**
  - View all registered users
  - User activity tracking
  - Ban/unban user accounts
  - Wallet balance monitoring
  - Booking history per user

- 🏨 **Hotel Management**
  - CRUD operations for hotels
  - Hotel details and amenities
  - Pricing and availability
  - Image gallery management
  - Filter by destination

- ⭐ **Review Moderation**
  - View all tour and guide reviews
  - Approve/reject reviews
  - Reply to customer reviews
  - Spam detection and filtering
  - Review analytics

- 📝 **Blog Management**
  - Create and edit blog posts
  - Rich text editor
  - Image upload
  - SEO optimization
  - Publish/draft status

- 📈 **Revenue Reports**
  - Daily, weekly, monthly reports
  - Revenue by tour type
  - Payment method breakdown
  - Downloadable reports
  - Visual charts and graphs

## 🛠️ Tech Stack

### Frontend
- **Customer Website**
  - Vanilla JavaScript (ES6+)
  - HTML5 semantic markup
  - CSS3 with custom animations
  - Font Awesome icons
  - Toast notification system
  
- **Admin Dashboard**
  - React 19 (latest)
  - Vite for build tooling
  - TailwindCSS 4
  - React Icons
  - Recharts for analytics
  - Axios for API calls

### Backend
- **Framework**: Node.js + Express.js
- **Database**: MongoDB + Mongoose ODM
- **Authentication**: 
  - JWT (JSON Web Tokens)
  - Bcrypt password hashing
  - **Face Recognition** (Planned: TensorFlow.js / Face-API.js)
- **Payment Integration**:
  - PayOS
  - Momo
  - Casso (Bank Transfer)
- **AI/ML Services**:
  - Sentiment analysis for reviews
  - Tour recommendation engine
  - Spam detection
- **File Upload**: Multer
- **API Documentation**: RESTful architecture

## 📦 Project Structure

```
cmp-travel-main/
├── frontend/                      # Customer-facing website
│   ├── css/                       # Stylesheets
│   │   ├── main.css              # Global styles
│   │   ├── my-bookings.css       # Booking page styles
│   │   ├── my-wishlist.css       # Wishlist styles
│   │   ├── guide-selection-modal.css  # Guide selection UI
│   │   └── ...
│   ├── js/                        # JavaScript modules
│   │   ├── main.js               # Global functions
│   │   ├── my-bookings.js        # Booking management + guide reviews
│   │   ├── my-wishlist.js        # Wishlist functionality
│   │   ├── scroll-navigation.js  # Smart scroll system
│   │   ├── guide-selection-modal.js  # Guide selection logic
│   │   ├── toast.js              # Notification system
│   │   └── ...
│   ├── images/                    # Static assets
│   ├── *.html                     # HTML pages
│   │   ├── index.html            # Homepage
│   │   ├── destination.html      # Tour listings
│   │   ├── detail.html           # Tour details
│   │   ├── my-bookings.html      # User bookings
│   │   ├── my-wishlist.html      # User wishlist
│   │   ├── gallery.html          # Photo gallery
│   │   └── ...
│   └── uploads/                   # User uploaded files
│
├── backend/                       # Express.js API server
│   ├── models/                    # MongoDB Mongoose models
│   │   ├── User.js               # User model
│   │   ├── Tour.js               # Tour model
│   │   ├── Booking.js            # Booking model
│   │   ├── TourGuide.js          # Tour guide model
│   │   ├── GuideReview.js        # Guide review model
│   │   ├── Hotel.js              # Hotel model
│   │   ├── Blog.js               # Blog post model
│   │   └── ...
│   ├── routes/                    # API route handlers
│   │   ├── auth.js               # Authentication routes
│   │   ├── bookings.js           # Booking + guide review routes
│   │   ├── tour-guides.js        # Tour guide CRUD
│   │   ├── admin.js              # Admin dashboard APIs
│   │   ├── admin-hotels.js       # Hotel management
│   │   ├── admin-reviews.js      # Review moderation
│   │   └── ...
│   ├── middleware/                # Express middleware
│   │   ├── adminAuth.js          # Admin authentication
│   │   ├── requireAdmin.js       # Admin role check
│   │   └── ...
│   ├── services/                  # Business logic
│   ├── scripts/                   # Utility scripts
│   │   ├── seed-tour-guides.js   # Import tour guides
│   │   ├── seed-blogs.js         # Import blog data
│   │   └── ...
│   ├── config/                    # Configuration files
│   │   ├── db.js                 # MongoDB connection
│   │   ├── payos.js              # PayOS config
│   │   ├── momo.js               # Momo config
│   │   └── ...
│   ├── uploads/                   # Backend uploaded files
│   ├── server.js                  # Main server entry point
│   ├── package.json              # Backend dependencies
│   └── .env                       # Environment variables
│
├── travelie_dashboard/            # React Admin Dashboard
│   ├── src/
│   │   ├── components/           # Reusable React components
│   │   │   ├── TourGuides/       # Tour guide components
│   │   │   ├── Tours/            # Tour management components
│   │   │   ├── common/           # Shared components
│   │   │   ├── Header.jsx        # Dashboard header
│   │   │   ├── Sidebar.jsx       # Navigation sidebar
│   │   │   └── ...
│   │   ├── pages/                # Dashboard pages
│   │   │   ├── Dashboard.jsx     # Analytics overview
│   │   │   ├── Tours/            # Tour management page
│   │   │   ├── TourGuides/       # Guide management page
│   │   │   ├── Booking/          # Booking management
│   │   │   ├── Settings/         # Admin settings
│   │   │   └── ...
│   │   ├── utils/                # Utility functions
│   │   │   └── api.js            # API client
│   │   ├── App.jsx               # Main app component
│   │   ├── main.jsx              # Entry point
│   │   └── index.css             # Global styles
│   ├── public/                    # Static assets
│   ├── vite.config.js            # Vite configuration
│   ├── tailwind.config.js        # TailwindCSS config
│   ├── package.json              # Dashboard dependencies
│   └── README.md                 # Dashboard docs
│
├── data/                          # JSON data files
│   ├── data.json                 # Tour data
│   ├── hotels-complete.json      # Hotel data
│   └── blog.json                 # Blog posts
│
├── package.json                   # Root package.json
├── vercel.json                    # Vercel deployment config
└── README.md                      # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js v18+ and npm
- MongoDB Atlas account (or local MongoDB)
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/hquocmanh0502/cmp-travel-ai-web.git
cd cmp-travel-ai-web
```

2. **Install backend dependencies**
```bash
cd backend
npm install
```

3. **Install dashboard dependencies**
```bash
cd ../travelie_dashboard
npm install
```

4. **Configure environment variables**

Create `backend/.env` file:
```env
# Database
MONGODB_URI=your_mongodb_atlas_connection_string
PORT=3000

# Authentication
JWT_SECRET=your_super_secret_jwt_key
SESSION_SECRET=your_session_secret

# PayOS Configuration
PAYOS_CLIENT_ID=your_payos_client_id
PAYOS_API_KEY=your_payos_api_key
PAYOS_CHECKSUM_KEY=your_payos_checksum_key

# Momo Configuration (Optional)
MOMO_PARTNER_CODE=your_momo_partner_code
MOMO_ACCESS_KEY=your_momo_access_key
MOMO_SECRET_KEY=your_momo_secret_key

# Admin Credentials
ADMIN_EMAIL=admin@cmptravel.com
ADMIN_PASSWORD=your_admin_password

# Face Recognition (Planned Feature)
FACE_RECOGNITION_API_KEY=your_face_api_key
FACE_RECOGNITION_THRESHOLD=0.6
```

5. **Seed the database (Optional)**
```bash
cd backend

# Import tour guides
node scripts/seed-tour-guides.js

# Import blog posts
node scripts/seed-blogs.js
```
6. **Start the backend server**
```bash
cd backend
node server.js
```
Server will run on `http://localhost:3000`

7. **Start the admin dashboard (in a new terminal)**
```bash
cd travelie_dashboard
npm run dev
```
Dashboard will run on `http://localhost:5173`

8. **Open the customer website**
```bash
# Option 1: Use Live Server extension in VS Code
# Right-click on frontend/index.html → Open with Live Server

# Option 2: Open directly in browser
# Navigate to frontend/index.html in your browser
```

## 🔐 Authentication System

### Customer Authentication
- **Registration**: Email + Password
- **Login**: Email/Password with JWT token
- **Session**: Stored in localStorage
- **Auto-logout**: On token expiration

### Admin Authentication (Two-Factor)

#### Phase 1: Password Login
1. Admin navigates to admin dashboard
2. Enters email and password
3. Server validates credentials
4. JWT token generated and stored

#### Phase 2: Facial Recognition Attendance (Planned)
1. After successful password login
2. Camera activates for face capture
3. Face embedding generated using TensorFlow.js / Face-API.js
4. Compared against stored admin face templates
5. Attendance logged with timestamp and IP
6. Access granted only after face verification

**Benefits:**
- Enhanced security for admin panel
- Attendance tracking for admin staff
- Prevents unauthorized access even with stolen passwords
- Audit trail for all admin logins

**Technologies (Planned):**
- Face-API.js or TensorFlow.js for face detection
- IndexedDB for storing face templates
- WebRTC for camera access
- Canvas API for image processing

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Main Endpoints

#### Authentication APIs
```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/verify
```

#### Tour APIs
```http
GET    /api/tours              # Get all tours (with filters)
GET    /api/tours/:id          # Get single tour details
POST   /api/admin/tours        # Create new tour (admin)
PUT    /api/admin/tours/:id    # Update tour (admin)
DELETE /api/admin/tours/:id    # Delete tour (admin)
```

#### Tour Guide APIs
```http
GET    /api/tour-guides                    # Get all tour guides
GET    /api/tour-guides/:id                # Get guide details
POST   /api/admin/tour-guides              # Create guide (admin)
PUT    /api/admin/tour-guides/:id          # Update guide (admin)
DELETE /api/admin/tour-guides/:id          # Delete guide (admin)
GET    /api/tours/:tourId/guides            # Get guides for specific tour
```

#### Booking APIs
```http
GET    /api/bookings                       # Get user bookings
POST   /api/bookings                       # Create new booking
PUT    /api/bookings/:id                   # Update booking
DELETE /api/bookings/:id                   # Cancel booking
POST   /api/bookings/:id/review-guide      # Submit guide review
GET    /api/bookings/:id/guide-review      # Get guide review for booking
```

#### Review APIs
```http
GET    /api/comments?tourId=:id            # Get tour reviews
POST   /api/comments                       # Submit tour review
GET    /api/admin/reviews                  # Get all reviews (admin)
PUT    /api/admin/reviews/:id/status       # Approve/reject review (admin)
POST   /api/admin/reviews/:id/reply        # Reply to review (admin)
```

#### Hotel APIs
```http
GET    /api/hotels                         # Search hotels
GET    /api/hotels/:id                     # Get hotel details
POST   /api/admin/hotels                   # Create hotel (admin)
PUT    /api/admin/hotels/:id               # Update hotel (admin)
DELETE /api/admin/hotels/:id               # Delete hotel (admin)
```

#### Wallet APIs
```http
GET    /api/wallet/balance                 # Get wallet balance
POST   /api/wallet/topup                   # Add funds to wallet
GET    /api/wallet/transactions            # Get transaction history
```

#### Admin Analytics APIs
```http
GET    /api/admin/analytics/overview       # Dashboard overview stats
GET    /api/admin/revenue                  # Revenue reports
GET    /api/admin/users                    # User management
GET    /api/admin/bookings                 # All bookings
```

## 🎨 Key Features Implementation

### 1. Tour Guide Review System

**Customer Booking Flow:**
```javascript
// Step 1: Select tour guide during booking
const selectedGuide = showGuideSelectionModal(availableGuides);

// Step 2: After tour completion, submit review
const review = {
  overallRating: 5,        // 1-5 stars
  detailedRatings: {
    knowledge: 5,          // Tour knowledge
    communication: 5,      // Communication skills
    professionalism: 4,    // Professionalism
    friendliness: 5,       // Friendliness
    punctuality: 5         // Punctuality
  },
  comment: "Excellent guide! Very knowledgeable..."
};
submitGuideReview(bookingId, review);
```

**Features:**
- Guide selection modal with photos and details
- 5-star overall rating
- 5 detailed rating categories
- Written review with character limit
- One review per booking
- Review editing within 24 hours
- Anonymous reviews option

### 2. Smart Scroll Navigation

**Auto-Section Detection:**
```javascript
// Automatically detects important sections:
- Header
- Main content areas
- Gallery categories (for gallery.html)
- Footer

// Smooth scroll between sections
scrollDown(); // Next section
scrollUp();   // Previous section

// Keyboard shortcuts
Alt + ↓  // Scroll down
Alt + ↑  // Scroll up
```

**Special Gallery Page Logic:**
```javascript
// Gallery page scrolls through categories:
Header → Portfolio Grid → Nature → Valley → Ocean → 
Culture → Mountains → Desert → People → Discount → Footer
```

**Configuration:**
- Scroll offset: 80px
- Min section height: 100px
- Section spacing: 200px
- Z-index: 999 (below chatbot)
- Responsive positioning

### 3. Toast Notifications

**Usage:**
```javascript
// Success message
showToast('Booking confirmed!', 'success');

// Error message
showToast('Payment failed', 'error');

// Warning message
showToast('Please complete your profile', 'warning');

// Info message
showToast('Tour added to wishlist', 'info');
```

**Features:**
- Auto-dismiss after 3 seconds
- Queue system for multiple toasts
- Slide-in animation
- Color-coded by type
- Icon indicators

### 4. AI Chatbot Assistant

**Capabilities:**
```javascript
// Natural language queries
"Show me beach tours under $500"
"What tours are available in December?"
"Compare Maldives and Bali packages"
"I need a family-friendly tour"

// Chatbot responses include:
- Tour recommendations
- Price comparisons
- Availability checks
- Booking assistance
- Travel tips
```

**Implementation:**
- NLP for intent recognition
- Context-aware conversations
- Quick action buttons
- Persistent chat history
- Mobile-responsive design

### 5. CMP Wallet System

**Wallet Operations:**
```javascript
// Add funds
topupWallet({
  amount: 1000,
  method: 'payos' // or 'momo', 'bank_transfer'
});

// Use wallet for booking
createBooking({
  tourId: '...',
  paymentMethod: 'wallet',
  amount: 850
});

// Check balance
const balance = await getWalletBalance();
```

**Features:**
- Multiple payment gateways
- Transaction history
- Auto-refunds
- Low balance alerts
- Secure transactions

### 6. Admin Facial Recognition (Planned)

**Enrollment Process:**
```javascript
// 1. Capture admin face during setup
const faceDescriptor = await captureFaceDescriptor();

// 2. Store in database
await storeFaceTemplate({
  adminId: 'admin123',
  faceDescriptor: faceDescriptor,
  createdAt: new Date()
});

// 3. Verify during login
const isMatch = await verifyFace(capturedFace, storedTemplate);
if (isMatch && matchScore > 0.6) {
  // Log attendance
  logAttendance({
    adminId: 'admin123',
    timestamp: new Date(),
    ipAddress: req.ip,
    matchScore: matchScore
  });
}
```

**Security Features:**
- Liveness detection (prevent photo spoofing)
- Multiple face angles required
- Time-based access control
- IP whitelisting option
- Failed attempt logging
- Emergency bypass code

## 🔒 Security Features

- **Authentication**
  - JWT-based token authentication
  - Bcrypt password hashing (10 rounds)
  - Secure session management
  - Auto token refresh
  - Token expiration handling

- **Admin Security**
  - Password login (Phase 1)
  - Facial recognition attendance (Phase 2 - Planned)
  - Role-based access control (RBAC)
  - IP-based security logging
  - Failed login attempt tracking
  - Account lockout after 5 failed attempts

- **API Security**
  - Protected routes with middleware
  - Input validation and sanitization
  - XSS protection
  - SQL injection prevention
  - CORS configuration
  - Rate limiting (100 requests/15 minutes)

- **Data Security**
  - MongoDB injection prevention
  - Sensitive data encryption
  - Secure cookie handling
  - Environment variable protection
  - File upload validation
  - HTTPS enforcement (production)

- **Payment Security**
  - PCI DSS compliance
  - Secure payment gateway integration
  - Transaction encryption
  - Webhook signature verification
  - Refund fraud prevention

## 🌐 Deployment

### Backend (Vercel/Railway)
1. Update `vercel.json` configuration
2. Set environment variables
3. Deploy: `vercel --prod`

### Frontend (Netlify/Vercel)
1. Build static files
2. Configure redirects
3. Deploy frontend folder

### Dashboard (Vercel)
```bash
cd travelie_dashboard
npm run build
vercel --prod
```

## 📝 Development Scripts

### Backend
```bash
# Start development server
node server.js

# Start with nodemon (auto-restart)
nodemon server.js

# Database scripts
node scripts/check-database.js           # Test MongoDB connection
node scripts/seed-tour-guides.js         # Import tour guides
node scripts/seed-blogs.js               # Import blog posts

# Data management
node scripts/export-tours.js             # Export all tours to JSON
node scripts/import-hotels.js            # Import hotels from JSON
node scripts/cleanup-orphaned-data.js    # Clean up orphaned records

# Admin utilities
node scripts/create-admin-user.js        # Create admin account
node scripts/reset-admin-password.js     # Reset admin password
```

### Dashboard
```bash
# Development mode
npm run dev                    # Start dev server with hot reload

# Production build
npm run build                  # Build for production
npm run preview                # Preview production build

# Code quality
npm run lint                   # Run ESLint
npm run format                 # Format code with Prettier

# Testing
npm run test                   # Run unit tests
npm run test:coverage          # Generate coverage report
```

### Frontend (Customer Site)
```bash
# Use Live Server extension in VS Code
# Or serve with http-server:
npx http-server frontend -p 8080

# Build optimizations (if needed)
# Minify CSS
npx clean-css-cli -o frontend/css/main.min.css frontend/css/main.css

# Minify JavaScript
npx terser frontend/js/*.js -o frontend/js/bundle.min.js
```

## 🚧 Upcoming Features

### Phase 1: Admin Facial Recognition (In Progress)
- [ ] Face detection using Face-API.js
- [ ] Face enrollment system for admins
- [ ] Real-time face verification
- [ ] Attendance logging dashboard
- [ ] Liveness detection
- [ ] Multi-face support for multiple admins

### Phase 2: Advanced Features (Planned)
- [ ] Multi-language support (Vietnamese, English, Japanese)
- [ ] Progressive Web App (PWA) capabilities
- [ ] Push notifications for booking updates
- [ ] Social media login (Google, Facebook)
- [ ] Advanced tour filters (weather-based, season-based)
- [ ] Virtual tour previews (360° photos/videos)
- [ ] Group booking discounts
- [ ] Loyalty points system
- [ ] Referral program

### Phase 3: AI Enhancements (Planned)
- [ ] Image-based tour search
- [ ] Voice-activated chatbot
- [ ] Predictive pricing based on demand
- [ ] Personalized email campaigns
- [ ] Sentiment analysis for reviews
- [ ] Tour recommendation ML model improvements

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

- **Hoàng Quốc Mạnh** - [@hquocmanh0502](https://github.com/hquocmanh0502)

## 🙏 Acknowledgments

- **MongoDB Atlas** - Cloud database hosting
- **Vercel** - Frontend and backend deployment
- **Unsplash** - High-quality travel images
- **Font Awesome** - Icon library
- **TailwindCSS** - Utility-first CSS framework
- **React** - UI library for admin dashboard
- **Vite** - Next-generation frontend tooling
- **PayOS** - Payment gateway integration
- **Face-API.js** - Face recognition library (planned)

## 📚 Documentation

- [API Documentation](./docs/API.md) - Complete API reference
- [Database Schema](./docs/DATABASE.md) - MongoDB schema details
- [Admin Guide](./docs/ADMIN_GUIDE.md) - Admin dashboard manual
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment steps

## 🐛 Known Issues

- Safari browser: Scroll navigation may have slight delays
- Mobile: Face recognition requires HTTPS
- IE11: Not supported (use modern browsers)

## 🔮 Future Improvements

1. **Performance**
   - Implement Redis caching for frequently accessed data
   - Add image lazy loading and compression
   - Optimize database queries with indexes
   - CDN integration for static assets

2. **User Experience**
   - Add dark mode toggle
   - Improve mobile navigation
   - Add tour comparison feature
   - Implement real-time booking availability

3. **Admin Tools**
   - Bulk operations for tours and users
   - Advanced analytics with custom date ranges
   - Export reports to Excel/PDF
   - Email notification system

## 📞 Support & Contact

- **Email**: hquocmanh0502@gmail.com
- **GitHub Issues**: [Report a bug](https://github.com/hquocmanh0502/cmp-travel-ai-web/issues)
- **Documentation**: [Wiki](https://github.com/hquocmanh0502/cmp-travel-ai-web/wiki)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Developer

**Hoàng Quốc Mạnh**
- GitHub: [@hquocmanh0502](https://github.com/hquocmanh0502)
- Email: hquocmanh0502@gmail.com
- LinkedIn: [Your LinkedIn Profile]

## 🌟 Show Your Support

Give a ⭐️ if this project helped you!

## 📈 Project Statistics

- **Total Files**: 150+
- **Lines of Code**: 25,000+
- **API Endpoints**: 50+
- **React Components**: 30+
- **Database Models**: 15+
- **Development Time**: 3+ months

---

**Built with ❤️ using Node.js, React, MongoDB, and AI**

*Last Updated: November 9, 2025*
