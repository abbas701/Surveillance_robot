import mqtt from 'mqtt';
import { config } from '../config/env.js';
import { cacheSensorData, cacheNetworkData, postgresBatchWrite } from '../services/index.js';
import { pool } from '../config/db.js';

const mqttTopics = {
    sensor: 'robot/sensor_data',
    locomotion: 'robot/locomotion',
    calibration: 'robot/calibration',
    calibrationFeedback: 'robot/calibration/feedback',
    status: 'robot/status',
    network: 'robot/network'
};

let mqttClient = null;
let robotStatus = 'offline';

export function initializeMqtt() {
    mqttClient = mqtt.connect(config.mqttBroker);

    mqttClient.on('connect', () => {
        console.log('MQTT client connected');

        // Subscribe to ALL topics
        Object.values(mqttTopics).forEach(topic => {
            mqttClient.subscribe(topic, (err) => {
                if (err) {
                    console.error(`Failed to subscribe to ${topic}:`, err);
                } else {
                    console.log('Subscribed to:', topic);
                }
            });
        });
    });

    mqttClient.on('error', (err) => {
        console.error('MQTT connection error:', err);
    });

    mqttClient.on('message', async (topic, message) => {
        console.log(`Received MQTT message on topic: ${topic}`);

        try {
            if (topic === mqttTopics.sensor) {
                const data = JSON.parse(message.toString());
                // 1. Store in Redis for real-time dashboard
                await cacheSensorData(data);
                // 2. Batch write to PostgreSQL
                await postgresBatchWrite(data);
                console.log('Stored sensor data in Redis:', data);

            } else if (topic === mqttTopics.status) {
                robotStatus = message.toString();
                console.log(`Robot status updated: ${robotStatus}`);

            } else if (topic === mqttTopics.calibrationFeedback) {
                const feedback = JSON.parse(message.toString());
                console.log('Calibration feedback:', feedback);

                const { status, quantity, value, error } = feedback;
                await pool.query(
                    'INSERT INTO calibration_feedback (status, quantity, value, error) VALUES ($1, $2, $3, $4)',
                    [status, quantity, value || null, error || null]
                );
                console.log('Calibration feedback stored in database');
            
            } else if (topic === mqttTopics.network) {
                const data = JSON.parse(message.toString());
                // Store in Redis for real-time dashboard
                await cacheNetworkData(data);
                console.log('Stored network data in Redis:', data);
            
            } else {
                console.log(`Unknown topic: ${topic}`);
            }
        } catch (err) {
            console.error('Error processing MQTT message:', err.message);
            console.error('Raw message:', message.toString());
        }
    });

    return mqttClient;
}

export function getMqttClient() {
    return mqttClient;
}

export function getMqttTopics() {
    return mqttTopics;
}

export function getRobotStatus() {
    return robotStatus;
}

export function setRobotStatus(status) {
    robotStatus = status;
}