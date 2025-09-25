import mqtt from 'mqtt';
import dotenv from 'dotenv';
import pool from '../config/database.js';

dotenv.config();

class MQTTService {
    constructor() {
        this.client = null;
        this.robotStatus = 'offline';
        this.isConnected = false;
    }

    connect() {
        const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://127.0.0.1:1883';

        this.client = mqtt.connect(brokerUrl);

        this.client.on('connect', () => {
            console.log('MQTT client connected');
            this.isConnected = true;
            this.subscribeToTopics();
        });

        this.client.on('message', (topic, message) => {
            this.handleMessage(topic, message);
        });

        this.client.on('error', (error) => {
            console.error('MQTT connection error:', error);
            this.isConnected = false;
        });

        this.client.on('close', () => {
            console.log('MQTT connection closed');
            this.isConnected = false;
        });
    }

    subscribeToTopics() {
        const topics = [
            'robot/status',
            'robot/sensor_data',
            'robot/calibration/feedback'
        ];

        topics.forEach(topic => {
            this.client.subscribe(topic, (err) => {
                if (err) {
                    console.error(`Failed to subscribe to ${topic}:`, err);
                } else {
                    console.log(`Subscribed to ${topic}`);
                }
            });
        });
    }

    async handleMessage(topic, message) {
        try {
            switch (topic) {
                case 'robot/status':
                    this.robotStatus = message.toString();
                    console.log(`Robot status updated: ${this.robotStatus}`);
                    break;

                case 'robot/sensor_data':
                    await this.processSensorData(message);
                    break;

                case 'robot/calibration/feedback':
                    await this.processCalibrationFeedback(message);
                    break;

                default:
                    console.log(`Received message on topic ${topic}:`, message.toString());
            }
        } catch (error) {
            console.error(`Error processing message from ${topic}:`, error);
        }
    }

    async processSensorData(message) {
        try {
            const data = JSON.parse(message.toString());
            const {
                accel_x, accel_y, accel_z,
                gyro_x, gyro_y, gyro_z,
                roll_angle, pitch_angle,
                pressure, temperature, altitude,
                MQ_2_value, MQ_135_value,
                battery_current, battery_voltage
            } = data;

            await pool.query(`
                INSERT INTO sensor_data (
                    accel_x, accel_y, accel_z, 
                    gyro_x, gyro_y, gyro_z, 
                    roll_angle, pitch_angle, 
                    pressure, temperature, altitude, 
                    MQ_2_voltage, MQ_135_value, 
                    battery_current, battery_voltage
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            `, [
                accel_x, accel_y, accel_z,
                gyro_x, gyro_y, gyro_z,
                roll_angle, pitch_angle,
                pressure, temperature, altitude,
                MQ_2_value, MQ_135_value,
                battery_current, battery_voltage
            ]);

            console.log('Sensor data inserted:', data);
        } catch (error) {
            console.error('Error processing sensor data:', error);
        }
    }

    async processCalibrationFeedback(message) {
        try {
            const feedback = JSON.parse(message.toString());
            const { status, quantity, value, error } = feedback;

            await pool.query(`
                INSERT INTO calibration_feedback (status, quantity, value, error) 
                VALUES ($1, $2, $3, $4)
            `, [status, quantity, value || null, error || null]);

            console.log('Calibration feedback stored:', feedback);
        } catch (error) {
            console.error('Error processing calibration feedback:', error);
        }
    }

    publishCommand(topic, commandData) {
        if (!this.isConnected) {
            throw new Error('MQTT client not connected');
        }

        const payload = JSON.stringify(commandData);
        this.client.publish(topic, payload, (err) => {
            if (err) {
                console.error('Failed to publish command:', err);
                throw err;
            }
            console.log(`Published command to ${topic}:`, payload);
        });
    }

    getRobotStatus() {
        return this.robotStatus;
    }

    isMQTTConnected() {
        return this.isConnected;
    }

    disconnect() {
        if (this.client) {
            this.client.end();
        }
    }
}

export default new MQTTService(); 