// Mesma paleta de --cor-categoria já usada em .ferramenta-card (style.css),
// mais o laranja introduzido para a sequência de revisão (streak).
// "vermelho" fica de fora de propósito: já tem semântica de erro/remoção no
// app (.flashcard-remover, #ff8080) e colidiria em tags de matéria.
export const PALETA_CORES_MATERIA = ["azul", "verde", "roxo", "ciano", "laranja"];

const COR_PADRAO = "dourado";

function hashString(texto) {
    let hash = 0;
    for (let i = 0; i < texto.length; i++) {
        hash = (hash * 31 + texto.charCodeAt(i)) % PALETA_CORES_MATERIA.length;
    }
    return hash;
}

export function corPorMateria(materia) {
    if (!materia) return COR_PADRAO;
    return PALETA_CORES_MATERIA[hashString(materia)];
}
