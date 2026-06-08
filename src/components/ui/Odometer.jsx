import React, { useState, useEffect, useRef } from 'react';

/**
 * Odometer: A highly polished number counter that smoothly animates from 0 to target value.
 * Uses ease-out-expo timing for a fast start and slow, satisfying finish.
 */
export default function Odometer({ 
  value, 
  duration = 2000, 
  prefix = '', 
  suffix = '',
  className = '',
  style = {}
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const startTime = useRef(null);
  const startValue = useRef(0);
  const animationRef = useRef(null);

  // Easing function: easeOutExpo (fast start, slow finish)
  const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

  useEffect(() => {
    // If value changes, animate from current displayValue to new value
    startValue.current = displayValue;
    startTime.current = null;

    const animate = (timestamp) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = timestamp - startTime.current;
      
      const timeFraction = Math.min(progress / duration, 1);
      const ease = easeOutExpo(timeFraction);
      
      const current = startValue.current + (value - startValue.current) * ease;
      
      setDisplayValue(current);

      if (timeFraction < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value); // Ensure exact final value
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationRef.current);
  }, [value, duration]); // Intentionally omitting displayValue to avoid re-triggering

  // Determine if it's currently animating to apply motion blur
  const isAnimating = displayValue !== value;

  return (
    <span 
      className={className} 
      style={{
        ...style,
        fontVariantNumeric: 'tabular-nums', // Keeps digits aligned while changing
        filter: isAnimating ? 'blur(0.5px)' : 'none',
        transition: 'filter 0.1s ease-out'
      }}
    >
      {prefix}{Math.round(displayValue).toLocaleString()}{suffix}
    </span>
  );
}
