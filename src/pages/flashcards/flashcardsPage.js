import { protegerRota } from "../../services/routeGuard.js";
import {
    criarFlashcard,
    listarFlashcards,
    marcarRevisao,
    listarLogRevisoes,
    removerFlashcard,
} from "../../services/flashcardsService.js";
import { parsearArquivoAnki } from "../../services/importadorAnki.js";
import { selecionarRevisaoRapida, selecionarVesperaDeProva } from "../../services/selecaoRevisao.js";
import {
    calcularStreakDias,
    calcularRevisadosHoje,
    categorizarFlashcards,
    calcularProgressoGeral,
} from "../../services/estatisticas.js";
import { criarElementoFlashcard } from "../../components/flashcardCard.js";
import { aplicarEntradaEscalonada } from "../../components/entradaEscalonada.js";
import { inicializarNotificacaoRevisao } from "../../components/notificacaoRevisao.js";
import { inicializarUsuarioMenu } from "../../components/usuarioMenu.js";
import { melhorarSelect, sincronizarSelectPersonalizado } from "../../components/selectPersonalizado.js";
import { pulsarSucesso } from "../../components/feedbackAcao.js";

const formNovoFlashcard = document.getElementById("form-novo-flashcard");
const campoPergunta = document.getElementById("campo-pergunta");
const campoResposta = document.getElementById("campo-resposta");
const campoMateria = document.getElementById("campo-materia");
const mensagemFlashcards = document.getElementById("mensagem-flashcards");
const listaFlashcards = document.getElementById("lista-flashcards");
const campoArquivoAnki = document.getElementById("campo-arquivo-anki");
const botaoImportarAnki = document.getElementById("botao-importar-anki");
const nomeArquivoAnki = document.getElementById("nome-arquivo-anki");

const botaoRevisaoRapida = document.getElementById("botao-revisao-rapida");
const botaoVesperaProva = document.getElementById("botao-vespera-prova");
const botaoModoPadrao = document.getElementById("botao-modo-padrao");
const selectMateriaVespera = document.getElementById("select-materia-vespera");

const revisaoCarregando = document.getElementById("revisao-carregando");
const revisaoVazia = document.getElementById("revisao-vazia");
const revisaoVaziaTexto = document.getElementById("revisao-vazia-texto");
const flashcardsVazio = document.getElementById("flashcards-vazio");
const cartaoRevisao = document.getElementById("cartao-revisao");
const cartaoRevisaoFrente = document.querySelector(".cartao-revisao-frente");
const cartaoRevisaoVerso = document.querySelector(".cartao-revisao-verso");
const revisaoPergunta = document.getElementById("revisao-pergunta");
const revisaoResposta = document.getElementById("revisao-resposta");
const botaoMostrarResposta = document.getElementById("botao-mostrar-resposta");
const botoesRevisao = document.getElementById("botoes-revisao");
const botaoAcertei = document.getElementById("botao-acertei");
const botaoErrei = document.getElementById("botao-errei");

const statTotalFlashcards = document.getElementById("stat-total-flashcards");
const statRevisadosHoje = document.getElementById("stat-revisados-hoje");
const statStreakDias = document.getElementById("stat-streak-dias");

const metodoNovos = document.getElementById("metodo-novos");
const metodoRevisar = document.getElementById("metodo-revisar");
const metodoAprendidos = document.getElementById("metodo-aprendidos");
const metodoProgressoValor = document.getElementById("metodo-progresso-valor");
const metodoProgressoBarra = document.getElementById("metodo-progresso-barra");

const NOME_ARQUIVO_ANKI_PADRAO = "Nenhum ficheiro selecionado";
const MENSAGEM_VAZIA_PADRAO = "Nenhum flashcard para revisar ainda. Crie o primeiro ao lado!";
const MENSAGEM_VAZIA_VESPERA = "Nenhum flashcard cadastrado para essa matéria ainda.";
const MENSAGEM_VAZIA_REVISAO_RAPIDA = "Nenhum flashcard vencido agora. Volte mais tarde!";

let flashcards = [];
let logs = [];
let filaRevisao = [];
let flashcardEmRevisao = null;
let modoAtivo = "padrao";
let materiaSelecionada = "";

function atualizarNomeArquivoAnki() {
    const arquivo = campoArquivoAnki.files[0];
    nomeArquivoAnki.textContent = arquivo ? arquivo.name : NOME_ARQUIVO_ANKI_PADRAO;
    nomeArquivoAnki.title = arquivo ? arquivo.name : "";
    nomeArquivoAnki.classList.toggle("tem-arquivo", Boolean(arquivo));
}

function mostrarMensagem(texto) {
    mensagemFlashcards.textContent = texto;
    mensagemFlashcards.hidden = false;
}

function limparMensagem() {
    mensagemFlashcards.hidden = true;
    mensagemFlashcards.textContent = "";
}

function calcularUltimaRevisaoPorFlashcard() {
    const mapa = new Map();
    logs.forEach((log) => {
        const atual = mapa.get(log.flashcard_id);
        if (!atual || new Date(log.revisado_em) > new Date(atual)) {
            mapa.set(log.flashcard_id, log.revisado_em);
        }
    });
    return mapa;
}

function renderizarListaFlashcards() {
    listaFlashcards.innerHTML = "";
    flashcardsVazio.hidden = flashcards.length > 0;

    const ultimaRevisaoPorFlashcard = calcularUltimaRevisaoPorFlashcard();

    flashcards.forEach((flashcard) => {
        const item = criarElementoFlashcard(flashcard, {
            aoRemover: tratarRemover,
            ultimaRevisao: ultimaRevisaoPorFlashcard.get(flashcard.id) ?? null,
        });
        listaFlashcards.appendChild(item);
    });

    aplicarEntradaEscalonada(listaFlashcards);
}

function renderizarEstatisticas() {
    statTotalFlashcards.textContent = flashcards.length;
    statRevisadosHoje.textContent = calcularRevisadosHoje(logs);
    statStreakDias.textContent = calcularStreakDias(logs);

    const { novos, revisar, aprendidos } = categorizarFlashcards(flashcards, logs);
    metodoNovos.textContent = novos.length;
    metodoRevisar.textContent = revisar.length;
    metodoAprendidos.textContent = aprendidos.length;

    const progresso = calcularProgressoGeral(flashcards, logs);
    metodoProgressoValor.textContent = `${progresso}%`;
    metodoProgressoBarra.style.width = `${progresso}%`;
}

function calcularFilaRevisao() {
    if (modoAtivo === "revisaoRapida") {
        return selecionarRevisaoRapida(flashcards);
    }
    if (modoAtivo === "vesperaDeProva") {
        return selecionarVesperaDeProva(flashcards, materiaSelecionada);
    }
    return flashcards;
}

function obterMensagemVazia() {
    if (modoAtivo === "vesperaDeProva") return MENSAGEM_VAZIA_VESPERA;
    if (modoAtivo === "revisaoRapida") return MENSAGEM_VAZIA_REVISAO_RAPIDA;
    return MENSAGEM_VAZIA_PADRAO;
}

function sessaoDeRevisaoRapidaConcluidaHoje() {
    return modoAtivo === "revisaoRapida" && flashcards.length > 0 && calcularRevisadosHoje(logs) > 0;
}

function definirEstadoFlip(virado) {
    cartaoRevisao.classList.toggle("virado", virado);
    cartaoRevisaoFrente.inert = virado;
    cartaoRevisaoVerso.inert = !virado;
}

function renderizarAreaRevisao() {
    filaRevisao = calcularFilaRevisao();
    flashcardEmRevisao = filaRevisao.length > 0 ? filaRevisao[0] : null;

    if (!flashcardEmRevisao) {
        const concluida = sessaoDeRevisaoRapidaConcluidaHoje();
        revisaoVaziaTexto.textContent = concluida
            ? "Sequência concluída hoje! Você revisou tudo o que estava pendente."
            : obterMensagemVazia();
        revisaoVazia.classList.toggle("revisao-concluida", concluida);
        revisaoVazia.hidden = false;
        cartaoRevisao.hidden = true;
        return;
    }

    revisaoVazia.classList.remove("revisao-concluida");
    revisaoVazia.hidden = true;
    cartaoRevisao.hidden = false;
    revisaoPergunta.textContent = flashcardEmRevisao.pergunta;
    revisaoResposta.textContent = flashcardEmRevisao.resposta;
    definirEstadoFlip(false);
}

function renderizarOpcoesDeMateria() {
    const materiaAtual = selectMateriaVespera.value;
    const materias = [...new Set(flashcards.map((f) => f.materia).filter(Boolean))].sort();

    selectMateriaVespera.innerHTML = '<option value="">Escolha a matéria...</option>';
    materias.forEach((materia) => {
        const opcao = document.createElement("option");
        opcao.value = materia;
        opcao.textContent = materia;
        selectMateriaVespera.appendChild(opcao);
    });
    selectMateriaVespera.value = materias.includes(materiaAtual) ? materiaAtual : "";
    sincronizarSelectPersonalizado(selectMateriaVespera);
}

async function carregarFlashcards() {
    try {
        flashcards = await listarFlashcards();
    } catch (erro) {
        mostrarMensagem(erro.message);
        revisaoCarregando.hidden = true;
        return;
    }

    try {
        logs = await listarLogRevisoes();
    } catch (erro) {
        mostrarMensagem(erro.message);
        logs = [];
    } finally {
        revisaoCarregando.hidden = true;
    }

    renderizarListaFlashcards();
    renderizarOpcoesDeMateria();
    renderizarAreaRevisao();
    renderizarEstatisticas();
}

async function tratarNovoFlashcard(evento) {
    evento.preventDefault();
    limparMensagem();

    try {
        await criarFlashcard(campoPergunta.value, campoResposta.value, campoMateria.value || null);
        pulsarSucesso(formNovoFlashcard.querySelector('button[type="submit"]'));
        formNovoFlashcard.reset();
        await carregarFlashcards();
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

function tratarModoRevisaoRapida() {
    modoAtivo = "revisaoRapida";
    renderizarAreaRevisao();
}

function tratarModoVesperaDeProva() {
    if (!selectMateriaVespera.value) {
        mostrarMensagem("Escolha uma matéria antes de iniciar a véspera de prova.");
        return;
    }

    limparMensagem();
    modoAtivo = "vesperaDeProva";
    materiaSelecionada = selectMateriaVespera.value;
    renderizarAreaRevisao();
}

function tratarModoPadrao() {
    modoAtivo = "padrao";
    renderizarAreaRevisao();
}

async function tratarImportarAnki() {
    limparMensagem();

    const arquivo = campoArquivoAnki.files[0];
    if (!arquivo) {
        mostrarMensagem("Escolha um arquivo .txt exportado do Anki antes de importar.");
        return;
    }

    botaoImportarAnki.disabled = true;

    try {
        const conteudo = await arquivo.text();
        const { cards, linhasIgnoradas } = parsearArquivoAnki(conteudo);

        let falhasAoCriar = 0;
        for (const card of cards) {
            try {
                await criarFlashcard(card.frente, card.verso);
            } catch {
                falhasAoCriar += 1;
            }
        }

        const totalIgnoradas = linhasIgnoradas + falhasAoCriar;
        const criados = cards.length - falhasAoCriar;
        mostrarMensagem(
            totalIgnoradas > 0
                ? `${criados} flashcard(s) importado(s). ${totalIgnoradas} linha(s) ignorada(s).`
                : `${criados} flashcard(s) importado(s) com sucesso.`
        );

        if (criados > 0) pulsarSucesso(botaoImportarAnki);
        campoArquivoAnki.value = "";
        atualizarNomeArquivoAnki();
        await carregarFlashcards();
    } catch (erro) {
        mostrarMensagem(`Não foi possível ler o arquivo: ${erro.message}`);
    } finally {
        botaoImportarAnki.disabled = false;
    }
}

async function tratarRemover(id) {
    try {
        await removerFlashcard(id);
        await carregarFlashcards();
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

function tratarMostrarResposta() {
    definirEstadoFlip(true);
    botaoAcertei.focus();
}

async function tratarRevisao(acertou) {
    if (!flashcardEmRevisao) return;

    try {
        await marcarRevisao(flashcardEmRevisao, acertou);
        await carregarFlashcards();
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

formNovoFlashcard.addEventListener("submit", tratarNovoFlashcard);
campoArquivoAnki.addEventListener("change", atualizarNomeArquivoAnki);
botaoImportarAnki.addEventListener("click", tratarImportarAnki);
botaoRevisaoRapida.addEventListener("click", tratarModoRevisaoRapida);
botaoVesperaProva.addEventListener("click", tratarModoVesperaDeProva);
botaoModoPadrao.addEventListener("click", tratarModoPadrao);
botaoMostrarResposta.addEventListener("click", tratarMostrarResposta);
botaoAcertei.addEventListener("click", () => tratarRevisao(true));
botaoErrei.addEventListener("click", () => tratarRevisao(false));

function abrirModoConformeParametroDeUrl() {
    const parametros = new URLSearchParams(window.location.search);
    if (parametros.get("modo") === "revisaoRapida") {
        tratarModoRevisaoRapida();
    }
}

async function iniciar() {
    const sessao = await protegerRota();
    if (!sessao) return;

    inicializarNotificacaoRevisao();
    inicializarUsuarioMenu();
    melhorarSelect(selectMateriaVespera);
    await carregarFlashcards();
    abrirModoConformeParametroDeUrl();
}

iniciar();
