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

const CHAVE_NOME_USUARIO = "medistudy_nome_usuario";
const elSaudacao = document.getElementById("saudacao-texto");
const elTaxaAcerto = document.getElementById("estatistica-taxa-acerto");
const elRevisoes = document.getElementById("estatistica-revisoes");
const elARevisar = document.getElementById("estatistica-a-revisar");
const elProvasSemana = document.getElementById("estatistica-provas-semana");

const elProgressoAnel = document.getElementById("progresso-semanal-anel-valor");
const elProgressoPercentual = document.getElementById("progresso-semanal-percentual");
const CIRCUNFERENCIA_ANEL = 163.4; // 2 * PI * r(26), ver .progresso-semanal-anel-progresso

// o Supabase Auth não tem full_name preenchido pras contas atuais (nem a de
// teste), então o nome de exibição por enquanto vem do localStorage — a
// página de perfil (tarefa futura) é quem vai pedir e salvar esse valor.
// Sem nome salvo ainda, mostra só "Olá" (nunca email ou prefixo de email).
// IMPORTANTE: localStorage é a fonte da verdade absoluta pra saudação — essa
// função não lê sessao.user/Auth em nenhuma hipótese, então não existe
// condição de corrida possível entre os dois.
function exibirSaudacao() {
    if (!elSaudacao) return;

    const nome = localStorage.getItem(CHAVE_NOME_USUARIO);
    console.log("[saudacao] valor lido de localStorage:", CHAVE_NOME_USUARIO, "=", nome);

    elSaudacao.textContent = nome ? `Boa noite, ${nome} 🌙` : "Olá";
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

    exibirSaudacao();
    inicializarNotificacaoRevisao();
    inicializarUsuarioMenu();
    inicializarNavegacaoPrincipal();
    inicializarPomodoroWidget();
    inicializarCarrosselFerramentas();
    await carregarEstatisticas();
    await inicializarCarrosselProvas();
}

iniciar();
