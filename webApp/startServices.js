import { exec, spawn } from 'child_process';
import redis from 'redis';

const redisClient = redis.createClient();

async function startServices() {
  console.log('Starting all background services...');

  // Start Redis Server
  exec('tasklist | findstr redis-server.exe', (redisError, redisStdout) => {
    if (redisStdout) {
      console.log('Redis Server is already running');
      testRedisConnection();
    } else {
      console.log('Starting Redis Server...');

      // Path to your Redis installation
      const redisPath = 'E:\\Tech Projects\\Arduino projects\\HU_surv_poj\\Redis-x64-5.0.14.1\\redis-server.exe';

      const redisProcess = spawn(redisPath, [], {
        stdio: 'ignore', // Don't capture output
        detached: true,  // Allow to run independently
        shell: true
      });

      redisProcess.on('error', (err) => {
        console.error('Failed to start Redis Server:', err);
      });

      redisProcess.on('spawn', () => {
        console.log('Redis Server started successfully (PID:', redisProcess.pid, ')');

        // Unref the process so it doesn't keep parent alive
        redisProcess.unref();

        // Wait a bit for Redis to fully start, then test connection
        setTimeout(() => {
          testRedisConnection();
        }, 2000);
      });
    }
  });

  // Start Mosquitto
  exec('tasklist | findstr mosquitto.exe', (mqttError, mqttStdout) => {
    if (mqttStdout) {
      console.log('Mosquitto is already running');
    } else {
      console.log('Starting Mosquitto...');
      // Path to your Mosquitto installation
      const mosquittoPath = "E:\\Tech Projects\\Arduino projects\\HU_surv_poj\\Mosquitto\\mosquitto.exe";

      const mosquittoProcess = spawn(mosquittoPath, ['-c', 'mosquitto.conf', '-v'], {
        stdio: 'ignore', // Don't capture output
        detached: true,  // Allow to run independently
        shell: true,
        cwd: 'D:\\Mosquitto'
      });

      mosquittoProcess.on('error', (err) => {
        console.error('Failed to start Mosquitto:', err);
      });

      mosquittoProcess.on('spawn', () => {
        console.log('Mosquitto started successfully (PID:', mosquittoProcess.pid, ')');
        mosquittoProcess.unref();
      });
    }
  });
}

async function testRedisConnection() {
  try {
    await redisClient.connect();
    await redisClient.set('service-test', 'Services started at: ' + new Date().toISOString());
    const value = await redisClient.get('service-test');
    console.log('Redis connection test successful:', value);
    console.log('All services are running!');
    console.log('Mosquitto: port 1883');
    console.log('Redis: port 6379');

    // Close the test connection
    await redisClient.quit();
  } catch (error) {
    console.error('Redis connection failed:', error.message);
    console.log('Retrying Redis connection in 3 seconds...');
    setTimeout(testRedisConnection, 3000);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down services...');
  try {
    await redisClient.quit();
  } catch (error) {
    // Ignore errors during shutdown
  }
  process.exit(0);
});

// Start services
startServices();

// Keep the script alive for a while to show status
setTimeout(() => {
  console.log('Service startup process completed.');
  console.log('Services will continue running in the background.');
}, 8000);