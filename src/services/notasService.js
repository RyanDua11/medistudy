import { supabase } from "./supabaseClient.js";
import { obterIdUsuarioLogado } from "./authService.js";

const TABELA_NOTAS = "notas";

export async function criarNota(materia, avaliacao, peso, nota) {
    const userId = await obterIdUsuarioLogado();

    const { data, error } = await supabase
        .from(TABELA_NOTAS)
        .insert({ user_id: userId, materia, avaliacao, peso, nota })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export async function listarNotas() {
    const { data, error } = await supabase.from(TABELA_NOTAS).select();
    if (error) throw new Error(error.message);
    return data;
}

export async function editarNota(id, alteracoes) {
    const { data, error } = await supabase
        .from(TABELA_NOTAS)
        .update(alteracoes)
        .eq("id", id)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export async function removerNota(id) {
    const { error } = await supabase.from(TABELA_NOTAS).delete().eq("id", id);
    if (error) throw new Error(error.message);
}
