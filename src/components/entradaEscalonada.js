const ATRASO_POR_ITEM_MS = 40;
const ATRASO_MAXIMO_MS = 320;

/**
 * Anima a entrada dos filhos diretos de `lista` em cascata (stagger), em vez
 * de a lista inteira aparecer de uma vez. Chamar depois de popular a lista.
 */
export function aplicarEntradaEscalonada(lista) {
    Array.from(lista.children).forEach((item, indice) => {
        item.classList.add("item-entrada");
        item.style.animationDelay = `${Math.min(indice * ATRASO_POR_ITEM_MS, ATRASO_MAXIMO_MS)}ms`;
    });
}
