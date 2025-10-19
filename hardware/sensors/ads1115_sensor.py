import board
import busio
from adafruit_ads1x15.ads1115 import ADS1115
from adafruit_ads1x15.analog_in import AnalogIn
from adafruit_ads1x15.ads import ADS

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

            # Initialize analog input channels
            self.channels = {
                "mq2": AnalogIn(self.ads, ADS.P0),
                "mq135": AnalogIn(self.ads, ADS.P1),
                "battery_current": AnalogIn(self.ads, ADS.P2),
                "battery_voltage": AnalogIn(self.ads, ADS.P3),
            }

            print("✓ ADS1115 initialized successfully")
            return True

        except Exception as e:
            print(f"[ERROR] ADS1115 not found at {self.address}: {e}")
            self.ads = None
            self.channels = {}
            return False

    def read_gas_sensors(self):
        """Read MQ2 and MQ135 gas sensor data"""
        try:
            return {
                "MQ2": {
                    "value": round(self.channels["mq2"].value, 2) / 32767
                    if "mq2" in self.channels
                    else "Sensor Not Found",
                    "voltage": round(self.channels["mq2"].voltage, 2)
                    if "mq2" in self.channels
                    else "Sensor Not Found",
                },
                "MQ135": {
                    "value": round(self.channels["mq135"].value, 2) / 32767
                    if "mq135" in self.channels
                    else "Sensor Not Found",
                    "voltage": round(self.channels["mq135"].voltage, 2)
                    if "mq135" in self.channels
                    else "Sensor Not Found",
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
            return {
                "battery_current": {
                    "value": round(self.channels["battery_current"].value, 2) / 32767
                    if "battery_current" in self.channels
                    else "Sensor Not Found",
                    "voltage": round(self.channels["battery_current"].voltage, 2)
                    if "battery_current" in self.channels
                    else "Sensor Not Found",
                },
                "battery_voltage": {
                    "value": round(self.channels["battery_voltage"].value, 2) / 32767
                    if "battery_voltage" in self.channels
                    else "Sensor Not Found",
                    "voltage": round(self.channels["battery_voltage"].voltage, 2)
                    if "battery_voltage" in self.channels
                    else "Sensor Not Found",
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
