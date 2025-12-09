import { pool, testDatabaseConnection } from '../config/db.js';

export async function setupDatabaseTables() {
    try {
        // Test connection first
        await testDatabaseConnection();

        // Create sensor_data table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sensor_data (
                id SERIAL PRIMARY KEY,
                accel_x DECIMAL(8,4),
                accel_y DECIMAL(8,4),
                accel_z DECIMAL(8,4),
                gyro_x DECIMAL(8,4),
                gyro_y DECIMAL(8,4),
                gyro_z DECIMAL(8,4),
                roll_angle DECIMAL(8,4),
                pitch_angle DECIMAL(8,4),
                pressure DECIMAL(8,2),
                temperature DECIMAL(5,2),
                altitude DECIMAL(8,2),
                mq_2 DECIMAL(6,4),
                mq_135 DECIMAL(6,4),
                battery_current DECIMAL(6,4),
                battery_voltage DECIMAL(6,4),
                left_rpm DECIMAL(8,4),
                left_ticks INTEGER,
                right_rpm DECIMAL(8,4), 
                right_ticks INTEGER,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
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
            );
        `);

        console.log('✅ Database tables setup completed');

        // Verify tables were created
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            AND table_name IN ('sensor_data', 'calibration_feedback');
        `);

        console.log(`📊 Created/Verified tables: ${tables.rows.map(row => row.table_name).join(', ')}`);

    } catch (error) {
        console.error('❌ Error setting up database tables:', error.message);
        
        // Don't crash the application if tables exist but connection is fine
        if (error.message.includes('already exists')) {
            console.log('⚠️  Tables already exist, continuing...');
            return;
        }
        
        throw error;
    }
}