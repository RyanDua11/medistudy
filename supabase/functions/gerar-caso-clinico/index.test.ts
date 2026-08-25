// Testes do fallback em cascata de gerar-caso-clinico (mock do fetch, nunca
// chama nenhum provedor de verdade). Rodar com:
// deno test --allow-env --allow-net supabase/functions/gerar-caso-clinico/index.test.ts

import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { chamarComFallback, chamarProvedor } from "./index.ts";
import { PROVEDORES } from "../_shared/provedoresIA.ts";

function respostaOk(conteudo: string, usage?: { prompt_tokens: number; completion_tokens: number }) {
    return new Response(
        JSON.stringify({ choices: [{ message: { content: conteudo } }], ...(usage ? { usage } : {}) }),
        { status: 200 },
    );
}

function respostaErro(status: number, corpo: string) {
    return new Response(corpo, { status });
}

function comFetchMockado(impl: typeof fetch, fn: () => Promise<void>) {
    const original = globalThis.fetch;
    globalThis.fetch = impl;
    return fn().finally(() => {
        globalThis.fetch = original;
    });
}

const ENV_COMPLETO = new Map([
    ["GROQ_API_KEY", "chave-groq"],
    ["GEMINI_API_KEY", "chave-gemini"],
    ["CEREBRAS_API_KEY", "chave-cerebras"],
    ["OPENROUTER_API_KEY", "chave-openrouter"],
    ["MISTRAL_API_KEY", "chave-mistral"],
    ["SAMBANOVA_API_KEY", "chave-sambanova"],
    ["DEEPSEEK_API_KEY", "chave-deepseek"],
    ["HUGGINGFACE_API_KEY", "chave-huggingface"],
    ["NVIDIA_API_KEY", "chave-nvidia"],
    ["GITHUB_MODELS_API_KEY", "chave-github-models"],
    ["COHERE_API_KEY", "chave-cohere"],
    ["CLOUDFLARE_API_KEY", "chave-cloudflare"],
]);

Deno.test("chamarProvedor retorna texto e tokens em caso de sucesso", async () => {
    await comFetchMockado(
        () => Promise.resolve(respostaOk('{"ok":true}', { prompt_tokens: 50, completion_tokens: 20 })),
        async () => {
            const resultado = await chamarProvedor(PROVEDORES[0], "chave-fake", "prompt", "gere agora");
            assertEquals(resultado.texto, '{"ok":true}');
            assertEquals(resultado.tokensInput, 50);
            assertEquals(resultado.tokensOutput, 20);
        },
    );
});

Deno.test("chamarProvedor lança erro com o nome do provedor e o status quando a resposta não é ok", async () => {
    await comFetchMockado(
        () => Promise.resolve(respostaErro(429, "rate limit")),
        async () => {
            let erroCapturado: Error | undefined;
            try {
                await chamarProvedor(PROVEDORES[0], "chave-fake", "prompt", "gere agora");
            } catch (erro) {
                erroCapturado = erro as Error;
            }
            assertEquals(erroCapturado !== undefined, true);
            assertStringIncludes(erroCapturado!.message, "Groq");
            assertStringIncludes(erroCapturado!.message, "429");
        },
    );
});

Deno.test("chamarComFallback usa Gemini quando Groq falha", async () => {
    await comFetchMockado(
        (input: RequestInfo | URL) => {
            const url = String(input);
            if (url.includes("groq.com")) return Promise.resolve(respostaErro(503, "groq indisponível"));
            if (url.includes("generativelanguage.googleapis.com")) return Promise.resolve(respostaOk('{"caso":"gemini"}'));
            return Promise.resolve(respostaErro(500, "não deveria chegar aqui"));
        },
        async () => {
            const resultado = await chamarComFallback("prompt", "gere agora", (nome) => ENV_COMPLETO.get(nome));
            assertEquals(resultado.texto, '{"caso":"gemini"}');
            assertEquals(resultado.provedor, "Gemini");
        },
    );
});

Deno.test("chamarComFallback percorre todos os 12 provedores até o último quando todos os anteriores falham", async () => {
    await comFetchMockado(
        (input: RequestInfo | URL) => {
            const url = String(input);
            if (url.includes("api.cloudflare.com")) return Promise.resolve(respostaOk('{"caso":"cloudflare"}'));
            return Promise.resolve(respostaErro(500, "indisponível"));
        },
        async () => {
            const resultado = await chamarComFallback("prompt", "gere agora", (nome) => ENV_COMPLETO.get(nome));
            assertEquals(resultado.provedor, "CloudflareWorkersAI");
        },
    );
});

Deno.test("chamarComFallback lança erro agregando o motivo de cada provedor quando todos falham", async () => {
    await comFetchMockado(
        () => Promise.resolve(respostaErro(500, "fora do ar")),
        async () => {
            let erroCapturado: Error | undefined;
            try {
                await chamarComFallback("prompt", "gere agora", (nome) => ENV_COMPLETO.get(nome));
            } catch (erro) {
                erroCapturado = erro as Error;
            }
            assertEquals(erroCapturado !== undefined, true);
            for (const provedor of PROVEDORES) {
                assertStringIncludes(erroCapturado!.message, provedor.nome);
            }
        },
    );
});

Deno.test("chamarComFallback pula provedores sem API key configurada", async () => {
    await comFetchMockado(
        (input: RequestInfo | URL) => {
            const url = String(input);
            if (url.includes("groq.com")) return Promise.resolve(respostaErro(500, "groq erro"));
            if (url.includes("mistral.ai")) return Promise.resolve(respostaOk('{"caso":"mistral"}'));
            throw new Error("Não deveria chamar provedor sem chave configurada: " + url);
        },
        async () => {
            const env = new Map([
                ["GROQ_API_KEY", "chave-groq"],
                ["MISTRAL_API_KEY", "chave-mistral"],
            ]);
            const resultado = await chamarComFallback("prompt", "gere agora", (nome) => env.get(nome));
            assertEquals(resultado.provedor, "Mistral");
        },
    );
});
