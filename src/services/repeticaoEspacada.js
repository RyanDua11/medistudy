const FATOR_FACILIDADE_PADRAO = 2.5;
const FATOR_FACILIDADE_MINIMO = 1.3;
const FATOR_FACILIDADE_MAXIMO = 2.8;
const INCREMENTO_FATOR_ACERTO = 0.1;
const DECREMENTO_FATOR_ERRO = 0.2;
const INTERVALO_DIAS_PADRAO = 1;
const UM_DIA_MS = 24 * 60 * 60 * 1000;

export function calcularRepeticaoEspacada(flashcard, acertou) {
    const intervaloAtual = flashcard.intervalo_dias ?? INTERVALO_DIAS_PADRAO;
    const fatorAtual = flashcard.fator_facilidade ?? FATOR_FACILIDADE_PADRAO;

    const intervaloDias = acertou
        ? Math.max(1, Math.ceil(intervaloAtual * fatorAtual))
        : 1;

    const fatorFacilidade = acertou
        ? Math.min(FATOR_FACILIDADE_MAXIMO, fatorAtual + INCREMENTO_FATOR_ACERTO)
        : Math.max(FATOR_FACILIDADE_MINIMO, fatorAtual - DECREMENTO_FATOR_ERRO);

    const proximaRevisao = new Date(Date.now() + intervaloDias * UM_DIA_MS).toISOString();

    return {
        intervalo_dias: intervaloDias,
        fator_facilidade: fatorFacilidade,
        proxima_revisao: proximaRevisao,
    };
}
