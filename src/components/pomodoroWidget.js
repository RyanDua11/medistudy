import {
    FASES,
    MODOS_POMODORO,
    formatarTempo,
    obterEstado,
    iniciarPomodoro,
    pausarPomodoro,
    pularFasePomodoro,
    reiniciarPomodoro,
    definirModoPomodoro,
    assinarPomodoro,
} from "../services/pomodoro.js";

const TITULOS_FASE = {
    [FASES.FOCO]: "Foco",
    [FASES.PAUSA_CURTA]: "Pausa curta",
    [FASES.PAUSA_LONGA]: "Pausa longa",
};

const CLASSE_POR_FASE = {
    [FASES.FOCO]: "pomodoro-foco",
    [FASES.PAUSA_CURTA]: "pomodoro-pausa-curta",
    [FASES.PAUSA_LONGA]: "pomodoro-pausa-longa",
};

const RAIO_ANEL = 54;
const CIRCUNFERENCIA_ANEL = 2 * Math.PI * RAIO_ANEL;

let contexto = null;

function obterContextoAudio() {
    if (!contexto) {
        const AudioContextClasse = window.AudioContext || window.webkitAudioContext;
        contexto = new AudioContextClasse();
    }
    return contexto;
}

function tocarBeep() {
    try {
        const ctx = obterContextoAudio();
        const oscilador = ctx.createOscillator();
        const ganho = ctx.createGain();

        oscilador.type = "sine";
        oscilador.frequency.value = 880;
        ganho.gain.setValueAtTime(0.001, ctx.currentTime);
        ganho.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
        ganho.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

        oscilador.connect(ganho);
        ganho.connect(ctx.destination);
        oscilador.start();
        oscilador.stop(ctx.currentTime + 0.32);
    } catch {
        // Web Audio indisponível — segue sem som
    }
}

function pedirPermissaoDeNotificacao() {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
        Notification.requestPermission();
    }
}

function notificarFimDeFase(fase) {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    const titulo = fase === FASES.FOCO ? "Hora de focar!" : "Hora de descansar!";
    const corpo =
        fase === FASES.FOCO
            ? "A pausa acabou. Bora voltar aos estudos."
            : "Você concluiu um pomodoro. Aproveite a pausa.";

    new Notification(titulo, { body: corpo, icon: "caduceu.png" });
}

/** Inicializa o widget compacto + painel flutuante de Pomodoro no header da página atual. */
export function inicializarPomodoroWidget() {
    const widget = document.getElementById("pomodoro-widget");
    if (!widget) return;

    const botaoWidget = document.getElementById("pomodoro-widget-botao");
    const tempoWidget = document.getElementById("pomodoro-widget-tempo");
    const painel = document.getElementById("pomodoro-painel");
    const botaoFechar = document.getElementById("pomodoro-fechar");
    const tituloFase = document.getElementById("pomodoro-painel-titulo");
    const tempoGrande = document.getElementById("pomodoro-tempo-grande");
    const anelProgresso = document.getElementById("pomodoro-anel-progresso");
    const contador = document.getElementById("pomodoro-contador");
    const botaoIniciarPausar = document.getElementById("pomodoro-iniciar-pausar");
    const botaoPular = document.getElementById("pomodoro-pular");
    const botaoReiniciar = document.getElementById("pomodoro-reiniciar");
    const botoesModo = document.querySelectorAll(".pomodoro-modo-botao");

    anelProgresso.style.strokeDasharray = String(CIRCUNFERENCIA_ANEL);

    function aplicarClasseDeFase(elemento, fase) {
        Object.values(CLASSE_POR_FASE).forEach((classe) => elemento.classList.remove(classe));
        elemento.classList.add(CLASSE_POR_FASE[fase]);
    }

    function atualizarTitulo(estado) {
        if (!estado.rodando) {
            document.title = "MediStudy";
            return;
        }
        const icone = estado.fase === FASES.FOCO ? "🍅" : "☕";
        document.title = `${icone} ${formatarTempo(estado.restanteSegundos)} — MediStudy`;
    }

    function renderizar(estado) {
        const duracaoTotal = MODOS_POMODORO[estado.modo][estado.fase];
        const tempoFormatado = formatarTempo(estado.restanteSegundos);

        tempoWidget.textContent = tempoFormatado;
        aplicarClasseDeFase(widget, estado.fase);

        tituloFase.textContent = TITULOS_FASE[estado.fase];
        tempoGrande.textContent = tempoFormatado;

        const fracaoRestante = duracaoTotal > 0 ? estado.restanteSegundos / duracaoTotal : 0;
        anelProgresso.style.strokeDashoffset = String(CIRCUNFERENCIA_ANEL * (1 - fracaoRestante));

        contador.textContent = `Pomodoros completados hoje: ${estado.pomodorosHoje}`;

        botaoIniciarPausar.textContent = estado.rodando ? "Pausar" : "Iniciar";

        botoesModo.forEach((botao) => {
            botao.classList.toggle("selecionado", botao.dataset.modo === estado.modo);
            botao.disabled = estado.rodando;
        });

        atualizarTitulo(estado);
    }

    let intervalo = null;

    function tick() {
        renderizar(obterEstado());
    }

    function garantirIntervalo() {
        if (intervalo !== null) return;
        intervalo = window.setInterval(tick, 1000);
    }

    renderizar(obterEstado());
    garantirIntervalo();

    assinarPomodoro((estado, fimDeFase) => {
        renderizar(estado);
        if (fimDeFase) {
            tocarBeep();
            notificarFimDeFase(estado.fase);
        }
    });

    function abrirPainel() {
        painel.hidden = false;
        botaoWidget.setAttribute("aria-expanded", "true");
    }

    function fecharPainel() {
        painel.hidden = true;
        botaoWidget.setAttribute("aria-expanded", "false");
    }

    botaoWidget.addEventListener("click", (evento) => {
        evento.stopPropagation();
        if (painel.hidden) abrirPainel();
        else fecharPainel();
    });

    botaoFechar.addEventListener("click", fecharPainel);

    document.addEventListener("click", (evento) => {
        if (!painel.hidden && !widget.contains(evento.target)) fecharPainel();
    });

    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape" && !painel.hidden) fecharPainel();
    });

    botaoIniciarPausar.addEventListener("click", () => {
        if (obterEstado().rodando) {
            pausarPomodoro();
        } else {
            pedirPermissaoDeNotificacao();
            iniciarPomodoro();
        }
    });

    botaoPular.addEventListener("click", () => pularFasePomodoro());
    botaoReiniciar.addEventListener("click", () => reiniciarPomodoro());

    botoesModo.forEach((botao) => {
        botao.addEventListener("click", () => definirModoPomodoro(botao.dataset.modo));
    });
}
