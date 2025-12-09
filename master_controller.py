from config.robot_config import RobotConfig
from hardware.motors import MotorController
from hardware.sensors.sensor_module import SensorModule
from network.mqtt_client import MQTTClient
from network.network_monitor import NetworkMonitor
from utils.helpers import RobotUtils
from simple_pid import PID
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
        # Pass the robot instance (self) to the MQTT client
        self.mqtt = MQTTClient(self.pi, self.config, self)
        self.network_monitor = NetworkMonitor()
        self.utils = RobotUtils()
        self.camera = CameraController(self.config)

        # PID controller for straight line movement
        # These Kp, Ki, Kd values will likely need tuning for your specific robot.
        self.pid = PID(Kp=0.5, Ki=0.1, Kd=0.02, setpoint=0, output_limits=(-50, 50))

        # Robot state
        self.command = ""
        self.target_speed = 0

        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self.shutdown)
        signal.signal(signal.SIGTERM, self.shutdown)

    def connect_services(self):
        """Connect to all external services"""
        print("🔗 Connecting to services...")

        # Initialize all components
        self._init_gpio()
        self._init_sensors()

        # Robot state
        self.base_pwm = 20
        self.last_encoder_counts = {"left": 0, "right": 0}
        self.rpm = {"left": 0, "right": 0}
        self.is_online = False
        self.last_time = time.time()

        print("✅ Services connected")

    def _init_sensors(self):
        """Initialize all sensors"""
        print("🔧 Initializing sensors...")
        try:
            if hasattr(self.sensors, "test_sensors"):
                sensor_status = self.sensors.test_sensors()
                print(f"Sensor status: {sensor_status}")
            print("✅ Sensors initialized")
        except Exception as e:
            print(f"❌ Sensor initialization failed: {e}")

    def _publish_sensor_data(self):
        """Read and publish all sensor data"""
        try:
            imu_data = self.sensors.read_imu() if hasattr(self.sensors, "read_imu") else None
            env_data = self.sensors.read_environmental() if hasattr(self.sensors, "read_environmental") else None
            battery_data = self.sensors.read_battery() if hasattr(self.sensors, "read_battery") else None

            encoder_data = {
                "left_encoder": {
                    "rpm": self.rpm.get("left", 0),
                    "ticks": self.motors.encoder_left.get_ticks() if hasattr(self.motors, "encoder_left") else 0,
                },
                "right_encoder": {
                    "rpm": self.rpm.get("right", 0),
                    "ticks": self.motors.encoder_right.get_ticks() if hasattr(self.motors, "encoder_right") else 0,
                },
            }

            self.mqtt._publish_sensor_data(
                imu_data, env_data, battery_data, encoder_data
            )

        except Exception as e:
            print(f"❌ Error publishing sensor data: {e}")

    def _update_rpm(self):
        """Update RPM calculations"""
        current_time = time.time()
        dt = current_time - self.last_time

        if dt > 0:
            if hasattr(self.motors, "encoder_left") and hasattr(self.motors, "encoder_right"):
                current_left = self.motors.encoder_left.get_ticks()
                current_right = self.motors.encoder_right.get_ticks()

                delta_left = current_left - self.last_encoder_counts["left"]
                delta_right = current_right - self.last_encoder_counts["right"]

                self.last_encoder_counts = {
                    "left": current_left,
                    "right": current_right,
                }

                ticks_per_rev = 20  # Adjust based on your encoder
                self.rpm["left"] = (delta_left / ticks_per_rev) * 60 / dt
                self.rpm["right"] = (delta_right / ticks_per_rev) * 60 / dt

        self.last_time = current_time

    def _init_gpio(self):
        """Initialize GPIO pins"""
        self.pi.set_mode(self.config.GPIO_CONFIG["misc"]["horn"], pigpio.OUTPUT)
        self.pi.set_mode(self.config.GPIO_CONFIG["misc"]["headlights"], pigpio.OUTPUT)

    def run(self):
        """Main robot control loop"""
        print("🤖 Starting robot main loop...")
        self.connect_services()

        last_publish_time = 0
        publish_interval = 2  # seconds

        try:
            while True:
                current_time = time.time()

                # Update RPM and other periodic calculations
                self._update_rpm()
                # Handle movement commands
                if self.command == "forward":
                    left_ticks = self.motors.encoder_left.get_ticks()
                    right_ticks = self.motors.encoder_right.get_ticks()
                    error = left_ticks - right_ticks
                    correction = self.pid(error)
                    left_speed = self.target_speed - correction
                    right_speed = self.target_speed + correction
                    self.motors._set_motors(left_speed, right_speed)

                elif self.command == "backward":
                    left_ticks = self.motors.encoder_left.get_ticks()
                    right_ticks = self.motors.encoder_right.get_ticks()
                    error = left_ticks - right_ticks
                    correction = self.pid(error)
                    left_speed = -self.target_speed + correction
                    right_speed = -self.target_speed - correction
                    self.motors._set_motors(left_speed, right_speed)

                elif self.command == "left":
                    self.motors.rotate_left(self.target_speed)
                    self.command = "stop"

                elif self.command == "right":
                    self.motors.rotate_right(self.target_speed)
                    self.command = "stop"

                elif self.command == "stop":
                    self.motors.stop()
                    self.pid.reset()
                    if hasattr(self.motors, "encoder_left"):
                        self.motors.encoder_left.reset()
                    if hasattr(self.motors, "encoder_right"):
                        self.motors.encoder_right.reset()

                # Publish sensor data at regular intervals
                if current_time - last_publish_time >= publish_interval:
                    self._publish_sensor_data()
                    last_publish_time = current_time

                # Control loop frequency (20Hz)
                time.sleep(0.05)

        except KeyboardInterrupt:
            self.cleanup()

    def cleanup(self):
        """Clean up all resources"""
        print("🧹 Cleaning up resources...")
        if hasattr(self, "motors"):
            self.motors.stop()
        if hasattr(self, "mqtt"):
            self.mqtt.disconnect()
        if hasattr(self, "pi"):
            self.pi.stop()
        print("✅ Cleanup completed")

    def shutdown(self, signum, frame):
        """Graceful shutdown handler"""
        print(f"\n🛑 Received signal {signum}, shutting down...")
        self.cleanup()
        exit(0)


if __name__ == "__main__":
    robot = SurveillanceRobot()
    try:
        robot.run()
    except KeyboardInterrupt:
        pass
    finally:
        robot.cleanup()
        """Graceful shutdown handler"""
        print(f"\n🛑 Received signal, shutting down...")
        exit(0)
