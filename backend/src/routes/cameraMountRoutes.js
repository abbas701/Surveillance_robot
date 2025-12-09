import express from 'express';
import { getMqttClient, getMqttTopics } from '../mqtt/mqttClient.js';

const router = express.Router();

router.post('/', (req, res) => {
    const { action, angle, magnitude, pan, tilt } = req.body;
    
    if (!action) {
        return res.status(400).json({ error: 'Missing action' });
    }
    
    const payload = JSON.stringify({
        action,
        angle: angle || 0,
        magnitude: magnitude || 0,
        pan: pan,
        tilt: tilt
    });

    const mqttClient = getMqttClient();
    const topics = getMqttTopics();

    mqttClient.publish(topics.cameraMount, payload, (err) => {
        if (err) {
            console.error('Camera mount publish error:', err);
            return res.status(500).json({ error: 'Failed to send camera mount command' });
        }
        console.log('Published command to camera mount:', payload);
        res.json({ message: 'Camera mount command sent', data: JSON.parse(payload) });
    });
});

export default router;
