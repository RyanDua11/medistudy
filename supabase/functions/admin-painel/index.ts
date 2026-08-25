// Edge Function: dados do painel admin (/admin.html) — roda server-side com
// a service role key, que NUNCA sai do backend. Substitui o client
// supabaseAdmin que existia direto no bundle do navegador (src/services/
// supabaseAdminClient.js): aquilo expunha VITE_SUPABASE_SERVICE_KEY no
// JavaScript entregue ao browser, o que (a) quebrava em produção sempre que
// essa env var não estava configurada no Vercel ("supabaseKey is required")
// e (b) bypassa RLS por completo pra qualquer pessoa que inspecionasse o
// bundle. Ver issue de correção.
//
// Autorização: o Supabase já valida o JWT do chamador antes de invocar esta
// function (verify_jwt, padrão do projeto) — só extrai o `sub` (user id) do
// token pra conferir contra ADMIN_USER_ID. Sem isso, qualquer usuária
// logada conseguiria ver dados de todo mundo.

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// mesmo id hardcoded usado em adminPage.js, usuarioMenu.js e na policy RLS
// de log_uso_ia — sem sistema de roles ainda.
const ADMIN_USER_ID = "efe4e863-0ea1-4a0f-9656-f58e6f81d60d";

const UM_DIA_MS = 24 * 60 * 60 * 1000;
const PROVEDORES_CONHECIDOS = ["Groq", "Gemini", "Cerebras", "OpenRouter", "Mistral", "SambaNova", "DeepSeek", "HuggingFace", "NVIDIA"];

interface LinhaLogUso {
    provedor: string;
    sucesso: boolean;
    criado_em: string;
    tokens_input: number | null;
    tokens_output: number | null;
}

/** Extrai o `sub` (user id) de um JWT sem validar assinatura — seguro aqui porque o Supabase já validou o token antes de invocar a function (verify_jwt). */
export function idUsuarioDoJwt(authHeader: string | null): string | null {
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7);
    const partes = token.split(".");
    if (partes.length !== 3) return null;

    try {
        const payloadBase64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
        const payloadJson = atob(payloadBase64.padEnd(payloadBase64.length + ((4 - (payloadBase64.length % 4)) % 4), "="));
        const payload = JSON.parse(payloadJson);
        return typeof payload.sub === "string" ? payload.sub : null;
    } catch {
        return null;
    }
}

export function agruparUsoPorProvedor(linhas: LinhaLogUso[]) {
    const porProvedor = new Map<string, { provedor: string; total: number; sucessos: number; tokensInput: number; tokensOutput: number; ultimaChamada: string | null }>();

    for (const linha of linhas) {
        const atual = porProvedor.get(linha.provedor) ?? {
            provedor: linha.provedor,
            total: 0,
            sucessos: 0,
            tokensInput: 0,
            tokensOutput: 0,
            ultimaChamada: null as string | null,
        };
        atual.total += 1;
        if (linha.sucesso) atual.sucessos += 1;
        atual.tokensInput += linha.tokens_input ?? 0;
        atual.tokensOutput += linha.tokens_output ?? 0;
        if (!atual.ultimaChamada || linha.criado_em > atual.ultimaChamada) atual.ultimaChamada = linha.criado_em;
        porProvedor.set(linha.provedor, atual);
    }

    return [...porProvedor.values()]
        .map((p) => ({
            provedor: p.provedor,
            total: p.total,
            erros: p.total - p.sucessos,
            taxaSucesso: p.total === 0 ? 0 : Math.round((p.sucessos / p.total) * 100),
            tokensInput: p.tokensInput,
            tokensOutput: p.tokensOutput,
            ultimaChamada: p.ultimaChamada,
        }))
        .sort((a, b) => b.total - a.total);
}

export function completarProvedoresSemDados(dadosAgrupados: ReturnType<typeof agruparUsoPorProvedor>, listaCompleta: string[]) {
    const jaPresentes = new Set(dadosAgrupados.map((p) => p.provedor));
    const semDados = listaCompleta
        .filter((nome) => !jaPresentes.has(nome))
        .sort((a, b) => a.localeCompare(b))
        .map((provedor) => ({
            provedor,
            total: 0,
            erros: 0,
            taxaSucesso: null as number | null,
            tokensInput: 0,
            tokensOutput: 0,
            ultimaChamada: null as string | null,
        }));

    return [...dadosAgrupados, ...semDados];
}

export function agruparChamadasPorDia(linhas: { sucesso: boolean; criado_em: string }[]) {
    const porDia = new Map<string, { dia: string; total: number; erros: number }>();

    for (const linha of linhas) {
        const dia = new Date(linha.criado_em).toISOString().slice(0, 10);
        const atual = porDia.get(dia) ?? { dia, total: 0, erros: 0 };
        atual.total += 1;
        if (!linha.sucesso) atual.erros += 1;
        porDia.set(dia, atual);
    }

    return [...porDia.values()].sort((a, b) => a.dia.localeCompare(b.dia));
}

export function contarPorUsuario(linhas: Record<string, unknown>[], coluna: string) {
    const contagem = new Map<string, number>();
    for (const linha of linhas) {
        const id = linha[coluna];
        if (!id || typeof id !== "string") continue;
        contagem.set(id, (contagem.get(id) ?? 0) + 1);
    }
    return contagem;
}

async function consultarRest(supabaseUrl: string, chaveServico: string, caminho: string) {
    const resposta = await fetch(`${supabaseUrl}/rest/v1/${caminho}`, {
        headers: { apikey: chaveServico, Authorization: `Bearer ${chaveServico}` },
    });
    if (!resposta.ok) throw new Error(`Falha ao consultar ${caminho} (status ${resposta.status}): ${await resposta.text()}`);
    return resposta.json();
}

async function listarUsuarios(supabaseUrl: string, chaveServico: string) {
    const resposta = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        headers: { apikey: chaveServico, Authorization: `Bearer ${chaveServico}` },
    });
    if (!resposta.ok) throw new Error(`Falha ao listar usuárias (status ${resposta.status}): ${await resposta.text()}`);
    const dados = await resposta.json();
    return Array.isArray(dados) ? dados : (dados.users ?? []);
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

    const usuarioId = idUsuarioDoJwt(req.headers.get("Authorization"));
    if (usuarioId !== ADMIN_USER_ID) {
        return new Response(JSON.stringify({ erro: "Acesso negado" }), {
            status: 403,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const chaveServico = Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !chaveServico) {
        return new Response(JSON.stringify({ erro: "SUPABASE_URL/SUPABASE_SECRET_KEY não configurados no projeto" }), {
            status: 500,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
    }

    try {
        const desde24h = new Date(Date.now() - UM_DIA_MS).toISOString();
        const desde7d = new Date(Date.now() - 7 * UM_DIA_MS).toISOString();

        const [logsUso24h, logsUso7d, ultimosErros, usuarios, mensagens, casos, flashcards] = await Promise.all([
            consultarRest(supabaseUrl, chaveServico, `log_uso_ia?select=provedor,sucesso,criado_em,tokens_input,tokens_output&criado_em=gte.${desde24h}`),
            consultarRest(supabaseUrl, chaveServico, `log_uso_ia?select=sucesso,criado_em&criado_em=gte.${desde7d}`),
            consultarRest(supabaseUrl, chaveServico, `log_uso_ia?select=provedor,funcionalidade,erro_mensagem,criado_em&sucesso=eq.false&order=criado_em.desc&limit=20`),
            listarUsuarios(supabaseUrl, chaveServico),
            consultarRest(supabaseUrl, chaveServico, `mensagens_chat?select=conversa_id,conversas_chat!inner(usuario_id)`),
            consultarRest(supabaseUrl, chaveServico, `casos_clinicos?select=criado_por`),
            consultarRest(supabaseUrl, chaveServico, `flashcards?select=user_id`),
        ]);

        const usoPorProvedor = completarProvedoresSemDados(agruparUsoPorProvedor(logsUso24h ?? []), PROVEDORES_CONHECIDOS);
        const chamadasPorDia = agruparChamadasPorDia(logsUso7d ?? []);

        const mensagensPorUsuario = contarPorUsuario(
            (mensagens ?? []).map((m: Record<string, unknown>) => ({ usuario_id: (m.conversas_chat as Record<string, unknown>)?.usuario_id })),
            "usuario_id",
        );
        const casosPorUsuario = contarPorUsuario(casos ?? [], "criado_por");
        const flashcardsPorUsuario = contarPorUsuario(flashcards ?? [], "user_id");

        const usuariasFormatadas = (usuarios ?? []).map((u: Record<string, unknown>) => ({
            id: u.id,
            email: u.email,
            totalMensagens: mensagensPorUsuario.get(u.id as string) ?? 0,
            totalCasos: casosPorUsuario.get(u.id as string) ?? 0,
            totalFlashcards: flashcardsPorUsuario.get(u.id as string) ?? 0,
            ultimoAcesso: u.last_sign_in_at,
        }));

        return new Response(
            JSON.stringify({ usoPorProvedor, chamadasPorDia, usuarias: usuariasFormatadas, ultimosErros: ultimosErros ?? [] }),
            { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
        );
    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : String(erro);
        return new Response(JSON.stringify({ erro: mensagem }), {
            status: 502,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
    }
});
