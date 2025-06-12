import express from 'express';
import session from 'express-session';
import cors from 'cors';
import mqtt from 'mqtt';
import https from 'https';
import fs from 'fs';
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

const USERS = [{ username: 'admin', password: '1234' }];

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

const mqttClient = mqtt.connect('mqtt://localhost:1883');
mqttClient.on('connect', () => {
    console.log('MQTT client connected');
    mqttClient.subscribe('robot/sensors', (err) => {
        if (err) console.error('Failed to subscribe to sensor_data:', err);
    });
});

mqttClient.on('message', async (topic, message) => {
    if (topic === 'robot/sensors') {
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
    }
});

app.get('/api/data', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT 1');
        res.json(result.rows[0] || {});
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/command', (req, res) => {
    const { action, value, speed, mode } = req.body;
    if (!action || !value) {
        return res.status(400).json({ error: 'Missing action or value' });
    }
    const payload = JSON.stringify({ action, value, speed, mode });
    mqttClient.publish('robot/commands', payload, (err) => {
        if (err) {
            console.error('Publish error:', err);
            return res.status(500).json({ error: 'Failed to send command' });
        }
        console.log('Published command:', payload);
        res.json({ message: 'Command sent' });
    });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

app.listen(3000, () => console.log('Server running on port 3000'));