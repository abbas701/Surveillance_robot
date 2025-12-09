import board
import busio
from adafruit_ads1x15.ads1115 import ADS1115
from adafruit_ads1x15.analog_in import AnalogIn
from adafruit_ads1x15.ads1x15 import Mode

class ADS1115Sensor:
    def __init__(self, i2c_bus=None, address=0x48, gain=1):
        self.i2c_bus = i2c_bus or busio.I2C(board.SCL, board.SDA)
        self.address = address
        self.gain = gain
        self.ads = None
        self.channels = {}

        self._initialize()

    def _initialize(self):
        """Initialize ADS1115 sensor and channels"""
        try:
            self.ads = ADS1115(self.i2c_bus, address=self.address)
            self.ads.gain = self.gain
            self.ads.mode = Mode.CONTINUOUS  # Continuous conversion mode

            # Initialize analog input channels - FIXED CONSTANTS
            self.channels = {
                "mq2": AnalogIn(self.ads, 0),           # Channel 0
                "mq135": AnalogIn(self.ads, 1),         # Channel 1  
                "battery_current": AnalogIn(self.ads, 2),  # Channel 2
                "battery_voltage": AnalogIn(self.ads, 3),  # Channel 3
            }

            print("✓ ADS1115 initialized successfully")
            print(f"  Address: 0x{self.address:02x}")
            print(f"  Gain: {self.ads.gain}")
            print(f"  Mode: {self.ads.mode}")
            return True

        except Exception as e:
            print(f"[ERROR] ADS1115 not found at 0x{self.address:02x}: {e}")
            self.ads = None
            self.channels = {}
            return False

    def read_gas_sensors(self):
        """Read MQ2 and MQ135 gas sensor data"""
        try:
            if not self.ads:
                return {
                    "MQ2": {"value": "Sensor Not Found", "voltage": "Sensor Not Found"},
                    "MQ135": {"value": "Sensor Not Found", "voltage": "Sensor Not Found"},
                }

            return {
                "MQ2": {
                    "value": round(self.channels["mq2"].value, 2),
                    "voltage": round(self.channels["mq2"].voltage, 2),
                },
                "MQ135": {
                    "value": round(self.channels["mq135"].value, 2),
                    "voltage": round(self.channels["mq135"].voltage, 2),
                },
            }
        except Exception as e:
            print(f"[ADS1115 Gas Sensors Read Error] {e}")
            return {
                "MQ2": {"value": "Read Error", "voltage": "Read Error"},
                "MQ135": {"value": "Read Error", "voltage": "Read Error"},
            }

    def read_battery(self):
        """Read Current and Voltage of the battery"""
        try:
            if not self.ads:
                return {
                    "battery_current": {"value": "Sensor Not Found", "voltage": "Sensor Not Found"},
                    "battery_voltage": {"value": "Sensor Not Found", "voltage": "Sensor Not Found"},
                }

            return {
                "battery_current": {
                    "value": round(self.channels["battery_current"].value, 2),
                    "voltage": round(self.channels["battery_current"].voltage, 2),
                },
                "battery_voltage": {
                    "value": round(self.channels["battery_voltage"].value, 2),
                    "voltage": round(self.channels["battery_voltage"].voltage, 2),
                },
            }
        except Exception as e:
            print(f"[ADS1115 Battery Read Error] {e}")
            return {
                "battery_current": {"value": "Read Error", "voltage": "Read Error"},
                "battery_voltage": {"value": "Read Error", "voltage": "Read Error"},
            }

    def read_channel(self, channel_name):
        """Read specific channel by name"""
        if channel_name in self.channels:
            channel = self.channels[channel_name]
            return {"value": channel.value, "voltage": channel.voltage}
        return {"value": "Channel Not Found", "voltage": "Channel Not Found"}

    def is_connected(self):
        """Check if sensor is connected and working"""
        return self.ads is not None

    def print_debug_info(self):
        """Print debug information about all channels"""
        if not self.ads:
            print("ADS1115 not connected")
            return
        
        print("ADS1115 Debug Info:")
        print(f"  Gain: {self.ads.gain}")
        print(f"  Data Rate: {self.ads.data_rate}")
        print(f"  Mode: {self.ads.mode}")
        
        for name, channel in self.channels.items():
            print(f"  {name}: value={channel.value}, voltage={channel.voltage:.3f}V")