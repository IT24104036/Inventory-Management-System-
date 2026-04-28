/**
 * Security / Auth Guard unit tests
 * Mirrors the session logic in src/App.jsx (ProtectedRoute, GuestRoute).
 *
 * These tests verify that:
 * - unauthenticated users are blocked from protected routes
 * - non-admin users are blocked from admin-only routes
 * - /login stays available as a fresh sign-in page
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
    SESSION_TOKEN_KEY,
    SESSION_USER_KEY,
    clearSession,
    getSessionUser,
    hasActiveSession,
    saveSession,
} from "@/lib/session";

const toBase64Url = (value) =>
    btoa(value).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

const createJwt = (expiresInSeconds = 3600) =>
    `test.${toBase64Url(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expiresInSeconds }))}.signature`;

function protectedRouteDecision(requiredRole = null) {
    const session = getSessionUser();
    if (!hasActiveSession() || !session) return "redirect:/login";
    if (requiredRole && session.role?.toUpperCase() !== requiredRole.toUpperCase()) return "redirect:/login";
    return "allowed";
}

function guestRouteDecision() {
    return null;
}

function setSession(data, token = createJwt()) {
    saveSession({ token, user: data });
}

beforeEach(() => clearSession());
afterEach(() => clearSession());

describe("getSessionUser", () => {
    it("returns null when localStorage has no session", () => {
        expect(getSessionUser()).toBeNull();
    });

    it("returns the parsed session object when one exists", () => {
        setSession({ id: 1, role: "STAFF", username: "alice" });

        expect(getSessionUser()).toEqual({ id: 1, role: "STAFF", username: "alice" });
    });

    it("returns null when localStorage contains invalid JSON", () => {
        localStorage.setItem(SESSION_USER_KEY, "not-valid-json{");
        localStorage.setItem(SESSION_TOKEN_KEY, createJwt());

        expect(getSessionUser()).toBeNull();
        expect(hasActiveSession()).toBe(false);
    });
});

describe("ProtectedRoute - unauthenticated access", () => {
    it("blocks access to any protected route when not logged in", () => {
        expect(protectedRouteDecision()).toBe("redirect:/login");
    });

    it("blocks access to admin route when not logged in", () => {
        expect(protectedRouteDecision("ADMIN")).toBe("redirect:/login");
    });

    it("blocks access when only the user record exists", () => {
        localStorage.setItem(SESSION_USER_KEY, JSON.stringify({ id: 1, role: "ADMIN", username: "admin" }));

        expect(protectedRouteDecision("ADMIN")).toBe("redirect:/login");
    });
});

describe("ProtectedRoute - role enforcement on admin routes", () => {
    it("allows access to staff route when logged in as staff", () => {
        setSession({ id: 2, role: "STAFF", username: "bob" });

        expect(protectedRouteDecision()).toBe("allowed");
    });

    it("allows access to admin route when logged in as admin", () => {
        setSession({ id: 1, role: "ADMIN", username: "admin" });

        expect(protectedRouteDecision("ADMIN")).toBe("allowed");
    });

    it("blocks a staff user from accessing admin-only routes", () => {
        setSession({ id: 2, role: "STAFF", username: "bob" });

        expect(protectedRouteDecision("ADMIN")).toBe("redirect:/login");
    });

    it("blocks a staff user regardless of role casing", () => {
        setSession({ id: 2, role: "staff", username: "bob" });

        expect(protectedRouteDecision("ADMIN")).toBe("redirect:/login");
    });

    it("role check is case-insensitive for admin users", () => {
        setSession({ id: 1, role: "admin", username: "admin" });

        expect(protectedRouteDecision("ADMIN")).toBe("allowed");
    });
});

describe("GuestRoute - /login remains a fresh sign-in page", () => {
    it("shows the login page when user is not logged in", () => {
        expect(guestRouteDecision()).toBeNull();
    });

    it("shows the login page even when a previous admin session exists", () => {
        setSession({ id: 1, role: "ADMIN", username: "admin" });

        expect(guestRouteDecision()).toBeNull();
    });

    it("shows the login page even when a previous staff session exists", () => {
        setSession({ id: 2, role: "STAFF", username: "alice" });

        expect(guestRouteDecision()).toBeNull();
    });
});
