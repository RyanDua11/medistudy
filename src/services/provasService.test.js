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

const { criarProva, listarProvas, editarProva, removerProva } = await import("./provasService.js");

beforeEach(() => {
    mockFrom.mockReset();
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: { id: "usuario-1" } }, error: null });
});

describe("criarProva", () => {
    it("insere uma prova associada à usuária logada", async () => {
        const provaCriada = {
            id: "1",
            user_id: "usuario-1",
            materia: "Farmacologia II",
            data: "2026-09-15T00:00:00.000Z",
            nota_necessaria: 7,
        };
        const builder = criarQueryBuilderMock({ data: provaCriada, error: null });
        mockFrom.mockReturnValue(builder);

        const resultado = await criarProva("Farmacologia II", "2026-09-15T00:00:00.000Z", 7);

        expect(mockFrom).toHaveBeenCalledWith("provas");
        expect(builder.insert).toHaveBeenCalledWith({
            user_id: "usuario-1",
            materia: "Farmacologia II",
            data: "2026-09-15T00:00:00.000Z",
            nota_necessaria: 7,
        });
        expect(resultado).toEqual(provaCriada);
    });

    it("permite criar sem nota_necessaria (opcional)", async () => {
        const builder = criarQueryBuilderMock({ data: { id: "1" }, error: null });
        mockFrom.mockReturnValue(builder);

        await criarProva("Microbiologia", "2026-09-20T00:00:00.000Z");

        expect(builder.insert).toHaveBeenCalledWith({
            user_id: "usuario-1",
            materia: "Microbiologia",
            data: "2026-09-20T00:00:00.000Z",
            nota_necessaria: null,
        });
    });

    it("lança erro quando o Supabase retorna erro", async () => {
        const builder = criarQueryBuilderMock({
            data: null,
            error: { message: "Falha ao criar prova" },
        });
        mockFrom.mockReturnValue(builder);

        await expect(criarProva("Farmacologia II", "2026-09-15T00:00:00.000Z")).rejects.toThrow(
            "Falha ao criar prova"
        );
    });
});

describe("listarProvas", () => {
    it("retorna as provas da usuária logada, ordenadas pela data mais próxima primeiro", async () => {
        const provas = [
            { id: "1", materia: "Farmacologia II", data: "2026-09-15T00:00:00.000Z" },
            { id: "2", materia: "Microbiologia", data: "2026-09-20T00:00:00.000Z" },
        ];
        const builder = criarQueryBuilderMock({ data: provas, error: null });
        mockFrom.mockReturnValue(builder);

        const resultado = await listarProvas();

        expect(mockFrom).toHaveBeenCalledWith("provas");
        expect(builder.order).toHaveBeenCalledWith("data", { ascending: true });
        expect(resultado).toEqual(provas);
    });

    it("lança erro quando o Supabase retorna erro", async () => {
        const builder = criarQueryBuilderMock({
            data: null,
            error: { message: "Falha ao listar provas" },
        });
        mockFrom.mockReturnValue(builder);

        await expect(listarProvas()).rejects.toThrow("Falha ao listar provas");
    });
});

describe("editarProva", () => {
    it("atualiza os campos informados da prova", async () => {
        const builder = criarQueryBuilderMock({
            data: { id: "1", materia: "Farmacologia II", nota_necessaria: 8 },
            error: null,
        });
        mockFrom.mockReturnValue(builder);

        const resultado = await editarProva("1", { nota_necessaria: 8 });

        expect(mockFrom).toHaveBeenCalledWith("provas");
        expect(builder.update).toHaveBeenCalledWith({ nota_necessaria: 8 });
        expect(builder.eq).toHaveBeenCalledWith("id", "1");
        expect(resultado.nota_necessaria).toBe(8);
    });

    it("lança erro quando o Supabase retorna erro", async () => {
        const builder = criarQueryBuilderMock({
            data: null,
            error: { message: "Falha ao editar prova" },
        });
        mockFrom.mockReturnValue(builder);

        await expect(editarProva("1", { materia: "X" })).rejects.toThrow("Falha ao editar prova");
    });
});

describe("removerProva", () => {
    it("remove a prova pelo id", async () => {
        const builder = criarQueryBuilderMock({ data: null, error: null });
        mockFrom.mockReturnValue(builder);

        await removerProva("1");

        expect(mockFrom).toHaveBeenCalledWith("provas");
        expect(builder.delete).toHaveBeenCalled();
        expect(builder.eq).toHaveBeenCalledWith("id", "1");
    });

    it("lança erro quando o Supabase retorna erro", async () => {
        const builder = criarQueryBuilderMock({
            data: null,
            error: { message: "Falha ao remover prova" },
        });
        mockFrom.mockReturnValue(builder);

        await expect(removerProva("1")).rejects.toThrow("Falha ao remover prova");
    });
});
