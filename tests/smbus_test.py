from smbus2 import SMBus

bus = SMBus(1)
address = 0x68

# WHO_AM_I register = 0x75
who_am_i = bus.read_byte_data(address, 0x75)
print("WHO_AM_I:", hex(who_am_i))
