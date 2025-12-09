import os
from dotenv import load_dotenv
from simple_pid import PID

# Load environment variables
load_dotenv()

class RobotConfig:
    """Configuration class that loads all settings from environment variables"""

    # Hardware Constants
    ENCODER_TICKS_PER_REV = int(os.getenv("ENCODER_TICKS_PER_REV", "2176"))
    WHEEL_CIRCUMFERENCE_CM = float(os.getenv("WHEEL_CIRCUMFERENCE_CM", "26"))
    ROBOT_BASE_CIRCUMFERENCE_CM = float(os.getenv("ROBOT_BASE_CIRCUMFERENCE_CM", "70"))

    # I2C Device Addresses
    I2C_ADDRESSES = {
        "mpu6050": int(os.getenv("MPU6050_ADDRESS", "0x68"), 16),
        "bmp280": int(os.getenv("BMP280_ADDRESS", "0x76"), 16),
        "ads1115": int(os.getenv("ADS1115_ADDRESS", "0x48"), 16),
    }

    # MQTT Configuration
    MQTT_CONFIG = {
        "broker": os.getenv("MQTT_BROKER", "localhost"),
        "port": int(os.getenv("MQTT_PORT", "1883")),
        "topics": {
            "status": os.getenv("MQTT_TOPIC_STATUS", "robot/status"),
            "sensor_data": os.getenv("MQTT_TOPIC_SENSOR_DATA", "robot/sensor_data"),
            "locomotion": os.getenv("MQTT_TOPIC_LOCOMOTION", "robot/locomotion"),
            "calibration": os.getenv("MQTT_TOPIC_CALIBRATION", "robot/calibration"),
            "calibration_feedback": os.getenv(
                "MQTT_TOPIC_CALIBRATION_FEEDBACK", "robot/calibration/feedback"
            ),
            "network": os.getenv("MQTT_TOPIC_NETWORK", "robot/network"),
        },
    }

    # Publish Configuration
    PUBLISH_CONFIG = {
        "sensor_data_interval": int(os.getenv("SENSOR_DATA_INTERVAL", "5")),
        "status_interval": int(os.getenv("STATUS_INTERVAL", "2")),
        "network_data_interval": int(os.getenv("NETWORK_DATA_INTERVAL", "60")),
        "control_frequency": int(os.getenv("CONTROL_FREQUENCY", "20")),
    }

    # Hardware Configuration
    PWM_FREQUENCY = int(os.getenv("PWM_FREQUENCY", "1000"))

    # Motor Polarity
    MOTOR_POLARITY = {
        "left": int(os.getenv("MOTOR_POLARITY_LEFT", "1")),
        "right": int(os.getenv("MOTOR_POLARITY_RIGHT", "1")),
    }
    
    CAMERA_CONFIG = {
        # Stream Settings
        "target_fps": int(os.getenv("TARGET_FPS", "15")),           # Frames per second
        "stream_width": int(os.getenv("STREAM_WIDTH", "1024")),       # Stream resolution width
        "stream_height": int(os.getenv("STREAM_HEIGHT", "720")),      # Stream resolution height
        "stream_quality": int(os.getenv("STREAM_QUALITY", "75")),     # JPEG quality (1-100)
        
        # Single Capture Settings (when not streaming)
        "capture_width": int(os.getenv("CAPTURE_WIDTH", "2592")),     # High quality capture width
        "capture_height": int(os.getenv("CAPTURE_HEIGHT", "1944")),   # High quality capture height  
        "capture_quality": int(os.getenv("CAPTURE_QUALITY", "95")),   # High quality setting
        
        # Performance Settings
        "capture_timeout": int(os.getenv("CAPTURE_TIMEOUT", "150")),     # Milliseconds for capture
        "capture_timeout_single": int(os.getenv("CAPTURE_TIMEOUT_SINGLE", "2000")),  # Milliseconds for single capture
        
        # Advanced Settings
        "shutter_speed": int(os.getenv("SHUTTER_SPEED", "20000")),      # Optional: shutter speed in microseconds
        "analog_gain": float(os.getenv("ANALOG_GAIN", "2.0")),        # Optional: analog gain
        "brightness": float(os.getenv("BRIGHTNESS", "0.1")),          # Optional: brightness adjustment
    }

    # PID Configuration
    
    """Parse PID configuration from environment variables"""
    pid_left = [float(x) for x in os.getenv("PID_LEFT", "0,0,1").split(",")]
    pid_right = [float(x) for x in os.getenv("PID_RIGHT", "0,0,1").split(",")]
    pid_yaw = [float(x) for x in os.getenv("PID_YAW", "0,0,2").split(",")]
    PID_CONFIG={
            "left": PID(pid_left[0], pid_left[1], pid_left[2]),
            "right": PID(pid_right[0], pid_right[1], pid_right[2]),
            "yaw": PID(pid_yaw[0], pid_yaw[1], pid_yaw[2]),
        }
    base_pwm = int(os.getenv("BASE_PWM", "30"))

    # GPIO Pin Assignments
    GPIO_CONFIG = {
        "encoders": {
            "left": {
                "pin_a": int(os.getenv("ENCODER_LEFT_A", "5")),
                "pin_b": int(os.getenv("ENCODER_LEFT_B", "6")),
            },
            "right": {
                "pin_a": int(os.getenv("ENCODER_RIGHT_A", "13")),
                "pin_b": int(os.getenv("ENCODER_RIGHT_B", "19")),
            },
        },
        "motors": {
            "left_pwm": int(os.getenv("MOTOR_LEFT_PWM", "18")),
            "left_dir1": int(os.getenv("MOTOR_LEFT_DIR1", "14")),
            "left_dir2": int(os.getenv("MOTOR_LEFT_DIR2", "15")),
            "right_pwm": int(os.getenv("MOTOR_RIGHT_PWM", "12")),
            "right_dir1": int(os.getenv("MOTOR_RIGHT_DIR1", "7")),
            "right_dir2": int(os.getenv("MOTOR_RIGHT_DIR2", "8")),
        },
        "misc": {
            "horn": int(os.getenv("MISC_HORN", "17")),
            "headlights": int(os.getenv("MISC_HEADLIGHTS", "26")),
        },
    }
    # @classmethod
    # def print_config(cls):
    #     """Print current configuration for verification"""
    #     print("🤖 Robot Configuration:")
    #     print(f"  Encoder Ticks/Rev: {cls.ENCODER_TICKS_PER_REV}")
    #     print(f"  Wheel Circumference: {cls.WHEEL_CIRCUMFERENCE_CM} cm")
    #     print(f"  Base Circumference: {cls.ROBOT_BASE_CIRCUMFERENCE_CM} cm")
    #     print(f"  I2C Addresses: {cls.I2C_ADDRESSES}")
    #     print(f"  MQTT Broker: {cls.MQTT_CONFIG['broker']}:{cls.MQTT_CONFIG['port']}")
    #     print(f"  MQTT Topics: {cls.MQTT_CONFIG['topics']}")
    #     print(f"  PWM Frequency: {cls.PWM_FREQUENCY} Hz")
    #     print(f"  Motor Polarity: {cls.MOTOR_POLARITY}")
    #     print(f"  GPIO Config: {cls.GPIO_CONFIG}")
