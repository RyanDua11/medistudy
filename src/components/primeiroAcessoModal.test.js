import { describe, it, expect, vi } from "vitest";
import { deveExibirModalPrimeiroAcesso } from "./primeiroAcessoModal.js";

function criarStorageFalso(valor) {
    return { getItem: vi.fn(() => valor) };
}

describe("deveExibirModalPrimeiroAcesso", () => {
    it("retorna true quando não há nome salvo (primeiro acesso)", () => {
        const storage = criarStorageFalso(null);
        expect(deveExibirModalPrimeiroAcesso(storage)).toBe(true);
    });

    it("retorna false quando já existe um nome salvo", () => {
        const storage = criarStorageFalso("Rebeca");
        expect(deveExibirModalPrimeiroAcesso(storage)).toBe(false);
    });

    it("consulta exatamente a chave medistudy_nome_usuario", () => {
        const storage = criarStorageFalso(null);
        deveExibirModalPrimeiroAcesso(storage);
        expect(storage.getItem).toHaveBeenCalledWith("medistudy_nome_usuario");
    });
});
