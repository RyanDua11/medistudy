import { protegerRota } from "../../services/routeGuard.js";
import { listarFlashcards, listarLogRevisoes } from "../../services/flashcardsService.js";
import { listarProvas } from "../../services/provasService.js";
import {
    calcularTaxaDeAcerto,
    calcularRevisoesFeitas,
    calcularFlashcardsARevisar,
    calcularProvasProximos7Dias,
    calcularProgressoGeral,
} from "../../services/estatisticas.js";
import { inicializarNotificacaoRevisao } from "../../components/notificacaoRevisao.js";
import { inicializarUsuarioMenu } from "../../components/usuarioMenu.js";
import { inicializarNavegacaoPrincipal } from "../../components/navegacaoPrincipal.js";
import { inicializarPomodoroWidget } from "../../components/pomodoroWidget.js";
import { inicializarCarrosselProvas } from "../../components/carrosselProvas.js";
import { inicializarCarrosselFerramentas } from "../../components/carrosselFerramentas.js";

const spanNomeUsuario = document.getElementById("nome-usuario-saudacao");
const elTaxaAcerto = document.getElementById("estatistica-taxa-acerto");
const elRevisoes = document.getElementById("estatistica-revisoes");
const elARevisar = document.getElementById("estatistica-a-revisar");
const elProvasSemana = document.getElementById("estatistica-provas-semana");

const elProgressoAnel = document.getElementById("progresso-semanal-anel-valor");
const elProgressoPercentual = document.getElementById("progresso-semanal-percentual");
const CIRCUNFERENCIA_ANEL = 163.4; // 2 * PI * r(26), ver .progresso-semanal-anel-progresso

// nome vem do user_metadata.full_name do Supabase Auth; sem esse campo, cai
// pra parte antes do @ do email — nunca expõe o email completo na saudação
function primeiroNome(usuario) {
    const nomeCompleto = usuario.user_metadata?.full_name || usuario.email?.split("@")[0] || "";
    return nomeCompleto.trim().split(/\s+/)[0] || "";
}

function exibirSaudacao(usuario) {
    if (spanNomeUsuario) {
        spanNomeUsuario.textContent = primeiroNome(usuario);
    }
}

async function carregarEstatisticas() {
    const [flashcards, provas, logs] = await Promise.all([
        listarFlashcards(),
        listarProvas(),
        listarLogRevisoes(),
    ]);

    elTaxaAcerto.textContent = `${calcularTaxaDeAcerto(flashcards)}%`;
    elRevisoes.textContent = calcularRevisoesFeitas(flashcards);
    elARevisar.textContent = calcularFlashcardsARevisar(flashcards);
    elProvasSemana.textContent = calcularProvasProximos7Dias(provas);

    const progresso = calcularProgressoGeral(flashcards, logs);
    if (elProgressoAnel) {
        elProgressoAnel.style.strokeDashoffset = CIRCUNFERENCIA_ANEL * (1 - progresso / 100);
    }
    if (elProgressoPercentual) {
        elProgressoPercentual.textContent = `${progresso}%`;
    }
}

// gráficos "Notas por matéria" e "Flashcards criados" foram movidos pra
// página de perfil — a seção #evolucao ficou comentada em home.html

async function iniciar() {
    const sessao = await protegerRota();
    if (!sessao) return;

    exibirSaudacao(sessao.user);
    inicializarNotificacaoRevisao();
    inicializarUsuarioMenu();
    inicializarNavegacaoPrincipal();
    inicializarPomodoroWidget();
    inicializarCarrosselFerramentas();
    await carregarEstatisticas();
    await inicializarCarrosselProvas();
}

iniciar();
