# 🌟 CMP Travel - AI-Powered Travel Platform

A comprehensive travel booking platform with intelligent AI chatbot, built with modern web technologies and OpenAI integration.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)
![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)
![React](https://img.shields.io/badge/React-18+-61dafb.svg)

## ✨ Features

- 🤖 **AI Chatbot** - OpenAI-powered travel assistant with RAG (Retrieval Augmented Generation)
- 🏨 **Hotel Booking** - Comprehensive hotel search and booking system
- 🗺️ **Tour Management** - Tour packages with detailed itineraries
- 👤 **User Management** - Registration, authentication, and profile management
- 💳 **Payment Integration** - PayOS and bank transfer support
- 📱 **Responsive Design** - Mobile-friendly interface
- 🎛️ **Admin Dashboard** - React-based admin panel with analytics

## 🏗️ Architecture

```
├── backend/          # Node.js Express API server (Port 3000)
├── frontend/         # Static HTML/CSS/JS website (Port 8080)
├── rag-chatbot/      # Python Flask AI chatbot API (Port 5000)
├── travelie_dashboard/ # React admin dashboard (Port 5173)
└── data/            # Sample data and knowledge base
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.8+
- MongoDB Atlas account
- OpenAI API key

### 1. Clone Repository
```bash
git clone https://github.com/hquocmanh0502/cmp-travel-ai-web.git
cd cmp-travel-ai-web
```

### 2. Environment Setup
```bash
# Backend configuration
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials
```

### 3. Install Dependencies
```bash
# Backend
cd backend && npm install

# Dashboard
cd ../travelie_dashboard && npm install

# Chatbot
cd ../rag-chatbot && pip install -r requirements.txt
```

### 4. Start Services
```bash
# Automatic startup (Windows)
.\start_all.bat

# Or start services manually:
# Terminal 1: cd backend && npm start
# Terminal 2: cd rag-chatbot && python chatbot_api.py  
# Terminal 3: cd travelie_dashboard && npm run dev
# Terminal 4: cd frontend && python -m http.server 8080
```

### 5. Access Application
- 🌐 **Main Website:** http://localhost:8080
- 🎛️ **Admin Dashboard:** http://localhost:5173
- 🤖 **Chatbot API:** http://localhost:5000
- 📡 **Backend API:** http://localhost:3000

## 📋 Environment Variables

Create `backend/.env` file:

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# Payment (PayOS)
PAYOS_CLIENT_ID=your_client_id
PAYOS_API_KEY=your_api_key
PAYOS_CHECKSUM_KEY=your_checksum_key

# AI Chatbot
OPENAI_API_KEY=sk-proj-your_openai_api_key
```

## 🤖 AI Chatbot Features

- **Natural Language Processing** with OpenAI GPT-3.5 Turbo
- **Knowledge Base** with 232+ documents (tours, hotels, guides)
- **Context-Aware Responses** with conversation memory
- **Multi-language Support** (Vietnamese/English)
- **Real-time Chat Interface** with typing indicators

## 🛠️ Technology Stack

### Backend
- **Node.js** + Express.js
- **MongoDB** with Mongoose ODM
- **JWT** authentication
- **PayOS** payment gateway

### Frontend
- **Vanilla JavaScript** + HTML5/CSS3
- **Responsive Design** with CSS Grid/Flexbox
- **RESTful API** integration

### AI Chatbot
- **Python** + Flask
- **OpenAI GPT-3.5 Turbo** API
- **RAG Architecture** with vector search
- **JSON Knowledge Base** with semantic search

### Admin Dashboard
- **React** 18 + Vite
- **Tailwind CSS** for styling
- **Axios** for API calls
- **React Router** for navigation

## 📁 Project Structure

```
cmp-travel-ai-web/
├── backend/
│   ├── controllers/     # API route handlers
│   ├── models/         # MongoDB schemas
│   ├── routes/         # Express routes
│   ├── middleware/     # Auth & validation
│   └── config/         # Database & payment config
├── frontend/
│   ├── css/            # Stylesheets
│   ├── js/             # JavaScript modules
│   ├── images/         # Static assets
│   └── *.html          # Page templates
├── rag-chatbot/
│   ├── chatbot_api.py  # Flask API server
│   ├── knowledge-base/ # Travel data
│   └── requirements.txt
└── travelie_dashboard/
    ├── src/            # React components
    ├── public/         # Static assets
    └── package.json
```

## 🚀 Deployment

### Development
```bash
.\start_all.bat  # Windows
# or
./start_all.sh   # Linux/Mac
```

### Production
1. Set environment variables
2. Build React dashboard: `cd travelie_dashboard && npm run build`
3. Use PM2 for process management
4. Configure nginx reverse proxy
5. Set up SSL certificates

## 📖 API Documentation

### Backend API (Port 3000)
- `GET /api/tours` - Get all tours
- `GET /api/hotels` - Get all hotels
- `POST /api/bookings` - Create booking
- `POST /api/auth/login` - User authentication

### Chatbot API (Port 5000)
- `POST /api/chat` - Send message to AI chatbot
- `GET /api/health` - Health check

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Hoàng Quốc Mạnh** - *Full Stack Developer* - [@hquocmanh0502](https://github.com/hquocmanh0502)

## 🙏 Acknowledgments

- OpenAI for GPT API
- PayOS for payment integration
- MongoDB Atlas for database hosting
- Vercel for deployment platform

---

⭐ **Star this repository if you find it helpful!**