import redis from 'redis';
import { config } from './env.js';

export const redisClient = redis.createClient({
    socket: {
        host: config.redisHost || '127.0.0.1',
        port: config.redisPort || 6379,
        connectTimeout: 10000,
        lazyConnect: true, // Don't connect immediately
        reconnectStrategy: (retries) => {
            if (retries > 10) {
                console.log('Too many retries on Redis. Giving up.');
                return new Error('Too many retries');
            }
            return Math.min(retries * 100, 3000);
        }
    }
});

// Handle Redis connection events
redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err.message);
});

redisClient.on('connect', () => {
    console.log('✅ Connected to Redis successfully');
});

redisClient.on('disconnect', () => {
    console.log('🔌 Redis disconnected');
});

redisClient.on('reconnecting', () => {
    console.log('🔄 Redis reconnecting...');
});

// Don't connect immediately - let processManager handle the connection
// await redisClient.connect();

export default redisClient;