import { describe, it, expect } from "vitest";
import { listarMaterias, listarSubtopicos, listarDetalhes, selecionarPorBaralho } from "./baralhosHierarquicos.js";

const flashcards = [
    { id: "1", materia: "Farmacologia II", subtopico: "AINEs", detalhe: "Mecanismo de ação" },
    { id: "2", materia: "Farmacologia II", subtopico: "AINEs", detalhe: "Efeitos adversos" },
    { id: "3", materia: "Farmacologia II", subtopico: "AINEs", detalhe: null },
    { id: "4", materia: "Farmacologia II", subtopico: "Antibióticos", detalhe: "Farmacocinética" },
    { id: "5", materia: "Anatomia", subtopico: null, detalhe: null },
    { id: "6", materia: null, subtopico: null, detalhe: null },
];

describe("listarMaterias", () => {
    it("lista matérias distintas com contagem de cards, em ordem alfabética", () => {
        expect(listarMaterias(flashcards)).toEqual([
            { valor: "Anatomia", total: 1 },
            { valor: "Farmacologia II", total: 4 },
        ]);
    });

    it("ignora flashcards sem matéria definida", () => {
        expect(listarMaterias([{ materia: null }])).toEqual([]);
    });

    it("retorna lista vazia quando não há flashcards", () => {
        expect(listarMaterias([])).toEqual([]);
    });
});

describe("listarSubtopicos", () => {
    it("lista subtópicos distintos dentro da matéria escolhida", () => {
        expect(listarSubtopicos(flashcards, "Farmacologia II")).toEqual([
            { valor: "AINEs", total: 3 },
            { valor: "Antibióticos", total: 1 },
        ]);
    });

    it("não conta flashcards de outras matérias", () => {
        expect(listarSubtopicos(flashcards, "Anatomia")).toEqual([]);
    });
});

describe("listarDetalhes", () => {
    it("lista detalhes distintos dentro da matéria + subtópico escolhidos", () => {
        expect(listarDetalhes(flashcards, "Farmacologia II", "AINEs")).toEqual([
            { valor: "Efeitos adversos", total: 1 },
            { valor: "Mecanismo de ação", total: 1 },
        ]);
    });

    it("ignora cards do subtópico sem detalhe definido", () => {
        const detalhes = listarDetalhes(flashcards, "Farmacologia II", "AINEs");
        expect(detalhes.reduce((soma, d) => soma + d.total, 0)).toBe(2);
    });
});

describe("selecionarPorBaralho", () => {
    it("seleciona todos os cards de uma matéria quando só a matéria é escolhida", () => {
        const resultado = selecionarPorBaralho(flashcards, { materia: "Farmacologia II" });
        expect(resultado.map((f) => f.id)).toEqual(["1", "2", "3", "4"]);
    });

    it("seleciona apenas os cards do subtópico quando matéria + subtópico são escolhidos", () => {
        const resultado = selecionarPorBaralho(flashcards, { materia: "Farmacologia II", subtopico: "AINEs" });
        expect(resultado.map((f) => f.id)).toEqual(["1", "2", "3"]);
    });

    it("seleciona apenas o card do detalhe quando os três níveis são escolhidos", () => {
        const resultado = selecionarPorBaralho(flashcards, {
            materia: "Farmacologia II",
            subtopico: "AINEs",
            detalhe: "Mecanismo de ação",
        });
        expect(resultado.map((f) => f.id)).toEqual(["1"]);
    });

    it("retorna lista vazia quando a matéria não existe", () => {
        expect(selecionarPorBaralho(flashcards, { materia: "Bioquímica" })).toEqual([]);
    });
});
