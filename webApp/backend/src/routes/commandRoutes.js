import express from 'express';
import { getMqttClient, getMqttTopics } from '../mqtt/mqttClient.js';

const router = express.Router();

router.post('/', (req, res) => {
    const { action, speed, angle, mode, value, x, y } = req.body;
    if (!action) {
        return res.status(400).json({ error: 'Missing action' });
    }
    
    const mqttClient = getMqttClient();
    const topics = getMqttTopics();

    // Handle camera control commands
    if (action === 'camera_move' || action === 'camera_center') {
        const cameraPayload = JSON.stringify({
            action: action === 'camera_center' ? 'center' : 'move',
            x: x || 0,
            y: y || 0
        });

        mqttClient.publish(topics.camera_control, cameraPayload, (err) => {
            if (err) {
                console.error('Camera control publish error:', err);
                return res.status(500).json({ error: 'Failed to send camera command' });
            }
            console.log('Published camera command:', cameraPayload);
            res.json({ message: 'Camera command sent' });
        });
        return;
    }

    // Handle locomotion commands
    const payload = JSON.stringify({
        action,
        speed: speed || 0,
        angle: angle || 0,
        mode: mode || "manual-precise",
        value: value
    });

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