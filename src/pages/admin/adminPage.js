import { protegerRota } from "../../services/routeGuard.js";
import { supabaseAdmin } from "../../services/supabaseAdminClient.js";
import {
    buscarUsoPorProvedor,
    buscarChamadasPorDia,
    buscarUsuarias,
    buscarUltimosErros,
} from "../../services/adminService.js";

// user_id da conta de admin — sem sistema de roles, ver TODO em
// supabaseAdminClient.js sobre mover isso pra uma Edge Function autenticada.
const ADMIN_USER_ID = "efe4e863-0ea1-4a0f-9656-f58e6f81d60d";

const bloqueadoEl = document.getElementById("admin-bloqueado");
const conteudoEl = document.getElementById("admin-conteudo");
const cardsProvedorEl = document.getElementById("admin-cards-provedor");
const tabelaUsuariasEl = document.getElementById("admin-tabela-usuarias");
const listaErrosEl = document.getElementById("admin-lista-erros");
const botaoAtualizarErros = document.getElementById("admin-botao-atualizar-erros");
let graficoChamadas = null;

function formatarData(iso) {
    if (!iso) return "Nunca";
    return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function renderizarCardsProvedor(dados) {
    if (dados.length === 0) {
        cardsProvedorEl.innerHTML = '<p class="admin-estado-vazio">Nenhuma chamada registrada nas últimas 24h.</p>';
        return;
    }

    cardsProvedorEl.innerHTML = dados
        .map(
            (p) => `
        <div class="admin-card">
            <h3 class="admin-card-provedor-nome">${p.provedor}</h3>
            <div class="admin-card-linha"><span>Chamadas</span><strong>${p.total}</strong></div>
            <div class="admin-card-linha"><span>Taxa de sucesso</span><strong class="${p.taxaSucesso >= 90 ? "admin-card-taxa-boa" : "admin-card-taxa-ruim"}">${p.taxaSucesso}%</strong></div>
            <div class="admin-card-linha"><span>Última chamada</span><strong>${formatarData(p.ultimaChamada)}</strong></div>
        </div>`,
        )
        .join("");
}

function renderizarGraficoChamadas(dados) {
    const ctx = document.getElementById("admin-grafico-chamadas");
    const labels = dados.map((d) => new Date(d.dia).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }));

    if (graficoChamadas) graficoChamadas.destroy();

    graficoChamadas = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Chamadas",
                    data: dados.map((d) => d.total),
                    borderColor: "#C9A84C",
                    backgroundColor: "rgba(201, 168, 76, 0.15)",
                    tension: 0.3,
                    fill: true,
                },
                {
                    label: "Erros",
                    data: dados.map((d) => d.erros),
                    borderColor: "#ff8080",
                    backgroundColor: "rgba(255, 128, 128, 0.1)",
                    tension: 0.3,
                    fill: true,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: "#C7C2B8" }, grid: { color: "#3A2F2C" } },
                y: { ticks: { color: "#C7C2B8" }, grid: { color: "#3A2F2C" }, beginAtZero: true },
            },
            plugins: {
                legend: { labels: { color: "#f5ede8" } },
            },
        },
    });
}

function renderizarTabelaUsuarias(usuarias) {
    if (usuarias.length === 0) {
        tabelaUsuariasEl.innerHTML = '<tr><td colspan="5" class="admin-estado-vazio">Nenhuma usuária encontrada.</td></tr>';
        return;
    }

    tabelaUsuariasEl.innerHTML = usuarias
        .map(
            (u) => `
        <tr>
            <td>${u.email}</td>
            <td>${u.totalMensagens}</td>
            <td>${u.totalCasos}</td>
            <td>${u.totalFlashcards}</td>
            <td>${formatarData(u.ultimoAcesso)}</td>
        </tr>`,
        )
        .join("");
}

function renderizarErros(erros) {
    if (erros.length === 0) {
        listaErrosEl.innerHTML = '<p class="admin-estado-vazio">Nenhum erro registrado.</p>';
        return;
    }

    listaErrosEl.innerHTML = erros
        .map(
            (e) => `
        <div class="admin-erro-item">
            <div class="admin-erro-cabecalho">
                <span><span class="admin-erro-provedor">${e.provedor}</span> · ${e.funcionalidade}</span>
                <span>${formatarData(e.criado_em)}</span>
            </div>
            <div class="admin-erro-mensagem">${e.erro_mensagem ?? "Sem detalhes"}</div>
        </div>`,
        )
        .join("");
}

async function carregarErros() {
    const erros = await buscarUltimosErros(supabaseAdmin, 20);
    renderizarErros(erros);
}

async function carregarPainel() {
    const [usoPorProvedor, chamadasPorDia, usuarias] = await Promise.all([
        buscarUsoPorProvedor(supabaseAdmin),
        buscarChamadasPorDia(supabaseAdmin),
        buscarUsuarias(supabaseAdmin),
    ]);

    renderizarCardsProvedor(usoPorProvedor);
    renderizarGraficoChamadas(chamadasPorDia);
    renderizarTabelaUsuarias(usuarias);
    await carregarErros();
}

async function iniciar() {
    const sessao = await protegerRota();
    if (!sessao || sessao.user.id !== ADMIN_USER_ID) {
        bloqueadoEl.hidden = false;
        return;
    }

    conteudoEl.hidden = false;
    botaoAtualizarErros.addEventListener("click", carregarErros);
    await carregarPainel();
}

iniciar();
