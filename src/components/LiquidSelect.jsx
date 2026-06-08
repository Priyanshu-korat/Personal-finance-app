import React, { useState, useRef, useEffect, useId } from 'react';
import ReactDOM from 'react-dom';

/**
 * Global singleton: only one LiquidSelect can be open at a time.
 * Uses a custom DOM event to broadcast "close all others".
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

export default function LiquidSelect({ options, value, onChange, placeholder = 'Select Option' }) {
  const uid = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [menuRect, setMenuRect] = useState({ top: 0, left: 0, minWidth: 220 });
  const triggerRef = useRef(null);

  const selectedOption = options.find(o => o.value === value);

  // Close when another LiquidSelect opens
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.uid !== uid) setIsOpen(false);
    };
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, [uid]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const close = (e) => {
      if (!e.target.closest('[data-liq]')) setIsOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [isOpen]);

  const openMenu = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const menuW = Math.max(Math.min(r.width + 40, 280), 180);

      // Right-align to trigger right edge, clamp within viewport
      let left = r.right - menuW;
      if (left < 8) left = 8;
      if (left + menuW > vw - 8) left = vw - menuW - 8;

      // Open below unless not enough space
      const estimatedH = Math.min(options.length * 47 + 8, vh * 0.5);
      const spaceBelow = vh - r.bottom - 8;
      const top = spaceBelow >= estimatedH
        ? r.bottom + 6
        : r.top - estimatedH - 6;

      setMenuRect({ top: Math.max(8, top), left, minWidth: menuW });
    }
    // Broadcast to close all other LiquidSelects
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { uid } }));
    setIsOpen(true);
  };

  return (
    <>
      {/* Trigger */}
      <div
        ref={triggerRef}
        onClick={openMenu}
        data-liq="trigger"
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          color: selectedOption ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.30)',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        {selectedOption?.icon && <span style={{ fontSize: '17px' }}>{selectedOption.icon}</span>}
        <span style={{ fontSize: '15px', fontWeight: selectedOption ? 500 : 400 }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.35 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Portal menu */}
      {isOpen && ReactDOM.createPortal(
        <div
          data-liq="menu"
          style={{
            position: 'fixed',
            top: menuRect.top,
            left: menuRect.left,
            minWidth: menuRect.minWidth,
            maxWidth: 290,
            maxHeight: '52vh',
            overflowY: 'auto',
            zIndex: 99999,
            borderRadius: '14px',
            overflow: 'hidden',
            scrollbarWidth: 'none',
            transformOrigin: 'top right',
            animation: 'contextMenuIn 180ms cubic-bezier(0.34, 1.20, 0.64, 1) both',
            ...GLASS,
          }}
        >
          {options.map((opt, i) => (
            <React.Fragment key={opt.value + i}>
              <button
                data-liq="item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  width: '100%',
                  background: value === opt.value ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = value === opt.value ? 'rgba(255,255,255,0.08)' : 'transparent'; }}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
              >
                {opt.icon && (
                  <span style={{ fontSize: '19px', width: '26px', flexShrink: 0, textAlign: 'center' }}>
                    {opt.icon}
                  </span>
                )}
                <span style={{
                  flex: 1,
                  fontSize: '15px',
                  fontWeight: value === opt.value ? 600 : 400,
                  color: value === opt.value ? '#fff' : 'rgba(255,255,255,0.82)',
                  letterSpacing: '-0.15px',
                }}>
                  {opt.label}
                </span>
                {value === opt.value && (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#32ade6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
              {i < options.length - 1 && (
                <div style={{ height: '0.5px', margin: '0 14px', background: 'rgba(255,255,255,0.07)' }} />
              )}
            </React.Fragment>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
