import pool from '../config/database.js';
import mqttService from '../services/mqttService.js';

export const getLatestSensorData = async (req, res) => {
    try {
        const robotStatus = mqttService.getRobotStatus();

        if (robotStatus !== 'online') {
            return res.status(503).json({
                error: 'Robot is offline',
                status: robotStatus
            });
        }

        const result = await pool.query(`
            SELECT * FROM sensor_data 
            ORDER BY timestamp DESC 
            LIMIT 1
        `);

        if (result.rows.length === 0) {
            return res.json({
                success: true,
                data: null,
                message: 'No sensor data available'
            });
        }

        const sensorData = result.rows[0];

        res.json({
            success: true,
            data: {
                id: sensorData.id,
                accelerometer: {
                    x: sensorData.accel_x,
                    y: sensorData.accel_y,
                    z: sensorData.accel_z
                },
                gyroscope: {
                    x: sensorData.gyro_x,
                    y: sensorData.gyro_y,
                    z: sensorData.gyro_z
                },
                orientation: {
                    roll: sensorData.roll_angle,
                    pitch: sensorData.pitch_angle
                },
                environment: {
                    pressure: sensorData.pressure,
                    temperature: sensorData.temperature,
                    altitude: sensorData.altitude
                },
                gasSensors: {
                    mq2: sensorData.MQ_2_voltage,
                    mq135: sensorData.MQ_135_value
                },
                battery: {
                    current: sensorData.battery_current,
                    voltage: sensorData.battery_voltage
                },
                timestamp: sensorData.timestamp
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Get sensor data error:', error);
        res.status(500).json({ error: 'Database error' });
    }
};

export const getSensorDataHistory = async (req, res) => {
    try {
        const { limit = 100, sensor = 'all' } = req.query;
        const maxLimit = Math.min(parseInt(limit), 1000); // Cap at 1000 records

        let query = 'SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT $1';
        let params = [maxLimit];

        // If specific sensor requested, filter accordingly
        if (sensor !== 'all') {
            const validSensors = ['accelerometer', 'gyroscope', 'orientation', 'environment', 'gasSensors', 'battery'];
            if (!validSensors.includes(sensor)) {
                return res.status(400).json({
                    error: `Invalid sensor type. Must be one of: ${validSensors.join(', ')}`
                });
            }

            // Adjust query based on sensor type
            switch (sensor) {
                case 'accelerometer':
                    query = 'SELECT id, accel_x, accel_y, accel_z, timestamp FROM sensor_data ORDER BY timestamp DESC LIMIT $1';
                    break;
                case 'gyroscope':
                    query = 'SELECT id, gyro_x, gyro_y, gyro_z, timestamp FROM sensor_data ORDER BY timestamp DESC LIMIT $1';
                    break;
                case 'orientation':
                    query = 'SELECT id, roll_angle, pitch_angle, timestamp FROM sensor_data ORDER BY timestamp DESC LIMIT $1';
                    break;
                case 'environment':
                    query = 'SELECT id, pressure, temperature, altitude, timestamp FROM sensor_data ORDER BY timestamp DESC LIMIT $1';
                    break;
                case 'gasSensors':
                    query = 'SELECT id, MQ_2_voltage, MQ_135_value, timestamp FROM sensor_data ORDER BY timestamp DESC LIMIT $1';
                    break;
                case 'battery':
                    query = 'SELECT id, battery_current, battery_voltage, timestamp FROM sensor_data ORDER BY timestamp DESC LIMIT $1';
                    break;
            }
        }

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length,
            limit: maxLimit,
            sensor,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Get sensor data history error:', error);
        res.status(500).json({ error: 'Database error' });
    }
}; 