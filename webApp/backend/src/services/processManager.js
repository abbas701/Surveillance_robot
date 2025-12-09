import { exec, spawn } from 'child_process';
import { redisClient } from '../config/redis.js';
import { config } from '../config/env.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const processes = [];

export async function startServices() {
    console.log('🚀 Starting all background services...');

    try {
        // Try to start Redis if configured, but don't fail if not available
        if (config.redisPath) {
            await startRedis();
        } else {
            console.log('⚠️  Redis not configured - skipping Redis startup');
            console.log('💡 Set REDIS_PATH in .env to enable Redis');
        }

        // Try to start Mosquitto if configured
        if (config.mosquittoPath) {
            await startMosquitto();
        } else {
            console.log('⚠️  Mosquitto not configured - skipping Mosquitto startup');
            console.log('💡 Set MOSQUITTO_PATH in .env to enable Mosquitto');
        }

        // Test Redis connection if Redis was started
        if (config.redisPath) {
            setTimeout(() => testRedisConnection(), 3000);
        }

    } catch (error) {
        console.error('❌ Failed to start some services:', error.message);
        console.log('💡 The application will continue without some services');
    }
}

async function startRedis() {
    return new Promise((resolve, reject) => {
        console.log('🔍 Checking if Redis is running...');

        exec('tasklist /FI "IMAGENAME eq redis-server.exe" /FO CSV', (error, stdout) => {
            if (stdout && stdout.trim().length > 0 && !stdout.includes('No tasks')) {
                console.log('✅ Redis Server is already running');
                resolve(true);
                return;
            }

            console.log('🔄 Starting Redis Server...');
            console.log('📁 Redis path:', config.redisPath);

            try {
                const redisProcess = spawn(`"${config.redisPath}"`, [], {
                    stdio: ['ignore', 'pipe', 'pipe'],
                    detached: false,
                    shell: true
                });

                if (!redisProcess || !redisProcess.stdout) {
                    reject(new Error('Failed to create Redis process'));
                    return;
                }

                processes.push(redisProcess);

                let started = false;

                redisProcess.stdout.on('data', (data) => {
                    const output = data.toString().trim();
                    if (output) console.log(`[Redis] ${output}`);
                    
                    if (output.includes('Ready to accept connections') && !started) {
                        started = true;
                        console.log('✅ Redis Server started successfully');
                        resolve(true);
                    }
                });

                redisProcess.stderr.on('data', (data) => {
                    const error = data.toString().trim();
                    if (error) console.error(`[Redis Error] ${error}`);
                });

                redisProcess.on('error', (err) => {
                    console.error('❌ Failed to start Redis Server:', err.message);
                    if (!started) reject(err);
                });

                redisProcess.on('spawn', () => {
                    console.log('🔄 Redis process spawned');
                    setTimeout(() => {
                        if (!started) {
                            started = true;
                            console.log('⚠️  Redis Server assumed started');
                            resolve(true);
                        }
                    }, 5000);
                });

            } catch (spawnError) {
                console.error('❌ Failed to spawn Redis process:', spawnError.message);
                reject(spawnError);
            }
        });
    });
}

async function startMosquitto() {
    return new Promise((resolve, reject) => {
        console.log('🔍 Checking if Mosquitto is running...');

        exec('tasklist /FI "IMAGENAME eq mosquitto.exe" /FO CSV', (error, stdout) => {
            if (stdout && stdout.trim().length > 0 && !stdout.includes('No tasks')) {
                console.log('✅ Mosquitto is already running');
                resolve(true);
                return;
            }

            console.log('🔄 Starting Mosquitto...');
            console.log('📁 Mosquitto path:', config.mosquittoPath);

            try {
                const mosquittoProcess = spawn(`"${config.mosquittoPath}"`, ['-c', config.mosquittoConfig, '-v'], {
                    stdio: ['ignore', 'pipe', 'pipe'],
                    detached: false,
                    shell: true
                });

                processes.push(mosquittoProcess);

                mosquittoProcess.stdout.on('data', (data) => {
                    const output = data.toString().trim();
                    if (output) console.log(`[Mosquitto] ${output}`);
                });

                mosquittoProcess.stderr.on('data', (data) => {
                    const error = data.toString().trim();
                    if (error) console.error(`[Mosquitto Error] ${error}`);
                });

                mosquittoProcess.on('spawn', () => {
                    console.log('✅ Mosquitto started successfully');
                    resolve(true);
                });

                mosquittoProcess.on('error', (err) => {
                    console.error('❌ Failed to start Mosquitto:', err.message);
                    reject(err);
                });

            } catch (spawnError) {
                console.error('❌ Failed to spawn Mosquitto process:', spawnError.message);
                reject(spawnError);
            }
        });
    });
}

async function testRedisConnection(retries = 3) {
    try {
        console.log('🔗 Testing Redis connection...');
        
        if (!redisClient.isOpen) {
            await redisClient.connect();
        }
        
        await redisClient.set('service-test', 'Services started at: ' + new Date().toISOString());
        const value = await redisClient.get('service-test');
        console.log('✅ Redis connection test successful');
        
    } catch (error) {
        console.error('❌ Redis connection failed:', error.message);
        if (retries > 0) {
            console.log(`🔄 Retrying Redis connection... (${retries} attempts left)`);
            setTimeout(() => testRedisConnection(retries - 1), 2000);
        }
    }
}

// Graceful shutdown function
export async function shutdownServices() {
    console.log('\n🛑 Shutting down services...');

    try {
        if (redisClient.isOpen) {
            await redisClient.quit();
            console.log('✅ Redis client disconnected');
        }
    } catch (error) {
        console.log('⚠️  Error closing Redis client:', error.message);
    }

    processes.forEach((process, index) => {
        try {
            if (process && !process.killed) {
                console.log(`🛑 Stopping process ${index + 1}...`);
                process.kill('SIGTERM');
            }
        } catch (error) {
            console.log(`⚠️  Error stopping process ${index + 1}:`, error.message);
        }
    });

    console.log('✅ All services stopped');
}

// Setup graceful shutdown
export function setupGracefulShutdown() {
    const shutdownHandler = async () => {
        await shutdownServices();
        process.exit(0);
    };

    process.on('SIGINT', shutdownHandler);
    process.on('SIGTERM', shutdownHandler);
}

setupGracefulShutdown();

export default {
    startServices,
    shutdownServices,
    setupGracefulShutdown
};