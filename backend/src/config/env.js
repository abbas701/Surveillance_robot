import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
const envPath = join(__dirname, '../../../.env');
console.log('🔍 Loading environment variables from:', envPath);
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('✅ Loaded environment variables from:', envPath);
} else {
    console.warn('⚠️  .env file not found at:', envPath);
    dotenv.config(); // Fallback to default .env location
}

export const config = {
    // Server
    backendPort: process.env.BACKEND_PORT || 3000,
    appIp: process.env.APP_IP || 'localhost',
    reactAppPort: process.env.REACT_APP_PORT || 5173,

    // Database
    dbUser: process.env.DB_USER,
    dbHost: process.env.DB_HOST || 'localhost',
    dbName: process.env.DB_NAME,
    dbPassword: process.env.DB_PASSWORD,
    dbPort: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,

    // Redis
    redisHost: process.env.REDIS_HOST || '127.0.0.1',
    redisPort: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
    redisMaxEntries: parseInt(process.env.VITE_REDIS_MAX_ENTRIES) || 100,
    redisExpiryInterval: parseInt(process.env.VITE_REDIS_EXPIRY_INTERVAL) || 3600,

    // MQTT
    mqttBroker: process.env.MQTT_BROKER || 'mqtt://127.0.0.1:1883',

    // Batch processing
    batchSize: parseInt(process.env.BATCH_SIZE) || 10,
    batchTimeout: parseInt(process.env.BATCH_TIMEOUT) || 30000,
    dbColumns: parseInt(process.env.DB_COLUMNS) || 20,

    // Service paths
    redisPath: process.env.REDIS_PATH,
    mosquittoPath: process.env.MOSQUITTO_PATH,
    mosquittoConfig: process.env.MOSQUITTO_CONFIG,

    // Service timeouts
    redisTestTimeout: parseInt(process.env.REDIS_TEST_TIMEOUT) || 2000,
    redisConnectionRetries: parseInt(process.env.REDIS_CONNECTION_REATTEMPTS) || 5
};

// Log loaded configuration (without passwords)
console.log('🔧 Loaded configuration:');
console.log('   Server:', `${config.appIp}:${config.backendPort}`);
console.log('   Database:', config.dbUser ? `${config.dbUser}@${config.dbHost}:${config.dbPort}/${config.dbName}` : 'Not configured');
console.log('   Redis:', config.redisPath ? 'Configured' : 'Not configured');
console.log('   MQTT:', config.mqttBroker);