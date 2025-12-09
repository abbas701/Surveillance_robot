import pigpio
import time


class CameraMount:
    """
    Camera mount controller using two servos for pan (left/right) and tilt (up/down).
    Uses pigpio hardware PWM for smooth servo control.
    """
    
    def __init__(self, pi, config):
        """
        Initialize the camera mount with two servos.
        
        Args:
            pi: pigpio.pi() instance
            config: RobotConfig instance with GPIO pin assignments
        """
        self.pi = pi
        self.gpio_config = config.GPIO_CONFIG
        
        # Servo GPIO pins
        self.pan_pin = self.gpio_config["camera_mount"]["pan_servo"]
        self.tilt_pin = self.gpio_config["camera_mount"]["tilt_servo"]
        
        # Servo PWM parameters (standard servo control)
        # Most servos: 500-2500 microseconds pulse width
        # 500us = 0 degrees, 1500us = 90 degrees, 2500us = 180 degrees
        self.min_pulse_width = 500
        self.max_pulse_width = 2500
        self.center_pulse_width = 1500
        
        # Servo angle limits (degrees)
        self.min_angle = 0
        self.max_angle = 180
        self.center_angle = 90
        
        # Current positions (start at center)
        self.current_pan = self.center_angle
        self.current_tilt = self.center_angle
        
        # Initialize servo pins as outputs
        self.pi.set_mode(self.pan_pin, pigpio.OUTPUT)
        self.pi.set_mode(self.tilt_pin, pigpio.OUTPUT)
        
        # Move to center position
        self.center()
        
        print(f"✅ Camera mount initialized on pins: Pan={self.pan_pin}, Tilt={self.tilt_pin}")
    
    def _angle_to_pulse_width(self, angle):
        """
        Convert angle (0-180 degrees) to pulse width (500-2500 microseconds).
        
        Args:
            angle: Angle in degrees (0-180)
            
        Returns:
            Pulse width in microseconds
        """
        # Clamp angle to valid range
        angle = max(self.min_angle, min(self.max_angle, angle))
        
        # Map angle to pulse width
        pulse_width = self.min_pulse_width + (
            (angle - self.min_angle) * (self.max_pulse_width - self.min_pulse_width) 
            / (self.max_angle - self.min_angle)
        )
        
        return int(pulse_width)
    
    def set_pan(self, angle):
        """
        Set pan servo to specific angle.
        
        Args:
            angle: Target angle in degrees (0-180)
                  0 = full left, 90 = center, 180 = full right
        """
        angle = max(self.min_angle, min(self.max_angle, angle))
        pulse_width = self._angle_to_pulse_width(angle)
        
        self.pi.set_servo_pulsewidth(self.pan_pin, pulse_width)
        self.current_pan = angle
        
        print(f"📹 Pan: {angle}° (pulse: {pulse_width}μs)")
    
    def set_tilt(self, angle):
        """
        Set tilt servo to specific angle.
        
        Args:
            angle: Target angle in degrees (0-180)
                  0 = full down, 90 = center, 180 = full up
        """
        angle = max(self.min_angle, min(self.max_angle, angle))
        pulse_width = self._angle_to_pulse_width(angle)
        
        self.pi.set_servo_pulsewidth(self.tilt_pin, pulse_width)
        self.current_tilt = angle
        
        print(f"📹 Tilt: {angle}° (pulse: {pulse_width}μs)")
    
    def set_position(self, pan_angle, tilt_angle):
        """
        Set both pan and tilt angles simultaneously.
        
        Args:
            pan_angle: Pan angle in degrees (0-180)
            tilt_angle: Tilt angle in degrees (0-180)
        """
        self.set_pan(pan_angle)
        self.set_tilt(tilt_angle)
    
    def center(self):
        """Move both servos to center position (90 degrees)."""
        print("📹 Centering camera mount...")
        self.set_position(self.center_angle, self.center_angle)
    
    def move_pan_relative(self, delta_angle):
        """
        Move pan servo by a relative amount.
        
        Args:
            delta_angle: Degrees to move (positive = right, negative = left)
        """
        new_angle = self.current_pan + delta_angle
        self.set_pan(new_angle)
    
    def move_tilt_relative(self, delta_angle):
        """
        Move tilt servo by a relative amount.
        
        Args:
            delta_angle: Degrees to move (positive = up, negative = down)
        """
        new_angle = self.current_tilt + delta_angle
        self.set_tilt(new_angle)
    
    def move_from_joystick(self, angle, magnitude):
        """
        Move camera based on joystick input (similar to locomotion).
        
        Args:
            angle: Joystick angle in degrees (0-360)
                  0/360 = right, 90 = down, 180 = left, 270 = up
            magnitude: Joystick magnitude (0-100), not used for servos but kept for API consistency
        """
        # Map joystick angle to camera movements
        # Joystick up (270°) -> tilt up
        # Joystick down (90°) -> tilt down
        # Joystick left (180°) -> pan left
        # Joystick right (0°) -> pan right
        
        # Determine primary movement direction
        if 260 <= angle <= 280:  # Up
            self.move_tilt_relative(5)
        elif 80 <= angle <= 100:  # Down
            self.move_tilt_relative(-5)
        elif 170 <= angle <= 190:  # Left
            self.move_pan_relative(-5)
        elif angle <= 10 or angle >= 350:  # Right
            self.move_pan_relative(5)
    
    def get_position(self):
        """
        Get current camera mount position.
        
        Returns:
            Dictionary with current pan and tilt angles
        """
        return {
            "pan": self.current_pan,
            "tilt": self.current_tilt
        }
    
    def cleanup(self):
        """Clean up servo resources and center the mount."""
        print("🧹 Cleaning up camera mount...")
        self.center()
        time.sleep(0.5)
        
        # Turn off servo signals
        self.pi.set_servo_pulsewidth(self.pan_pin, 0)
        self.pi.set_servo_pulsewidth(self.tilt_pin, 0)
        
        print("✅ Camera mount cleanup completed")


# Test code
if __name__ == "__main__":
    # Initialize pigpio
    pi = pigpio.pi()
    
    if not pi.connected:
        print("❌ Failed to connect to pigpio daemon")
        exit(1)
    
    # Mock config for testing
    class MockConfig:
        GPIO_CONFIG = {
            "camera_mount": {
                "pan_servo": 23,
                "tilt_servo": 24
            }
        }
    
    try:
        # Create camera mount instance
        mount = CameraMount(pi, MockConfig())
        
        print("\n🎬 Testing camera mount movements...")
        
        # Test center position
        print("\n1. Center position")
        mount.center()
        time.sleep(2)
        
        # Test pan left
        print("\n2. Pan left (45°)")
        mount.set_pan(45)
        time.sleep(2)
        
        # Test pan right
        print("\n3. Pan right (135°)")
        mount.set_pan(135)
        time.sleep(2)
        
        # Test tilt down
        print("\n4. Tilt down (45°)")
        mount.set_tilt(45)
        time.sleep(2)
        
        # Test tilt up
        print("\n5. Tilt up (135°)")
        mount.set_tilt(135)
        time.sleep(2)
        
        # Return to center
        print("\n6. Return to center")
        mount.center()
        time.sleep(2)
        
        print("\n✅ Test completed successfully")
        
    except Exception as e:
        print(f"❌ Error during test: {e}")
    
    finally:
        # Cleanup
        mount.cleanup()
        pi.stop()
