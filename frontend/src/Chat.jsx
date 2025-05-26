import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ParticleWeb from './components/ParticleWeb';
import Footer from './components/Footer';
import './Chat.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setInput(transcript);
      };

      rec.onerror = (event) => {
        setIsRecording(false);
        setError('Speech recognition error: ' + event.error);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      setRecognition(rec);
    } else {
      setError('Speech recognition is not supported in this browser.');
    }
  }, []);

  // Start a new chat on mount (run once)
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const startNewChat = async () => {
      try {
        const response = await axios.post(
          `${BACKEND_URL}/new_chat`,
          {},
          { withCredentials: true }
        );
        if (isMounted) {
          setSelectedConversationId(response.data.conversation_id);
          setMessages([]);
          // Fetch updated conversations
          const historyResponse = await axios.get(
            `${BACKEND_URL}/chat_history`,
            { withCredentials: true }
          );
          setConversations(historyResponse.data.conversations);
        }
      } catch (error) {
        if (isMounted) {
          setError('Failed to start a new chat. Please try again.');
          if (error.response?.status === 401) {
            navigate('/');
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    startNewChat();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  // Load selected conversation messages
  useEffect(() => {
    if (selectedConversationId) {
      const conversation = conversations.find((c) => c.id === selectedConversationId);
      if (conversation) {
        setMessages(
          conversation.messages
            .map((msg) => [
              { sender: 'user', text: msg.query },
              { sender: 'bot', text: msg.response },
            ])
            .flat()
        );
      } else {
        setMessages([]);
      }
    }
  }, [selectedConversationId, conversations]);

  const handleSend = async () => {
    if (input.trim() === '') return;

    const userMessage = { sender: 'user', text: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${BACKEND_URL}/chat`,
        { query: input },
        { withCredentials: true }
      );
      const botMessage = { sender: 'bot', text: response.data.response };
      setMessages((prev) => [...prev, botMessage]);
      // Refresh conversations
      const historyResponse = await axios.get(
        `${BACKEND_URL}/chat_history`,
        { withCredentials: true }
      );
      setConversations(historyResponse.data.conversations);
      setSelectedConversationId(response.data.conversation_id);
    } catch (error) {
      setError('Failed to send message. Please try again.');
      if (error.response?.status === 401) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceToggle = () => {
    if (!recognition) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      recognition.start();
      setIsRecording(true);
    }
  };

  const handleNewChat = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${BACKEND_URL}/new_chat`,
        {},
        { withCredentials: true }
      );
      setMessages([]);
      setSelectedConversationId(response.data.conversation_id);
      // Refresh conversations
      const historyResponse = await axios.get(
        `${BACKEND_URL}/chat_history`,
        { withCredentials: true }
      );
      setConversations(historyResponse.data.conversations);
    } catch (error) {
      setError('Failed to start a new chat. Please try again.');
      if (error.response?.status === 401) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConversationSelect = (conversationId) => {
    setSelectedConversationId(conversationId);
    setError(null);
  };

  const handleProfile = () => {
    navigate('/profile');
  };

  const handleLogout = async () => {
    setLoading(true);
    setError(null);

    try {
      await axios.post(
        `${BACKEND_URL}/logout`,
        {},
        { withCredentials: true }
      );
      navigate('/');
    } catch (error) {
      setError('Failed to log out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <ParticleWeb />
      <div className="sidebar">
        <h3>Conversations</h3>
        <button onClick={handleNewChat} className="new-chat-button" disabled={loading}>
          New Chat
        </button>
        <ul>
          {conversations.map((conv) => (
            <li
              key={conv.id}
              className={selectedConversationId === conv.id ? 'selected' : ''}
              onClick={() => handleConversationSelect(conv.id)}
              tabIndex={0}
              role="button"
              onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleConversationSelect(conv.id)}
            >
              {conv.first_query ? conv.first_query.substring(0, 30) + '...' : 'New Chat'}
            </li>
          ))}
        </ul>
        <button onClick={handleProfile} disabled={loading}>
          Profile
        </button>
        <button onClick={handleLogout} className="logout-button" disabled={loading}>
          Logout
        </button>
      </div>
      <div className="main-chat">
        <div className="chat-header">
          <h2>CrickGenius</h2>
        </div>
        {loading && <div className="loading">Loading...</div>}
        {error && <div className="error-message">{error}</div>}
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender}`}>
              <span>{msg.text}</span>
            </div>
          ))}
        </div>
        <div className="chat-input">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about players, matches, or trivia..."
            disabled={isRecording || loading}
            aria-label="Type your message"
          />
          <button onClick={handleSend} disabled={isRecording || loading}>
            Send
          </button>
          <button
            onClick={handleVoiceToggle}
            style={{ backgroundColor: isRecording ? '#ff4444' : '#4CAF50' }}
            disabled={loading}
          >
            {isRecording ? 'Stop Recording' : 'Start Voice'}
          </button>
        </div>
        <Footer />
      </div>
    </div>
  );
};

export default Chat;
