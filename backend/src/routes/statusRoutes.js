import express from 'express';
import { getRobotStatus } from '../mqtt/mqttClient.js';

const router = express.Router();

// Endpoint to check robot status
router.get('/', (req, res) => {
    res.json({ status: getRobotStatus() });
});

export default router;