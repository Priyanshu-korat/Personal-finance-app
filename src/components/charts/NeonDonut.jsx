import React, { useState, useEffect } from 'react';

/**
 * NeonDonut: A glowing, segmented donut chart.
 * Rebuilt using native SVG <circle> dash-arrays to guarantee perfect rendering with zero artifacts.
 */
export default function NeonDonut({ 
  data = [], 
  size = 200, 
  strokeWidth = 20,
  gap = 6, // pixels gap between segments
  onSelect,
  selectedKey
}) {
  const [animate, setAnimate] = useState(false);
  
  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (!data || data.length === 0) return null;

  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  const radius = (size - strokeWidth - 10) / 2; // -10 for glow padding
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  // If there's only 1 item, we don't need gaps.
  const actualGap = data.length > 1 ? gap : 0;

  let currentOffset = 0;

  const segments = data.map((item) => {
    // Calculate raw percentage
    const pct = item.value / total;
    
    // Calculate arc length (subtracting the gap)
    // Ensure the arc length doesn't go below 1 pixel so it stays visible
    let arcLength = Math.max((pct * circumference) - actualGap, 1);
    
    // The dash array tells SVG to draw `arcLength`, then leave `circumference` amount of empty space
    const dasharray = `${arcLength} ${circumference}`;
    
    // The offset pushes the start point of this segment along the circle
    // We use -currentOffset because SVG dashoffset moves backwards
    const dashoffset = -currentOffset;
    
    // Update offset for the NEXT segment
    currentOffset += (pct * circumference);

    return {
      ...item,
      dasharray,
      dashoffset,
      // For animation: start fully empty (offset pushed out by full circumference)
      animStartOffset: circumference, 
    };
  });

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg 
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }} // Start at 12 o'clock
      >
        <defs>
          <filter id="donut-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background Track (Glass) */}
        <circle 
          cx={cx} cy={cy} r={radius} 
          fill="none" 
          stroke="var(--lg-border)" 
          strokeWidth={strokeWidth} 
        />

        {/* Segments */}
        {segments.map((seg, i) => {
          const isSelected = selectedKey === seg.name;
          const isMuted = selectedKey && !isSelected;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={seg.color || '#fff'}
              strokeWidth={strokeWidth}
              strokeLinecap="round" // Creates the smooth pill edges
              filter="url(#donut-glow)"
              onClick={() => onSelect && onSelect(seg.name)}
              style={{
                transition: 'stroke-dashoffset 1s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
                strokeDasharray: seg.dasharray,
                // Animate from hidden to calculated offset
                strokeDashoffset: animate ? seg.dashoffset : seg.animStartOffset,
                cursor: onSelect ? 'pointer' : 'default',
                opacity: isMuted ? 0.3 : 1
              }}
            />
          );
        })}
      </svg>
      
      {/* Center Label (Hollow Glass) */}
      <div 
        style={{
          position: 'absolute',
          inset: strokeWidth * 1.5,
          borderRadius: '50%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          background: 'var(--bg-layer-1)',
          boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.1)',
        }}
      >
        <span className="t-tertiary" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
          Total
        </span>
        <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--c-indigo-lt)' }}>
          {total > 1 ? `₹${total.toLocaleString()}` : '—'}
        </span>
      </div>
    </div>
  );
}
