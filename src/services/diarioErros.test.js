import { describe, it, expect } from "vitest";
import { identificarPontosFracos } from "./diarioErros.js";
import { RATING } from "./fsrs.js";

const AGORA = new Date("2026-08-23T12:00:00.000Z");

function diasAtras(dias) {
    return new Date(AGORA.getTime() - dias * 24 * 60 * 60 * 1000).toISOString();
}

function logErro(flashcardId, dias) {
    return { flashcard_id: flashcardId, rating: RATING.NAO_LEMBREI, revisado_em: diasAtras(dias) };
}

function logAcerto(flashcardId, dias) {
    return { flashcard_id: flashcardId, rating: RATING.BOM, revisado_em: diasAtras(dias) };
}

describe("identificarPontosFracos", () => {
    it("identifica um card errado 3+ vezes na janela como ponto fraco", () => {
        const flashcards = [{ id: "1", pergunta: "P1" }];
        const logs = [logErro("1", 1), logErro("1", 2), logErro("1", 3)];

        const resultado = identificarPontosFracos(flashcards, logs, { agora: AGORA });

        expect(resultado).toHaveLength(1);
        expect(resultado[0].id).toBe("1");
        expect(resultado[0].vezesErrado).toBe(3);
    });

    it("não considera ponto fraco quando errou menos que o limite", () => {
        const flashcards = [{ id: "1", pergunta: "P1" }];
        const logs = [logErro("1", 1), logErro("1", 2)];

        expect(identificarPontosFracos(flashcards, logs, { agora: AGORA })).toEqual([]);
    });

    it("ignora erros fora da janela de dias", () => {
        const flashcards = [{ id: "1", pergunta: "P1" }];
        const logs = [logErro("1", 1), logErro("1", 2), logErro("1", 45)];

        expect(identificarPontosFracos(flashcards, logs, { agora: AGORA, janelaDias: 30 })).toEqual([]);
    });

    it("não conta acertos (Bom/Difícil/Fácil) como erro", () => {
        const flashcards = [{ id: "1", pergunta: "P1" }];
        const logs = [logErro("1", 1), logErro("1", 2), logAcerto("1", 3), logAcerto("1", 4)];

        expect(identificarPontosFracos(flashcards, logs, { agora: AGORA })).toEqual([]);
    });

    it("registra a contagem correta e a data do erro mais recente", () => {
        const flashcards = [{ id: "1", pergunta: "P1" }];
        const logs = [logErro("1", 5), logErro("1", 1), logErro("1", 3)];

        const [pontoFraco] = identificarPontosFracos(flashcards, logs, { agora: AGORA });

        expect(pontoFraco.vezesErrado).toBe(3);
        expect(pontoFraco.ultimoErroEm).toBe(diasAtras(1));
    });

    it("ordena do mais errado para o menos errado", () => {
        const flashcards = [
            { id: "1", pergunta: "P1" },
            { id: "2", pergunta: "P2" },
        ];
        const logs = [
            logErro("1", 1), logErro("1", 2), logErro("1", 3),
            logErro("2", 1), logErro("2", 2), logErro("2", 3), logErro("2", 4), logErro("2", 5),
        ];

        const resultado = identificarPontosFracos(flashcards, logs, { agora: AGORA });

        expect(resultado.map((f) => f.id)).toEqual(["2", "1"]);
    });

    it("respeita um limite de erros customizado", () => {
        const flashcards = [{ id: "1", pergunta: "P1" }];
        const logs = [logErro("1", 1), logErro("1", 2)];

        const resultado = identificarPontosFracos(flashcards, logs, { agora: AGORA, limiteErros: 2 });

        expect(resultado).toHaveLength(1);
    });

    it("retorna lista vazia quando não há flashcards ou logs", () => {
        expect(identificarPontosFracos([], [], { agora: AGORA })).toEqual([]);
    });
});
