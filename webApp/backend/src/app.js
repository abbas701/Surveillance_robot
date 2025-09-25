import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import robotRoutes from './routes/robot.js';
import sensorsRoutes from './routes/sensors.js';
import calibrationRoutes from './routes/calibration.js';

// Import services
import mqttService from './services/mqttService.js';
import { initializeDatabase } from './config/database.js';

dotenv.config();

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS configuration
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        mqtt: mqttService.isMQTTConnected() ? 'connected' : 'disconnected'
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/robot', robotRoutes);
app.use('/api/sensors', sensorsRoutes);
app.use('/api/calibration', calibrationRoutes);

app.use(express.static(path.join(__dirname, "../client/dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});


// Legacy endpoint compatibility (for smooth transition)
app.get('/api/status', (req, res) => {
    res.json({ status: mqttService.getRobotStatus() });
});

app.get('/api/data', async (req, res) => {
    try {
        const { getLatestSensorData } = await import('./controllers/sensorsController.js');
        await getLatestSensorData(req, res);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/command', async (req, res) => {
    try {
        const { sendCommand } = await import('./controllers/robotController.js');
        await sendCommand(req, res);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/calibrate', async (req, res) => {
    try {
        const { sendCalibrationCommand } = await import('./controllers/robotController.js');
        await sendCalibrationCommand(req, res);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/calibration', async (req, res) => {
    try {
        const { getLatestCalibrationFeedback } = await import('./controllers/calibrationController.js');
        await getLatestCalibrationFeedback(req, res);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    res.status(500).json({ error: 'Internal server error' });
});

export default app; 