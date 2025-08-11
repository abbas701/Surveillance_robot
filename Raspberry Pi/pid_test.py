import smbus2
import time
import RPi.GPIO as GPIO
import math
from simple_pid import PID

# --- MPU6050 Setup ---
MPU6050_ADDR = 0x68
PWR_MGMT_1 = 0x6B
GYRO_CONFIG = 0x1B
ACCEL_CONFIG = 0x1C
bus = smbus2.SMBus(1)  # I2C bus 1

# Initialize PID controller (tune these values!)
pid_rpm = PID(Kp=1.0, Ki=0, Kd=0, setpoint=0)  # Target: 0 RPM difference
pid_rpm.output_limits = (-20, 20)  # Limit correction to ±20% PWM
pid_rpm.set_auto_mode(True)

pid_yaw = PID(Kp=0.5, Ki=0.01, Kd=0.1, setpoint=0)  # Target: 0°/s (no turn)
pid_yaw.output_limits = (-15, 15)  # Limit correction
pid_yaw.set_auto_mode(True)


def mpu6050_init():
    bus.write_byte_data(MPU6050_ADDR, PWR_MGMT_1, 0x00)  # Wake up
    bus.write_byte_data(MPU6050_ADDR, GYRO_CONFIG, 0x08)  # ±500°/s range
    bus.write_byte_data(MPU6050_ADDR, ACCEL_CONFIG, 0x10)  # ±8g range


def read_accel():
    # Read 2 bytes each for X, Y, Z accelerometer
    data = bus.read_i2c_block_data(MPU6050_ADDR, 0x3B, 6)
    ax = (data[0] << 8) | data[1]
    ay = (data[2] << 8) | data[3]
    az = (data[4] << 8) | data[5]
    # Convert to g (8g range, 16-bit signed)
    ax = (ax / 32768.0) * 8
    ay = (ay / 32768.0) * 8
    az = (az / 32768.0) * 8
    return ax, ay, az


def read_gyro():
    # (Same as before)
    data = bus.read_i2c_block_data(MPU6050_ADDR, 0x43, 6)
    gx = (data[0] << 8) | data[1]
    gy = (data[2] << 8) | data[3]
    gz = (data[4] << 8) | data[5]
    gx = (gx / 65536.0) * 500 - gyro_bias[0]
    gy = (gy / 65536.0) * 500 - gyro_bias[1]
    gz = (gz / 65536.0) * 500 - gyro_bias[2]
    return gx, gy, gz


# --- Tilt Calculation from Accelerometer ---
def calculate_tilt(ax, ay, az):
    # Roll (tilt left/right)
    roll = math.atan2(ay, math.sqrt(ax**2 + az**2)) * (180 / math.pi)
    # Pitch (tilt forward/backward)
    pitch = math.atan2(-ax, math.sqrt(ay**2 + az**2)) * (180 / math.pi)
    return roll, pitch


# --- Encoder Setup ---
LEFT_ENCODER_A = 17  # GPIO for left encoder channel A
LEFT_ENCODER_B = 18  # GPIO for left encoder channel B
RIGHT_ENCODER_A = 22  # GPIO for right encoder channel A
RIGHT_ENCODER_B = 23  # GPIO for right encoder channel B

# Motor Pins
IN1 = 23  # Left motor forward
IN2 = 24  # Left motor backward
IN3 = 22  # Right motor forward
IN4 = 27  # Right motor backward
ENA = 26  # Left motor PWM
ENB = 21  # Right motor PWM

total_left_ticks = total_right_ticks = last_left_ticks = last_right_ticks = 0
base_pwm = 20
left_rpm = right_rpm = pid_rpm_error = pid_yaw_error = 0


def encoder_callback_left():
    global total_left_ticks
    if GPIO.input(LEFT_ENCODER_A) == GPIO.input(LEFT_ENCODER_B):
        total_left_ticks += 1
    else:
        total_left_ticks -= 1


def encoder_callback_right():
    global total_right_ticks
    if GPIO.input(RIGHT_ENCODER_A) == GPIO.input(RIGHT_ENCODER_B):
        total_right_ticks += 1
    else:
        total_right_ticks -= 1


GPIO.setmode(GPIO.BCM)
GPIO.setwarnings(False)
GPIO.setup(LEFT_ENCODER_A, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(LEFT_ENCODER_B, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(RIGHT_ENCODER_A, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(RIGHT_ENCODER_B, GPIO.IN, pull_up_down=GPIO.PUD_UP)

# Add hardware interrupts (rising/falling edges)
GPIO.add_event_detect(LEFT_ENCODER_A, GPIO.BOTH, callback=encoder_callback_left)
GPIO.add_event_detect(RIGHT_ENCODER_A, GPIO.BOTH, callback=encoder_callback_right)

# L298N initialization
GPIO.setup(IN1, GPIO.OUT)
GPIO.setup(IN2, GPIO.OUT)
GPIO.setup(IN3, GPIO.OUT)
GPIO.setup(IN4, GPIO.OUT)
GPIO.setup(ENA, GPIO.OUT)
GPIO.setup(ENB, GPIO.OUT)

# PWM Setup (100Hz frequency)
pwm_left = GPIO.PWM(ENA, 100)
pwm_right = GPIO.PWM(ENB, 100)
pwm_left.start(0)
pwm_right.start(0)


# --- Calibration ---
gyro_bias = [0, 0, 0]
accel_bias = [0, 0, 0]
TICKS_PER_REV = 64 * 34  # Pololu 37D: 64 CPR encoder × 34:1 gear ratio


def calibrate_sensors():
    print("Calibrating... (keep robot still)")
    samples = 1000
    for _ in range(samples):
        # Calibrate gyro
        gx, gy, gz = read_gyro()
        gyro_bias[0] += gx
        gyro_bias[1] += gy
        gyro_bias[2] += gz
        # Calibrate accelerometer (expect Z=1g, X,Y=0 when flat)
        ax, ay, az = read_accel()
        accel_bias[0] += ax
        accel_bias[1] += ay
        accel_bias[2] += az - 1.0  # Subtract 1g from Z
        time.sleep(0.01)
    gyro_bias[0] /= samples
    gyro_bias[1] /= samples
    gyro_bias[2] /= samples
    accel_bias[0] /= samples
    accel_bias[1] /= samples
    accel_bias[2] /= samples
    print(f"Gyro bias: {gyro_bias}")
    print(f"Accel bias: {accel_bias}")


def set_motors(left_speed, right_speed):
    """
    Set motor speed and direction.
    :param left_speed: 0-100% PWM for left motor
    :param right_speed: 0-100% PWM for right motor
    """
    # Left Motor (Forward)
    GPIO.output(IN1, GPIO.HIGH)
    GPIO.output(IN2, GPIO.LOW)
    pwm_left.ChangeDutyCycle(left_speed)

    # Right Motor (Forward)
    GPIO.output(IN3, GPIO.HIGH)
    GPIO.output(IN4, GPIO.LOW)
    pwm_right.ChangeDutyCycle(right_speed)


def update_motors():
    # PID correction for speed matching
    error_rpm = left_rpm - right_rpm
    correction = pid_rpm(error_rpm)

    # Apply to motors (base_pwm = default speed, e.g., 50%)
    return correction


def update_heading():
    gx, gy, gz = read_gyro()
    correction = pid_yaw(gz)  # Correct if gz ≠ 0

    # Adjust motors (opposite correction for yaw)
    return correction


mpu6050_init()
calibrate_sensors()

try:
    last_time = time.time()
    filtered_ax, filtered_ay, filtered_az = read_accel()
    while True:
        dt = time.time() - last_time
        last_time = time.time()

        # Read sensors
        ax, ay, az = read_accel()
        gx, gy, gz = read_gyro()
        filtered_ax = 0.9 * filtered_ax + 0.1 * ax
        filtered_ay = 0.9 * filtered_ay + 0.1 * ay
        filtered_az = 0.9 * filtered_az + 0.1 * az
        roll, pitch = calculate_tilt(filtered_ax, filtered_ay, filtered_az)

        # Complementary filter
        alpha = 0.98  # Weight for gyro (high = trust gyro more)
        roll = (roll + gz * dt) * alpha + roll * (1 - alpha)
        pitch = (pitch + gy * dt) * alpha + pitch * (1 - alpha)

        # Print data
        print(
            f"Accel (g): X={filtered_ax:.2f}, Y={filtered_ay:.2f}, Z={filtered_az:.2f}"
        )
        print(f"Tilt: Roll={roll:.2f}°, Pitch={pitch:.2f}°")
        print(f"Gyro (°/s): X={gx:.2f}, Y={gy:.2f}, Z={gz:.2f}")

        # Calculate RPM from encoders
        delta_left = total_left_ticks - last_left_ticks
        delta_right = total_right_ticks - last_right_ticks
        last_left_ticks = total_left_ticks
        last_right_ticks = total_right_ticks

        left_rpm = (delta_left / TICKS_PER_REV) * 60 / dt
        right_rpm = (delta_right / TICKS_PER_REV) * 60 / dt
        print(f"Left RPM: {left_rpm:.2f}, Right RPM: {right_rpm:.2f}")

        # Update speed matching (encoders)
        pid_rpm_error = update_motors()

        # Update heading (gyro)
        pid_yaw_error = update_heading()

        left_pwm = base_pwm - pid_rpm_error + pid_yaw_error  # Speed + Heading
        right_pwm = base_pwm + pid_rpm_error - pid_yaw_error

        left_pwm = max(0, min(100, left_pwm))  # ensure pwm is between 0 and 100
        right_pwm = max(0, min(100, right_pwm))
        print(f"Left PWM: {left_pwm:.2f}, Right PWM: {right_pwm:.2f}")
        
        set_motors(left_pwm, right_pwm)
        
        print("Ramping up motors...")
        for pwm in range(0, base_pwm, 5):
            set_motors(pwm, pwm)
            time.sleep(0.5)

        if abs(gz) > 5.0:  # Large yaw rate detected
            print(f"Strong drift! gz={gz:.2f}°/s")

        time.sleep(0.1)

except KeyboardInterrupt:
    pwm_left.stop()
    pwm_right.stop()
    GPIO.cleanup()
