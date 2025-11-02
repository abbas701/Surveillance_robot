import { Pool } from 'pg';
import { config } from './env.js';

// Validate database configuration
function validateDbConfig() {
    const required = ['dbUser', 'dbName', 'dbPassword'];
    const missing = required.filter(key => !config[key]);
    
    if (missing.length > 0) {
        console.error('❌ Missing database configuration:', missing.join(', '));
        console.log('💡 Please check your .env file for these variables:');
        console.log('   DB_USER, DB_NAME, DB_PASSWORD');
        console.log('💡 Optional: DB_HOST, DB_PORT');
        return false;
    }
    return true;
}

// Create PostgreSQL connection pool with better error handling
export const pool = new Pool({
    user: config.dbUser,
    host: config.dbHost,
    database: config.dbName,
    password: config.dbPassword,
    port: config.dbPort,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 20,
});

// Test database connection
export async function testDatabaseConnection() {
    if (!validateDbConfig()) {
        throw new Error('Database configuration is incomplete');
    }

    try {
        const client = await pool.connect();
        console.log('✅ PostgreSQL connected successfully');
        
        // Test query
        const result = await client.query('SELECT version()');
        console.log('📊 PostgreSQL Version:', result.rows[0].version);
        
        client.release();
        return true;
    } catch (error) {
        console.error('❌ PostgreSQL connection failed:', error.message);
        
        // Provide helpful error messages
        if (error.code === '28P01') {
            console.log('\n💡 Password authentication failed. Possible solutions:');
            console.log('   1. Check DB_PASSWORD in your .env file');
            console.log('   2. Reset PostgreSQL password:');
            console.log('      - Open pgAdmin or psql');
            console.log('      - Run: ALTER USER postgres PASSWORD \'your_new_password\';');
        } else if (error.code === '3D000') {
            console.log('\n💡 Database does not exist. Create it with:');
            console.log('   createdb ' + config.dbName);
        } else if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 PostgreSQL is not running. Start it with:');
            console.log('   net start postgresql-x64-15');
        }
        
        throw error;
    }
}

export default pool;