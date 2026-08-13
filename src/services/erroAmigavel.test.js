import { describe, it, expect } from "vitest";
import { traduzErroSupabase } from "./erroAmigavel.js";

describe("traduzErroSupabase", () => {
    it("traduz erro de tabela ausente no schema cache do PostgREST", () => {
        const erro = { message: "Could not find the table 'public.casos_clinicos' in the schema cache" };
        expect(traduzErroSupabase(erro)).toBe(
            "Não foi possível carregar os dados agora. Tente novamente em instantes."
        );
    });

    it("traduz falha de rede/fetch", () => {
        expect(traduzErroSupabase({ message: "Failed to fetch" })).toBe(
            "Sem conexão com o servidor. Verifique sua internet e tente novamente."
        );
    });

    it("traduz erro de sessão/token expirado", () => {
        expect(traduzErroSupabase({ message: "JWT expired" })).toBe(
            "Sua sessão expirou. Faça login novamente."
        );
    });

    it("mantém mensagens já amigáveis (não reconhecidas) sem alteração", () => {
        expect(traduzErroSupabase({ message: "Email já cadastrado" })).toBe("Email já cadastrado");
    });

    it("retorna string vazia quando o erro não tem mensagem", () => {
        expect(traduzErroSupabase({})).toBe("");
    });
});
