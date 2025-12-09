import board
import busio
import adafruit_bmp280

class BMP280Sensor:
    def __init__(self, i2c_bus=None, address=0x76):
        self.i2c_bus = i2c_bus or busio.I2C(board.SCL, board.SDA)
        self.address = address
        self.bmp280 = None
        
        self._initialize()

    def _initialize(self):
        """Initialize BMP280 sensor"""
        try:
            self.bmp280 = adafruit_bmp280.Adafruit_BMP280_I2C(
                self.i2c_bus, address=self.address
            )
            
            # Configure sensor settings
            self.bmp280.sea_level_pressure = 1013.25
            self.bmp280.mode = adafruit_bmp280.MODE_NORMAL
            self.bmp280.standby_period = adafruit_bmp280.STANDBY_TC_500
            self.bmp280.iir_filter = adafruit_bmp280.IIR_FILTER_X16
            self.bmp280.overscan_pressure = adafruit_bmp280.OVERSCAN_X16
            self.bmp280.overscan_temperature = adafruit_bmp280.OVERSCAN_X2
            
            print("✓ BMP280 initialized successfully")
            return True
            
        except Exception as e:
            print(f"[ERROR] BMP280 not found at {self.address}: {e}")
            self.bmp280 = None
            return False

    def read_data(self):
        """Read environmental sensor data"""
        if not self.bmp280:
            return {
                "temperature": "Sensor Not Found",
                "pressure": "Sensor Not Found", 
                "altitude": "Sensor Not Found"
            }

        try:
            return {
                "temperature": round(self.bmp280.temperature, 2),
                "pressure": round(self.bmp280.pressure, 2),
                "altitude": round(self.bmp280.altitude, 2)
            }
        except Exception as e:
            print(f"[BMP280 Read Error] {e}")
            return {
                "temperature": "Read Error",
                "pressure": "Read Error",
                "altitude": "Read Error"
            }

    def set_sea_level_pressure(self, pressure):
        """Set sea level pressure for altitude calculation"""
        if self.bmp280:
            self.bmp280.sea_level_pressure = pressure

    def is_connected(self):
        """Check if sensor is connected and working"""
        return self.bmp280 is not None