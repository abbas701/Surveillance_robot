import { pool } from '../config/db.js';
import { config } from '../config/env.js';
import { parseSensorData } from '../utils/dataParser.js';

let postgresBatch = [];
const BATCH_SIZE = config.batchSize;
const BATCH_TIMEOUT = config.batchTimeout;

export async function postgresBatchWrite(data) {
    postgresBatch.push(data);

    if (postgresBatch.length >= BATCH_SIZE) {
        await flushBatchToPostgres();
    }
}

// Batch timeout handler
setInterval(async () => {
    if (postgresBatch.length > 0) {
        await flushBatchToPostgres();
    }
}, BATCH_TIMEOUT);

export async function flushBatchToPostgres() {
    if (postgresBatch.length === 0) return;

    const batch = [...postgresBatch];
    postgresBatch = [];
    
    // Filter out null entries and prepare values
    const validData = [];
    for (const item of batch) {
        const processed = parseSensorData(item);
        if (processed !== null) {
            validData.push(processed);
        }
    }
    
    if (validData.length === 0) return;

    try {
        // Create placeholders for the bulk insert
        const valuePlaceholders = validData.map((_, rowIndex) => {
            const placeholders = Array.from({length: config.dbColumns}, (_, colIndex) => 
                `$${rowIndex * config.dbColumns + colIndex + 1}`
            );
            return `(${placeholders.join(', ')})`;
        }).join(', ');

        const query = `
            INSERT INTO sensor_data (
                accel_x, accel_y, accel_z,
                gyro_x, gyro_y, gyro_z,
                roll_angle, pitch_angle,
                pressure, temperature, altitude,
                mq_2, mq_135,
                battery_current, battery_voltage,
                left_rpm, left_ticks, right_rpm, right_ticks,
                timestamp
            ) VALUES ${valuePlaceholders}
        `;

        await pool.query(query, validData.flat());
        console.log(`Inserted ${validData.length} records into PostgreSQL`);
    } catch (error) {
        console.error('PostgreSQL batch insert error:', error);
        // Optional: put failed batch back for retry
        // postgresBatch.push(...batch);
    }
}

export default {
    postgresBatchWrite,
    flushBatchToPostgres
};