import { describe, it, expect } from "vitest";
import { validarCasoClinico } from "./validacaoCasoClinico.js";

const CASO_VALIDO = {
    enunciado: "Paciente de 45 anos, masculino, chega ao pronto-socorro com febre de 39°C, taquicardia e hipotensão após 3 dias de dor abdominal.",
    pergunta: "Qual é o diagnóstico mais provável?",
    alternativas: [
        "Sepse de foco abdominal",
        "Enxaqueca",
        "Ansiedade generalizada",
        "Refluxo gastroesofágico",
    ],
    alternativa_correta: 0,
    explicacao: "O quadro de febre, taquicardia e hipotensão após dor abdominal é compatível com resposta inflamatória sistêmica de foco abdominal (sepse).",
};

describe("validarCasoClinico", () => {
    it("aceita um caso clínico bem formado", () => {
        const resultado = validarCasoClinico(JSON.stringify(CASO_VALIDO));
        expect(resultado).toEqual(CASO_VALIDO);
    });

    it("aceita JSON envolto em cerca de código markdown", () => {
        const texto = "```json\n" + JSON.stringify(CASO_VALIDO) + "\n```";
        const resultado = validarCasoClinico(texto);
        expect(resultado).toEqual(CASO_VALIDO);
    });

    it("aceita JSON com texto solto ao redor, extraindo o objeto", () => {
        const texto = `Aqui está o caso:\n${JSON.stringify(CASO_VALIDO)}\nEspero que ajude!`;
        const resultado = validarCasoClinico(texto);
        expect(resultado).toEqual(CASO_VALIDO);
    });

    it("rejeita texto que não é JSON válido", () => {
        expect(() => validarCasoClinico("isso não é json nenhum")).toThrow(
            "Resposta da IA não é um JSON válido"
        );
    });

    it("rejeita JSON malformado dentro da cerca markdown", () => {
        const texto = "```json\n{ enunciado: sem aspas }\n```";
        expect(() => validarCasoClinico(texto)).toThrow(
            "Resposta da IA não é um JSON válido"
        );
    });

    it("rejeita quando falta o campo enunciado", () => {
        const { enunciado, ...semEnunciado } = CASO_VALIDO;
        expect(() => validarCasoClinico(JSON.stringify(semEnunciado))).toThrow(
            /enunciado/
        );
    });

    it("rejeita quando enunciado é string vazia", () => {
        const invalido = { ...CASO_VALIDO, enunciado: "   " };
        expect(() => validarCasoClinico(JSON.stringify(invalido))).toThrow(
            /enunciado/
        );
    });

    it("rejeita quando falta o campo pergunta", () => {
        const { pergunta, ...semPergunta } = CASO_VALIDO;
        expect(() => validarCasoClinico(JSON.stringify(semPergunta))).toThrow(
            /pergunta/
        );
    });

    it("rejeita quando falta o campo explicacao", () => {
        const { explicacao, ...semExplicacao } = CASO_VALIDO;
        expect(() => validarCasoClinico(JSON.stringify(semExplicacao))).toThrow(
            /explicacao/
        );
    });

    it("rejeita quando alternativas não é array", () => {
        const invalido = { ...CASO_VALIDO, alternativas: "não é array" };
        expect(() => validarCasoClinico(JSON.stringify(invalido))).toThrow(
            /alternativas/
        );
    });

    it("rejeita quando alternativas tem menos de 4 itens", () => {
        const invalido = { ...CASO_VALIDO, alternativas: ["A", "B", "C"] };
        expect(() => validarCasoClinico(JSON.stringify(invalido))).toThrow(
            /alternativas/
        );
    });

    it("rejeita quando alternativas tem mais de 5 itens", () => {
        const invalido = { ...CASO_VALIDO, alternativas: ["A", "B", "C", "D", "E", "F"] };
        expect(() => validarCasoClinico(JSON.stringify(invalido))).toThrow(
            /alternativas/
        );
    });

    it("aceita alternativas com 5 itens", () => {
        const valido = { ...CASO_VALIDO, alternativas: ["A", "B", "C", "D", "E"], alternativa_correta: 4 };
        const resultado = validarCasoClinico(JSON.stringify(valido));
        expect(resultado.alternativas).toHaveLength(5);
    });

    it("rejeita quando uma alternativa é string vazia", () => {
        const invalido = { ...CASO_VALIDO, alternativas: ["A", "", "C", "D"] };
        expect(() => validarCasoClinico(JSON.stringify(invalido))).toThrow(
            /alternativas/
        );
    });

    it("rejeita quando alternativa_correta não é número", () => {
        const invalido = { ...CASO_VALIDO, alternativa_correta: "0" };
        expect(() => validarCasoClinico(JSON.stringify(invalido))).toThrow(
            /alternativa_correta/
        );
    });

    it("rejeita quando alternativa_correta está fora do intervalo (negativo)", () => {
        const invalido = { ...CASO_VALIDO, alternativa_correta: -1 };
        expect(() => validarCasoClinico(JSON.stringify(invalido))).toThrow(
            /alternativa_correta/
        );
    });

    it("rejeita quando alternativa_correta está fora do intervalo (maior que o array)", () => {
        const invalido = { ...CASO_VALIDO, alternativa_correta: 4 };
        expect(() => validarCasoClinico(JSON.stringify(invalido))).toThrow(
            /alternativa_correta/
        );
    });

    it("rejeita quando alternativa_correta não é inteiro", () => {
        const invalido = { ...CASO_VALIDO, alternativa_correta: 1.5 };
        expect(() => validarCasoClinico(JSON.stringify(invalido))).toThrow(
            /alternativa_correta/
        );
    });

    it("rejeita quando o JSON é um array em vez de objeto", () => {
        expect(() => validarCasoClinico(JSON.stringify([CASO_VALIDO]))).toThrow(
            "Resposta da IA não é um JSON válido"
        );
    });

    it("rejeita string vazia", () => {
        expect(() => validarCasoClinico("")).toThrow(
            "Resposta da IA não é um JSON válido"
        );
    });
});
