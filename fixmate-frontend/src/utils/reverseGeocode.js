/**
 * Shared reverse geocoding utility.
 * Converts latitude/longitude to a human-readable location name using
 * Nominatim (OpenStreetMap) — free, no API key required.
 *
 * Returns a location object: { name, formattedAddress, latitude, longitude, street, city, state, zipCode, country }
 * Falls back gracefully to coordinates if geocoding fails.
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'

/**
 * Build a short, human-friendly display name from a Nominatim address object.
 * Prioritizes specificity: neighbourhood > suburb > city > town > village > state.
 */
function buildDisplayName(addr = {}, fullName = '') {
  // Most specific to least specific
  const specific = addr.neighbourhood || addr.suburb || addr.quarter || addr.hamlet || addr.city_district
  const city = addr.city || addr.town || addr.village || addr.municipality || addr.county
  const state = addr.state

  // If we have a specific area + city, use that (e.g. "Kukatpally, Hyderabad")
  if (specific && city) return `${specific}, ${city}`
  // If we have a city + state, use that (e.g. "Hyderabad, Telangana")
  if (city && state) return `${city}, ${state}`
  // If we have just a city
  if (city) return city
  // If we have a state
  if (state) return state

  // Try to extract something from the full display_name
  if (fullName) {
    const parts = fullName.split(',').map(s => s.trim()).filter(Boolean)
    if (parts.length >= 2) return parts.slice(0, 2).join(', ')
    if (parts.length === 1) return parts[0]
  }

  return null
}

/**
 * Build a secondary/backup line with more address context.
 */
function buildSecondaryAddress(addr = {}) {
  const city = addr.city || addr.town || addr.village || addr.municipality
  const state = addr.state
  const country = addr.country

  const parts = [city, state || country].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}

/**
 * Extract structured address fields from Nominatim address object.
 * Used to auto-fill address forms (street, city, state, zipCode, country).
 */
function buildAddressDetails(addr = {}) {
  const buildingName = addr.building || addr.house_name || addr.amenity || ''
  const street = [addr.house_number, addr.road || addr.pedestrian || addr.footway].filter(Boolean).join(' ')
  const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || ''
  const state = addr.state || ''
  const zipCode = addr.postcode || ''
  const country = addr.country || ''
  return { buildingName, street, city, state, zipCode, country }
}

/**
 * Reverse-geocode latitude/longitude to a human-readable location name.
 *
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<{latitude: number, longitude: number, name: string, formattedAddress: string|null}>}
 */
export async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(
      `${NOMINATIM_BASE}/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    )
    if (!res.ok) throw new Error('Geocoding request failed')
    const data = await res.json()
    const addr = data.address || {}

    const name = buildDisplayName(addr, data.display_name)
    const secondary = buildSecondaryAddress(addr)

    const details = buildAddressDetails(addr)

    return {
      latitude: lat,
      longitude: lon,
      name: name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      formattedAddress: secondary || data.display_name || null,
      ...details
    }
  } catch {
    return {
      latitude: lat,
      longitude: lon,
      name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      formattedAddress: null,
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    }
  }
}

/**
 * Forward-geocode a search query to location results via Nominatim.
 * When nearLat/nearLon are provided, results are biased toward that area
 * using a viewbox (~200 km radius) so users see nearby locations first.
 *
 * @param {string} query - Search query
 * @param {number} limit - Max results (default 6)
 * @param {object} [nearby] - Optional { lat, lon } to bias results
 * @returns {Promise<Array<{name: string, formattedAddress: string|null, latitude: number, longitude: number}>>}
 */
export async function forwardGeocode(query, limit = 6, nearby = null) {
  let url = `${NOMINATIM_BASE}/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=${limit}&addressdetails=1`

  // Bias results toward the user's current/stored location (~200 km viewbox)
  if (nearby && nearby.lat && nearby.lon) {
    const r = 2 // ~2 degrees ≈ 200 km
    url += `&viewbox=${(nearby.lon - r).toFixed(2)},${(nearby.lat - r).toFixed(2)},${(nearby.lon + r).toFixed(2)},${(nearby.lat + r).toFixed(2)}`
    url += `&bounded=0` // 0 = prefer but don't restrict to viewbox
  }

  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
  if (!res.ok) throw new Error('Search failed')
  const results = await res.json()

  return results.map(r => {
    const addr = r.address || {}
    const name = buildDisplayName(addr, r.display_name) || r.display_name?.split(',')[0] || 'Unknown'
    const secondary = buildSecondaryAddress(addr)
    return {
      name,
      formattedAddress: secondary,
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
      raw: r
    }
  })
}
