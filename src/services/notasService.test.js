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

const { criarNota, listarNotas, editarNota, removerNota } = await import("./notasService.js");

beforeEach(() => {
    mockFrom.mockReset();
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: { id: "usuario-1" } }, error: null });
});

describe("criarNota", () => {
    it("insere uma nota associada à usuária logada", async () => {
        const notaCriada = {
            id: "1",
            user_id: "usuario-1",
            materia: "Farmacologia II",
            avaliacao: "P1",
            peso: 2,
            nota: 7.5,
        };
        const builder = criarQueryBuilderMock({ data: notaCriada, error: null });
        mockFrom.mockReturnValue(builder);

        const resultado = await criarNota("Farmacologia II", "P1", 2, 7.5);

        expect(mockFrom).toHaveBeenCalledWith("notas");
        expect(builder.insert).toHaveBeenCalledWith({
            user_id: "usuario-1",
            materia: "Farmacologia II",
            avaliacao: "P1",
            peso: 2,
            nota: 7.5,
        });
        expect(resultado).toEqual(notaCriada);
    });

    it("lança erro quando o Supabase retorna erro", async () => {
        const builder = criarQueryBuilderMock({
            data: null,
            error: { message: "Falha ao criar nota" },
        });
        mockFrom.mockReturnValue(builder);

        await expect(criarNota("Farmacologia II", "P1", 2, 7.5)).rejects.toThrow(
            "Falha ao criar nota"
        );
    });
});

describe("listarNotas", () => {
    it("retorna as notas da usuária logada", async () => {
        const notas = [
            { id: "1", materia: "Farmacologia II", avaliacao: "P1", peso: 2, nota: 7.5 },
            { id: "2", materia: "Farmacologia II", avaliacao: "P2", peso: 3, nota: 6 },
        ];
        const builder = criarQueryBuilderMock({ data: notas, error: null });
        mockFrom.mockReturnValue(builder);

        const resultado = await listarNotas();

        expect(mockFrom).toHaveBeenCalledWith("notas");
        expect(resultado).toEqual(notas);
    });

    it("lança erro quando o Supabase retorna erro", async () => {
        const builder = criarQueryBuilderMock({
            data: null,
            error: { message: "Falha ao listar notas" },
        });
        mockFrom.mockReturnValue(builder);

        await expect(listarNotas()).rejects.toThrow("Falha ao listar notas");
    });
});

describe("editarNota", () => {
    it("atualiza os campos informados da nota", async () => {
        const builder = criarQueryBuilderMock({
            data: { id: "1", nota: 8 },
            error: null,
        });
        mockFrom.mockReturnValue(builder);

        const resultado = await editarNota("1", { nota: 8 });

        expect(mockFrom).toHaveBeenCalledWith("notas");
        expect(builder.update).toHaveBeenCalledWith({ nota: 8 });
        expect(builder.eq).toHaveBeenCalledWith("id", "1");
        expect(resultado.nota).toBe(8);
    });

    it("lança erro quando o Supabase retorna erro", async () => {
        const builder = criarQueryBuilderMock({
            data: null,
            error: { message: "Falha ao editar nota" },
        });
        mockFrom.mockReturnValue(builder);

        await expect(editarNota("1", { nota: 8 })).rejects.toThrow("Falha ao editar nota");
    });
});

describe("removerNota", () => {
    it("remove a nota pelo id", async () => {
        const builder = criarQueryBuilderMock({ data: null, error: null });
        mockFrom.mockReturnValue(builder);

        await removerNota("1");

        expect(mockFrom).toHaveBeenCalledWith("notas");
        expect(builder.delete).toHaveBeenCalled();
        expect(builder.eq).toHaveBeenCalledWith("id", "1");
    });

    it("lança erro quando o Supabase retorna erro", async () => {
        const builder = criarQueryBuilderMock({
            data: null,
            error: { message: "Falha ao remover nota" },
        });
        mockFrom.mockReturnValue(builder);

        await expect(removerNota("1")).rejects.toThrow("Falha ao remover nota");
    });
});
