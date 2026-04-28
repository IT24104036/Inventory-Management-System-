import { beforeEach, describe, expect, it, vi } from "vitest";

import { authFetch } from "@/lib/apiConfig";
import { saveSession } from "@/lib/session";

describe("authFetch", () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it("does not clear the session on forbidden responses", async () => {
        saveSession({
            token: "demo-token",
            user: { id: 1, username: "cashier", role: "STAFF" },
        });

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 403 }));

        await authFetch("/sales");

        expect(localStorage.getItem("invigo_token")).toBe("demo-token");
        expect(JSON.parse(localStorage.getItem("invigo_user"))).toMatchObject({ username: "cashier" });
    });

    it("clears the session on unauthorized responses", async () => {
        saveSession({
            token: "expired-token",
            user: { id: 2, username: "alice", role: "STAFF" },
        });

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 401 }));

        await authFetch("/sales");

        expect(localStorage.getItem("invigo_token")).toBeNull();
        expect(localStorage.getItem("invigo_user")).toBeNull();
    });
});
