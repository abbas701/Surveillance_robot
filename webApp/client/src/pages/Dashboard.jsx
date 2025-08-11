import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import api from '../lib/api';
import Sidebar from '../components/Sidebar';
import BarChart from '../charts/barChart';
import LineGraph from '../charts/lineGraph';
import PieChart from '../charts/pieChart';
import WifiWidget from '../widgets/wifiWidget';
import BatteryWidget from '../widgets/batteryWidget';
import SensorWidget from '../widgets/sensorWidget';
import LocomotiveControls from '../controls/locomotiveControls';
import CameraControls from '../controls/cameraControls';
import ThemeWidget from '../widgets/themeWidget';
import VideoStream from '../components/videoStream';
import GPSMap from '../components/gpsMap';
import CalibrationControls from '../controls/CalibrationControls';
import '../App.css';

function Dashboard() {
  const [theme, setTheme] = useState("light");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sensorData, setSensorData] = useState(null);
  const [error, setError] = useState(null);
  const [robotStatus, setRobotStatus] = useState('offline');
  const [calibrationFeedback, setCalibrationFeedback] = useState(null);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);
  }, [theme]);

  const checkRobotStatus = async () => {
    try {
      const response = await api.get('/robot/status');
      setRobotStatus(response.data.status);
      setError(null);
    } catch (err) {
      console.error('Status check error:', err);
      setRobotStatus('offline');
      setError('Failed to check robot status');
    }
  };

  const fetchData = async () => {
    if (robotStatus !== 'online') return;
    try {
      const response = await api.get('/sensors/latest');
      if (response.data.success) {
        setSensorData(response.data.data);
        setError(null);
      }
    } catch (err) {
      setError('Error fetching data');
      console.error('Fetch error:', err.response?.status, err.response?.data, err.message);
    }
  };

  const fetchCalibrationFeedback = async () => {
    try {
      const response = await api.get('/calibration/latest');
      if (response.data.success) {
        setCalibrationFeedback(response.data.data);
      }
    } catch (err) {
      console.error('Calibration feedback error:', err);
      setError('Failed to fetch calibration feedback');
    }
  };

  useEffect(() => {
    checkRobotStatus();
    const statusInterval = setInterval(checkRobotStatus, 5000);
    const dataInterval = setInterval(fetchData, 1000);
    return () => {
      clearInterval(statusInterval);
      clearInterval(dataInterval);
    };
  }, [robotStatus]);

  useEffect(() => {
    console.log('Sensor data updated:', sensorData);
  }, [sensorData]);

  const sendCommand = async (commandData) => {
    try {
      await api.post('/robot/command', commandData);
      console.log('Command sent:', commandData);
    } catch (err) {
      console.error('Command error:', err.response?.status, err.message);
      setError('Failed to send command');
    }
  };

  const sendCalibrationCommand = async (quantity) => {
    try {
      await api.post('/robot/calibrate', { quantity });
      console.log(`Calibration command sent: ${quantity}`);
      fetchCalibrationFeedback();
    } catch (err) {
      console.error('Failed to send calibration command:', err);
      setError(`Failed to send calibration command: ${quantity}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleAdminUsers = () => {
    if (user?.designation === 'admin') {
      navigate('/admin/users');
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
          <Sidebar
            collapse={sidebarCollapsed}
            setCollapse={setSidebarCollapsed}
            onAdminUsers={handleAdminUsers}
            isAdmin={user?.designation === 'admin'}
          />
        </aside>
        <main className="main-area">
          <header className="topbar-area">
            <div className="dashboard-title">
              <h1>Dashboard</h1>
              <span>Welcome, {user?.username}!</span>
            </div>
            {robotStatus !== 'online' ? (
              <p style={{ color: 'red' }}>Robot is offline</p>
            ) : !sensorData || Object.keys(sensorData).length === 0 ? (
              <p>No data available</p>
            ) : (
              <div className="vital-stats">
                <SensorWidget
                  sensorData={{
                    type: "Timestamp",
                    value: sensorData.timestamp ? new Date(sensorData.timestamp).toLocaleString() : 'N/A',
                    unit: "",
                  }}
                />
                <SensorWidget
                  sensorData={{
                    type: "Voltage",
                    value: sensorData.battery?.voltage?.toFixed(2) || 'N/A',
                    unit: "V"
                  }}
                />
                <SensorWidget
                  sensorData={{
                    type: "Current",
                    value: sensorData.battery?.current?.toFixed(2) || 'N/A',
                    unit: "mA"
                  }}
                />
                <SensorWidget
                  sensorData={{
                    type: "Roll",
                    value: sensorData.orientation?.roll?.toFixed(2) || 'N/A',
                    unit: "°"
                  }}
                />
                <SensorWidget
                  sensorData={{
                    type: "Temperature",
                    value: sensorData.environment?.temperature?.toFixed(2) || 'N/A',
                    unit: "°C",
                  }}
                />
                <SensorWidget
                  sensorData={{
                    type: "Pressure",
                    value: sensorData.environment?.pressure?.toFixed(2) || 'N/A',
                    unit: "Pa",
                  }}
                />
                <SensorWidget
                  sensorData={{
                    type: "Altitude",
                    value: sensorData.environment?.altitude?.toFixed(2) || 'N/A',
                    unit: "m",
                  }}
                />
                <WifiWidget bar="4" />
                <BatteryWidget percent={90} charging={true} />
              </div>
            )}
            <ThemeWidget onThemeChange={setTheme} />
            <div className="user-info">
              <span>Hello, {user?.username} ({user?.designation})</span>
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
    </div>
  );
}

export default Dashboard;