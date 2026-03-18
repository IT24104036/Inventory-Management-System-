import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [
        react(),
    ],
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    react: ["react", "react-dom", "react-router-dom"],
                    motion: ["framer-motion"],
                    icons: ["lucide-react"],
                    charts: ["recharts"],
                    query: ["@tanstack/react-query"],
                },
            },
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./src/test/setup.js"],
        include: ["src/test/**/*.test.{js,jsx}"],
        exclude: ["dist/**", "dist_js/**", "Invigo/**", "AIML/**"],
    },
});
