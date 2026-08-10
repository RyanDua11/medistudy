export function criarSelectCustomizado(elementoRaiz) {
    const trigger = elementoRaiz.querySelector(".select-custom-trigger");
    const valorEl = elementoRaiz.querySelector(".select-custom-valor");
    const lista = elementoRaiz.querySelector(".select-custom-lista");

    const textoPlaceholder = valorEl.textContent;
    let opcoes = [{ valor: "", texto: textoPlaceholder }];
    let valorAtual = "";

    function estaAberto() {
        return !lista.hidden;
    }

    function abrir() {
        lista.hidden = false;
        trigger.setAttribute("aria-expanded", "true");
        const itemSelecionado = lista.querySelector('[aria-selected="true"]') || lista.querySelector("li");
        itemSelecionado?.focus();
        document.addEventListener("click", aoClicarFora);
    }

    function fechar({ focarTrigger = false } = {}) {
        lista.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
        document.removeEventListener("click", aoClicarFora);
        if (focarTrigger) trigger.focus();
    }

    function aoClicarFora(evento) {
        if (!elementoRaiz.contains(evento.target)) fechar();
    }

    function selecionar(valor) {
        const opcao = opcoes.find((o) => o.valor === valor) ?? opcoes[0];
        valorAtual = opcao.valor;
        valorEl.textContent = opcao.valor ? opcao.texto : textoPlaceholder;
        [...lista.children].forEach((li) => {
            li.setAttribute("aria-selected", String(li.dataset.valor === valorAtual));
        });
    }

    function aoNavegarItem(evento) {
        const itens = [...lista.children];
        const indiceAtual = itens.indexOf(evento.target);

        if (evento.key === "ArrowDown") {
            evento.preventDefault();
            itens[Math.min(indiceAtual + 1, itens.length - 1)]?.focus();
        } else if (evento.key === "ArrowUp") {
            evento.preventDefault();
            itens[Math.max(indiceAtual - 1, 0)]?.focus();
        } else if (evento.key === "Enter" || evento.key === " ") {
            evento.preventDefault();
            evento.target.click();
        } else if (evento.key === "Escape") {
            evento.preventDefault();
            fechar({ focarTrigger: true });
        } else if (evento.key === "Tab") {
            fechar();
        }
    }

    function renderizarItens() {
        lista.innerHTML = "";
        opcoes.forEach(({ valor, texto }) => {
            const li = document.createElement("li");
            li.setAttribute("role", "option");
            li.tabIndex = -1;
            li.dataset.valor = valor;
            li.textContent = texto;
            li.setAttribute("aria-selected", String(valor === valorAtual));
            li.addEventListener("click", () => {
                selecionar(valor);
                fechar({ focarTrigger: true });
                elementoRaiz.dispatchEvent(new Event("change"));
            });
            li.addEventListener("keydown", aoNavegarItem);
            lista.appendChild(li);
        });
    }

    trigger.addEventListener("click", () => {
        if (estaAberto()) {
            fechar();
        } else {
            abrir();
        }
    });

    trigger.addEventListener("keydown", (evento) => {
        if (evento.key === "ArrowDown" || evento.key === "Enter" || evento.key === " ") {
            evento.preventDefault();
            abrir();
        }
    });

    renderizarItens();

    return {
        get value() {
            return valorAtual;
        },
        set value(novoValor) {
            selecionar(novoValor);
        },
        setOptions(novasOpcoes) {
            opcoes = [{ valor: "", texto: textoPlaceholder }, ...novasOpcoes];
            const valorAnterior = valorAtual;
            renderizarItens();
            selecionar(opcoes.some((o) => o.valor === valorAnterior) ? valorAnterior : "");
        },
    };
}
