import { supabase } from "./supabaseClient.js";
import { calcularRepeticaoEspacada } from "./repeticaoEspacada.js";

const TABELA_FLASHCARDS = "flashcards";

async function obterIdUsuarioLogado() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw new Error(error.message);
    return data.user.id;
}

export async function criarFlashcard(pergunta, resposta, materia = null) {
    const userId = await obterIdUsuarioLogado();

    const { data, error } = await supabase
        .from(TABELA_FLASHCARDS)
        .insert({ user_id: userId, pergunta, resposta, materia })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export async function listarFlashcards() {
    const { data, error } = await supabase
        .from(TABELA_FLASHCARDS)
        .select()
        .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data;
}

export async function marcarRevisao(flashcard, acertou) {
    const contadores = acertou
        ? { acertos: flashcard.acertos + 1, erros: flashcard.erros }
        : { acertos: flashcard.acertos, erros: flashcard.erros + 1 };

    const atualizacao = {
        ...contadores,
        ...calcularRepeticaoEspacada(flashcard, acertou),
    };

    const { data, error } = await supabase
        .from(TABELA_FLASHCARDS)
        .update(atualizacao)
        .eq("id", flashcard.id)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export async function removerFlashcard(id) {
    const { error } = await supabase.from(TABELA_FLASHCARDS).delete().eq("id", id);
    if (error) throw new Error(error.message);
}
