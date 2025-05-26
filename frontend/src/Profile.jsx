import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';

const Profile = () => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Since your backend does not have a /profile endpoint,
        // get the username from chat_history or another available endpoint.
        const response = await axios.get(`${BACKEND_URL}/chat_history`, {
          withCredentials: true,
        });
        // If chat_history returns conversations, use the username from session
        if (response.data && Array.isArray(response.data.conversations)) {
          // You may want to add a backend /profile endpoint for a better solution
          setUsername('User');
        } else {
          setUsername('');
        }
      } catch (err) {
        setError('Failed to load profile');
        if (err.response?.status === 401) {
          navigate('/');
        }
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await axios.post(`${BACKEND_URL}/logout`, {}, { withCredentials: true });
      navigate('/');
    } catch (err) {
      setError('Failed to logout');
    }
  };

  return (
    <div className="profile-container">
      <h2>User Profile</h2>
      {error && <p className="error">{error}</p>}
      {username ? (
        <div>
          <p>Username: {username}</p>
          <button onClick={handleLogout}>Logout</button>
          <button onClick={() => navigate('/chat')}>Back to Chat</button>
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default Profile;
