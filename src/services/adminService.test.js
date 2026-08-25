import { describe, it, expect } from "vitest";
import { agruparUsoPorProvedor, agruparChamadasPorDia, completarProvedoresSemDados, contarPorUsuario, PROVEDORES_CONHECIDOS } from "./adminService.js";

describe("agruparUsoPorProvedor", () => {
    it("agrupa total, sucessos, erros e taxa de sucesso por provedor", () => {
        const linhas = [
            { provedor: "Groq", sucesso: true, criado_em: "2026-08-24T10:00:00Z" },
            { provedor: "Groq", sucesso: true, criado_em: "2026-08-24T11:00:00Z" },
            { provedor: "Groq", sucesso: false, criado_em: "2026-08-24T12:00:00Z" },
            { provedor: "Gemini", sucesso: true, criado_em: "2026-08-24T09:00:00Z" },
        ];

        const resultado = agruparUsoPorProvedor(linhas);

        expect(resultado).toEqual([
            { provedor: "Groq", total: 3, erros: 1, taxaSucesso: 67, tokensInput: 0, tokensOutput: 0, ultimaChamada: "2026-08-24T12:00:00Z" },
            { provedor: "Gemini", total: 1, erros: 0, taxaSucesso: 100, tokensInput: 0, tokensOutput: 0, ultimaChamada: "2026-08-24T09:00:00Z" },
        ]);
    });

    it("soma tokens_input e tokens_output por provedor", () => {
        const linhas = [
            { provedor: "Groq", sucesso: true, criado_em: "2026-08-24T10:00:00Z", tokens_input: 100, tokens_output: 40 },
            { provedor: "Groq", sucesso: true, criado_em: "2026-08-24T11:00:00Z", tokens_input: 80, tokens_output: 30 },
        ];

        const [resultado] = agruparUsoPorProvedor(linhas);

        expect(resultado.tokensInput).toBe(180);
        expect(resultado.tokensOutput).toBe(70);
    });

    it("trata tokens ausentes (null) como zero", () => {
        const linhas = [{ provedor: "Groq", sucesso: true, criado_em: "2026-08-24T10:00:00Z", tokens_input: null, tokens_output: null }];

        const [resultado] = agruparUsoPorProvedor(linhas);

        expect(resultado.tokensInput).toBe(0);
        expect(resultado.tokensOutput).toBe(0);
    });

    it("ordena por total de chamadas decrescente", () => {
        const linhas = [
            { provedor: "Gemini", sucesso: true, criado_em: "2026-08-24T09:00:00Z" },
            { provedor: "Groq", sucesso: true, criado_em: "2026-08-24T10:00:00Z" },
            { provedor: "Groq", sucesso: true, criado_em: "2026-08-24T11:00:00Z" },
        ];

        const resultado = agruparUsoPorProvedor(linhas);

        expect(resultado.map((p) => p.provedor)).toEqual(["Groq", "Gemini"]);
    });

    it("retorna array vazio para lista vazia", () => {
        expect(agruparUsoPorProvedor([])).toEqual([]);
    });
});

describe("completarProvedoresSemDados", () => {
    it("mantém os provedores com dados e adiciona os que faltam com status sem dados", () => {
        const dadosAgrupados = [{ provedor: "Groq", total: 5, erros: 0, taxaSucesso: 100, tokensInput: 10, tokensOutput: 5, ultimaChamada: "2026-08-24T10:00:00Z" }];

        const resultado = completarProvedoresSemDados(dadosAgrupados, ["Groq", "Gemini", "Cerebras"]);

        expect(resultado).toEqual([
            { provedor: "Groq", total: 5, erros: 0, taxaSucesso: 100, tokensInput: 10, tokensOutput: 5, ultimaChamada: "2026-08-24T10:00:00Z" },
            { provedor: "Cerebras", total: 0, erros: 0, taxaSucesso: null, tokensInput: 0, tokensOutput: 0, ultimaChamada: null },
            { provedor: "Gemini", total: 0, erros: 0, taxaSucesso: null, tokensInput: 0, tokensOutput: 0, ultimaChamada: null },
        ]);
    });

    it("não duplica provedores já presentes nos dados agrupados", () => {
        const dadosAgrupados = [{ provedor: "Groq", total: 1, erros: 0, taxaSucesso: 100, tokensInput: 0, tokensOutput: 0, ultimaChamada: "2026-08-24T10:00:00Z" }];

        const resultado = completarProvedoresSemDados(dadosAgrupados, ["Groq"]);

        expect(resultado).toHaveLength(1);
    });

    it("retorna todos os provedores conhecidos sem dados quando não há chamadas", () => {
        const resultado = completarProvedoresSemDados([], PROVEDORES_CONHECIDOS);

        expect(resultado).toHaveLength(PROVEDORES_CONHECIDOS.length);
        expect(resultado.every((p) => p.taxaSucesso === null)).toBe(true);
    });
});

describe("agruparChamadasPorDia", () => {
    it("agrupa total e erros por dia (YYYY-MM-DD)", () => {
        const linhas = [
            { sucesso: true, criado_em: "2026-08-24T10:00:00Z" },
            { sucesso: false, criado_em: "2026-08-24T11:00:00Z" },
            { sucesso: true, criado_em: "2026-08-23T10:00:00Z" },
        ];

        const resultado = agruparChamadasPorDia(linhas);

        expect(resultado).toEqual([
            { dia: "2026-08-23", total: 1, erros: 0 },
            { dia: "2026-08-24", total: 2, erros: 1 },
        ]);
    });
});

describe("contarPorUsuario", () => {
    it("conta linhas por id de usuário e ignora ids ausentes", () => {
        const linhas = [{ usuario_id: "u1" }, { usuario_id: "u1" }, { usuario_id: "u2" }, { usuario_id: null }];

        const contagem = contarPorUsuario(linhas, "usuario_id");

        expect(contagem.get("u1")).toBe(2);
        expect(contagem.get("u2")).toBe(1);
        expect(contagem.has(null)).toBe(false);
    });
});
