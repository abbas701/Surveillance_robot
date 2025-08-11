import mqttService from '../services/mqttService.js';

export const getRobotStatus = async (req, res) => {
    try {
        const status = mqttService.getRobotStatus();
        const mqttConnected = mqttService.isMQTTConnected();

        res.json({
            success: true,
            status,
            mqttConnected,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Get robot status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const sendCommand = async (req, res) => {
    try {
        const commandData = req.body;

        if (!commandData.action) {
            return res.status(400).json({ error: 'Missing action' });
        }

        // Validate command data structure
        const requiredFields = ['action'];
        const missingFields = requiredFields.filter(field => !commandData[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                error: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        // Send command via MQTT
        mqttService.publishCommand('robot/locomotion', commandData);

        res.json({
            success: true,
            message: 'Command sent successfully',
            command: commandData,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Send command error:', error);

        if (error.message === 'MQTT client not connected') {
            return res.status(503).json({ error: 'Robot communication unavailable' });
        }

        res.status(500).json({ error: 'Internal server error' });
    }
};

export const sendCalibrationCommand = async (req, res) => {
    try {
        const { quantity } = req.body;

        if (!quantity) {
            return res.status(400).json({ error: 'Missing quantity parameter' });
        }

        // Validate quantity parameter
        const validQuantities = ['accelerometer', 'gyroscope', 'pressure', 'temperature', 'altitude'];
        if (!validQuantities.includes(quantity)) {
            return res.status(400).json({
                error: `Invalid quantity. Must be one of: ${validQuantities.join(', ')}`
            });
        }

        // Send calibration command via MQTT
        mqttService.publishCommand('robot/calibration', { quantity });

        res.json({
            success: true,
            message: 'Calibration command sent successfully',
            quantity,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Send calibration command error:', error);

        if (error.message === 'MQTT client not connected') {
            return res.status(503).json({ error: 'Robot communication unavailable' });
        }

        res.status(500).json({ error: 'Internal server error' });
    }
}; 