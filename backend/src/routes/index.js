import authRoutes from './authRoutes.js';
import apiRoutes from './apiRoutes.js';
import sensorRoutes from './sensorRoutes.js';
import statusRoutes from './statusRoutes.js';
import commandRoutes from './commandRoutes.js';
import calibrationRoutes from './calibrationRoutes.js';
import cameraMountRoutes from './cameraMountRoutes.js';

export function setupRoutes(app) {
    app.use('/api/auth', authRoutes);  // Session routes under /api/auth
    app.use('/api/command', calibrationRoutes); // Calibration routes
    app.use('/api/command', commandRoutes); // Command routes
    app.use('/api/camera-mount', cameraMountRoutes); // Camera mount routes
    app.use('/api/sensor', sensorRoutes); // Sensor data routes
    app.use('/api/status', statusRoutes); // Status routes
    
    // Health check endpoint
    app.get('/api/health', (req, res) => {
        res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });
}