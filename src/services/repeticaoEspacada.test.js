import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { calcularRepeticaoEspacada } from "./repeticaoEspacada.js";

const UM_DIA_MS = 24 * 60 * 60 * 1000;

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T00:00:00.000Z"));
});

afterEach(() => {
    vi.useRealTimers();
});

describe("calcularRepeticaoEspacada", () => {
    it("no primeiro acerto (flashcard novo), aumenta o intervalo a partir dos valores padrão", () => {
        const flashcardNovo = { intervalo_dias: 1, fator_facilidade: 2.5 };

        const resultado = calcularRepeticaoEspacada(flashcardNovo, true);

        expect(resultado.intervalo_dias).toBe(3);
        expect(resultado.fator_facilidade).toBeCloseTo(2.6);
        expect(resultado.proxima_revisao).toBe(
            new Date(Date.now() + 3 * UM_DIA_MS).toISOString()
        );
    });

    it("em acertos consecutivos, o intervalo continua crescendo", () => {
        const primeiraRevisao = calcularRepeticaoEspacada(
            { intervalo_dias: 1, fator_facilidade: 2.5 },
            true
        );

        const segundaRevisao = calcularRepeticaoEspacada(primeiraRevisao, true);

        expect(segundaRevisao.intervalo_dias).toBeGreaterThan(primeiraRevisao.intervalo_dias);
        expect(segundaRevisao.fator_facilidade).toBeGreaterThan(primeiraRevisao.fator_facilidade);
    });

    it("um erro depois de acertos reseta o intervalo para 1 dia", () => {
        const depoisDeAcertos = { intervalo_dias: 8, fator_facilidade: 2.7 };

        const resultado = calcularRepeticaoEspacada(depoisDeAcertos, false);

        expect(resultado.intervalo_dias).toBe(1);
        expect(resultado.fator_facilidade).toBeCloseTo(2.5);
    });

    it("o fator de facilidade nunca ultrapassa o teto, mesmo com muitos acertos seguidos", () => {
        let flashcard = { intervalo_dias: 1, fator_facilidade: 2.75 };

        for (let i = 0; i < 10; i += 1) {
            flashcard = calcularRepeticaoEspacada(flashcard, true);
        }

        expect(flashcard.fator_facilidade).toBeLessThanOrEqual(2.8);
    });

    it("o fator de facilidade nunca cai abaixo do piso, mesmo com muitos erros seguidos", () => {
        let flashcard = { intervalo_dias: 5, fator_facilidade: 1.35 };

        for (let i = 0; i < 10; i += 1) {
            flashcard = calcularRepeticaoEspacada(flashcard, false);
        }

        expect(flashcard.fator_facilidade).toBeGreaterThanOrEqual(1.3);
        expect(flashcard.fator_facilidade).toBeGreaterThan(0);
    });

    it("usa os valores padrão quando o flashcard ainda não tem intervalo ou fator definidos", () => {
        const resultado = calcularRepeticaoEspacada({}, true);

        expect(resultado.intervalo_dias).toBe(3);
        expect(resultado.fator_facilidade).toBeCloseTo(2.6);
    });
});
