import RPi.GPIO as GPIO
import time
ENA = 12  # Right motor PWM
IN1 = 7  # Right motor forward
IN2 = 8  # Right motor backward
IN3 = 15  # Left motor forward
IN4 = 14  # Left motor backward
ENB = 18  # Left motor PWM


GPIO.setmode(GPIO.BCM)
GPIO.setwarnings(False)
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
def forward(right_speed,left_speed):
   # Right Motor (Forward)
    GPIO.output(IN3, GPIO.HIGH)
    GPIO.output(IN4, GPIO.LOW)
    pwm_right.ChangeDutyCycle(right_speed)
    
    # Left Motor (Forward)
    GPIO.output(IN1, GPIO.HIGH)
    GPIO.output(IN2, GPIO.LOW)
    pwm_left.ChangeDutyCycle(left_speed)

while True:
    forward(50,50)
    time.sleep(0.2)