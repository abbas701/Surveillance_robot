import express from 'express';
import { getMqttClient, getMqttTopics } from '../mqtt/mqttClient.js';

const router = express.Router();

router.post('/command', (req, res) => {
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