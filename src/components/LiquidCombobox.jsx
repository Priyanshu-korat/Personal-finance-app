import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';

/**
 * LiquidCombobox — A searchable autocomplete input.
 * Uses a Portal so the dropdown is never clipped by parent overflow rules.
 */
export default function LiquidCombobox({ 
  value, 
  onChange, 
  options = [], 
  placeholder = 'Select...', 
  disabled = false 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Sync prop value to local query if it changes externally (e.g. type change resets name)
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Close dropdown when clicking outside both the input and the portal dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      const clickedInput = inputRef.current && inputRef.current.contains(event.target);
      const clickedDropdown = dropdownRef.current && dropdownRef.current.contains(event.target);
      if (!clickedInput && !clickedDropdown) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Recalculate dropdown position whenever it opens or on scroll/resize
  useEffect(() => {
    if (!isOpen || !inputRef.current) return;
    const updatePos = () => {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,   // fixed = viewport relative, no scrollY needed
        left: rect.left,
        width: rect.width,
      });
    };
    updatePos();
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [isOpen]);

  const filteredOptions = query === ''
    ? options
    : options.filter(opt => {
        const q = query.toLowerCase();
        const lowerOpt = opt.toLowerCase();
        if (lowerOpt.includes(q)) return true;
        // Match acronyms (e.g. 'sbi' → 'State Bank of India')
        const stopWords = ['of', 'and', '&', 'the'];
        const acronym = opt.split(' ')
          .filter(w => w && !stopWords.includes(w.toLowerCase()))
          .map(w => w[0].toLowerCase())
          .join('');
        return acronym.startsWith(q) || acronym.includes(q);
      });

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    onChange(e.target.value);
    setIsOpen(true);
  };

  const handleOptionClick = (opt) => {
    setQuery(opt);
    onChange(opt);
    setIsOpen(false);
  };

  const dropdown = isOpen && filteredOptions.length > 0 && ReactDOM.createPortal(
    <ul
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: dropdownPos.width,
        maxHeight: 220,
        overflowY: 'auto',
        background: '#1c1c28',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 12,
        padding: 0,
        listStyle: 'none',
        zIndex: 99999,
        boxShadow: '0 16px 48px rgba(0,0,0,0.9)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      {filteredOptions.map((opt, i) => (
        <li
          key={i}
          onMouseDown={(e) => {
            e.preventDefault(); // prevent blur before click fires
            handleOptionClick(opt);
          }}
          style={{
            padding: '11px 16px',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.9)',
            fontSize: 15,
            borderBottom: i === filteredOptions.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          {opt}
        </li>
      ))}
    </ul>,
    document.body
  );

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.9)',
          fontSize: 15,
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.2s ease',
        }}
        onFocusCapture={(e) => { e.target.style.borderColor = 'rgba(100,160,255,0.5)'; }}
        onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
      />
      {dropdown}
    </div>
  );
}
