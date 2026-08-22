import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Search, X, Clock, Trash2, TrendingUp, AlertCircle } from 'lucide-react'
import {
  searchCatalogue,
  POPULAR_SERVICES,
  COMMON_PROBLEMS,
  getRecentSearches,
  saveRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} from '../utils/serviceCatalogue'
import './SmartSearch.css'

/**
 * SmartSearch — enterprise-level search bar with autocomplete,
 * keyboard navigation, recent searches, and service/problem matching.
 *
 * Props:
 *   onResultSelect(entry, categoryName) — called when user picks a result
 *   placeholder — input placeholder
 *   className — extra class on the wrapper
 *   compact — smaller navbar variant
 */
export default function SmartSearch({
  onResultSelect,
  placeholder = 'Search for a service or problem...',
  className = '',
  compact = false,
}) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const [recentSearches, setRecentSearches] = useState(() => getRecentSearches())

  const wrapperRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Search results based on current query
  const searchResults = useMemo(() => searchCatalogue(query, 10), [query])

  // Build the full suggestion list for keyboard navigation
  // Sections: recent (if no query), popular (if no query), common problems (if no query), search results (if query), no-results state
  const showIdle = isOpen && !query.trim()
  const showResults = isOpen && query.trim().length > 0
  const hasResults = searchResults.length > 0

  // Flatten all navigable items into a single array for arrow key tracking
  const navigableItems = useMemo(() => {
    const items = []
    if (showIdle) {
      // Recent searches
      for (const r of recentSearches.slice(0, 5)) {
        items.push({ type: 'recent', query: r.query })
      }
      // Popular services
      for (const s of POPULAR_SERVICES.slice(0, 6)) {
        items.push({ type: 'service', entry: s })
      }
      // Common problems
      for (const p of COMMON_PROBLEMS.slice(0, 4)) {
        items.push({ type: 'problem', entry: p })
      }
    } else if (showResults) {
      for (const r of searchResults) {
        items.push({ type: 'result', entry: r })
      }
    }
    return items
  }, [showIdle, showResults, recentSearches, searchResults])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false)
        setHighlightIdx(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setHighlightIdx(-1)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen])

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIdx < 0 || !listRef.current) return
    const items = listRef.current.querySelectorAll('[data-nav-item]')
    items[highlightIdx]?.scrollIntoView({ block: 'nearest' })
  }, [highlightIdx])

  const selectEntry = useCallback((entry) => {
    saveRecentSearch(entry.name)
    setRecentSearches(getRecentSearches())
    setQuery('')
    setIsOpen(false)
    setHighlightIdx(-1)
    onResultSelect?.(entry, entry.category)
  }, [onResultSelect])

  const selectRecent = useCallback((q) => {
    setQuery(q)
    // Don't save to recents again — it's already there
    // Immediately show results for this query
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = useCallback((e) => {
    if (!isOpen) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx((prev) => (prev < navigableItems.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx((prev) => (prev > 0 ? prev - 1 : navigableItems.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightIdx >= 0 && highlightIdx < navigableItems.length) {
        const item = navigableItems[highlightIdx]
        if (item.type === 'recent') selectRecent(item.query)
        else if (item.entry) selectEntry(item.entry)
      } else if (query.trim()) {
        // If something is typed but nothing highlighted, treat as a direct search
        const results = searchCatalogue(query, 1)
        if (results.length > 0) {
          selectEntry(results[0])
        } else {
          // Search with whatever was typed
          saveRecentSearch(query.trim())
          setRecentSearches(getRecentSearches())
          onResultSelect?.({ name: query.trim(), category: null, icon: '🔍', type: 'search' }, null)
          setIsOpen(false)
        }
      }
    }
  }, [isOpen, highlightIdx, navigableItems, query, selectEntry, selectRecent, onResultSelect])

  const handleClear = useCallback(() => {
    setQuery('')
    setHighlightIdx(-1)
    inputRef.current?.focus()
  }, [])

  const handleClearAllRecent = useCallback(() => {
    clearRecentSearches()
    setRecentSearches([])
  }, [])

  const handleRemoveRecent = useCallback((e, q) => {
    e.stopPropagation()
    removeRecentSearch(q)
    setRecentSearches(getRecentSearches())
  }, [])

  const handleFocus = useCallback(() => {
    setIsOpen(true)
    setHighlightIdx(-1)
  }, [])

  return (
    <div ref={wrapperRef} className={`smart-search ${compact ? 'smart-search-compact' : ''} ${className}`}>
      {/* Search input */}
      <div className="smart-search-bar">
        <Search size={compact ? 16 : 18} className="smart-search-icon" />
        <input
          ref={inputRef}
          type="text"
          className="smart-search-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setHighlightIdx(-1); }}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        />
        {query && (
          <button className="smart-search-clear" onClick={handleClear} aria-label="Clear search">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="smart-search-dropdown" role="listbox" ref={listRef}>
          {/* ── Idle state (no query) ── */}
          {showIdle && (
            <>
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="ss-section">
                  <div className="ss-section-header">
                    <span className="ss-section-title"><Clock size={13} /> Recent searches</span>
                    <button className="ss-section-action" onClick={handleClearAllRecent}>Clear all</button>
                  </div>
                  {recentSearches.slice(0, 5).map((r) => {
                    const navIdx = navigableItems.findIndex((n) => n.type === 'recent' && n.query === r.query)
                    return (
                      <button
                        key={r.query}
                        className={`ss-item ss-item-recent ${navIdx === highlightIdx ? 'ss-item-active' : ''}`}
                        data-nav-item
                        onClick={() => selectRecent(r.query)}
                        onMouseEnter={() => setHighlightIdx(navIdx)}
                      >
                        <Clock size={14} className="ss-item-icon ss-item-icon-muted" />
                        <span className="ss-item-name">{r.query}</span>
                        <span
                          className="ss-item-remove"
                          onClick={(e) => handleRemoveRecent(e, r.query)}
                          aria-label={`Remove ${r.query}`}
                        >
                          <Trash2 size={12} />
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Popular Services */}
              <div className="ss-section">
                <div className="ss-section-header">
                  <span className="ss-section-title"><TrendingUp size={13} /> Popular services</span>
                </div>
                {POPULAR_SERVICES.slice(0, 6).map((s) => {
                  const navIdx = navigableItems.findIndex((n) => n.type === 'service' && n.entry?.name === s.name)
                  return (
                    <button
                      key={s.name}
                      className={`ss-item ${navIdx === highlightIdx ? 'ss-item-active' : ''}`}
                      data-nav-item
                      onClick={() => selectEntry(s)}
                      onMouseEnter={() => setHighlightIdx(navIdx)}
                    >
                      <span className="ss-item-icon">{s.icon}</span>
                      <span className="ss-item-name">{s.name}</span>
                      <span className="ss-item-category">{s.category}</span>
                    </button>
                  )
                })}
              </div>

              {/* Common Problems */}
              <div className="ss-section">
                <div className="ss-section-header">
                  <span className="ss-section-title"><AlertCircle size={13} /> Common problems</span>
                </div>
                {COMMON_PROBLEMS.slice(0, 4).map((p) => {
                  const navIdx = navigableItems.findIndex((n) => n.type === 'problem' && n.entry?.name === p.name)
                  return (
                    <button
                      key={p.name}
                      className={`ss-item ${navIdx === highlightIdx ? 'ss-item-active' : ''}`}
                      data-nav-item
                      onClick={() => selectEntry(p)}
                      onMouseEnter={() => setHighlightIdx(navIdx)}
                    >
                      <span className="ss-item-icon">{p.icon}</span>
                      <span className="ss-item-name">{p.name}</span>
                      <span className="ss-item-category">{p.category}</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* ── Search results (typing) ── */}
          {showResults && hasResults && (
            <div className="ss-section">
              <div className="ss-section-header">
                <span className="ss-section-title">
                  <Search size={13} /> Results for &ldquo;{query}&rdquo;
                </span>
              </div>
              {searchResults.map((r) => {
                const navIdx = navigableItems.findIndex((n) => n.type === 'result' && n.entry?.name === r.name)
                return (
                  <button
                    key={`${r.category}-${r.name}`}
                    className={`ss-item ${navIdx === highlightIdx ? 'ss-item-active' : ''}`}
                    data-nav-item
                    onClick={() => selectEntry(r)}
                    onMouseEnter={() => setHighlightIdx(navIdx)}
                  >
                    <span className="ss-item-icon">{r.icon}</span>
                    <div className="ss-item-content">
                      <span className="ss-item-name">{r.name}</span>
                      <span className="ss-item-desc">
                        {r.type === 'problem' ? 'Problem · ' : ''}{r.category}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* ── No results ── */}
          {showResults && !hasResults && (
            <div className="ss-section ss-empty">
              <div className="ss-empty-icon">
                <Search size={24} />
              </div>
              <div className="ss-empty-text">No services found for &ldquo;{query}&rdquo;</div>
              <div className="ss-empty-hint">
                Try searching for: Plumber, Electrician, AC Repair, Cleaning
              </div>
              <button className="ss-empty-action" onClick={handleClear}>Clear Search</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
