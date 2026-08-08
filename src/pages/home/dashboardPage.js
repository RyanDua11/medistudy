import { protegerRota } from "../../services/routeGuard.js";

const spanNomeUsuario = document.getElementById("nome-usuario-saudacao");

function exibirSaudacao(email) {
    if (spanNomeUsuario) {
        spanNomeUsuario.textContent = email;
    }
}

async function iniciar() {
    const sessao = await protegerRota();
    if (!sessao) return;

    exibirSaudacao(sessao.user.email);
}

iniciar();
