# HU Surveillance Robot 🚓📡

A smart surveillance system built using an **ESP32** microcontroller and a **React/Vite** web dashboard. This project enables real-time sensor monitoring, camera streaming, and robot control over a wireless network.

---

## 📁 Project Structure

Surveillance_robot/
├── ESP32/         # ESP32 Arduino sketch
│   └── ESP32.ino
├── webApp/                 # React frontend
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── docs/                   # Optional project documentation
│   └── system-overview.md
├── .gitignore
├── README.md

---

## 🔧 Features

- 📹 Live video streaming
- 📍 Real-time GPS tracking (`gpsMap.jsx`)
- 🔋 Battery monitoring (`batteryWidget.jsx`)
- 🌡 Sensor data dashboard (`sensorWidget.jsx`, `dataStrip.jsx`)
- 🎮 Web-based robot control
- 🧠 Modular UI components with reusable widgets

---

## 🚀 Getting Started

### 1. Clone the Repository

git clone https://github.com/abbas701/Surveillance_robot.git
cd Surveillance_robot

### 2. Setup ESP32 (Arduino)
- Open ESP32.ino in the Arduino IDE
- Install required libraries (e.g., WiFi, WebServer, etc.)
- Connect your ESP32 board and upload the sketch

### 3. Setup Web Dashboard
- cd webApp
- npm install
- npm run dev

### Tech Stack
- Microcontroller: ESP32 dev module
- Frontend: React
- Charting: Recharts or D3.js (if used)
- Communication: WebSockets / HTTP (depending on setup)

### 📷 Screenshots
Add screenshots or gifs of the dashboard and live video feed here.
![alt text](./public/dashboard.png)

### 📜 License
MIT License. Feel free to use and improve.

### 🤝 Contributing
- Pull requests and feedback are welcome! Open an issue for bugs, suggestions, or ideas.

### 📬 Contact
- Abbas Ali
- GitHub: @abbas701
- Email: your_email@example.com





















# Surveillance Robot — Monorepo 🚀

A full-stack, Raspberry-Pi–powered surveillance robot with real-time video streaming, motion control, sensor telemetry, and a web dashboard.  
This repository follows a **monorepo structure**, keeping all robot logic, backend, and frontend in one place.

---

## 📁 Project Structure

/ (root)
│
├── webApp/ # React web dashboard (frontend)
├── backend/ # Node.js + Express API / MQTT / authentication
├── rpi-code/ # Raspberry Pi firmware (C++ + Python)
│
├── README.md
└── .gitignore

yaml
Copy code

---

## 🧠 Features

### 🔹 **Surveillance Robot (Raspberry Pi)**
- Live video streaming using libcamera / ffmpeg  
- Pololu 37D encoder-based motion control  
- PID closed-loop movement (encoder + MPU6050 yaw correction)  
- Sensor suite:
  - MPU6050 (IMU)
  - BMP280 (pressure/temperature)
  - MQ2 & MQ135 gas sensors
  - ACS712 current sensor
  - Custom voltage divider battery monitor  
- ADS1115 ADC for high precision readings  
- MQTT/HTTP communication  
- Real-time telemetry logging  

---

### 🔹 **Backend (Node.js / Express)**
- REST API + WebSockets  
- MQTT broker integration  
- JWT authentication (HTTP-only cookies)  
- Role-based access system  
- PostgreSQL database integration  
- Data logging + analytics endpoints  
- Future: Docker support  

---

### 🔹 **Web Dashboard (React + Vite)**
- Real-time sensor data display  
- Live video stream player  
- Manual robot controls (joystick / WASD / buttons)  
- System status page  
- Charts + visual telemetry  
- Authentication system  
- Clean UI with TailwindCSS  

---

## 🧩 Tech Stack

- **Hardware:** Raspberry Pi 3/4, Pololu 37D motors, MPU6050, ADS1115  
- **Languages:** C++ (motor control), Python (camera), JavaScript  
- **Frontend:** React, Vite, TailwindCSS  
- **Backend:** Node.js, Express, PostgreSQL  
- **Communication:** MQTT, WebSockets  
- **Deployment:** Nginx / PM2 / Systemd  
- **Version Control:** Git Monorepo  

---

## 🚀 Getting Started

### 1. Clone the repository
git clone https://github.com/abbas701/Surveillance_robot.git
cd Surveillance_robot

shell
Copy code

### 2. Install frontend dependencies
cd webApp
npm install
npm run dev

shell
Copy code

### 3. Install backend dependencies
cd ../backend
npm install
npm run dev

shell
Copy code

### 4. Raspberry Pi Setup
cd ../rpi-code

compile C++ firmware
make

or Python environment setup
pip install -r requirements.txt

yaml
Copy code

---

## 🛠 Monorepo Standards

- `main` → production-ready  
- `dev` → active development  
- Feature branches:
  - `feat/...`
  - `fix/...`
  - `chore/...`  
- PRs must pass:
  - lint checks  
  - build checks  
  - robot firmware compile test  

---

## ✨ Future Enhancements

- Object detection with OpenCV + Python  
- Autonomous navigation with SLAM  
- WebRTC for ultra-low latency video  
- Cloud dashboard & analytics  
- Full Docker/Kubernetes deployment  

---

## 👤 Author

**Abbas Ali**  
Computer Engineering, Karachi  
Nature, wildlife & robotics enthusiast  

---

## 📝 License
MIT License  
Feel free to fork and contribute 🚀

