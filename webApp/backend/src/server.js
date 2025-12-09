import express from 'express';
import cors from 'cors';
import { setupMiddleware } from './middleware/session.js';
import { setupRoutes } from './routes/index.js';
import { initializeMqtt } from './mqtt/mqttClient.js';
import { setupDatabaseTables } from './utils/setupTables.js';
import { config } from './config/env.js';
import { setupGracefulShutdown } from './services/processManager.js';

const app = express();

// Setup middleware
app.use(express.json());
app.use(cors({ 
    origin: `http://${config.appIp}:${config.reactAppPort}`, 
    credentials: true 
}));
setupMiddleware(app);

// Setup database tables
await setupDatabaseTables();

// Setup routes
setupRoutes(app);

// Initialize MQTT client
initializeMqtt();

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

const server = app.listen(config.backendPort,'0.0.0.0', () => {
    console.log(`Server running on port ${config.backendPort}`);
});

// Ensure graceful shutdown is setup
setupGracefulShutdown();

export default app;