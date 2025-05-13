import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <div className="footer">
      <span>Developed by</span>
      <div className="developer-tooltip">
        <img src="/photo.jpg" alt="Abhinav Pandey" className="developer-avatar" />
        <span className="tooltip-text">Abhinav Pandey, IIT Kanpur</span>
      </div>
    </div>
  );
};

export default Footer;