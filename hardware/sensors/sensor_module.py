import board
import busio
import time
from config.robot_config import RobotConfig
from .mpu6050_sensor import MPU6050Sensor
from .bmp280_sensor import BMP280Sensor
from .ads1115_sensor import ADS1115Sensor

class SensorModule:
    def __init__(self, pi):
        self.i2c_bus = busio.I2C(board.SCL, board.SDA)

        # Initialize individual sensors
        self.mpu6050 = MPU6050Sensor(
            i2c_bus=self.i2c_bus, address=RobotConfig.I2C_ADDRESSES["mpu6050"]
        )

        self.bmp280 = BMP280Sensor(
            i2c_bus=self.i2c_bus, address=RobotConfig.I2C_ADDRESSES["bmp280"]
        )

        self.ads1115 = ADS1115Sensor(
            i2c_bus=self.i2c_bus, address=RobotConfig.I2C_ADDRESSES["ads1115"]
        )

        print("✓ Sensor Module initialized")

    # ADD THESE MISSING METHODS:
    def read_imu(self):
        """Read IMU data specifically"""
        try:
            return self.mpu6050.read_data()
        except Exception as e:
            print(f"[IMU Read Error] {e}")
            return {
                "accel": {"x": 0, "y": 0, "z": 0},
                "gyro": {"x": 0, "y": 0, "z": 0},
                "tilt": {"roll": 0, "pitch": 0},
            }

    def read_environmental(self):
        """Read environmental data specifically"""
        try:
            env_data = self.bmp280.read_data()
            gas_data = self.ads1115.read_gas_sensors()
            return {**env_data, **gas_data}
        except Exception as e:
            print(f"[Environmental Read Error] {e}")
            return {
                "temperature": "Sensor Error",
                "pressure": "Sensor Error", 
                "altitude": "Sensor Error",
                "MQ2": {"value": "Sensor Error", "voltage": "Sensor Error"},
                "MQ135": {"value": "Sensor Error", "voltage": "Sensor Error"},
            }

    def read_battery(self):
        """Read battery data specifically"""
        try:
            return self.ads1115.read_battery()
        except Exception as e:
            print(f"[Battery Read Error] {e}")
            return {
                "battery_current": {"value": "Sensor Error", "voltage": "Sensor Error"},
                "battery_voltage": {"value": "Sensor Error", "voltage": "Sensor Error"},
            }

    def test_sensors(self):
        """Test if all sensors are working"""
        print("🔧 Testing sensors...")
        status = self.get_sensor_status()
        print(f"Sensor Status: {status}")
        return status

    # YOUR EXISTING METHODS:
    def read_all_sensors(self):
        """Read data from all sensors"""
        try:
            imu_data = self.mpu6050.read_data()
            environmental_data = self.bmp280.read_data()
            gas_data = self.ads1115.read_gas_sensors()
            battery_data = self.ads1115.read_battery()

            return {
                "imu": imu_data,
                "environment": {**environmental_data, **gas_data},
                "battery": battery_data,
                "timestamp": time.time(),
            }

        except Exception as e:
            print(f"[Sensor Module Error] {e}")
            return self._get_fallback_data()

    def _get_fallback_data(self):
        """Return fallback data when sensors fail"""
        return {
            "imu": {
                "accel": {"x": 0, "y": 0, "z": 0},
                "gyro": {"x": 0, "y": 0, "z": 0},
                "tilt": {"roll": 0, "pitch": 0},
            },
            "environment": {
                "temperature": "Sensor Error",
                "pressure": "Sensor Error",
                "altitude": "Sensor Error",
                "MQ2": {"value": "Sensor Error", "voltage": "Sensor Error"},
                "MQ135": {"value": "Sensor Error", "voltage": "Sensor Error"},
            },
            "battery": {
                "battery_current": {"value": "Sensor Error", "voltage": "Sensor Error"},
                "battery_voltage": {"value": "Sensor Error", "voltage": "Sensor Error"},
            },
            "timestamp": time.time(),
        }

    def get_sensor_status(self):
        """Get status of all sensors"""
        return {
            "mpu6050": self.mpu6050.is_connected(),
            "bmp280": self.bmp280.is_connected(),
            "ads1115": self.ads1115.is_connected(),
        }