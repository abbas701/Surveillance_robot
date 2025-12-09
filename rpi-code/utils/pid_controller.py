import time
import math
from simple_pid import PID


class StraightLinePIDController:
    """
    PID Controller for maintaining straight line movement.
    Combines encoder RPM differences and MPU6050 x-axis angle deviation.
    """
    
    def __init__(self, config):
        """Initialize PID controllers for straight line movement"""
        self.config = config
        
        # Get PID parameters from config (using tunings property for safety)
        try:
            left_kp, left_ki, left_kd = config.PID_CONFIG["left"].tunings
        except (AttributeError, KeyError):
            # Fallback: extract from environment or use defaults
            import os
            pid_left = [float(x) for x in os.getenv("PID_LEFT", "0,0,1").split(",")]
            left_kp, left_ki, left_kd = pid_left[0], pid_left[1], pid_left[2]
        
        try:
            yaw_kp, yaw_ki, yaw_kd = config.PID_CONFIG["yaw"].tunings
        except (AttributeError, KeyError):
            # Fallback: extract from environment or use defaults
            import os
            pid_yaw = [float(x) for x in os.getenv("PID_YAW", "0,0,2").split(",")]
            yaw_kp, yaw_ki, yaw_kd = pid_yaw[0], pid_yaw[1], pid_yaw[2]
        
        # PID for encoder RPM synchronization (left vs right motor speed)
        # Setpoint is 0 (no difference in RPM)
        self.pid_rpm = PID(
            Kp=left_kp,
            Ki=left_ki,
            Kd=left_kd,
            setpoint=0,
            output_limits=(-50, 50)
        )
        self.pid_rpm.set_auto_mode(True)
        
        # PID for x-axis angle deviation (roll angle from MPU6050)
        # Setpoint is 0 (no tilt, perfectly level)
        # Using yaw PID config for angle correction
        self.pid_angle = PID(
            Kp=yaw_kp,
            Ki=yaw_ki,
            Kd=yaw_kd,
            setpoint=0,
            output_limits=(-50, 50)
        )
        self.pid_angle.set_auto_mode(True)
        
        # Weight factors for combining corrections
        self.rpm_weight = 0.6  # Weight for RPM-based correction
        self.angle_weight = 0.4  # Weight for angle-based correction
        
    def compute_correction(self, left_rpm, right_rpm, x_angle):
        """
        Compute PID correction for straight line movement.
        
        Args:
            left_rpm: Left motor RPM
            right_rpm: Right motor RPM
            x_angle: X-axis angle (roll) from MPU6050 in degrees
            
        Returns:
            correction: Combined correction value (-50 to 50)
        """
        # Calculate RPM error (positive means left is faster)
        rpm_error = left_rpm - right_rpm
        
        # Calculate angle error (positive means tilting right, need to correct left)
        # For a 2-wheeled robot, if x-axis angle is positive (tilted right),
        # we need to slow down right motor or speed up left motor
        angle_error = x_angle
        
        # Get PID corrections
        rpm_correction = self.pid_rpm(rpm_error)
        angle_correction = self.pid_angle(angle_error)
        
        # Combine corrections with weights
        # Positive correction means increase left motor, decrease right motor
        combined_correction = (self.rpm_weight * rpm_correction + 
                              self.angle_weight * angle_correction)
        
        return combined_correction
    
    def reset(self):
        """Reset PID controllers"""
        self.pid_rpm.reset()
        self.pid_angle.reset()
    
    def set_auto_mode(self, enabled):
        """Enable/disable auto mode for PID controllers"""
        self.pid_rpm.set_auto_mode(enabled)
        self.pid_angle.set_auto_mode(enabled)
