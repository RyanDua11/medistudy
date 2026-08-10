import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    calcularTaxaDeAcerto,
    calcularRevisoesFeitas,
    calcularFlashcardsARevisar,
    calcularProvasProximos7Dias,
    agruparNotasPorMateria,
    calcularFlashcardsCriadosAcumulados,
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

describe("agruparNotasPorMateria", () => {
    it("agrupa notas por matéria, cada uma com seus pontos em ordem cronológica", () => {
        const notas = [
            { materia: "Farmacologia", nota: 7, created_at: dias(-1) },
            { materia: "Anatomia", nota: 9, created_at: dias(-3) },
            { materia: "Farmacologia", nota: 8.5, created_at: dias(-5) },
        ];

        const resultado = agruparNotasPorMateria(notas);

        expect(resultado).toEqual([
            {
                materia: "Farmacologia",
                pontos: [
                    { data: dias(-5).slice(0, 10), nota: 8.5 },
                    { data: dias(-1).slice(0, 10), nota: 7 },
                ],
            },
            {
                materia: "Anatomia",
                pontos: [{ data: dias(-3).slice(0, 10), nota: 9 }],
            },
        ]);
    });

    it("retorna lista vazia quando não há notas", () => {
        expect(agruparNotasPorMateria([])).toEqual([]);
    });
});

describe("calcularFlashcardsCriadosAcumulados", () => {
    it("retorna a contagem acumulada de flashcards criados por data", () => {
        const flashcards = [
            { created_at: dias(-3) },
            { created_at: dias(-3) },
            { created_at: dias(-1) },
        ];

        expect(calcularFlashcardsCriadosAcumulados(flashcards)).toEqual([
            { data: dias(-3).slice(0, 10), total: 2 },
            { data: dias(-1).slice(0, 10), total: 3 },
        ]);
    });

    it("retorna lista vazia quando não há flashcards", () => {
        expect(calcularFlashcardsCriadosAcumulados([])).toEqual([]);
    });
});
