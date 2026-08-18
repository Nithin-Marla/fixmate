// Shared location utilities used by both the Customer and Service Partner
// dashboards. Keeping validation + browser GPS in one place means the two
// flows can never drift apart.

// Parse a latitude string: must be a finite number in [-90, 90].
export const parseLatitude = (value) => {
  const trimmed = String(value ?? '').trim();
  if (trimmed === '') {
    return { value: null, error: 'Please enter a latitude.' };
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    return { value: null, error: 'Latitude must be a valid number.' };
  }
  if (n < -90 || n > 90) {
    return { value: null, error: 'Latitude must be between -90 and 90.' };
  }
  return { value: n, error: null };
};

// Parse a longitude string: must be a finite number in [-180, 180].
export const parseLongitude = (value) => {
  const trimmed = String(value ?? '').trim();
  if (trimmed === '') {
    return { value: null, error: 'Please enter a longitude.' };
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    return { value: null, error: 'Longitude must be a valid number.' };
  }
  if (n < -180 || n > 180) {
    return { value: null, error: 'Longitude must be between -180 and 180.' };
  }
  return { value: n, error: null };
};

// Validate a full pending location. Returns { latitude, longitude } or an
// error string naming the first invalid field.
export const validateLocation = (latValue, lonValue) => {
  const lat = parseLatitude(latValue);
  if (lat.error) return { error: lat.error };
  const lon = parseLongitude(lonValue);
  if (lon.error) return { error: lon.error };
  return { latitude: lat.value, longitude: lon.value, error: null };
};

// One-shot browser/device GPS read via navigator.geolocation.getCurrentPosition.
// Resolves { success: true, coords } or { success: false, error } — never
// throws — so callers can show the right message for permission denials vs
// other failures.
export const getBrowserPosition = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        success: false,
        error: 'Unable to access your location. Please allow location permission or enter coordinates manually.'
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        success: true,
        coords: {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        }
      }),
      (err) => {
        const denied = err && err.code === err.PERMISSION_DENIED;
        resolve({
          success: false,
          error: denied
            ? 'Unable to access your location. Please allow location permission or enter coordinates manually.'
            : 'Unable to access your location. Please try again or enter coordinates manually.'
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
