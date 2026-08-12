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
    listarLogRevisoes,
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
    function mockTabelas({ flashcardResultado, logResultado }) {
        const builderFlashcards = criarQueryBuilderMock(flashcardResultado);
        const builderLog = criarQueryBuilderMock(
            logResultado ?? { data: { id: "log-1" }, error: null }
        );
        mockFrom.mockImplementation((tabela) =>
            tabela === "log_revisoes" ? builderLog : builderFlashcards
        );
        return { builderFlashcards, builderLog };
    }

    it("incrementa acertos e avança a repetição espaçada quando o usuário acerta", async () => {
        const { builderFlashcards } = mockTabelas({
            flashcardResultado: { data: { id: "1", acertos: 3, erros: 1 }, error: null },
        });

        const resultado = await marcarRevisao(
            { id: "1", acertos: 2, erros: 1, intervalo_dias: 1, fator_facilidade: 2.5 },
            true
        );

        const atualizacao = builderFlashcards.update.mock.calls[0][0];
        expect(atualizacao.acertos).toBe(3);
        expect(atualizacao.erros).toBe(1);
        expect(atualizacao.intervalo_dias).toBe(3);
        expect(atualizacao.fator_facilidade).toBeCloseTo(2.6);
        expect(atualizacao.proxima_revisao).toEqual(expect.any(String));
        expect(builderFlashcards.eq).toHaveBeenCalledWith("id", "1");
        expect(resultado.acertos).toBe(3);
    });

    it("incrementa erros e reseta a repetição espaçada quando o usuário erra", async () => {
        const { builderFlashcards } = mockTabelas({
            flashcardResultado: { data: { id: "1", acertos: 2, erros: 2 }, error: null },
        });

        await marcarRevisao(
            { id: "1", acertos: 2, erros: 1, intervalo_dias: 8, fator_facilidade: 2.7 },
            false
        );

        const atualizacao = builderFlashcards.update.mock.calls[0][0];
        expect(atualizacao.acertos).toBe(2);
        expect(atualizacao.erros).toBe(2);
        expect(atualizacao.intervalo_dias).toBe(1);
        expect(atualizacao.fator_facilidade).toBeCloseTo(2.5);
    });

    it("insere um log de revisão associado ao flashcard e ao usuário logado quando acerta", async () => {
        const { builderLog } = mockTabelas({
            flashcardResultado: { data: { id: "1", acertos: 1, erros: 0 }, error: null },
        });

        await marcarRevisao(
            { id: "1", acertos: 0, erros: 0, intervalo_dias: 1, fator_facilidade: 2.5 },
            true
        );

        expect(mockFrom).toHaveBeenCalledWith("log_revisoes");
        expect(builderLog.insert).toHaveBeenCalledWith({
            flashcard_id: "1",
            usuario_id: "usuario-1",
            acertou: true,
        });
    });

    it("insere um log de revisão com acertou=false quando erra", async () => {
        const { builderLog } = mockTabelas({
            flashcardResultado: { data: { id: "1", acertos: 0, erros: 1 }, error: null },
        });

        await marcarRevisao(
            { id: "1", acertos: 0, erros: 0, intervalo_dias: 1, fator_facilidade: 2.5 },
            false
        );

        expect(builderLog.insert).toHaveBeenCalledWith({
            flashcard_id: "1",
            usuario_id: "usuario-1",
            acertou: false,
        });
    });

    it("continua retornando o flashcard atualizado mesmo com o log inserido", async () => {
        mockTabelas({
            flashcardResultado: { data: { id: "1", acertos: 5, erros: 0 }, error: null },
        });

        const resultado = await marcarRevisao(
            { id: "1", acertos: 4, erros: 0, intervalo_dias: 1, fator_facilidade: 2.5 },
            true
        );

        expect(resultado).toEqual({ id: "1", acertos: 5, erros: 0 });
    });

    it("lança erro quando a inserção do log falha, sem quebrar silenciosamente", async () => {
        mockTabelas({
            flashcardResultado: { data: { id: "1", acertos: 1, erros: 0 }, error: null },
            logResultado: { data: null, error: { message: "Falha ao registrar log" } },
        });

        await expect(
            marcarRevisao(
                { id: "1", acertos: 0, erros: 0, intervalo_dias: 1, fator_facilidade: 2.5 },
                true
            )
        ).rejects.toThrow("Falha ao registrar log");
    });
});

describe("listarLogRevisoes", () => {
    it("retorna os logs de revisão, mais recentes primeiro", async () => {
        const logs = [
            { id: "1", flashcard_id: "a", acertou: true },
            { id: "2", flashcard_id: "b", acertou: false },
        ];
        const builder = criarQueryBuilderMock({ data: logs, error: null });
        mockFrom.mockReturnValue(builder);

        const resultado = await listarLogRevisoes();

        expect(mockFrom).toHaveBeenCalledWith("log_revisoes");
        expect(builder.order).toHaveBeenCalledWith("revisado_em", { ascending: false });
        expect(resultado).toEqual(logs);
    });

    it("lança erro quando o Supabase retorna erro", async () => {
        const builder = criarQueryBuilderMock({ data: null, error: { message: "Falha ao listar logs" } });
        mockFrom.mockReturnValue(builder);

        await expect(listarLogRevisoes()).rejects.toThrow("Falha ao listar logs");
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
