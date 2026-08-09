import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    calcularTaxaDeAcerto,
    calcularRevisoesFeitas,
    calcularFlashcardsARevisar,
    calcularProvasProximos7Dias,
} from "./estatisticas.js";

const AGORA = new Date("2026-08-08T12:00:00.000Z");

function horas(delta) {
    return new Date(AGORA.getTime() + delta * 60 * 60 * 1000).toISOString();
}

function dias(delta) {
    return new Date(AGORA.getTime() + delta * 24 * 60 * 60 * 1000).toISOString();
}

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AGORA);
});

afterEach(() => {
    vi.useRealTimers();
});

describe("calcularTaxaDeAcerto", () => {
    it("calcula a porcentagem de acertos sobre o total de revisões", () => {
        const flashcards = [
            { acertos: 3, erros: 1 },
            { acertos: 5, erros: 1 },
        ];

        expect(calcularTaxaDeAcerto(flashcards)).toBe(80);
    });

    it("retorna 0 quando não há nenhuma revisão feita ainda, sem dividir por zero", () => {
        const flashcards = [{ acertos: 0, erros: 0 }];

        expect(calcularTaxaDeAcerto(flashcards)).toBe(0);
    });

    it("retorna 0 quando não há flashcards", () => {
        expect(calcularTaxaDeAcerto([])).toBe(0);
    });
});

describe("calcularRevisoesFeitas", () => {
    it("soma acertos e erros de todos os flashcards", () => {
        const flashcards = [
            { acertos: 3, erros: 1 },
            { acertos: 5, erros: 2 },
        ];

        expect(calcularRevisoesFeitas(flashcards)).toBe(11);
    });

    it("retorna 0 quando não há flashcards", () => {
        expect(calcularRevisoesFeitas([])).toBe(0);
    });
});

describe("calcularFlashcardsARevisar", () => {
    it("conta apenas os flashcards com proxima_revisao já vencida", () => {
        const flashcards = [
            { proxima_revisao: horas(-2) },
            { proxima_revisao: horas(-1) },
            { proxima_revisao: horas(5) },
        ];

        expect(calcularFlashcardsARevisar(flashcards)).toBe(2);
    });

    it("retorna 0 quando não há flashcards vencidos", () => {
        const flashcards = [{ proxima_revisao: horas(5) }];

        expect(calcularFlashcardsARevisar(flashcards)).toBe(0);
    });
});

describe("calcularProvasProximos7Dias", () => {
    it("conta provas com data entre agora e 7 dias à frente", () => {
        const provas = [
            { data: dias(1) },
            { data: dias(6.9) },
            { data: dias(8) },
            { data: dias(-1) },
        ];

        expect(calcularProvasProximos7Dias(provas)).toBe(2);
    });

    it("retorna 0 quando não há provas nos próximos 7 dias", () => {
        const provas = [{ data: dias(10) }];

        expect(calcularProvasProximos7Dias(provas)).toBe(0);
    });
});
