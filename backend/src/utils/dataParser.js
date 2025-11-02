export function parseSensorValue(value) {
    if (value === "Sensor Not Found" || value === null || value === undefined) {
        return null;
    }
    // Convert to number if it's a string that can be parsed
    if (typeof value === 'string' && !isNaN(parseFloat(value))) {
        return parseFloat(value);
    }
    return value;
}

export function parseSensorData(data) {
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
        console.error('Error processing sensor data:', error);
        return null;
    }
}