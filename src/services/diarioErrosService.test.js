import { describe, it, expect } from "vitest";
import { agruparErrosPorMateria, agruparErrosPorSemana } from "./diarioErrosService.js";

describe("agruparErrosPorMateria", () => {
    it("agrupa por matéria e conta tópicos dentro dela", () => {
        const erros = [
            { materia: "Farmacologia II", topico: "AINEs" },
            { materia: "Farmacologia II", topico: "AINEs" },
            { materia: "Farmacologia II", topico: "Antibióticos" },
            { materia: "Microbiologia", topico: "Gram-negativos" },
        ];

        const resultado = agruparErrosPorMateria(erros);

        expect(resultado[0]).toEqual({
            materia: "Farmacologia II",
            total: 3,
            percentual: 100,
            topicos: [
                { topico: "AINEs", total: 2 },
                { topico: "Antibióticos", total: 1 },
            ],
        });
        expect(resultado[1].materia).toBe("Microbiologia");
        expect(resultado[1].percentual).toBe(33);
    });

    it("usa 'Sem matéria' e 'Geral' quando materia/topico são null", () => {
        const resultado = agruparErrosPorMateria([{ materia: null, topico: null }]);
        expect(resultado[0].materia).toBe("Sem matéria");
        expect(resultado[0].topicos[0].topico).toBe("Geral");
    });

    it("ordena matérias por volume decrescente", () => {
        const erros = [
            { materia: "A", topico: "x" },
            { materia: "B", topico: "x" },
            { materia: "B", topico: "x" },
        ];
        const resultado = agruparErrosPorMateria(erros);
        expect(resultado.map((m) => m.materia)).toEqual(["B", "A"]);
    });

    it("retorna array vazio para lista vazia", () => {
        expect(agruparErrosPorMateria([])).toEqual([]);
    });
});

describe("agruparErrosPorSemana", () => {
    it("retorna exatamente `semanas` entradas, mesmo sem erros em algumas", () => {
        const resultado = agruparErrosPorSemana([], 8);
        expect(resultado).toHaveLength(8);
        expect(resultado.every((s) => s.total === 0)).toBe(true);
    });

    it("conta erros na semana correta e mantém ordem cronológica", () => {
        const hoje = new Date();
        const erros = [{ criado_em: hoje.toISOString() }, { criado_em: hoje.toISOString() }];

        const resultado = agruparErrosPorSemana(erros, 8);

        expect(resultado).toHaveLength(8);
        expect(resultado.at(-1).total).toBe(2);
        expect(resultado[0].total).toBe(0);
    });

    it("ignora erros fora da janela de semanas pedida", () => {
        const antigo = new Date();
        antigo.setDate(antigo.getDate() - 365);
        const resultado = agruparErrosPorSemana([{ criado_em: antigo.toISOString() }], 8);
        expect(resultado.every((s) => s.total === 0)).toBe(true);
    });
});
