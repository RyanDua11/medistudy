const CHAVE_ARMAZENAMENTO = "medistudy-pomodoro";

export const FASES = Object.freeze({
    FOCO: "foco",
    PAUSA_CURTA: "pausaCurta",
    PAUSA_LONGA: "pausaLonga",
});

export const MODOS_POMODORO = Object.freeze({
    padrao: { rotulo: "25/5 (Padrão)", foco: 25 * 60, pausaCurta: 5 * 60, pausaLonga: 15 * 60 },
    leve: { rotulo: "15/5 (Leve)", foco: 15 * 60, pausaCurta: 5 * 60, pausaLonga: 15 * 60 },
    intenso: { rotulo: "50/10 (Intenso)", foco: 50 * 60, pausaCurta: 10 * 60, pausaLonga: 15 * 60 },
});

const POMODOROS_ATE_PAUSA_LONGA = 4;

/** Formata segundos totais como "MM:SS", sempre com dois dígitos em cada parte. */
export function formatarTempo(segundosTotais) {
    const segundosPositivos = Math.max(0, Math.round(segundosTotais));
    const minutos = Math.floor(segundosPositivos / 60);
    const segundos = segundosPositivos % 60;
    return `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
}

/** Duração em segundos da fase indicada, de acordo com o modo escolhido. */
export function duracaoDoEstado(modo, fase) {
    const config = MODOS_POMODORO[modo] ?? MODOS_POMODORO.padrao;
    return config[fase] ?? config.foco;
}

/**
 * Decide a próxima fase do ciclo e o contador de pomodoros atualizado.
 * A cada 4 pomodoros completados, a pausa é longa; senão, curta.
 * Pausas (curta ou longa) sempre voltam para foco.
 */
export function calcularProximaFase(faseAtual, pomodorosCompletados) {
    if (faseAtual !== FASES.FOCO) {
        return { fase: FASES.FOCO, pomodorosCompletados };
    }

    const novoContador = pomodorosCompletados + 1;
    const proximaFase = novoContador % POMODOROS_ATE_PAUSA_LONGA === 0 ? FASES.PAUSA_LONGA : FASES.PAUSA_CURTA;
    return { fase: proximaFase, pomodorosCompletados: novoContador };
}

function dataDeHoje() {
    return new Date().toISOString().slice(0, 10);
}

function estadoInicial() {
    return {
        modo: "padrao",
        fase: FASES.FOCO,
        rodando: false,
        terminaEm: null,
        restanteQuandoPausado: duracaoDoEstado("padrao", FASES.FOCO),
        pomodorosHoje: 0,
        dataPomodoros: dataDeHoje(),
    };
}

function carregarEstadoArmazenado() {
    try {
        const bruto = typeof localStorage !== "undefined" ? localStorage.getItem(CHAVE_ARMAZENAMENTO) : null;
        if (!bruto) return estadoInicial();
        return { ...estadoInicial(), ...JSON.parse(bruto) };
    } catch {
        return estadoInicial();
    }
}

function salvarEstado() {
    try {
        if (typeof localStorage === "undefined") return;
        localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(estadoAtual));
    } catch {
        // armazenamento indisponível (modo privado, quota excedida etc.) — segue só em memória
    }
}

let estadoAtual = carregarEstadoArmazenado();
const ouvintes = new Set();

function notificarOuvintes(fimDeFase) {
    ouvintes.forEach((callback) => callback(obterEstado(), fimDeFase));
}

function reiniciarContadorDiarioSeNecessario() {
    const hoje = dataDeHoje();
    if (estadoAtual.dataPomodoros !== hoje) {
        estadoAtual = { ...estadoAtual, pomodorosHoje: 0, dataPomodoros: hoje };
        salvarEstado();
    }
}

/**
 * Lê o estado atual, avançando a fase automaticamente se o tempo já tiver
 * zerado (ex.: a usuária ficou numa aba fechada ou trocou de página bem no
 * fim do ciclo). Retorna sempre um objeto novo com `restanteSegundos`.
 */
export function obterEstado() {
    reiniciarContadorDiarioSeNecessario();

    if (estadoAtual.rodando && estadoAtual.terminaEm !== null) {
        const restante = (estadoAtual.terminaEm - Date.now()) / 1000;
        if (restante <= 0) {
            avancarFase(true);
        }
    }

    const restanteSegundos = estadoAtual.rodando
        ? Math.max(0, (estadoAtual.terminaEm - Date.now()) / 1000)
        : estadoAtual.restanteQuandoPausado;

    return { ...estadoAtual, restanteSegundos };
}

function avancarFase(fimNatural) {
    const { fase, pomodorosCompletados } = calcularProximaFase(estadoAtual.fase, estadoAtual.pomodorosHoje);
    const duracao = duracaoDoEstado(estadoAtual.modo, fase);

    estadoAtual = {
        ...estadoAtual,
        fase,
        pomodorosHoje: pomodorosCompletados,
        rodando: true,
        terminaEm: Date.now() + duracao * 1000,
        restanteQuandoPausado: duracao,
    };
    salvarEstado();
    if (fimNatural) notificarOuvintes(true);
}

export function iniciarPomodoro() {
    if (estadoAtual.rodando) return;

    const duracao = estadoAtual.restanteQuandoPausado ?? duracaoDoEstado(estadoAtual.modo, estadoAtual.fase);
    estadoAtual = {
        ...estadoAtual,
        rodando: true,
        terminaEm: Date.now() + duracao * 1000,
    };
    salvarEstado();
    notificarOuvintes(false);
}

export function pausarPomodoro() {
    if (!estadoAtual.rodando) return;

    const restante = Math.max(0, (estadoAtual.terminaEm - Date.now()) / 1000);
    estadoAtual = {
        ...estadoAtual,
        rodando: false,
        terminaEm: null,
        restanteQuandoPausado: restante,
    };
    salvarEstado();
    notificarOuvintes(false);
}

export function pularFasePomodoro() {
    avancarFase(false);
    notificarOuvintes(false);
}

export function reiniciarPomodoro() {
    const duracao = duracaoDoEstado(estadoAtual.modo, estadoAtual.fase);
    estadoAtual = {
        ...estadoAtual,
        rodando: false,
        terminaEm: null,
        restanteQuandoPausado: duracao,
    };
    salvarEstado();
    notificarOuvintes(false);
}

/** Só tem efeito quando o timer está parado (spec: modo só configurável parado). */
export function definirModoPomodoro(modo) {
    if (estadoAtual.rodando || !MODOS_POMODORO[modo]) return;

    estadoAtual = {
        ...estadoAtual,
        modo,
        fase: FASES.FOCO,
        restanteQuandoPausado: duracaoDoEstado(modo, FASES.FOCO),
    };
    salvarEstado();
    notificarOuvintes(false);
}

/** Inscreve um callback(estado, fimDeFase) chamado a cada mudança de estado. Retorna função de cancelamento. */
export function assinarPomodoro(callback) {
    ouvintes.add(callback);
    return () => ouvintes.delete(callback);
}
