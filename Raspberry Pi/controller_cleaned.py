import paho.mqtt.client as mqtt
from dotenv import load_dotenv
import os
import json
import smbus2
import time
import RPi.GPIO as GPIO
import math
from simple_pid import PID
import bme280

# =============================================
#               CONFIGURATION
# =============================================

# Load environment variables
load_dotenv()

# Hardware Constants
I2C_BUS = 1
MPU6050_ADDR = 0x69
BMP280_ADDR = 0x77
ENCODER_TICKS_PER_REV = 64 * 34  # Pololu 37D: 64 CPR × 34:1 gear ratio
WHEEL_CIRCUMFERENCE_CM = 20.0
ROBOT_BASE_CIRCUMFERENCE_CM = 47.1

# MQTT Configuration
MQTT_CONFIG = {
    'broker': os.getenv('MQTT_BROKER', 'localhost'),
    'port': int(os.getenv('MQTT_PORT', 1883)),
    'topics': {
        'status': "robot/status",
        'sensor_data': "robot/sensor_data",
        'locomotion': "robot/locomotion",
        'calibration': "robot/calibration",
        'calibration_feedback': "robot/calibration/feedback"
    }
}

# PID Configuration
PID_CONFIG = {
    'rpm': {'Kp': 0.1, 'Ki': 0, 'Kd': 0, 'setpoint': 0, 'limits': (-20, 20)},
    'yaw': {'Kp': 0, 'Ki': 0, 'Kd': 0, 'setpoint': 0, 'limits': (-15, 15)}
}

# GPIO Pin Assignments
GPIO_CONFIG = {
    'encoders': {
        'left_a': 6,
        'left_b': 5,
        'right_a': 4,
        'right_b': 17
    },
    'motors': {
        'right_forward': 23,
        'right_backward': 24,
        'left_forward': 22,
        'left_backward': 27,
        'right_pwm': 26,
        'left_pwm': 21
    },
    'misc' : {
        'horn':13,
        'headlight':19
    }
}

# =============================================
#               INITIALIZATION
# =============================================

class RobotController:
    def __init__(self):
        # Initialize hardware interfaces
        self.i2c_bus = smbus2.SMBus(I2C_BUS)
        self._init_gpio()
        self._init_sensors()
        self._init_pid_controllers()
        self._init_mqtt()

        # Robot state
        self.base_pwm = 20
        self.encoder_counts = {'left': 0, 'right': 0}
        self.last_encoder_counts = {'left': 0, 'right': 0}
        self.rpm = {'left': 0, 'right': 0}
        self.is_online = False

        # Calculate movement parameters
        self.ticks_per_full_turn = (ROBOT_BASE_CIRCUMFERENCE_CM / WHEEL_CIRCUMFERENCE_CM) * 6400
        self.ticks_per_degree = self.ticks_per_full_turn / 360.0
        self.ticks_per_cm = 6400 / WHEEL_CIRCUMFERENCE_CM

    def _init_gpio(self):
        """Initialize GPIO pins and PWM"""
        GPIO.setmode(GPIO.BCM)
        GPIO.setwarnings(False)

        # Encoder setup
        GPIO.setup(GPIO_CONFIG['encoders']['left_a'], GPIO.IN, pull_up_down=GPIO.PUD_UP)
        GPIO.setup(GPIO_CONFIG['encoders']['left_b'], GPIO.IN, pull_up_down=GPIO.PUD_UP)
        GPIO.setup(GPIO_CONFIG['encoders']['right_a'], GPIO.IN, pull_up_down=GPIO.PUD_UP)
        GPIO.setup(GPIO_CONFIG['encoders']['right_b'], GPIO.IN, pull_up_down=GPIO.PUD_UP)

        # Motor driver setup
        GPIO.setup(GPIO_CONFIG['motors']['right_forward'], GPIO.OUT)
        GPIO.setup(GPIO_CONFIG['motors']['right_backward'], GPIO.OUT)
        GPIO.setup(GPIO_CONFIG['motors']['left_forward'], GPIO.OUT)
        GPIO.setup(GPIO_CONFIG['motors']['left_backward'], GPIO.OUT)
        GPIO.setup(GPIO_CONFIG['motors']['right_pwm'], GPIO.OUT)        
        GPIO.setup(GPIO_CONFIG['motors']['left_pwm'], GPIO.OUT)
        
        # Miscellenious GPIOs
        GPIO.setup(GPIO_CONFIG['misc']['horn'], GPIO.OUT)
        GPIO.setup(GPIO_CONFIG['misc']['headlight'], GPIO.OUT)
        
        # PWM setup
        self.right_pwm = GPIO.PWM(GPIO_CONFIG['motors']['right_pwm'], 100)
        self.left_pwm = GPIO.PWM(GPIO_CONFIG['motors']['left_pwm'], 100)
        self.right_pwm.start(0)
        self.left_pwm.start(0)

        # Encoder interrupts
        GPIO.add_event_detect(GPIO_CONFIG['encoders']['left_a'], GPIO.BOTH, 
                            callback=lambda x: self._encoder_callback('left'))
        GPIO.add_event_detect(GPIO_CONFIG['encoders']['right_a'], GPIO.BOTH,
                            callback=lambda x: self._encoder_callback('right'))

    def _init_sensors(self):
        """Initialize IMU and environmental sensors"""
        # MPU6050 initialization
        self.i2c_bus.write_byte_data(MPU6050_ADDR, 0x6B, 0x00)  # Wake up
        self.i2c_bus.write_byte_data(MPU6050_ADDR, 0x1B, 0x08)  # ±500°/s range
        self.i2c_bus.write_byte_data(MPU6050_ADDR, 0x1C, 0x10)  # ±8g range

        # BMP280 calibration
        self.bmp280_calibration = bme280.load_calibration_params(self.i2c_bus, BMP280_ADDR)
        
        # Sensor calibration
        self._calibrate_sensors()

    def _init_pid_controllers(self):
        """Initialize PID controllers for motor control"""
        self.pid_rpm = PID(
            PID_CONFIG['rpm']['Kp'],
            PID_CONFIG['rpm']['Ki'],
            PID_CONFIG['rpm']['Kd'],
            setpoint=PID_CONFIG['rpm']['setpoint']
        )
        self.pid_rpm.output_limits = PID_CONFIG['rpm']['limits']
        self.pid_rpm.set_auto_mode(True)

        self.pid_yaw = PID(
            PID_CONFIG['yaw']['Kp'],
            PID_CONFIG['yaw']['Ki'],
            PID_CONFIG['yaw']['Kd'],
            setpoint=PID_CONFIG['yaw']['setpoint']
        )
        self.pid_yaw.output_limits = PID_CONFIG['yaw']['limits']
        self.pid_yaw.set_auto_mode(True)

    def _init_mqtt(self):
        """Initialize MQTT client and callbacks"""
        self.mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="RPi_Test")
        self.mqtt_client.username_pw_set("", "")  # ? Credentials (match ESP32)
        self.mqtt_client.on_connect = self._on_mqtt_connect
        self.mqtt_client.on_disconnect = self._on_mqtt_disconnect
        self.mqtt_client.on_message = self._on_mqtt_message
        self._mqtt_reconnect()

    # =============================================
    #               CORE FUNCTIONALITY
    # =============================================

    def run(self):
        """Main control loop"""
        try:
            last_time = time.time()
            filtered_accel = {'x': 0, 'y': 0, 'z': 0}
            
            while True:
                current_time = time.time()
                dt = current_time - last_time
                last_time = current_time

                # Sensor readings
                imu_data = self._read_imu()
                env_data = self._read_environmental()
                
                # Update filtered values
                filtered_accel['x'] = 0.9 * filtered_accel['x'] + 0.1 * imu_data['accel']['x']
                filtered_accel['y'] = 0.9 * filtered_accel['y'] + 0.1 * imu_data['accel']['y']
                filtered_accel['z'] = 0.9 * filtered_accel['z'] + 0.1 * imu_data['accel']['z']

                # Calculate RPM from encoders
                self._update_rpm(dt)

                # PID control
                pid_corrections = self._calculate_pid_corrections()

                # Motor control
                self._set_motors(
                    self.base_pwm - pid_corrections['rpm'] + pid_corrections['yaw'],
                    self.base_pwm + pid_corrections['rpm'] - pid_corrections['yaw']
                )

                # Publish sensor data
                self._publish_sensor_data(imu_data, env_data)

                # Debug output
                self._print_status(imu_data, env_data)

                time.sleep(1)

        except KeyboardInterrupt:
            self.stop()
            GPIO.cleanup()

    # =============================================
    #               SENSOR METHODS
    # =============================================

    def _read_imu(self):
        """Read IMU data (accelerometer and gyroscope)"""
        # Accelerometer
        accel_data = self.i2c_bus.read_i2c_block_data(MPU6050_ADDR, 0x3B, 6)
        ax = (accel_data[0] << 8) | accel_data[1]
        ay = (accel_data[2] << 8) | accel_data[3]
        az = (accel_data[4] << 8) | accel_data[5]
        
        # Gyroscope
        gyro_data = self.i2c_bus.read_i2c_block_data(MPU6050_ADDR, 0x43, 6)
        gx = (gyro_data[0] << 8) | gyro_data[1]
        gy = (gyro_data[2] << 8) | gyro_data[3]
        gz = (gyro_data[4] << 8) | gyro_data[5]

        return {
            'accel': {
                'x': (ax / 32768.0) * 8 - self.accel_bias['x'],
                'y': (ay / 32768.0) * 8 - self.accel_bias['y'],
                'z': (az / 32768.0) * 8 - self.accel_bias['z']
            },
            'gyro': {
                'x': (gx / 65536.0) * 500 - self.gyro_bias['x'],
                'y': (gy / 65536.0) * 500 - self.gyro_bias['y'],
                'z': (gz / 65536.0) * 500 - self.gyro_bias['z']
            },
            'tilt': self._calculate_tilt(ax, ay, az)
        }

    def _read_environmental(self):
        """Read BMP280 environmental sensor data"""
        try:
            data = bme280.sample(self.i2c_bus, BMP280_ADDR, self.bmp280_calibration)
            return {
                'temp': round(data.temperature, 2),
                'press': round(data.pressure, 2),
                'alt': round(44330 * (1 - (data.pressure/1013.25)**(1/5.255)), 2)
            }
        except Exception as e:
            print(f"BMP280 Error: {e}")
            return None

    def _calculate_tilt(self, ax, ay, az):
        """Calculate tilt angles from accelerometer data"""
        roll = math.atan2(ay, math.sqrt(ax**2 + az**2)) * (180 / math.pi)
        pitch = math.atan2(-ax, math.sqrt(ay**2 + az**2)) * (180 / math.pi)
        
        return {'roll': roll, 'pitch': pitch}

    def _calibrate_sensors(self, samples=1000):
        """Calibrate IMU sensors"""
        print("Calibrating sensors... (keep robot still)")
        
        self.gyro_bias = {'x': 0, 'y': 0, 'z': 0}
        self.accel_bias = {'x': 0, 'y': 0, 'z': 0}
        
        for _ in range(samples):
            # Calibrate gyro
            gx, gy, gz = self._read_imu()['gyro'].values()
            self.gyro_bias['x'] += gx
            self.gyro_bias['y'] += gy
            self.gyro_bias['z'] += gz
            
            # Calibrate accelerometer
            ax, ay, az = self._read_imu()['accel'].values()
            self.accel_bias['x'] += ax
            self.accel_bias['y'] += ay
            self.accel_bias['z'] += az - 1.0  # Subtract 1g from Z
            
            time.sleep(0.01)
        
        # Calculate averages
        for axis in self.gyro_bias:
            self.gyro_bias[axis] /= samples
        for axis in self.accel_bias:
            self.accel_bias[axis] /= samples
        
        print(f"Gyro bias: {self.gyro_bias}")
        print(f"Accel bias: {self.accel_bias}")

    # =============================================
    #               MOTOR CONTROL
    # =============================================

    def _set_motors(self, left_speed, right_speed):
        """Set motor speeds with safety limits"""
        left_speed = max(0, min(100, left_speed))
        right_speed = max(0, min(100, right_speed))
        
        # Left motor
        GPIO.output(GPIO_CONFIG['motors']['left_forward'], GPIO.HIGH if left_speed >= 0 else GPIO.LOW)
        GPIO.output(GPIO_CONFIG['motors']['left_backward'], GPIO.LOW if left_speed >= 0 else GPIO.HIGH)
        self.left_pwm.ChangeDutyCycle(abs(left_speed))
        
        # Right motor
        GPIO.output(GPIO_CONFIG['motors']['right_forward'], GPIO.HIGH if right_speed >= 0 else GPIO.LOW)
        GPIO.output(GPIO_CONFIG['motors']['right_backward'], GPIO.LOW if right_speed >= 0 else GPIO.HIGH)
        self.right_pwm.ChangeDutyCycle(abs(right_speed))

    def _encoder_callback(self, side):
        """Encoder interrupt callback"""
        a_pin = GPIO_CONFIG['encoders'][f'{side}_a']
        b_pin = GPIO_CONFIG['encoders'][f'{side}_b']
        
        if GPIO.input(a_pin) == GPIO.input(b_pin):
            self.encoder_counts[side] += 1
        else:
            self.encoder_counts[side] -= 1

    def _update_rpm(self, dt):
        """Calculate RPM from encoder ticks"""
        delta_left = self.encoder_counts['left'] - self.last_encoder_counts['left']
        delta_right = self.encoder_counts['right'] - self.last_encoder_counts['right']
        
        self.last_encoder_counts = self.encoder_counts.copy()
        
        self.rpm['left'] = (delta_left / ENCODER_TICKS_PER_REV) * 60 / dt
        self.rpm['right'] = (delta_right / ENCODER_TICKS_PER_REV) * 60 / dt

    def _calculate_pid_corrections(self):
        """Calculate PID corrections for motor control"""
        rpm_error = self.rpm['left'] - self.rpm['right']
        yaw_error = -self._read_imu()['gyro']['z']  # Negative for correction
        
        return {
            'rpm': self.pid_rpm(rpm_error),
            'yaw': self.pid_yaw(yaw_error)
        }

    # =============================================
    #               MOVEMENT FUNCTIONS
    # =============================================

    def move_forward(self, speed=None):
        """Move robot forward at specified speed"""
        speed = speed or self.base_pwm
        self._set_motors(speed, speed)

    def move_backward(self, speed=None):
        """Move robot backward at specified speed"""
        speed = speed or self.base_pwm
        self._set_motors(-speed, -speed)

    def turn_left(self, speed=None):
        """Turn left in place"""
        speed = speed or self.base_pwm
        self._set_motors(-speed, speed)

    def turn_right(self, speed=None):
        """Turn right in place"""
        speed = speed or self.base_pwm
        self._set_motors(speed, -speed)
        
    def rotate_left(self, speed=None):
        """Rotate left in place"""
        speed = speed or self.base_pwm
        self._set_motors(speed, -speed)  
        
    def rotate_right(self, speed=None):
        """Rotate right in place"""
        speed = speed or self.base_pwm
        self._set_motors(speed, -speed)

    def stop(self):
        """Stop all motors"""
        self._set_motors(0, 0)

    def rotate_to_angle(self, angle, direction='clockwise'):
        """Rotate to specific angle (in degrees)"""
        initial_counts = self.encoder_counts.copy()
        target_ticks = self.ticks_per_degree * angle
        
        while (abs(self.encoder_counts['left'] - initial_counts['left']) < target_ticks and
               abs(self.encoder_counts['right'] - initial_counts['right']) < target_ticks):
            if direction == 'clockwise':
                self.turn_right()
            else:
                self.turn_left()
        
        self.stop()

    def move_distance(self, distance_cm):
        """Move straight for specified distance"""
        initial_counts = self.encoder_counts.copy()
        target_ticks = distance_cm * self.ticks_per_cm
        
        while (abs(self.encoder_counts['left'] - initial_counts['left']) < target_ticks and
               abs(self.encoder_counts['right'] - initial_counts['right']) < target_ticks):
            self.move_forward()
        
        self.stop()

    # =============================================
    #               MQTT COMMUNICATION
    # =============================================

    def _mqtt_reconnect(self, max_retries=5, retry_delay=3):
        """Attempt MQTT reconnection"""
        retry_count = 0
        while not self.mqtt_client.is_connected() and retry_count < max_retries:
            try:
                print("Connecting to MQTT broker...")
                self.mqtt_client.connect(MQTT_CONFIG['broker'],MQTT_CONFIG['port'], 60)
                self.mqtt_client.loop_start()
                
                # Verify connection
                for _ in range(4):
                    if self.mqtt_client.is_connected():
                        print("MQTT Connected!")
                        return True
                    time.sleep(0.5)
                    
            except Exception as e:
                print(f"MQTT connection failed: {e}")
            
            retry_count += 1
            delay = min(retry_delay * (2 ** retry_count), 30)
            print(f"Retrying in {delay} seconds...")
            time.sleep(delay)
            
        return False

    def _on_mqtt_connect(self, client, userdata, flags, rc, properties):
        """MQTT connection callback"""
        print(f"Connected to MQTT broker with code {rc}")
        client.subscribe(MQTT_CONFIG['topics']['locomotion'])
        client.subscribe(MQTT_CONFIG['topics']['calibration'])
        client.publish(MQTT_CONFIG['topics']['status'], "online", retain=True)
        self.is_online = True

    def _on_mqtt_disconnect(self, client, userdata, rc):
        """MQTT disconnection callback"""
        if rc != 0:
            print(f"Unexpected disconnection (rc={rc}), reconnecting...")
            print("set false")
            self.is_online = False
            self._mqtt_reconnect()

    def _on_mqtt_message(self, client, userdata, msg):
        """Handle incoming MQTT messages"""
        try:
            payload = json.loads(msg.payload.decode())
            print(payload)
            if msg.topic == MQTT_CONFIG['topics']['locomotion']:
                self._handle_locomotion_command(payload)
                
            elif msg.topic == MQTT_CONFIG['topics']['calibration']:
                self._handle_calibration_command(payload)
                
        except Exception as e:
            print(f"Error processing MQTT message: {e}")

    def _handle_locomotion_command(self, command):
        """Process locomotion commands"""
        action = command.get('action', '')
        move_type = command.get('type', 'speed')
        status=command.get('status', '')
        
        
        if action == 'move':
            if move_type == 'angled_distance':
                self.rotate_to_angle(
                    command.get('angle', 0),
                    command.get('direction', 'clockwise')
                )
                self.move_distance(command.get('distance', 0))
                
            elif move_type == 'speed':
                angle = command.get('angle', 0)
                speed = command.get('speed', self.base_pwm)
                
                if 80 <= angle <= 100:
                    self.move_forward(speed)
                elif 260 <= angle <= 280:
                    self.move_backward(speed)
                elif angle <= 10 or angle >= 350:
                    self.turn_right(speed)
                elif 170 <= angle <= 190:
                    self.turn_left(speed)
                elif 10 < angle < 80:
                    self.rotate_right(speed)
                elif 280 < angle < 350:
                    self.rotate_left(speed)
                else:
                    self.stop()
        elif action=="horn":
            GPIO.output(GPIO_CONFIG['misc']['horn'], GPIO.HIGH if status else GPIO.LOW)
        elif action=="headlight":
            GPIO.output(GPIO_CONFIG['misc']['horn'], GPIO.HIGH if status else GPIO.LOW)
            

    def _handle_calibration_command(self, command):
        """Process calibration commands"""
        quantity = command.get('quantity', '')
        feedback = {'status': 'failure', 'error': 'unknown_quantity'}
        
        if quantity == 'altitude':
            pressure_sum = 0
            for _ in range(10):
                env_data = self._read_environmental()
                if env_data:
                    pressure_sum += env_data['press']
                time.sleep(0.1)
            
            feedback = {
                'status': 'success',
                'referencePressure': pressure_sum / 10
            }
        
        self.mqtt_client.publish(
            MQTT_CONFIG['topics']['calibration_feedback'],
            json.dumps(feedback),
            retain=True
        )

    def _publish_sensor_data(self, imu_data, env_data):
        """Publish sensor data to MQTT"""
        if not self.is_online:
            return
            
        payload = {
            'imu': imu_data,
            'environment': env_data,
            'encoders': {
                'left_rpm': self.rpm['left'],
                'right_rpm': self.rpm['right']
            },
            'timestamp': time.time()
        }
        
        self.mqtt_client.publish(
            MQTT_CONFIG['topics']['sensor_data'],
            json.dumps(payload)
        )

    # =============================================
    #               UTILITY METHODS
    # =============================================

    def _print_status(self, imu_data, env_data):
        """Print current robot status"""
        # print("\n=== Robot Status ===")
        # print(f"IMU - Accel: X={imu_data['accel']['x']:.2f}g, Y={imu_data['accel']['y']:.2f}g, Z={imu_data['accel']['z']:.2f}g")
        # print(f"IMU - Gyro: X={imu_data['gyro']['x']:.2f}°/s, Y={imu_data['gyro']['y']:.2f}°/s, Z={imu_data['gyro']['z']:.2f}°/s")
        # print(f"IMU - Tilt: Roll={imu_data['tilt']['roll']:.2f}°, Pitch={imu_data['tilt']['pitch']:.2f}°")
        
        # if env_data:
        #     print(f"Env - Temp: {env_data['temp']}°C, Press: {env_data['press']}hPa, Alt: {env_data['alt']}m")
        
        print(f"Motors - L: {self.rpm['left']:.1f}RPM, R: {self.rpm['right']:.1f}RPM")
        print(f"MQTT - {'Connected' if self.is_online else 'Disconnected'}")
        print("===================\n")


# =============================================
#               MAIN EXECUTION
# =============================================

if __name__ == "__main__":
    robot = RobotController()
    robot.run()