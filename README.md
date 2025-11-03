# Task Management Desktop App

A professional, full-stack task management application built with React.js, Node.js/Express.js, and MongoDB. Features secure authentication, beautiful UI with styled-components, and real-time task management.

## 🚀 Features

### Authentication & Security
- ✅ Secure user registration and login
- ✅ JWT token-based authentication
- ✅ Password hashing with bcrypt
- ✅ Account lockout protection
- ✅ Input validation and sanitization
- ✅ Rate limiting for API protection

### Task Management
- ✅ Create, read, update, and delete tasks
- ✅ Mark tasks as complete/incomplete
- ✅ Priority levels (low, medium, high, urgent)
- ✅ Task status tracking (pending, in-progress, completed, cancelled)
- ✅ Due date management
- ✅ Task archiving

### User Experience
- ✅ Professional, responsive design
- ✅ Beautiful gradient backgrounds
- ✅ Smooth animations and transitions
- ✅ Toast notifications
- ✅ Loading states
- ✅ Form validation with helpful error messages
- ✅ Mobile-friendly interface

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks
- **Styled Components** - CSS-in-JS styling
- **React Hook Form** - Form handling and validation
- **React Hot Toast** - Beautiful notifications
- **Axios** - HTTP client for API calls

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing
- **Helmet** - Security middleware
- **Express Rate Limit** - API rate limiting

## 📁 Project Structure

```
task-management-app/
├── backend/
│   ├── models/
│   │   ├── User.js          # User model with authentication
│   │   └── Task.js          # Task model with validation
│   ├── routes/
│   │   ├── auth.js          # Authentication routes
│   │   └── tasks.js         # Task management routes
│   ├── middleware/
│   │   └── auth.js          # JWT authentication middleware
│   ├── server.js            # Express server setup
│   ├── package.json         # Backend dependencies
│   └── env.example          # Environment variables template
├── src/
│   ├── components/
│   │   ├── LoginPage.js     # Professional login form
│   │   ├── RegisterPage.js  # User registration form
│   │   ├── TaskManagement.js # Main task interface
│   │   └── ProtectedRoute.js # Route protection
│   ├── contexts/
│   │   └── AuthContext.js   # Authentication state management
│   ├── services/
│   │   └── api.js           # API service layer
│   ├── App.js               # Main application component
│   ├── index.js             # Application entry point
│   └── index.css            # Global styles
├── public/
│   └── index.html           # HTML template
└── package.json             # Frontend dependencies
```

## 🚀 Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- MongoDB Atlas account or local MongoDB installation
- npm or yarn

### Installation

1. **Clone and setup the project:**
   ```bash
   cd task-management-app
   npm install
   cd backend
   npm install
   cd ..
   ```

2. **Configure environment variables:**
   ```bash
   # Copy the example environment file
   cp backend/env.example backend/.env
   
   # Edit backend/.env with your MongoDB connection string
   # Add your JWT secret and other configuration
   ```

3. **Start the development servers:**
   ```bash
   # Start both frontend and backend
   npm run dev
   
   # Or start them separately:
   # Backend: npm run server
   # Frontend: npm start
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Health check: http://localhost:5000/api/health

## 🔧 Configuration

### Backend Environment Variables
Create a `.env` file in the `backend` directory:

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/taskmanagement?retryWrites=true&w=majority

# JWT Secret (use a strong, random string)
JWT_SECRET=your_super_secret_jwt_key_here

# Server Configuration
PORT=5000
NODE_ENV=development

# Client URL (for CORS)
CLIENT_URL=http://localhost:3000
```

### Frontend Environment Variables
Create a `.env` file in the root directory:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

## 📱 Usage

### Authentication
1. **Register**: Create a new account with email, password, and name
2. **Login**: Sign in with your credentials
3. **Security**: Account lockout after 5 failed attempts

### Task Management
1. **Add Tasks**: Type and press Enter or click "Add Task"
2. **Complete Tasks**: Click the checkbox or task text
3. **Delete Tasks**: Click the "Delete" button
4. **View Status**: Tasks show completion status visually

## 🔒 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: Secure, stateless authentication
- **Rate Limiting**: Prevents brute force attacks
- **Input Validation**: Server-side validation for all inputs
- **CORS Protection**: Configured for specific origins
- **Helmet**: Security headers
- **Account Lockout**: Temporary lockout after failed attempts

## 🎨 UI/UX Features

- **Professional Design**: Clean, modern interface
- **Responsive Layout**: Works on all screen sizes
- **Smooth Animations**: Hover effects and transitions
- **Loading States**: Visual feedback during operations
- **Toast Notifications**: Success and error messages
- **Form Validation**: Real-time input validation
- **Gradient Backgrounds**: Beautiful visual design

## 🚀 Deployment

### Backend Deployment
1. Deploy to platforms like Heroku, Railway, or DigitalOcean
2. Set environment variables in your hosting platform
3. Ensure MongoDB connection is accessible

### Frontend Deployment
1. Build the React app: `npm run build`
2. Deploy to platforms like Vercel, Netlify, or GitHub Pages
3. Update API URL in environment variables

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🆘 Support

If you encounter any issues:
1. Check the console for error messages
2. Verify your MongoDB connection
3. Ensure all environment variables are set
4. Check that both servers are running

## 🔮 Future Enhancements

- [ ] Task categories and tags
- [ ] File attachments
- [ ] Team collaboration
- [ ] Real-time updates
- [ ] Mobile app
- [ ] Advanced filtering and search
- [ ] Task templates
- [ ] Time tracking
- [ ] Calendar integration