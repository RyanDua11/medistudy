const SETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;
const UM_DIA_MS = 24 * 60 * 60 * 1000;

// Fator de facilidade parte de 2.5 (repeticaoEspacada.js) e só sobe com acertos
// consecutivos; >= 2.5 significa que o card nunca caiu abaixo do padrão inicial,
// um proxy melhor de domínio consolidado do que intervalo_dias (que cresce
// multiplicativamente e infla rápido demais para servir de limiar).
const LIMIAR_FATOR_FACILIDADE_APRENDIDO = 2.5;

function chaveDiaLocal(data) {
    const d = new Date(data);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

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

export function calcularStreakDias(logs) {
    if (logs.length === 0) return 0;

    const diasComRevisao = new Set(logs.map((log) => chaveDiaLocal(log.revisado_em)));

    const hoje = new Date();
    const ontem = new Date(hoje.getTime() - UM_DIA_MS);

    const revisouHoje = diasComRevisao.has(chaveDiaLocal(hoje));
    const revisouOntem = diasComRevisao.has(chaveDiaLocal(ontem));

    if (!revisouHoje && !revisouOntem) return 0;

    let cursor = revisouHoje ? hoje : ontem;
    let streak = 0;

    while (diasComRevisao.has(chaveDiaLocal(cursor))) {
        streak++;
        cursor = new Date(cursor.getTime() - UM_DIA_MS);
    }

    return streak;
}

export function calcularRevisadosHoje(logs) {
    const chaveHoje = chaveDiaLocal(new Date());
    return logs.filter((log) => chaveDiaLocal(log.revisado_em) === chaveHoje).length;
}

export function categorizarFlashcards(flashcards, logs) {
    const idsComLog = new Set(logs.map((log) => log.flashcard_id));
    const agora = Date.now();

    const novos = flashcards.filter((f) => !idsComLog.has(f.id));
    const revisar = flashcards.filter(
        (f) => idsComLog.has(f.id) && new Date(f.proxima_revisao).getTime() <= agora
    );
    const aprendidos = flashcards.filter(
        (f) => idsComLog.has(f.id) && f.fator_facilidade >= LIMIAR_FATOR_FACILIDADE_APRENDIDO
    );

    return { novos, revisar, aprendidos };
}

// Progresso geral = proporção de flashcards "Aprendidos" (fator_facilidade >= 2.5,
// ver categorizarFlashcards) sobre o total de flashcards, em porcentagem inteira.
export function calcularProgressoGeral(flashcards, logs) {
    if (flashcards.length === 0) return 0;

    const { aprendidos } = categorizarFlashcards(flashcards, logs);
    return Math.round((aprendidos.length / flashcards.length) * 100);
}

export function calcularCasosResolvidos(logsResolucoesCasos) {
    return new Set(logsResolucoesCasos.map((log) => log.caso_clinico_id)).size;
}

export function calcularTaxaAcertoCasos(logsResolucoesCasos) {
    if (logsResolucoesCasos.length === 0) return 0;

    const acertos = logsResolucoesCasos.filter((log) => log.acertou).length;
    return Math.round((acertos / logsResolucoesCasos.length) * 100);
}

export function calcularMateriasComNotas(notas) {
    return new Set(notas.map((nota) => nota.materia)).size;
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
