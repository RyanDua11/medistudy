// Validação das respostas da IA para os modos novos dos Casos Clínicos:
// Rápido (4 perguntas), Interativo (5 etapas) e Simulador de Anamnese.

import { extrairJson } from "./validacaoCasoClinico.js";

const TOTAL_PERGUNTAS_RAPIDO = 4;
const MIN_ALTERNATIVAS = 4;
const MAX_ALTERNATIVAS = 5;

function textoValido(valor) {
    return typeof valor === "string" && valor.trim() !== "";
}

function erro(campo) {
    throw new Error(`Campo obrigatório ausente ou inválido: ${campo}`);
}

function validarPerguntaMultiplaEscolha(pergunta, indice) {
    if (typeof pergunta !== "object" || pergunta === null) erro(`perguntas[${indice}]`);
    if (!textoValido(pergunta.pergunta)) erro(`perguntas[${indice}].pergunta`);
    if (
        !Array.isArray(pergunta.alternativas) ||
        pergunta.alternativas.length < MIN_ALTERNATIVAS ||
        pergunta.alternativas.length > MAX_ALTERNATIVAS ||
        pergunta.alternativas.some((alt) => !textoValido(alt))
    ) {
        erro(`perguntas[${indice}].alternativas`);
    }
    if (
        typeof pergunta.alternativa_correta !== "number" ||
        !Number.isInteger(pergunta.alternativa_correta) ||
        pergunta.alternativa_correta < 0 ||
        pergunta.alternativa_correta >= pergunta.alternativas.length
    ) {
        erro(`perguntas[${indice}].alternativa_correta`);
    }
    if (!textoValido(pergunta.explicacao)) erro(`perguntas[${indice}].explicacao`);
}

/** Modo Rápido: { enunciado, perguntas: [4x {pergunta, alternativas, alternativa_correta, explicacao}] }. */
export function validarCasoRapido(textoResposta) {
    const caso = extrairJson(textoResposta);

    if (typeof caso !== "object" || caso === null || Array.isArray(caso)) {
        throw new Error("Resposta da IA não é um JSON válido");
    }

    if (!textoValido(caso.enunciado)) erro("enunciado");
    if (!Array.isArray(caso.perguntas) || caso.perguntas.length !== TOTAL_PERGUNTAS_RAPIDO) {
        erro(`perguntas (esperado array com ${TOTAL_PERGUNTAS_RAPIDO} itens)`);
    }
    caso.perguntas.forEach(validarPerguntaMultiplaEscolha);

    return caso;
}

function validarSinaisVitais(sinaisVitais) {
    if (typeof sinaisVitais !== "object" || sinaisVitais === null) erro("paciente.sinais_vitais");
    ["fc", "fr", "pa", "temperatura", "sato2"].forEach((campo) => {
        if (!textoValido(String(sinaisVitais[campo] ?? ""))) erro(`paciente.sinais_vitais.${campo}`);
    });
}

/**
 * Modo Interativo: { paciente, perguntas_anamnese, exames, hipotese_correta,
 * condutas, raciocinio_final }.
 */
export function validarCasoInterativo(textoResposta) {
    const caso = extrairJson(textoResposta);

    if (typeof caso !== "object" || caso === null || Array.isArray(caso)) {
        throw new Error("Resposta da IA não é um JSON válido");
    }

    const { paciente } = caso;
    if (typeof paciente !== "object" || paciente === null) erro("paciente");
    ["nome", "idade", "sexo", "queixa_principal"].forEach((campo) => {
        if (!textoValido(String(paciente[campo] ?? ""))) erro(`paciente.${campo}`);
    });
    validarSinaisVitais(paciente.sinais_vitais);

    if (!Array.isArray(caso.perguntas_anamnese) || caso.perguntas_anamnese.length === 0) erro("perguntas_anamnese");
    caso.perguntas_anamnese.forEach((pergunta, indice) => {
        if (!textoValido(pergunta.id)) erro(`perguntas_anamnese[${indice}].id`);
        if (!textoValido(pergunta.texto)) erro(`perguntas_anamnese[${indice}].texto`);
        if (typeof pergunta.essencial !== "boolean") erro(`perguntas_anamnese[${indice}].essencial`);
        if (!textoValido(pergunta.resposta)) erro(`perguntas_anamnese[${indice}].resposta`);
    });

    if (!Array.isArray(caso.exames) || caso.exames.length === 0) erro("exames");
    caso.exames.forEach((exame, indice) => {
        if (!textoValido(exame.id)) erro(`exames[${indice}].id`);
        if (!textoValido(exame.nome)) erro(`exames[${indice}].nome`);
        if (typeof exame.custo_tokens !== "number" || exame.custo_tokens <= 0) erro(`exames[${indice}].custo_tokens`);
        if (!textoValido(exame.resultado)) erro(`exames[${indice}].resultado`);
    });

    if (!textoValido(caso.hipotese_correta)) erro("hipotese_correta");

    if (!Array.isArray(caso.condutas) || caso.condutas.length < 3) erro("condutas");
    caso.condutas.forEach((conduta, indice) => {
        if (!textoValido(conduta.texto)) erro(`condutas[${indice}].texto`);
        if (typeof conduta.correta !== "boolean") erro(`condutas[${indice}].correta`);
        if (!textoValido(conduta.justificativa)) erro(`condutas[${indice}].justificativa`);
    });
    if (!caso.condutas.some((c) => c.correta === true)) erro("condutas (nenhuma marcada como correta)");

    if (!textoValido(caso.raciocinio_final)) erro("raciocinio_final");

    return caso;
}

/** Simulador de Anamnese — perfil inicial do paciente. */
export function validarCasoAnamnese(textoResposta) {
    const caso = extrairJson(textoResposta);

    if (typeof caso !== "object" || caso === null || Array.isArray(caso)) {
        throw new Error("Resposta da IA não é um JSON válido");
    }

    const { paciente } = caso;
    if (typeof paciente !== "object" || paciente === null) erro("paciente");
    ["nome", "idade", "sexo", "queixa", "personalidade"].forEach((campo) => {
        if (!textoValido(String(paciente[campo] ?? ""))) erro(`paciente.${campo}`);
    });

    if (!textoValido(caso.diagnostico_secreto)) erro("diagnostico_secreto");
    if (
        !Array.isArray(caso.perguntas_essenciais) ||
        caso.perguntas_essenciais.length === 0 ||
        caso.perguntas_essenciais.some((p) => !textoValido(p))
    ) {
        erro("perguntas_essenciais");
    }

    return caso;
}

/** Resposta do paciente virtual a uma pergunta de anamnese. */
export function validarRespostaAnamnese(textoResposta) {
    const resultado = extrairJson(textoResposta);
    if (typeof resultado !== "object" || resultado === null || !textoValido(resultado.resposta)) {
        erro("resposta");
    }
    return resultado;
}

/** Avaliação da hipótese diagnóstica da aluna (Etapa 4 do modo Interativo). */
export function validarAvaliacaoHipotese(textoResposta) {
    const resultado = extrairJson(textoResposta);
    const valoresValidos = ["correta", "proxima", "incorreta"];

    if (typeof resultado !== "object" || resultado === null) erro("avaliacao");
    if (!valoresValidos.includes(resultado.avaliacao)) erro("avaliacao");
    if (!textoValido(resultado.explicacao)) erro("explicacao");

    return resultado;
}

/** Avaliação final do Simulador de Anamnese. */
export function validarAvaliacaoAnamnese(textoResposta) {
    const resultado = extrairJson(textoResposta);

    if (typeof resultado !== "object" || resultado === null) {
        throw new Error("Resposta da IA não é um JSON válido");
    }
    if (!Array.isArray(resultado.coletadas)) erro("coletadas");
    if (!Array.isArray(resultado.esquecidas)) erro("esquecidas");
    if (!textoValido(resultado.hipotese_inferida)) erro("hipotese_inferida");

    return resultado;
}
