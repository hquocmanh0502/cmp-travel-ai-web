# 🌍 Travelie - AI-Powered Travel Booking Platform

A comprehensive travel booking platform with AI recommendations, real-time hotel search, and interactive chatbot assistance.

## 🚀 Features

### Customer Website
- 🗺️ **Smart Tour Search** - Browse tours by destination, type, and price
- 🏨 **Hotel Integration** - Real-time hotel search and booking
- 🤖 **AI Chatbot** - Get personalized travel recommendations
- 💬 **Reviews & Ratings** - Read and write tour reviews
- 💰 **CMP Wallet** - Virtual wallet for easy payments
- ❤️ **Wishlist** - Save favorite tours for later
- 📱 **Responsive Design** - Mobile-first design for all devices

### Admin Dashboard
- 📊 **Analytics Dashboard** - Revenue, users, bookings statistics
- 🗺️ **Tour Management** - CRUD operations for tours
- 👥 **User Management** - View and manage users
- 🏨 **Hotel Management** - Manage hotel listings
- ⭐ **Review Moderation** - Approve, reject, or reply to reviews
- 📝 **Blog Management** - Create and manage blog posts
- 📈 **Reports** - Revenue reports and charts

## 🛠️ Tech Stack

### Frontend
- **Main Website**: Vanilla JavaScript, HTML5, CSS3
- **Admin Dashboard**: React 19 + Vite + TailwindCSS 4
- **UI Libraries**: React Icons, Recharts
- **Notifications**: Custom Toast System

### Backend
- **Framework**: Node.js + Express.js
- **Database**: MongoDB + Mongoose
- **AI Services**: Sentiment analysis, recommendation engine
- **Authentication**: JWT tokens

## 📦 Project Structure

```
cmp-travel-main/
├── frontend/              # Customer-facing website
│   ├── css/              # Stylesheets
│   ├── js/               # JavaScript modules
│   ├── images/           # Assets
│   └── *.html            # HTML pages
├── backend/              # Express.js API server
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── scripts/          # Utility scripts
│   └── server.js         # Main server file
├── travelie_dashboard/   # React admin dashboard
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Dashboard pages
│   │   └── main.jsx      # Entry point
│   └── vite.config.js
└── data/                 # JSON data files
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
MONGODB_URI=your_mongodb_connection_string
PORT=3000
JWT_SECRET=your_secret_key
```

5. **Start the backend server**
```bash
cd backend
node server.js
```
Server will run on `http://localhost:3000`

6. **Start the dashboard (in a new terminal)**
```bash
cd travelie_dashboard
npm run dev
```
Dashboard will run on `http://localhost:5173`

7. **Open the main website**
```bash
# Simply open frontend/index.html in your browser
# Or use Live Server extension in VS Code
```

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Main Endpoints

#### Public APIs
- `GET /api/tours` - Get all tours
- `GET /api/tours/:id` - Get tour details
- `GET /api/hotels` - Search hotels
- `GET /api/blogs` - Get blog posts
- `GET /api/comments?tourId=:id` - Get tour reviews

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

#### Bookings
- `GET /api/bookings` - Get user bookings
- `POST /api/bookings` - Create new booking
- `PUT /api/bookings/:id` - Update booking

#### Admin APIs
- `GET /api/admin/analytics/overview` - Dashboard analytics
- `GET /api/admin/tours` - Manage tours
- `GET /api/admin/users` - Manage users
- `GET /api/admin/hotels` - Manage hotels
- `GET /api/admin/reviews` - Manage reviews

## 🎨 Key Features Implementation

### Toast Notifications
Custom toast system for user feedback:
```javascript
showSuccess('Login successful!');
showError('Something went wrong');
showWarning('Please complete your profile');
```

### AI Chatbot
Interactive travel assistant that helps users:
- Find suitable tours based on preferences
- Compare prices and features
- Get destination recommendations
- Answer travel-related questions

### Recommendation System
Smart algorithm that suggests tours based on:
- User preferences and behavior
- Previous bookings and searches
- Popular destinations
- Seasonal trends

### CMP Wallet
Virtual wallet system for easy payments:
- Add funds to wallet
- Use wallet for bookings
- Track transaction history
- Earn rewards

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Protected API routes
- Input validation and sanitization
- XSS protection
- CORS configuration

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
# Start server
node server.js

# Check database connection
node scripts/check-database.js

# Import data
node scripts/import-data.js

# Export data
node scripts/export-data.js
```

### Dashboard
```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

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

- MongoDB Atlas for database hosting
- Unsplash for placeholder images
- Font Awesome for icons
- TailwindCSS for styling utilities

## 📞 Support

For support, email hquocmanh0502@gmail.com or open an issue in the repository.

---

**Built with ❤️ using Node.js, React, and MongoDB**
