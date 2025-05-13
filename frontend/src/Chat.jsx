import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ParticleWeb from './components/ParticleWeb';
import Footer from './components/Footer';
import './Chat.css';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
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
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        alert('Speech recognition error: ' + event.error);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      setRecognition(rec);
    } else {
      console.warn('SpeechRecognition API not supported in this browser.');
    }
  }, []);

  // Start a new chat on mount (run once)
  useEffect(() => {
    let isMounted = true;

    const startNewChat = async () => {
      try {
        const response = await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/new_chat`,
          {},
          { withCredentials: true }
        );
        if (isMounted) {
          setSelectedConversationId(response.data.conversation_id);
          setMessages([]);
          // Fetch updated conversations
          const historyResponse = await axios.get(
            `${process.env.REACT_APP_BACKEND_URL}/chat_history`,
            { withCredentials: true }
          );
          setConversations(historyResponse.data.conversations);
        }
      } catch (error) {
        console.error('Error starting new chat:', error);
        if (isMounted && error.response?.status === 401) {
          navigate('/');
        }
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

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/chat`,
        { query: input },
        { withCredentials: true }
      );
      const botMessage = { sender: 'bot', text: response.data.response };
      setMessages((prev) => [...prev, botMessage]);
      // Refresh conversations
      const historyResponse = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/chat_history`,
        { withCredentials: true }
      );
      setConversations(historyResponse.data.conversations);
      // Ensure the current conversation remains selected
      setSelectedConversationId(response.data.conversation_id);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = { sender: 'bot', text: 'Sorry, something went wrong. Please try again.' };
      setMessages((prev) => [...prev, errorMessage]);
      if (error.response?.status === 401) {
        navigate('/');
      }
    }
  };

  const handleVoiceToggle = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in this browser.');
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
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/new_chat`,
        {},
        { withCredentials: true }
      );
      setMessages([]);
      setSelectedConversationId(response.data.conversation_id);
      // Refresh conversations
      const historyResponse = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/chat_history`,
        { withCredentials: true }
      );
      setConversations(historyResponse.data.conversations);
    } catch (error) {
      console.error('Error starting new chat:', error);
      if (error.response?.status === 401) {
        navigate('/');
      }
    }
  };

  const handleConversationSelect = (conversationId) => {
    setSelectedConversationId(conversationId);
  };

  const handleProfile = () => {
    navigate('/profile');
  };

  const handleLogout = async () => {
    try {
      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/logout`,
        {},
        { withCredentials: true }
      );
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
      alert('Failed to log out. Please try again.');
    }
  };

  return (
    <div className="chat-container">
      <ParticleWeb />
      <div className="sidebar">
        <h3>Conversations</h3>
        <button onClick={handleNewChat} className="new-chat-button">
          New Chat
        </button>
        <ul>
          {conversations.map((conv) => (
            <li
              key={conv.id}
              className={selectedConversationId === conv.id ? 'selected' : ''}
              onClick={() => handleConversationSelect(conv.id)}
            >
              {conv.first_query ? conv.first_query.substring(0, 30) + '...' : 'New Chat'}
            </li>
          ))}
        </ul>
        <button onClick={handleProfile}>Profile</button>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
      <div className="main-chat">
        <div className="chat-header">
          <h2>CrickGenius</h2>
        </div>
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
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about players, matches, or trivia..."
            disabled={isRecording}
          />
          <button onClick={handleSend} disabled={isRecording}>
            Send
          </button>
          <button
            onClick={handleVoiceToggle}
            style={{ backgroundColor: isRecording ? '#ff4444' : '#4CAF50' }}
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