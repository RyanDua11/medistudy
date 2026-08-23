import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    calcularTaxaDeAcerto,
    calcularRevisoesFeitas,
    calcularFlashcardsARevisar,
    calcularProvasProximos7Dias,
    agruparNotasPorMateria,
    calcularFlashcardsCriadosAcumulados,
    calcularStreakDias,
    calcularRevisadosHoje,
    categorizarFlashcards,
    calcularProgressoGeral,
    calcularCasosResolvidos,
    calcularTaxaAcertoCasos,
    calcularMateriasComNotas,
    selecionarProximasProvas,
    formatarContagemProva,
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

describe("calcularStreakDias", () => {
    it("retorna 0 quando não há nenhum log", () => {
        expect(calcularStreakDias([])).toBe(0);
    });

    it("retorna 0 quando a última revisão foi há mais de um dia (streak quebrado)", () => {
        const logs = [{ revisado_em: dias(-2) }];
        expect(calcularStreakDias(logs)).toBe(0);
    });

    it("conta 1 quando só revisou hoje", () => {
        const logs = [{ revisado_em: dias(0) }];
        expect(calcularStreakDias(logs)).toBe(1);
    });

    it("não zera o streak se hoje ainda não revisou, desde que tenha revisado ontem", () => {
        const logs = [{ revisado_em: dias(-1) }];
        expect(calcularStreakDias(logs)).toBe(1);
    });

    it("conta dias consecutivos terminando hoje", () => {
        const logs = [
            { revisado_em: dias(0) },
            { revisado_em: dias(-1) },
            { revisado_em: dias(-2) },
        ];
        expect(calcularStreakDias(logs)).toBe(3);
    });

    it("conta dias consecutivos terminando ontem quando hoje ainda não revisou", () => {
        const logs = [
            { revisado_em: dias(-1) },
            { revisado_em: dias(-2) },
            { revisado_em: dias(-3) },
        ];
        expect(calcularStreakDias(logs)).toBe(3);
    });

    it("para de contar quando a sequência quebra", () => {
        const logs = [
            { revisado_em: dias(0) },
            { revisado_em: dias(-1) },
            { revisado_em: dias(-3) },
        ];
        expect(calcularStreakDias(logs)).toBe(2);
    });

    it("ignora múltiplas revisões no mesmo dia (conta o dia uma vez)", () => {
        const logs = [
            { revisado_em: dias(0) },
            { revisado_em: horas(-1) },
            { revisado_em: dias(-1) },
        ];
        expect(calcularStreakDias(logs)).toBe(2);
    });
});

describe("calcularRevisadosHoje", () => {
    it("conta apenas logs do dia corrente", () => {
        const logs = [
            { revisado_em: dias(0) },
            { revisado_em: horas(-3) },
            { revisado_em: dias(-1) },
        ];
        expect(calcularRevisadosHoje(logs)).toBe(2);
    });

    it("retorna 0 quando não há logs hoje", () => {
        const logs = [{ revisado_em: dias(-1) }];
        expect(calcularRevisadosHoje(logs)).toBe(0);
    });

    it("retorna 0 quando não há logs", () => {
        expect(calcularRevisadosHoje([])).toBe(0);
    });
});

describe("categorizarFlashcards", () => {
    it("classifica como Novos os flashcards sem nenhum log, mesmo sem proxima_revisao definida", () => {
        const flashcards = [{ id: "1" }, { id: "2", proxima_revisao: horas(-5) }];
        const logs = [];

        const { novos, revisar, aprendidos } = categorizarFlashcards(flashcards, logs);

        expect(novos.map((f) => f.id)).toEqual(["1", "2"]);
        expect(revisar).toEqual([]);
        expect(aprendidos).toEqual([]);
    });

    it("classifica como Revisar flashcards já revisados com proxima_revisao vencida", () => {
        const flashcards = [
            { id: "1", proxima_revisao: horas(-2), estado: "reaprendizado" },
        ];
        const logs = [{ flashcard_id: "1" }];

        const { novos, revisar } = categorizarFlashcards(flashcards, logs);

        expect(novos).toEqual([]);
        expect(revisar.map((f) => f.id)).toEqual(["1"]);
    });

    it("não classifica como Revisar um flashcard vencido que nunca foi revisado (é Novo)", () => {
        const flashcards = [{ id: "1", proxima_revisao: horas(-2) }];
        const logs = [];

        const { novos, revisar } = categorizarFlashcards(flashcards, logs);

        expect(novos.map((f) => f.id)).toEqual(["1"]);
        expect(revisar).toEqual([]);
    });

    it("classifica como Aprendidos flashcards com estado FSRS 'revisao'", () => {
        const flashcards = [
            { id: "1", estado: "revisao", proxima_revisao: horas(5) },
            { id: "2", estado: "revisao", proxima_revisao: horas(5) },
            { id: "3", estado: "reaprendizado", proxima_revisao: horas(5) },
        ];
        const logs = [{ flashcard_id: "1" }, { flashcard_id: "2" }, { flashcard_id: "3" }];

        const { aprendidos } = categorizarFlashcards(flashcards, logs);

        expect(aprendidos.map((f) => f.id)).toEqual(["1", "2"]);
    });

    it("um flashcard pode ser simultaneamente Revisar e Aprendidos", () => {
        const flashcards = [
            { id: "1", estado: "revisao", proxima_revisao: horas(-1) },
        ];
        const logs = [{ flashcard_id: "1" }];

        const { revisar, aprendidos } = categorizarFlashcards(flashcards, logs);

        expect(revisar.map((f) => f.id)).toEqual(["1"]);
        expect(aprendidos.map((f) => f.id)).toEqual(["1"]);
    });

    it("retorna categorias vazias quando não há flashcards", () => {
        expect(categorizarFlashcards([], [])).toEqual({ novos: [], revisar: [], aprendidos: [] });
    });
});

describe("calcularProgressoGeral", () => {
    it("calcula a porcentagem de flashcards aprendidos sobre o total", () => {
        const flashcards = [
            { id: "1", estado: "revisao" },
            { id: "2", estado: "revisao" },
            { id: "3", estado: "reaprendizado" },
            { id: "4", estado: "reaprendizado" },
        ];
        const logs = flashcards.map((f) => ({ flashcard_id: f.id }));

        expect(calcularProgressoGeral(flashcards, logs)).toBe(50);
    });

    it("retorna 0 quando não há flashcards, sem dividir por zero", () => {
        expect(calcularProgressoGeral([], [])).toBe(0);
    });

    it("retorna 0 quando nenhum flashcard está aprendido ainda", () => {
        const flashcards = [{ id: "1", estado: "reaprendizado" }];
        const logs = [{ flashcard_id: "1" }];

        expect(calcularProgressoGeral(flashcards, logs)).toBe(0);
    });
});

describe("calcularCasosResolvidos", () => {
    it("conta casos clínicos distintos resolvidos, ignorando resoluções repetidas do mesmo caso", () => {
        const logs = [
            { caso_clinico_id: "1", acertou: true },
            { caso_clinico_id: "2", acertou: false },
            { caso_clinico_id: "1", acertou: false },
        ];

        expect(calcularCasosResolvidos(logs)).toBe(2);
    });

    it("retorna 0 quando não há nenhuma resolução", () => {
        expect(calcularCasosResolvidos([])).toBe(0);
    });
});

describe("calcularTaxaAcertoCasos", () => {
    it("calcula a porcentagem de acertos sobre o total de resoluções (não de casos distintos)", () => {
        const logs = [
            { caso_clinico_id: "1", acertou: true },
            { caso_clinico_id: "2", acertou: false },
            { caso_clinico_id: "1", acertou: true },
            { caso_clinico_id: "3", acertou: true },
        ];

        expect(calcularTaxaAcertoCasos(logs)).toBe(75);
    });

    it("retorna 0 quando não há nenhuma resolução, sem dividir por zero", () => {
        expect(calcularTaxaAcertoCasos([])).toBe(0);
    });
});

describe("calcularMateriasComNotas", () => {
    it("conta matérias distintas com pelo menos uma nota lançada", () => {
        const notas = [
            { materia: "Farmacologia II" },
            { materia: "Anatomia" },
            { materia: "Farmacologia II" },
        ];

        expect(calcularMateriasComNotas(notas)).toBe(2);
    });

    it("retorna 0 quando não há notas", () => {
        expect(calcularMateriasComNotas([])).toBe(0);
    });
});
