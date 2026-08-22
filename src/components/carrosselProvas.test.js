import { describe, it, expect } from "vitest";
import { calcularDiasAteProva, filtrarProvasFuturas, formatarContagemRegressiva } from "./carrosselProvas.js";

const HOJE = new Date(2026, 7, 22); // 22/08/2026

describe("calcularDiasAteProva", () => {
    it("retorna 0 para uma prova hoje", () => {
        expect(calcularDiasAteProva("2026-08-22", HOJE)).toBe(0);
    });

    it("retorna 1 para uma prova amanhã", () => {
        expect(calcularDiasAteProva("2026-08-23", HOJE)).toBe(1);
    });

    it("retorna a contagem correta para uma prova daqui a vários dias", () => {
        expect(calcularDiasAteProva("2026-09-01", HOJE)).toBe(10);
    });

    it("retorna um número negativo para uma prova já passada", () => {
        expect(calcularDiasAteProva("2026-08-20", HOJE)).toBe(-2);
    });
});

describe("filtrarProvasFuturas", () => {
    const provas = [
        { id: 1, materia: "Atrasada", data: "2026-08-10" },
        { id: 2, materia: "Hoje", data: "2026-08-22" },
        { id: 3, materia: "Em 10 dias", data: "2026-09-01" },
        { id: 4, materia: "Em 40 dias", data: "2026-10-01" },
    ];

    it("mantém apenas provas de hoje até o limite de dias, ordenadas por proximidade", () => {
        const resultado = filtrarProvasFuturas(provas, HOJE);

        expect(resultado.map((p) => p.materia)).toEqual(["Hoje", "Em 10 dias"]);
    });

    it("exclui provas além do limite de dias informado", () => {
        const resultado = filtrarProvasFuturas(provas, HOJE, 60);

        expect(resultado.map((p) => p.materia)).toEqual(["Hoje", "Em 10 dias", "Em 40 dias"]);
    });

    it("retorna lista vazia quando não há provas futuras", () => {
        const resultado = filtrarProvasFuturas([{ id: 1, materia: "Atrasada", data: "2026-08-10" }], HOJE);

        expect(resultado).toEqual([]);
    });
});

describe("formatarContagemRegressiva", () => {
    it('retorna "hoje!" para 0 dias', () => {
        expect(formatarContagemRegressiva(0)).toBe("hoje!");
    });

    it('retorna "amanhã" para 1 dia', () => {
        expect(formatarContagemRegressiva(1)).toBe("amanhã");
    });

    it('retorna "em X dias" para mais de 1 dia', () => {
        expect(formatarContagemRegressiva(5)).toBe("em 5 dias");
        expect(formatarContagemRegressiva(30)).toBe("em 30 dias");
    });
});
