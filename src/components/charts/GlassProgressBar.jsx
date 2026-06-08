import React, { useState, useEffect } from 'react';

/**
 * GlassProgressBar: A thick, pill-shaped horizontal progress bar.
 * Uses a deep frosted glass track and a vibrant, growing pill fill.
 */
export default function GlassProgressBar({ 
  value = 0, 
  max = 100, 
  color = 'var(--c-indigo)', 
  height = 14,
  label,
  subLabel
}) {
  const [fill, setFill] = useState(0);

  useEffect(() => {
    // Delay animation slightly for stagger effect
    const t = setTimeout(() => {
      const percentage = Math.min(100, Math.max(0, (value / (max || 1)) * 100));
      setFill(percentage);
    }, 50);
    return () => clearTimeout(t);
  }, [value, max]);

  return (
    <div className="flex flex-col gap-2 w-full">
      {(label || subLabel) && (
        <div className="flex justify-between items-end">
          {label && <span className="subhead fw-bold">{label}</span>}
          {subLabel && <span className="caption t-tertiary">{subLabel}</span>}
        </div>
      )}
      
      {/* The Track (Glass Indent) */}
      <div 
        style={{
          width: '100%',
          height,
          background: 'rgba(0,0,0,0.15)',
          borderRadius: height / 2,
          boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.3), inset 0 -1px 1px rgba(255,255,255,0.05)',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* The Fill (Glowing Pill) */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: `${fill}%`,
            background: color,
            borderRadius: height / 2,
            transition: 'width 1s cubic-bezier(0.34, 1.2, 0.64, 1)',
            // Inner highlight for 3D pill effect + outer glow
            boxShadow: `
              inset 0 2px 4px rgba(255,255,255,0.3), 
              inset 0 -2px 4px rgba(0,0,0,0.2),
              0 0 10px ${color}
            `,
          }}
        />
      </div>
    </div>
  );
}
