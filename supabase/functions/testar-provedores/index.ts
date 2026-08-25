// Edge Function: diagnóstico de provedores — manda uma mensagem trivial pra
// CADA um dos provedores de texto (não para no primeiro sucesso, ao
// contrário do fallback normal) e registra o resultado real de cada um via
// registrarLogUso, funcionalidade "diagnostico". É assim que o painel admin
// consegue mostrar com evidência real quais chaves estão vinculadas
// corretamente, em vez de só inferir pelo uso orgânico (onde o primeiro
// provedor da cascata que funciona sempre esconde o estado dos demais).
//
// Só a conta de admin deveria chamar isso (botão "Testar provedores" em
// /admin.html) — não tem custo de negócio em rodar, só de tokens/tempo.

import { registrarLogUso } from "../_shared/logUsoIA.ts";
import { PROVEDORES, type Provedor } from "../_shared/provedoresIA.ts";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MENSAGEM_TESTE = "Responda apenas com a palavra 'ok', nada mais.";

export interface ResultadoDiagnostico {
    provedor: string;
    modelo: string;
    sucesso: boolean;
    mensagemErro: string | null;
    tempoRespostaMs: number;
}

export async function testarProvedor(provedor: Provedor, apiKey: string | undefined): Promise<ResultadoDiagnostico> {
    const inicio = Date.now();

    if (!apiKey) {
        return {
            provedor: provedor.nome,
            modelo: provedor.modelo,
            sucesso: false,
            mensagemErro: `${provedor.envVar} não configurada`,
            tempoRespostaMs: 0,
        };
    }

    try {
        const resposta = await fetch(provedor.url, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: provedor.modelo,
                messages: [{ role: "user", content: MENSAGEM_TESTE }],
                max_tokens: 40,
            }),
        });

        const tempoRespostaMs = Date.now() - inicio;

        if (!resposta.ok) {
            const detalhe = await resposta.text();
            return { provedor: provedor.nome, modelo: provedor.modelo, sucesso: false, mensagemErro: `status ${resposta.status}: ${detalhe.slice(0, 300)}`, tempoRespostaMs };
        }

        const dados = await resposta.json();
        const texto = dados.choices?.[0]?.message?.content;
        if (!texto) {
            return { provedor: provedor.nome, modelo: provedor.modelo, sucesso: false, mensagemErro: "resposta sem conteúdo", tempoRespostaMs };
        }

        return { provedor: provedor.nome, modelo: provedor.modelo, sucesso: true, mensagemErro: null, tempoRespostaMs };
    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : String(erro);
        return { provedor: provedor.nome, modelo: provedor.modelo, sucesso: false, mensagemErro: mensagem, tempoRespostaMs: Date.now() - inicio };
    }
}

export async function testarTodosProvedores(
    obterEnv: (nome: string) => string | undefined = (nome) => Deno.env.get(nome),
): Promise<ResultadoDiagnostico[]> {
    const resultados = await Promise.all(PROVEDORES.map((provedor) => testarProvedor(provedor, obterEnv(provedor.envVar))));

    await Promise.all(
        resultados.map((r) =>
            registrarLogUso({
                provedor: r.provedor,
                modelo: r.modelo,
                funcionalidade: "diagnostico",
                sucesso: r.sucesso,
                erroMensagem: r.mensagemErro,
                tempoRespostaMs: r.tempoRespostaMs,
            }),
        ),
    );

    return resultados;
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

    const resultados = await testarTodosProvedores();

    return new Response(JSON.stringify({ resultados }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
});
