import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatarDataRelativa } from "./formatacaoData.js";

const AGORA = new Date("2026-08-08T12:00:00.000Z");

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

describe("formatarDataRelativa", () => {
    it('retorna "Nunca revisado" quando a data é null', () => {
        expect(formatarDataRelativa(null)).toBe("Nunca revisado");
    });

    it('retorna "Nunca revisado" quando a data é undefined', () => {
        expect(formatarDataRelativa(undefined)).toBe("Nunca revisado");
    });

    it('retorna "Revisado hoje" para uma data de hoje', () => {
        expect(formatarDataRelativa(dias(0))).toBe("Revisado hoje");
    });

    it('retorna "Revisado hoje" para uma data de hoje mais cedo no dia', () => {
        const maisCedoHoje = new Date(AGORA.getTime() - 3 * 60 * 60 * 1000).toISOString();
        expect(formatarDataRelativa(maisCedoHoje)).toBe("Revisado hoje");
    });

    it('retorna "Revisado ontem" para uma data de ontem', () => {
        expect(formatarDataRelativa(dias(-1))).toBe("Revisado ontem");
    });

    it('retorna "Há N dias" para datas mais antigas', () => {
        expect(formatarDataRelativa(dias(-2))).toBe("Há 2 dias");
        expect(formatarDataRelativa(dias(-5))).toBe("Há 5 dias");
    });
});
