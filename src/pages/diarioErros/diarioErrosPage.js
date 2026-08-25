import { protegerRota } from "../../services/routeGuard.js";
import { buscarPainelDiarioErros } from "../../services/diarioErrosService.js";
import { inicializarNotificacaoRevisao } from "../../components/notificacaoRevisao.js";
import { inicializarUsuarioMenu } from "../../components/usuarioMenu.js";
import { inicializarNavegacaoPrincipal } from "../../components/navegacaoPrincipal.js";
import { inicializarPomodoroWidget } from "../../components/pomodoroWidget.js";

const ROTA_POR_FERRAMENTA = {
    flashcards: "flashcards.html",
    casos_clinicos: "casos-clinicos.html",
};

const RESPOSTA_ICONE = {
    flashcards: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="13" height="15" rx="2"/><path d="M3 3h13a2 2 0 0 1 2 2v13"/></svg>',
    casos_clinicos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.5-2.5 1.5-5-3-8-4.5 3-4.5 5.5-3 8"/><path d="M4 20l6-6M20 20l-6-6"/><circle cx="12" cy="9" r="1.5"/></svg>',
};

const NOME_FERRAMENTA = {
    flashcards: "Flashcards",
    casos_clinicos: "Casos Clínicos",
};

const mensagemEl = document.getElementById("diario-mensagem");
const padroesEl = document.getElementById("diario-padroes");
const errosListaEl = document.getElementById("diario-erros-lista");
let graficoEvolucao = null;

function mostrarErro(texto) {
    mensagemEl.textContent = texto;
    mensagemEl.hidden = false;
}

function formatarDataRelativa(iso) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHoras < 1) return "agora mesmo";
    if (diffHoras < 24) return `há ${diffHoras}h`;
    const diffDias = Math.floor(diffHoras / 24);
    if (diffDias < 7) return `há ${diffDias}d`;
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function renderizarPadroes(padroes) {
    if (padroes.length === 0) {
        padroesEl.innerHTML = `
            <div class="diario-estado-vazio">
                <span class="diario-estado-vazio-icone" aria-hidden="true">🎯</span>
                <strong>Nenhum erro registrado ainda.</strong>
                <p>Continue estudando — seus pontos fracos vão aparecer aqui automaticamente.</p>
            </div>`;
        return;
    }

    padroesEl.innerHTML = padroes
        .map(
            (p) => `
        <div class="diario-padrao-card">
            <div class="diario-padrao-cabecalho">
                <span class="diario-padrao-materia">${p.materia}</span>
                <span class="diario-padrao-total">${p.total} ${p.total === 1 ? "erro" : "erros"}</span>
            </div>
            <div class="diario-padrao-barra">
                <div class="diario-padrao-barra-fill" style="width:${p.percentual}%;"></div>
            </div>
            <div class="diario-padrao-topicos">
                ${p.topicos
                    .slice(0, 5)
                    .map((t) => `<span class="diario-topico-chip">${t.topico} <strong>${t.total}</strong></span>`)
                    .join("")}
            </div>
        </div>`,
        )
        .join("");
}

function renderizarErros(erros) {
    if (erros.length === 0) {
        errosListaEl.innerHTML = `
            <div class="diario-estado-vazio">
                <span class="diario-estado-vazio-icone" aria-hidden="true">✨</span>
                <strong>Tudo limpo por aqui.</strong>
                <p>Seus últimos 20 erros vão aparecer nesta lista.</p>
            </div>`;
        return;
    }

    errosListaEl.innerHTML = erros
        .map((e, i) => {
            const rota = ROTA_POR_FERRAMENTA[e.ferramenta] ?? "home.html";
            return `
        <div class="diario-erro-item" style="animation-delay: ${Math.min(i * 0.03, 0.3)}s;">
            <div class="diario-erro-corpo">
                <div class="diario-erro-meta">
                    <span class="diario-erro-ferramenta">${RESPOSTA_ICONE[e.ferramenta] ?? ""} ${NOME_FERRAMENTA[e.ferramenta] ?? e.ferramenta}</span>
                    <span>${e.materia ?? "Sem matéria"}${e.topico ? ` · ${e.topico}` : ""}</span>
                    <span>${formatarDataRelativa(e.criado_em)}</span>
                </div>
                <p class="diario-erro-pergunta">${e.pergunta_resumo ?? "Sem detalhes"}</p>
                ${
                    e.resposta_usuario || e.resposta_correta
                        ? `<div class="diario-erro-respostas">
                            ${e.resposta_usuario ? `<span class="errada">${e.resposta_usuario}</span> → ` : ""}
                            ${e.resposta_correta ? `<span class="certa">${e.resposta_correta}</span>` : ""}
                        </div>`
                        : ""
                }
            </div>
            <a href="${rota}" class="diario-erro-revisar">Revisar</a>
        </div>`;
        })
        .join("");
}

function renderizarGraficoEvolucao(evolucao) {
    const ctx = document.getElementById("diario-grafico-evolucao");
    const labels = evolucao.map((s) => new Date(`${s.semana}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }));

    if (graficoEvolucao) graficoEvolucao.destroy();

    const gradiente = ctx.getContext("2d").createLinearGradient(0, 0, 0, 240);
    gradiente.addColorStop(0, "rgba(201, 168, 76, 0.35)");
    gradiente.addColorStop(1, "rgba(201, 168, 76, 0)");

    graficoEvolucao = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Erros por semana",
                    data: evolucao.map((s) => s.total),
                    borderColor: "#C9A84C",
                    backgroundColor: gradiente,
                    pointBackgroundColor: "#C9A84C",
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.35,
                    fill: true,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: "#8D8B88" }, grid: { color: "rgba(58, 47, 44, 0.5)" } },
                y: { ticks: { color: "#8D8B88" }, grid: { color: "rgba(58, 47, 44, 0.5)" }, beginAtZero: true, ticks: { precision: 0 } },
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "#2a1919",
                    borderColor: "#C9A84C",
                    borderWidth: 1,
                    titleColor: "#f5ede8",
                    bodyColor: "#f5ede8",
                },
            },
        },
    });
}

async function iniciar() {
    const sessao = await protegerRota();
    if (!sessao) return;

    inicializarNotificacaoRevisao();
    inicializarUsuarioMenu();
    inicializarNavegacaoPrincipal();
    inicializarPomodoroWidget();

    try {
        const { errosRecentes, padroesPorMateria, evolucaoSemanal } = await buscarPainelDiarioErros();
        renderizarPadroes(padroesPorMateria);
        renderizarErros(errosRecentes);
        renderizarGraficoEvolucao(evolucaoSemanal);
    } catch (erro) {
        mostrarErro(`Não foi possível carregar o diário de erros: ${erro.message}`);
    }
}

iniciar();
