from config.robot_config import RobotConfig
from hardware.motors import MotorController
from hardware.sensors.sensor_module import SensorModule
from network.mqtt_client import MQTTClient
from network.network_monitor import NetworkMonitor
from utils.helpers import RobotUtils
from utils.pid_controller import PIDController
from hardware.camera_server import CameraController
import signal
import time
import pigpio


class SurveillanceRobot:
    def __init__(self):
        # Initialize hardware interfaces
        print("🚀 Initializing Surveillance Robot...")

        # Initialize components
        self.pi = pigpio.pi()
        self.config = RobotConfig()
        self.motors = MotorController(self.pi, self.config)
        self.sensors = SensorModule(self.pi)
        self.mqtt = MQTTClient(self.pi, self.config, self.motors)
        self.network_monitor = NetworkMonitor()
        self.pid_controller = PIDController(self.config)
        self.utils = RobotUtils()
        self.camera = CameraController(self.config)

        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self.shutdown)
        signal.signal(signal.SIGTERM, self.shutdown)

    def connect_services(self):
        """Connect to all external services"""
        print("🔗 Connecting to services...")

        # Initialize all components
        self._init_gpio()
        self._init_sensors()  # UNCOMMENT THIS!

        # Robot state
        self.base_pwm = 20
        self.last_encoder_counts = {"left": 0, "right": 0}
        self.rpm = {"left": 0, "right": 0}
        self.is_online = False
        self.current_movement = None
        self.last_time = time.time()
        self.yaw = 0
        self.yaw_0 = 0

        # Movement control
        self.keep_moving = False
        self.target_rpm = {"left": 0, "right": 0}

        # Calculate movement parameters
        self.ticks_per_full_turn = (
            self.config.ROBOT_BASE_CIRCUMFERENCE_CM / self.config.WHEEL_CIRCUMFERENCE_CM
        ) * 6400
        self.ticks_per_degree = self.ticks_per_full_turn / 360.0
        self.ticks_per_cm = 6400 / self.config.WHEEL_CIRCUMFERENCE_CM

        print("✅ Services connected")

    def _init_sensors(self):
        """Initialize all sensors"""
        print("🔧 Initializing sensors...")
        try:
            # Test if sensors are working
            if hasattr(self.sensors, "test_sensors"):
                sensor_status = self.sensors.test_sensors()
                print(f"Sensor status: {sensor_status}")
            print("✅ Sensors initialized")
        except Exception as e:
            print(f"❌ Sensor initialization failed: {e}")

    def _publish_sensor_data(self):
        """Read and publish all sensor data"""
        try:
            # Read sensor data
            imu_data = (
                self.sensors.read_imu() if hasattr(self.sensors, "read_imu") else None
            )
            env_data = (
                self.sensors.read_environmental()
                if hasattr(self.sensors, "read_environmental")
                else None
            )
            battery_data = (
                self.sensors.read_battery()
                if hasattr(self.sensors, "read_battery")
                else None
            )

            # Get encoder data
            encoder_data = {
                "left_encoder": {
                    "rpm": self.rpm.get("left", 0),
                    "ticks": self.motors.encoder_left.get_ticks()
                    if hasattr(self.motors, "encoder_left")
                    else 0,
                },
                "right_encoder": {
                    "rpm": self.rpm.get("right", 0),
                    "ticks": self.motors.encoder_right.get_ticks()
                    if hasattr(self.motors, "encoder_right")
                    else 0,
                },
            }

            # Publish via MQTT
            self.mqtt._publish_sensor_data(
                imu_data, env_data, battery_data, encoder_data
            )

            # Also print to console for debugging
            print(
                f"📊 Sensor Data Published - IMU: {imu_data is not None}, ENV: {env_data is not None}, Battery: {battery_data is not None}"
            )

        except Exception as e:
            print(f"❌ Error publishing sensor data: {e}")

    def _update_rpm(self):
        """Update RPM calculations"""
        current_time = time.time()
        dt = current_time - self.last_time

        if dt > 0:
            # Update RPM from encoder ticks
            if hasattr(self.motors, "encoder_left") and hasattr(
                self.motors, "encoder_right"
            ):
                current_left = self.motors.encoder_left.get_ticks()
                current_right = self.motors.encoder_right.get_ticks()

                delta_left = current_left - self.last_encoder_counts["left"]
                delta_right = current_right - self.last_encoder_counts["right"]

                self.last_encoder_counts = {
                    "left": current_left,
                    "right": current_right,
                }

                # Calculate RPM (adjust ticks per revolution as needed)
                ticks_per_rev = 20  # Adjust based on your encoder
                self.rpm["left"] = (delta_left / ticks_per_rev) * 60 / dt
                self.rpm["right"] = (delta_right / ticks_per_rev) * 60 / dt

        self.last_time = current_time

    def _init_gpio(self):
        """Initialize GPIO pins and PWM for L298N"""

        # Miscellaneous GPIOs
        self.pi.set_mode(self.config.GPIO_CONFIG["misc"]["horn"], pigpio.OUTPUT)
        self.pi.set_mode(self.config.GPIO_CONFIG["misc"]["headlights"], pigpio.OUTPUT)

    def run(self):
        """Main robot control loop"""
        print("🤖 Starting robot main loop...")
        self.connect_services()

        # Sensor publishing interval (e.g., every 2 seconds)
        last_publish_time = 0
        publish_interval = 2  # seconds

        try:
            while True:
                current_time = time.time()

                # Update RPM calculations
                self._update_rpm()

                # Publish sensor data at regular intervals
                if current_time - last_publish_time >= publish_interval:
                    self._publish_sensor_data()
                    last_publish_time = current_time

                # Main control logic here
                time.sleep(0.1)

        except KeyboardInterrupt:
            self.cleanup()

    def cleanup(self):
        """Clean up all resources"""
        print("🧹 Cleaning up resources...")

        # Stop motors
        if hasattr(self, "motors"):
            self.motors._set_motors(0, 0)

        # Stop MQTT
        if hasattr(self, "mqtt"):
            self.mqtt.disconnect()

        # Stop pigpio
        if hasattr(self, "pi"):
            self.pi.stop()

        print("✅ Cleanup completed")

    def shutdown(self, signum, frame):
        """Graceful shutdown handler"""
        print(f"\n🛑 Received signal {signum}, shutting down...")
        self.cleanup()
        exit(0)


# =============================================
#               MAIN EXECUTION
# =============================================

if __name__ == "__main__":
    robot = SurveillanceRobot()
    try:
        robot.run()
    except KeyboardInterrupt:
        pass
    finally:
        robot.cleanup()
