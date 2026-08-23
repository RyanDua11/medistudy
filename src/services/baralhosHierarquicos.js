// Navegação hierárquica de baralhos: Matéria > Subtópico > Detalhe.
// A hierarquia é derivada dos próprios flashcards (não existe tabela de
// matérias/subtópicos separada) — cada nível lista os valores distintos
// encontrados nos flashcards já filtrados pelo nível anterior.

function contarPorChave(flashcards, chave) {
    const contagem = new Map();
    flashcards.forEach((flashcard) => {
        const valor = flashcard[chave];
        if (!valor) return;
        contagem.set(valor, (contagem.get(valor) ?? 0) + 1);
    });
    return [...contagem.entries()]
        .map(([valor, total]) => ({ valor, total }))
        .sort((a, b) => a.valor.localeCompare(b.valor, "pt-BR"));
}

/** Nível 1: matérias distintas com pelo menos um flashcard, com a contagem de cards. */
export function listarMaterias(flashcards) {
    return contarPorChave(flashcards, "materia");
}

/** Nível 2: subtópicos distintos dentro de uma matéria. */
export function listarSubtopicos(flashcards, materia) {
    return contarPorChave(
        flashcards.filter((f) => f.materia === materia),
        "subtopico"
    );
}

/** Nível 3: detalhes distintos dentro de uma matéria + subtópico. */
export function listarDetalhes(flashcards, materia, subtopico) {
    return contarPorChave(
        flashcards.filter((f) => f.materia === materia && f.subtopico === subtopico),
        "detalhe"
    );
}

/**
 * Seleciona os flashcards de um baralho, no nível de granularidade escolhido
 * pela navegação (matéria sozinha, matéria+subtópico, ou os três níveis).
 */
export function selecionarPorBaralho(flashcards, { materia, subtopico = null, detalhe = null } = {}) {
    return flashcards.filter((f) => {
        if (f.materia !== materia) return false;
        if (subtopico !== null && f.subtopico !== subtopico) return false;
        if (detalhe !== null && f.detalhe !== detalhe) return false;
        return true;
    });
}
