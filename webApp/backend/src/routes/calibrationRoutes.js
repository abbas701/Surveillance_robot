import express from 'express';
import { getMqttClient, getMqttTopics } from '../mqtt/mqttClient.js';

const router = express.Router();

router.post('/calibrate', (req, res) => {
    const { quantity } = req.body;
    if (quantity === undefined) { 
        return res.status(400).json({ error: 'Missing quantity' });
    }
    
    const payload = JSON.stringify({ quantity });
    const mqttClient = getMqttClient();
    const topics = getMqttTopics();

    mqttClient.publish(topics.calibration, payload, (err) => {
        if (err) {
            console.error('Publish error:', err);
            return res.status(500).json({ error: 'Failed to send calibration command' });
        }
        console.log('Published calibration command:', payload);
        res.json({ message: 'Calibration command sent' });
    });
});

export default router;