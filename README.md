# NxChat - Live Chat SaaS Platform

A comprehensive Zendesk-style live chat SaaS platform with AI chatbot, real-time human support, video/audio calls, and a complete admin ecosystem.

## 🚀 Features

### Core Features
- **Multi-tenant SaaS Architecture** - Each company gets its own workspace
- **Real-time Chat** - Socket.io powered live messaging
- **AI Chatbot** - OpenAI-powered intelligent responses
- **Video/Audio Calls** - WebRTC peer-to-peer communication
- **File Sharing** - Upload and share files in chat
- **Custom Chat Widget** - Embeddable widget for client websites
- **Multi-language Support** - English, Arabic, Urdu, French
- **Dark/Light Mode** - User preference themes

### User Roles
- **Super Admin** - Platform management and oversight
- **Company Admin** - Business workspace management
- **Agent** - Live chat support and ticket handling
- **Customer** - End-user chat experience

### Admin Features
- **Company Management** - Approve, suspend, manage companies
- **Subscription Management** - Stripe integration with multiple plans
- **AI Configuration** - Upload training docs, set chatbot personality
- **Analytics Dashboard** - Comprehensive reporting and metrics
- **Storage Management** - Cloudflare R2 and Wasabi integration
- **Trigger System** - Automated routing and actions

## 👥 Demo Users & Login Credentials

The system comes pre-loaded with demo users for testing all roles:

### Super Admin
- **Email:** `admin@nxchat.com`
- **Password:** `admin123`
- **Access:** Full platform control, company management, system settings

### Company Admins
- **TechCorp Solutions**
  - Email: `admin@techcorp.com`
  - Password: `admin123`
  - Company: TechCorp Solutions (Pro Plan)

- **StartupXYZ**
  - Email: `admin@startupxyz.com`
  - Password: `admin123`
  - Company: StartupXYZ (Starter Plan)

- **Enterprise Inc**
  - Email: `admin@enterprise.com`
  - Password: `admin123`
  - Company: Enterprise Inc (Enterprise Plan)

### Agents
- **TechCorp Agents**
  - Email: `agent1@techcorp.com` / Password: `agent123` (Alice Wilson)
  - Email: `agent2@techcorp.com` / Password: `agent123` (Bob Davis)

- **StartupXYZ Agent**
  - Email: `agent3@startupxyz.com` / Password: `agent123` (Emma Thompson)

- **Enterprise Agents**
  - Email: `agent4@enterprise.com` / Password: `agent123` (David Lee)
  - Email: `agent5@enterprise.com` / Password: `agent123` (Lisa Chen)

### Customers
- **Email:** `customer1@example.com` / Password: `customer123` (John Customer)
- **Email:** `customer2@example.com` / Password: `customer123` (Jane User)
- **Email:** `customer3@example.com` / Password: `customer123` (Mike Client)

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.io** - Real-time communication
- **Sequelize** - MySQL ORM
- **JWT** - Authentication
- **Stripe** - Payment processing
- **OpenAI** - AI chatbot integration
- **Multer** - File upload handling

### Frontend
- **Next.js** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **GSAP** - Animations
- **Socket.io Client** - Real-time communication
- **Recharts** - Data visualization

### Database
- **MySQL** - Primary database
- **Multi-tenant architecture** with tenant_id separation

### Storage
- **Cloudflare R2** - Primary storage
- **Wasabi** - Secondary storage option

## 📋 Prerequisites

- Node.js (v18+)
- MySQL (running locally)
- OpenAI API key
- Stripe test keys
- Cloudflare R2 credentials (optional)
- Wasabi credentials (optional)

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd nxchat
```

### 2. Environment Configuration
Copy the `.env` file and update the values:

```bash
# Database Configuration
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DB=nxchat

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Default Super Admin Credentials
SUPER_ADMIN_EMAIL=admin@nxchat.com
SUPER_ADMIN_PASSWORD=admin123
```

### 3. Database Setup
Create the MySQL database:
```sql
CREATE DATABASE nxchat;
```

### 4. Quick Start (Recommended)
Run both backend and frontend with a single command:

**Windows:**
```bash
# Option 1: Use the batch file
start-dev.bat

# Option 2: Use npm script
npm run dev
```

**Linux/Mac:**
```bash
# Option 1: Use the shell script
./start-dev.sh

# Option 2: Use npm script
npm run dev
```

This will:
- Install all dependencies automatically
- Start backend on http://localhost:3001
- Start frontend on http://localhost:3000
- Run both servers concurrently

### 5. Manual Setup (Alternative)
If you prefer to run servers separately:

**Backend Setup:**
```bash
cd backend
npm install
npm run dev


file:///C:/Users/Muhammad%20Shoaib/Desktop/code/shoaib/index.html
```

taskkill /F /IM node.exe

netstat -ano | findstr ":3000\|:3001"

**Frontend Setup (in a new terminal):**
```bash
cd frontend
npm install
npm run dev
```


The backend will:
- Connect to MySQL database
- Create all tables automatically
- Create default super admin user
- Start server on port 3001

The frontend will start on port 3000.

### 6. Chat Widget Setup
The chat widget is automatically served from the backend at:
```
http://localhost:3001/widget/{tenant_id}
```

## 🎯 Quick Start Guide

### 1. Prerequisites
- Node.js (v18+)
- MySQL (running locally)
- Git

### 2. Installation
```bash
# Clone the repository
git clone <repository-url>
cd nxchat

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Go back to root
cd ..
```

### 3. Database Setup
```bash
# Create MySQL database
mysql -u root -p -e "CREATE DATABASE nxchat;"

# Update .env file with your database credentials
# Edit the .env file and set:
# MYSQL_HOST=localhost
# MYSQL_USER=root
# MYSQL_PASSWORD=your_password
# MYSQL_DB=nxchat
```

### 4. Run the Application
```bash
# Terminal 1: Start Backend (Port 3001)
cd backend
npm run dev

# Terminal 2: Start Frontend (Port 3000)
cd frontend
npm run dev
```

### 5. Access the Application
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Health Check:** http://localhost:3001/health
- **Widget Script:** http://localhost:3001/api/widget/{tenant_id}

### 6. Login
Use any of the demo credentials above to test different user roles.

### 7. Test Features
- **Real-time Chat:** Open multiple browser tabs and test chat between customer and agent
- **AI Chatbot:** Send messages to test AI responses
- **File Upload:** Test file sharing in chat
- **Video/Audio Calls:** Test WebRTC functionality
- **Widget Embed:** Test the embeddable chat widget
- **Stripe Integration:** Test subscription management (requires Stripe keys)

## 📱 Usage Guide

### 1. Super Admin Panel
- **Access:** Login with `admin@nxchat.com` / `admin123`
- **Features:**
  - Manage companies and subscriptions
  - Configure system settings
  - View platform analytics
  - Manage pricing plans
  - System-wide monitoring

### 2. Company Admin Dashboard
- **Access:** Login with company admin credentials
- **Features:**
  - Manage departments and agents
  - Configure AI chatbot settings
  - Customize chat widget
  - View company analytics
  - Manage triggers and automation

### 3. Agent Dashboard
- **Access:** Login with agent credentials
- **Features:**
  - Real-time chat interface (Zendesk-style)
  - Ticket management system
  - File sharing capabilities
  - Video/audio call support
  - AI-powered response suggestions
  - Grammar checking

### 4. Chat Widget Integration
Companies can embed the chat widget on their websites:
```html
<script src="http://localhost:3001/widget/{tenant_id}"></script>
```

### 5. Customer Experience
- **Access:** Login with customer credentials
- **Features:**
  - Live chat with agents
  - AI chatbot for initial support
  - File sharing
  - Video/audio calls
  - Persistent chat history

## 🏗️ Project Structure

```
nxchat/
├── backend/
│   ├── config/          # Database and service configurations
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Authentication and validation
│   ├── models/          # Sequelize models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── sockets/         # Socket.io handlers
│   └── server.js        # Main server file
├── frontend/
│   ├── src/
│   │   ├── app/         # Next.js app directory
│   │   ├── components/  # React components
│   │   ├── contexts/    # React contexts
│   │   ├── types/       # TypeScript types
│   │   └── utils/       # Utility functions
│   └── package.json
├── chat-widget/
│   ├── index.js         # Widget JavaScript
│   └── style.css        # Widget styles
└── .env                 # Environment variables
```

## 🗄️ Database Schema

The platform uses a multi-tenant architecture with the following key models:

### Core Models
- **Users** - Super Admin, Company Admin, Agent, Customer
- **Companies** - Tenant organizations with subscriptions
- **Plans** - Subscription plans (Starter, Pro, Enterprise)
- **Departments** - Company departments for chat routing

### Chat System
- **Chats** - Chat sessions between customers and agents
- **Messages** - Individual messages in chats
- **CallSessions** - Video/audio call records

### Support System
- **Tickets** - Support ticket management
- **Notifications** - Real-time notifications
- **Triggers** - Automated routing and actions

### AI & Configuration
- **AITrainingDocs** - AI training documents
- **AgentSettings** - Agent-specific preferences
- **WidgetSettings** - Chat widget customization
- **SystemSettings** - Platform-wide settings

### Storage
- **StorageProviders** - Cloudflare R2, Wasabi configurations

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh-token` - Refresh JWT token

### Super Admin
- `GET /api/superadmin/dashboard` - Platform overview
- `GET /api/superadmin/companies` - List all companies
- `PUT /api/superadmin/companies/:id/status` - Update company status
- `GET /api/superadmin/plans` - Manage pricing plans
- `GET /api/superadmin/settings` - System settings
- `GET /api/superadmin/analytics` - Platform analytics

### Company Admin
- `GET /api/company/dashboard` - Company overview
- `GET /api/company/departments` - Manage departments
- `GET /api/company/agents` - Manage agents
- `GET /api/company/triggers` - Configure triggers
- `GET /api/company/widget` - Widget settings
- `GET /api/company/analytics` - Company analytics

### Agent
- `GET /api/agent/chats` - List chats
- `GET /api/agent/tickets` - Manage tickets
- `GET /api/agent/settings` - Agent preferences
- `POST /api/agent/files/upload` - File upload

## 🚀 Deployment

### Production Setup
1. **Environment Variables:** Update `.env` with production values
2. **Database:** Use production MySQL instance
3. **Storage:** Configure Cloudflare R2 or Wasabi
4. **AI Service:** Add OpenAI API key
5. **Payment:** Configure Stripe keys

### Docker Deployment (Optional)
```bash
# Build and run with Docker
docker-compose up -d
```

## 🔧 Troubleshooting

### Common Issues
1. **Database Connection Failed**
   - Check MySQL is running
   - Verify credentials in `.env`
   - Ensure database exists

2. **Port Already in Use**
   - Backend: Change `PORT` in `.env`
   - Frontend: Use `npm run dev -- -p 3001`

3. **Socket.io Connection Issues**
   - Check CORS settings
   - Verify backend is running on correct port

4. **AI Service Not Working**
   - Add OpenAI API key to `.env`
   - Check API key validity

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Email: support@nxchat.com

---

**Built with ❤️ using Node.js, Next.js, and modern web technologies.**
- `authenticate` - Authenticate socket connection
- `join_chat` - Join a chat room
- `send_message` - Send a message
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator
- `new_message` - Receive new message
- `user_typing` - User typing indicator

### Call Events
- `call_initiate` - Start a call
- `call_accept` - Accept incoming call
- `call_reject` - Reject incoming call
- `call_offer` - WebRTC offer
- `call_answer` - WebRTC answer
- `call_ice_candidate` - ICE candidate exchange
- `call_end` - End call

### Notification Events
- `new_notification` - Receive notification
- `mark_notification_read` - Mark as read
- `mark_all_notifications_read` - Mark all as read

## 🎨 Customization

### Widget Customization
Companies can customize their chat widget:
- Theme colors
- Position (bottom-right, bottom-left, etc.)
- Welcome message
- Logo
- Feature toggles (audio/video)

### AI Configuration
- Upload training documents (PDF, DOCX, TXT)
- Set chatbot personality (friendly, formal, etc.)
- Configure transfer conditions
- AI confidence thresholds

## 🔒 Security Features

- JWT-based authentication
- Multi-tenant data isolation
- Role-based access control
- Input validation and sanitization
- Rate limiting
- CORS configuration
- SQL injection prevention

## 📊 Analytics & Monitoring

### Super Admin Analytics
- Total companies and users
- Revenue tracking
- System usage metrics
- Error monitoring

### Company Analytics
- Response times
- Customer satisfaction
- AI usage statistics
- Agent performance

## 🚀 Deployment

### Production Environment Variables
Update the following for production:
- `NODE_ENV=production`
- `JWT_SECRET` - Use a strong, random secret
- `MYSQL_HOST` - Production database host
- `OPENAI_API_KEY` - Production OpenAI key
- `STRIPE_SECRET_KEY` - Production Stripe key
- `EMAIL_*` - Production email settings

### Database Migration
The application automatically creates tables on first run. For production:
1. Run database migrations
2. Create production database
3. Update connection strings

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Updates

### Version 1.0.0
- Initial release
- Core chat functionality
- Multi-tenant architecture
- AI chatbot integration
- WebRTC calls
- Admin dashboards
- Stripe integration

---

**NxChat** - Empowering businesses with intelligent live chat solutions.


📋 Created Users:
   Super Admin: admin@nxchat.com / admin123
   Company Admins:
     - admin@techcorp.com / admin123
     - admin@startupxyz.com / admin123
     - admin@enterprise.com / admin123
   Agents:
     - agent1@techcorp.com / agent123
     - agent2@techcorp.com / agent123
     - agent3@startupxyz.com / agent123
     - agent4@enterprise.com / agent123
     - agent5@enterprise.com / agent123
   Customers:
     - customer1@example.com / customer123
     - customer2@example.com / customer123
     - customer3@example.com / customer123