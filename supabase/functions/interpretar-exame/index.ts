// Edge Function: Interpretador de Exames — recebe um exame médico (imagem)
// em base64 e devolve uma leitura estruturada via Gemini, multimodal.
//
// Usa o endpoint OpenAI-compatible do Gemini (mesmo endpoint e mesma chave
// que chat-medistudy já usa com sucesso) em vez do endpoint nativo
// generateContent: a GEMINI_API_KEY configurada neste projeto só fala o
// formato OpenAI-compat (fica claro pelo "API key not valid" que o endpoint
// nativo devolve pra essa mesma chave) — provavelmente uma chave de proxy/
// gateway, não uma chave direta do Google AI Studio. Requer o secret
// GEMINI_API_KEY (já configurado):
//   supabase secrets set GEMINI_API_KEY=sua_chave_aqui
//
// Ferramenta de estudo, não substitui avaliação médica profissional — esse
// aviso é fixo no frontend (/interpretador-exames.html).

import { registrarLogUso } from "../_shared/logUsoIA.ts";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GEMINI_MODEL = "gemini-3.6-flash";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TIPOS_MIME_ACEITOS = ["application/pdf", "image/png", "image/jpeg"];

export const PROMPT_SISTEMA = `Você é um assistente de estudo de medicina que interpreta exames laboratoriais/de imagem pra fins EDUCACIONAIS. Analise o arquivo anexado e responda APENAS com um objeto JSON válido, sem markdown, sem texto antes ou depois, no formato exato:

{
  "tipo_exame": string (ex: "Hemograma completo", "Raio-X de tórax"),
  "parametros": [
    {
      "nome": string,
      "valor": string,
      "referencia": string (faixa de referência normal),
      "status": "normal" | "atencao" | "critico"
    }
  ],
  "interpretacao": string (leitura clínica em texto corrido, didática, para uma estudante de medicina),
  "alertas_criticos": array de strings (valores fora da faixa que merecem atenção urgente; array vazio se nenhum)
}

Use "critico" só pra valores genuinamente perigosos (risco à vida ou que exigem conduta imediata), "atencao" pra valores fora da referência mas não urgentes, "normal" pra valores dentro da faixa esperada. Se o arquivo não for um exame médico reconhecível, retorne tipo_exame como "Não identificado" e explique em interpretacao.`;

export interface ParametroExame {
    nome: string;
    valor: string;
    referencia: string;
    status: "normal" | "atencao" | "critico";
}

export interface ResultadoInterpretacao {
    tipo_exame: string;
    parametros: ParametroExame[];
    interpretacao: string;
    alertas_criticos: string[];
}

export function arquivoAceito(tipoMime: string): boolean {
    return TIPOS_MIME_ACEITOS.includes(tipoMime);
}

export function montarPayloadGemini(arquivoBase64: string, tipoMime: string) {
    return {
        model: GEMINI_MODEL,
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: PROMPT_SISTEMA },
                    { type: "image_url", image_url: { url: `data:${tipoMime};base64,${arquivoBase64}` } },
                ],
            },
        ],
        response_format: { type: "json_object" },
    };
}

/** Garante que o JSON devolvido pelo Gemini tem o formato esperado, preenchendo defaults pra campos ausentes. */
export function validarResultadoInterpretacao(bruto: unknown): ResultadoInterpretacao {
    const obj = (bruto ?? {}) as Record<string, unknown>;

    const parametros = Array.isArray(obj.parametros)
        ? (obj.parametros as Record<string, unknown>[]).map((p) => ({
              nome: String(p.nome ?? ""),
              valor: String(p.valor ?? ""),
              referencia: String(p.referencia ?? ""),
              status: (["normal", "atencao", "critico"].includes(String(p.status)) ? p.status : "normal") as ParametroExame["status"],
          }))
        : [];

    return {
        tipo_exame: typeof obj.tipo_exame === "string" ? obj.tipo_exame : "Não identificado",
        parametros,
        interpretacao: typeof obj.interpretacao === "string" ? obj.interpretacao : "",
        alertas_criticos: Array.isArray(obj.alertas_criticos) ? obj.alertas_criticos.map(String) : [],
    };
}

export interface ResultadoGemini {
    resultado: ResultadoInterpretacao;
    tokensInput: number | null;
    tokensOutput: number | null;
}

export async function chamarGemini(arquivoBase64: string, tipoMime: string, apiKey: string): Promise<ResultadoGemini> {
    const resposta = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(montarPayloadGemini(arquivoBase64, tipoMime)),
    });

    if (!resposta.ok) {
        const detalhe = await resposta.text();
        throw new Error(`Falha ao chamar Gemini (status ${resposta.status}): ${detalhe}`);
    }

    const dados = await resposta.json();
    const texto = dados.choices?.[0]?.message?.content;
    if (!texto) throw new Error("Gemini não retornou conteúdo interpretável");

    let bruto: unknown;
    try {
        bruto = JSON.parse(texto);
    } catch {
        throw new Error("Gemini retornou um JSON inválido");
    }

    return {
        resultado: validarResultadoInterpretacao(bruto),
        tokensInput: dados.usage?.prompt_tokens ?? null,
        tokensOutput: dados.usage?.completion_tokens ?? null,
    };
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: CORS_HEADERS });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ erro: "Método não permitido" }), {
            status: 405,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
        return new Response(JSON.stringify({ erro: "GEMINI_API_KEY não configurada no projeto Supabase" }), {
            status: 500,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
    }

    let corpo: Record<string, unknown>;
    try {
        corpo = await req.json();
    } catch {
        return new Response(JSON.stringify({ erro: "Corpo da requisição inválido" }), {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
    }

    const arquivoBase64 = typeof corpo.arquivo_base64 === "string" ? corpo.arquivo_base64 : "";
    const tipoMime = typeof corpo.tipo_mime === "string" ? corpo.tipo_mime : "";

    if (!arquivoBase64 || !tipoMime) {
        return new Response(JSON.stringify({ erro: "Campos arquivo_base64 e tipo_mime são obrigatórios" }), {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
    }

    if (!arquivoAceito(tipoMime)) {
        return new Response(JSON.stringify({ erro: `Tipo de arquivo não suportado: ${tipoMime}. Envie PDF, PNG ou JPG.` }), {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
    }

    const inicio = Date.now();

    try {
        const { resultado, tokensInput, tokensOutput } = await chamarGemini(arquivoBase64, tipoMime, geminiApiKey);

        await registrarLogUso({
            provedor: "Gemini",
            modelo: GEMINI_MODEL,
            funcionalidade: "interpretador-exames",
            sucesso: true,
            tokensInput,
            tokensOutput,
            tempoRespostaMs: Date.now() - inicio,
        });

        return new Response(JSON.stringify(resultado), {
            status: 200,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : String(erro);

        await registrarLogUso({
            provedor: "Gemini",
            modelo: GEMINI_MODEL,
            funcionalidade: "interpretador-exames",
            sucesso: false,
            erroMensagem: mensagem,
            tempoRespostaMs: Date.now() - inicio,
        });

        return new Response(JSON.stringify({ erro: mensagem }), {
            status: 502,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
    }
});
