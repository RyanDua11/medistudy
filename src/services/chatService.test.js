import { describe, it, expect, vi } from "vitest";

const mockInvoke = vi.fn();

vi.mock("./supabaseClient.js", () => ({
    supabase: { from: vi.fn(), functions: { invoke: (...args) => mockInvoke(...args) } },
}));

const { gerarTituloConversa, formatarTimestampRelativo, estimarTokens, gerarResposta } = await import(
    "./chatService.js"
);

describe("gerarTituloConversa", () => {
    it("retorna a mensagem inteira quando ela tem 40 caracteres ou menos", () => {
        expect(gerarTituloConversa("Qual a diferença entre sepse e choque?")).toBe(
            "Qual a diferença entre sepse e choque?"
        );
    });

    it("trunca mensagens longas em 40 caracteres com reticências", () => {
        const mensagem =
            "Explique detalhadamente o mecanismo de ação completo dos anti-inflamatórios não esteroidais";
        const titulo = gerarTituloConversa(mensagem);
        expect(titulo.length).toBeLessThanOrEqual(40);
        expect(titulo.endsWith("…")).toBe(true);
    });

    it('retorna "Nova conversa" para mensagem vazia', () => {
        expect(gerarTituloConversa("")).toBe("Nova conversa");
        expect(gerarTituloConversa(null)).toBe("Nova conversa");
        expect(gerarTituloConversa(undefined)).toBe("Nova conversa");
    });

    it("normaliza espaços múltiplos e quebras de linha", () => {
        expect(gerarTituloConversa("Olá   mundo\n\ncomo vai?")).toBe("Olá mundo como vai?");
    });
});

describe("formatarTimestampRelativo", () => {
    const AGORA = new Date("2026-08-23T12:00:00.000Z");

    it('retorna "agora mesmo" para menos de 1 minuto', () => {
        const data = new Date(AGORA.getTime() - 10 * 1000).toISOString();
        expect(formatarTimestampRelativo(data, AGORA)).toBe("agora mesmo");
    });

    it("retorna minutos para menos de 1 hora", () => {
        const data = new Date(AGORA.getTime() - 5 * 60 * 1000).toISOString();
        expect(formatarTimestampRelativo(data, AGORA)).toBe("há 5 minutos");
    });

    it("retorna horas para menos de 24 horas", () => {
        const data = new Date(AGORA.getTime() - 2 * 60 * 60 * 1000).toISOString();
        expect(formatarTimestampRelativo(data, AGORA)).toBe("há 2 horas");
    });

    it('retorna "ontem" para o dia anterior', () => {
        const data = new Date(AGORA.getTime() - 26 * 60 * 60 * 1000).toISOString();
        expect(formatarTimestampRelativo(data, AGORA)).toBe("ontem");
    });

    it("retorna dias para datas mais antigas dentro do mês", () => {
        const data = new Date(AGORA.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
        expect(formatarTimestampRelativo(data, AGORA)).toBe("há 3 dias");
    });

    it("retorna string vazia para data nula", () => {
        expect(formatarTimestampRelativo(null, AGORA)).toBe("");
    });
});

describe("gerarResposta", () => {
    it("chama supabase.functions.invoke('chat-medistudy', ...) com mensagem e histórico corretos", async () => {
        mockInvoke.mockResolvedValueOnce({ data: { resposta: "Sepse é..." }, error: null });

        const historico = [{ role: "user", content: "oi" }];
        const resultado = await gerarResposta("O que é sepse?", historico);

        expect(mockInvoke).toHaveBeenCalledWith("chat-medistudy", {
            body: { mensagem: "O que é sepse?", historico },
        });
        expect(resultado).toBe("Sepse é...");
    });

    it("usa histórico vazio por padrão quando não informado", async () => {
        mockInvoke.mockResolvedValueOnce({ data: { resposta: "Oi!" }, error: null });

        await gerarResposta("Oi");

        expect(mockInvoke).toHaveBeenCalledWith("chat-medistudy", {
            body: { mensagem: "Oi", historico: [] },
        });
    });

    it("lança erro quando a invocação da function falha", async () => {
        mockInvoke.mockResolvedValueOnce({ data: null, error: { message: "network error" } });

        await expect(gerarResposta("oi")).rejects.toThrow();
    });

    it("lança erro quando a function responde com { erro }", async () => {
        mockInvoke.mockResolvedValueOnce({
            data: { erro: "Todos os provedores de IA falharam." },
            error: null,
        });

        await expect(gerarResposta("oi")).rejects.toThrow("Todos os provedores de IA falharam.");
    });
});

describe("estimarTokens", () => {
    it("estima aproximadamente 1 token a cada 4 caracteres", () => {
        expect(estimarTokens("a".repeat(120))).toBe(30);
    });

    it("retorna 0 para texto vazio", () => {
        expect(estimarTokens("")).toBe(0);
        expect(estimarTokens(null)).toBe(0);
    });

    it("arredonda para cima", () => {
        expect(estimarTokens("abc")).toBe(1);
        expect(estimarTokens("abcde")).toBe(2);
    });
});
