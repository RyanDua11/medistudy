export const TELAS = Object.freeze({
    ESCOLHA: "escolha",
    REVISAO: "revisao",
    CRIACAO: "criacao",
    LISTA: "lista",
});

/**
 * Decide a tela inicial da página de flashcards a partir dos parâmetros da URL.
 * ?modo=revisaoRapida deve pular a tela de escolha e entrar direto na revisão.
 */
export function calcularTelaInicial(searchParams) {
    if (searchParams.get("modo") === "revisaoRapida") {
        return { tela: TELAS.REVISAO, iniciarRevisaoRapida: true };
    }
    return { tela: TELAS.ESCOLHA, iniciarRevisaoRapida: false };
}

/** Filtra flashcards pela matéria selecionada. Matéria vazia/nula retorna todos. */
export function filtrarFlashcardsPorMateria(flashcards, materia) {
    if (!materia) return flashcards;
    return flashcards.filter((flashcard) => flashcard.materia === materia);
}
