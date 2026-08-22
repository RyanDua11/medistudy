import { describe, it, expect, beforeEach, vi } from "vitest";
import { formatarTempo, duracaoDoEstado, calcularProximaFase, FASES, MODOS_POMODORO } from "./pomodoro.js";

describe("formatarTempo", () => {
    it.each([
        [0, "00:00"],
        [5, "00:05"],
        [65, "01:05"],
        [600, "10:00"],
        [1500, "25:00"],
        [3599, "59:59"],
    ])("formata %d segundos como %s", (segundos, esperado) => {
        expect(formatarTempo(segundos)).toBe(esperado);
    });

    it("arredonda frações de segundo", () => {
        expect(formatarTempo(59.6)).toBe("01:00");
    });

    it("nunca retorna negativo", () => {
        expect(formatarTempo(-10)).toBe("00:00");
    });
});

describe("duracaoDoEstado", () => {
    it.each([
        ["padrao", FASES.FOCO, 25 * 60],
        ["padrao", FASES.PAUSA_CURTA, 5 * 60],
        ["padrao", FASES.PAUSA_LONGA, 15 * 60],
        ["leve", FASES.FOCO, 15 * 60],
        ["leve", FASES.PAUSA_CURTA, 5 * 60],
        ["intenso", FASES.FOCO, 50 * 60],
        ["intenso", FASES.PAUSA_CURTA, 10 * 60],
    ])("modo %s, fase %s -> %d segundos", (modo, fase, esperado) => {
        expect(duracaoDoEstado(modo, fase)).toBe(esperado);
    });

    it("cai para o modo padrão quando o modo é desconhecido", () => {
        expect(duracaoDoEstado("inexistente", FASES.FOCO)).toBe(MODOS_POMODORO.padrao.foco);
    });
});

describe("calcularProximaFase", () => {
    it("de foco para pausa curta quando não é múltiplo de 4", () => {
        expect(calcularProximaFase(FASES.FOCO, 0)).toEqual({ fase: FASES.PAUSA_CURTA, pomodorosCompletados: 1 });
        expect(calcularProximaFase(FASES.FOCO, 1)).toEqual({ fase: FASES.PAUSA_CURTA, pomodorosCompletados: 2 });
        expect(calcularProximaFase(FASES.FOCO, 2)).toEqual({ fase: FASES.PAUSA_CURTA, pomodorosCompletados: 3 });
    });

    it("de foco para pausa longa a cada 4 pomodoros completados", () => {
        expect(calcularProximaFase(FASES.FOCO, 3)).toEqual({ fase: FASES.PAUSA_LONGA, pomodorosCompletados: 4 });
        expect(calcularProximaFase(FASES.FOCO, 7)).toEqual({ fase: FASES.PAUSA_LONGA, pomodorosCompletados: 8 });
    });

    it("de pausa curta ou longa sempre volta para foco, sem alterar o contador", () => {
        expect(calcularProximaFase(FASES.PAUSA_CURTA, 2)).toEqual({ fase: FASES.FOCO, pomodorosCompletados: 2 });
        expect(calcularProximaFase(FASES.PAUSA_LONGA, 4)).toEqual({ fase: FASES.FOCO, pomodorosCompletados: 4 });
    });
});

function criarLocalStorageDeTeste() {
    const dados = new Map();
    return {
        getItem: (chave) => (dados.has(chave) ? dados.get(chave) : null),
        setItem: (chave, valor) => dados.set(chave, valor),
        removeItem: (chave) => dados.delete(chave),
        clear: () => dados.clear(),
    };
}

describe("controle do timer (estado persistido)", () => {
    // o projeto não roda os testes em jsdom (só as poucas suítes que tocam
    // DOM stubam manualmente), então localStorage não existe no ambiente —
    // stubamos um substituto em memória por teste. Cada teste também
    // importa uma instância nova do módulo, já que o estado vive numa
    // variável de módulo e testes que dividissem a mesma instância
    // ficariam acoplados à ordem de execução uns dos outros.
    async function carregarModuloIsolado() {
        vi.stubGlobal("localStorage", criarLocalStorageDeTeste());
        vi.resetModules();
        return import("./pomodoro.js");
    }

    beforeEach(() => {
        vi.useRealTimers();
    });

    it("começa parado em foco, com a duração cheia do modo padrão", async () => {
        const { obterEstado } = await carregarModuloIsolado();
        const estado = obterEstado();
        expect(estado.fase).toBe(FASES.FOCO);
        expect(estado.rodando).toBe(false);
        expect(estado.restanteSegundos).toBe(25 * 60);
    });

    it("iniciar põe o timer para rodar e pausar captura o tempo restante", async () => {
        const { obterEstado, iniciarPomodoro, pausarPomodoro } = await carregarModuloIsolado();

        iniciarPomodoro();
        expect(obterEstado().rodando).toBe(true);

        pausarPomodoro();
        const estado = obterEstado();
        expect(estado.rodando).toBe(false);
        expect(estado.restanteSegundos).toBeGreaterThan(0);
        expect(estado.restanteSegundos).toBeLessThanOrEqual(25 * 60);
    });

    it("pular avança para a próxima fase e mantém o timer rodando", async () => {
        const { obterEstado, pularFasePomodoro } = await carregarModuloIsolado();

        pularFasePomodoro();
        const estado = obterEstado();
        expect(estado.fase).toBe(FASES.PAUSA_CURTA);
        expect(estado.pomodorosHoje).toBe(1);
        expect(estado.rodando).toBe(true);
    });

    it("reiniciar zera o progresso da fase atual sem mudar o contador de pomodoros", async () => {
        const { obterEstado, pularFasePomodoro, reiniciarPomodoro } = await carregarModuloIsolado();

        pularFasePomodoro();
        reiniciarPomodoro();
        const estado = obterEstado();
        expect(estado.rodando).toBe(false);
        expect(estado.restanteSegundos).toBe(duracaoDoEstado("padrao", FASES.PAUSA_CURTA));
        expect(estado.pomodorosHoje).toBe(1);
    });

    it("definirModoPomodoro só tem efeito quando o timer está parado", async () => {
        const { obterEstado, iniciarPomodoro, definirModoPomodoro } = await carregarModuloIsolado();

        definirModoPomodoro("intenso");
        expect(obterEstado().modo).toBe("intenso");
        expect(obterEstado().restanteSegundos).toBe(50 * 60);

        iniciarPomodoro();
        definirModoPomodoro("leve");
        expect(obterEstado().modo).toBe("intenso");
    });

    it("ao terminar naturalmente (tempo esgotado), avança de fase sozinho na próxima leitura", async () => {
        const { obterEstado, iniciarPomodoro } = await carregarModuloIsolado();

        vi.useFakeTimers();
        iniciarPomodoro();
        vi.advanceTimersByTime(25 * 60 * 1000 + 1000);

        const estado = obterEstado();
        expect(estado.fase).toBe(FASES.PAUSA_CURTA);
        expect(estado.pomodorosHoje).toBe(1);
        vi.useRealTimers();
    });
});
