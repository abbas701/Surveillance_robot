import pigpio
import time

pi = pigpio.pi()
A = 26  # Left Encoder A
B = 19  # Left Encoder B
pi.set_mode(A, pigpio.INPUT)
pi.set_mode(B, pigpio.INPUT)
pi.set_pull_up_down(A, pigpio.PUD_UP)
pi.set_pull_up_down(B, pigpio.PUD_UP)

ticks = 0

def callback_A(gpio, level, tick):
    global ticks
    b = pi.read(B)
    if b == 0:
        ticks += 1
    else:
        ticks -= 1

cb = pi.callback(A, pigpio.EITHER_EDGE, callback_A)

print("Rotate motor... press Ctrl+C to stop")
try:
    while True:
        print(f"Ticks: {ticks}")
        time.sleep(0.2)
except KeyboardInterrupt:
    cb.cancel()
    pi.stop()
