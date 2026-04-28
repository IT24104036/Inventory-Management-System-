import { describe, expect, it } from "vitest";

import { hasDiscountReviewAuthority } from "@/lib/access";

describe("hasDiscountReviewAuthority", () => {
    it("returns false instead of throwing when session data is missing", () => {
        expect(hasDiscountReviewAuthority(null)).toBe(false);
    });

    it("recognizes staff members with explicit discount review permissions", () => {
        expect(
            hasDiscountReviewAuthority({
                permissions: { editDiscounts: true },
                role: "STAFF",
            })
        ).toBe(true);
    });
});
