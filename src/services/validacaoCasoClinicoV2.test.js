import { describe, it, expect } from "vitest";
import {
    validarCasoRapido,
    validarCasoInterativo,
    validarCasoAnamnese,
    validarRespostaAnamnese,
    validarAvaliacaoHipotese,
    validarAvaliacaoAnamnese,
} from "./validacaoCasoClinicoV2.js";

function pergunta(overrides = {}) {
    return {
        pergunta: "Qual a hipótese mais provável?",
        alternativas: ["A", "B", "C", "D"],
        alternativa_correta: 1,
        explicacao: "Porque os achados sugerem isso.",
        ...overrides,
    };
}

describe("validarCasoRapido", () => {
    it("aceita um caso com exatamente 4 perguntas válidas", () => {
        const caso = { enunciado: "Paciente de 45 anos...", perguntas: [pergunta(), pergunta(), pergunta(), pergunta()] };
        expect(validarCasoRapido(JSON.stringify(caso))).toEqual(caso);
    });

    it("rejeita quando há menos de 4 perguntas", () => {
        const caso = { enunciado: "Enunciado", perguntas: [pergunta(), pergunta()] };
        expect(() => validarCasoRapido(JSON.stringify(caso))).toThrow(/perguntas/);
    });

    it("rejeita quando falta o enunciado", () => {
        const caso = { perguntas: [pergunta(), pergunta(), pergunta(), pergunta()] };
        expect(() => validarCasoRapido(JSON.stringify(caso))).toThrow(/enunciado/);
    });

    it("rejeita quando alternativa_correta aponta fora do array de alternativas", () => {
        const caso = {
            enunciado: "Enunciado",
            perguntas: [pergunta({ alternativa_correta: 9 }), pergunta(), pergunta(), pergunta()],
        };
        expect(() => validarCasoRapido(JSON.stringify(caso))).toThrow();
    });

    it("extrai o JSON mesmo com cerca de markdown ao redor", () => {
        const caso = { enunciado: "Enunciado", perguntas: [pergunta(), pergunta(), pergunta(), pergunta()] };
        const texto = "```json\n" + JSON.stringify(caso) + "\n```";
        expect(validarCasoRapido(texto)).toEqual(caso);
    });
});

function casoInterativoValido(overrides = {}) {
    return {
        paciente: {
            nome: "João Paulo",
            idade: 34,
            sexo: "masculino",
            queixa_principal: "Dor torácica súbita",
            sinais_vitais: { fc: "112 bpm", fr: "24 irpm", pa: "130x80 mmHg", temperatura: "36.8°C", sato2: "93%" },
        },
        perguntas_anamnese: [{ id: "p1", texto: "Há quanto tempo?", essencial: true, resposta: "Começou há 2 horas." }],
        exames: [{ id: "e1", nome: "TC de tórax", custo_tokens: 3, resultado: "Defeito de enchimento arterial." }],
        hipotese_correta: "Tromboembolismo pulmonar agudo",
        condutas: [
            { texto: "Anticoagulação plena", correta: true, justificativa: "Tratamento padrão para TEP." },
            { texto: "Observação", correta: false, justificativa: "Insuficiente para o quadro." },
            { texto: "Alta", correta: false, justificativa: "Risco de vida não tratado." },
        ],
        raciocinio_final: "O quadro é compatível com TEP dado o contexto de risco.",
        ...overrides,
    };
}

describe("validarCasoInterativo", () => {
    it("aceita um caso interativo completo e válido", () => {
        const caso = casoInterativoValido();
        expect(validarCasoInterativo(JSON.stringify(caso))).toEqual(caso);
    });

    it("rejeita quando faltam sinais vitais", () => {
        const caso = casoInterativoValido();
        delete caso.paciente.sinais_vitais.fc;
        expect(() => validarCasoInterativo(JSON.stringify(caso))).toThrow(/sinais_vitais/);
    });

    it("rejeita quando nenhuma conduta está marcada como correta", () => {
        const caso = casoInterativoValido();
        caso.condutas = caso.condutas.map((c) => ({ ...c, correta: false }));
        expect(() => validarCasoInterativo(JSON.stringify(caso))).toThrow(/condutas/);
    });

    it("rejeita quando exames está vazio", () => {
        const caso = casoInterativoValido({ exames: [] });
        expect(() => validarCasoInterativo(JSON.stringify(caso))).toThrow(/exames/);
    });
});

describe("validarCasoAnamnese", () => {
    it("aceita um perfil de paciente válido", () => {
        const caso = {
            paciente: { nome: "Carlos", idade: 28, sexo: "masculino", queixa: "Dor abdominal", personalidade: "Ansioso" },
            diagnostico_secreto: "Apendicite aguda",
            perguntas_essenciais: ["Início da dor", "Febre", "Náuseas"],
        };
        expect(validarCasoAnamnese(JSON.stringify(caso))).toEqual(caso);
    });

    it("rejeita quando perguntas_essenciais está vazio", () => {
        const caso = {
            paciente: { nome: "Carlos", idade: 28, sexo: "masculino", queixa: "Dor", personalidade: "Calmo" },
            diagnostico_secreto: "Apendicite",
            perguntas_essenciais: [],
        };
        expect(() => validarCasoAnamnese(JSON.stringify(caso))).toThrow(/perguntas_essenciais/);
    });
});

describe("validarRespostaAnamnese", () => {
    it("aceita uma resposta válida do paciente", () => {
        expect(validarRespostaAnamnese(JSON.stringify({ resposta: "Começou ontem à noite." }))).toEqual({
            resposta: "Começou ontem à noite.",
        });
    });

    it("rejeita quando a resposta está vazia", () => {
        expect(() => validarRespostaAnamnese(JSON.stringify({ resposta: "" }))).toThrow();
    });
});

describe("validarAvaliacaoHipotese", () => {
    it("aceita avaliacao 'correta' com explicação", () => {
        const resultado = { avaliacao: "correta", explicacao: "Hipótese bem fundamentada." };
        expect(validarAvaliacaoHipotese(JSON.stringify(resultado))).toEqual(resultado);
    });

    it("rejeita um valor de avaliacao fora do enum permitido", () => {
        const resultado = { avaliacao: "quase", explicacao: "..." };
        expect(() => validarAvaliacaoHipotese(JSON.stringify(resultado))).toThrow(/avaliacao/);
    });
});

describe("validarAvaliacaoAnamnese", () => {
    it("aceita uma avaliação final válida", () => {
        const resultado = {
            coletadas: ["Início da dor", "Febre"],
            esquecidas: ["Uso de medicamentos"],
            hipotese_inferida: "Apendicite aguda provável.",
        };
        expect(validarAvaliacaoAnamnese(JSON.stringify(resultado))).toEqual(resultado);
    });

    it("rejeita quando coletadas não é um array", () => {
        const resultado = { coletadas: "nada", esquecidas: [], hipotese_inferida: "..." };
        expect(() => validarAvaliacaoAnamnese(JSON.stringify(resultado))).toThrow(/coletadas/);
    });
});
