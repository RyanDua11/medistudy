/** Aplica um pulso breve de confirmação visual num elemento (ex.: botão de salvar). */
export function pulsarSucesso(elemento) {
    elemento.classList.remove("pulso-sucesso");
    void elemento.offsetWidth; // força reflow para permitir reiniciar a animação em cliques seguidos
    elemento.classList.add("pulso-sucesso");
    elemento.addEventListener("animationend", () => elemento.classList.remove("pulso-sucesso"), { once: true });
}
