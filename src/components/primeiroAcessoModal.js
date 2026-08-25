const CHAVE_NOME_USUARIO = "medistudy_nome_usuario";

/** Decide se o modal de primeiro acesso deve aparecer: só quando ainda não há nome salvo. */
export function deveExibirModalPrimeiroAcesso(storage = localStorage) {
    return storage.getItem(CHAVE_NOME_USUARIO) === null;
}

/**
 * Mostra (uma única vez, quando ainda não há nome salvo) um modal simples
 * pedindo como a usuária quer ser chamada. Salva no localStorage e some ao
 * confirmar — `aoConfirmar(nome)` é chamado em seguida, pra quem inicializou
 * poder atualizar a UI (ex: a saudação da home) sem precisar recarregar.
 */
export function inicializarPrimeiroAcessoModal(aoConfirmar) {
    if (!deveExibirModalPrimeiroAcesso()) return;

    const overlay = document.createElement("div");
    overlay.className = "primeiro-acesso-overlay";
    overlay.innerHTML = `
        <div class="primeiro-acesso-modal" role="dialog" aria-modal="true" aria-labelledby="primeiro-acesso-titulo">
            <span class="primeiro-acesso-icone" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0L12 5.35l-.77-.77a5.4 5.4 0 0 0-7.65 7.65l.77.77L12 20.55l7.65-7.65.77-.77a5.4 5.4 0 0 0 0-7.65z"/></svg>
            </span>
            <h2 id="primeiro-acesso-titulo">Bem-vinda ao MediStudy!</h2>
            <p>Como você quer ser chamada?</p>
            <input type="text" id="primeiro-acesso-input" class="primeiro-acesso-input" placeholder="Seu nome" maxlength="40" autocomplete="off">
            <button type="button" id="primeiro-acesso-confirmar" class="primeiro-acesso-confirmar">Confirmar</button>
        </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector("#primeiro-acesso-input");
    const botaoConfirmar = overlay.querySelector("#primeiro-acesso-confirmar");

    function confirmar() {
        const nome = input.value.trim();
        if (!nome) {
            input.classList.add("primeiro-acesso-input-erro");
            input.focus();
            return;
        }

        localStorage.setItem(CHAVE_NOME_USUARIO, nome);
        overlay.classList.add("primeiro-acesso-saindo");
        setTimeout(() => overlay.remove(), 200);
        aoConfirmar?.(nome);
    }

    botaoConfirmar.addEventListener("click", confirmar);
    input.addEventListener("keydown", (evento) => {
        if (evento.key === "Enter") confirmar();
    });
    input.addEventListener("input", () => input.classList.remove("primeiro-acesso-input-erro"));

    requestAnimationFrame(() => input.focus());
}
