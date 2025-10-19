import time

# =============================================
#               UTILITY METHODS
# =============================================
class RobotUtils:
    def __init__(self):
        pass
    def _print_status(self, imu_data, env_data, battery_data):
        """Print current robot status (compact format)"""
        mqtt_connected = self.mqtt_client.is_connected()

        print(f"\n[{time.strftime('%H:%M:%S')}] ", end="")
        print(f"MQTT:{'✓' if mqtt_connected else '✗'} ", end="")
        print(f"Move:{self.current_movement or 'None'} ", end="")
        print(
            f"Enc:L={self.encoder_left.get_ticks()},R={self.encoder_right.get_ticks()} ",
            end="",
        )
        print(f"RPM:L={self.rpm['left']:.1f},R={self.rpm['right']:.1f}")

        if imu_data:
            print(
                f"IMU: A({imu_data['accel']['x']:.1f},{imu_data['accel']['y']:.1f},{imu_data['accel']['z']:.1f})g ",
                end="",
            )
            print(
                f"G({imu_data['gyro']['x']:.1f},{imu_data['gyro']['y']:.1f},{imu_data['gyro']['z']:.1f})°/s ",
                end="",
            )
            print(f"Yaw:{self.get_yaw():.1f}°")

        if env_data:
            print(
                f"ENV: T:{env_data['temperature']}°C P:{env_data['pressure']}hPa A:{env_data['altitude']}m ",
                end="",
            )
            print(f"MQ2:{env_data['MQ2']['value']} MQ135:{env_data['MQ135']['value']}")

        if battery_data:
            print(
                f"BATT: I:{battery_data['battery_current']['voltage']} V:{battery_data['battery_voltage']['voltage']}"
            )

    def is_online(self):
        """Helper method to check if we're online"""
        return self.mqtt_client.is_connected()

    def cleanup(self):
        """Clean up resources safely"""
        print("Cleaning up resources...")

        # Stop motors first
        self.stop()

        # Stop MQTT client safely
        try:
            if hasattr(self, "mqtt_client") and self.mqtt_client:
                # Disconnect from MQTT broker
                self.mqtt_client.loop_stop()
                if self.mqtt_client.is_connected():
                    self.mqtt_client.disconnect()
                print("✓ MQTT client stopped")
        except Exception as e:
            print(f"Error stopping MQTT client: {e}")

        # Stop pigpio
        try:
            if hasattr(self, "pi") and self.pi:
                self.pi.stop()
                print("✓ pigpio stopped")
        except Exception as e:
            print(f"Error stopping pigpio: {e}")

        print("Cleanup completed")
