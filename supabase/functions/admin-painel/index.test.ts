// Testes das funções puras de admin-painel. Rodar com:
// deno test --allow-env --allow-net supabase/functions/admin-painel/index.test.ts

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { agruparChamadasPorDia, agruparUsoPorProvedor, completarProvedoresSemDados, contarPorUsuario, idUsuarioDoJwt } from "./index.ts";

function base64Url(obj: unknown) {
    const json = JSON.stringify(obj);
    return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function jwtFalso(payload: Record<string, unknown>) {
    return `${base64Url({ alg: "HS256" })}.${base64Url(payload)}.assinatura-fake`;
}

Deno.test("idUsuarioDoJwt extrai o sub de um Authorization: Bearer <jwt>", () => {
    const token = jwtFalso({ sub: "efe4e863-0ea1-4a0f-9656-f58e6f81d60d", role: "authenticated" });
    assertEquals(idUsuarioDoJwt(`Bearer ${token}`), "efe4e863-0ea1-4a0f-9656-f58e6f81d60d");
});

Deno.test("idUsuarioDoJwt retorna null sem header Authorization", () => {
    assertEquals(idUsuarioDoJwt(null), null);
});

Deno.test("idUsuarioDoJwt retorna null pra header que não é Bearer", () => {
    assertEquals(idUsuarioDoJwt("Basic algumacoisa"), null);
});

Deno.test("idUsuarioDoJwt retorna null pra token malformado", () => {
    assertEquals(idUsuarioDoJwt("Bearer nao.eh.um.jwt.valido"), null);
    assertEquals(idUsuarioDoJwt("Bearer lixo"), null);
});

Deno.test("agruparUsoPorProvedor soma tokens e calcula taxa de sucesso", () => {
    const linhas = [
        { provedor: "Groq", sucesso: true, criado_em: "2026-08-24T10:00:00Z", tokens_input: 100, tokens_output: 40 },
        { provedor: "Groq", sucesso: false, criado_em: "2026-08-24T11:00:00Z", tokens_input: 0, tokens_output: 0 },
    ];
    const [resultado] = agruparUsoPorProvedor(linhas);
    assertEquals(resultado.total, 2);
    assertEquals(resultado.erros, 1);
    assertEquals(resultado.taxaSucesso, 50);
    assertEquals(resultado.tokensInput, 100);
});

Deno.test("completarProvedoresSemDados preenche provedores ausentes com status sem dados", () => {
    const resultado = completarProvedoresSemDados([], ["Groq", "Gemini"]);
    assertEquals(resultado.length, 2);
    assertEquals(resultado.every((p) => p.taxaSucesso === null), true);
});

Deno.test("agruparChamadasPorDia agrupa por data e conta erros", () => {
    const linhas = [
        { sucesso: true, criado_em: "2026-08-24T10:00:00Z" },
        { sucesso: false, criado_em: "2026-08-24T11:00:00Z" },
    ];
    const resultado = agruparChamadasPorDia(linhas);
    assertEquals(resultado, [{ dia: "2026-08-24", total: 2, erros: 1 }]);
});

Deno.test("contarPorUsuario conta por coluna e ignora ids ausentes", () => {
    const contagem = contarPorUsuario([{ user_id: "a" }, { user_id: "a" }, { user_id: null }], "user_id");
    assertEquals(contagem.get("a"), 2);
    assertEquals(contagem.has("null"), false);
});
