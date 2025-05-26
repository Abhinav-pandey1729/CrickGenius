import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ParticleWeb from './components/ParticleWeb';
import Footer from './components/Footer';
import './Login.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/login' : '/register';
    try {
      const response = await axios.post(
        `${BACKEND_URL}${endpoint}`,
        { username, password },
        { withCredentials: true }
      );
      if (response.data.username) {
        navigate('/chat');
      } else {
        setError('Unexpected response from server');
      }
    } catch (err) {
      if (err.response) {
        setError(err.response.data?.error || 'Failed to process request');
      } else if (err.request) {
        setError('No response from server. Please check your connection.');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
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
        {error && <p className="error">{error}</p>}
        {loading && <p className="loading">Loading...</p>}
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              autoComplete="username"
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
          </div>
          <button type="submit" disabled={loading}>
            {isLogin ? 'Login' : 'Register'}
          </button>
        </form>
        <p className="toggle-text">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <span
            tabIndex={0}
            role="button"
            onClick={() => setIsLogin(!isLogin)}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setIsLogin(!isLogin)}
            style={{ cursor: 'pointer', color: '#007bff', marginLeft: 4 }}
          >
            {isLogin ? ' Register' : ' Login'}
          </span>
        </p>
      </div>
      <Footer />
    </div>
  );
};

export default Login;
