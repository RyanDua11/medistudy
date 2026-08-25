// Testes do registrarLogUso: cobrem o insert via REST (payload correto),
// a ausência de secrets, e que uma falha no insert nunca lança (é
// fire-and-forget do ponto de vista de quem chama, só loga no console).
//
// Rodar com: deno test --allow-env --allow-net supabase/functions/_shared/logUsoIA.test.ts

import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { registrarLogUso } from "./logUsoIA.ts";

function comFetchMockado(impl: typeof fetch, fn: () => Promise<void>) {
    const original = globalThis.fetch;
    globalThis.fetch = impl;
    return fn().finally(() => {
        globalThis.fetch = original;
    });
}

function comConsoleErrorEspiado(fn: () => Promise<void>) {
    const original = console.error;
    const chamadas: unknown[][] = [];
    console.error = (...args: unknown[]) => chamadas.push(args);
    return fn()
        .then(() => chamadas)
        .finally(() => {
            console.error = original;
        });
}

const ENV_OK = new Map([
    ["SUPABASE_URL", "https://exemplo.supabase.co"],
    ["SUPABASE_SECRET_KEY", "chave-secreta"],
]);

Deno.test("registrarLogUso faz POST em /rest/v1/log_uso_ia com o payload correto", async () => {
    let urlChamada = "";
    let corpoChamado: Record<string, unknown> = {};
    let headersChamados: Record<string, string> = {};

    await comFetchMockado(
        (input: RequestInfo | URL, init?: RequestInit) => {
            urlChamada = String(input);
            corpoChamado = JSON.parse(String(init?.body));
            headersChamados = init?.headers as Record<string, string>;
            return Promise.resolve(new Response(null, { status: 201 }));
        },
        async () => {
            await registrarLogUso(
                {
                    provedor: "Groq",
                    modelo: "openai/gpt-oss-20b",
                    funcionalidade: "chat",
                    sucesso: true,
                    tempoRespostaMs: 842,
                },
                (nome) => ENV_OK.get(nome),
            );
        },
    );

    assertEquals(urlChamada, "https://exemplo.supabase.co/rest/v1/log_uso_ia");
    assertEquals(headersChamados.apikey, "chave-secreta");
    assertEquals(headersChamados.Authorization, "Bearer chave-secreta");
    assertEquals(corpoChamado, {
        usuario_id: null,
        provedor: "Groq",
        modelo: "openai/gpt-oss-20b",
        funcionalidade: "chat",
        tokens_input: null,
        tokens_output: null,
        sucesso: true,
        erro_mensagem: null,
        tempo_resposta_ms: 842,
    });
});

Deno.test("registrarLogUso inclui erro_mensagem quando sucesso é false", async () => {
    let corpoChamado: Record<string, unknown> = {};

    await comFetchMockado(
        (_input: RequestInfo | URL, init?: RequestInit) => {
            corpoChamado = JSON.parse(String(init?.body));
            return Promise.resolve(new Response(null, { status: 201 }));
        },
        async () => {
            await registrarLogUso(
                {
                    provedor: "todos",
                    modelo: "-",
                    funcionalidade: "casos-clinicos",
                    sucesso: false,
                    erroMensagem: "Todos os provedores de IA falharam.",
                    tempoRespostaMs: 1200,
                },
                (nome) => ENV_OK.get(nome),
            );
        },
    );

    assertEquals(corpoChamado.sucesso, false);
    assertEquals(corpoChamado.erro_mensagem, "Todos os provedores de IA falharam.");
});

Deno.test("registrarLogUso não lança e loga quando SUPABASE_URL/SECRET_KEY não estão configurados", async () => {
    const chamadas = await comConsoleErrorEspiado(async () => {
        await registrarLogUso(
            { provedor: "Groq", modelo: "x", funcionalidade: "chat", sucesso: true, tempoRespostaMs: 1 },
            () => undefined,
        );
    });

    assertEquals(chamadas.length >= 1, true);
});

Deno.test("registrarLogUso não lança quando o insert falha (HTTP não-ok)", async () => {
    const chamadas = await comConsoleErrorEspiado(() =>
        comFetchMockado(
            () => Promise.resolve(new Response("erro de RLS", { status: 403 })),
            async () => {
                await registrarLogUso(
                    { provedor: "Groq", modelo: "x", funcionalidade: "chat", sucesso: true, tempoRespostaMs: 1 },
                    (nome) => ENV_OK.get(nome),
                );
            },
        )
    );

    assertEquals(chamadas.length >= 1, true);
    assertStringIncludes(chamadas.map((a) => a.join(" ")).join(" | "), "403");
});

Deno.test("registrarLogUso não lança quando fetch rejeita (erro de rede)", async () => {
    const chamadas = await comConsoleErrorEspiado(() =>
        comFetchMockado(
            () => Promise.reject(new Error("network down")),
            async () => {
                await registrarLogUso(
                    { provedor: "Groq", modelo: "x", funcionalidade: "chat", sucesso: true, tempoRespostaMs: 1 },
                    (nome) => ENV_OK.get(nome),
                );
            },
        )
    );

    assertEquals(chamadas.length >= 1, true);
});
