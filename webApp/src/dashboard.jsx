import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';
import Sidebar from './Sidebar';
import BarChart from './barChart';
import LineGraph from './lineGraph';
import PieChart from './pieChart';
import WifiWidget from './wifiWidget';
import BatteryWidget from './batteryWidget';
import SensorWidget from './sensorWidget';
import LocomotiveControls from './locomotiveControls';
import CameraControls from './cameraControls';
import ThemeWidget from './themeWidget';
import VideoStream from './videoStream';
import GPSMap from './gpsMap';
import CalibrationControls from './CalibrationControls';
import axios from 'axios';

function Dashboard({ setLoggedIn }) {
  const [theme, setTheme] = useState("light");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sensorData, setSensorData] = useState(null);
  const [error, setError] = useState(null);
  const [robotStatus, setRobotStatus] = useState('offline'); // Track robot status

  useEffect(() => {
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);
  }, [theme]);
  const checkRobotStatus = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/status', {
        withCredentials: true,
      });
      setRobotStatus(response.data.status);
      setError(null);
    } catch (err) {
      console.error('Status check error:', err);
      setRobotStatus('offline');
      setError('Failed to check robot status');
    }
  };
  const fetchData = async () => {
    if (robotStatus !== 'online') return; // Skip fetching if robot is offline
    try {
      const response = await axios.get('http://localhost:3000/api/data', {
        withCredentials: true,
      });
      console.log('Fetched data:', response.data);
      setSensorData(response.data);
      setError(null);
    } catch (err) {
      setError('Error fetching data');
      console.error('Fetch error:', err.response?.status, err.response?.data, err.message);
    }
  };

  const fetchCalibrationFeedback = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/calibration', {
        withCredentials: true,
      });
      console.log(response.data)
      // setCalibrationFeedback(response.data);
    } catch (err) {
      console.error('Calibration feedback error:', err);
      setError('Failed to fetch calibration feedback');
    }
  };

  useEffect(() => {
    checkRobotStatus(); // Initial status check
    const statusInterval = setInterval(checkRobotStatus, 5000); // Check status every 5 seconds
    const dataInterval = setInterval(fetchData, 1000); // Fetch data every 1 second if online
    return () => {
      clearInterval(statusInterval);
      clearInterval(dataInterval);
    };
  }, [robotStatus]);
  useEffect(() => {
    console.log('Sensor data updated:', sensorData);
  }, [sensorData]);

  const sendCommand = async ({ action, speed, angle, mode, value }) => {
    try {
      const response = await axios.post(
        'http://localhost:3000/api/command',
        { action, speed, angle, mode, value },
        { withCredentials: true }
      );
      console.log('Command sent:', { action, value, speed, mode, angle });
    } catch (err) {
      console.error('Command error:', err.response?.status, err.message);
    }
  };

  const sendCalibrationCommand = async (quantity) => {
    try {
      await axios.post('http://localhost:3000/api/calibrate', { quantity }, { withCredentials: true });
      console.log(`Calibration command sent: ${quantity}`);
      fetchCalibrationFeedback(); // Fetch feedback immediately
    } catch (err) {
      console.error('Failed to send calibration command:', err);
      setError(`Failed to send calibration command: ${quantity}`);
    }
  };

  // const navigate = useNavigate();
  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:3000/logout', {}, { withCredentials: true });
      setLoggedIn(false);
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div
      style={{
        backgroundColor: theme === "dark" ? "#0a192f" : "white",
        color: theme === "dark" ? "white" : "black",
      }}
      className="App"
    >
      <div className={`dashboard-layout${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        <aside className="sidebar-area">
          <Sidebar collapse={sidebarCollapsed} setCollapse={setSidebarCollapsed} />
        </aside>
        <main className="main-area">
          <header className="topbar-area">
            <div className="dashboard-title">
              <h1>Dashboard</h1>
              <span>Welcome!</span>
            </div>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {robotStatus !== 'online' ? (
              <p style={{ color: 'red' }}>Robot is offline</p>
            ) : !sensorData || Object.keys(sensorData).length === 0 ? (<p>No data available</p>) : (
              <div className="vital-stats">
                <SensorWidget
                  sensorData={{
                    type: "Timestamp",
                    value: sensorData.timestamp ? new Date(sensorData.timestamp).toLocaleString() : 'N/A',
                    unit: "",
                  }}
                />
                <SensorWidget sensorData={{ type: "Voltage", value: "23", unit: "V" }} />
                <SensorWidget sensorData={{ type: "Current", value: "250", unit: "mA" }} />
                <SensorWidget sensorData={{ type: "Inclination", value: "23", unit: "°" }} />
                <SensorWidget
                  sensorData={{
                    type: "Temperature",
                    value: sensorData.temperature?.toFixed(2) || 'N/A',
                    unit: "°C",
                  }}
                />
                <SensorWidget
                  sensorData={{
                    type: "Pressure",
                    value: sensorData.pressure?.toFixed(2) || 'N/A',
                    unit: "hPa",
                  }}
                />
                <SensorWidget
                  sensorData={{
                    type: "Altitude",
                    value: sensorData.altitude?.toFixed(2) || 'N/A',
                    unit: "m",
                  }}
                />
                <WifiWidget bar="4" />
                <BatteryWidget percent={90} charging={true} />
                <ThemeWidget onThemeChange={setTheme} />
              </div>
            )}

            <div className="user-info">
              <span>Hello, XYZ</span>
              <button onClick={handleLogout}>Logout</button>
            </div>
          </header>
          <section className="widgets-grid">
            <div className="widget widget-barChart"><BarChart /></div>
            <div className="widget widget-gps"><GPSMap /></div>
            <div className="widget widget-pieChart"><PieChart /></div>
            <div className="widget widget-video"><VideoStream /></div>
            <div className="widget widget-lineGraph"><LineGraph rawData={sensorData} theme={theme} /></div>
            <div className="widget widget-cameraControls"><CameraControls mode="manual" onButtonPress={sendCommand} /></div>
            <div className="widget widget-locomotiveControls"><LocomotiveControls onButtonPress={sendCommand} /></div>
            <div className="widget widget-calibrationControls"><CalibrationControls onCalibrate={sendCalibrationCommand} /></div>
          </section>
        </main>
      </div>
    </div >
  );
}

export default Dashboard;