import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    test: {
        // supabase/functions/**/*.test.ts são testes Deno (Edge Functions,
        // rodados com `deno test`, não com vitest — importam módulos via URL
        // https://, que o loader ESM do Node/vitest não suporta).
        exclude: ["**/node_modules/**", "**/dist/**", "supabase/functions/**"],
    },
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, "index.html"),
                home: resolve(__dirname, "home.html"),
                flashcards: resolve(__dirname, "flashcards.html"),
                casosClinicos: resolve(__dirname, "casos-clinicos.html"),
                emBreve: resolve(__dirname, "em-breve.html"),
                provas: resolve(__dirname, "provas.html"),
                notas: resolve(__dirname, "notas.html"),
                chat: resolve(__dirname, "chat.html"),
                admin: resolve(__dirname, "admin.html"),
            },
        },
    },
});
