import React, { useMemo } from 'react';

/**
 * PulseLine: A sleek, glowing Bezier curve line chart with a translucent gradient fill.
 * Ideal for placing in the background of Metric Cards to show trend data.
 */
export default function PulseLine({ 
  data = [], 
  color = '#4f46e5', 
  height = 60, 
  width = 200,
  strokeWidth = 2
}) {
  const pathData = useMemo(() => {
    if (!data || data.length < 2) return '';
    
    // Normalize data to fit inside the SVG viewbox
    const maxVal = Math.max(...data, 1);
    const minVal = Math.min(...data, 0);
    const range = maxVal - minVal || 1;
    
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      // Invert Y because SVG 0,0 is top-left. Add 6px padding at bottom so 0 values are visible
      const bottomPadding = 6;
      const y = height - bottomPadding - (((val - minVal) / range) * (height - strokeWidth - bottomPadding - 10)) - (strokeWidth / 2);
      return { x, y };
    });

    // Create cubic bezier curve path
    let d = `M ${points[0].x},${points[0].y}`;
    
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      
      // Control points for smooth curve (horizontal tension)
      const cp1x = p1.x + (p2.x - p1.x) * 0.4;
      const cp1y = p1.y;
      const cp2x = p2.x - (p2.x - p1.x) * 0.4;
      const cp2y = p2.y;
      
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    
    return d;
  }, [data, height, width, strokeWidth]);

  if (!data || data.length < 2) return null;

  // Create area path for the gradient fill (down to the bottom)
  const areaPath = `${pathData} L ${width},${height} L 0,${height} Z`;
  const gradientId = `pulse-grad-${Math.random().toString(36).substring(2, 9)}`;

  return (
    <svg 
      width="100%" 
      height="100%" 
      viewBox={`0 0 ${width} ${height}`} 
      preserveAspectRatio="none"
      style={{ overflow: 'visible', display: 'block' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      {/* Fill Area */}
      <path 
        d={areaPath} 
        fill={`url(#${gradientId})`} 
        style={{ transition: 'all 0.5s ease-in-out' }}
      />
      
      {/* Glowing Line */}
      <path 
        d={pathData} 
        fill="none" 
        stroke={color} 
        strokeWidth={strokeWidth} 
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#glow)"
        style={{ transition: 'all 0.5s ease-in-out' }}
      />
    </svg>
  );
}
