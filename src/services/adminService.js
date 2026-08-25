const UM_DIA_MS = 24 * 60 * 60 * 1000;

// Todos os provedores que alguma Edge Function do MediStudy pode chamar —
// usado pra sempre listar os 8 no painel admin, mesmo os que não tiveram
// nenhuma chamada nas últimas 24h (ver PROVEDORES em
// supabase/functions/chat-medistudy/index.ts, a cascata de fallback;
// gerar-caso-clinico usa só "Groq", já incluído aqui).
export const PROVEDORES_CONHECIDOS = ["Groq", "Gemini", "Cerebras", "OpenRouter", "Mistral", "SambaNova", "DeepSeek", "HuggingFace"];

/** Agrupa linhas de log_uso_ia por provedor: total de chamadas, taxa de sucesso (%), tokens e última chamada. */
export function agruparUsoPorProvedor(linhas) {
    const porProvedor = new Map();

    for (const linha of linhas) {
        const atual = porProvedor.get(linha.provedor) ?? {
            provedor: linha.provedor,
            total: 0,
            sucessos: 0,
            tokensInput: 0,
            tokensOutput: 0,
            ultimaChamada: null,
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

/**
 * Garante que todo provedor de `listaCompleta` apareça no resultado, mesmo
 * sem nenhuma chamada registrada (status "sem dados" em vez de simplesmente
 * sumir do painel). Provedores com dados vêm primeiro (já ordenados por
 * volume), os sem dados ficam no fim, em ordem alfabética.
 */
export function completarProvedoresSemDados(dadosAgrupados, listaCompleta) {
    const jaPresentes = new Set(dadosAgrupados.map((p) => p.provedor));
    const semDados = listaCompleta
        .filter((nome) => !jaPresentes.has(nome))
        .sort((a, b) => a.localeCompare(b))
        .map((provedor) => ({
            provedor,
            total: 0,
            erros: 0,
            taxaSucesso: null,
            tokensInput: 0,
            tokensOutput: 0,
            ultimaChamada: null,
        }));

    return [...dadosAgrupados, ...semDados];
}

/** Agrupa linhas de log_uso_ia por dia (YYYY-MM-DD local): total de chamadas e total de erros. */
export function agruparChamadasPorDia(linhas) {
    const porDia = new Map();

    for (const linha of linhas) {
        const dia = new Date(linha.criado_em).toISOString().slice(0, 10);
        const atual = porDia.get(dia) ?? { dia, total: 0, erros: 0 };
        atual.total += 1;
        if (!linha.sucesso) atual.erros += 1;
        porDia.set(dia, atual);
    }

    return [...porDia.values()].sort((a, b) => a.dia.localeCompare(b.dia));
}

export async function buscarUsoPorProvedor(client) {
    const desde = new Date(Date.now() - UM_DIA_MS).toISOString();
    const { data, error } = await client
        .from("log_uso_ia")
        .select("provedor, sucesso, criado_em, tokens_input, tokens_output")
        .gte("criado_em", desde);

    if (error) throw error;
    return completarProvedoresSemDados(agruparUsoPorProvedor(data ?? []), PROVEDORES_CONHECIDOS);
}

export async function buscarChamadasPorDia(client) {
    const desde = new Date(Date.now() - 7 * UM_DIA_MS).toISOString();
    const { data, error } = await client
        .from("log_uso_ia")
        .select("sucesso, criado_em")
        .gte("criado_em", desde);

    if (error) throw error;
    return agruparChamadasPorDia(data ?? []);
}

export async function buscarUltimosErros(client, limite = 20) {
    const { data, error } = await client
        .from("log_uso_ia")
        .select("provedor, funcionalidade, erro_mensagem, criado_em")
        .eq("sucesso", false)
        .order("criado_em", { ascending: false })
        .limit(limite);

    if (error) throw error;
    return data ?? [];
}

/** Conta quantas linhas de `linhas` pertencem a cada usuario_id (chave passada em `coluna`). */
export function contarPorUsuario(linhas, coluna) {
    const contagem = new Map();
    for (const linha of linhas) {
        const id = linha[coluna];
        if (!id) continue;
        contagem.set(id, (contagem.get(id) ?? 0) + 1);
    }
    return contagem;
}

export async function buscarUsuarias(client) {
    const [{ data: usuarios, error: erroUsuarios }, mensagens, casos, flashcards] = await Promise.all([
        client.auth.admin.listUsers(),
        client.from("mensagens_chat").select("conversa_id, conversas_chat!inner(usuario_id)"),
        client.from("casos_clinicos").select("criado_por"),
        client.from("flashcards").select("user_id"),
    ]);

    if (erroUsuarios) throw erroUsuarios;
    if (mensagens.error) throw mensagens.error;
    if (casos.error) throw casos.error;
    if (flashcards.error) throw flashcards.error;

    const mensagensPorUsuario = contarPorUsuario(
        (mensagens.data ?? []).map((m) => ({ usuario_id: m.conversas_chat?.usuario_id })),
        "usuario_id",
    );
    const casosPorUsuario = contarPorUsuario(casos.data ?? [], "criado_por");
    const flashcardsPorUsuario = contarPorUsuario((flashcards.data ?? []).map((f) => ({ user_id: f.user_id })), "user_id");

    return (usuarios?.users ?? []).map((u) => ({
        id: u.id,
        email: u.email,
        totalMensagens: mensagensPorUsuario.get(u.id) ?? 0,
        totalCasos: casosPorUsuario.get(u.id) ?? 0,
        totalFlashcards: flashcardsPorUsuario.get(u.id) ?? 0,
        ultimoAcesso: u.last_sign_in_at,
    }));
}
