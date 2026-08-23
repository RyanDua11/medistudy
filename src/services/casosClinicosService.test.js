import { describe, it, expect, vi, beforeEach } from "vitest";

function criarQueryBuilderMock(resultado) {
    const builder = {
        select: vi.fn(() => builder),
        insert: vi.fn(() => builder),
        update: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(() => Promise.resolve(resultado)),
        single: vi.fn(() => Promise.resolve(resultado)),
        then: (resolve) => Promise.resolve(resultado).then(resolve),
    };
    return builder;
}

const mockFrom = vi.fn();
const mockGetUser = vi.fn();
const mockInvoke = vi.fn();

vi.mock("./supabaseClient.js", () => ({
    supabase: {
        from: (...args) => mockFrom(...args),
        auth: {
            getUser: (...args) => mockGetUser(...args),
        },
        functions: {
            invoke: (...args) => mockInvoke(...args),
        },
    },
}));

const {
    criarCasoRapido,
    criarCasoInterativo,
    avaliarHipotese,
    criarCasoAnamnese,
    responderAnamnese,
    avaliarAnamnese,
    salvarHistoricoAnamnese,
    buscarOuGerarCasoDoDia,
    marcarResolvidoHoje,
    listarCasosClinicos,
    registrarResolucaoCaso,
    listarLogResolucoesCasos,
} = await import("./casosClinicosService.js");

function pergunta() {
    return {
        pergunta: "Qual a hipótese mais provável?",
        alternativas: ["A", "B", "C", "D"],
        alternativa_correta: 1,
        explicacao: "Explicação clínica.",
    };
}

const CASO_RAPIDO_VALIDO = {
    enunciado: "Paciente de 45 anos...",
    perguntas: [pergunta(), pergunta(), pergunta(), pergunta()],
};

const CASO_INTERATIVO_VALIDO = {
    paciente: {
        nome: "João",
        idade: 34,
        sexo: "masculino",
        queixa_principal: "Dor torácica",
        sinais_vitais: { fc: "112", fr: "24", pa: "130x80", temperatura: "36.8", sato2: "93%" },
    },
    perguntas_anamnese: [{ id: "p1", texto: "Há quanto tempo?", essencial: true, resposta: "2 horas." }],
    exames: [{ id: "e1", nome: "TC de tórax", custo_tokens: 3, resultado: "Resultado." }],
    hipotese_correta: "TEP",
    condutas: [
        { texto: "Anticoagular", correta: true, justificativa: "..." },
        { texto: "Observar", correta: false, justificativa: "..." },
        { texto: "Dar alta", correta: false, justificativa: "..." },
    ],
    raciocinio_final: "Resumo do raciocínio.",
};

const CASO_ANAMNESE_VALIDO = {
    paciente: { nome: "Carlos", idade: 28, sexo: "masculino", queixa: "Dor abdominal", personalidade: "Ansioso" },
    diagnostico_secreto: "Apendicite",
    perguntas_essenciais: ["Início da dor", "Febre"],
};

beforeEach(() => {
    mockFrom.mockReset();
    mockGetUser.mockReset();
    mockInvoke.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: { id: "usuario-1" } }, error: null });
});

describe("criarCasoRapido", () => {
    it("gera, valida e persiste um caso com 4 perguntas, preenchendo as colunas legadas com a 1ª pergunta", async () => {
        mockInvoke.mockResolvedValue({ data: { texto: JSON.stringify(CASO_RAPIDO_VALIDO) }, error: null });
        const builder = criarQueryBuilderMock({ data: { id: "1", modo: "rapido" }, error: null });
        mockFrom.mockReturnValue(builder);

        const resultado = await criarCasoRapido("Farmacologia II", "medio");

        expect(mockInvoke).toHaveBeenCalledWith("gerar-caso-clinico", {
            body: { modo: "rapido", materia: "Farmacologia II", dificuldade: "medio" },
        });
        expect(mockFrom).toHaveBeenCalledWith("casos_clinicos");
        const insercao = builder.insert.mock.calls[0][0];
        expect(insercao.perguntas).toHaveLength(4);
        expect(insercao.pergunta).toBe(CASO_RAPIDO_VALIDO.perguntas[0].pergunta);
        expect(insercao.modo).toBe("rapido");
        expect(resultado.id).toBe("1");
    });

    it("não persiste nada quando a resposta da IA não tem 4 perguntas", async () => {
        mockInvoke.mockResolvedValue({ data: { texto: JSON.stringify({ enunciado: "x", perguntas: [pergunta()] }) }, error: null });

        await expect(criarCasoRapido("Farmacologia II")).rejects.toThrow(/perguntas/);
        expect(mockFrom).not.toHaveBeenCalled();
    });
});

describe("criarCasoInterativo", () => {
    it("gera, valida e persiste um caso interativo em dados_interativo", async () => {
        mockInvoke.mockResolvedValue({ data: { texto: JSON.stringify(CASO_INTERATIVO_VALIDO) }, error: null });
        const builder = criarQueryBuilderMock({ data: { id: "2", modo: "interativo" }, error: null });
        mockFrom.mockReturnValue(builder);

        await criarCasoInterativo("Cardiologia", "dificil");

        expect(mockInvoke).toHaveBeenCalledWith("gerar-caso-clinico", {
            body: { modo: "interativo", materia: "Cardiologia", dificuldade: "dificil" },
        });
        const insercao = builder.insert.mock.calls[0][0];
        expect(insercao.dados_interativo).toEqual(CASO_INTERATIVO_VALIDO);
        expect(insercao.enunciado).toBe(CASO_INTERATIVO_VALIDO.paciente.queixa_principal);
    });
});

describe("avaliarHipotese", () => {
    it("chama a edge function e retorna a avaliação validada", async () => {
        const avaliacao = { avaliacao: "correta", explicacao: "Bem fundamentada." };
        mockInvoke.mockResolvedValue({ data: { texto: JSON.stringify(avaliacao) }, error: null });

        const resultado = await avaliarHipotese("TEP", "Tromboembolismo pulmonar");

        expect(mockInvoke).toHaveBeenCalledWith("gerar-caso-clinico", {
            body: { modo: "avaliar_hipotese", hipotese_aluna: "TEP", hipotese_correta: "Tromboembolismo pulmonar" },
        });
        expect(resultado).toEqual(avaliacao);
    });
});

describe("criarCasoAnamnese", () => {
    it("gera, valida e persiste um caso de anamnese com histórico vazio", async () => {
        mockInvoke.mockResolvedValue({ data: { texto: JSON.stringify(CASO_ANAMNESE_VALIDO) }, error: null });
        const builder = criarQueryBuilderMock({ data: { id: "3", modo: "anamnese" }, error: null });
        mockFrom.mockReturnValue(builder);

        await criarCasoAnamnese("Semiologia IV");

        const insercao = builder.insert.mock.calls[0][0];
        expect(insercao.dados_interativo).toEqual(CASO_ANAMNESE_VALIDO);
        expect(insercao.historico_anamnese).toEqual([]);
    });
});

describe("responderAnamnese", () => {
    it("retorna a fala do paciente", async () => {
        mockInvoke.mockResolvedValue({ data: { texto: JSON.stringify({ resposta: "Começou ontem." }) }, error: null });

        const resposta = await responderAnamnese({ nome: "Carlos" }, [], "Há quanto tempo?");

        expect(resposta).toBe("Começou ontem.");
    });
});

describe("avaliarAnamnese", () => {
    it("retorna a avaliação estruturada da anamnese", async () => {
        const avaliacao = { coletadas: ["Início"], esquecidas: ["Febre"], hipotese_inferida: "Apendicite" };
        mockInvoke.mockResolvedValue({ data: { texto: JSON.stringify(avaliacao) }, error: null });

        const resultado = await avaliarAnamnese({ nome: "Carlos" }, [], ["Início", "Febre"]);

        expect(resultado).toEqual(avaliacao);
    });
});

describe("salvarHistoricoAnamnese", () => {
    it("atualiza historico_anamnese do caso pelo id", async () => {
        const builder = criarQueryBuilderMock({ data: { id: "3", historico_anamnese: [{ pergunta: "x" }] }, error: null });
        mockFrom.mockReturnValue(builder);

        await salvarHistoricoAnamnese("3", [{ pergunta: "x" }]);

        expect(builder.update).toHaveBeenCalledWith({ historico_anamnese: [{ pergunta: "x" }] });
        expect(builder.eq).toHaveBeenCalledWith("id", "3");
    });
});

describe("buscarOuGerarCasoDoDia", () => {
    it("reaproveita o caso do dia já existente quando é de hoje", async () => {
        const hoje = new Date().toISOString().slice(0, 10);
        const builder = criarQueryBuilderMock({ data: [{ id: "caso-hoje", data_caso: hoje }], error: null });
        mockFrom.mockReturnValue(builder);

        const resultado = await buscarOuGerarCasoDoDia();

        expect(resultado.id).toBe("caso-hoje");
        expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("gera um novo caso do dia quando o mais recente é de outro dia", async () => {
        const builderBusca = criarQueryBuilderMock({ data: [{ id: "caso-antigo", data_caso: "2020-01-01" }], error: null });
        const builderInsert = criarQueryBuilderMock({ data: { id: "caso-novo", tipo: "caso_do_dia" }, error: null });
        mockFrom.mockReturnValueOnce(builderBusca).mockReturnValueOnce(builderInsert);
        mockInvoke.mockResolvedValue({ data: { texto: JSON.stringify(CASO_INTERATIVO_VALIDO) }, error: null });

        const resultado = await buscarOuGerarCasoDoDia();

        expect(mockInvoke).toHaveBeenCalledWith("gerar-caso-clinico", expect.objectContaining({ body: expect.objectContaining({ modo: "caso_do_dia" }) }));
        expect(resultado.id).toBe("caso-novo");
    });

    it("gera um novo caso do dia quando ainda não existe nenhum", async () => {
        const builderBusca = criarQueryBuilderMock({ data: [], error: null });
        const builderInsert = criarQueryBuilderMock({ data: { id: "caso-novo" }, error: null });
        mockFrom.mockReturnValueOnce(builderBusca).mockReturnValueOnce(builderInsert);
        mockInvoke.mockResolvedValue({ data: { texto: JSON.stringify(CASO_INTERATIVO_VALIDO) }, error: null });

        const resultado = await buscarOuGerarCasoDoDia();

        expect(resultado.id).toBe("caso-novo");
    });
});

describe("marcarResolvidoHoje", () => {
    it("adiciona o usuário logado à lista de quem já resolveu hoje", async () => {
        const builder = criarQueryBuilderMock({ data: { id: "caso-1", usuarios_resolveram_hoje: ["usuario-2", "usuario-1"] }, error: null });
        mockFrom.mockReturnValue(builder);

        await marcarResolvidoHoje("caso-1", ["usuario-2"]);

        expect(builder.update).toHaveBeenCalledWith({ usuarios_resolveram_hoje: ["usuario-2", "usuario-1"] });
    });

    it("não atualiza nada quando o usuário já está na lista", async () => {
        const resultado = await marcarResolvidoHoje("caso-1", ["usuario-1"]);

        expect(mockFrom).not.toHaveBeenCalled();
        expect(resultado).toBeNull();
    });
});

describe("listarCasosClinicos", () => {
    it("retorna todos os casos clínicos, mais recentes primeiro", async () => {
        const casos = [{ id: "1" }, { id: "2" }];
        const builder = criarQueryBuilderMock({ data: casos, error: null });
        mockFrom.mockReturnValue(builder);

        const resultado = await listarCasosClinicos();

        expect(mockFrom).toHaveBeenCalledWith("casos_clinicos");
        expect(builder.order).toHaveBeenCalledWith("criado_em", { ascending: false });
        expect(resultado).toEqual(casos);
    });
});

describe("registrarResolucaoCaso", () => {
    it("persiste a resolução com o usuário logado, a alternativa escolhida e se acertou", async () => {
        const builder = criarQueryBuilderMock({
            data: { id: "log-1", caso_clinico_id: "caso-1", usuario_id: "usuario-1", alternativa_escolhida: 0, acertou: true },
            error: null,
        });
        mockFrom.mockReturnValue(builder);

        const resultado = await registrarResolucaoCaso("caso-1", 0, true);

        expect(mockFrom).toHaveBeenCalledWith("log_resolucoes_casos");
        expect(builder.insert).toHaveBeenCalledWith({
            caso_clinico_id: "caso-1",
            usuario_id: "usuario-1",
            alternativa_escolhida: 0,
            acertou: true,
        });
        expect(resultado.acertou).toBe(true);
    });
});

describe("listarLogResolucoesCasos", () => {
    it("retorna o log de resoluções, mais recente primeiro", async () => {
        const logs = [{ id: "log-1" }, { id: "log-2" }];
        const builder = criarQueryBuilderMock({ data: logs, error: null });
        mockFrom.mockReturnValue(builder);

        const resultado = await listarLogResolucoesCasos();

        expect(mockFrom).toHaveBeenCalledWith("log_resolucoes_casos");
        expect(builder.order).toHaveBeenCalledWith("resolvido_em", { ascending: false });
        expect(resultado).toEqual(logs);
    });
});
