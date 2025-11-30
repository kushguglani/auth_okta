# 🔐 KTA Authentication Service

> **Production-Ready Identity & Access Management System**  
> Full-stack authentication with React + Node.js + GraphQL + MongoDB + Redis

---

## 🎯 **Quick Links**

| Document | Description |
|----------|-------------|
| **[📖 System Design](./SYSTEM_DESIGN.md)** | **START HERE** - Complete architecture, flows, & roadmap |
| [📚 Knowledge Base](./knowledge/README.md) | Detailed documentation (14 modules) |
| [🔧 Setup Guide](./SETUP_GUIDE.md) | Installation & configuration |
| [📦 Dependencies](./DEPENDENCIES.md) | Package reference & examples |

---

## 🏗️ System Architecture

```
┌─────────────┐
│   React 18  │ → Apollo Client + Axios + React Router
└──────┬──────┘
       │ HTTPS
┌──────▼────────────────────────────────────────────┐
│  Express Server (Bun Runtime)                     │
│  ├── REST API     → /api/auth/*                   │
│  ├── GraphQL API  → /graphql                      │
│  └── Middleware   → Auth, CORS, Security          │
└──────┬────────────────────────┬───────────────────┘
       │                         │
┌──────▼─────────┐      ┌───────▼────────┐
│   MongoDB      │      │     Redis      │
│  - Users       │      │  - Tokens      │
│  - Sessions    │      │  - Cache       │
│  - Audit Logs  │      │  - Rate Limit  │
└────────────────┘      └────────────────┘
```

**[View Complete System Design →](./SYSTEM_DESIGN.md)**

---

## ✨ Features

### ✅ Implemented (Phase 1)
- User Registration & Login (REST + GraphQL)
- JWT Token Authentication
- Password Hashing (bcrypt)
- GraphQL API (Apollo Server)
- Redis Caching (with fallback)
- MongoDB Integration
- Security Headers (Helmet.js)
- Error Handling & Logging
- Graceful Shutdown

### 🚧 Coming Soon
- Email Verification
- Password Reset Flow
- Two-Factor Authentication
- OAuth 2.0 / SSO
- Role-Based Access Control
- Session Management
- Admin Dashboard
- API Rate Limiting

**[View Complete Roadmap →](./SYSTEM_DESIGN.md#9-future-enhancements)**

---

## 🚀 Project Structure

```
kta/
├── frontend/          # React application
│   ├── public/
│   ├── src/
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
├── backend/           # Node.js/Express server
│   ├── server.js
│   ├── .env
│   └── package.json
├── .gitignore
└── README.md
```

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v14 or higher)
- **npm** or **yarn**

## 🔧 Installation

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

## 🏃 Running the Application

### Start the Backend Server

```bash
cd backend
npm run dev
```

The backend server will start on **http://localhost:5000**

You should see:
```
🚀 Server is running on port 5000
📡 API endpoint: http://localhost:5000
```

### Start the Frontend (in a new terminal)

```bash
cd frontend
npm start
```

The React app will start on **http://localhost:3000**

Your browser should automatically open to **http://localhost:3000** where you'll see "Hello World!"

## 🌐 Available Endpoints

### Backend API Routes

- `GET /` - Welcome message
- `GET /api/health` - Health check endpoint
- `GET /api/hello` - Test endpoint that returns a greeting

### Frontend

- Main app with "Hello World" display
- Backend connection test button
- Beautiful gradient UI

## 🛠️ Available Scripts

### Backend

- `npm start` - Start the server
- `npm run dev` - Start the server with nodemon (auto-restart on changes)

### Frontend

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests

## 📦 Technologies Used

### Frontend
- React 18
- React Scripts
- Modern CSS with gradients

### Backend
- Node.js
- Express.js
- CORS middleware
- dotenv for environment variables

## 🔒 Environment Variables

Create a `.env` file in the `backend` directory (already created):

```env
PORT=5000
NODE_ENV=development
```

## 🎨 Features

- ✅ Modern React 18 with Hooks
- ✅ Express.js REST API
- ✅ CORS enabled for cross-origin requests
- ✅ Proxy configuration for API calls
- ✅ Beautiful gradient UI
- ✅ Backend connection testing
- ✅ Error handling
- ✅ Environment configuration
- ✅ Development mode with auto-reload

## 📚 Knowledge Base

Comprehensive documentation for this project is available in the [`knowledge/`](./knowledge/) directory:

- **[Start Here: Table of Contents](./knowledge/README.md)** - Navigate all topics
- **Express.js** - Deep dive into the framework
- **GraphQL** - Complete guide to GraphQL & Apollo Server
- **Authentication** - Full auth implementation roadmap
- **Redis** - Caching and session management
- **Best Practices** - Security, patterns, and code organization
- **Interview Prep** - Prepare for technical interviews

## 📝 Development Tips

1. **Frontend Development**: The frontend proxies API requests to the backend (configured in `frontend/package.json`)
2. **Backend Development**: Use `npm run dev` to auto-restart on file changes
3. **Add new API routes**: Edit `backend/server.js`
4. **Add new React components**: Create files in `frontend/src/`
5. **Learn the fundamentals**: Check the [`knowledge/`](./knowledge/) directory for detailed guides

## 🚢 Building for Production

### Build Frontend

```bash
cd frontend
npm run build
```

This creates an optimized production build in the `frontend/build` directory.

### Serve Production Build

You can serve the production build using the backend:

1. Install `express.static` middleware (already included)
2. Add this to `backend/server.js`:

```javascript
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend/build')));
```

## 📄 License

ISC

## 🤝 Contributing

Feel free to fork this project and customize it for your needs!

---

**Happy Coding! 🎉**

