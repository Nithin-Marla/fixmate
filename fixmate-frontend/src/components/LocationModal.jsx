import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, Navigation, Search, Clock, Star, X, Loader2, AlertTriangle, Locate, ChevronRight, Trash2 } from 'lucide-react'
import { getBrowserPosition } from '../utils/location'
import './LocationModal.css'

const STORAGE_KEY = 'fixmate_selected_location'
const RECENT_KEY = 'fixmate_recent_locations'
const MAX_RECENT = 5

/**
 * Loads the stored location from localStorage.
 * Returns { latitude, longitude, name } or null.
 */
export function getStoredLocation() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Saves a location to localStorage (active + recent).
 */
export function saveStoredLocation(loc) {
  if (!loc || !loc.latitude || !loc.longitude) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(loc))

  // Update recent locations
  try {
    const recent = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    const filtered = recent.filter(
      (r) => !(Math.abs(r.latitude - loc.latitude) < 0.0001 && Math.abs(r.longitude - loc.longitude) < 0.0001)
    )
    filtered.unshift({ name: loc.name, latitude: loc.latitude, longitude: loc.longitude, timestamp: Date.now() })
    localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, MAX_RECENT)))
  } catch {
    // ignore
  }
}

/**
 * Clears the stored location from localStorage.
 */
export function clearStoredLocation() {
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Reverse-geocode lat/lon to a human-readable place name via Nominatim (free, no API key).
 * Falls back to coordinates if the request fails.
 */
async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    )
    if (!res.ok) throw new Error('geocode failed')
    const data = await res.json()
    // Build a short display name from the address
    const addr = data.address || {}
    const parts = [addr.city || addr.town || addr.village || addr.municipality, addr.state].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : (data.name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`)
  } catch {
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`
  }
}

/**
 * Forward-geocode a search query to lat/lon via Nominatim.
 */
async function forwardGeocode(query) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
    { headers: { 'Accept-Language': 'en' } }
  )
  if (!res.ok) throw new Error('Search failed')
  return await res.json()
}

/**
 * LocationModal — professional location selector.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - onSelect: (location) => void — called with { latitude, longitude, name }
 *  - currentLocation: { latitude, longitude, name } | null
 */
export default function LocationModal({ open, onClose, onSelect, currentLocation }) {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState('')
  const [recentLocations, setRecentLocations] = useState([])
  const searchTimeoutRef = useRef(null)
  const inputRef = useRef(null)

  // Load recent locations on open
  useEffect(() => {
    if (open) {
      try {
        const raw = localStorage.getItem(RECENT_KEY)
        setRecentLocations(raw ? JSON.parse(raw) : [])
      } catch {
        setRecentLocations([])
      }
      setQuery('')
      setSearchResults([])
      setError('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true)
      setError('')
      try {
        const results = await forwardGeocode(query.trim())
        setSearchResults(results)
      } catch {
        setError('Unable to search locations. Please try again.')
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current) }
  }, [query])

  const handleSelectResult = useCallback((result) => {
    const lat = parseFloat(result.lat)
    const lon = parseFloat(result.lon)
    const name = result.display_name?.split(',').slice(0, 2).join(',').trim() || `${lat.toFixed(4)}, ${lon.toFixed(4)}`
    onSelect({ latitude: lat, longitude: lon, name })
    onClose()
  }, [onSelect, onClose])

  const handleSelectRecent = useCallback((loc) => {
    onSelect({ latitude: loc.latitude, longitude: loc.longitude, name: loc.name })
    onClose()
  }, [onSelect, onClose])

  const handleUseCurrentLocation = useCallback(async () => {
    setDetecting(true)
    setError('')
    const res = await getBrowserPosition()
    if (res.success) {
      const name = await reverseGeocode(res.coords.latitude, res.coords.longitude)
      onSelect({ latitude: res.coords.latitude, longitude: res.coords.longitude, name })
      onClose()
    } else {
      setError(res.error)
    }
    setDetecting(false)
  }, [onSelect, onClose])

  const handleClearRecent = useCallback(() => {
    localStorage.removeItem(RECENT_KEY)
    setRecentLocations([])
  }, [])

  const handleClearLocation = useCallback(() => {
    clearStoredLocation()
    onSelect(null)
    onClose()
  }, [onSelect, onClose])

  if (!open) return null

  return (
    <div className="location-modal-overlay" onClick={onClose}>
      <div className="location-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="location-modal-header">
          <div className="location-modal-title">
            <MapPin size={18} />
            <span>Select your location</span>
          </div>
          <button className="location-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="location-modal-search">
          <Search size={16} className="location-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="location-search-input"
            placeholder="Search for a city, area, or address..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="location-search-clear" onClick={() => setQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="location-modal-body">
          {/* Error state */}
          {error && (
            <div className="location-modal-error">
              <AlertTriangle size={16} />
              <div>
                <div className="location-modal-error-text">{error}</div>
                <div className="location-modal-error-hint">Please allow location permission or search manually.</div>
              </div>
            </div>
          )}

          {/* Use current location */}
          <button
            className="location-option location-option-primary"
            onClick={handleUseCurrentLocation}
            disabled={detecting}
          >
            <div className="location-option-icon location-option-icon-gps">
              {detecting ? <Loader2 size={18} className="spin" /> : <Locate size={18} />}
            </div>
            <div className="location-option-text">
              <div className="location-option-title">
                {detecting ? 'Detecting location...' : 'Use current location'}
              </div>
              <div className="location-option-subtitle">
                {detecting ? 'Please wait while we access your GPS' : 'Detect my current location automatically'}
              </div>
            </div>
            {!detecting && <ChevronRight size={16} className="location-option-arrow" />}
          </button>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="location-section">
              <div className="location-section-title">Search Results</div>
              {searchResults.map((result, i) => (
                <button
                  key={`${result.place_id || i}`}
                  className="location-option"
                  onClick={() => handleSelectResult(result)}
                >
                  <div className="location-option-icon">
                    <MapPin size={16} />
                  </div>
                  <div className="location-option-text">
                    <div className="location-option-title">
                      {result.display_name?.split(',')[0] || result.name || 'Unknown'}
                    </div>
                    <div className="location-option-subtitle">
                      {result.display_name?.split(',').slice(1, 3).join(',').trim() || ''}
                    </div>
                  </div>
                  <ChevronRight size={16} className="location-option-arrow" />
                </button>
              ))}
            </div>
          )}

          {/* Searching indicator */}
          {searching && (
            <div className="location-searching">
              <Loader2 size={16} className="spin" />
              <span>Searching...</span>
            </div>
          )}

          {/* Recent locations */}
          {!query && recentLocations.length > 0 && (
            <div className="location-section">
              <div className="location-section-header">
                <div className="location-section-title">
                  <Clock size={14} />
                  Recent locations
                </div>
                <button className="location-section-action" onClick={handleClearRecent}>
                  <Trash2 size={12} /> Clear
                </button>
              </div>
              {recentLocations.map((loc, i) => (
                <button
                  key={`recent-${i}`}
                  className="location-option"
                  onClick={() => handleSelectRecent(loc)}
                >
                  <div className="location-option-icon location-option-icon-recent">
                    <MapPin size={14} />
                  </div>
                  <div className="location-option-text">
                    <div className="location-option-title">{loc.name}</div>
                    <div className="location-option-subtitle">
                      {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                    </div>
                  </div>
                  <ChevronRight size={16} className="location-option-arrow" />
                </button>
              ))}
            </div>
          )}

          {/* Clear location */}
          {currentLocation && !query && (
            <div className="location-section" style={{ marginTop: 'auto', paddingTop: '0.75rem' }}>
              <button className="location-option location-option-danger" onClick={handleClearLocation}>
                <div className="location-option-icon location-option-icon-danger">
                  <X size={16} />
                </div>
                <div className="location-option-text">
                  <div className="location-option-title">Clear current location</div>
                  <div className="location-option-subtitle">Remove the selected location</div>
                </div>
              </button>
            </div>
          )}

          {/* Empty state */}
          {!query && recentLocations.length === 0 && !error && (
            <div className="location-empty">
              <MapPin size={32} />
              <p>No location selected yet</p>
              <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                Search for a location or use your current GPS position to find nearby professionals.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
