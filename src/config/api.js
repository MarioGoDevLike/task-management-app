/** Default deployed backend (override with REACT_APP_API_URL, e.g. http://localhost:5000/api for local API) */
export const DEFAULT_API_BASE_URL =
  'https://task-management-app-backend-six.vercel.app/api';

/** Socket.io connects to origin only (no /api path) */
export function getSocketOrigin() {
  const base = DEFAULT_API_BASE_URL;
  return String(base).replace(/\/api\/?$/, '');
}
