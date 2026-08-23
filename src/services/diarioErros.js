// Diário de erros: identifica flashcards que são "pontos fracos" — errados
// (rating "Não lembrei") 3 ou mais vezes numa janela recente.

import { RATING } from "./fsrs.js";

const JANELA_DIAS_PADRAO = 30;
const LIMITE_ERROS_PADRAO = 3;
const UM_DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Cruza flashcards com o log de revisões e identifica os "pontos fracos":
 * cards com `limiteErros` ou mais notas "Não lembrei" dentro dos últimos
 * `janelaDias` dias. Retorna cada flashcard acompanhado de `vezesErrado`
 * (contagem na janela) e `ultimoErroEm` (data do erro mais recente),
 * ordenados do mais errado para o menos errado.
 */
export function identificarPontosFracos(
    flashcards,
    logs,
    { janelaDias = JANELA_DIAS_PADRAO, limiteErros = LIMITE_ERROS_PADRAO, agora = new Date() } = {}
) {
    const limiteData = agora.getTime() - janelaDias * UM_DIA_MS;

    const errosPorFlashcard = new Map();
    logs.forEach((log) => {
        if (log.rating !== RATING.NAO_LEMBREI) return;
        if (new Date(log.revisado_em).getTime() < limiteData) return;

        const atual = errosPorFlashcard.get(log.flashcard_id) ?? { vezesErrado: 0, ultimoErroEm: null };
        atual.vezesErrado += 1;
        if (!atual.ultimoErroEm || new Date(log.revisado_em) > new Date(atual.ultimoErroEm)) {
            atual.ultimoErroEm = log.revisado_em;
        }
        errosPorFlashcard.set(log.flashcard_id, atual);
    });

    return flashcards
        .filter((flashcard) => (errosPorFlashcard.get(flashcard.id)?.vezesErrado ?? 0) >= limiteErros)
        .map((flashcard) => ({ ...flashcard, ...errosPorFlashcard.get(flashcard.id) }))
        .sort((a, b) => b.vezesErrado - a.vezesErrado);
}
