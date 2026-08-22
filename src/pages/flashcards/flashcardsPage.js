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
import { calcularStreakDias, calcularRevisadosHoje } from "../../services/estatisticas.js";
import { TELAS, calcularTelaInicial, filtrarFlashcardsPorMateria } from "../../services/telaFlashcards.js";
import { criarElementoFlashcard } from "../../components/flashcardCard.js";
import { aplicarEntradaEscalonada } from "../../components/entradaEscalonada.js";
import { inicializarNotificacaoRevisao } from "../../components/notificacaoRevisao.js";
import { inicializarUsuarioMenu } from "../../components/usuarioMenu.js";
import { melhorarSelect, sincronizarSelectPersonalizado } from "../../components/selectPersonalizado.js";
import { pulsarSucesso } from "../../components/feedbackAcao.js";

const telas = document.querySelectorAll(".tela-flashcards");
const botoesVoltar = document.querySelectorAll("[data-voltar]");
const botaoIrRevisar = document.getElementById("botao-ir-revisar");
const botaoIrCriar = document.getElementById("botao-ir-criar");
const botaoIrLista = document.getElementById("botao-ir-lista");

const formNovoFlashcard = document.getElementById("form-novo-flashcard");
const campoPergunta = document.getElementById("campo-pergunta");
const campoResposta = document.getElementById("campo-resposta");
const campoMateria = document.getElementById("campo-materia");
const mensagemFlashcards = document.getElementById("mensagem-flashcards");
const listaFlashcards = document.getElementById("lista-flashcards");
const filtroMateriaLista = document.getElementById("filtro-materia-lista");
const campoArquivoAnki = document.getElementById("campo-arquivo-anki");
const botaoImportarAnki = document.getElementById("botao-importar-anki");
const nomeArquivoAnki = document.getElementById("nome-arquivo-anki");

const revisaoEscolhaMetodo = document.getElementById("revisao-escolha-metodo");
const revisaoSessao = document.getElementById("revisao-sessao");
const botaoMetodoRapida = document.getElementById("botao-metodo-rapida");
const botaoMetodoVespera = document.getElementById("botao-metodo-vespera");
const vesperaMateriaPainel = document.getElementById("vespera-materia-painel");
const selectMateriaVespera = document.getElementById("select-materia-vespera");
const botaoConfirmarVespera = document.getElementById("botao-confirmar-vespera");

const badgeProgressoRevisao = document.getElementById("badge-progresso-revisao");
const revisaoCarregando = document.getElementById("revisao-carregando");
const revisaoVazia = document.getElementById("revisao-vazia");
const revisaoVaziaTexto = document.getElementById("revisao-vazia-texto");
const botaoCriarPrimeiroFlashcard = document.getElementById("botao-criar-primeiro-flashcard");
const flashcardsVazio = document.getElementById("flashcards-vazio");
const cartaoRevisao = document.getElementById("cartao-revisao");
const cartaoRevisaoFrente = document.querySelector(".cartao-revisao-frente");
const cartaoRevisaoVerso = document.querySelector(".cartao-revisao-verso");
const revisaoPergunta = document.getElementById("revisao-pergunta");
const revisaoResposta = document.getElementById("revisao-resposta");
const botaoMostrarResposta = document.getElementById("botao-mostrar-resposta");
const botaoAcertei = document.getElementById("botao-acertei");
const botaoErrei = document.getElementById("botao-errei");

const statTotalFlashcards = document.getElementById("stat-total-flashcards");
const statRevisadosHoje = document.getElementById("stat-revisados-hoje");
const statStreakDias = document.getElementById("stat-streak-dias");

const NOME_ARQUIVO_ANKI_PADRAO = "Nenhum ficheiro selecionado";
const MENSAGEM_VAZIA_PADRAO = "Nenhum flashcard para revisar ainda. Crie o primeiro ao lado!";
const MENSAGEM_VAZIA_VESPERA = "Nenhum flashcard cadastrado para essa matéria ainda.";
const MENSAGEM_VAZIA_REVISAO_RAPIDA = "Nenhum flashcard vencido agora. Volte mais tarde!";

let flashcards = [];
let logs = [];
let filaRevisao = [];
let flashcardEmRevisao = null;
let metodoRevisao = "padrao";
let materiaSelecionada = "";
let totalSessaoRevisao = 0;
let revisadosNaSessao = 0;
let materiaFiltroLista = "";

function mostrarTela(tela) {
    telas.forEach((secao) => {
        secao.hidden = secao.dataset.tela !== tela;
    });
}

function mostrarMensagem(texto) {
    mensagemFlashcards.textContent = texto;
    mensagemFlashcards.hidden = false;
}

function limparMensagem() {
    mensagemFlashcards.hidden = true;
    mensagemFlashcards.textContent = "";
}

function atualizarNomeArquivoAnki() {
    const arquivo = campoArquivoAnki.files[0];
    nomeArquivoAnki.textContent = arquivo ? arquivo.name : NOME_ARQUIVO_ANKI_PADRAO;
    nomeArquivoAnki.title = arquivo ? arquivo.name : "";
    nomeArquivoAnki.classList.toggle("tem-arquivo", Boolean(arquivo));
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
    const flashcardsFiltrados = filtrarFlashcardsPorMateria(flashcards, materiaFiltroLista);
    listaFlashcards.innerHTML = "";
    flashcardsVazio.hidden = flashcards.length > 0;

    const ultimaRevisaoPorFlashcard = calcularUltimaRevisaoPorFlashcard();

    flashcardsFiltrados.forEach((flashcard) => {
        const item = criarElementoFlashcard(flashcard, {
            aoRemover: tratarRemover,
            ultimaRevisao: ultimaRevisaoPorFlashcard.get(flashcard.id) ?? null,
        });
        listaFlashcards.appendChild(item);
    });

    aplicarEntradaEscalonada(listaFlashcards);
}

function renderizarFiltroDeMateria(select, materiaAtual) {
    const materias = [...new Set(flashcards.map((f) => f.materia).filter(Boolean))].sort();
    const opcaoInicial = select.querySelector("option[value='']");

    select.innerHTML = "";
    if (opcaoInicial) select.appendChild(opcaoInicial);

    materias.forEach((materia) => {
        const opcao = document.createElement("option");
        opcao.value = materia;
        opcao.textContent = materia;
        select.appendChild(opcao);
    });
    select.value = materias.includes(materiaAtual) ? materiaAtual : "";
}

function renderizarOpcoesDeMateria() {
    renderizarFiltroDeMateria(selectMateriaVespera, selectMateriaVespera.value);
    sincronizarSelectPersonalizado(selectMateriaVespera);
    renderizarFiltroDeMateria(filtroMateriaLista, materiaFiltroLista);
}

function renderizarEstatisticas() {
    statTotalFlashcards.textContent = flashcards.length;
    statRevisadosHoje.textContent = calcularRevisadosHoje(logs);
    statStreakDias.textContent = calcularStreakDias(logs);
}

function calcularFilaRevisao() {
    if (metodoRevisao === "revisaoRapida") {
        return selecionarRevisaoRapida(flashcards);
    }
    if (metodoRevisao === "vesperaDeProva") {
        return selecionarVesperaDeProva(flashcards, materiaSelecionada);
    }
    return flashcards;
}

function obterMensagemVazia() {
    if (metodoRevisao === "vesperaDeProva") return MENSAGEM_VAZIA_VESPERA;
    if (metodoRevisao === "revisaoRapida") return MENSAGEM_VAZIA_REVISAO_RAPIDA;
    return MENSAGEM_VAZIA_PADRAO;
}

function sessaoDeRevisaoRapidaConcluidaHoje() {
    return metodoRevisao === "revisaoRapida" && flashcards.length > 0 && calcularRevisadosHoje(logs) > 0;
}

function definirEstadoFlip(virado) {
    cartaoRevisao.classList.toggle("virado", virado);
    cartaoRevisaoFrente.inert = virado;
    cartaoRevisaoVerso.inert = !virado;
}

function atualizarBadgeProgresso() {
    if (!flashcardEmRevisao || totalSessaoRevisao === 0) {
        badgeProgressoRevisao.hidden = true;
        return;
    }
    badgeProgressoRevisao.hidden = false;
    badgeProgressoRevisao.textContent = `${revisadosNaSessao + 1} de ${totalSessaoRevisao}`;
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
        botaoCriarPrimeiroFlashcard.hidden = flashcards.length > 0;
        revisaoVazia.hidden = false;
        cartaoRevisao.hidden = true;
        atualizarBadgeProgresso();
        return;
    }

    revisaoVazia.classList.remove("revisao-concluida");
    revisaoVazia.hidden = true;
    cartaoRevisao.hidden = false;
    revisaoPergunta.textContent = flashcardEmRevisao.pergunta;
    revisaoResposta.textContent = flashcardEmRevisao.resposta;
    definirEstadoFlip(false);
    atualizarBadgeProgresso();
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
    renderizarEstatisticas();
    if (!revisaoSessao.hidden) {
        renderizarAreaRevisao();
    }
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

function iniciarSessaoDeRevisao() {
    revisaoEscolhaMetodo.hidden = true;
    vesperaMateriaPainel.hidden = true;
    revisaoSessao.hidden = false;
    totalSessaoRevisao = calcularFilaRevisao().length;
    revisadosNaSessao = 0;
    renderizarAreaRevisao();
}

function tratarModoRevisaoRapida() {
    limparMensagem();
    metodoRevisao = "revisaoRapida";
    iniciarSessaoDeRevisao();
}

function tratarEscolherVesperaDeProva() {
    limparMensagem();
    vesperaMateriaPainel.hidden = false;
}

function tratarConfirmarVesperaDeProva() {
    if (!selectMateriaVespera.value) {
        mostrarMensagem("Escolha uma matéria antes de iniciar a véspera de prova.");
        return;
    }

    limparMensagem();
    metodoRevisao = "vesperaDeProva";
    materiaSelecionada = selectMateriaVespera.value;
    iniciarSessaoDeRevisao();
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
        revisadosNaSessao += 1;
        await carregarFlashcards();
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

function tratarFiltroDeMateriaNaLista() {
    materiaFiltroLista = filtroMateriaLista.value;
    renderizarListaFlashcards();
}

// --- navegação entre telas ---

function irParaEscolha() {
    limparMensagem();
    mostrarTela(TELAS.ESCOLHA);
}

function irParaRevisao() {
    limparMensagem();
    metodoRevisao = "padrao";
    revisaoEscolhaMetodo.hidden = false;
    vesperaMateriaPainel.hidden = true;
    revisaoSessao.hidden = true;
    mostrarTela(TELAS.REVISAO);
}

function irParaCriacao() {
    limparMensagem();
    mostrarTela(TELAS.CRIACAO);
}

function irParaLista() {
    limparMensagem();
    mostrarTela(TELAS.LISTA);
}

botaoIrRevisar.addEventListener("click", irParaRevisao);
botaoIrCriar.addEventListener("click", irParaCriacao);
botaoIrLista.addEventListener("click", irParaLista);
botaoCriarPrimeiroFlashcard.addEventListener("click", irParaCriacao);
botoesVoltar.forEach((botao) => botao.addEventListener("click", irParaEscolha));

formNovoFlashcard.addEventListener("submit", tratarNovoFlashcard);
campoArquivoAnki.addEventListener("change", atualizarNomeArquivoAnki);
botaoImportarAnki.addEventListener("click", tratarImportarAnki);
botaoMetodoRapida.addEventListener("click", tratarModoRevisaoRapida);
botaoMetodoVespera.addEventListener("click", tratarEscolherVesperaDeProva);
botaoConfirmarVespera.addEventListener("click", tratarConfirmarVesperaDeProva);
botaoMostrarResposta.addEventListener("click", tratarMostrarResposta);
botaoAcertei.addEventListener("click", () => tratarRevisao(true));
botaoErrei.addEventListener("click", () => tratarRevisao(false));
filtroMateriaLista.addEventListener("change", tratarFiltroDeMateriaNaLista);

async function iniciar() {
    const sessao = await protegerRota();
    if (!sessao) return;

    inicializarNotificacaoRevisao();
    inicializarUsuarioMenu();
    melhorarSelect(selectMateriaVespera);
    await carregarFlashcards();

    const { tela, iniciarRevisaoRapida } = calcularTelaInicial(new URLSearchParams(window.location.search));
    if (tela === TELAS.REVISAO) {
        irParaRevisao();
        if (iniciarRevisaoRapida) tratarModoRevisaoRapida();
    } else {
        mostrarTela(tela);
    }
}

iniciar();
