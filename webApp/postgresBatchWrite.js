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

async function batchArray(data) {
    // Extract environmental data from the nested structure
    const environment = data.environment;
    const imu = data.imu;
    const battery = data.battery;
    const encoders = data.encoders;
    const unixTimestamp = data.timestamp; // e.g., 1759715383.007997
    const postgresTimestamp = new Date(unixTimestamp * 1000).toISOString(); // Result: '2025-10-05T14:49:43.007Z'

    if (environment) {
        const { accel, gyro, tilt } = imu;
        const { temperature, pressure, altitude, MQ2, MQ135 } = environment;
        const { battery_current, battery_voltage } = battery;
        const { left_encoder, right_encoder } = encoders;

        return [accel["x"], accel["y"], accel["z"], gyro["x"], gyro["y"], gyro["z"], tilt["roll"], tilt["pitch"], pressure, temperature, altitude, MQ2["voltage"], MQ135["voltage"], battery_current["voltage"], battery_voltage["voltage"], left_encoder["rpm"], left_encoder["ticks"], right_encoder["rpm"], right_encoder["ticks"], postgresTimestamp]

    } else {
        console.log('No environmental data in sensor message');
        return null;
    }
}

async function flushBatchToPostgres() {
    if (postgresBatch.length === 0) return;

    const batch = [...postgresBatch];
    postgresBatch = [];
    // Filter out null entries and prepare values
    const validData = batch.map(batchArray).filter(item => item !== null);
    if (validData.length === 0) return; // Nothing to insert

    const column_array = Array.from({ length: DB_COLUMNS }, (_, index) => index + 1);
    // Bulk insert using PostgreSQL COPY or multiple VALUES
    const valuePlaceholders = validData.map((_, batchIndex) =>
        column_array.map(column_index =>
            `($${batchIndex * 20 + column_index + 1})`
        )
    ).join(',');
    try {
        await pool.query(`INSERT INTO sensor_data (accel_x,accel_y,accel_z,gyro_x,gyro_y,gyro_z,roll_angle,pitch_angle, pressure,temperature, altitude,mq_2,mq_135,battery_current,battery_voltage,left_rpm,left_ticks,right_rpm,right_ticks,timestamp)
        VALUES ${valuePlaceholders}`,
            validData.flat());
        console.log(`Inserted ${validData.length} records into PostgreSQL`);
    } catch (error) {
        console.error('PostgreSQL batch insert error:', error);
    }
}

export default postgresBatchWrite;