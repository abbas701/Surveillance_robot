import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'iot_surveillance',
    password: process.env.DB_PASSWORD || 'admin1234',
    port: process.env.DB_PORT || 5432,
});

// Initialize database tables
export const initializeDatabase = async () => {
    try {
        // Create sensor_data table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sensor_data (
                id SERIAL PRIMARY KEY,
                accel_x FLOAT,
                accel_y FLOAT,
                accel_z FLOAT,
                gyro_x FLOAT,
                gyro_y FLOAT,
                gyro_z FLOAT,
                roll_angle FLOAT,
                pitch_angle FLOAT,
                pressure FLOAT,
                temperature FLOAT,
                altitude FLOAT,
                MQ_2_voltage FLOAT,
                MQ_135_value FLOAT,
                battery_current FLOAT,
                battery_voltage FLOAT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create calibration_feedback table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS calibration_feedback (
                id SERIAL PRIMARY KEY,
                status VARCHAR(20),
                quantity VARCHAR(50),
                value FLOAT,
                error VARCHAR(100),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                designation VARCHAR(20) NOT NULL DEFAULT 'guest',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Check if admin user exists, if not create default admin
        const adminCheck = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);
        if (adminCheck.rows.length === 0) {
            const bcrypt = await import('bcryptjs');
            const hashedPassword = await bcrypt.hash('admin1234', 10);
            await pool.query(
                'INSERT INTO users (username, password_hash, designation) VALUES ($1, $2, $3)',
                ['admin', hashedPassword, 'admin']
            );
            console.log('Default admin user created: admin/admin1234');
        }

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
};

export default pool; 