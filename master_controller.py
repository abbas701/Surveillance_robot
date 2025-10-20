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
        self.mqtt = MQTTClient(self.pi, self.config)
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
        self.mqtt.connect()
        print("✅ Services connected")

        self._init_gpio()
        self._init_sensors()
        self._init_pid_controllers()
        self._init_mqtt()

        # Robot state
        self.base_pwm = 20
        self.last_encoder_counts = {"left": 0, "right": 0}
        self.rpm = {"left": 0, "right": 0}
        self.is_online = False
        self.current_movement = None  # Track current movement type
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

    def _init_gpio(self):
        """Initialize GPIO pins and PWM for L298N"""
        # Motor driver setup
        for pwm_pin in [
            self.config.GPIO_CONFIG["motors"]["left_pwm"],
            self.config.GPIO_CONFIG["motors"]["right_pwm"],
        ]:
            self.pi.set_mode(pwm_pin, pigpio.OUTPUT)
            self.pi.set_PWM_frequency(pwm_pin, self.config.PWM_FREQUENCY)

        for pin in ["left_dir1", "left_dir2", "right_dir1", "right_dir2"]:
            self.pi.set_mode(self.config.GPIO_CONFIG["motors"][pin], pigpio.OUTPUT)

        # Miscellaneous GPIOs
        self.pi.set_mode(self.config.GPIO_CONFIG["misc"]["horn"], pigpio.OUTPUT)
        self.pi.set_mode(self.config.GPIO_CONFIG["misc"]["headlights"], pigpio.OUTPUT)


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
