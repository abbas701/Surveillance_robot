# Surveillance Robot Web Application

A modern, scalable web application for controlling and monitoring surveillance robots with real-time sensor data visualization and user management.

## 🏗️ Project Structure

```
webApp/
├── backend/                    # Backend API server
│   ├── src/
│   │   ├── config/            # Database and JWT configuration
│   │   ├── controllers/       # API endpoint controllers
│   │   ├── middleware/        # Authentication middleware
│   │   ├── routes/            # API route definitions
│   │   ├── services/          # Business logic services
│   │   ├── app.js            # Express app configuration
│   │   └── server.js         # Server entry point
│   ├── package.json
│   └── env.example           # Environment variables template
│
├── client/                     # Frontend React application
│   ├── public/
│   │   └── assets/            # Images, SVGs, and static files
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── controls/          # Robot control components
│   │   ├── charts/            # Data visualization components
│   │   ├── widgets/           # Dashboard widget components
│   │   ├── pages/             # Main application pages
│   │   ├── lib/               # Utilities and API client
│   │   ├── App.jsx            # Main app component
│   │   └── main.jsx           # App entry point
│   ├── package.json
│   └── vite.config.js         # Vite configuration
│
└── README.md                   # This file
```

## 🚀 Features

- **Real-time Robot Control**: MQTT-based communication for robot commands
- **Sensor Data Visualization**: Charts and graphs for monitoring robot sensors
- **User Authentication**: JWT-based authentication with role-based access
- **User Management**: Admin panel for creating/managing users
- **Responsive Dashboard**: Modern, responsive UI with theme switching
- **Database Integration**: PostgreSQL for data persistence
- **MQTT Integration**: Real-time communication with robot hardware

## 🛠️ Technology Stack

### Backend
- **Node.js** with **Express.js**
- **PostgreSQL** database
- **MQTT** for robot communication
- **JWT** for authentication
- **bcryptjs** for password hashing

### Frontend
- **React 19** with **Vite**
- **React Router** for navigation
- **Axios** for API communication
- **Nivo** charts for data visualization
- **CSS3** with responsive design

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- MQTT Broker (Mosquitto)
- Git

## ⚙️ Installation & Setup

### 1. Clone and Setup

```bash
git clone <repository-url>
cd webApp
git checkout feat/webapp-refactor
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
copy env.example .env
# Edit .env with your database and MQTT settings

# Start the server
npm run dev
```

### 3. Frontend Setup

```bash
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. Database Setup

The application will automatically create required tables on first run:
- `users` - User accounts and authentication
- `sensor_data` - Robot sensor readings
- `calibration_feedback` - Robot calibration data

Default admin account: `admin` / `admin1234`

## 🔧 Environment Variables

### Backend (.env)
```env
# Database
DB_USER=postgres
DB_HOST=localhost
DB_NAME=iot_surveillance
DB_PASSWORD=your_password
DB_PORT=5432

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m

# Server
PORT=3000
NODE_ENV=development

# MQTT
MQTT_BROKER_URL=mqtt://localhost:1883

# CORS
CLIENT_URL=http://localhost:5173
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Users (Admin Only)
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Robot Control
- `GET /api/robot/status` - Get robot status
- `POST /api/robot/command` - Send robot command
- `POST /api/robot/calibrate` - Send calibration command

### Sensors
- `GET /api/sensors/latest` - Get latest sensor data
- `GET /api/sensors/history` - Get sensor data history

### Calibration
- `GET /api/calibration/latest` - Get latest calibration feedback
- `GET /api/calibration/history` - Get calibration history
- `GET /api/calibration/stats` - Get calibration statistics

## 🔐 User Roles

- **Admin**: Full access to all features including user management
- **Guest**: Access to dashboard and robot control (limited features)

## 🎮 Robot Control

The application supports various robot control commands:
- **Locomotion**: Forward, backward, left, right, stop
- **Camera**: Pan, tilt, zoom
- **Calibration**: Sensor calibration for various quantities

## 📊 Data Visualization

Real-time charts and graphs for:
- Temperature, pressure, altitude trends
- Accelerometer and gyroscope data
- Battery status and power consumption
- Robot status and connectivity

## 🚀 Development

### Backend Development
```bash
cd backend
npm run dev  # Start with nodemon
```

### Frontend Development
```bash
cd client
npm run dev  # Start Vite dev server
```

### Building for Production
```bash
# Backend
cd backend
npm start

# Frontend
cd client
npm run build
npm run preview
```

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify PostgreSQL is running
   - Check database credentials in `.env`

2. **MQTT Connection Error**
   - Ensure Mosquitto broker is running
   - Check MQTT broker URL in `.env`

3. **Frontend Build Errors**
   - Clear `node_modules` and reinstall
   - Check Node.js version compatibility

4. **Authentication Issues**
   - Verify JWT secret in `.env`
   - Check cookie settings and CORS configuration

## 📝 Contributing

1. Create a feature branch from `feat/webapp-refactor`
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

This project is proprietary software. All rights reserved.

## 🤝 Support

For technical support or questions, please contact the development team.
