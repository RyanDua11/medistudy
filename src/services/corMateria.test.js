import { describe, it, expect } from "vitest";
import { corPorMateria, PALETA_CORES_MATERIA } from "./corMateria.js";

describe("corPorMateria", () => {
    it("retorna sempre a mesma cor para a mesma matéria", () => {
        const cor1 = corPorMateria("Farmacologia II");
        const cor2 = corPorMateria("Farmacologia II");
        expect(cor1).toBe(cor2);
    });

    it("retorna uma cor dentro da paleta fixa", () => {
        expect(PALETA_CORES_MATERIA).toContain(corPorMateria("Microbiologia"));
    });

    it("distribui matérias diferentes por cores possivelmente diferentes, dentro da paleta", () => {
        const materias = ["Farmacologia II", "Microbiologia", "Semiologia IV", "Patologia Clínica", "Parasitologia", "Humanidades"];
        materias.forEach((materia) => {
            expect(PALETA_CORES_MATERIA).toContain(corPorMateria(materia));
        });
    });

    it("retorna uma cor neutra fixa quando a matéria não está definida", () => {
        expect(corPorMateria(null)).toBe("dourado");
        expect(corPorMateria(undefined)).toBe("dourado");
        expect(corPorMateria("")).toBe("dourado");
    });

    it("é determinístico independente de maiúsculas/minúsculas equivalentes não são normalizadas (mesma string exata = mesma cor)", () => {
        expect(corPorMateria("Farmacologia II")).toBe(corPorMateria("Farmacologia II"));
    });
});
