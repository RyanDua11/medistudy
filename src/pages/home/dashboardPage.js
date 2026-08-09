import { protegerRota } from "../../services/routeGuard.js";
import { listarFlashcards } from "../../services/flashcardsService.js";
import { listarProvas } from "../../services/provasService.js";
import {
    calcularTaxaDeAcerto,
    calcularRevisoesFeitas,
    calcularFlashcardsARevisar,
    calcularProvasProximos7Dias,
} from "../../services/estatisticas.js";

const spanNomeUsuario = document.getElementById("nome-usuario-saudacao");
const elTaxaAcerto = document.getElementById("estatistica-taxa-acerto");
const elRevisoes = document.getElementById("estatistica-revisoes");
const elARevisar = document.getElementById("estatistica-a-revisar");
const elProvasSemana = document.getElementById("estatistica-provas-semana");

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

async function iniciar() {
    const sessao = await protegerRota();
    if (!sessao) return;

    exibirSaudacao(sessao.user.email);
    await carregarEstatisticas();
}

iniciar();
