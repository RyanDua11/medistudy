// Edge Function: chat da Dra. Mah — assistente de estudos de medicina do
// MediStudy, com fallback em cascata entre provedores de IA (todos free
// tier, compatíveis com o formato de request/response da OpenAI). Só passa
// para o próximo provedor se o anterior falhar (rate limit, erro de rede,
// HTTP não-ok etc). Requer os secrets configurados no projeto Supabase:
//   supabase secrets set GROQ_API_KEY=sua_chave_aqui
//   supabase secrets set GEMINI_API_KEY=sua_chave_aqui
//   supabase secrets set CEREBRAS_API_KEY=sua_chave_aqui
//   supabase secrets set OPENROUTER_API_KEY=sua_chave_aqui
//   supabase secrets set MISTRAL_API_KEY=sua_chave_aqui
//   supabase secrets set SAMBANOVA_API_KEY=sua_chave_aqui
//   supabase secrets set DEEPSEEK_API_KEY=sua_chave_aqui
//   supabase secrets set HUGGINGFACE_API_KEY=sua_chave_aqui
//
// Esta função é stateless (não grava nada no Supabase): quem decide o que
// persistir é o cliente (tabelas conversas_chat/mensagens_chat), mesmo
// padrão usado no restante do MediStudy.

import { registrarLogUso } from "../_shared/logUsoIA.ts";

interface Provedor {
    nome: string;
    url: string;
    modelo: string;
    envVar: string;
}

export interface MensagemChat {
    role: "system" | "user" | "assistant";
    content: string;
}

// Ordem de fallback: tenta cada provedor nesta sequência, só passando para o
// próximo se o anterior lançar exceção.
export const PROVEDORES: Provedor[] = [
    {
        nome: "Groq",
        url: "https://api.groq.com/openai/v1/chat/completions",
        modelo: "openai/gpt-oss-20b",
        envVar: "GROQ_API_KEY",
    },
    {
        nome: "Gemini",
        url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        modelo: "gemini-2.0-flash",
        envVar: "GEMINI_API_KEY",
    },
    {
        nome: "Cerebras",
        url: "https://api.cerebras.ai/v1/chat/completions",
        modelo: "llama-3.3-70b",
        envVar: "CEREBRAS_API_KEY",
    },
    {
        nome: "OpenRouter",
        url: "https://openrouter.ai/api/v1/chat/completions",
        modelo: "meta-llama/llama-3.3-70b-instruct:free",
        envVar: "OPENROUTER_API_KEY",
    },
    {
        nome: "Mistral",
        url: "https://api.mistral.ai/v1/chat/completions",
        modelo: "mistral-small-latest",
        envVar: "MISTRAL_API_KEY",
    },
    {
        nome: "SambaNova",
        url: "https://api.sambanova.ai/v1/chat/completions",
        modelo: "Meta-Llama-3.3-70B-Instruct",
        envVar: "SAMBANOVA_API_KEY",
    },
    {
        nome: "DeepSeek",
        url: "https://api.deepseek.com/chat/completions",
        modelo: "deepseek-chat",
        envVar: "DEEPSEEK_API_KEY",
    },
    {
        nome: "HuggingFace",
        url: "https://api-inference.huggingface.co/v1/chat/completions",
        modelo: "meta-llama/Llama-3.3-70B-Instruct",
        envVar: "HUGGINGFACE_API_KEY",
    },
];

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const SYSTEM_PROMPT = `Você é a Dra. Mah, assistente de estudos de medicina do MediStudy — uma macrófaga doutora com óculos que adora devorar dúvidas médicas. Seu jeito é didático, direto e levemente bem-humorado, como uma colega mais experiente que explica sem enrolar. Explica conceitos, raciocina junto, faz perguntas socráticas quando faz sentido. Nunca inventa dado clínico. Responde em texto corrido, pode usar markdown leve.`;

export async function chamarProvedor(
    provedor: Provedor,
    apiKey: string,
    mensagens: MensagemChat[],
) {
    const resposta = await fetch(provedor.url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: provedor.modelo,
            messages: mensagens,
        }),
    });

    if (!resposta.ok) {
        const detalhe = await resposta.text();
        console.error(`Falha ao chamar ${provedor.nome} (status ${resposta.status}): ${detalhe}`);
        throw new Error(`Falha ao chamar ${provedor.nome} (status ${resposta.status}): ${detalhe}`);
    }

    const dados = await resposta.json();
    return dados.choices?.[0]?.message?.content ?? "";
}

// Tenta cada provedor em PROVEDORES na ordem, passando para o próximo apenas
// se o anterior lançar exceção. `obterEnv` é injetável para permitir testar
// sem depender de Deno.env global.
export interface ResultadoFallback {
    texto: string;
    provedor: string;
    modelo: string;
}

export async function chamarComFallback(
    mensagens: MensagemChat[],
    obterEnv: (nome: string) => string | undefined = (nome) => Deno.env.get(nome),
): Promise<ResultadoFallback> {
    const falhas: string[] = [];

    for (const provedor of PROVEDORES) {
        const apiKey = obterEnv(provedor.envVar);
        if (!apiKey) {
            falhas.push(`${provedor.nome}: ${provedor.envVar} não configurada`);
            continue;
        }

        try {
            const texto = await chamarProvedor(provedor, apiKey, mensagens);
            return { texto, provedor: provedor.nome, modelo: provedor.modelo };
        } catch (erro) {
            const mensagem = erro instanceof Error ? erro.message : String(erro);
            falhas.push(`${provedor.nome}: ${mensagem}`);
        }
    }

    const mensagemFinal = `Todos os provedores de IA falharam. ${falhas.join(" | ")}`;
    console.error(mensagemFinal);
    throw new Error(mensagemFinal);
}

// Monta a lista de mensagens no formato OpenAI: system prompt + histórico da
// conversa + a mensagem nova do usuário.
export function montarMensagens(mensagem: string, historico: MensagemChat[]) {
    return [
        { role: "system" as const, content: SYSTEM_PROMPT },
        ...historico,
        { role: "user" as const, content: mensagem },
    ];
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: CORS_HEADERS });
    }

    if (req.method !== "POST") {
        return new Response(
            JSON.stringify({ erro: "Método não permitido" }),
            { status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
    }

    let corpo: Record<string, unknown>;
    try {
        corpo = await req.json();
    } catch {
        return new Response(
            JSON.stringify({ erro: "Corpo da requisição inválido" }),
            { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
    }

    const mensagem = typeof corpo.mensagem === "string" ? corpo.mensagem : "";
    const historico = Array.isArray(corpo.historico) ? (corpo.historico as MensagemChat[]) : [];

    if (!mensagem.trim()) {
        return new Response(
            JSON.stringify({ erro: "Campo mensagem é obrigatório" }),
            { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
    }

    const inicio = Date.now();

    try {
        const mensagens = montarMensagens(mensagem, historico);
        const resultado = await chamarComFallback(mensagens);

        // aguardado (não fire-and-forget): depois da Response ser retornada,
        // o isolate da Edge Function pode ser congelado antes de uma
        // promise pendente terminar, perdendo o log
        await registrarLogUso({
            provedor: resultado.provedor,
            modelo: resultado.modelo,
            funcionalidade: "chat",
            sucesso: true,
            tempoRespostaMs: Date.now() - inicio,
        });

        return new Response(
            JSON.stringify({ resposta: resultado.texto }),
            { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
    } catch (erro) {
        const mensagemErro = erro instanceof Error ? erro.message : String(erro);

        await registrarLogUso({
            provedor: "todos",
            modelo: "-",
            funcionalidade: "chat",
            sucesso: false,
            erroMensagem: mensagemErro,
            tempoRespostaMs: Date.now() - inicio,
        });

        return new Response(
            JSON.stringify({ erro: mensagemErro }),
            { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
    }
});
