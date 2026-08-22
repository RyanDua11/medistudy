import { describe, it, expect } from "vitest";
import { TELAS, calcularTelaInicial, filtrarFlashcardsPorMateria } from "./telaFlashcards.js";

describe("calcularTelaInicial", () => {
    it("entra direto na revisão já iniciando o modo rápido quando ?modo=revisaoRapida", () => {
        const resultado = calcularTelaInicial(new URLSearchParams("modo=revisaoRapida"));
        expect(resultado).toEqual({ tela: TELAS.REVISAO, iniciarRevisaoRapida: true });
    });

    it("começa na tela de escolha quando não há parâmetro de modo", () => {
        const resultado = calcularTelaInicial(new URLSearchParams(""));
        expect(resultado).toEqual({ tela: TELAS.ESCOLHA, iniciarRevisaoRapida: false });
    });

    it("começa na tela de escolha para valores de modo desconhecidos", () => {
        const resultado = calcularTelaInicial(new URLSearchParams("modo=qualquerCoisa"));
        expect(resultado).toEqual({ tela: TELAS.ESCOLHA, iniciarRevisaoRapida: false });
    });
});

describe("filtrarFlashcardsPorMateria", () => {
    const flashcards = [
        { id: 1, materia: "Farmacologia" },
        { id: 2, materia: "Anatomia" },
        { id: 3, materia: "Farmacologia" },
        { id: 4, materia: null },
    ];

    it("retorna todos os flashcards quando nenhuma matéria é escolhida", () => {
        expect(filtrarFlashcardsPorMateria(flashcards, "")).toEqual(flashcards);
        expect(filtrarFlashcardsPorMateria(flashcards, null)).toEqual(flashcards);
    });

    it("retorna apenas os flashcards da matéria escolhida", () => {
        const resultado = filtrarFlashcardsPorMateria(flashcards, "Farmacologia");
        expect(resultado).toEqual([flashcards[0], flashcards[2]]);
    });

    it("retorna lista vazia quando nenhum flashcard pertence à matéria", () => {
        expect(filtrarFlashcardsPorMateria(flashcards, "Bioquímica")).toEqual([]);
    });
});
