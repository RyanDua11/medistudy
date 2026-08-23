import { protegerRota } from "../../services/routeGuard.js";
import {
    criarFlashcard,
    criarFlashcardComReverso,
    listarFlashcards,
    marcarRevisao,
    listarLogRevisoes,
    removerFlashcard,
} from "../../services/flashcardsService.js";
import { parsearArquivoAnki } from "../../services/importadorAnki.js";
import { gerarFlashcardIA } from "../../services/flashcardIA.js";
import { selecionarRevisaoRapida, selecionarVesperaDeProva } from "../../services/selecaoRevisao.js";
import { calcularStreakDias, calcularRevisadosHoje } from "../../services/estatisticas.js";
import { preverIntervalosFSRS, formatarIntervaloFSRS } from "../../services/fsrs.js";
import { validarCloze, ocultarLacunas, segmentarCloze } from "../../services/cloze.js";
import { listarMaterias, listarSubtopicos, listarDetalhes, selecionarPorBaralho } from "../../services/baralhosHierarquicos.js";
import { identificarPontosFracos } from "../../services/diarioErros.js";
import { TELAS, calcularTelaInicial, filtrarFlashcardsPorMateria } from "../../services/telaFlashcards.js";
import { criarElementoFlashcard } from "../../components/flashcardCard.js";
import { aplicarEntradaEscalonada } from "../../components/entradaEscalonada.js";
import { inicializarNotificacaoRevisao } from "../../components/notificacaoRevisao.js";
import { inicializarUsuarioMenu } from "../../components/usuarioMenu.js";
import { inicializarNavegacaoPrincipal } from "../../components/navegacaoPrincipal.js";
import { inicializarPomodoroWidget } from "../../components/pomodoroWidget.js";
import { melhorarSelect, sincronizarSelectPersonalizado } from "../../components/selectPersonalizado.js";
import { pulsarSucesso } from "../../components/feedbackAcao.js";

const telas = document.querySelectorAll(".tela-modo");
const botoesVoltar = document.querySelectorAll("[data-voltar]");
const botaoIrRevisar = document.getElementById("botao-ir-revisar");
const botaoIrCriar = document.getElementById("botao-ir-criar");
const botaoIrLista = document.getElementById("botao-ir-lista");

// --- tela de escolha de tipo ---
const botaoTipoBasico = document.getElementById("botao-tipo-basico");
const botaoTipoCloze = document.getElementById("botao-tipo-cloze");
const botaoTipoIA = document.getElementById("botao-tipo-ia");

// --- criação básico ---
const formNovoFlashcard = document.getElementById("form-novo-flashcard");
const campoPergunta = document.getElementById("campo-pergunta");
const campoResposta = document.getElementById("campo-resposta");
const campoMateria = document.getElementById("campo-materia");
const campoSubtopico = document.getElementById("campo-subtopico");
const campoDetalhe = document.getElementById("campo-detalhe");
const campoGerarReverso = document.getElementById("campo-gerar-reverso");
const listaMateriasBasico = document.getElementById("lista-materias-basico");
const listaSubtopicosBasico = document.getElementById("lista-subtopicos-basico");
const listaDetalhesBasico = document.getElementById("lista-detalhes-basico");

// --- criação cloze ---
const formNovoCloze = document.getElementById("form-novo-cloze");
const campoClozeTexto = document.getElementById("campo-cloze-texto");
const campoClozeDica = document.getElementById("campo-cloze-dica");
const campoClozeContexto = document.getElementById("campo-cloze-contexto");
const campoClozeMateria = document.getElementById("campo-cloze-materia");
const campoClozeSubtopico = document.getElementById("campo-cloze-subtopico");
const contadorClozeTexto = document.getElementById("contador-cloze-texto");
const contadorClozeDica = document.getElementById("contador-cloze-dica");
const contadorClozeContexto = document.getElementById("contador-cloze-contexto");
const clozeErro = document.getElementById("cloze-erro");
const botaoClozeCancelar = document.getElementById("botao-cloze-cancelar");
const botaoClozeProximo = document.getElementById("botao-cloze-proximo");
const listaMateriasCloze = document.getElementById("lista-materias-cloze");
const listaSubtopicosCloze = document.getElementById("lista-subtopicos-cloze");

const mensagemFlashcards = document.getElementById("mensagem-flashcards");
const listaFlashcards = document.getElementById("lista-flashcards");
const filtroMateriaLista = document.getElementById("filtro-materia-lista");
const campoArquivoAnki = document.getElementById("campo-arquivo-anki");
const botaoImportarAnki = document.getElementById("botao-importar-anki");
const nomeArquivoAnki = document.getElementById("nome-arquivo-anki");
const criacaoManual = document.getElementById("criacao-manual");

const botaoGerarIA = document.getElementById("botao-gerar-ia");
const criacaoIaFluxo = document.getElementById("criacao-ia-fluxo");
const iaPassoTema = document.getElementById("ia-passo-tema");
const campoTemaIA = document.getElementById("campo-tema-ia");
const botaoGerarFlashcardIA = document.getElementById("botao-gerar-flashcard-ia");
const botaoCancelarIA = document.getElementById("botao-cancelar-ia");
const iaCarregando = document.getElementById("ia-carregando");
const iaPreview = document.getElementById("ia-preview");
const previewPerguntaIA = document.getElementById("preview-pergunta-ia");
const previewRespostaIA = document.getElementById("preview-resposta-ia");
const previewMateriaIA = document.getElementById("preview-materia-ia");
const botaoSalvarIA = document.getElementById("botao-salvar-ia");
const botaoGerarOutroIA = document.getElementById("botao-gerar-outro-ia");
const iaErro = document.getElementById("ia-erro");
const iaErroTexto = document.getElementById("ia-erro-texto");
const botaoTentarManualmente = document.getElementById("botao-tentar-manualmente");

const revisaoEscolhaMetodo = document.getElementById("revisao-escolha-metodo");
const revisaoSessao = document.getElementById("revisao-sessao");
const botaoMetodoRapida = document.getElementById("botao-metodo-rapida");
const botaoMetodoVespera = document.getElementById("botao-metodo-vespera");
const botaoMetodoBaralho = document.getElementById("botao-metodo-baralho");
const vesperaMateriaPainel = document.getElementById("vespera-materia-painel");
const selectMateriaVespera = document.getElementById("select-materia-vespera");
const botaoConfirmarVespera = document.getElementById("botao-confirmar-vespera");

// --- escolher baralho (navegação hierárquica) ---
const botaoBaralhoNivelVoltar = document.getElementById("botao-baralho-nivel-voltar");
const baralhoBreadcrumb = document.getElementById("baralho-breadcrumb");
const baralhoLista = document.getElementById("baralho-lista");
const baralhoVazio = document.getElementById("baralho-vazio");
const botaoIniciarRevisaoBaralho = document.getElementById("botao-iniciar-revisao-baralho");

const badgeProgressoRevisao = document.getElementById("badge-progresso-revisao");
const revisaoCarregando = document.getElementById("revisao-carregando");
const revisaoVazia = document.getElementById("revisao-vazia");
const revisaoVaziaTitulo = document.getElementById("revisao-vazia-titulo");
const revisaoVaziaTexto = document.getElementById("revisao-vazia-texto");
const botaoCriarPrimeiroFlashcard = document.getElementById("botao-criar-primeiro-flashcard");
const flashcardsVazio = document.getElementById("flashcards-vazio");
const botaoIrCriarVazio = document.getElementById("botao-ir-criar-vazio");
const cartaoRevisao = document.getElementById("cartao-revisao");
const cartaoRevisaoFrente = document.querySelector(".cartao-revisao-frente");
const cartaoRevisaoVerso = document.querySelector(".cartao-revisao-verso");
const revisaoPergunta = document.getElementById("revisao-pergunta");
const revisaoResposta = document.getElementById("revisao-resposta");
const botaoMostrarResposta = document.getElementById("botao-mostrar-resposta");
const botoesRating = document.querySelectorAll(".botao-rating");

const pontosFracosSecao = document.getElementById("pontos-fracos");
const pontosFracosLista = document.getElementById("pontos-fracos-lista");

const statTotalFlashcards = document.getElementById("stat-total-flashcards");
const statRevisadosHoje = document.getElementById("stat-revisados-hoje");
const statStreakDias = document.getElementById("stat-streak-dias");

const NOME_ARQUIVO_ANKI_PADRAO = "Nenhum ficheiro selecionado";
const MENSAGEM_VAZIA_PADRAO = "Nenhum flashcard para revisar ainda. Crie o primeiro ao lado!";
const MENSAGEM_VAZIA_VESPERA = "Nenhum flashcard cadastrado para essa matéria ainda.";
const MENSAGEM_VAZIA_REVISAO_RAPIDA = "Nenhum flashcard vencido agora. Volte mais tarde!";
const MENSAGEM_VAZIA_BARALHO = "Nenhum flashcard nesse baralho ainda.";
const MENSAGEM_VAZIA_PONTOS_FRACOS = "Nenhum ponto fraco no momento. Continue assim!";

const TITULO_VAZIO_PADRAO = "Nada para revisar agora";
const TITULO_VAZIO_VESPERA = "Sem flashcards nessa matéria";
const TITULO_VAZIO_REVISAO_RAPIDA = "Tudo revisado por hoje";
const TITULO_VAZIO_BARALHO = "Baralho vazio";
const TITULO_VAZIO_PONTOS_FRACOS = "Sem pontos fracos";

let flashcards = [];
let logs = [];
let filaRevisao = [];
let flashcardEmRevisao = null;
let metodoRevisao = "padrao";
let materiaSelecionada = "";
let baralhoSelecionado = null;
let totalSessaoRevisao = 0;
let revisadosNaSessao = 0;
let materiaFiltroLista = "";

let nivelBaralho = 1;
let materiaBaralhoAtual = null;
let subtopicoBaralhoAtual = null;

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
    renderizarPontosFracos();
}

function renderizarPontosFracos() {
    const pontosFracos = identificarPontosFracos(flashcards, logs);
    pontosFracosSecao.hidden = pontosFracos.length === 0;
    pontosFracosLista.innerHTML = "";

    pontosFracos.forEach((flashcard) => {
        const li = document.createElement("li");

        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "ponto-fraco-item";

        const badge = document.createElement("span");
        badge.className = "ponto-fraco-badge";
        badge.textContent = "Ponto fraco";

        const pergunta = document.createElement("p");
        pergunta.className = "flashcard-pergunta";
        pergunta.textContent = flashcard.tipo === "cloze" ? ocultarLacunas(flashcard.pergunta) : flashcard.pergunta;

        const detalhes = document.createElement("div");
        detalhes.className = "ponto-fraco-detalhes";

        const caminho = document.createElement("span");
        caminho.textContent = [flashcard.materia, flashcard.subtopico, flashcard.detalhe].filter(Boolean).join(" › ") || "Sem matéria";

        const contagem = document.createElement("span");
        contagem.className = "ponto-fraco-erros";
        contagem.textContent = `Errado ${flashcard.vezesErrado}x`;

        detalhes.append(caminho, contagem);
        botao.append(badge, pergunta, detalhes);
        botao.addEventListener("click", () => tratarRevisarPontosFracos());

        li.appendChild(botao);
        pontosFracosLista.appendChild(li);
    });
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

function renderizarDatalistMateria(datalist) {
    datalist.innerHTML = "";
    listarMaterias(flashcards).forEach(({ valor }) => {
        const opcao = document.createElement("option");
        opcao.value = valor;
        datalist.appendChild(opcao);
    });
}

function renderizarDatalistSubtopico(datalist, materia) {
    datalist.innerHTML = "";
    if (!materia) return;
    listarSubtopicos(flashcards, materia).forEach(({ valor }) => {
        const opcao = document.createElement("option");
        opcao.value = valor;
        datalist.appendChild(opcao);
    });
}

function renderizarDatalistDetalhe(datalist, materia, subtopico) {
    datalist.innerHTML = "";
    if (!materia || !subtopico) return;
    listarDetalhes(flashcards, materia, subtopico).forEach(({ valor }) => {
        const opcao = document.createElement("option");
        opcao.value = valor;
        datalist.appendChild(opcao);
    });
}

function renderizarOpcoesDeMateria() {
    renderizarFiltroDeMateria(selectMateriaVespera, selectMateriaVespera.value);
    sincronizarSelectPersonalizado(selectMateriaVespera);
    renderizarFiltroDeMateria(filtroMateriaLista, materiaFiltroLista);
    renderizarDatalistMateria(listaMateriasBasico);
    renderizarDatalistMateria(listaMateriasCloze);
    renderizarDatalistSubtopico(listaSubtopicosBasico, campoMateria.value);
    renderizarDatalistDetalhe(listaDetalhesBasico, campoMateria.value, campoSubtopico.value);
    renderizarDatalistSubtopico(listaSubtopicosCloze, campoClozeMateria.value);
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
    if (metodoRevisao === "baralho") {
        return selecionarPorBaralho(flashcards, baralhoSelecionado ?? {});
    }
    if (metodoRevisao === "pontosFracos") {
        return identificarPontosFracos(flashcards, logs);
    }
    return flashcards;
}

function obterMensagemVazia() {
    if (metodoRevisao === "vesperaDeProva") return MENSAGEM_VAZIA_VESPERA;
    if (metodoRevisao === "revisaoRapida") return MENSAGEM_VAZIA_REVISAO_RAPIDA;
    if (metodoRevisao === "baralho") return MENSAGEM_VAZIA_BARALHO;
    if (metodoRevisao === "pontosFracos") return MENSAGEM_VAZIA_PONTOS_FRACOS;
    return MENSAGEM_VAZIA_PADRAO;
}

function obterTituloVazio() {
    if (metodoRevisao === "vesperaDeProva") return TITULO_VAZIO_VESPERA;
    if (metodoRevisao === "revisaoRapida") return TITULO_VAZIO_REVISAO_RAPIDA;
    if (metodoRevisao === "baralho") return TITULO_VAZIO_BARALHO;
    if (metodoRevisao === "pontosFracos") return TITULO_VAZIO_PONTOS_FRACOS;
    return TITULO_VAZIO_PADRAO;
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

/** Preenche a frente/verso do cartão de revisão, tratando Cloze de forma diferente do Básico. */
function renderizarConteudoDoCartao() {
    if (flashcardEmRevisao.tipo === "cloze") {
        revisaoPergunta.textContent = ocultarLacunas(flashcardEmRevisao.pergunta);

        revisaoResposta.innerHTML = "";
        segmentarCloze(flashcardEmRevisao.pergunta).forEach(({ texto, lacuna }) => {
            if (lacuna) {
                const destaque = document.createElement("mark");
                destaque.className = "cloze-destaque";
                destaque.textContent = texto;
                revisaoResposta.appendChild(destaque);
            } else {
                revisaoResposta.appendChild(document.createTextNode(texto));
            }
        });
        return;
    }

    revisaoPergunta.textContent = flashcardEmRevisao.pergunta;
    revisaoResposta.textContent = flashcardEmRevisao.resposta;
}

function renderizarAreaRevisao() {
    filaRevisao = calcularFilaRevisao();
    flashcardEmRevisao = filaRevisao.length > 0 ? filaRevisao[0] : null;

    if (!flashcardEmRevisao) {
        const concluida = sessaoDeRevisaoRapidaConcluidaHoje();
        revisaoVaziaTitulo.textContent = concluida ? "Sequência concluída!" : obterTituloVazio();
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
    renderizarConteudoDoCartao();
    definirEstadoFlip(false);
    atualizarBadgeProgresso();
    atualizarIntervalosRating();
}

function atualizarIntervalosRating() {
    if (!flashcardEmRevisao) return;
    const intervalos = preverIntervalosFSRS(flashcardEmRevisao);
    botoesRating.forEach((botao) => {
        const rating = Number(botao.dataset.rating);
        const intervaloEl = document.getElementById(`intervalo-rating-${rating}`);
        intervaloEl.textContent = formatarIntervaloFSRS(intervalos[rating]);
    });
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
        const { cardReverso } = await criarFlashcardComReverso(
            campoPergunta.value,
            campoResposta.value,
            campoMateria.value || null,
            {
                subtopico: campoSubtopico.value || null,
                detalhe: campoDetalhe.value || null,
                gerarReverso: campoGerarReverso.checked,
            }
        );
        pulsarSucesso(formNovoFlashcard.querySelector('button[type="submit"]'));
        formNovoFlashcard.reset();
        await carregarFlashcards();
        mostrarMensagem(
            cardReverso ? "Flashcard criado com o card reverso automático." : "Flashcard criado com sucesso."
        );
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

function atualizarContadorCaracteres(campo, contadorEl) {
    contadorEl.textContent = `${campo.value.length}/${campo.maxLength}`;
}

function limparFormClozeCorpo() {
    formNovoCloze.reset();
    atualizarContadorCaracteres(campoClozeTexto, contadorClozeTexto);
    atualizarContadorCaracteres(campoClozeDica, contadorClozeDica);
    atualizarContadorCaracteres(campoClozeContexto, contadorClozeContexto);
    clozeErro.hidden = true;
    clozeErro.textContent = "";
}

async function tratarNovoCloze(evento) {
    evento.preventDefault();

    if (!validarCloze(campoClozeTexto.value)) {
        clozeErro.textContent = "O texto precisa ter pelo menos uma lacuna, no formato {{palavra}}.";
        clozeErro.hidden = false;
        return;
    }
    clozeErro.hidden = true;

    try {
        await criarFlashcard(campoClozeTexto.value, "", campoClozeMateria.value || null, {
            tipo: "cloze",
            dica: campoClozeDica.value || null,
            contexto: campoClozeContexto.value || null,
            subtopico: campoClozeSubtopico.value || null,
        });
        pulsarSucesso(botaoClozeProximo);
        limparFormClozeCorpo();
        await carregarFlashcards();
        mostrarMensagem("Card Cloze criado com sucesso.");
        irParaEscolha();
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

// --- geração de flashcard por IA ---

function mostrarPassoTemaIA() {
    iaPassoTema.hidden = false;
    iaCarregando.hidden = true;
    iaPreview.hidden = true;
    iaErro.hidden = true;
}

function iniciarFluxoIA() {
    limparMensagem();
    criacaoIaFluxo.hidden = false;
    mostrarPassoTemaIA();
    campoTemaIA.focus();
}

function cancelarFluxoIA() {
    campoTemaIA.value = "";
    criacaoIaFluxo.hidden = true;
}

function preencherPreviewIA(flashcard) {
    previewPerguntaIA.value = flashcard.pergunta;
    previewRespostaIA.value = flashcard.resposta;
    previewMateriaIA.value = flashcard.materia;

    iaPassoTema.hidden = true;
    iaCarregando.hidden = true;
    iaErro.hidden = true;
    iaPreview.hidden = false;
}

function mostrarErroIA(mensagem) {
    iaErroTexto.textContent = mensagem;
    iaPassoTema.hidden = true;
    iaCarregando.hidden = true;
    iaPreview.hidden = true;
    iaErro.hidden = false;
}

async function tratarGerarFlashcardIA() {
    const tema = campoTemaIA.value;

    iaPassoTema.hidden = true;
    iaCarregando.hidden = false;
    iaErro.hidden = true;

    try {
        const flashcard = await gerarFlashcardIA(tema);
        preencherPreviewIA(flashcard);
    } catch (erro) {
        mostrarErroIA(erro.message);
    }
}

async function tratarSalvarFlashcardIA() {
    try {
        await criarFlashcard(previewPerguntaIA.value, previewRespostaIA.value, previewMateriaIA.value || null);
        pulsarSucesso(botaoSalvarIA);
        await carregarFlashcards();
        cancelarFluxoIA();
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

function tratarGerarOutroIA() {
    mostrarPassoTemaIA();
    campoTemaIA.focus();
}

function tratarTentarManualmente() {
    criacaoIaFluxo.hidden = true;
    campoPergunta.focus();
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

function tratarRevisarPontosFracos() {
    limparMensagem();
    metodoRevisao = "pontosFracos";
    irParaRevisaoDireta();
    iniciarSessaoDeRevisao();
}

// --- escolher baralho (navegação hierárquica) ---

function criarItemBaralho(valor, total, aoClicar) {
    const li = document.createElement("li");
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "baralho-item";

    const nome = document.createElement("span");
    nome.textContent = valor;

    const contagem = document.createElement("span");
    contagem.className = "baralho-item-contagem";
    contagem.textContent = `${total} card${total === 1 ? "" : "s"}`;

    botao.append(nome, contagem);
    botao.addEventListener("click", aoClicar);
    li.appendChild(botao);
    return li;
}

function atualizarBreadcrumb(partes) {
    baralhoBreadcrumb.innerHTML = "";
    if (partes.length === 0) {
        baralhoBreadcrumb.textContent = "Escolha sua matéria";
        return;
    }
    partes.forEach((parte, indice) => {
        if (indice > 0) baralhoBreadcrumb.appendChild(document.createTextNode(" › "));
        const elemento = document.createElement(indice === partes.length - 1 ? "strong" : "span");
        elemento.textContent = parte;
        baralhoBreadcrumb.appendChild(elemento);
    });
}

function iniciarRevisaoDoBaralho(criterio) {
    limparMensagem();
    baralhoSelecionado = criterio;
    metodoRevisao = "baralho";
    irParaRevisaoDireta();
    iniciarSessaoDeRevisao();
}

function renderizarNivelBaralho() {
    baralhoLista.innerHTML = "";
    botaoBaralhoNivelVoltar.hidden = nivelBaralho === 1;

    if (nivelBaralho === 1) {
        atualizarBreadcrumb([]);
        botaoIniciarRevisaoBaralho.hidden = true;

        const materias = listarMaterias(flashcards);
        baralhoVazio.hidden = materias.length > 0;
        materias.forEach(({ valor, total }) => {
            baralhoLista.appendChild(
                criarItemBaralho(valor, total, () => {
                    materiaBaralhoAtual = valor;
                    nivelBaralho = 2;
                    renderizarNivelBaralho();
                })
            );
        });
        return;
    }

    if (nivelBaralho === 2) {
        atualizarBreadcrumb([materiaBaralhoAtual, "Subtópicos"]);

        const totalMateria = selecionarPorBaralho(flashcards, { materia: materiaBaralhoAtual }).length;
        baralhoVazio.hidden = totalMateria > 0;
        botaoIniciarRevisaoBaralho.hidden = totalMateria === 0;
        botaoIniciarRevisaoBaralho.textContent = "Iniciar revisão desta matéria →";
        botaoIniciarRevisaoBaralho.onclick = () =>
            iniciarRevisaoDoBaralho({ materia: materiaBaralhoAtual });

        listarSubtopicos(flashcards, materiaBaralhoAtual).forEach(({ valor, total }) => {
            baralhoLista.appendChild(
                criarItemBaralho(valor, total, () => {
                    subtopicoBaralhoAtual = valor;
                    nivelBaralho = 3;
                    renderizarNivelBaralho();
                })
            );
        });
        return;
    }

    atualizarBreadcrumb([materiaBaralhoAtual, subtopicoBaralhoAtual, "Detalhes"]);

    const totalSubtopico = selecionarPorBaralho(flashcards, {
        materia: materiaBaralhoAtual,
        subtopico: subtopicoBaralhoAtual,
    }).length;
    baralhoVazio.hidden = totalSubtopico > 0;
    botaoIniciarRevisaoBaralho.hidden = totalSubtopico === 0;
    botaoIniciarRevisaoBaralho.textContent = "Iniciar revisão deste subtópico →";
    botaoIniciarRevisaoBaralho.onclick = () =>
        iniciarRevisaoDoBaralho({ materia: materiaBaralhoAtual, subtopico: subtopicoBaralhoAtual });

    listarDetalhes(flashcards, materiaBaralhoAtual, subtopicoBaralhoAtual).forEach(({ valor, total }) => {
        baralhoLista.appendChild(
            criarItemBaralho(valor, total, () =>
                iniciarRevisaoDoBaralho({
                    materia: materiaBaralhoAtual,
                    subtopico: subtopicoBaralhoAtual,
                    detalhe: valor,
                })
            )
        );
    });
}

function tratarVoltarNivelBaralho() {
    if (nivelBaralho === 3) {
        nivelBaralho = 2;
    } else if (nivelBaralho === 2) {
        nivelBaralho = 1;
    }
    renderizarNivelBaralho();
}

function tratarEscolherBaralho() {
    limparMensagem();
    nivelBaralho = 1;
    materiaBaralhoAtual = null;
    subtopicoBaralhoAtual = null;
    renderizarNivelBaralho();
    mostrarTela(TELAS.BARALHOS);
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
    botoesRating[0].focus();
}

async function tratarRevisao(rating) {
    if (!flashcardEmRevisao) return;

    try {
        await marcarRevisao(flashcardEmRevisao, rating);
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

/** Entra direto na sessão de revisão, pulando a escolha de método (usado por baralhos e pontos fracos). */
function irParaRevisaoDireta() {
    limparMensagem();
    revisaoEscolhaMetodo.hidden = true;
    vesperaMateriaPainel.hidden = true;
    revisaoSessao.hidden = false;
    mostrarTela(TELAS.REVISAO);
}

function irParaTipo() {
    limparMensagem();
    mostrarTela(TELAS.TIPO);
}

function irParaCriacaoBasica() {
    limparMensagem();
    criacaoIaFluxo.hidden = true;
    mostrarTela(TELAS.CRIACAO);
    campoPergunta.focus();
}

function irParaCriacaoCloze() {
    limparMensagem();
    limparFormClozeCorpo();
    mostrarTela(TELAS.CRIACAO_CLOZE);
    campoClozeTexto.focus();
}

function irParaCriacaoIA() {
    limparMensagem();
    mostrarTela(TELAS.CRIACAO);
    iniciarFluxoIA();
}

function irParaLista() {
    limparMensagem();
    mostrarTela(TELAS.LISTA);
}

botaoIrRevisar.addEventListener("click", irParaRevisao);
botaoIrCriar.addEventListener("click", irParaTipo);
botaoIrLista.addEventListener("click", irParaLista);
botaoCriarPrimeiroFlashcard.addEventListener("click", irParaTipo);
botaoIrCriarVazio.addEventListener("click", irParaTipo);
botoesVoltar.forEach((botao) => botao.addEventListener("click", irParaEscolha));

botaoTipoBasico.addEventListener("click", irParaCriacaoBasica);
botaoTipoCloze.addEventListener("click", irParaCriacaoCloze);
botaoTipoIA.addEventListener("click", irParaCriacaoIA);

botaoGerarIA.addEventListener("click", iniciarFluxoIA);
botaoCancelarIA.addEventListener("click", cancelarFluxoIA);
botaoGerarFlashcardIA.addEventListener("click", tratarGerarFlashcardIA);
botaoSalvarIA.addEventListener("click", tratarSalvarFlashcardIA);
botaoGerarOutroIA.addEventListener("click", tratarGerarOutroIA);
botaoTentarManualmente.addEventListener("click", tratarTentarManualmente);

formNovoFlashcard.addEventListener("submit", tratarNovoFlashcard);
campoMateria.addEventListener("input", () => {
    renderizarDatalistSubtopico(listaSubtopicosBasico, campoMateria.value);
});
campoSubtopico.addEventListener("input", () => {
    renderizarDatalistDetalhe(listaDetalhesBasico, campoMateria.value, campoSubtopico.value);
});
campoArquivoAnki.addEventListener("change", atualizarNomeArquivoAnki);
botaoImportarAnki.addEventListener("click", tratarImportarAnki);
botaoMetodoRapida.addEventListener("click", tratarModoRevisaoRapida);
botaoMetodoVespera.addEventListener("click", tratarEscolherVesperaDeProva);
botaoMetodoBaralho.addEventListener("click", tratarEscolherBaralho);
botaoConfirmarVespera.addEventListener("click", tratarConfirmarVesperaDeProva);
botaoMostrarResposta.addEventListener("click", tratarMostrarResposta);
botoesRating.forEach((botao) => {
    botao.addEventListener("click", () => tratarRevisao(Number(botao.dataset.rating)));
});
filtroMateriaLista.addEventListener("change", tratarFiltroDeMateriaNaLista);

formNovoCloze.addEventListener("submit", tratarNovoCloze);
botaoClozeCancelar.addEventListener("click", irParaTipo);
campoClozeTexto.addEventListener("input", () => atualizarContadorCaracteres(campoClozeTexto, contadorClozeTexto));
campoClozeDica.addEventListener("input", () => atualizarContadorCaracteres(campoClozeDica, contadorClozeDica));
campoClozeContexto.addEventListener("input", () => atualizarContadorCaracteres(campoClozeContexto, contadorClozeContexto));
campoClozeMateria.addEventListener("input", () => {
    renderizarDatalistSubtopico(listaSubtopicosCloze, campoClozeMateria.value);
});

botaoBaralhoNivelVoltar.addEventListener("click", tratarVoltarNivelBaralho);

async function iniciar() {
    const sessao = await protegerRota();
    if (!sessao) return;

    inicializarNotificacaoRevisao();
    inicializarUsuarioMenu();
    inicializarNavegacaoPrincipal();
    inicializarPomodoroWidget();
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
