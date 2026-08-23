import { describe, it, expect } from "vitest";
import { extrairPalavrasCloze, validarCloze, ocultarLacunas, revelarLacunas, segmentarCloze } from "./cloze.js";

describe("extrairPalavrasCloze", () => {
    it("extrai a palavra de uma única lacuna", () => {
        const texto = "A bactéria mais comum na PAC é {{Streptococcus pneumoniae}}.";
        expect(extrairPalavrasCloze(texto)).toEqual(["Streptococcus pneumoniae"]);
    });

    it("extrai múltiplas lacunas na ordem em que aparecem", () => {
        const texto = "{{AINEs}} inibem a {{COX}}.";
        expect(extrairPalavrasCloze(texto)).toEqual(["AINEs", "COX"]);
    });

    it("retorna lista vazia quando não há lacunas", () => {
        expect(extrairPalavrasCloze("Texto sem nenhuma lacuna.")).toEqual([]);
    });

    it("remove espaços em volta da palavra da lacuna", () => {
        expect(extrairPalavrasCloze("O órgão é o {{  coração  }}.")).toEqual(["coração"]);
    });
});

describe("validarCloze", () => {
    it("é válido quando há pelo menos uma lacuna não vazia", () => {
        expect(validarCloze("A capital é {{Brasília}}.")).toBe(true);
    });

    it("é inválido quando não há nenhuma lacuna", () => {
        expect(validarCloze("Texto sem lacunas.")).toBe(false);
    });

    it("é inválido quando a lacuna está vazia", () => {
        expect(validarCloze("A capital é {{}}.")).toBe(false);
    });

    it("é inválido quando a lacuna só tem espaços", () => {
        expect(validarCloze("A capital é {{   }}.")).toBe(false);
    });
});

describe("ocultarLacunas", () => {
    it("substitui a lacuna por _____", () => {
        const texto = "A bactéria mais comum na PAC é {{Streptococcus pneumoniae}}.";
        expect(ocultarLacunas(texto)).toBe("A bactéria mais comum na PAC é _____.");
    });

    it("substitui múltiplas lacunas independentemente", () => {
        expect(ocultarLacunas("{{AINEs}} inibem a {{COX}}.")).toBe("_____ inibem a _____.");
    });

    it("não altera texto sem lacunas", () => {
        expect(ocultarLacunas("Texto normal.")).toBe("Texto normal.");
    });
});

describe("revelarLacunas", () => {
    it("remove as chaves e mantém a palavra no lugar", () => {
        const texto = "A bactéria mais comum na PAC é {{Streptococcus pneumoniae}}.";
        expect(revelarLacunas(texto)).toBe("A bactéria mais comum na PAC é Streptococcus pneumoniae.");
    });

    it("revela múltiplas lacunas", () => {
        expect(revelarLacunas("{{AINEs}} inibem a {{COX}}.")).toBe("AINEs inibem a COX.");
    });
});

describe("segmentarCloze", () => {
    it("segmenta texto com uma lacuna no meio em três pedaços", () => {
        const texto = "A capital é {{Brasília}}.";
        expect(segmentarCloze(texto)).toEqual([
            { texto: "A capital é ", lacuna: false },
            { texto: "Brasília", lacuna: true },
            { texto: ".", lacuna: false },
        ]);
    });

    it("segmenta múltiplas lacunas preservando a ordem", () => {
        const texto = "{{AINEs}} inibem a {{COX}}.";
        expect(segmentarCloze(texto)).toEqual([
            { texto: "AINEs", lacuna: true },
            { texto: " inibem a ", lacuna: false },
            { texto: "COX", lacuna: true },
            { texto: ".", lacuna: false },
        ]);
    });

    it("retorna um único segmento sem lacuna quando não há {{}}", () => {
        expect(segmentarCloze("Texto normal.")).toEqual([{ texto: "Texto normal.", lacuna: false }]);
    });

    it("não gera segmento vazio quando a lacuna está no início ou no fim", () => {
        expect(segmentarCloze("{{Início}} do texto.")).toEqual([
            { texto: "Início", lacuna: true },
            { texto: " do texto.", lacuna: false },
        ]);
        expect(segmentarCloze("O fim é {{isto}}")).toEqual([
            { texto: "O fim é ", lacuna: false },
            { texto: "isto", lacuna: true },
        ]);
    });
});
