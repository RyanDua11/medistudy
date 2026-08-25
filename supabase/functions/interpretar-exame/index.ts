// Edge Function: Interpretador de Exames — recebe um exame médico (imagem)
// em base64 e devolve uma leitura estruturada via IA, multimodal.
//
// Fallback em cascata entre os provedores com suporte a entrada multimodal
// (image_url em data URI) — ver PROVEDORES_VISAO em _shared/provedoresIA.ts.
// Só passa pro próximo se o anterior falhar, igual ao chat-medistudy e ao
// gerar-caso-clinico, pra não depender de um único provedor de visão.

import { registrarLogUso } from "../_shared/logUsoIA.ts";
import { PROVEDORES_VISAO, type Provedor } from "../_shared/provedoresIA.ts";

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

export function montarPayload(provedor: Provedor, arquivoBase64: string, tipoMime: string) {
    return {
        model: provedor.modelo,
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

/** Garante que o JSON devolvido pelo modelo tem o formato esperado, preenchendo defaults pra campos ausentes. */
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

export interface ResultadoProvedorVisao {
    resultado: ResultadoInterpretacao;
    tokensInput: number | null;
    tokensOutput: number | null;
}

export async function chamarProvedor(provedor: Provedor, arquivoBase64: string, tipoMime: string, apiKey: string): Promise<ResultadoProvedorVisao> {
    const resposta = await fetch(provedor.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(montarPayload(provedor, arquivoBase64, tipoMime)),
    });

    if (!resposta.ok) {
        const detalhe = await resposta.text();
        throw new Error(`Falha ao chamar ${provedor.nome} (status ${resposta.status}): ${detalhe}`);
    }

    const dados = await resposta.json();
    const texto = dados.choices?.[0]?.message?.content;
    if (!texto) throw new Error(`${provedor.nome} não retornou conteúdo interpretável`);

    let bruto: unknown;
    try {
        bruto = JSON.parse(texto);
    } catch {
        throw new Error(`${provedor.nome} retornou um JSON inválido`);
    }

    return {
        resultado: validarResultadoInterpretacao(bruto),
        tokensInput: dados.usage?.prompt_tokens ?? null,
        tokensOutput: dados.usage?.completion_tokens ?? null,
    };
}

export interface ResultadoFallbackVisao extends ResultadoProvedorVisao {
    provedor: string;
    modelo: string;
}

export async function chamarComFallback(
    arquivoBase64: string,
    tipoMime: string,
    obterEnv: (nome: string) => string | undefined = (nome) => Deno.env.get(nome),
): Promise<ResultadoFallbackVisao> {
    const falhas: string[] = [];

    for (const provedor of PROVEDORES_VISAO) {
        const apiKey = obterEnv(provedor.envVar);
        if (!apiKey) {
            falhas.push(`${provedor.nome}: ${provedor.envVar} não configurada`);
            continue;
        }

        try {
            const resultado = await chamarProvedor(provedor, arquivoBase64, tipoMime, apiKey);
            return { ...resultado, provedor: provedor.nome, modelo: provedor.modelo };
        } catch (erro) {
            const mensagem = erro instanceof Error ? erro.message : String(erro);
            falhas.push(`${provedor.nome}: ${mensagem}`);
        }
    }

    throw new Error(`Todos os provedores de visão falharam. ${falhas.join(" | ")}`);
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
        const { resultado, tokensInput, tokensOutput, provedor, modelo } = await chamarComFallback(arquivoBase64, tipoMime);

        await registrarLogUso({
            provedor,
            modelo,
            funcionalidade: "interpretador-exames",
            sucesso: true,
            tokensInput,
            tokensOutput,
            tempoRespostaMs: Date.now() - inicio,
        });

        return new Response(JSON.stringify({ ...resultado, provedor }), {
            status: 200,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : String(erro);

        await registrarLogUso({
            provedor: "todos",
            modelo: "-",
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
