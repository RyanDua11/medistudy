import { describe, it, expect, vi, beforeEach } from "vitest";

function criarQueryBuilderMock(resultado) {
    const builder = {
        select: vi.fn(() => builder),
        insert: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        order: vi.fn(() => builder),
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
    gerarCasoClinico,
    criarCasoClinico,
    listarCasosClinicos,
    registrarResolucaoCaso,
    listarLogResolucoesCasos,
} = await import("./casosClinicosService.js");

const CASO_VALIDO = {
    enunciado: "Paciente de 45 anos, masculino, com febre e dor abdominal.",
    pergunta: "Qual é o diagnóstico mais provável?",
    alternativas: ["Sepse abdominal", "Enxaqueca", "Ansiedade", "Refluxo"],
    alternativa_correta: 0,
    explicacao: "O quadro é compatível com sepse de foco abdominal.",
};

beforeEach(() => {
    mockFrom.mockReset();
    mockGetUser.mockReset();
    mockInvoke.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: { id: "usuario-1" } }, error: null });
});

describe("gerarCasoClinico", () => {
    it("invoca a edge function com a matéria e retorna o texto bruto", async () => {
        mockInvoke.mockResolvedValue({ data: { texto: JSON.stringify(CASO_VALIDO) }, error: null });

        const resultado = await gerarCasoClinico("Farmacologia II");

        expect(mockInvoke).toHaveBeenCalledWith("gerar-caso-clinico", {
            body: { materia: "Farmacologia II" },
        });
        expect(resultado).toBe(JSON.stringify(CASO_VALIDO));
    });

    it("lança erro quando a edge function retorna erro", async () => {
        mockInvoke.mockResolvedValue({ data: null, error: { message: "Falha na função" } });

        await expect(gerarCasoClinico("Farmacologia II")).rejects.toThrow("Falha na função");
    });

    it("lança erro quando a edge function responde com corpo de erro", async () => {
        mockInvoke.mockResolvedValue({ data: { erro: "GROQ_API_KEY não configurada no projeto Supabase" }, error: null });

        await expect(gerarCasoClinico("Farmacologia II")).rejects.toThrow(
            "GROQ_API_KEY não configurada no projeto Supabase"
        );
    });
});

describe("criarCasoClinico", () => {
    it("gera, valida e persiste um caso clínico válido", async () => {
        mockInvoke.mockResolvedValue({ data: { texto: JSON.stringify(CASO_VALIDO) }, error: null });
        const builder = criarQueryBuilderMock({
            data: { id: "1", materia: "Farmacologia II", ...CASO_VALIDO, criado_por: "usuario-1" },
            error: null,
        });
        mockFrom.mockReturnValue(builder);

        const resultado = await criarCasoClinico("Farmacologia II");

        expect(mockFrom).toHaveBeenCalledWith("casos_clinicos");
        expect(builder.insert).toHaveBeenCalledWith({
            materia: "Farmacologia II",
            criado_por: "usuario-1",
            ...CASO_VALIDO,
        });
        expect(resultado.materia).toBe("Farmacologia II");
    });

    it("não persiste nada quando a resposta da IA é inválida", async () => {
        mockInvoke.mockResolvedValue({ data: { texto: "isso não é json" }, error: null });

        await expect(criarCasoClinico("Farmacologia II")).rejects.toThrow(
            "Resposta da IA não é um JSON válido"
        );
        expect(mockFrom).not.toHaveBeenCalled();
    });

    it("propaga o erro do Supabase ao persistir", async () => {
        mockInvoke.mockResolvedValue({ data: { texto: JSON.stringify(CASO_VALIDO) }, error: null });
        const builder = criarQueryBuilderMock({ data: null, error: { message: "Falha ao salvar caso" } });
        mockFrom.mockReturnValue(builder);

        await expect(criarCasoClinico("Farmacologia II")).rejects.toThrow("Falha ao salvar caso");
    });
});

describe("listarCasosClinicos", () => {
    it("retorna todos os casos clínicos, mais recentes primeiro", async () => {
        const casos = [
            { id: "1", materia: "Farmacologia II" },
            { id: "2", materia: "Microbiologia" },
        ];
        const builder = criarQueryBuilderMock({ data: casos, error: null });
        mockFrom.mockReturnValue(builder);

        const resultado = await listarCasosClinicos();

        expect(mockFrom).toHaveBeenCalledWith("casos_clinicos");
        expect(builder.order).toHaveBeenCalledWith("criado_em", { ascending: false });
        expect(resultado).toEqual(casos);
    });

    it("lança erro quando o Supabase retorna erro", async () => {
        const builder = criarQueryBuilderMock({ data: null, error: { message: "Falha ao listar" } });
        mockFrom.mockReturnValue(builder);

        await expect(listarCasosClinicos()).rejects.toThrow("Falha ao listar");
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

    it("propaga o erro do Supabase ao registrar a resolução", async () => {
        const builder = criarQueryBuilderMock({ data: null, error: { message: "Falha ao registrar resolução" } });
        mockFrom.mockReturnValue(builder);

        await expect(registrarResolucaoCaso("caso-1", 0, true)).rejects.toThrow("Falha ao registrar resolução");
    });
});

describe("listarLogResolucoesCasos", () => {
    it("retorna o log de resoluções, mais recente primeiro", async () => {
        const logs = [
            { id: "log-1", caso_clinico_id: "caso-1", acertou: true },
            { id: "log-2", caso_clinico_id: "caso-2", acertou: false },
        ];
        const builder = criarQueryBuilderMock({ data: logs, error: null });
        mockFrom.mockReturnValue(builder);

        const resultado = await listarLogResolucoesCasos();

        expect(mockFrom).toHaveBeenCalledWith("log_resolucoes_casos");
        expect(builder.order).toHaveBeenCalledWith("resolvido_em", { ascending: false });
        expect(resultado).toEqual(logs);
    });

    it("lança erro quando o Supabase retorna erro", async () => {
        const builder = criarQueryBuilderMock({ data: null, error: { message: "Falha ao listar log" } });
        mockFrom.mockReturnValue(builder);

        await expect(listarLogResolucoesCasos()).rejects.toThrow("Falha ao listar log");
    });
});
