import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { calcularFSRS, preverIntervalosFSRS, formatarIntervaloFSRS, RATING, ESTADO } from "./fsrs.js";

const UM_DIA_MS = 24 * 60 * 60 * 1000;

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T00:00:00.000Z"));
});

afterEach(() => {
    vi.useRealTimers();
});

describe("calcularFSRS", () => {
    it("num flashcard novo, cada nota gera dificuldade e estabilidade iniciais coerentes entre si", () => {
        const flashcardNovo = {};

        const naoLembrei = calcularFSRS(flashcardNovo, RATING.NAO_LEMBREI);
        const dificil = calcularFSRS(flashcardNovo, RATING.DIFICIL);
        const bom = calcularFSRS(flashcardNovo, RATING.BOM);
        const facil = calcularFSRS(flashcardNovo, RATING.FACIL);

        expect(naoLembrei.estabilidade).toBeLessThan(dificil.estabilidade);
        expect(dificil.estabilidade).toBeLessThan(bom.estabilidade);
        expect(bom.estabilidade).toBeLessThan(facil.estabilidade);

        expect(naoLembrei.dificuldade).toBeGreaterThan(bom.dificuldade);
        expect(facil.dificuldade).toBeLessThan(bom.dificuldade);
    });

    it("'Não lembrei' sempre agenda a próxima revisão para hoje, independentemente do histórico", () => {
        const flashcardComHistorico = {
            dificuldade: 6,
            estabilidade: 40,
            ultima_revisao: new Date("2026-07-01T00:00:00.000Z").toISOString(),
        };

        const resultado = calcularFSRS(flashcardComHistorico, RATING.NAO_LEMBREI);

        expect(resultado.intervalo_dias).toBe(0);
        expect(resultado.proxima_revisao).toBe(new Date(Date.now()).toISOString());
        expect(resultado.estado).toBe(ESTADO.REAPRENDIZADO);
    });

    it("'Bom' e 'Fácil' marcam o estado como revisão e produzem intervalo maior que 0", () => {
        const flashcardNovo = {};

        const bom = calcularFSRS(flashcardNovo, RATING.BOM);
        const facil = calcularFSRS(flashcardNovo, RATING.FACIL);

        expect(bom.estado).toBe(ESTADO.REVISAO);
        expect(facil.estado).toBe(ESTADO.REVISAO);
        expect(bom.intervalo_dias).toBeGreaterThan(0);
        expect(facil.intervalo_dias).toBeGreaterThan(0);
        expect(facil.intervalo_dias).toBeGreaterThan(bom.intervalo_dias);
    });

    it("em acertos consecutivos com 'Bom', a estabilidade e o intervalo continuam crescendo", () => {
        let flashcard = calcularFSRS({}, RATING.BOM);
        const primeiroIntervalo = flashcard.intervalo_dias;

        vi.setSystemTime(new Date(Date.now() + primeiroIntervalo * UM_DIA_MS));
        flashcard = calcularFSRS(flashcard, RATING.BOM);

        expect(flashcard.estabilidade).toBeGreaterThan(0);
        expect(flashcard.intervalo_dias).toBeGreaterThan(primeiroIntervalo);
    });

    it("um erro depois de uma sequência de acertos reduz a estabilidade", () => {
        let flashcard = calcularFSRS({}, RATING.BOM);
        vi.setSystemTime(new Date(Date.now() + flashcard.intervalo_dias * UM_DIA_MS));
        flashcard = calcularFSRS(flashcard, RATING.BOM);

        const estabilidadeAntesDoErro = flashcard.estabilidade;
        vi.setSystemTime(new Date(Date.now() + flashcard.intervalo_dias * UM_DIA_MS));
        const depoisDoErro = calcularFSRS(flashcard, RATING.NAO_LEMBREI);

        expect(depoisDoErro.estabilidade).toBeLessThan(estabilidadeAntesDoErro);
        expect(depoisDoErro.intervalo_dias).toBe(0);
    });

    it("a dificuldade nunca ultrapassa os limites [1, 10], mesmo em sequências longas de notas extremas", () => {
        let flashcard = {};

        for (let i = 0; i < 15; i += 1) {
            flashcard = calcularFSRS(flashcard, RATING.NAO_LEMBREI, new Date(Date.now() + i * UM_DIA_MS));
        }
        expect(flashcard.dificuldade).toBeLessThanOrEqual(10);
        expect(flashcard.dificuldade).toBeGreaterThanOrEqual(1);

        let outroFlashcard = {};
        for (let i = 0; i < 15; i += 1) {
            outroFlashcard = calcularFSRS(outroFlashcard, RATING.FACIL, new Date(Date.now() + i * 30 * UM_DIA_MS));
        }
        expect(outroFlashcard.dificuldade).toBeLessThanOrEqual(10);
        expect(outroFlashcard.dificuldade).toBeGreaterThanOrEqual(1);
    });

    it("respeita uma retenção-alvo customizada: retenção maior implica intervalos mais curtos", () => {
        const flashcardNovo = {};

        const comRetencaoAlta = calcularFSRS(flashcardNovo, RATING.BOM, new Date(), 0.97);
        const comRetencaoPadrao = calcularFSRS(flashcardNovo, RATING.BOM, new Date(), 0.9);

        expect(comRetencaoAlta.intervalo_dias).toBeLessThan(comRetencaoPadrao.intervalo_dias);
    });
});

describe("preverIntervalosFSRS", () => {
    it("retorna um intervalo estimado para cada uma das 4 notas, em ordem crescente", () => {
        const flashcardNovo = {};

        const previsao = preverIntervalosFSRS(flashcardNovo);

        expect(Object.keys(previsao)).toHaveLength(4);
        expect(previsao[RATING.NAO_LEMBREI]).toBeLessThanOrEqual(previsao[RATING.DIFICIL]);
        expect(previsao[RATING.DIFICIL]).toBeLessThanOrEqual(previsao[RATING.BOM]);
        expect(previsao[RATING.BOM]).toBeLessThanOrEqual(previsao[RATING.FACIL]);
    });

    it("não modifica o flashcard original (é uma pré-visualização, não persiste nada)", () => {
        const flashcardOriginal = { dificuldade: 5, estabilidade: 10, ultima_revisao: new Date().toISOString() };
        const copia = { ...flashcardOriginal };

        preverIntervalosFSRS(flashcardOriginal);

        expect(flashcardOriginal).toEqual(copia);
    });
});

describe("formatarIntervaloFSRS", () => {
    it("formata 0 dias como 'Hoje'", () => {
        expect(formatarIntervaloFSRS(0)).toBe("Hoje");
    });

    it("formata 1 dia no singular", () => {
        expect(formatarIntervaloFSRS(1)).toBe("Em 1 dia");
    });

    it("formata mais de 1 dia no plural", () => {
        expect(formatarIntervaloFSRS(7)).toBe("Em 7 dias");
    });
});
