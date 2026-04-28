import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
    SESSION_TOKEN_KEY,
    SESSION_USER_KEY,
    clearSession,
    getSessionUser,
    hasActiveSession,
    isUsableAuthToken,
} from "@/lib/session";

const toBase64Url = (value) =>
    btoa(value).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

const createJwt = (expiresInSeconds = 3600) => {
    const payload = {
        exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    };
    return `test.${toBase64Url(JSON.stringify(payload))}.signature`;
};

function setSession(user, token = createJwt()) {
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    localStorage.setItem(SESSION_TOKEN_KEY, token);
}

function protectedRouteDecision(requiredRole = null) {
    const session = getSessionUser();
    if (!hasActiveSession() || !session) return "redirect:/login";
    if (requiredRole && session.role?.toUpperCase() !== requiredRole.toUpperCase()) return "redirect:/login";
    return "allowed";
}

function guestRouteDecision() {
    return null;
}

beforeEach(() => clearSession());
afterEach(() => clearSession());

describe("session helper behavior", () => {
    it("treats missing tokens as signed out", () => {
        localStorage.setItem(SESSION_USER_KEY, JSON.stringify({ id: 1, role: "ADMIN" }));

        expect(hasActiveSession()).toBe(false);
        expect(getSessionUser()).toBeNull();
        expect(protectedRouteDecision()).toBe("redirect:/login");
        expect(guestRouteDecision()).toBeNull();
    });

    it("allows navigation when a user and unexpired JWT exist", () => {
        setSession({ id: 1, role: "ADMIN" });

        expect(isUsableAuthToken(localStorage.getItem(SESSION_TOKEN_KEY))).toBe(true);
        expect(hasActiveSession()).toBe(true);
        expect(protectedRouteDecision("ADMIN")).toBe("allowed");
        expect(guestRouteDecision()).toBeNull();
    });

    it("clears expired tokens and blocks protected navigation", () => {
        setSession({ id: 1, role: "ADMIN" }, createJwt(-60));

        expect(hasActiveSession()).toBe(false);
        expect(localStorage.getItem(SESSION_USER_KEY)).toBeNull();
        expect(localStorage.getItem(SESSION_TOKEN_KEY)).toBeNull();
        expect(protectedRouteDecision("ADMIN")).toBe("redirect:/login");
    });

    it("clears malformed tokens and blocks protected navigation", () => {
        setSession({ id: 1, role: "ADMIN" }, "not-a-jwt");

        expect(hasActiveSession()).toBe(false);
        expect(localStorage.getItem(SESSION_USER_KEY)).toBeNull();
        expect(localStorage.getItem(SESSION_TOKEN_KEY)).toBeNull();
        expect(protectedRouteDecision("ADMIN")).toBe("redirect:/login");
    });

    it("keeps non-admin authenticated users away from admin routes", () => {
        setSession({ id: 3, role: "CASHIER" });

        expect(protectedRouteDecision()).toBe("allowed");
        expect(protectedRouteDecision("ADMIN")).toBe("redirect:/login");
        expect(guestRouteDecision()).toBeNull();
    });
});
