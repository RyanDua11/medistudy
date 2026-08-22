import { protegerRota } from "../../services/routeGuard.js";
import { criarProva, listarProvas, editarProva, removerProva } from "../../services/provasService.js";
import { criarElementoProva } from "../../components/provaCard.js";
import { inicializarNotificacaoRevisao } from "../../components/notificacaoRevisao.js";
import { inicializarUsuarioMenu } from "../../components/usuarioMenu.js";
import { inicializarNavegacaoPrincipal } from "../../components/navegacaoPrincipal.js";
import { inicializarPomodoroWidget } from "../../components/pomodoroWidget.js";
import { aplicarEntradaEscalonada } from "../../components/entradaEscalonada.js";
import { pulsarSucesso } from "../../components/feedbackAcao.js";
import { calcularProvasProximos7Dias } from "../../services/estatisticas.js";

const TELAS = Object.freeze({ ESCOLHA: "escolha", CADASTRAR: "cadastrar", LISTA: "lista" });

const telas = document.querySelectorAll(".tela-modo");
const botoesVoltar = document.querySelectorAll("[data-voltar]");
const botaoIrCadastrar = document.getElementById("botao-ir-cadastrar");
const botaoIrCadastrarVazio = document.getElementById("botao-ir-cadastrar-vazio");
const botaoIrLista = document.getElementById("botao-ir-lista");

const mensagemProvas = document.getElementById("mensagem-provas");

const formProva = document.getElementById("form-prova");
const campoMateria = document.getElementById("campo-materia-prova");
const campoData = document.getElementById("campo-data-prova");
const campoNotaNecessaria = document.getElementById("campo-nota-necessaria-prova");
const listaProvas = document.getElementById("lista-provas");
const provasVazio = document.getElementById("provas-vazio");
const provasCarregando = document.getElementById("provas-carregando");
const tituloFormProva = document.getElementById("titulo-form-prova");
const botaoSalvarProva = document.getElementById("botao-salvar-prova");
const botaoCancelarEdicao = document.getElementById("botao-cancelar-edicao-prova");
const statTotalProvas = document.getElementById("stat-total-provas");
const statProvasSemana = document.getElementById("stat-provas-semana");

let provaEmEdicaoId = null;

function mostrarTela(tela) {
    telas.forEach((secao) => {
        secao.hidden = secao.dataset.tela !== tela;
    });
}

function mostrarMensagem(texto) {
    mensagemProvas.textContent = texto;
    mensagemProvas.hidden = false;
}

function limparMensagem() {
    mensagemProvas.hidden = true;
    mensagemProvas.textContent = "";
}

function entrarEmModoEdicao(prova) {
    provaEmEdicaoId = prova.id;
    campoMateria.value = prova.materia;
    campoData.value = prova.data.slice(0, 10);
    campoNotaNecessaria.value = prova.nota_necessaria ?? "";
    tituloFormProva.textContent = "Editar prova";
    botaoSalvarProva.textContent = "Salvar alterações";
    botaoCancelarEdicao.hidden = false;
    mostrarTela(TELAS.CADASTRAR);
}

function sairDoModoEdicao() {
    provaEmEdicaoId = null;
    formProva.reset();
    tituloFormProva.textContent = "Nova prova";
    botaoSalvarProva.textContent = "Adicionar prova";
    botaoCancelarEdicao.hidden = true;
}

function renderizarListaProvas(provas) {
    listaProvas.innerHTML = "";
    provasVazio.hidden = provas.length > 0;

    provas.forEach((prova) => {
        const item = criarElementoProva(prova, {
            aoEditar: entrarEmModoEdicao,
            aoRemover: tratarRemover,
        });
        listaProvas.appendChild(item);
    });

    aplicarEntradaEscalonada(listaProvas);
}

function renderizarEstatisticas(provas) {
    statTotalProvas.textContent = provas.length;
    statProvasSemana.textContent = calcularProvasProximos7Dias(provas);
}

async function carregarProvas() {
    const provas = await listarProvas();
    provasCarregando.hidden = true;
    renderizarListaProvas(provas);
    renderizarEstatisticas(provas);
}

async function tratarSalvarProva(evento) {
    evento.preventDefault();
    limparMensagem();

    const notaNecessaria = campoNotaNecessaria.value ? Number(campoNotaNecessaria.value) : null;

    try {
        if (provaEmEdicaoId) {
            await editarProva(provaEmEdicaoId, {
                materia: campoMateria.value,
                data: campoData.value,
                nota_necessaria: notaNecessaria,
            });
        } else {
            await criarProva(campoMateria.value, campoData.value, notaNecessaria);
        }

        pulsarSucesso(botaoSalvarProva);
        sairDoModoEdicao();
        await carregarProvas();
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

async function tratarRemover(id) {
    try {
        await removerProva(id);
        if (provaEmEdicaoId === id) sairDoModoEdicao();
        await carregarProvas();
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

// --- navegação entre telas ---

function irParaEscolha() {
    limparMensagem();
    sairDoModoEdicao();
    mostrarTela(TELAS.ESCOLHA);
}

function irParaCadastrar() {
    limparMensagem();
    mostrarTela(TELAS.CADASTRAR);
}

function irParaLista() {
    limparMensagem();
    mostrarTela(TELAS.LISTA);
}

botaoIrCadastrar.addEventListener("click", irParaCadastrar);
botaoIrCadastrarVazio.addEventListener("click", irParaCadastrar);
botaoIrLista.addEventListener("click", irParaLista);
botoesVoltar.forEach((botao) => botao.addEventListener("click", irParaEscolha));

formProva.addEventListener("submit", tratarSalvarProva);
botaoCancelarEdicao.addEventListener("click", () => {
    sairDoModoEdicao();
    irParaLista();
});

async function iniciar() {
    const sessao = await protegerRota();
    if (!sessao) return;

    inicializarNotificacaoRevisao();
    inicializarUsuarioMenu();
    inicializarNavegacaoPrincipal();
    inicializarPomodoroWidget();
    mostrarTela(TELAS.ESCOLHA);
    await carregarProvas();
}

iniciar();
