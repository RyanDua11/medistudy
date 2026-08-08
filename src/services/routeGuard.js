import { obterSessao } from "./authService.js";

export async function protegerRota() {
    const sessao = await obterSessao();
    if (!sessao) {
        window.location.href = "index.html";
        return null;
    }
    return sessao;
}
