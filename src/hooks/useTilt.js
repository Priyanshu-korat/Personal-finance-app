import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useTilt: A custom hook for 3D holographic hover and gyroscope effects.
 * Calculates rotateX and rotateY based on mouse position or device orientation.
 */
export default function useTilt({ 
  maxRotation = 15, 
  perspective = 1000,
  scale = 1.02,
  enabled = true 
} = {}) {
  const ref = useRef(null);
  const [style, setStyle] = useState({ transform: `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale(1)` });
  const [isHovering, setIsHovering] = useState(false);
  const [hasGyroPermission, setHasGyroPermission] = useState(false);

  // --- MOUSE TRACKING (Desktop) ---
  const handleMouseMove = useCallback((e) => {
    if (!enabled || !ref.current || hasGyroPermission) return; // Gyro takes precedence if active

    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Mouse position relative to the center of the element
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;

    // Calculate rotation (-max to +max)
    const rotateY = (mouseX / (width / 2)) * maxRotation;
    const rotateX = -(mouseY / (height / 2)) * maxRotation;

    setStyle({
      transform: `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`,
      transition: 'transform 0.1s ease-out'
    });
  }, [enabled, maxRotation, perspective, scale, hasGyroPermission]);

  const handleMouseLeave = useCallback(() => {
    if (!enabled || hasGyroPermission) return;
    setIsHovering(false);
    setStyle({
      transform: `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale(1)`,
      transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' // Springy return
    });
  }, [enabled, perspective, hasGyroPermission]);

  const handleMouseEnter = useCallback(() => {
    if (!enabled || hasGyroPermission) return;
    setIsHovering(true);
  }, [enabled, hasGyroPermission]);

  // --- GYROSCOPE TRACKING (Mobile) ---
  const handleOrientation = useCallback((e) => {
    if (!enabled || !hasGyroPermission) return;

    // e.beta: front-to-back tilt in degrees [-180, 180]
    // e.gamma: left-to-right tilt in degrees [-90, 90]
    let { beta, gamma } = e;

    // Limit extreme values
    if (beta > 90) beta = 90;
    if (beta < -90) beta = -90;

    // Map device tilt (-45 to 45 deg) to our maxRotation
    const clampedBeta = Math.max(-45, Math.min(45, beta - 45)); // assume holding phone at 45deg angle
    const clampedGamma = Math.max(-45, Math.min(45, gamma));

    const rotateX = -(clampedBeta / 45) * maxRotation;
    const rotateY = (clampedGamma / 45) * maxRotation;

    setStyle({
      transform: `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1)`,
      transition: 'transform 0.1s ease-out'
    });
  }, [enabled, hasGyroPermission, maxRotation, perspective]);

  // Attach Mouse Event Listeners
  useEffect(() => {
    const node = ref.current;
    if (node) {
      node.addEventListener('mousemove', handleMouseMove);
      node.addEventListener('mouseleave', handleMouseLeave);
      node.addEventListener('mouseenter', handleMouseEnter);
      return () => {
        node.removeEventListener('mousemove', handleMouseMove);
        node.removeEventListener('mouseleave', handleMouseLeave);
        node.removeEventListener('mouseenter', handleMouseEnter);
      };
    }
  }, [handleMouseMove, handleMouseLeave, handleMouseEnter]);

  // Attach Gyroscope Event Listener
  useEffect(() => {
    if (hasGyroPermission) {
      window.addEventListener('deviceorientation', handleOrientation);
      return () => window.removeEventListener('deviceorientation', handleOrientation);
    }
  }, [hasGyroPermission, handleOrientation]);

  // Request Gyro Permission (iOS 13+ requires user interaction)
  const requestGyroPermission = useCallback(async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
          setHasGyroPermission(true);
          return true;
        }
      } catch (err) {
        console.error('Gyro permission error:', err);
      }
    } else {
      // Android / Older iOS doesn't need explicit permission prompt
      setHasGyroPermission(true);
      return true;
    }
    return false;
  }, []);

  return { ref, style, requestGyroPermission, hasGyroPermission };
}
