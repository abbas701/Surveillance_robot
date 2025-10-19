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
    'left': {'pin_a': 5, 'pin_b': 6},
    'right': {'pin_a': 13, 'pin_b': 19}
}

MOTOR_PINS = {
    "left_pwm": 18,
    "left_dir1": 14,
    "left_dir2": 15,
    "right_pwm": 12,
    "right_dir1": 7,
    "right_dir2": 8,
}

MOTOR_POLARITY = {
    "left": -1,   # forward when pwm >= 0
    "right": 1  # flip direction if needed
}

PWM_FREQUENCY = 1000

# PID tuning
PID_CONFIG = {
    'left': PID(0, 0, 1),
    'right': PID(0, 0, 1),
    'yaw': PID(0, 0, 2)  # adjust based on yaw deviation
}

# Distance and speed
TARGET_DISTANCE_CM = 10  # Move 100 cm forward
BASE_PWM = 50

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
        self.encoder_left = Encoder(self.pi, **ENCODER_PINS['left'])
        self.encoder_right = Encoder(self.pi, **ENCODER_PINS['right'])

        # I2C and IMU
        self.i2c = busio.I2C(board.SCL, board.SDA)
        self.imu = adafruit_mpu6050.MPU6050(self.i2c)
        self.yaw_0 = 0

        # PWM setup
        for pwm_pin in [MOTOR_PINS['left_pwm'], MOTOR_PINS['right_pwm']]:
            self.pi.set_mode(pwm_pin, pigpio.OUTPUT)
            self.pi.set_PWM_frequency(pwm_pin, PWM_FREQUENCY)

        for pin in ['left_dir1', 'left_dir2', 'right_dir1', 'right_dir2']:
            self.pi.set_mode(MOTOR_PINS[pin], pigpio.OUTPUT)

        # PID setup
        for key in PID_CONFIG:
            PID_CONFIG[key].output_limits = (-100, 100)
            PID_CONFIG[key].set_auto_mode(True)

    def reset(self):
        self.last_time = time.time()
        self.yaw = 0
        self.encoder_left.reset()
        self.encoder_right.reset()
        self.yaw_0 = self.imu.gyro[2]

    def get_yaw(self):
        current_time = time.time()
        dt = current_time - self.last_time
        self.last_time = current_time
        try:
            gyro_z = self.imu.gyro[2]  # rad/s
        except OSError as e:
            print(f"[I2C Error] {e} → keeping last yaw")
            gyro_z = 0.0  # don’t update yaw this cycle
        self.yaw += gyro_z * dt
        return math.degrees(self.yaw)

    def get_distance_cm(self, ticks):
        return (ticks / ENCODER_TICKS_PER_REV) * WHEEL_CIRCUMFERENCE_CM

    def set_motor(self, side, pwm):
        pwm_pin = MOTOR_PINS[f'{side}_pwm']
        dir1 = MOTOR_PINS[f'{side}_dir1']
        dir2 = MOTOR_PINS[f'{side}_dir2']

        direction = (pwm * MOTOR_POLARITY[side]) >= 0

        pwm_val = min(100, abs(int(pwm)))

        self.pi.write(dir1, 1 if direction else 0)
        self.pi.write(dir2, 0 if direction else 1)
        self.pi.set_PWM_dutycycle(pwm_pin, pwm_val * 2.55)

    def ramp_motor(self, side, target_pwm, step=2, delay=0.02):
        current_pwm = 0
        while abs(current_pwm) < abs(target_pwm):
            current_pwm += step if target_pwm > 0 else -step
            self.set_motor(side, current_pwm)
            time.sleep(delay)
        self.set_motor(side, target_pwm)
        
    def move_straight(self, distance_cm, base_pwm):
        self.reset()
        start_time = time.time()
        
        while True:
            l_ticks = self.encoder_left.get_ticks()
            r_ticks = self.encoder_right.get_ticks()

            l_dist = self.get_distance_cm(l_ticks)
            r_dist = self.get_distance_cm(r_ticks)

            avg_dist = (l_dist + r_dist) / 2
            if avg_dist >= distance_cm:
                break

            # Calculate RPMs (simplified)
            dt = time.time() - start_time
            l_rpm = (l_ticks / ENCODER_TICKS_PER_REV) * 60 / dt
            r_rpm = (r_ticks / ENCODER_TICKS_PER_REV) * 60 / dt

            yaw = self.get_yaw()
            yaw_correction = PID_CONFIG['yaw'](yaw)

            l_pwm = base_pwm + PID_CONFIG['left'](r_rpm - l_rpm) - yaw_correction
            r_pwm = base_pwm + PID_CONFIG['right'](l_rpm - r_rpm) + yaw_correction

            self.set_motor('left', l_pwm)
            self.set_motor('right', r_pwm)

            print(f"[Ticks] L: {l_ticks}, R: {r_ticks} | [RPM] L: {l_rpm:.2f}, R: {r_rpm:.2f} | PWM L: {l_pwm:.1f}, R: {r_pwm:.1f} | Yaw: {yaw:.2f} | Dist: {avg_dist:.1f}cm")
            time.sleep(0.05)

        self.set_motor('left', 0)
        self.set_motor('right', 0)

    def cleanup(self):
        self.set_motor('left', 0)
        self.set_motor('right', 0)
        self.pi.stop()

# ====== MAIN ======
if __name__ == "__main__":
    robot = Robot()
    try:
        robot.move_straight(TARGET_DISTANCE_CM, BASE_PWM)
        time.sleep(2)
        robot.move_straight(TARGET_DISTANCE_CM, -BASE_PWM)
    except KeyboardInterrupt:
        pass
    finally:
        robot.cleanup()
