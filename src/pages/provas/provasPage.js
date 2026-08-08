import { protegerRota } from "../../services/routeGuard.js";
import { criarProva, listarProvas, editarProva, removerProva } from "../../services/provasService.js";
import { criarElementoProva } from "../../components/provaCard.js";

const formProva = document.getElementById("form-prova");
const campoMateria = document.getElementById("campo-materia-prova");
const campoData = document.getElementById("campo-data-prova");
const campoNotaNecessaria = document.getElementById("campo-nota-necessaria-prova");
const mensagemProvas = document.getElementById("mensagem-provas");
const listaProvas = document.getElementById("lista-provas");
const provasVazio = document.getElementById("provas-vazio");
const tituloFormProva = document.getElementById("titulo-form-prova");
const botaoSalvarProva = document.getElementById("botao-salvar-prova");
const botaoCancelarEdicao = document.getElementById("botao-cancelar-edicao-prova");

let provaEmEdicaoId = null;

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
}

async function carregarProvas() {
    const provas = await listarProvas();
    renderizarListaProvas(provas);
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

formProva.addEventListener("submit", tratarSalvarProva);
botaoCancelarEdicao.addEventListener("click", sairDoModoEdicao);

async function iniciar() {
    const sessao = await protegerRota();
    if (!sessao) return;

    await carregarProvas();
}

iniciar();
