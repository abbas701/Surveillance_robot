import express from 'express';
import { getMqttClient, getMqttTopics } from '../mqtt/mqttClient.js';

const router = express.Router();

router.post('/', (req, res) => {
    const { action, speed, angle, mode, value } = req.body;
    if (!action) {
        return res.status(400).json({ error: 'Missing action' });
    }
    
    const payload = JSON.stringify({
        action,
        speed: speed || 0,
        angle: angle || 0,
        mode: mode || "manual-precise",
        value: value
    });

    const mqttClient = getMqttClient();
    const topics = getMqttTopics();

    mqttClient.publish(topics.locomotion, payload, (err) => {
        if (err) {
            console.error('Publish error:', err);
            return res.status(500).json({ error: 'Failed to send command' });
        }
        console.log('Published command to locomotion:', payload);
        res.json({ message: 'Command sent' });
    });
});

export default router;