import { protegerRota } from "../../services/routeGuard.js";
import { inicializarNotificacaoRevisao } from "../../components/notificacaoRevisao.js";

const tituloFerramenta = document.getElementById("em-breve-titulo");

function exibirNomeFerramenta() {
    const parametros = new URLSearchParams(window.location.search);
    const nomeFerramenta = parametros.get("ferramenta");

    if (nomeFerramenta) {
        tituloFerramenta.textContent = `${nomeFerramenta}: em breve`;
    }
}

async function iniciar() {
    const sessao = await protegerRota();
    if (!sessao) return;

    inicializarNotificacaoRevisao();
    exibirNomeFerramenta();
}

iniciar();
