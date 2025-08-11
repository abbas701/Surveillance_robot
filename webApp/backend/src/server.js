import app from './app.js';
import { initializeDatabase } from './config/database.js';
import mqttService from './services/mqttService.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        console.log('🚀 Starting Surveillance Robot Backend...');

        // Initialize database
        console.log('📊 Initializing database...');
        await initializeDatabase();
        console.log('✅ Database initialized successfully');

        // Connect MQTT service
        console.log('📡 Connecting to MQTT broker...');
        mqttService.connect();
        console.log('✅ MQTT service initialized');

        // Start Express server
        app.listen(PORT, () => {
            console.log(`🌐 Server running on port ${PORT}`);
            console.log(`🔗 Health check: http://localhost:${PORT}/health`);
            console.log(`📱 Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
            console.log(`🔐 JWT expires in: ${process.env.JWT_EXPIRES_IN || '15m'}`);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    mqttService.disconnect();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down gracefully...');
    mqttService.disconnect();
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

startServer(); 