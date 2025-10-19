import pigpio
import time
import math
from simple_pid import PID
import board
import busio
import adafruit_mpu6050

# ====== CONFIGURATION ======
ENCODER_TICKS_PER_REV = 64 * 34  # 64 CPR * 34:1 gear ratio
WHEEL_CIRCUMFERENCE_CM = 26
ROBOT_BASE_CIRCUMFERENCE_CM = 70

# Pins (BCM numbering)
ENCODER_PINS = {
    'left': {'pin_a': 18, 'pin_b': 13},
    'right': {'pin_a': 26, 'pin_b': 19}
}

MOTOR_PINS = {
    "ENA": 20,    # Right motor PWM
    "IN1": 16,    # Right motor forward
    "IN2": 12,    # Right motor backward
    "IN3": 25,    # Left motor forward
    "IN4": 24,    # Left motor backward
    "ENB": 23,    # Left motor PWM
    "left_pwm": 23,   # Alias for left PWM
    "right_pwm": 20,  # Alias for right PWM
    "left_dir1": 25,  # Left motor direction 1
    "left_dir2": 24,  # Left motor direction 2
    "right_dir1": 16, # Right motor direction 1
    "right_dir2": 12  # Right motor direction 2
}

PWM_FREQUENCY = 1000

# PID tuning
PID_CONFIG = {
    'left': PID(1.0, 0.0, 0.1),
    'right': PID(1.0, 0.0, 0.1),
    'yaw': PID(0.7, 0.0, 0.2)  # adjust based on yaw deviation
}

# Distance and speed
TARGET_DISTANCE_CM = 150
BASE_PWM = 40

# ====== ENCODER HANDLING ======
class Encoder:
    def __init__(self, pi, pin_a, pin_b):
        self.pi = pi
        self.pin_a = pin_a
        self.pin_b = pin_b
        self.ticks = 0
        self.last_gpio = 0
        
        self.pi.set_mode(pin_a, pigpio.INPUT)
        self.pi.set_pull_up_down(pin_a, pigpio.PUD_UP)
        self.pi.set_mode(pin_b, pigpio.INPUT)
        self.pi.set_pull_up_down(pin_b, pigpio.PUD_UP)
        
        self.cb = pi.callback(pin_a, pigpio.EITHER_EDGE, self._callback)
    
    def _callback(self, gpio, level, tick):
        b = self.pi.read(self.pin_b)
        if gpio == self.pin_a:
            self.ticks += 1 if b == 0 else -1
    
    def reset(self):
        self.ticks = 0
    
    def get_ticks(self):
        return self.ticks

# ====== ROBOT CONTROLLER ======
class Robot:
    def __init__(self):
        self.pi = pigpio.pi()
        
        # Initialize encoders
        self.encoder_left = Encoder(self.pi, **ENCODER_PINS['left'])
        self.encoder_right = Encoder(self.pi, **ENCODER_PINS['right'])
        
        # I2C and IMU
        try:
            self.i2c = busio.I2C(board.SCL, board.SDA)
            self.imu = adafruit_mpu6050.MPU6050(self.i2c, address=0x69)
            print("MPU6050 initialized successfully")
        except Exception as e:
            print(f"IMU initialization failed: {e}")
            self.imu = None
        
        self.yaw_0 = 0
        
        # PWM setup
        for pwm_pin in [MOTOR_PINS['left_pwm'], MOTOR_PINS['right_pwm']]:
            self.pi.set_mode(pwm_pin, pigpio.OUTPUT)
            self.pi.set_PWM_frequency(pwm_pin, PWM_FREQUENCY)
        
        # Direction pins setup
        for pin in ['left_dir1', 'left_dir2', 'right_dir1', 'right_dir2']:
            self.pi.set_mode(MOTOR_PINS[pin], pigpio.OUTPUT)
        
        # PID setup
        for key in PID_CONFIG:
            PID_CONFIG[key].output_limits = (-100, 100)
            PID_CONFIG[key].set_auto_mode(True)
        
        print("Robot initialized successfully")
    
    def reset(self):
        """Reset encoders and yaw reference"""
        self.encoder_left.reset()
        self.encoder_right.reset()
        if self.imu:
            self.yaw_0 = self.imu.gyro[2]
    
    def get_yaw(self):
        """Get current yaw angle in degrees"""
        if not self.imu:
            return 0
        return math.degrees(self.imu.gyro[2] - self.yaw_0)
    
    def get_distance_cm(self, ticks):
        """Convert encoder ticks to distance in cm"""
        return (ticks / ENCODER_TICKS_PER_REV) * WHEEL_CIRCUMFERENCE_CM
    
    def set_motor(self, side, pwm):
        """Set motor speed and direction"""
        pwm_pin = MOTOR_PINS[f'{side}_pwm']
        dir1 = MOTOR_PINS[f'{side}_dir1']
        dir2 = MOTOR_PINS[f'{side}_dir2']
        
        direction = pwm >= 0
        pwm_val = min(100, abs(int(pwm)))
        
        self.pi.write(dir1, 1 if direction else 0)
        self.pi.write(dir2, 0 if direction else 1)
        self.pi.set_PWM_dutycycle(pwm_pin, pwm_val * 2.55)  # Convert 0-100 to 0-255
    
    def move_straight(self, distance_cm, base_pwm):
        """Move straight for specified distance"""
        self.reset()
        start_time = time.time()
        
        print(f"Moving {distance_cm}cm at base PWM {base_pwm}")
        
        while True:
            l_ticks = self.encoder_left.get_ticks()
            r_ticks = self.encoder_right.get_ticks()
            
            l_dist = self.get_distance_cm(l_ticks)
            r_dist = self.get_distance_cm(r_ticks)
            avg_dist = (l_dist + r_dist) / 2
            
            # Check if target distance reached
            if avg_dist >= distance_cm:
                print(f"Target distance reached: {avg_dist:.1f}cm")
                break
            
            # Calculate RPMs
            dt = time.time() - start_time
            if dt > 0:
                l_rpm = (l_ticks / ENCODER_TICKS_PER_REV) * 60 / dt
                r_rpm = (r_ticks / ENCODER_TICKS_PER_REV) * 60 / dt
            else:
                l_rpm = r_rpm = 0
            
            # Get yaw and calculate corrections
            yaw = self.get_yaw()
            yaw_correction = PID_CONFIG['yaw'](yaw)
            
            # Calculate motor PWM values with PID corrections
            l_pwm = base_pwm + PID_CONFIG['left'](r_rpm - l_rpm) - yaw_correction
            r_pwm = base_pwm + PID_CONFIG['right'](l_rpm - r_rpm) + yaw_correction
            
            # Apply motor control
            self.set_motor('left', l_pwm)
            self.set_motor('right', r_pwm)
            
            # Print status
            print(f"[Ticks] L: {l_ticks}, R: {r_ticks} | "
                  f"[RPM] L: {l_rpm:.2f}, R: {r_rpm:.2f} | "
                  f"PWM L: {l_pwm:.1f}, R: {r_pwm:.1f} | "
                  f"Yaw: {yaw:.2f}° | Dist: {avg_dist:.1f}cm")
            
            time.sleep(0.05)
        
        # Stop motors after movement
        self.set_motor('left', 0)
        self.set_motor('right', 0)
    
    def cleanup(self):
        """Cleanup resources"""
        print("Cleaning up...")
        self.set_motor('left', 0)
        self.set_motor('right', 0)
        self.pi.stop()

# ====== MAIN ======
if __name__ == "__main__":
    # Install required packages first:
    # pip install pigpio simple-pid adafruit-circuitpython-mpu6050
    
    robot = Robot()
    
    try:
        # Move forward
        robot.move_straight(TARGET_DISTANCE_CM, BASE_PWM)
        time.sleep(2)
        
        # Move backward
        robot.move_straight(TARGET_DISTANCE_CM, -BASE_PWM)
        
    except KeyboardInterrupt:
        print("Interrupted by user")
    
    except Exception as e:
        print(f"Error: {e}")
    
    finally:
        robot.cleanup()