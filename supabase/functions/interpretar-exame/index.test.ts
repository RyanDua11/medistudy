// Testes da Edge Function interpretar-exame: mock do Gemini (nunca chama a
// API de verdade). Rodar com:
// deno test --allow-env --allow-net supabase/functions/interpretar-exame/index.test.ts

import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { arquivoAceito, chamarGemini, montarPayloadGemini, validarResultadoInterpretacao } from "./index.ts";

function respostaGeminiOk(jsonTexto: string, usage?: { prompt_tokens: number; completion_tokens: number }) {
    return new Response(
        JSON.stringify({
            choices: [{ message: { content: jsonTexto } }],
            ...(usage ? { usage } : {}),
        }),
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
    assertEquals(arquivoAceito("text/plain"), false);
    assertEquals(arquivoAceito(""), false);
});

Deno.test("montarPayloadGemini monta uma mensagem multimodal (texto + image_url em data URI)", () => {
    const payload = montarPayloadGemini("QkFTRTY0", "image/png");
    assertEquals(payload.model, "gemini-2.0-flash");
    const conteudo = payload.messages[0].content;
    assertEquals(conteudo[1], { type: "image_url", image_url: { url: "data:image/png;base64,QkFTRTY0" } });
    assertStringIncludes((conteudo[0] as { text: string }).text, "JSON");
    assertEquals(payload.response_format, { type: "json_object" });
});

Deno.test("validarResultadoInterpretacao preenche defaults pra campos ausentes", () => {
    const resultado = validarResultadoInterpretacao({});
    assertEquals(resultado, {
        tipo_exame: "Não identificado",
        parametros: [],
        interpretacao: "",
        alertas_criticos: [],
    });
});

Deno.test("validarResultadoInterpretacao normaliza status inválido pra 'normal'", () => {
    const resultado = validarResultadoInterpretacao({
        parametros: [{ nome: "X", valor: "1", referencia: "0-2", status: "algo-esquisito" }],
    });
    assertEquals(resultado.parametros[0].status, "normal");
});

Deno.test("validarResultadoInterpretacao preserva um resultado já bem formado", () => {
    const resultado = validarResultadoInterpretacao(RESULTADO_EXEMPLO);
    assertEquals(resultado, RESULTADO_EXEMPLO);
});

Deno.test("chamarGemini retorna o resultado parseado em caso de sucesso", async () => {
    await comFetchMockado(
        () => Promise.resolve(respostaGeminiOk(JSON.stringify(RESULTADO_EXEMPLO))),
        async () => {
            const { resultado } = await chamarGemini("base64fake", "image/png", "chave-fake");
            assertEquals(resultado, RESULTADO_EXEMPLO);
        },
    );
});

Deno.test("chamarGemini extrai tokens de usage.prompt_tokens/completion_tokens", async () => {
    await comFetchMockado(
        () => Promise.resolve(respostaGeminiOk(JSON.stringify(RESULTADO_EXEMPLO), { prompt_tokens: 900, completion_tokens: 150 })),
        async () => {
            const { tokensInput, tokensOutput } = await chamarGemini("base64fake", "image/png", "chave-fake");
            assertEquals(tokensInput, 900);
            assertEquals(tokensOutput, 150);
        },
    );
});

Deno.test("chamarGemini lança erro quando a resposta HTTP não é ok", async () => {
    await comFetchMockado(
        () => Promise.resolve(new Response("rate limit", { status: 429 })),
        async () => {
            let erroCapturado: Error | undefined;
            try {
                await chamarGemini("base64fake", "image/png", "chave-fake");
            } catch (erro) {
                erroCapturado = erro as Error;
            }
            assertEquals(erroCapturado !== undefined, true);
            assertStringIncludes(erroCapturado!.message, "429");
        },
    );
});

Deno.test("chamarGemini lança erro quando o Gemini não retorna texto interpretável", async () => {
    await comFetchMockado(
        () => Promise.resolve(new Response(JSON.stringify({ choices: [] }), { status: 200 })),
        async () => {
            let erroCapturado: Error | undefined;
            try {
                await chamarGemini("base64fake", "image/png", "chave-fake");
            } catch (erro) {
                erroCapturado = erro as Error;
            }
            assertEquals(erroCapturado !== undefined, true);
        },
    );
});

Deno.test("chamarGemini lança erro quando o texto retornado não é JSON válido", async () => {
    await comFetchMockado(
        () => Promise.resolve(respostaGeminiOk("isso não é json")),
        async () => {
            let erroCapturado: Error | undefined;
            try {
                await chamarGemini("base64fake", "image/png", "chave-fake");
            } catch (erro) {
                erroCapturado = erro as Error;
            }
            assertEquals(erroCapturado !== undefined, true);
            assertStringIncludes(erroCapturado!.message, "JSON inválido");
        },
    );
});
