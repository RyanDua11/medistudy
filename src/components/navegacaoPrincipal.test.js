import { describe, it, expect } from "vitest";
import { paginaAtivaPara } from "./navegacaoPrincipal.js";

describe("paginaAtivaPara", () => {
    it.each([
        ["/home.html", "home"],
        ["/flashcards.html", "flashcards"],
        ["/casos-clinicos.html", "casos-clinicos"],
        ["/provas.html", "provas"],
        ["/notas.html", "notas"],
        ["/diario-erros.html", "diario-erros"],
        ["/em-breve.html", "configuracoes"],
    ])("mapeia %s para %s", (pathname, esperado) => {
        expect(paginaAtivaPara(pathname)).toBe(esperado);
    });

    it("trata a raiz do site como a página home", () => {
        expect(paginaAtivaPara("/")).toBe("home");
    });

    it("funciona com caminhos aninhados (subpasta de deploy)", () => {
        expect(paginaAtivaPara("/app/flashcards.html")).toBe("flashcards");
    });

    it("retorna null para uma página sem item de navegação correspondente", () => {
        expect(paginaAtivaPara("/index.html")).toBeNull();
        expect(paginaAtivaPara("/qualquer-outra-coisa.html")).toBeNull();
    });
});
