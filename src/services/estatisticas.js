const SETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

export function calcularTaxaDeAcerto(flashcards) {
    const totalAcertos = flashcards.reduce((soma, f) => soma + f.acertos, 0);
    const totalRevisoes = flashcards.reduce((soma, f) => soma + f.acertos + f.erros, 0);

    if (totalRevisoes === 0) return 0;

    return Math.round((totalAcertos / totalRevisoes) * 100);
}

export function calcularRevisoesFeitas(flashcards) {
    return flashcards.reduce((soma, f) => soma + f.acertos + f.erros, 0);
}

export function calcularFlashcardsARevisar(flashcards) {
    const agora = Date.now();
    return flashcards.filter((f) => new Date(f.proxima_revisao).getTime() <= agora).length;
}

export function calcularProvasProximos7Dias(provas) {
    const agora = Date.now();
    const limite = agora + SETE_DIAS_MS;

    return provas.filter((p) => {
        const dataProva = new Date(p.data).getTime();
        return dataProva >= agora && dataProva <= limite;
    }).length;
}
