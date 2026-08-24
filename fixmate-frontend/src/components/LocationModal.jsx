import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, Search, Clock, X, Loader2, AlertTriangle, Locate, ChevronRight, Trash2, Map } from 'lucide-react'
import { getBrowserPosition } from '../utils/location'
import { reverseGeocode, forwardGeocode } from '../utils/reverseGeocode'
import MapSelector from './MapSelector'
import { fetchWithAuth } from '../api'
import './LocationModal.css'

const STORAGE_KEY = 'fixmate_selected_location'
const RECENT_KEY = 'fixmate_recent_locations'
const MAX_RECENT = 5

/** Load the stored location from localStorage. */
export function getStoredLocation() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** Save a location to localStorage (active + recent). */
export function saveStoredLocation(loc) {
  if (!loc || !loc.latitude || !loc.longitude) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(loc))

  try {
    const recent = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    const filtered = recent.filter(
      (r) => !(Math.abs(r.latitude - loc.latitude) < 0.0001 && Math.abs(r.longitude - loc.longitude) < 0.0001)
    )
    filtered.unshift({
      name: loc.name,
      formattedAddress: loc.formattedAddress || null,
      latitude: loc.latitude,
      longitude: loc.longitude,
      timestamp: Date.now()
    })
    localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, MAX_RECENT)))
  } catch { /* ignore */ }
}

/** Clear the stored location from localStorage. */
export function clearStoredLocation() {
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * LocationModal — professional location selector.
 * Props: open, onClose, onSelect({latitude, longitude, name, formattedAddress?}), currentLocation
 */
export default function LocationModal({ open, onClose, onSelect, currentLocation, addresses, onAddressDeleted }) {
  const [mapOpen, setMapOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState('')
  const [recentLocations, setRecentLocations] = useState([])
  const searchTimeoutRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      try {
        const raw = localStorage.getItem(RECENT_KEY)
        setRecentLocations(raw ? JSON.parse(raw) : [])
      } catch { setRecentLocations([]) }
      setQuery('')
      setSearchResults([])
      setError('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // Debounced search — biased toward user's stored/current location
  const nearbyRef = useRef(null)
  useEffect(() => {
    // Capture the user's location once when modal opens for nearby biasing
    if (open) {
      const stored = getStoredLocation()
      if (stored?.latitude && stored?.longitude) {
        nearbyRef.current = { lat: stored.latitude, lon: stored.longitude }
      } else {
        // Try to get browser location silently (non-blocking)
        getBrowserPosition().then((res) => {
          if (res.success) nearbyRef.current = { lat: res.coords.latitude, lon: res.coords.longitude }
        })
      }
    }
  }, [open])

  useEffect(() => {
    if (!query.trim()) { setSearchResults([]); return }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true)
      setError('')
      try {
        const results = await forwardGeocode(query.trim(), 6, nearbyRef.current)
        setSearchResults(results)
      } catch {
        setError('Unable to search locations. Please try again.')
        setSearchResults([])
      } finally { setSearching(false) }
    }, 400)
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current) }
  }, [query])

  const handleSelectResult = useCallback((result) => {
    onSelect({ latitude: result.latitude, longitude: result.longitude, name: result.name, formattedAddress: result.formattedAddress })
    onClose()
  }, [onSelect, onClose])

  const handleSelectRecent = useCallback((loc) => {
    onSelect({ latitude: loc.latitude, longitude: loc.longitude, name: loc.name, formattedAddress: loc.formattedAddress })
    onClose()
  }, [onSelect, onClose])

  const handleUseCurrentLocation = useCallback(async () => {
    setDetecting(true)
    setError('')
    const res = await getBrowserPosition()
    if (res.success) {
      const geo = await reverseGeocode(res.coords.latitude, res.coords.longitude)
      onSelect(geo)
      onClose()
    } else {
      setError(res.error)
    }
    setDetecting(false)
  }, [onSelect, onClose])

  if (!open) return null

  return (
    <div className="location-modal-overlay" onClick={mapOpen ? undefined : onClose}>
      <div className="location-modal" onClick={(e) => e.stopPropagation()}>
        <div className="location-modal-header">
          <div className="location-modal-title">
            <MapPin size={18} />
            <span>Select your location</span>
          </div>
          <button className="location-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

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
          {error && (
            <div className="location-modal-error">
              <AlertTriangle size={16} />
              <div>
                <div className="location-modal-error-text">{error}</div>
                <div className="location-modal-error-hint">Please allow location permission or search manually.</div>
              </div>
            </div>
          )}

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

          <button
            className="location-option location-option-map"
            onClick={() => setMapOpen(true)}
          >
            <div className="location-option-icon location-option-icon-map">
              <Map size={18} />
            </div>
            <div className="location-option-text">
              <div className="location-option-title">Select on map</div>
              <div className="location-option-subtitle">Choose a location directly from the map</div>
            </div>
            <ChevronRight size={16} className="location-option-arrow" />
          </button>

          {searchResults.length > 0 && (
            <div className="location-section">
              <div className="location-section-title">Search Results</div>
              {searchResults.map((result, i) => (
                <button key={`${i}`} className="location-option" onClick={() => handleSelectResult(result)}>
                  <div className="location-option-icon"><MapPin size={16} /></div>
                  <div className="location-option-text">
                    <div className="location-option-title">{result.name}</div>
                    {result.formattedAddress && (
                      <div className="location-option-subtitle">{result.formattedAddress}</div>
                    )}
                  </div>
                  <ChevronRight size={16} className="location-option-arrow" />
                </button>
              ))}
            </div>
          )}

          {searching && (
            <div className="location-searching">
              <Loader2 size={16} className="spin" />
              <span>Searching...</span>
            </div>
          )}

          {!query && addresses && addresses.length > 0 && (
            <div className="location-section">
              <div className="location-section-title"><MapPin size={14} /> Saved addresses</div>
              {addresses.map((addr) => (
                <div key={`saved-${addr.id}`} className="location-option" style={{ display: 'flex', alignItems: 'center' }}>
                  <button 
                    className="location-option-content"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                    onClick={() => {
                      onSelect({
                        latitude: addr.latitude,
                        longitude: addr.longitude,
                        name: addr.street,
                        formattedAddress: `${addr.buildingName ? addr.buildingName + ', ' : ''}${addr.street}, ${addr.city}, ${addr.state} - ${addr.zipCode}`
                      });
                      onClose();
                    }}
                  >
                    <div className="location-option-icon location-option-icon-recent"><MapPin size={14} /></div>
                    <div className="location-option-text">
                      <div className="location-option-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {addr.street}
                        {addr.isDefault && <span className="badge badge-accent badge-sm text-[10px] h-4 leading-[14px]">Default</span>}
                      </div>
                      <div className="location-option-subtitle">
                        {addr.buildingName ? `${addr.buildingName}, ` : ''}{addr.city}, {addr.state} - {addr.zipCode}
                      </div>
                    </div>
                  </button>
                  <button 
                    className="btn btn-ghost btn-sm text-danger hover:bg-danger/10" 
                    style={{ padding: '0.25rem', height: 'auto', minHeight: 0 }}
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!window.confirm("Are you sure you want to delete this address?")) return;
                      try {
                        const { data } = await fetchWithAuth(`/addresses/${addr.id}`, { method: 'DELETE' });
                        if (data.success && onAddressDeleted) {
                          onAddressDeleted(addr.id);
                        }
                      } catch (err) {
                        alert(err.message || 'Failed to delete address');
                      }
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!query && recentLocations.length > 0 && (
            <div className="location-section">
              <div className="location-section-header">
                <div className="location-section-title"><Clock size={14} /> Recent locations</div>
                <button className="location-section-action" onClick={() => { localStorage.removeItem(RECENT_KEY); setRecentLocations([]) }}>
                  <Trash2 size={12} /> Clear
                </button>
              </div>
              {recentLocations.map((loc, i) => (
                <button key={`recent-${i}`} className="location-option" onClick={() => handleSelectRecent(loc)}>
                  <div className="location-option-icon location-option-icon-recent"><MapPin size={14} /></div>
                  <div className="location-option-text">
                    <div className="location-option-title">{loc.name}</div>
                    {loc.formattedAddress && (
                      <div className="location-option-subtitle">{loc.formattedAddress}</div>
                    )}
                  </div>
                  <ChevronRight size={16} className="location-option-arrow" />
                </button>
              ))}
            </div>
          )}

          {currentLocation && !query && (
            <div className="location-section" style={{ marginTop: 'auto', paddingTop: '0.75rem' }}>
              <button className="location-option location-option-danger" onClick={() => { clearStoredLocation(); onSelect(null); onClose() }}>
                <div className="location-option-icon location-option-icon-danger"><X size={16} /></div>
                <div className="location-option-text">
                  <div className="location-option-title">Clear current location</div>
                  <div className="location-option-subtitle">Remove the selected location</div>
                </div>
              </button>
            </div>
          )}

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

      <MapSelector
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        onSelect={(loc) => { onSelect(loc); onClose() }}
      />
    </div>
  )
}
