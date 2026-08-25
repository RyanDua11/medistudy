import { protegerRota } from "../../services/routeGuard.js";
import { supabase } from "../../services/supabaseClient.js";
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

// Cor fixa por nome de provedor (não por índice/ordem) pra não mudar de
// cor a cada reload conforme o ranking por volume muda. Evita verde/
// vermelho de propósito — essas ficam reservadas pro status (operacional/
// falhando) em vez de identidade do provedor.
const CORES_PROVEDOR = {
    Groq: "#C9A84C",
    Gemini: "#7C3AED",
    Cerebras: "#F97316",
    OpenRouter: "#94A3B8",
    Mistral: "#A78BFA",
    SambaNova: "#60A5FA",
    DeepSeek: "#C084FC",
    HuggingFace: "#2DD4BF",
};
const COR_PROVEDOR_PADRAO = "#94A3B8";

const ICONE_RAIO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>';
const ICONE_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>';
const ICONE_RELOGIO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
const ICONE_TRIANGULO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>';
const ICONE_USUARIOS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
const ICONE_ESCUDO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
const ICONE_TOKENS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M8.5 9.5c0-1.5 1.5-2.5 3.5-2.5s3.5 1 3.5 2.5-1.5 2-3.5 2.5-3.5 1-3.5 2.5 1.5 2.5 3.5 2.5 3.5-1 3.5-2.5"/></svg>';

const bloqueadoEl = document.getElementById("admin-bloqueado");
const conteudoEl = document.getElementById("admin-conteudo");
const kpisEl = document.getElementById("admin-kpis");
const cardsProvedorEl = document.getElementById("admin-cards-provedor");
const tabelaUsuariasEl = document.getElementById("admin-tabela-usuarias");
const listaErrosEl = document.getElementById("admin-lista-erros");
const botaoAtualizarErros = document.getElementById("admin-botao-atualizar-erros");
const botaoTestarProvedores = document.getElementById("admin-botao-testar-provedores");
const relogioEl = document.getElementById("admin-relogio");
let graficoChamadas = null;

function formatarData(iso) {
    if (!iso) return "Nunca";
    return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function iniciarRelogio() {
    const atualizar = () => {
        relogioEl.textContent = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    };
    atualizar();
    setInterval(atualizar, 1000);
}

function classeTaxa(taxa) {
    if (taxa >= 90) return "admin-card-taxa-boa";
    if (taxa >= 50) return "admin-card-taxa-media";
    return "admin-card-taxa-ruim";
}

function corTaxa(taxa) {
    if (taxa >= 90) return "var(--admin-green)";
    if (taxa >= 50) return "var(--admin-orange)";
    return "var(--admin-red)";
}

/** Classifica o status operacional de um provedor a partir da taxa de sucesso nas últimas 24h. */
function statusProvedor(p) {
    if (p.taxaSucesso === null) return { rotulo: "Sem dados", cor: "var(--admin-silver)", bg: "rgba(148, 163, 184, 0.14)" };
    if (p.taxaSucesso >= 90) return { rotulo: "Operacional", cor: "var(--admin-green)", bg: "rgba(16, 185, 129, 0.14)" };
    if (p.taxaSucesso >= 50) return { rotulo: "Instável", cor: "var(--admin-orange)", bg: "rgba(249, 115, 22, 0.14)" };
    return { rotulo: "Falhando", cor: "var(--admin-red)", bg: "rgba(239, 68, 68, 0.16)" };
}

function formatarTokens(n) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
}

function renderizarKpis(usoPorProvedor, usuarias, chamadasPorDia) {
    const totalChamadas = usoPorProvedor.reduce((soma, p) => soma + p.total, 0);
    const totalErros = usoPorProvedor.reduce((soma, p) => soma + p.erros, 0);
    const totalTokens = usoPorProvedor.reduce((soma, p) => soma + p.tokensInput + p.tokensOutput, 0);
    const taxaGlobal = totalChamadas === 0 ? 100 : Math.round(((totalChamadas - totalErros) / totalChamadas) * 100);
    const usuariasAtivas = usuarias.filter((u) => u.totalMensagens + u.totalCasos + u.totalFlashcards > 0).length;
    const chamadasHoje = chamadasPorDia.at(-1)?.total ?? 0;

    const kpis = [
        { rotulo: "Chamadas (24h)", valor: totalChamadas, icone: ICONE_RAIO, cor: "var(--admin-gold)", bg: "rgba(201, 168, 76, 0.14)" },
        { rotulo: "Taxa de sucesso", valor: `${taxaGlobal}%`, icone: ICONE_ESCUDO, cor: corTaxa(taxaGlobal), bg: `${corTaxa(taxaGlobal)}22` },
        { rotulo: "Tokens (24h)", valor: formatarTokens(totalTokens), icone: ICONE_TOKENS, cor: "var(--admin-purple)", bg: "rgba(124, 58, 237, 0.14)" },
        { rotulo: "Usuárias ativas", valor: `${usuariasAtivas} <small>/ ${usuarias.length}</small>`, icone: ICONE_USUARIOS, cor: "var(--admin-purple-soft)", bg: "rgba(124, 58, 237, 0.16)" },
        { rotulo: "Erros hoje", valor: chamadasHoje ? chamadasPorDia.at(-1)?.erros ?? 0 : 0, icone: ICONE_TRIANGULO, cor: "var(--admin-red)", bg: "rgba(239, 68, 68, 0.14)" },
    ];

    kpisEl.innerHTML = kpis
        .map(
            (k) => `
        <div class="admin-kpi">
            <div class="admin-kpi-topo">
                <span class="admin-kpi-rotulo">${k.rotulo}</span>
                <span class="admin-kpi-icone" style="background:${k.bg}; color:${k.cor};">${k.icone}</span>
            </div>
            <div class="admin-kpi-valor" style="color:${k.cor};">${k.valor}</div>
        </div>`,
        )
        .join("");
}

function renderizarResumoStatus(dados) {
    const resumoEl = document.getElementById("admin-resumo-status");
    if (!resumoEl) return;

    const contagem = { Operacional: 0, Instável: 0, Falhando: 0, "Sem dados": 0 };
    dados.forEach((p) => (contagem[statusProvedor(p).rotulo] += 1));

    const cores = {
        Operacional: "var(--admin-green)",
        Instável: "var(--admin-orange)",
        Falhando: "var(--admin-red)",
        "Sem dados": "var(--admin-silver)",
    };

    resumoEl.innerHTML = Object.entries(contagem)
        .filter(([, qtd]) => qtd > 0)
        .map(([rotulo, qtd]) => `<span class="admin-resumo-item"><span class="admin-resumo-dot" style="background:${cores[rotulo]};"></span>${qtd} ${rotulo.toLowerCase()}</span>`)
        .join("");
}

function renderizarCardsProvedor(dados) {
    renderizarResumoStatus(dados);

    if (dados.length === 0) {
        cardsProvedorEl.innerHTML = '<div class="admin-estado-vazio"><span class="admin-estado-vazio-icone">🌌</span>Nenhuma chamada registrada nas últimas 24h.</div>';
        return;
    }

    cardsProvedorEl.innerHTML = dados
        .map((p) => {
            const cor = CORES_PROVEDOR[p.provedor] ?? COR_PROVEDOR_PADRAO;
            const status = statusProvedor(p);
            const semDados = p.taxaSucesso === null;

            return `
        <div class="admin-card ${semDados ? "admin-card-sem-dados" : ""}">
            <div class="admin-card-provedor-topo">
                <span class="admin-card-provedor-dot" style="background:${cor}; color:${cor};"></span>
                <h3 class="admin-card-provedor-nome">${p.provedor}</h3>
                <span class="admin-status-badge" style="color:${status.cor}; background:${status.bg};">${status.rotulo}</span>
            </div>

            <div class="admin-card-linha">
                <span class="admin-card-linha-rotulo">${ICONE_RAIO} Chamadas</span>
                <strong>${p.total}</strong>
            </div>

            <div class="admin-card-divisor"></div>

            <div class="admin-card-linha">
                <span class="admin-card-linha-rotulo">${ICONE_CHECK} Sucesso</span>
                <strong class="${semDados ? "" : classeTaxa(p.taxaSucesso)}">${semDados ? "—" : `${p.taxaSucesso}%`}</strong>
            </div>
            <div class="admin-barra-taxa">
                <div class="admin-barra-taxa-fill" style="width:${semDados ? 0 : p.taxaSucesso}%; background:${semDados ? "transparent" : corTaxa(p.taxaSucesso)};"></div>
            </div>

            <div class="admin-card-divisor"></div>

            <div class="admin-card-linha">
                <span class="admin-card-linha-rotulo">${ICONE_TOKENS} Tokens (ent./saí.)</span>
                <strong>${formatarTokens(p.tokensInput)} / ${formatarTokens(p.tokensOutput)}</strong>
            </div>

            <div class="admin-card-linha">
                <span class="admin-card-linha-rotulo">${ICONE_RELOGIO} Última chamada</span>
                <strong>${formatarData(p.ultimaChamada)}</strong>
            </div>
        </div>`;
        })
        .join("");
}

function textoCorTooltip(ctx, cor) {
    const el = document.createElement("span");
    el.className = "admin-tooltip-cosmica-dot";
    el.style.background = cor;
    return el.outerHTML;
}

function criarHandlerTooltipCosmica(container) {
    let tooltipEl = container.querySelector(".admin-tooltip-cosmica");
    if (!tooltipEl) {
        tooltipEl = document.createElement("div");
        tooltipEl.className = "admin-tooltip-cosmica";
        container.appendChild(tooltipEl);
    }

    return (contexto) => {
        const { tooltip } = contexto;

        if (tooltip.opacity === 0) {
            tooltipEl.style.opacity = "0";
            return;
        }

        const titulo = tooltip.title?.[0] ?? "";
        const linhas = tooltip.dataPoints
            .map((ponto) => {
                const cor = ponto.dataset.borderColor;
                return `<div class="admin-tooltip-cosmica-linha"><span>${textoCorTooltip(ponto, cor)}${ponto.dataset.label}</span><strong>${ponto.formattedValue}</strong></div>`;
            })
            .join("");

        tooltipEl.innerHTML = `<div class="admin-tooltip-cosmica-titulo">${titulo}</div>${linhas}`;

        const { offsetLeft, offsetTop } = contexto.chart.canvas;
        tooltipEl.style.opacity = "1";
        tooltipEl.style.left = `${offsetLeft + tooltip.caretX}px`;
        tooltipEl.style.top = `${offsetTop + tooltip.caretY}px`;
    };
}

function renderizarGraficoChamadas(dados) {
    const ctx = document.getElementById("admin-grafico-chamadas");
    const container = ctx.closest(".admin-grafico-container");
    const labels = dados.map((d) => new Date(d.dia).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }));

    if (graficoChamadas) graficoChamadas.destroy();

    const gradienteChamadas = ctx.getContext("2d").createLinearGradient(0, 0, 0, 260);
    gradienteChamadas.addColorStop(0, "rgba(201, 168, 76, 0.35)");
    gradienteChamadas.addColorStop(1, "rgba(201, 168, 76, 0)");

    const gradienteErros = ctx.getContext("2d").createLinearGradient(0, 0, 0, 260);
    gradienteErros.addColorStop(0, "rgba(239, 68, 68, 0.28)");
    gradienteErros.addColorStop(1, "rgba(239, 68, 68, 0)");

    graficoChamadas = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Chamadas",
                    data: dados.map((d) => d.total),
                    borderColor: "#C9A84C",
                    backgroundColor: gradienteChamadas,
                    pointBackgroundColor: "#C9A84C",
                    pointBorderColor: "#0a0a12",
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.35,
                    fill: true,
                },
                {
                    label: "Erros",
                    data: dados.map((d) => d.erros),
                    borderColor: "#EF4444",
                    backgroundColor: gradienteErros,
                    pointBackgroundColor: "#EF4444",
                    pointBorderColor: "#0a0a12",
                    pointBorderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    tension: 0.35,
                    fill: true,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            scales: {
                x: { ticks: { color: "#8b87a3", font: { family: "JetBrains Mono", size: 11 } }, grid: { color: "rgba(45, 31, 94, 0.35)" } },
                y: { ticks: { color: "#8b87a3", font: { family: "JetBrains Mono", size: 11 } }, grid: { color: "rgba(45, 31, 94, 0.35)" }, beginAtZero: true },
            },
            plugins: {
                legend: {
                    labels: { color: "#f2f0f8", usePointStyle: true, pointStyle: "circle", font: { family: "Work Sans", size: 12 } },
                },
                tooltip: {
                    enabled: false,
                    external: criarHandlerTooltipCosmica(container),
                },
            },
        },
    });
}

function iniciais(email) {
    return (email ?? "?").slice(0, 2).toUpperCase();
}

function renderizarTabelaUsuarias(usuarias) {
    if (usuarias.length === 0) {
        tabelaUsuariasEl.innerHTML = '<tr><td colspan="6" class="admin-estado-vazio"><span class="admin-estado-vazio-icone">👤</span>Nenhuma usuária encontrada.</td></tr>';
        return;
    }

    const maiorEngajamento = Math.max(...usuarias.map((u) => u.totalMensagens + u.totalCasos + u.totalFlashcards), 1);
    const idMaisAtiva = [...usuarias].sort(
        (a, b) => b.totalMensagens + b.totalCasos + b.totalFlashcards - (a.totalMensagens + a.totalCasos + a.totalFlashcards),
    )[0]?.id;

    tabelaUsuariasEl.innerHTML = usuarias
        .map((u) => {
            const total = u.totalMensagens + u.totalCasos + u.totalFlashcards;
            const percentual = Math.round((total / maiorEngajamento) * 100);
            return `
        <tr>
            <td>
                <div class="admin-usuaria-info">
                    <span class="admin-usuaria-avatar">${iniciais(u.email)}</span>
                    <span>${u.email}${u.id === idMaisAtiva && total > 0 ? '<span class="admin-badge-top">★ top</span>' : ""}</span>
                </div>
            </td>
            <td>${u.totalMensagens}</td>
            <td>${u.totalCasos}</td>
            <td>${u.totalFlashcards}</td>
            <td>
                <span class="admin-engajamento-barra"><span class="admin-engajamento-fill" style="width:${percentual}%;"></span></span>
                <span style="font-family: var(--admin-font-mono); font-size: 12px; color: var(--admin-text-muted);">${total}</span>
            </td>
            <td>${formatarData(u.ultimoAcesso)}</td>
        </tr>`;
        })
        .join("");
}

function renderizarErros(erros) {
    if (erros.length === 0) {
        listaErrosEl.innerHTML = '<div class="admin-estado-vazio"><span class="admin-estado-vazio-icone">✨</span>Nenhum erro registrado. Tudo tranquilo por aqui.</div>';
        return;
    }

    listaErrosEl.innerHTML = erros
        .map(
            (e) => `
        <div class="admin-erro-item">
            <span class="admin-erro-icone" aria-hidden="true">${ICONE_TRIANGULO}</span>
            <div class="admin-erro-corpo">
                <div class="admin-erro-cabecalho">
                    <span><span class="admin-erro-provedor">${e.provedor}</span> · ${e.funcionalidade}</span>
                    <span>${formatarData(e.criado_em)}</span>
                </div>
                <div class="admin-erro-mensagem">${e.erro_mensagem ?? "Sem detalhes"}</div>
            </div>
        </div>`,
        )
        .join("");
}

async function carregarErros() {
    botaoAtualizarErros.classList.add("girando");
    try {
        const erros = await buscarUltimosErros(supabaseAdmin, 20);
        renderizarErros(erros);
    } finally {
        setTimeout(() => botaoAtualizarErros.classList.remove("girando"), 400);
    }
}

async function testarProvedores() {
    botaoTestarProvedores.classList.add("girando");
    botaoTestarProvedores.disabled = true;
    const textoOriginal = botaoTestarProvedores.innerHTML;
    botaoTestarProvedores.innerHTML = botaoTestarProvedores.innerHTML.replace("Testar provedores", "Testando...");

    try {
        const { data, error } = await supabase.functions.invoke("testar-provedores");
        if (error) throw error;

        const total = data?.resultados?.length ?? 0;
        const sucessos = data?.resultados?.filter((r) => r.sucesso).length ?? 0;
        mensagemGlobal(`Teste concluído: ${sucessos}/${total} provedores respondendo.`, sucessos === total);

        await carregarPainel();
    } catch (erro) {
        mensagemGlobal(`Falha ao testar provedores: ${erro.message}`, false);
    } finally {
        botaoTestarProvedores.classList.remove("girando");
        botaoTestarProvedores.disabled = false;
        botaoTestarProvedores.innerHTML = textoOriginal;
    }
}

function mensagemGlobal(texto, sucesso) {
    const existente = document.getElementById("admin-mensagem-global");
    if (existente) existente.remove();

    const el = document.createElement("div");
    el.id = "admin-mensagem-global";
    el.textContent = texto;
    el.style.cssText = `position:fixed; top:20px; right:20px; z-index:999; padding:12px 20px; border-radius:10px; font-size:13px; font-family:var(--admin-font-mono); background:${sucesso ? "rgba(16,185,129,0.16)" : "rgba(239,68,68,0.16)"}; border:1px solid ${sucesso ? "var(--admin-green)" : "var(--admin-red)"}; color:${sucesso ? "var(--admin-green)" : "var(--admin-red)"};`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5000);
}

async function carregarPainel() {
    const [usoPorProvedor, chamadasPorDia, usuarias] = await Promise.all([
        buscarUsoPorProvedor(supabaseAdmin),
        buscarChamadasPorDia(supabaseAdmin),
        buscarUsuarias(supabaseAdmin),
    ]);

    renderizarKpis(usoPorProvedor, usuarias, chamadasPorDia);
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
    iniciarRelogio();
    botaoAtualizarErros.addEventListener("click", carregarErros);
    botaoTestarProvedores.addEventListener("click", testarProvedores);
    await carregarPainel();
}

iniciar();
