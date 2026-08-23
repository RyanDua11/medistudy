const TEMPO_REVISAO_RAPIDA_MS = 5 * 60 * 1000;
const TEMPO_MEDIO_POR_CARD_MS = 25 * 1000;

export function selecionarRevisaoRapida(flashcards, opcoes = {}) {
    const tempoDisponivelMs = opcoes.tempoDisponivelMs ?? TEMPO_REVISAO_RAPIDA_MS;
    const tempoPorCardMs = opcoes.tempoPorCardMs ?? TEMPO_MEDIO_POR_CARD_MS;
    const limiteCards = Math.floor(tempoDisponivelMs / tempoPorCardMs);
    const agora = Date.now();

    return flashcards
        .filter((flashcard) => new Date(flashcard.proxima_revisao).getTime() <= agora)
        .sort((a, b) => new Date(a.proxima_revisao) - new Date(b.proxima_revisao))
        .slice(0, limiteCards);
}

export function selecionarVesperaDeProva(flashcards, materia) {
    return flashcards
        .filter((flashcard) => flashcard.materia === materia)
        .sort((a, b) => (b.dificuldade ?? 0) - (a.dificuldade ?? 0));
}
