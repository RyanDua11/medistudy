// Testes da Edge Function interpretar-exame: fallback em cascata entre
// provedores de visão (mock do fetch, nunca chama nenhum provedor de
// verdade). Rodar com:
// deno test --allow-env --allow-net supabase/functions/interpretar-exame/index.test.ts

import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { arquivoAceito, chamarComFallback, chamarProvedor, montarPayload, validarResultadoInterpretacao } from "./index.ts";
import { PROVEDORES_VISAO } from "../_shared/provedoresIA.ts";

function respostaOk(jsonTexto: string, usage?: { prompt_tokens: number; completion_tokens: number }) {
    return new Response(
        JSON.stringify({ choices: [{ message: { content: jsonTexto } }], ...(usage ? { usage } : {}) }),
        { status: 200 },
    );
}

function comFetchMockado(impl: typeof fetch, fn: () => Promise<void>) {
    const original = globalThis.fetch;
    globalThis.fetch = impl;
    return fn().finally(() => {
        globalThis.fetch = original;
    });
}

const ENV_COMPLETO = new Map([
    ["GEMINI_API_KEY", "chave-gemini"],
    ["MISTRAL_API_KEY", "chave-mistral"],
    ["OPENROUTER_API_KEY", "chave-openrouter"],
]);

const RESULTADO_EXEMPLO = {
    tipo_exame: "Hemograma completo",
    parametros: [{ nome: "Hemoglobina", valor: "13.5 g/dL", referencia: "12-16 g/dL", status: "normal" as const }],
    interpretacao: "Valores dentro da normalidade.",
    alertas_criticos: [] as string[],
};

Deno.test("arquivoAceito aceita PDF, PNG e JPEG", () => {
    assertEquals(arquivoAceito("application/pdf"), true);
    assertEquals(arquivoAceito("image/png"), true);
    assertEquals(arquivoAceito("image/jpeg"), true);
});

Deno.test("arquivoAceito rejeita tipos não suportados", () => {
    assertEquals(arquivoAceito("image/gif"), false);
    assertEquals(arquivoAceito(""), false);
});

Deno.test("montarPayload monta uma mensagem multimodal com o modelo do provedor certo", () => {
    const payload = montarPayload(PROVEDORES_VISAO[1], "QkFTRTY0", "image/png");
    assertEquals(payload.model, PROVEDORES_VISAO[1].modelo);
    const conteudo = payload.messages[0].content;
    assertEquals(conteudo[1], { type: "image_url", image_url: { url: "data:image/png;base64,QkFTRTY0" } });
    assertStringIncludes((conteudo[0] as { text: string }).text, "JSON");
});

Deno.test("validarResultadoInterpretacao preenche defaults pra campos ausentes", () => {
    const resultado = validarResultadoInterpretacao({});
    assertEquals(resultado, { tipo_exame: "Não identificado", parametros: [], interpretacao: "", alertas_criticos: [] });
});

Deno.test("validarResultadoInterpretacao normaliza status inválido pra 'normal'", () => {
    const resultado = validarResultadoInterpretacao({ parametros: [{ nome: "X", valor: "1", referencia: "0-2", status: "esquisito" }] });
    assertEquals(resultado.parametros[0].status, "normal");
});

Deno.test("chamarProvedor retorna o resultado parseado e os tokens em caso de sucesso", async () => {
    await comFetchMockado(
        () => Promise.resolve(respostaOk(JSON.stringify(RESULTADO_EXEMPLO), { prompt_tokens: 900, completion_tokens: 150 })),
        async () => {
            const { resultado, tokensInput, tokensOutput } = await chamarProvedor(PROVEDORES_VISAO[0], "base64fake", "image/png", "chave-fake");
            assertEquals(resultado, RESULTADO_EXEMPLO);
            assertEquals(tokensInput, 900);
            assertEquals(tokensOutput, 150);
        },
    );
});

Deno.test("chamarProvedor lança erro com o nome do provedor quando a resposta HTTP não é ok", async () => {
    await comFetchMockado(
        () => Promise.resolve(new Response("rate limit", { status: 429 })),
        async () => {
            let erroCapturado: Error | undefined;
            try {
                await chamarProvedor(PROVEDORES_VISAO[0], "base64fake", "image/png", "chave-fake");
            } catch (erro) {
                erroCapturado = erro as Error;
            }
            assertEquals(erroCapturado !== undefined, true);
            assertStringIncludes(erroCapturado!.message, "Gemini");
            assertStringIncludes(erroCapturado!.message, "429");
        },
    );
});

Deno.test("chamarProvedor lança erro quando o texto retornado não é JSON válido", async () => {
    await comFetchMockado(
        () => Promise.resolve(respostaOk("isso não é json")),
        async () => {
            let erroCapturado: Error | undefined;
            try {
                await chamarProvedor(PROVEDORES_VISAO[0], "base64fake", "image/png", "chave-fake");
            } catch (erro) {
                erroCapturado = erro as Error;
            }
            assertEquals(erroCapturado !== undefined, true);
            assertStringIncludes(erroCapturado!.message, "JSON inválido");
        },
    );
});

Deno.test("chamarComFallback usa Mistral quando Gemini falha", async () => {
    await comFetchMockado(
        (input: RequestInfo | URL) => {
            const url = String(input);
            if (url.includes("generativelanguage.googleapis.com")) return Promise.resolve(new Response("indisponível", { status: 503 }));
            if (url.includes("mistral.ai")) return Promise.resolve(respostaOk(JSON.stringify(RESULTADO_EXEMPLO)));
            return Promise.resolve(new Response("não deveria chegar aqui", { status: 500 }));
        },
        async () => {
            const resultado = await chamarComFallback("base64fake", "image/png", (nome) => ENV_COMPLETO.get(nome));
            assertEquals(resultado.provedor, "Mistral");
            assertEquals(resultado.resultado, RESULTADO_EXEMPLO);
        },
    );
});

Deno.test("chamarComFallback percorre todos os provedores de visão até o último quando os anteriores falham", async () => {
    await comFetchMockado(
        (input: RequestInfo | URL) => {
            const url = String(input);
            if (url.includes("openrouter.ai")) return Promise.resolve(respostaOk(JSON.stringify(RESULTADO_EXEMPLO)));
            return Promise.resolve(new Response("indisponível", { status: 500 }));
        },
        async () => {
            const resultado = await chamarComFallback("base64fake", "image/png", (nome) => ENV_COMPLETO.get(nome));
            assertEquals(resultado.provedor, "OpenRouter");
        },
    );
});

Deno.test("chamarComFallback lança erro agregando o motivo de cada provedor quando todos falham", async () => {
    await comFetchMockado(
        () => Promise.resolve(new Response("fora do ar", { status: 500 })),
        async () => {
            let erroCapturado: Error | undefined;
            try {
                await chamarComFallback("base64fake", "image/png", (nome) => ENV_COMPLETO.get(nome));
            } catch (erro) {
                erroCapturado = erro as Error;
            }
            assertEquals(erroCapturado !== undefined, true);
            for (const provedor of PROVEDORES_VISAO) {
                assertStringIncludes(erroCapturado!.message, provedor.nome);
            }
        },
    );
});

Deno.test("chamarComFallback pula provedores sem API key configurada", async () => {
    await comFetchMockado(
        (input: RequestInfo | URL) => {
            const url = String(input);
            if (url.includes("generativelanguage.googleapis.com")) return Promise.resolve(new Response("erro", { status: 500 }));
            if (url.includes("openrouter.ai")) return Promise.resolve(respostaOk(JSON.stringify(RESULTADO_EXEMPLO)));
            throw new Error("Não deveria chamar provedor sem chave configurada: " + url);
        },
        async () => {
            const env = new Map([
                ["GEMINI_API_KEY", "chave-gemini"],
                ["OPENROUTER_API_KEY", "chave-openrouter"],
            ]);
            const resultado = await chamarComFallback("base64fake", "image/png", (nome) => env.get(nome));
            assertEquals(resultado.provedor, "OpenRouter");
        },
    );
});
