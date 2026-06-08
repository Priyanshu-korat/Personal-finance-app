import React, { useState } from 'react';
import './LiquidToggle.css'; // We'll create this CSS file

export default function LiquidToggle({ checked, onChange }) {
  const [isPressing, setIsPressing] = useState(false);

  return (
    <button
      className={`liquid-toggle ${checked ? 'checked' : ''} ${isPressing ? 'pressing' : ''}`}
      onClick={() => onChange(!checked)}
      onPointerDown={() => setIsPressing(true)}
      onPointerUp={() => setIsPressing(false)}
      onPointerLeave={() => setIsPressing(false)}
      role="switch"
      aria-checked={checked}
    >
      <div className="toggle-track">
        {/* The knob that transforms into glass on press */}
        <div className="toggle-knob" />
      </div>
    </button>
  );
}
