import { describe, it, expect } from "vitest";
import { resolverFerramentaEmBreve, FERRAMENTAS_EM_BREVE } from "./ferramentasEmBreve.js";

describe("resolverFerramentaEmBreve", () => {
    it.each(Object.keys(FERRAMENTAS_EM_BREVE))("resolve dados completos para o slug %s", (slug) => {
        const ferramenta = resolverFerramentaEmBreve(slug);
        expect(ferramenta.nome).toBeTruthy();
        expect(ferramenta.cor).toBeTruthy();
        expect(ferramenta.icone).toContain("<svg");
        expect(ferramenta.frase).toBeTruthy();
    });

    it("retorna null para um slug desconhecido", () => {
        expect(resolverFerramentaEmBreve("qualquer-coisa")).toBeNull();
    });

    it("retorna null quando nenhum slug é passado", () => {
        expect(resolverFerramentaEmBreve(null)).toBeNull();
        expect(resolverFerramentaEmBreve(undefined)).toBeNull();
    });
});
