import { protegerRota } from "../../services/routeGuard.js";
import { criarNota, listarNotas, editarNota, removerNota } from "../../services/notasService.js";
import { calcularNotaNecessaria } from "../../services/calculoNota.js";
import { criarElementoNota } from "../../components/notaCard.js";
import { inicializarNotificacaoRevisao } from "../../components/notificacaoRevisao.js";

const formNota = document.getElementById("form-nota");
const campoMateria = document.getElementById("campo-materia-nota");
const campoAvaliacao = document.getElementById("campo-avaliacao-nota");
const campoPeso = document.getElementById("campo-peso-nota");
const campoValorNota = document.getElementById("campo-valor-nota");
const mensagemNotas = document.getElementById("mensagem-notas");
const listaNotas = document.getElementById("lista-notas");
const notasVazio = document.getElementById("notas-vazio");
const notasCarregando = document.getElementById("notas-carregando");
const tituloFormNota = document.getElementById("titulo-form-nota");
const botaoSalvarNota = document.getElementById("botao-salvar-nota");
const botaoCancelarEdicao = document.getElementById("botao-cancelar-edicao-nota");

const selectMateriaCalculo = document.getElementById("select-materia-calculo");
const campoMediaNecessaria = document.getElementById("campo-media-necessaria");
const campoPesoProxima = document.getElementById("campo-peso-proxima");
const botaoCalcularNota = document.getElementById("botao-calcular-nota");
const resultadoCalculo = document.getElementById("resultado-calculo");

let notas = [];
let notaEmEdicaoId = null;

function mostrarMensagem(texto) {
    mensagemNotas.textContent = texto;
    mensagemNotas.hidden = false;
}

function limparMensagem() {
    mensagemNotas.hidden = true;
    mensagemNotas.textContent = "";
}

function entrarEmModoEdicao(nota) {
    notaEmEdicaoId = nota.id;
    campoMateria.value = nota.materia;
    campoAvaliacao.value = nota.avaliacao;
    campoPeso.value = nota.peso;
    campoValorNota.value = nota.nota;
    tituloFormNota.textContent = "Editar nota";
    botaoSalvarNota.textContent = "Salvar alterações";
    botaoCancelarEdicao.hidden = false;
}

function sairDoModoEdicao() {
    notaEmEdicaoId = null;
    formNota.reset();
    tituloFormNota.textContent = "Nova nota";
    botaoSalvarNota.textContent = "Adicionar nota";
    botaoCancelarEdicao.hidden = true;
}

function renderizarListaNotas() {
    listaNotas.innerHTML = "";
    notasVazio.hidden = notas.length > 0;

    notas.forEach((nota) => {
        const item = criarElementoNota(nota, {
            aoEditar: entrarEmModoEdicao,
            aoRemover: tratarRemover,
        });
        listaNotas.appendChild(item);
    });
}

function renderizarOpcoesDeMateria() {
    const materiaAtual = selectMateriaCalculo.value;
    const materias = [...new Set(notas.map((n) => n.materia))].sort();

    selectMateriaCalculo.innerHTML = '<option value="">Escolha a matéria...</option>';
    materias.forEach((materia) => {
        const opcao = document.createElement("option");
        opcao.value = materia;
        opcao.textContent = materia;
        selectMateriaCalculo.appendChild(opcao);
    });
    selectMateriaCalculo.value = materias.includes(materiaAtual) ? materiaAtual : "";
}

async function carregarNotas() {
    notas = await listarNotas();
    notasCarregando.hidden = true;
    renderizarListaNotas();
    renderizarOpcoesDeMateria();
}

async function tratarSalvarNota(evento) {
    evento.preventDefault();
    limparMensagem();

    const materia = campoMateria.value;
    const avaliacao = campoAvaliacao.value;
    const peso = Number(campoPeso.value);
    const nota = Number(campoValorNota.value);

    try {
        if (notaEmEdicaoId) {
            await editarNota(notaEmEdicaoId, { materia, avaliacao, peso, nota });
        } else {
            await criarNota(materia, avaliacao, peso, nota);
        }

        sairDoModoEdicao();
        await carregarNotas();
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

async function tratarRemover(id) {
    try {
        await removerNota(id);
        if (notaEmEdicaoId === id) sairDoModoEdicao();
        await carregarNotas();
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

function tratarCalcularNota() {
    const materia = selectMateriaCalculo.value;
    const mediaNecessaria = Number(campoMediaNecessaria.value);
    const pesoProximaAvaliacao = Number(campoPesoProxima.value);

    if (!materia) {
        resultadoCalculo.textContent = "Escolha uma matéria para calcular.";
        return;
    }

    const notasDaMateria = notas
        .filter((n) => n.materia === materia)
        .map((n) => ({ nota: n.nota, peso: n.peso }));

    try {
        const { notaNecessaria, jaAprovada, impossivel } = calcularNotaNecessaria(
            notasDaMateria,
            mediaNecessaria,
            pesoProximaAvaliacao
        );

        if (jaAprovada) {
            resultadoCalculo.textContent =
                "Você já garantiu a média necessária, mesmo tirando 0 na próxima avaliação!";
        } else if (impossivel) {
            resultadoCalculo.textContent =
                "Não é mais possível atingir essa média só com a próxima avaliação.";
        } else {
            resultadoCalculo.textContent = `Você precisa tirar pelo menos ${notaNecessaria} na próxima avaliação.`;
        }
    } catch (erro) {
        resultadoCalculo.textContent = erro.message;
    }
}

formNota.addEventListener("submit", tratarSalvarNota);
botaoCancelarEdicao.addEventListener("click", sairDoModoEdicao);
botaoCalcularNota.addEventListener("click", tratarCalcularNota);

async function iniciar() {
    const sessao = await protegerRota();
    if (!sessao) return;

    inicializarNotificacaoRevisao();
    await carregarNotas();
}

iniciar();
