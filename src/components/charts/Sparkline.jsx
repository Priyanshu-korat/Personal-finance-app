import React, { useMemo } from 'react';

/**
 * Sparkline: A tiny, glowing minimalist bezier curve for trend tracking.
 * If there's only 1 data point, renders a single glowing dot.
 */
export default function Sparkline({ 
  data = [], 
  color = 'var(--c-cyan)', 
  width = 60, 
  height = 20,
  strokeWidth = 1.5
}) {
  const pathData = useMemo(() => {
    if (!data || data.length < 2) return '';
    
    const maxVal = Math.max(...data, 1);
    const minVal = Math.min(...data, 0);
    const range = maxVal - minVal || 1;
    
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (((val - minVal) / range) * (height - strokeWidth * 2)) - strokeWidth;
      return { x, y };
    });

    let d = `M ${points[0].x},${points[0].y}`;
    
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const cp1x = p1.x + (p2.x - p1.x) * 0.4;
      const cp1y = p1.y;
      const cp2x = p2.x - (p2.x - p1.x) * 0.4;
      const cp2y = p2.y;
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    
    return d;
  }, [data, width, height, strokeWidth]);

  if (!data || data.length === 0) return null;

  const glowId = `spark-glow-${color.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <defs>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      {data.length === 1 ? (
        // Single data point: sleek glowing pulse dot in the center
        <circle 
          cx={width / 2} 
          cy={height / 2} 
          r={strokeWidth * 1.5} 
          fill={color} 
          filter={`url(#${glowId})`}
        />
      ) : (
        // Standard bezier curve line
        <path 
          d={pathData} 
          fill="none" 
          stroke={color} 
          strokeWidth={strokeWidth} 
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${glowId})`}
        />
      )}
    </svg>
  );
}
