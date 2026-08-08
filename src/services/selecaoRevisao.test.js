import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { selecionarRevisaoRapida, selecionarVesperaDeProva } from "./selecaoRevisao.js";

const AGORA = new Date("2026-08-08T12:00:00.000Z");

function flashcard(id, proximaRevisao, extras = {}) {
    return { id, proxima_revisao: proximaRevisao, fator_facilidade: 2.5, materia: null, ...extras };
}

function horasAtras(horas) {
    return new Date(AGORA.getTime() - horas * 60 * 60 * 1000).toISOString();
}

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AGORA);
});

afterEach(() => {
    vi.useRealTimers();
});

describe("selecionarRevisaoRapida", () => {
    it("retorna apenas os cards vencidos (proxima_revisao <= agora), do mais atrasado pro mais recente", () => {
        const flashcards = [
            flashcard("futuro", horasAtras(-5)),
            flashcard("1", horasAtras(2)),
            flashcard("2", horasAtras(10)),
        ];

        const resultado = selecionarRevisaoRapida(flashcards);

        expect(resultado.map((f) => f.id)).toEqual(["2", "1"]);
    });

    it("corta no limite de tempo (5 min ÷ 25s por card = 12) quando há muitos cards vencidos", () => {
        const flashcards = Array.from({ length: 20 }, (_, i) => flashcard(String(i), horasAtras(i + 1)));

        const resultado = selecionarRevisaoRapida(flashcards);

        expect(resultado).toHaveLength(12);
        expect(resultado[0].id).toBe("19");
        expect(resultado[11].id).toBe("8");
    });

    it("retorna lista vazia, sem erro, quando nenhum card está vencido", () => {
        const flashcards = [flashcard("1", horasAtras(-5)), flashcard("2", horasAtras(-1))];

        const resultado = selecionarRevisaoRapida(flashcards);

        expect(resultado).toEqual([]);
    });

    it("permite customizar tempo disponível e tempo médio por card", () => {
        const flashcards = Array.from({ length: 10 }, (_, i) => flashcard(String(i), horasAtras(i + 1)));

        const resultado = selecionarRevisaoRapida(flashcards, {
            tempoDisponivelMs: 60 * 1000,
            tempoPorCardMs: 20 * 1000,
        });

        expect(resultado).toHaveLength(3);
    });
});

describe("selecionarVesperaDeProva", () => {
    it("filtra por matéria e ordena do mais difícil (fator_facilidade menor) pro mais fácil", () => {
        const flashcards = [
            flashcard("1", horasAtras(1), { materia: "Farmacologia II", fator_facilidade: 2.5 }),
            flashcard("2", horasAtras(1), { materia: "Farmacologia II", fator_facilidade: 1.4 }),
            flashcard("3", horasAtras(1), { materia: "Farmacologia II", fator_facilidade: 2.1 }),
            flashcard("4", horasAtras(1), { materia: "Microbiologia", fator_facilidade: 1.3 }),
        ];

        const resultado = selecionarVesperaDeProva(flashcards, "Farmacologia II");

        expect(resultado.map((f) => f.id)).toEqual(["2", "3", "1"]);
    });

    it("retorna lista vazia, sem lançar erro, quando a matéria não tem nenhum card cadastrado", () => {
        const flashcards = [flashcard("1", horasAtras(1), { materia: "Farmacologia II" })];

        const resultado = selecionarVesperaDeProva(flashcards, "Parasitologia");

        expect(resultado).toEqual([]);
    });

    it("retorna lista vazia quando não há flashcards nenhum", () => {
        const resultado = selecionarVesperaDeProva([], "Farmacologia II");

        expect(resultado).toEqual([]);
    });
});
