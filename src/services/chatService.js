import { supabase } from "./supabaseClient.js";
import { traduzErroSupabase } from "./erroAmigavel.js";

const TABELA_CONVERSAS = "conversas_chat";
const TABELA_MENSAGENS = "mensagens_chat";
const TAMANHO_MAXIMO_TITULO = 40;

/** Gera o título automático de uma conversa a partir da primeira mensagem (máx 40 caracteres). */
export function gerarTituloConversa(mensagem) {
    const texto = (mensagem ?? "").trim().replace(/\s+/g, " ");
    if (!texto) return "Nova conversa";
    if (texto.length <= TAMANHO_MAXIMO_TITULO) return texto;
    return `${texto.slice(0, TAMANHO_MAXIMO_TITULO - 1).trimEnd()}…`;
}

/** Formata um timestamp ISO como data/hora relativa em português ("há 2 horas", "ontem", "há 3 dias"). */
export function formatarTimestampRelativo(dataIso, agora = new Date()) {
    if (!dataIso) return "";

    const data = new Date(dataIso);
    const referencia = new Date(agora);
    const diffMs = referencia.getTime() - data.getTime();
    const diffMin = Math.round(diffMs / (60 * 1000));

    if (diffMin < 1) return "agora mesmo";
    if (diffMin < 60) return `há ${diffMin} minuto${diffMin === 1 ? "" : "s"}`;

    const diffHoras = Math.round(diffMin / 60);
    if (diffHoras < 24) return `há ${diffHoras} hora${diffHoras === 1 ? "" : "s"}`;

    const inicioReferencia = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate());
    const inicioData = new Date(data.getFullYear(), data.getMonth(), data.getDate());
    const diffDias = Math.round((inicioReferencia.getTime() - inicioData.getTime()) / (24 * 60 * 60 * 1000));

    if (diffDias <= 0) return "hoje";
    if (diffDias === 1) return "ontem";
    if (diffDias < 30) return `há ${diffDias} dias`;

    const diffMeses = Math.round(diffDias / 30);
    if (diffMeses < 12) return `há ${diffMeses} mes${diffMeses === 1 ? "" : "es"}`;

    const diffAnos = Math.round(diffMeses / 12);
    return `há ${diffAnos} ano${diffAnos === 1 ? "" : "s"}`;
}

/** Estimativa simples de tokens (~1 token a cada 4 caracteres). */
export function estimarTokens(texto) {
    if (!texto) return 0;
    return Math.ceil(texto.length / 4);
}

export async function listarConversas(usuarioId) {
    const { data, error } = await supabase
        .from(TABELA_CONVERSAS)
        .select()
        .eq("usuario_id", usuarioId)
        .order("atualizado_em", { ascending: false });

    if (error) throw new Error(traduzErroSupabase(error));
    return data;
}

export async function criarConversa(usuarioId, primeiraMsg) {
    const { data, error } = await supabase
        .from(TABELA_CONVERSAS)
        .insert({ usuario_id: usuarioId, titulo: gerarTituloConversa(primeiraMsg) })
        .select()
        .single();

    if (error) throw new Error(traduzErroSupabase(error));
    return data;
}

export async function buscarMensagens(conversaId) {
    const { data, error } = await supabase
        .from(TABELA_MENSAGENS)
        .select()
        .eq("conversa_id", conversaId)
        .order("criado_em", { ascending: true });

    if (error) throw new Error(traduzErroSupabase(error));
    return data;
}

export async function salvarMensagem(conversaId, role, conteudo) {
    const { data, error } = await supabase
        .from(TABELA_MENSAGENS)
        .insert({ conversa_id: conversaId, role, conteudo })
        .select()
        .single();

    if (error) throw new Error(traduzErroSupabase(error));

    await supabase
        .from(TABELA_CONVERSAS)
        .update({ atualizado_em: new Date().toISOString() })
        .eq("id", conversaId);

    return data;
}

export async function atualizarTituloConversa(conversaId, titulo) {
    const { data, error } = await supabase
        .from(TABELA_CONVERSAS)
        .update({ titulo })
        .eq("id", conversaId)
        .select()
        .single();

    if (error) throw new Error(traduzErroSupabase(error));
    return data;
}

export async function atualizarMateriaConversa(conversaId, materia) {
    const { data, error } = await supabase
        .from(TABELA_CONVERSAS)
        .update({ materia })
        .eq("id", conversaId)
        .select()
        .single();

    if (error) throw new Error(traduzErroSupabase(error));
    return data;
}

export async function excluirConversa(conversaId) {
    const { error } = await supabase.from(TABELA_CONVERSAS).delete().eq("id", conversaId);
    if (error) throw new Error(traduzErroSupabase(error));
}

export async function limparMensagensConversa(conversaId) {
    const { error } = await supabase.from(TABELA_MENSAGENS).delete().eq("conversa_id", conversaId);
    if (error) throw new Error(traduzErroSupabase(error));
}

/** Chama a Edge Function chat-medistudy (Dra. Mah) com a mensagem e o histórico da conversa. */
export async function gerarResposta(mensagem, historico = []) {
    const { data, error } = await supabase.functions.invoke("chat-medistudy", {
        body: { mensagem, historico },
    });

    if (error) throw new Error(traduzErroSupabase(error));
    if (data?.erro) throw new Error(data.erro);

    return data.resposta;
}
