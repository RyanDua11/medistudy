import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();

vi.mock("./supabaseClient.js", () => ({
    supabase: {
        auth: {
            signUp: (...args) => mockSignUp(...args),
            signInWithPassword: (...args) => mockSignInWithPassword(...args),
            signOut: (...args) => mockSignOut(...args),
            getSession: (...args) => mockGetSession(...args),
        },
    },
}));

const { registrar, entrar, sair, obterSessao } = await import("./authService.js");

beforeEach(() => {
    mockSignUp.mockReset();
    mockSignInWithPassword.mockReset();
    mockSignOut.mockReset();
    mockGetSession.mockReset();
});

describe("registrar", () => {
    it("cria conta com email e senha e retorna o usuário", async () => {
        mockSignUp.mockResolvedValue({
            data: { user: { id: "1", email: "aluna@medistudy.com" } },
            error: null,
        });

        const resultado = await registrar("aluna@medistudy.com", "senha123");

        expect(mockSignUp).toHaveBeenCalledWith({
            email: "aluna@medistudy.com",
            password: "senha123",
        });
        expect(resultado.user.email).toBe("aluna@medistudy.com");
    });

    it("lança erro quando o Supabase retorna erro", async () => {
        mockSignUp.mockResolvedValue({
            data: { user: null },
            error: { message: "Email já cadastrado" },
        });

        await expect(registrar("aluna@medistudy.com", "senha123")).rejects.toThrow(
            "Email já cadastrado"
        );
    });
});

describe("entrar", () => {
    it("autentica com email e senha e retorna o usuário", async () => {
        mockSignInWithPassword.mockResolvedValue({
            data: { user: { id: "1", email: "aluna@medistudy.com" } },
            error: null,
        });

        const resultado = await entrar("aluna@medistudy.com", "senha123");

        expect(mockSignInWithPassword).toHaveBeenCalledWith({
            email: "aluna@medistudy.com",
            password: "senha123",
        });
        expect(resultado.user.email).toBe("aluna@medistudy.com");
    });

    it("lança erro quando as credenciais são inválidas", async () => {
        mockSignInWithPassword.mockResolvedValue({
            data: { user: null },
            error: { message: "Credenciais inválidas" },
        });

        await expect(entrar("aluna@medistudy.com", "errada")).rejects.toThrow(
            "Credenciais inválidas"
        );
    });
});

describe("sair", () => {
    it("encerra a sessão atual", async () => {
        mockSignOut.mockResolvedValue({ error: null });

        await sair();

        expect(mockSignOut).toHaveBeenCalled();
    });
});

describe("obterSessao", () => {
    it("retorna a sessão atual quando existe", async () => {
        mockGetSession.mockResolvedValue({
            data: { session: { user: { email: "aluna@medistudy.com" } } },
            error: null,
        });

        const sessao = await obterSessao();

        expect(sessao.user.email).toBe("aluna@medistudy.com");
    });

    it("retorna null quando não há sessão", async () => {
        mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

        const sessao = await obterSessao();

        expect(sessao).toBeNull();
    });
});
