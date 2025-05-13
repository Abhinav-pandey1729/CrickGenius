import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ParticleWeb from './components/ParticleWeb';
import Footer from './components/Footer';
import './Login.css';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isLogin ? '/login' : '/register';
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}${endpoint}`,
        { username, password },
        { withCredentials: true }
      );
      if (response.data.username) {
        navigate('/chat');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred');
    }
  };

  return (
    <div className="login-container">
      <ParticleWeb />
      <div className="login-header">
        <img src="/logo.jpg" alt="CrickGenius Logo" className="logo" />
        <h1>CrickGenius</h1>
      </div>
      <div className="login-box">
        <h2>{isLogin ? 'Login' : 'Register'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit">{isLogin ? 'Login' : 'Register'}</button>
        </form>
        <p className="toggle-text">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <span onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? ' Register' : ' Login'}
          </span>
        </p>
      </div>
      <Footer />
    </div>
  );
};

export default Login;