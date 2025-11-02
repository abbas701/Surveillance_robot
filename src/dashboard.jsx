import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import BarChart from './pictorial/barChart';
import LineGraph from './pictorial/lineGraph';
import PieChart from './pictorial/pieChart';
import VitalsStrip from './widgets/vitalsStrip';
import LocomotiveControls from './locomotion/locomotiveControls';
import CameraControls from './camera/cameraControls';
import CameraStream from './camera/cameraStream';
import MpegCameraStream from './camera/mpegCameraStream';
import GPSMap from './gps/gpsMap';
import CalibrationControls from './calibration/CalibrationControls';
import axios from 'axios';
import ThemeWidget from "./widgets/themeWidget";

function Dashboard({ setLoggedIn }) {
  const [theme, setTheme] = useState("light");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sensorData, setSensorData] = useState([]);
  const [currentVitals, setCurrentVitals] = useState(null);
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
      robotStatus == "offline" && setSensorData([]); setCurrentVitals(null);
      setError(null);
    } catch (err) {
      console.error('Status check error:', err);
      setRobotStatus('offline');
      setSensorData([]);
      setCurrentVitals(null);
      setError('Failed to check robot status');
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

  // Fetch data periodically
  useEffect(() => {
    const fetchData = async () => {
      if (robotStatus !== 'online') return;
      try {
        await fetchHistoricalData();
        await fetchCurrentVitals();
        setError(null);
      } catch (err) {
        console.error('Data fetch error:', err);
        setError('Failed to fetch sensor data');
      }
    };

    const fetchHistoricalData = async () => {
      const response = await fetch('http://localhost:3000/api/sensor/data');
      const result = await response.json();
      if (result.success) {
        setSensorData(result.data);
      }
    };

    const fetchCurrentVitals = async () => {
      const response = await fetch('http://localhost:3000/api/sensor/data/latest');
      const result = await response.json();
      if (result.success) {
        setCurrentVitals(result.data);
      }
    };
    checkRobotStatus();
    fetchData();
    const statusInterval = setInterval(checkRobotStatus, 5000); // Check status every 5 seconds
    const datainterval = setInterval(fetchData, 5000); // Update every 5 seconds

    return () => (datainterval && statusInterval) && (clearInterval(datainterval) && clearInterval(statusInterval));

  }, [robotStatus]);

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
            ) : !currentVitals || Object.keys(currentVitals).length === 0 ? (<p>No data available</p>) : (
              <div className="vital-stats">
                <VitalsStrip currentVitals={currentVitals} setTheme={setTheme} />
              </div>
            )}

            <div className="user-info">
              <ThemeWidget onThemeChange={setTheme} />

              <span>Hello, XYZ</span>
              <button onClick={handleLogout}>Logout</button>
            </div>
          </header>
          <section className="grid grid-cols-12 gap-4 p-4">
            {/* Bar Chart */}
            <div className="col-span-12 md:col-span-4 lg:col-span-3 row-span-1 bg-white/10 rounded-2xl shadow-md p-4">
              <BarChart />
            </div>

            {/* GPS Map */}
            {/* <div className="col-span-12 md:col-span-8 lg:col-span-6 bg-white/10 rounded-2xl shadow-md p-4">
              <GPSMap />
            </div> */}

            {/* Pie Chart */}
            {/* <div className="col-span-12 md:col-span-4 lg:col-span-3 bg-white/10 rounded-2xl shadow-md p-4">
              <PieChart />
            </div> */}

            {/* Camera Controls */}
            <div className="col-span-12 md:col-span-4 lg:col-span-3 bg-white/10 rounded-2xl shadow-md p-4">
              <CameraControls mode="manual" onButtonPress={sendCommand} />
            </div>

            {/* Locomotive Controls */}
            <div className="col-span-12 lg:col-span-3 bg-white/10 rounded-2xl shadow-md p-4">
              <LocomotiveControls onButtonPress={sendCommand} theme={theme} />
            </div>

            {/* Calibration Controls */}
            {/* <div className="col-span-12 md:col-span-4 lg:col-span-3 bg-white/10 rounded-2xl shadow-md p-4">
              <CalibrationControls onCalibrate={sendCalibrationCommand} />
            </div> */}

            {/* Camera Feed */}
            <div className="col-span-12 md:col-span-8 lg:col-span-6 bg-white/10 rounded-2xl shadow-md p-4">
              <MpegCameraStream theme={theme} />
            </div>

            {/* Line Graph */}
            <div className="col-span-12 lg:col-span-6 bg-white/10 rounded-2xl shadow-md p-4">
              <LineGraph rawData={currentVitals} theme={theme} />
            </div>
          </section>

        </main>
      </div>
    </div >
  );
}

export default Dashboard;