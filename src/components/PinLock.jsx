import React, { useState } from 'react';
import '../App.css';

export default function PinLock({ correctPin, onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handlePress = (num) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      
      if (newPin.length === 4) {
        if (newPin === correctPin) {
          onUnlock();
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 800);
        }
      }
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setError(false);
    }
  };

  return (
    <div className="pin-lock-container">
      <div className="pin-header">
        <div className="logo-gem mb-4" style={{ margin: '0 auto' }}>₹</div>
        <h2 className="title-large">Enter PIN</h2>
        <p className="caption t-tertiary mt-2">Enter your 4-digit PIN to access Personal Finance</p>
      </div>

      <div className={`pin-dots ${error ? 'shake' : ''}`}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''} ${error ? 'error' : ''}`}></div>
        ))}
      </div>

      <div className="pin-numpad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button key={num} className="pin-key" onClick={() => handlePress(num.toString())}>
            {num}
          </button>
        ))}
        <div className="pin-key empty"></div>
        <button className="pin-key" onClick={() => handlePress('0')}>0</button>
        <button className="pin-key action" onClick={handleBackspace}>
          ⌫
        </button>
      </div>
    </div>
  );
}
