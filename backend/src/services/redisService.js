import { redisClient } from '../config/redis.js';
import { config } from '../config/env.js';

// Store last 100 sensor readings for dashboard
export async function cacheSensorData(data) {
    try {
        const key = `sensor:latest`;
        await redisClient.lPush(key, JSON.stringify(data));
        await redisClient.lTrim(key, 0, config.redisMaxEntries - 1);
        await redisClient.expire(key, config.redisExpiryInterval); 
        console.log('Cached sensor data in Redis');
    } catch (error) {
        console.error('Redis cache error:', error);
    }
}

// Fetch all sensor data from Redis
export async function fetchSensorData() {
    try {
        const key = `sensor:latest`;
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
export async function fetchLatestSensorData() {
    try {
        const key = `sensor:latest`;
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

export default {
    cacheSensorData,
    fetchSensorData,
    fetchLatestSensorData
};