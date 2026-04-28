import { clearSession, getAuthToken } from "@/lib/session";

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, "");

export const apiUrl = (path) => `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

export const authHeaders = (extra = {}) => {
  const token = getAuthToken();
  const headers = { "Content-Type": "application/json", ...extra };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

export const authFetch = async (path, opts = {}) => {
  const headers = authHeaders(opts.headers);
  const response = await fetch(apiUrl(path), { ...opts, headers });
  // A 403 means the user is authenticated but lacks permission for that action.
  // Only clear the local session when the token is actually unauthorized.
  if (response.status === 401) {
    clearSession();
  }
  return response;
};
