import redis from 'redis';
const redisClient = redis.createClient();
// Handle Redis connection errors
redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
    console.log('Connected to Redis');
});
// Store last 100 sensor readings for dashboard
async function cacheSensorData(data) {
    try {
        const key = `sensor:latest`;
        await redisClient.lpush(key, JSON.stringify(data));
        await redisClient.ltrim(key, 0, 99); // Keep only latest 100
        await redisClient.expire(key, 3600); // Expire after 1 hour
        console.log('Cached sensor data in Redis');
    } catch (error) {
        console.error('Redis cache error:', error);
    }
}
export default cacheSensorData;