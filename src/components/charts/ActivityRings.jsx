import React, { useState, useEffect } from 'react';

/**
 * ActivityRings: 3 concentric, glowing rings inspired by Apple Watch.
 * Ring 1: Income (Green)
 * Ring 2: Needs (Cyan)
 * Ring 3: Wants (Pink)
 */
export default function ActivityRings({
  incomePct = 0,
  needsPct = 0,
  wantsPct = 0,
  size = 240,
  strokeWidth = 20,
  gap = 6
}) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const t = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(t);
  }, []);

  const center = size / 2;
  
  // Calculate radii for the 3 rings
  const r1 = (size - strokeWidth) / 2 - 4; // Outer (Income)
  const r2 = r1 - strokeWidth - gap;      // Middle (Needs)
  const r3 = r2 - strokeWidth - gap;      // Inner (Wants)

  // Circumferences
  const c1 = 2 * Math.PI * r1;
  const c2 = 2 * Math.PI * r2;
  const c3 = 2 * Math.PI * r3;

  // Calculate offsets (clamped to 100% so it doesn't overlap weirdly without extra logic, 
  // though Apple Watch allows overlap. We'll stick to 100% max for now for clean visual).
  const clamp = (val) => Math.min(Math.max(val, 0), 100);
  const off1 = animate ? c1 - (clamp(incomePct) / 100) * c1 : c1;
  const off2 = animate ? c2 - (clamp(needsPct) / 100) * c2 : c2;
  const off3 = animate ? c3 - (clamp(wantsPct) / 100) * c3 : c3;

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg 
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }} // Start at top (12 o'clock)
      >
        <defs>
          <filter id="ring-glow-1" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="ring-glow-2" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="ring-glow-3" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Tracks (Background Glass) */}
        <circle cx={center} cy={center} r={r1} fill="none" stroke="rgba(40,205,65, 0.15)" strokeWidth={strokeWidth} />
        <circle cx={center} cy={center} r={r2} fill="none" stroke="rgba(100,210,255, 0.15)" strokeWidth={strokeWidth} />
        <circle cx={center} cy={center} r={r3} fill="none" stroke="rgba(255,55,95, 0.15)" strokeWidth={strokeWidth} />

        {/* Progress Fills (Glowing) */}
        
        {/* Ring 1: Income */}
        <circle 
          cx={center} cy={center} r={r1} 
          fill="none" 
          stroke="var(--c-green)" 
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c1}
          strokeDashoffset={off1}
          filter="url(#ring-glow-1)"
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />
        
        {/* Ring 2: Needs */}
        <circle 
          cx={center} cy={center} r={r2} 
          fill="none" 
          stroke="var(--c-cyan)" 
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c2}
          strokeDashoffset={off2}
          filter="url(#ring-glow-2)"
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s' }}
        />

        {/* Ring 3: Wants */}
        <circle 
          cx={center} cy={center} r={r3} 
          fill="none" 
          stroke="var(--c-pink)" 
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c3}
          strokeDashoffset={off3}
          filter="url(#ring-glow-3)"
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s' }}
        />
      </svg>
      
      {/* Center Label */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}
      >
        <span className="t-tertiary" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
          Velocity
        </span>
      </div>
    </div>
  );
}
