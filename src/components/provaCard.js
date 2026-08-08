function formatarData(dataIso) {
    const data = new Date(dataIso);
    return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function criarElementoProva(prova, { aoEditar, aoRemover }) {
    const item = document.createElement("li");
    item.className = "flashcard-item";

    const materia = document.createElement("p");
    materia.className = "flashcard-pergunta";
    materia.textContent = prova.materia;

    const detalhes = document.createElement("span");
    detalhes.className = "flashcard-estatisticas";
    detalhes.textContent = prova.nota_necessaria
        ? `${formatarData(prova.data)} · nota mínima ${prova.nota_necessaria}`
        : formatarData(prova.data);

    const botaoEditar = document.createElement("button");
    botaoEditar.type = "button";
    botaoEditar.className = "flashcard-remover";
    botaoEditar.textContent = "Editar";
    botaoEditar.addEventListener("click", () => aoEditar(prova));

    const botaoRemover = document.createElement("button");
    botaoRemover.type = "button";
    botaoRemover.className = "flashcard-remover";
    botaoRemover.textContent = "Remover";
    botaoRemover.addEventListener("click", () => aoRemover(prova.id));

    item.append(materia, detalhes, botaoEditar, botaoRemover);
    return item;
}
