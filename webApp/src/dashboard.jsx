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
import axios from 'axios';

function Dashboard({ setLoggedIn }) {
  const [theme, setTheme] = useState("light");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sensorData, setSensorData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);
  }, [theme]);

  const fetchData = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/data', {
        withCredentials: true,
      });
      // console.log('Fetched data:', response.data);
      setSensorData(response.data);
      setError(null);
    } catch (err) {
      setError('Error fetching data');
      console.error('Fetch error:', err.response?.status, err.response?.data, err.message);
    }
  };

  useEffect(() => {
    console.log('Sensor data updated:', sensorData);
  }, [sensorData]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 1000); // Match 1-second publish
    return () => clearInterval(interval);
  }, []);

  const sendCommand = async ({ action, value, speed, mode }) => {
    try {
      const response = await axios.post(
        'http://localhost:3000/api/command',
        { action, value, speed, mode },
        { withCredentials: true }
      );
      console.log('Command sent:', response.data);
    } catch (err) {
      console.error('Command error:', err.response?.status, err.message);
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
            <div className="vital-stats">
              {error && <p style={{ color: 'red' }}>{error}</p>}
              {!sensorData || !sensorData.temperature ? (
                <p>No data available</p>
              ) : (
                <>
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
                </>
              )}
            </div>
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
            <div className="widget widget-lineGraph"><LineGraph /></div>
            <div className="widget widget-cameraControls"><CameraControls mode="manual" onButtonPress={sendCommand} /></div>
            <div className="widget widget-locomotiveControls"><LocomotiveControls onButtonPress={sendCommand} /></div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;