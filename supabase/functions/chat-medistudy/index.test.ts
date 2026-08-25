// Testes da Edge Function chat-medistudy: cobrem o fallback em cascata entre
// os 8 provedores de IA (Groq → Gemini → Cerebras → OpenRouter → Mistral →
// SambaNova → DeepSeek → HuggingFace) e a montagem de mensagens do chat.
//
// Rodar com: deno test --allow-env --allow-net supabase/functions/chat-medistudy/index.test.ts

import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { chamarComFallback, chamarProvedor, montarMensagens, PROVEDORES, SYSTEM_PROMPT } from "./index.ts";

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
]);

Deno.test("PROVEDORES está na ordem Groq, Gemini, Cerebras, OpenRouter, Mistral, SambaNova, DeepSeek, HuggingFace", () => {
    assertEquals(
        PROVEDORES.map((p) => p.nome),
        ["Groq", "Gemini", "Cerebras", "OpenRouter", "Mistral", "SambaNova", "DeepSeek", "HuggingFace"],
    );
    assertEquals(PROVEDORES[0].modelo, "openai/gpt-oss-20b");
    assertEquals(PROVEDORES[1].modelo, "gemini-3.6-flash");
    assertEquals(PROVEDORES[7].modelo, "meta-llama/Llama-3.3-70B-Instruct");
});

Deno.test("montarMensagens monta system prompt + histórico + mensagem nova, nessa ordem", () => {
    const historico = [
        { role: "user" as const, content: "O que é sepse?" },
        { role: "assistant" as const, content: "Sepse é..." },
    ];
    const mensagens = montarMensagens("E choque séptico?", historico);

    assertEquals(mensagens.length, 4);
    assertEquals(mensagens[0], { role: "system", content: SYSTEM_PROMPT });
    assertEquals(mensagens[1], historico[0]);
    assertEquals(mensagens[2], historico[1]);
    assertEquals(mensagens[3], { role: "user", content: "E choque séptico?" });
});

Deno.test("montarMensagens funciona com histórico vazio", () => {
    const mensagens = montarMensagens("Oi", []);
    assertEquals(mensagens.length, 2);
    assertEquals(mensagens[1], { role: "user", content: "Oi" });
});

Deno.test("chamarProvedor retorna o texto da resposta em caso de sucesso (cenário feliz)", async () => {
    await comFetchMockado(
        () => Promise.resolve(respostaOk("Sepse é uma resposta inflamatória sistêmica...")),
        async () => {
            const resultado = await chamarProvedor(
                PROVEDORES[0],
                "chave-fake",
                [{ role: "user", content: "O que é sepse?" }],
            );
            assertEquals(resultado.texto, "Sepse é uma resposta inflamatória sistêmica...");
        },
    );
});

Deno.test("chamarProvedor extrai tokens de entrada/saída de usage.prompt_tokens/completion_tokens", async () => {
    await comFetchMockado(
        () => Promise.resolve(respostaOk("resposta", { prompt_tokens: 42, completion_tokens: 17 })),
        async () => {
            const resultado = await chamarProvedor(PROVEDORES[0], "chave-fake", [{ role: "user", content: "oi" }]);
            assertEquals(resultado.tokensInput, 42);
            assertEquals(resultado.tokensOutput, 17);
        },
    );
});

Deno.test("chamarProvedor retorna tokens null quando o provedor não manda usage", async () => {
    await comFetchMockado(
        () => Promise.resolve(respostaOk("resposta")),
        async () => {
            const resultado = await chamarProvedor(PROVEDORES[0], "chave-fake", [{ role: "user", content: "oi" }]);
            assertEquals(resultado.tokensInput, null);
            assertEquals(resultado.tokensOutput, null);
        },
    );
});

Deno.test("chamarProvedor loga o status e o corpo da resposta antes de lançar erro", async () => {
    const original = console.error;
    const chamadas: unknown[][] = [];
    console.error = (...args: unknown[]) => chamadas.push(args);

    try {
        await comFetchMockado(
            () => Promise.resolve(respostaErro(429, '{"error":"rate limit"}')),
            async () => {
                let erroCapturado: Error | undefined;
                try {
                    await chamarProvedor(PROVEDORES[0], "chave-fake", [{ role: "user", content: "oi" }]);
                } catch (erro) {
                    erroCapturado = erro as Error;
                }
                assertEquals(erroCapturado !== undefined, true);
            },
        );
    } finally {
        console.error = original;
    }

    assertEquals(chamadas.length >= 1, true);
    const logCompleto = chamadas.map((args) => args.join(" ")).join(" | ");
    assertStringIncludes(logCompleto, "Groq");
    assertStringIncludes(logCompleto, "429");
    assertStringIncludes(logCompleto, "rate limit");
});

Deno.test("chamarComFallback usa Gemini quando Groq falha", async () => {
    const chamadasPorUrl: string[] = [];

    await comFetchMockado(
        (input: RequestInfo | URL) => {
            const url = String(input);
            chamadasPorUrl.push(url);
            if (url.includes("groq.com")) return Promise.resolve(respostaErro(503, "groq indisponível"));
            if (url.includes("generativelanguage.googleapis.com")) {
                return Promise.resolve(respostaOk("resposta da gemini"));
            }
            return Promise.resolve(respostaErro(500, "não deveria chegar aqui"));
        },
        async () => {
            const resultado = await chamarComFallback(
                [{ role: "user", content: "oi" }],
                (nome) => ENV_COMPLETO.get(nome),
            );
            assertEquals(resultado.texto, "resposta da gemini");
        },
    );

    assertEquals(chamadasPorUrl.some((u) => u.includes("groq.com")), true);
    assertEquals(chamadasPorUrl.some((u) => u.includes("generativelanguage.googleapis.com")), true);
    assertEquals(chamadasPorUrl.some((u) => u.includes("cerebras.ai")), false);
});

Deno.test("chamarComFallback retorna o nome e o modelo do provedor que respondeu", async () => {
    await comFetchMockado(
        (input: RequestInfo | URL) => {
            const url = String(input);
            if (url.includes("groq.com")) return Promise.resolve(respostaErro(503, "groq indisponível"));
            if (url.includes("generativelanguage.googleapis.com")) return Promise.resolve(respostaOk("resposta da gemini"));
            return Promise.resolve(respostaErro(500, "não deveria chegar aqui"));
        },
        async () => {
            const resultado = await chamarComFallback(
                [{ role: "user", content: "oi" }],
                (nome) => ENV_COMPLETO.get(nome),
            );
            assertEquals(resultado.provedor, "Gemini");
            assertEquals(resultado.modelo, "gemini-3.6-flash");
        },
    );
});

Deno.test("chamarComFallback percorre todos os 8 provedores até o último quando todos os anteriores falham", async () => {
    await comFetchMockado(
        (input: RequestInfo | URL) => {
            const url = String(input);
            if (url.includes("router.huggingface.co")) return Promise.resolve(respostaOk("resposta da huggingface"));
            return Promise.resolve(respostaErro(500, "indisponível"));
        },
        async () => {
            const resultado = await chamarComFallback(
                [{ role: "user", content: "oi" }],
                (nome) => ENV_COMPLETO.get(nome),
            );
            assertEquals(resultado.texto, "resposta da huggingface");
        },
    );
});

Deno.test("chamarComFallback lança erro agregando o motivo de cada provedor quando todos falham", async () => {
    await comFetchMockado(
        () => Promise.resolve(respostaErro(500, "fora do ar")),
        async () => {
            let erroCapturado: Error | undefined;
            try {
                await chamarComFallback([{ role: "user", content: "oi" }], (nome) => ENV_COMPLETO.get(nome));
            } catch (erro) {
                erroCapturado = erro as Error;
            }

            assertEquals(erroCapturado !== undefined, true);
            const mensagem = erroCapturado!.message;
            for (const provedor of PROVEDORES) {
                assertStringIncludes(mensagem, provedor.nome);
            }
        },
    );
});

Deno.test("chamarComFallback pula provedores sem API key configurada e segue pro próximo disponível", async () => {
    await comFetchMockado(
        (input: RequestInfo | URL) => {
            const url = String(input);
            if (url.includes("groq.com")) return Promise.resolve(respostaErro(500, "groq erro"));
            if (url.includes("mistral.ai")) return Promise.resolve(respostaOk("resposta mistral"));
            throw new Error("Não deveria chamar provedor sem chave configurada: " + url);
        },
        async () => {
            const env = new Map([
                ["GROQ_API_KEY", "chave-groq"],
                ["MISTRAL_API_KEY", "chave-mistral"],
            ]);
            const resultado = await chamarComFallback([{ role: "user", content: "oi" }], (nome) => env.get(nome));
            assertEquals(resultado.texto, "resposta mistral");
        },
    );
});
