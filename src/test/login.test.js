/**
 * Unit tests — /login page
 * Mirrors the validation logic in src/pages/Login.jsx (handleLogin)
 */
import { describe, it, expect } from "vitest";

// Pure validation function extracted from Login.jsx handleLogin
function validateLoginForm({ identifier, password }) {
    if (!identifier?.trim() || !password) {
        return "Please enter your username or email and password.";
    }
    return null; // no error
}

describe("Login – form validation", () => {
    it("returns an error when all fields are empty", () => {
        const error = validateLoginForm({ identifier: "", password: "" });
        expect(error).toBe("Please enter your username or email and password.");
    });

    it("returns an error when identifier is missing", () => {
        const error = validateLoginForm({ identifier: "", password: "pass123" });
        expect(error).toBeTruthy();
    });

    it("returns an error when password is missing", () => {
        const error = validateLoginForm({ identifier: "admin", password: "" });
        expect(error).toBeTruthy();
    });

    it("returns null when all fields are provided", () => {
        const error = validateLoginForm({ identifier: "admin", password: "pass123" });
        expect(error).toBeNull();
    });

    it("returns an error with whitespace-only identifiers", () => {
        const error = validateLoginForm({ identifier: "   ", password: "pass123" });
        expect(error).toBeTruthy();
    });

    it("accepts email addresses as identifiers", () => {
        const error = validateLoginForm({ identifier: "admin@example.com", password: "pass123" });
        expect(error).toBeNull();
    });
});
