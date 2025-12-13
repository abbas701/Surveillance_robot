
















# HU Surveillance Robot 🚓📡

A full-stack, Raspberry Pi-powered surveillance robot with real-time video streaming, camera mount control, motion control with PID stabilization, sensor telemetry, network monitoring, and a web dashboard. This repository follows a **monorepo structure**, keeping all robot logic, backend, and frontend in one place.

---

## 📁 Project Structure

```
Surveillance_robot/
│
├── rpi-code/                    # Raspberry Pi Python code
│   ├── config/                  # Robot configuration
│   │   └── robot_config.py      # GPIO pins, MQTT, PID settings
│   ├── hardware/                # Hardware control modules
│   │   ├── motors.py            # Motor controller with encoders
│   │   ├── servos.py            # Camera mount servo control (pan/tilt)
│   │   ├── encoders.py          # Encoder tick counting
│   │   ├── camera_server.py     # Camera streaming server
│   │   └── sensors/             # Sensor modules
│   ├── network/                 # Network communication
│   │   ├── mqtt_client.py       # MQTT client for robot commands
│   │   └── network_monitor.py   # WiFi signal and network metrics
│   ├── utils/                   # Utility modules
│   │   ├── pid_controller.py    # PID controller for straight-line movement
│   │   └── helpers.py           # Helper functions
│   ├── master_controller.py     # Main robot control loop
│   └── requirements.txt         # Python dependencies
│
├── webApp/                      # React web dashboard
│   ├── backend/                 # Node.js backend
│   │   └── src/
│   │       ├── mqtt/            # MQTT client integration
│   │       ├── routes/          # API routes
│   │       └── services/        # Database & Redis services
│   ├── src/                     # React frontend
│   │   ├── locomotion/          # Robot movement controls
│   │   │   └── joystickControl.jsx  # Locomotion joystick
│   │   ├── camera/              # Camera controls
│   │   │   ├── cameraStream.jsx     # Video feed display
│   │   │   ├── cameraJoystick.jsx   # Camera mount joystick
│   │   │   └── cameraControls.jsx   # Camera control panel
│   │   ├── widgets/             # Dashboard widgets
│   │   │   ├── sensorWidget.jsx     # Sensor data display
│   │   │   ├── batteryWidget.jsx    # Battery monitoring
│   │   │   └── wifiWidget.jsx       # Network status
│   │   └── dashboard.jsx        # Main dashboard
│   ├── package.json
│   └── vite.config.js
│
├── README.md
└── .gitignore
```

---

## 🧠 Features

### 🔹 **Surveillance Robot (Raspberry Pi)**
- **Live video streaming** using Picamera2 / libcamera
- **Camera mount control** with pan/tilt servos (2-axis movement)
- **Encoder-based motion control** with L298N motor driver
- **PID closed-loop movement** combining:
  - Encoder RPM synchronization
  - MPU6050 IMU angle correction
- **Sensor suite:**
  - MPU6050 (IMU - gyroscope & accelerometer)
  - BMP280 (pressure/temperature/altitude)
  - ADS1115 (16-bit ADC for analog sensors)
  - Battery voltage monitoring
- **Network monitoring** with WiFi signal strength and speed test
- **MQTT communication** for real-time command & telemetry
- **Modular hardware control** with pigpio

### 🔹 **Backend (Node.js / Express)**
- REST API for robot commands
- MQTT broker integration for real-time control
- PostgreSQL database for sensor data logging
- Redis caching for real-time dashboard updates
- Network data collection and storage
- Camera control command routing
- Session-based authentication

### 🔹 **Web Dashboard (React + Vite)**
- **Real-time sensor data display** with charts
- **Live video stream player** (MJPEG/MPEG)
- **Dual joystick controls:**
  - Locomotion joystick for robot movement
  - Camera joystick for pan/tilt control
- **Network monitoring widget** displaying WiFi signal
- **Battery and vital signs monitoring**
- **Theme support** (light/dark mode)
- **Responsive UI** with TailwindCSS
- **Real-time telemetry** via MQTT

---

## 🧩 Tech Stack

- **Hardware:** Raspberry Pi 3/4, L298N Motor Driver, MPU6050, BMP280, ADS1115, SG90 Servos
- **Languages:** Python (robot control), JavaScript (web)
- **Frontend:** React, Vite, TailwindCSS
- **Backend:** Node.js, Express, PostgreSQL, Redis
- **Communication:** MQTT (Mosquitto), HTTP REST API
- **Hardware Control:** pigpio (for PWM, servos, encoders)
- **Camera:** Picamera2 / libcamera

---

## 🚀 Getting Started

### Prerequisites
- Raspberry Pi 3/4 with Raspberry Pi OS
- Node.js 16+ installed
- PostgreSQL database
- Redis server
- Mosquitto MQTT broker

### 1. Clone the repository
```bash
git clone https://github.com/abbas701/Surveillance_robot.git
cd Surveillance_robot
```

### 2. Raspberry Pi Setup

```bash
cd rpi-code

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Create .env file with:
# - MQTT broker address
# - GPIO pin assignments
# - PID tuning parameters
# - Motor polarity settings

# Run the robot controller
python3 master_controller.py
```

### 3. Backend Setup

```bash
cd webApp/backend

# Install dependencies
npm install

# Configure environment variables
# Create .env file with:
# - Database connection
# - MQTT broker address
# - Redis connection

# Start services and backend
npm run dev
```

### 4. Frontend Setup

```bash
cd webApp

# Install dependencies
npm install

# Start development server
npm run dev
```

### 5. Access the Dashboard
- Open browser to `http://localhost:5173`
- Login with credentials
- Control robot via joysticks and camera controls

---

## 🎮 Controls

### Locomotion Control
- **Joystick:** Move in any direction with variable speed
- **PID stabilization** ensures straight-line movement
- **Emergency stop** button for safety
- **Headlights & Horn** controls

### Camera Control
- **Pan/Tilt joystick** for camera positioning (-90° to +90° on each axis)
- **Center button** to reset camera to neutral position
- **Real-time servo control** via MQTT

### Network Monitoring
- WiFi signal strength (dBm & percentage)
- Link speed (Mbps)
- IP address and SSID display
- Automatic periodic speed tests

---

## 📡 MQTT Topics

| Topic | Direction | Description |
|-------|-----------|-------------|
| `robot/locomotion` | Web → Pi | Movement commands (joystick, speed, angle) |
| `robot/camera/control` | Web → Pi | Camera servo commands (pan, tilt) |
| `robot/sensor_data` | Pi → Web | IMU, environmental, battery, encoder data |
| `robot/network` | Pi → Web | WiFi signal, speed, connectivity metrics |
| `robot/status` | Pi → Web | Robot online/offline status |
| `robot/calibration` | Web → Pi | Sensor calibration commands |

---

## 🔧 Configuration

### GPIO Pin Assignment (robot_config.py)
```python
# Motors (L298N)
MOTOR_LEFT_PWM = 18
MOTOR_LEFT_DIR1 = 14
MOTOR_LEFT_DIR2 = 15
MOTOR_RIGHT_PWM = 12
MOTOR_RIGHT_DIR1 = 7
MOTOR_RIGHT_DIR2 = 8

# Encoders
ENCODER_LEFT_A = 5
ENCODER_LEFT_B = 6
ENCODER_RIGHT_A = 13
ENCODER_RIGHT_B = 19

# Camera Servos
SERVO_PAN = 23    # Pan (left/right)
SERVO_TILT = 24   # Tilt (up/down)

# Misc
HORN = 17
HEADLIGHTS = 26
```

### PID Tuning
Adjust in `.env` file:
```
PID_LEFT=0,0,1
PID_RIGHT=0,0,1
PID_YAW=0,0,2
BASE_PWM=30
```

---

## 🛠 Development

### Branch Strategy
- `main` → stable production code
- Feature branches → `feat/feature-name`
- Bug fixes → `fix/bug-description`

### Code Style
- Python: Follow PEP 8
- JavaScript: ESLint configuration included
- Commit messages: Conventional commits format

---

## ✨ Future Enhancements

- Object detection with OpenCV
- Autonomous navigation with path planning
- WebRTC for ultra-low latency video
- Mobile app (React Native)
- Multi-robot coordination
- GPS integration for outdoor navigation
- Advanced telemetry analytics

---

## 🐛 Troubleshooting

### Robot moving in circles
- Check motor polarity settings in `robot_config.py`
- Verify motor wiring matches configuration
- Tune PID parameters in `.env`

### Camera servos not responding
- Ensure pigpio daemon is running: `sudo pigpiod`
- Check servo GPIO pins (23, 24)
- Verify servo power supply (5V, adequate current)

### Network data not updating
- Check MQTT broker connection
- Verify network monitor is publishing to `robot/network` topic
- Check backend MQTT subscription

---

## 👤 Author

**Abbas Ali**  
Computer Engineering, Karachi  
Robotics & Embedded Systems Enthusiast

- GitHub: [@abbas701](https://github.com/abbas701)
- Email: abbas@example.com

---

## 📝 License

MIT License - Feel free to fork and contribute 🚀

---

## 🤝 Contributing

Pull requests are welcome! For major changes:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

---

## 📚 Documentation

For detailed documentation on specific modules:
- See `MQTT_mosquitto_configuration.md` for MQTT setup
- Check inline code comments for function documentation
- Review `requirements.txt` for Python dependencies
- Review `package.json` for Node.js dependencies

