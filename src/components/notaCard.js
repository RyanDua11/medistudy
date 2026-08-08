export function criarElementoNota(nota, { aoEditar, aoRemover }) {
    const item = document.createElement("li");
    item.className = "flashcard-item";

    const materia = document.createElement("p");
    materia.className = "flashcard-pergunta";
    materia.textContent = `${nota.materia} · ${nota.avaliacao}`;

    const detalhes = document.createElement("span");
    detalhes.className = "flashcard-estatisticas";
    detalhes.textContent = `nota ${nota.nota} · peso ${nota.peso}`;

    const botaoEditar = document.createElement("button");
    botaoEditar.type = "button";
    botaoEditar.className = "flashcard-editar";
    botaoEditar.textContent = "Editar";
    botaoEditar.addEventListener("click", () => aoEditar(nota));

    const botaoRemover = document.createElement("button");
    botaoRemover.type = "button";
    botaoRemover.className = "flashcard-remover";
    botaoRemover.textContent = "Remover";
    botaoRemover.addEventListener("click", () => aoRemover(nota.id));

    item.append(materia, detalhes, botaoEditar, botaoRemover);
    return item;
}
