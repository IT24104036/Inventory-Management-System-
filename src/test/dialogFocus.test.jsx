import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnimatePresence, motion as Motion } from "framer-motion";

import ProductManagement from "@/components/ProductManagement";
import { Input } from "@/components/ui/input";

vi.mock("@/lib/api", () => ({
    getProducts: vi.fn().mockResolvedValue([]),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
}));

describe("dialog form focus", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("keeps focus in product dialog inputs while typing", async () => {
        render(<ProductManagement />);

        await waitFor(() => expect(screen.queryByText(/Loading products/i)).not.toBeInTheDocument());

        fireEvent.click(screen.getByRole("button", { name: /add product/i }));

        const nameInput = screen.getByLabelText(/product name/i);
        nameInput.focus();
        fireEvent.change(nameInput, { target: { value: "M" } });

        expect(document.activeElement).toBe(nameInput);

        fireEvent.change(nameInput, { target: { value: "Mi" } });

        expect(document.activeElement).toBe(nameInput);
    });

    it("keeps focus when dialog is inside the admin route animation wrapper", async () => {
        render(
            <AnimatePresence mode="wait">
                <Motion.div
                    key="/admin/products"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                >
                    <ProductManagement />
                </Motion.div>
            </AnimatePresence>
        );

        await waitFor(() => expect(screen.queryByText(/Loading products/i)).not.toBeInTheDocument());

        fireEvent.click(screen.getByRole("button", { name: /add product/i }));

        const nameInput = screen.getByLabelText(/product name/i);
        nameInput.focus();
        fireEvent.change(nameInput, { target: { value: "M" } });

        expect(document.activeElement).toBe(nameInput);

        fireEvent.change(nameInput, { target: { value: "Mi" } });

        expect(document.activeElement).toBe(nameInput);
    });

    it("restores focus when a controlled input is remounted after a keystroke", () => {
        const RemountingInput = () => {
            const [value, setValue] = React.useState("");
            return (
                <Input
                    key={value.length}
                    placeholder="Remounted field"
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                />
            );
        };

        render(<RemountingInput />);

        const input = screen.getByPlaceholderText("Remounted field");
        input.focus();
        fireEvent.change(input, { target: { value: "A" } });

        const remountedInput = screen.getByPlaceholderText("Remounted field");
        expect(document.activeElement).toBe(remountedInput);
    });
});
