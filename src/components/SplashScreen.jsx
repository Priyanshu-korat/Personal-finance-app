import React, { useEffect, useState } from 'react';

export default function SplashScreen({ isReady }) {
  const [shouldRender, setShouldRender] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (isReady) {
      // Minimum display time to let the entrance animations finish playing
      const minDisplayTimer = setTimeout(() => {
        setIsExiting(true);
        // Remove from DOM after exit animation finishes
        setTimeout(() => setShouldRender(false), 800);
      }, 1500);
      return () => clearTimeout(minDisplayTimer);
    }
  }, [isReady]);

  if (!shouldRender) return null;

  return (
    <div className={`splash-screen ${isExiting ? 'exit' : ''}`}>
      <div className="splash-logo-wrap">
        <div className="splash-ring"></div>
        <div className="splash-logo">₹</div>
      </div>
      <h1 className="splash-text">Wealth Management</h1>
      <p className="splash-subtext">Personal Finance</p>
    </div>
  );
}
