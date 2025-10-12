import express from 'express';
import session from 'express-session';
import cors from 'cors';
import mqtt from 'mqtt';
import https from 'https';
import fs, { stat } from 'fs';
import { Pool } from "pg";
import { time } from 'console';
import cacheSensorData from './redis.js';
import postgresBatchWrite from './postgresBatchWrite.js';

const app = express();
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'iot_surveillance',
    password: 'admin1234',
    port: 5432,
});
app.use(express.json());
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

app.use(session({
    secret: 'your-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

pool.query(`
  CREATE TABLE IF NOT EXISTS sensor_data (
    id SERIAL PRIMARY KEY,

    -- IMU Accelerometer data (4 decimal places)
    accel_x DECIMAL(8,4),
    accel_y DECIMAL(8,4),
    accel_z DECIMAL(8,4),
    
    -- IMU Gyroscope data (4 decimal places)  
    gyro_x DECIMAL(8,4),
    gyro_y DECIMAL(8,4),
    gyro_z DECIMAL(8,4),
    
    -- Tilt angles (4 decimal places)
    roll_angle DECIMAL(8,4),
    pitch_angle DECIMAL(8,4),
    
    -- Environmental data
    pressure DECIMAL(8,2),      -- hPa, 2 decimal places
    temperature DECIMAL(5,2),   -- °C, 2 decimal places  
    altitude DECIMAL(8,2),      -- meters, 2 decimal places
    
    -- Gas sensors
    mq_2 DECIMAL(6,4),  -- 4 decimal places for precision
    mq_135 DECIMAL(6,4),
    
    -- Battery data
    battery_current DECIMAL(6,4),
    battery_voltage DECIMAL(6,4),
    
    -- Wheel encoders
    left_rpm DECIMAL(8,4),
    left_ticks INTEGER,
    right_rpm DECIMAL(8,4), 
    right_ticks INTEGER,
    
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);



pool.query(`
  CREATE TABLE IF NOT EXISTS calibration_feedback (
    id SERIAL PRIMARY KEY,
    status VARCHAR(20),
    quantity VARCHAR(50),
    value FLOAT,
    error VARCHAR(100),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

const USERS = [{ username: 'admin', password: '1234' }];

// MQTT topics
const mqttClient = mqtt.connect('mqtt://127.0.0.1:1883');
const mqttTopics = {
    sensor: 'robot/sensor_data',
    locomotion: 'robot/locomotion',
    calibration: 'robot/calibration',
    calibrationFeedback: 'robot/calibration/feedback',
    status: 'robot/status'
};

// Track robot status
let robotStatus = 'offline'; // Default status

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = USERS.find(u => u.username === username && u.password === password);
    if (user) {
        req.session.user = user.username;
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/session', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

// New endpoint to check robot status
app.get('/api/status', (req, res) => {
    res.json({ status: robotStatus });
});

mqttClient.on('connect', () => {
    console.log('MQTT client connected');

    // Subscribe to ALL topics
    mqttClient.subscribe(mqttTopics.sensor, (err) => {
        if (err) console.error('Failed to subscribe to sensor_data:', err);
        else console.log('Subscribed to:', mqttTopics.sensor);
    });

    mqttClient.subscribe(mqttTopics.calibrationFeedback, (err) => {
        if (err) console.error('Failed to subscribe to calibration_feedback:', err);
        else console.log('Subscribed to:', mqttTopics.calibrationFeedback);
    });

    mqttClient.subscribe(mqttTopics.status, (err) => {
        if (err) console.error('Failed to subscribe to status:', err);
        else console.log('Subscribed to:', mqttTopics.status);
    });
});

// Add error handling for MQTT connection
mqttClient.on('error', (err) => {
    console.error('MQTT connection error:', err);
});

mqttClient.on('message', async (topic, message) => {
    console.log(`Received MQTT message on topic: ${topic}`);
    // console.log(`Message: ${message.toString()}`);

    try {
        if (topic === mqttTopics.sensor) {
            const data = JSON.parse(message.toString());
            // 1. Store in Redis for real-time dashboard
            await cacheSensorData(data);

            // 2. Batch write to PostgreSQL (every 30 seconds or 10 records)
            await postgresBatchWrite(data);
            console.log('Stored sensor data in Redis:', data);

        } else if (topic === mqttTopics.status) {
            robotStatus = message.toString();
            console.log(`Robot status updated: ${robotStatus}`);

        } else if (topic === mqttTopics.calibrationFeedback) {  // FIXED: === instead of =
            const feedback = JSON.parse(message.toString());
            console.log('Calibration feedback:', feedback);

            const { status, quantity, value, error } = feedback;
            await pool.query(
                'INSERT INTO calibration_feedback (status, quantity, value, error) VALUES ($1, $2, $3, $4)',
                [status, quantity, value || null, error || null]
            );
            console.log('Calibration feedback stored in database');
        } else {
            console.log(`Unknown topic: ${topic}`);
        }
    } catch (err) {
        console.error('Error processing MQTT message:', err.message);
        console.error('Raw message:', message.toString());
    }
});

// Update your API endpoints to use the topics object
app.post('/api/command', (req, res) => {
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

    mqttClient.publish(mqttTopics.locomotion, payload, (err) => {
        if (err) {
            console.error('Publish error:', err);
            return res.status(500).json({ error: 'Failed to send command' });
        }
        console.log('Published command to locomotion:', payload);
        res.json({ message: 'Command sent' });
    });
});

app.post('/api/calibrate', (req, res) => {
    const { quantity } = req.body;
    if (quantity === undefined) {  // FIXED: proper undefined check
        return res.status(400).json({ error: 'Missing quantity' });
    }
    const payload = JSON.stringify({ quantity });

    mqttClient.publish(mqttTopics.calibration, payload, (err) => {
        if (err) {
            console.error('Publish error:', err);
            return res.status(500).json({ error: 'Failed to send calibration command' });
        }
        console.log('Published calibration command:', payload);
        res.json({ message: 'Calibration command sent' });
    });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

app.listen(3000, () => console.log('Server running on port 3000'));