import { protegerRota } from "../../services/routeGuard.js";
import {
    criarCasoClinico,
    listarCasosClinicos,
} from "../../services/casosClinicosService.js";
import { criarElementoCasoClinico } from "../../components/casoClinicoCard.js";

const selectMateria = document.getElementById("select-materia-caso");
const botaoGerarCaso = document.getElementById("botao-gerar-caso");
const casoGerando = document.getElementById("caso-gerando");
const mensagemCasos = document.getElementById("mensagem-casos");

const casosCarregando = document.getElementById("casos-carregando");
const listaCasos = document.getElementById("lista-casos-clinicos");
const casosVazio = document.getElementById("casos-vazio");

const resolucaoVazia = document.getElementById("resolucao-vazia");
const resolucaoCaso = document.getElementById("resolucao-caso");
const resolucaoEnunciado = document.getElementById("resolucao-enunciado");
const resolucaoPergunta = document.getElementById("resolucao-pergunta");
const resolucaoAlternativas = document.getElementById("resolucao-alternativas");
const resolucaoFeedback = document.getElementById("resolucao-feedback");
const resolucaoResultado = document.getElementById("resolucao-resultado");
const resolucaoExplicacao = document.getElementById("resolucao-explicacao");

let casos = [];

function mostrarMensagem(texto) {
    mensagemCasos.textContent = texto;
    mensagemCasos.hidden = false;
}

function limparMensagem() {
    mensagemCasos.hidden = true;
    mensagemCasos.textContent = "";
}

function renderizarListaCasos() {
    listaCasos.innerHTML = "";
    casosVazio.hidden = casos.length > 0;

    casos.forEach((caso) => {
        const item = criarElementoCasoClinico(caso, { aoAbrir: renderizarResolucao });
        listaCasos.appendChild(item);
    });
}

function renderizarResolucao(caso) {
    resolucaoVazia.hidden = true;
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

function tratarResposta(caso, indiceEscolhido, botaoEscolhido) {
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
}

async function carregarCasos() {
    casosCarregando.hidden = false;
    try {
        casos = await listarCasosClinicos();
        renderizarListaCasos();
    } catch (erro) {
        mostrarMensagem(erro.message);
    } finally {
        casosCarregando.hidden = true;
    }
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
    } catch (erro) {
        mostrarMensagem(erro.message);
    } finally {
        botaoGerarCaso.disabled = false;
        casoGerando.hidden = true;
    }
}

async function iniciar() {
    const sessao = await protegerRota();
    if (!sessao) return;

    botaoGerarCaso.addEventListener("click", tratarGerarCaso);
    await carregarCasos();
}

iniciar();
