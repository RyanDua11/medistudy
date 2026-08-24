// carrossel horizontal do grid "Ferramentas de estudo": 6 cards no trilho,
// 5 visíveis por vez. Só existem dois estados possíveis (mostrando os
// cards 0-4 ou 1-5), então a navegação é um simples índice 0/1.
export function inicializarCarrosselFerramentas() {
    const trilho = document.getElementById("carrossel-ferramentas-trilho");
    const setaEsquerda = document.getElementById("ferramentas-seta-esquerda");
    const setaDireita = document.getElementById("ferramentas-seta-direita");
    if (!trilho || !setaEsquerda || !setaDireita) return;

    const totalCards = trilho.children.length;
    const cardsVisiveis = 5;
    const maxIndice = Math.max(0, totalCards - cardsVisiveis);
    let indice = 0;

    function atualizar() {
        const card = trilho.children[0];
        const larguraCard = card ? card.getBoundingClientRect().width : 0;
        const gap = 18;
        trilho.style.transform = `translateX(-${indice * (larguraCard + gap)}px)`;
        setaEsquerda.disabled = indice === 0;
        setaDireita.disabled = indice >= maxIndice;
    }

    setaEsquerda.addEventListener("click", () => {
        indice = Math.max(0, indice - 1);
        atualizar();
    });

    setaDireita.addEventListener("click", () => {
        indice = Math.min(maxIndice, indice + 1);
        atualizar();
    });

    window.addEventListener("resize", atualizar);

    atualizar();
}
