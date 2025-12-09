import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./dashboard";
import Login from "./login";

function App() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);
  const [backendStatus, setBackendStatus] = useState('checking');
  // const BACKEND_URL = `${import.meta.env.VITE_APP_IP}:${import.meta.env.VITE_BACKEND_PORT}` || 'http://localhost:3000';
  const BACKEND_URL = 'http://localhost:3000';

  useEffect(() => {
    checkBackendStatus();
  }, []);

  const checkBackendStatus = async () => {
    try {
      // First check if backend is reachable
      const healthResponse = await fetch(`${BACKEND_URL}/api/health`);
      console.log(`${BACKEND_URL}/api/health`)
      if (!healthResponse.ok) {
        throw new Error('Backend health check failed');
      } else {
        console.log('Backend is reachable');
      }

      // Then check session
      const sessionResponse = await fetch(`${BACKEND_URL}/api/auth/session`, {
        credentials: "include"
      }); console.log(`${BACKEND_URL}/api/auth/session`)

      if (sessionResponse.ok) {
        const data = await sessionResponse.json();
        setLoggedIn(data.loggedIn);
        setBackendStatus('connected');
      } else {
        setBackendStatus('error');
      }
    } catch (error) {
      console.error('Backend connection error:', error);
      setBackendStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (status) => {
    setLoggedIn(status);
  };

  const handleLogout = () => {
    fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    })
      .then(() => {
        setLoggedIn(false);
      })
      .catch(error => {
        console.error('Logout error:', error);
        setLoggedIn(false);
      });
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column'
      }}>
        <div>Checking backend connection...</div>
        <div style={{ fontSize: '12px', marginTop: '10px', color: '#666' }}>
          Backend: {BACKEND_URL}
        </div>
      </div>
    );
  }

  if (backendStatus === 'error') {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        textAlign: 'center',
        padding: '20px'
      }}>
        <h2>Backend Connection Error</h2>
        <p>Cannot connect to backend server at {BACKEND_URL}</p>
        <p>Please make sure:</p>
        <ul style={{ textAlign: 'left', margin: '10px 0' }}>
          <li>The backend server is running</li>
          <li>Port 3000 is not blocked</li>
          <li>There are no firewall issues</li>
        </ul>
        <button
          onClick={checkBackendStatus}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (<Dashboard
    setLoggedIn={handleLogin}
    onLogout={handleLogout}
    backendUrl={BACKEND_URL}
  />
    // <Router>
    //   <Routes>
    //     <Route
    //       path="/login"
    //       element={
    //         loggedIn ?
    //           <Navigate to="/dashboard" replace /> :
    //           <Login
    //             setLoggedIn={handleLogin}
    //             backendUrl={BACKEND_URL}
    //           />
    //       }
    //     />
    //     <Route
    //       path="/dashboard"
    //       element={
    //         loggedIn ?
    //           <Dashboard
    //             setLoggedIn={handleLogin}
    //             onLogout={handleLogout}
    //             backendUrl={BACKEND_URL}
    //           /> :
    //           <Navigate to="/login" replace />
    //       }
    //     />
    //     <Route
    //       path="/"
    //       element={
    //         <Navigate to={loggedIn ? "/dashboard" : "/login"} replace />
    //       }
    //     />
    //   </Routes>
    // </Router>
  );
}

export default App;