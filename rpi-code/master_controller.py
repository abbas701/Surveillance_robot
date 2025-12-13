from config.robot_config import RobotConfig
from hardware.motors import MotorController
from hardware.sensors.sensor_module import SensorModule
from hardware.servos import ServoController
from network.mqtt_client import MQTTClient
from network.network_monitor import NetworkMonitor
from utils.helpers import RobotUtils
from utils.pid_controller import StraightLinePIDController
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
        self.servos = ServoController(self.pi, self.config)
        # Pass the robot instance (self) to the MQTT client
        self.mqtt = MQTTClient(self.pi, self.config, self)
        self.network_monitor = NetworkMonitor()
        self.utils = RobotUtils()
        self.camera = CameraController(self.config)

        # PID controller for straight line movement
        # Combines encoder RPM differences and MPU6050 x-axis angle deviation
        self.pid_controller = StraightLinePIDController(self.config)

        # Robot state
        self.command = "stop"
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
        self.base_pwm = self.config.base_pwm
        self.is_online = False

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

            encoder_data = {
                "left_encoder": {
                    "rpm": self.motors.rpm.get("left", 0),
                    "ticks": self.motors.encoder_left.get_ticks()
                    if hasattr(self.motors, "encoder_left")
                    else 0,
                },
                "right_encoder": {
                    "rpm": self.motors.rpm.get("right", 0),
                    "ticks": self.motors.encoder_right.get_ticks()
                    if hasattr(self.motors, "encoder_right")
                    else 0,
                },
            }

            self.mqtt._publish_sensor_data(
                imu_data, env_data, battery_data, encoder_data
            )

        except Exception as e:
            print(f"❌ Error publishing sensor data: {e}")

    def _publish_network_data(self):
        """Read and publish network metrics"""
        try:
            # Get network metrics from network monitor
            # Use get_wifi_metrics for frequent updates (no speed test)
            from network.network_monitor import get_wifi_metrics
            network_data = get_wifi_metrics()
            
            # Publish network data via MQTT
            self.mqtt.publish_network_metrics(network_data)
            print(f"✓ Published network data")

        except Exception as e:
            print(f"❌ Error publishing network data: {e}")

    def _update_rpm(self):
        """Update RPM calculations using motor controller"""
        self.motors.update_rpm()

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
        last_network_publish_time = 0
        network_publish_interval = 10  # seconds - publish network data every 10 seconds

        try:
            while True:
                current_time = time.time()

                # Update RPM and other periodic calculations
                self._update_rpm()

                # Handle movement commands with integrated PID control
                if self.command == "forward":
                    # Get IMU data for x-axis angle (roll) - indicates tilt left/right
                    imu_data = self.sensors.read_imu()
                    x_angle = imu_data.get("tilt", {}).get("roll", 0) if imu_data else 0

                    # Get current RPM values (already updated at start of loop)
                    left_rpm = self.motors.rpm.get("left", 0)
                    right_rpm = self.motors.rpm.get("right", 0)

                    # Compute PID correction combining RPM difference and x-axis angle
                    # Positive correction = right motor is slower, needs to speed up
                    correction = self.pid_controller.compute_correction(
                        abs(left_rpm), abs(right_rpm), x_angle
                    )

                    # Apply correction to keep robot moving straight
                    # Motor convention: forward = left: -speed, right: +speed
                    # If left is faster (correction > 0), reduce left speed
                    left_speed = -self.target_speed + correction
                    right_speed = self.target_speed + correction

                    # Ensure speeds stay within limits
                    left_speed = max(-100, min(100, left_speed))
                    right_speed = max(-100, min(100, right_speed))

                    self.motors._set_motors(left_speed, right_speed)

                elif self.command == "backward":
                    # Get IMU data for x-axis angle (roll) - indicates tilt left/right
                    imu_data = self.sensors.read_imu()
                    x_angle = imu_data.get("tilt", {}).get("roll", 0) if imu_data else 0

                    # Get current RPM values (already updated at start of loop)
                    left_rpm = self.motors.rpm.get("left", 0)
                    right_rpm = self.motors.rpm.get("right", 0)

                    # Compute PID correction combining RPM difference and x-axis angle
                    correction = self.pid_controller.compute_correction(
                        abs(left_rpm), abs(right_rpm), x_angle
                    )

                    # Apply correction for backward movement
                    # Motor convention: backward = left: +speed, right: -speed
                    # If left is faster (correction > 0), reduce left speed
                    left_speed = self.target_speed - correction
                    right_speed = -self.target_speed - correction

                    # Ensure speeds stay within limits
                    left_speed = max(-100, min(100, left_speed))
                    right_speed = max(-100, min(100, right_speed))

                    self.motors._set_motors(left_speed, right_speed)

                elif self.command == "left":
                    self.motors.rotate_left(self.target_speed)

                elif self.command == "right":
                    self.motors.rotate_right(self.target_speed)

                elif self.command == "stop":
                    self.motors.stop()
                    self.pid_controller.reset()
                    if hasattr(self.motors, "encoder_left"):
                        self.motors.encoder_left.reset()
                    if hasattr(self.motors, "encoder_right"):
                        self.motors.encoder_right.reset()

                # Publish sensor data at regular intervals
                if current_time - last_publish_time >= publish_interval:
                    self._publish_sensor_data()
                    last_publish_time = current_time

                # Publish network data at regular intervals
                if current_time - last_network_publish_time >= network_publish_interval:
                    self._publish_network_data()
                    last_network_publish_time = current_time

                # Control loop frequency (20Hz)
                time.sleep(0.05)

        except KeyboardInterrupt:
            self.cleanup()

    def cleanup(self):
        """Clean up all resources"""
        print("🧹 Cleaning up resources...")
        if hasattr(self, "motors"):
            self.motors.stop()
        if hasattr(self, "servos"):
            self.servos.cleanup()
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
