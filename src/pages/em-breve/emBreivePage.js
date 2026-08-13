import { protegerRota } from "../../services/routeGuard.js";
import { inicializarNotificacaoRevisao } from "../../components/notificacaoRevisao.js";
import { inicializarUsuarioMenu } from "../../components/usuarioMenu.js";

const tituloFerramenta = document.getElementById("em-breve-titulo");

const FERRAMENTAS_VALIDAS = [
    "Configurações",
    "Mapas Mentais",
    "Questões",
    "Simulador de Anamnese",
    "Explique pro Professor",
];

function exibirNomeFerramenta() {
    const parametros = new URLSearchParams(window.location.search);
    const nomeFerramenta = parametros.get("ferramenta");

    if (nomeFerramenta && FERRAMENTAS_VALIDAS.includes(nomeFerramenta)) {
        tituloFerramenta.textContent = `${nomeFerramenta}: em breve`;
    }
}

async function iniciar() {
    const sessao = await protegerRota();
    if (!sessao) return;

    inicializarNotificacaoRevisao();
    inicializarUsuarioMenu();
    exibirNomeFerramenta();
}

iniciar();
