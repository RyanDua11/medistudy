export function criarElementoCasoClinico(caso, { aoAbrir }) {
    const item = document.createElement("li");
    item.className = "flashcard-item";

    const pergunta = document.createElement("p");
    pergunta.className = "flashcard-pergunta";
    pergunta.textContent = caso.pergunta;

    const materia = document.createElement("span");
    materia.className = "flashcard-estatisticas";
    materia.textContent = caso.materia;

    const botaoResolver = document.createElement("button");
    botaoResolver.type = "button";
    botaoResolver.className = "flashcard-editar";
    botaoResolver.textContent = "Resolver caso";
    botaoResolver.addEventListener("click", () => aoAbrir(caso));

    item.append(pergunta, materia, botaoResolver);
    return item;
}
