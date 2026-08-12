import { corPorMateria } from "../services/corMateria.js";
import { formatarDataRelativa } from "../services/formatacaoData.js";

function fecharMenu(botaoMenu, opcoes) {
    opcoes.hidden = true;
    botaoMenu.setAttribute("aria-expanded", "false");
}

let ouvintesGlobaisRegistrados = false;

function registrarFechamentoGlobalDeMenus() {
    if (ouvintesGlobaisRegistrados) return;
    ouvintesGlobaisRegistrados = true;

    document.addEventListener("click", (evento) => {
        document.querySelectorAll(".flashcard-menu-opcoes:not([hidden])").forEach((opcoes) => {
            const menu = opcoes.closest(".flashcard-menu");
            if (menu && !menu.contains(evento.target)) {
                fecharMenu(menu.querySelector(".flashcard-menu-botao"), opcoes);
            }
        });
    });

    document.addEventListener("keydown", (evento) => {
        if (evento.key !== "Escape") return;
        document.querySelectorAll(".flashcard-menu-opcoes:not([hidden])").forEach((opcoes) => {
            const menu = opcoes.closest(".flashcard-menu");
            fecharMenu(menu.querySelector(".flashcard-menu-botao"), opcoes);
        });
    });
}

export function criarElementoFlashcard(flashcard, { aoRemover, ultimaRevisao = null }) {
    registrarFechamentoGlobalDeMenus();

    const item = document.createElement("li");
    item.className = "flashcard-item";

    const cabecalho = document.createElement("div");
    cabecalho.className = "flashcard-cabecalho";

    const pergunta = document.createElement("p");
    pergunta.className = "flashcard-pergunta";
    pergunta.textContent = flashcard.pergunta;

    const menu = document.createElement("div");
    menu.className = "flashcard-menu";

    const botaoMenu = document.createElement("button");
    botaoMenu.type = "button";
    botaoMenu.className = "flashcard-menu-botao";
    botaoMenu.textContent = "⋯";
    botaoMenu.setAttribute("aria-label", "Mais opções");
    botaoMenu.setAttribute("aria-expanded", "false");

    const opcoes = document.createElement("div");
    opcoes.className = "flashcard-menu-opcoes";
    opcoes.hidden = true;

    const botaoRemover = document.createElement("button");
    botaoRemover.type = "button";
    botaoRemover.className = "flashcard-remover";
    botaoRemover.textContent = "Remover";
    botaoRemover.addEventListener("click", () => aoRemover(flashcard.id));

    botaoMenu.addEventListener("click", (evento) => {
        evento.stopPropagation();
        const abrir = opcoes.hidden;
        opcoes.hidden = !abrir;
        botaoMenu.setAttribute("aria-expanded", String(abrir));
    });

    opcoes.appendChild(botaoRemover);
    menu.append(botaoMenu, opcoes);
    cabecalho.append(pergunta, menu);

    if (flashcard.materia) {
        const tag = document.createElement("span");
        tag.className = "tag-materia";
        tag.dataset.cor = corPorMateria(flashcard.materia);
        tag.textContent = flashcard.materia;
        item.appendChild(cabecalho);
        item.appendChild(tag);
    } else {
        item.appendChild(cabecalho);
    }

    const estatisticas = document.createElement("span");
    estatisticas.className = "flashcard-estatisticas";
    estatisticas.textContent = `✔ ${flashcard.acertos}  ✘ ${flashcard.erros}`;

    const status = document.createElement("span");
    status.className = "flashcard-status";
    status.textContent = formatarDataRelativa(ultimaRevisao);

    item.append(estatisticas, status);
    return item;
}
