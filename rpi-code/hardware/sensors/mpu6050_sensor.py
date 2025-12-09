import math
import time
import board
import busio
import adafruit_mpu6050

class MPU6050Sensor:
    def __init__(self, i2c_bus=None, address=0x68):
        self.i2c_bus = i2c_bus or busio.I2C(board.SCL, board.SDA)
        self.address = address
        self.mpu = None
        self.gyro_bias = {"x": 0, "y": 0, "z": 0}
        self.accel_bias = {"x": 0, "y": 0, "z": 0}
        
        self._initialize()
        self._calibrate()

    def _initialize(self):
        """Initialize MPU6050 sensor"""
        try:
            self.mpu = adafruit_mpu6050.MPU6050(self.i2c_bus, address=self.address)
            print("✓ MPU6050 initialized successfully")
            return True
        except Exception as e:
            print(f"[ERROR] MPU6050 not found at {self.address}: {e}")
            self.mpu = None
            return False

    def _calibrate(self, samples=1000):
        """Calibrate IMU sensors with error handling"""
        if not self.mpu:
            print("❌ Cannot calibrate - MPU6050 not initialized")
            return

        print("Calibrating MPU6050... (keep robot still)")
        successful_samples = 0

        for i in range(samples):
            try:
                imu_data = self._read_raw()
                if imu_data and all(imu_data["accel"].values()) and all(imu_data["gyro"].values()):
                    # Calibrate gyro
                    gx, gy, gz = imu_data["gyro"].values()
                    self.gyro_bias["x"] += gx
                    self.gyro_bias["y"] += gy
                    self.gyro_bias["z"] += gz

                    # Calibrate accelerometer
                    ax, ay, az = imu_data["accel"].values()
                    self.accel_bias["x"] += ax
                    self.accel_bias["y"] += ay
                    self.accel_bias["z"] += az - 1.0  # Subtract 1g from Z

                    successful_samples += 1

                time.sleep(0.01)

            except Exception as e:
                print(f"MPU6050 calibration sample {i} failed: {e}")
                continue

        if successful_samples > 0:
            # Calculate averages only from successful samples
            for axis in self.gyro_bias:
                self.gyro_bias[axis] /= successful_samples
            for axis in self.accel_bias:
                self.accel_bias[axis] /= successful_samples

            print(f"✓ MPU6050 calibration completed with {successful_samples}/{samples} samples")
            print(f"  Gyro bias: {self.gyro_bias}")
            print(f"  Accel bias: {self.accel_bias}")
        else:
            print("❌ MPU6050 calibration failed - no successful readings")
            self.gyro_bias = {"x": 0, "y": 0, "z": 0}
            self.accel_bias = {"x": 0, "y": 0, "z": 0}

    def _read_raw(self):
        """Read raw IMU data without calibration applied"""
        if not self.mpu:
            return None

        try:
            time.sleep(0.005)  # 5ms delay
            accel = self.mpu.acceleration
            gyro = self.mpu.gyro

            # Check for valid data
            if any(math.isnan(val) for val in accel + gyro):
                raise ValueError("NaN values in IMU data")

            return {
                "accel": {"x": accel[0], "y": accel[1], "z": accel[2]},
                "gyro": {
                    "x": math.degrees(gyro[0]),
                    "y": math.degrees(gyro[1]), 
                    "z": math.degrees(gyro[2])
                }
            }

        except (OSError, ValueError) as e:
            print(f"[MPU6050 Read Error] {e}")
            return None

    def _calculate_tilt(self, ax, ay, az):
        """Calculate tilt angles from accelerometer data"""
        roll = math.atan2(ay, math.sqrt(ax**2 + az**2)) * (180 / math.pi)
        pitch = math.atan2(-ax, math.sqrt(ay**2 + az**2)) * (180 / math.pi)
        return {"roll": roll, "pitch": pitch}

    def read_data(self):
        """Read calibrated IMU data with proper error handling"""
        if not self.mpu:
            return {
                "accel": {"x": 0, "y": 0, "z": 0},
                "gyro": {"x": 0, "y": 0, "z": 0},
                "tilt": {"roll": 0, "pitch": 0},
            }

        try:
            raw_data = self._read_raw()
            if not raw_data:
                raise ValueError("No data from MPU6050")

            # Apply calibration
            calibrated_accel = {
                "x": raw_data["accel"]["x"] - self.accel_bias["x"],
                "y": raw_data["accel"]["y"] - self.accel_bias["y"], 
                "z": raw_data["accel"]["z"] - self.accel_bias["z"],
            }
            
            calibrated_gyro = {
                "x": raw_data["gyro"]["x"] - self.gyro_bias["x"],
                "y": raw_data["gyro"]["y"] - self.gyro_bias["y"],
                "z": raw_data["gyro"]["z"] - self.gyro_bias["z"],
            }

            # Calculate tilt
            tilt = self._calculate_tilt(
                calibrated_accel["x"], 
                calibrated_accel["y"], 
                calibrated_accel["z"]
            )

            return {
                "accel": calibrated_accel,
                "gyro": calibrated_gyro,
                "tilt": tilt,
            }

        except Exception as e:
            print(f"[MPU6050 Read Error] {e}")
            return {
                "accel": {"x": 0, "y": 0, "z": 0},
                "gyro": {"x": 0, "y": 0, "z": 0},
                "tilt": {"roll": 0, "pitch": 0},
            }

    def is_connected(self):
        """Check if sensor is connected and working"""
        return self.mpu is not None