import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInvoke = vi.fn();

vi.mock("./supabaseClient.js", () => ({
    supabase: {
        functions: {
            invoke: (...args) => mockInvoke(...args),
        },
    },
}));

const { gerarFlashcardIA } = await import("./flashcardIA.js");

const FLASHCARD_VALIDO = {
    pergunta: "Qual o mecanismo de ação dos AINEs?",
    resposta: "Inibição da COX, reduzindo a síntese de prostaglandinas.",
    materia: "Farmacologia II",
};

beforeEach(() => {
    mockInvoke.mockReset();
});

describe("gerarFlashcardIA", () => {
    it("retorna pergunta, resposta e matéria quando a edge function responde com um flashcard válido", async () => {
        mockInvoke.mockResolvedValue({ data: { texto: JSON.stringify(FLASHCARD_VALIDO) }, error: null });

        const resultado = await gerarFlashcardIA("AINEs");

        expect(mockInvoke).toHaveBeenCalledWith("gerar-flashcard", { body: { tema: "AINEs" } });
        expect(resultado).toEqual(FLASHCARD_VALIDO);
    });

    it("extrai o JSON mesmo quando vem cercado por markdown", async () => {
        mockInvoke.mockResolvedValue({
            data: { texto: "```json\n" + JSON.stringify(FLASHCARD_VALIDO) + "\n```" },
            error: null,
        });

        const resultado = await gerarFlashcardIA("AINEs");

        expect(resultado).toEqual(FLASHCARD_VALIDO);
    });

    it("lança erro amigável quando a chamada de rede falha", async () => {
        mockInvoke.mockResolvedValue({ data: null, error: { message: "Failed to fetch" } });

        await expect(gerarFlashcardIA("AINEs")).rejects.toThrow();
        expect(mockInvoke).toHaveBeenCalled();
    });

    it("lança erro quando a edge function responde com corpo de erro", async () => {
        mockInvoke.mockResolvedValue({ data: { erro: "Nenhum provedor de IA disponível" }, error: null });

        await expect(gerarFlashcardIA("AINEs")).rejects.toThrow("Nenhum provedor de IA disponível");
    });

    it("lança erro quando a resposta da IA não é um JSON válido", async () => {
        mockInvoke.mockResolvedValue({ data: { texto: "isso não é json" }, error: null });

        await expect(gerarFlashcardIA("AINEs")).rejects.toThrow("Resposta da IA não é um JSON válido");
    });

    it("lança erro quando o tema está vazio, sem chamar a edge function", async () => {
        await expect(gerarFlashcardIA("")).rejects.toThrow("Informe um tema para gerar o flashcard");
        await expect(gerarFlashcardIA("   ")).rejects.toThrow("Informe um tema para gerar o flashcard");
        expect(mockInvoke).not.toHaveBeenCalled();
    });
});
