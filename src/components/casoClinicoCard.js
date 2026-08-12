import { corPorMateria } from "../services/corMateria.js";
import { formatarDataRelativa } from "../services/formatacaoData.js";

export function criarElementoCasoClinico(caso, { aoAbrir, ultimaResolucao = null }) {
    const item = document.createElement("li");
    item.className = "flashcard-item";

    const pergunta = document.createElement("p");
    pergunta.className = "flashcard-pergunta";
    pergunta.textContent = caso.pergunta;

    item.appendChild(pergunta);

    if (caso.materia) {
        const tag = document.createElement("span");
        tag.className = "tag-materia";
        tag.dataset.cor = corPorMateria(caso.materia);
        tag.textContent = caso.materia;
        item.appendChild(tag);
    }

    const status = document.createElement("span");
    status.className = "flashcard-status";
    status.textContent = ultimaResolucao ? formatarDataRelativa(ultimaResolucao) : "Ainda não resolvido";
    item.appendChild(status);

    const botaoResolver = document.createElement("button");
    botaoResolver.type = "button";
    botaoResolver.className = "flashcard-editar";
    botaoResolver.textContent = "Resolver caso";
    botaoResolver.addEventListener("click", () => aoAbrir(caso));
    item.appendChild(botaoResolver);

    return item;
}
