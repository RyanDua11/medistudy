import { protegerRota } from "../../services/routeGuard.js";
import { listarFlashcards } from "../../services/flashcardsService.js";
import { listarProvas } from "../../services/provasService.js";
import { listarNotas } from "../../services/notasService.js";
import {
    calcularTaxaDeAcerto,
    calcularRevisoesFeitas,
    calcularFlashcardsARevisar,
    calcularProvasProximos7Dias,
    agruparNotasPorMateria,
    calcularFlashcardsCriadosAcumulados,
} from "../../services/estatisticas.js";
import { criarGraficoLinha } from "../../components/graficoLinha.js";
import { inicializarNotificacaoRevisao } from "../../components/notificacaoRevisao.js";

const spanNomeUsuario = document.getElementById("nome-usuario-saudacao");
const elTaxaAcerto = document.getElementById("estatistica-taxa-acerto");
const elRevisoes = document.getElementById("estatistica-revisoes");
const elARevisar = document.getElementById("estatistica-a-revisar");
const elProvasSemana = document.getElementById("estatistica-provas-semana");

const elGraficoNotas = document.getElementById("grafico-notas");
const elGraficoNotasVazio = document.getElementById("grafico-notas-vazio");
const elGraficoFlashcards = document.getElementById("grafico-flashcards");
const elGraficoFlashcardsVazio = document.getElementById("grafico-flashcards-vazio");

function exibirSaudacao(email) {
    if (spanNomeUsuario) {
        spanNomeUsuario.textContent = email;
    }
}

async function carregarEstatisticas() {
    const [flashcards, provas] = await Promise.all([listarFlashcards(), listarProvas()]);

    elTaxaAcerto.textContent = `${calcularTaxaDeAcerto(flashcards)}%`;
    elRevisoes.textContent = calcularRevisoesFeitas(flashcards);
    elARevisar.textContent = calcularFlashcardsARevisar(flashcards);
    elProvasSemana.textContent = calcularProvasProximos7Dias(provas);
}

function renderizarGraficoOuVazio(container, elementoVazio, series) {
    const temDados = series.some((serie) => serie.pontos.length > 0);
    elementoVazio.hidden = temDados;
    container.hidden = !temDados;
    if (temDados) criarGraficoLinha(container, series);
}

async function carregarEvolucao() {
    const [notas, flashcards] = await Promise.all([listarNotas(), listarFlashcards()]);

    const seriesNotas = agruparNotasPorMateria(notas).map((serie) => ({
        nome: serie.materia,
        pontos: serie.pontos.map((p) => ({ data: p.data, valor: p.nota })),
    }));
    renderizarGraficoOuVazio(elGraficoNotas, elGraficoNotasVazio, seriesNotas);

    const pontosFlashcards = calcularFlashcardsCriadosAcumulados(flashcards).map((p) => ({
        data: p.data,
        valor: p.total,
    }));
    renderizarGraficoOuVazio(elGraficoFlashcards, elGraficoFlashcardsVazio, [
        { nome: "Flashcards criados", pontos: pontosFlashcards },
    ]);
}

async function iniciar() {
    const sessao = await protegerRota();
    if (!sessao) return;

    exibirSaudacao(sessao.user.email);
    inicializarNotificacaoRevisao();
    await carregarEstatisticas();
    await carregarEvolucao();
}

iniciar();
