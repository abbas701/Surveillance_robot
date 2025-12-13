import pigpio
import time


class ServoController:
    """Controller for camera mount servos (pan and tilt)"""
    
    def __init__(self, pi, config):
        self.pi = pi
        self.gpio_config = config.GPIO_CONFIG
        
        # Get servo GPIO pins from config
        self.pan_pin = self.gpio_config["servos"]["pan"]
        self.tilt_pin = self.gpio_config["servos"]["tilt"]
        
        # Servo pulse width range (typically 500-2500 microseconds)
        self.min_pulse = 500
        self.max_pulse = 2500
        self.center_pulse = 1500
        
        # Current servo positions (in pulse width)
        self.pan_position = self.center_pulse
        self.tilt_position = self.center_pulse
        
        # Initialize servos to center position
        self._initialize_servos()
    
    def _initialize_servos(self):
        """Initialize servos and set to center position"""
        print("🎥 Initializing camera servos...")
        
        # Set servo pins as outputs
        self.pi.set_mode(self.pan_pin, pigpio.OUTPUT)
        self.pi.set_mode(self.tilt_pin, pigpio.OUTPUT)
        
        # Set to center position
        self.pi.set_servo_pulsewidth(self.pan_pin, self.center_pulse)
        self.pi.set_servo_pulsewidth(self.tilt_pin, self.center_pulse)
        
        print(f"✓ Pan servo on GPIO {self.pan_pin}")
        print(f"✓ Tilt servo on GPIO {self.tilt_pin}")
        print("✓ Camera servos initialized to center position")
    
    def _angle_to_pulse(self, angle):
        """
        Convert angle (-90 to +90) to servo pulse width
        
        Args:
            angle: Angle in degrees (-90 to +90, 0 is center)
        
        Returns:
            Pulse width in microseconds (500-2500)
        """
        # Clamp angle to valid range
        angle = max(-90, min(90, angle))
        
        # Map angle to pulse width
        # -90° -> min_pulse (500), 0° -> center_pulse (1500), +90° -> max_pulse (2500)
        pulse_range = self.max_pulse - self.min_pulse
        pulse = self.center_pulse + (angle / 90.0) * (pulse_range / 2)
        
        return int(pulse)
    
    def set_pan(self, angle):
        """
        Set pan servo angle
        
        Args:
            angle: Angle in degrees (-90 to +90, 0 is center)
                  Positive = right, Negative = left
        """
        pulse = self._angle_to_pulse(angle)
        self.pan_position = pulse
        self.pi.set_servo_pulsewidth(self.pan_pin, pulse)
        print(f"📹 Pan set to {angle}° (pulse: {pulse})")
    
    def set_tilt(self, angle):
        """
        Set tilt servo angle
        
        Args:
            angle: Angle in degrees (-90 to +90, 0 is center)
                  Positive = up, Negative = down
        """
        pulse = self._angle_to_pulse(angle)
        self.tilt_position = pulse
        self.pi.set_servo_pulsewidth(self.tilt_pin, pulse)
        print(f"📹 Tilt set to {angle}° (pulse: {pulse})")
    
    def move_pan_relative(self, delta_angle):
        """
        Move pan servo by a relative amount
        
        Args:
            delta_angle: Change in angle (positive = right, negative = left)
        """
        # Calculate current angle from pulse width
        current_angle = ((self.pan_position - self.center_pulse) / 
                        ((self.max_pulse - self.min_pulse) / 2)) * 90
        
        # Calculate new angle
        new_angle = current_angle + delta_angle
        
        # Set new position
        self.set_pan(new_angle)
    
    def move_tilt_relative(self, delta_angle):
        """
        Move tilt servo by a relative amount
        
        Args:
            delta_angle: Change in angle (positive = up, negative = down)
        """
        # Calculate current angle from pulse width
        current_angle = ((self.tilt_position - self.center_pulse) / 
                        ((self.max_pulse - self.min_pulse) / 2)) * 90
        
        # Calculate new angle
        new_angle = current_angle + delta_angle
        
        # Set new position
        self.set_tilt(new_angle)
    
    def center(self):
        """Center both servos"""
        print("📹 Centering camera servos...")
        self.set_pan(0)
        self.set_tilt(0)
    
    def handle_joystick_command(self, x_value, y_value):
        """
        Handle joystick input for camera control
        
        Args:
            x_value: X-axis value (-100 to +100, 0 is center)
                    Positive = right, Negative = left
            y_value: Y-axis value (-100 to +100, 0 is center)
                    Positive = up, Negative = down
        """
        # Convert joystick values (-100 to +100) to angles (-90 to +90)
        pan_angle = (x_value / 100.0) * 90
        tilt_angle = (y_value / 100.0) * 90
        
        # Set servo positions
        self.set_pan(pan_angle)
        self.set_tilt(tilt_angle)
    
    def cleanup(self):
        """Clean up servos - center and disable"""
        print("🧹 Cleaning up camera servos...")
        self.center()
        time.sleep(0.5)
        
        # Disable servo outputs
        self.pi.set_servo_pulsewidth(self.pan_pin, 0)
        self.pi.set_servo_pulsewidth(self.tilt_pin, 0)
        
        print("✓ Camera servos cleaned up")
