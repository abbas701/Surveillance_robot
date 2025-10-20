import pigpio


class Encoder:
    def __init__(self, pi, pin_a, pin_b):
        self.pi = pi
        self.pin_a = pin_a
        self.pin_b = pin_b
        self.ticks = 0
        self.last_gpio = 0

        self.pi.set_mode(pin_a, pigpio.INPUT)
        self.pi.set_pull_up_down(pin_a, pigpio.PUD_UP)
        self.pi.set_mode(pin_b, pigpio.INPUT)
        self.pi.set_pull_up_down(pin_b, pigpio.PUD_UP)

        self.cb = pi.callback(pin_a, pigpio.EITHER_EDGE, self._callback)

    def _callback(self, gpio, level, tick):
        b = self.pi.read(self.pin_b)
        if gpio == self.pin_a:
            self.ticks += 1 if b == 0 else -1

    def reset(self):
        self.ticks = 0

    def get_ticks(self):
        return self.ticks
