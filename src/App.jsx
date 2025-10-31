import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./dashboard";
import Login from "./login";

function App() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    fetch("http://localhost:3000/api/session", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        setLoggedIn(data.loggedIn);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  return (
  <div>
    <Dashboard />
    {/* // <Router>
    //   <Routes>
    //     <Route path="/login" element={loggedIn ? <Navigate to="/dashboard" /> : <Login setLoggedIn={setLoggedIn} />} />
    //     <Route path="/dashboard" element={loggedIn ? <Dashboard setLoggedIn={setLoggedIn} /> : <Navigate to="/login" />} />
    //     <Route path="/" element={<Navigate to={loggedIn ? "/dashboard" : "/login"} />} />
    //   </Routes>
    // </Router> */}
    </div>
  );
}

export default App;