import { protegerRota } from "../../services/routeGuard.js";
import { inicializarNotificacaoRevisao } from "../../components/notificacaoRevisao.js";
import { inicializarUsuarioMenu } from "../../components/usuarioMenu.js";
import { resolverFerramentaEmBreve } from "../../services/ferramentasEmBreve.js";

const secaoEmBreve = document.getElementById("em-breve");
const iconeEmBreve = document.getElementById("em-breve-icone");
const tituloFerramenta = document.getElementById("em-breve-titulo");
const fraseFerramenta = document.getElementById("em-breve-frase");

function exibirFerramenta() {
    const parametros = new URLSearchParams(window.location.search);
    const ferramenta = resolverFerramentaEmBreve(parametros.get("ferramenta"));
    if (!ferramenta) return;

    secaoEmBreve.dataset.cor = ferramenta.cor;
    iconeEmBreve.innerHTML = ferramenta.icone;
    tituloFerramenta.textContent = `${ferramenta.nome}: em breve`;
    fraseFerramenta.textContent = ferramenta.frase;
}

async function iniciar() {
    const sessao = await protegerRota();
    if (!sessao) return;

    inicializarNotificacaoRevisao();
    inicializarUsuarioMenu();
    exibirFerramenta();
}

iniciar();
