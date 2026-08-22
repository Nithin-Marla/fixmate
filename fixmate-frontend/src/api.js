export const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Parse a response body that may be JSON, plain text, or empty.
const parseBody = async (response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

// Browser GPS lives in src/utils/location.js (getBrowserPosition) so both
// dashboards share one implementation with proper error reporting.

export const fetchWithAuth = async (endpoint, options = {}) => {
  const isPublicRoute = endpoint.startsWith('/auth/');
  const headers = {
    'Content-Type': 'application/json',
    ...(isPublicRoute ? {} : getAuthHeaders()),
    ...options.headers,
  };

  let response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      'Could not connect to the server. Please make sure the backend services are running.'
    );
  }

  const data = await parseBody(response);

  // Token expired or invalid — clear session and send the user back to login.
  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  if (!response.ok) {
    const message =
      (typeof data === 'object' && data?.message) ||
      `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return { response, data };
};
