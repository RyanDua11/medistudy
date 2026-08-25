import { protegerRota } from "../../services/routeGuard.js";
import { interpretarExame, validarArquivoExame } from "../../services/interpretadorExamesService.js";
import { inicializarNotificacaoRevisao } from "../../components/notificacaoRevisao.js";
import { inicializarUsuarioMenu } from "../../components/usuarioMenu.js";
import { inicializarNavegacaoPrincipal } from "../../components/navegacaoPrincipal.js";
import { inicializarPomodoroWidget } from "../../components/pomodoroWidget.js";

const CORES_STATUS = { normal: "#5fbf87", atencao: "#e0a84e", critico: "#ff8080" };
const ROTULOS_STATUS = { normal: "Normal", atencao: "Atenção", critico: "Crítico" };

const ICONE_PDF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>';
const ICONE_ALERTA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>';
const ICONE_COPIAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const ICONE_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
const ICONE_NOVA_ANALISE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>';
const ICONE_ESTRELAS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>';

const mensagemEl = document.getElementById("exame-mensagem");
const dropzoneEl = document.getElementById("exame-dropzone");
const inputArquivoEl = document.getElementById("exame-input-arquivo");
const previewEl = document.getElementById("exame-preview");
const loadingEl = document.getElementById("exame-loading");
const resultadoEl = document.getElementById("exame-resultado");

let arquivoAtual = null;

function mostrarErro(texto) {
    mensagemEl.textContent = texto;
    mensagemEl.hidden = false;
}

function limparErro() {
    mensagemEl.hidden = true;
    mensagemEl.textContent = "";
}

function formatarTamanho(bytes) {
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function resetarParaEnvio() {
    arquivoAtual = null;
    inputArquivoEl.value = "";
    previewEl.hidden = true;
    previewEl.innerHTML = "";
    loadingEl.hidden = true;
    resultadoEl.hidden = true;
    resultadoEl.innerHTML = "";
    dropzoneEl.hidden = false;
    limparErro();
}

function renderizarPreview(arquivo) {
    dropzoneEl.hidden = true;
    previewEl.hidden = false;

    const ehImagem = arquivo.type.startsWith("image/");
    const thumbHtml = ehImagem
        ? `<img class="exame-preview-thumb" alt="" id="exame-preview-thumb">`
        : `<span class="exame-preview-icone-arquivo" aria-hidden="true">${ICONE_PDF}</span>`;

    previewEl.innerHTML = `
        ${thumbHtml}
        <div class="exame-preview-info">
            <div class="exame-preview-nome">${arquivo.name}</div>
            <div class="exame-preview-tamanho">${formatarTamanho(arquivo.size)}</div>
        </div>
        <div class="exame-preview-acoes">
            <button type="button" id="exame-btn-trocar" class="exame-btn-secundario">Trocar</button>
            <button type="button" id="exame-btn-analisar" class="exame-btn-primario">Analisar</button>
        </div>
    `;

    if (ehImagem) {
        const img = document.getElementById("exame-preview-thumb");
        const leitor = new FileReader();
        leitor.onload = () => (img.src = leitor.result);
        leitor.readAsDataURL(arquivo);
    }

    document.getElementById("exame-btn-trocar").addEventListener("click", resetarParaEnvio);
    document.getElementById("exame-btn-analisar").addEventListener("click", analisar);
}

function selecionarArquivo(arquivo) {
    limparErro();
    const erro = validarArquivoExame(arquivo);
    if (erro) {
        mostrarErro(erro);
        return;
    }
    arquivoAtual = arquivo;
    renderizarPreview(arquivo);
}

function renderizarParametros(parametros) {
    if (parametros.length === 0) return "";
    return `
        <div class="exame-parametros-grid">
            ${parametros
                .map(
                    (p) => `
                <div class="exame-parametro-card" style="--cor-status: ${CORES_STATUS[p.status]};">
                    <div class="exame-parametro-nome">${p.nome}</div>
                    <div class="exame-parametro-valor">${p.valor}</div>
                    <div class="exame-parametro-referencia">Referência: ${p.referencia} · <strong style="color: var(--cor-status);">${ROTULOS_STATUS[p.status]}</strong></div>
                </div>`,
                )
                .join("")}
        </div>`;
}

function renderizarResultado(resultado) {
    const alertaHtml =
        resultado.alertas_criticos.length > 0
            ? `
        <div class="exame-alerta-critico">
            ${ICONE_ALERTA}
            <div>
                <h4>Valores que merecem atenção urgente</h4>
                <ul>${resultado.alertas_criticos.map((a) => `<li>${a}</li>`).join("")}</ul>
            </div>
        </div>`
            : "";

    resultadoEl.innerHTML = `
        ${alertaHtml}
        <h2 class="exame-resultado-titulo">${resultado.tipo_exame}</h2>
        ${renderizarParametros(resultado.parametros)}
        <div class="exame-interpretacao">
            <h4>Interpretação</h4>
            <p id="exame-texto-interpretacao">${resultado.interpretacao}</p>
        </div>
        <div class="exame-resultado-rodape">
            <span class="exame-resultado-selo"><span class="exame-resultado-selo-icone" aria-hidden="true">${ICONE_ESTRELAS}</span>Análise gerada por IA${resultado.provedor ? ` · ${resultado.provedor}` : ""}</span>
            <div class="exame-resultado-acoes">
                <button type="button" id="exame-btn-copiar" class="exame-btn-secundario">${ICONE_COPIAR} Copiar</button>
                <button type="button" id="exame-btn-nova-analise" class="exame-btn-primario">${ICONE_NOVA_ANALISE} Nova análise</button>
            </div>
        </div>
    `;

    document.getElementById("exame-btn-nova-analise").addEventListener("click", resetarParaEnvio);

    const botaoCopiar = document.getElementById("exame-btn-copiar");
    botaoCopiar.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(resultado.interpretacao);
            botaoCopiar.innerHTML = `${ICONE_CHECK} Copiado!`;
            botaoCopiar.classList.add("exame-copiado");
            setTimeout(() => {
                botaoCopiar.innerHTML = `${ICONE_COPIAR} Copiar`;
                botaoCopiar.classList.remove("exame-copiado");
            }, 2000);
        } catch {
            mostrarErro("Não foi possível copiar. Selecione o texto manualmente.");
        }
    });

    resultadoEl.hidden = false;
}

async function analisar() {
    if (!arquivoAtual) return;
    limparErro();
    previewEl.hidden = true;
    loadingEl.hidden = false;

    try {
        const resultado = await interpretarExame(arquivoAtual);
        loadingEl.hidden = true;
        renderizarResultado(resultado);
    } catch (erro) {
        loadingEl.hidden = true;
        previewEl.hidden = false;
        mostrarErro(`Não foi possível interpretar o exame: ${erro.message}`);
    }
}

function inicializarDropzone() {
    dropzoneEl.addEventListener("click", () => inputArquivoEl.click());
    dropzoneEl.addEventListener("keydown", (evento) => {
        if (evento.key === "Enter" || evento.key === " ") {
            evento.preventDefault();
            inputArquivoEl.click();
        }
    });

    inputArquivoEl.addEventListener("change", () => {
        if (inputArquivoEl.files[0]) selecionarArquivo(inputArquivoEl.files[0]);
    });

    ["dragenter", "dragover"].forEach((evtNome) => {
        dropzoneEl.addEventListener(evtNome, (evento) => {
            evento.preventDefault();
            dropzoneEl.classList.add("exame-dropzone-arrastando");
        });
    });

    ["dragleave", "drop"].forEach((evtNome) => {
        dropzoneEl.addEventListener(evtNome, (evento) => {
            evento.preventDefault();
            dropzoneEl.classList.remove("exame-dropzone-arrastando");
        });
    });

    dropzoneEl.addEventListener("drop", (evento) => {
        const arquivo = evento.dataTransfer?.files?.[0];
        if (arquivo) selecionarArquivo(arquivo);
    });
}

async function iniciar() {
    const sessao = await protegerRota();
    if (!sessao) return;

    inicializarNotificacaoRevisao();
    inicializarUsuarioMenu();
    inicializarNavegacaoPrincipal();
    inicializarPomodoroWidget();
    inicializarDropzone();
}

iniciar();
