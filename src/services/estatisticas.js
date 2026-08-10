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

function paraDataOrdenavel(timestamp) {
    return new Date(timestamp).toISOString().slice(0, 10);
}

export function agruparNotasPorMateria(notas) {
    const porMateria = new Map();

    [...notas]
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .forEach((nota) => {
            if (!porMateria.has(nota.materia)) porMateria.set(nota.materia, []);
            porMateria.get(nota.materia).push({ data: paraDataOrdenavel(nota.created_at), nota: nota.nota });
        });

    return [...porMateria.entries()].map(([materia, pontos]) => ({ materia, pontos }));
}

export function calcularFlashcardsCriadosAcumulados(flashcards) {
    const porData = new Map();

    [...flashcards]
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .forEach((flashcard) => {
            const data = paraDataOrdenavel(flashcard.created_at);
            porData.set(data, (porData.get(data) ?? 0) + 1);
        });

    let acumulado = 0;
    return [...porData.entries()].map(([data, quantidade]) => {
        acumulado += quantidade;
        return { data, total: acumulado };
    });
}
