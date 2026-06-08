import React, { useState, useRef, useEffect } from 'react';

export default function AutocompleteInput({ value, onChange, suggestions, placeholder, className, ...props }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Filter suggestions based on input (matching name or symbol)
  const filteredSuggestions = suggestions.filter((item) => {
    const searchStr = (value || '').toLowerCase();
    // If suggestions are strings, handle them. If objects, check name/symbol
    if (typeof item === 'string') return item.toLowerCase().includes(searchStr);
    return item.name.toLowerCase().includes(searchStr) || 
           (item.symbol && item.symbol.toLowerCase().includes(searchStr));
  }).slice(0, 50);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        className={className}
        placeholder={placeholder}
        value={value}
        {...props}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        style={{ paddingRight: '20px', ...props.style }}
      />
      <div style={{ position: 'absolute', right: '0', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(255,255,255,0.35)' }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
      
      {isOpen && filteredSuggestions.length > 0 && (
        <div 
          className="anim-fade-in"
          style={{ 
            position: 'absolute', 
            top: '100%', 
            left: 0, 
            right: 0, 
            marginTop: '8px',
            maxHeight: '220px',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            zIndex: 9999, // Ensure it's above other buttons
            backgroundColor: '#1a1a1a', // Solid dark background to fix transparency issue
            border: '1px solid var(--lg-border)',
            borderRadius: 'var(--r-md)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.8)', // Strong shadow
          }}
        >
          {filteredSuggestions.map((suggestion, index) => {
            const isObj = typeof suggestion === 'object';
            const displayName = isObj ? suggestion.name : suggestion;
            const displaySymbol = isObj ? suggestion.symbol : null;
            
            // Mutual funds from mfapi have numeric scheme codes as symbols. Stocks have letters.
            const isNumericSymbol = displaySymbol && /^\d+$/.test(displaySymbol);

            return (
              <div 
                key={index}
                className="cursor-pointer"
                style={{ 
                  padding: '12px 16px', 
                  borderBottom: index < filteredSuggestions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  background: 'transparent',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                onClick={() => {
                  onChange(displayName);
                  setIsOpen(false);
                }}
              >
                {displaySymbol ? (
                  isNumericSymbol ? (
                    <div className="flex flex-col">
                      <span className="fw-bold" style={{ color: 'var(--c-text)', fontSize: '13px', lineHeight: '1.4' }}>{displayName}</span>
                      <span className="caption t-tertiary mt-1">Mutual Fund</span>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <span className="fw-bold" style={{ color: 'var(--c-text)' }}>{displaySymbol}</span>
                      <span className="caption t-tertiary mt-1">{displayName}</span>
                    </div>
                  )
                ) : (
                  <span className="t-secondary">{displayName}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
