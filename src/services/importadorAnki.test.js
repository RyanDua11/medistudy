import { describe, it, expect } from "vitest";
import { parsearArquivoAnki } from "./importadorAnki.js";

describe("parsearArquivoAnki", () => {
    it("extrai frente e verso de um arquivo válido com múltiplos cards", () => {
        const conteudo = "O que é sepse?\tResposta inflamatória sistêmica.\nO que é AVC?\tAcidente vascular cerebral.";

        const resultado = parsearArquivoAnki(conteudo);

        expect(resultado.cards).toEqual([
            { frente: "O que é sepse?", verso: "Resposta inflamatória sistêmica.", tags: [] },
            { frente: "O que é AVC?", verso: "Acidente vascular cerebral.", tags: [] },
        ]);
        expect(resultado.linhasIgnoradas).toBe(0);
    });

    it("extrai as tags quando a terceira coluna está presente", () => {
        const conteudo = "O que é sepse?\tResposta inflamatória sistêmica.\tinfecto,emergencia";

        const resultado = parsearArquivoAnki(conteudo);

        expect(resultado.cards).toEqual([
            {
                frente: "O que é sepse?",
                verso: "Resposta inflamatória sistêmica.",
                tags: ["infecto", "emergencia"],
            },
        ]);
    });

    it("ignora e conta linhas mal formatadas, mantendo os cards válidos", () => {
        const conteudo = [
            "O que é sepse?\tResposta inflamatória sistêmica.",
            "linha sem verso, sem tab",
            "\tVerso sem frente",
            "O que é AVC?\tAcidente vascular cerebral.",
        ].join("\n");

        const resultado = parsearArquivoAnki(conteudo);

        expect(resultado.cards).toEqual([
            { frente: "O que é sepse?", verso: "Resposta inflamatória sistêmica.", tags: [] },
            { frente: "O que é AVC?", verso: "Acidente vascular cerebral.", tags: [] },
        ]);
        expect(resultado.linhasIgnoradas).toBe(2);
    });

    it("remove o retorno de carro (\\r) de arquivos exportados no Windows", () => {
        const conteudo = "O que é sepse?\tResposta inflamatória sistêmica.\r\nO que é AVC?\tAcidente vascular cerebral.\r\n";

        const resultado = parsearArquivoAnki(conteudo);

        expect(resultado.cards).toEqual([
            { frente: "O que é sepse?", verso: "Resposta inflamatória sistêmica.", tags: [] },
            { frente: "O que é AVC?", verso: "Acidente vascular cerebral.", tags: [] },
        ]);
        expect(resultado.cards[0].verso).not.toMatch(/\r/);
        expect(resultado.linhasIgnoradas).toBe(0);
    });

    it("pula linhas de cabeçalho do Anki (iniciadas com #) sem contar como erro", () => {
        const conteudo = [
            "#separator:tab",
            "#html:true",
            "O que é sepse?\tResposta inflamatória sistêmica.",
        ].join("\n");

        const resultado = parsearArquivoAnki(conteudo);

        expect(resultado.cards).toEqual([
            { frente: "O que é sepse?", verso: "Resposta inflamatória sistêmica.", tags: [] },
        ]);
        expect(resultado.linhasIgnoradas).toBe(0);
    });

    it("filtra tags vazias resultantes de vírgulas duplicadas", () => {
        const conteudo = "O que é sepse?\tResposta inflamatória sistêmica.\tinfecto,,emergencia,";

        const resultado = parsearArquivoAnki(conteudo);

        expect(resultado.cards[0].tags).toEqual(["infecto", "emergencia"]);
    });

    it("retorna lista vazia sem erro quando o arquivo está vazio", () => {
        const resultado = parsearArquivoAnki("");

        expect(resultado.cards).toEqual([]);
        expect(resultado.linhasIgnoradas).toBe(0);
    });

    it("ignora linhas em branco no meio ou fim do arquivo sem contá-las como erro", () => {
        const conteudo = "O que é sepse?\tResposta inflamatória sistêmica.\n\n\n";

        const resultado = parsearArquivoAnki(conteudo);

        expect(resultado.cards).toEqual([
            { frente: "O que é sepse?", verso: "Resposta inflamatória sistêmica.", tags: [] },
        ]);
        expect(resultado.linhasIgnoradas).toBe(0);
    });
});
