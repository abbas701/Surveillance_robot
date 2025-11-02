import express from 'express';
import { fetchSensorData, fetchLatestSensorData } from '../services/redisService.js';

const router = express.Router();

// API endpoint to get all sensor data for graphs
router.get('/data', async (req, res) => {
    try {
        const sensorData = await fetchSensorData();

        res.json({
            success: true,
            count: sensorData.length,
            data: sensorData,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('API Error fetching sensor data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch sensor data',
            message: error.message
        });
    }
});

// API endpoint to get only the latest sensor data for current vitals
router.get('/data/latest', async (req, res) => {
    try {
        const latestData = await fetchLatestSensorData();

        if (latestData) {
            res.json({
                success: true,
                data: latestData,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'No sensor data available'
            });
        }
    } catch (error) {
        console.error('API Error fetching latest sensor data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch latest sensor data',
            message: error.message
        });
    }
});

export default router;