import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import './Dropdown.css'

/**
 * A lightweight custom dropdown that renders its options inside the page
 * (unlike a native <select>, whose OS-level popup can overflow the window).
 *
 * Props:
 *  - value:       the currently selected option value (string) or ''
 *  - onChange:    (value) => void
 *  - options:     [{ value, label }]
 *  - placeholder: text shown when nothing is selected
 *  - emptyText:   text shown when the option list is empty
 *  - disabled:    disable the trigger
 */
export default function Dropdown({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  emptyText = 'No options available',
  disabled = false
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef(null);

  const selected = options.find((o) => String(o.value) === String(value));

  const close = () => setOpen(false);

  // Close when clicking outside the dropdown.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        close();
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const toggle = () => {
    if (!disabled) setOpen((o) => !o);
  };

  const select = (optionValue) => {
    onChange(optionValue);
    close();
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
        setHighlight(Math.max(0, options.findIndex((o) => String(o.value) === String(value))));
      }
      return;
    }
    if (e.key === 'Escape') {
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(options.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (options[highlight]) select(options[highlight].value);
    } else if (e.key === 'Tab') {
      close();
    }
  };

  return (
    <div className="dropdown" ref={rootRef}>
      <button
        type="button"
        className={`form-input dropdown-trigger ${open ? 'dropdown-trigger-open' : ''}`}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        <span className={value ? 'dropdown-value' : 'dropdown-placeholder'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={16} className={`dropdown-chevron ${open ? 'dropdown-chevron-open' : ''}`} />
      </button>

      {open && (
        <ul className="dropdown-menu" role="listbox" onMouseDown={(e) => e.preventDefault()}>
          {options.length === 0 ? (
            <li className="dropdown-empty">{emptyText}</li>
          ) : (
            options.map((opt, i) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={String(opt.value) === String(value)}
                className={[
                  'dropdown-option',
                  String(opt.value) === String(value) ? 'dropdown-option-selected' : '',
                  i === highlight ? 'dropdown-option-highlighted' : ''
                ].filter(Boolean).join(' ')}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => select(opt.value)}
              >
                {opt.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
