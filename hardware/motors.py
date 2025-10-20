from hardware.encoders import Encoder


class MotorController:
    def __init__(self, pi, config):
        self.pi = pi
        self.gpio_config = config.GPIO_CONFIG
        self.motor_polarity = config.MOTOR_POLARITY
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
        # self.setup_motors()

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

    def _update_rpm(self, dt):
        """Calculate RPM from encoder ticks"""
        if dt <= 0:
            return

        current_left = self.encoder_left.get_ticks()
        current_right = self.encoder_right.get_ticks()

        delta_left = current_left - self.last_encoder_counts["left"]
        delta_right = current_right - self.last_encoder_counts["right"]

        self.last_encoder_counts = {"left": current_left, "right": current_right}

        self.rpm["left"] = (delta_left / self.config.ENCODER_TICKS_PER_REV) * 60 / dt
        self.rpm["right"] = (delta_right / self.config.ENCODER_TICKS_PER_REV) * 60 / dt

        def emergency_stop(self):
            """Immediately stop all motors and disable movement"""
            self.keep_moving = False
            self.current_movement = None
            self._set_motors(0, 0)
            print("EMERGENCY STOP ACTIVATED")

    def move(self, left_speed, right_speed):
        # Motor control logic
        pass
