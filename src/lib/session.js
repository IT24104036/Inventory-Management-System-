export const SESSION_USER_KEY = "invigo_user";
export const SESSION_TOKEN_KEY = "invigo_token";

export const getSessionUser = () => {
  try {
    const raw = localStorage.getItem(SESSION_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getAuthToken = () => {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY) || "";
  } catch {
    return "";
  }
};

const decodeJwtPayload = (token) => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    let decoded = "";
    if (typeof atob === "function") {
      decoded = atob(padded);
    } else if (typeof globalThis.Buffer !== "undefined") {
      decoded = globalThis.Buffer.from(padded, "base64").toString("utf8");
    } else {
      return null;
    }

    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

export const isUsableAuthToken = (token) => {
  const payload = decodeJwtPayload(token);
  const expiresAt = Number(payload?.exp) * 1000;
  return Boolean(payload && Number.isFinite(expiresAt) && expiresAt > Date.now());
};

export const hasActiveSession = () => {
  const user = getSessionUser();
  const token = getAuthToken();
  const active = Boolean(user && token && isUsableAuthToken(token));

  if (!active && (user || token)) {
    clearSession();
  }

  return active;
};

export const getHomeRouteForSession = (session = getSessionUser()) =>
  session?.role?.toUpperCase() === "ADMIN" ? "/admin" : "/staff";

export const saveSession = ({ token, user }) => {
  if (token) {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  }
  if (user) {
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  }
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_USER_KEY);
  localStorage.removeItem(SESSION_TOKEN_KEY);
};
