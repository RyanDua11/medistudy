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
    criarFlashcardComReverso,
    listarFlashcards,
    marcarRevisao,
    listarLogRevisoes,
    removerFlashcard,
} = await import("./flashcardsService.js");
const { RATING } = await import("./fsrs.js");

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

describe("criarFlashcardComReverso", () => {
    it("cria apenas o card principal quando gerarReverso é falso", async () => {
        const builder = criarQueryBuilderMock({ data: { id: "1" }, error: null });
        mockFrom.mockReturnValue(builder);

        const resultado = await criarFlashcardComReverso("pergunta", "resposta", "Farmacologia II", {
            gerarReverso: false,
        });

        expect(builder.insert).toHaveBeenCalledTimes(1);
        expect(resultado.cardReverso).toBeNull();
    });

    it("cria o card principal e o reverso com pergunta/resposta invertidas quando gerarReverso é true", async () => {
        const builder = criarQueryBuilderMock({ data: { id: "1" }, error: null });
        mockFrom.mockReturnValue(builder);

        await criarFlashcardComReverso("pergunta", "resposta", "Farmacologia II", { gerarReverso: true });

        expect(builder.insert).toHaveBeenCalledTimes(2);
        expect(builder.insert).toHaveBeenNthCalledWith(1, {
            user_id: "usuario-1",
            pergunta: "pergunta",
            resposta: "resposta",
            materia: "Farmacologia II",
        });
        expect(builder.insert).toHaveBeenNthCalledWith(2, {
            user_id: "usuario-1",
            pergunta: "resposta",
            resposta: "pergunta",
            materia: "Farmacologia II",
            eh_reverso: true,
        });
    });

    it("retorna os dois cards criados", async () => {
        const cards = [{ id: "1" }, { id: "2" }];
        let chamada = 0;
        const builder = {
            insert: vi.fn(() => builder),
            select: vi.fn(() => builder),
            single: vi.fn(() => Promise.resolve({ data: cards[chamada++], error: null })),
        };
        mockFrom.mockReturnValue(builder);

        const resultado = await criarFlashcardComReverso("pergunta", "resposta", null, { gerarReverso: true });

        expect(resultado.cardPrincipal).toEqual(cards[0]);
        expect(resultado.cardReverso).toEqual(cards[1]);
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

    it("incrementa acertos e avança o agendamento FSRS quando o usuário acerta (Bom)", async () => {
        const { builderFlashcards } = mockTabelas({
            flashcardResultado: { data: { id: "1", acertos: 3, erros: 1 }, error: null },
        });

        const resultado = await marcarRevisao(
            { id: "1", acertos: 2, erros: 1 },
            RATING.BOM
        );

        const atualizacao = builderFlashcards.update.mock.calls[0][0];
        expect(atualizacao.acertos).toBe(3);
        expect(atualizacao.erros).toBe(1);
        expect(atualizacao.dificuldade).toEqual(expect.any(Number));
        expect(atualizacao.estabilidade).toEqual(expect.any(Number));
        expect(atualizacao.intervalo_dias).toBeGreaterThan(0);
        expect(atualizacao.proxima_revisao).toEqual(expect.any(String));
        expect(builderFlashcards.eq).toHaveBeenCalledWith("id", "1");
        expect(resultado.acertos).toBe(3);
    });

    it("incrementa erros e reagenda para hoje quando o usuário não lembra", async () => {
        const { builderFlashcards } = mockTabelas({
            flashcardResultado: { data: { id: "1", acertos: 2, erros: 2 }, error: null },
        });

        await marcarRevisao(
            { id: "1", acertos: 2, erros: 1, dificuldade: 6, estabilidade: 20, ultima_revisao: new Date().toISOString() },
            RATING.NAO_LEMBREI
        );

        const atualizacao = builderFlashcards.update.mock.calls[0][0];
        expect(atualizacao.acertos).toBe(2);
        expect(atualizacao.erros).toBe(2);
        expect(atualizacao.intervalo_dias).toBe(0);
        expect(atualizacao.estado).toBe("reaprendizado");
    });

    it("insere um log de revisão associado ao flashcard e ao usuário logado quando acerta", async () => {
        const { builderLog } = mockTabelas({
            flashcardResultado: { data: { id: "1", acertos: 1, erros: 0 }, error: null },
        });

        await marcarRevisao({ id: "1", acertos: 0, erros: 0 }, RATING.BOM);

        expect(mockFrom).toHaveBeenCalledWith("log_revisoes");
        expect(builderLog.insert).toHaveBeenCalledWith({
            flashcard_id: "1",
            usuario_id: "usuario-1",
            acertou: true,
            rating: RATING.BOM,
        });
    });

    it("insere um log de revisão com acertou=false quando não lembra", async () => {
        const { builderLog } = mockTabelas({
            flashcardResultado: { data: { id: "1", acertos: 0, erros: 1 }, error: null },
        });

        await marcarRevisao({ id: "1", acertos: 0, erros: 0 }, RATING.NAO_LEMBREI);

        expect(builderLog.insert).toHaveBeenCalledWith({
            flashcard_id: "1",
            usuario_id: "usuario-1",
            acertou: false,
            rating: RATING.NAO_LEMBREI,
        });
    });

    it("continua retornando o flashcard atualizado mesmo com o log inserido", async () => {
        mockTabelas({
            flashcardResultado: { data: { id: "1", acertos: 5, erros: 0 }, error: null },
        });

        const resultado = await marcarRevisao({ id: "1", acertos: 4, erros: 0 }, RATING.BOM);

        expect(resultado).toEqual({ id: "1", acertos: 5, erros: 0 });
    });

    it("lança erro quando a inserção do log falha, sem quebrar silenciosamente", async () => {
        mockTabelas({
            flashcardResultado: { data: { id: "1", acertos: 1, erros: 0 }, error: null },
            logResultado: { data: null, error: { message: "Falha ao registrar log" } },
        });

        await expect(
            marcarRevisao({ id: "1", acertos: 0, erros: 0 }, RATING.BOM)
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
