import redis from 'redis';

const redisClient = redis.createClient();

// Handle Redis connection errors
redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
    console.log('Connected to Redis');
});

// Connect to Redis
await redisClient.connect();

// Store last 100 sensor readings for dashboard
async function cacheSensorData(data) {
    try {
        const key = `sensor:latest`;
        await redisClient.lPush(key, JSON.stringify(data)); // Note: lPush (camelCase) instead of lpush
        await redisClient.lTrim(key, 0, 99); // Keep only latest 100
        await redisClient.expire(key, 3600); // Expire after 1 hour
        console.log('Cached sensor data in Redis');
    } catch (error) {
        console.error('Redis cache error:', error);
    }
}

// Fetch all sensor data from Redis
async function fetchSensorData() {
    try {
        const key = `sensor:latest`;
        // Get all items from the list (0 to -1 means all elements)
        const data = await redisClient.lRange(key, 0, -1);
        
        // Parse JSON strings back to objects and reverse to get chronological order
        const sensorData = data.map(item => JSON.parse(item)).reverse();
        
        console.log(`Fetched ${sensorData.length} sensor records from Redis`);
        return sensorData;
    } catch (error) {
        console.error('Redis fetch error:', error);
        return [];
    }
}

// Fetch only the latest sensor data (most recent)
async function fetchLatestSensorData() {
    try {
        const key = `sensor:latest`;
        // Get only the first (most recent) item
        const latestData = await redisClient.lRange(key, 0, 0);
        
        if (latestData.length > 0) {
            const parsedData = JSON.parse(latestData[0]);
            console.log('Fetched latest sensor data from Redis');
            return parsedData;
        }
        return null;
    } catch (error) {
        console.error('Redis fetch latest error:', error);
        return null;
    }
}

export { cacheSensorData, fetchSensorData, fetchLatestSensorData };