import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    obterPerguntas,
    calcularScoreRapido,
    identificarPontosParaRevisar,
    calcularTokensRestantes,
    podeRealizarExame,
    ehCasoDeHoje,
    jaResolveuHoje,
    calcularStreakCasos,
    calcularTaxaAcertoPeriodo,
    calcularComparacaoColegas,
} from "./casosClinicosLogica.js";

const AGORA = new Date("2026-08-23T12:00:00.000Z");

function diasAtras(dias) {
    return new Date(AGORA.getTime() - dias * 24 * 60 * 60 * 1000).toISOString();
}

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AGORA);
});

afterEach(() => {
    vi.useRealTimers();
});

describe("obterPerguntas", () => {
    it("retorna o array perguntas quando o caso já é do formato novo", () => {
        const caso = { perguntas: [{ pergunta: "P1" }, { pergunta: "P2" }] };
        expect(obterPerguntas(caso)).toEqual(caso.perguntas);
    });

    it("cai no fallback das colunas legadas quando não há perguntas[]", () => {
        const caso = { pergunta: "Qual é?", alternativas: ["A", "B"], alternativa_correta: 0, explicacao: "Porque sim" };
        expect(obterPerguntas(caso)).toEqual([
            { pergunta: "Qual é?", alternativas: ["A", "B"], alternativa_correta: 0, explicacao: "Porque sim" },
        ]);
    });

    it("retorna lista vazia quando o caso não tem nenhum formato reconhecível", () => {
        expect(obterPerguntas({})).toEqual([]);
    });
});

describe("calcularScoreRapido", () => {
    it("conta acertos comparando respostas com alternativa_correta", () => {
        const perguntas = [
            { alternativa_correta: 1 },
            { alternativa_correta: 0 },
            { alternativa_correta: 2 },
            { alternativa_correta: 3 },
        ];
        const respostas = [1, 0, 1, 3];

        expect(calcularScoreRapido(perguntas, respostas)).toEqual({ acertos: 3, total: 4, percentual: 75 });
    });

    it("retorna 0% sem dividir por zero quando não há perguntas", () => {
        expect(calcularScoreRapido([], [])).toEqual({ acertos: 0, total: 0, percentual: 0 });
    });
});

describe("identificarPontosParaRevisar", () => {
    it("retorna apenas as perguntas erradas, com pergunta e explicação", () => {
        const perguntas = [
            { pergunta: "P1", explicacao: "E1", alternativa_correta: 0 },
            { pergunta: "P2", explicacao: "E2", alternativa_correta: 1 },
        ];
        const respostas = [0, 0];

        const resultado = identificarPontosParaRevisar(perguntas, respostas);

        expect(resultado).toEqual([{ pergunta: "P2", explicacao: "E2", acertou: false }]);
    });

    it("retorna lista vazia quando acertou tudo", () => {
        const perguntas = [{ pergunta: "P1", explicacao: "E1", alternativa_correta: 0 }];
        expect(identificarPontosParaRevisar(perguntas, [0])).toEqual([]);
    });
});

describe("calcularTokensRestantes", () => {
    const exames = [
        { id: "hemograma", custo_tokens: 1 },
        { id: "tc-angio", custo_tokens: 3 },
    ];

    it("desconta o custo dos exames já realizados", () => {
        expect(calcularTokensRestantes(exames, ["hemograma", "tc-angio"])).toBe(6);
    });

    it("não desconta nada quando nenhum exame foi realizado", () => {
        expect(calcularTokensRestantes(exames, [])).toBe(10);
    });

    it("aceita um total inicial de tokens customizado", () => {
        expect(calcularTokensRestantes(exames, ["hemograma"], 5)).toBe(4);
    });
});

describe("podeRealizarExame", () => {
    it("permite quando o custo cabe nos tokens restantes", () => {
        expect(podeRealizarExame({ custo_tokens: 3 }, 5)).toBe(true);
    });

    it("permite quando o custo é exatamente igual aos tokens restantes", () => {
        expect(podeRealizarExame({ custo_tokens: 5 }, 5)).toBe(true);
    });

    it("bloqueia quando o custo excede os tokens restantes", () => {
        expect(podeRealizarExame({ custo_tokens: 6 }, 5)).toBe(false);
    });
});

describe("ehCasoDeHoje", () => {
    it("é verdadeiro quando data_caso é a data local de hoje", () => {
        expect(ehCasoDeHoje({ data_caso: "2026-08-23" }, AGORA)).toBe(true);
    });

    it("é falso quando data_caso é de outro dia", () => {
        expect(ehCasoDeHoje({ data_caso: "2026-08-22" }, AGORA)).toBe(false);
    });

    it("é falso quando não há data_caso", () => {
        expect(ehCasoDeHoje({}, AGORA)).toBe(false);
    });
});

describe("jaResolveuHoje", () => {
    it("é verdadeiro quando o id da usuária está em usuarios_resolveram_hoje", () => {
        expect(jaResolveuHoje({ usuarios_resolveram_hoje: ["u1", "u2"] }, "u1")).toBe(true);
    });

    it("é falso quando o id não está na lista", () => {
        expect(jaResolveuHoje({ usuarios_resolveram_hoje: ["u2"] }, "u1")).toBe(false);
    });

    it("é falso quando a lista não existe", () => {
        expect(jaResolveuHoje({}, "u1")).toBe(false);
    });
});

describe("calcularStreakCasos", () => {
    it("conta dias consecutivos terminando hoje", () => {
        const logs = [{ resolvido_em: diasAtras(0) }, { resolvido_em: diasAtras(1) }, { resolvido_em: diasAtras(2) }];
        expect(calcularStreakCasos(logs, AGORA)).toBe(3);
    });

    it("retorna 0 quando a última resolução foi há mais de 1 dia", () => {
        expect(calcularStreakCasos([{ resolvido_em: diasAtras(2) }], AGORA)).toBe(0);
    });

    it("retorna 0 quando não há logs", () => {
        expect(calcularStreakCasos([], AGORA)).toBe(0);
    });
});

describe("calcularTaxaAcertoPeriodo", () => {
    it("calcula a porcentagem de acerto só dos logs dentro do período", () => {
        const logs = [
            { resolvido_em: diasAtras(1), acertou: true },
            { resolvido_em: diasAtras(2), acertou: true },
            { resolvido_em: diasAtras(3), acertou: false },
            { resolvido_em: diasAtras(10), acertou: false },
        ];
        expect(calcularTaxaAcertoPeriodo(logs, 7, AGORA)).toBe(67);
    });

    it("retorna 0 sem dividir por zero quando não há logs no período", () => {
        expect(calcularTaxaAcertoPeriodo([{ resolvido_em: diasAtras(30), acertou: true }], 7, AGORA)).toBe(0);
    });
});

describe("calcularComparacaoColegas", () => {
    it("rotula a usuária logada como 'Você' e as demais como 'Colega N' em ordem alfabética de id", () => {
        const logs = [
            { usuario_id: "u-atual", resolvido_em: diasAtras(0), acertou: true },
            { usuario_id: "u-bbb", resolvido_em: diasAtras(0), acertou: true },
            { usuario_id: "u-aaa", resolvido_em: diasAtras(0), acertou: false },
        ];

        const resultado = calcularComparacaoColegas(logs, "u-atual", AGORA);

        expect(resultado.map((r) => r.rotulo)).toEqual(["Você", "Colega 1", "Colega 2"]);
        expect(resultado.map((r) => r.usuarioId)).toEqual(["u-atual", "u-aaa", "u-bbb"]);
    });

    it("calcula taxa de acerto da semana e streak por usuária isoladamente", () => {
        const logs = [
            { usuario_id: "u-atual", resolvido_em: diasAtras(0), acertou: true },
            { usuario_id: "u-atual", resolvido_em: diasAtras(1), acertou: false },
            { usuario_id: "colega", resolvido_em: diasAtras(0), acertou: true },
        ];

        const resultado = calcularComparacaoColegas(logs, "u-atual", AGORA);
        const voce = resultado.find((r) => r.rotulo === "Você");
        const colega = resultado.find((r) => r.rotulo === "Colega 1");

        expect(voce.taxaAcertoSemana).toBe(50);
        expect(voce.streak).toBe(2);
        expect(colega.taxaAcertoSemana).toBe(100);
        expect(colega.streak).toBe(1);
    });

    it("retorna lista vazia quando não há nenhum log", () => {
        expect(calcularComparacaoColegas([], "u-atual", AGORA)).toEqual([]);
    });
});
