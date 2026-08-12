import { supabase } from "./supabaseClient.js";
import { obterIdUsuarioLogado } from "./authService.js";
import { traduzErroSupabase } from "./erroAmigavel.js";

const TABELA_PROVAS = "provas";

export async function criarProva(materia, data, notaNecessaria = null) {
    const userId = await obterIdUsuarioLogado();

    const { data: provaCriada, error } = await supabase
        .from(TABELA_PROVAS)
        .insert({ user_id: userId, materia, data, nota_necessaria: notaNecessaria })
        .select()
        .single();

    if (error) throw new Error(traduzErroSupabase(error));
    return provaCriada;
}

export async function listarProvas() {
    const { data, error } = await supabase
        .from(TABELA_PROVAS)
        .select()
        .order("data", { ascending: true });

    if (error) throw new Error(traduzErroSupabase(error));
    return data;
}

export async function editarProva(id, alteracoes) {
    const { data, error } = await supabase
        .from(TABELA_PROVAS)
        .update(alteracoes)
        .eq("id", id)
        .select()
        .single();

    if (error) throw new Error(traduzErroSupabase(error));
    return data;
}

export async function removerProva(id) {
    const { error } = await supabase.from(TABELA_PROVAS).delete().eq("id", id);
    if (error) throw new Error(traduzErroSupabase(error));
}
