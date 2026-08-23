import { corPorMateria } from "../services/corMateria.js";
import { formatarDataRelativa } from "../services/formatacaoData.js";

const ROTULOS_MODO = { rapido: "⚡ Caso Rápido", interativo: "🩺 Caso Interativo", anamnese: "💬 Anamnese" };

/** Card de um caso já resolvido, para a lista do histórico: matéria, modo, data e score da resolução. */
export function criarElementoCasoClinico(caso, { score = null, ultimaResolucao = null } = {}) {
    const item = document.createElement("li");
    item.className = "flashcard-item";

    const cabecalho = document.createElement("div");
    cabecalho.className = "flashcard-cabecalho";

    const modo = document.createElement("p");
    modo.className = "flashcard-pergunta";
    modo.textContent = ROTULOS_MODO[caso.modo] ?? caso.modo ?? "Caso Clínico";
    cabecalho.appendChild(modo);

    if (score !== null) {
        const scoreEl = document.createElement("span");
        scoreEl.className = "historico-caso-score";
        scoreEl.textContent = `${score}%`;
        cabecalho.appendChild(scoreEl);
    }

    item.appendChild(cabecalho);

    if (caso.enunciado) {
        const resumo = document.createElement("p");
        resumo.className = "historico-caso-resumo";
        resumo.textContent = caso.enunciado;
        item.appendChild(resumo);
    }

    const rodape = document.createElement("div");
    rodape.className = "historico-caso-rodape";

    if (caso.materia) {
        const tag = document.createElement("span");
        tag.className = "tag-materia";
        tag.dataset.cor = corPorMateria(caso.materia);
        tag.textContent = caso.materia;
        rodape.appendChild(tag);
    }

    const status = document.createElement("span");
    status.className = "flashcard-status";
    status.textContent = ultimaResolucao ? formatarDataRelativa(ultimaResolucao) : "Ainda não resolvido";
    rodape.appendChild(status);

    item.appendChild(rodape);

    return item;
}
