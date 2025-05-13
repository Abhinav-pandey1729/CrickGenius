import React, { useEffect } from 'react';
import './BackgroundBoxes.css';

const BackgroundBoxes = () => {
  useEffect(() => {
    const container = document.querySelector('.boxes-container');
    const numBoxes = 20; // Number of boxes
    const boxes = [];

    // Create boxes
    for (let i = 0; i < numBoxes; i++) {
      const box = document.createElement('div');
      box.classList.add('box');
      // Random initial position
      box.style.left = `${Math.random() * 100}%`;
      box.style.top = `${Math.random() * 100}%`;
      // Random size (10-30px)
      const size = Math.random() * 20 + 10;
      box.style.width = `${size}px`;
      box.style.height = `${size}px`;
      // Random animation delay
      box.style.animationDelay = `${Math.random() * 5}s`;
      container.appendChild(box);
      boxes.push(box);
    }

    // Update box positions based on cursor
    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      boxes.forEach((box) => {
        const boxRect = box.getBoundingClientRect();
        const boxX = boxRect.left - rect.left + boxRect.width / 2;
        const boxY = boxRect.top - rect.top + boxRect.height / 2;

        // Calculate distance and direction
        const dx = mouseX - boxX;
        const dy = mouseY - boxY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = 200; // Max distance for effect

        if (distance < maxDistance) {
          const strength = (1 - distance / maxDistance) * 20; // Max movement 20px
          box.style.transform = `translate(${dx * strength / distance}px, ${dy * strength / distance}px)`;
        } else {
          box.style.transform = 'translate(0, 0)';
        }
      });
    };

    container.addEventListener('mousemove', handleMouseMove);

    // Cleanup
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      boxes.forEach((box) => box.remove());
    };
  }, []);

  return (
    <div className="boxes-container">
      <div className="mask"></div>
    </div>
  );
};

export default BackgroundBoxes;