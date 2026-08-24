import { protegerRota } from "../../services/routeGuard.js";
import {
    listarConversas,
    criarConversa,
    buscarMensagens,
    salvarMensagem,
    atualizarTituloConversa,
    atualizarMateriaConversa,
    excluirConversa,
    limparMensagensConversa,
    gerarResposta,
    formatarTimestampRelativo,
} from "../../services/chatService.js";
import { corPorMateria } from "../../services/corMateria.js";
import { inicializarNotificacaoRevisao } from "../../components/notificacaoRevisao.js";
import { inicializarUsuarioMenu } from "../../components/usuarioMenu.js";
import { inicializarNavegacaoPrincipal } from "../../components/navegacaoPrincipal.js";
import { inicializarPomodoroWidget } from "../../components/pomodoroWidget.js";
import { aplicarEntradaEscalonada } from "../../components/entradaEscalonada.js";

const MATERIAS = [
    "Farmacologia II",
    "Patologia Clínica",
    "Semiologia IV",
    "Microbiologia",
    "Parasitologia",
    "Humanidades",
];

const ALTURA_LINHA_TEXTAREA_PX = 22;
const LINHAS_MAXIMAS_TEXTAREA = 5;

const listaConversasEl = document.getElementById("chat-lista");
const listaVaziaEl = document.getElementById("chat-lista-vazio");
const buscaVaziaEl = document.getElementById("chat-lista-busca-vazia");
const campoBusca = document.getElementById("busca-conversas");
const botaoNovaConversa = document.getElementById("botao-nova-conversa");

const boasVindasEl = document.getElementById("chat-boas-vindas");
const boasVindasTitulo = document.getElementById("chat-boas-vindas-titulo");
const conversaAtivaEl = document.getElementById("chat-conversa-ativa");
const tituloConversaEl = document.getElementById("chat-titulo-conversa");
const materiaBadgeEl = document.getElementById("chat-materia-badge");
const mensagensEl = document.getElementById("chat-mensagens");

const menuBtn = document.getElementById("chat-menu-btn");
const menuOpcoes = document.getElementById("chat-menu-opcoes");

const formInput = document.getElementById("chat-input-area");
const textarea = document.getElementById("chat-textarea");
const enviarBtn = document.getElementById("chat-enviar-btn");

const materiaBtn = document.getElementById("chat-materia-btn");
const materiaOpcoesEl = document.getElementById("chat-materia-opcoes");

const CHAVE_NOME_USUARIO = "medistudy_nome_usuario";

let usuarioId = null;
let conversas = [];
let conversaAtualId = null;
let conversaAtualMateria = null;
let filtroBusca = "";
let enviandoMensagem = false;
let historicoMensagens = [];

// ---------- utilidades de renderização ----------

function escaparHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
}

function renderizarMarkdown(texto) {
    if (window.marked) {
        return window.marked.parse(texto, { breaks: true });
    }
    return `<p>${escaparHtml(texto)}</p>`;
}

function conversasFiltradas() {
    if (!filtroBusca) return conversas;
    const termo = filtroBusca.toLowerCase();
    return conversas.filter(
        (c) => c.titulo.toLowerCase().includes(termo) || (c.materia ?? "").toLowerCase().includes(termo)
    );
}

function renderizarListaConversas() {
    const lista = conversasFiltradas();
    listaConversasEl.innerHTML = "";

    const semNenhumaConversa = conversas.length === 0;
    const semResultadoBusca = !semNenhumaConversa && lista.length === 0;

    listaVaziaEl.hidden = !semNenhumaConversa;
    buscaVaziaEl.hidden = !semResultadoBusca;
    listaConversasEl.hidden = semNenhumaConversa || semResultadoBusca;

    lista.forEach((conversa) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "chat-item";
        if (conversa.id === conversaAtualId) item.classList.add("ativo");
        item.dataset.id = conversa.id;

        const titulo = document.createElement("span");
        titulo.className = "chat-item-titulo";
        titulo.textContent = conversa.titulo;

        const meta = document.createElement("span");
        meta.className = "chat-item-meta";

        const data = document.createElement("span");
        data.className = "chat-item-data";
        data.textContent = formatarTimestampRelativo(conversa.atualizado_em ?? conversa.criado_em);
        meta.appendChild(data);

        if (conversa.materia) {
            const badge = document.createElement("span");
            badge.className = "chat-item-badge";
            badge.dataset.cor = corPorMateria(conversa.materia);
            badge.textContent = conversa.materia;
            meta.appendChild(badge);
        }

        item.append(titulo, meta);
        item.addEventListener("click", () => abrirConversa(conversa.id));
        listaConversasEl.appendChild(item);
    });

    aplicarEntradaEscalonada(listaConversasEl);
}

function criarElementoMensagem(mensagem) {
    const wrapper = document.createElement("div");
    wrapper.className = `chat-mensagem chat-mensagem--${mensagem.role === "user" ? "user" : "assistant"}`;

    if (mensagem.role === "assistant") {
        const avatar = document.createElement("img");
        avatar.src = "/DraMah.png";
        avatar.alt = "Dra. Mah";
        avatar.className = "chat-mensagem-avatar avatar-dra-mah";
        wrapper.appendChild(avatar);
    }

    const corpo = document.createElement("div");
    corpo.className = "chat-mensagem-corpo";

    const conteudo = document.createElement("div");
    conteudo.className = "chat-mensagem-conteudo";
    if (mensagem.role === "assistant") {
        conteudo.innerHTML = renderizarMarkdown(mensagem.conteudo);
    } else {
        conteudo.textContent = mensagem.conteudo;
    }

    const timestamp = document.createElement("span");
    timestamp.className = "chat-mensagem-timestamp";
    timestamp.textContent = formatarTimestampRelativo(mensagem.criado_em ?? new Date().toISOString());

    corpo.append(conteudo, timestamp);
    wrapper.appendChild(corpo);
    return wrapper;
}

function scrollParaFinal() {
    mensagensEl.scrollTop = mensagensEl.scrollHeight;
}

function criarElementoLoading() {
    const wrapper = document.createElement("div");
    wrapper.className = "chat-mensagem chat-mensagem--assistant chat-mensagem--loading";
    wrapper.id = "chat-loading-temp";

    const avatarWrap = document.createElement("div");
    avatarWrap.className = "avatar-dra-mah-wrap avatar-dra-mah-wrap--pensando";

    const avatar = document.createElement("img");
    avatar.src = "/DraMah.png";
    avatar.alt = "Dra. Mah pensando";
    avatar.className = "chat-mensagem-avatar avatar-dra-mah";
    avatarWrap.appendChild(avatar);

    const corpo = document.createElement("div");
    corpo.className = "chat-mensagem-corpo";
    const loading = document.createElement("div");
    loading.className = "chat-loading";
    loading.innerHTML = "<span></span><span></span><span></span>";
    corpo.appendChild(loading);

    wrapper.append(avatarWrap, corpo);
    return wrapper;
}

// ---------- exibição da matéria / título ----------

function atualizarBadgeMateria() {
    if (conversaAtualMateria) {
        materiaBadgeEl.hidden = false;
        materiaBadgeEl.textContent = conversaAtualMateria;
        materiaBadgeEl.dataset.cor = corPorMateria(conversaAtualMateria);
    } else {
        materiaBadgeEl.hidden = true;
    }
}

function popularOpcoesMateria() {
    materiaOpcoesEl.innerHTML = "";
    MATERIAS.forEach((materia) => {
        const opcao = document.createElement("button");
        opcao.type = "button";
        opcao.textContent = materia;
        opcao.addEventListener("click", async () => {
            materiaOpcoesEl.hidden = true;
            conversaAtualMateria = materia;
            atualizarBadgeMateria();
            if (conversaAtualId) {
                await atualizarMateriaConversa(conversaAtualId, materia);
                atualizarConversaLocal(conversaAtualId, { materia });
                renderizarListaConversas();
            }
        });
        materiaOpcoesEl.appendChild(opcao);
    });
}

function atualizarConversaLocal(id, alteracoes) {
    conversas = conversas.map((c) => (c.id === id ? { ...c, ...alteracoes } : c));
}

// ---------- navegação entre telas ----------

function mostrarBoasVindas() {
    conversaAtualId = null;
    conversaAtualMateria = null;
    historicoMensagens = [];
    boasVindasEl.hidden = false;
    conversaAtivaEl.hidden = true;
    renderizarListaConversas();
}

async function abrirConversa(id) {
    conversaAtualId = id;
    const conversa = conversas.find((c) => c.id === id);
    conversaAtualMateria = conversa?.materia ?? null;

    boasVindasEl.hidden = true;
    conversaAtivaEl.hidden = false;

    tituloConversaEl.textContent = conversa?.titulo ?? "Conversa";
    atualizarBadgeMateria();
    renderizarListaConversas();

    mensagensEl.innerHTML = '<p class="estado-carregando">Carregando mensagens...</p>';
    const mensagens = await buscarMensagens(id);
    mensagensEl.innerHTML = "";
    mensagens.forEach((mensagem) => mensagensEl.appendChild(criarElementoMensagem(mensagem)));
    historicoMensagens = mensagens.map((m) => ({ role: m.role, content: m.conteudo }));
    scrollParaFinal();
    textarea.focus();
}

// ---------- envio de mensagens ----------

async function enviarMensagem(texto) {
    const textoLimpo = texto.trim();
    if (!textoLimpo || enviandoMensagem) return;

    enviandoMensagem = true;
    enviarBtn.disabled = true;

    try {
        if (!conversaAtualId) {
            const novaConversa = await criarConversa(usuarioId, textoLimpo);
            conversas = [novaConversa, ...conversas];
            conversaAtualId = novaConversa.id;
            conversaAtualMateria = null;
            historicoMensagens = [];

            boasVindasEl.hidden = true;
            conversaAtivaEl.hidden = false;
            tituloConversaEl.textContent = novaConversa.titulo;
            atualizarBadgeMateria();
            mensagensEl.innerHTML = "";
        }

        const mensagemUsuario = await salvarMensagem(conversaAtualId, "user", textoLimpo);
        mensagensEl.appendChild(criarElementoMensagem(mensagemUsuario));
        scrollParaFinal();

        atualizarConversaLocal(conversaAtualId, { atualizado_em: new Date().toISOString() });
        renderizarListaConversas();

        const loadingEl = criarElementoLoading();
        mensagensEl.appendChild(loadingEl);
        scrollParaFinal();

        try {
            const resposta = await gerarResposta(textoLimpo, historicoMensagens);

            await removerLoadingComFadeout(loadingEl);
            const mensagemAssistente = await salvarMensagem(conversaAtualId, "assistant", resposta);
            mensagensEl.appendChild(criarElementoMensagem(mensagemAssistente));
            scrollParaFinal();

            historicoMensagens = [
                ...historicoMensagens,
                { role: "user", content: textoLimpo },
                { role: "assistant", content: resposta },
            ];
        } catch (erro) {
            console.error("Falha ao obter resposta da Dra. Mah:", erro);
            await removerLoadingComFadeout(loadingEl);
            const erroEl = document.createElement("p");
            erroEl.className = "chat-erro-resposta";
            erroEl.textContent = "Não consegui responder agora. Tente de novo em instantes.";
            mensagensEl.appendChild(erroEl);
            scrollParaFinal();
        }
    } finally {
        enviandoMensagem = false;
        atualizarEstadoBotaoEnviar();
    }
}

// remove o anel dourado (transição de fadeout) antes de tirar a bolha de
// "pensando" da tela, em vez de sumir tudo de uma vez
function removerLoadingComFadeout(loadingEl) {
    const avatarWrap = loadingEl.querySelector(".avatar-dra-mah-wrap");
    avatarWrap?.classList.remove("avatar-dra-mah-wrap--pensando");
    return new Promise((resolve) => {
        setTimeout(() => {
            loadingEl.remove();
            resolve();
        }, 300);
    });
}

function atualizarEstadoBotaoEnviar() {
    enviarBtn.disabled = enviandoMensagem || textarea.value.trim().length === 0;
}

function redimensionarTextarea() {
    textarea.style.height = "auto";
    const alturaMaxima = ALTURA_LINHA_TEXTAREA_PX * LINHAS_MAXIMAS_TEXTAREA;
    textarea.style.height = `${Math.min(textarea.scrollHeight, alturaMaxima)}px`;
}

// ---------- eventos ----------

textarea.addEventListener("input", () => {
    redimensionarTextarea();
    atualizarEstadoBotaoEnviar();
});

textarea.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter" && !evento.shiftKey) {
        evento.preventDefault();
        formInput.requestSubmit();
    }
});

formInput.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const texto = textarea.value;
    textarea.value = "";
    redimensionarTextarea();
    atualizarEstadoBotaoEnviar();
    await enviarMensagem(texto);
});

document.querySelectorAll(".chat-sugestao-chip").forEach((chip) => {
    chip.addEventListener("click", async () => {
        boasVindasEl.hidden = true;
        conversaAtivaEl.hidden = false;
        await enviarMensagem(chip.textContent);
    });
});

botaoNovaConversa.addEventListener("click", () => {
    mostrarBoasVindas();
    textarea.value = "";
});

campoBusca.addEventListener("input", () => {
    filtroBusca = campoBusca.value.trim();
    renderizarListaConversas();
});

// título editável por duplo clique
tituloConversaEl.addEventListener("dblclick", () => {
    if (!conversaAtualId) return;
    iniciarEdicaoTitulo();
});

function iniciarEdicaoTitulo() {
    const tituloAtual = tituloConversaEl.textContent;
    const input = document.createElement("input");
    input.type = "text";
    input.className = "chat-titulo-conversa-input";
    input.value = tituloAtual;
    input.maxLength = 60;

    tituloConversaEl.replaceWith(input);
    input.focus();
    input.select();

    async function confirmar() {
        const novoTitulo = input.value.trim() || tituloAtual;
        input.replaceWith(tituloConversaEl);
        tituloConversaEl.textContent = novoTitulo;
        if (novoTitulo !== tituloAtual) {
            await atualizarTituloConversa(conversaAtualId, novoTitulo);
            atualizarConversaLocal(conversaAtualId, { titulo: novoTitulo });
            renderizarListaConversas();
        }
    }

    function cancelar() {
        input.replaceWith(tituloConversaEl);
    }

    input.addEventListener("keydown", (evento) => {
        if (evento.key === "Enter") {
            evento.preventDefault();
            confirmar();
        } else if (evento.key === "Escape") {
            evento.preventDefault();
            cancelar();
        }
    });

    input.addEventListener("blur", confirmar);
}

// menu ⋮ (renomear / limpar / excluir)
menuBtn.addEventListener("click", (evento) => {
    evento.stopPropagation();
    const abrir = menuOpcoes.hidden;
    menuOpcoes.hidden = !abrir;
    menuBtn.setAttribute("aria-expanded", String(abrir));
});

document.addEventListener("click", (evento) => {
    if (!menuOpcoes.hidden && !menuOpcoes.contains(evento.target) && evento.target !== menuBtn) {
        menuOpcoes.hidden = true;
        menuBtn.setAttribute("aria-expanded", "false");
    }
    if (!materiaOpcoesEl.hidden && !materiaOpcoesEl.contains(evento.target) && evento.target !== materiaBtn) {
        materiaOpcoesEl.hidden = true;
    }
});

document.addEventListener("keydown", (evento) => {
    if (evento.key !== "Escape") return;
    if (!menuOpcoes.hidden) {
        menuOpcoes.hidden = true;
        menuBtn.setAttribute("aria-expanded", "false");
    }
    materiaOpcoesEl.hidden = true;
});

menuOpcoes.addEventListener("click", async (evento) => {
    const acao = evento.target?.dataset?.acao;
    if (!acao || !conversaAtualId) return;
    menuOpcoes.hidden = true;

    if (acao === "renomear") {
        iniciarEdicaoTitulo();
    } else if (acao === "limpar") {
        if (window.confirm("Limpar todas as mensagens desta conversa?")) {
            await limparMensagensConversa(conversaAtualId);
            mensagensEl.innerHTML = "";
        }
    } else if (acao === "excluir") {
        if (window.confirm("Excluir esta conversa permanentemente?")) {
            await excluirConversa(conversaAtualId);
            conversas = conversas.filter((c) => c.id !== conversaAtualId);
            mostrarBoasVindas();
        }
    }
});

materiaBtn.addEventListener("click", (evento) => {
    evento.stopPropagation();
    materiaOpcoesEl.hidden = !materiaOpcoesEl.hidden;
});

// ---------- inicialização ----------

async function iniciar() {
    const sessao = await protegerRota();
    if (!sessao) return;

    usuarioId = sessao.user.id;
    const nome = localStorage.getItem(CHAVE_NOME_USUARIO);
    boasVindasTitulo.textContent = nome
        ? `Olá, ${nome}! Como posso te ajudar hoje?`
        : "Olá! Como posso te ajudar hoje?";

    inicializarNotificacaoRevisao();
    inicializarUsuarioMenu();
    inicializarNavegacaoPrincipal();
    inicializarPomodoroWidget();
    popularOpcoesMateria();

    conversas = await listarConversas(usuarioId);
    renderizarListaConversas();
}

iniciar();
