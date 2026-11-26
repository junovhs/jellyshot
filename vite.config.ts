import { defineConfig } from "vitest/config";

export default defineConfig({
    // Relative asset URLs so the build works under GitHub Pages' /jellyshot/ path.
    base: "./",
    server: { port: 5177, strictPort: true },
    preview: { port: 5177, strictPort: true },
    test: { environment: "node" },
});
