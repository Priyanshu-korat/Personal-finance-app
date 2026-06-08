import React, { useMemo, useState, useRef } from 'react';

/**
 * TrendChart: A premium, Apple-style stock line chart with a glowing bezier curve
 * and a sleek gradient fill below the curve.
 */
export default function TrendChart({ 
  data = [], 
  labels = [],
  color = 'var(--c-cyan)', 
  height = 200,
  strokeWidth = 2.5
}) {
  const pathData = useMemo(() => {
    if (!data || data.length < 2) return { line: '', area: '', points: [] };
    
    // We assume width is 100% via viewBox, so we use a coordinate system of 1000x200
    const w = 1000;
    const h = height;
    
    const maxVal = Math.max(...data, 1);
    const minVal = Math.min(...data, 0);
    // Add a bit of padding to the range so the line doesn't hit the absolute top/bottom
    const range = (maxVal - minVal) || 1;
    const yPadding = h * 0.15; 
    const drawHeight = h - (yPadding * 2);
    
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * w;
      // Invert Y because SVG 0,0 is top-left
      const y = h - yPadding - (((val - minVal) / range) * drawHeight);
      return { x, y, val };
    });

    let d = `M ${points[0].x},${points[0].y}`;
    
    // Create a smooth bezier curve
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      // Tension factor (0.4 is a good smooth default)
      const cp1x = p1.x + (p2.x - p1.x) * 0.4;
      const cp1y = p1.y;
      const cp2x = p2.x - (p2.x - p1.x) * 0.4;
      const cp2y = p2.y;
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    
    // Area path goes down to the bottom
    const area = `${d} L ${points[points.length - 1].x},${h} L ${points[0].x},${h} Z`;
    
    return { line: d, area, points };
  }, [data, height]);

  const [hoverIdx, setHoverIdx] = useState(null);
  const svgRef = useRef(null);

  const handlePointerMove = (e) => {
    if (!svgRef.current || !pathData.points.length) return;
    const rect = svgRef.current.getBoundingClientRect();
    // Support both mouse and touch events
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    // x is in screen pixels, map it to SVG 1000px width
    const svgX = (x / rect.width) * 1000;
    
    // Find closest point
    let closestIdx = 0;
    let minDiff = Infinity;
    pathData.points.forEach((p, idx) => {
      const diff = Math.abs(p.x - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });
    setHoverIdx(closestIdx);
  };

  const handlePointerLeave = () => setHoverIdx(null);

  if (!data || data.length === 0) return null;

  const glowId = `trend-glow-${color.replace(/[^a-zA-Z0-9]/g, '')}`;
  const gradId = `trend-grad-${color.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <svg 
        ref={svgRef}
        width="100%" 
        height={height} 
        viewBox={`0 0 1000 ${height}`} 
        preserveAspectRatio="none"
        style={{ overflow: 'visible', touchAction: 'pan-x pan-y', cursor: 'crosshair' }}
        onMouseMove={handlePointerMove}
        onMouseLeave={handlePointerLeave}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerLeave}
        onTouchCancel={handlePointerLeave}
      >
        <defs>
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        
        <style>
          {`
            @keyframes drawLine {
              0% { stroke-dasharray: 0, 4000; }
              100% { stroke-dasharray: 4000, 0; }
            }
            @keyframes fadeArea {
              0% { opacity: 0; transform: translateY(10px); }
              100% { opacity: 1; transform: translateY(0); }
            }
            .trend-line {
              animation: drawLine 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
            }
            .trend-area {
              animation: fadeArea 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
            }
          `}
        </style>

        {data.length === 1 ? (
          // Single data point
          <circle 
            cx={500} 
            cy={height / 2} 
            r={strokeWidth * 2} 
            fill={color} 
            filter={`url(#${glowId})`}
            style={{ animation: 'fadeArea 1s ease-out forwards' }}
          />
        ) : (
          <>
            {/* Gradient Fill */}
            <path 
              className="trend-area"
              d={pathData.area} 
              fill={`url(#${gradId})`} 
            />
            {/* Glow Line */}
            <path 
              className="trend-line"
              d={pathData.line} 
              fill="none" 
              stroke={color} 
              strokeWidth={strokeWidth} 
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#${glowId})`}
            />
            {/* Scrubber Elements */}
            {hoverIdx !== null && pathData.points[hoverIdx] && (
              <>
                <line 
                  x1={pathData.points[hoverIdx].x} 
                  y1={0} 
                  x2={pathData.points[hoverIdx].x} 
                  y2={height} 
                  stroke="rgba(255,255,255,0.2)" 
                  strokeWidth="2" 
                  strokeDasharray="4 4"
                />
                <circle 
                  cx={pathData.points[hoverIdx].x} 
                  cy={pathData.points[hoverIdx].y} 
                  r="6" 
                  fill={color} 
                  stroke="#fff" 
                  strokeWidth="3"
                  filter={`url(#${glowId})`}
                />
              </>
            )}
          </>
        )}
      </svg>
      
      {/* Tooltip Overlay */}
      {hoverIdx !== null && pathData.points[hoverIdx] && (
        <div style={{
          position: 'absolute',
          top: -30,
          left: `calc(${(pathData.points[hoverIdx].x / 1000) * 100}% - 40px)`,
          width: 80,
          textAlign: 'center',
          background: 'rgba(0,0,0,0.8)',
          color: '#fff',
          padding: '4px 8px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 'bold',
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
          zIndex: 10
        }}>
          ₹{pathData.points[hoverIdx].val.toLocaleString()}
        </div>
      )}
      
      {/* X-Axis Labels */}
      {labels && labels.length > 0 && (
        <div 
          className="flex justify-between w-full px-2"
          style={{ marginTop: '12px' }}
        >
          {labels.map((lbl, idx) => (
            <span key={idx} className="caption t-tertiary" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
              {lbl}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
