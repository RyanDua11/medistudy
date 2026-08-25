import { supabase } from "./supabaseClient.js";
import { obterIdUsuarioLogado } from "./authService.js";
import { calcularFSRS, RATING } from "./fsrs.js";
import { traduzErroSupabase } from "./erroAmigavel.js";
import { registrarErroEstudo } from "./diarioErrosService.js";

const TABELA_FLASHCARDS = "flashcards";
const TABELA_LOG_REVISOES = "log_revisoes";

export async function criarFlashcard(pergunta, resposta, materia = null, extras = {}) {
    const userId = await obterIdUsuarioLogado();

    const { data, error } = await supabase
        .from(TABELA_FLASHCARDS)
        .insert({ user_id: userId, pergunta, resposta, materia, ...extras })
        .select()
        .single();

    if (error) throw new Error(traduzErroSupabase(error));
    return data;
}

/**
 * Cria um flashcard básico e, se `gerarReverso` for true, também cria
 * automaticamente o card com pergunta/resposta invertidas (B→A), vinculado
 * pela mesma matéria/subtópico/detalhe e marcado com `eh_reverso`.
 */
export async function criarFlashcardComReverso(pergunta, resposta, materia = null, extras = {}) {
    const { gerarReverso, ...extrasCard } = extras;

    const cardPrincipal = await criarFlashcard(pergunta, resposta, materia, extrasCard);
    if (!gerarReverso) return { cardPrincipal, cardReverso: null };

    const cardReverso = await criarFlashcard(resposta, pergunta, materia, {
        ...extrasCard,
        eh_reverso: true,
    });

    return { cardPrincipal, cardReverso };
}

export async function listarFlashcards() {
    const { data, error } = await supabase
        .from(TABELA_FLASHCARDS)
        .select()
        .order("created_at", { ascending: false });

    if (error) throw new Error(traduzErroSupabase(error));
    return data;
}

export async function marcarRevisao(flashcard, rating) {
    const acertou = rating !== RATING.NAO_LEMBREI;
    const contadores = acertou
        ? { acertos: flashcard.acertos + 1, erros: flashcard.erros }
        : { acertos: flashcard.acertos, erros: flashcard.erros + 1 };

    const atualizacao = {
        ...contadores,
        ...calcularFSRS(flashcard, rating),
    };

    const { data, error } = await supabase
        .from(TABELA_FLASHCARDS)
        .update(atualizacao)
        .eq("id", flashcard.id)
        .select()
        .single();

    if (error) throw new Error(traduzErroSupabase(error));

    const userId = await obterIdUsuarioLogado();
    const { error: erroLog } = await supabase.from(TABELA_LOG_REVISOES).insert({
        flashcard_id: flashcard.id,
        usuario_id: userId,
        acertou,
        rating,
    });

    if (erroLog) throw new Error(traduzErroSupabase(erroLog));

    if (!acertou) {
        registrarErroEstudo({
            ferramenta: "flashcards",
            materia: flashcard.materia,
            topico: flashcard.subtopico ?? null,
            perguntaResumo: flashcard.pergunta,
            respostaCorreta: flashcard.resposta,
        });
    }

    return data;
}

export async function listarLogRevisoes() {
    const { data, error } = await supabase
        .from(TABELA_LOG_REVISOES)
        .select()
        .order("revisado_em", { ascending: false });

    if (error) throw new Error(traduzErroSupabase(error));
    return data;
}

export async function removerFlashcard(id) {
    const { error } = await supabase.from(TABELA_FLASHCARDS).delete().eq("id", id);
    if (error) throw new Error(traduzErroSupabase(error));
}
