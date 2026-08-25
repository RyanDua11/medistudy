// Testes do diagnóstico de provedores (mock do fetch, nunca chama nenhum
// provedor de verdade). Rodar com:
// deno test --allow-env --allow-net supabase/functions/testar-provedores/index.test.ts

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { testarProvedor, testarTodosProvedores } from "./index.ts";
import { PROVEDORES } from "../_shared/provedoresIA.ts";

function comFetchMockado(impl: typeof fetch, fn: () => Promise<void>) {
    const original = globalThis.fetch;
    globalThis.fetch = impl;
    return fn().finally(() => {
        globalThis.fetch = original;
    });
}

function comEnvMockado(env: Record<string, string>, fn: () => Promise<void>) {
    const original = Deno.env.get;
    Deno.env.get = ((chave: string) => env[chave]) as typeof Deno.env.get;
    return fn().finally(() => {
        Deno.env.get = original;
    });
}

Deno.test("testarProvedor retorna sucesso quando a resposta tem conteúdo", async () => {
    await comFetchMockado(
        () => Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 })),
        async () => {
            const resultado = await testarProvedor(PROVEDORES[0], "chave-fake");
            assertEquals(resultado.sucesso, true);
            assertEquals(resultado.mensagemErro, null);
            assertEquals(resultado.provedor, "Groq");
        },
    );
});

Deno.test("testarProvedor retorna falha sem chamar fetch quando não há API key", async () => {
    let chamouFetch = false;
    await comFetchMockado(
        () => {
            chamouFetch = true;
            return Promise.resolve(new Response("nunca deveria chegar aqui"));
        },
        async () => {
            const resultado = await testarProvedor(PROVEDORES[0], undefined);
            assertEquals(resultado.sucesso, false);
            assertEquals(resultado.mensagemErro, "GROQ_API_KEY não configurada");
        },
    );
    assertEquals(chamouFetch, false);
});

Deno.test("testarProvedor retorna falha com o status quando a resposta HTTP não é ok", async () => {
    await comFetchMockado(
        () => Promise.resolve(new Response("rate limit", { status: 429 })),
        async () => {
            const resultado = await testarProvedor(PROVEDORES[0], "chave-fake");
            assertEquals(resultado.sucesso, false);
            assertEquals(resultado.mensagemErro?.includes("429"), true);
        },
    );
});

Deno.test("testarProvedor retorna falha quando a resposta não tem conteúdo", async () => {
    await comFetchMockado(
        () => Promise.resolve(new Response(JSON.stringify({ choices: [] }), { status: 200 })),
        async () => {
            const resultado = await testarProvedor(PROVEDORES[0], "chave-fake");
            assertEquals(resultado.sucesso, false);
            assertEquals(resultado.mensagemErro, "resposta sem conteúdo");
        },
    );
});

Deno.test("testarProvedor não lança quando fetch rejeita (erro de rede)", async () => {
    await comFetchMockado(
        () => Promise.reject(new Error("network down")),
        async () => {
            const resultado = await testarProvedor(PROVEDORES[0], "chave-fake");
            assertEquals(resultado.sucesso, false);
            assertEquals(resultado.mensagemErro, "network down");
        },
    );
});

Deno.test("testarTodosProvedores testa todos os 8 provedores, mesmo quando um falha", async () => {
    await comEnvMockado(
        {
            GROQ_API_KEY: "k",
            GEMINI_API_KEY: "k",
            CEREBRAS_API_KEY: "k",
            OPENROUTER_API_KEY: "k",
            MISTRAL_API_KEY: "k",
            SAMBANOVA_API_KEY: "k",
            DEEPSEEK_API_KEY: "k",
            HUGGINGFACE_API_KEY: "k",
            SUPABASE_URL: "",
            SUPABASE_SECRET_KEY: "",
        },
        () =>
            comFetchMockado(
                (input: RequestInfo | URL) => {
                    const url = String(input);
                    if (url.includes("groq.com")) return Promise.resolve(new Response("erro", { status: 500 }));
                    return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 }));
                },
                async () => {
                    const resultados = await testarTodosProvedores();
                    assertEquals(resultados.length, PROVEDORES.length);
                    assertEquals(resultados.find((r) => r.provedor === "Groq")?.sucesso, false);
                    assertEquals(resultados.filter((r) => r.sucesso).length, PROVEDORES.length - 1);
                },
            ),
    );
});
