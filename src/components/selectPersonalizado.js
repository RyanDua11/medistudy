let ouvintesGlobaisRegistrados = false;

function fechar(gatilho, opcoes) {
    opcoes.hidden = true;
    gatilho.setAttribute("aria-expanded", "false");
}

function registrarFechamentoGlobal() {
    if (ouvintesGlobaisRegistrados) return;
    ouvintesGlobaisRegistrados = true;

    document.addEventListener("click", (evento) => {
        document.querySelectorAll(".select-personalizado-opcoes:not([hidden])").forEach((opcoes) => {
            const wrapper = opcoes.closest(".select-personalizado");
            const gatilho = wrapper?.querySelector(".select-personalizado-gatilho");
            if (wrapper && gatilho && !wrapper.contains(evento.target)) {
                fechar(gatilho, opcoes);
            }
        });
    });

    document.addEventListener("keydown", (evento) => {
        if (evento.key !== "Escape") return;
        document.querySelectorAll(".select-personalizado-opcoes:not([hidden])").forEach((opcoes) => {
            const wrapper = opcoes.closest(".select-personalizado");
            const gatilho = wrapper?.querySelector(".select-personalizado-gatilho");
            if (gatilho) fechar(gatilho, opcoes);
        });
    });
}

function rotuloDaOpcaoSelecionada(selectNativo) {
    const opcao = selectNativo.options[selectNativo.selectedIndex];
    return opcao ? opcao.textContent : "";
}

function reconstruirOpcoes(selectNativo, listaOpcoes, gatilhoRotulo, gatilho, opcoesWrapper) {
    listaOpcoes.innerHTML = "";

    Array.from(selectNativo.options).forEach((opcaoNativa) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "select-personalizado-opcao";
        item.setAttribute("role", "option");
        item.textContent = opcaoNativa.textContent;
        item.dataset.valor = opcaoNativa.value;
        if (opcaoNativa.value === selectNativo.value) {
            item.setAttribute("aria-selected", "true");
            item.classList.add("selecionada");
        }

        item.addEventListener("click", (evento) => {
            evento.stopPropagation();
            selectNativo.value = opcaoNativa.value;
            selectNativo.dispatchEvent(new Event("change", { bubbles: true }));
            gatilhoRotulo.textContent = rotuloDaOpcaoSelecionada(selectNativo);
            listaOpcoes.querySelectorAll(".select-personalizado-opcao").forEach((el) => {
                el.classList.remove("selecionada");
                el.removeAttribute("aria-selected");
            });
            item.classList.add("selecionada");
            item.setAttribute("aria-selected", "true");
            fechar(gatilho, opcoesWrapper);
            gatilho.focus();
        });

        listaOpcoes.appendChild(item);
    });

    gatilhoRotulo.textContent = rotuloDaOpcaoSelecionada(selectNativo);
}

/**
 * Substitui visualmente um <select> nativo por um dropdown customizado que
 * segue a identidade dourada do produto (o popup de opções de um <select>
 * nativo é desenhado pelo SO/navegador e não pode ser estilizado via CSS).
 *
 * O <select> original permanece no DOM, oculto e fora da ordem de tabulação,
 * como única fonte de verdade: `.value` e o evento "change" continuam
 * funcionando exatamente como antes, então nenhum código que já lê o select
 * nativo precisa mudar. Chame `sincronizarSelectPersonalizado` sempre que as
 * `<option>` do select original forem recriadas dinamicamente.
 */
export function melhorarSelect(selectNativo) {
    if (selectNativo.dataset.selectMelhorado === "true") return;
    selectNativo.dataset.selectMelhorado = "true";

    registrarFechamentoGlobal();

    selectNativo.hidden = true;
    selectNativo.tabIndex = -1;

    const wrapper = document.createElement("div");
    wrapper.className = "select-personalizado";

    const gatilho = document.createElement("button");
    gatilho.type = "button";
    gatilho.className = "select-personalizado-gatilho";
    gatilho.setAttribute("aria-haspopup", "listbox");
    gatilho.setAttribute("aria-expanded", "false");
    const rotuloAria = selectNativo.getAttribute("aria-label");
    if (rotuloAria) gatilho.setAttribute("aria-label", rotuloAria);

    const gatilhoRotulo = document.createElement("span");
    gatilhoRotulo.className = "select-personalizado-rotulo";
    gatilho.appendChild(gatilhoRotulo);

    const seta = document.createElement("span");
    seta.className = "select-personalizado-seta";
    seta.setAttribute("aria-hidden", "true");
    seta.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
    gatilho.appendChild(seta);

    const opcoesWrapper = document.createElement("div");
    opcoesWrapper.className = "select-personalizado-opcoes";
    opcoesWrapper.setAttribute("role", "listbox");
    opcoesWrapper.hidden = true;

    reconstruirOpcoes(selectNativo, opcoesWrapper, gatilhoRotulo, gatilho, opcoesWrapper);

    gatilho.addEventListener("click", (evento) => {
        evento.stopPropagation();
        const abrir = opcoesWrapper.hidden;
        opcoesWrapper.hidden = !abrir;
        gatilho.setAttribute("aria-expanded", String(abrir));
        if (abrir) {
            opcoesWrapper.querySelector(".select-personalizado-opcao.selecionada")?.focus();
        }
    });

    gatilho.addEventListener("keydown", (evento) => {
        if (evento.key === "ArrowDown" || evento.key === "Enter" || evento.key === " ") {
            evento.preventDefault();
            opcoesWrapper.hidden = false;
            gatilho.setAttribute("aria-expanded", "true");
            (opcoesWrapper.querySelector(".select-personalizado-opcao.selecionada") ?? opcoesWrapper.firstElementChild)?.focus();
        }
    });

    opcoesWrapper.addEventListener("keydown", (evento) => {
        const itens = Array.from(opcoesWrapper.querySelectorAll(".select-personalizado-opcao"));
        const indiceAtual = itens.indexOf(document.activeElement);

        if (evento.key === "ArrowDown") {
            evento.preventDefault();
            itens[Math.min(indiceAtual + 1, itens.length - 1)]?.focus();
        } else if (evento.key === "ArrowUp") {
            evento.preventDefault();
            itens[Math.max(indiceAtual - 1, 0)]?.focus();
        } else if (evento.key === "Tab") {
            fechar(gatilho, opcoesWrapper);
        }
    });

    selectNativo.after(wrapper);
    wrapper.append(selectNativo, gatilho, opcoesWrapper);

    selectNativo._sincronizarSelectPersonalizado = () => {
        reconstruirOpcoes(selectNativo, opcoesWrapper, gatilhoRotulo, gatilho, opcoesWrapper);
    };
}

/** Reconstrói as opções customizadas depois que o <select> original for repopulado via JS. */
export function sincronizarSelectPersonalizado(selectNativo) {
    selectNativo._sincronizarSelectPersonalizado?.();
}
