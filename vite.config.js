import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, "index.html"),
                home: resolve(__dirname, "home.html"),
                flashcards: resolve(__dirname, "flashcards.html"),
                emBreve: resolve(__dirname, "em-breve.html"),
            },
        },
    },
});
