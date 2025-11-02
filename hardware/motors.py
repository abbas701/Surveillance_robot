from hardware.encoders import Encoder
import pigpio
import time


class MotorController:
    def __init__(self, pi, config):
        self.pi = pi
        self.gpio_config = config.GPIO_CONFIG
        self.motor_polarity = config.MOTOR_POLARITY
        self.pwm_freq = config.PWM_FREQUENCY
        self.config = config  # Store config for RPM calculations

        # Motor driver setup
        for pwm_pin in [
            self.gpio_config["motors"]["left_pwm"],
            self.gpio_config["motors"]["right_pwm"],
        ]:
            self.pi.set_mode(pwm_pin, pigpio.OUTPUT)
            self.pi.set_PWM_frequency(pwm_pin, self.pwm_freq)

        for pin in ["left_dir1", "left_dir2", "right_dir1", "right_dir2"]:
            self.pi.set_mode(self.gpio_config["motors"][pin], pigpio.OUTPUT)

        # Initialize encoders with pigpio callback
        self.encoder_left = Encoder(
            self.pi,
            self.gpio_config["encoders"]["left"]["pin_a"],
            self.gpio_config["encoders"]["left"]["pin_b"],
        )
        self.encoder_right = Encoder(
            self.pi,
            self.gpio_config["encoders"]["right"]["pin_a"],
            self.gpio_config["encoders"]["right"]["pin_b"],
        )
        
        # Movement state tracking - ADD THIS
        self.current_movement = "stopped"
        self.last_encoder_counts = {"left": 0, "right": 0}
        self.rpm = {"left": 0, "right": 0}
        self.last_time = time.time()

    def _set_motors(self, left_speed, right_speed):
        """Set motor speeds with safety limits for L298N"""
        if left_speed == 0 and right_speed == 0:
            self.pi.set_PWM_dutycycle(self.gpio_config["motors"]["left_dir1"], 0)
            self.pi.set_PWM_dutycycle(self.gpio_config["motors"]["left_dir2"], 0)
            self.pi.set_PWM_dutycycle(self.gpio_config["motors"]["left_pwm"], 0)
            self.pi.set_PWM_dutycycle(self.gpio_config["motors"]["right_dir1"], 0)
            self.pi.set_PWM_dutycycle(self.gpio_config["motors"]["right_dir2"], 0)
            self.pi.set_PWM_dutycycle(self.gpio_config["motors"]["right_pwm"], 0)
            return

        left_speed = max(-100, min(100, left_speed))
        right_speed = max(-100, min(100, right_speed))

        # Convert to 0-255 range for pigpio
        left_pwm_val = int(abs(left_speed) * 2.55)
        right_pwm_val = int(abs(right_speed) * 2.55)

        # Left motor direction control for L298N
        left_direction = (left_speed * self.motor_polarity["left"]) >= 0
        self.pi.write(
            self.gpio_config["motors"]["left_dir1"], 1 if left_direction else 0
        )
        self.pi.write(
            self.gpio_config["motors"]["left_dir2"], 0 if left_direction else 1
        )
        self.pi.set_PWM_dutycycle(self.gpio_config["motors"]["left_pwm"], left_pwm_val)

        # Right motor direction control for L298N
        right_direction = (right_speed * self.motor_polarity["right"]) >= 0
        self.pi.write(
            self.gpio_config["motors"]["right_dir1"], 1 if right_direction else 0
        )
        self.pi.write(
            self.gpio_config["motors"]["right_dir2"], 0 if right_direction else 1
        )
        self.pi.set_PWM_dutycycle(
            self.gpio_config["motors"]["right_pwm"], right_pwm_val
        )

    def update_rpm(self):
        """Calculate RPM from encoder ticks - call this periodically"""
        current_time = time.time()
        dt = current_time - self.last_time
        
        if dt <= 0:
            return

        current_left = self.encoder_left.get_ticks()
        current_right = self.encoder_right.get_ticks()

        delta_left = current_left - self.last_encoder_counts["left"]
        delta_right = current_right - self.last_encoder_counts["right"]

        self.last_encoder_counts = {"left": current_left, "right": current_right}

        self.rpm["left"] = (delta_left / self.config.ENCODER_TICKS_PER_REV) * 60 / dt
        self.rpm["right"] = (delta_right / self.config.ENCODER_TICKS_PER_REV) * 60 / dt
        
        self.last_time = current_time

    def get_movement_state(self):
        """Get current movement state and encoder data"""
        return {
            "current_movement": self.current_movement,
            "rpm": self.rpm.copy(),
            "encoder_ticks": {
                "left": self.encoder_left.get_ticks(),
                "right": self.encoder_right.get_ticks()
            }
        }

    def emergency_stop(self):
        """Immediately stop all motors and disable movement"""
        self.current_movement = "emergency_stop"
        self._set_motors(0, 0)
        print("EMERGENCY STOP ACTIVATED")

    def move_forward(self, speed):
        """Move both motors forward at same speed"""
        print(f"🔼 Moving forward at speed: {speed}")
        self.current_movement = "forward"
        self._set_motors(speed, speed)

    def move_backward(self, speed):
        """Move both motors backward at same speed"""
        print(f"🔽 Moving backward at speed: {speed}")
        self.current_movement = "backward"
        self._set_motors(-speed, -speed)

    def turn_left(self, speed):
        """Turn left - right motor forward, left motor backward"""
        print(f"↩️ Turning left at speed: {speed}")
        self.current_movement = "turning_left"
        self._set_motors(-speed, speed)

    def turn_right(self, speed):
        """Turn right - left motor forward, right motor backward"""
        print(f"↪️ Turning right at speed: {speed}")
        self.current_movement = "turning_right"
        self._set_motors(speed, -speed)

    def rotate_left(self, speed):
        """Rotate left in place - right motor forward, left motor backward"""
        print(f"🔄 Rotating left at speed: {speed}")
        self.current_movement = "rotating_left"
        self._set_motors(-speed, speed)

    def rotate_right(self, speed):
        """Rotate right in place - left motor forward, right motor backward"""
        print(f"🔄 Rotating right at speed: {speed}")
        self.current_movement = "rotating_right"
        self._set_motors(speed, -speed)

    def stop(self):
        """Stop both motors"""
        print("🛑 Stopping motors")
        self.current_movement = "stopped"
        self._set_motors(0, 0)