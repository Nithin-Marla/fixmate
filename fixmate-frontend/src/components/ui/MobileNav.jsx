import React from 'react'

/**
 * Mobile bottom navigation. `items` is an array of { id, label, icon }.
 * `active` is the current item id; `onNavigate(id)` scrolls to a section
 * or switches view.
 */
export default function MobileNav({ items = [], active = '', onNavigate }) {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            className={`mobile-nav-item ${active === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

