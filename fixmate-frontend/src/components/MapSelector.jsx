import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { ArrowLeft, MapPin, Loader2, AlertTriangle, Crosshair, X } from 'lucide-react'
import { reverseGeocode, forwardGeocode } from '../utils/reverseGeocode'
import 'leaflet/dist/leaflet.css'
import './MapSelector.css'

// Fix Leaflet default marker icon path for bundled builds
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const DEFAULT_CENTER = [17.385, 78.4867] // Hyderabad
const DEFAULT_ZOOM = 13

// Custom marker icon
const pinIcon = new L.DivIcon({
  className: 'fixmate-pin',
  html: `<div class="fixmate-pin-inner"><svg width="24" height="36" viewBox="0 0 24 36" fill="none"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#6366f1"/><circle cx="12" cy="12" r="5" fill="white"/></svg></div>`,
  iconSize: [24, 36],
  iconAnchor: [12, 36],
  popupAnchor: [0, -36],
})

/** Sub-component: handles map click/drag events and marker movement. */
function MapEventsHandler({ onPositionChange, markerPosition }) {
  const map = useMap()

  // Fly to marker position when it changes (e.g., from search)
  useEffect(() => {
    if (markerPosition) {
      map.flyTo(markerPosition, Math.max(map.getZoom(), 14), { duration: 0.8 })
    }
  }, [markerPosition, map])

  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng)
    },
    dragend() {
      // Center on map center after drag
      const center = map.getCenter()
      onPositionChange(center.lat, center.lng)
    },
  })

  return null
}

/** Sub-component: recenters map to user's GPS location. */
function LocateButton({ onFound }) {
  const map = useMap()
  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 15, { duration: 0.8 })
        onFound(pos.coords.latitude, pos.coords.longitude)
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [map, onFound])

  return (
    <button className="map-locate-btn" onClick={handleLocate} title="Center on my location" type="button">
      <Crosshair size={18} />
    </button>
  )
}

/**
 * MapSelector — full-screen map picker for selecting a location.
 * Props: open, onClose, onSelect({latitude, longitude, name, formattedAddress, ...addressParts})
 */
export default function MapSelector({ open, onClose, onSelect }) {
  const [markerPos, setMarkerPos] = useState(null)
  const [address, setAddress] = useState(null)
  const [geocoding, setGeocoding] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchTimeoutRef = useRef(null)
  const geocodeTimeoutRef = useRef(null)

  // Start centered on user's stored/current location if available
  const [initialCenter, setInitialCenter] = useState(DEFAULT_CENTER)
  useEffect(() => {
    if (!open) return
    try {
      const raw = localStorage.getItem('fixmate_selected_location')
      if (raw) {
        const loc = JSON.parse(raw)
        if (loc?.latitude && loc?.longitude) {
          setInitialCenter([loc.latitude, loc.longitude])
        }
      }
    } catch { /* ignore */ }
    setMarkerPos(null)
    setAddress(null)
    setGeoError('')
    setSearchQuery('')
    setSearchResults([])
    setSearchOpen(false)
  }, [open])

  // Reverse geocode when marker moves (debounced)
  const handlePositionChange = useCallback((lat, lng) => {
    setMarkerPos([lat, lng])
    setGeoError('')
    if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current)
    geocodeTimeoutRef.current = setTimeout(async () => {
      setGeocoding(true)
      try {
        const result = await reverseGeocode(lat, lng)
        setAddress(result)
      } catch {
        setGeoError('We couldn\'t identify the exact address. You can move the pin or search for the location manually.')
        setAddress(null)
      } finally {
        setGeocoding(false)
      }
    }, 300)
  }, [])

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const nearby = markerPos ? { lat: markerPos[0], lon: markerPos[1] } : null
        const results = await forwardGeocode(searchQuery.trim(), 5, nearby)
        setSearchResults(results)
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current) }
  }, [searchQuery])

  const handleSelectSearchResult = useCallback((result) => {
    setMarkerPos([result.latitude, result.longitude])
    setAddress(result)
    setSearchQuery('')
    setSearchResults([])
    setSearchOpen(false)
  }, [])

  const handleConfirm = useCallback(() => {
    if (!markerPos || !address) return
    onSelect({
      latitude: markerPos[0],
      longitude: markerPos[1],
      name: address.name || 'Selected location',
      formattedAddress: address.formattedAddress || '',
      street: address.street || '',
      city: address.city || '',
      state: address.state || '',
      zipCode: address.zipCode || '',
      country: address.country || '',
    })
    onClose()
  }, [markerPos, address, onSelect, onClose])

  if (!open) return null

  return (
    <div className="map-selector-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="map-selector">
        {/* Header */}
        <div className="map-selector-header">
          <button className="map-back-btn" onClick={onClose} type="button">
            <ArrowLeft size={20} />
          </button>
          <span className="map-selector-title">Select location on map</span>
          <button className="map-close-btn" onClick={onClose} type="button" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Search bar overlay */}
        <div className="map-search-container">
          <div className="map-search-bar">
            <MapPin size={16} className="map-search-icon" />
            <input
              type="text"
              className="map-search-input"
              placeholder="Search for an area, street, or landmark"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true) }}
              onFocus={() => setSearchOpen(true)}
              onClick={(e) => e.stopPropagation()}
            />
            {searchQuery && (
              <button className="map-search-clear" onClick={() => { setSearchQuery(''); setSearchResults([]) }} type="button">
                <X size={14} />
              </button>
            )}
          </div>
          {searchOpen && searchResults.length > 0 && (
            <div className="map-search-results">
              {searchResults.map((r, i) => (
                <button key={i} className="map-search-result-item" onClick={() => handleSelectSearchResult(r)} type="button">
                  <MapPin size={14} />
                  <div>
                    <div className="map-search-result-name">{r.name}</div>
                    {r.formattedAddress && <div className="map-search-result-addr">{r.formattedAddress}</div>}
                  </div>
                </button>
              ))}
            </div>
          )}
          {searching && (
            <div className="map-search-loading">
              <Loader2 size={14} className="spin" /> Searching...
            </div>
          )}
        </div>

        {/* Map */}
        <div className="map-container" onClick={(e) => e.stopPropagation()}>
          <MapContainer
            center={initialCenter}
            zoom={DEFAULT_ZOOM}
            className="leaflet-map"
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
              eventHandlers={{ click: (e) => L.DomEvent.stopPropagation(e.originalEvent) }}
            />
            <MapEventsHandler onPositionChange={handlePositionChange} markerPosition={markerPos} />
            <LocateButton onFound={(lat, lng) => handlePositionChange(lat, lng)} />
            {markerPos && <Marker position={markerPos} icon={pinIcon} draggable={true} eventHandlers={{
              dragend: (e) => {
                const pos = e.target.getLatLng()
                handlePositionChange(pos.lat, pos.lng)
              }
            }} />}
          </MapContainer>

          {/* Center crosshair */}
          {!markerPos && (
            <div className="map-center-pin">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <line x1="12" y1="2" x2="12" y2="6" />
                <line x1="12" y1="18" x2="12" y2="22" />
                <line x1="2" y1="12" x2="6" y2="12" />
                <line x1="18" y1="12" x2="22" y2="12" />
              </svg>
            </div>
          )}

          {/* Tap hint */}
          {!markerPos && !address && (
            <div className="map-tap-hint">
              Tap anywhere on the map to place a pin
            </div>
          )}
        </div>

        {/* Bottom panel */}
        <div className="map-bottom-panel">
          {geocoding && (
            <div className="map-address-loading">
              <Loader2 size={14} className="spin" />
              <span>Identifying address...</span>
            </div>
          )}

          {geoError && !address && (
            <div className="map-address-error">
              <AlertTriangle size={14} />
              <span>{geoError}</span>
            </div>
          )}

          {address && !geocoding && (
            <div className="map-address-preview">
              <div className="map-address-icon">
                <MapPin size={18} />
              </div>
              <div className="map-address-details">
                <div className="map-address-primary">{address.name || 'Selected location'}</div>
                {address.formattedAddress && (
                  <div className="map-address-secondary">{address.formattedAddress}</div>
                )}
              </div>
            </div>
          )}

          {!markerPos && !geocoding && (
            <div className="map-address-hint">
              <MapPin size={14} />
              <span>Move the map or tap to choose a location</span>
            </div>
          )}

          <button
            className="map-confirm-btn"
            onClick={handleConfirm}
            disabled={!markerPos || !address || geocoding}
            type="button"
          >
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  )
}
