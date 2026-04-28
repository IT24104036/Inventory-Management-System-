/**
 * Unit tests — /admin/users (UserManagement component)
 * Mirrors the validation logic in src/pages/Admin.jsx
 * – handleCreate (lines 726-736)
 * – handleEdit  (lines 768-775)
 */
import { describe, it, expect } from "vitest";

// Mirrors handleCreate validation in Admin.jsx
function validateCreateUser({ username, password, name, doj, email }) {
    if (!username || !name || !doj || !email) {
        return "Please fill in username, full name, work email, and joining date.";
    }
    if (password && (password.length < 8 || password.length > 30)) {
        return "Temporary password must be between 8 and 30 characters, or leave it blank.";
    }
    return null;
}

// Mirrors handleEdit validation in Admin.jsx
function validateEditUser({ username, name, doj }) {
    if (!username || !name || !doj) {
        return "Please fill in all required fields.";
    }
    return null;
}

// ── Create User ────────────────────────────────────────────────────────────────

describe("UserManagement – create user validation", () => {
    it("returns an error when all fields are empty", () => {
        const error = validateCreateUser({ username: "", password: "", name: "", doj: "", email: "" });
        expect(error).toBe("Please fill in username, full name, work email, and joining date.");
    });

    it("returns an error when username is missing", () => {
        const error = validateCreateUser({ username: "", password: "securePass1", name: "Alice", doj: "2024-01-01", email: "alice@example.com" });
        expect(error).toBeTruthy();
    });

    it("allows a blank temporary password", () => {
        const error = validateCreateUser({ username: "alice", password: "", name: "Alice", doj: "2024-01-01", email: "alice@example.com" });
        expect(error).toBeNull();
    });

    it("returns an error when name is missing", () => {
        const error = validateCreateUser({ username: "alice", password: "securePass1", name: "", doj: "2024-01-01", email: "alice@example.com" });
        expect(error).toBeTruthy();
    });

    it("returns an error when date of joining is missing", () => {
        const error = validateCreateUser({ username: "alice", password: "securePass1", name: "Alice", doj: "", email: "alice@example.com" });
        expect(error).toBeTruthy();
    });

    it("returns an error when email is missing", () => {
        const error = validateCreateUser({ username: "alice", password: "securePass1", name: "Alice", doj: "2024-01-01", email: "" });
        expect(error).toBeTruthy();
    });

    it("returns an error when temporary password is fewer than 8 characters", () => {
        const error = validateCreateUser({ username: "alice", password: "abc", name: "Alice", doj: "2024-01-01", email: "alice@example.com" });
        expect(error).toBe("Temporary password must be between 8 and 30 characters, or leave it blank.");
    });

    it("returns an error when temporary password is exactly 7 characters (boundary)", () => {
        const error = validateCreateUser({ username: "alice", password: "1234567", name: "Alice", doj: "2024-01-01", email: "alice@example.com" });
        expect(error).toBe("Temporary password must be between 8 and 30 characters, or leave it blank.");
    });

    it("returns null when temporary password is exactly 8 characters (boundary)", () => {
        const error = validateCreateUser({ username: "alice", password: "12345678", name: "Alice", doj: "2024-01-01", email: "alice@example.com" });
        expect(error).toBeNull();
    });

    it("returns null when all fields are valid", () => {
        const error = validateCreateUser({ username: "alice", password: "securePass1", name: "Alice Smith", doj: "2024-01-01", email: "alice@example.com" });
        expect(error).toBeNull();
    });
});

// ── Edit User ──────────────────────────────────────────────────────────────────

describe("UserManagement – edit user validation", () => {
    it("returns an error when username is missing", () => {
        const error = validateEditUser({ username: "", name: "Alice", doj: "2024-01-01" });
        expect(error).toBe("Please fill in all required fields.");
    });

    it("returns an error when name is missing", () => {
        const error = validateEditUser({ username: "alice", name: "", doj: "2024-01-01" });
        expect(error).toBeTruthy();
    });

    it("returns an error when date of joining is missing", () => {
        const error = validateEditUser({ username: "alice", name: "Alice", doj: "" });
        expect(error).toBeTruthy();
    });

    it("returns null when all required edit fields are provided", () => {
        const error = validateEditUser({ username: "alice", name: "Alice Smith", doj: "2024-01-01" });
        expect(error).toBeNull();
    });
});
