export function criarElementoFlashcard(flashcard, { aoRemover }) {
    const item = document.createElement("li");
    item.className = "flashcard-item";

    const pergunta = document.createElement("p");
    pergunta.className = "flashcard-pergunta";
    pergunta.textContent = flashcard.pergunta;

    const estatisticas = document.createElement("span");
    estatisticas.className = "flashcard-estatisticas";
    estatisticas.textContent = `✔ ${flashcard.acertos}  ✘ ${flashcard.erros}`;

    const botaoRemover = document.createElement("button");
    botaoRemover.type = "button";
    botaoRemover.className = "flashcard-remover";
    botaoRemover.textContent = "Remover";
    botaoRemover.addEventListener("click", () => aoRemover(flashcard.id));

    item.append(pergunta, estatisticas, botaoRemover);
    return item;
}
