import { describe, it, expect, vi, beforeEach } from "vitest";

function criarQueryBuilderMock(resultado) {
    const builder = {
        select: vi.fn(() => builder),
        insert: vi.fn(() => builder),
        update: vi.fn(() => builder),
        delete: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        order: vi.fn(() => builder),
        single: vi.fn(() => Promise.resolve(resultado)),
        then: (resolve) => Promise.resolve(resultado).then(resolve),
    };
    return builder;
}

const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock("./supabaseClient.js", () => ({
    supabase: {
        from: (...args) => mockFrom(...args),
        auth: {
            getUser: (...args) => mockGetUser(...args),
        },
    },
}));

const {
    criarFlashcard,
    listarFlashcards,
    marcarRevisao,
    removerFlashcard,
} = await import("./flashcardsService.js");

beforeEach(() => {
    mockFrom.mockReset();
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: { id: "usuario-1" } }, error: null });
});

describe("criarFlashcard", () => {
    it("insere um flashcard associado ao usuário logado", async () => {
        const flashcardCriado = {
            id: "1",
            user_id: "usuario-1",
            pergunta: "O que é sepse?",
            resposta: "Resposta inflamatória sistêmica a uma infecção.",
            acertos: 0,
            erros: 0,
        };
        const builder = criarQueryBuilderMock({ data: flashcardCriado, error: null });
        mockFrom.mockReturnValue(builder);

        const resultado = await criarFlashcard(
            "O que é sepse?",
            "Resposta inflamatória sistêmica a uma infecção."
        );

        expect(mockFrom).toHaveBeenCalledWith("flashcards");
        expect(builder.insert).toHaveBeenCalledWith({
            user_id: "usuario-1",
            pergunta: "O que é sepse?",
            resposta: "Resposta inflamatória sistêmica a uma infecção.",
            materia: null,
        });
        expect(resultado).toEqual(flashcardCriado);
    });

    it("insere a matéria quando informada", async () => {
        const builder = criarQueryBuilderMock({ data: { id: "1" }, error: null });
        mockFrom.mockReturnValue(builder);

        await criarFlashcard("pergunta", "resposta", "Farmacologia II");

        expect(builder.insert).toHaveBeenCalledWith({
            user_id: "usuario-1",
            pergunta: "pergunta",
            resposta: "resposta",
            materia: "Farmacologia II",
        });
    });

    it("lança erro quando o Supabase retorna erro", async () => {
        const builder = criarQueryBuilderMock({
            data: null,
            error: { message: "Falha ao criar flashcard" },
        });
        mockFrom.mockReturnValue(builder);

        await expect(criarFlashcard("pergunta", "resposta")).rejects.toThrow(
            "Falha ao criar flashcard"
        );
    });
});

describe("listarFlashcards", () => {
    it("retorna os flashcards do usuário logado, mais recentes primeiro", async () => {
        const flashcards = [
            { id: "1", pergunta: "A", resposta: "1" },
            { id: "2", pergunta: "B", resposta: "2" },
        ];
        const builder = criarQueryBuilderMock({ data: flashcards, error: null });
        mockFrom.mockReturnValue(builder);

        const resultado = await listarFlashcards();

        expect(mockFrom).toHaveBeenCalledWith("flashcards");
        expect(builder.order).toHaveBeenCalledWith("created_at", { ascending: false });
        expect(resultado).toEqual(flashcards);
    });

    it("lança erro quando o Supabase retorna erro", async () => {
        const builder = criarQueryBuilderMock({
            data: null,
            error: { message: "Falha ao listar" },
        });
        mockFrom.mockReturnValue(builder);

        await expect(listarFlashcards()).rejects.toThrow("Falha ao listar");
    });
});

describe("marcarRevisao", () => {
    it("incrementa acertos e avança a repetição espaçada quando o usuário acerta", async () => {
        const builder = criarQueryBuilderMock({
            data: { id: "1", acertos: 3, erros: 1 },
            error: null,
        });
        mockFrom.mockReturnValue(builder);

        const resultado = await marcarRevisao(
            { id: "1", acertos: 2, erros: 1, intervalo_dias: 1, fator_facilidade: 2.5 },
            true
        );

        const atualizacao = builder.update.mock.calls[0][0];
        expect(atualizacao.acertos).toBe(3);
        expect(atualizacao.erros).toBe(1);
        expect(atualizacao.intervalo_dias).toBe(3);
        expect(atualizacao.fator_facilidade).toBeCloseTo(2.6);
        expect(atualizacao.proxima_revisao).toEqual(expect.any(String));
        expect(builder.eq).toHaveBeenCalledWith("id", "1");
        expect(resultado.acertos).toBe(3);
    });

    it("incrementa erros e reseta a repetição espaçada quando o usuário erra", async () => {
        const builder = criarQueryBuilderMock({
            data: { id: "1", acertos: 2, erros: 2 },
            error: null,
        });
        mockFrom.mockReturnValue(builder);

        await marcarRevisao(
            { id: "1", acertos: 2, erros: 1, intervalo_dias: 8, fator_facilidade: 2.7 },
            false
        );

        const atualizacao = builder.update.mock.calls[0][0];
        expect(atualizacao.acertos).toBe(2);
        expect(atualizacao.erros).toBe(2);
        expect(atualizacao.intervalo_dias).toBe(1);
        expect(atualizacao.fator_facilidade).toBeCloseTo(2.5);
    });
});

describe("removerFlashcard", () => {
    it("remove o flashcard pelo id", async () => {
        const builder = criarQueryBuilderMock({ data: null, error: null });
        mockFrom.mockReturnValue(builder);

        await removerFlashcard("1");

        expect(mockFrom).toHaveBeenCalledWith("flashcards");
        expect(builder.delete).toHaveBeenCalled();
        expect(builder.eq).toHaveBeenCalledWith("id", "1");
    });
});
