import { exec, spawn } from 'child_process';
import redis from 'redis';

const REDIS_PATH = 'D:\\redis\\redis-server.exe';
const MOSQUITTO_PATH = 'D:\\Mosquitto\\mosquitto.exe';
const MOSQUITTO_CONFIG = 'D:\\Mosquitto\\mosquitto.conf';

const redisClient = redis.createClient({
  socket: {
    host: '127.0.0.1',
    port: 6379
  }
});

const processes = [];

async function startServices() {
  console.log('Starting all background services...');

  try {
    await startRedis();
    await startMosquitto();
    setTimeout(() => testRedisConnection(), 3000);
  } catch (error) {
    console.error('Failed to start services:', error.message);
  }
}

async function startRedis() {
  return new Promise((resolve, reject) => {
    console.log('Checking if Redis is running...');

    exec('tasklist | findstr redis-server.exe', (error, stdout) => {
      if (stdout) {
        console.log('Redis Server is already running');
        resolve(true);
        return;
      }

      console.log('Starting Redis Server...');
      console.log('Redis path:', REDIS_PATH);

      try {
        const redisProcess = spawn(REDIS_PATH, [], {
          stdio: ['ignore', 'pipe', 'pipe'],
          detached: false,
          shell: true
        });

        if (!redisProcess || !redisProcess.stdout) {
          reject(new Error('Failed to create Redis process'));
          return;
        }

        processes.push(redisProcess);

        redisProcess.stdout.on('data', (data) => {
          const output = data.toString().trim();
          if (output) console.log(`[Redis] ${output}`);
        });

        redisProcess.stderr.on('data', (data) => {
          const error = data.toString().trim();
          if (error) console.error(`[Redis Error] ${error}`);
        });

        redisProcess.on('error', (err) => {
          console.error('Failed to start Redis Server:', err.message);
          reject(err);
        });

        redisProcess.on('spawn', () => {
          console.log('Redis Server started successfully (PID:', redisProcess.pid, ')');
          resolve(true);
        });

        redisProcess.on('exit', (code) => {
          if (code !== 0) {
            console.error(`Redis process exited with code ${code}`);
          }
        });

      } catch (spawnError) {
        console.error('Failed to spawn Redis process:', spawnError.message);
        reject(spawnError);
      }
    });
  });
}

async function startMosquitto() {
  return new Promise((resolve, reject) => {
    console.log('Checking if Mosquitto is running...');

    exec('tasklist | findstr mosquitto.exe', (error, stdout) => {
      if (stdout) {
        console.log('Mosquitto is already running');
        resolve(true);
        return;
      }

      console.log('Starting Mosquitto...');
      console.log('Mosquitto path:', MOSQUITTO_PATH);

      try {
        const mosquittoProcess = spawn(MOSQUITTO_PATH, ['-c', MOSQUITTO_CONFIG, '-v'], {
          stdio: ['ignore', 'pipe', 'pipe'],
          detached: false,
          shell: true
        });

        if (!mosquittoProcess || !mosquittoProcess.stdout) {
          reject(new Error('Failed to create Mosquitto process'));
          return;
        }

        processes.push(mosquittoProcess);

        mosquittoProcess.stdout.on('data', (data) => {
          const output = data.toString().trim();
          if (output) console.log(`[Mosquitto] ${output}`);
        });

        mosquittoProcess.stderr.on('data', (data) => {
          const error = data.toString().trim();
          if (error) console.error(`[Mosquitto Error] ${error}`);
        });

        mosquittoProcess.on('error', (err) => {
          console.error('Failed to start Mosquitto:', err.message);
          reject(err);
        });

        mosquittoProcess.on('spawn', () => {
          console.log('Mosquitto started successfully (PID:', mosquittoProcess.pid, ')');
          resolve(true);
        });

        mosquittoProcess.on('exit', (code) => {
          if (code !== 0) {
            console.error(`Mosquitto process exited with code ${code}`);
          }
        });

      } catch (spawnError) {
        console.error('Failed to spawn Mosquitto process:', spawnError.message);
        reject(spawnError);
      }
    });
  });
}

async function testRedisConnection(retries = 5) {
  try {
    console.log('🔗 Testing Redis connection...');
    await redisClient.connect();
    await redisClient.set('service-test', 'Services started at: ' + new Date().toISOString());
    const value = await redisClient.get('service-test');
    console.log('Redis connection test successful:', value);
    console.log('All services are running!');

    await redisClient.quit();
  } catch (error) {
    console.error('Redis connection failed:', error.message);
    if (retries > 0) {
      console.log(`Retrying Redis connection... (${retries} attempts left)`);
      setTimeout(() => testRedisConnection(retries - 1), 3000);
    } else {
      console.log('Make sure Redis is installed correctly and port 6379 is free');
    }
  }
}

// Simplified graceful shutdown (works on Windows without readline)
function setupGracefulShutdown() {
  const shutdown = async () => {
    console.log('\nShutting down services...');

    try {
      if (redisClient.isOpen) {
        await redisClient.quit();
      }
    } catch (error) {
      console.log('Error closing Redis client:', error.message);
    }

    processes.forEach((process, index) => {
      try {
        if (process && !process.killed) {
          console.log(`Stopping process ${index + 1}...`);
          process.kill('SIGTERM');
        }
      } catch (error) {
        console.log(`Error stopping process ${index + 1}:`, error.message);
      }
    });

    console.log('All services stopped');
    process.exit(0);
  };

  // This works fine on Windows with ES modules
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Start services
try {
  setupGracefulShutdown();
  startServices().catch(error => {
    console.error('Failed to start services:', error.message);
  });
} catch (error) {
  console.error('Critical error in service startup:', error.message);
  process.exit(1);
}