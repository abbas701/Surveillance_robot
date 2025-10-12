import { Pool } from "pg";

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'iot_surveillance',
    password: 'admin1234',
    port: 5432,
});

let postgresBatch = [];
const BATCH_SIZE = 10;
const BATCH_TIMEOUT = 30000; // 30 seconds
const DB_COLUMNS = 20; // Number of columns in sensor_data table

async function postgresBatchWrite(data) {
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

function parseSensorValue(value) {
    if (value === "Sensor Not Found" || value === null || value === undefined) {
        return null;
    }
    // Convert to number if it's a string that can be parsed
    if (typeof value === 'string' && !isNaN(parseFloat(value))) {
        return parseFloat(value);
    }
    return value;
}

async function batchArray(data) {
    try {
        // Extract environmental data from the nested structure
        const environment = data.environment;
        const imu = data.imu;
        const battery = data.battery;
        const encoders = data.encoders;
        const unixTimestamp = data.timestamp;
        
        // Convert Unix timestamp to PostgreSQL timestamp
        const postgresTimestamp = new Date(unixTimestamp * 1000).toISOString();

        if (environment && imu) {
            const { accel, gyro, tilt } = imu;
            const { temperature, pressure, altitude, MQ2, MQ135 } = environment;
            const { battery_current, battery_voltage } = battery;
            const { left_encoder, right_encoder } = encoders;

            return [
                // IMU Accelerometer (3 columns)
                parseSensorValue(accel?.x),
                parseSensorValue(accel?.y), 
                parseSensorValue(accel?.z),
                
                // IMU Gyroscope (3 columns)
                parseSensorValue(gyro?.x),
                parseSensorValue(gyro?.y),
                parseSensorValue(gyro?.z),
                
                // Tilt angles (2 columns)
                parseSensorValue(tilt?.roll),
                parseSensorValue(tilt?.pitch),
                
                // Environmental data (3 columns)
                parseSensorValue(pressure),
                parseSensorValue(temperature),
                parseSensorValue(altitude),
                
                // Gas sensors (2 columns)
                parseSensorValue(MQ2?.voltage),
                parseSensorValue(MQ135?.voltage),
                
                // Battery data (2 columns)
                parseSensorValue(battery_current?.voltage),
                parseSensorValue(battery_voltage?.voltage),
                
                // Wheel encoders (4 columns)
                parseSensorValue(left_encoder?.rpm),
                parseSensorValue(left_encoder?.ticks),
                parseSensorValue(right_encoder?.rpm),
                parseSensorValue(right_encoder?.ticks),
                
                // Timestamp (1 column)
                postgresTimestamp
            ];
        } else {
            console.log('No environmental or IMU data in sensor message');
            return null;
        }
    } catch (error) {
        console.error('Error processing batch array:', error);
        return null;
    }
}

async function flushBatchToPostgres() {
    if (postgresBatch.length === 0) return;

    const batch = [...postgresBatch];
    postgresBatch = [];
    
    // Filter out null entries and prepare values
    const validData = [];
    for (const item of batch) {
        const processed = await batchArray(item);
        if (processed !== null) {
            validData.push(processed);
        }
    }
    
    if (validData.length === 0) return;

    try {
        // Create placeholders for the bulk insert
        const valuePlaceholders = validData.map((_, rowIndex) => {
            const placeholders = Array.from({length: DB_COLUMNS}, (_, colIndex) => 
                `$${rowIndex * DB_COLUMNS + colIndex + 1}`
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

export default postgresBatchWrite;