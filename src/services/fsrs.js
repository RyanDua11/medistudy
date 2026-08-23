// Implementação do algoritmo FSRS-5 (Free Spaced Repetition Scheduler).
// Referência: https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm

export const RATING = {
    NAO_LEMBREI: 1,
    DIFICIL: 2,
    BOM: 3,
    FACIL: 4,
};

export const ESTADO = {
    NOVO: "novo",
    APRENDIZADO: "aprendizado",
    REVISAO: "revisao",
    REAPRENDIZADO: "reaprendizado",
};

// Pesos padrão do FSRS-5 (w0..w18), publicados pelo projeto open-spaced-repetition.
const PESOS = [
    0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234, 1.616,
    0.1544, 1.0824, 1.9813, 0.0953, 0.2975, 2.2042, 0.2407, 2.9466, 0.5034, 0.6567,
];

const RETENCAO_ALVO_PADRAO = 0.9;
const DECAY = -0.5;
const FATOR = 0.9 ** (1 / DECAY) - 1;
const DIFICULDADE_MINIMA = 1;
const DIFICULDADE_MAXIMA = 10;
const ESTABILIDADE_MINIMA = 0.01;
const INTERVALO_MAXIMO_DIAS = 36500;
const UM_DIA_MS = 24 * 60 * 60 * 1000;

function clamp(valor, minimo, maximo) {
    return Math.min(maximo, Math.max(minimo, valor));
}

function estabilidadeInicial(rating) {
    return Math.max(ESTABILIDADE_MINIMA, PESOS[rating - 1]);
}

function dificuldadeInicial(rating) {
    return clamp(PESOS[4] - Math.exp(PESOS[5] * (rating - 1)) + 1, DIFICULDADE_MINIMA, DIFICULDADE_MAXIMA);
}

function dificuldadeAlvoFacil() {
    return dificuldadeInicial(RATING.FACIL);
}

function proximaDificuldade(dificuldade, rating) {
    const reversaoParaMedia = PESOS[7] * dificuldadeAlvoFacil() + (1 - PESOS[7]) * (dificuldade - PESOS[6] * (rating - 3));
    return clamp(reversaoParaMedia, DIFICULDADE_MINIMA, DIFICULDADE_MAXIMA);
}

function retrabilidade(diasDecorridos, estabilidade) {
    return (1 + (FATOR * diasDecorridos) / estabilidade) ** DECAY;
}

function proximaEstabilidadeAposAcerto(dificuldade, estabilidade, retrabilidadeAtual, rating) {
    const bonusDificil = rating === RATING.DIFICIL ? PESOS[15] : 1;
    const bonusFacil = rating === RATING.FACIL ? PESOS[16] : 1;

    const fator =
        Math.exp(PESOS[8]) *
        (11 - dificuldade) *
        estabilidade ** -PESOS[9] *
        (Math.exp((1 - retrabilidadeAtual) * PESOS[10]) - 1) *
        bonusDificil *
        bonusFacil;

    return Math.max(ESTABILIDADE_MINIMA, estabilidade * (1 + fator));
}

function proximaEstabilidadeAposErro(dificuldade, estabilidade, retrabilidadeAtual) {
    const valor =
        PESOS[11] *
        dificuldade ** -PESOS[12] *
        ((estabilidade + 1) ** PESOS[13] - 1) *
        Math.exp((1 - retrabilidadeAtual) * PESOS[14]);

    return Math.max(ESTABILIDADE_MINIMA, valor);
}

function intervaloEmDias(estabilidade, retencaoAlvo) {
    const intervalo = (estabilidade / FATOR) * (retencaoAlvo ** (1 / DECAY) - 1);
    return clamp(Math.round(intervalo), 1, INTERVALO_MAXIMO_DIAS);
}

function calcularDiasDecorridos(ultimaRevisao, agora) {
    if (!ultimaRevisao) return 0;
    const diferencaMs = agora.getTime() - new Date(ultimaRevisao).getTime();
    return Math.max(0, diferencaMs / UM_DIA_MS);
}

function calcularEstadoResultante(rating) {
    return rating === RATING.NAO_LEMBREI ? ESTADO.REAPRENDIZADO : ESTADO.REVISAO;
}

/**
 * Calcula o novo estado de um flashcard após uma revisão com FSRS-5.
 * "Não lembrei" sempre reagenda para hoje; as demais notas calculam um
 * novo intervalo a partir da dificuldade e estabilidade acumuladas.
 */
export function calcularFSRS(flashcard, rating, agora = new Date(), retencaoAlvo = RETENCAO_ALVO_PADRAO) {
    const jaRevisado = flashcard.estabilidade != null && flashcard.dificuldade != null;

    let dificuldade;
    let estabilidade;

    if (!jaRevisado) {
        dificuldade = dificuldadeInicial(rating);
        estabilidade = estabilidadeInicial(rating);
    } else {
        const diasDecorridos = calcularDiasDecorridos(flashcard.ultima_revisao, agora);
        const retrabilidadeAtual = retrabilidade(diasDecorridos, flashcard.estabilidade);

        dificuldade = proximaDificuldade(flashcard.dificuldade, rating);
        estabilidade =
            rating === RATING.NAO_LEMBREI
                ? proximaEstabilidadeAposErro(flashcard.dificuldade, flashcard.estabilidade, retrabilidadeAtual)
                : proximaEstabilidadeAposAcerto(flashcard.dificuldade, flashcard.estabilidade, retrabilidadeAtual, rating);
    }

    const intervaloDias = rating === RATING.NAO_LEMBREI ? 0 : intervaloEmDias(estabilidade, retencaoAlvo);
    const proximaRevisao = new Date(agora.getTime() + intervaloDias * UM_DIA_MS).toISOString();

    return {
        dificuldade,
        estabilidade,
        estado: calcularEstadoResultante(rating),
        ultima_revisao: agora.toISOString(),
        proxima_revisao: proximaRevisao,
        intervalo_dias: intervaloDias,
    };
}

/**
 * Pré-visualiza, sem persistir nada, o intervalo (em dias) que cada uma das
 * 4 notas resultaria caso fosse escolhida agora. Usado para mostrar a
 * estimativa abaixo de cada botão de rating na sessão de revisão.
 */
export function preverIntervalosFSRS(flashcard, agora = new Date(), retencaoAlvo = RETENCAO_ALVO_PADRAO) {
    return Object.fromEntries(
        Object.values(RATING).map((rating) => [
            rating,
            calcularFSRS(flashcard, rating, agora, retencaoAlvo).intervalo_dias,
        ])
    );
}

/** Formata um intervalo em dias como texto curto para exibição na UI. */
export function formatarIntervaloFSRS(dias) {
    if (dias <= 0) return "Hoje";
    if (dias === 1) return "Em 1 dia";
    return `Em ${dias} dias`;
}
