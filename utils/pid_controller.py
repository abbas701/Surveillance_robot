import time
import math

class PIDController:
    def __init__(self,config):
        """Initialize PID controllers for motor control"""
        self.config=config.PID_CONFIG
        self.publish_config=config.PUBLISH_CONFIG
        # Set up PID limits and auto mode
        for key in self.config:
            self.config[key].output_limits = (-100, 100)
            self.config[key].setpoint = 0
            self.config[key].set_auto_mode(True)

        self.pid_left = self.config["left"]
        self.pid_right = self.config["right"]
        self.pid_yaw = self.config["yaw"]

    def run(self):
        """Main control loop with PID integration"""
        try:
            last_time = time.time()
            last_publish_time = 0
            last_status_time = 0
            control_interval = 1.0 / self.publish_config["control_frequency"]

            filtered_accel = {"x": 0, "y": 0, "z": 0}

            while True:
                current_time = time.time()
                dt = current_time - last_time
                last_time = current_time

                # Sensor readings
                imu_data = self._read_imu()
                env_data = self._read_environmental()
                battery_data = self._read_battery()

                # Update filtered values
                if imu_data:
                    filtered_accel["x"] = (
                        0.9 * filtered_accel["x"] + 0.1 * imu_data["accel"]["x"]
                    )
                    filtered_accel["y"] = (
                        0.9 * filtered_accel["y"] + 0.1 * imu_data["accel"]["y"]
                    )
                    filtered_accel["z"] = (
                        0.9 * filtered_accel["z"] + 0.1 * imu_data["accel"]["z"]
                    )

                # Calculate RPM from encoders and apply PID if moving
                self._update_rpm(dt)
                if self.keep_moving:
                    self._apply_pid_control()

                # Publish sensor data
                if (
                    current_time - last_publish_time
                    >= self.publish_config["sensor_data_interval"]
                ):
                    self._publish_sensor_data(imu_data, env_data, battery_data)
                    last_publish_time = current_time
                    print(f"✓ Published sensor data at {current_time}")

                # Conditional status printing
                if current_time - last_status_time >= self.publish_config["status_interval"]:
                    self._print_status(imu_data, env_data, battery_data)
                    last_status_time = current_time

                # Maintain consistent control loop timing
                elapsed = time.time() - current_time
                if elapsed < control_interval:
                    time.sleep(control_interval - elapsed)

        except KeyboardInterrupt:
            self.stop()

    def _apply_pid_control(self):
        """Apply PID control based on current movement type"""
        if not self.current_movement:
            return

        # Get current yaw for correction
        current_yaw = self.get_yaw()

        # Calculate RPM error
        rpm_error = self.rpm["left"] - self.rpm["right"]

        # Apply different PID strategies based on movement type
        if self.current_movement in ["forward", "backward"]:
            # For straight movement: use both RPM and yaw correction
            yaw_correction = self.pid_yaw(current_yaw)
            rpm_correction = self.pid_left(rpm_error)

            left_pwm = self.base_pwm - rpm_correction - yaw_correction
            right_pwm = self.base_pwm + rpm_correction + yaw_correction

        elif self.current_movement in ["turn_left", "turn_right"]:
            # For turning: minimal correction to maintain turn consistency
            yaw_correction = self.pid_yaw(current_yaw) * 0.3  # Reduced effect
            rpm_correction = self.pid_left(rpm_error) * 0.5  # Reduced effect

            if self.current_movement == "turn_left":
                left_pwm = -self.base_pwm - rpm_correction - yaw_correction
                right_pwm = self.base_pwm + rpm_correction + yaw_correction
            else:  # turn_right
                left_pwm = self.base_pwm - rpm_correction - yaw_correction
                right_pwm = -self.base_pwm + rpm_correction + yaw_correction

        elif self.current_movement in ["rotate_left", "rotate_right"]:
            # For rotation: no yaw correction, only RPM balance
            rpm_correction = self.pid_left(rpm_error)

            if self.current_movement == "rotate_left":
                left_pwm = -self.base_pwm - rpm_correction
                right_pwm = self.base_pwm + rpm_correction
            else:  # rotate_right
                left_pwm = self.base_pwm - rpm_correction
                right_pwm = -self.base_pwm + rpm_correction
        else:
            return

        # Apply the calculated PWM values
        self._set_motors(left_pwm, right_pwm)

    def get_yaw(self):
        """Get current yaw angle from gyroscope integration"""
        current_time = time.time()
        dt = current_time - self.last_time
        self.last_time = current_time

        try:
            if self.mpu:
                gyro_z = self.mpu.gyro[2]  # rad/s
            else:
                gyro_z = 0.0
        except Exception as e:
            print(f"[IMU Error] {e}")
            gyro_z = 0.0

        self.yaw += gyro_z * dt
        return math.degrees(self.yaw)

    def reset_navigation(self):
        """Reset encoders and yaw for new movement"""
        self.encoder_left.reset()
        self.encoder_right.reset()
        self.last_encoder_counts = {"left": 0, "right": 0}
        self.rpm = {"left": 0, "right": 0}
        self.yaw = 0
        self.last_time = time.time()