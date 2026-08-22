import { protegerRota } from "../../services/routeGuard.js";
import {
    criarCasoClinico,
    listarCasosClinicos,
    registrarResolucaoCaso,
    listarLogResolucoesCasos,
} from "../../services/casosClinicosService.js";
import { calcularCasosResolvidos, calcularTaxaAcertoCasos } from "../../services/estatisticas.js";
import { criarElementoCasoClinico } from "../../components/casoClinicoCard.js";
import { inicializarUsuarioMenu } from "../../components/usuarioMenu.js";
import { inicializarNotificacaoRevisao } from "../../components/notificacaoRevisao.js";
import { inicializarNavegacaoPrincipal } from "../../components/navegacaoPrincipal.js";
import { inicializarPomodoroWidget } from "../../components/pomodoroWidget.js";
import { aplicarEntradaEscalonada } from "../../components/entradaEscalonada.js";
import { pulsarSucesso } from "../../components/feedbackAcao.js";
import { melhorarSelect, sincronizarSelectPersonalizado } from "../../components/selectPersonalizado.js";

const TELAS = Object.freeze({ ESCOLHA: "escolha", GERAR: "gerar", RESOLVER: "resolver" });

const telas = document.querySelectorAll(".tela-modo");
const botoesVoltar = document.querySelectorAll("[data-voltar]");
const botaoIrResolver = document.getElementById("botao-ir-resolver");
const botaoIrGerar = document.getElementById("botao-ir-gerar");

const mensagemCasos = document.getElementById("mensagem-casos");

const selectMateria = document.getElementById("select-materia-caso");
const botaoGerarCaso = document.getElementById("botao-gerar-caso");
const casoGerando = document.getElementById("caso-gerando");
const gerarFormulario = document.getElementById("gerar-formulario");
const gerarSucesso = document.getElementById("gerar-sucesso");
const gerarSucessoPergunta = document.getElementById("gerar-sucesso-pergunta");
const botaoResolverCasoGerado = document.getElementById("botao-resolver-caso-gerado");
const botaoGerarOutroCaso = document.getElementById("botao-gerar-outro-caso");

const resolverEscolhaCaso = document.getElementById("resolver-escolha-caso");
const casosCarregando = document.getElementById("casos-carregando");
const listaCasos = document.getElementById("lista-casos-clinicos");
const casosVazio = document.getElementById("casos-vazio");
const botaoIrGerarVazio = document.getElementById("botao-ir-gerar-vazio");

const resolucaoCaso = document.getElementById("resolucao-caso");
const resolucaoEnunciado = document.getElementById("resolucao-enunciado");
const resolucaoPergunta = document.getElementById("resolucao-pergunta");
const resolucaoAlternativas = document.getElementById("resolucao-alternativas");
const resolucaoFeedback = document.getElementById("resolucao-feedback");
const resolucaoResultado = document.getElementById("resolucao-resultado");
const resolucaoExplicacao = document.getElementById("resolucao-explicacao");
const botaoEscolherOutroCaso = document.getElementById("botao-escolher-outro-caso");

const statTotalCasos = document.getElementById("stat-total-casos");
const statCasosResolvidos = document.getElementById("stat-casos-resolvidos");
const statTaxaAcertoCasos = document.getElementById("stat-taxa-acerto-casos");

let casos = [];
let logsResolucoes = [];
let casoGeradoRecente = null;

function mostrarTela(tela) {
    telas.forEach((secao) => {
        secao.hidden = secao.dataset.tela !== tela;
    });
}

function mostrarMensagem(texto) {
    mensagemCasos.textContent = texto;
    mensagemCasos.hidden = false;
}

function limparMensagem() {
    mensagemCasos.hidden = true;
    mensagemCasos.textContent = "";
}

function calcularUltimaResolucaoPorCaso() {
    const mapa = new Map();
    logsResolucoes.forEach((log) => {
        const atual = mapa.get(log.caso_clinico_id);
        if (!atual || new Date(log.resolvido_em) > new Date(atual)) {
            mapa.set(log.caso_clinico_id, log.resolvido_em);
        }
    });
    return mapa;
}

function renderizarListaCasos() {
    listaCasos.innerHTML = "";
    casosVazio.hidden = casos.length > 0;

    const ultimaResolucaoPorCaso = calcularUltimaResolucaoPorCaso();

    casos.forEach((caso) => {
        const item = criarElementoCasoClinico(caso, {
            aoAbrir: selecionarCasoParaResolver,
            ultimaResolucao: ultimaResolucaoPorCaso.get(caso.id) ?? null,
        });
        listaCasos.appendChild(item);
    });

    aplicarEntradaEscalonada(listaCasos);
}

function renderizarEstatisticas() {
    statTotalCasos.textContent = casos.length;
    statCasosResolvidos.textContent = calcularCasosResolvidos(logsResolucoes);
    statTaxaAcertoCasos.textContent = `${calcularTaxaAcertoCasos(logsResolucoes)}%`;
}

function mostrarEscolhaDeCaso() {
    resolucaoCaso.hidden = true;
    resolverEscolhaCaso.hidden = false;
}

function selecionarCasoParaResolver(caso) {
    resolverEscolhaCaso.hidden = true;
    resolucaoCaso.hidden = false;
    resolucaoFeedback.hidden = true;

    resolucaoEnunciado.textContent = caso.enunciado;
    resolucaoPergunta.textContent = caso.pergunta;
    resolucaoAlternativas.innerHTML = "";

    caso.alternativas.forEach((alternativa, indice) => {
        const item = document.createElement("li");
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "resolucao-alternativa";
        botao.textContent = alternativa;
        botao.addEventListener("click", () => tratarResposta(caso, indice, botao));
        item.appendChild(botao);
        resolucaoAlternativas.appendChild(item);
    });
}

async function tratarResposta(caso, indiceEscolhido, botaoEscolhido) {
    const botoes = resolucaoAlternativas.querySelectorAll(".resolucao-alternativa");
    botoes.forEach((botao) => (botao.disabled = true));

    const acertou = indiceEscolhido === caso.alternativa_correta;
    botaoEscolhido.classList.add(acertou ? "resolucao-correta" : "resolucao-incorreta");
    if (!acertou) {
        botoes[caso.alternativa_correta].classList.add("resolucao-correta");
    }

    resolucaoResultado.textContent = acertou ? "Você acertou!" : "Você errou.";
    resolucaoExplicacao.textContent = caso.explicacao;
    resolucaoFeedback.hidden = false;

    try {
        await registrarResolucaoCaso(caso.id, indiceEscolhido, acertou);
        logsResolucoes = await listarLogResolucoesCasos();
        renderizarEstatisticas();
        renderizarListaCasos();
    } catch (erro) {
        mostrarMensagem(`Resposta registrada aqui, mas não foi possível salvar seu histórico: ${erro.message}`);
    }
}

async function carregarCasos() {
    casosCarregando.hidden = false;
    try {
        casos = await listarCasosClinicos();
    } catch (erro) {
        mostrarMensagem(erro.message);
        casosCarregando.hidden = true;
        return;
    }

    try {
        logsResolucoes = await listarLogResolucoesCasos();
    } catch (erro) {
        mostrarMensagem(erro.message);
        logsResolucoes = [];
    } finally {
        casosCarregando.hidden = true;
    }

    renderizarListaCasos();
    renderizarEstatisticas();
}

async function tratarGerarCaso() {
    limparMensagem();

    const materia = selectMateria.value;
    if (!materia) {
        mostrarMensagem("Escolha uma matéria antes de gerar o caso.");
        return;
    }

    botaoGerarCaso.disabled = true;
    casoGerando.hidden = false;

    try {
        const novoCaso = await criarCasoClinico(materia);
        casos = [novoCaso, ...casos];
        renderizarListaCasos();
        renderizarEstatisticas();
        pulsarSucesso(botaoGerarCaso);

        casoGeradoRecente = novoCaso;
        gerarSucessoPergunta.textContent = novoCaso.pergunta;
        gerarFormulario.hidden = true;
        gerarSucesso.hidden = false;
    } catch (erro) {
        mostrarMensagem(erro.message);
    } finally {
        botaoGerarCaso.disabled = false;
        casoGerando.hidden = true;
    }
}

// --- navegação entre telas ---

function irParaEscolha() {
    limparMensagem();
    mostrarTela(TELAS.ESCOLHA);
}

function irParaGerar() {
    limparMensagem();
    gerarFormulario.hidden = false;
    gerarSucesso.hidden = true;
    selectMateria.value = "";
    sincronizarSelectPersonalizado(selectMateria);
    mostrarTela(TELAS.GERAR);
}

function irParaResolver() {
    limparMensagem();
    mostrarEscolhaDeCaso();
    mostrarTela(TELAS.RESOLVER);
}

function tratarResolverCasoGerado() {
    if (!casoGeradoRecente) return;
    mostrarTela(TELAS.RESOLVER);
    selecionarCasoParaResolver(casoGeradoRecente);
}

botaoIrResolver.addEventListener("click", irParaResolver);
botaoIrGerar.addEventListener("click", irParaGerar);
botaoIrGerarVazio.addEventListener("click", irParaGerar);
botoesVoltar.forEach((botao) => botao.addEventListener("click", irParaEscolha));

botaoGerarCaso.addEventListener("click", tratarGerarCaso);
botaoResolverCasoGerado.addEventListener("click", tratarResolverCasoGerado);
botaoGerarOutroCaso.addEventListener("click", irParaGerar);
botaoEscolherOutroCaso.addEventListener("click", mostrarEscolhaDeCaso);

async function iniciar() {
    const sessao = await protegerRota();
    if (!sessao) return;

    inicializarUsuarioMenu();
    inicializarNotificacaoRevisao();
    inicializarNavegacaoPrincipal();
    inicializarPomodoroWidget();
    melhorarSelect(selectMateria);
    mostrarTela(TELAS.ESCOLHA);
    await carregarCasos();
}

iniciar();
