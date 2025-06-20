import express from 'express';
import session from 'express-session';
import cors from 'cors';
import mqtt from 'mqtt';
import https from 'https';
import fs, { stat } from 'fs';
import { Pool } from "pg";

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
    temperature FLOAT,
    pressure FLOAT,
    altitude FLOAT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
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
const statusTopic = "robot/status";
const sensorTopic = "robot/sensor_data";
const locomotionTopic = "robot/locomotion";
const calibrationTopic = "robot/calibration";
const calibrationFeedbackTopic = "robot/calibration/feedback";

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

const mqttClient = mqtt.connect('mqtt://localhost:1883');
mqttClient.on('connect', () => {
    console.log('MQTT client connected');
    mqttClient.subscribe(sensorTopic, (err) => {
        if (err) console.error('Failed to subscribe to sensor_data:', err);
    });
    mqttClient.subscribe(calibrationFeedbackTopic, (err) => {
        if (err) console.error('Failed to subscribe to sensor_data:', err);
    });
});

mqttClient.on('message', async (topic, message) => {
    if (topic === sensorTopic) {
        try {
            const data = JSON.parse(message.toString());
            const { temperature, pressure, altitude } = data;
            await pool.query(
                'INSERT INTO sensor_data (temperature, pressure, altitude) VALUES ($1, $2, $3)',
                [temperature, pressure, altitude]
            );
            console.log('Data inserted:', data);
        } catch (err) {
            console.error('Error parsing MQTT message:', message.toString(), err.message);
        }
    } else if (topic === statusTopic) {
        robotStatus = message.toString();
        console.log(`Robot status updated: ${robotStatus}`);
    } else if (topic = calibrationFeedbackTopic) {
        try {
            const feedback = JSON.parse(message.toString());
            const { status, quantity, value, error } = feedback;
            await pool.query(
                'INSERT INTO calibration_feedback (status, quantity, value, error) VALUES ($1, $2, $3, $4)',
                [status, quantity, value || null, error || null]
            );
            // latestCalibrationFeedback = feedback;
            console.log('Calibration feedback stored:', feedback);
        } catch (err) {
            console.error('Error parsing calibration feedback:', message.toString(), err.message);
        }
    }
});

app.get('/api/data', async (req, res) => {
    if (robotStatus !== 'online') {
        return res.status(503).json({ error: 'Robot is offline' });
    }
    try {
        const result = await pool.query('SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT 1');
        res.json(result.rows[0] || {});
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/command', (req, res) => {
    const { action, speed, angle, mode } = req.body;
    if (!action) {
        return res.status(400).json({ error: 'Missing action' });
    }
    const payload = JSON.stringify({ action, speed, angle, mode });
    mqttClient.publish(locomotionTopic, payload, (err) => {
        if (err) {
            console.error('Publish error:', err);
            return res.status(500).json({ error: 'Failed to send command' });
        }
        console.log('Published command:', payload);
        res.json({ message: 'Command sent' });
    });
});

app.post('/api/calibrate', (req, res) => {
    const { quantity } = req.body;
    if (!quantity === undefined) {
        return res.status(400).json({ error: 'Missing quantity' });
    }
    const payload = JSON.stringify({ quantity });
    mqttClient.publish(calibrationTopic, payload, (err) => {
        if (err) {
            console.error('Publish error:', err);
            return res.status(500).json({ error: 'Failed to send calibration command' });
        }
        console.log('Published calibration command:', payload);
        res.json({ message: 'Calibration command sent' });
    });
});

app.get('/api/calibration', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM calibration_feedback ORDER BY timestamp DESC LIMIT 1');
        res.json(result.rows[0] || latestCalibrationFeedback || {});
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

app.listen(3000, () => console.log('Server running on port 3000'));