/**
 * Unit tests — /staff/profile (StaffProfile component)
 * Mirrors the password change validation in src/components/StaffProfile.jsx
 * – handleChangePassword (lines 103-147)
 */
import { describe, it, expect } from "vitest";

// Mirrors handleChangePassword validation in StaffProfile.jsx
function validatePasswordChange({ currentPassword, newPassword, confirmPassword }) {
    if (!currentPassword) return "Please enter your current password.";
    if (!newPassword) return "Please enter a new password.";
    if (newPassword.length < 8) return "New password must be at least 8 characters.";
    if (newPassword !== confirmPassword) return "New passwords do not match.";
    if (currentPassword === newPassword) return "New password must be different from your current password.";
    return null;
}

describe("StaffProfile – password change validation", () => {
    it("returns an error when current password is empty", () => {
        const error = validatePasswordChange({ currentPassword: "", newPassword: "newPass1!", confirmPassword: "newPass1!" });
        expect(error).toBe("Please enter your current password.");
    });

    it("returns an error when new password is empty", () => {
        const error = validatePasswordChange({ currentPassword: "oldPass1!", newPassword: "", confirmPassword: "" });
        expect(error).toBe("Please enter a new password.");
    });

    it("returns an error when new password is fewer than 8 characters", () => {
        const error = validatePasswordChange({ currentPassword: "oldPass1!", newPassword: "short", confirmPassword: "short" });
        expect(error).toBe("New password must be at least 8 characters.");
    });

    it("returns an error when new password is exactly 7 characters (boundary)", () => {
        const error = validatePasswordChange({ currentPassword: "oldPass1!", newPassword: "1234567", confirmPassword: "1234567" });
        expect(error).toBe("New password must be at least 8 characters.");
    });

    it("returns no length error when new password is exactly 8 characters (boundary)", () => {
        const error = validatePasswordChange({ currentPassword: "oldPass1!", newPassword: "12345678", confirmPassword: "12345678" });
        // Should not be a length error (but might be same-as-current check)
        expect(error).not.toBe("New password must be at least 8 characters.");
    });

    it("returns an error when confirm password does not match new password", () => {
        const error = validatePasswordChange({ currentPassword: "oldPass1!", newPassword: "newPass1!", confirmPassword: "different!" });
        expect(error).toBe("New passwords do not match.");
    });

    it("returns an error when new password is the same as current password", () => {
        const error = validatePasswordChange({ currentPassword: "samePass1!", newPassword: "samePass1!", confirmPassword: "samePass1!" });
        expect(error).toBe("New password must be different from your current password.");
    });

    it("returns null when all inputs are valid and passwords differ", () => {
        const error = validatePasswordChange({ currentPassword: "oldPass1!", newPassword: "newPass1!", confirmPassword: "newPass1!" });
        expect(error).toBeNull();
    });

    it("validation runs in the correct priority order (missing current > missing new > length > mismatch > same)", () => {
        // Missing current takes priority over everything
        expect(validatePasswordChange({ currentPassword: "", newPassword: "", confirmPassword: "" }))
            .toBe("Please enter your current password.");

        // Missing new takes priority over length
        expect(validatePasswordChange({ currentPassword: "old", newPassword: "", confirmPassword: "" }))
            .toBe("Please enter a new password.");

        // Length takes priority over mismatch
        expect(validatePasswordChange({ currentPassword: "old", newPassword: "short", confirmPassword: "different" }))
            .toBe("New password must be at least 8 characters.");

        // Mismatch takes priority over same-as-current
        expect(validatePasswordChange({ currentPassword: "same1234", newPassword: "same1234", confirmPassword: "different1" }))
            .toBe("New passwords do not match.");
    });
});
