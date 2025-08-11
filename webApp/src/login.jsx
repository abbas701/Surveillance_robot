import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";


const Login = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [loginFailed, setLoggedIn] = useState(false);
  const navigate = useNavigate();

  const apiEndpoint = `${import.meta.env.VITE_AUTH_URL}/login`;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(apiEndpoint, formData,{withCredentials:true});
      setLoggedIn(true);
      navigate("/home");
    } catch (err) {
      setLoggedIn(false);
    }
  };

  return (
    <div className="parent">
      <h2>Log In</h2>
      {loginFailed && (
        <div className="alert alert-danger">Invalid Username or Password</div>
      )}
      <form onSubmit={handleLogin}>
        <input
          className="form-control"
          type="text"
          name="username"
          placeholder="Username"
          onChange={handleChange}
          required
        />
        <br />
        <input
          className="form-control"
          type="password"
          name="password"
          placeholder="Password"
          onChange={handleChange}
          required
        />
        <br />
        <button className="btn btn-success" type="submit">Log In</button>
      </form>
    </div>
  );
};

export default Login;
