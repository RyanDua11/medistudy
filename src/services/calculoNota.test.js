import { describe, it, expect } from "vitest";
import { calcularNotaNecessaria } from "./calculoNota.js";

describe("calcularNotaNecessaria", () => {
    it("calcula a média simples (pesos iguais) corretamente", () => {
        const notasLancadas = [
            { nota: 6, peso: 1 },
            { nota: 8, peso: 1 },
        ];

        const resultado = calcularNotaNecessaria(notasLancadas, 7, 1);

        expect(resultado.notaNecessaria).toBeCloseTo(7);
        expect(resultado.jaAprovada).toBe(false);
    });

    it("calcula a média ponderada por peso corretamente", () => {
        const notasLancadas = [
            { nota: 8, peso: 3 },
            { nota: 5, peso: 2 },
        ];

        const resultado = calcularNotaNecessaria(notasLancadas, 7, 2);

        expect(resultado.notaNecessaria).toBeCloseTo(7.5);
        expect(resultado.jaAprovada).toBe(false);
    });

    it("indica que já está aprovada quando a média já é suficiente mesmo tirando 0 na próxima", () => {
        const notasLancadas = [
            { nota: 9, peso: 2 },
            { nota: 9, peso: 2 },
        ];

        const resultado = calcularNotaNecessaria(notasLancadas, 7, 1);

        expect(resultado.jaAprovada).toBe(true);
        expect(resultado.notaNecessaria).toBe(0);
    });

    it("quando ainda não há notas lançadas, a nota necessária é a própria média exigida", () => {
        const resultado = calcularNotaNecessaria([], 7, 1);

        expect(resultado.notaNecessaria).toBeCloseTo(7);
        expect(resultado.jaAprovada).toBe(false);
    });

    it("indica impossível quando a nota necessária ultrapassa 10, mesmo tirando nota máxima", () => {
        const notasLancadas = [{ nota: 2, peso: 3 }];

        const resultado = calcularNotaNecessaria(notasLancadas, 8, 1);

        expect(resultado.impossivel).toBe(true);
        expect(resultado.jaAprovada).toBe(false);
    });

    it("lança erro quando o peso da próxima avaliação é zero ou negativo", () => {
        expect(() => calcularNotaNecessaria([], 7, 0)).toThrow(
            "Peso da avaliação deve ser maior que zero"
        );
        expect(() => calcularNotaNecessaria([], 7, -1)).toThrow(
            "Peso da avaliação deve ser maior que zero"
        );
    });

    it("arredonda a nota necessária sempre para cima, nunca subestimando o que falta", () => {
        const notasLancadas = [{ nota: 6.66, peso: 1 }];

        const resultado = calcularNotaNecessaria(notasLancadas, 7, 1);

        expect(resultado.notaNecessaria).toBe(7.4);
    });
});
