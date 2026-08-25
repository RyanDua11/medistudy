import { describe, it, expect } from "vitest";
import { validarArquivoExame, extrairBase64DeDataUrl, contarParametrosPorStatus } from "./interpretadorExamesService.js";

describe("validarArquivoExame", () => {
    it("aceita PDF, PNG e JPEG dentro do limite de tamanho", () => {
        expect(validarArquivoExame({ type: "application/pdf", size: 1000 })).toBeNull();
        expect(validarArquivoExame({ type: "image/png", size: 1000 })).toBeNull();
        expect(validarArquivoExame({ type: "image/jpeg", size: 1000 })).toBeNull();
    });

    it("rejeita quando nenhum arquivo é passado", () => {
        expect(validarArquivoExame(null)).toBe("Selecione um arquivo.");
    });

    it("rejeita formato não suportado", () => {
        expect(validarArquivoExame({ type: "image/gif", size: 1000 })).toContain("Formato não suportado");
    });

    it("rejeita arquivo maior que 10MB", () => {
        expect(validarArquivoExame({ type: "application/pdf", size: 11 * 1024 * 1024 })).toContain("muito grande");
    });

    it("aceita um arquivo exatamente no limite", () => {
        expect(validarArquivoExame({ type: "application/pdf", size: 10 * 1024 * 1024 })).toBeNull();
    });
});

describe("extrairBase64DeDataUrl", () => {
    it("remove o prefixo data:<mime>;base64,", () => {
        expect(extrairBase64DeDataUrl("data:image/png;base64,QUJD")).toBe("QUJD");
    });

    it("retorna a string original se não houver vírgula", () => {
        expect(extrairBase64DeDataUrl("QUJD")).toBe("QUJD");
    });
});

describe("contarParametrosPorStatus", () => {
    it("conta cada status corretamente", () => {
        const parametros = [{ status: "normal" }, { status: "normal" }, { status: "atencao" }, { status: "critico" }];
        expect(contarParametrosPorStatus(parametros)).toEqual({ normal: 2, atencao: 1, critico: 1 });
    });

    it("retorna zeros pra lista vazia", () => {
        expect(contarParametrosPorStatus([])).toEqual({ normal: 0, atencao: 0, critico: 0 });
    });
});
