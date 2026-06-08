import React, { useState, useRef, useEffect, useId } from 'react';
import ReactDOM from 'react-dom';

/**
 * Global singleton event: only one LiquidSelect/MiniCalendar can be open at a time.
 */
const OPEN_EVENT = 'liquid-select-open';

const GLASS = {
  background: 'var(--lg-fill)',
  backdropFilter: 'var(--lg-blur)',
  WebkitBackdropFilter: 'var(--lg-blur)',
  border: '1px solid var(--lg-border)',
  boxShadow: `
    var(--lg-shadow),
    inset 0 1px 0 var(--lg-specular-top)
  `,
};

export default function MiniCalendar({ value, onChange, placeholder = 'Select Date' }) {
  const uid = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

  function getOrdinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  const displayText = value
    ? `${value}${getOrdinal(Number(value))} of month`
    : placeholder;

  // Close when another popup opens
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.uid !== uid) setIsOpen(false);
    };
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, [uid]);

  const openCalendar = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      const calW = 290;
      const calH = 320; // approximate
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Horizontal: align right edge to trigger's right, avoid overflow
      let left = r.right - calW;
      if (left < 12) left = 12;
      if (left + calW > vw - 12) left = vw - calW - 12;

      // Vertical: below if space, else above
      const top = r.bottom + vh - calH > vh - 12
        ? r.top - calH - 8
        : r.bottom + 6;

      setPos({ top: Math.max(12, top), left });
    }
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { uid } }));
    setIsOpen(true);
  };

  return (
    <>
      {/* Trigger */}
      <div
        ref={triggerRef}
        onClick={openCalendar}
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          color: value ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.30)',
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: '15px', fontWeight: value ? 500 : 400 }}>{displayText}</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.35 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Portal calendar — anchored near trigger */}
      {isOpen && ReactDOM.createPortal(
        <>
          {/* Invisible scrim to close on outside tap */}
          <div
            onClick={() => setIsOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 99997 }}
          />

          {/* Calendar panel */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              width: 290,
              zIndex: 99998,
              borderRadius: '20px',
              overflow: 'hidden',
              animation: 'contextMenuIn 180ms cubic-bezier(0.34, 1.20, 0.64, 1) both',
              transformOrigin: 'top right',
              ...GLASS,
            }}
          >
            {/* Header */}
            <div style={{
              padding: '13px 20px 11px',
              textAlign: 'center',
              borderBottom: '0.5px solid rgba(255,255,255,0.08)',
            }}>
              <span style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.90)',
                letterSpacing: '-0.3px',
              }}>
                {placeholder}
              </span>
            </div>

            {/* Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '2px',
              padding: '10px 10px',
            }}>
              {[...Array(31)].map((_, i) => {
                const day = i + 1;
                const sel = parseInt(value, 10) === day;
                return (
                  <button
                    key={day}
                    onClick={() => { onChange(day); setIsOpen(false); }}
                    style={{
                      aspectRatio: '1/1',
                      borderRadius: '50%',
                      background: sel ? '#32ade6' : 'transparent',
                      color: sel ? '#000' : 'rgba(255,255,255,0.78)',
                      fontWeight: sel ? 700 : 400,
                      fontSize: '15px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                      transition: 'background 140ms ease',
                    }}
                    onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }}
                    onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Cancel */}
            <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '13px',
                  background: 'transparent',
                  border: 'none',
                  color: '#32ade6',
                  fontSize: '17px',
                  fontWeight: 400,
                  cursor: 'pointer',
                  letterSpacing: '-0.3px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
